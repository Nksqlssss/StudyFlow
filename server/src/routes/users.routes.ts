import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'
import { publicUserSelect } from '../lib/user-select.js'
import { authenticate } from '../middleware/authenticate.js'

const updateUserSchema = z
	.object({
		name: z.string().trim().min(2).max(24).optional(),
		username: z
			.string()
			.min(3)
			.max(24)
			.trim()
			.regex(/^[a-zA-Z0-9_]+$/)
			.nullable()
			.optional(),
		birthDate: z.iso.date().nullable().optional(),
		isPublic: z.boolean().optional()
	})
	.refine(data => Object.keys(data).length > 0, {
		message: 'At least one field must be provided'
	})

export async function userRoutes(app: FastifyInstance) {
	;(app.patch(
		'/users/me',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const body = updateUserSchema.safeParse(request.body)

			if (!body.success) {
				return reply.status(400).send({
					message: 'Invalid request body',
					issues: body.error.flatten()
				})
			}

			const { username, birthDate, ...rest } = body.data

			const updateData = {
				...rest,
				...(username !== undefined && {
					username: username === null ? null : username.toLowerCase()
				}),
				...(birthDate !== undefined && {
					birthDate: birthDate === null ? null : new Date(birthDate)
				})
			}

			try {
				const updatedUser = await prisma.user.update({
					where: {
						id: request.user.id
					},
					data: updateData,
					select: publicUserSelect
				})

				return { user: updatedUser }
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2002'
				) {
					return reply.status(409).send({
						message: 'Username is already taken'
					})
				}

				throw error
			}
		}
	),
		app.delete(
			'/users/me',
			{
				preHandler: authenticate
			},
			async (request, reply) => {
				const userId = request.user.id

				const result = await prisma.user.deleteMany({
					where: {
						id: userId
					}
				})

				if (result.count === 0) {
					return reply.code(404).send({
						error: 'USER_NOT_FOUND',
						message: 'User not found'
					})
				}

				return reply.code(204).send()
			}
		))
}
