import { createHash, randomBytes } from 'node:crypto'
import { prisma } from './prisma.js'
import type { PrismaClient } from '../generated/prisma/client.js'

type GeneratedToken = {
	token: string
	tokenHash: string
}

export function generateEmailVerificationToken(): GeneratedToken {
	const token = randomBytes(32).toString('hex')
	const tokenHash = createHash('sha256').update(token).digest('hex')

	return {
		token,
		tokenHash
	}
}

export function getEmailVerificationExpiry(): Date {
	const now = new Date()

	return new Date(now.getTime() + 30 * 60 * 1000)
}

export async function createEmailVerificationToken(userId: string, db: PrismaClient = prisma) {
	const tokens = generateEmailVerificationToken()
	const expiration = getEmailVerificationExpiry()

	await db.emailVerificationToken.create({
		data: {
			userId,
			tokenHash: tokens.tokenHash,
			expiresAt: expiration
		}
	})

	return tokens
}
