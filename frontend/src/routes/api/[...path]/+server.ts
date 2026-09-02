import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

const backendUrl = () => env.API_URL || 'http://localhost:8001';

/** Proxy browser /api/* requests to FastAPI (needed for Docker frontend without Traefik). */
export const fallback: RequestHandler = async ({ request, params, url }) => {
	const path = params.path ?? '';
	const target = `${backendUrl()}/api/${path}${url.search}`;

	const headers = new Headers(request.headers);
	headers.delete('host');

	const res = await fetch(target, {
		method: request.method,
		headers,
		body: request.body,
		// @ts-expect-error duplex required for Node fetch with body
		duplex: 'half'
	});

	const responseHeaders = new Headers(res.headers);
	responseHeaders.delete('content-encoding');

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: responseHeaders
	});
};
