<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { formatDate, priorityLabel, translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { subjectError, subjectLoaded, subjectLoading, subjects } from '$lib/stores/subjects.js';
	import {
		isUrgent,
		taskError,
		tasks,
		tasksBySubject,
		taskStatsBySubject
	} from '$lib/stores/tasks';
	import type { Task, TaskPriority } from '$lib/types.js';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
	const subjectId = $derived(page.params.id);
	const subject = $derived($subjects.find((s) => s.id === subjectId));
	const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
		high: 3,
		medium: 2,
		low: 1
	};

	function sortTasks(taskList: Task[]) {
		return [...taskList].sort((a, b) => {
			const aUrgent = isUrgent(a.deadline, $settings.urgentThresholdHours) ? 10 : 0;
			const bUrgent = isUrgent(b.deadline, $settings.urgentThresholdHours) ? 10 : 0;

			const aScore = PRIORITY_WEIGHT[a.priority] + aUrgent;
			const bScore = PRIORITY_WEIGHT[b.priority] + bUrgent;

			return bScore - aScore;
		});
	}

	const stats = $derived.by(() => {
		if (!subjectId) return { active: 0, done: 0, total: 0, progress: 0 };
		return $taskStatsBySubject.get(subjectId) ?? { active: 0, done: 0, total: 0, progress: 0 };
	});

	const subjectTasks = $derived.by(() => {
		if (!subjectId) return [];
		return $tasksBySubject.get(subjectId) ?? [];
	});

	let showConfirmModal = $state(false);
	let showDeleteModal = $state(false);
	let pendingTaskId = $state<string | null>(null);
	let isCompleting = $state(true);

	function confirmComplete(id: string) {
		taskError.set(null);
		const task = subjectTasks.find((t) => t.id === id);
		pendingTaskId = id;
		isCompleting = task?.status !== 'done';
		showConfirmModal = true;
	}

	async function handleConfirm() {
		try {
			if (pendingTaskId) {
				if (!$auth.token) return;

				await tasks.setStatus($auth.token, pendingTaskId, isCompleting ? 'done' : 'in_progress');
			}
			showConfirmModal = false;
			pendingTaskId = null;
		} catch (error) {}
	}

	function handleCancel() {
		showConfirmModal = false;
		pendingTaskId = null;
	}

	type TaskTab = 'active' | 'done' | 'overdue';
	type TaskListItem = { type: 'task'; task: Task } | { type: 'completed-divider' };

	let activeTab = $state<TaskTab>('active');

	const filteredTasks = $derived(() => {
		const now = new Date();
		let result: Task[];

		if (activeTab === 'done') {
			result = subjectTasks.filter((t) => t.status === 'done');
		} else if (activeTab === 'overdue') {
			result = subjectTasks.filter((t) => t.deadline && t.deadline < now && t.status !== 'done');
		} else {
			result = subjectTasks.filter((t) => !t.deadline || t.deadline > now || t.status === 'done');

			if ($settings.completedTasksVisibility !== 'active_list') {
				result = result.filter((t) => t.status !== 'done');
			}
		}

		return sortTasks(result);
	});

	const taskListItems = $derived((): TaskListItem[] => {
		const tasks = filteredTasks();

		if (activeTab !== 'active' || $settings.completedTasksVisibility !== 'active_list') {
			return tasks.map((task) => ({ type: 'task', task }));
		}

		const activeTasks = tasks.filter((task) => task.status !== 'done');
		const doneTasks = tasks.filter((task) => task.status === 'done');

		if (doneTasks.length === 0) {
			return activeTasks.map((task) => ({ type: 'task', task }));
		}

		return [
			...activeTasks.map((task) => ({ type: 'task' as const, task })),
			{ type: 'completed-divider' },
			...doneTasks.map((task) => ({ type: 'task' as const, task }))
		];
	});

	let isModalSettingsOpen = $state(false);
	let isErrorModalOpen = $state(false);
	let deleteError: Error | undefined = $state();

	function modalSettingToggle() {
		isModalSettingsOpen = !isModalSettingsOpen;
	}

	function toggleDeleteModal() {
		showDeleteModal = true;
		isModalSettingsOpen = false;
	}

	async function handleDelete() {
		if (!$auth.token) {
			goto(resolve('/login'));
			return;
		}
		if (!subjectId) return;

		try {
			await subjects.remove(subjectId, $auth.token);
			tasks.removeBySubject(subjectId);
			showDeleteModal = false;
			goto(resolve('/app'));
		} catch (error) {
			if (!(error instanceof Error)) return;
			isErrorModalOpen = true;
			deleteError = error;
			showDeleteModal = false;
		}
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		isModalSettingsOpen = false;
	}

	const EMPTY_STATE_BY_TAB: Record<
		TaskTab,
		{
			title: TranslationKey;
			description: TranslationKey;
		}
	> = {
		active: {
			title: 'tasks.empty.active.title',
			description: 'tasks.empty.active.description'
		},
		done: {
			title: 'tasks.empty.done.title',
			description: 'tasks.empty.done.description'
		},
		overdue: {
			title: 'tasks.empty.overdue.title',
			description: 'tasks.empty.overdue.description'
		}
	};
