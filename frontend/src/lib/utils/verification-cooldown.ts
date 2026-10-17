import { browser } from '$app/environment';

function normalizedEmail(email: string): string {
	return email.trim().toLowerCase();
}

function createKey(email: string): string {
	const normalEmail = normalizedEmail(email);

	return `studyflow_verification_cooldown:${normalEmail}`;
}

export function startVerificationCooldown(email: string): void {
	if (!browser) return;

	const time = Date.now() + 60_000;
	const key = createKey(email);

	localStorage.setItem(key, time.toString());
}

export function getVerificationCooldown(email: string): number {
	if (!browser) return 0;

	const key = createKey(email);
	const cooldownUntil = Number(localStorage.getItem(key));

	if (!Number.isFinite(cooldownUntil)) return 0;

	const timer = Math.min(60, Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));

	return timer;
}
