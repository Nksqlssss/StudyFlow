import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

const createTaskSchema = z.object({
	title: z.string().trim().min(1).max(80),
	description: z.string().trim().max(160).optional(),
	deadline: z.string().datetime().optional(),
	status: z.enum(['todo', 'in_progress', 'done']).optional(),
	priority: z.enum(['low', 'medium', 'high']).optional()
})

const updateTaskSchema = z.object({
	title: z.string().trim().min(1).max(80).optional(),
	description: z.string().trim().max(160).nullable().optional(),
	deadline: z.string().datetime().nullable().optional(),
	status: z.enum(['todo', 'in_progress', 'done']).optional(),
	priority: z.enum(['low', 'medium', 'high']).optional()
})

export async function tasksRoutes(app: FastifyInstance) {
	app.post(
		'/subjects/:subjectId/tasks',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const paramsSchema = z.object({
				subjectId: z.string().uuid()
			})

			const params = paramsSchema.safeParse(request.params)

			if (!params.success) {
				return reply.status(400).send({
					message: 'Invalid subject id'
				})
			}

			const body = createTaskSchema.safeParse(request.body)

			if (!body.success) {
				return reply.status(400).send({
					message: 'Invalid request body'
				})
			}

			const subject = await prisma.subject.findFirst({
				where: {
					id: params.data.subjectId,
					userId: request.user.id
				}
			})

			if (!subject) {
				return reply.status(404).send({
					message: 'Subject not found'
				})
			}

			const task = await prisma.task.create({
				data: {
					title: body.data.title,
					description: body.data.description,
					deadline: body.data.deadline
						? new Date(body.data.deadline)
						: undefined,
					status: body.data.status,
					priority: body.data.priority,
					userId: request.user.id,
					subjectId: subject.id
				}
			})

			return reply.status(201).send({
				task
			})
		}
	)

	app.get(
		'/subjects/:subjectId/tasks',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const paramsSchema = z.object({
				subjectId: z.string().uuid()
			})

			const params = paramsSchema.safeParse(request.params)

			if (!params.success) {
				return reply.status(400).send({
					message: 'Invalid subject id'
				})
			}
			const subject = await prisma.subject.findFirst({
				where: {
					id: params.data.subjectId,
					userId: request.user.id
				}
			})

			if (!subject) {
				return reply.status(404).send({
					message: 'Subject not found'
				})
			}

			const tasks = await prisma.task.findMany({
				where: {
					subjectId: subject.id,
					userId: request.user.id
				},
				orderBy: {
					createdAt: 'desc'
				}
			})

			return { tasks }
		}
	)

	app.get(
		'/tasks',
		{
			preHandler: authenticate
		},
		async request => {
			const tasks = await prisma.task.findMany({
				where: {
					userId: request.user.id
				},
				orderBy: {
					createdAt: 'desc'
				}
			})

			return { tasks }
		}
	)

	app.get(
		'/tasks/:id',
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
					message: 'Invalid task id'
				})
			}

			const task = await prisma.task.findFirst({
				where: {
					id: params.data.id,
					userId: request.user.id
				}
			})

			if (!task) {
				return reply.status(404).send({
					message: 'Task not found'
				})
			}

			return { task }
		}
	)

	app.patch(
		'/tasks/:id',
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
					message: 'Invalid task id'
				})
			}

			const body = updateTaskSchema.safeParse(request.body)

			if (!body.success) {
				return reply.status(400).send({
					message: 'Invalid request body'
				})
			}

			const task = await prisma.task.findFirst({
				where: {
					id: params.data.id,
					userId: request.user.id
				}
			})

			if (!task) {
				return reply.status(404).send({
					message: 'Task not found'
				})
			}

			const updatedTask = await prisma.task.update({
				where: {
					id: task.id
				},
				data: {
					title: body.data.title,
					description: body.data.description,
					status: body.data.status,
					priority: body.data.priority,
					deadline:
						body.data.deadline === undefined
							? undefined
							: body.data.deadline === null
								? null
								: new Date(body.data.deadline)
				}
			})

			return {
				task: updatedTask
			}
		}
	)

	app.delete(
		'/tasks/:id',
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
					message: 'Invalid task id'
				})
			}

			const task = await prisma.task.findFirst({
				where: {
					id: params.data.id,
					userId: request.user.id
				}
			})

			if (!task) {
				return reply.status(404).send({
					message: 'Task not found'
				})
			}

			await prisma.task.delete({
				where: {
					id: task.id
				}
			})

			return reply.status(204).send()
		}
	)
}
