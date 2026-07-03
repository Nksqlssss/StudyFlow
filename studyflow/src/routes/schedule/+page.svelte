<script lang="ts">
	import { translate, type TranslationKey } from '$lib/i18n';
	import { settings } from '$lib/stores/settings';

	const t = $derived((key: TranslationKey) => translate($settings.language, key));
</script>

<main>
	<div>
		<h1>{t('placeholder.inDevelopment')}</h1>
	</div>
</main>

<style>
	div {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		width: 100%;
	}

	h1 {
		color: var(--text-primary);
		font-size: 24px;
		font-weight: 700;
	}
</style>
