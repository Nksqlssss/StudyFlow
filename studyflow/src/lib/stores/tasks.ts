import { browser } from '$app/environment';
import type { Task, TaskStatus } from '$lib/types';
import { derived, writable } from 'svelte/store';
import { settings } from './settings';

function load(): Task[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem('sf_tasks');
		if (!raw) return [];
		return JSON.parse(raw).map((t: Task) => ({
			...t,
			deadline: t.deadline ? new Date(t.deadline) : undefined,
			createdAt: new Date(t.createdAt),
			updatedAt: new Date(t.updatedAt)
		}));
	} catch {
		return [];
	}
}

function save(tasks: Task[]) {
	if (browser) localStorage.setItem('sf_tasks', JSON.stringify(tasks));
}

function createTaskStore() {
	const { subscribe, update: updateStore } = writable<Task[]>(load());

	subscribe(save);

	return {
		subscribe,

		add(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
			updateStore((tasks) => [
				...tasks,
				{
					...data,
					id: crypto.randomUUID(),
					status: 'in_progress',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			]);
		},

		setStatus(id: string, status: TaskStatus) {
			updateStore((tasks) =>
				tasks.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date() } : t))
			);
		},

		update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) {
			updateStore((tasks) =>
				tasks.map((task) =>
					task.id === id ? { ...task, ...changes, updatedAt: new Date() } : task
				)
			);
		},

		remove(id: string) {
			updateStore((tasks) => tasks.filter((t) => t.id !== id));
		},

		removeBySubject(subjectId: string) {
			updateStore((tasks) => tasks.filter((t) => t.subjectId !== subjectId));
		},

		clear() {
			updateStore(() => []);
		}
	};
}

export const tasks = createTaskStore();

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
