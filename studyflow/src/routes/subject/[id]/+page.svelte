<script lang="ts">
	import { goto } from '$app/navigation';
	import BottomTabbar from '$lib/components/ui/bottomTabbar.svelte';
	import { subjects } from '$lib/stores/subjects.js';
	import { isUrgent, tasks, tasksBySubject, taskStatsBySubject } from '$lib/stores/tasks';
	import type { Task, TaskPriority } from '$lib/types.js';

	const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

	const { data } = $props();

	const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
		high: 3,
		medium: 2,
		low: 1,
	};

	function sortTasks(taskList: Task[]) {
		return [...taskList].sort((a, b) => {
			const aUrgent = isUrgent(a.deadline) ? 10 : 0;
			const bUrgent = isUrgent(b.deadline) ? 10 : 0;

			const aScore = PRIORITY_WEIGHT[a.priority] + aUrgent;
			const bScore = PRIORITY_WEIGHT[b.priority] + bUrgent;

			return bScore - aScore;
		});
	}

	const stats = $derived(
    $taskStatsBySubject.get(data.subject.id) ?? { active: 0, done: 0, total: 0, progress: 0 }
  );

	const subjectTasks = $derived(
    $tasksBySubject.get(data.subject.id) ?? []
  );

	let showModal = $state(false);
	let pendingTaskId = $state<string | null>(null);
	let isCompleting = $state(true);

	function confirmComplete(id: string) {
		const task = subjectTasks.find(t => t.id === id);
		pendingTaskId = id;
		isCompleting = task?.status !== 'done';
		showModal = true;
	}

	function handleConfirm() {
		if (pendingTaskId) {
			tasks.setStatus(pendingTaskId, isCompleting ? 'done' : 'todo');
		}
		showModal = false;
		pendingTaskId = null;
	}

	function handleCancel() {
		showModal = false;
		pendingTaskId = null;
	}

	let activeTab = $state<'active' | 'done' | 'overdue'>('active');

	const filteredTasks = $derived(() => {
		const now = new Date();
		let result: Task[];

		if (activeTab === 'done') {
			result = subjectTasks.filter(t => t.status === 'done');
		} else if (activeTab === 'overdue') {
			result = subjectTasks.filter(t => t.deadline && t.deadline < now && t.status !== 'done');
		} else {
			result = subjectTasks.filter(t => t.status !== 'done');
		}

		return sortTasks(result);
	});

	let isModalSettingsOpen = $state(false)

	function modalSettingToggle () {
		isModalSettingsOpen = !isModalSettingsOpen
	}

	function handleDelete () {
		subjects.remove(data.subject.id);
		goto('/');
	}
</script>

