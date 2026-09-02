export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface Product {
	id: number;
	slug: string;
	name: string;
	tagline: string;
	description: string;
	price_cents: number;
	image_url: string;
	image_urls: string[];
	switches: string;
	microcontroller: string;
	trackball: string | null;
	firmware_type: string;
	firmware_url: string | null;
	build_guide_url: string | null;
	kle_layout: Record<string, unknown> | null;
	in_stock: boolean;
	featured: boolean;
}

export interface CartItem {
	product_id: number;
	slug: string;
	name: string;
	price_cents: number;
	image_url: string;
	quantity: number;
}

export interface Cart {
	session_id: string;
	items: CartItem[];
	total_cents: number;
	item_count: number;
}

export interface ContactPayload {
	name: string;
	email: string;
	message: string;
}

export interface OrderPayload {
	email: string;
	name: string;
	phone?: string;
	notes?: string;
}

export interface EditorConfig {
	snap_step_u: number;
	rotation_step_deg: number;
	nudge_fine_u: number;
	nudge_coarse_u: number;
	default_mirror_split: boolean;
}

export interface LayoutPresetMeta {
	id: number;
	slug: string;
	label: string;
	description: string;
	form_factor: string;
	static_file: string | null;
	layout_json: Record<string, unknown> | null;
	enabled: boolean;
	sort_order: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		credentials: 'include'
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(body || res.statusText);
	}

	if (res.status === 204) return undefined as T;
	return res.json();
}

export const api = {
	getProducts: () => request<Product[]>('/products'),
	getProduct: (slug: string) => request<Product>(`/products/${slug}`),
	getCart: () => request<Cart>('/cart'),
	addToCart: (productId: number, quantity = 1) =>
		request<Cart>('/cart/items', {
			method: 'POST',
			body: JSON.stringify({ product_id: productId, quantity })
		}),
	updateCartItem: (productId: number, quantity: number) =>
		request<Cart>(`/cart/items/${productId}`, {
			method: 'PATCH',
			body: JSON.stringify({ quantity })
		}),
	removeFromCart: (productId: number) =>
		request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' }),
	clearCart: () => request<Cart>('/cart', { method: 'DELETE' }),
	placeOrder: (payload: OrderPayload) =>
		request<{ order_id: number }>('/orders', {
			method: 'POST',
			body: JSON.stringify(payload)
		}),
	submitContact: (payload: ContactPayload) =>
		request<{ ok: boolean }>('/contact', {
			method: 'POST',
			body: JSON.stringify(payload)
		}),
	submitBuildRequest: (payload: Record<string, unknown>) =>
		request<{ ok: boolean; request_id: number }>('/build-requests', {
			method: 'POST',
			body: JSON.stringify(payload)
		}),
	getEditorConfig: () => request<EditorConfig>('/layout/editor-config'),
	getLayoutPresets: () => request<LayoutPresetMeta[]>('/layout/presets'),
	login: (username: string, password: string) =>
		request<{ access_token: string }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ username, password })
		}),
	admin: {
		getProducts: (token: string) =>
			request<Product[]>('/admin/products', {
				headers: { Authorization: `Bearer ${token}` }
			}),
		createProduct: (token: string, data: Partial<Product>) =>
			request<Product>('/admin/products', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify(data)
			}),
		updateProduct: (token: string, id: number, data: Partial<Product>) =>
			request<Product>(`/admin/products/${id}`, {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify(data)
			}),
		deleteProduct: (token: string, id: number) =>
			request<void>(`/admin/products/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			}),
		uploadFirmware: (token: string, id: number, file: File) => {
			const form = new FormData();
			form.append('file', file);
			return fetch(`${API_BASE}/admin/products/${id}/firmware`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: form,
				credentials: 'include'
			}).then(async (res) => {
				if (!res.ok) throw new Error(await res.text());
				return res.json() as Promise<Product>;
			});
		},
		uploadBuildGuide: (token: string, id: number, file: File) => {
			const form = new FormData();
			form.append('file', file);
			return fetch(`${API_BASE}/admin/products/${id}/build-guide`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: form,
				credentials: 'include'
			}).then(async (res) => {
				if (!res.ok) throw new Error(await res.text());
				return res.json() as Promise<Product>;
			});
		},
		uploadImages: (token: string, id: number, files: File[]) => {
			const form = new FormData();
			for (const file of files) {
				form.append('files', file);
			}
			return fetch(`${API_BASE}/admin/products/${id}/images`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: form,
				credentials: 'include'
			}).then(async (res) => {
				if (!res.ok) throw new Error(await res.text());
				return res.json() as Promise<Product>;
			});
		},
		deleteImage: (token: string, id: number, index: number) =>
			request<Product>(`/admin/products/${id}/images/${index}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			}),
		setCoverImage: (token: string, id: number, index: number) =>
			request<Product>(`/admin/products/${id}/images/${index}/cover`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` }
			}),
		getEditorSettings: (token: string) =>
			request<EditorConfig>('/admin/editor-settings', {
				headers: { Authorization: `Bearer ${token}` }
			}),
		updateEditorSettings: (token: string, data: Partial<EditorConfig>) =>
			request<EditorConfig>('/admin/editor-settings', {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify(data)
			}),
		getLayoutPresets: (token: string) =>
			request<LayoutPresetMeta[]>('/admin/layout-presets', {
				headers: { Authorization: `Bearer ${token}` }
			}),
		createLayoutPreset: (token: string, data: Partial<LayoutPresetMeta>) =>
			request<LayoutPresetMeta>('/admin/layout-presets', {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify(data)
			}),
		updateLayoutPreset: (token: string, id: number, data: Partial<LayoutPresetMeta>) =>
			request<LayoutPresetMeta>(`/admin/layout-presets/${id}`, {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify(data)
			}),
		deleteLayoutPreset: (token: string, id: number) =>
			request<void>(`/admin/layout-presets/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			})
	}
};

export function formatPrice(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(cents / 100);
}
