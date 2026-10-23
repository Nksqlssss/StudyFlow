<script lang="ts">
	import { browser } from '$app/environment';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { captureEmailChangeToken } from '$lib/stores/pendingEmailChange';
	import { translate } from '$lib/i18n';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();
	if (browser && window.location.pathname === '/app/profile') captureEmailChangeToken();
	onMount(() => {
		const capture = () => {
			if (window.location.pathname === '/app/profile') captureEmailChangeToken();
		};
		window.addEventListener('hashchange', capture);
		return () => window.removeEventListener('hashchange', capture);
	});

	$effect(() => {
		if (!browser) return;

		document.documentElement.dataset.theme = $settings.theme;
		document.documentElement.dataset.density = $settings.cardDensity;
	});

	$effect(() => {
		if (!browser) return;

		auth.loadMe();
	});
</script>

{@render children()}

{#if $auth.logoutWarning}
	<div class="session-notice" role="alert">
		<p>{translate($settings.language, 'account.logoutWarning')}</p>
		<button type="button" onclick={auth.clearLogoutWarning}
			>{translate($settings.language, 'common.gotIt')}</button
		>
	</div>
{/if}

<style>
	.session-notice {
		position: fixed;
		bottom: 24px;
		left: 16px;
		right: 16px;
		z-index: 1100;
		max-width: 560px;
		margin-inline: auto;
		display: grid;
		gap: 12px;
		padding: 18px;
		border: 1px solid var(--border-accent);
		border-radius: 14px;
		background: var(--surface-primary);
		color: var(--text-primary);
		box-shadow: 0 8px 24px var(--shadow-panel);
	}
	.session-notice p {
		font-size: 14px;
		line-height: 1.5;
	}
	.session-notice button {
		min-height: 44px;
		border: 1px solid var(--border-secondary);
		border-radius: 8px;
		background: var(--surface-input);
		color: var(--text-primary);
		cursor: pointer;
		font: inherit;
	}
</style>