<header class="header">
	<a href="/" class="back-link">
		<img src="/icons/arrowBack.svg" alt="">
	</a>
	<h1 class="main-title">
		Предмет
	</h1>
	<button class="setting-button" onclick={modalSettingToggle}>
		<img src="/icons/settingsIcon.svg" alt="">
	</button>
	{#if isModalSettingsOpen}
		<div class="settings-dropdown">
			<a href="/subject/{data.subject.id}/edit" class="dropdown-btn edit">
				<img src="/icons/editIcon.svg" alt="">
				Изменить
			</a>
			<button class="dropdown-btn delete" onclick={handleDelete}>
				<img src="/icons/deleteIcon.svg" alt="">
				Удалить
			</button>
		</div>
	{/if}
</header>

<main class="main">
	<section class="hero-section">
		<div class="subject-info-wrapper">
			<div class="img-wrapper">
				<img src="/icons/{data.subject.icon}.svg" alt="">
			</div>
			<h2 class="subject-title main-title">
				{data.subject.title}
			</h2>
		</div>
		<div class="progress-info">
			<span>Прогресс</span>
			<p>{stats.progress}%</p>
		</div>
		<div class="progress-bar">
			<div class="progress-bar-inner" style="width: {stats.progress}%;"></div>
		</div>
	</section>

	<section class="tabbar">
		<button class="tabbar-link" class:is-active={activeTab === 'active'} onclick={() => activeTab = 'active'}>
			Активные
		</button>
		<button class="tabbar-link" class:is-active={activeTab === 'done'} onclick={() => activeTab = 'done'}>
			Выполненные
		</button>
		<button class="tabbar-link" class:is-active={activeTab === 'overdue'} onclick={() => activeTab = 'overdue'}>
			Просроченные
		</button>
	</section>

	<section class="tasks">
		<div class="tasks-info">
			<h3 class="tasks-title">
				Задания
			</h3>
			<div class="counter-wrapper">
				<p class="tasks-counter">
					{filteredTasks().length}
				</p>
			</div>
		</div>

		{#each filteredTasks() as task (task.id)}
			<div class="task-card" class:is-urgent={isUrgent(task.deadline) && task.status !== 'done'}>
				<div class="task-card-inner">
					<div class="task-card-left-side">
						<button
							type="button"
							class="checkbox"
							class:is-checked={task.status === 'done'}
							onclick={() => confirmComplete(task.id)}
						>
							{#if task.status === 'done'}
								✓
							{/if}
						</button>
					</div>
					<div class="task-card-medium">
						<h3 class="task-title" class:is-done={task.status === 'done'}>
							{task.title}
						</h3>
						{#if task.deadline}
							<p class="task-deadline">{task.deadline.toLocaleDateString('ru-RU')}</p>
						{/if}
					</div>
					<div class="task-priority">
						<div class="task-priority-wrapper {task.priority}">
							{task.priority}
						</div>
					</div>
				</div>
				{#if isUrgent(task.deadline) && task.status !== 'done'}
					<p class="is-urgent-massage">Осталось менее одного дня</p>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<img src="/icons/subjectsIcon.svg" alt="">
				<p class="empty-title">Заданий пока нет</p>
				<span class="empty-description">Нажмите + чтобы добавить первое задание</span>
			</div>
		{/each}
	</section>

	<a href="/subject/{data.subject.id}/task/new" class="add-task-button">
		<img src="/icons/pluseIcon.svg" alt="">
	</a>

	{#if showModal}
		<div class="modal-overlay">
			<div class="modal">
				<p class="modal-title">
					{isCompleting ? 'Задание выполнено?' : 'Отменить выполнение?'}
				</p>
				<div class="modal-buttons">
					<button class="modal-btn confirm" onclick={handleConfirm}>Да</button>
					<button class="modal-btn cancel" onclick={handleCancel}>Отмена</button>
				</div>
			</div>
		</div>
	{/if}
</main>

<footer class="footer">
	<BottomTabbar />
</footer>

<style>
	.settings-dropdown {
		position: absolute;
		top: 60px;
		right: 6px;
		background-color: #131B2E;
		border-radius: 16px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 100;
		box-shadow: 0 8px 24px 0 #00000060;
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
		background-color: #1E2A42;
	}

	.dropdown-btn img {
		width: 18px;
		height: 18px;
	}

	.dropdown-btn.edit {
		color: #C0C1FF;
	}

	.dropdown-btn.delete {
		color: #e05252;
	}

	.dropdown-btn:hover {
		background-color: #1E2A42;
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

	.modal-overlay {
		position: fixed;
		inset: 0;
		background-color: #00000080;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
	}

	.modal {
		background-color: #131B2E;
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

	.is-done {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.confirm {
		background-color: #53c08f;
		color: #fff;
	}

	.cancel {
		background-color: #e05252;
		color: #fff;
	}

	.task-card {
		padding: 20px;
		background-color: #131B2E;
		border-radius: 20px;
		margin-bottom: 12px;
	}

	.task-card-inner {
		display: flex;
		align-items: flex-start;
		gap: 16px;
	}

	.task-card-medium {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.task-title {
		font-size: 16px;
		font-weight: 800;
		line-height: 20px;
	}

	.task-priority-wrapper {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 20px;
		font-size: 12px;
		font-weight: 600;
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
		color: #1000A9;
		background: linear-gradient(135deg, #C0C1FF, #8083FF);
		box-shadow: 0 10px 30px 0 #6366F12A;
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
		background-color: #2D3449;
		border-radius: 20px;
	}

	.tasks-counter {
		font-size: 14px;
		line-height: 16px;
		color: #C6C0FF;
	}

	.tabbar {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 4px;
		border-radius: 16px;
		background-color: #131B2E;
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
		color: #C6C0FF;
	}

	.hero-section {
		position: relative;
		overflow: hidden;
		padding: 24px;
		border-radius: 20px;
		background-color: #131B2E;
		margin-bottom: 32px;
	}

	.hero-section::after {
		content: '';
		position: absolute;
		top: -20px;
		right: -20px;
		background-color: #8B80FF;
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
		background-color: #8B80FF;
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
		color: #C0C1FF;
	}

	.progress-info p {
		color: #8083FF;
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
		background: linear-gradient(90deg, #C0C1FF, #8083FF);
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

	.setting-button, .back-link {
		margin-bottom: -5px;
	}
</style>