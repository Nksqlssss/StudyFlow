import { browser } from '$app/environment';
import type { Subject, SubjectIcon } from '$lib/types';
import { writable } from 'svelte/store';

function load(): Subject[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem('sf_subjects');
		if (!raw) return [];
		return JSON.parse(raw).map((s: Subject) => ({
			...s,
			createdAt: new Date(s.createdAt)
		}));
	} catch {
		return [];
	}
}

function save(subjects: Subject[]) {
	if (browser) localStorage.setItem('sf_subjects', JSON.stringify(subjects));
}

function createSubjectStore() {
	const { subscribe, update: updateStore } = writable<Subject[]>(load());

	subscribe(save);

	return {
		subscribe,

		add(title: string, icon: SubjectIcon) {
			updateStore((subject) => [
				...subject,
				{
					id: crypto.randomUUID(),
					icon,
					title,
					createdAt: new Date()
				}
			]);
		},

		remove(id: string) {
			updateStore((subject) => subject.filter((s) => s.id !== id));
		},

		update(id: string, changes: Partial<Subject>) {
			updateStore((subject) => subject.map((s) => (s.id === id ? { ...s, ...changes } : s)));
		},

		clear() {
			updateStore(() => []);
		}
	};
}

export const subjects = createSubjectStore();
