import { apiFetch } from './client';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export type ApiTask = {
	id: string;
	title: string;
	description: string | null;
	deadline: string | null;
	createdAt: string;
	updatedAt: string;
	status: TaskStatus;
	priority: TaskPriority;
	userId: string;
	subjectId: string;
};

export type TasksResponse = {
	tasks: ApiTask[];
};

export type TaskResponse = {
	task: ApiTask;
};

export type CreateTaskBody = {
	title: string;
	description?: string;
	deadline?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
};

export type UpdateTaskBody = {
	title?: string;
	description?: string | null;
	deadline?: string | null;
	status?: TaskStatus;
	priority?: TaskPriority;
};

export function getAllTasks(token: string) {
	return apiFetch<TasksResponse>('/tasks', {
		token
	});
}

export function getTasks(token: string, subjectId: string) {
	return apiFetch<TasksResponse>(`/subjects/${subjectId}/tasks`, {
		token
	});
}

export function getTask(token: string, id: string, fetcher?: typeof fetch) {
	return apiFetch<TaskResponse>(`/tasks/${id}`, {
		token,
		fetcher
	});
}

export function createTask(token: string, subjectId: string, data: CreateTaskBody) {
	return apiFetch<TaskResponse>(`/subjects/${subjectId}/tasks`, {
		method: 'POST',
		body: data,
		token
	});
}

export function updateTask(token: string, id: string, data: UpdateTaskBody) {
	return apiFetch<TaskResponse>(`/tasks/${id}`, {
		method: 'PATCH',
		body: data,
		token
	});
}

export function deleteTask(token: string, id: string) {
	return apiFetch<void>(`/tasks/${id}`, {
		method: 'DELETE',
		token
	});
}

export function deleteTasks(token: string) {
	return apiFetch<void>('/tasks', {
		method: 'DELETE',
		token
	});
}
