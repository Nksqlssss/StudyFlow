<script lang="ts">
	import { resendVerification } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import {
		getVerificationCooldown,
		startVerificationCooldown
	} from '$lib/utils/verification-cooldown';
	import { onMount } from 'svelte';

	let { email }: { email: string } = $props();

	let secondsLeft = $state(0);
	let isSending = $state(false);
	let message = $state<TranslationKey | ''>('');
	let isError = $state(false);
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	onMount(() => {
		secondsLeft = getVerificationCooldown(email);

		const interval = setInterval(() => {
			secondsLeft = getVerificationCooldown(email);
		}, 1000);

		return () => clearInterval(interval);
	});

	async function handleResend() {
		if (secondsLeft > 0 || isSending) return;

		isSending = true;
		message = '';
		isError = false;

		try {
			await resendVerification(email);
			startVerificationCooldown(email);
			secondsLeft = getVerificationCooldown(email);

			message = 'auth.resend.success';
		} catch (error) {
			isError = true;
			message = error instanceof ApiError && error.status === 429
				? 'auth.resend.rateLimit'
				: error instanceof TypeError
					? 'auth.resend.networkError'
					: 'auth.resend.error';
		} finally {
			isSending = false;
		}
	}
</script>

<div class="resend-verification">
	<button
		type="button"
		disabled={secondsLeft > 0 || isSending}
		aria-busy={isSending}
		onclick={handleResend}
	>
		{#if isSending}
			<span class="spinner" aria-hidden="true"></span>
		{/if}
		<span>
			{isSending
				? t('auth.resend.sending')
				: secondsLeft > 0
					? t('auth.resend.cooldown', { count: secondsLeft })
					: t('auth.resend.action')}
		</span>
	</button>
	<div class="message-region" role="status" aria-live="polite" aria-atomic="true">
		{#if message}
			<p class="message" class:is-error={isError}>{t(message)}</p>
		{/if}
	</div>
</div>

<style>
	.resend-verification {
		width: 100%;
		min-width: 0;
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		min-height: 48px;
		padding: 12px 16px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background-color: var(--surface-input-strong);
		color: var(--text-accent);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		line-height: 1.5;
		cursor: pointer;
		transition: border-color 0.2s, background-color 0.2s;
	}

	button span {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	button:hover:not(:disabled) {
		border-color: var(--border-accent);
		background-color: var(--accent-primary-bg);
	}

	button:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}

	button:disabled {
		color: var(--text-secondary);
		cursor: not-allowed;
	}

	button[aria-busy='true'] {
		cursor: wait;
	}

	.message {
		margin: 12px 0 0;
		padding: 12px 14px;
		border: 1px solid color-mix(in srgb, var(--accent-success) 35%, transparent);
		border-radius: 14px;
		background-color: var(--state-success-bg);
		color: var(--accent-success);
		font-size: 13px;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.message.is-error {
		border-color: var(--state-danger-soft-border);
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
	}

	.spinner {
		flex: 0 0 auto;
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-secondary);
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		button {
			transition: none;
		}

		.spinner {
			animation: none;
		}
	}
</style>
