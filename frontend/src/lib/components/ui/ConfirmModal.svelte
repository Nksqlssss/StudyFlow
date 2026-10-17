<script lang="ts">
	type Props = {
		title: string;
		description?: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
		variant?: 'danger' | 'success' | 'default';
		error?: string | null;
	};

	const {
		description,
		onConfirm,
		onCancel,
		title,
		confirmText,
		cancelText,
		variant,
		error
	}: Props = $props();

	let isPending = $state(false);

	async function handleConfirm() {
		if (isPending) return;

		isPending = true;

		try {
			await onConfirm();
		} finally {
			isPending = false;
		}
	}
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
				onclick={handleConfirm}
				type="button"
				disabled={isPending}
			>
				{confirmText}
			</button>
			<button class="modal-btn cancel" onclick={onCancel} type="button" disabled={isPending}>
				{cancelText}
			</button>
		</div>
		{#if error}
			<p class="error-text">{error}</p>
		{/if}
	</div>
</div>

<style>
	.error-text {
		margin-top: 16px;
		padding: 12px 14px;
		border: 1px solid var(--state-danger-soft-border);
		border-radius: 14px;
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		font-size: 13px;
		font-weight: 700;
		line-height: 18px;
		text-align: center;
		overflow-wrap: anywhere;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background-color: var(--overlay-bg);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
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

	.modal-btn:disabled {
		cursor: wait;
		opacity: 0.72;
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
