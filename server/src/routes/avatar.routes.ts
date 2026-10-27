import type { FastifyInstance } from 'fastify'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { z } from 'zod'
import type { Prisma, PrismaClient } from '../generated/prisma/client.js'
import { cloudinary } from '../lib/cloudinary.js'
import { prisma } from '../lib/prisma.js'
import { publicUserSelect } from '../lib/user-select.js'
import { authenticate, createAuthenticate } from '../middleware/authenticate.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_PIXELS = 20_000_000
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp']

function uploadAvatar(buffer: Buffer): Promise<{
	url: string
	publicId: string
}> {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder: 'studyflow/avatars',
				resource_type: 'image',
				format: 'webp',
				unique_filename: true,
				overwrite: false
			},
			(error, result) => {
				if (error || !result) {
					reject(error ?? new Error('Upload failed'))
					return
				}

				resolve({
					url: result.secure_url,
					publicId: result.public_id
				})
			}
		)

		Readable.from(buffer).pipe(stream)
	})
}

async function removeAvatar(publicId: string) {
	const result = await cloudinary.uploader.destroy(publicId, {
		resource_type: 'image',
		invalidate: true
	})
	if (result.result !== 'ok' && result.result !== 'not found') {
		throw new Error('Avatar cleanup failed')
	}
}

const defaultAvatarSchema = z
	.object({
		avatarUrl: z.enum([
			'/avatars/default-male.svg',
			'/avatars/default-female.svg'
		])
	})
	.strict()

