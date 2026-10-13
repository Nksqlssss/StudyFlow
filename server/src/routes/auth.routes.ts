import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
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

			const accessToken = signAccessToken({
				userId: user.id
			})

			return reply.status(201).send({
				accessToken,
				user
			})
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
					passwordHash: true
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
