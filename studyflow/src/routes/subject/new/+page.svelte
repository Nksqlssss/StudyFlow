<script lang="ts">
	import { goto } from '$app/navigation';
	import { subjects } from '$lib/stores/subjects';
	import type { SubjectIcon } from '$lib/types';

	let title = $state('');
	let description = $state('');
	let selectedIcon = $state<SubjectIcon>('code');

	const ICONS: SubjectIcon[] = ['code', 'math', 'language', 'paint'];

	function handleSubmit(e: Event) {
		e.preventDefault()
		if (!title.trim()) return;

		subjects.add(title.trim(), selectedIcon, description.trim() || undefined);
		goto('/');
	}
</script>

<header class="header">
	<a href="/" class="back-link">
		<img src="/icons/arrowBack.svg" alt="">
	</a>
	<h1 class="main-title">
		Создать предмет
	</h1>
</header>

<main class="main">
	<form class="create-subject-form" onsubmit={handleSubmit}>
		<label for="subjectName">
			<span class="label-text">Название</span>
			<input type="text" id='subjectName' class="subject-name-input" placeholder="Название предмета" bind:value={title}>
		</label>
		<label for="subjectDescription">
			<span class="label-text">Описание</span>
			<textarea id='subjectDescription' class="subject-description-input" placeholder="Описание (необязательно)" bind:value={description}></textarea>
		</label>
		<p class="select-icon">
			Иконка
		</p>
		<div class="icons">
		{#each ICONS as icon}
			<button
				type="button"
				class="icon-wrapper"
				class:is-current={selectedIcon === icon}
				onclick={() => selectedIcon = icon}
			>
				<img src="/icons/{icon}.svg" alt={icon} width="25" height="25">
			</button>
		{/each}
</div>

		<div class="study-massage">
			<div class="tooltip-wrapper">
				<img src="/icons/tooltipIcon.svg" alt="">
			</div>
			<div class="tooltip-info">
				<p class="tooltip-title">
					Совет от StudyFlow
				</p>
				<span class="massage-text">
					Выбирайте иконку, которая лучше всего ассоциируется с вашим предметом для быстрого визуального поиска.
				</span>
			</div>
		</div>

		<button class="submit-form-button" type="submit">
			Создать предмет
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
		background-color: #222A3EA5;
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
		background-color: #292a4fa1;
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
		background: linear-gradient(90deg, #C0C1FF, #8083FF);
		border: none;
		outline: none;
		font-size: 16px;
		font-weight: 700;
		line-height: 24px;
		color: #150066;
		box-shadow: 0 10px 20px 0 #8083FF2A;
	}

	.main {
		padding: 32px 24px;
	}

	.main label, textarea, .select-icon {
		display: flex;
		flex-direction: column;
		row-gap: 8px;
		font-size: 14px;
		font-weight: 400;
		line-height: 20px;
		color: var(--text-muted);
	}

	.label-text, .select-icon{
		margin-left: 8px;
	}

	.select-icon {
		margin-bottom: 16px;
	}

	.subject-name-input, .subject-description-input {
		padding: 18px 20px;
		background-color: #131B2E;
		border: none;
		outline: none;
		border-radius: 20px;
		font-size: 16px;
		font-weight: 500;
		color: var(--text-muted);
		margin-bottom: 24px;
	}

	.subject-description-input {
		height: 136px;
		font-family: var(--font-main);
		font-weight: 400;
		line-height: 1.5;
		resize: none;
	}

	.subject-name-input::placeholder, .subject-description-input::placeholder {
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
		background-color: #131B2E;
		cursor: pointer;
		border: none;
	}

	.is-current {
		border: 2px #C6C0FF solid;
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