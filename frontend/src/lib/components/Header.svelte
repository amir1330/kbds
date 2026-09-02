<script lang="ts">
	import { cartCount, openCart } from '$lib/stores/cart';
	import Button from '$lib/components/Button.svelte';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
	import { t } from '$lib/i18n';

	const links = $derived([
		{ href: '/', label: $t('nav.store') },
		{ href: '/request', label: $t('nav.requestBuild') },
		{ href: '/contact', label: $t('nav.contact') }
	]);
</script>

<header class="sticky top-0 z-40 border-b border-border-subtle bg-bg">
	<div class="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-3 md:px-6">
		<a href="/" class="text-xs uppercase tracking-[0.22em] text-bright no-underline">
			cstm.kbds
		</a>

		<nav class="hidden items-center gap-1 md:flex" aria-label={$t('nav.main')}>
			{#each links as link}
				<a href={link.href} class="nav-link px-2 py-1">
					<span class="text-dim">[</span>{link.label}<span class="text-dim">]</span>
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
			<LocaleSwitcher />
			<Button
				label={$cartCount > 0 ? $t('nav.cartCount', { count: $cartCount }) : $t('nav.cart')}
				variant="ghost"
				onclick={openCart}
			/>
		</div>
	</div>
</header>

<nav class="flex gap-1 border-b border-border-subtle px-4 py-2 md:hidden" aria-label={$t('nav.mobile')}>
	{#each links as link}
		<a href={link.href} class="nav-link px-2 py-1 text-[10px]">
			<span class="text-dim">[</span>{link.label}<span class="text-dim">]</span>
		</a>
	{/each}
</nav>
