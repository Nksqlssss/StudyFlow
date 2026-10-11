import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from './app.js';

async function withApp<T>(callback: (app: ReturnType<typeof buildApp>) => Promise<T>) {
	const app = buildApp();

	try {
		return await callback(app);
	} finally {
		await app.close();
	}
}

describe('app routes', () => {
	it('returns health status', async () => {
		await withApp(async (app) => {
			const response = await app.inject({
				method: 'GET',
				url: '/health'
			});

			assert.equal(response.statusCode, 200);
			assert.deepEqual(response.json(), {
				status: 'ok',
				service: 'studyflow-api'
			});
		});
	});

	it('rejects protected routes without an access token', async () => {
		await withApp(async (app) => {
			for (const url of ['/auth/me', '/subjects', '/tasks', '/settings']) {
				const response = await app.inject({
					method: 'GET',
					url
				});

				assert.equal(response.statusCode, 401, url);
				assert.deepEqual(response.json(), {
					message: 'Unauthorized'
				});
			}
		});
	});

	it('rejects malformed access tokens', async () => {
		await withApp(async (app) => {
			const response = await app.inject({
				method: 'GET',
				url: '/auth/me',
				headers: {
					authorization: 'Bearer not-a-real-token'
				}
			});

			assert.equal(response.statusCode, 401);
			assert.deepEqual(response.json(), {
				message: 'Unauthorized'
			});
		});
	});

	it('validates auth request bodies before using the database', async () => {
		await withApp(async (app) => {
			const registerResponse = await app.inject({
				method: 'POST',
				url: '/auth/register',
				payload: {
					email: 'not-email',
					password: 'short'
				}
			});

			const loginResponse = await app.inject({
				method: 'POST',
				url: '/auth/login',
				payload: {
					email: 'not-email',
					password: ''
				}
			});

			assert.equal(registerResponse.statusCode, 400);
			assert.equal(registerResponse.json().message, 'Invalid request body');
			assert.equal(loginResponse.statusCode, 400);
			assert.equal(loginResponse.json().message, 'Invalid request body');
		});
	});
});
