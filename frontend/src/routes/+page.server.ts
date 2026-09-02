import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/api/products');
		if (!res.ok) return { products: [] };
		const products = await res.json();
		return { products };
	} catch {
		return { products: [] };
	}
};
