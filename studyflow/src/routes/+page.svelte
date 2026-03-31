<script>

</script>

<header class="header">
	<div class="header-left-side">
		<h1 class="main-title">
			StudyFlow
		</h1>
	</div>
	<div class="header-right-side">
		<img src="/icons/lfIcon.svg" alt="" class="lf-image">
		<div class="profile-icon">
			.
		</div>
	</div>
</header>

<main class="main">
	<section class="overview">
		<h2 class="overview-title">
			Предметы
		</h2>
		<p class="overview-description">
			Ваш текущий прогресс обучения
		</p>
	</section>
</main>

<footer class="footer">
	<div class="bottom-tabbar">
		<button class="subjects-button bottom-tabbar-button is-current">
			<img src="/icons/subjectsIcon.svg" alt="" class="tabbar-icon">
			<p class="subjects-button-name">
				Предметы
			</p>
		</button>
		<button class="schedule-button bottom-tabbar-button">
			<img src="/icons/scheduleIcon.svg" alt="" class="tabbar-icon">
			<p class="schedule-button-name">
				Расписание
			</p>
		</button>
		<button class="profile-button bottom-tabbar-button">
			<img src="/icons/profileIcon.svg" alt="" class="tabbar-icon">
			<p class="profile-button-name">
				Профиль
			</p>
		</button>
		<button class="settings-button bottom-tabbar-button">
			<img src="/icons/settingsIcon.svg" alt="" class="tabbar-icon">
			<p class="settings-button-name">
				Настройки
			</p>
		</button>
	</div>
</footer>

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
		box-shadow: 0 -4px 20px 0 #000000A1;
		border-radius: 20px 20px 0 0;
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
		background-color: #6366F11A;
	}

	.tabbar-icon {
		width: 20px;
		height: 20px;
	}

	.is-current {
		background-color: #6366F11A;
	}

	.main {
		padding: 32px 24px;
	}

	.overview-title {
		font-size: 22px;
		font-weight: 900;
		letter-spacing: -0.55px;
		line-height: 33px;
		color: var(--text-secondary);
	}

	.overview-description {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 1.1px;
		line-height: 16px;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.header {
		max-height: 66px;
		height: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		background-color: var(--bg-secondary);
	}

	.header-right-side {
		display: flex;
		align-items: center;
		column-gap: 18px;
	}

	.profile-icon {
		width: 28px;
		height: 28px;
		display: flex;
		justify-content: center;
		background-color: var(--bg-primary);
		border-radius: 50%;
	}
</style>