import assert from 'node:assert/strict'
import { test } from 'node:test'
import jwt from 'jsonwebtoken'
import {
	GoogleAuthError,
	hashOAuthSecret,
	verifyGoogleIdentity
} from '../src/lib/google-identity.js'
import { clientId, identityToken, TestGoogleClient } from './google-fixtures.js'

const client = new TestGoogleClient(clientId)
const nonce = 'test-nonce'

test('verifies a signed Google identity and normalizes its email', async () => {
	const identity = await verifyGoogleIdentity(
		client,
		identityToken(nonce, { email: 'Student@Example.com' }),
		clientId,
		hashOAuthSecret(nonce)
	)
	assert.deepEqual(identity, {
		sub: 'test-google-sub',
		email: 'student@example.com',
		name: 'Google Student'
	})
})

for (const [label, claims] of Object.entries({
	'a wrong audience': { aud: 'different-client' },
	'a wrong issuer': { iss: 'https://attacker.example' },
	'an expired token': { exp: Math.floor(Date.now() / 1000) - 600 },
	'a future issued-at': { iat: Math.floor(Date.now() / 1000) + 600 },
	'an unverified email': { email_verified: false },
	'a missing subject': { sub: '' },
	'a wrong nonce': { nonce: 'wrong-nonce' },
	'a wrong authorized party': { azp: 'different-client' }
})) {
	test(`rejects ${label}`, async () => {
		await assert.rejects(
			verifyGoogleIdentity(
				client,
				identityToken(nonce, claims),
				clientId,
				hashOAuthSecret(nonce)
			),
			(error: unknown) =>
				error instanceof GoogleAuthError &&
				error.code === 'GOOGLE_IDENTITY_INVALID'
		)
	})
}

test('rejects an invalid signature without exposing the raw token', async () => {
	const token = jwt.sign({ sub: 'attacker' }, 'test-only-wrong-key', {
		algorithm: 'HS256',
		keyid: 'test-key'
	})
	await assert.rejects(
		verifyGoogleIdentity(client, token, clientId, hashOAuthSecret(nonce)),
		(error: unknown) =>
			error instanceof GoogleAuthError && !error.message.includes(token)
	)
})
