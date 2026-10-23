import { browser } from '$app/environment';
import type { AuthMethodsResponse, AuthResponse } from '$lib/api/auth';
import {
	addGoogleAccount,
	changePassword as changePasswordApi,
	confirmEmailChange as confirmEmailChangeApi,
	deleteAccount as deleteAccountApi,
	deleteGoogleAccount,
	exchangeGoogleCode,
	getAuthMethods,
	getMe,
	login as loginApi,
	logout as logoutApi,
	requestReauthCode as requestReauthCodeApi,
	verifyReauthCode as verifyReauthCodeApi,
	register as registerApi,
	requestEmailChange as requestEmailChangeApi,
	setPassword,
	updateProfile as updateProfileApi,
	type AuthUser,
	type LoginBody,
	type RegisterBody,
	type ReauthPurpose,
	type UpdateProfileBody,
	type changePasswordBody,
	type setPasswordBody
} from '$lib/api/auth';
import { ApiError } from '$lib/api/client';
import { get, writable } from 'svelte/store';
import { pendingEmailChange } from './pendingEmailChange';
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
	logoutWarning: boolean;
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
	passwordError: null,
	logoutWarning: false
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);
	let sessionVersion = 0;
	let logoutPending: Promise<boolean> | null = null;
	const currentToken = () => (browser ? localStorage.getItem(TOKEN_KEY) : null);
	const isCurrent = (token: string) =>
		currentToken() === token && get({ subscribe }).token === token;

	function saveSession(response: AuthResponse) {
		sessionVersion++;
		if (get({ subscribe }).user?.id !== response.user.id) {
			subjects.clear();
			tasks.clear();
			settings.clear();
		}
		if (browser) {
			localStorage.setItem(TOKEN_KEY, response.accessToken);
		}

		set({
			...initialState,
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

	function clearSession() {
		sessionVersion++;
		if (browser) {
			localStorage.removeItem(TOKEN_KEY);
		}

		set({
			...initialState,
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

	function logout(): Promise<boolean> {
		if (logoutPending) return logoutPending;
		const token = currentToken();
		sessionVersion++;
		pendingEmailChange.set(null);
		logoutPending = (async () => {
			let revoked = true;
			try {
				if (token) await logoutApi(token);
			} catch (error) {
				revoked = error instanceof ApiError && error.status === 401;
			} finally {
				if (currentToken() === token) {
					clearSession();
					update((state) => ({ ...state, logoutWarning: !revoked }));
				}
			}
			return revoked;
		})().finally(() => {
			logoutPending = null;
		});
		return logoutPending;
	}

	async function loadMethods() {
		const token = browser ? localStorage.getItem(TOKEN_KEY) : null;
		if (get({ subscribe }).isMethodsLoading) return;

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
			isMethodsLoading: true
		}));

		try {
			const methods = await getAuthMethods(token);
			if (!isCurrent(token)) return;

			update((state) => ({
				...state,
				methods,
				isMethodsLoading: false
			}));
		} catch (err) {
			if (!isCurrent(token)) return;
			if (err instanceof ApiError && err.status === 401) {
				clearSession();
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
		clearErrors() {
			update((state) => ({
				...state,
				error: null,
				errorCode: null,
				accountError: null,
				passwordError: null
			}));
		},
		clearLogoutWarning() {
			update((state) => ({ ...state, logoutWarning: false }));
		},
		async requestReauthCode(purpose: ReauthPurpose) {
			const token = currentToken();
			if (!token) throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
			try {
				const result = await requestReauthCodeApi(token, purpose);
				if (!isCurrent(token)) throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
				return result;
			} catch (error) {
				if (isCurrent(token) && error instanceof ApiError && error.status === 401) clearSession();
				throw error;
			}
		},
		async verifyReauthCode(purpose: ReauthPurpose, code: string) {
			const token = currentToken();
			if (!token) throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
			try {
				const result = await verifyReauthCodeApi(token, purpose, code);
				if (!isCurrent(token)) throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED');
				return result;
			} catch (error) {
				if (isCurrent(token) && error instanceof ApiError && error.status === 401) clearSession();
				throw error;
			}
		},

		async login(data: LoginBody) {
			if (get({ subscribe }).isLoading) return;
			const version = sessionVersion;
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			try {
				const response = await loginApi(data);
				if (version !== sessionVersion) return;

				saveSession(response);
			} catch (error) {
				if (version !== sessionVersion) return;
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Login failed',
					errorCode: error instanceof ApiError ? error.code : null
				}));
			}
		},

		async loginWithGoogle(code: string): Promise<boolean> {
			const version = sessionVersion;
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			try {
				const response = await exchangeGoogleCode(code);
				if (version !== sessionVersion) return false;

				saveSession(response);

				return true;
			} catch (error) {
				if (version !== sessionVersion) return false;
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
			if (get({ subscribe }).isLoading) return false;
			const version = sessionVersion;
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			try {
				await registerApi(data);
				if (version !== sessionVersion) return false;

				update((state) => ({
					...state,
					isLoading: false,
					error: null
				}));

				return true;
			} catch (error) {
				if (version !== sessionVersion) return false;
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Registration failed'
				}));

				return false;
			}
		},

		async loadMe() {
			const version = sessionVersion;
			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				errorCode: null
			}));

			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				set({
					...initialState,
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
				if (version !== sessionVersion || currentToken() !== token) return;

				update((state) => ({
					...state,
					user: response.user,
					token,
					isLoading: false,
					error: null,
					errorCode: null,
					methods: state.token === token ? state.methods : null
				}));
			} catch {
				if (version !== sessionVersion || currentToken() !== token) return;
				if (browser) {
					localStorage.removeItem(TOKEN_KEY);
				}

				set({
					...initialState,
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
				if (!isCurrent(token)) return false;
				update((state) => ({
					...state,
					user: response.user,
					isLoading: false,
					error: null
				}));

				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				update((state) => ({
					...state,
					isLoading: false,
					error: err instanceof Error ? err.message : 'Profile update failed'
				}));

				throw err;
			}
		},

		async addGoogle() {
			if (get({ subscribe }).isAccountLoading) return;
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
				if (!isCurrent(token)) return;

				update((state) => ({
					...state,
					isAccountLoading: false
				}));

				return link;
			} catch (err) {
				if (!isCurrent(token)) return;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						accountError: err instanceof Error ? err.message : 'Google linking failed',
						errorCode: err instanceof ApiError ? err.code : null,
						isAccountLoading: false
					}));
				}
			}
		},

		async deleteGoogle() {
			if (get({ subscribe }).isAccountLoading) return false;
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
				if (!isCurrent(token)) return false;
				await loadMethods();
				if (!isCurrent(token)) return false;

				update((state) => ({
					...state,
					isAccountLoading: false
				}));
				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						accountError: err instanceof Error ? err.message : 'Google unlinking failed',
						errorCode: err instanceof ApiError ? err.code : null,
						isAccountLoading: false
					}));
				}
			}
		},

		async createPassword(data: setPasswordBody) {
			if (get({ subscribe }).isPasswordLoading) return false;
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
				if (!isCurrent(token)) return false;
				update((state) => ({
					...state,
					methods: state.methods ? { ...state.methods, hasPassword: true } : null
				}));
				await loadMethods();
				if (!isCurrent(token)) return false;

				update((state) => ({
					...state,
					isPasswordLoading: false,
					passwordError: null
				}));

				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						passwordError: err instanceof Error ? err.message : 'Password set failed',
						errorCode: err instanceof ApiError ? err.code : null,
						isPasswordLoading: false
					}));
				}

				return false;
			}
		},

		async changePassword(data: changePasswordBody) {
			if (get({ subscribe }).isPasswordLoading) return false;
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
				if (!isCurrent(token)) return false;

				update((state) => ({
					...state,
					isPasswordLoading: false,
					passwordError: null
				}));

				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						passwordError: err instanceof Error ? err.message : 'Password change failed',
						errorCode: err instanceof ApiError ? err.code : null,
						isPasswordLoading: false
					}));
				}

				return false;
			}
		},

		async deleteAccount() {
			if (get({ subscribe }).isLoading) return false;
			const token = browser ? localStorage.getItem(TOKEN_KEY) : undefined;

			if (!token) {
				update((state) => ({
					...state,
					error: 'Not authenticated'
				}));

				return false;
			}

			update((state) => ({
				...state,
				isLoading: true,
				error: null
			}));

			try {
				await deleteAccountApi(token);
				if (!isCurrent(token)) return false;
				clearSession();
				pendingEmailChange.set(null);

				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						error: err instanceof Error ? err.message : 'Account deletion failed',
						errorCode: err instanceof ApiError ? err.code : null,
						isLoading: false
					}));
				}

				return false;
			}
		},

		async requestEmailChange(newEmail: string, currentPassword: string, reauthToken?: string) {
			if (get({ subscribe }).isAccountLoading) return false;
			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				update((state) => ({
					...state,
					accountError: 'Not authenticated'
				}));

				return false;
			}

			update((state) => ({
				...state,
				isAccountLoading: true,
				accountError: null
			}));

			try {
				await requestEmailChangeApi(token, newEmail, currentPassword, reauthToken);
				if (!isCurrent(token)) return false;

				update((state) => ({
					...state,
					isAccountLoading: false,
					accountError: null
				}));

				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						isAccountLoading: false,
						accountError: err instanceof Error ? err.message : 'Email change request failed',
						errorCode: err instanceof ApiError ? err.code : null
					}));
				}

				return false;
			}
		},

		async confirmEmailChange(confirmationToken: string) {
			if (get({ subscribe }).isAccountLoading) return false;
			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				update((state) => ({
					...state,
					accountError: 'Not authenticated'
				}));

				return false;
			}

			update((state) => ({
				...state,
				isAccountLoading: true,
				accountError: null
			}));

			try {
				const response = await confirmEmailChangeApi(token, confirmationToken);
				if (!isCurrent(token)) return false;

				update((state) => ({
					...state,
					user: response.user,
					isAccountLoading: false,
					accountError: null
				}));

				return true;
			} catch (err) {
				if (!isCurrent(token)) return false;
				if (err instanceof ApiError && err.status === 401) {
					clearSession();
				} else {
					update((state) => ({
						...state,
						isAccountLoading: false,
						accountError: err instanceof Error ? err.message : 'Email confirmation failed',
						errorCode: err instanceof ApiError ? err.code : null
					}));
				}

				return false;
			}
		}
	};
}

export const auth = createAuthStore();
