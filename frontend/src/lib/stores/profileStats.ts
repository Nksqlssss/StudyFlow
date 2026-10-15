import { derived } from 'svelte/store';
import { subjects } from './subjects';
import { tasks } from './tasks';

export const profileStats = derived([tasks, subjects], ([$tasks, $subjects]) => {
	const stats = {
		subjects: $subjects.length,
		tasks: $tasks.length,
		completed: $tasks.filter((task) => task.status === 'done').length,
		overdue: $tasks.filter(
			(task) => task.status !== 'done' && task.deadline && task.deadline.getTime() < Date.now()
		).length
	};

	return stats;
});
