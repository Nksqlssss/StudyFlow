<script>
	import { browser } from '$app/environment';
	import BottomTabbar from '$lib/components/ui/bottomTabbar.svelte';
	import { settings } from '$lib/stores/settings';
	import '../app.css';

	$effect(() => {
		if (!browser) return;

		document.documentElement.dataset.theme = $settings.theme;
		document.documentElement.dataset.density = $settings.cardDensity;
	});

	let { children } = $props();
</script>

<div class="app-shell">
	{@render children()}
</div>

<footer class="app-navigation">
	<BottomTabbar />
</footer>
