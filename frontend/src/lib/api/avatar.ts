import type { MeResponse } from './auth';
import { apiFetch } from './client';

export type DefaultAvatar = '/avatars/default-male.svg' | '/avatars/default-female.svg';
export type AvatarResponse = MeResponse & { cleanupWarning?: boolean };

export function selectDefaultAvatar(token: string, avatarUrl: DefaultAvatar) {
	return apiFetch<AvatarResponse>('/users/me/avatar', {
		method: 'PATCH',
		body: { avatarUrl },
		token
	});
}

export function addAvatar(token: string, file: File) {
	const formData = new FormData();
	formData.append('avatar', file);

	return apiFetch<AvatarResponse>('/users/me/avatar', {
		method: 'POST',
		body: formData,
		token
	});
}

export function deleteAvatar(token: string) {
	return apiFetch<AvatarResponse>('/users/me/avatar', {
		method: 'DELETE',
		token
	});
}
