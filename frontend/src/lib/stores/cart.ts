import { writable, derived } from 'svelte/store';
import { api, type Cart } from '$lib/api/client';

const emptyCart: Cart = {
	session_id: '',
	items: [],
	total_cents: 0,
	item_count: 0
};

export const cartOpen = writable(false);
export const cart = writable<Cart>(emptyCart);
export const cartLoading = writable(false);

export const cartCount = derived(cart, ($cart) => $cart.item_count);

export async function loadCart() {
	cartLoading.set(true);
	try {
		const data = await api.getCart();
		cart.set(data);
	} catch {
		cart.set(emptyCart);
	} finally {
		cartLoading.set(false);
	}
}

export async function addToCart(productId: number, quantity = 1) {
	cartLoading.set(true);
	try {
		const data = await api.addToCart(productId, quantity);
		cart.set(data);
		cartOpen.set(true);
	} finally {
		cartLoading.set(false);
	}
}

export async function updateQuantity(productId: number, quantity: number) {
	cartLoading.set(true);
	try {
		const data =
			quantity <= 0
				? await api.removeFromCart(productId)
				: await api.updateCartItem(productId, quantity);
		cart.set(data);
	} finally {
		cartLoading.set(false);
	}
}

export async function removeItem(productId: number) {
	cartLoading.set(true);
	try {
		const data = await api.removeFromCart(productId);
		cart.set(data);
	} finally {
		cartLoading.set(false);
	}
}

export function openCart() {
	cartOpen.set(true);
}

export function closeCart() {
	cartOpen.set(false);
}

export function toggleCart() {
	cartOpen.update((v) => !v);
}
