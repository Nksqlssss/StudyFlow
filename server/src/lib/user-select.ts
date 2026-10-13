import { Prisma } from '../generated/prisma/client.js'

export const publicUserSelect = {
	id: true,
	email: true,
	name: true,
	username: true,
	avatarUrl: true,
	birthDate: true,
	isPublic: true,
	createdAt: true,
	updatedAt: true
} satisfies Prisma.UserSelect
