import type { FastifyInstance } from 'fastify'
import { randomBytes, randomInt } from 'node:crypto'
import { z } from 'zod'
import type { PrismaClient } from '../generated/prisma/client.js'
import { sendReauthCodeEmail } from '../lib/email.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import {
	lockReauthUser,
	matchesCode,
	reauthCodeHash,
	reauthTokenHash,
	ReauthError
} from '../lib/reauth.js'
import { sessionHash } from '../lib/session.js'
import { createAuthenticate } from '../middleware/authenticate.js'

const purpose = z.enum(['set_password', 'change_email'])
const requestSchema = z.object({ purpose }).strict()
const verifySchema = z
	.object({ purpose, code: z.string().regex(/^\d{6}$/) })
	.strict()
const MINUTE = 60000
const ATTEMPT_WINDOW = 15 * MINUTE
const SEND_WINDOW = 60 * MINUTE
const secondsUntil = (time: number) =>
	Math.max(1, Math.ceil((time - Date.now()) / 1000))

export async function reauthRoutes(
	app: FastifyInstance,
	options: {
		db?: PrismaClient
		sendCode?: typeof sendReauthCodeEmail
	} = {}
) {
	const db = options.db ?? prisma
	const sendCode = options.sendCode ?? sendReauthCodeEmail
	const authenticate = createAuthenticate(db)
	app.addHook('onRequest', async (_request, reply) => {
		reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache')
	})
	app.setErrorHandler((error, request, reply) => {
		if (error instanceof ReauthError) {
			if (error.retryAfter) reply.header('Retry-After', error.retryAfter)
			return reply
				.code(error.status)
				.send({
					code: error.code,
					message: error.message,
					...(error.retryAfter ? { retryAfter: error.retryAfter } : {})
				})
		}
		if (
			error &&
			typeof error === 'object' &&
			'statusCode' in error &&
			error.statusCode === 429
		) {
			return reply
				.code(429)
				.send({ code: 'RATE_LIMITED', message: 'Too many requests' })
		}
		if (
			error &&
			typeof error === 'object' &&
			'statusCode' in error &&
			error.statusCode === 400
		) {
			return reply
				.code(400)
				.send({ code: 'VALIDATION_ERROR', message: 'Invalid request body' })
		}
		request.log.error('Email reauthentication operation failed')
		return reply
			.code(503)
			.send({
				code: 'REAUTH_UNAVAILABLE',
				message: 'Reauthentication is temporarily unavailable'
			})
	})

	app.post(
		'/auth/reauth/email/request',
		{
			preHandler: authenticate,
			config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
		},
		async (request, reply) => {
			const body = requestSchema.safeParse(request.body)
			if (!body.success)
				return reply
					.code(400)
					.send({ code: 'VALIDATION_ERROR', message: 'Invalid request body' })
			const userId = request.user.id
			const hash = sessionHash(request.headers.authorization!)
			const code = randomInt(0, 1000000).toString().padStart(6, '0')
			const nonce = randomBytes(16).toString('hex')
			const record = await db.$transaction(async (tx) => {
				const user = await lockReauthUser(tx, userId, hash)
				if (body.data.purpose === 'set_password' && user.passwordHash) {
					throw new ReauthError(
						409,
						'PASSWORD_ALREADY_SET',
						'Password already exists'
					)
				}
				const previous = await tx.reauthChallenge.findUnique({
					where: { userId }
				})
				const now = new Date()
				const attemptWindowActive =
					previous &&
					now.getTime() - previous.attemptWindowStartedAt.getTime() <
						ATTEMPT_WINDOW
				if (attemptWindowActive && previous.failedAttempts >= 5) {
					throw new ReauthError(
						429,
						'REAUTH_ATTEMPTS_EXCEEDED',
						'Too many code attempts. Please try later',
						secondsUntil(
							previous.attemptWindowStartedAt.getTime() + ATTEMPT_WINDOW
						)
					)
				}
				if (
					previous &&
					now.getTime() - previous.lastSentAt.getTime() < MINUTE
				) {
					throw new ReauthError(
						429,
						'REAUTH_SEND_LIMIT',
						'Please wait before requesting another code',
						secondsUntil(previous.lastSentAt.getTime() + MINUTE)
					)
				}
				const sendWindowActive =
					previous &&
					now.getTime() - previous.sendWindowStartedAt.getTime() < SEND_WINDOW
				if (sendWindowActive && previous.sendCount >= 3) {
					throw new ReauthError(
						429,
						'REAUTH_SEND_LIMIT',
						'Too many code requests. Please try later',
						secondsUntil(previous.sendWindowStartedAt.getTime() + SEND_WINDOW)
					)
				}
				const data = {
					purpose: body.data.purpose,
					sessionHash: hash,
					email: user.email,
					nonce,
					codeHash: reauthCodeHash(code, {
						userId,
						sessionHash: hash,
						purpose: body.data.purpose,
						email: user.email,
						nonce
					}),
					expiresAt: new Date(now.getTime() + 10 * MINUTE),
					lastSentAt: now,
					sendWindowStartedAt: sendWindowActive
						? previous.sendWindowStartedAt
						: now,
					sendCount: sendWindowActive ? previous.sendCount + 1 : 1,
					attemptWindowStartedAt: attemptWindowActive
						? previous.attemptWindowStartedAt
						: now,
					failedAttempts: attemptWindowActive ? previous.failedAttempts : 0
				}
				await tx.reauthToken.deleteMany({
					where: { userId, expiresAt: { lte: now } }
				})
				return tx.reauthChallenge.upsert({
					where: { userId },
					create: { userId, ...data },
					update: data
				})
			})
			try {
				await sendCode(record.email, code, record.purpose)
			} catch {
				request.log.warn('Failed to send reauthentication code')
				await db.reauthChallenge.updateMany({
					where: { userId, nonce },
					data: { codeHash: null }
				})
				throw new ReauthError(
					503,
					'EMAIL_DELIVERY_FAILED',
					'Could not send verification code'
				)
			}
			return {
				message: 'Verification code sent',
				expiresIn: 600,
				retryAfter: 60
			}
		}
	)

	app.post(
		'/auth/reauth/email/verify',
		{
			preHandler: authenticate,
			config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
		},
		async (request, reply) => {
			const body = verifySchema.safeParse(request.body)
			if (!body.success)
				return reply
					.code(400)
					.send({ code: 'VALIDATION_ERROR', message: 'Invalid request body' })
			const userId = request.user.id
			const hash = sessionHash(request.headers.authorization!)
			const sessionExpiry =
				verifyAccessToken(request.headers.authorization!.slice(7)).exp * 1000
			const result = await db.$transaction(async (tx) => {
				const user = await lockReauthUser(tx, userId, hash)
				const row = await tx.reauthChallenge.findUnique({ where: { userId } })
				if (!row)
					return {
						error: new ReauthError(
							400,
							'INVALID_REAUTH_CODE',
							'Invalid or expired verification code'
						)
					}
				const now = new Date()
				const active =
					now.getTime() - row.attemptWindowStartedAt.getTime() < ATTEMPT_WINDOW
				const failedAttempts = active ? row.failedAttempts : 0
				if (failedAttempts >= 5)
					return {
						error: new ReauthError(
							429,
							'REAUTH_ATTEMPTS_EXCEEDED',
							'Too many code attempts. Please try later',
							secondsUntil(
								row.attemptWindowStartedAt.getTime() + ATTEMPT_WINDOW
							)
						)
					}
				const candidate = reauthCodeHash(body.data.code, row)
				if (
					!row.codeHash ||
					row.expiresAt <= now ||
					row.sessionHash !== hash ||
					row.email !== user.email ||
					row.purpose !== body.data.purpose ||
					!matchesCode(row.codeHash, candidate)
				) {
					// Return rather than throw: failed-attempt counters must be committed.
					await tx.reauthChallenge.update({
						where: { userId },
						data: {
							failedAttempts: failedAttempts + 1,
							attemptWindowStartedAt: active ? row.attemptWindowStartedAt : now
						}
					})
					return {
						error: new ReauthError(
							failedAttempts + 1 >= 5 ? 429 : 400,
							failedAttempts + 1 >= 5
								? 'REAUTH_ATTEMPTS_EXCEEDED'
								: 'INVALID_REAUTH_CODE',
							'Invalid or expired verification code',
							failedAttempts + 1 >= 5
								? secondsUntil(
										(active ? row.attemptWindowStartedAt : now).getTime() +
											ATTEMPT_WINDOW
									)
								: undefined
						)
					}
				}
				const token = randomBytes(32).toString('hex')
				const expiresAt = new Date(
					Math.min(now.getTime() + 5 * MINUTE, sessionExpiry)
				)
				if (expiresAt <= now)
					throw new ReauthError(401, 'UNAUTHORIZED', 'Unauthorized')
				await tx.reauthToken.create({
					data: {
						tokenHash: reauthTokenHash(token),
						userId,
						sessionHash: hash,
						email: user.email,
						purpose: row.purpose,
						expiresAt
					}
				})
				await tx.reauthChallenge.update({
					where: { userId },
					data: { codeHash: null }
				})
				return {
					reauthToken: token,
					expiresIn: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
					purpose: row.purpose
				}
			})
			if ('error' in result) throw result.error
			return result
		}
	)

	app.post(
		'/auth/logout',
		{ preHandler: authenticate },
		async (request, reply) => {
			const authorization = request.headers.authorization!
			const hash = sessionHash(authorization)
			const userId = request.user.id
			const expiresAt = new Date(
				verifyAccessToken(authorization.slice(7)).exp * 1000
			)
			await db.$transaction(async (tx) => {
				await lockReauthUser(tx, userId, hash)
				await tx.sessionRevocation.upsert({
					where: { sessionHash: hash },
					create: { sessionHash: hash, userId, expiresAt },
					update: {}
				})
				await tx.reauthToken.deleteMany({
					where: { userId, sessionHash: hash }
				})
				await tx.reauthChallenge.updateMany({
					where: { userId, sessionHash: hash },
					data: { codeHash: null }
				})
				await tx.sessionRevocation.deleteMany({
					where: { userId, expiresAt: { lte: new Date() } }
				})
			})
			return reply.code(204).send()
		}
	)
}
