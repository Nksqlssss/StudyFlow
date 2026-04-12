<script lang="ts">
  import { goto } from '$app/navigation';
  import { subjects } from '$lib/stores/subjects';
  import type { SubjectIcon } from '$lib/types';

	const { data } = $props();

	let title = $state('');
	let description = $state('');
	let selectedIcon = $state<SubjectIcon>('code');

	$effect (() => {
		let title = $state(data.subject.title);
		let description = $state(data.subject.description ?? '');
		let selectedIcon = $state<SubjectIcon>(data.subject.icon);
	})

  const ICONS: SubjectIcon[] = ['code', 'math', 'language', 'paint'];

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;

    subjects.update(data.subject.id, {
      title: title.trim(),
      icon: selectedIcon,
      description: description.trim() || undefined,
    });

    goto(`/subject/${data.subject.id}`);
  }
</script>

<header class="header">
  <a href="/subject/{data.subject.id}" class="back-link">
    <img src="/icons/arrowBack.svg" alt="">
  </a>
  <h1 class="main-title">Изменить предмет</h1>
</header>

<main class="main">
  <form class="create-subject-form" onsubmit={handleSubmit}>
    <label for="subjectName">
      <span class="label-text">Название</span>
      <input type="text" id="subjectName" class="input" placeholder="Название предмета" bind:value={title}>
    </label>

    <label for="subjectDescription">
      <span class="label-text">Описание</span>
      <textarea id="subjectDescription" class="input textarea" placeholder="Описание (необязательно)" bind:value={description}></textarea>
    </label>

    <p class="select-icon">Иконка</p>
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

    <button class="submit-form-button" type="submit">
      Сохранить изменения
    </button>
  </form>
</main>

<style>
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

  .main label, .select-icon {
    display: flex;
    flex-direction: column;
    row-gap: 8px;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .label-text, .select-icon {
    margin-left: 8px;
  }

  .input {
    padding: 18px 20px;
    background-color: #131B2E;
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
    height: 136px;
    resize: none;
    line-height: 1.5;
  }

  .select-icon {
    margin-bottom: 16px;
  }

  .icons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
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
</style>