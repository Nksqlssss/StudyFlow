<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { priorityLabel, statusLabel, translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { tasks } from '$lib/stores/tasks';
	import type { TaskPriority, TaskStatus } from '$lib/types';

	const subjectId = $derived($page.params.id ?? '');
	const assignmentId = $derived($page.params.assignmentId ?? '');
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
	const task = $derived(
		$tasks.find((task) => task.id === assignmentId && task.subjectId === subjectId)
	);
	function toDateInputValue(date?: Date): string {
		if (!date) return '';

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	let title = $state('');
	let description = $state('');
	let deadline = $state('');
	let selectedStatus = $state<TaskStatus>('todo');
	let selectedPriority = $state<TaskPriority>('medium');

	let initialForm = $state({
		title: '',
		description: '',
		deadline: '',
		status: 'todo' as TaskStatus,
		priority: 'medium' as TaskPriority
	});

	const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
	const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

	let dateInput = $state<HTMLInputElement | null>(null);

	function openCalendar() {
		if (dateInput?.showPicker) {
			dateInput.showPicker();
		} else {
			dateInput?.focus();
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();

		if (!task) return;
		if (!title.trim()) return;

		tasks.update(assignmentId, {
			title: title.trim(),
			description: description.trim() || undefined,
			deadline: deadline ? new Date(`${deadline}T00:00:00`) : undefined,
			status: selectedStatus,
			priority: selectedPriority
		});

		goto(resolve(`/subject/${subjectId}/assignment/${assignmentId}`));
	}

	let isInitialized = $state(false);

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

	let showDiscardModal = $state(false);

	function requestLeave() {
		if (hasUnsavedChanges) {
			showDiscardModal = true;
			return;
		}

		goto(resolve(`/subject/${subjectId}/assignment/${assignmentId}`));
	}

	function confirmDiscard() {
		goto(resolve(`/subject/${subjectId}/assignment/${assignmentId}`));
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

{#if task}
	<main class="main edit-task-page">
		<form class="edit-task-form" onsubmit={handleSubmit}>
			<section class="form-section main-fields">
				<label for="taskTitle">
					<span class="label-text">{t('tasks.form.title')}</span>
					<input
						type="text"
						id="taskTitle"
						class="input"
						placeholder={task?.title || t('tasks.form.titlePlaceholder')}
						bind:value={title}
					/>
				</label>

				<label for="taskDescription">
					<span class="label-text">{t('tasks.form.description')}</span>
					<textarea
						id="taskDescription"
						class="input textarea"
						placeholder={task?.description || t('tasks.form.descriptionEditPlaceholder')}
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
							<p class="tip-text">
								{t('tasks.form.tipText')}
							</p>
						</div>
					</div>
				{/if}
			</section>

			<section class="form-actions">
				<button type="button" class="cancel-link" onclick={requestLeave}>
					{t('common.cancel')}
				</button>
				<button class="submit-form-button" type="submit">
					{t('common.saveChanges')}
				</button>
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
{:else}
	<section class="not-found-card">
		<h2>{t('tasks.detail.notFound.title')}</h2>
		<p>{t('tasks.detail.notFound.description')}</p>
		<a href={resolve(`/subject/${subjectId}`)}>{t('tasks.detail.backToSubject')}</a>
	</section>
{/if}

<style>
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

	.not-found-card {
		width: 100%;
		min-height: calc(90vh - 96px);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
	}

	.not-found-card h2 {
		font-size: 32px;
		font-weight: 700;
	}

	.not-found-card a {
		padding: 16px 24px;
		background-color: var(--surface-primary);
		border-radius: 16px;
		border: var(--border-muted) 1px solid;
		margin-top: 8px;
		transition-duration: 0.4s;
	}

	.not-found-card a:hover {
		background-color: var(--surface-primary);
		transform: translateY(-2px);
	}

	@media (min-width: 768px) {
		.header {
			padding: 32px 40px;
		}

		.edit-task-page {
			padding: 40px;
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
	}
</style>
