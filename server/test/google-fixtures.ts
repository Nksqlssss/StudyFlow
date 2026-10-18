import { generateKeyPairSync } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { CertificateFormat } from 'google-auth-library/build/src/auth/oauth2client.js'

export const clientId = 'studyflow-test-client'
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048
})
const certificate = publicKey.export({ type: 'spki', format: 'pem' }).toString()

export class TestGoogleClient extends OAuth2Client {
	override async getFederatedSignonCertsAsync() {
		return { certs: { 'test-key': certificate }, format: CertificateFormat.PEM }
	}
}

export function identityToken(
	nonce: string,
	claims: Record<string, unknown> = {}
) {
	const now = Math.floor(Date.now() / 1000)
	return jwt.sign(
		{
			iss: 'https://accounts.google.com',
			aud: clientId,
			sub: 'test-google-sub',
			email: 'google-user@example.com',
			email_verified: true,
			name: 'Google Student',
			nonce,
			iat: now,
			exp: now + 300,
			...claims
		},
		privateKey,
		{ algorithm: 'RS256', keyid: 'test-key' }
	)
}
