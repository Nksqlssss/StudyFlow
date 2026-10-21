import { apiFetch } from './client';

export type AuthUser = {
	id: string;
	email: string;
	name: string;
	username: string | null;
	avatarUrl: string | null;
	birthDate: string | null;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
};

export type GoogleProviders = {
	google: {
		connected: boolean;
		email: string | null;
	};
};

export type AuthMethodsResponse = {
	hasPassword: boolean;
	providers: GoogleProviders;
};

export type LoginBody = {
	email: string;
	password: string;
};

export type RegisterBody = {
	email: string;
	password: string;
	name?: string;
};

export type AuthResponse = {
	accessToken: string;
	user: AuthUser;
};

export type MeResponse = {
	user: AuthUser;
};

export type UpdateProfileBody = {
	name?: string;
	username?: string | null;
	birthDate?: string | null;
	isPublic?: boolean;
};

export type RegisterResponse = {
	message: string;
	user: AuthUser;
};

export type AddGoogleAccountResponse = {
	authorizationUrl: string;
};

export type setPasswordBody = {
	password: string;
};

export type changePasswordBody = {
	currentPassword: string;
	newPassword: string;
};

export function login(data: LoginBody) {
	return apiFetch<AuthResponse>('/auth/login', {
		method: 'POST',
		body: data
	});
}
export function verifyEmail(token: string) {
	return apiFetch<{ message: string }>('/auth/verify-email', {
		method: 'POST',
		body: { token }
	});
}

export function resendVerification(email: string) {
	return apiFetch<{ message: string }>('/auth/resend-verification', {
		method: 'POST',
		body: { email }
	});
}

export function register(data: RegisterBody) {
	return apiFetch<RegisterResponse>('/auth/register', {
		method: 'POST',
		body: data
	});
}

export function exchangeGoogleCode(code: string) {
	return apiFetch<AuthResponse>('/auth/google/exchange', {
		method: 'POST',
		body: { code },
		credentials: 'include'
	});
}

export function addGoogleAccount(token: string) {
	return apiFetch<AddGoogleAccountResponse>('/auth/google/link', {
		method: 'POST',
		token,
		credentials: 'include'
	});
}

export function deleteGoogleAccount(token: string) {
	return apiFetch<void>('/auth/google/link', {
		method: 'DELETE',
		token
	});
}

export function getAuthMethods(token: string) {
	return apiFetch<AuthMethodsResponse>('/auth/methods', {
		token
	});
}

export function getMe(token: string) {
	return apiFetch<MeResponse>('/auth/me', {
		token
	});
}

export function updateProfile(data: UpdateProfileBody, token: string) {
	return apiFetch<MeResponse>('/users/me', {
		method: 'PATCH',
		body: data,
		token
	});
}

export function setPassword(data: setPasswordBody, token: string) {
	return apiFetch<void>('/auth/password', {
		method: 'POST',
		body: data,
		token
	});
}

export function changePassword(data: changePasswordBody, token: string) {
	return apiFetch<void>('/auth/password', {
		method: 'PATCH',
		body: data,
		token
	});
}
