<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { onMount } from 'svelte';

	const t = $derived((key: TranslationKey) => translate($settings.language, key));

	let isProcessing = $state(false);
	let errorMessage = $state<string | null>(null);

	async function exchangeGoogleCodeOnMount(code: string) {
		isProcessing = true;

		const success = await auth.loginWithGoogle(code);

		if (success) {
			await goto('/app');
		} else {
			errorMessage = $auth.error ?? 'Google authorization failed';
			isProcessing = false;
		}
	}

	onMount(() => {
		const urlHash = window.location.hash.slice(1);
		const params = new URLSearchParams(urlHash);
		const code = params.get('code');
		const error = params.get('error');
		const linked = params.get('linked');

		window.history.replaceState(
			window.history.state,
			'',
			window.location.pathname + window.location.search
		);

		if (code) {
			void exchangeGoogleCodeOnMount(code);
		} else if (linked) {
			void goto('/app/setting');
		} else if (error) {
			errorMessage = error;
		} else {
			errorMessage = 'missing_code';
		}
	});
</script>

<svelte:head>
	<title>{t('auth.google.callback.title')} | StudyFlow</title>
</svelte:head>

<main class="callback-page">
	<header>
		<a href={resolve('/')} class="brand-link">
			<img src="/icons/studyFlow.svg" alt="" width="34" height="34" />
			<span>StudyFlow</span>
		</a>
	</header>

	<section
		class="callback-content"
		class:is-error={!!errorMessage}
		aria-labelledby="callback-title"
		aria-busy={isProcessing}
	>
		<div class="provider-mark" aria-hidden="true">
			<img src="/icons/google.svg" alt="" width="40" height="40" />
			<span class="status-dot"></span>
		</div>
		<p class="eyebrow">{t('auth.google.callback.title')}</p>
		<h1 id="callback-title">
			{t(errorMessage ? 'auth.google.callback.errorTitle' : 'auth.google.callback.loadingTitle')}
		</h1>
		<p class="description">
			{t(
				errorMessage
					? 'auth.google.callback.errorDescription'
					: 'auth.google.callback.loadingDescription'
			)}
		</p>

		{#if errorMessage}
			<p class="error-message" role="alert">
				{t('auth.google.callback.errorHint')}
			</p>
			<a class="login-link" href={resolve('/login')}>{t('auth.verify.backToLogin')}</a>
		{:else}
			<div class="loading-status" role="status">
				<span class="spinner" aria-hidden="true"></span>
				<span>{t('auth.google.callback.pending')}</span>
			</div>
		{/if}
	</section>

	<footer>StudyFlow</footer>
</main>

<style>
	.callback-page {
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100vh;
		min-height: 100svh;
		padding: 24px max(20px, calc((100% - 1080px) / 2));
		background: var(--bg-primary);
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

	.callback-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		align-self: center;
		justify-self: center;
		width: min(100%, 520px);
		min-width: 0;
		padding-block: 64px;
		text-align: center;
	}

	.provider-mark {
		position: relative;
		display: grid;
		place-items: center;
		width: 88px;
		height: 88px;
		margin-bottom: 28px;
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		background: var(--surface-primary);
	}

	.status-dot {
		position: absolute;
		right: -4px;
		bottom: -4px;
		width: 20px;
		height: 20px;
		border: 4px solid var(--bg-primary);
		border-radius: 50%;
		background: var(--accent-primary);
	}

	.is-error .status-dot {
		background: var(--accent-red);
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

	.loading-status {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 16px;
		border: 1px solid var(--border-primary);
		border-radius: 8px;
		background: var(--surface-primary);
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
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

	.error-message {
		width: 100%;
		margin: 0 0 20px;
		padding: 16px;
		border: 1px solid var(--accent-red);
		border-radius: 8px;
		color: var(--state-danger-soft-text);
		font-size: 14px;
		line-height: 1.6;
	}

	.login-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 48px;
		padding: 12px 20px;
		border-radius: 14px;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		font-size: 14px;
		font-weight: 700;
	}

	a:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 4px;
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
