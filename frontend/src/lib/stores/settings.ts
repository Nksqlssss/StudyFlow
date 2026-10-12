import {
	defaultAppSettings,
	getSettings,
	resetSettings,
	updateSettings,
	type UpdateSettingData
} from '$lib/api/settings';
import type { AppSettings } from '$lib/types';
import { get, writable } from 'svelte/store';

const isLoading = writable(false);
const isLoaded = writable(false);
const error = writable<string | null>(null);

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback;
}

function createSettingsStore() {
	const { subscribe, set } = writable<AppSettings>(defaultAppSettings);
	let currentToken: string | null = null;
	let requestVersion = 0;
	let isSaving = false;
	let currentSavingVersion: number | null = null;

	async function load(token: string) {
		currentToken = token;
		const version = ++requestVersion;

		isLoading.set(true);
		isLoaded.set(false);
		error.set(null);

		try {
			const response = await getSettings(token);

			if (version !== requestVersion || token !== currentToken) return;

			set(response.settings);
			isLoaded.set(true);
		} catch (err) {
			if (version !== requestVersion || token !== currentToken) return;

			error.set(getErrorMessage(err, 'Failed to load settings'));
			isLoaded.set(false);
			throw err;
		} finally {
			if (version === requestVersion && token === currentToken) {
				isLoading.set(false);
			}
		}
	}

	async function update(data: UpdateSettingData) {
		if (isSaving) return;

		const token = currentToken;

		if (!token) {
			error.set('You must be logged in to update settings');
			return;
		}

		const version = ++requestVersion;
		currentSavingVersion = version;
		const previousSettings = get({ subscribe });

		set({
			...previousSettings,
			...data
		});
		isLoaded.set(true);
		isLoading.set(true);
		error.set(null);

		try {
			isSaving = true;
			const response = await updateSettings(token, data);

			if (version !== requestVersion || token !== currentToken) return;

			set(response.settings);
		} catch (err) {
			if (version !== requestVersion || token !== currentToken) return;

			set(previousSettings);
			error.set(getErrorMessage(err, 'Failed to update settings'));
		} finally {
			if (version === requestVersion && token === currentToken) isLoading.set(false);
			if (currentSavingVersion === version) {
				isSaving = false;
				currentSavingVersion = null;
			}
		}
	}

	async function reset() {
		if (isSaving) return;

		const token = currentToken;

		if (!token) {
			error.set('You must be logged in to reset settings');
			return;
		}

		const version = ++requestVersion;
		currentSavingVersion = version;
		const previousSettings = get({ subscribe });

		set(defaultAppSettings);
		isLoaded.set(true);
		isLoading.set(true);
		error.set(null);

		try {
			isSaving = true;
			const response = await resetSettings(token);

			if (version !== requestVersion || token !== currentToken) return;

			set(response.settings);
		} catch (err) {
			if (version !== requestVersion || token !== currentToken) return;

			set(previousSettings);
			error.set(getErrorMessage(err, 'Failed to reset settings'));
			throw err;
		} finally {
			if (version === requestVersion && token === currentToken) isLoading.set(false);
			if (currentSavingVersion === version) {
				isSaving = false;
				currentSavingVersion = null;
			}
		}
	}

	function clear() {
		requestVersion++;
		currentToken = null;
		isSaving = false;
		currentSavingVersion = null;

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
