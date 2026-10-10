import {
	createSubject,
	deleteSubject,
	getSubjects,
	updateSubject,
	type CreateSubjectBody,
	type UpdateSubjectBody
} from '$lib/api/subjects';
import type { Subject } from '$lib/types';
import { writable } from 'svelte/store';

function toSubject(subject: {
	id: string;
	title: string;
	icon: Subject['icon'];
	createdAt: string;
}): Subject {
	return {
		id: subject.id,
		title: subject.title,
		icon: subject.icon,
		createdAt: new Date(subject.createdAt)
	};
}

const isLoading = writable<boolean>(false);
const error = writable<null | string>(null);

function createSubjectStore() {
	const { subscribe, set, update } = writable<Subject[]>([]);

	async function load(token: string) {
		isLoading.set(true);
		error.set(null);

		try {
			const response = await getSubjects(token);

			set(response.subjects.map(toSubject));
		} catch (err) {
			if (!(err instanceof Error)) {
				error.set('Something went wrong');
				throw err;
			}
			error.set(err.message);
		} finally {
			isLoading.set(false);
		}
	}

	async function add(data: CreateSubjectBody, token: string) {
		const response = await createSubject(data, token);

		update((subjects) => [toSubject(response.subject), ...subjects]);
	}

	async function updateSubjectById(id: string, data: UpdateSubjectBody, token: string) {
		const response = await updateSubject(id, data, token);
		const updatedSubject = toSubject(response.subject);

		update((subjects) => subjects.map((subject) => (subject.id === id ? updatedSubject : subject)));
	}

	async function remove(id: string, token: string) {
		let removedSubject: Subject | undefined;
		let removedIndex = -1;

		update((subjects) => {
			removedIndex = subjects.findIndex((subject) => subject.id === id);
			removedSubject = subjects[removedIndex];

			return subjects.filter((subject) => subject.id !== id);
		});

		if (removedIndex === -1) return;

		try {
			await deleteSubject(id, token);
		} catch (error) {
			if (removedSubject) {
				const subjectToRestore = removedSubject;

				update((subjects) => {
					const restoredSubjects = [...subjects];
					restoredSubjects.splice(removedIndex, 0, subjectToRestore);

					return restoredSubjects;
				});
			}
			throw error;
		}
	}

	function clear() {
		set([]);
	}

	return {
		subscribe,
		load,
		add,
		update: updateSubjectById,
		remove,
		clear
	};
}

export const subjects = createSubjectStore();
export const subjectLoading = isLoading;
export const subjectError = error;
