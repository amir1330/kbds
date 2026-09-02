<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		images: string[];
		alt: string;
	}

	let { images, alt }: Props = $props();

	let index = $state(0);

	const current = $derived(images[index] ?? images[0] ?? '');

	function prev() {
		if (images.length < 2) return;
		index = (index - 1 + images.length) % images.length;
	}

	function next() {
		if (images.length < 2) return;
		index = (index + 1) % images.length;
	}

	function goTo(i: number) {
		index = i;
	}
</script>

<div class="carousel">
	{#if current}
		<img src={current} {alt} class="carousel-image" />
	{:else}
		<div class="carousel-empty">{$t('carousel.noImage')}</div>
	{/if}

	{#if images.length > 1}
		<button type="button" class="carousel-btn carousel-prev" aria-label={$t('carousel.prev')} onclick={prev}>
			‹
		</button>
		<button type="button" class="carousel-btn carousel-next" aria-label={$t('carousel.next')} onclick={next}>
			›
		</button>
		<div class="carousel-dots">
			{#each images as _, i (i)}
				<button
					type="button"
					class="carousel-dot"
					class:carousel-dot-active={i === index}
					aria-label={$t('carousel.imageN', { n: i + 1 })}
					onclick={() => goTo(i)}
				></button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel {
		position: relative;
		overflow: hidden;
		background: var(--gb-bg0);
	}

	.carousel-image {
		display: block;
		width: 100%;
		max-height: 28rem;
		object-fit: cover;
	}

	.carousel-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 14rem;
		color: var(--gb-fg3);
		font-size: 0.75rem;
		text-transform: lowercase;
	}

	.carousel-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--gb-bg3);
		background: color-mix(in srgb, var(--gb-bg0) 85%, transparent);
		color: var(--gb-fg0);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}

	.carousel-btn:hover {
		border-color: var(--gb-yellow);
		color: var(--gb-yellow);
	}

	.carousel-prev {
		left: 0.5rem;
	}

	.carousel-next {
		right: 0.5rem;
	}

	.carousel-dots {
		position: absolute;
		bottom: 0.65rem;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		gap: 0.35rem;
	}

	.carousel-dot {
		width: 0.45rem;
		height: 0.45rem;
		padding: 0;
		border: 1px solid var(--gb-bg3);
		background: var(--gb-bg1);
		cursor: pointer;
	}

	.carousel-dot-active {
		background: var(--gb-yellow);
		border-color: var(--gb-yellow);
	}
</style>
