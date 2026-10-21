import { browser } from '$app/environment';
import type { AuthMethodsResponse, AuthResponse } from '$lib/api/auth';
import {
	addGoogleAccount,
	changePassword as changePasswordApi,
	deleteGoogleAccount,
	exchangeGoogleCode,
	getAuthMethods,
	getMe,
	login as loginApi,
	register as registerApi,
	setPassword,
	updateProfile as updateProfileApi,
	type AuthUser,
	type LoginBody,
	type RegisterBody,
	type UpdateProfileBody,
	type changePasswordBody,
	type setPasswordBody
} from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import { writable } from 'svelte/store';
import { settings } from './settings';
import { subjects } from './subjects';
import { tasks } from './tasks';

const TOKEN_KEY = 'studyflow_token';

type AuthState = {
	user: AuthUser | null;
	token: string | null;
	isLoading: boolean;
	error: string | null;
	errorCode: string | null;
	methods: AuthMethodsResponse | null;
	isMethodsLoading: boolean;
	accountError: string | null;
	isAccountLoading: boolean;
	isPasswordLoading: boolean;
	passwordError: string | null;
};

const initialState: AuthState = {
	user: null,
	token: browser ? localStorage.getItem(TOKEN_KEY) : null,
	isLoading: browser ? Boolean(localStorage.getItem(TOKEN_KEY)) : false,
	error: null,
	errorCode: null,
	methods: null,
	isMethodsLoading: false,
	accountError: null,
	isAccountLoading: false,
	isPasswordLoading: false,
	passwordError: null
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
			errorCode: null,
			methods: null,
			isMethodsLoading: false,
			accountError: null,
			isAccountLoading: false,
			isPasswordLoading: false,
			passwordError: null
		});
	}

	function logout() {
		if (browser) {
			localStorage.removeItem(TOKEN_KEY);
		}

		set({
			user: null,
			token: null,
			isLoading: false,
			error: null,
			errorCode: null,
			methods: null,
			isMethodsLoading: false,
			accountError: null,
			isAccountLoading: false,
			isPasswordLoading: false,
			passwordError: null
		});

		subjects.clear();
		tasks.clear();
		settings.clear();
	}

	async function loadMethods() {
		const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

		if (!token) {
			update((state) => ({
				...state,
				methods: null,
				isMethodsLoading: false
			}));

			return;
		}

		update((state) => ({
			...state,
			methods: null,
			isMethodsLoading: true
		}));

		try {
			const methods = await getAuthMethods(token);

			update((state) => ({
				...state,
				methods,
				isMethodsLoading: false
			}));
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				logout();
			} else {
				update((state) => ({
					...state,
					methods: null,
					isMethodsLoading: false
				}));
			}
		}
	}

	return {
		subscribe,
		logout,
		loadMethods,

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
					errorCode: null,
					methods: null,
					isMethodsLoading: false,
					accountError: null,
					isAccountLoading: false,
					isPasswordLoading: false,
					passwordError: null
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
					errorCode: null,
					methods: null,
					isMethodsLoading: false,
					accountError: null,
					isAccountLoading: false,
					isPasswordLoading: false,
					passwordError: null
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
					errorCode: null,
					methods: null,
					isMethodsLoading: false,
					accountError: null,
					isAccountLoading: false,
					isPasswordLoading: false,
					passwordError: null
				});
				settings.clear();
			}
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
		},

		async addGoogle() {
			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				update((state) => ({
					...state,
					accountError: 'Not authenticated'
				}));

				return;
			}

			update((state) => ({
				...state,
				isAccountLoading: true,
				accountError: null
			}));

			try {
				const link = await addGoogleAccount(token);

				update((state) => ({
					...state,
					isAccountLoading: false
				}));

				return link;
			} catch (err) {
				if (err instanceof ApiError && err.status === 401) {
					logout();
				} else {
					update((state) => ({
						...state,
						accountError: err instanceof Error ? err.message : 'Google linking failed',
						isAccountLoading: false
					}));
				}
			}
		},

		async deleteGoogle() {
			const token = browser ? localStorage.getItem(TOKEN_KEY) : undefined;

			if (!token) {
				update((state) => ({
					...state,
					accountError: 'Not authenticated'
				}));

				return;
			}

			update((state) => ({
				...state,
				isAccountLoading: true,
				accountError: null
			}));

			try {
				await deleteGoogleAccount(token);
				await loadMethods();

				update((state) => ({
					...state,
					isAccountLoading: false
				}));
			} catch (err) {
				if (err instanceof ApiError && err.status === 401) {
					logout();
				} else {
					update((state) => ({
						...state,
						accountError: err instanceof Error ? err.message : 'Google unlinking failed',
						isAccountLoading: false
					}));
				}
			}
		},

		async createPassword(data: setPasswordBody) {
			const token = browser ? localStorage.getItem(TOKEN_KEY) : undefined;

			if (!token) {
				update((state) => ({
					...state,
					passwordError: 'Not authenticated'
				}));

				return false;
			}

			update((state) => ({
				...state,
				isPasswordLoading: true,
				passwordError: null
			}));

			try {
				await setPassword(data, token);
				await loadMethods();

				update((state) => ({
					...state,
					isPasswordLoading: false,
					passwordError: null
				}));

				return true;
			} catch (err) {
				if (err instanceof ApiError && err.status === 401) {
					logout();
				} else {
					update((state) => ({
						...state,
						passwordError: err instanceof Error ? err.message : 'Password set failed',
						isPasswordLoading: false
					}));
				}

				return false;
			}
		},

		async changePassword(data: changePasswordBody) {
			const token = browser ? localStorage.getItem(TOKEN_KEY) : undefined;

			if (!token) {
				update((state) => ({
					...state,
					passwordError: 'Not authenticated'
				}));

				return false;
			}

			update((state) => ({
				...state,
				isPasswordLoading: true,
				passwordError: null
			}));

			try {
				await changePasswordApi(data, token);

				update((state) => ({
					...state,
					isPasswordLoading: false,
					passwordError: null
				}));

				return true;
			} catch (err) {
				if (err instanceof ApiError && err.status === 401) {
					logout();
				} else {
					update((state) => ({
						...state,
						passwordError: err instanceof Error ? err.message : 'Password change failed',
						isPasswordLoading: false
					}));
				}

				return false;
			}
		}
	};
}

export const auth = createAuthStore();
