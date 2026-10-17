<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { priorityLabel, statusLabel, translate, type TranslationKey } from '$lib/i18n';
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
	import type { TaskPriority, TaskStatus } from '$lib/types';
	import { onMount } from 'svelte';

	const subjectId = $derived($page.params.id ?? '');
	const assignmentId = $derived($page.params.assignmentId ?? '');
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
	const task = $derived(
		$tasks.find((item) => item.id === assignmentId && item.subjectId === subjectId)
	);

	let title = $state('');
	let description = $state('');
	let deadline = $state('');
	let selectedPriority = $state<TaskPriority>('medium');
	let selectedStatus = $state<TaskStatus>('todo');
	let dateInput = $state<HTMLInputElement | null>(null);
	let isInitialized = $state(false);
	let showDiscardModal = $state(false);

	let initialForm = $state({
		title: '',
		description: '',
		deadline: '',
		status: 'todo' as TaskStatus,
		priority: 'medium' as TaskPriority
	});

	const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
	const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

	onMount(() => {
		taskError.set(null);
	});

	function toDateInputValue(date?: Date): string {
		if (!date) return '';

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// The original overdue date remains valid if it was not changed.
	const today = toDateInputValue(new Date());
	const minDeadline = $derived(
		deadline !== '' && deadline === initialForm.deadline && deadline < today ? deadline : today
	);

	function openCalendar() {
		if (dateInput?.showPicker) {
			dateInput.showPicker();
		} else {
			dateInput?.focus();
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if ($taskLoading || !$auth.token || !task || !title.trim()) return;

		taskError.set(null);

		const deadlineChanged = deadline !== initialForm.deadline;
		const currentToday = toDateInputValue(new Date());

		if (deadlineChanged && deadline && deadline < currentToday) {
			taskError.set('Нельзя установить дедлайн на прошедшую дату');
			return;
		}

		const updateTaskBody = {
			title: title.trim(),
			description: description.trim() || null,
			// undefined: leave unchanged; null: remove; Date: update to end of local day.
			deadline: !deadlineChanged
				? undefined
				: deadline
					? new Date(`${deadline}T23:59:59.999`)
					: null,
			status: selectedStatus,
			priority: selectedPriority
		};

		try {
			await tasks.update($auth.token, assignmentId, updateTaskBody);
			await goto(resolve(`/app/subject/${subjectId}/assignment/${assignmentId}`));
		} catch {
			// tasks.update sets taskError.
		}
	}

	$effect(() => {
		if (!task || isInitialized) return;

		const nextForm = {
			title: task.title,
			description: task.description ?? '',
			deadline: toDateInputValue(task.deadline),
			status: task.status,
			priority: task.priority
		};

		title = nextForm.title;
		description = nextForm.description;
		deadline = nextForm.deadline;
		selectedStatus = nextForm.status;
		selectedPriority = nextForm.priority;
		initialForm = nextForm;
		isInitialized = true;
	});

	const hasUnsavedChanges = $derived(
		title.trim() !== initialForm.title.trim() ||
			description.trim() !== initialForm.description.trim() ||
			deadline !== initialForm.deadline ||
			selectedStatus !== initialForm.status ||
			selectedPriority !== initialForm.priority
	);

	function requestLeave() {
		if (hasUnsavedChanges) {
			showDiscardModal = true;
			return;
		}
		goto(resolve(`/app/subject/${subjectId}/assignment/${assignmentId}`));
	}

	function confirmDiscard() {
		goto(resolve(`/app/subject/${subjectId}/assignment/${assignmentId}`));
	}

	function cancelDiscard() {
		showDiscardModal = false;
	}
</script>

<header class="header">
	<button type="button" class="back-button" onclick={requestLeave}>
		<img src="/icons/arrowBack.svg" alt="" />
	</button>
	<h1 class="main-title">{t('tasks.edit.title')}</h1>
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
	<main class="main edit-task-page">
		<form class="edit-task-form" onsubmit={handleSubmit} class:error-border={$taskError}>
			<section class="form-section main-fields">
				<label for="taskTitle">
					<span class="label-text">{t('tasks.form.title')}</span>
					<input
						type="text"
						id="taskTitle"
						class="input"
						placeholder={task.title || t('tasks.form.titlePlaceholder')}
						bind:value={title}
					/>
				</label>

				<label for="taskDescription">
					<span class="label-text">{t('tasks.form.description')}</span>
					<textarea
						id="taskDescription"
						class="input textarea"
						placeholder={task.description || t('tasks.form.descriptionEditPlaceholder')}
						bind:value={description}
					></textarea>
				</label>

				<label for="taskDeadline">
					<span class="label-text">{t('tasks.form.deadline')}</span>
					<input
						type="date"
						id="taskDeadline"
						class="input"
						bind:value={deadline}
						bind:this={dateInput}
						onclick={openCalendar}
						min={minDeadline}
					/>
				</label>
			</section>

			<section class="form-section side-fields">
				<div class="field-group">
					<p class="select-label">{t('tasks.form.status')}</p>
					<div class="segmented-list">
						{#each STATUSES as status (status)}
							<button
								type="button"
								class="option-button status-option"
								class:is-current={selectedStatus === status}
								onclick={() => (selectedStatus = status)}
							>
								{statusLabel($settings.language, status)}
							</button>
						{/each}
					</div>
				</div>

				<div class="field-group">
					<p class="select-label">{t('tasks.form.priority')}</p>
					<div class="segmented-list">
						{#each PRIORITIES as priority (priority)}
							<button
								type="button"
								class="option-button priority-option {priority}"
								class:is-current={selectedPriority === priority}
								onclick={() => (selectedPriority = priority)}
							>
								{priorityLabel($settings.language, priority)}
							</button>
						{/each}
					</div>
				</div>

				{#if $settings.showTips}
					<div class="tip-card">
						<div class="tip-icon">
							<img src="/icons/tooltipIcon.svg" alt="" />
						</div>
						<div>
							<p class="tip-title">{t('tasks.form.tipTitle')}</p>
							<p class="tip-text">{t('tasks.form.tipText')}</p>
						</div>
					</div>
				{/if}
			</section>

			<section class="form-actions">
				<button type="button" class="cancel-link" onclick={requestLeave}>
					{t('common.cancel')}
				</button>
				<button class="submit-form-button" type="submit" disabled={$taskLoading}>
					{$taskLoading ? t('tasks.form.updating') : t('common.saveChanges')}
				</button>
				{#if $taskError}
					<div class="form-error">
						<strong>{t('tasks.error.title')}</strong>
						<span>{$taskError}</span>
					</div>
				{/if}
			</section>
		</form>

		{#if showDiscardModal}
			<ConfirmModal
				title={t('tasks.edit.discard.title')}
				description={t('tasks.edit.discard.description')}
				confirmText={t('common.reset')}
				cancelText={t('common.stay')}
				variant="danger"
				onConfirm={confirmDiscard}
				onCancel={cancelDiscard}
			/>
		{/if}
	</main>
{:else if $taskHasLoaded && !task}
	<Modal
		title={t('tasks.detail.notFound.title')}
		description={t('tasks.detail.notFound.description')}
		confirmText={t('tasks.detail.backToSubject')}
		onConfirm={() => goto(resolve(`/app/subject/${subjectId}`))}
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

	.back-button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 36px;
		height: 36px;
		border: none;
		background-color: transparent;
	}

	.back-button:hover {
		cursor: pointer;
	}

	.edit-task-page {
		padding: 32px 24px 108px;
	}

	.edit-task-form {
		display: grid;
		gap: 20px;
	}

	.form-section {
		display: grid;
		gap: 24px;
	}

	.main-fields,
	.side-fields,
	.form-actions {
		padding: 20px;
		border-radius: 20px;
		background-color: var(--surface-primary);
	}

	label,
	.select-label {
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		font-size: 14px;
		font-weight: 400;
		line-height: 20px;
		color: var(--text-muted);
	}

	.label-text,
	.select-label {
		margin-left: 8px;
	}

	.input {
		width: 100%;
		padding: 18px 20px;
		border: none;
		outline: none;
		border-radius: 20px;
		background-color: var(--bg-primary);
		font-family: var(--font-main);
		font-size: 16px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.input::placeholder {
		color: var(--text-secondary);
	}

	.textarea {
		min-height: 150px;
		resize: vertical;
		line-height: 1.5;
	}

	input[type='date']::-webkit-calendar-picker-indicator {
		display: none;
	}

	.field-group {
		display: grid;
		gap: 16px;
	}

	.segmented-list {
		display: grid;
		gap: 10px;
	}

	.option-button {
		width: 100%;
		padding: 15px 16px;
		border: 2px solid transparent;
		border-radius: 16px;
		background-color: var(--bg-primary);
		font-size: 14px;
		font-weight: 700;
		color: var(--text-muted);
		cursor: pointer;
		text-align: left;
	}

	.option-button.is-current {
		background-color: var(--bg-icon);
		color: var(--border-accent);
		border-color: var(--border-accent);
	}

	.priority-option.low.is-current {
		border-color: var(--accent-green);
		color: var(--accent-green);
		background-color: var(--state-success-bg);
	}

	.priority-option.medium.is-current {
		border-color: var(--accent-orange);
		color: var(--accent-orange);
		background-color: var(--state-warning-bg);
	}

	.priority-option.high.is-current {
		border-color: var(--accent-red);
		color: var(--accent-red);
		background-color: var(--state-danger-bg);
	}

	.tip-card {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 18px;
		border-radius: 18px;
		background-color: var(--surface-secondary);
	}

	.tip-icon {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: var(--surface-icon);
	}

	.tip-icon img {
		width: 22px;
		height: 22px;
	}

	.tip-title {
		margin-bottom: 4px;
		font-size: 14px;
		font-weight: 800;
		color: var(--text-muted);
	}

	.tip-text {
		font-size: 12px;
		line-height: 20px;
		color: var(--text-secondary);
	}

	.form-actions {
		display: grid;
		gap: 12px;
		background-color: transparent;
		padding: 0;
	}

	.cancel-link,
	.submit-form-button {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		min-height: 60px;
		border-radius: 20px;
		border: none;
		font-size: 16px;
		font-weight: 800;
		text-decoration: none;
	}

	.cancel-link {
		background-color: var(--surface-primary);
		color: var(--text-muted);
	}

	.submit-form-button {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		box-shadow: 0 10px 20px 0 var(--shadow-accent);
		cursor: pointer;
	}

	.submit-form-button:disabled {
		cursor: wait;
		opacity: 0.72;
	}

	.not-found-card {
		width: 100%;
		min-height: calc(90vh - 96px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
	}

	@media (min-width: 768px) {
		.header {
			padding: 32px 40px;
		}

		.edit-task-page {
			padding: 40px;
		}

		.state-card {
			margin: 40px;
		}

		.segmented-list {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.option-button {
			text-align: center;
		}

		.form-actions {
			grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
		}
	}

	@media (min-width: 1024px) {
		.edit-task-form {
			grid-template-columns: minmax(0, 620px) minmax(320px, 420px);
			align-items: start;
		}

		.main-fields {
			grid-row: span 2;
		}

		.segmented-list {
			grid-template-columns: 1fr;
		}

		.option-button {
			text-align: left;
		}

		.form-actions {
			grid-column: 1 / -1;
			grid-template-columns: minmax(220px, 0.4fr) minmax(0, 0.6fr);
			justify-content: end;
		}
	}

	@media (min-width: 1280px) {
		.header {
			padding-inline: 56px;
		}

		.edit-task-page {
			padding: 48px 56px;
		}

		.state-card {
			margin: 48px 56px;
		}
	}
</style>