export async function avatarRoutes(
	app: FastifyInstance,
	options: {
		db?: PrismaClient
		upload?: typeof uploadAvatar
		remove?: typeof removeAvatar
	} = {}
) {
	const db = options.db ?? prisma
	const authenticateUser = options.db ? createAuthenticate(db) : authenticate
	const upload = options.upload ?? uploadAvatar
	const remove = options.remove ?? removeAvatar
	const avatarSelect = {
		avatarUrl: true,
		avatarPublicId: true,
		updatedAt: true
	} as const

	async function cleanup(publicId: string | null) {
		if (!publicId) return true
		for (let attempt = 0; attempt < 2; attempt++) {
			try {
				// A lost transaction acknowledgement must not delete a committed avatar.
				if (await db.user.count({ where: { avatarPublicId: publicId } }))
					return true
				await remove(publicId)
				return true
			} catch {
				// Do not log provider errors, which can include signed URLs or credentials.
				if (attempt === 1)
					app.log.warn({ publicId }, 'Avatar cleanup needs retry')
			}
		}
		return false
	}

	async function replaceAvatar(
		userId: string,
		previous: Prisma.UserGetPayload<{ select: typeof avatarSelect }>,
		next: { avatarUrl: string | null; avatarPublicId: string | null }
	) {
		return db.$transaction(async (tx) => {
			const result = await tx.user.updateMany({
				where: { id: userId, ...previous },
				data: next
			})
			if (result.count !== 1) return null
			return tx.user.findUniqueOrThrow({
				where: { id: userId },
				select: publicUserSelect
			})
		})
	}

	app.patch(
		'/users/me/avatar',
		{
			preHandler: authenticateUser,
			config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
		},
		async (request, reply) => {
			const body = defaultAvatarSchema.safeParse(request.body)
			if (!body.success)
				return reply.code(400).send({ message: 'Invalid default avatar' })
			const userId = request.user.id
			const previous = await db.user.findUnique({
				where: { id: userId },
				select: avatarSelect
			})
			if (!previous) return reply.code(404).send({ message: 'User not found' })
			const user = await replaceAvatar(userId, previous, {
				avatarUrl: body.data.avatarUrl,
				avatarPublicId: null
			})
			if (!user)
				return reply
					.code(409)
					.send({ message: 'Avatar update failed or conflicted' })
			const cleaned = await cleanup(previous.avatarPublicId)
			return { user, ...(!cleaned ? { cleanupWarning: true } : {}) }
		}
	)

	app.post(
		'/users/me/avatar',
		{
			preHandler: authenticateUser,
			config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
		},
		async (request, reply) => {
			const userId = request.user.id

			if (!request.isMultipart()) {
				return reply.code(415).send({
					message: 'Multipart form data required'
				})
			}

			let buffer: Buffer | undefined

			try {
				for await (const file of request.parts({
					limits: {
						fileSize: MAX_FILE_SIZE,
						files: 1,
						fields: 0,
						parts: 1
					}
				})) {
					if (file.type !== 'file' || file.fieldname !== 'avatar') {
						return reply.code(400).send({ message: 'Invalid file field' })
					}
					buffer = await file.toBuffer()
				}

				if (!buffer) {
					return reply.code(400).send({
						message: 'File is required'
					})
				}
			} catch (error) {
				if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
					return reply.code(413).send({
						message: 'File is too large (max 5 MiB)'
					})
				}

				if (
					error instanceof app.multipartErrors.FilesLimitError ||
					error instanceof app.multipartErrors.FieldsLimitError ||
					error instanceof app.multipartErrors.PartsLimitError
				) {
					return reply.code(400).send({
						message: 'Expected one avatar file'
					})
				}

				throw error
			}

			let avatarBuffer: Buffer

			try {
				const metadata = await sharp(buffer, {
					limitInputPixels: MAX_PIXELS
				}).metadata()

				if (!metadata.format || !ALLOWED_FORMATS.includes(metadata.format)) {
					return reply.code(415).send({
						message: 'Only JPEG, PNG and WebP are supported'
					})
				}

				if (
					!metadata.width ||
					!metadata.height ||
					metadata.width * metadata.height > MAX_PIXELS
				) {
					return reply.code(400).send({
						message: 'Invalid image dimensions'
					})
				}

				avatarBuffer = await sharp(buffer, {
					limitInputPixels: MAX_PIXELS
				})
					.rotate()
					.resize(256, 256, {
						fit: 'cover',
						position: 'centre',
						withoutEnlargement: false
					})
					.webp({ quality: 80 })
					.toBuffer()
			} catch {
				return reply.code(400).send({
					message: 'Invalid or corrupted image'
				})
			}

			const previous = await db.user.findUnique({
				where: { id: userId },
				select: avatarSelect
			})

			if (!previous) {
				return reply.code(404).send({
					message: 'User not found'
				})
			}

			let uploaded: Awaited<ReturnType<typeof uploadAvatar>>

			try {
				uploaded = await upload(avatarBuffer)
			} catch {
				request.log.warn('Avatar upload failed')

				return reply.code(503).send({
					message: 'Image storage unavailable'
				})
			}

			let user: Prisma.UserGetPayload<{
				select: typeof publicUserSelect
			}> | null = null

			try {
				user = await replaceAvatar(userId, previous, {
					avatarUrl: uploaded.url,
					avatarPublicId: uploaded.publicId
				})
			} catch {
				request.log.warn('Avatar database update failed')
			}

			if (!user) {
				await cleanup(uploaded.publicId)

				return reply.code(409).send({
					message: 'Avatar update failed or conflicted'
				})
			}

			const cleaned = await cleanup(previous.avatarPublicId)
			return reply
				.code(200)
				.send({ user, ...(!cleaned ? { cleanupWarning: true } : {}) })
		}
	)

	app.delete(
		'/users/me/avatar',
		{
			preHandler: authenticateUser
		},
		async (request, reply) => {
			const userId = request.user.id

			const previous = await db.user.findUnique({
				where: { id: userId },
				select: avatarSelect
			})

			if (!previous) {
				return reply.code(404).send({
					message: 'User not found'
				})
			}

			const user = await replaceAvatar(userId, previous, {
				avatarUrl: null,
				avatarPublicId: null
			})

			if (!user) {
				return reply.code(409).send({
					message: 'Avatar changed during deletion'
				})
			}

			const cleaned = await cleanup(previous.avatarPublicId)
			return reply
				.code(200)
				.send({ user, ...(!cleaned ? { cleanupWarning: true } : {}) })
		}
	)
}
