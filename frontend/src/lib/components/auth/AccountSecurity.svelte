<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ReauthPurpose } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { accountErrorKey } from '$lib/i18n/account-errors';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import PasswordModal from './PasswordModal.svelte';
	import EmailChangeModal from './EmailChangeModal.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	let {
		showEmail = true,
		showHeading = true
	}: {
		showEmail?: boolean;
		showHeading?: boolean;
	} = $props();
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
	let modal = $state<'set' | 'change' | 'email' | null>(null);
	let unlinkOpen = $state(false);
	let first = $state('');
	let second = $state('');
	let third = $state('');
	let newEmail = $state('');
	let code = $state('');
	let proof = $state('');
	let method = $state<'password' | 'code'>('password');
	let busy = $state(false);
	let error = $state<TranslationKey | null>(null);
	let success = $state<TranslationKey | null>(null);
	let sent = $state(false);
	let retryAt = $state(0);
	let verifyRetryAt = $state(0);
	let now = $state(Date.now());
	let active = true;
	let flow = 0;
	const remaining = $derived(Math.max(0, Math.ceil((retryAt - now) / 1000)));
	const purpose = $derived<ReauthPurpose>(modal === 'set' ? 'set_password' : 'change_email');
	const sessionToken = $derived($auth.token);
	const canConfirm = $derived(
		method === 'password' || ((!!proof || /^\d{6}$/.test(code)) && now >= verifyRetryAt)
	);

	onMount(() => {
		if (!$auth.methods) void auth.loadMethods();
		const timer = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(timer);
	});
	onDestroy(() => {
		active = false;
		flow++;
		first = second = third = code = proof = '';
	});
	$effect(() => {
		if (!sessionToken) {
			close();
			busy = false;
		}
	});

	function close() {
		flow++;
		modal = null;
		first = second = third = newEmail = code = proof = '';
		error = null;
		sent = false;
		auth.clearErrors();
	}
	function open(value: 'set' | 'change' | 'email') {
		close();
		success = null;
		modal = value;
		method = value === 'set' || !$auth.methods?.hasPassword ? 'code' : 'password';
	}
	function changeMethod(value: 'password' | 'code') {
		method = value;
		first = code = proof = '';
		error = null;
		auth.clearErrors();
	}
	function handleError(value: unknown) {
		error = accountErrorKey(value);
		if (value instanceof ApiError && value.retryAfter) {
			retryAt = Date.now() + value.retryAfter * 1000;
			if (value.code === 'REAUTH_ATTEMPTS_EXCEEDED') verifyRetryAt = retryAt;
		}
	}
	async function sendCode() {
		if (busy || remaining > 0) return;
		busy = true;
		error = null;
		const version = flow;
		try {
			const result = await auth.requestReauthCode(purpose);
			if (!active || version !== flow) return;
			sent = true;
			code = proof = '';
			retryAt = Date.now() + result.retryAfter * 1000;
		} catch (value) {
			if (active && version === flow) handleError(value);
		} finally {
			if (active && version === flow) busy = false;
		}
	}
	async function confirm() {
		if (busy || !canConfirm) return;
		error = null;
		if (modal !== 'email') {
			const password = modal === 'set' ? first : second;
			if (!first || !second || (modal === 'change' && !third)) {
				error = 'settings.password.errors.required';
				return;
			}
			if (password.length < 8 || password.length > 72) {
				error = 'settings.password.errors.length';
				return;
			}
			if (modal === 'set' ? first !== second : second !== third) {
				error = 'settings.password.errors.match';
				return;
			}
			if (modal === 'change' && first === second) {
				error = 'settings.password.errors.different';
				return;
			}
		} else {
			if (!newEmail.trim() || (method === 'password' && !first)) {
				error = 'settings.password.errors.required';
				return;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
				error = 'profile.errors.invalidData';
				return;
			}
			if (newEmail.trim().toLowerCase() === $auth.user?.email.toLowerCase()) {
				error = 'account.errors.emailUnchanged';
				return;
			}
		}
		busy = true;
		const version = flow;
		const action = modal;
		try {
			if (method === 'code' && !proof) {
				const result = await auth.verifyReauthCode(purpose, code);
				if (!active || version !== flow) return;
				proof = result.reauthToken;
				code = '';
			}
			const ok =
				action === 'set'
					? await auth.createPassword({ password: first, reauthToken: proof })
					: action === 'change'
						? await auth.changePassword({ currentPassword: first, newPassword: second })
						: await auth.requestEmailChange(
								newEmail.trim(),
								first,
								method === 'code' ? proof : undefined
							);
			if (!active || version !== flow) return;
			if (!ok) {
				error = accountErrorKey($auth.passwordError ?? $auth.accountError, $auth.errorCode);
				proof = '';
				sent = false;
				return;
			}
			close();
			success =
				action === 'email'
					? 'account.emailSent'
					: action === 'set'
						? 'account.passwordSet'
						: 'account.passwordChanged';
		} catch (value) {
			if (active && version === flow) handleError(value);
		} finally {
			busy = false;
		}
	}
	async function linkGoogle() {
		if (busy) return;
		busy = true;
		error = null;
		success = null;
		try {
			const result = await auth.addGoogle();
			if (!active) return;
			if (result) window.location.assign(result.authorizationUrl);
			else error = accountErrorKey($auth.accountError, $auth.errorCode);
		} finally {
			busy = false;
		}
	}
	async function unlinkGoogle() {
		if (busy) return;
		busy = true;
		error = null;
		success = null;
		try {
			if (await auth.deleteGoogle()) {
				unlinkOpen = false;
				success = 'account.googleDisconnected';
			} else error = accountErrorKey($auth.accountError, $auth.errorCode);
		} finally {
			busy = false;
		}
	}
