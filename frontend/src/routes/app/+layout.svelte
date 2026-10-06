<script lang="ts">
	import { goto } from '$app/navigation';
	import BottomTabbar from '$lib/components/ui/bottomTabbar.svelte';
	import { auth } from '$lib/stores/auth';
	import { subjects } from '$lib/stores/subjects';

	let { children } = $props();

	$effect(() => {
		if ($auth.isLoading) return;

		if (!$auth.token || !$auth.user) {
			goto('/login');
			return;
		}

		subjects.load($auth.token);
	});
</script>

<div class="app-shell">
	{@render children()}
</div>

<footer class="app-navigation">
	<BottomTabbar />
</footer>
