<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ResendVerification from '$lib/components/auth/ResendVerification.svelte';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';

	let email = $state('');
	let password = $state('');
	let verificationEmail = $state('');
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		verificationEmail = email.trim();

		await auth.login({
			email,
			password
		});

		if (!$auth.error) {
			goto('/app');
		}
	}

	function handleGoogleLogin() {
		window.location.assign('http://localhost:3000/auth/google');
	}
</script>

<main class="auth-page">
	<a href={resolve('/')} class="brand-link">
		<img src="/icons/studyFlow.svg" alt="" class="brand-icon" />
		<span>StudyFlow</span>
	</a>

	<section class="auth-layout">
		<div class="auth-copy">
			<p class="eyebrow">{t('auth.login.eyebrow')}</p>
			<h1>{t('auth.login.title')}</h1>
			<p>
				{t('auth.login.description')}
			</p>
			<div class="auth-highlights">
				<span>{t('nav.subjects')}</span>
				<span>{t('tasks.title')}</span>
				<span>{t('subjects.detail.progress')}</span>
			</div>
		</div>

		<form class="auth-form" onsubmit={handleSubmit}>
			<div class="form-header">
				<h2>{t('auth.login.formTitle')}</h2>
				<p>{t('auth.login.formDescription')}</p>
			</div>

			<button type="button" class="google-button" onclick={handleGoogleLogin}>
				<img src="/icons/google.svg" alt="" width="20" height="20" />
				<span>{t('auth.google.login')}</span>
			</button>
			<div class="auth-divider"><span>{t('auth.google.or')}</span></div>

			<label>
				<span>{t('auth.form.email')}</span>
				<input
					type="email"
					name="email"
					placeholder="you@example.com"
					autocomplete="email"
					bind:value={email}
				/>
			</label>

			<label>
				<span>{t('auth.form.password')}</span>
				<input
					type="password"
					name="password"
					placeholder={t('auth.login.passwordPlaceholder')}
					autocomplete="current-password"
					bind:value={password}
				/>
			</label>

			<button type="submit" disabled={$auth.isLoading}>
				{$auth.isLoading ? t('auth.login.loading') : t('auth.login.action')}
			</button>

			{#if $auth.errorCode === 'EMAIL_NOT_VERIFIED'}
				<div class="verification-notice">
					<div role="status">
						<p class="notice-title">{t('auth.login.verifyTitle')}</p>
						<p class="notice-description">{t('auth.login.verifyDescription')}</p>
					</div>
					<ResendVerification email={verificationEmail} />
				</div>
			{:else if $auth.error}
				<p class="error-message" role="alert">
					{#if $auth.error === 'Invalid email or password'}
						{t('auth.login.errors.credentials')}
					{:else if $auth.error}
						{t('auth.login.errors.general')}
					{/if}
				</p>
			{/if}

			<p class="switch-text">
				{t('auth.login.noAccount')}
				<a href={resolve('/register')}>{t('auth.register.shortAction')}</a>
			</p>
		</form>
	</section>
</main>

<style>
	.auth-page {
		position: relative;
		min-height: 100vh;
		padding: 100px max(20px, calc((100% - 1080px) / 2)) 40px;
		display: flex;
		align-items: center;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.auth-layout {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 440px);
		gap: 48px;
		align-items: center;
	}

	.auth-copy {
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.brand-link {
		position: absolute;
		top: 24px;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		width: fit-content;
		color: var(--text-primary);
		font-size: 18px;
		font-weight: 700;
	}

	.brand-icon {
		width: 34px;
		height: 34px;
	}

	.eyebrow {
		margin: 0 0 10px;
		color: var(--accent-primary);
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		margin: 0 0 12px;
		max-width: 620px;
		font-size: 56px;
		line-height: 1.05;
		overflow-wrap: anywhere;
	}

	p {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.auth-highlights {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
	}

	.auth-highlights span {
		padding: 8px 10px;
		border: 1px solid var(--border-primary);
		border-radius: 999px;
		color: var(--text-secondary);
		background: var(--surface-primary);
		font-size: 13px;
		font-weight: 700;
	}

	.auth-form {
		display: grid;
		min-width: 0;
		gap: 18px;
		padding: 28px;
		border: 1px solid var(--border-primary);
		border-radius: 24px;
		background: var(--surface-primary);
		box-shadow: 0 28px 90px var(--shadow-panel);
	}

	.form-header {
		margin-bottom: 4px;
	}

	h2 {
		margin: 0 0 8px;
		font-size: 28px;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	label {
		display: grid;
		min-width: 0;
		gap: 8px;
		color: var(--text-muted);
		font-size: 14px;
		font-weight: 700;
	}

	input {
		min-width: 0;
		width: 100%;
		min-height: 52px;
		padding: 0 16px;
		border: 1px solid var(--border-primary);
		border-radius: 14px;
		background: var(--surface-input);
		color: var(--text-primary);
		font: inherit;
		outline: none;
	}

	input:focus {
		border-color: var(--border-accent);
		box-shadow: 0 0 0 4px var(--accent-primary-bg);
	}

	button {
		min-height: 52px;
		padding: 12px 16px;
		border: 0;
		border-radius: 14px;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	.google-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		width: 100%;
		border: 1px solid var(--border-primary);
		background: var(--surface-input);
		color: var(--text-primary);
		font-weight: 700;
		transition:
			border-color 160ms ease,
			background-color 160ms ease;
	}

	.google-button:hover {
		border-color: var(--border-accent);
		background: var(--surface-primary);
	}

	.google-button img {
		flex-shrink: 0;
	}

	.google-button span {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.auth-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary);
		font-size: 13px;
	}

	.auth-divider::before,
	.auth-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-primary);
	}

	button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	button:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 4px;
	}

	.verification-notice {
		display: grid;
		gap: 14px;
		min-width: 0;
		padding: 16px;
		border: 1px solid var(--border-accent);
		border-radius: 14px;
		background-color: var(--accent-primary-bg);
	}

	.notice-title {
		margin-bottom: 6px;
		color: var(--text-primary);
		font-size: 15px;
		font-weight: 700;
	}

	.notice-description {
		font-size: 13px;
		line-height: 1.6;
	}

	.error-message {
		padding: 12px 14px;
		border: 1px solid var(--state-danger-soft-border);
		border-radius: 14px;
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		font-size: 14px;
		text-align: center;
		overflow-wrap: anywhere;
	}

	.switch-text {
		text-align: center;
		font-size: 14px;
	}

	.switch-text a {
		color: var(--accent-primary);
		font-weight: 700;
	}

	@media (max-width: 820px) {
		.auth-page {
			align-items: flex-start;
			padding-top: 100px;
		}

		.auth-layout {
			grid-template-columns: 1fr;
			gap: 32px;
		}

		h1 {
			font-size: 42px;
		}
	}

	@media (max-width: 480px) {
		h1 {
			font-size: 36px;
		}

		.auth-form {
			padding: 24px 20px;
		}
	}
</style>
