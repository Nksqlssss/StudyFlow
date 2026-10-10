<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { subjectError, subjectLoaded, subjectLoading, subjects } from '$lib/stores/subjects';
	import type { SubjectIcon } from '$lib/types';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
	const subjectId = $derived(page.params.id);
	const subject = $derived($subjects.find((s) => s.id === subjectId));

	let title = $state('');
	let selectedIcon = $state<SubjectIcon>('code');
	let isInitialized = $state(false);

	$effect(() => {
		if (!subject || isInitialized) return;

		title = subject.title;
		selectedIcon = subject.icon;
		isInitialized = true;
	});

	const ICONS: SubjectIcon[] = ['code', 'math', 'language', 'paint'];

	let showSaveModal = $state(false);
	let isSaving = $state(false);
	let saveError = $state<string | null>(null);

	function handleSubmitEdit(e: Event) {
		e.preventDefault();
		if (isSaving) return;
		if (!subject) return;
		if (!title.trim()) return;

		const unchanged = title.trim() === subject.title && selectedIcon === subject.icon;

		if (unchanged) {
			goto(resolve(`/app/subject/${subject.id}`));
			return;
		}

		saveError = null;
		showSaveModal = true;
	}

	async function confirmSave() {
		if (isSaving) return;
		if (!subject) return;

		if (!$auth.token) {
			goto(resolve('/login'));
			return;
		}

		isSaving = true;
		saveError = null;

		try {
			await subjects.update(
				subject.id,
				{
					title: title.trim(),
					icon: selectedIcon
				},
				$auth.token
			);

			showSaveModal = false;
			goto(resolve(`/app/subject/${subject.id}`));
		} catch (error) {
			saveError = error instanceof Error ? error.message : t('subjects.form.updateError');
			showSaveModal = false;
		} finally {
			isSaving = false;
		}
	}
</script>

<header class="header">
	<a href={resolve(subject ? `/app/subject/${subject.id}` : '/app')} class="back-link">
		<img src="/icons/arrowBack.svg" alt="" />
	</a>
	<h1 class="main-title">{t('subjects.edit.title')}</h1>
</header>

{#if showSaveModal}
	<ConfirmModal
		title={t('subjects.form.saveConfirm')}
		onConfirm={confirmSave}
		onCancel={() => (showSaveModal = false)}
		confirmText={isSaving ? t('subjects.form.saving') : t('common.confirm')}
		cancelText={t('common.cancel')}
		variant="success"
	/>
{/if}

{#if $subjectLoading || (!$subjectLoaded && !$subjectError)}
	<section class="state-card loading-state">
		<div class="loader" aria-hidden="true"></div>
		<p>{t('subjects.loading')}</p>
	</section>
{:else if $subjectError}
	<section class="state-card error-state">
		<div class="state-icon">!</div>
		<div class="state-content">
			<p class="state-title">{t('subjects.error.loadTitle')}</p>
			<span class="state-details">{$subjectError}</span>
		</div>
	</section>
{:else if !subject}
	<Modal
		title={t('subjects.notFound.title')}
		description={t('subjects.notFound.description')}
		confirmText={t('subjects.notFound.back')}
		onConfirm={() => goto(resolve('/app'))}
	/>
{:else}
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

			{#if saveError}
				<p class="form-error">
					<strong>{t('subjects.form.updateError')}</strong>
					<span>{saveError}</span>
				</p>
			{/if}

			<button class="submit-form-button" type="submit" disabled={isSaving}>
				{isSaving ? t('subjects.form.saving') : t('common.saveChanges')}
			</button>
		</form>
	</main>
{/if}

<style>
	.state-card {
		display: flex;
		align-items: center;
		gap: 16px;
		margin: 32px 24px;
		padding: 20px;
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		background-color: var(--surface-primary);
		color: var(--text-secondary);
	}

	.loading-state {
		justify-content: center;
		min-height: 112px;
		font-size: 14px;
		font-weight: 700;
	}

	.loader {
		width: 22px;
		height: 22px;
		border: 3px solid var(--surface-muted);
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.error-state {
		align-items: flex-start;
	}

	.state-icon {
		display: flex;
		justify-content: center;
		align-items: center;
		flex: 0 0 auto;
		width: 40px;
		height: 40px;
		border-radius: 14px;
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		font-size: 20px;
		font-weight: 900;
	}

	.state-content {
		display: grid;
		gap: 6px;
		min-width: 0;
		flex: 1;
	}

	.state-title {
		color: var(--text-primary);
		font-size: 16px;
		font-weight: 800;
		line-height: 22px;
	}

	.state-details {
		color: var(--state-danger-soft-text);
		font-size: 13px;
		line-height: 18px;
		overflow-wrap: anywhere;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	.submit-form-button:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.form-error {
		display: grid;
		gap: 4px;
		margin-bottom: 18px;
		padding: 14px 16px;
		border: 1px solid var(--state-danger-soft-border);
		border-radius: 16px;
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		font-size: 13px;
		line-height: 18px;
	}

	.form-error strong {
		font-size: 14px;
	}
</style>
