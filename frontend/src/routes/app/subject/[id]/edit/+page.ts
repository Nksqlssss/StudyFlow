import { getSubject } from '$lib/api/subjects';
import type { Subject } from '$lib/types';
import { error, redirect } from '@sveltejs/kit';

const TOKEN_KEY = 'studyflow_token';

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

export async function load({ params, fetch }) {
	const token = localStorage.getItem(TOKEN_KEY);

	if (!token) {
		redirect(302, '/login');
	}

	try {
		const response = await getSubject(params.id, token, fetch);

		return {
			subject: toSubject(response.subject)
		};
	} catch {
		error(404, 'Subject not found');
	}
}

export const ssr = false;
