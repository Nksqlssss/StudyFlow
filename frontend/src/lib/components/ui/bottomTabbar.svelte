<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';
	import { auth } from '$lib/stores/auth';
	import UserAvatar from './UserAvatar.svelte';

	const t = $derived((key: TranslationKey) => translate($settings.language, key));
	const pathname = $derived($page.url.pathname);

	const isSubjectsActive = $derived(pathname === '/app' || pathname.startsWith('/app/subject'));
	const isRouteActive = $derived(
		(route: string) => pathname === route || pathname.startsWith(`${route}/`)
	);
</script>

<div class="bottom-tabbar">
	<a href={resolve('/app')} class="brand-link">
		<img src="/icons/studyFlow.svg" alt="" class="brand-icon" />
		<span class="brand-name">StudyFlow</span>
	</a>
	<a
		href={resolve('/app')}
		class="subjects-button bottom-tabbar-button"
		class:is-current={isSubjectsActive}
	>
		<img src="/icons/subjectsIcon.svg" alt="" class="tabbar-icon" />
		<p class="subjects-button-name">
			{t('nav.subjects')}
		</p>
	</a>
	<a
		href={resolve('/app/setting')}
		class="settings-button bottom-tabbar-button"
		class:is-current={isRouteActive('/app/setting')}
	>
		<img src="/icons/settingsIcon.svg" alt="" class="tabbar-icon" />
		<p class="settings-button-name">
			{t('nav.settings')}
		</p>
	</a>
	<a
		href={resolve('/app/profile')}
		class="profile-footer"
		class:is-current={isRouteActive('/app/profile')}
		aria-current={isRouteActive('/app/profile') ? 'page' : undefined}
		aria-label={t('nav.profile')}
	>
		<UserAvatar size={36} />
		<span class="profile-copy">
			<strong title={$auth.user?.name}>{$auth.user?.name ?? t('nav.profile')}</strong>
			<span>{t('nav.student')}</span>
		</span>
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
	.profile-footer {
		flex: 1.4;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 56px;
		padding: 6px 8px;
		border-left: 1px solid var(--border-primary);
		border-radius: 14px;
		color: var(--text-primary);
		text-decoration: none;
		transition: background-color 0.3s;
	}
	.profile-footer:hover {
		background-color: var(--accent-primary-bg);
	}
	.profile-footer:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 2px;
	}
	.profile-copy {
		display: grid;
		gap: 3px;
		min-width: 0;
		font-size: 11px;
		line-height: 1.4;
	}
	.profile-copy strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.profile-copy > span {
		color: var(--text-secondary);
		font-size: 10px;
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
		.profile-footer {
			flex: 0 0 auto;
			margin-top: auto;
			padding: 14px 4px 4px;
			border-left: 0;
			border-top: 1px solid var(--border-primary);
			flex-direction: column;
			text-align: center;
		}
		.profile-copy {
			width: 100%;
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
		.profile-footer {
			flex-direction: row;
			gap: 10px;
			padding: 16px 8px 8px;
			text-align: left;
		}
		.profile-copy {
			width: auto;
			font-size: 13px;
		}
		.profile-copy > span {
			font-size: 12px;
		}
	}
</style>
