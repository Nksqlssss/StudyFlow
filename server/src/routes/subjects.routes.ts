import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

const createSubjectSchema = z.object({
	title: z.string().trim().min(1).max(80),
	icon: z.enum(['code', 'math', 'language', 'paint'])
})

const updateSubjectSchema = z.object({
	title: z.string().trim().min(1).max(80).optional(),
	icon: z.enum(['code', 'math', 'language', 'paint']).optional()
})

export async function subjectsRoutes(app: FastifyInstance) {
	app.get(
		'/subjects',
		{
			preHandler: authenticate
		},
		async request => {
			const subjects = await prisma.subject.findMany({
				where: {
					userId: request.user.id
				},
				orderBy: {
					createdAt: 'desc'
				}
			})

			return {
				subjects
			}
		}
	)

	app.post(
		'/subjects',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const result = createSubjectSchema.safeParse(request.body)

			if (!result.success) {
				return reply.status(400).send({
					message: 'Invalid request body'
				})
			}

			const subject = await prisma.subject.create({
				data: {
					title: result.data.title,
					icon: result.data.icon,
					userId: request.user.id
				}
			})

			return reply.status(201).send({
				subject
			})
		}
	)

	app.get(
		'/subjects/:id',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const paramsSchema = z.object({
				id: z.string().uuid()
			})

			const params = paramsSchema.safeParse(request.params)

			if (!params.success) {
				return reply.status(400).send({
					message: 'Invalid subject id'
				})
			}

			const subject = await prisma.subject.findFirst({
				where: {
					id: params.data.id,
					userId: request.user.id
				}
			})

			if (!subject) {
				return reply.status(404).send({
					message: 'Subject not found'
				})
			}

			return {
				subject
			}
		}
	)

	app.patch(
		'/subjects/:id',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const paramsSchema = z.object({
				id: z.string().uuid()
			})

			const params = paramsSchema.safeParse(request.params)

			if (!params.success) {
				return reply.status(400).send({
					message: 'Invalid subject id'
				})
			}

			const body = updateSubjectSchema.safeParse(request.body)

			if (!body.success) {
				return reply.status(400).send({
					message: 'Invalid request body'
				})
			}

			const subject = await prisma.subject.findFirst({
				where: {
					id: params.data.id,
					userId: request.user.id
				}
			})

			if (!subject) {
				return reply.status(404).send({
					message: 'Subject not found'
				})
			}

			const updatedSubject = await prisma.subject.update({
				where: {
					id: subject.id
				},
				data: body.data
			})

			return {
				subject: updatedSubject
			}
		}
	)

	app.delete(
		'/subjects/:id',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const paramsSchema = z.object({
				id: z.string().uuid()
			})

			const params = paramsSchema.safeParse(request.params)

			if (!params.success) {
				return reply.status(400).send({
					message: 'Invalid subject id'
				})
			}

			const subject = await prisma.subject.findFirst({
				where: {
					id: params.data.id,
					userId: request.user.id
				}
			})

			if (!subject) {
				return reply.status(404).send({
					message: 'Subject not found'
				})
			}

			await prisma.subject.delete({
				where: {
					id: subject.id
				}
			})

			return reply.status(204).send()
		}
	)
}
