import type { ApiTask } from '$lib/api/tasks';
import { createTask, deleteTask, getAllTasks, getTasks, updateTask } from '$lib/api/tasks';
import type { Task, TaskPriority, TaskStatus } from '$lib/types';
import { derived, writable } from 'svelte/store';
import { settings } from './settings';
import { getErrorMessage } from './store-utils';

type UpdateTaskData = {
	title?: string;
	description?: string | null;
	deadline?: Date | null;
	priority?: TaskPriority;
	status?: TaskStatus;
};

function toTask(task: ApiTask): Task {
	return {
		id: task.id,
		title: task.title,
		description: task.description ? task.description : undefined,
		deadline: task.deadline ? new Date(task.deadline) : undefined,
		createdAt: new Date(task.createdAt),
		updatedAt: new Date(task.updatedAt),
		status: task.status,
		priority: task.priority,
		subjectId: task.subjectId
	};
}

const isLoading = writable<boolean>(false);
const isFetching = writable(false);
const hasLoaded = writable(false);
const fetchError = writable<null | string>(null);
const error = writable<null | string>(null);

function createTaskStore() {
	const { subscribe, set, update: updateStore } = writable<Task[]>([]);
	let sessionVersion = 0;
	let loadAllVersion = 0;
	let loadVersion = 0;

	function isCurrentSession(session: number) {
		return session === sessionVersion;
	}

	function invalidateLoads() {
		loadAllVersion++;
		loadVersion++;
		isFetching.set(false);
	}

	return {
		subscribe,

		async loadAll(token: string) {
			const session = sessionVersion;
			const version = ++loadAllVersion;
			isFetching.set(true);
			fetchError.set(null);

			try {
				const response = await getAllTasks(token);

				if (session !== sessionVersion || version !== loadAllVersion) return;

				set(response.tasks.map(toTask));
				hasLoaded.set(true);
			} catch (err) {
				if (session !== sessionVersion || version !== loadAllVersion) return;

				fetchError.set(getErrorMessage(err));
				throw err;
			} finally {
				if (session === sessionVersion && version === loadAllVersion) {
					isFetching.set(false);
				}
			}
		},

		async load(token: string, subjectId: string) {
			const session = sessionVersion;
			const version = ++loadVersion;
			isLoading.set(true);
			error.set(null);

			try {
				const response = await getTasks(token, subjectId);

				if (session !== sessionVersion || version !== loadVersion) return;

				updateStore((tasks) => {
					const otherTasks = tasks.filter((task) => task.subjectId !== subjectId);
					const newTasks = response.tasks.map(toTask);

					return [...otherTasks, ...newTasks];
				});
			} catch (err) {
				if (session !== sessionVersion || version !== loadVersion) return;

				error.set(getErrorMessage(err));
				throw err;
			} finally {
				if (session === sessionVersion && version === loadVersion) {
					isLoading.set(false);
				}
			}
		},

		async add(
			token: string,
			subjectId: string,
			data: Omit<Task, 'createdAt' | 'updatedAt' | 'id' | 'subjectId' | 'status'>
		) {
			const session = sessionVersion;
			invalidateLoads();

			const apiTask = {
				title: data.title,
				description: data.description ? data.description : undefined,
				deadline: data.deadline ? data.deadline.toISOString() : undefined,
				priority: data.priority ? data.priority : undefined
			};

			isLoading.set(true);
			error.set(null);

			try {
				const response = await createTask(token, subjectId, apiTask);

				if (!isCurrentSession(session)) return;

				updateStore((tasks) => [toTask(response.task), ...tasks]);
			} catch (err) {
				if (!isCurrentSession(session)) return;

				error.set(getErrorMessage(err));
				throw err;
			} finally {
				if (isCurrentSession(session)) {
					isLoading.set(false);
				}
			}
		},

		async setStatus(token: string, id: string, status: TaskStatus) {
			const session = sessionVersion;
			invalidateLoads();

			isLoading.set(true);
			error.set(null);

			try {
				const response = await updateTask(token, id, { status });

				if (!isCurrentSession(session)) return;

				const task = toTask(response.task);

				updateStore((tasks) => {
					return tasks.map((t) => (t.id === id ? task : t));
				});
			} catch (err) {
				if (!isCurrentSession(session)) return;

				error.set(getErrorMessage(err));
				throw err;
			} finally {
				if (isCurrentSession(session)) {
					isLoading.set(false);
				}
			}
		},

		async update(token: string, id: string, data: UpdateTaskData) {
			const session = sessionVersion;
			invalidateLoads();

			const apiData = {
				title: data.title ? data.title : undefined,
				description: data.description,
				deadline:
					data.deadline === undefined
						? undefined
						: data.deadline === null
							? null
							: data.deadline.toISOString(),
				priority: data.priority ? data.priority : undefined,
				status: data.status ? data.status : undefined
			};

			isLoading.set(true);
			error.set(null);

			try {
				const response = await updateTask(token, id, apiData);

				if (!isCurrentSession(session)) return;

				updateStore((tasks) => {
					return tasks.map((task) => (task.id === id ? toTask(response.task) : task));
				});
			} catch (err) {
				if (!isCurrentSession(session)) return;

				error.set(getErrorMessage(err));
				throw err;
			} finally {
				if (isCurrentSession(session)) {
					isLoading.set(false);
				}
			}
		},

		async remove(token: string, id: string) {
			const session = sessionVersion;

			let removedTask: Task | undefined;
			let removedIndex = -1;

			updateStore((tasks) => {
				removedIndex = tasks.findIndex((task) => task.id === id);
				removedTask = tasks[removedIndex];

				return tasks.filter((task) => task.id !== id);
			});

			if (removedIndex === -1) return;

			invalidateLoads();
			isLoading.set(true);
			error.set(null);

			try {
				await deleteTask(token, id);
			} catch (err) {
				if (!isCurrentSession(session)) return;

				if (removedTask !== undefined) {
					const taskToRestore = removedTask;

					updateStore((tasks) => {
						const restoredTasks = [...tasks];
						restoredTasks.splice(removedIndex, 0, taskToRestore);

						return restoredTasks;
					});
				}

				error.set(getErrorMessage(err));
				throw err;
			} finally {
				if (isCurrentSession(session)) {
					isLoading.set(false);
				}
			}
		},

		removeBySubject(subjectId: string) {
			updateStore((tasks) => tasks.filter((t) => t.subjectId !== subjectId));
		},

		clear() {
			sessionVersion++;
			loadAllVersion++;
			loadVersion++;

			updateStore(() => []);

			hasLoaded.set(false);
			isFetching.set(false);
			fetchError.set(null);

			isLoading.set(false);
			error.set(null);
		}
	};
}

