import type { Subject, SubjectIcon } from '$lib/types'
import { writable } from 'svelte/store'

function createSubjectStore() {
	const { subscribe, update: updateStore } = writable<Subject[]>([
		{ id: '1', title: 'Математика', icon: 'math', createdAt: new Date() }
	]);

	return {
		subscribe,

		add(title: string, icon: SubjectIcon, description?: string) {
			updateStore(subject => [...subject, {
				id: crypto.randomUUID(),
				icon,
				title,
				description,
				createdAt: new Date(),
			}]);
		},

		remove(id: string) {
			updateStore(subject => subject.filter(s => s.id !== id));
		},

		update(id: string, changes: Partial<Subject>) {
			updateStore(subject => subject.map(
				s => s.id === id ? { ...s, ...changes } : s
			));
		}
	};
}

export const subjects = createSubjectStore();