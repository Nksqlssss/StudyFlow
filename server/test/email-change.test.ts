import 'dotenv/config'
import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import { createHash, randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import Fastify, { type FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { emailChangeRoutes } from '../src/routes/email-change.routes.js'
import { authRoutes } from '../src/routes/auth.routes.js'
import { createAuthenticate } from '../src/middleware/authenticate.js'
import { signAccessToken } from '../src/lib/jwt.js'
import { signInWithGoogle } from '../src/lib/google-accounts.js'
import { createEmailChangeHtml } from '../src/lib/email-templates/email-change.js'
import { createTestDatabase } from './test-database.js'

const password = 'test-password-123'

describe('Email changes with real PostgreSQL and authenticated requests', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>
	let app: FastifyInstance
	let passwordHash: string
	let deliveries: { email: string; token: string }[]
	let failDelivery = false
	let activeUser: Awaited<ReturnType<typeof seedUser>>
	let otherUser: Awaited<ReturnType<typeof seedUser>>

	async function seedUser(hash: string | null = passwordHash) {
		const user = await database.db.user.create({
			data: {
				email: `${randomUUID()}@example.com`,
				name: 'Email Test',
				passwordHash: hash,
				emailVerifiedAt: new Date()
			}
		})
		return {
			user,
			headers: {
				authorization: `Bearer ${signAccessToken({ userId: user.id })}`
			}
		}
	}
	before(async () => {
		database = await createTestDatabase()
		passwordHash = await bcrypt.hash(password, 4)
	})
	beforeEach(async () => {
		deliveries = []
		failDelivery = false
		activeUser = await seedUser()
		otherUser = await seedUser()
		app = Fastify({ logger: false })
		app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
		app.register(emailChangeRoutes, {
			db: database.db,
			sendEmailChange: async (email: string, token: string) => {
				if (failDelivery) throw new Error('Test provider failure')
				deliveries.push({ email, token })
			}
		})
		app.register(authRoutes, {
			db: database.db,
			authenticateUser: createAuthenticate(database.db),
			sendVerification: async () => {}
		})
		await app.ready()
	})
	afterEach(async () => {
		await app?.close()
	})
	after(async () => {
		await database?.close()
	})

	function change(
		newEmail = `${randomUUID()}@example.com`,
		currentPassword = password
	) {
		return app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers: activeUser.headers,
			payload: { newEmail, currentPassword }
		})
	}
	function confirm(token: string, headers = activeUser.headers) {
		return app.inject({
			method: 'POST',
			url: '/users/me/email/confirm',
			headers,
			payload: { token }
		})
	}
	async function current() {
		return database.db.user.findUniqueOrThrow({
			where: { id: activeUser.user.id }
		})
	}

	test('stores only a hash, leaves current email unchanged, confirms and consumes token', async () => {
		const newEmail = `${randomUUID()}@example.com`
		const response = await change(`  ${newEmail.toUpperCase()}  `)
		assert.equal(response.statusCode, 200)
		assert.deepEqual(response.json(), {
			message: 'Confirmation email sent',
			expiresIn: 1800
		})
		assert.equal(deliveries[0].email, newEmail)
		const token = deliveries[0].token
		assert.match(token, /^[a-f0-9]{64}$/)
		assert.ok(!response.body.includes(token))
		assert.equal((await current()).email, activeUser.user.email)
		const row = await database.db.emailChangeToken.findUniqueOrThrow({
			where: { userId: activeUser.user.id }
		})
		assert.equal(
			row.tokenHash,
			createHash('sha256').update(token).digest('hex')
		)
		assert.ok(row.expiresAt.getTime() > Date.now() + 29 * 60000)
		await database.db.emailVerificationToken.create({
			data: {
				userId: activeUser.user.id,
				tokenHash: randomUUID(),
				expiresAt: new Date(Date.now() + 60000)
			}
		})
		const confirmed = await confirm(token)
		assert.equal(confirmed.statusCode, 200)
		assert.equal(
			confirmed.json<{ user: { email: string } }>().user.email,
			newEmail
		)
		assert.ok(!confirmed.body.includes('passwordHash'))
		assert.equal((await current()).email, newEmail)
		assert.ok((await current()).emailVerifiedAt)
		assert.equal(
			await database.db.emailChangeToken.count({
				where: { userId: activeUser.user.id }
			}),
			0
		)
		assert.equal(
			await database.db.emailVerificationToken.count({
				where: { userId: activeUser.user.id }
			}),
			0
		)
		assert.equal((await confirm(token)).statusCode, 400)
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/login',
					payload: { email: newEmail, password }
				})
			).statusCode,
			200
		)
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/login',
					payload: { email: activeUser.user.email, password }
				})
			).statusCode,
			401
		)
	})

	test('requires JWT on both routes', async () => {
		for (const url of ['/users/me/email/change', '/users/me/email/confirm']) {
			for (const headers of [{}, { authorization: 'Bearer invalid' }]) {
				assert.equal(
					(await app.inject({ method: 'POST', url, headers, payload: {} }))
						.statusCode,
					401
				)
			}
		}
	})
	test('validates requests and never sends mail for invalid input', async () => {
		for (const payload of [
			{},
			{ newEmail: 'invalid', currentPassword: password },
			{ newEmail: 'a@example.com', currentPassword: 123 }
		]) {
			assert.equal(
				(
					await app.inject({
						method: 'POST',
						url: '/users/me/email/change',
						headers: activeUser.headers,
						payload
					})
				).statusCode,
				400
			)
		}
		for (const payload of [{}, { token: 'invalid' }, { token: null }]) {
			assert.equal(
				(
					await app.inject({
						method: 'POST',
						url: '/users/me/email/confirm',
						headers: activeUser.headers,
						payload
					})
				).statusCode,
				400
			)
		}
		assert.equal(deliveries.length, 0)
	})
	test('requires current password, rejects a wrong one', async () => {
		const missing = await app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers: activeUser.headers,
			payload: { newEmail: 'next@example.com' }
		})
		assert.equal(missing.statusCode, 403)
		assert.equal(missing.json().code, 'REAUTHENTICATION_REQUIRED')
		const wrong = await change(undefined, 'incorrect')
		assert.equal(wrong.statusCode, 403)
		assert.equal(wrong.json().code, 'INVALID_CURRENT_PASSWORD')
		assert.equal(deliveries.length, 0)
	})
	test('Google-only user cannot bypass reauthentication by installing a password', async () => {
		const googleOnly = await seedUser(null)
		const request = await app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers: googleOnly.headers,
			payload: { newEmail: 'next@example.com', currentPassword: password }
		})
		assert.equal(request.statusCode, 403)
		assert.equal(request.json().code, 'REAUTHENTICATION_REQUIRED')
		const install = await app.inject({
			method: 'POST',
			url: '/auth/password',
			headers: googleOnly.headers,
			payload: { password }
		})
		assert.equal(install.statusCode, 403)
		assert.equal(install.json().code, 'REAUTHENTICATION_REQUIRED')
		assert.equal(
			(
				await database.db.user.findUniqueOrThrow({
					where: { id: googleOnly.user.id }
				})
			).passwordHash,
			null
		)
	})
	test('rejects same and already occupied email', async () => {
		assert.equal(
			(await change(activeUser.user.email.toUpperCase())).statusCode,
			400
		)
		const occupied = await change(otherUser.user.email)
		assert.equal(occupied.statusCode, 409)
		assert.equal(occupied.json().code, 'EMAIL_ALREADY_TAKEN')
		assert.equal(deliveries.length, 0)
	})
	test('replaces previous token on another request', async () => {
		await change()
		const old = deliveries[0].token
		const nextEmail = `${randomUUID()}@example.com`
		await change(nextEmail)
		assert.equal((await confirm(old)).statusCode, 400)
		assert.equal((await confirm(deliveries[1].token)).statusCode, 200)
		assert.equal((await current()).email, nextEmail)
	})
	test('rejects unknown, expired and another users token without consuming it', async () => {
		await change()
		const token = deliveries[0].token
		assert.equal((await confirm(token, otherUser.headers)).statusCode, 400)
		assert.equal((await confirm('a'.repeat(64))).statusCode, 400)
		await database.db.emailChangeToken.update({
			where: { userId: activeUser.user.id },
			data: { expiresAt: new Date(0) }
		})
		assert.equal((await confirm(token)).statusCode, 400)
		assert.equal((await current()).email, activeUser.user.email)
	})
	test('rechecks uniqueness at confirmation and rolls back token consumption', async () => {
		const email = `${randomUUID()}@example.com`
		await change(email)
		await database.db.user.update({
			where: { id: otherUser.user.id },
			data: { email }
		})
		const response = await confirm(deliveries[0].token)
		assert.equal(response.statusCode, 409)
		assert.equal((await current()).email, activeUser.user.email)
		assert.equal(
			await database.db.emailChangeToken.count({
				where: { userId: activeUser.user.id }
			}),
			1
		)
	})
	test('concurrent confirmations consume the token exactly once', async () => {
		await change()
		const results = await Promise.all([
			confirm(deliveries[0].token),
			confirm(deliveries[0].token)
		])
		assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 400])
	})
	test('concurrent users cannot claim the same new email', async () => {
		const newEmail = `${randomUUID()}@example.com`
		await change(newEmail)
		const second = await app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers: otherUser.headers,
			payload: { newEmail, currentPassword: password }
		})
		assert.equal(second.statusCode, 200)
		const results = await Promise.all([
			confirm(deliveries[0].token),
			confirm(deliveries[1].token, otherUser.headers)
		])
		assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409])
		assert.equal(
			await database.db.user.count({ where: { email: newEmail } }),
			1
		)
	})
	test('concurrent replacements leave exactly one usable token', async () => {
		const responses = await Promise.all([change(), change()])
		assert.ok(responses.every((r) => r.statusCode === 200))
		assert.equal(
			await database.db.emailChangeToken.count({
				where: { userId: activeUser.user.id }
			}),
			1
		)
		const results = await Promise.all(deliveries.map((d) => confirm(d.token)))
		assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 400])
	})
	test('a mail delivery error invalidates its token', async () => {
		failDelivery = true
		const response = await change()
		assert.equal(response.statusCode, 503)
		assert.equal(
			await database.db.emailChangeToken.count({
				where: { userId: activeUser.user.id }
			}),
			0
		)
		assert.equal((await current()).email, activeUser.user.email)
	})
	test('a replacement racing confirmation never leaves an earlier token reusable', async () => {
		await change()
		const originalToken = deliveries[0].token
		const nextEmail = `${randomUUID()}@example.com`
		const [replacement, confirmation] = await Promise.all([
			change(nextEmail),
			confirm(originalToken)
		])
		assert.ok([200, 409].includes(replacement.statusCode))
		assert.ok([200, 400].includes(confirmation.statusCode))
		assert.equal((await confirm(originalToken)).statusCode, 400)
		if (replacement.statusCode === 200) {
			assert.equal((await confirm(deliveries[1].token)).statusCode, 200)
			assert.equal((await current()).email, nextEmail)
		} else {
			assert.equal(confirmation.statusCode, 200)
		}
	})
	test('email change preserves OAuth email and Google sign-in uses providerAccountId', async () => {
		const sub = randomUUID()
		const providerEmail = activeUser.user.email
		await database.db.oAuthAccount.create({
			data: {
				userId: activeUser.user.id,
				provider: 'google',
				providerAccountId: sub,
				email: providerEmail
			}
		})
		const nextEmail = `${randomUUID()}@example.com`
		await change(nextEmail)
		assert.equal((await confirm(deliveries[0].token)).statusCode, 200)
		const account = await database.db.oAuthAccount.findUniqueOrThrow({
			where: {
				userId_provider: { userId: activeUser.user.id, provider: 'google' }
			}
		})
		assert.equal(account.email, providerEmail)
		await database.db.user.update({
			where: { id: otherUser.user.id },
			data: { email: providerEmail }
		})
		const signedIn = await signInWithGoogle(database.db, {
			sub,
			email: providerEmail,
			name: 'Google User'
		})
		assert.equal(signedIn.id, activeUser.user.id)
		assert.equal(signedIn.email, nextEmail)
	})
	test('request endpoint limits repeated password checks and mail sends', async () => {
		for (let i = 0; i < 3; i++) assert.equal((await change()).statusCode, 200)
		assert.equal((await change()).statusCode, 429)
		assert.equal(deliveries.length, 3)
	})
	test('confirmation endpoint is rate limited', async () => {
		for (let i = 0; i < 10; i++)
			assert.equal((await confirm('a'.repeat(64))).statusCode, 400)
		assert.equal((await confirm('a'.repeat(64))).statusCode, 429)
	})
	test('email links keep the token in a fragment on the existing profile page', () => {
		const token = 'a'.repeat(64)
		const html = createEmailChangeHtml(token)
		const match = html.match(/href="([^"]+)"/)
		assert.ok(match)
		const url = new URL(match[1])
		assert.equal(url.pathname, '/app/profile')
		assert.equal(url.search, '')
		assert.equal(
			new URLSearchParams(url.hash.slice(1)).get('emailChangeToken'),
			token
		)
	})
})
