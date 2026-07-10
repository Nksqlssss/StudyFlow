<script lang="ts">
	import { resolve } from '$app/paths';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { taskStatsBySubject } from '$lib/stores/tasks';
	import type { Subject } from '$lib/types';

	const { subject } = $props<{ subject: Subject }>();
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	const stats = $derived(
		$taskStatsBySubject.get(subject.id) ?? {
			active: 0,
			done: 0,
			total: 0,
			progress: 0,
			hasUrgent: false
		}
	);
</script>

<a href={resolve(`/app/subject/${subject.id}`)} class="subject">
	<div class="card-name-wrapper">
		<div class="card-info-wrapper">
			<h3 class="subject-title">
				{subject.title}
			</h3>
			<span class="card-description">
				{t('subjects.activeTasks', { count: stats.active })}
			</span>
		</div>
		<div class="icon-wrapper">
			<img src="/icons/{subject.icon}.svg" alt={subject.title} />
		</div>
	</div>
	<div class="progress-bar-info-wrapper">
		<div class="progress-bar-info">
			<span>{t('subjects.completed')}</span>
			<p>{stats.progress}%</p>
		</div>
		<div class="progress-bar">
			<div class="progress-bar-inner" style="width: {stats.progress}%"></div>
		</div>
	</div>
	{#if stats.hasUrgent}
		<p class="urgent-warning">{t('subjects.urgentWarning')}</p>
	{/if}
</a>

<style>
	.subject::after {
		content: '';
		position: absolute;
		bottom: 0px;
		right: -20px;
		background-color: var(--surface-icon-strong);
		height: 60px;
		width: 120px;
		border-radius: 50%;
		filter: blur(60px);
		opacity: 0.6;
	}

	.subject::before {
		content: '';
		position: absolute;
		top: -20px;
		left: -20px;
		background-color: var(--surface-icon-strong);
		height: 60px;
		width: 120px;
		border-radius: 50%;
		filter: blur(60px);
		opacity: 0.6;
	}

	.urgent-warning {
		font-size: 12px;
		font-weight: 800;
		color: var(--accent-red);
		margin-top: 12px;
	}

	.icon-wrapper {
		width: var(--subject-card-icon-size);
		height: var(--subject-card-icon-size);
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: var(--bg-icon);
		border-radius: 8px;
	}

	.subject {
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		background-color: var(--surface-primary);
		padding: var(--subject-card-padding);
		border-radius: 20px;
		margin-top: 16px;
		text-decoration: none;
	}

	@media (min-width: 1024px) {
		.subject {
			height: 100%;
			min-height: var(--subject-card-min-height);
			margin-top: 0;
		}
	}

	.card-name-wrapper {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--subject-card-header-gap);
	}

	.card-info-wrapper {
		display: flex;
		flex-direction: column;
		row-gap: var(--subject-card-gap);
	}

	.subject-title {
		font-size: var(--subject-card-title-size);
		font-weight: 700;
		line-height: 24px;
		color: var(--text-secondary);
	}

	.card-description {
		font-size: var(--subject-card-meta-size);
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
		font-size: var(--subject-card-meta-size);
		font-weight: 700;
		line-height: 16px;
	}

	.progress-bar-info span {
		color: var(--text-accent);
	}

	.progress-bar-info p {
		font-size: var(--subject-card-progress-size);
		color: var(--text-accent-strong);
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
		background: var(--gradient-primary);
	}
</style>
