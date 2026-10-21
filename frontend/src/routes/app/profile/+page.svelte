<script lang="ts">
	import { goto } from '$app/navigation';
	import { ApiError } from '$lib/api/client';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { formatLongDate, translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { profileStats } from '$lib/stores/profileStats';
	import { settings } from '$lib/stores/settings';

	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	const stats = $derived([
		{ label: 'profile.stats.subjects', value: $profileStats.subjects },
		{ label: 'profile.stats.tasks', value: $profileStats.tasks },
		{ label: 'profile.stats.completed', value: $profileStats.completed },
		{ label: 'profile.stats.overdue', value: $profileStats.overdue }
	] as const);

	const createdAtValue = $derived(
		$auth.user?.createdAt
			? formatLongDate(new Date($auth.user.createdAt), $settings.language)
			: t('profile.accountInfo.empty')
	);

	let name = $state('');
	let username = $state('');
	let birthDate = $state('');
	let isPublic = $state(false);
	let isEditing = $state(false);
	let isLoading = $state(false);
	let showLogoutModalOpen = $state(false);
	let isDeleteAccountModalOpen = $state(false);
	let accountError: string | null = $state(null);

	$effect(() => {
		const user = $auth.user;

		if (!user) return;

		isPublic = user.isPublic;

		if (!isEditing) {
			name = user.name;
			username = user.username ?? '';
			birthDate = user.birthDate?.slice(0, 10) ?? '';
		}
	});

	const errors = $state({
		name: '',
		username: '',
		birthDate: '',
		general: '',
		isPublic: ''
	});

	async function acceptEditing() {
		const trimmedUsername = username.trim();
		errors.name = '';
		errors.username = '';
		errors.birthDate = '';
		errors.general = '';

		if (birthDate) {
			const today = new Date();

			const maxBirthDate = new Date(today.getFullYear() - 6, today.getMonth(), today.getDate());

			const selectedDate = new Date(`${birthDate}T00:00:00`);

			if (Number.isNaN(selectedDate.getTime()) || selectedDate > maxBirthDate) {
				errors.birthDate = t('profile.errors.birthDate');
				return;
			}
		}

		if (name.trim().length < 2) {
			errors.name = t('profile.errors.nameMin');
			return;
		}

		if (name.trim().length > 24) {
			errors.name = t('profile.errors.nameMax');
			return;
		}

		if (trimmedUsername && trimmedUsername.length < 3) {
			errors.username = t('profile.errors.usernameMin');
			return;
		}

		if (trimmedUsername && trimmedUsername.length > 24) {
			errors.username = t('profile.errors.usernameMax');
			return;
		}

		if (!/^[a-zA-Z0-9_]*$/.test(trimmedUsername)) {
			errors.username = t('profile.errors.usernameFormat');
			return;
		}

		try {
			await auth.updateProfile({
				name: name.trim(),
				username: username.trim() || null,
				birthDate: birthDate || null
			});

			isEditing = false;
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 409) {
					errors.username = t('profile.errors.usernameTaken');
				}

				if (err.status === 401) {
					errors.general = t('profile.errors.session');
				}

				if (err.status === 400) {
					errors.general = t('profile.errors.invalidData');
				}

				if (err.status >= 500) {
					errors.general = t('profile.errors.server');
				}
			}

			if (!(err instanceof ApiError)) {
				errors.general = t('profile.errors.general');
			}
		} finally {
			isLoading = false;
		}
	}

	function cancelEditing() {
		if (!$auth.user) return;

		name = $auth.user.name;
		username = $auth.user.username ?? '';
		birthDate = $auth.user.birthDate?.slice(0, 10) ?? '';
		isEditing = false;

		errors.name = '';
		errors.username = '';
		errors.birthDate = '';
		errors.general = '';
	}

	async function changeProfileVisibility() {
		if (!$auth.user) return;

		const isPublicValue = $auth.user.isPublic;
		isLoading = true;
		errors.isPublic = '';

		try {
			await auth.updateProfile({ isPublic });
		} catch (err) {
			isPublic = isPublicValue;

			if (err instanceof ApiError) {
				if (err.status === 401) {
					errors.isPublic = t('profile.errors.session');
				}

				if (err.status === 400) {
					errors.isPublic = t('profile.errors.invalidData');
				}

				if (err.status === 403) {
					errors.isPublic = t('profile.errors.forbidden');
				}

				if (err.status >= 500) {
					errors.isPublic = t('profile.errors.server');
				}

				if (!errors.isPublic) {
					errors.isPublic = t('profile.errors.visibility');
				}
			}

			if (!(err instanceof ApiError)) {
				errors.isPublic = t('profile.errors.general');
			}
		} finally {
			isLoading = false;
		}
	}

	function handleLogout() {
		auth.logout();
		goto('/');
	}

	async function handleDeleteAccount() {
		accountError = null;

		const success = await auth.deleteAccount();

		if (!success) {
			accountError = $auth.error ?? 'Не удалось удалить аккаунт';
			return;
		}

		isDeleteAccountModalOpen = false;
		await goto('/');
	}
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
			<h2>{$auth.user?.name ?? t('profile.accountInfo.empty')}</h2>
			<p>{$auth.user?.username ? `@${$auth.user.username}` : t('profile.personal.noUsername')}</p>
		</div>
	</section>

	<div class="profile-layout">
		<section class="profile-section personal-section" class:editing-border={isEditing}>
			<div class="section-heading">
				<h2>{t('profile.personal.title')}</h2>
				<p>{t('profile.personal.description')}</p>
			</div>

			<div class="form-grid">
				<label>
					<span>{t('profile.personal.name')}</span>
					<input
						type="text"
						bind:value={name}
						disabled={!isEditing}
						aria-invalid={!!errors.name}
						aria-describedby={errors.name ? 'profile-name-error' : undefined}
						oninput={() => (errors.name = '')}
					/>
					{#if errors.name}
						<p id="profile-name-error" class="field-error" role="alert">{errors.name}</p>
					{/if}
				</label>

				<label>
					<span>{t('profile.personal.username')}</span>
					<input
						type="text"
						bind:value={username}
						placeholder="@username"
						disabled={!isEditing}
						aria-invalid={!!errors.username}
						aria-describedby={errors.username ? 'profile-username-error' : undefined}
						oninput={() => (errors.username = '')}
					/>
					{#if errors.username}
						<p id="profile-username-error" class="field-error" role="alert">{errors.username}</p>
					{/if}
				</label>

				<label>
					<span>{t('profile.personal.birthDate')}</span>
					<div class="date-field" class:is-empty={!birthDate}>
						<input
							type="date"
							bind:value={birthDate}
							placeholder={t('profile.personal.birthDatePlaceholder')}
							disabled={!isEditing}
							aria-invalid={!!errors.birthDate}
							aria-describedby={errors.birthDate ? 'profile-birth-date-error' : undefined}
						/>
						{#if !birthDate}
							<span class="date-placeholder">
								{t('profile.personal.birthDatePlaceholder')}
							</span>
						{/if}
					</div>
					{#if errors.birthDate}
						<p id="profile-birth-date-error" class="field-error" role="alert">{errors.birthDate}</p>
					{/if}
				</label>
			</div>

			<div class="profile-actions">
				{#if !isEditing}
					<button
						type="button"
						class="secondary-action"
						onclick={() => (isEditing = true)}
						disabled={isLoading}>{t('common.edit')}</button
					>
				{:else}
					<button type="button" class="primary-action" onclick={acceptEditing} disabled={isLoading}>
						{isLoading ? t('profile.saving') : t('common.saveChanges')}
					</button>
					<button type="button" class="quiet-action" onclick={cancelEditing} disabled={isLoading}
						>{t('common.cancel')}</button
					>
				{/if}
			</div>
			{#if errors.general}
				<p class="error-message" role="alert">{errors.general}</p>
			{/if}
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

			<label class="public-account-toggle">
				<input
					type="checkbox"
					bind:checked={isPublic}
					onchange={changeProfileVisibility}
					disabled={isLoading}
				/>
				<span>{t('profile.account.public')}</span>
				<span class="switch-track" aria-hidden="true">
					<span class="switch-thumb"></span>
				</span>
			</label>
			{#if errors.isPublic}
				<p class="error-message" role="alert">{errors.isPublic}</p>
			{/if}

			<div class="account-actions">
				<button type="button" class="account-button">{t('profile.account.changeEmail')}</button>
				<button type="button" class="account-button">{t('profile.account.changePassword')}</button>
				<button type="button" class="account-button" onclick={() => (showLogoutModalOpen = true)}>
					{t('settings.account.logout')}
				</button>
				<button
					type="button"
					class="account-button danger-action"
					onclick={() => {
						accountError = null;
						isDeleteAccountModalOpen = true;
					}}
				>
					{t('profile.account.delete')}
				</button>
			</div>
		</section>

		<section class="profile-section account-info-section">
			<div class="section-heading">
				<h2>{t('profile.accountInfo.title')}</h2>
			</div>

			<div class="account-info-list">
				<div class="account-info-row">
					<span>{t('profile.accountInfo.createdAt')}</span>
					<strong>{createdAtValue}</strong>
				</div>

				<div class="account-info-row">
					<span>{t('profile.accountInfo.email')}</span>
					<strong>{$auth.user ? $auth.user.email : t('profile.accountInfo.empty')}</strong>
				</div>
			</div>
		</section>
	</div>
</main>

{#if showLogoutModalOpen}
	<ConfirmModal
		title={t('settings.logout.title')}
		description={t('settings.logout.description')}
		confirmText={t('settings.account.logout')}
		cancelText={t('common.cancel')}
		variant="danger"
		onConfirm={handleLogout}
		onCancel={() => (showLogoutModalOpen = false)}
	/>
{/if}

{#if isDeleteAccountModalOpen}
	<ConfirmModal
		title={'Вы действительно хотите удалить аккаунт?'}
		description={'Это действие нельзя отменить'}
		confirmText={'Удалить'}
		cancelText={'Отмена'}
		variant="danger"
		onConfirm={handleDeleteAccount}
		onCancel={() => (isDeleteAccountModalOpen = false)}
		error={accountError}
	/>
{/if}

<style>
	.profile-section.editing-border {
		border-color: var(--border-accent);
	}

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
		align-items: start;
	}

	label {
		display: grid;
		gap: 8px;
		min-width: 0;
	}

	input {
		min-width: 0;
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

	input:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}

	input:disabled {
		cursor: default;
		color: var(--text-secondary);
		background-color: var(--surface-tertiary);
	}

	input[aria-invalid='true'] {
		border-color: var(--state-danger-soft-border);
	}

	.field-error,
	.error-message {
		margin: 0;
		color: var(--state-danger-soft-text);
		font-size: 13px;
		font-weight: 600;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.error-message {
		padding: 12px 14px;
		border: 1px solid var(--state-danger-soft-border);
		border-radius: 14px;
		background-color: var(--state-danger-soft-bg);
	}

	.date-field {
		position: relative;
		min-width: 0;
	}

	.date-field input {
		min-width: 100%;
		cursor: pointer;
	}

	.date-field.is-empty input {
		color: transparent;
	}

	.date-field input::-webkit-calendar-picker-indicator {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.date-placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		padding: 0 14px;
		color: var(--text-muted);
		font-size: 14px;
		font-weight: 700;
		pointer-events: none;
	}

	.profile-actions,
	.account-actions {
		display: grid;
		gap: 8px;
	}

	.profile-actions {
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	}

	.account-info-list {
		display: grid;
		gap: 10px;
	}

	.account-info-row {
		display: grid;
		gap: 4px;
		padding: 14px;
		border: 1px solid var(--border-primary);
		border-radius: 16px;
		background-color: var(--surface-tertiary);
	}

	.account-info-row span {
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.account-info-row strong {
		color: var(--text-primary);
		font-size: 15px;
		overflow-wrap: anywhere;
	}

	.public-account-toggle {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		min-height: 48px;
		padding: 0 14px;
		border: 1px solid var(--border-primary);
		border-radius: 16px;
		background-color: var(--surface-tertiary);
		color: var(--text-primary);
		font-weight: 800;
		cursor: pointer;
	}

	.public-account-toggle input {
		position: absolute;
		width: 1px;
		height: 1px;
		min-height: 0;
		padding: 0;
		opacity: 0;
		pointer-events: none;
	}

	.public-account-toggle:has(input:disabled) {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.public-account-toggle:has(input:focus-visible) .switch-track {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}

	.switch-track {
		position: relative;
		flex: 0 0 auto;
		width: 52px;
		height: 30px;
		border: 1px solid var(--border-secondary);
		border-radius: 999px;
		background-color: var(--surface-input-strong);
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.switch-thumb {
		position: absolute;
		top: 50%;
		left: 4px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background-color: var(--text-secondary);
		transform: translateY(-50%);
		transition:
			transform 0.2s ease,
			background-color 0.2s ease;
	}

	.public-account-toggle input:checked + span + .switch-track {
		border-color: var(--border-accent);
		background: var(--gradient-primary);
	}

	.public-account-toggle input:checked + span + .switch-track .switch-thumb {
		background-color: var(--text-on-accent);
		transform: translate(20px, -50%);
	}

	button {
		padding: 10px 16px;
		min-height: 44px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
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
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.account-actions {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.account-info-list {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1180px) {
		.form-grid {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(240px, 1fr);
		}

		.profile-page {
			padding: 40px 40px 56px;
		}

		.stats-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
