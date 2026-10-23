<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';

	let {
		onClose,
		onConfirm,
		error = null,
		isLoading = false,
		newEmail = $bindable(''),
		currentPassword = $bindable(''),
		verification,
		requirePassword = true,
		canConfirm = true
	}: {
		onClose: () => void;
		onConfirm?: () => void | Promise<void>;
		error?: string | null;
		isLoading?: boolean;
		newEmail?: string;
		currentPassword?: string;
		verification?: Snippet;
		requirePassword?: boolean;
		canConfirm?: boolean;
	} = $props();
	const t = $derived((key: TranslationKey) => translate($settings.language, key));
	let dialog: HTMLDialogElement;
	let showPassword = $state(false);
	let isPending = $state(false);
	let confirmationFailed = $state(false);
	const busy = $derived(isPending || isLoading);
	const displayedError = $derived(
		error || (confirmationFailed ? t('common.somethingWentWrong') : null)
	);

	async function handleConfirm(event: SubmitEvent) {
		event.preventDefault();
		if (busy || !onConfirm || !canConfirm) return;

		isPending = true;
		confirmationFailed = false;
		try {
			await onConfirm();
		} catch {
			confirmationFailed = true;
		} finally {
			isPending = false;
		}
	}

	onMount(() => dialog.showModal());
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="email-change-title"
	aria-describedby="email-change-description"
	aria-busy={busy}
	oncancel={(event: Event) => {
		event.preventDefault();
		if (!busy) onClose();
	}}
>
	<h2 id="email-change-title">{t('profile.account.changeEmail')}</h2>
	<p class="description" id="email-change-description">
		{t(requirePassword ? 'profile.emailChange.description' : 'account.emailCodeDescription')}
	</p>
	<form onsubmit={handleConfirm}>
		{@render verification?.()}
		<div class="fields">
			<div class="field">
				<label for="email-change-address">{t('profile.emailChange.newEmail')}</label>
				<input
					id="email-change-address"
					name="newEmail"
					type="email"
					autocomplete="email"
					placeholder="you@example.com"
					bind:value={newEmail}
					disabled={busy}
				/>
			</div>
			{#if requirePassword}
				<div class="field">
					<label for="email-change-password">{t('settings.password.current')}</label>
					<div class="password-input">
						<input
							id="email-change-password"
							name="currentPassword"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							placeholder={t('auth.login.passwordPlaceholder')}
							bind:value={currentPassword}
							disabled={busy}
						/>
						<button
							class="visibility"
							type="button"
							onclick={() => (showPassword = !showPassword)}
							aria-label={t(showPassword ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
							title={t(showPassword ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
							aria-pressed={showPassword}
							disabled={busy}
						>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
								<circle cx="12" cy="12" r="3" />
								{#if showPassword}<path d="m3 3 18 18" />{/if}
							</svg>
						</button>
					</div>
				</div>
			{/if}
		</div>
		<p class="hint">{t('profile.emailChange.hint')}</p>
		{#if displayedError}
			<p class="error-message" role="alert">{displayedError}</p>
		{/if}
		<div class="actions">
			<button type="button" class="cancel" onclick={onClose} disabled={busy}
				>{t('common.cancel')}</button
			>
			<button type="submit" class="confirm" disabled={busy || !onConfirm || !canConfirm}
				>{t(busy ? 'profile.emailChange.sending' : 'profile.emailChange.confirm')}</button
			>
		</div>
	</form>
</dialog>

<style>
	dialog {
		width: min(440px, calc(100% - 32px));
		max-height: calc(100svh - 32px);
		margin: auto;
		padding: 28px 24px;
		overflow-y: auto;
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		background: var(--surface-primary);
		color: var(--text-primary);
	}
	dialog::backdrop {
		background: var(--overlay-bg);
	}
	h2 {
		margin: 0 0 10px;
		font-size: 22px;
		line-height: 1.3;
	}
	.description {
		margin: 0 0 24px;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}
	.fields {
		display: grid;
		gap: 18px;
	}
	.field {
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	label {
		font-size: 14px;
		font-weight: 700;
	}
	input {
		width: 100%;
		min-width: 0;
		min-height: 50px;
		padding: 12px 14px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background: var(--surface-input);
		color: var(--text-primary);
		font: inherit;
	}
	input::placeholder {
		color: var(--text-secondary);
	}
	.password-input {
		position: relative;
		min-width: 0;
	}
	.password-input input {
		padding-right: 52px;
	}
	button {
		font: inherit;
		cursor: pointer;
	}
	.visibility {
		position: absolute;
		right: 3px;
		top: 50%;
		transform: translateY(-50%);
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: var(--text-secondary);
	}
	.visibility:hover {
		color: var(--text-primary);
		background: var(--surface-muted);
	}
	.hint {
		margin: 18px 0 0;
		color: var(--text-secondary);
		font-size: 13px;
		line-height: 1.6;
	}
	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 28px;
	}
	.actions button {
		min-width: 0;
		min-height: 48px;
		padding: 12px;
		border: 0;
		border-radius: 14px;
		font-size: 14px;
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	.cancel {
		background: var(--surface-muted);
		color: var(--text-primary);
	}
	.confirm {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}
	button:disabled,
	input:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}
	dialog[aria-busy='true'] button:disabled {
		cursor: wait;
	}
	.error-message {
		margin: 18px 0 0;
		padding: 12px 14px;
		border: 1px solid var(--state-danger-soft-border);
		border-radius: 14px;
		background: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	input:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}
	@media (max-width: 379px) {
		.actions {
			grid-template-columns: 1fr;
		}
	}
</style>
