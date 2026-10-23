import { ApiError } from '$lib/api/client';
import type { TranslationKey } from '$lib/i18n';

export function accountErrorKey(error: unknown, code?: string | null): TranslationKey {
	const key = error instanceof ApiError ? error.code : code;
	const codes: Record<string, TranslationKey> = {
		UNAUTHORIZED: 'profile.errors.session',
		EMAIL_NOT_VERIFIED: 'auth.login.verifyDescription',
		GOOGLE_SESSION_EXPIRED: 'profile.errors.session',
		VALIDATION_ERROR: 'profile.errors.invalidData',
		REAUTHENTICATION_REQUIRED: 'account.errors.reauthRequired',
		INVALID_REAUTH_CODE: 'account.errors.code',
		REAUTH_ATTEMPTS_EXCEEDED: 'account.errors.attempts',
		REAUTH_SEND_LIMIT: 'account.errors.sendLimit',
		RATE_LIMITED: 'account.errors.sendLimit',
		INVALID_REAUTH_TOKEN: 'account.errors.proof',
		EMAIL_DELIVERY_FAILED: 'account.errors.delivery',
		REAUTH_UNAVAILABLE: 'profile.errors.server',
		PASSWORD_ALREADY_SET: 'settings.password.errors.exists',
		INVALID_CURRENT_PASSWORD: 'settings.password.errors.incorrect',
		PASSWORD_NOT_SET: 'settings.password.errors.notSet',
		PASSWORD_CHANGE_CONFLICT: 'settings.password.errors.concurrent',
		EMAIL_ALREADY_TAKEN: 'account.errors.emailTaken',
		EMAIL_UNCHANGED: 'account.errors.emailUnchanged',
		INVALID_EMAIL_CHANGE_TOKEN: 'account.errors.emailToken',
		EMAIL_CHANGE_CONFLICT: 'account.errors.conflict',
		LAST_LOGIN_METHOD: 'settings.signIn.passwordRequired',
		GOOGLE_EMAIL_CONFLICT: 'auth.google.errors.emailConflict',
		GOOGLE_ACCOUNT_IN_USE: 'account.errors.googleInUse',
		GOOGLE_ALREADY_LINKED: 'account.errors.googleLinked',
		GOOGLE_ACCOUNT_CONFLICT: 'account.errors.conflict',
		GOOGLE_NOT_CONFIGURED: 'auth.google.errors.unavailable',
		GOOGLE_UNAVAILABLE: 'auth.google.errors.unavailable',
		GOOGLE_ACCESS_DENIED: 'auth.google.errors.denied',
		GOOGLE_IDENTITY_INVALID: 'auth.google.errors.identity',
		INVALID_OAUTH_STATE: 'auth.google.errors.expired'
	};
	if (key && Object.hasOwn(codes, key)) return codes[key];
	if (error instanceof ApiError) {
		if (error.status === 401) return 'profile.errors.session';
		if (error.status === 429) return 'account.errors.sendLimit';
		if (error.status >= 500) return 'profile.errors.server';
	}
	const message = error instanceof Error ? error.message : error;
	const messages: Record<string, TranslationKey> = {
		'Current password is incorrect': 'settings.password.errors.incorrect',
		'Password was changed during this request': 'settings.password.errors.concurrent',
		'Not authenticated': 'profile.errors.session',
		Unauthorized: 'profile.errors.session',
		'Failed to fetch': 'settings.errors.network',
		'Load failed': 'settings.errors.network',
		'NetworkError when attempting to fetch resource.': 'settings.errors.network'
	};
	if (typeof message === 'string' && Object.hasOwn(messages, message)) return messages[message];
	return error instanceof TypeError ? 'settings.errors.network' : 'common.somethingWentWrong';
}
