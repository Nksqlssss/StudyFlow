<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import {
		deadlineStatus,
		formatDate,
		priorityLabel,
		statusLabel,
		translate,
		type TranslationKey
	} from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import {
		taskError,
		taskFetchError,
		taskFetching,
		taskHasLoaded,
		taskLoading,
		tasks
	} from '$lib/stores/tasks';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
	const subjectId = $derived($page.params.id ?? '');
	const assignmentId = $derived($page.params.assignmentId ?? '');
	const task = $derived(
		$tasks.find((task) => task.id === assignmentId && task.subjectId === subjectId)
	);
	const deadlineNote = $derived(deadlineStatus(task?.deadline, $settings.language));
	let isDeleteModalOpen = $state(false);

	async function toggleTaskStatus() {
		if (!task) return;
		if (!$auth.token) return;
		if ($taskLoading) return;

		try {
			await tasks.setStatus($auth.token, task.id, task.status === 'done' ? 'in_progress' : 'done');
		} catch (error) {}
	}

	async function handleDelete() {
		if (!task) return;
		if (!$auth.token) return;
		if ($taskLoading) return;

		try {
			await tasks.remove($auth.token, task.id);
			await goto(resolve(`/app/subject/${subjectId}`));
		} catch (error) {}
	}

	function toggleDeleteModal() {
		taskError.set(null);
		isDeleteModalOpen = !isDeleteModalOpen;
	}
</script>

<header class="header">
	<a href={resolve(`/app/subject/${subjectId}`)} class="back-link">
		<img src="/icons/arrowBack.svg" alt="" />
	</a>
	<h1 class="main-title">{t('tasks.detail.title')}</h1>
	<a
		class="edit-button"
		type="button"
		href={resolve(`/app/subject/${subjectId}/assignment/${assignmentId}/edit`)}
	>
		<img src="/icons/editIcon.svg" alt="" />
	</a>
</header>

