<script lang="ts">
	import { taskStatsBySubject } from '$lib/stores/tasks';
	import type { Subject } from '$lib/types';

  const { subject } = $props<{ subject: Subject }>();

  const stats = $derived(
    $taskStatsBySubject.get(subject.id) ?? { active: 0, done: 0, total: 0, progress: 0 }
  );
</script>

<a href="/subject/{subject.id}" class="subject">
	<div class="card-name-wrapper">
		<div class="card-info-wrapper">
			<h3 class="subject-title">
				{subject.title}
			</h3>
			<span class="card-description">
				Активных заданий: {stats.active}
			</span>
		</div>
		<div class="icon-wrapper">
			<img src="/icons/{subject.icon}.svg" alt={subject.title} />
		</div>
	</div>
	<div class="progress-bar-info">
		<span>Выполнено:</span>
		<p>{stats.progress}%</p>
	</div>
	<div class="progress-bar">
		<div class="progress-bar-inner" style="width: {stats.progress}%"></div>
	</div>
</a>

<style>
	.icon-wrapper {
		width: 36px;
		height: 38px;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--bg-icon);
		border-radius: 8px;
	}

	.subject {
		display: block;
		background-color: #131B2E;
		padding: 20px;
		border-radius: 20px;
		margin-top: 16px;
		text-decoration: none;
	}

	.card-name-wrapper {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.card-info-wrapper {
		display: flex;
		flex-direction: column;
		row-gap: 4px;
	}

	.subject-title {
		font-size: 16px;
		font-weight: 700;
		line-height: 24px;
		color: var(--text-secondary);
	}

	.card-description {
		font-size: 14px;
		font-weight: 500;
		line-height: 20px;
		color: var(--text-secondary);
	}

	.progress-bar-info {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 700;
		line-height: 16px;
	}

	.progress-bar-info span {
		color: #C0C1FF;
	}

	.progress-bar-info p {
		font-size: 16px;
		color: #8083FF;
	}

	.progress-bar {
		width: 100%;
		height: 6px;
		border-radius: 20px;
		background-color: var(--bg-secondary);
	}

	.progress-bar-inner {
		height: 6px;
		border-radius: 20px;
		background: linear-gradient(90deg, #C0C1FF, #8083FF);
	}
</style>