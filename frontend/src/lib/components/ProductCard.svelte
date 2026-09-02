<script lang="ts">
	import type { Product } from '$lib/api/client';
	import { formatPrice, t } from '$lib/i18n';

	interface Props {
		product: Product;
	}

	let { product }: Props = $props();
</script>

<a
	href="/products/{product.slug}"
	class="tile group"
	aria-label="{product.name}, {formatPrice(product.price_cents)}"
>
	<div class="tile-image">
		{#if product.image_url}
			<img src={product.image_url} alt={product.name} class="tile-photo" loading="lazy" />
		{:else}
			<div class="tile-placeholder">{$t('product.noImage')}</div>
		{/if}

		{#if !product.in_stock}
			<span class="tile-badge">{$t('product.soldOut')}</span>
		{/if}
	</div>

	<div class="tile-meta">
		<h2 class="tile-name">{product.name}</h2>
		<p class="tile-price">{formatPrice(product.price_cents)}</p>
	</div>
</a>
