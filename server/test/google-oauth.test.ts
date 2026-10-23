import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import { createHash, randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from '../src/routes/auth.routes.js'
import {
	googleAuthRoutes,
	type GoogleOAuthConfig
} from '../src/routes/google-auth.routes.js'
import { createAuthenticate } from '../src/middleware/authenticate.js'
import { signAccessToken, verifyAccessToken } from '../src/lib/jwt.js'
import { hashOAuthSecret } from '../src/lib/google-identity.js'
import { clientId, identityToken, TestGoogleClient } from './google-fixtures.js'
import { createTestDatabase } from './test-database.js'
import { reauthRoutes } from '../src/routes/reauth.routes.js'

type Identity = { sub: string; email: string; name: string }
type StartedFlow = { authorizationUrl: URL; cookies: string }
const origin = 'http://localhost:5173'
const config: GoogleOAuthConfig = {
	clientId,
	clientSecret: 'test-only-client-secret',
	redirectUri: 'http://localhost:3000/auth/google/callback',
	frontendCallbackUrl: `${origin}/auth/google/callback`,
	frontendOrigin: origin,
	production: false
}

describe('Google OAuth with real PostgreSQL, PKCE and signed ID tokens', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>
	let app: FastifyInstance
	const provider = Fastify({ logger: false })
	const codes = new Map<
		string,
		{ challenge: string; nonce: string; identity: Identity; invalid?: boolean }
	>()
	let providerUrl: string
	let exchanges = 0
	let emailDeliveries: { email: string; token: string }[] = []

	before(async () => {
		database = await createTestDatabase()
		provider.addContentTypeParser(
			'application/x-www-form-urlencoded',
			{ parseAs: 'string' },
			(_request, body, done) => done(null, body)
		)
		provider.post<{ Body: string }>('/token', async (request, reply) => {
			const body = new URLSearchParams(request.body)
			const code = body.get('code') ?? ''
			const entry = codes.get(code)
			codes.delete(code)
			exchanges++
			if (
				!entry ||
				body.get('redirect_uri') !== config.redirectUri ||
				createHash('sha256')
					.update(body.get('code_verifier') ?? '')
					.digest('base64url') !== entry.challenge
			) {
				return reply.code(400).send({ error: 'invalid_grant' })
			}
			return {
				access_token: 'test-only-access-token',
				token_type: 'Bearer',
				expires_in: 300,
				id_token: entry.invalid
					? 'invalid-token'
					: identityToken(entry.nonce, entry.identity)
			}
		})
		providerUrl = await provider.listen({ host: '127.0.0.1', port: 0 })
	})
	beforeEach(async () => {
		app = Fastify({ logger: false })
		app.register(cookie, { secret: 'test-only-cookie-key-with-enough-entropy' })
		app.register(cors, { origin, credentials: true })
		app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
		emailDeliveries = []
		app.register(authRoutes, {
			db: database.db,
			authenticateUser: createAuthenticate(database.db),
			sendVerification: async (email: string, token: string) => {
				emailDeliveries.push({ email, token })
			}
		})
		app.register(googleAuthRoutes, {
			db: database.db,
			config,
			googleClient: new TestGoogleClient(clientId),
			provider: {
				authorizeHost: providerUrl,
				authorizePath: '/authorize',
				tokenHost: providerUrl,
				tokenPath: '/token'
			},
			authenticateUser: createAuthenticate(database.db)
		})
		await app.ready()
	})
	afterEach(async () => {
		await app?.close()
	})
	after(async () => {
		await provider.close()
		await database?.close()
	})

	function identity(): Identity {
		const id = randomUUID()
		return { sub: id, email: `${id}@example.com`, name: 'Test Student' }
	}
	async function start(token?: string): Promise<StartedFlow> {
		const response = await app.inject({
			method: token ? 'POST' : 'GET',
			url: token ? '/auth/google/link' : '/auth/google',
			headers: token ? { authorization: `Bearer ${token}`, origin } : {}
		})
		assert.equal(response.statusCode, token ? 200 : 302)
		const authorizationUrl = new URL(
			token
				? response.json<{ authorizationUrl: string }>().authorizationUrl
				: String(response.headers.location)
		)
		assert.equal(
			authorizationUrl.searchParams.get('code_challenge_method'),
			'S256'
		)
		assert.equal(authorizationUrl.searchParams.get('response_type'), 'code')
		assert.ok(response.cookies.every((value) => value.httpOnly))
		return {
			authorizationUrl,
			cookies: response.cookies
				.map((value) => `${value.name}=${encodeURIComponent(value.value)}`)
				.join('; ')
		}
	}
	async function callback(flow: StartedFlow, user: Identity, invalid = false) {
		const code = randomUUID()
		codes.set(code, {
			challenge: flow.authorizationUrl.searchParams.get('code_challenge') ?? '',
			nonce: flow.authorizationUrl.searchParams.get('nonce') ?? '',
			identity: user,
			invalid
		})
		return app.inject({
			url: `/auth/google/callback?${new URLSearchParams({ code, state: flow.authorizationUrl.searchParams.get('state') ?? '' })}`,
			headers: { cookie: flow.cookies }
		})
	}
	async function login(user: Identity) {
		const response = await callback(await start(), user)
		assert.equal(response.statusCode, 302)
		const fragment = new URLSearchParams(
			new URL(String(response.headers.location)).hash.slice(1)
		)
		assert.ok(!fragment.has('accessToken'))
		const code = fragment.get('code')
		assert.ok(code, `Expected exchange code, got ${fragment.get('error')}`)
		return {
			code,
			cookies: response.cookies
				.filter((value) => value.name.endsWith('google-exchange'))
				.map((value) => `${value.name}=${encodeURIComponent(value.value)}`)
				.join('; ')
		}
	}
	async function exchange(result: { code: string; cookies: string }) {
		return app.inject({
			method: 'POST',
			url: '/auth/google/exchange',
			headers: { cookie: result.cookies, origin },
			payload: { code: result.code }
		})
	}
	async function seedUser(passwordHash: string | null = 'test-password-hash') {
		const user = await database.db.user.create({
			data: {
				email: `${randomUUID()}@example.com`,
				name: 'Existing User',
				passwordHash,
				emailVerifiedAt: new Date(),
				settings: { create: {} }
			}
		})
		return { user, token: signAccessToken({ userId: user.id }) }
	}
	async function link(token: string, user: Identity) {
		return callback(await start(token), user)
	}
	function resultError(response: Awaited<ReturnType<typeof callback>>) {
		return new URLSearchParams(
			new URL(String(response.headers.location)).hash.slice(1)
		).get('error')
	}

	test('creates a Google-only verified user and settings, returns the usual JWT/user response', async () => {
		const google = identity()
		const response = await exchange(await login(google))
		assert.equal(response.statusCode, 200)
		const data = response.json<{ accessToken: string; user: { id: string } }>()
		assert.equal(verifyAccessToken(data.accessToken).userId, data.user.id)
		assert.ok(!response.body.includes('passwordHash'))
		const user = await database.db.user.findUniqueOrThrow({
			where: { id: data.user.id },
			include: {
				settings: true,
				oauthAccounts: true,
				emailVerificationTokens: true
			}
		})
		assert.equal(user.passwordHash, null)
		assert.ok(user.emailVerifiedAt)
		assert.ok(user.settings)
		assert.equal(user.oauthAccounts[0].providerAccountId, google.sub)
		assert.equal(user.emailVerificationTokens.length, 0)
		assert.equal(emailDeliveries.length, 0)
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/login',
					payload: { email: google.email, password: 'wrong-password' }
				})
			).statusCode,
			401
		)
	})
	test('repeated login uses Google sub even if its email has changed', async () => {
		const google = identity()
		const first = (await exchange(await login(google))).json<{
			user: { id: string }
		}>()
		const second = (
			await exchange(
				await login({ ...google, email: `${randomUUID()}@example.com` })
			)
		).json<{ user: { id: string } }>()
		assert.equal(first.user.id, second.user.id)
	})

	test('simultaneous first logins create exactly one user and Google account', async () => {
		const google = identity()
		const pending = await Promise.all([login(google), login(google)])
		const responses = await Promise.all(pending.map(exchange))
		assert.ok(responses.every((response) => response.statusCode === 200))
		assert.equal(
			responses[0].json<{ user: { id: string } }>().user.id,
			responses[1].json<{ user: { id: string } }>().user.id
		)
		assert.equal(
			await database.db.user.count({ where: { email: google.email } }),
			1
		)
		assert.equal(
			await database.db.oAuthAccount.count({
				where: { providerAccountId: google.sub }
			}),
			1
		)
	})
	test('does not merge with an existing email account', async () => {
		const { user } = await seedUser()
		const response = await callback(await start(), {
			...identity(),
			email: user.email
		})
		assert.equal(resultError(response), 'GOOGLE_EMAIL_CONFLICT')
		assert.equal(
			await database.db.oAuthAccount.count({ where: { userId: user.id } }),
			0
		)
	})
	test('links and repeats the same link; reports current methods without password hashes', async () => {
		const { user, token } = await seedUser()
		const google = identity()
		assert.equal(resultError(await link(token, google)), null)
		assert.equal(resultError(await link(token, google)), null)
		assert.equal(
			await database.db.oAuthAccount.count({ where: { userId: user.id } }),
			1
		)
		const response = await app.inject({
			url: '/auth/methods',
			headers: { authorization: `Bearer ${token}` }
		})
		assert.deepEqual(response.json(), {
			hasPassword: true,
			providers: { google: { connected: true, email: google.email } }
		})
	})
	test('rejects linking another users Google account or a second Google account', async () => {
		const a = await seedUser()
		const b = await seedUser()
		const google = identity()
		await link(a.token, google)
		assert.equal(
			resultError(await link(b.token, google)),
			'GOOGLE_ACCOUNT_IN_USE'
		)
		assert.equal(
			resultError(await link(a.token, identity())),
			'GOOGLE_ALREADY_LINKED'
		)
	})
	test('unlink preserves user data, revokes pending exchanges and leaves password login available', async () => {
		const { user, token } = await seedUser()
		const google = identity()
		await link(token, google)
		const pending = await login(google)
		const subject = await database.db.subject.create({
			data: { userId: user.id, title: 'Preserved', icon: 'code' }
		})
		const task = await database.db.task.create({
			data: { userId: user.id, subjectId: subject.id, title: 'Preserved task' }
		})
		const response = await app.inject({
			method: 'DELETE',
			url: '/auth/google/link',
			headers: { authorization: `Bearer ${token}` }
		})
		assert.equal(response.statusCode, 204)
		assert.equal(
			await database.db.oAuthAccount.count({ where: { userId: user.id } }),
			0
		)
		assert.ok(await database.db.user.findUnique({ where: { id: user.id } }))
		assert.ok(
			await database.db.subject.findUnique({ where: { id: subject.id } })
		)
		assert.ok(await database.db.task.findUnique({ where: { id: task.id } }))
		assert.equal((await exchange(pending)).statusCode, 400)
	})
	test('forbids removing the only login method', async () => {
		const response = await exchange(await login(identity()))
		const { accessToken } = response.json<{ accessToken: string }>()
		const removed = await app.inject({
			method: 'DELETE',
			url: '/auth/google/link',
			headers: { authorization: `Bearer ${accessToken}` }
		})
		assert.equal(removed.statusCode, 409)
		assert.equal(removed.json<{ code: string }>().code, 'LAST_LOGIN_METHOD')
	})
	test('requires a valid JWT for link, unlink and current methods', async () => {
		for (const [method, url] of [
			['POST', '/auth/google/link'],
			['DELETE', '/auth/google/link'],
			['GET', '/auth/methods']
		] as const) {
			assert.equal((await app.inject({ method, url })).statusCode, 401)
			assert.equal(
				(
					await app.inject({
						method,
						url,
						headers: { authorization: 'Bearer invalid' }
					})
				).statusCode,
				401
			)
		}
	})
	test('rejects invalid state and a callback from another browser before token exchange', async () => {
		const flow = await start()
		const before = exchanges
		const bad = await app.inject({
			url: '/auth/google/callback?state=invalid&code=private-code',
			headers: { cookie: flow.cookies }
		})
		assert.equal(bad.statusCode, 400)
		assert.ok(!bad.body.includes('private-code'))
		const another = await start()
		const response = await callback(
			{ ...flow, cookies: another.cookies },
			identity()
		)
		assert.equal(response.statusCode, 400)
		assert.equal(exchanges, before)
		const wrongBrowser = flow.cookies.replace(
			/studyflow-google-browser=[^;]+/,
			another.cookies.match(/studyflow-google-browser=[^;]+/)?.[0] ?? ''
		)
		assert.equal(
			(await callback({ ...flow, cookies: wrongBrowser }, identity()))
				.statusCode,
			400
		)
	})
	test('rejects a tampered PKCE verifier, expired state and state replay', async () => {
		const flow = await start()
		const other = await start()
		const wrongVerifier = flow.cookies.replace(
			/studyflow-google-verifier=[^;]+/,
			other.cookies.match(/studyflow-google-verifier=[^;]+/)?.[0] ?? ''
		)
		assert.equal(
			(await callback({ ...flow, cookies: wrongVerifier }, identity()))
				.statusCode,
			400
		)
		const tampered = flow.cookies.replace(
			/studyflow-google-verifier=[^;]+/,
			'studyflow-google-verifier=tampered'
		)
		assert.equal(
			(await callback({ ...flow, cookies: tampered }, identity())).statusCode,
			400
		)
		await database.db.googleOAuthState.update({
			where: {
				stateHash: hashOAuthSecret(
					flow.authorizationUrl.searchParams.get('state') ?? ''
				)
			},
			data: { expiresAt: new Date(0) }
		})
		assert.equal((await callback(flow, identity())).statusCode, 400)
		const fresh = await start()
		const responses = await Promise.all([
			callback(fresh, identity()),
			callback(fresh, identity())
		])
		assert.deepEqual(
			responses.map((value) => value.statusCode).sort(),
			[302, 400]
		)
	})
	test('handles user cancellation and consumes its state', async () => {
		const flow = await start()
		const query = new URLSearchParams({
			state: flow.authorizationUrl.searchParams.get('state') ?? '',
			error: 'access_denied'
		})
		const response = await app.inject({
			url: `/auth/google/callback?${query}`,
			headers: { cookie: flow.cookies }
		})
		assert.equal(resultError(response), 'GOOGLE_ACCESS_DENIED')
		assert.equal((await callback(flow, identity())).statusCode, 400)
	})
	test('invalid ID token never creates an account or an exchange', async () => {
		const google = identity()
		const response = await callback(await start(), google, true)
		assert.equal(resultError(response), 'GOOGLE_IDENTITY_INVALID')
		assert.equal(
			await database.db.user.count({ where: { email: google.email } }),
			0
		)
	})
	test('exchange codes are single-use under concurrency, expire, and require their browser', async () => {
		const first = await login(identity())
		const responses = await Promise.all([exchange(first), exchange(first)])
		assert.deepEqual(
			responses.map((value) => value.statusCode).sort(),
			[200, 400]
		)
		const expired = await login(identity())
		await database.db.googleOAuthExchange.update({
			where: { codeHash: hashOAuthSecret(expired.code) },
			data: { expiresAt: new Date(0) }
		})
		assert.equal((await exchange(expired)).statusCode, 400)
		const valid = await login(identity())
		const other = await login(identity())
		assert.equal(
			(await exchange({ ...valid, cookies: other.cookies })).statusCode,
			400
		)
		assert.equal((await exchange(valid)).statusCode, 200)
	})
	test('exchange rejects cross-origin or missing-Origin requests and malformed bodies', async () => {
		const result = await login(identity())
		for (const origin of [undefined, 'https://attacker.example']) {
			const response = await app.inject({
				method: 'POST',
				url: '/auth/google/exchange',
				headers: { cookie: result.cookies, ...(origin ? { origin } : {}) },
				payload: { code: result.code }
			})
			assert.equal(response.statusCode, 403)
		}
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/google/exchange',
					headers: { origin },
					payload: { code: 'invalid' }
				})
			).statusCode,
			400
		)
		assert.equal(
			(await exchange(result)).headers['access-control-allow-origin'],
			origin
		)
	})
	test('production cookies are signed host-only HttpOnly Secure with the intended SameSite', async () => {
		const production = Fastify({ logger: false })
		production.register(cookie, {
			secret: 'test-only-cookie-key-with-enough-entropy'
		})
		production.register(googleAuthRoutes, {
			db: database.db,
			config: { ...config, production: true },
			googleClient: new TestGoogleClient(clientId),
			provider: {
				authorizeHost: providerUrl,
				authorizePath: '/authorize',
				tokenHost: providerUrl,
				tokenPath: '/token'
			}
		})
		try {
			const response = await production.inject({ url: '/auth/google' })
			assert.equal(response.statusCode, 302)
			assert.equal(response.cookies.length, 3)
			for (const value of response.cookies) {
				assert.ok(value.name.startsWith('__Host-'))
				assert.ok(value.httpOnly && value.secure)
				assert.equal(value.path, '/')
				assert.equal(value.sameSite, 'None')
			}
			const authorizationUrl = new URL(String(response.headers.location))
			const code = randomUUID()
			codes.set(code, {
				challenge: authorizationUrl.searchParams.get('code_challenge') ?? '',
				nonce: authorizationUrl.searchParams.get('nonce') ?? '',
				identity: identity()
			})
			const callbackResult = await production.inject({
				url: `/auth/google/callback?${new URLSearchParams({ code, state: authorizationUrl.searchParams.get('state') ?? '' })}`,
				headers: {
					cookie: response.cookies
						.map((value) => `${value.name}=${encodeURIComponent(value.value)}`)
						.join('; ')
				}
			})
			assert.equal(callbackResult.statusCode, 302)
			const exchangeCookie = callbackResult.cookies.find((value) =>
				value.name.endsWith('google-exchange')
			)
			assert.ok(exchangeCookie?.httpOnly && exchangeCookie.secure)
			assert.equal(exchangeCookie.sameSite, 'None')
			assert.equal(exchangeCookie.maxAge, 60)
		} finally {
			await production.close()
		}
	})

	test('concurrent links cannot attach one Google identity to two users', async () => {
		const a = await seedUser()
		const b = await seedUser()
		const google = identity()
		const outcomes = await Promise.all([
			link(a.token, google),
			link(b.token, google)
		])
		assert.equal(
			outcomes.filter((response) => resultError(response) === null).length,
			1
		)
		assert.equal(
			outcomes.filter(
				(response) => resultError(response) === 'GOOGLE_ACCOUNT_IN_USE'
			).length,
			1
		)
		assert.equal(
			await database.db.oAuthAccount.count({
				where: { providerAccountId: google.sub }
			}),
			1
		)
	})

	test('a pending Google link cannot finish after the initiating session logs out', async () => {
		const local = Fastify({ logger: false })
		local.register(reauthRoutes, { db: database.db })
		await local.ready()
		try {
			const a = await seedUser()
			const flow = await start(a.token)
			assert.equal((await local.inject({ method: 'POST', url: '/auth/logout', headers: { authorization: `Bearer ${a.token}` } })).statusCode, 204)
			const result = await callback(flow, identity())
			assert.equal(resultError(result), 'GOOGLE_SESSION_EXPIRED')
			assert.equal(await database.db.oAuthAccount.count({ where: { userId: a.user.id } }), 0)
		} finally { await local.close() }
	})

	test('link target comes only from JWT, never from callback query parameters', async () => {
		const a = await seedUser()
		const b = await seedUser()
		const response = await app.inject({
			method: 'POST',
			url: `/auth/google/link?userId=${b.user.id}`,
			headers: { authorization: `Bearer ${a.token}`, origin }
		})
		assert.equal(response.statusCode, 200)
		const url = new URL(
			response.json<{ authorizationUrl: string }>().authorizationUrl
		)
		const flow = await database.db.googleOAuthState.findUniqueOrThrow({
			where: { stateHash: hashOAuthSecret(url.searchParams.get('state') ?? '') }
		})
		assert.equal(flow.userId, a.user.id)
	})

	test('expired temporary rows are pruned at the next flow start', async () => {
		const flow = await start()
		const stateHash = hashOAuthSecret(
			flow.authorizationUrl.searchParams.get('state') ?? ''
		)
		await database.db.googleOAuthState.update({
			where: { stateHash },
			data: { expiresAt: new Date(0) }
		})
		const pending = await login(identity())
		const codeHash = hashOAuthSecret(pending.code)
		await database.db.googleOAuthExchange.update({
			where: { codeHash },
			data: { expiresAt: new Date(0) }
		})
		await start()
		assert.equal(
			await database.db.googleOAuthState.findUnique({ where: { stateHash } }),
			null
		)
		assert.equal(
			await database.db.googleOAuthExchange.findUnique({ where: { codeHash } }),
			null
		)
	})

	test('OAuth start is rate-limited', async () => {
		for (let i = 0; i < 10; i++) await start()
		assert.equal((await app.inject({ url: '/auth/google' })).statusCode, 429)
	})

	test('existing password registration, verification, resend, login, me and JWTs still work', async () => {
		const email = `${randomUUID()}@example.com`
		const body = { email, password: 'test-password-123', name: 'Test Student' }
		const registered = await app.inject({
			method: 'POST',
			url: '/auth/register',
			payload: body
		})
		assert.equal(registered.statusCode, 201)
		assert.equal(emailDeliveries.length, 1)
		assert.ok(!registered.body.includes('passwordHash'))
		const loginBefore = await app.inject({
			method: 'POST',
			url: '/auth/login',
			payload: body
		})
		assert.equal(loginBefore.statusCode, 403)
		assert.equal(
			loginBefore.json<{ code: string }>().code,
			'EMAIL_NOT_VERIFIED'
		)
		await database.db.emailVerificationToken.updateMany({
			where: { user: { email } },
			data: { createdAt: new Date(Date.now() - 61000) }
		})
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/resend-verification',
					payload: { email }
				})
			).statusCode,
			200
		)
		assert.equal(emailDeliveries.length, 2)
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/verify-email',
					payload: { token: emailDeliveries[1].token }
				})
			).statusCode,
			200
		)
		const signedIn = await app.inject({
			method: 'POST',
			url: '/auth/login',
			payload: body
		})
		assert.equal(signedIn.statusCode, 200)
		const { accessToken, user } = signedIn.json<{
			accessToken: string
			user: { id: string }
		}>()
		const me = await app.inject({
			url: '/auth/me',
			headers: { authorization: `Bearer ${accessToken}` }
		})
		assert.equal(me.statusCode, 200)
		assert.equal(me.json<{ user: { id: string } }>().user.id, user.id)
		assert.ok(!me.body.includes('passwordHash'))
		const google = identity()
		await link(accessToken, google)
		assert.equal(
			(
				await app.inject({
					method: 'DELETE',
					url: '/auth/google/link',
					headers: { authorization: `Bearer ${accessToken}` }
				})
			).statusCode,
			204
		)
		assert.equal(
			(await app.inject({ method: 'POST', url: '/auth/login', payload: body }))
				.statusCode,
			200
		)
		assert.equal(
			(
				await app.inject({
					url: '/auth/me',
					headers: { authorization: `Bearer ${accessToken}` }
				})
			).statusCode,
			200
		)
	})
})
