<script lang="ts">
	import { onMount } from 'svelte';
	import type { DefaultAvatar } from '$lib/api/avatar';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { avatar } from '$lib/stores/avatar';
	import { settings } from '$lib/stores/settings';

	let { onClose }: { onClose: () => void } = $props();
	let dialog: HTMLDialogElement;
	let input: HTMLInputElement;
	const t = $derived((key: TranslationKey) => translate($settings.language, key));
	const choices: { url: DefaultAvatar; label: TranslationKey }[] = [
		{ url: '/avatars/default-male.svg', label: 'avatar.male' },
		{ url: '/avatars/default-female.svg', label: 'avatar.female' }
	];
	const customUrl = $derived(
		$auth.user?.avatarUrl && !choices.some((choice) => choice.url === $auth.user?.avatarUrl)
			? $auth.user.avatarUrl
			: null
	);
	const errorKey = $derived((message: string): TranslationKey => {
		const messages: Record<string, TranslationKey> = {
			'Not authenticated': 'profile.errors.session',
			Unauthorized: 'profile.errors.session',
			'Only JPEG, PNG and WebP are supported': 'avatar.errors.format',
			'File is too large (max 5 MiB)': 'avatar.errors.size',
			'Invalid or corrupted image': 'avatar.errors.image',
			'Invalid image dimensions': 'avatar.errors.image',
			'Avatar update failed or conflicted': 'avatar.errors.conflict',
			'Avatar changed during deletion': 'avatar.errors.conflict',
			'Image storage unavailable': 'avatar.errors.storage',
			'Failed to fetch': 'settings.errors.network',
			'Load failed': 'settings.errors.network'
		};
		return messages[message] ?? 'avatar.errors.save';
	});

	onMount(() => {
		avatar.clear();
		dialog.showModal();
	});
	function close() {
		if (!$avatar.isAvatarLoading) onClose();
	}
	async function select(value: DefaultAvatar) {
		if ($avatar.isAvatarLoading) return;
		if (await avatar.selectDefault(value)) finish();
	}
	async function upload(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		target.value = '';
		if (!file || $avatar.isAvatarLoading) return;
		if (await avatar.addAvatar(file)) finish();
	}
	async function remove() {
		if ($avatar.isAvatarLoading) return;
		if (await avatar.deleteAvatar()) finish();
	}
	function finish() {
		if (!$avatar.cleanupWarning) onClose();
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby="avatar-title"
	aria-describedby="avatar-hint"
	aria-busy={$avatar.isAvatarLoading}
	oncancel={(event: Event) => {
		event.preventDefault();
		close();
	}}
	onclick={(event: MouseEvent) => {
		if (event.target === dialog) close();
	}}
>
	<h2 id="avatar-title">{t('avatar.title')}</h2>
	<p id="avatar-hint">{t('avatar.hint')}</p>
	<div class="avatar-choices">
		{#each choices as choice (choice.url)}
			<button
				type="button"
				class="avatar-choice"
				class:selected={$auth.user?.avatarUrl === choice.url}
				aria-pressed={$auth.user?.avatarUrl === choice.url}
				disabled={$avatar.isAvatarLoading}
				onclick={() => select(choice.url)}
			>
				<img src={choice.url} alt="" width="96" height="96" />
				<span>{t(choice.label)}</span>
			</button>
		{/each}
		<button
			type="button"
			class="avatar-choice"
			class:selected={!!customUrl}
			aria-pressed={!!customUrl}
			disabled={$avatar.isAvatarLoading}
			onclick={() => input.click()}
		>
			<span class="upload-image">
				{#if customUrl}<img src={customUrl} alt="" width="96" height="96" />{/if}
				<span class="plus" class:over-image={!!customUrl} aria-hidden="true">+</span>
			</span>
			<span>{t('avatar.custom')}</span>
		</button>
	</div>
	<input
		bind:this={input}
		class="file-input"
		type="file"
		accept="image/jpeg,image/png,image/webp"
		onchange={upload}
		disabled={$avatar.isAvatarLoading}
		aria-label={t('avatar.custom')}
	/>
	{#if $avatar.isAvatarLoading}<p class="status" role="status">{t('avatar.saving')}</p>{/if}
	{#if $avatar.avatarError}<p class="error" role="alert">{t(errorKey($avatar.avatarError))}</p>{/if}
	{#if $avatar.cleanupWarning}<p class="warning" role="status">{t('avatar.cleanupWarning')}</p>{/if}
	<div class="actions">
		{#if $auth.user?.avatarUrl}<button
				type="button"
				class="danger"
				onclick={remove}
				disabled={$avatar.isAvatarLoading}>{t('avatar.remove')}</button
			>{/if}
		<button type="button" class="cancel" onclick={close} disabled={$avatar.isAvatarLoading}
			>{t('common.cancel')}</button
		>
	</div>
</dialog>

<style>
	dialog {
		width: min(480px, calc(100% - 32px));
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
	p {
		margin: 0 0 20px;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}
	.avatar-choices {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	button {
		min-width: 0;
		min-height: 44px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		color: var(--text-primary);
		background: var(--surface-input);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.avatar-choice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 10px 6px;
	}
	.avatar-choice > img,
	.upload-image {
		width: min(100%, 96px);
		aspect-ratio: 1;
		height: auto;
		border-radius: 50%;
	}
	.upload-image {
		display: grid;
		place-items: center;
		position: relative;
		background: var(--surface-muted);
		overflow: hidden;
	}
	.upload-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.plus {
		font-size: 36px;
		line-height: 1;
		font-weight: 500;
	}
	.over-image {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: var(--overlay-bg);
		color: var(--text-on-danger);
	}
	.selected {
		border-color: var(--border-accent);
		background: var(--accent-primary-bg);
		box-shadow: inset 0 0 0 1px var(--border-accent);
	}
	button:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.file-input {
		display: none;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
	}
	.actions button {
		flex: 1;
		padding: 12px;
	}
	.danger {
		background: var(--state-danger-soft-bg);
		border-color: var(--state-danger-soft-border);
		color: var(--state-danger-soft-text);
	}
	.cancel {
		background: var(--surface-muted);
	}
	.status,
	.error,
	.warning {
		margin: 16px 0 0;
	}
	.error {
		color: var(--state-danger-soft-text);
	}
	.warning {
		color: var(--text-primary);
	}
	@media (max-width: 379px) {
		dialog {
			padding: 24px 16px;
		}
		.avatar-choices {
			gap: 6px;
		}
		.avatar-choice {
			font-size: 12px;
		}
	}
</style>
