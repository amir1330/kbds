<script lang="ts">
	import ProductCard from '$lib/components/ProductCard.svelte';
	import Button from '$lib/components/Button.svelte';
	import { t } from '$lib/i18n';

	let { data } = $props();
</script>

<div class="page catalog-page">
	<header class="catalog-header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="page-title">{$t('home.title')}</h1>
			<p class="page-lead">{$t('home.lead')}</p>
		</div>
		<Button href="/request" label={$t('home.requestCustomBuild')} variant="primary" />
	</header>

	{#if data.products.length === 0}
		<div class="graybox p-10 text-center text-xs text-muted">{$t('home.noListings')}</div>
	{:else}
		<div class="catalog-grid">
			{#each data.products as product (product.id)}
				<ProductCard {product} />
			{/each}
		</div>
	{/if}
</div>
