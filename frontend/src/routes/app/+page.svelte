<script lang="ts">
	import { resolve } from '$app/paths';
	import { translate, type TranslationKey } from '$lib/i18n';
	import SubjectCard from '$lib/components/ui/SubjectCard.svelte';
	import { settings } from '$lib/stores/settings';
	import { subjects } from '$lib/stores/subjects';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);
</script>

<header class="header">
	<div class="header-left-side">
		<h1 class="main-title">StudyFlow</h1>
	</div>
	<div class="header-right-side">
		<img src="/icons/lfIcon.svg" alt="" class="lf-image" />
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

	{#each $subjects as subject (subject.id)}
		<SubjectCard {subject} />
	{:else}
		<div class="empty-state">
			<img src="/icons/subjectsIcon.svg" alt="" />
			<p class="empty-title">{t('subjects.empty.title')}</p>
			{#if $settings.showTips}
				<span class="empty-description">{t('subjects.empty.description')}</span>
			{/if}
		</div>
	{/each}

	<a href={resolve('/app/subject/new')} class="add-subject-button">
		<img src="/icons/pluseIcon.svg" alt="" />
	</a>
</main>

<style>
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
		column-gap: 18px;
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
		.empty-state {
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

		.main {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			padding: 48px 56px;
		}
	}
</style>
