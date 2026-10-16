import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { createEmailVerificationToken } from '../lib/email-verification.js'
import { sendVerificationEmail } from '../lib/email.js'
import { signAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { publicUserSelect } from '../lib/user-select.js'
import { authenticate } from '../middleware/authenticate.js'

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().trim().min(2).max(24)
})

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1)
})

const verifyEmailSchema = z.object({
	token: z.string().regex(/^[a-f0-9]{64}$/)
})

const resendVerificationSchema = z.object({
	email: z.string().email()
})

export async function authRoutes(app: FastifyInstance) {
	app.post(
		'/auth/register',
		{
			config: {
				rateLimit: {
					max: 3,
					timeWindow: '1 minute'
				}
			}
		},
		async (request, reply) => {
			const result = registerSchema.safeParse(request.body)

			if (!result.success) {
				return reply.status(400).send({
					message: 'Invalid request body',
					issues: result.error.flatten()
				})
			}

			const { email, password, name } = result.data
			const normalizedEmail = email.toLowerCase()

			const existingUser = await prisma.user.findUnique({
				where: {
					email: normalizedEmail
				}
			})

			if (existingUser) {
				return reply.status(409).send({
					message: 'User with this email already exists'
				})
			}

			const passwordHash = await bcrypt.hash(password, 10)

			const user = await prisma.user.create({
				data: {
					email: normalizedEmail,
					passwordHash,
					name,
					settings: {
						create: {}
					}
				},
				select: publicUserSelect
			})

			const { token } = await createEmailVerificationToken(user.id)

			await sendVerificationEmail(user.email, token)

			return reply.status(201).send({
				message: 'Check your email to verify your account',
				user
			})
		}
	)

	app.post('/auth/verify-email', async (request, reply) => {
		const result = verifyEmailSchema.safeParse(request.body)

		if (!result.success) {
			return reply.status(400).send({
				message: 'Invalid verification token'
			})
		}

		const { token } = result.data
		const tokenHash = createHash('sha256').update(token).digest('hex')
		const verificationRecord = await prisma.emailVerificationToken.findUnique({
			where: {
				tokenHash: tokenHash
			}
		})

		if (!verificationRecord) {
			return reply.status(400).send({
				message: 'Invalid or expired verification token'
			})
		}

		const now = new Date()
		if (verificationRecord.expiresAt <= now) {
			return reply.status(400).send({
				message: 'Invalid or expired verification token'
			})
		}

		await prisma.$transaction([
			prisma.user.update({
				where: {
					id: verificationRecord.userId
				},
				data: {
					emailVerifiedAt: new Date()
				}
			}),

			prisma.emailVerificationToken.deleteMany({
				where: {
					userId: verificationRecord.userId
				}
			})
		])

		return reply.status(200).send({
			message: 'Email verified successfully'
		})
	})

	app.post(
		'/auth/resend-verification',
		{
			config: {
				rateLimit: {
					max: 3,
					timeWindow: '1 minute'
				}
			}
		},
		async (request, reply) => {
			const result = resendVerificationSchema.safeParse(request.body)

			if (!result.success) {
				return reply.status(400).send({
					message: 'Invalid request body'
				})
			}

			const email = result.data.email.trim().toLowerCase()

			const responseMessage = {
				message: 'If your email requires verification, we will send you a link'
			}

			try {
				const user = await prisma.user.findUnique({
					where: { email },
					select: {
						id: true,
						emailVerifiedAt: true
					}
				})

				if (!user || user.emailVerifiedAt !== null) {
					return reply.status(200).send(responseMessage)
				}

				const lastToken = await prisma.emailVerificationToken.findFirst({
					where: {
						userId: user.id
					},
					orderBy: {
						createdAt: 'desc'
					},
					select: {
						createdAt: true
					}
				})

				if (lastToken) {
					const elapsed = Date.now() - lastToken.createdAt.getTime()

					if (elapsed < 60 * 1000) {
						return reply.status(200).send(responseMessage)
					}
				}

				const tokens = await createEmailVerificationToken(user.id)

				try {
					await sendVerificationEmail(email, tokens.token)
				} catch (error) {
					request.log.error({ err: error }, 'Failed to send verification email')

					try {
						await prisma.emailVerificationToken.deleteMany({
							where: {
								userId: user.id,
								tokenHash: tokens.tokenHash
							}
						})
					} catch (cleanupError) {
						request.log.error(
							{ err: cleanupError },
							'Failed to clean up verification token'
						)
					}

					return reply.status(200).send(responseMessage)
				}

				// Письмо отправлено — удаляем старые токены
				try {
					await prisma.emailVerificationToken.deleteMany({
						where: {
							userId: user.id,
							tokenHash: {
								not: tokens.tokenHash
							}
						}
					})
				} catch (cleanupError) {
					request.log.error(
						{ err: cleanupError },
						'Failed to delete old verification tokens'
					)
				}

				return reply.status(200).send(responseMessage)
			} catch (error) {
				request.log.error(
					{ err: error },
					'Failed to process verification resend request'
				)

				return reply.status(200).send(responseMessage)
			}
		}
	)

	app.post(
		'/auth/login',
		{
			config: {
				rateLimit: {
					max: 5,
					timeWindow: '1 minute'
				}
			}
		},
		async (request, reply) => {
			const result = loginSchema.safeParse(request.body)

			if (!result.success) {
				return reply.status(400).send({
					message: 'Invalid request body',
					issues: result.error.flatten()
				})
			}

			const { email, password } = result.data
			const normalizedEmail = email.toLowerCase()

			const user = await prisma.user.findUnique({
				where: {
					email: normalizedEmail
				},
				select: {
					...publicUserSelect,
					passwordHash: true,
					emailVerifiedAt: true
				}
			})

			if (!user) {
				return reply.status(401).send({
					message: 'Invalid email or password'
				})
			}

			const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

			if (!isPasswordValid) {
				return reply.status(401).send({
					message: 'Invalid email or password'
				})
			}

			if (user.emailVerifiedAt === null) {
				return reply.status(403).send({
					message: 'Email verification required',
					code: 'EMAIL_NOT_VERIFIED'
				})
			}

			const accessToken = signAccessToken({
				userId: user.id
			})

			const { passwordHash, ...publicUser } = user

			return reply.send({
				accessToken,
				user: publicUser
			})
		}
	)

	app.get('/auth/me', { preHandler: authenticate }, async request => {
		return {
			user: request.user
		}
	})
}
