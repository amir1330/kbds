<script lang="ts">
	import { api, type Product } from '$lib/api/client';
	import { formatPrice } from '$lib/api/client';
	import Button from '$lib/components/Button.svelte';
	import LayoutAdminPanel from '$lib/components/admin/LayoutAdminPanel.svelte';

	let token = $state('');
	let authenticated = $state(false);
	let username = $state('');
	let password = $state('');
	let loginError = $state('');
	let products = $state<Product[]>([]);
	let loading = $state(false);
	let tab = $state<'products' | 'layout' | 'requests' | 'contacts'>('products');

	type ProductsView = 'list' | 'form';
	let productsView = $state<ProductsView>('list');
	let editing = $state<Product | null>(null);

	let form = $state({
		name: '',
		slug: '',
		tagline: '',
		description: '',
		price_cents: 0,
		switches: '',
		microcontroller: '',
		trackball: '',
		firmware_type: 'ZMK',
		in_stock: true,
		featured: false
	});

	let uploadingImages = $state(false);

	async function login(e: Event) {
		e.preventDefault();
		loginError = '';
		try {
			const res = await api.login(username, password);
			token = res.access_token;
			localStorage.setItem('admin_token', token);
			authenticated = true;
			await loadProducts();
		} catch {
			loginError = 'Invalid credentials';
		}
	}

	async function loadProducts() {
		loading = true;
		try {
			products = await api.admin.getProducts(token);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		editing = null;
		form = {
			name: '',
			slug: '',
			tagline: '',
			description: '',
			price_cents: 0,
			switches: '',
			microcontroller: '',
			trackball: '',
			firmware_type: 'ZMK',
			in_stock: true,
			featured: false
		};
	}

	function syncEditing() {
		if (!editing) return;
		editing = products.find((p) => p.id === editing!.id) ?? editing;
	}

	function openList() {
		productsView = 'list';
		resetForm();
	}

	function openNew() {
		resetForm();
		productsView = 'form';
	}

	function openEdit(product: Product) {
		editing = product;
		form = {
			name: product.name,
			slug: product.slug,
			tagline: product.tagline,
			description: product.description,
			price_cents: product.price_cents,
			switches: product.switches,
			microcontroller: product.microcontroller,
			trackball: product.trackball ?? '',
			firmware_type: product.firmware_type,
			in_stock: product.in_stock,
			featured: product.featured
		};
		productsView = 'form';
	}

	async function saveProduct(e: Event) {
		e.preventDefault();
		const payload = {
			...form,
			price_cents: Number(form.price_cents),
			trackball: form.trackball || null
		};
		if (editing) {
			editing = await api.admin.updateProduct(token, editing.id, payload);
		} else {
			editing = await api.admin.createProduct(token, payload);
			productsView = 'form';
		}
		await loadProducts();
		syncEditing();
	}

	async function uploadImages(e: Event) {
		if (!editing) return;
		const input = e.target as HTMLInputElement;
		const files = input.files ? [...input.files] : [];
		if (!files.length) return;
		uploadingImages = true;
		try {
			editing = await api.admin.uploadImages(token, editing.id, files);
			await loadProducts();
			syncEditing();
		} finally {
			uploadingImages = false;
			input.value = '';
		}
	}

	async function removeImage(index: number) {
		if (!editing) return;
		editing = await api.admin.deleteImage(token, editing.id, index);
		await loadProducts();
		syncEditing();
	}

	async function makeCover(index: number) {
		if (!editing || index === 0) return;
		editing = await api.admin.setCoverImage(token, editing.id, index);
		await loadProducts();
		syncEditing();
	}

	async function deleteProduct() {
		if (!editing || !confirm('Delete this listing?')) return;
		await api.admin.deleteProduct(token, editing.id);
		openList();
		await loadProducts();
	}

	async function uploadFirmware(e: Event) {
		if (!editing) return;
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		editing = await api.admin.uploadFirmware(token, editing.id, file);
		await loadProducts();
	}

	async function uploadBuildGuide(e: Event) {
		if (!editing) return;
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		editing = await api.admin.uploadBuildGuide(token, editing.id, file);
		await loadProducts();
	}

	$effect(() => {
		const stored = localStorage.getItem('admin_token');
		if (stored) {
			token = stored;
			authenticated = true;
			loadProducts();
		}
	});
</script>

<div class="page">
	<header class="mb-8 border-b border-border-subtle pb-6">
		<h1 class="page-title">admin</h1>
		<p class="page-lead">Manage listings, layout editor, firmware, and build guides.</p>
	</header>

	{#if !authenticated}
		<form class="graybox mx-auto max-w-sm space-y-4 p-5" onsubmit={login}>
			<div>
				<label class="label" for="username">username</label>
				<input id="username" class="input" bind:value={username} required />
			</div>
			<div>
				<label class="label" for="password">password</label>
				<input id="password" class="input" type="password" bind:value={password} required />
			</div>
			{#if loginError}
				<p class="text-xs text-danger">{loginError}</p>
			{/if}
			<Button label="sign in" variant="primary" type="submit" class="w-full" />
		</form>
	{:else}
		<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
			<div class="pill-row">
				<button
					type="button"
					class="pill"
					class:pill-active={tab === 'products'}
					onclick={() => (tab = 'products')}
				>
					products
				</button>
				<button
					type="button"
					class="pill"
					class:pill-active={tab === 'layout'}
					onclick={() => (tab = 'layout')}
				>
					layout editor
				</button>
				<button
					type="button"
					class="pill"
					class:pill-active={tab === 'requests'}
					onclick={() => (tab = 'requests')}
				>
					requests
				</button>
				<button
					type="button"
					class="pill"
					class:pill-active={tab === 'contacts'}
					onclick={() => (tab = 'contacts')}
				>
					contacts
				</button>
			</div>
		</div>

		{#if tab === 'layout'}
			<LayoutAdminPanel {token} />
		{:else if tab === 'requests'}
			<div class="graybox p-8 text-center text-xs text-muted">
				Build requests view coming soon.
			</div>
		{:else if tab === 'contacts'}
			<div class="graybox p-8 text-center text-xs text-muted">
				Contact submissions view coming soon.
			</div>
		{:else if productsView === 'list'}
			<div class="list-header">
				<p class="text-xs text-dim">{loading ? 'loading…' : `${products.length} listings`}</p>
				<Button label="new listing" variant="primary" onclick={openNew} />
			</div>

			<div class="listing-list">
				{#each products as product (product.id)}
					<button type="button" class="listing-row" onclick={() => openEdit(product)}>
						{#if product.image_url}
							<img src={product.image_url} alt="" class="listing-thumb" />
						{:else}
							<div class="listing-thumb listing-thumb-empty">—</div>
						{/if}
						<div class="listing-info">
							<span class="listing-name">{product.name}</span>
							<span class="listing-meta">
								{formatPrice(product.price_cents)} · /{product.slug}
								{#if !product.in_stock}<span class="listing-oos"> · out of stock</span>{/if}
								{#if product.featured}<span class="listing-featured"> · featured</span>{/if}
							</span>
						</div>
						<span class="listing-chevron">›</span>
					</button>
				{:else}
					{#if !loading}
						<p class="text-xs text-dim p-4">No listings yet.</p>
					{/if}
				{/each}
			</div>
		{:else}
			<div class="form-header">
				<button type="button" class="back-link" onclick={openList}>← all listings</button>
				<h2 class="label">{editing ? editing.name : 'new listing'}</h2>
			</div>

			<form class="listing-form" onsubmit={saveProduct}>
				{#if editing}
					<div class="graybox p-4 space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<p class="label">photos</p>
							<label class="btn btn-ghost cursor-pointer">
								<span class="btn-bracket">[</span>
								<span class="px-1">{uploadingImages ? 'uploading…' : 'add photos'}</span>
								<span class="btn-bracket">]</span>
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp,image/gif"
									multiple
									class="hidden"
									onchange={uploadImages}
									disabled={uploadingImages}
								/>
							</label>
						</div>
						{#if editing.image_urls?.length}
							<div class="photo-grid">
								{#each editing.image_urls as url, i (url + i)}
									<div class="photo-item">
										<img src={url} alt="" class="photo-preview" />
										{#if i === 0}
											<span class="photo-cover">cover</span>
										{:else}
											<button type="button" class="photo-action" onclick={() => makeCover(i)}>
												set cover
											</button>
										{/if}
										<button type="button" class="photo-remove" onclick={() => removeImage(i)}>×</button>
									</div>
								{/each}
							</div>
							<p class="text-[10px] text-dim">First photo shows on store cards.</p>
						{:else}
							<p class="text-xs text-dim">No photos yet. Upload from your device.</p>
						{/if}
					</div>
				{:else}
					<p class="text-xs text-dim">Save the listing first, then upload photos.</p>
				{/if}

				<div class="form-fields graybox p-4 space-y-3">
					<div>
						<label class="label" for="name">name</label>
						<input id="name" class="input" bind:value={form.name} required />
					</div>
					<div>
						<label class="label" for="slug">slug</label>
						<input id="slug" class="input" bind:value={form.slug} required />
					</div>
					<div>
						<label class="label" for="tagline">tagline</label>
						<input id="tagline" class="input" bind:value={form.tagline} required />
					</div>
					<div>
						<label class="label" for="description">description</label>
						<textarea id="description" class="input min-h-24" bind:value={form.description} required></textarea>
					</div>
					<div class="form-row">
						<div>
							<label class="label" for="price">price (cents)</label>
							<input id="price" class="input" type="number" bind:value={form.price_cents} required />
						</div>
						<div>
							<label class="label" for="firmware">firmware</label>
							<input id="firmware" class="input" bind:value={form.firmware_type} required />
						</div>
					</div>
					<div class="form-row">
						<div>
							<label class="label" for="switches">switches</label>
							<input id="switches" class="input" bind:value={form.switches} required />
						</div>
						<div>
							<label class="label" for="mc">microcontroller</label>
							<input id="mc" class="input" bind:value={form.microcontroller} required />
						</div>
					</div>
					<div>
						<label class="label" for="trackball">trackball (optional)</label>
						<input id="trackball" class="input" bind:value={form.trackball} />
					</div>
					<div class="checkbox-row">
						<label class="flex items-center gap-2 text-xs text-muted">
							<input type="checkbox" bind:checked={form.in_stock} />
							in stock
						</label>
						<label class="flex items-center gap-2 text-xs text-muted">
							<input type="checkbox" bind:checked={form.featured} />
							featured
						</label>
					</div>
				</div>

				{#if editing}
					<div class="graybox p-4 space-y-2">
						<p class="label">files</p>
						<div class="flex flex-wrap gap-2">
							<label class="btn btn-ghost cursor-pointer">
								<span class="btn-bracket">[</span><span class="px-1">upload .uf2</span><span class="btn-bracket">]</span>
								<input type="file" accept=".uf2" class="hidden" onchange={uploadFirmware} />
							</label>
							<label class="btn btn-ghost cursor-pointer">
								<span class="btn-bracket">[</span><span class="px-1">upload pdf</span><span class="btn-bracket">]</span>
								<input type="file" accept=".pdf" class="hidden" onchange={uploadBuildGuide} />
							</label>
							{#if editing.firmware_url}
								<Button href={editing.firmware_url} label="firmware" variant="ghost" />
							{/if}
							{#if editing.build_guide_url}
								<Button href={editing.build_guide_url} label="guide" variant="ghost" target="_blank" rel="noopener" />
							{/if}
						</div>
					</div>
				{/if}

				<div class="form-actions">
					<Button label={editing ? 'save changes' : 'create listing'} variant="primary" type="submit" />
					{#if editing}
						<Button label="delete" variant="ghost" type="button" onclick={deleteProduct} />
					{/if}
				</div>
			</form>
		{/if}
	{/if}
</div>

<style>
	.pill-row {
		display: flex;
		gap: 0.35rem;
	}

	.pill {
		padding: 0.25rem 0.65rem;
		border: 1px solid var(--gb-bg3);
		background: var(--gb-bg0-s);
		color: var(--gb-fg3);
		font-size: 0.75rem;
		text-transform: lowercase;
		cursor: pointer;
	}

	.pill-active {
		border-color: var(--gb-yellow);
		color: var(--gb-yellow);
		background: var(--gb-bg1);
	}

	.list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.listing-list {
		display: flex;
		flex-direction: column;
		border: 1px solid var(--gb-bg3);
	}

	.listing-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		border-bottom: 1px solid var(--gb-bg3);
		background: var(--gb-bg0-s);
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background 0.12s;
	}

	.listing-row:last-child {
		border-bottom: none;
	}

	.listing-row:hover {
		background: var(--gb-bg1);
	}

	.listing-thumb {
		width: 3.5rem;
		height: 3.5rem;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--gb-bg3);
	}

	.listing-thumb-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--gb-fg3);
		font-size: 0.75rem;
	}

	.listing-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.listing-name {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--gb-fg0);
	}

	.listing-meta {
		font-size: 0.7rem;
		color: var(--gb-fg3);
	}

	.listing-oos {
		color: var(--gb-red, #e55);
	}

	.listing-featured {
		color: var(--gb-yellow);
	}

	.listing-chevron {
		color: var(--gb-fg3);
		font-size: 1.1rem;
	}

	.form-header {
		margin-bottom: 1.25rem;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 0.5rem;
		padding: 0;
		border: none;
		background: none;
		color: var(--gb-fg3);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.back-link:hover {
		color: var(--gb-yellow);
	}

	.listing-form {
		max-width: 40rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.photo-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.photo-item {
		position: relative;
	}

	.photo-preview {
		width: 8rem;
		height: 8rem;
		object-fit: cover;
		border: 1px solid var(--gb-bg3);
		display: block;
	}

	.photo-cover {
		position: absolute;
		left: 0.25rem;
		bottom: 0.25rem;
		padding: 0.1rem 0.35rem;
		background: var(--gb-bg0);
		border: 1px solid var(--gb-yellow);
		color: var(--gb-yellow);
		font-size: 0.6rem;
		text-transform: uppercase;
	}

	.photo-action {
		position: absolute;
		left: 0.25rem;
		bottom: 0.25rem;
		padding: 0.1rem 0.35rem;
		border: 1px solid var(--gb-bg3);
		background: color-mix(in srgb, var(--gb-bg0) 90%, transparent);
		color: var(--gb-fg3);
		font-size: 0.6rem;
		cursor: pointer;
	}

	.photo-action:hover {
		border-color: var(--gb-yellow);
		color: var(--gb-yellow);
	}

	.photo-remove {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		width: 1.25rem;
		height: 1.25rem;
		border: 1px solid var(--gb-bg3);
		background: var(--gb-bg0);
		color: var(--gb-fg3);
		line-height: 1;
		cursor: pointer;
	}

	.photo-remove:hover {
		color: var(--gb-red, #e55);
		border-color: var(--gb-red, #e55);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.checkbox-row {
		display: flex;
		gap: 1.5rem;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
</style>
