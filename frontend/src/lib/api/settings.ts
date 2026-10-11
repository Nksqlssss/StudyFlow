import type { AppSettings } from '$lib/types';
import { apiFetch } from './client';

export type UpdateSettingData = Partial<AppSettings>;

export type ResponseAppSetting = {
	settings: AppSettings;
};

export const defaultAppSettings: AppSettings = {
	theme: 'dark',
	cardDensity: 'comfortable',
	showTips: true,
	language: 'ru',
	defaultTaskPriority: 'medium',
	urgentThresholdHours: 24,
	completedTasksVisibility: 'tab_only'
};

export async function getSettings(token: string) {
	return apiFetch<ResponseAppSetting>('/settings', {
		token
	});
}

export async function updateSettings(token: string, data: UpdateSettingData) {
	return apiFetch<ResponseAppSetting>('/settings', {
		method: 'PATCH',
		body: data,
		token
	});
}

export async function resetSettings(token: string) {
	return apiFetch<ResponseAppSetting>('/settings', {
		method: 'PATCH',
		body: defaultAppSettings,
		token
	});
}