export const tasks = createTaskStore();
export const taskLoading = isLoading;
export const taskFetching = isFetching;
export const taskHasLoaded = hasLoaded;
export const taskFetchError = fetchError;
export const taskError = error;

export const taskStatsBySubject = derived([tasks, settings], ([$tasks, $settings]) => {
	const map = new Map<
		string,
		{
			active: number;
			done: number;
			total: number;
			progress: number;
			hasUrgent: boolean;
		}
	>();

	for (const t of $tasks) {
		if (!map.has(t.subjectId)) {
			map.set(t.subjectId, { active: 0, done: 0, total: 0, progress: 0, hasUrgent: false });
		}

		const stats = map.get(t.subjectId)!;
		stats.total++;
		if (t.status === 'done') {
			stats.done++;
		} else {
			stats.active++;
			if (isUrgent(t.deadline, $settings.urgentThresholdHours)) {
				stats.hasUrgent = true;
			}
		}
		stats.progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
	}

	return map;
});

export const tasksBySubject = derived(tasks, ($tasks) => {
	const map = new Map<string, Task[]>();

	for (const t of $tasks) {
		if (!map.has(t.subjectId)) {
			map.set(t.subjectId, []);
		}
		map.get(t.subjectId)!.push(t);
	}

	return map;
});

export function isUrgent(deadline?: Date, thresholdHours = 24): boolean {
	if (!deadline) return false;

	const hoursLeft = (deadline.getTime() - Date.now()) / 36e5;

	return hoursLeft > 0 && hoursLeft <= thresholdHours;
}
