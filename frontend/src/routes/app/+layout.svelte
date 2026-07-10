<script lang="ts">
	import { goto } from '$app/navigation';
	import BottomTabbar from '$lib/components/ui/bottomTabbar.svelte';
	import { auth } from '$lib/stores/auth';

	let { children } = $props();

	$effect(() => {
		if ($auth.isLoading) return;

		if (!$auth.token || !$auth.user) {
			goto('/login');
		}
	});
</script>

<div class="app-shell">
	{@render children()}
</div>

<footer class="app-navigation">
	<BottomTabbar />
</footer>
