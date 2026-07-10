<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { priorityLabel, translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { tasks } from '$lib/stores/tasks';
	import type { TaskPriority } from '$lib/types';

	const subjectId = $derived($page.params.id ?? '');
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	let title = $state('');
	let description = $state('');
	let deadline = $state('');
	let showError = $state(false);
	let selectedPriority = $state<TaskPriority>($settings.defaultTaskPriority);

	const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

	let dateInput: HTMLInputElement;

	function openCalendar() {
		if (dateInput.showPicker) {
			dateInput.showPicker();
		} else {
			dateInput.focus();
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!title.trim()) return;
		if (!deadline) {
			showError = true;
			return;
		}

		tasks.add({
			subjectId,
			title: title.trim(),
			description: description.trim() || undefined,
			priority: selectedPriority,
			deadline: new Date(deadline)
		});

		goto(resolve(`/app/subject/${subjectId}`));
	}
</script>

<header class="header">
	<a href={resolve(`/app/subject/${subjectId}`)} class="back-link">
		<img src="/icons/arrowBack.svg" alt="" />
	</a>
	<h1 class="main-title">{t('tasks.new.title')}</h1>
</header>

<main class="main">
	<form class="create-task-form" onsubmit={handleSubmit}>
		<label for="taskTitle">
			<span class="label-text">{t('tasks.form.title')}</span>
			<input
				type="text"
				id="taskTitle"
				class="input"
				placeholder={t('tasks.form.titlePlaceholder')}
				bind:value={title}
			/>
		</label>

		<label for="taskDescription">
			<span class="label-text">{t('tasks.form.description')}</span>
			<textarea
				id="taskDescription"
				class="input textarea"
				placeholder={t('tasks.form.descriptionPlaceholder')}
				bind:value={description}
			></textarea>
		</label>

		<label for="taskDeadline">
			<span class="label-text">{t('tasks.form.deadline')}</span>
			<input
				type="date"
				id="taskDeadline"
				class="input"
				class:error-border={showError}
				bind:value={deadline}
				bind:this={dateInput}
				onclick={openCalendar}
			/>
		</label>
		{#if showError}
			<p class="error-text">{t('tasks.form.required')}</p>
		{/if}

		<p class="select-label">{t('tasks.form.priority')}</p>
		<div class="priorities">
			{#each PRIORITIES as priority (priority)}
				<button
					type="button"
					class="priority-btn {priority}"
					class:is-current={selectedPriority === priority}
					onclick={() => (selectedPriority = priority)}
				>
					{priorityLabel($settings.language, priority)}
				</button>
			{/each}
		</div>

		<button class="submit-form-button" type="submit">
			{t('tasks.form.create')}
		</button>
	</form>
</main>

<style>
	.error-border {
		border: 1px solid var(--accent-red) !important;
	}

	.error-text {
		color: var(--accent-red);
		font-size: 12px;
		font-weight: 800;
		margin-top: -17px;
		margin-bottom: 16px;
		margin-left: 8px;
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
	.select-label {
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
	.select-label {
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

	.textarea {
		height: 120px;
		resize: none;
		line-height: 1.5;
	}

	input[type='date']::-webkit-calendar-picker-indicator {
		display: none;
	}

	.select-label {
		margin-bottom: 16px;
	}

	.priorities {
		display: flex;
		gap: 12px;
		margin-bottom: 32px;
	}

	.priority-btn {
		flex: 1;
		padding: 14px;
		border-radius: 16px;
		border: 2px solid transparent;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--surface-primary);
		color: var(--text-muted);
	}

	.priority-btn.low.is-current {
		border-color: var(--accent-green);
		color: var(--accent-green);
		background-color: var(--state-success-bg);
	}

	.priority-btn.medium.is-current {
		border-color: var(--accent-orange);
		color: var(--accent-orange);
		background-color: var(--state-warning-bg);
	}

	.priority-btn.high.is-current {
		border-color: var(--accent-red);
		color: var(--accent-red);
		background-color: var(--state-danger-bg);
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
