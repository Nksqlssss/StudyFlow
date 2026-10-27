import {
	addAvatar as addAvatarApi,
	deleteAvatar as deleteAvatarApi,
	selectDefaultAvatar,
	type AvatarResponse,
	type DefaultAvatar
} from '$lib/api/avatar';
import { ApiError } from '$lib/api/client';
import { get, writable } from 'svelte/store';
import { auth } from './auth';

export type AvatarState = {
	isAvatarLoading: boolean;
	avatarError: string | null;
	cleanupWarning: boolean;
};

const initialState: AvatarState = {
	isAvatarLoading: false,
	avatarError: null,
	cleanupWarning: false
};

function createAvatarStore() {
	const { update, set, subscribe } = writable<AvatarState>({ ...initialState });
	let version = 0;
	let sessionToken = get(auth).token;

	function clear() {
		version++;
		set({ ...initialState });
	}

	auth.subscribe((state) => {
		if (sessionToken === state.token) return;
		sessionToken = state.token;
		clear();
	});

	async function save(operation: (token: string) => Promise<AvatarResponse>): Promise<boolean> {
		if (get({ subscribe }).isAvatarLoading) return false;
		const token = get(auth).token;
		if (!token) {
			update((state) => ({ ...state, avatarError: 'Not authenticated' }));
			return false;
		}
		const requestVersion = ++version;
		const isCurrent = () => requestVersion === version && token === get(auth).token;
		update((state) => ({
			...state,
			isAvatarLoading: true,
			avatarError: null,
			cleanupWarning: false
		}));
		try {
			const response = await operation(token);
			if (!isCurrent()) return false;
			auth.updateUser(response.user);
			update((state) => ({ ...state, cleanupWarning: response.cleanupWarning === true }));
			return true;
		} catch (error) {
			if (!isCurrent()) return false;
			update((state) => ({
				...state,
				avatarError: error instanceof Error ? error.message : 'Avatar upload failed'
			}));
			if (error instanceof ApiError && error.status === 401) void auth.logout();
			return false;
		} finally {
			if (isCurrent()) update((state) => ({ ...state, isAvatarLoading: false }));
		}
	}

	return {
		subscribe,
		clear,
		addAvatar(file: File) {
			if (get({ subscribe }).isAvatarLoading) return Promise.resolve(false);
			if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
				update((state) => ({ ...state, avatarError: 'Only JPEG, PNG and WebP are supported' }));
				return Promise.resolve(false);
			}
			if (file.size > 5 * 1024 * 1024) {
				update((state) => ({ ...state, avatarError: 'File is too large (max 5 MiB)' }));
				return Promise.resolve(false);
			}
			return save((token) => addAvatarApi(token, file));
		},
		selectDefault(value: DefaultAvatar) {
			return save((token) => selectDefaultAvatar(token, value));
		},
		deleteAvatar() {
			return save(deleteAvatarApi);
		}
	};
}

export const avatar = createAvatarStore();
