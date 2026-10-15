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

export function login(data: LoginBody) {
	return apiFetch<AuthResponse>('/auth/login', {
		method: 'POST',
		body: data
	});
}

export function register(data: RegisterBody) {
	return apiFetch<AuthResponse>('/auth/register', {
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
