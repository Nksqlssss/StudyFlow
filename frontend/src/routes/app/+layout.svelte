<script lang="ts">
	import { goto } from '$app/navigation';
	import BottomTabbar from '$lib/components/ui/bottomTabbar.svelte';
	import { auth } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings';
	import { subjects } from '$lib/stores/subjects';
	import { tasks } from '$lib/stores/tasks';

	let { children } = $props();

	$effect(() => {
		if ($auth.isLoading) return;

		if (!$auth.token || !$auth.user) {
			goto('/login');
			return;
		}

		void subjects.load($auth.token).catch((error) => {
			console.error('Failed to load subjects:', error);
		});

		void tasks.loadAll($auth.token).catch((error) => {
			console.error('Failed to load tasks:', error);
		});

		void settings.load($auth.token).catch((error) => {
			console.error('Failed to load settings:', error);
		});
	});
</script>

<div class="app-shell">
	{@render children()}
</div>

<footer class="app-navigation">
	<BottomTabbar />
</footer>
