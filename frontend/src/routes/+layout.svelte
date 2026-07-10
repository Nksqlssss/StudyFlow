<script lang="ts">
	import { browser } from '$app/environment';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import '../app.css';

	let { children } = $props();

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
