import { PUBLIC_API_URL } from '$env/static/public';

type ApiOptions = {
	method?: string;
	body?: unknown;
	token?: string | null;
	fetcher?: typeof fetch;
	credentials?: RequestCredentials;
};

export class ApiError extends Error {
	status: number;
	code: string | null;
	retryAfter?: number;

	constructor(message: string, status: number, code: string | null, retryAfter?: number) {
		super(message);
		this.status = status;
		this.code = code;
		this.retryAfter = retryAfter;
	}
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
	const isFormData = options.body instanceof FormData;
	const headers = new Headers();

	if (options.body != null && !isFormData) {
		headers.set('Content-Type', 'application/json');
	}

	if (options.token) {
		headers.set('Authorization', `Bearer ${options.token}`);
	}

	const fetcher = options.fetcher ?? fetch;

	const response = await fetcher(`${PUBLIC_API_URL}${path}`, {
		method: options.method ?? 'GET',
		headers,
		body:
			options.body == null
				? undefined
				: isFormData
					? (options.body as FormData)
					: JSON.stringify(options.body),
		credentials: options.credentials
	});

	const data = await response.json().catch(() => null);

	if (!response.ok) {
		const delay = Number(data?.retryAfter ?? response.headers.get('Retry-After'));
		throw new ApiError(
			data?.message ?? 'Request failed',
			response.status,
			typeof data?.code === 'string' ? data.code : null,
			Number.isFinite(delay) && delay > 0 ? delay : undefined
		);
	}

	return data as T;
}
