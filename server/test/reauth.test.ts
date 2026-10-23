import 'dotenv/config'
import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from '../src/config/env.js'
import Fastify, { type FastifyInstance } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import type { ReauthPurpose } from '../src/generated/prisma/client.js'
import { authRoutes } from '../src/routes/auth.routes.js'
import { emailChangeRoutes } from '../src/routes/email-change.routes.js'
import { reauthRoutes } from '../src/routes/reauth.routes.js'
import { userRoutes } from '../src/routes/users.routes.js'
import { createAuthenticate } from '../src/middleware/authenticate.js'
import { signAccessToken } from '../src/lib/jwt.js'
import { reauthCodeHash, reauthTokenHash } from '../src/lib/reauth.js'
import { sessionHash } from '../src/lib/session.js'
import { createTestDatabase } from './test-database.js'

const password = 'safe-test-password-123'
type Headers = { authorization: string }
describe('Email OTP reauthentication and one-time action grants', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>
	let app: FastifyInstance
	let codes: { email: string; code: string; purpose: ReauthPurpose }[]
	let emails: { email: string; token: string }[]
	let failSending = false
	let a: Awaited<ReturnType<typeof seed>>
	let b: Awaited<ReturnType<typeof seed>>
	async function seed() {
		const user = await database.db.user.create({
			data: {
				email: `${randomUUID()}@example.com`,
				name: 'OTP Test',
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
	})
	beforeEach(async () => {
		codes = []
		emails = []
		failSending = false
		a = await seed()
		b = await seed()
		app = Fastify({ logger: false })
		app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
		app.register(reauthRoutes, {
			db: database.db,
			sendCode: async (email: string, code: string, purpose: ReauthPurpose) => {
				if (failSending) throw new Error('Test mail failure')
				codes.push({ email, code, purpose })
			}
		})
		app.register(authRoutes, {
			db: database.db,
			authenticateUser: createAuthenticate(database.db),
			sendVerification: async () => {}
		})
		app.register(emailChangeRoutes, {
			db: database.db,
			sendEmailChange: async (email: string, token: string) => {
				emails.push({ email, token })
			}
		})
		app.register(userRoutes, { db: database.db })
		await app.ready()
	})
	afterEach(async () => {
		await app?.close()
	})
	after(async () => {
		await database?.close()
	})
	function requestCode(
		purpose: ReauthPurpose = 'set_password',
		headers: Headers = a.headers,
		remoteAddress = '127.0.0.1'
	) {
		return app.inject({
			method: 'POST',
			url: '/auth/reauth/email/request',
			headers,
			remoteAddress,
			payload: { purpose }
		})
	}
	function verify(
		code: string,
		purpose: ReauthPurpose = 'set_password',
		headers: Headers = a.headers,
		remoteAddress = '127.0.0.1'
	) {
		return app.inject({
			method: 'POST',
			url: '/auth/reauth/email/verify',
			headers,
			remoteAddress,
			payload: { code, purpose }
		})
	}
	async function grant(
		purpose: ReauthPurpose = 'set_password',
		headers: Headers = a.headers
	) {
		assert.equal((await requestCode(purpose, headers)).statusCode, 200)
		const response = await verify(codes.at(-1)!.code, purpose, headers)
		assert.equal(response.statusCode, 200)
		return response.json<{ reauthToken: string; expiresIn: number }>()
			.reauthToken
	}
	function setPassword(token?: string, headers: Headers = a.headers) {
		return app.inject({
			method: 'POST',
			url: '/auth/password',
			headers,
			payload: { password, ...(token ? { reauthToken: token } : {}) }
		})
	}
	function changeEmail(
		token: string,
		headers: Headers = a.headers,
		newEmail = `${randomUUID()}@example.com`
	) {
		return app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers,
			payload: { newEmail, reauthToken: token }
		})
	}
	async function allowResend() {
		await database.db.reauthChallenge.update({
			where: { userId: a.user.id },
			data: { lastSentAt: new Date(Date.now() - 61000) }
		})
	}

	test('sends only to verified current email, hashes codes and grants, installs first password', async () => {
		const token = await grant()
		assert.equal(codes[0].email, a.user.email)
		assert.match(codes[0].code, /^\d{6}$/)
		const row = await database.db.reauthChallenge.findUniqueOrThrow({
			where: { userId: a.user.id }
		})
		assert.equal(row.codeHash, null)
		assert.equal(row.sessionHash, sessionHash(a.headers.authorization))
		const stored = await database.db.reauthToken.findUniqueOrThrow({
			where: { tokenHash: reauthTokenHash(token) }
		})
		assert.notEqual(stored.tokenHash, token)
		assert.ok(stored.expiresAt.getTime() > Date.now() + 290000)
		assert.equal((await setPassword(token)).statusCode, 204)
		assert.equal(
			await database.db.reauthToken.count({ where: { userId: a.user.id } }),
			0
		)
		const login = await app.inject({
			method: 'POST',
			url: '/auth/login',
			payload: { email: a.user.email, password }
		})
		assert.equal(login.statusCode, 200)
		assert.equal((await setPassword(token)).statusCode, 409)
	})
	test('requires Bearer authentication for code request, verify and logout', async () => {
		for (const url of [
			'/auth/reauth/email/request',
			'/auth/reauth/email/verify',
			'/auth/logout'
		]) {
			assert.equal(
				(await app.inject({ method: 'POST', url, payload: {} })).statusCode,
				401
			)
		}
	})
	test('rejects unverified email and body-supplied destination', async () => {
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/reauth/email/request',
					headers: a.headers,
					payload: { purpose: 'change_email', newEmail: 'attacker@example.com' }
				})
			).statusCode,
			400
		)
		await database.db.user.update({
			where: { id: a.user.id },
			data: { emailVerifiedAt: null }
		})
		assert.equal((await requestCode()).statusCode, 403)
		assert.equal(codes.length, 0)
	})
	test('validates purpose and code format', async () => {
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/reauth/email/request',
					headers: a.headers,
					payload: { purpose: 'delete_account' }
				})
			).statusCode,
			400
		)
		assert.equal((await verify('not-a-code')).statusCode, 400)
	})
	test('stores a keyed code hash with ten-minute expiry', async () => {
		assert.equal((await requestCode()).statusCode, 200)
		const row = await database.db.reauthChallenge.findUniqueOrThrow({
			where: { userId: a.user.id }
		})
		assert.equal(row.codeHash, reauthCodeHash(codes[0].code, row))
		assert.ok(row.expiresAt.getTime() > Date.now() + 590000)
		assert.ok(row.expiresAt.getTime() <= Date.now() + 600000)
	})
	test('cannot install first password with JWT alone', async () => {
		const response = await setPassword()
		assert.equal(response.statusCode, 403)
		assert.equal(response.json().code, 'REAUTHENTICATION_REQUIRED')
	})
	test('expired code is rejected', async () => {
		await requestCode()
		await database.db.reauthChallenge.update({
			where: { userId: a.user.id },
			data: { expiresAt: new Date(0) }
		})
		assert.equal((await verify(codes[0].code)).statusCode, 400)
	})
	test('OTP is single-use even with concurrent verify calls', async () => {
		await requestCode()
		const results = await Promise.all([
			verify(codes[0].code),
			verify(codes[0].code)
		])
		assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 400])
		assert.equal(
			await database.db.reauthToken.count({ where: { userId: a.user.id } }),
			1
		)
	})
	test('expired grant cannot be used', async () => {
		const token = await grant()
		await database.db.reauthToken.update({
			where: { tokenHash: reauthTokenHash(token) },
			data: { expiresAt: new Date(0) }
		})
		assert.equal((await setPassword(token)).statusCode, 403)
	})
	test('another user cannot use a code or grant', async () => {
		await requestCode()
		assert.equal(
			(await verify(codes[0].code, 'set_password', b.headers)).statusCode,
			400
		)
		const response = await verify(codes[0].code)
		const token = response.json().reauthToken as string
		assert.equal((await setPassword(token, b.headers)).statusCode, 403)
		assert.equal((await setPassword(token)).statusCode, 204)
	})
	test('different sessions of the same user cannot share codes or grants', async () => {
		const another = {
			authorization: `Bearer ${signAccessToken({ userId: a.user.id })}`
		}
		assert.notEqual(another.authorization, a.headers.authorization)
		await requestCode()
		assert.equal(
			(await verify(codes[0].code, 'set_password', another)).statusCode,
			400
		)
		const token = (await verify(codes[0].code)).json().reauthToken as string
		assert.equal((await setPassword(token, another)).statusCode, 403)
		assert.equal((await setPassword(token)).statusCode, 204)
	})
	test('purpose is bound at code verification and at grant consumption', async () => {
		await requestCode('change_email')
		assert.equal((await verify(codes[0].code, 'set_password')).statusCode, 400)
		const token = (await verify(codes[0].code, 'change_email')).json()
			.reauthToken as string
		assert.equal((await setPassword(token)).statusCode, 403)
		assert.equal((await changeEmail(token)).statusCode, 200)
	})
	test('set_password grant cannot request email change', async () => {
		const token = await grant()
		assert.equal((await changeEmail(token)).statusCode, 403)
		assert.equal((await setPassword(token)).statusCode, 204)
	})
	test('five wrong attempts lock reauthentication per user across IPs and sessions', async () => {
		await requestCode()
		const wrong = codes[0].code === '000000' ? '000001' : '000000'
		for (let i = 0; i < 5; i++)
			assert.equal(
				(await verify(wrong, 'set_password', a.headers, `10.0.0.${i + 1}`))
					.statusCode,
				i === 4 ? 429 : 400
			)
		assert.equal((await verify(codes[0].code)).statusCode, 429)
		assert.equal(
			(
				await requestCode(
					'change_email',
					{ authorization: `Bearer ${signAccessToken({ userId: a.user.id })}` },
					'10.1.0.1'
				)
			).statusCode,
			429
		)
		assert.equal((await requestCode('set_password', b.headers)).statusCode, 200)
	})
	test('resend does not reset failed-attempt budget and replaces the old challenge', async () => {
		await requestCode()
		const firstRow = await database.db.reauthChallenge.findUniqueOrThrow({
			where: { userId: a.user.id }
		})
		await database.db.reauthChallenge.update({
			where: { userId: a.user.id },
			data: { failedAttempts: 4, lastSentAt: new Date(Date.now() - 61000) }
		})
		assert.equal((await requestCode()).statusCode, 200)
		const nextRow = await database.db.reauthChallenge.findUniqueOrThrow({
			where: { userId: a.user.id }
		})
		assert.notEqual(firstRow.nonce, nextRow.nonce)
		assert.equal(nextRow.failedAttempts, 4)
		const wrong = codes[1].code === '000000' ? '000001' : '000000'
		assert.equal((await verify(wrong)).statusCode, 429)
	})
	test('send cooldown and hourly limit apply per user regardless of IP or purpose', async () => {
		assert.equal((await requestCode()).statusCode, 200)
		assert.equal(
			(await requestCode('change_email', a.headers, '10.0.0.1')).statusCode,
			429
		)
		await allowResend()
		assert.equal((await requestCode()).statusCode, 200)
		await allowResend()
		assert.equal((await requestCode('change_email')).statusCode, 200)
		await allowResend()
		assert.equal(
			(await requestCode('change_email', a.headers, '10.0.0.2')).statusCode,
			429
		)
		assert.equal(codes.length, 3)
	})
	test('concurrent send requests produce one email and preserve cooldown', async () => {
		const responses = await Promise.all([requestCode(), requestCode()])
		assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 429])
		assert.equal(codes.length, 1)
	})
	test('concurrent incorrect code attempts cannot lose increments', async () => {
		await requestCode()
		const wrong = codes[0].code === '000000' ? '000001' : '000000'
		await Promise.all(Array.from({ length: 6 }, () => verify(wrong)))
		const row = await database.db.reauthChallenge.findUniqueOrThrow({
			where: { userId: a.user.id }
		})
		assert.equal(row.failedAttempts, 5)
		assert.equal((await verify(codes[0].code)).statusCode, 429)
	})
	test('mail delivery failure invalidates code without resetting user limits', async () => {
		failSending = true
		assert.equal((await requestCode()).statusCode, 503)
		const row = await database.db.reauthChallenge.findUniqueOrThrow({
			where: { userId: a.user.id }
		})
		assert.equal(row.codeHash, null)
		assert.equal(row.sendCount, 1)
		assert.equal((await requestCode()).statusCode, 429)
	})
	test('email change accepts reauth for passwordless user and preserves link confirmation', async () => {
		const token = await grant('change_email')
		const newEmail = `${randomUUID()}@example.com`
		assert.equal(
			(await changeEmail(token, a.headers, newEmail)).statusCode,
			200
		)
		assert.equal(codes[0].email, a.user.email)
		assert.equal(emails[0].email, newEmail)
		assert.equal((await changeEmail(token)).statusCode, 403)
		const confirmed = await app.inject({
			method: 'POST',
			url: '/users/me/email/confirm',
			headers: a.headers,
			payload: { token: emails[0].token }
		})
		assert.equal(confirmed.statusCode, 200)
		assert.equal(confirmed.json().user.email, newEmail)
	})
	test('a password user can choose password or email proof, but not both', async () => {
		await database.db.user.update({
			where: { id: a.user.id },
			data: { passwordHash: await bcrypt.hash(password, 4) }
		})
		const token = await grant('change_email')
		const both = await app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers: a.headers,
			payload: {
				newEmail: 'next@example.com',
				currentPassword: password,
				reauthToken: token
			}
		})
		assert.equal(both.statusCode, 400)
		assert.equal((await changeEmail(token)).statusCode, 200)
		const byPassword = await app.inject({
			method: 'POST',
			url: '/users/me/email/change',
			headers: a.headers,
			payload: {
				newEmail: `${randomUUID()}@example.com`,
				currentPassword: password
			}
		})
		assert.equal(byPassword.statusCode, 200)
	})
	test('concurrent email requests consume the same grant only once', async () => {
		const token = await grant('change_email')
		const responses = await Promise.all([
			changeEmail(token),
			changeEmail(token)
		])
		assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 403])
		assert.equal(emails.length, 1)
	})
	test('concurrent first-password requests consume one proof and create one password', async () => {
		const token = await grant()
		const responses = await Promise.all([
			setPassword(token),
			setPassword(token)
		])
		assert.deepEqual(responses.map((r) => r.statusCode).sort(), [204, 409])
	})
	test('failed email operation rolls back grant consumption', async () => {
		const token = await grant('change_email')
		assert.equal(
			(await changeEmail(token, a.headers, b.user.email)).statusCode,
			409
		)
		assert.equal((await changeEmail(token)).statusCode, 200)
	})
	test('changed current email invalidates an OTP and an already issued grant', async () => {
		const token = await grant('change_email')
		await allowResend()
		await requestCode()
		await database.db.user.update({
			where: { id: a.user.id },
			data: { email: `${randomUUID()}@example.com` }
		})
		assert.equal((await verify(codes.at(-1)!.code)).statusCode, 400)
		assert.equal((await changeEmail(token)).statusCode, 403)
	})
	test('logout revokes the exact JWT and its proofs while preserving another session', async () => {
		const token = await grant('change_email')
		const another = {
			authorization: `Bearer ${signAccessToken({ userId: a.user.id })}`
		}
		const logout = await app.inject({
			method: 'POST',
			url: '/auth/logout',
			headers: a.headers
		})
		assert.equal(logout.statusCode, 204)
		assert.equal((await changeEmail(token)).statusCode, 401)
		assert.equal((await requestCode()).statusCode, 401)
		assert.equal(
			(await app.inject({ url: '/auth/me', headers: a.headers })).statusCode,
			401
		)
		assert.equal(
			(await app.inject({ url: '/auth/me', headers: another })).statusCode,
			200
		)
		assert.equal(
			await database.db.reauthToken.count({ where: { userId: a.user.id } }),
			0
		)
	})
	test('logout invalidates a pending OTP', async () => {
		await requestCode()
		await app.inject({
			method: 'POST',
			url: '/auth/logout',
			headers: a.headers
		})
		assert.equal((await verify(codes[0].code)).statusCode, 401)
		assert.equal(
			(
				await database.db.reauthChallenge.findUniqueOrThrow({
					where: { userId: a.user.id }
				})
			).codeHash,
			null
		)
	})
	test('deleting a user cascades challenges and proofs and makes JWT unusable', async () => {
		const token = await grant()
		await database.db.user.delete({ where: { id: a.user.id } })
		assert.equal((await setPassword(token)).statusCode, 401)
		assert.equal(
			await database.db.reauthToken.count({ where: { userId: a.user.id } }),
			0
		)
		assert.equal(
			await database.db.reauthChallenge.count({ where: { userId: a.user.id } }),
			0
		)
	})
	test('expired JWT cannot request, verify or use a grant', async () => {
		const token = await grant()
		const expired = { authorization: `Bearer ${jwt.sign({ userId: a.user.id }, env.JWT_SECRET, { expiresIn: -1 })}` }
		assert.equal((await requestCode('change_email', expired)).statusCode, 401)
		assert.equal((await verify(codes[0].code, 'set_password', expired)).statusCode, 401)
		assert.equal((await setPassword(token, expired)).statusCode, 401)
	})

	test('grant lifetime never exceeds the JWT lifetime', async () => {
		const short = { authorization: `Bearer ${jwt.sign({ userId: a.user.id }, env.JWT_SECRET, { expiresIn: 120, jwtid: randomUUID() })}` }
		const token = await grant('change_email', short)
		const row = await database.db.reauthToken.findUniqueOrThrow({ where: { tokenHash: reauthTokenHash(token) } })
		assert.ok(row.expiresAt.getTime() <= Date.now() + 120000)
		assert.ok(row.expiresAt.getTime() > Date.now() + 100000)
	})

	test('attempt budget recovers after its window without bypassing send limits', async () => {
		await requestCode()
		await database.db.reauthChallenge.update({ where: { userId: a.user.id }, data: {
			failedAttempts: 5, attemptWindowStartedAt: new Date(Date.now() - 16 * 60000), lastSentAt: new Date(Date.now() - 61000)
		} })
		assert.equal((await requestCode()).statusCode, 200)
		assert.equal((await verify(codes.at(-1)!.code)).statusCode, 200)
		const row = await database.db.reauthChallenge.findUniqueOrThrow({ where: { userId: a.user.id } })
		assert.equal(row.sendCount, 2)
		assert.equal(row.failedAttempts, 0)
	})

	test('confirming email change deletes old grants even if the address is later restored', async () => {
		const oldGrant = await grant()
		await allowResend()
		const token = await grant('change_email')
		assert.equal((await changeEmail(token)).statusCode, 200)
		await allowResend(); await requestCode()
		const confirmed = await app.inject({ method: 'POST', url: '/users/me/email/confirm', headers: a.headers, payload: { token: emails[0].token } })
		assert.equal(confirmed.statusCode, 200)
		assert.equal(await database.db.reauthToken.count({ where: { userId: a.user.id } }), 0)
		assert.equal((await database.db.reauthChallenge.findUniqueOrThrow({ where: { userId: a.user.id } })).codeHash, null)
		await database.db.user.update({ where: { id: a.user.id }, data: { email: a.user.email } })
		assert.equal((await setPassword(oldGrant)).statusCode, 403)
	})

	test('account deletion through API cascades data and invalidates the JWT', async () => {
		await grant()
		const subject = await database.db.subject.create({ data: { userId: a.user.id, title: 'Delete test', icon: 'code' } })
		await database.db.task.create({ data: { userId: a.user.id, subjectId: subject.id, title: 'Delete test task' } })
		const response = await app.inject({ method: 'DELETE', url: '/users/me', headers: a.headers })
		assert.equal(response.statusCode, 204)
		assert.equal(await database.db.user.count({ where: { id: a.user.id } }), 0)
		assert.equal(await database.db.task.count({ where: { userId: a.user.id } }), 0)
		assert.equal(await database.db.reauthToken.count({ where: { userId: a.user.id } }), 0)
		assert.equal((await app.inject({ url: '/auth/me', headers: a.headers })).statusCode, 401)
	})

	test('ordinary password change still requires currentPassword', async () => {
		await database.db.user.update({
			where: { id: a.user.id },
			data: { passwordHash: await bcrypt.hash(password, 4) }
		})
		const next = 'another-safe-password-123'
		const bad = await app.inject({
			method: 'PATCH',
			url: '/auth/password',
			headers: a.headers,
			payload: { currentPassword: 'wrong', newPassword: next }
		})
		assert.equal(bad.statusCode, 400)
		const good = await app.inject({
			method: 'PATCH',
			url: '/auth/password',
			headers: a.headers,
			payload: { currentPassword: password, newPassword: next }
		})
		assert.equal(good.statusCode, 204)
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/auth/login',
					payload: { email: a.user.email, password: next }
				})
			).statusCode,
			200
		)
	})
})