</script>

<header class="header">
	<a href={resolve('/app')} class="back-link">
		<img src="/icons/arrowBack.svg" alt="" />
	</a>
	<h1 class="main-title">
		{t('subjects.detail.title')}
	</h1>
	{#if subject}
		<button class="setting-button" onclick={modalSettingToggle}>
			<img src="/icons/settingsIcon.svg" alt="" />
		</button>
	{/if}
	{#if subject && isModalSettingsOpen}
		<div class="settings-dropdown">
			<a href={resolve(`/app/subject/${subjectId}/edit`)} class="dropdown-btn edit">
				<img src="/icons/editIcon.svg" alt="" />
				{t('common.edit')}
			</a>
			<button class="dropdown-btn delete" onclick={toggleDeleteModal}>
				<img src="/icons/deleteIcon.svg" alt="" />
				{t('common.delete')}
			</button>
		</div>
	{/if}
</header>

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
		<section class="hero-section">
			<div class="subject-info-wrapper">
				<div class="img-wrapper">
					<img src="/icons/{subject.icon}.svg" alt="" />
				</div>
				<h2 class="subject-title main-title">
					{subject.title}
				</h2>
			</div>
			<div class="progress-info">
				<span>{t('subjects.detail.progress')}</span>
				<p>{stats.progress}%</p>
			</div>
			<div class="progress-bar">
				<div class="progress-bar-inner" style="width: {stats.progress}%;"></div>
			</div>
		</section>

		<section class="tabbar">
			<button
				class="tabbar-link"
				class:is-active={activeTab === 'active'}
				onclick={() => (activeTab = 'active')}
			>
				{t('tasks.tabs.active')}
			</button>
			<button
				class="tabbar-link"
				class:is-active={activeTab === 'done'}
				onclick={() => (activeTab = 'done')}
			>
				{t('tasks.tabs.done')}
			</button>
			<button
				class="tabbar-link"
				class:is-active={activeTab === 'overdue'}
				onclick={() => (activeTab = 'overdue')}
			>
				{t('tasks.tabs.overdue')}
			</button>
		</section>

		<section class="tasks">
			<div class="tasks-info">
				<h3 class="tasks-title">
					{t('tasks.title')}
				</h3>
				<div class="counter-wrapper">
					<p class="tasks-counter">
						{filteredTasks().length}
					</p>
				</div>
			</div>

			{#each taskListItems() as item, index (item.type === 'task' ? item.task.id : `divider-${index}`)}
				{#if item.type === 'completed-divider'}
					<div class="completed-divider">
						<span>{t('tasks.completedDivider')}</span>
					</div>
				{:else}
					<div
						class="task-card"
						class:is-urgent={isUrgent(item.task.deadline, $settings.urgentThresholdHours) &&
							item.task.status !== 'done'}
					>
						<div class="task-card-inner">
							<div class="task-card-left-side">
								<button
									type="button"
									class="checkbox"
									class:is-checked={item.task.status === 'done'}
									onclick={() => confirmComplete(item.task.id)}
								>
									{#if item.task.status === 'done'}
										✓
									{/if}
								</button>
							</div>
							<a
								href={resolve(`/app/subject/${subjectId}/assignment/${item.task.id}`)}
								class="task-card-link"
							>
								<div class="task-card-medium">
									<h3 class="task-title" class:is-done={item.task.status === 'done'}>
										{item.task.title}
									</h3>
									{#if item.task.deadline}
										<p class="task-deadline">
											{formatDate(item.task.deadline, $settings.language)}
										</p>
									{/if}
								</div>
								<div class="task-priority">
									<div class="task-priority-wrapper {item.task.priority}">
										{priorityLabel($settings.language, item.task.priority)}
									</div>
								</div>
								{#if isUrgent(item.task.deadline, $settings.urgentThresholdHours) && item.task.status !== 'done'}
									<p class="is-urgent-massage">{t('subjects.urgentWarning')}</p>
								{/if}
							</a>
						</div>
					</div>
				{/if}
			{:else}
				<div class="empty-state">
					<img src="/icons/subjectsIcon.svg" alt="" />
					<p class="empty-title">{t(EMPTY_STATE_BY_TAB[activeTab].title)}</p>
					{#if $settings.showTips}
						<span class="empty-description">
							{t(EMPTY_STATE_BY_TAB[activeTab].description)}
						</span>
					{/if}
				</div>
			{/each}
		</section>

		<a href={resolve(`/app/subject/${subjectId}/task/new`)} class="add-task-button">
			<img src="/icons/pluseIcon.svg" alt="" />
		</a>

		{#if showConfirmModal}
			<ConfirmModal
				title={isCompleting ? t('tasks.complete.title') : t('tasks.reopen.title')}
				description={t('tasks.complete.description')}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
				confirmText={t('common.confirm')}
				cancelText={t('common.cancel')}
				variant="success"
				error={$taskError}
			/>
		{/if}

		{#if showDeleteModal}
			<ConfirmModal
				title={t('subjects.delete.title')}
				description={t('common.deleteIrreversible')}
				onConfirm={handleDelete}
				onCancel={handleDeleteCancel}
				confirmText={t('common.confirm')}
				cancelText={t('common.cancel')}
				variant="danger"
			/>
		{/if}

		{#if isErrorModalOpen && deleteError}
			<Modal
				title={deleteError.name}
				description={deleteError.message}
				onConfirm={() => (isErrorModalOpen = false)}
				confirmText={t('common.continue')}
			/>
		{/if}
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

	.settings-dropdown {
		position: absolute;
		top: 60px;
		right: 6px;
		background-color: var(--surface-primary);
		border-radius: 16px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 100;
		box-shadow: 0 8px 24px 0 var(--shadow-panel);
		min-width: 175px;
	}

	.dropdown-btn {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border-radius: 16px;
		border: none;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--surface-secondary);
	}

	.dropdown-btn img {
		width: 18px;
		height: 18px;
	}

	.dropdown-btn.edit {
		color: var(--text-accent);
	}

	.dropdown-btn.delete {
		color: var(--accent-red);
	}

	.dropdown-btn:hover {
		background-color: var(--surface-secondary);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 25px 0;
		border: 1px dashed var(--text-secondary);
		border-radius: 20px;
		margin-top: 20px;
	}

	.empty-state img {
		margin-bottom: 12px;
	}

	.empty-title {
		font-size: 18px;
		font-weight: 700;
		margin-bottom: 12px;
		color: var(--text-secondary);
	}

	.empty-description {
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.is-urgent-massage {
		margin-top: 16px;
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-red);
	}

	.is-urgent {
		border: 1.5px solid var(--accent-red);
	}

	.is-done {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.task-card {
		padding: var(--task-card-padding);
		background-color: var(--surface-primary);
		border-radius: var(--task-card-radius);
		margin-bottom: 12px;
		transition:
			transform 0.2s ease,
			background-color 0.2s ease;
	}

	.task-card:hover {
		background-color: var(--surface-tertiary);
		transform: translateY(-1px);
	}

	.task-card-inner {
		display: flex;
		align-items: flex-start;
		gap: var(--task-card-gap);
	}

	.task-card-left-side {
		position: relative;
		z-index: 2;
		padding-top: 2px;
	}

	.checkbox {
		width: var(--task-checkbox-size);
		height: var(--task-checkbox-size);
	}

	.task-card-link {
		flex: 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--task-card-gap);
		color: inherit;
		text-decoration: none;
	}

	.task-card-medium {
		display: flex;
		flex-direction: column;
		gap: var(--task-card-gap);
		min-width: 0;
	}

	.task-title {
		font-size: var(--task-card-title-size);
		font-weight: 800;
		line-height: var(--task-line-height);
		overflow-wrap: anywhere;
	}

	.task-deadline {
		font-size: var(--task-card-meta-size);
		color: var(--text-muted);
	}

	.task-priority-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 4px 10px;
		border-radius: var(--task-card-radius);
		font-size: var(--task-card-meta-size);
		font-weight: 600;
	}

	.task-priority {
		display: flex;
		justify-content: flex-end;
	}

	.completed-divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 18px 0 14px;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.completed-divider::before,
	.completed-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background-color: var(--border-primary);
	}

	.completed-divider span {
		white-space: nowrap;
	}

	.empty-state {
		text-align: center;
		color: var(--text-muted);
		font-size: 14px;
		padding: 32px 0;
	}

	.add-task-button {
		position: fixed;
		right: 16px;
		bottom: 92px;
		width: 56px;
		height: 56px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 20px;
		border: none;
		outline: none;
		font-size: 30px;
		color: var(--text-on-accent-strong);
		background: var(--gradient-primary-diagonal);
		box-shadow: 0 10px 30px 0 var(--shadow-accent-soft);
		text-decoration: none;
	}

	.tasks-info {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 20px;
		font-weight: 700;
		line-height: 28px;
		letter-spacing: -0.5px;
		margin-bottom: 24px;
	}

	.counter-wrapper {
		padding: 4px 12px;
		background-color: var(--surface-muted);
		border-radius: 20px;
	}

	.tasks-counter {
		font-size: 14px;
		line-height: 16px;
		color: var(--border-accent);
	}

	.tabbar {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px;
		border-radius: 16px;
		background-color: var(--surface-primary);
		font-size: 12px;
		font-weight: 500;
		margin-bottom: 32px;
	}

	.tabbar-link {
		padding: 16px;
		border-radius: 16px;
		color: var(--text-secondary);
		border: none;
		outline: none;
		background-color: transparent;
	}

	.is-active {
		background-color: var(--bg-icon);
		color: var(--border-accent);
	}

	.hero-section {
		position: relative;
		overflow: hidden;
		padding: 24px;
		border-radius: 20px;
		background-color: var(--surface-primary);
		margin-bottom: 32px;
	}

	.hero-section::after {
		content: '';
		position: absolute;
		top: -20px;
		right: -20px;
		background-color: var(--surface-icon-strong);
		height: 60px;
		width: 120px;
		border-radius: 50%;
		filter: blur(60px);
		opacity: 0.6;
	}

	.hero-section::before {
		content: '';
		position: absolute;
		bottom: 0px;
		left: -20px;
		background-color: var(--surface-icon-strong);
		height: 60px;
		width: 120px;
		border-radius: 50%;
		filter: blur(60px);
		opacity: 0.6;
	}

	.subject-info-wrapper {
		display: flex;
		align-items: center;
		column-gap: 16px;
		margin-bottom: 24px;
	}

	.subject-info-wrapper img {
		width: 18px;
		height: 18px;
	}

	.img-wrapper {
		width: 48px;
		height: 48px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--bg-icon);
		border-radius: 12px;
	}

	.progress-info {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 600;
		line-height: 16px;
		letter-spacing: 0.6px;
	}

	.progress-info span {
		color: var(--text-accent);
	}

	.progress-info p {
		color: var(--text-accent-strong);
		font-size: 16px;
	}

	.progress-bar {
		width: 100%;
		height: 6px;
		border-radius: 12px;
		background-color: var(--bg-secondary);
	}

	.progress-bar-inner {
		height: 6px;
		border-radius: 20px;
		background: var(--gradient-primary);
	}

	.main {
		padding: 32px 24px 108px 24px;
	}

	.header {
		max-height: 64px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 32px 24px;
		background-color: var(--bg-secondary);
	}

	.setting-button {
		border: none;
		outline: none;
		background-color: transparent;
	}

	.setting-button,
	.back-link {
		margin-bottom: -5px;
	}

	@media (min-width: 768px) {
		.header {
			padding: 32px 40px;
		}

		.main {
			padding: 40px;
		}

		.add-task-button {
			right: 40px;
			bottom: 40px;
		}
	}

	@media (min-width: 1024px) {
		.main {
			display: grid;
			grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
			gap: 32px;
			align-items: start;
		}

		.hero-section {
			position: sticky;
			top: 32px;
			grid-row: 1 / span 2;
			margin-bottom: 0;
		}

		.tabbar,
		.tasks {
			grid-column: 2;
		}

		.tabbar {
			margin-bottom: 24px;
		}
	}

	@media (min-width: 1280px) {
		.header {
			padding-inline: 56px;
		}

		.main {
			grid-template-columns: minmax(320px, 420px) minmax(0, 760px);
			padding: 48px 56px;
		}
	}
</style>