</script>

{#if showHeading}
	<div class="section-heading">
		<h2>{t('settings.signIn.title')}</h2>
		<p>{t('settings.signIn.description')}</p>
	</div>
{/if}
{#if $auth.isMethodsLoading && !$auth.methods}
	<p class="hint" role="status">{t('settings.signIn.loading')}</p>
{:else if !$auth.methods}
	<p class="error" role="alert">{t('settings.signIn.errors.load')}</p>
	<button type="button" onclick={() => void auth.loadMethods()} disabled={$auth.isMethodsLoading}
		>{t('auth.verify.retry')}</button
	>
{:else}
	<div class="method-row">
		<div class="provider">
			<svg
				width="28"
				height="28"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<rect x="4" y="10" width="16" height="11" rx="2" />
				<path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3" />
			</svg>
			<div>
				<h3>{t('settings.signIn.password')}</h3>
				<p>
					{t(
						$auth.methods.hasPassword ? 'settings.signIn.connected' : 'settings.signIn.notConnected'
					)}
				</p>
			</div>
		</div>
		<button
			type="button"
			onclick={() => open($auth.methods?.hasPassword ? 'change' : 'set')}
			disabled={busy}
			>{t($auth.methods.hasPassword ? 'settings.signIn.change' : 'settings.password.set')}</button
		>
	</div>
	<div class="method-row">
		<div class="provider">
			<img src="/icons/google.svg" alt="" width="28" height="28" />
			<div>
				<h3>Google</h3>
				<p>{$auth.methods.providers.google.email ?? t('settings.signIn.notConnected')}</p>
			</div>
		</div>
		{#if $auth.methods.providers.google.connected}
			<button
				type="button"
				class="danger"
				disabled={busy || !$auth.methods.hasPassword}
				onclick={() => {
					auth.clearErrors();
					error = null;
					unlinkOpen = true;
				}}>{t('settings.signIn.disconnect')}</button
			>
		{:else}
			<button type="button" class="primary" onclick={linkGoogle} disabled={busy}
				>{t('settings.signIn.connect')}</button
			>
		{/if}
	</div>
	{#if !$auth.methods.hasPassword && $auth.methods.providers.google.connected}<p class="hint">
			{t('settings.signIn.passwordHint')}
		</p>{/if}
	{#if showEmail}<button type="button" onclick={() => open('email')} disabled={busy}
			>{t('profile.account.changeEmail')}</button
		>{/if}
{/if}
{#if error && !modal && !unlinkOpen}<p class="error" role="alert">{t(error)}</p>{/if}
{#if success}<p class="success" role="status">{t(success)}</p>{/if}

{#snippet verification()}
	<div class="verification">
		{#if modal === 'email' && $auth.methods?.hasPassword}
			<div class="method-options" aria-label={t('account.verifyMethod')}>
				<button
					type="button"
					class:selected={method === 'password'}
					aria-pressed={method === 'password'}
					disabled={busy}
					onclick={() => changeMethod('password')}>{t('settings.signIn.password')}</button
				>
				<button
					type="button"
					class:selected={method === 'code'}
					aria-pressed={method === 'code'}
					disabled={busy}
					onclick={() => changeMethod('code')}>{t('account.emailCode')}</button
				>
			</div>
		{/if}
		{#if method === 'code'}
			<p class="hint">{t('account.codeInstruction', { email: $auth.user?.email ?? '' })}</p>
			{#if sent}<p class="hint" role="status">{t('account.codeSent')}</p>{/if}
			<label for="reauth-code">{t('account.codeLabel')}</label>
			<input
				id="reauth-code"
				name="code"
				type="text"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				bind:value={code}
				disabled={busy}
				placeholder="000000"
			/>
			<button type="button" onclick={sendCode} disabled={busy || remaining > 0}
				>{remaining > 0
					? t('account.resendIn', { seconds: remaining })
					: t(sent ? 'account.resend' : 'account.sendCode')}</button
			>
		{/if}
	</div>
{/snippet}

{#if modal === 'set' || modal === 'change'}
	<PasswordModal
		mode={modal}
		bind:firstValue={first}
		bind:secondValue={second}
		bind:thirdValue={third}
		onClose={close}
		onConfirm={confirm}
		error={error ? t(error) : null}
		isLoading={busy}
		verification={modal === 'set' ? verification : undefined}
		canConfirm={modal === 'change' || canConfirm}
	/>
{:else if modal === 'email'}
	<EmailChangeModal
		bind:newEmail
		bind:currentPassword={first}
		onClose={close}
		onConfirm={confirm}
		error={error ? t(error) : null}
		isLoading={busy}
		{verification}
		requirePassword={method === 'password'}
		{canConfirm}
	/>
{/if}
{#if unlinkOpen}
	<ConfirmModal
		title={t('account.unlinkTitle')}
		description={t('account.unlinkDescription')}
		confirmText={t('settings.signIn.disconnect')}
		cancelText={t('common.cancel')}
		variant="danger"
		onConfirm={unlinkGoogle}
		onCancel={() => {
			unlinkOpen = false;
			error = null;
		}}
		error={error ? t(error) : null}
	/>
{/if}

<style>
	.section-heading h2 {
		margin-bottom: 4px;
		font-size: 20px;
	}
	h3 {
		margin: 0 0 4px;
		font-size: 16px;
	}
	p {
		margin: 0;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.method-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-block: 16px;
		border-top: 1px solid var(--border-primary);
	}
	.method-row > div {
		min-width: 0;
	}
	.provider {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.provider img,
	.provider svg {
		flex-shrink: 0;
	}
	.provider > div {
		min-width: 0;
	}
	button {
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background: var(--surface-input-strong);
		color: var(--text-primary);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.method-row > button {
		flex-shrink: 0;
	}
	.primary {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		border-color: transparent;
	}
	.danger {
		color: var(--state-danger-soft-text);
		background: var(--state-danger-soft-bg);
		border-color: var(--state-danger-soft-border);
	}
	.verification {
		display: grid;
		gap: 12px;
		margin-bottom: 18px;
		min-width: 0;
	}
	.verification:empty {
		display: none;
	}
	.verification label {
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
		background: var(--surface-input);
		color: var(--text-primary);
		font: inherit;
	}
	.method-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.selected {
		background: var(--accent-primary-bg);
		border-color: var(--border-accent);
		color: var(--text-accent);
	}
	button:disabled,
	input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}
	.hint {
		font-size: 13px;
		line-height: 1.6;
	}
	.error,
	.success {
		padding: 12px 14px;
		border-radius: 8px;
		margin-block: 12px;
	}
	.error {
		background: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		border: 1px solid var(--state-danger-soft-border);
	}
	.success {
		background: var(--state-success-bg);
		color: var(--accent-success);
	}
	@media (max-width: 479px) {
		.method-row {
			flex-wrap: wrap;
		}
		.method-row > button {
			width: 100%;
		}
	}
</style>
