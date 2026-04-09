<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { tasks } from '$lib/stores/tasks';
  import type { TaskPriority } from '$lib/types';

  const subjectId = $derived($page.params.id ?? '');

  let title = $state('');
  let description = $state('');
  let deadline = $state('');
	let showError = $state(false);
  let selectedPriority = $state<TaskPriority>('medium');

  const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

  const PRIORITY_LABELS: Record<TaskPriority, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
  };

  let dateInput: HTMLInputElement;

  function openCalendar() {
    if (dateInput.showPicker) {
      dateInput.showPicker();
    } else {
      dateInput.focus();
    }
  }

  function handleSubmit(e: Event) {
		e.preventDefault();
		if (!title.trim()) return;
		if (!deadline) {
			showError = true;
			return;
		}

		tasks.add({
			subjectId,
			title: title.trim(),
			description: description.trim() || undefined,
			priority: selectedPriority,
			deadline: new Date(deadline),
		});

		goto(`/subject/${subjectId}`);
	}
</script>

<header class="header">
  <a href="/subject/{subjectId}" class="back-link">
    <img src="/icons/arrowBack.svg" alt="">
  </a>
  <h1 class="main-title">Новое задание</h1>
</header>

<main class="main">
  <form class="create-task-form" onsubmit={handleSubmit}>
    <label for="taskTitle">
      <span class="label-text">Название</span>
      <input type="text" id="taskTitle" class="input" placeholder="Название задания" bind:value={title}>
    </label>

    <label for="taskDescription">
      <span class="label-text">Описание</span>
      <textarea id="taskDescription" class="input textarea" placeholder="Описание (необязательно)" bind:value={description}></textarea>
    </label>

    <label for="taskDeadline">
      <span class="label-text">Дедлайн</span>
      <input
        type="date"
        id="taskDeadline"
        class="input"
				class:error-border={showError}
        bind:value={deadline}
        bind:this={dateInput}
        onclick={openCalendar}
      >
    </label>
		{#if showError}
			<p class="error-text">Это поле является обязательным</p>
		{/if}

    <p class="select-label">Приоритет</p>
    <div class="priorities">
      {#each PRIORITIES as priority}
        <button
          type="button"
          class="priority-btn {priority}"
          class:is-current={selectedPriority === priority}
          onclick={() => selectedPriority = priority}
        >
          {PRIORITY_LABELS[priority]}
        </button>
      {/each}
    </div>

    <button class="submit-form-button" type="submit">
      Создать задание
    </button>
  </form>
</main>

<style>
	.error-border {
		border: 1px solid var(--accent-red) !important; 
	}

	.error-text {
		color: var(--accent-red);
		font-size: 12px;
		font-weight: 800;
		margin-top: -17px;
		margin-bottom: 16px;
		margin-left: 8px;
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

  .main {
    padding: 32px 24px;
  }

  .main label, .select-label {
    display: flex;
    flex-direction: column;
    row-gap: 8px;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    color: var(--text-muted);
    margin-bottom: 24px;
  }

  .label-text, .select-label {
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
    height: 120px;
    resize: none;
    line-height: 1.5;
  }

  input[type="date"]::-webkit-calendar-picker-indicator {
    display: none;
  }

  .select-label {
    margin-bottom: 16px;
  }

  .priorities {
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
  }

  .priority-btn {
    flex: 1;
    padding: 14px;
    border-radius: 16px;
    border: 2px solid transparent;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background-color: #131B2E;
    color: var(--text-muted);
  }

  .priority-btn.low.is-current {
    border-color: #4caf82;
    color: #4caf82;
    background-color: #1a2e1a;
  }

  .priority-btn.medium.is-current {
    border-color: #f5a623;
    color: #f5a623;
    background-color: #2e2a1a;
  }

  .priority-btn.high.is-current {
    border-color: #e05252;
    color: #e05252;
    background-color: #2e1a1a;
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