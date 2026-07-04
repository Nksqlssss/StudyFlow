import type { FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return reply.status(401).send({
      message: 'Unauthorized'
    });
  }

  const token = authorization.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return reply.status(401).send({
        message: 'Unauthorized'
      });
    }

    request.user = user;
  } catch {
    return reply.status(401).send({
      message: 'Unauthorized'
    });
  }
}