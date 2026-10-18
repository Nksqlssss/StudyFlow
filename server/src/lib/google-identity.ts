import { createHash, timingSafeEqual } from 'node:crypto'
import type { OAuth2Client } from 'google-auth-library'
import { z } from 'zod'

export class GoogleAuthError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string
	) {
		super(message)
	}
}

export function hashOAuthSecret(value: string) {
	return createHash('sha256').update(value).digest('hex')
}

export function sameOAuthSecret(left: string, right: string) {
	return timingSafeEqual(
		Buffer.from(hashOAuthSecret(left)),
		Buffer.from(hashOAuthSecret(right))
	)
}

const identitySchema = z.object({
	sub: z.string().min(1).max(255),
	email: z.string().email().max(320),
	email_verified: z.literal(true),
	name: z.string().optional(),
	nonce: z.string().min(1),
	iss: z.enum(['https://accounts.google.com', 'accounts.google.com']),
	aud: z.string(),
	exp: z.number(),
	iat: z.number(),
	azp: z.string().optional()
})

export type GoogleIdentity = { sub: string; email: string; name: string }

export async function verifyGoogleIdentity(
	client: OAuth2Client,
	idToken: string,
	clientId: string,
	nonceHash: string
): Promise<GoogleIdentity> {
	try {
		const ticket = await client.verifyIdToken({ idToken, audience: clientId })
		const payload = identitySchema.parse(ticket.getPayload())
		const now = Date.now() / 1000
		if (
			payload.aud !== clientId ||
			(payload.azp !== undefined && payload.azp !== clientId) ||
			payload.exp <= now ||
			payload.iat > now + 60 ||
			!sameOAuthSecret(hashOAuthSecret(payload.nonce), nonceHash)
		)
			throw new Error('Invalid identity claims')

		return {
			sub: payload.sub,
			email: payload.email.toLowerCase(),
			name: payload.name?.trim().slice(0, 24) || 'Google user'
		}
	} catch {
		// Never propagate Google/Gaxios errors: they can contain tokens or credentials.
		throw new GoogleAuthError(
			401,
			'GOOGLE_IDENTITY_INVALID',
			'Google identity could not be verified'
		)
	}
}
