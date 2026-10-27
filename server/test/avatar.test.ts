import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, describe, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import Fastify, { type FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import sharp from 'sharp'
import { avatarRoutes } from '../src/routes/avatar.routes.js'
import { signAccessToken } from '../src/lib/jwt.js'
import { createTestDatabase } from './test-database.js'

describe('Avatar API with isolated PostgreSQL and simulated image storage', () => {
	let database: Awaited<ReturnType<typeof createTestDatabase>>
	let app: FastifyInstance
	let token: string
	let userId: string
	let sequence = 0
	let uploadFailure = false
	let removeFailure = false
	let holdUpload: (() => Promise<void>) | null = null
	const uploaded: { publicId: string; buffer: Buffer }[] = []
	const removed: string[] = []
	const male = '/avatars/default-male.svg'
	const female = '/avatars/default-female.svg'

	before(async () => {
		database = await createTestDatabase()
	})
	after(async () => {
		await database?.close()
	})
	beforeEach(async () => {
		sequence = 0
		uploadFailure = removeFailure = false
		holdUpload = null
		uploaded.length = removed.length = 0
		const user = await database.db.user.create({
			data: {
				email: `${randomUUID()}@example.com`,
				name: 'Avatar Student',
				emailVerifiedAt: new Date()
			}
		})
		userId = user.id
		token = signAccessToken({ userId })
		app = Fastify({ logger: false })
		app.register(multipart)
		app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
		app.register(avatarRoutes, {
			db: database.db,
			upload: async (buffer: Buffer) => {
				if (uploadFailure) throw new Error('Simulated storage failure')
				const publicId = `${userId}-avatar-${++sequence}`
				uploaded.push({ publicId, buffer })
				if (holdUpload) await holdUpload()
				return { publicId, url: `https://images.example.com/${publicId}.webp` }
			},
			remove: async (publicId: string) => {
				removed.push(publicId)
				if (removeFailure) throw new Error('Simulated deletion failure')
			}
		})
		await app.ready()
	})
	afterEach(async () => {
		await app?.close()
	})
	const headers = () => ({ authorization: `Bearer ${token}` })
	const current = () =>
		database.db.user.findUniqueOrThrow({ where: { id: userId } })
	const choose = (avatarUrl: string) =>
		app.inject({
			method: 'PATCH',
			url: '/users/me/avatar',
			headers: headers(),
			payload: { avatarUrl }
		})
	const remove = () =>
		app.inject({
			method: 'DELETE',
			url: '/users/me/avatar',
			headers: headers()
		})
	async function image(format: 'png' | 'jpeg' | 'webp' = 'png') {
		return sharp({
			create: { width: 40, height: 30, channels: 3, background: '#7984ae' }
		})
			.toFormat(format)
			.toBuffer()
	}
	function upload(buffer: Buffer, mime = 'image/png', extra = '') {
		const boundary = 'studyflow-avatar-test'
		return app.inject({
			method: 'POST',
			url: '/users/me/avatar',
			headers: {
				...headers(),
				'content-type': `multipart/form-data; boundary=${boundary}`
			},
			payload: Buffer.concat([
				Buffer.from(
					`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="avatar.png"\r\nContent-Type: ${mime}\r\n\r\n`
				),
				buffer,
				Buffer.from(`\r\n${extra}--${boundary}--\r\n`)
			])
		})
	}
	async function oldPhoto() {
		await database.db.user.update({
			where: { id: userId },
			data: {
				avatarUrl: 'https://images.example.com/old.webp',
				avatarPublicId: `${userId}-old-photo`
			}
		})
	}

	test('all mutations require JWT; revoked JWT is rejected', async () => {
		for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
			assert.equal(
				(await app.inject({ method, url: '/users/me/avatar' })).statusCode,
				401
			)
		}
		const { sessionHash } = await import('../src/lib/session.js')
		await database.db.sessionRevocation.create({
			data: {
				userId,
				sessionHash: sessionHash(`Bearer ${token}`),
				expiresAt: new Date(Date.now() + 60000)
			}
		})
		assert.equal((await choose(male)).statusCode, 401)
	})
	test('default male and female persist locally, never upload, and expose only public user', async () => {
		for (const avatarUrl of [male, female]) {
			const result = await choose(avatarUrl)
			assert.equal(result.statusCode, 200)
			assert.equal(result.json().user.avatarUrl, avatarUrl)
			assert.equal('passwordHash' in result.json().user, false)
			assert.equal('avatarPublicId' in result.json().user, false)
			assert.equal((await current()).avatarPublicId, null)
			assert.equal((await current()).avatarUrl, avatarUrl)
		}
		assert.equal(uploaded.length, 0)
	})
	test('rejects arbitrary URLs, traversal and unknown body fields', async () => {
		for (const avatarUrl of [
			'https://other.example/avatar.svg',
			'/avatars/../secret.svg',
			'/avatars/default-other.svg',
			'javascript:alert(1)'
		]) {
			assert.equal((await choose(avatarUrl)).statusCode, 400)
		}
		assert.equal(
			(
				await app.inject({
					method: 'PATCH',
					url: '/users/me/avatar',
					headers: headers(),
					payload: { avatarUrl: male, userId: 'foreign' }
				})
			).statusCode,
			400
		)
		assert.equal((await current()).avatarUrl, null)
	})
	test('choosing a default removes previous Cloudinary image', async () => {
		await oldPhoto()
		assert.equal((await choose(male)).statusCode, 200)
		assert.deepEqual(removed, [`${userId}-old-photo`])
		assert.equal((await current()).avatarPublicId, null)
	})
	test('JPEG, PNG and WebP become 256x256 WebP and replace previous photos', async () => {
		await choose(female)
		for (const format of ['jpeg', 'png', 'webp'] as const) {
			const result = await upload(await image(format), `image/${format}`)
			assert.equal(result.statusCode, 200)
			const metadata = await sharp(uploaded.at(-1)!.buffer).metadata()
			assert.equal(metadata.format, 'webp')
			assert.equal(metadata.width, 256)
			assert.equal(metadata.height, 256)
			assert.equal((await current()).avatarPublicId, uploaded.at(-1)!.publicId)
		}
		assert.deepEqual(removed, [`${userId}-avatar-1`, `${userId}-avatar-2`])
	})
	test('rejects SVG despite a forged PNG MIME, corrupt files and GIF', async () => {
		assert.equal(
			(
				await upload(
					Buffer.from(
						'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
					)
				)
			).statusCode,
			415
		)
		assert.equal((await upload(Buffer.from('not-an-image'))).statusCode, 400)
		const gif = await sharp(await image())
			.gif()
			.toBuffer()
		assert.equal((await upload(gif, 'image/gif')).statusCode, 415)
		assert.equal(uploaded.length, 0)
	})
	test('rejects oversized files and excessive image dimensions', async () => {
		assert.equal(
			(await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).statusCode,
			413
		)
		const huge = await sharp({
			create: { width: 5000, height: 5000, channels: 3, background: '#fff' }
		})
			.png()
			.toBuffer()
		assert.equal((await upload(huge)).statusCode, 400)
		assert.equal(uploaded.length, 0)
	})
	test('rejects non-multipart bodies and extra parts', async () => {
		assert.equal(
			(
				await app.inject({
					method: 'POST',
					url: '/users/me/avatar',
					headers: headers(),
					payload: { file: 'invalid' }
				})
			).statusCode,
			415
		)
		assert.equal(
			(
				await upload(
					await image(),
					'image/png',
					'--studyflow-avatar-test\r\nContent-Disposition: form-data; name="extra"\r\n\r\nvalue\r\n'
				)
			).statusCode,
			400
		)
	})
	test('storage failure preserves current avatar', async () => {
		await choose(male)
		uploadFailure = true
		assert.equal((await upload(await image())).statusCode, 503)
		assert.equal((await current()).avatarUrl, male)
	})
	test('deletes custom and default avatars, and deletion is idempotent', async () => {
		await oldPhoto()
		assert.equal((await remove()).json().user.avatarUrl, null)
		assert.deepEqual(removed, [`${userId}-old-photo`])
		await choose(female)
		assert.equal((await remove()).json().user.avatarUrl, null)
		assert.equal((await remove()).statusCode, 200)
	})
	test('cleanup failure retries and reports warning without reverting saved data', async () => {
		await oldPhoto()
		removeFailure = true
		const result = await choose(male)
		assert.equal(result.statusCode, 200)
		assert.equal(result.json().cleanupWarning, true)
		assert.deepEqual(removed, [`${userId}-old-photo`, `${userId}-old-photo`])
		assert.equal((await current()).avatarUrl, male)
	})
	test('two concurrent uploads keep the winner and clean only the losing upload and old image', async () => {
		await oldPhoto()
		let release!: () => void
		const barrier = new Promise<void>((resolve) => {
			release = resolve
		})
		holdUpload = async () => {
			if (uploaded.length === 2) release()
			await barrier
		}
		const results = await Promise.all([
			upload(await image()),
			upload(await image())
		])
		assert.deepEqual(
			results.map((result) => result.statusCode).sort(),
			[200, 409]
		)
		const winner = (await current()).avatarPublicId
		assert.ok(winner)
		assert.equal(removed.includes(winner), false)
		assert.equal(removed.includes(`${userId}-old-photo`), true)
		assert.equal(removed.length, 2)
	})
	test('default changed during upload is not overwritten even when both public IDs are null', async () => {
		await choose(male)
		let started!: () => void
		let release!: () => void
		const ready = new Promise<void>((resolve) => {
			started = resolve
		})
		const barrier = new Promise<void>((resolve) => {
			release = resolve
		})
		holdUpload = async () => {
			started()
			await barrier
		}
		const request = upload(await image()).then((result) => result)
		await ready
		await choose(female)
		release()
		assert.equal((await request).statusCode, 409)
		assert.equal((await current()).avatarUrl, female)
		assert.deepEqual(removed, [`${userId}-avatar-1`])
	})
	test('request cannot change another user via a forged body', async () => {
		const other = await database.db.user.create({
			data: {
				email: `${randomUUID()}@example.com`,
				name: 'Other',
				emailVerifiedAt: new Date()
			}
		})
		assert.equal((await choose(male)).statusCode, 200)
		assert.equal(
			(await database.db.user.findUniqueOrThrow({ where: { id: other.id } }))
				.avatarUrl,
			null
		)
	})
})
