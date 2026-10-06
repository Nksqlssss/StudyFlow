<script lang="ts">
	import { resolve } from '$app/paths';
	import SubjectCard from '$lib/components/ui/SubjectCard.svelte';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { subjectError, subjectLoading, subjects } from '$lib/stores/subjects';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	let searchingSubject = $state('');
	const normalizedSearchingSubject = $derived(searchingSubject.toLowerCase().trim());
	const filteredSubjects = $derived(
		$subjects.filter((subject) => subject.title.toLowerCase().includes(normalizedSearchingSubject))
	);
</script>

<header class="header">
	<div class="header-left-side">
		<h1 class="main-title">StudyFlow</h1>
	</div>
	<div class="header-right-side">
		<div class="subject-search" aria-label={t('subjects.search.label')}>
			<input
				type="search"
				placeholder={t('subjects.search.placeholder')}
				bind:value={searchingSubject}
			/>
			<div class="subject-search-image">
				<img src="/icons/lfIcon.svg" alt="" />
			</div>
		</div>
		<div class="profile-icon">.</div>
	</div>
</header>

<main class="main">
	<section class="overview">
		<h2 class="overview-title">
			{t('subjects.title')}
		</h2>
		<p class="overview-description">
			{t('subjects.overview')}
		</p>
	</section>

	{#if $subjectLoading}
		<div class="state-card loading-state">
			<div class="loader" aria-hidden="true"></div>
			<p>{t('subjects.loading')}</p>
		</div>
	{:else if $subjectError !== null}
		<div class="state-card error-state">
			<div class="state-icon">!</div>
			<div class="state-content">
				<p class="state-title">{t('subjects.error.title')}</p>
				<span class="state-description">{t('subjects.error.description')}</span>
				<span class="state-details">{$subjectError}</span>
			</div>
			<button
				class="retry-button"
				type="button"
				onclick={() => {
					if ($auth.token === null) return;
					subjects.load($auth.token);
				}}>{t('subjects.error.retry')}</button
			>
		</div>
	{:else if $subjects.length === 0}
		<div class="empty-state">
			<img src="/icons/subjectsIcon.svg" alt="" />
			<p class="empty-title">{t('subjects.empty.title')}</p>
			{#if $settings.showTips}
				<span class="empty-description">{t('subjects.empty.description')}</span>
			{/if}
		</div>
	{:else if filteredSubjects.length === 0}
		<div class="empty-state search-empty-state">
			<img src="/icons/lfIcon.svg" alt="" />
			<p class="empty-title">{t('subjects.search.empty')}</p>
		</div>
	{:else}
		{#each filteredSubjects as subject (subject.id)}
			<SubjectCard {subject} />
		{/each}
	{/if}

	<a href={resolve('/app/subject/new')} class="add-subject-button">
		<img src="/icons/pluseIcon.svg" alt="" />
	</a>
</main>

<style>
	.state-card {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 20px;
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

	.state-description,
	.state-details {
		color: var(--text-secondary);
		font-size: 13px;
		line-height: 18px;
	}

	.state-details {
		color: var(--state-danger-soft-text);
		overflow-wrap: anywhere;
	}

	.retry-button {
		flex: 0 0 auto;
		min-height: 40px;
		padding: 0 16px;
		border: none;
		border-radius: 14px;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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

	.search-empty-state img {
		width: 28px;
		height: 28px;
		opacity: 0.75;
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

	.main {
		padding: 32px 24px 108px 24px;
	}

	.overview-title {
		font-size: 22px;
		font-weight: 900;
		letter-spacing: -0.55px;
		line-height: 33px;
		color: var(--text-secondary);
	}

	.overview-description {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 1.1px;
		line-height: 16px;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.header {
		max-height: 64px;
		height: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		background-color: var(--bg-secondary);
	}

	.header-right-side {
		display: flex;
		align-items: center;
		column-gap: 12px;
	}

	.subject-search {
		display: flex;
		align-items: center;
		width: min(52vw, 280px);
		height: 40px;
		padding: 4px;
		border: 1px solid var(--border-primary);
		border-radius: 16px;
		background-color: var(--surface-primary);
		box-shadow: 0 10px 24px var(--shadow-panel);
	}

	.subject-search input {
		min-width: 0;
		flex: 1;
		height: 100%;
		padding: 0 10px 0 12px;
		border: none;
		outline: none;
		background-color: transparent;
		color: var(--text-primary);
		font-family: var(--font-main);
		font-size: 13px;
		font-weight: 600;
	}

	.subject-search input::placeholder {
		color: var(--text-muted);
	}

	.subject-search-image {
		display: flex;
		justify-content: center;
		align-items: center;
		flex: 0 0 auto;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 12px;
		background: var(--gradient-primary);
		cursor: pointer;
	}

	.subject-search-image img {
		width: 17px;
		height: 17px;
	}

	.profile-icon {
		width: 28px;
		height: 28px;
		display: flex;
		justify-content: center;
		background-color: var(--bg-primary);
		border-radius: 50%;
	}

	.add-subject-button {
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

	@media (min-width: 768px) {
		.header {
			padding: 24px 40px;
		}

		.subject-search {
			width: 320px;
			height: 44px;
			border-radius: 18px;
		}

		.subject-search-image {
			width: 36px;
			height: 36px;
			border-radius: 14px;
		}

		.main {
			padding: 40px;
		}

		.overview {
			margin-bottom: 8px;
		}
	}

	@media (min-width: 1024px) {
		.main {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 20px;
			align-items: start;
		}

		.overview,
		.empty-state,
		.state-card {
			grid-column: 1 / -1;
		}

		.add-subject-button {
			right: 40px;
			bottom: 40px;
		}
	}

	@media (min-width: 1280px) {
		.header {
			padding-inline: 56px;
		}

		.subject-search {
			width: 380px;
		}

		.main {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			padding: 48px 56px;
		}
	}
</style>
