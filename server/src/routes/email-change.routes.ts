import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { sendEmailChangeEmail } from '../lib/email.js'
import {
	generateEmailVerificationToken,
	getEmailVerificationExpiry
} from '../lib/email-verification.js'
import { prisma } from '../lib/prisma.js'
import { publicUserSelect } from '../lib/user-select.js'
import { authenticate, createAuthenticate } from '../middleware/authenticate.js'
import { consumeReauthToken, lockReauthUser, ReauthError } from '../lib/reauth.js'
import { sessionHash } from '../lib/session.js'

const changeSchema = z
	.object({
		newEmail: z.string().trim().toLowerCase().email().max(320),
		currentPassword: z.string().min(1).max(72).optional(),
		reauthToken: z.string().regex(/^[a-f0-9]{64}$/).optional()
	})
	.strict()
	.refine(data => !(data.currentPassword && data.reauthToken), { message: 'Choose one verification method' })
const confirmSchema = z
	.object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
	.strict()

class EmailChangeError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string
	) {
		super(message)
	}
}

async function transaction<T>(
	db: PrismaClient,
	work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await db.$transaction(work, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable
			})
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError) {
				if (error.code === 'P2034') {
					if (attempt < 2) continue
					throw new EmailChangeError(
						409,
						'EMAIL_CHANGE_CONFLICT',
						'Account changed concurrently. Please try again'
					)
				}
				if (error.code === 'P2002') {
					throw new EmailChangeError(
						409,
						'EMAIL_ALREADY_TAKEN',
						'Email is already taken'
					)
				}
			}
			throw error
		}
	}
}

export async function emailChangeRoutes(
	app: FastifyInstance,
	options: {
		db?: PrismaClient
		sendEmailChange?: typeof sendEmailChangeEmail
	} = {}
) {
	const db = options.db ?? prisma
	const authenticateUser = options.db ? createAuthenticate(db) : authenticate
	const sendEmail = options.sendEmailChange ?? sendEmailChangeEmail

	app.post(
		'/users/me/email/change',
		{
			preHandler: authenticateUser,
			config: { rateLimit: { max: 3, timeWindow: '1 minute' } }
		},
		async (request, reply) => {
			const body = changeSchema.safeParse(request.body)
			if (!body.success)
				return reply
					.code(400)
					.send({ code: 'VALIDATION_ERROR', message: 'Invalid request body' })
			const { newEmail, currentPassword, reauthToken } = body.data
			const userId = request.user.id
			const hash = sessionHash(request.headers.authorization!)
			const user = await db.user.findUnique({ where: { id: userId } })
			if (!user)
				return reply
					.code(401)
					.send({ code: 'UNAUTHORIZED', message: 'Unauthorized' })
			if (!reauthToken && (!user.passwordHash || !currentPassword)) {
				return reply
					.code(403)
					.send({
						code: 'REAUTHENTICATION_REQUIRED',
						message: 'Current password or email reauthentication is required'
					})
			}
			if (!reauthToken && !(await bcrypt.compare(currentPassword!, user.passwordHash!))) {
				return reply
					.code(403)
					.send({
						code: 'INVALID_CURRENT_PASSWORD',
						message: 'Current password is incorrect'
					})
			}
			const { token, tokenHash } = generateEmailVerificationToken()
			try {
				await transaction(db, async (tx) => {
					// Serialize replacement and confirmation for this user, including across devices.
					const current = await lockReauthUser(tx, userId, hash)
					if (
						!current ||
						current.email !== user.email ||
						current.passwordHash !== user.passwordHash
					) {
						throw new EmailChangeError(
							409,
							'EMAIL_CHANGE_CONFLICT',
							'Account changed. Please try again'
						)
					}
					if (newEmail === current.email.toLowerCase()) {
						throw new EmailChangeError(
							400,
							'EMAIL_UNCHANGED',
							'New email must differ from current email'
						)
					}
					if (
						await tx.user.findUnique({
							where: { email: newEmail },
							select: { id: true }
						})
					) {
						throw new EmailChangeError(
							409,
							'EMAIL_ALREADY_TAKEN',
							'Email is already taken'
						)
					}
					const data = {
						newEmail,
						tokenHash,
						expiresAt: getEmailVerificationExpiry(),
						createdAt: new Date()
					}
					if (reauthToken) await consumeReauthToken(tx, { userId, sessionHash: hash, purpose: 'change_email', token: reauthToken })
					await tx.emailChangeToken.upsert({
						where: { userId },
						create: { userId, ...data },
						update: data
					})
				})
			} catch (error) {
				if (error instanceof EmailChangeError || error instanceof ReauthError)
					return reply
						.code(error.status)
						.send({ code: error.code, message: error.message })
				throw error
			}

			try {
				await sendEmail(newEmail, token)
			} catch {
				// Never log provider errors: they may contain the confirmation link.
				request.log.warn('Failed to send email change confirmation')
				await db.emailChangeToken.deleteMany({ where: { userId, tokenHash } })
				return reply
					.code(503)
					.send({
						code: 'EMAIL_DELIVERY_FAILED',
						message: 'Could not send confirmation email. Please try again'
					})
			}
			return reply
				.code(200)
				.send({ message: 'Confirmation email sent', expiresIn: 1800 })
		}
	)

	app.post(
		'/users/me/email/confirm',
		{
			preHandler: authenticateUser,
			config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
		},
		async (request, reply) => {
			const body = confirmSchema.safeParse(request.body)
			if (!body.success)
				return reply
					.code(400)
					.send({ code: 'VALIDATION_ERROR', message: 'Invalid request body' })
			const tokenHash = createHash('sha256')
				.update(body.data.token)
				.digest('hex')
			const userId = request.user.id
			try {
				const user = await transaction(db, async (tx) => {
					await lockReauthUser(tx, userId, sessionHash(request.headers.authorization!))
					const record = await tx.emailChangeToken.findUnique({
						where: { userId }
					})
					if (
						!record ||
						record.tokenHash !== tokenHash ||
						record.expiresAt <= new Date()
					) {
						throw new EmailChangeError(
							400,
							'INVALID_EMAIL_CHANGE_TOKEN',
							'Invalid or expired email change token'
						)
					}
					const owner = await tx.user.findUnique({
						where: { email: record.newEmail },
						select: { id: true }
					})
					if (owner)
						throw new EmailChangeError(
							409,
							'EMAIL_ALREADY_TAKEN',
							'Email is already taken'
						)
					const consumed = await tx.emailChangeToken.deleteMany({
						where: { userId, tokenHash, expiresAt: { gt: new Date() } }
					})
					if (consumed.count !== 1)
						throw new EmailChangeError(
							400,
							'INVALID_EMAIL_CHANGE_TOKEN',
							'Invalid or expired email change token'
						)
					const updated = await tx.user.update({
						where: { id: userId },
						data: { email: record.newEmail, emailVerifiedAt: new Date() },
						select: publicUserSelect
					})
					// Registration links for the previous address must not verify a later address.
					await tx.emailVerificationToken.deleteMany({ where: { userId } })
					await tx.reauthToken.deleteMany({ where: { userId } })
					await tx.reauthChallenge.updateMany({ where: { userId }, data: { codeHash: null } })
					return updated
				})
				return { user }
			} catch (error) {
				if (error instanceof EmailChangeError || error instanceof ReauthError)
					return reply
						.code(error.status)
						.send({ code: error.code, message: error.message })
				throw error
			}
		}
	)
}
