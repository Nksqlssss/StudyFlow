import { apiFetch } from './client';

export type SubjectIcon = 'code' | 'math' | 'language' | 'paint';

export type ApiSubject = {
	id: string;
	userId: string;
	title: string;
	icon: SubjectIcon;
	createdAt: string;
	updatedAt: string;
};

export type SubjectsResponse = {
	subjects: ApiSubject[];
};

export type SubjectResponse = {
	subject: ApiSubject;
};

export type CreateSubjectBody = {
	title: string;
	icon: SubjectIcon;
};

export type UpdateSubjectBody = {
	title?: string;
	icon?: SubjectIcon;
};

export function getSubjects(token: string) {
	return apiFetch<SubjectsResponse>('/subjects', {
		token
	});
}

export function getSubject(id: string, token: string, fetcher?: typeof fetch) {
	return apiFetch<SubjectResponse>(`/subjects/${id}`, {
		token,
		fetcher
	});
}

export function createSubject(data: CreateSubjectBody, token: string) {
	return apiFetch<SubjectResponse>('/subjects', {
		method: 'POST',
		body: data,
		token
	});
}

export function updateSubject(id: string, data: UpdateSubjectBody, token: string) {
	return apiFetch<SubjectResponse>(`/subjects/${id}`, {
		method: 'PATCH',
		body: data,
		token
	});
}

export function deleteSubject(id: string, token: string) {
	return apiFetch<void>(`/subjects/${id}`, {
		method: 'DELETE',
		token
	});
}
