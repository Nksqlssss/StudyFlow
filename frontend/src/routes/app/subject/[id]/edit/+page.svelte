<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { subjects } from '$lib/stores/subjects';
	import type { SubjectIcon } from '$lib/types';

	const { data } = $props();
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	let title = $state('');
	let selectedIcon = $state<SubjectIcon>('code');

	const subject = $derived(data.subject);

	$effect(() => {
		title = subject.title;
		selectedIcon = subject.icon;
	});

	const ICONS: SubjectIcon[] = ['code', 'math', 'language', 'paint'];

	let showSaveModal = $state(false);

	function handleSubmitEdit(e: Event) {
		e.preventDefault();
		if (!title.trim()) return;

		const unchanged = title.trim() === subject.title && selectedIcon === subject.icon;

		if (unchanged) {
			goto(resolve(`/app/subject/${data.subject.id}`));
			return;
		}

		showSaveModal = true;
	}

	function confirmSave() {
		subjects.update(data.subject.id, {
			title: title.trim(),
			icon: selectedIcon
		});
		goto(resolve(`/app/subject/${data.subject.id}`));
	}
</script>

<header class="header">
	<a href={resolve(`/app/subject/${data.subject.id}`)} class="back-link">
		<img src="/icons/arrowBack.svg" alt="" />
	</a>
	<h1 class="main-title">{t('subjects.edit.title')}</h1>
</header>

{#if showSaveModal}
	<div class="modal-overlay">
		<div class="modal">
			<p class="modal-title">{t('subjects.form.saveConfirm')}</p>
			<div class="modal-buttons">
				<button class="modal-btn confirm" onclick={confirmSave}>{t('common.confirm')}</button>
				<button class="modal-btn cancel" onclick={() => (showSaveModal = false)}
					>{t('common.cancel')}</button
				>
			</div>
		</div>
	</div>
{/if}

<main class="main">
	<form class="create-subject-form" onsubmit={handleSubmitEdit}>
		<label for="subjectName">
			<span class="label-text">{t('subjects.form.name')}</span>
			<input
				type="text"
				id="subjectName"
				class="input"
				placeholder={t('subjects.form.namePlaceholder')}
				bind:value={title}
			/>
		</label>

		<p class="select-icon">{t('subjects.form.icon')}</p>
		<div class="icons">
			{#each ICONS as icon (icon)}
				<button
					type="button"
					class="icon-wrapper"
					class:is-current={selectedIcon === icon}
					onclick={() => (selectedIcon = icon)}
				>
					<img src="/icons/{icon}.svg" alt={icon} width="25" height="25" />
				</button>
			{/each}
		</div>

		<button class="submit-form-button" type="submit">
			{t('common.saveChanges')}
		</button>
	</form>
</main>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background-color: var(--overlay-bg);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal {
		background-color: var(--surface-primary);
		border-radius: 20px;
		padding: 32px 24px;
		width: calc(100% - 48px);
		max-width: 360px;
	}

	.modal-title {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		text-align: center;
		margin-bottom: 24px;
	}

	.modal-buttons {
		display: flex;
		gap: 12px;
	}

	.modal-btn {
		flex: 1;
		padding: 16px;
		border-radius: 16px;
		border: none;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm {
		background-color: var(--accent-success);
		color: var(--text-on-danger);
	}

	.cancel {
		background-color: var(--accent-red);
		color: var(--text-on-danger);
	}

	.header {
		display: flex;
		align-items: center;
		position: relative;
		padding: 24px;
		background-color: var(--bg-secondary);
	}

	.main-title {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translateX(-50%) translateY(-50%);
	}

	.back-link {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.main {
		padding: 32px 24px;
	}

	.main label,
	.select-icon {
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		font-size: 14px;
		font-weight: 400;
		line-height: 20px;
		color: var(--text-muted);
		margin-bottom: 24px;
	}

	.label-text,
	.select-icon {
		margin-left: 8px;
	}

	.input {
		padding: 18px 20px;
		background-color: var(--surface-primary);
		border: none;
		outline: none;
		border-radius: 20px;
		font-size: 16px;
		font-weight: 500;
		color: var(--text-muted);
		font-family: var(--font-main);
		width: 100%;
	}

	.input::placeholder {
		color: var(--text-secondary);
	}

	.select-icon {
		margin-bottom: 16px;
	}

	.icons {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32px;
	}

	.icon-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 75px;
		height: 75px;
		border-radius: 20px;
		background-color: var(--surface-primary);
		cursor: pointer;
		border: none;
	}

	.is-current {
		border: 2px var(--border-accent) solid;
		background-color: var(--bg-icon);
	}

	.submit-form-button {
		width: 100%;
		display: flex;
		justify-content: center;
		padding-block: 20px;
		border-radius: 20px;
		background: var(--gradient-primary);
		border: none;
		outline: none;
		font-size: 16px;
		font-weight: 700;
		line-height: 24px;
		color: var(--text-on-accent);
		box-shadow: 0 10px 20px 0 var(--shadow-accent);
	}
</style>
