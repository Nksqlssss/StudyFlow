<script lang="ts">
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let {
		mode,
		onClose,
		onConfirm,
		firstValue = $bindable(''),
		secondValue = $bindable(''),
		thirdValue = $bindable(''),
		error,
		isLoading = false,
		verification,
		canConfirm = true
	}: {
		mode: 'set' | 'change';
		onClose: () => void;
		onConfirm: () => void | Promise<void>;
		firstValue: string;
		secondValue: string;
		thirdValue?: string;
		error: string | null;
		isLoading?: boolean;
		verification?: Snippet;
		canConfirm?: boolean;
	} = $props();
	const t = $derived((key: TranslationKey) => translate($settings.language, key));
	let dialog: HTMLDialogElement;
	let showFirst = $state(false);
	let showSecond = $state(false);
	let showThird = $state(false);
	let isPending = $state(false);
	let confirmationFailed = $state(false);
	const busy = $derived(isPending || isLoading);
	const displayedError = $derived(
		error || (confirmationFailed ? t('common.somethingWentWrong') : null)
	);

	async function handleConfirm(event: SubmitEvent) {
		event.preventDefault();
		if (busy || !canConfirm) return;

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

{#snippet visibilityIcon(visible: boolean)}
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
		{#if visible}<path d="m3 3 18 18" />{/if}
	</svg>
{/snippet}

<dialog
	bind:this={dialog}
	aria-labelledby="password-modal-title"
	aria-describedby="password-modal-description"
	aria-busy={busy}
	oncancel={(event: Event) => {
		event.preventDefault();
		if (!busy) onClose();
	}}
>
	<h2 id="password-modal-title">
		{t(mode === 'set' ? 'settings.password.setTitle' : 'settings.password.changeTitle')}
	</h2>
	<p id="password-modal-description" class="description">
		{t(mode === 'set' ? 'settings.password.setDescription' : 'settings.password.changeDescription')}
	</p>

	<form onsubmit={handleConfirm}>
		{@render verification?.()}
		<div class="fields">
			<div class="field">
				<label for="password-first"
					>{t(mode === 'set' ? 'settings.signIn.password' : 'settings.password.current')}</label
				>
				<div class="password-input">
					<input
						id="password-first"
						name={mode === 'set' ? 'password' : 'currentPassword'}
						type={showFirst ? 'text' : 'password'}
						autocomplete={mode === 'set' ? 'new-password' : 'current-password'}
						placeholder={t('auth.login.passwordPlaceholder')}
						bind:value={firstValue}
						disabled={busy}
					/>
					<button
						class="visibility"
						type="button"
						onclick={() => (showFirst = !showFirst)}
						aria-label={t(showFirst ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
						title={t(showFirst ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
						aria-pressed={showFirst}
						disabled={busy}
					>
						{@render visibilityIcon(showFirst)}
					</button>
				</div>
			</div>
			<div class="field">
				<label for="password-second"
					>{t(mode === 'set' ? 'settings.password.confirm' : 'settings.password.new')}</label
				>
				<div class="password-input">
					<input
						id="password-second"
						name={mode === 'set' ? 'confirmPassword' : 'newPassword'}
						type={showSecond ? 'text' : 'password'}
						autocomplete="new-password"
						placeholder={t(
							mode === 'set'
								? 'settings.password.confirmPlaceholder'
								: 'auth.form.passwordPlaceholder'
						)}
						bind:value={secondValue}
						disabled={busy}
					/>
					<button
						class="visibility"
						type="button"
						onclick={() => (showSecond = !showSecond)}
						aria-label={t(showSecond ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
						title={t(showSecond ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
						aria-pressed={showSecond}
						disabled={busy}
					>
						{@render visibilityIcon(showSecond)}
					</button>
				</div>
			</div>
		</div>

		{#if mode === 'change'}
			<div class="field confirmation-field">
				<label for="password-third">{t('settings.password.repeatNew')}</label>
				<div class="password-input">
					<input
						id="password-third"
						name="confirmNewPassword"
						type={showThird ? 'text' : 'password'}
						autocomplete="new-password"
						placeholder={t('settings.password.repeatNew')}
						bind:value={thirdValue}
						disabled={busy}
					/>
					<button
						class="visibility"
						type="button"
						onclick={() => (showThird = !showThird)}
						aria-label={t(showThird ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
						title={t(showThird ? 'auth.form.hidePassword' : 'auth.form.showPassword')}
						aria-pressed={showThird}
						disabled={busy}
					>
						{@render visibilityIcon(showThird)}
					</button>
				</div>
			</div>
		{/if}

		{#if displayedError}
			<p class="error-message" role="alert">{displayedError}</p>
		{/if}
		<div class="actions">
			<button type="button" class="cancel" onclick={onClose} disabled={busy}
				>{t('common.cancel')}</button
			>
			<button type="submit" class="save" disabled={busy || !canConfirm}
				>{t(
					busy
						? mode === 'set'
							? 'settings.password.setting'
							: 'settings.password.updating'
						: mode === 'set'
							? 'settings.password.set'
							: 'common.saveChanges'
				)}</button
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
	.confirmation-field {
		margin-top: 18px;
	}
	label {
		font-size: 14px;
		font-weight: 700;
	}
	.password-input {
		position: relative;
		min-width: 0;
	}
	input {
		width: 100%;
		min-width: 0;
		min-height: 50px;
		padding: 12px 52px 12px 14px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background: var(--surface-input);
		color: var(--text-primary);
		font: inherit;
	}
	input::placeholder {
		color: var(--text-secondary);
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
	.save {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}
	button:disabled,
	input:disabled {
		cursor: wait;
		opacity: 0.65;
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
