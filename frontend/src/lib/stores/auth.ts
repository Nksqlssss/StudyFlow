import { browser } from '$app/environment';
import type { AuthResponse } from '$lib/api/auth';
import {
	exchangeGoogleCode,
	getMe,
	login as loginApi,
	register as registerApi,
	updateProfile as updateProfileApi,
	type AuthUser,
	type LoginBody,
	type RegisterBody,
	type UpdateProfileBody
} from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import { writable } from 'svelte/store';
import { settings } from './settings';
import { subjects } from './subjects';
import { tasks } from './tasks';

type AuthState = {
	user: AuthUser | null;
	token: string | null;
	isLoading: boolean;
	error: string | null;
	errorCode: string | null;
};

const TOKEN_KEY = 'studyflow_token';

const initialState: AuthState = {
	user: null,
	token: browser ? localStorage.getItem(TOKEN_KEY) : null,
	isLoading: browser ? Boolean(localStorage.getItem(TOKEN_KEY)) : false,
	error: null,
	errorCode: null
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	function saveSession(response: AuthResponse) {
		if (browser) {
			localStorage.setItem(TOKEN_KEY, response.accessToken);
		}

		set({
			user: response.user,
			token: response.accessToken,
			isLoading: false,
			error: null,
			errorCode: null
		});
	}

	return {
		subscribe,

		async login(data: LoginBody) {
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			try {
				const response = await loginApi(data);

				saveSession(response);
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Login failed',
					errorCode: error instanceof ApiError ? error.code : null
				}));
			}
		},

		async loginWithGoogle(code: string): Promise<boolean> {
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			try {
				const response = await exchangeGoogleCode(code);

				saveSession(response);

				return true;
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Login failed',
					errorCode: error instanceof ApiError ? error.code : null
				}));

				return false;
			}
		},

		async register(data: RegisterBody): Promise<boolean> {
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			try {
				await registerApi(data);

				update((state) => ({
					...state,
					isLoading: false,
					error: null
				}));

				return true;
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Registration failed'
				}));

				return false;
			}
		},

		async loadMe() {
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				set({
					user: null,
					token: null,
					isLoading: false,
					error: null,
					errorCode: null
				});
				settings.clear();

				return;
			}

			try {
				const response = await getMe(token);

				set({
					user: response.user,
					token,
					isLoading: false,
					error: null,
					errorCode: null
				});
			} catch {
				if (browser) {
					localStorage.removeItem(TOKEN_KEY);
				}

				set({
					user: null,
					token: null,
					isLoading: false,
					error: null,
					errorCode: null
				});
				settings.clear();
			}
		},

		logout() {
			if (browser) {
				localStorage.removeItem(TOKEN_KEY);
			}

			set({
				user: null,
				token: null,
				isLoading: false,
				error: null,
				errorCode: null
			});

			subjects.clear();
			tasks.clear();
			settings.clear();
		},

		async updateProfile(data: UpdateProfileBody): Promise<boolean> {
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				update((state) => ({
					...state,
					isLoading: false,
					error: 'Not authenticated'
				}));

				throw new ApiError('Ваша сессия истекла', 401, null);
			}

			try {
				const response = await updateProfileApi(data, token);
				update((state) => ({
					...state,
					user: response.user,
					isLoading: false,
					error: null
				}));

				return true;
			} catch (err) {
				update((state) => ({
					...state,
					isLoading: false,
					error: err instanceof Error ? err.message : 'Profile update failed'
				}));

				throw err;
			}
		}
	};
}

export const auth = createAuthStore();
