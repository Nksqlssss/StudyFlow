<script lang="ts">
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	const mockUser = {
		username: 'Nikita Student',
		email: 'nikita.studyflow@example.com',
		name: 'Nikita Kolesnik',
		age: 21
	};

	const stats = [
		{ label: 'profile.stats.subjects', value: 8 },
		{ label: 'profile.stats.tasks', value: 42 },
		{ label: 'profile.stats.completed', value: 27 },
		{ label: 'profile.stats.overdue', value: 3 }
	] as const;
</script>

<main class="profile-page">
	<header class="profile-header">
		<div>
			<p class="eyebrow">StudyFlow</p>
			<h1>{t('profile.title')}</h1>
		</div>
		<p class="header-description">
			{t('profile.description')}
		</p>
	</header>

	<section class="profile-section user-card">
		<div class="avatar-wrap">
			<div class="avatar" aria-hidden="true">NS</div>
			<button type="button" class="avatar-action">{t('profile.avatar.change')}</button>
		</div>

		<div class="user-info">
			<h2>{mockUser.username}</h2>
			<p>{mockUser.email}</p>
		</div>
	</section>

	<div class="profile-layout">
		<section class="profile-section personal-section">
			<div class="section-heading">
				<h2>{t('profile.personal.title')}</h2>
				<p>{t('profile.personal.description')}</p>
			</div>

			<div class="form-grid">
				<label>
					<span>{t('profile.personal.name')}</span>
					<input type="text" value={mockUser.name} readonly />
				</label>

				<label>
					<span>{t('profile.personal.age')}</span>
					<input type="text" value={mockUser.age} readonly />
				</label>
			</div>

			<div class="profile-actions">
				<button type="button" class="secondary-action">{t('common.edit')}</button>
				<button type="button" class="primary-action">{t('common.saveChanges')}</button>
				<button type="button" class="quiet-action">{t('common.cancel')}</button>
			</div>
		</section>

		<section class="profile-section stats-section">
			<div class="section-heading">
				<h2>{t('profile.stats.title')}</h2>
				<p>{t('profile.stats.description')}</p>
			</div>

			<div class="stats-grid">
				{#each stats as stat (stat.label)}
					<article class="stat-card">
						<strong>{stat.value}</strong>
						<span>{t(stat.label)}</span>
					</article>
				{/each}
			</div>
		</section>

		<section class="profile-section account-section">
			<div class="section-heading">
				<h2>{t('profile.account.title')}</h2>
				<p>{t('profile.account.description')}</p>
			</div>

			<div class="account-actions">
				<button type="button" class="account-button">{t('profile.account.changeEmail')}</button>
				<button type="button" class="account-button">{t('profile.account.changePassword')}</button>
				<button type="button" class="account-button">{t('settings.account.logout')}</button>
				<button type="button" class="account-button danger-action">
					{t('profile.account.delete')}
				</button>
			</div>
		</section>
	</div>
</main>

<style>
	.profile-page {
		min-height: 100vh;
		padding: 24px 16px 110px;
		color: var(--text-primary);
	}

	.profile-header {
		display: grid;
		gap: 12px;
		margin-bottom: 24px;
	}

	.eyebrow {
		margin-bottom: 6px;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		font-size: 32px;
		line-height: 1.1;
	}

	.header-description,
	.section-heading p,
	.user-info p,
	label span,
	.stat-card span {
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.profile-layout {
		display: grid;
		gap: 16px;
	}

	.profile-section {
		display: grid;
		gap: 16px;
		padding: 20px;
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		background-color: var(--surface-primary);
	}

	.user-card {
		margin-bottom: 16px;
		align-items: center;
		text-align: center;
	}

	.avatar-wrap {
		display: grid;
		justify-items: center;
		gap: 10px;
	}

	.avatar {
		display: grid;
		place-items: center;
		width: 92px;
		height: 92px;
		border: 1px solid var(--border-accent);
		border-radius: 28px;
		background: var(--gradient-primary-diagonal);
		color: var(--text-on-accent);
		font-size: 30px;
		font-weight: 900;
		box-shadow: 0 16px 40px var(--shadow-accent);
	}

	.avatar-action {
		min-height: 36px;
		padding: 0 14px;
		border: 1px solid var(--border-secondary);
		border-radius: 999px;
		background-color: var(--surface-input-strong);
		color: var(--text-accent);
		font-size: 13px;
		font-weight: 800;
		cursor: pointer;
	}

	.user-info {
		display: grid;
		gap: 6px;
		min-width: 0;
	}

	.user-info h2 {
		font-size: 24px;
		line-height: 1.2;
	}

	.user-info p {
		overflow-wrap: anywhere;
	}

	.section-heading h2 {
		margin-bottom: 4px;
		font-size: 20px;
	}

	.form-grid {
		display: grid;
		gap: 12px;
	}

	label {
		display: grid;
		gap: 8px;
	}

	input {
		width: 100%;
		min-height: 46px;
		padding: 0 14px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background-color: var(--surface-input);
		color: var(--text-primary);
		font: inherit;
		font-weight: 700;
	}

	.profile-actions,
	.account-actions {
		display: grid;
		gap: 8px;
	}

	button {
		min-height: 44px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	.primary-action {
		border: none;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}

	.secondary-action,
	.quiet-action,
	.account-button {
		background-color: var(--surface-input-strong);
		color: var(--text-primary);
	}

	.quiet-action {
		color: var(--text-secondary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.stat-card {
		display: grid;
		gap: 6px;
		min-height: 96px;
		padding: 16px;
		border: 1px solid var(--border-primary);
		border-radius: 16px;
		background-color: var(--surface-tertiary);
	}

	.stat-card strong {
		color: var(--text-accent);
		font-size: 28px;
		line-height: 1;
	}

	.stat-card span {
		font-weight: 700;
	}

	.danger-action {
		border-color: var(--state-danger-soft-border);
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
	}

	@media (min-width: 768px) {
		.profile-page {
			width: min(100%, 1120px);
			margin-inline: auto;
			padding: 32px 32px 48px;
		}

		.profile-header {
			grid-template-columns: 1fr minmax(260px, 420px);
			align-items: end;
		}

		.user-card {
			grid-template-columns: auto minmax(0, 1fr);
			justify-items: start;
			text-align: left;
		}

		.form-grid {
			grid-template-columns: 1fr 180px;
		}

		.profile-actions {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.account-actions {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1180px) {
		.profile-page {
			padding: 40px 40px 56px;
		}

		.stats-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
