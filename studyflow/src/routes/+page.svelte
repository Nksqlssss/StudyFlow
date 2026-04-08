<script lang="ts">
	import BottomTabbar from '$lib/components/ui/bottomTabbar.svelte';
	import SubjectCard from '$lib/components/ui/SubjectCard.svelte';
	import { subjects } from '$lib/stores/subjects';
</script>

<header class="header">
	<div class="header-left-side">
		<h1 class="main-title">
			StudyFlow
		</h1>
	</div>
	<div class="header-right-side">
		<img src="/icons/lfIcon.svg" alt="" class="lf-image">
		<div class="profile-icon">
			.
		</div>
	</div>
</header>

<main class="main">
	<section class="overview">
		<h2 class="overview-title">
			Предметы
		</h2>
		<p class="overview-description">
			Ваш текущий прогресс обучения
		</p>
	</section>

	{#each $subjects as subject (subject.id)}
		<SubjectCard {subject} />
	{:else}
		<p>Предметы не добавлены</p>
	{/each}

	<a href="/subject/new" class="add-subject-button">
		<img src="/icons/pluseIcon.svg" alt="">
	</a>
</main>

<footer class="footer">
	<BottomTabbar />
</footer>

<style>
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
		color: #1000A9;
		background: linear-gradient(135deg, #C0C1FF, #8083FF);
		box-shadow: 0 10px 30px 0 #6366F12A;
		text-decoration: none;
	}
</style>