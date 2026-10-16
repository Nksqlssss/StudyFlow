import { createHash, randomBytes } from 'node:crypto'
import { prisma } from './prisma.js'

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

export async function createEmailVerificationToken(userId: string) {
	const tokens = generateEmailVerificationToken()
	const expiration = getEmailVerificationExpiry()

	await prisma.emailVerificationToken.create({
		data: {
			userId,
			tokenHash: tokens.tokenHash,
			expiresAt: expiration
		}
	})

	return tokens
}
