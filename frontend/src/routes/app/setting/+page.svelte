<script lang="ts">
	import PasswordModal from '$lib/components/auth/PasswordModal.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { priorityLabel, translate, type TranslationKey } from '$lib/i18n';
	import { auth } from '$lib/stores/auth';
	import { settings, settingsError, settingsLoaded, settingsLoading } from '$lib/stores/settings';
	import { subjects } from '$lib/stores/subjects';
	import { tasks } from '$lib/stores/tasks';
	import type { TaskPriority } from '$lib/types';
	import { onMount } from 'svelte';

	let showClearAllModal = $state(false);
	let showClearTasksModal = $state(false);
	let showResetSettingsModal = $state(false);
	let showModal = $state(false);
	let actionLoading = $state(false);
	let isSetPasswordModalOpen = $state(false);
	let isChangePasswordModalOpen = $state(false);
	let actionError: string | null = $state(null);
	let password = $state('');
	let confirmPassword = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let passwordModalError: string | null = $state(null);
	const t = $derived((key: TranslationKey, params: Record<string, string | number> = {}) =>
		translate($settings.language, key, params)
	);

	const priorities: TaskPriority[] = ['low', 'medium', 'high'];

	function errorText(message: string): string {
		const keys: Record<string, TranslationKey> = {
			'Failed to load settings': 'settings.errors.load',
			'Failed to update settings': 'settings.errors.update',
			'Failed to reset settings': 'settings.errors.reset',
			'You must be logged in to update settings': 'profile.errors.session',
			'You must be logged in to reset settings': 'profile.errors.session',
			Unauthorized: 'profile.errors.session',
			'Not authenticated': 'profile.errors.session',
			'Password already exists': 'settings.password.errors.exists',
			'Password is not set': 'settings.password.errors.notSet',
			'Current password is incorrect': 'settings.password.errors.incorrect',
			'Password was changed during this request': 'settings.password.errors.concurrent',
			'Password set failed': 'settings.password.errors.save',
			'Password change failed': 'settings.password.errors.save',
			'Google linking failed': 'settings.signIn.errors.connect',
			'Google unlinking failed': 'settings.signIn.errors.disconnect',
			'Set a password and verify your email before unlinking Google': 'settings.signIn.passwordRequired',
			'Invalid request body': 'profile.errors.invalidData',
			'Failed to fetch': 'settings.errors.network',
			'NetworkError when attempting to fetch resource.': 'settings.errors.network',
			'Load failed': 'settings.errors.network',
			'Internal Server Error': 'profile.errors.server'
		};

		return t(keys[message] ?? 'common.somethingWentWrong');
	}

	onMount(() => {
		void auth.loadMethods();
	});

	function modalToggle() {
		showModal = !showModal;
	}

	async function handleResetSettings() {
		if (actionLoading) return;
		actionError = null;
		try {
			actionLoading = true;

			await settings.reset();
			showResetSettingsModal = false;
		} catch (error) {
			if (!(error instanceof Error)) {
				actionError = t('common.somethingWentWrong');
				return;
			}
			actionError = error.message;
		} finally {
			actionLoading = false;
		}
	}

	async function handleClearAll() {
		if (!$auth.token) return;
		if (actionLoading) return;
		actionError = null;

		try {
			actionLoading = true;

			await tasks.deleteAllTasks($auth.token);
			await subjects.deleteAllSubjects($auth.token);
			await settings.reset();
			showClearAllModal = false;
		} catch (error) {
			if (!(error instanceof Error)) {
				actionError = t('common.somethingWentWrong');
				return;
			}
			actionError = error.message;
		} finally {
			actionLoading = false;
		}
	}

	async function handleClearTasks() {
		if (!$auth.token) return;
		if (actionLoading) return;
		actionError = null;

		try {
			actionLoading = true;
			await tasks.deleteAllTasks($auth.token);
			showClearTasksModal = false;
		} catch (error) {
			if (!(error instanceof Error)) {
				actionError = t('common.somethingWentWrong');
				return;
			}
			actionError = error.message;
		} finally {
			actionLoading = false;
		}
	}

	async function handleAddGoogle() {
		const result = await auth.addGoogle();

		if (!result) return;

		window.location.assign(result.authorizationUrl);
	}

	async function handleDeleteGoogle() {
		await auth.deleteGoogle();
	}

	async function handleSetPassword() {
		passwordModalError = null;

		if (!password || !confirmPassword) {
			passwordModalError = t('settings.password.errors.required');
			return;
		}

		if (password.length < 8 || password.length > 72) {
			passwordModalError = t('settings.password.errors.length');
			return;
		}

		if (password !== confirmPassword) {
			passwordModalError = t('settings.password.errors.match');
			return;
		}

		const success = await auth.createPassword({ password });

		if (!success) return;

		isSetPasswordModalOpen = false;
		passwordModalError = null;
		password = '';
		confirmPassword = '';
	}

	async function handleChangePassword() {
		passwordModalError = null;

		if (!currentPassword || !newPassword) {
			passwordModalError = t('settings.password.errors.required');
			return;
		}

		if (newPassword.length < 8 || newPassword.length > 72) {
			passwordModalError = t('settings.password.errors.length');
			return;
		}

		if (currentPassword === newPassword) {
			passwordModalError = t('settings.password.errors.different');
			return;
		}

		if (newPassword !== confirmNewPassword || !confirmNewPassword) {
			passwordModalError = t('settings.password.errors.confirmNew');
			return;
		}

		const success = await auth.changePassword({
			currentPassword,
			newPassword
		});

		if (!success) return;

		isChangePasswordModalOpen = false;
		passwordModalError = null;
		newPassword = '';
		confirmNewPassword = '';
	}
