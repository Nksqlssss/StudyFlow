<script lang="ts">
	import { auth } from '$lib/stores/auth';
	let { size = 40 }: { size?: number } = $props();
	let failedUrl = $state<string | null>(null);
	const url = $derived($auth.user?.avatarUrl ?? null);
	const initials = $derived(
		($auth.user?.name ?? '')
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase() || 'SF'
	);
</script>

<span class="user-avatar" style:--avatar-size={`${size}px`} aria-hidden="true">
	{#if url && failedUrl !== url}
		<img src={url} alt="" width={size} height={size} onerror={() => (failedUrl = url)} />
	{:else}
		<span>{initials}</span>
	{/if}
</span>

<style>
	.user-avatar {
		display: inline-grid;
		place-items: center;
		width: var(--avatar-size);
		height: var(--avatar-size);
		flex: 0 0 var(--avatar-size);
		overflow: hidden;
		border-radius: 50%;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		font-size: calc(var(--avatar-size) * 0.32);
		font-weight: 800;
		line-height: 1;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
