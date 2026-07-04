<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';

	const t = $derived((key: TranslationKey) => translate($settings.language, key));
	const pathname = $derived($page.url.pathname);

	const isSubjectsActive = $derived(pathname === '/' || pathname.startsWith('/subject'));
	const isRouteActive = $derived(
		(route: string) => pathname === route || pathname.startsWith(`${route}/`)
	);
</script>

<div class="bottom-tabbar">
	<a href={resolve('/')} class="brand-link">
		<img src="/icons/studyFlow.svg" alt="" class="brand-icon" />
		<span class="brand-name">StudyFlow</span>
	</a>
	<a
		href={resolve('/')}
		class="subjects-button bottom-tabbar-button"
		class:is-current={isSubjectsActive}
	>
		<img src="/icons/subjectsIcon.svg" alt="" class="tabbar-icon" />
		<p class="subjects-button-name">
			{t('nav.subjects')}
		</p>
	</a>
	<a
		href={resolve('/schedule')}
		class="schedule-button bottom-tabbar-button"
		class:is-current={isRouteActive('/schedule')}
	>
		<img src="/icons/scheduleIcon.svg" alt="" class="tabbar-icon" />
		<p class="schedule-button-name">
			{t('nav.schedule')}
		</p>
	</a>
	<a
		href={resolve('/profile')}
		class="profile-button bottom-tabbar-button"
		class:is-current={isRouteActive('/profile')}
	>
		<img src="/icons/profileIcon.svg" alt="" class="tabbar-icon" />
		<p class="profile-button-name">
			{t('nav.profile')}
		</p>
	</a>
	<a
		href={resolve('/setting')}
		class="settings-button bottom-tabbar-button"
		class:is-current={isRouteActive('/setting')}
	>
		<img src="/icons/settingsIcon.svg" alt="" class="tabbar-icon" />
		<p class="settings-button-name">
			{t('nav.settings')}
		</p>
	</a>
</div>

<style>
	.bottom-tabbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		gap: 8px;
		padding: 12px;
		box-shadow: 0 -4px 20px 0 var(--shadow-nav);
		border-radius: 20px 20px 0 0;
		background-color: var(--bg-primary);
		z-index: 50;
	}

	.brand-link {
		display: none;
	}

	.bottom-tabbar-button {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		background-color: transparent;
		border-radius: 20px;
		border: none;
		outline: none;
		font-size: 11px;
		font-weight: 500;
		line-height: 16px;
		letter-spacing: 0.55px;
		color: var(--text-secondary);
		transition-duration: 0.3s;
	}

	.bottom-tabbar-button:hover:not(.is-current) {
		background-color: var(--accent-primary-bg);
	}

	.tabbar-icon {
		width: 20px;
		height: 20px;
	}

	.is-current {
		background-color: var(--accent-primary-bg);
	}

	@media (min-width: 768px) {
		.bottom-tabbar {
			top: 0;
			right: auto;
			bottom: 0;
			width: 96px;
			flex-direction: column;
			justify-content: flex-start;
			align-items: stretch;
			gap: 12px;
			padding: 20px 12px;
			border-radius: 0 24px 24px 0;
			box-shadow: 8px 0 24px 0 var(--shadow-sidebar);
			border-right: 1px solid var(--surface-secondary);
		}

		.brand-link {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 56px;
			margin-bottom: 12px;
			border-radius: 18px;
			background-color: var(--surface-primary);
		}

		.brand-icon {
			width: 32px;
			height: 32px;
		}

		.brand-name {
			display: none;
		}

		.bottom-tabbar-button {
			flex: 0 0 auto;
			min-height: 64px;
			padding: 10px 8px;
			border-radius: 18px;
		}
	}

	@media (min-width: 1180px) {
		.bottom-tabbar {
			width: 240px;
			padding: 24px 18px;
			gap: 10px;
		}

		.brand-link {
			justify-content: flex-start;
			gap: 12px;
			padding-inline: 16px;
			margin-bottom: 20px;
		}

		.brand-name {
			display: inline;
			font-size: 18px;
			font-weight: 800;
			color: var(--text-primary);
		}

		.bottom-tabbar-button {
			flex-direction: row;
			justify-content: flex-start;
			min-height: 52px;
			gap: 12px;
			padding: 12px 16px;
			font-size: 13px;
			text-align: left;
		}

		.tabbar-icon {
			width: 22px;
			height: 22px;
		}
	}
</style>
