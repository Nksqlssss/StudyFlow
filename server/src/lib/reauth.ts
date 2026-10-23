import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import type { Prisma, ReauthPurpose } from '../generated/prisma/client.js'

export class ReauthError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly retryAfter?: number
	) {
		super(message)
	}
}

export function reauthTokenHash(token: string) {
	return createHash('sha256').update(token).digest('hex')
}

export function reauthCodeHash(
	code: string,
	context: {
		userId: string
		sessionHash: string
		purpose: ReauthPurpose
		email: string
		nonce: string
	}
) {
	return createHmac('sha256', env.JWT_SECRET)
		.update(
			JSON.stringify([
				'studyflow:reauth-code:v1',
				context.userId,
				context.sessionHash,
				context.purpose,
				context.email,
				context.nonce,
				code
			])
		)
		.digest('hex')
}

export function matchesCode(hash: string, candidate: string) {
	return timingSafeEqual(
		Buffer.from(hash, 'hex'),
		Buffer.from(candidate, 'hex')
	)
}

// A transaction-scoped user lock also works with Prisma's isolated test schemas.
// All reauthentication mutations and logout use this same lock key.
export async function lockReauthUser(
	tx: Prisma.TransactionClient,
	userId: string,
	hash: string
) {
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`
	const user = await tx.user.findUnique({ where: { id: userId } })
	if (
		!user ||
		(await tx.sessionRevocation.findUnique({ where: { sessionHash: hash } }))
	) {
		throw new ReauthError(401, 'UNAUTHORIZED', 'Unauthorized')
	}
	if (!user.emailVerifiedAt)
		throw new ReauthError(
			403,
			'EMAIL_NOT_VERIFIED',
			'Email verification required'
		)
	return user
}

export async function consumeReauthToken(
	tx: Prisma.TransactionClient,
	input: {
		userId: string
		sessionHash: string
		purpose: ReauthPurpose
		token: string
	}
) {
	const user = await lockReauthUser(tx, input.userId, input.sessionHash)
	const deleted = await tx.reauthToken.deleteMany({
		where: {
			tokenHash: reauthTokenHash(input.token),
			userId: user.id,
			sessionHash: input.sessionHash,
			purpose: input.purpose,
			email: user.email,
			expiresAt: { gt: new Date() }
		}
	})
	if (deleted.count !== 1)
		throw new ReauthError(
			403,
			'INVALID_REAUTH_TOKEN',
			'Invalid or expired reauthentication token'
		)
}
