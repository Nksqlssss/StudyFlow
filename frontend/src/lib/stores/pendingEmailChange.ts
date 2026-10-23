import { writable } from 'svelte/store';

// Kept only in this browser document; never persisted or sent through redirects.
export const pendingEmailChange = writable<string | null>(null);

export function captureEmailChangeToken() {
	const params = new URLSearchParams(window.location.hash.slice(1));
	if (!params.has('emailChangeToken')) return;
	const token = params.get('emailChangeToken');
	window.history.replaceState(
		window.history.state,
		'',
		window.location.pathname + window.location.search
	);
	pendingEmailChange.set(token && /^[a-f0-9]{64}$/.test(token) ? token : 'invalid');
}
