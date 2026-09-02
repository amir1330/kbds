import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/products/${params.slug}`);
	if (!res.ok) throw error(404, 'Product not found');
	const product = await res.json();
	return { product };
};
