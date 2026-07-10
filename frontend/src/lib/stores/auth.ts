import { browser } from '$app/environment'
import { getMe, login, register, type AuthUser, type LoginBody, type RegisterBody } from '$lib/api/auth'
import { writable } from 'svelte/store'

type AuthState = {
	user: AuthUser | null;
	token: string | null;
	isLoading: boolean;
	error: string | null;
};

const TOKEN_KEY = 'studyflow_token';

const initialState: AuthState = {
	user: null,
	token: browser ? localStorage.getItem(TOKEN_KEY) : null,
	isLoading: false,
	error: null
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		async login(data: LoginBody) {
			update((state) => ({
				...state,
				isLoading: true,
				error: null
			}));

			try {
				const response = await login(data);

				if (browser) {
					localStorage.setItem(TOKEN_KEY, response.accessToken);
				}

				set({
					user: response.user,
					token: response.accessToken,
					isLoading: false,
					error: null
				});
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Login failed'
				}));
			}
		},

		async register(data: RegisterBody) {
			update((state) => ({
				...state,
				isLoading: true,
				error: null
			}));

			try {
				const response = await register(data);

				if (browser) {
					localStorage.setItem(TOKEN_KEY, response.accessToken);
				}

				set({
					user: response.user,
					token: response.accessToken,
					isLoading: false,
					error: null
				});
			} catch (error) {
				update((state) => ({
					...state,
					isLoading: false,
					error: error instanceof Error ? error.message : 'Registration failed'
				}));
			}
		},

		async loadMe() {
			update((state) => ({
				...state,
				isLoading: true,
				error: null
			}));

			const token = browser ? localStorage.getItem(TOKEN_KEY) : null;

			if (!token) {
				set({
					user: null,
					token: null,
					isLoading: false,
					error: null
				});

				return;
			}

			try {
				const response = await getMe(token);

				set({
					user: response.user,
					token,
					isLoading: false,
					error: null
				});
			} catch {
				if (browser) {
					localStorage.removeItem(TOKEN_KEY);
				}

				set({
					user: null,
					token: null,
					isLoading: false,
					error: null
				});
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
				error: null
			});
		}
	};
}

export const auth = createAuthStore();