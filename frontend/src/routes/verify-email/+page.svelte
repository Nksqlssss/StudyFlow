<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { verifyEmail } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import ResendVerification from '$lib/components/auth/ResendVerification.svelte';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { onMount } from 'svelte';

	type VerificationError = 'invalid' | 'network' | 'server';

	const t = $derived((key: TranslationKey) => translate($settings.language, key));
	const token = page.url.searchParams.get('token');

	let status = $state<'pending' | 'success' | 'error'>('pending');
	let errorType = $state<VerificationError | null>(null);
	let email = $state('');
	let isEmailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));

	async function confirmEmail() {
		if (!token) {
			status = 'error';
			errorType = 'invalid';
			return;
		}

		try {
			status = 'pending';
			errorType = null;

			await verifyEmail(token);

			status = 'success';
		} catch (err) {
			status = 'error';

			if (err instanceof ApiError) {
				errorType = err.status === 400 ? 'invalid' : 'server';
			} else if (err instanceof TypeError) {
				errorType = 'network';
			} else {
				errorType = 'server';
			}
		}
	}

	onMount(() => {
		void confirmEmail();
	});
</script>

<svelte:head>
	<title>{t('auth.verify.eyebrow')} | StudyFlow</title>
</svelte:head>

<main class="verification-page">
	<header>
		<a href={resolve('/')} class="brand-link">
			<img src="/icons/studyFlow.svg" alt="" width="34" height="34" />
			<span>StudyFlow</span>
		</a>
	</header>

	<section class="verification-content" class:is-success={status === 'success'} class:is-error={status === 'error'} aria-labelledby="verification-title">
		<div class="verification-mark" aria-hidden="true">
			<img src="/icons/studyFlow.svg" alt="" width="56" height="56" />
			<span class="status-indicator"></span>
		</div>

		<p class="eyebrow">{t('auth.verify.eyebrow')}</p>
		<h1 id="verification-title">
			{t(status === 'success' ? 'auth.verify.successTitle' : status === 'error' ? 'auth.verify.errorTitle' : 'auth.verify.title')}
		</h1>
		<p class="description">
			{t(status === 'success' ? 'auth.verify.successDescription' : status === 'error' ? 'auth.verify.errorDescription' : 'auth.verify.description')}
		</p>

		<div class="verification-status" class:is-pending={status === 'pending'}>
			{#if status === 'error'}
				{#if errorType === 'invalid'}
					<p class="status-message" role="alert">{t('auth.verify.invalid')}</p>
					<div class="email-field">
						<label for="verification-email">{t('auth.form.email')}</label>
						<input id="verification-email" type="email" bind:value={email} placeholder="you@example.com" autocomplete="email" aria-describedby="verification-email-hint" />
						<p id="verification-email-hint" class="email-hint">{t('auth.verify.emailHint')}</p>
					</div>
					{#if isEmailValid}
						{#key email.trim().toLowerCase()}
							<ResendVerification {email} />
						{/key}
					{/if}
				{:else if errorType === 'network'}
					<p class="status-message" role="alert">{t('auth.verify.networkError')}</p>
					<button type="button" onclick={confirmEmail}>{t('auth.verify.retry')}</button>
				{:else}
					<p class="status-message" role="alert">{t('auth.verify.serverError')}</p>
					<button type="button" onclick={confirmEmail}>{t('auth.verify.retry')}</button>
				{/if}
			{:else if status === 'pending'}
				<span class="spinner" aria-hidden="true"></span>
				<span role="status">{t('auth.verify.pending')}</span>
			{:else}
				<p class="status-message" role="status">{t('auth.verify.success')}</p>
			{/if}
		</div>

		<a href={resolve('/login')} class="back-link">
			<img src="/icons/arrowBack.svg" alt="" width="18" height="18" />
			<span>{t('auth.verify.backToLogin')}</span>
		</a>
	</section>

	<footer>StudyFlow</footer>
</main>

<style>
	.verification-page {
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100vh;
		min-height: 100svh;
		padding: 24px max(20px, calc((100% - 1080px) / 2));
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.brand-link {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text-primary);
		font-size: 18px;
		font-weight: 700;
	}

	.verification-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-self: center;
		justify-self: center;
		width: min(100%, 520px);
		padding-block: 64px;
		text-align: center;
	}

	.verification-mark {
		position: relative;
		display: grid;
		place-items: center;
		width: 96px;
		height: 96px;
		margin-bottom: 32px;
		border: 1px solid var(--border-accent);
		border-radius: 24px;
		background-color: var(--surface-icon);
	}

	.status-indicator {
		position: absolute;
		right: -4px;
		bottom: -4px;
		width: 20px;
		height: 20px;
		border: 4px solid var(--bg-primary);
		border-radius: 50%;
		background-color: var(--accent-primary);
	}

	.is-success .status-indicator {
		background-color: var(--accent-success);
	}

	.is-error .status-indicator {
		background-color: var(--accent-red);
	}

	.eyebrow {
		margin: 0 0 12px;
		color: var(--text-accent);
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: 32px;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.description {
		max-width: 420px;
		margin: 16px 0 28px;
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 1.6;
	}

	.verification-status {
		display: grid;
		gap: 18px;
		width: 100%;
		min-width: 0;
		min-height: 56px;
		padding: 24px;
		border: 1px solid var(--border-primary);
		border-radius: 14px;
		background-color: var(--surface-primary);
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 600;
		line-height: 1.5;
	}

	.verification-status.is-pending {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 16px 18px;
	}

	.status-message {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.is-error .status-message {
		color: var(--state-danger-soft-text);
	}

	.is-success .verification-status {
		border-color: color-mix(in srgb, var(--accent-success) 35%, transparent);
		background-color: var(--state-success-bg);
		color: var(--accent-success);
	}

	.email-field {
		display: grid;
		gap: 8px;
		min-width: 0;
		text-align: left;
	}

	label {
		color: var(--text-primary);
		font-size: 14px;
		font-weight: 700;
	}

	input {
		width: 100%;
		min-width: 0;
		min-height: 48px;
		padding: 12px 14px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background-color: var(--surface-input);
		color: var(--text-primary);
		font: inherit;
	}

	input::placeholder {
		color: var(--text-secondary);
	}

	.email-hint {
		margin: 0;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 400;
		line-height: 1.5;
	}

	button {
		width: 100%;
		min-height: 48px;
		padding: 12px 16px;
		border: 0;
		border-radius: 14px;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	input:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}

	.spinner {
		flex: 0 0 auto;
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-secondary);
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		margin-top: 20px;
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 600;
	}

	.back-link:hover {
		color: var(--text-accent);
	}

	a:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 5px;
		border-radius: 4px;
	}

	footer {
		color: var(--text-secondary);
		font-size: 12px;
		text-align: center;
	}

	@media (min-width: 768px) {
		h1 {
			font-size: 40px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
