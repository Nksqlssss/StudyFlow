import type { FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'
import { publicUserSelect } from '../lib/user-select.js'

export async function authenticate(
	request: FastifyRequest,
	reply: FastifyReply
) {
	const authorization = request.headers.authorization
	let payload: ReturnType<typeof verifyAccessToken>

	if (!authorization?.startsWith('Bearer ')) {
		return reply.status(401).send({
			message: 'Unauthorized'
		})
	}

	const token = authorization.slice('Bearer '.length)

	try {
		payload = verifyAccessToken(token)
	} catch {
		return reply.status(401).send({
			message: 'Unauthorized'
		})
	}

	const user = await prisma.user.findUnique({
		where: {
			id: payload.userId
		},
		select: {
			...publicUserSelect,
			emailVerifiedAt: true
		}
	})

	if (!user) {
		return reply.status(401).send({
			message: 'Unauthorized'
		})
	}

	if (user.emailVerifiedAt === null) {
		return reply.status(403).send({
			message: 'Email verification required',
			code: 'EMAIL_NOT_VERIFIED'
		})
	}

	request.user = user
}