{#if $taskFetching || (!$taskHasLoaded && !$taskFetchError)}
	<section class="state-card loading-state">
		<div class="loader" aria-hidden="true"></div>
		<p>{t('tasks.loading')}</p>
	</section>
{:else if !$taskHasLoaded && $taskFetchError}
	<section class="state-card error-state">
		<div class="state-icon">!</div>
		<div class="state-content">
			<p class="state-title">{t('tasks.error.loadTitle')}</p>
			<span class="state-details">{$taskFetchError}</span>
		</div>
	</section>
{:else if task && $taskHasLoaded}
	<main class="main assignment-page">
		<section class="assignment-hero">
			<div class="assignment-icon">
				<img src="/icons/subjectsIcon.svg" alt="" />
			</div>
			<div class="assignment-heading">
				<p class="assignment-kicker">{t('tasks.detail.kicker')}</p>
				<h2 class="assignment-title">{task.title}</h2>
			</div>
		</section>

		<section class="details-grid">
			<article class="detail-card">
				<span class="detail-label">{t('tasks.form.deadline')}</span>
				<strong class="detail-value">
					{task.deadline
						? formatDate(task.deadline, $settings.language)
						: t('tasks.detail.noDeadline')}
				</strong>
				<p class="detail-note">{deadlineNote}</p>
			</article>

			<article class="detail-card">
				<span class="detail-label">{t('tasks.form.priority')}</span>
				<strong class="detail-value">{priorityLabel($settings.language, task.priority)}</strong>
				<p class="detail-note">{t('tasks.detail.canChange')}</p>
			</article>

			<article class="detail-card">
				<span class="detail-label">{t('tasks.form.status')}</span>
				<strong class="detail-value">{statusLabel($settings.language, task.status)}</strong>
				<p class="detail-note">{t('tasks.detail.canChange')}</p>
			</article>
		</section>

		<section class="description-section">
			<div class="section-heading">
				<h3>{t('tasks.detail.description')}</h3>
				<span>{t('tasks.detail.draft')}</span>
			</div>
			<p>
				{task.description || t('tasks.detail.noDescription')}
			</p>
		</section>

		<section class="actions-panel" class:error-border={$taskError}>
			<button
				class="action-button primary"
				type="button"
				onclick={toggleTaskStatus}
				disabled={$taskLoading}
			>
				{task.status === 'done' ? t('tasks.detail.reopen') : t('tasks.detail.markDone')}
			</button>
			{#if $taskError}
				<div class="form-error">
					<strong>{t('tasks.error.title')}</strong>
					<span>{$taskError}</span>
				</div>
			{/if}
			<button
				class="action-button secondary"
				type="button"
				onclick={toggleDeleteModal}
				disabled={$taskLoading}
			>
				{t('tasks.detail.delete')}
			</button>
		</section>

		{#if isDeleteModalOpen}
			<ConfirmModal
				title={t('tasks.delete.title')}
				description={t('common.deleteIrreversible')}
				onConfirm={handleDelete}
				onCancel={() => (isDeleteModalOpen = false)}
				confirmText={t('common.confirm')}
				cancelText={t('common.cancel')}
				variant="danger"
				error={$taskError}
			/>
		{/if}
	</main>
{:else if $taskHasLoaded && !task}
	<Modal
		title={t('tasks.detail.notFound.title')}
		description={t('tasks.detail.notFound.description')}
		confirmText={t('tasks.detail.backToSubject')}
		onConfirm={() => {
			goto(`/app/subject/${subjectId}`);
		}}
	/>
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

	.error-border {
		border: 1px solid var(--accent-red) !important;
	}

	.form-error {
		display: grid;
		gap: 4px;
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

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	.back-link,
	.edit-button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 12px;
		background-color: transparent;
	}

	.edit-button {
		background-color: var(--surface-primary);
		cursor: pointer;
	}

	.edit-button img {
		width: 18px;
		height: 18px;
	}

	.assignment-page {
		padding: 32px 24px 108px;
	}

	.assignment-hero {
		position: relative;
		overflow: hidden;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 16px;
		padding: 24px;
		border-radius: 20px;
		background-color: var(--surface-primary);
		margin-bottom: 20px;
	}

	.assignment-hero::before,
	.assignment-hero::after {
		content: '';
		position: absolute;
		width: 140px;
		height: 80px;
		border-radius: 50%;
		background-color: var(--surface-icon-strong);
		filter: blur(64px);
		opacity: 0.45;
	}

	.assignment-hero::before {
		left: -40px;
		top: -24px;
	}

	.assignment-hero::after {
		right: -48px;
		bottom: -32px;
	}

	.assignment-icon {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: center;
		align-items: center;
		width: 52px;
		height: 52px;
		border-radius: 14px;
		background-color: var(--bg-icon);
	}

	.assignment-icon img {
		width: 24px;
		height: 24px;
	}

	.assignment-heading {
		position: relative;
		z-index: 1;
		min-width: 0;
	}

	.assignment-kicker {
		margin-bottom: 6px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1.1px;
		text-transform: uppercase;
		color: var(--text-accent);
	}

	.assignment-title {
		font-size: 24px;
		font-weight: 900;
		line-height: 30px;
		color: var(--text-primary);
		overflow-wrap: anywhere;
	}

	.details-grid {
		display: grid;
		gap: 12px;
		margin-bottom: 20px;
	}

	.detail-card,
	.description-section,
	.actions-panel {
		border-radius: 20px;
		background-color: var(--surface-primary);
	}

	.detail-card {
		padding: 18px 20px;
	}

	.detail-label,
	.section-heading span {
		display: block;
		margin-bottom: 8px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1px;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.detail-value {
		display: block;
		font-size: 16px;
		line-height: 24px;
		color: var(--text-primary);
	}

	.detail-note {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.description-section {
		padding: 22px;
		margin-bottom: 20px;
	}

	.section-heading {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: flex-start;
		margin-bottom: 16px;
	}

	.section-heading h3 {
		font-size: 20px;
		line-height: 28px;
	}

	.section-heading span {
		margin-bottom: 0;
		text-align: right;
	}

	.description-section p {
		font-size: 15px;
		line-height: 24px;
		color: var(--text-muted);
	}

	.actions-panel {
		display: grid;
		gap: 12px;
		padding: 16px;
	}

	.action-button {
		width: 100%;
		padding: 16px;
		border: none;
		border-radius: 16px;
		font-size: 15px;
		font-weight: 800;
		cursor: pointer;
	}

	.action-button:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.action-button.primary {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}

	.action-button.secondary {
		background-color: var(--priority-high-bg);
		color: var(--priority-high-text);
	}

	@media (min-width: 768px) {
		.header {
			padding: 32px 40px;
		}

		.assignment-page {
			padding: 40px;
		}

		.state-card {
			margin: 40px;
		}

		.details-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.actions-panel {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.assignment-page {
			display: grid;
			grid-template-columns: minmax(320px, 420px) minmax(0, 620px);
			gap: 24px;
			align-items: start;
		}

		.assignment-hero {
			position: sticky;
			top: 32px;
			grid-row: 1 / span 3;
			grid-template-columns: 1fr;
			margin-bottom: 0;
			min-height: 320px;
			align-content: start;
		}

		.assignment-icon {
			width: 64px;
			height: 64px;
		}

		.assignment-title {
			font-size: 30px;
			line-height: 38px;
		}

		.details-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			margin-bottom: 0;
		}

		.description-section,
		.actions-panel {
			margin-bottom: 0;
		}
	}

	@media (min-width: 1280px) {
		.header {
			padding-inline: 56px;
		}

		.assignment-page {
			grid-template-columns: minmax(360px, 460px) minmax(0, 720px);
			padding: 48px 56px;
		}

		.state-card {
			margin: 48px 56px;
		}
	}
</style>
