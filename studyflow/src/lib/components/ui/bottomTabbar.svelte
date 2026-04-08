<script>

</script>

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
		background-color: var(--bg-primary);
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
</style>