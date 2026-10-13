import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { env } from 'node:process'
import { prisma } from './lib/prisma.js'
import { authRoutes } from './routes/auth.routes.js'
import { settingsRoutes } from './routes/settings.routes.js'
import { subjectsRoutes } from './routes/subjects.routes.js'
import { tasksRoutes } from './routes/tasks.routes.js'
import { userRoutes } from './routes/users.routes.js'

export function buildApp() {
	const app = Fastify({
		logger: true
	})

	app.register(cors, {
		origin: env.FRONTEND_URL,
		methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization']
	})

	app.register(rateLimit, {
		max: 100,
		timeWindow: '1 minute'
	})

	app.register(authRoutes)
	app.register(subjectsRoutes)
	app.register(tasksRoutes)
	app.register(settingsRoutes)
	app.register(userRoutes)

	app.get('/health', async () => {
		return {
			status: 'ok',
			service: 'studyflow-api'
		}
	})

	app.get('/db-health', async () => {
		await prisma.$queryRaw`SELECT 1`

		return {
			status: 'ok',
			database: 'connected'
		}
	})

	return app
}