</script>

<main class="settings-page">
	<header class="settings-header">
		<div>
			<p class="eyebrow">StudyFlow</p>
			<h1>{t('settings.title')}</h1>
		</div>
		<p class="header-description">
			{t('settings.description')}
		</p>
	</header>

	{#if $settingsError}
		<p class="error-text" role="alert">{errorText($settingsError)}</p>
	{/if}
	<section class="settings-section">
		<div class="section-heading">
			<h2>{t('settings.appearance.title')}</h2>
			<p>{t('settings.appearance.description')}</p>
		</div>

		<div class="setting-row">
			<div>
				<h3>{t('settings.theme.title')}</h3>
				<p>{t('settings.theme.description')}</p>
			</div>

			<div class="segmented-control">
				<button
					type="button"
					class:selected={$settings.theme === 'dark'}
					onclick={() => settings.update({ theme: 'dark' })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.theme.dark')}
				</button>
				<button
					type="button"
					class:selected={$settings.theme === 'light'}
					onclick={() => settings.update({ theme: 'light' })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.theme.light')}
				</button>
			</div>
		</div>

		<div class="setting-row">
			<div>
				<h3>{t('settings.density.title')}</h3>
				<p>{t('settings.density.description')}</p>
			</div>

			<div class="segmented-control">
				<button
					type="button"
					class:selected={$settings.cardDensity === 'comfortable'}
					onclick={() => settings.update({ cardDensity: 'comfortable' })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.density.comfortable')}
				</button>
				<button
					type="button"
					class:selected={$settings.cardDensity === 'compact'}
					onclick={() => settings.update({ cardDensity: 'compact' })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.density.compact')}
				</button>
			</div>
		</div>

		<label class="setting-row switch-row">
			<div>
				<h3>{t('settings.tips.title')}</h3>
				<p>{t('settings.tips.description')}</p>
			</div>

			<input
				type="checkbox"
				checked={$settings.showTips}
				onchange={(event: Event) =>
					settings.update({
						showTips: (event.currentTarget as HTMLInputElement).checked
					})}
				disabled={$settingsLoading || !$settingsLoaded}
			/>
			<span class="switch"></span>
		</label>
	</section>

	<section class="settings-section">
		<div class="section-heading">
			<h2>{t('settings.language.title')}</h2>
		</div>

		<div class="language-grid">
			<button
				type="button"
				class:selected={$settings.language === 'ru'}
				onclick={() => settings.update({ language: 'ru' })}
				disabled={$settingsLoading || !$settingsLoaded}
			>
				<span>{t('settings.language.ru')}</span>
				<small>RU</small>
			</button>
			<button
				type="button"
				class:selected={$settings.language === 'en'}
				onclick={() => settings.update({ language: 'en' })}
				disabled={$settingsLoading || !$settingsLoaded}
			>
				<span>{t('settings.language.en')}</span>
				<small>EN</small>
			</button>
			<button
				type="button"
				class:selected={$settings.language === 'pl'}
				onclick={() => settings.update({ language: 'pl' })}
				disabled={$settingsLoading || !$settingsLoaded}
			>
				<span>{t('settings.language.pl')}</span>
				<small>PL</small>
			</button>
		</div>
	</section>

	<section class="settings-section">
		<div class="section-heading">
			<h2>{t('settings.tasks.title')}</h2>
			<p>{t('settings.tasks.description')}</p>
		</div>

		<div class="setting-row">
			<div>
				<h3>{t('settings.defaultPriority.title')}</h3>
				<p>{t('settings.defaultPriority.description')}</p>
			</div>

			<select
				value={$settings.defaultTaskPriority}
				onchange={(event: Event) =>
					settings.update({
						defaultTaskPriority: (event.currentTarget as HTMLSelectElement).value as TaskPriority
					})}
				disabled={$settingsLoading || !$settingsLoaded}
			>
				{#each priorities as priority (priority)}
					<option value={priority}>{priorityLabel($settings.language, priority)}</option>
				{/each}
			</select>
		</div>

		<div class="setting-row">
			<div>
				<h3>{t('settings.urgent.title')}</h3>
				<p>{t('settings.urgent.description')}</p>
			</div>

			<div class="segmented-control">
				<button
					type="button"
					class:selected={$settings.urgentThresholdHours === 24}
					onclick={() => settings.update({ urgentThresholdHours: 24 })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.hours', { count: 24 })}
				</button>
				<button
					type="button"
					class:selected={$settings.urgentThresholdHours === 48}
					onclick={() => settings.update({ urgentThresholdHours: 48 })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.hours', { count: 48 })}
				</button>
				<button
					type="button"
					class:selected={$settings.urgentThresholdHours === 72}
					onclick={() => settings.update({ urgentThresholdHours: 72 })}
					disabled={$settingsLoading || !$settingsLoaded}
				>
					{t('settings.hours', { count: 72 })}
				</button>
			</div>
		</div>

		<div class="setting-row">
			<div>
				<h3>{t('settings.completed.title')}</h3>
				<p>{t('settings.completed.description')}</p>
			</div>

			<select
				value={$settings.completedTasksVisibility}
				onchange={(event: Event) =>
					settings.update({
						completedTasksVisibility: (event.currentTarget as HTMLSelectElement).value as
							| 'tab_only'
							| 'active_list'
					})}
				disabled={$settingsLoading || !$settingsLoaded}
			>
				<option value="tab_only">{t('settings.completed.tabOnly')}</option>
				<option value="active_list">{t('settings.completed.activeList')}</option>
			</select>
		</div>
	</section>

	<section class="settings-section danger-section">
		<div class="section-heading">
			<h2>{t('settings.data.title')}</h2>
			<p>{t('settings.data.description')}</p>
		</div>

		<div class="actions-grid">
			<button type="button" class="secondary-action" onclick={modalToggle}
				>{t('settings.data.exportPdf')}</button
			>
			<button type="button" class="secondary-action" onclick={modalToggle}
				>{t('settings.data.importPdf')}</button
			>
			<button
				type="button"
				class="danger-action"
				onclick={() => {
					showClearTasksModal = true;
					actionError = null;
				}}
			>
				{t('settings.data.clearTasks')}
			</button>
			<button
				type="button"
				class="danger-action"
				onclick={() => {
					showClearAllModal = true;
					actionError = null;
				}}
			>
				{t('settings.data.clearAll')}
			</button>
			<button
				type="button"
				class="danger-action"
				onclick={() => {
					showResetSettingsModal = true;
					actionError = null;
				}}
			>
				{t('settings.data.resetSettings')}
			</button>
		</div>
	</section>

	{#if $auth.isMethodsLoading}
		<section class="settings-section methods-state" aria-busy="true">
			<div class="section-heading"><h2>{t('settings.signIn.title')}</h2></div>
			<p class="methods-loading" role="status"><span class="spinner" aria-hidden="true"></span>{t('settings.signIn.loading')}</p>
		</section>
	{:else if !$auth.methods}
		<section class="settings-section methods-state">
			<div class="section-heading"><h2>{t('settings.signIn.title')}</h2></div>
			<p class="error-text" role="alert">{t('settings.signIn.errors.load')}</p>
			<button type="button" class="retry-action" onclick={() => void auth.loadMethods()}>{t('auth.verify.retry')}</button>
		</section>
	{:else}
		<section class="settings-section login-methods" aria-labelledby="login-methods-title">
			<div class="section-heading methods-heading">
				<div>
					<h2 id="login-methods-title">{t('settings.signIn.title')}</h2>
					<p>{t('settings.signIn.description')}</p>
				</div>
				<svg
					class="security-icon"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
					<path d="m9 12 2 2 4-5" />
				</svg>
			</div>

			<div class="method-row">
				<div class="method-info">
					<span class="method-icon" aria-hidden="true">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="4" y="10" width="16" height="11" rx="2" />
							<path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3" />
						</svg>
					</span>
					<div class="method-copy">
						<h3>{t('settings.signIn.password')}</h3>
						{#if $auth.methods.hasPassword}
							<p>{t('settings.signIn.connected')}</p>
						{:else}
							<p>{t('settings.signIn.notConnected')}</p>
						{/if}
					</div>
				</div>
				{#if $auth.methods.hasPassword}
					<button
						type="button"
						class="method-action"
						onclick={() => (isChangePasswordModalOpen = true)}
						disabled={$auth.isPasswordLoading}
						>{$auth.isPasswordLoading
							? t('settings.password.updating')
							: t('settings.signIn.change')}</button
					>
				{:else}
					<button
						type="button"
						class="method-action"
						onclick={() => (isSetPasswordModalOpen = true)}
						disabled={$auth.isPasswordLoading}
						>{$auth.isPasswordLoading
							? t('settings.password.setting')
							: t('settings.password.set')}</button
					>
				{/if}
			</div>

			<div class="method-row">
				<div class="method-info">
					<span class="method-icon" aria-hidden="true">
						<img src="/icons/google.svg" alt="" width="28" height="28" />
					</span>
					<div class="method-copy">
						<h3>Google</h3>
						{#if $auth.methods.providers.google.connected}
							<p class="method-email">{$auth.methods.providers.google.email}</p>
						{:else}
							<p>{t('settings.signIn.notConnected')}</p>
						{/if}
					</div>
				</div>
				{#if $auth.methods.providers.google.connected}
					<button
						type="button"
						class="method-action danger-action"
						onclick={handleDeleteGoogle}
						disabled={$auth.isAccountLoading || !$auth.methods.hasPassword}
					>
						{$auth.isAccountLoading ? t('settings.signIn.disconnecting') : t('settings.signIn.disconnect')}
					</button>
				{:else}
					<button
						type="button"
						class="method-action connect-action"
						onclick={handleAddGoogle}
						disabled={$auth.isAccountLoading || $auth.methods.providers.google.connected}
						>{$auth.isAccountLoading ? t('settings.signIn.connecting') : t('settings.signIn.connect')}</button
					>
				{/if}
			</div>
			{#if !$auth.methods.hasPassword}
				<p class="method-hint">{t('settings.signIn.passwordHint')}</p>
			{/if}
			{#if $auth.accountError}
				<p class="error-text" role="alert">{errorText($auth.accountError)}</p>
			{/if}
		</section>
	{/if}

	<section class="settings-section about-section">
		<div class="section-heading">
			<h2>{t('settings.about.title')}</h2>
		</div>

		<div class="about-list">
			<div>
				<span>{t('common.version')}</span>
				<strong>v2.0.0</strong>
			</div>
		</div>
	</section>
</main>

{#if isSetPasswordModalOpen}
	<PasswordModal
		mode="set"
		onClose={() => (isSetPasswordModalOpen = false)}
		bind:firstValue={password}
		bind:secondValue={confirmPassword}
		error={passwordModalError ?? ($auth.passwordError ? errorText($auth.passwordError) : null)}
		onConfirm={handleSetPassword}
		isLoading={$auth.isPasswordLoading}
	/>
{/if}

{#if isChangePasswordModalOpen}
	<PasswordModal
		mode="change"
		onClose={() => (isChangePasswordModalOpen = false)}
		bind:firstValue={currentPassword}
		bind:secondValue={newPassword}
		bind:thirdValue={confirmNewPassword}
		error={passwordModalError ?? ($auth.passwordError ? errorText($auth.passwordError) : null)}
		onConfirm={handleChangePassword}
		isLoading={$auth.isPasswordLoading}
	/>
{/if}

{#if showClearTasksModal}
	<ConfirmModal
		title={t('settings.clearTasks.title')}
		description={t('settings.clearTasks.description')}
		confirmText={t('common.clear')}
		cancelText={t('common.cancel')}
		variant="danger"
		onConfirm={handleClearTasks}
		onCancel={() => (showClearTasksModal = false)}
		error={actionError ? errorText(actionError) : null}
	/>
{/if}

{#if showClearAllModal}
	<ConfirmModal
		title={t('settings.clearAll.title')}
		description={t('settings.clearAll.description')}
		confirmText={t('common.clear')}
		cancelText={t('common.cancel')}
		variant="danger"
		onConfirm={handleClearAll}
		onCancel={() => (showClearAllModal = false)}
		error={actionError ? errorText(actionError) : null}
	/>
{/if}

{#if showResetSettingsModal}
	<ConfirmModal
		title={t('settings.resetSettings.title')}
		description={t('common.deleteIrreversible')}
		confirmText={t('common.reset')}
		cancelText={t('common.cancel')}
		variant="danger"
		onConfirm={handleResetSettings}
		onCancel={() => (showResetSettingsModal = false)}
		error={actionError ? errorText(actionError) : null}
	/>
{/if}

{#if showModal}
	<Modal
		title={t('common.inDevelopment')}
		description={t('common.comingInV2')}
		confirmText={t('common.gotIt')}
		onConfirm={modalToggle}
	/>
{/if}

<style>
	.settings-page {
		min-height: 100vh;
		padding: 24px 16px 110px;
		color: var(--text-primary);
	}

	.settings-header {
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
	.setting-row p {
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.settings-section {
		display: grid;
		gap: 16px;
		padding: 20px;
		margin-bottom: 16px;
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		background-color: var(--surface-primary);
	}

	.error-text {
		margin-bottom: 16px;
		padding: 12px 14px;
		border: 1px solid var(--state-danger-soft-border);
		border-radius: 14px;
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
		font-size: 14px;
		font-weight: 700;
		line-height: 1.4;
	}

	.section-heading h2 {
		margin-bottom: 4px;
		font-size: 20px;
	}

	.setting-row {
		display: grid;
		min-width: 0;
		gap: 14px;
		padding-top: 16px;
		border-top: 1px solid var(--border-primary);
	}

	.setting-row h3 {
		margin-bottom: 4px;
		font-size: 16px;
	}

	.segmented-control,
	.language-grid,
	.actions-grid {
		display: grid;
		gap: 8px;
	}

	.segmented-control {
		grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
		padding: 4px;
		border-radius: 16px;
		background-color: var(--surface-input);
	}

	button,
	select {
		min-width: 0;
		min-height: 44px;
		border: 1px solid var(--border-secondary);
		border-radius: 14px;
		background-color: var(--surface-input-strong);
		color: var(--text-primary);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	button {
		padding: 10px 14px;
		overflow-wrap: anywhere;
	}

	button:focus-visible,
	select:focus-visible,
	.switch-row input:focus-visible + .switch {
		outline: 2px solid var(--border-accent);
		outline-offset: 3px;
	}

	button:disabled,
	select:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	select {
		width: 100%;
		padding: 0 14px;
	}

	button.selected {
		border-color: var(--accent-primary);
		background-color: var(--accent-primary-bg);
		color: var(--text-accent);
	}

	.switch-row {
		position: relative;
		grid-template-columns: 1fr auto;
		align-items: center;
		cursor: pointer;
	}

	.switch-row:has(input:disabled) {
		cursor: not-allowed;
		opacity: 0.65;
	}

	.switch-row input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.switch {
		flex-shrink: 0;
		width: 52px;
		height: 30px;
		border-radius: 999px;
		background-color: var(--surface-muted);
		position: relative;
		transition: 0.2s;
	}

	.switch::after {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background-color: var(--text-on-danger);
		transition: 0.2s;
	}

	.switch-row input:checked + .switch {
		background-color: var(--accent-primary);
	}

	.switch-row input:checked + .switch::after {
		transform: translateX(22px);
	}

	.language-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.language-grid button {
		display: grid;
		gap: 4px;
		padding: 12px;
	}

	.language-grid small {
		color: var(--text-secondary);
	}

	.actions-grid {
		grid-template-columns: 1fr;
	}

	.secondary-action {
		background-color: var(--surface-input-strong);
	}

	.danger-action {
		border-color: var(--state-danger-soft-border);
		background-color: var(--state-danger-soft-bg);
		color: var(--state-danger-soft-text);
	}

	.methods-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.security-icon {
		flex-shrink: 0;
		color: var(--text-secondary);
	}

	.method-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-width: 0;
		padding-top: 20px;
		border-top: 1px solid var(--border-primary);
	}

	.method-info {
		display: flex;
		align-items: center;
		gap: 16px;
		min-width: 0;
	}

	.method-icon {
		display: grid;
		place-items: center;
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		color: var(--text-primary);
	}

	.method-copy {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.method-copy h3 {
		margin-bottom: 4px;
		font-size: 16px;
	}

	.method-copy p {
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.method-action {
		flex-shrink: 0;
		background: transparent;
	}

	.method-action.danger-action {
		background: var(--state-danger-soft-bg);
	}

	.methods-loading {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.spinner {
		flex: 0 0 20px;
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-secondary);
		border-top-color: var(--accent-primary);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}

	.methods-state .error-text,
	.login-methods .error-text {
		margin: 0;
	}

	.retry-action { justify-self: start; }

	.method-hint {
		padding: 12px 14px;
		border-radius: 8px;
		background: var(--surface-input);
		color: var(--text-secondary);
		font-size: 13px;
		line-height: 1.6;
	}

	.method-email { overflow-wrap: anywhere; }

	.method-action { max-width: 100%; }
	.settings-section { min-width: 0; }

	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }

	.connect-action {
		border-color: transparent;
		background: var(--gradient-primary);
		color: var(--text-on-accent);
	}

	@media (max-width: 479px) {
		.method-row {
			flex-wrap: wrap;
		}

		.method-action {
			width: 100%;
		}
	}

	.about-list {
		display: grid;
		gap: 12px;
	}

	.about-list div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--border-primary);
	}

	.about-list span {
		color: var(--text-secondary);
	}

	@media (min-width: 768px) {
		.settings-page {
			width: min(100%, 1120px);
			margin-inline: auto;
			padding: 32px 32px 48px;
		}

		.settings-header {
			grid-template-columns: 1fr minmax(260px, 420px);
			align-items: end;
		}

		.setting-row {
			grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
			align-items: center;
		}

		.switch-row {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.actions-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.actions-grid > button:last-child:nth-child(odd) {
			grid-column: 1 / -1;
		}
	}

	@media (min-width: 1180px) {
		.settings-page {
			padding: 40px 40px 56px;
		}
	}
</style>
