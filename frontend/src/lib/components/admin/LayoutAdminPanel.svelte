<script lang="ts">
	import { api, type EditorConfig, type LayoutPresetMeta } from '$lib/api/client';
	import Button from '$lib/components/Button.svelte';

	interface Props {
		token: string;
	}

	let { token }: Props = $props();

	let loading = $state(true);
	let error = $state('');
	let editorSettings = $state<EditorConfig | null>(null);
	let presets = $state<LayoutPresetMeta[]>([]);

	let editingPreset = $state<LayoutPresetMeta | null>(null);
	let presetForm = $state({
		slug: '',
		label: '',
		description: '',
		form_factor: 'split',
		static_file: '',
		layout_json: '',
		enabled: true,
		sort_order: 0
	});

	async function load() {
		loading = true;
		error = '';
		try {
			[editorSettings, presets] = await Promise.all([
				api.admin.getEditorSettings(token),
				api.admin.getLayoutPresets(token)
			]);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load layout config';
		} finally {
			loading = false;
		}
	}

	async function saveEditorSettings(e: Event) {
		e.preventDefault();
		if (!editorSettings) return;
		editorSettings = await api.admin.updateEditorSettings(token, editorSettings);
	}

	function resetPresetForm() {
		editingPreset = null;
		presetForm = {
			slug: '',
			label: '',
			description: '',
			form_factor: 'split',
			static_file: '',
			layout_json: '',
			enabled: true,
			sort_order: presets.length * 10 + 10
		};
	}

	function startEditPreset(p: LayoutPresetMeta) {
		editingPreset = p;
		presetForm = {
			slug: p.slug,
			label: p.label,
			description: p.description,
			form_factor: p.form_factor,
			static_file: p.static_file ?? '',
			layout_json: p.layout_json ? JSON.stringify(p.layout_json, null, 2) : '',
			enabled: p.enabled,
			sort_order: p.sort_order
		};
	}

	async function savePreset(e: Event) {
		e.preventDefault();
		let layoutJson: Record<string, unknown> | null = null;
		if (presetForm.layout_json.trim()) {
			try {
				layoutJson = JSON.parse(presetForm.layout_json) as Record<string, unknown>;
			} catch {
				error = 'Invalid layout JSON';
				return;
			}
		}
		const payload = {
			slug: presetForm.slug,
			label: presetForm.label,
			description: presetForm.description,
			form_factor: presetForm.form_factor,
			static_file: presetForm.static_file.trim() || null,
			layout_json: layoutJson,
			enabled: presetForm.enabled,
			sort_order: Number(presetForm.sort_order)
		};
		if (editingPreset) {
			await api.admin.updateLayoutPreset(token, editingPreset.id, payload);
		} else {
			await api.admin.createLayoutPreset(token, payload);
		}
		resetPresetForm();
		await load();
	}

	async function deletePreset(id: number) {
		if (!confirm('Delete this preset?')) return;
		await api.admin.deleteLayoutPreset(token, id);
		await load();
	}

	$effect(() => {
		if (token) load();
	});
</script>

<div class="layout-admin">
	{#if loading}
		<p class="text-xs text-dim">loading layout config…</p>
	{:else}
		{#if error}
			<p class="text-xs text-danger mb-3">{error}</p>
		{/if}

		<form class="graybox space-y-3 p-4 mb-6" onsubmit={saveEditorSettings}>
			<h2 class="label">editor settings</h2>
			<p class="text-xs text-muted">Snap, nudge, and default mirror behavior for /request layout editor.</p>
			{#if editorSettings}
				<div class="field-grid">
					<label class="field">
						<span class="label">snap step (u)</span>
						<input class="input" type="number" step="0.05" min="0.05" bind:value={editorSettings.snap_step_u} />
					</label>
					<label class="field">
						<span class="label">rotation step (°)</span>
						<input class="input" type="number" step="1" min="1" bind:value={editorSettings.rotation_step_deg} />
					</label>
					<label class="field">
						<span class="label">nudge fine (u)</span>
						<input class="input" type="number" step="0.05" min="0.05" bind:value={editorSettings.nudge_fine_u} />
					</label>
					<label class="field">
						<span class="label">nudge coarse (u)</span>
						<input class="input" type="number" step="0.25" min="0.25" bind:value={editorSettings.nudge_coarse_u} />
					</label>
				</div>
				<label class="flex items-center gap-2 text-xs text-muted">
					<input type="checkbox" bind:checked={editorSettings.default_mirror_split} />
					default mirror half on split
				</label>
				<Button label="save editor settings" variant="primary" type="submit" />
			{/if}
		</form>

		<div class="mb-4 flex items-center justify-between">
			<h2 class="label">layout presets</h2>
			<Button label="new preset" variant="ghost" onclick={resetPresetForm} />
		</div>

		<div class="grid gap-6 lg:grid-cols-2">
			<form class="graybox space-y-3 p-4" onsubmit={savePreset}>
				<h3 class="text-xs uppercase tracking-wide text-bright">
					{editingPreset ? `edit — ${editingPreset.label}` : 'create preset'}
				</h3>
				<input class="input" placeholder="slug (corne)" bind:value={presetForm.slug} required />
				<input class="input" placeholder="label" bind:value={presetForm.label} required />
				<input class="input" placeholder="description" bind:value={presetForm.description} />
				<select class="input" bind:value={presetForm.form_factor}>
					<option value="split">split</option>
					<option value="unibody">unibody</option>
				</select>
				<input
					class="input"
					placeholder="static file (corne.json) — optional"
					bind:value={presetForm.static_file}
				/>
				<textarea
					class="input min-h-32 font-mono text-xs"
					placeholder="layout JSON — optional inline layout"
					bind:value={presetForm.layout_json}
				></textarea>
				<input class="input" type="number" placeholder="sort order" bind:value={presetForm.sort_order} />
				<label class="flex items-center gap-2 text-xs text-muted">
					<input type="checkbox" bind:checked={presetForm.enabled} />
					enabled
				</label>
				<Button label={editingPreset ? 'update preset' : 'create preset'} variant="primary" type="submit" class="w-full" />
			</form>

			<div class="flex flex-col gap-3">
				{#each presets as preset (preset.id)}
					<div class="graybox p-4">
						<div class="mb-2 flex items-start justify-between gap-3">
							<div>
								<h3 class="text-xs uppercase tracking-wide text-bright">{preset.label}</h3>
								<p class="text-[10px] text-dim">
									{preset.form_factor} · {preset.slug}
									{#if !preset.enabled} · disabled{/if}
								</p>
								{#if preset.description}
									<p class="text-xs text-muted mt-1">{preset.description}</p>
								{/if}
								<p class="text-[10px] text-dim mt-1">
									{preset.static_file ? `file: ${preset.static_file}` : preset.layout_json ? 'inline JSON' : 'native / empty'}
								</p>
							</div>
							<div class="flex gap-2 shrink-0">
								<Button label="edit" variant="ghost" onclick={() => startEditPreset(preset)} />
								<Button label="delete" variant="ghost" onclick={() => deletePreset(preset.id)} />
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
</style>
