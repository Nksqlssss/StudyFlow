import { PUBLIC_API_URL } from '$env/static/public';

type ApiOptions = {
	method?: string;
	body?: unknown;
	token?: string | null;
	fetcher?: typeof fetch;
};

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
	const headers = new Headers();

	if (options.body) {
		headers.set('Content-Type', 'application/json');
	}

	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
	}

	const fetcher = options.fetcher ?? fetch;

	const response = await fetcher(`${PUBLIC_API_URL}${path}`, {
		method: options.method ?? 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	const data = await response.json().catch(() => null);

	if (!response.ok) {
		throw new ApiError(data?.message ?? 'Request failed', response.status);
	}

	return data as T;
}
