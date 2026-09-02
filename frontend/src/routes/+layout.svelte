<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import CartDrawer from '$lib/components/CartDrawer.svelte';
	import { loadCart } from '$lib/stores/cart';
	import { locale, setLocale, t } from '$lib/i18n';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		setLocale($locale);
		loadCart();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{$t('meta.title')}</title>
	<meta name="description" content={$t('meta.description')} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>

<CartDrawer />
