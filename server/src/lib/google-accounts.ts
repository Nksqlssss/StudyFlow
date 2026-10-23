import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { GoogleAuthError, type GoogleIdentity } from './google-identity.js'
import { lockReauthUser, ReauthError } from './reauth.js'
import { publicUserSelect } from './user-select.js'

async function accountTransaction<T>(
	db: PrismaClient,
	work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await db.$transaction(work, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable
			})
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				['P2034', 'P2002'].includes(error.code)
			) {
				if (attempt < 3) continue
				throw new GoogleAuthError(
					409,
					'GOOGLE_ACCOUNT_CONFLICT',
					'Account changed concurrently. Please try again'
				)
			}
			throw error
		}
	}
}

export function signInWithGoogle(db: PrismaClient, identity: GoogleIdentity) {
	return accountTransaction(db, async (tx) => {
		const account = await tx.oAuthAccount.findUnique({
			where: {
				provider_providerAccountId: {
					provider: 'google',
					providerAccountId: identity.sub
				}
			},
			include: {
				user: { select: { ...publicUserSelect, emailVerifiedAt: true } }
			}
		})
		if (account) {
			if (!account.user.emailVerifiedAt) {
				throw new GoogleAuthError(
					403,
					'EMAIL_NOT_VERIFIED',
					'Verify your account email before signing in'
				)
			}
			await tx.oAuthAccount.update({
				where: { id: account.id },
				data: { email: identity.email }
			})
			const { emailVerifiedAt, ...user } = account.user
			return user
		}

		if (
			await tx.user.findUnique({
				where: { email: identity.email },
				select: { id: true }
			})
		) {
			throw new GoogleAuthError(
				409,
				'GOOGLE_EMAIL_CONFLICT',
				'An account with this email already exists. Sign in using your existing method and link Google in your account settings'
			)
		}

		return tx.user.create({
			data: {
				email: identity.email,
				name: identity.name,
				emailVerifiedAt: new Date(),
				settings: { create: {} },
				oauthAccounts: {
					create: {
						provider: 'google',
						providerAccountId: identity.sub,
						email: identity.email
					}
				}
			},
			select: publicUserSelect
		})
	})
}

export function linkGoogleAccount(
	db: PrismaClient,
	userId: string,
	identity: GoogleIdentity,
	binding: string
) {
	return accountTransaction(db, async (tx) => {
		try {
			await lockReauthUser(tx, userId, binding)
		} catch (error) {
			if (error instanceof ReauthError) {
				throw new GoogleAuthError(
					error.status,
					'GOOGLE_SESSION_EXPIRED',
					'Sign in again before linking Google'
				)
			}
			throw error
		}
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: { id: true, emailVerifiedAt: true }
		})
		if (!user?.emailVerifiedAt)
			throw new GoogleAuthError(401, 'UNAUTHORIZED', 'Unauthorized')
		const account = await tx.oAuthAccount.findUnique({
			where: {
				provider_providerAccountId: {
					provider: 'google',
					providerAccountId: identity.sub
				}
			}
		})
		if (account && account.userId !== userId) {
			throw new GoogleAuthError(
				409,
				'GOOGLE_ACCOUNT_IN_USE',
				'This Google account is linked to another user'
			)
		}
		const linked = await tx.oAuthAccount.findUnique({
			where: { userId_provider: { userId, provider: 'google' } }
		})
		if (linked && linked.providerAccountId !== identity.sub) {
			throw new GoogleAuthError(
				409,
				'GOOGLE_ALREADY_LINKED',
				'Unlink your current Google account before linking another one'
			)
		}
		await tx.oAuthAccount.upsert({
			where: { userId_provider: { userId, provider: 'google' } },
			create: {
				userId,
				provider: 'google',
				providerAccountId: identity.sub,
				email: identity.email
			},
			update: { email: identity.email }
		})
	})
}

export function unlinkGoogleAccount(db: PrismaClient, userId: string) {
	return accountTransaction(db, async (tx) => {
		const user = await tx.user.findUnique({
			where: { id: userId },
			select: { passwordHash: true, emailVerifiedAt: true }
		})
		if (!user) throw new GoogleAuthError(401, 'UNAUTHORIZED', 'Unauthorized')
		if (!user.passwordHash || !user.emailVerifiedAt) {
			throw new GoogleAuthError(
				409,
				'LAST_LOGIN_METHOD',
				'Set a password and verify your email before unlinking Google'
			)
		}
		await tx.oAuthAccount.deleteMany({ where: { userId, provider: 'google' } })
		// A pending login code must not re-authorize a removed Google identity.
		await tx.googleOAuthExchange.deleteMany({ where: { userId } })
	})
}
