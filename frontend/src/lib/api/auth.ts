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
