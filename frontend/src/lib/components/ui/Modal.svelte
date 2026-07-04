<script lang="ts">
	const { description, onConfirm, title, confirmText } = $props<{
		title: string;
		description?: string;
		confirmText?: string;
		onConfirm: () => void;
	}>();
</script>

<div class="modal-overlay">
	<div class="modal">
		<p class="modal-title">{title}</p>
		{#if description}
			<p class="modal-description">{description}</p>
		{/if}
		<button class="modal-btn confirm default" onclick={onConfirm} type="button">
			{confirmText}
		</button>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background-color: var(--overlay-bg);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 100;
	}

	.modal {
		background-color: var(--surface-primary);
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
		margin-bottom: 16px;
	}

	.modal-description {
		font-size: 14px;
		color: var(--text-secondary);
		text-align: center;
		margin-bottom: 24px;
		text-align: center;
	}

	.modal-btn {
		width: 100%;
		padding: 16px;
		border-radius: 16px;
		border: none;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm.default {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}
</style>
