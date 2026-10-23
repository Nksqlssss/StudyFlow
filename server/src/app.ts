import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { createHmac } from 'node:crypto'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { authRoutes } from './routes/auth.routes.js'
import { googleAuthRoutes } from './routes/google-auth.routes.js'
import { settingsRoutes } from './routes/settings.routes.js'
import { subjectsRoutes } from './routes/subjects.routes.js'
import { tasksRoutes } from './routes/tasks.routes.js'
import { userRoutes } from './routes/users.routes.js'
import { emailChangeRoutes } from './routes/email-change.routes.js'
import { reauthRoutes } from './routes/reauth.routes.js'

export function buildApp() {
	const app = Fastify({
		logger: {
			serializers: {
				req(request) {
					return { method: request.method, url: request.url?.split('?')[0], hostname: request.hostname, remoteAddress: request.ip }
				}
			},
			redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.location', 'res.headers.set-cookie']
		}
	})

	app.register(cors, {
		origin: new URL(env.FRONTEND_URL).origin,
		credentials: true,
		methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization']
	})

	app.register(rateLimit, {
		max: 100,
		timeWindow: '1 minute'
	})

	app.register(cookie, {
		secret: createHmac('sha256', env.JWT_SECRET).update('studyflow:oauth-cookie').digest('hex')
	})

	app.register(authRoutes)
	app.register(googleAuthRoutes)
	app.register(subjectsRoutes)
	app.register(tasksRoutes)
	app.register(settingsRoutes)
	app.register(userRoutes)
	app.register(emailChangeRoutes)
	app.register(reauthRoutes)

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
