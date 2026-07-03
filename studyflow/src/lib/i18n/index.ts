import type { AppSettings, TaskPriority, TaskStatus } from '$lib/types';
import { translations } from './translations';

export type Language = AppSettings['language'];
export type TranslationKey = keyof typeof translations.ru;

const LOCALE_BY_LANGUAGE: Record<Language, string> = {
	ru: 'ru-RU',
	en: 'en-US',
	pl: 'pl-PL'
};

export function translate(
	language: Language,
	key: TranslationKey,
	params: Record<string, string | number> = {}
): string {
	const dictionary = translations[language] ?? translations.ru;
	let text: string = dictionary[key] ?? translations.ru[key] ?? key;

	for (const [name, value] of Object.entries(params)) {
		text = text.replaceAll(`{${name}}`, String(value));
	}

	return text;
}

export function priorityLabel(language: Language, priority: TaskPriority): string {
	return translate(language, `priority.${priority}` as TranslationKey);
}

export function statusLabel(language: Language, status: TaskStatus): string {
	return translate(language, `status.${status}` as TranslationKey);
}

export function formatDate(date: Date, language: Language): string {
	return date.toLocaleDateString(LOCALE_BY_LANGUAGE[language]);
}

export function formatLongDate(date: Date, language: Language): string {
	return date.toLocaleDateString(LOCALE_BY_LANGUAGE[language], {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

export function deadlineStatus(deadline: Date | undefined, language: Language): string {
	if (!deadline) return translate(language, 'tasks.detail.noDeadline');

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const target = new Date(deadline);
	target.setHours(0, 0, 0, 0);

	const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

	if (diffDays === 0) return translate(language, 'tasks.deadline.today');
	if (diffDays === 1) return translate(language, 'tasks.deadline.oneLeft');
	if (diffDays > 1) return translate(language, 'tasks.deadline.manyLeft', { count: diffDays });
	if (diffDays === -1) return translate(language, 'tasks.deadline.oneOverdue');

	return translate(language, 'tasks.deadline.manyOverdue', { count: Math.abs(diffDays) });
}
