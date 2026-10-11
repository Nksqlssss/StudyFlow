import type { AppSettings } from '$lib/types';
import { get, writable } from 'svelte/store';
import {
	defaultAppSettings,
	getSettings,
	resetSettings,
	updateSettings,
	type UpdateSettingData
} from '$lib/api/settings';
import { createAsyncGate, getErrorMessage } from './store-utils';

const isLoading = writable<boolean>(false);
const error = writable<string | null>(null);
const isLoaded = writable(false);

function createSettingsStore() {
	const { subscribe, set } = writable<AppSettings>(defaultAppSettings);
	let currentToken: string | null = null;
	const gate = createAsyncGate();

	function setError(err: unknown, fallback = 'Something went wrong') {
		error.set(getErrorMessage(err, fallback));
	}

	async function load(token: string) {
		currentToken = token;
		const request = gate.nextLoad();

		isLoading.set(true);
		error.set(null);

		try {
			const response = await getSettings(token);

			if (!gate.isCurrentLoad(request)) return;

			set(response.settings);
		} catch (err) {
			if (!gate.isCurrentLoad(request)) return;

			setError(err);
			throw err;
		} finally {
			if (gate.isCurrentLoad(request)) {
				isLoaded.set(true);
				isLoading.set(false);
			}
		}
	}

	function update(data: UpdateSettingData) {
		gate.invalidateLoads();
		const token = currentToken;
		const request = gate.nextMutation();
		const previousSettings = get({ subscribe });
		const nextSettings = {
			...previousSettings,
			...data
		};

		set(nextSettings);
		isLoaded.set(true);
		error.set(null);

		if (!token) return;

		isLoading.set(true);

		void (async () => {
			try {
				const response = await updateSettings(token, data);

				if (!gate.isCurrentMutation(request)) return;

				set(response.settings);
			} catch (err) {
				if (!gate.isCurrentMutation(request)) return;

				set(previousSettings);
				setError(err);
			} finally {
				if (gate.isCurrentMutation(request)) {
					isLoading.set(false);
				}
			}
		})();
	}

	function reset() {
		gate.invalidateLoads();
		const token = currentToken;
		const request = gate.nextMutation();
		const previousSettings = get({ subscribe });

		set(defaultAppSettings);
		isLoaded.set(true);
		error.set(null);

		if (!token) return;

		isLoading.set(true);

		void (async () => {
			try {
				const response = await resetSettings(token);

				if (!gate.isCurrentMutation(request)) return;

				set(response.settings);
			} catch (err) {
				if (!gate.isCurrentMutation(request)) return;

				set(previousSettings);
				setError(err);
			} finally {
				if (gate.isCurrentMutation(request)) {
					isLoading.set(false);
				}
			}
		})();
	}

	function clear() {
		gate.reset();
		currentToken = null;

		set(defaultAppSettings);
		isLoaded.set(false);
		isLoading.set(false);
		error.set(null);
	}

	return {
		subscribe,
		load,
		update,
		reset,
		clear
	};
}

export const settings = createSettingsStore();
export const settingsLoading = isLoading;
export const settingsLoaded = isLoaded;
export const settingsError = error;
