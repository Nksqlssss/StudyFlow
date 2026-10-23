import type { CookieSerializeOptions } from '@fastify/cookie'
import { fastifyOauth2, type ProviderConfiguration } from '@fastify/oauth2'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { env } from '../config/env.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import {
	linkGoogleAccount,
	signInWithGoogle,
	unlinkGoogleAccount
} from '../lib/google-accounts.js'
import {
	GoogleAuthError,
	hashOAuthSecret,
	sameOAuthSecret,
	verifyGoogleIdentity
} from '../lib/google-identity.js'
import { signAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { publicUserSelect } from '../lib/user-select.js'
import { authenticate } from '../middleware/authenticate.js'
import { sessionHash } from '../lib/session.js'

export type GoogleOAuthConfig = {
	clientId: string
	clientSecret: string
	redirectUri: string
	frontendCallbackUrl: string
	frontendOrigin: string
	production: boolean
}

type GoogleRouteOptions = {
	db?: PrismaClient
	config?: GoogleOAuthConfig
	googleClient?: OAuth2Client
	provider?: ProviderConfiguration
	authenticateUser?: typeof authenticate
}

const randomSecret = () => randomBytes(32).toString('base64url')
const secretSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
const callbackSchema = z.object({
	state: secretSchema,
	code: z.string().min(1).max(4096).optional(),
	error: z.string().min(1).max(200).optional()
})
const exchangeSchema = z.object({ code: secretSchema }).strict()
const FLOW_TTL_SECONDS = 600
const EXCHANGE_TTL_SECONDS = 60

export async function googleAuthRoutes(
	app: FastifyInstance,
	options: GoogleRouteOptions = {}
) {
	const db = options.db ?? prisma
	const authenticateUser = options.authenticateUser ?? authenticate
	const config =
		options.config ??
		(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI
			? {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
					redirectUri: env.GOOGLE_REDIRECT_URI,
					frontendCallbackUrl:
						env.GOOGLE_FRONTEND_CALLBACK_URL ??
						new URL('/auth/google/callback', env.FRONTEND_URL).href,
					frontendOrigin: new URL(env.FRONTEND_URL).origin,
					production: env.NODE_ENV === 'production'
				}
			: undefined)
	const prefix = config?.production ? '__Host-' : ''
	const googleClient =
		options.googleClient ??
		new OAuth2Client({
			clientId: config?.clientId,
			transporterOptions: { timeout: 10000 }
		})
	const stateCookie = `${prefix}studyflow-google-state`
	const verifierCookie = `${prefix}studyflow-google-verifier`
	const browserCookie = `${prefix}studyflow-google-browser`
	const exchangeCookie = `${prefix}studyflow-google-exchange`
	const cookieOptions: CookieSerializeOptions = {
		httpOnly: true,
		secure: config?.production ?? false,

		sameSite: config?.production ? 'none' : 'lax',
		path: '/',
		signed: true,
		maxAge: FLOW_TTL_SECONDS
	}
	const exchangeCookieOptions: CookieSerializeOptions = {
		...cookieOptions,
		sameSite: config?.production ? 'none' : 'lax',
		maxAge: EXCHANGE_TTL_SECONDS
	}

	function signedCookie(request: FastifyRequest, name: string) {
		const value = request.cookies[name]
		if (!value) return undefined
		const unsigned = request.unsignCookie(value)
		return unsigned.valid ? unsigned.value : undefined
	}

	function clearFlowCookies(reply: FastifyReply) {
		for (const name of [stateCookie, verifierCookie, browserCookie])
			reply.clearCookie(name, cookieOptions)
	}

	function requireConfig(): GoogleOAuthConfig {
		if (!config)
			throw new GoogleAuthError(
				503,
				'GOOGLE_NOT_CONFIGURED',
				'Google sign-in is not configured'
			)
		return config
	}

	function checkOrigin(request: FastifyRequest, required = false) {
		const origin = request.headers.origin
		if ((required || origin) && origin !== requireConfig().frontendOrigin) {
			throw new GoogleAuthError(
				403,
				'INVALID_ORIGIN',
				'Request origin is not allowed'
			)
		}
	}

	function redirectResult(reply: FastifyReply, values: Record<string, string>) {
		const url = new URL(requireConfig().frontendCallbackUrl)
		url.hash = new URLSearchParams(values).toString()
		return reply.redirect(url.href)
	}

	app.addHook('onRequest', async (_request, reply) => {
		reply
			.header('Cache-Control', 'no-store')
			.header('Pragma', 'no-cache')
			.header('Referrer-Policy', 'no-referrer')
	})
	app.setErrorHandler((error, request, reply) => {
		if (error instanceof GoogleAuthError) {
			return reply
				.code(error.status)
				.send({ message: error.message, code: error.code })
		}
		const status =
			error &&
			typeof error === 'object' &&
			'statusCode' in error &&
			typeof error.statusCode === 'number'
				? error.statusCode
				: undefined
		if (status && status >= 400 && status < 500) {
			return reply.code(status).send({
				message: status === 429 ? 'Too many requests' : 'Invalid request'
			})
		}
		request.log.error('Google OAuth operation failed')
		return reply.code(503).send({
			message: 'Google authentication is temporarily unavailable',
			code: 'GOOGLE_UNAVAILABLE'
		})
	})

	if (config) {
		await app.register(fastifyOauth2, {
			name: 'googleOAuth2',
			scope: ['openid', 'email', 'profile'],
			credentials: {
				client: { id: config.clientId, secret: config.clientSecret },
				auth: options.provider ?? {
					...fastifyOauth2.GOOGLE_CONFIGURATION,
					tokenHost: 'https://oauth2.googleapis.com',
					tokenPath: '/token'
				},
				http: { timeout: 10000 }
			},
			callbackUri: config.redirectUri,
			callbackUriParams: { prompt: 'select_account' },
			cookie: cookieOptions,
			redirectStateCookieName: stateCookie,
			verifierCookieName: verifierCookie,
			pkce: 'S256',
			generateStateFunction: () => randomSecret(),
			checkStateFunction: async request => {
				const query = callbackSchema.safeParse(request.query)
				const cookie = signedCookie(request, stateCookie)
				return Boolean(
					query.success && cookie && sameOAuthSecret(query.data.state, cookie)
				)
			}
		})
	}

	async function pruneExpired() {
		const expiresAt = { lte: new Date() }
		await db.googleOAuthState.deleteMany({ where: { expiresAt } })
		await db.googleOAuthExchange.deleteMany({ where: { expiresAt } })
	}
	let cleanupTimer: ReturnType<typeof setInterval> | undefined
	let cleanupRunning = false
	app.addHook('onReady', async () => {
		if (!config) return
		cleanupTimer = setInterval(() => {
			if (cleanupRunning) return
			cleanupRunning = true
			void pruneExpired()
				.catch(() =>
					app.log.warn('Google OAuth temporary-record cleanup failed')
				)
				.finally(() => {
					cleanupRunning = false
				})
		}, 60000)
		cleanupTimer.unref()
	})
	app.addHook('onClose', async () => clearInterval(cleanupTimer))

	async function start(
		request: FastifyRequest,
		reply: FastifyReply,
		intent: 'login' | 'link'
	) {
		requireConfig()
		checkOrigin(request)
		const oauth = app.oauth2GoogleOAuth2
		if (!oauth) throw new Error('OAuth plugin is unavailable')
		await pruneExpired()
		const authorizationUrl = new URL(
			await oauth.generateAuthorizationUri(request, reply)
		)
		const state = secretSchema.parse(authorizationUrl.searchParams.get('state'))
		const codeChallenge = secretSchema.parse(
			authorizationUrl.searchParams.get('code_challenge')
		)
		const browser = randomSecret()
		const nonce = randomSecret()
		authorizationUrl.searchParams.set('nonce', nonce)
		await db.googleOAuthState.create({
			data: {
				stateHash: hashOAuthSecret(state),
				browserHash: hashOAuthSecret(browser),
				nonceHash: hashOAuthSecret(nonce),
				codeChallenge,
				intent,
				userId: intent === 'link' ? request.user.id : null,
				sessionHash: intent === 'link' ? sessionHash(request.headers.authorization!) : null,
				expiresAt: new Date(Date.now() + FLOW_TTL_SECONDS * 1000)
			}
		})
		reply.setCookie(browserCookie, browser, cookieOptions)
		if (intent === 'link') return { authorizationUrl: authorizationUrl.href }
		return reply.redirect(authorizationUrl.href)
	}

	const startLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } }
	app.get('/auth/google', { config: startLimit }, (request, reply) =>
		start(request, reply, 'login')
	)
	app.post(
		'/auth/google/link',
		{ preHandler: authenticateUser, config: startLimit },
		(request, reply) => start(request, reply, 'link')
	)

	app.get('/auth/google/callback', async (request, reply) => {
		const cfg = requireConfig()
		const query = callbackSchema.safeParse(request.query)
		const browser = signedCookie(request, browserCookie)
		const state = signedCookie(request, stateCookie)
		const verifier = signedCookie(request, verifierCookie)
		clearFlowCookies(reply)
		if (
			!query.success ||
			!browser ||
			!state ||
			!verifier ||
			!sameOAuthSecret(query.data.state, state)
		) {
			throw new GoogleAuthError(
				400,
				'INVALID_OAUTH_STATE',
				'Invalid or expired OAuth state'
			)
		}
		const where = {
			stateHash: hashOAuthSecret(query.data.state),
			browserHash: hashOAuthSecret(browser),
			expiresAt: { gt: new Date() }
		}
		const flow = await db.googleOAuthState.findUnique({
			where: { stateHash: where.stateHash }
		})
		if (
			!flow ||
			!sameOAuthSecret(flow.browserHash, where.browserHash) ||
			!sameOAuthSecret(
				flow.codeChallenge,
				createHash('sha256').update(verifier).digest('base64url')
			)
		) {
			throw new GoogleAuthError(
				400,
				'INVALID_OAUTH_STATE',
				'Invalid or expired OAuth state'
			)
		}

		if ((await db.googleOAuthState.deleteMany({ where })).count !== 1) {
			throw new GoogleAuthError(
				400,
				'INVALID_OAUTH_STATE',
				'Invalid or expired OAuth state'
			)
		}
		if (query.data.error)
			return redirectResult(reply, { error: 'GOOGLE_ACCESS_DENIED' })
		if (!query.data.code)
			return redirectResult(reply, { error: 'GOOGLE_CODE_MISSING' })

		try {
			const oauth = app.oauth2GoogleOAuth2
			if (!oauth) throw new Error('OAuth plugin is unavailable')
			const result = await oauth.getAccessTokenFromAuthorizationCodeFlow(
				request,
				reply
			)
			if (!result.token.id_token)
				throw new GoogleAuthError(
					401,
					'GOOGLE_IDENTITY_INVALID',
					'Google ID token is missing'
				)
			const identity = await verifyGoogleIdentity(
				googleClient,
				result.token.id_token,
				cfg.clientId,
				flow.nonceHash
			)
			if (flow.intent === 'link' && flow.userId) {
				if (!flow.sessionHash) {
					throw new GoogleAuthError(401, 'GOOGLE_SESSION_EXPIRED', 'Sign in again before linking Google')
				}
				await linkGoogleAccount(db, flow.userId, identity, flow.sessionHash)
				return redirectResult(reply, { linked: 'google' })
			}
			const user = await signInWithGoogle(db, identity)
			const account = await db.oAuthAccount.findUnique({
				where: {
					provider_providerAccountId: {
						provider: 'google',
						providerAccountId: identity.sub
					}
				}
			})
			if (!account || account.userId !== user.id)
				throw new Error('Google account is unavailable')
			const code = randomSecret()
			await db.googleOAuthExchange.create({
				data: {
					codeHash: hashOAuthSecret(code),
					browserHash: hashOAuthSecret(browser),
					userId: user.id,
					oauthAccountId: account.id,
					expiresAt: new Date(Date.now() + EXCHANGE_TTL_SECONDS * 1000)
				}
			})
			reply.setCookie(exchangeCookie, browser, exchangeCookieOptions)
			return redirectResult(reply, { code })
		} catch (error) {
			if (!(error instanceof GoogleAuthError))
				request.log.warn('Google OAuth callback failed')
			return redirectResult(reply, {
				error:
					error instanceof GoogleAuthError ? error.code : 'GOOGLE_UNAVAILABLE'
			})
		}
	})

	app.post(
		'/auth/google/exchange',
		{ config: startLimit },
		async (request, reply) => {
			requireConfig()
			checkOrigin(request, true)
			const body = exchangeSchema.safeParse(request.body)
			if (!body.success)
				throw new GoogleAuthError(
					400,
					'INVALID_REQUEST_BODY',
					'Invalid request body'
				)
			const browser = signedCookie(request, exchangeCookie)
			if (!browser)
				throw new GoogleAuthError(
					400,
					'INVALID_EXCHANGE_CODE',
					'Invalid or expired exchange code'
				)
			const where = {
				codeHash: hashOAuthSecret(body.data.code),
				browserHash: hashOAuthSecret(browser),
				expiresAt: { gt: new Date() }
			}
			const user = await db.$transaction(async tx => {
				const record = await tx.googleOAuthExchange.findUnique({
					where: { codeHash: where.codeHash }
				})
				if (
					!record ||
					(await tx.googleOAuthExchange.deleteMany({ where })).count !== 1
				) {
					throw new GoogleAuthError(
						400,
						'INVALID_EXCHANGE_CODE',
						'Invalid or expired exchange code'
					)
				}
				const user = await tx.user.findUnique({
					where: { id: record.userId },
					select: { ...publicUserSelect, emailVerifiedAt: true }
				})
				if (!user?.emailVerifiedAt)
					throw new GoogleAuthError(401, 'UNAUTHORIZED', 'Unauthorized')
				const { emailVerifiedAt, ...publicUser } = user
				return publicUser
			})
			reply.clearCookie(exchangeCookie, exchangeCookieOptions)
			return { accessToken: signAccessToken({ userId: user.id }), user }
		}
	)

	app.get('/auth/methods', { preHandler: authenticateUser }, async request => {
		const user = await db.user.findUnique({
			where: { id: request.user.id },
			select: {
				passwordHash: true,
				oauthAccounts: {
					where: { provider: 'google' },
					select: { email: true }
				}
			}
		})
		if (!user) throw new GoogleAuthError(401, 'UNAUTHORIZED', 'Unauthorized')
		return {
			hasPassword: Boolean(user.passwordHash),
			providers: {
				google: {
					connected: user.oauthAccounts.length > 0,
					email: user.oauthAccounts[0]?.email ?? null
				}
			}
		}
	})

	app.delete(
		'/auth/google/link',
		{ preHandler: authenticateUser },
		async (request, reply) => {
			if (config) checkOrigin(request)
			await unlinkGoogleAccount(db, request.user.id)
			return reply.code(204).send()
		}
	)
}
