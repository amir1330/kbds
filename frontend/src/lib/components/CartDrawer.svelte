<script lang="ts">
	import { cart, cartOpen, cartLoading, closeCart, removeItem, updateQuantity } from '$lib/stores/cart';
	import { formatPrice, t } from '$lib/i18n';
	import Button from '$lib/components/Button.svelte';

	let checkoutOpen = $state(false);
	let email = $state('');
	let name = $state('');
	let phone = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let orderError = $state('');
	let orderSuccess = $state(false);

	async function handleCheckout(e: Event) {
		e.preventDefault();
		submitting = true;
		orderError = '';
		try {
			const { api } = await import('$lib/api/client');
			await api.placeOrder({ email, name, phone: phone || undefined, notes: notes || undefined });
			orderSuccess = true;
			checkoutOpen = false;
		} catch (err) {
			orderError = err instanceof Error ? err.message : $t('cart.checkoutFailed');
		} finally {
			submitting = false;
		}
	}
</script>

{#if $cartOpen}
	<button
		type="button"
		class="fixed inset-0 z-50 bg-[#1d2021]/85"
		aria-label={$t('cart.closeAria')}
		onclick={closeCart}
	></button>
{/if}

<aside
	class="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-bg transition-transform duration-150 {$cartOpen
		? 'translate-x-0'
		: 'translate-x-full'}"
	aria-hidden={!$cartOpen}
	aria-label={$t('cart.shoppingCart')}
>
	<div class="flex items-center justify-between border-b border-border-subtle px-4 py-3">
		<h2 class="text-[10px] uppercase tracking-[0.2em] text-dim">{$t('cart.title')}</h2>
		<Button label={$t('common.close')} variant="ghost" onclick={closeCart} />
	</div>

	{#if orderSuccess}
		<div class="border-b border-border-subtle bg-box px-4 py-3 text-xs text-success">
			{$t('cart.orderSuccess')}
		</div>
	{/if}

	<div class="flex-1 overflow-y-auto p-4">
		{#if $cart.items.length === 0}
			<p class="text-xs text-muted">{$t('cart.empty')}</p>
		{:else}
			<ul class="flex flex-col gap-3">
				{#each $cart.items as item (item.product_id)}
					<li class="graybox p-3">
						<div class="flex gap-3">
							{#if item.image_url}
								<img
									src={item.image_url}
									alt=""
									class="h-14 w-14 shrink-0 border border-border-subtle object-cover grayscale-[20%]"
								/>
							{/if}
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex justify-between gap-2">
									<span class="truncate text-xs uppercase tracking-wide text-bright">{item.name}</span>
									<span class="shrink-0 text-xs tabular-nums">{formatPrice(item.price_cents)}</span>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<Button
										label="−"
										variant="ghost"
										disabled={$cartLoading}
										onclick={() => updateQuantity(item.product_id, item.quantity - 1)}
									/>
									<span class="min-w-6 text-center text-xs tabular-nums">{item.quantity}</span>
									<Button
										label="+"
										variant="ghost"
										disabled={$cartLoading}
										onclick={() => updateQuantity(item.product_id, item.quantity + 1)}
									/>
									<Button
										label={$t('common.remove')}
										variant="ghost"
										class="ml-auto"
										disabled={$cartLoading}
										onclick={() => removeItem(item.product_id)}
									/>
								</div>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="border-t border-border-subtle p-4">
		<div class="mb-4 flex justify-between text-xs">
			<span class="text-dim">{$t('common.total')}</span>
			<span class="tabular-nums text-bright">{formatPrice($cart.total_cents)}</span>
		</div>

		{#if checkoutOpen}
			<form class="space-y-3" onsubmit={handleCheckout}>
				<div>
					<label class="label" for="checkout-name">{$t('common.name')}</label>
					<input id="checkout-name" class="input" bind:value={name} required />
				</div>
				<div>
					<label class="label" for="checkout-email">{$t('common.email')}</label>
					<input id="checkout-email" class="input" type="email" bind:value={email} required />
				</div>
				<div>
					<label class="label" for="checkout-phone">{$t('common.phone')}</label>
					<input id="checkout-phone" class="input" bind:value={phone} />
				</div>
				<div>
					<label class="label" for="checkout-notes">{$t('common.notes')}</label>
					<textarea id="checkout-notes" class="input min-h-20" bind:value={notes}></textarea>
				</div>
				{#if orderError}
					<p class="text-xs text-danger">{orderError}</p>
				{/if}
				<div class="flex gap-2">
					<Button
						label={submitting ? $t('cart.placing') : $t('cart.placeOrder')}
						variant="primary"
						type="submit"
						disabled={submitting}
						class="flex-1"
					/>
					<Button label={$t('common.back')} variant="ghost" onclick={() => (checkoutOpen = false)} />
				</div>
			</form>
		{:else}
			<Button
				label={$t('cart.checkout')}
				variant="primary"
				class="w-full"
				disabled={$cart.items.length === 0}
				onclick={() => (checkoutOpen = true)}
			/>
		{/if}
	</div>
</aside>
