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
import { createAsyncGate, getErrorMessage } from './store-utils';

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
const isLoaded = writable<boolean>(false);
const error = writable<null | string>(null);

function setSubjectError(err: unknown, fallback = 'Something went wrong') {
	error.set(getErrorMessage(err, fallback));
}

function createSubjectStore() {
	const { subscribe, set, update } = writable<Subject[]>([]);
	const gate = createAsyncGate();

	async function load(token: string) {
		const request = gate.nextLoad();

		isLoading.set(true);
		error.set(null);

		try {
			const response = await getSubjects(token);

			if (!gate.isCurrentLoad(request)) return;

			set(response.subjects.map(toSubject));
		} catch (err) {
			if (!gate.isCurrentLoad(request)) return;

			setSubjectError(err);
			throw err;
		} finally {
			if (gate.isCurrentLoad(request)) {
				isLoaded.set(true);
				isLoading.set(false);
			}
		}
	}

	async function add(data: CreateSubjectBody, token: string) {
		const request = gate.nextMutation();
		gate.invalidateLoads();

		isLoading.set(true);
		error.set(null);

		try {
			const response = await createSubject(data, token);

			if (!gate.isCurrentMutation(request)) return;

			update((subjects) => [toSubject(response.subject), ...subjects]);
		} catch (err) {
			if (!gate.isCurrentMutation(request)) return;

			setSubjectError(err);
			throw err;
		} finally {
			if (gate.isCurrentMutation(request)) {
				isLoading.set(false);
			}
		}
	}

	async function updateSubjectById(id: string, data: UpdateSubjectBody, token: string) {
		const request = gate.nextMutation();
		gate.invalidateLoads();

		isLoading.set(true);
		error.set(null);

		try {
			const response = await updateSubject(id, data, token);

			if (!gate.isCurrentMutation(request)) return;

			const updatedSubject = toSubject(response.subject);

			update((subjects) =>
				subjects.map((subject) => (subject.id === id ? updatedSubject : subject))
			);
		} catch (err) {
			if (!gate.isCurrentMutation(request)) return;

			setSubjectError(err);
			throw err;
		} finally {
			if (gate.isCurrentMutation(request)) {
				isLoading.set(false);
			}
		}
	}

	async function remove(id: string, token: string) {
		const request = gate.nextMutation();
		let removedSubject: Subject | undefined;
		let removedIndex = -1;

		update((subjects) => {
			removedIndex = subjects.findIndex((subject) => subject.id === id);
			removedSubject = subjects[removedIndex];

			return subjects.filter((subject) => subject.id !== id);
		});

		if (removedIndex === -1) return;

		gate.invalidateLoads();
		isLoading.set(true);
		error.set(null);

		try {
			await deleteSubject(id, token);
		} catch (err) {
			if (!gate.isCurrentMutation(request)) return;

			if (removedSubject) {
				const subjectToRestore = removedSubject;

				update((subjects) => {
					const restoredSubjects = [...subjects];
					restoredSubjects.splice(removedIndex, 0, subjectToRestore);

					return restoredSubjects;
				});
			}
			setSubjectError(err);
			throw err;
		} finally {
			if (gate.isCurrentMutation(request)) {
				isLoading.set(false);
			}
		}
	}

	function clear() {
		gate.reset();

		set([]);
		isLoaded.set(false);
		isLoading.set(false);
		error.set(null);
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
export const subjectLoaded = isLoaded;
export const subjectError = error;
