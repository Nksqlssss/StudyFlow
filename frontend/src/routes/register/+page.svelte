<script lang="ts">
	import { resolve } from '$app/paths';
	import { PUBLIC_API_URL } from '$env/static/public';
	import ResendVerification from '$lib/components/auth/ResendVerification.svelte';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { startVerificationCooldown } from '$lib/utils/verification-cooldown';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let nameError = $state('');
	let isRegistered = $state(false);
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmedName = name.trim();

		nameError = '';

		if (trimmedName.length < 2 || trimmedName.length > 24) {
			nameError = t('auth.register.nameError');
			return;
		}

		const success = await auth.register({
			name: trimmedName,
			email,
			password
		});

		if (success) {
			startVerificationCooldown(email);
			isRegistered = true;
		}
	}

	function handleGoogleRegister() {
		window.location.assign(`${PUBLIC_API_URL}/auth/google`);
	}
</script>

<main class="auth-page">
	<a href={resolve('/')} class="brand-link">
		<img src="/icons/studyFlow.svg" alt="" class="brand-icon" />
		<span>StudyFlow</span>
	</a>

	<section class="auth-layout">
		<div class="auth-copy">
			<p class="eyebrow">{t('auth.register.eyebrow')}</p>
			<h1>{t('auth.register.title')}</h1>
			<p>
				{t('auth.register.description')}
			</p>
			<div class="auth-highlights">
				<span>{t('nav.subjects')}</span>
				<span>{t('tasks.title')}</span>
				<span>{t('nav.settings')}</span>
			</div>
		</div>

		{#if isRegistered}
			<section class="auth-panel verification-panel" aria-labelledby="check-email-title">
				<div class="verification-icon" aria-hidden="true">
					<img src="/icons/studyFlow.svg" alt="" width="36" height="36" />
				</div>
				<div class="form-header" role="status">
					<h2 id="check-email-title">{t('auth.register.successTitle')}</h2>
					<p>{t('auth.register.successDescription')}</p>
				</div>
				<p class="verification-email">{email}</p>
				<ResendVerification {email} />
				<p class="verification-hint">{t('auth.register.checkSpam')}</p>
				<p class="switch-text">
					<a href={resolve('/login')}>{t('auth.verify.backToLogin')}</a>
				</p>
			</section>
		{:else}
			<form class="auth-form" onsubmit={handleSubmit}>
				<div class="form-header">
					<h2>{t('auth.register.formTitle')}</h2>
					<p>{t('auth.register.formDescription')}</p>
				</div>

				<button type="button" class="google-button" onclick={handleGoogleRegister}>
					<img src="/icons/google.svg" alt="" width="20" height="20" />
					<span>{t('auth.google.register')}</span>
				</button>
				<div class="auth-divider"><span>{t('auth.google.or')}</span></div>

				<label>
					<span>{t('auth.form.name')}</span>
					<input
						type="text"
						name="name"
						placeholder={t('auth.form.namePlaceholder')}
						autocomplete="name"
						bind:value={name}
						aria-invalid={!!nameError}
						aria-describedby={nameError ? 'name-error' : undefined}
						required
						minlength="2"
						maxlength="24"
					/>
					{#if nameError}
						<span id="name-error" class="field-error" role="alert">{nameError}</span>
					{/if}
				</label>

				<label>
					<span>{t('auth.form.email')}</span>
					<input
						type="email"
						name="email"
						placeholder="you@example.com"
						autocomplete="email"
						bind:value={email}
						required
					/>
				</label>

				<div class="form-field">
					<label for="register-password">{t('auth.form.password')}</label>
					<div class="password-field">
						<input
							id="register-password"
							type={showPassword ? 'text' : 'password'}
							name="password"
							placeholder={t('auth.form.passwordPlaceholder')}
							autocomplete="new-password"
							bind:value={password}
							required
							minlength="8"
						/>
						<button
							type="button"
							class="password-toggle"
							aria-label={t('auth.form.showPassword')}
							aria-pressed={showPassword}
							aria-controls="register-password"
							title={t(showPassword ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
							onclick={() => (showPassword = !showPassword)}
						>
							{t(showPassword ? 'auth.form.hide' : 'auth.form.show')}
						</button>
					</div>
				</div>

				<button type="submit" disabled={$auth.isLoading}>
					{$auth.isLoading ? t('auth.register.loading') : t('auth.register.action')}
				</button>

				{#if $auth.error}
					<p class="error-message" role="alert">
						{#if $auth.error === 'User with this email already exists'}
							{t('auth.register.errors.emailTaken')}
						{:else if $auth.error === 'Invalid request body'}
							{t('auth.register.errors.invalidData')}
						{:else if ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'].includes($auth.error)}
							{t('auth.resend.networkError')}
						{:else if $auth.error.startsWith('Rate limit exceeded')}
							{t('auth.resend.rateLimit')}
						{:else}
							{t('auth.register.errors.general')}
						{/if}
					</p>
				{/if}

				<p class="switch-text">
					{t('auth.register.hasAccount')}
					<a href={resolve('/login')}>{t('auth.login.action')}</a>
				</p>
			</form>
		{/if}
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

	.auth-form,
	.auth-panel {
		display: grid;
		min-width: 0;
		gap: 18px;
		padding: 28px;
		border: 1px solid var(--border-primary);
		border-radius: 24px;
		background: var(--surface-primary);
		box-shadow: 0 28px 90px var(--shadow-panel);
	}

	.verification-panel {
		text-align: center;
	}

	.verification-icon {
		display: grid;
		place-items: center;
		justify-self: center;
		width: 64px;
		height: 64px;
		border: 1px solid var(--border-accent);
		border-radius: 18px;
		background-color: var(--surface-icon);
	}

	.verification-email {
		padding: 12px 14px;
		border: 1px solid var(--border-primary);
		border-radius: 14px;
		background-color: var(--surface-input);
		color: var(--text-primary);
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.verification-hint {
		font-size: 13px;
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

	input[aria-invalid='true'] {
		border-color: var(--state-danger-soft-border);
		box-shadow: 0 0 0 4px var(--state-danger-soft-bg);
	}

	.form-field {
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	.password-field {
		position: relative;
		min-width: 0;
	}

	.password-field input {
		padding-right: 96px;
	}

	.password-field .password-toggle {
		position: absolute;
		top: 50%;
		right: 8px;
		width: 80px;
		min-height: 32px;
		padding: 4px 6px;
		border-radius: 6px;
		background: transparent;
		transform: translateY(-50%);
		color: var(--text-accent);
		font-size: 12px;
		font-weight: 600;
	}

	.password-field .password-toggle:hover {
		background: var(--accent-primary-bg);
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

	.field-error {
		color: var(--state-danger-soft-text);
		font-size: 13px;
		font-weight: 700;
		line-height: 1.4;
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

		.auth-form,
		.auth-panel {
			padding: 24px 20px;
		}
	}
</style>
