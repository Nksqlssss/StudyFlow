<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';

	let isVisible = $state(false);

	onMount(() => {
		const frame = requestAnimationFrame(() => {
			isVisible = true;
		});

		return () => cancelAnimationFrame(frame);
	});

	const features = [
		{
			metric: '01',
			title: 'Предметы под контролем',
			description:
				'Каждый предмет живёт отдельно: прогресс, задания, приоритеты и понятная картина нагрузки.'
		},
		{
			metric: '02',
			title: 'Задания без хаоса',
			description:
				'Активные, выполненные и срочные задачи разделены так, чтобы не искать важное глазами.'
		},
		{
			metric: '03',
			title: 'Всегда под рукой',
			description:
				'Открывай StudyFlow, когда нужно быстро понять, что делать дальше и на чём сфокусироваться.'
		}
	];
</script>

<main class="landing-page" class:is-visible={isVisible}>
	<section class="landing-hero">
		<header class="landing-header">
			<a href={resolve('/')} class="brand-link" aria-label="StudyFlow">
				<img src="/icons/studyFlow.svg" alt="" class="brand-icon" />
				<span>StudyFlow</span>
			</a>

			<nav class="landing-nav" aria-label="Главная навигация">
				<a href={resolve('/login')}>Войти</a>
				<a href={resolve('/register')} class="nav-cta">Создать аккаунт</a>
			</nav>
		</header>

		<div class="hero-content">
			<p class="eyebrow">Учёба без хаоса</p>
			<h1>Учёба наконец выглядит управляемой</h1>
			<p class="hero-description">
				StudyFlow собирает предметы, задания, дедлайны и прогресс в спокойный рабочий стол, который
				хочется открыть перед учёбой, а не закрыть через пять секунд.
			</p>
			<div class="hero-actions">
				<a href={resolve('/register')} class="primary-link">Начать бесплатно</a>
				<a href={resolve('/login')} class="secondary-link">У меня уже есть аккаунт</a>
			</div>
			<div class="hero-meta">
				<span>Предметы и задания в одном месте</span>
				<span>Чистый интерфейс без лишнего шума</span>
			</div>
		</div>

		<div class="hero-product" aria-hidden="true">
			<div class="product-window">
				<div class="window-topbar">
					<span></span>
					<span></span>
					<span></span>
				</div>

				<div class="product-header">
					<div>
						<p>Сегодня</p>
						<strong>4 предмета · 12 заданий</strong>
					</div>
					<div class="score-pill">72%</div>
				</div>

				<div class="product-grid">
					<div class="product-card active-card">
						<div class="card-icon"><img src="/icons/code.svg" alt="" /></div>
						<div>
							<strong>Frontend</strong>
							<span>Проект, формы, API</span>
						</div>
						<div class="mini-progress"><span></span></div>
					</div>

					<div class="product-card">
						<div class="card-icon"><img src="/icons/math.svg" alt="" /></div>
						<div>
							<strong>Алгебра</strong>
							<span>2 задания до пятницы</span>
						</div>
						<div class="mini-progress second"><span></span></div>
					</div>

					<div class="task-stack">
						<div class="task-chip high-priority">
							<span>High</span>
							<strong>Подготовить auth flow</strong>
						</div>
						<div class="task-chip">
							<span>Medium</span>
							<strong>Повторить Prisma relations</strong>
						</div>
						<div class="done-line">Выполненные задания</div>
					</div>
				</div>
			</div>

			<div class="floating-badge badge-top">
				<img src="/icons/language.svg" alt="" />
				<span>RU · EN · PL</span>
			</div>
		</div>
	</section>

	<section class="features-section" aria-label="Возможности StudyFlow">
		<div class="section-heading">
			<p class="eyebrow">Почему это удобно</p>
			<h2>Не просто список дел, а учебный рабочий стол</h2>
		</div>

		<div class="features-grid">
			{#each features as feature (feature.title)}
				<article class="feature-card">
					<span>{feature.metric}</span>
					<h3>{feature.title}</h3>
					<p>{feature.description}</p>
				</article>
			{/each}
		</div>
	</section>
</main>

<style>
	.landing-page {
		overflow: hidden;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.landing-hero {
		position: relative;
		min-height: 100vh;
		padding: 24px max(20px, calc((100vw - 1120px) / 2));
		display: grid;
		grid-template-columns: minmax(0, 0.92fr) minmax(380px, 0.78fr);
		align-items: center;
		gap: clamp(32px, 5vw, 72px);
		justify-content: center;
		isolation: isolate;
		background:
			linear-gradient(180deg, transparent 0%, var(--bg-primary) 94%),
			radial-gradient(circle at 78% 24%, var(--accent-primary-bg), transparent 34%),
			radial-gradient(
				circle at 12% 78%,
				color-mix(in srgb, var(--accent-success) 18%, transparent),
				transparent 32%
			),
			var(--bg-primary);
	}

	.landing-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		opacity: 0.24;
		background-image:
			linear-gradient(var(--border-primary) 1px, transparent 1px),
			linear-gradient(90deg, var(--border-primary) 1px, transparent 1px);
		background-size: 72px 72px;
		mask-image: linear-gradient(90deg, transparent, #000 16%, #000 72%, transparent);
	}

	.landing-header {
		position: absolute;
		top: 24px;
		left: max(20px, calc((100vw - 1120px) / 2));
		right: max(20px, calc((100vw - 1120px) / 2));
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.brand-link,
	.landing-nav {
		display: inline-flex;
		align-items: center;
	}

	.brand-link {
		gap: 10px;
		font-size: 18px;
		font-weight: 700;
	}

	.brand-icon {
		width: 34px;
		height: 34px;
	}

	.landing-nav {
		gap: 10px;
		font-size: 14px;
		font-weight: 700;
	}

	.landing-nav a {
		min-height: 40px;
		display: inline-flex;
		align-items: center;
		padding: 0 14px;
		border-radius: 12px;
		color: var(--text-secondary);
	}

	.landing-nav .nav-cta {
		background: var(--surface-primary);
		border: 1px solid var(--border-primary);
		color: var(--text-primary);
		box-shadow: 0 18px 50px var(--shadow-panel);
	}

	.hero-content {
		position: relative;
		z-index: 2;
		max-width: 700px;
		padding-top: 96px;
		animation: rise-in 700ms ease both;
		animation-play-state: paused;
	}

	.eyebrow {
		margin: 0 0 14px;
		color: var(--accent-primary);
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		max-width: 680px;
		font-size: clamp(42px, 6.4vw, 78px);
		line-height: 0.98;
		letter-spacing: 0;
	}

	.hero-description {
		max-width: 560px;
		margin: 22px 0 0;
		color: var(--text-secondary);
		font-size: 17px;
		line-height: 1.6;
		animation: rise-in 700ms ease 90ms both;
		animation-play-state: paused;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 32px;
		animation: rise-in 700ms ease 160ms both;
		animation-play-state: paused;
	}

	.primary-link,
	.secondary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 52px;
		padding: 0 22px;
		border-radius: 14px;
		font-size: 15px;
		font-weight: 700;
	}

	.primary-link {
		background: var(--gradient-primary);
		color: var(--text-on-accent);
		box-shadow: 0 18px 48px var(--shadow-accent);
	}

	.secondary-link {
		border: 1px solid var(--border-primary);
		background: color-mix(in srgb, var(--surface-primary) 78%, transparent);
		color: var(--text-primary);
	}

	.hero-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
		color: var(--text-secondary);
		font-size: 13px;
		animation: rise-in 700ms ease 230ms both;
		animation-play-state: paused;
	}

	.hero-meta span {
		padding: 8px 10px;
		border: 1px solid var(--border-primary);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-primary) 68%, transparent);
	}

	.hero-product {
		position: relative;
		z-index: 2;
		justify-self: end;
		width: min(100%, 460px);
		padding-top: 96px;
		animation: product-in 800ms ease 120ms both;
		animation-play-state: paused;
	}

	.product-window {
		position: relative;
		overflow: hidden;
		padding: 16px;
		border: 1px solid var(--border-primary);
		border-radius: 30px;
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--surface-primary) 94%, transparent),
				var(--surface-tertiary)
			),
			var(--surface-primary);
		box-shadow: 0 34px 120px var(--shadow-panel);
		backdrop-filter: blur(18px);
	}

	.product-window::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			120deg,
			transparent 0%,
			color-mix(in srgb, var(--accent-primary) 16%, transparent) 48%,
			transparent 100%
		);
		transform: translateX(-70%);
		animation: sheen 5.6s ease-in-out 1s infinite;
	}

	.window-topbar,
	.product-header,
	.product-grid {
		position: relative;
		z-index: 1;
	}

	.window-topbar {
		display: flex;
		gap: 7px;
		padding: 4px 2px 16px;
	}

	.window-topbar span {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--surface-muted);
	}

	.product-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 18px;
		border-radius: 22px;
		background: color-mix(in srgb, var(--bg-primary) 72%, transparent);
		animation: rise-in 650ms ease 220ms both;
		animation-play-state: paused;
	}

	.product-header p {
		margin: 0 0 6px;
		color: var(--text-secondary);
		font-size: 13px;
	}

	.product-header strong {
		font-size: 20px;
	}

	.score-pill {
		display: grid;
		place-items: center;
		width: 58px;
		height: 58px;
		border: 1px solid var(--border-accent);
		border-radius: 20px;
		background: var(--accent-primary-bg);
		color: var(--accent-success);
		font-weight: 900;
	}

	.product-grid {
		display: grid;
		gap: 12px;
		margin-top: 12px;
	}

	.product-card {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 4px;
		padding: 16px;
		border: 1px solid var(--border-primary);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-primary) 82%, transparent);
		animation: rise-in 650ms ease 320ms both;
		animation-play-state: paused;
	}

	.product-card:nth-child(2) {
		animation-delay: 420ms;
	}

	.product-card.active-card {
		border-color: var(--border-accent);
		box-shadow: 0 22px 70px var(--shadow-accent-soft);
	}

	.card-icon {
		grid-row: span 2;
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border-radius: 15px;
		background: var(--surface-icon);
	}

	.card-icon img {
		width: 26px;
		height: 26px;
	}

	.product-card strong,
	.task-chip strong {
		font-size: 15px;
	}

	.product-card span,
	.task-chip span,
	.floating-badge {
		color: var(--text-secondary);
		font-size: 13px;
	}

	.mini-progress {
		grid-column: 1 / -1;
		height: 7px;
		margin-top: 8px;
		border-radius: 999px;
		background: var(--progress-bg);
	}

	.mini-progress span {
		display: block;
		width: 78%;
		height: 100%;
		border-radius: inherit;
		background: var(--gradient-primary);
	}

	.mini-progress.second span {
		width: 46%;
	}

	.task-stack {
		display: grid;
		gap: 10px;
		margin-top: 4px;
		animation: rise-in 650ms ease 520ms both;
		animation-play-state: paused;
	}

	.task-chip {
		display: grid;
		gap: 6px;
		padding: 14px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-primary) 68%, transparent);
		border: 1px solid var(--border-primary);
	}

	.high-priority {
		border-color: var(--priority-high-border);
		background: var(--priority-high-bg);
	}

	.high-priority span {
		color: var(--priority-high-text);
	}

	.done-line {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text-secondary);
		font-size: 12px;
		text-transform: uppercase;
	}

	.done-line::before,
	.done-line::after {
		content: '';
		height: 1px;
		flex: 1;
		background: var(--border-primary);
	}

	.floating-badge {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border: 1px solid var(--border-primary);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-primary) 90%, transparent);
		box-shadow: 0 18px 60px var(--shadow-panel);
		backdrop-filter: blur(14px);
		animation: float-soft 4.5s ease-in-out infinite;
		animation-play-state: paused;
	}

	.floating-badge img {
		width: 24px;
		height: 24px;
	}

	.badge-top {
		top: 76px;
		right: 12px;
	}

	.features-section {
		width: min(1120px, calc(100% - 40px));
		margin: 0 auto;
		padding: 72px 0 96px;
	}

	.section-heading {
		max-width: 620px;
	}

	.section-heading h2 {
		margin: 0;
		font-size: clamp(32px, 5vw, 56px);
		line-height: 1;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 28px;
	}

	.feature-card {
		position: relative;
		overflow: hidden;
		min-height: 210px;
		padding: 24px;
		border: 1px solid var(--border-primary);
		border-radius: 22px;
		background: var(--surface-primary);
		box-shadow: 0 20px 60px var(--shadow-panel);
		animation: rise-in 700ms ease both;
		animation-play-state: paused;
	}

	.is-visible .hero-content,
	.is-visible .hero-description,
	.is-visible .hero-actions,
	.is-visible .hero-meta,
	.is-visible .hero-product,
	.is-visible .product-header,
	.is-visible .product-card,
	.is-visible .task-stack,
	.is-visible .floating-badge,
	.is-visible .feature-card {
		animation-play-state: running;
	}

	.feature-card:nth-child(2) {
		animation-delay: 90ms;
	}

	.feature-card:nth-child(3) {
		animation-delay: 180ms;
	}

	.feature-card > span {
		display: inline-flex;
		margin-bottom: 40px;
		color: var(--accent-primary);
		font-size: 13px;
		font-weight: 900;
	}

	.feature-card h3 {
		margin: 0 0 12px;
		font-size: 20px;
	}

	.feature-card p {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	@media (max-width: 1100px) {
		.landing-hero {
			grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
			gap: 32px;
		}

		h1 {
			font-size: clamp(40px, 5.8vw, 64px);
		}

		.hero-description {
			max-width: 520px;
			font-size: 16px;
		}

		.hero-product {
			width: min(100%, 420px);
		}
	}

	@media (max-width: 900px) {
		.landing-hero {
			grid-template-columns: 1fr;
			min-height: auto;
			padding-top: 112px;
			padding-bottom: 56px;
		}

		.hero-content {
			padding-top: 0;
		}

		.hero-product {
			justify-self: stretch;
			width: min(100%, 520px);
			padding-top: 0;
		}

		.product-card.active-card {
			transform: none;
		}

		.badge-top {
			right: 12px;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.landing-header {
			align-items: flex-start;
		}

		.landing-nav {
			flex-direction: column;
			align-items: flex-end;
			gap: 4px;
		}

		.landing-nav a {
			min-height: 34px;
			padding: 0 10px;
		}

		h1 {
			font-size: 42px;
		}

		.hero-actions {
			display: grid;
		}

		.floating-badge {
			display: none;
		}
	}

	@keyframes rise-in {
		from {
			opacity: 0;
			transform: translateY(18px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes product-in {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes float-soft {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	@keyframes sheen {
		0% {
			transform: translateX(-70%);
		}
		50% {
			transform: translateX(70%);
		}
		100% {
			transform: translateX(-70%);
		}
	}
</style>
