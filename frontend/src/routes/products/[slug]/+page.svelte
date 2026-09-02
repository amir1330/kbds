<script lang="ts">
	import { addToCart } from '$lib/stores/cart';
	import { formatPrice } from '$lib/i18n';
	import KleCanvas from '$lib/components/KleCanvas.svelte';
	import Button from '$lib/components/Button.svelte';
	import ImageCarousel from '$lib/components/ImageCarousel.svelte';
	import { parseKleJson } from '$lib/kle/parser';
	import { t } from '$lib/i18n';

	let { data } = $props();
	const product = $derived(data.product);

	const kleLayout = $derived(
		product.kle_layout ? parseKleJson(product.kle_layout) : null
	);

	let adding = $state(false);

	async function handleAdd() {
		adding = true;
		try {
			await addToCart(product.id);
		} finally {
			adding = false;
		}
	}
</script>

<div class="page">
	<div class="mb-5">
		<Button href="/" label={$t('common.back')} variant="ghost" />
	</div>

	<div class="graybox mb-6 overflow-hidden">
		<ImageCarousel
			images={product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []}
			alt={product.name}
		/>
	</div>
	<header class="mb-6 border-b border-border-subtle pb-5">
		<p class="mb-1 text-[10px] uppercase tracking-[0.2em] text-dim">{product.firmware_type}</p>
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="page-title">{product.name}</h1>
				<p class="page-lead mt-1">{product.tagline}</p>
			</div>
			<p class="text-base tabular-nums text-accent">{formatPrice(product.price_cents)}</p>
		</div>
	</header>

	<section class="mb-6">
		<h2 class="section-label">{$t('product.specs')}</h2>
		<div class="graybox p-4">
			<table class="spec-table">
				<tbody>
					<tr>
						<th>{$t('product.switches')}</th>
						<td>{product.switches}</td>
					</tr>
					<tr>
						<th>{$t('product.mcu')}</th>
						<td>{product.microcontroller}</td>
					</tr>
					{#if product.trackball}
						<tr>
							<th>{$t('product.trackball')}</th>
							<td>{product.trackball}</td>
						</tr>
					{/if}
					<tr>
						<th>{$t('product.firmware')}</th>
						<td>{product.firmware_type}</td>
					</tr>
					<tr>
						<th>{$t('product.stock')}</th>
						<td>{product.in_stock ? $t('product.available') : $t('product.outOfStock')}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<section class="mb-8">
		<h2 class="section-label">{$t('product.about')}</h2>
		<div class="graybox p-4">
			<p class="text-xs leading-relaxed text-muted">{product.description}</p>
		</div>
	</section>

	<div class="mb-10 flex flex-wrap gap-2">
		<Button
			label={adding ? $t('product.adding') : $t('product.addToCart')}
			variant="primary"
			disabled={!product.in_stock || adding}
			onclick={handleAdd}
		/>
		{#if product.firmware_url}
			<Button href={product.firmware_url} label={$t('product.downloadUf2')} download />
		{/if}
		{#if product.build_guide_url}
			<Button href={product.build_guide_url} label={$t('product.buildGuide')} target="_blank" rel="noopener" />
		{/if}
	</div>

	{#if kleLayout}
		<section>
			<h2 class="section-label">{$t('product.defaultLayout')}</h2>
			<div class="graybox overflow-x-auto p-4">
				<KleCanvas layout={kleLayout} />
			</div>
		</section>
	{/if}
</div>
