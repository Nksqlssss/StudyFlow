<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { subjects } from '$lib/stores/subjects';
	import type { SubjectIcon } from '$lib/types';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	let title = $state('');
	let selectedIcon = $state<SubjectIcon>('code');

	const ICONS: SubjectIcon[] = ['code', 'math', 'language', 'paint'];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!title.trim()) return;

		if (!$auth.token) {
			goto(resolve('/login'));
			return;
		}

		await subjects.add(
			{
				title: title.trim(),
				icon: selectedIcon
			},
			$auth.token
		);

		goto(resolve('/app'));
	}
</script>

<header class="header">
	<a href={resolve('/app')} class="back-link">
		<img src="/icons/arrowBack.svg" alt="" />
	</a>
	<h1 class="main-title">
		{t('subjects.create.title')}
	</h1>
</header>

<main class="main">
	<form class="create-subject-form" onsubmit={handleSubmit}>
		<label for="subjectName">
			<span class="label-text">{t('subjects.form.name')}</span>
			<input
				type="text"
				id="subjectName"
				class="subject-name-input"
				placeholder={t('subjects.form.namePlaceholder')}
				bind:value={title}
			/>
		</label>
		<p class="select-icon">
			{t('subjects.form.icon')}
		</p>
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

		{#if $settings.showTips}
			<div class="study-massage">
				<div class="tooltip-wrapper">
					<img src="/icons/tooltipIcon.svg" alt="" />
				</div>
				<div class="tooltip-info">
					<p class="tooltip-title">
						{t('subjects.form.tipTitle')}
					</p>
					<span class="massage-text">
						{t('subjects.form.tipText')}
					</span>
				</div>
			</div>
		{/if}

		<button class="submit-form-button" type="submit">
			{t('subjects.form.create')}
		</button>
	</form>
</main>

<style>
	.study-massage {
		display: flex;
		align-items: start;
		column-gap: 16px;
		margin-block: 32px 24px;
		padding: 20px;
		background-color: var(--surface-secondary);
		border-radius: 20px;
	}

	.tooltip-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: var(--surface-icon);
	}

	.tooltip-wrapper img {
		width: 22px;
		aspect-ratio: 1;
	}

	.tooltip-title {
		font-size: 14px;
		font-weight: 700;
		line-height: 20px;
		color: var(--text-muted);
	}

	.massage-text {
		font-size: 12px;
		font-weight: 500;
		line-height: 20px;
		color: var(--text-secondary);
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
	}

	.label-text,
	.select-icon {
		margin-left: 8px;
	}

	.select-icon {
		margin-bottom: 16px;
	}

	.subject-name-input {
		padding: 18px 20px;
		background-color: var(--surface-primary);
		border: none;
		outline: none;
		border-radius: 20px;
		font-size: 16px;
		font-weight: 500;
		color: var(--text-muted);
		margin-bottom: 24px;
	}

	.subject-name-input::placeholder {
		color: var(--text-secondary);
	}

	.icons {
		display: flex;
		justify-content: space-between;
		align-items: center;
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
</style>
