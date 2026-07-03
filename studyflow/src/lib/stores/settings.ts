import { browser } from '$app/environment';
import type { AppSettings } from '$lib/types';
import { writable } from 'svelte/store';

export const DEFAULT_SETTINGS: AppSettings = {
	theme: 'dark',
	cardDensity: 'comfortable',
	showTips: true,
	language: 'ru',
	defaultTaskPriority: 'medium',
	urgentThresholdHours: 24,
	completedTasksVisibility: 'tab_only'
};

function load(): AppSettings {
	if (!browser) return DEFAULT_SETTINGS;

	try {
		const raw = localStorage.getItem('sf_settings');

		if (!raw) return DEFAULT_SETTINGS;

		return {
			...DEFAULT_SETTINGS,
			...JSON.parse(raw)
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

function save(settings: AppSettings) {
	if (browser) {
		localStorage.setItem('sf_settings', JSON.stringify(settings));
	}
}

function createSettingsStore() {
	const { subscribe, set, update } = writable<AppSettings>(load());

	subscribe(save);

	return {
		subscribe,

		update(changes: Partial<AppSettings>) {
			update((settings) => ({
				...settings,
				...changes
			}));
		},

		reset() {
			set(DEFAULT_SETTINGS);
		}
	};
}

export const settings = createSettingsStore();
