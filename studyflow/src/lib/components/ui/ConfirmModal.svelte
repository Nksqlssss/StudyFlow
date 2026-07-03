<script lang="ts">
	const { description, onConfirm, onCancel, title, confirmText, cancelText, variant } = $props<{
		title: string;
		description?: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm: () => void;
		onCancel: () => void;
		variant?: 'danger' | 'success' | 'default';
	}>();
</script>

<div class="modal-overlay">
	<div class="modal">
		<p class="modal-title">{title}</p>
		{#if description}
			<p class="modal-description">{description}</p>
		{/if}
		<div class="modal-buttons">
			<button
				class="modal-btn confirm"
				class:danger={variant === 'danger'}
				class:success={variant === 'success'}
				class:default={variant === 'default'}
				onclick={onConfirm}
				type="button"
			>
				{confirmText}
			</button>
			<button class="modal-btn cancel" onclick={onCancel} type="button">
				{cancelText}
			</button>
		</div>
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

	.modal-buttons {
		display: flex;
		gap: 12px;
	}

	.modal-btn {
		flex: 1;
		padding: 16px;
		border-radius: 16px;
		border: none;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm.danger {
		background-color: var(--accent-red);
		color: var(--text-on-danger);
	}

	.confirm.success {
		background-color: var(--accent-success);
		color: var(--text-on-danger);
	}

	.confirm.default {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}

	.cancel {
		background-color: var(--surface-muted);
		color: var(--text-primary);
	}
</style>
