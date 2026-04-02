import type { Task, TaskStatus } from '$lib/types'
import { derived, writable } from 'svelte/store'

function createTaskStore() {
	const { subscribe, update: updateStore } = writable<Task[]>([]);

	return {
		subscribe,

		add(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
			updateStore(tasks => [...tasks, {
				...data,
				id: crypto.randomUUID(),
				status: 'todo',
				createdAt: new Date(),
				updatedAt: new Date(),
			}]);
		},

		setStatus(id: string, status: TaskStatus) {
			updateStore(tasks =>
				tasks.map(t => t.id === id ? { ...t, status, updatedAt: new Date() } : t)
			);
		},

		remove(id: string) {
			updateStore(tasks => tasks.filter(t => t.id !== id));
		},

		removeBySubject(subjectId: string) {
			updateStore(tasks => tasks.filter(t => t.subjectId !== subjectId));
		},
	}
}

export const tasks = createTaskStore();

export const taskStatsBySubject = derived(tasks, $tasks => {
  const map = new Map<string, {
    active: number;
    done: number;
    total: number;
    progress: number;
  }>();

  for (const t of $tasks) {
    if (!map.has(t.subjectId)) {
      map.set(t.subjectId, { active: 0, done: 0, total: 0, progress: 0 });
    }

    const stats = map.get(t.subjectId)!;
    stats.total++;
    if (t.status === 'done') {
      stats.done++;
    } else {
      stats.active++;
    }
    stats.progress = stats.total > 0
      ? Math.round((stats.done / stats.total) * 100)
      : 0;
  }

  return map;
});