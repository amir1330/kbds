import type { HandleFetch } from '@sveltejs/kit';

const API_URL = process.env.API_URL || 'http://localhost:8001';

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
	const url = new URL(request.url);

	if (url.pathname.startsWith('/api')) {
		const target = `${API_URL}${url.pathname}${url.search}`;
		return fetch(target, {
			method: request.method,
			headers: request.headers,
			body: request.body,
			// @ts-expect-error duplex needed for streaming bodies in Node 18+
			duplex: 'half'
		});
	}

	return fetch(request);
};
