<script lang="ts">
	import { onMount } from 'svelte';
	import LayoutCanvas from '$lib/components/LayoutCanvas.svelte';
	import Button from '$lib/components/Button.svelte';
	import {
		initLayoutEditor,
		loadLayoutPreset,
		presetsForFormFactor,
		type LayoutPreset
	} from '$lib/layout/presets';
	import {
		DEFAULT_EDITOR_SNAP,
		getEditorSnapConfig,
		nudgeKey,
		snapKeyPosition,
		snapRotation,
		snapToGrid,
		type EditorSnapConfig
	} from '$lib/layout/grid';
	import {
		addMirroredKeyPair,
		applyKeyPatch,
		applySplitGap,
		clampFreeMove,
		clampLeftHalfMove,
		countMirrorPairs,
		deleteKeyWithMirror,
		finalizeLayoutKeys,
		findDuplicateOffset,
		getSplitAnchor,
		isLeftHalf,
		splitAxisX
	} from '$lib/layout/mirror';
	import { emptyKey, emptyLayout, uid, type BuildLayout, type LayoutKey } from '$lib/layout/types';
	import { LAYOUT_EDITOR_VERSION } from '$lib/layout/editor-version';
	import { clearLayoutDraft } from '$lib/stores/build-request';
	import { t } from '$lib/i18n';

	interface Props {
		layout: BuildLayout;
	}

	let { layout = $bindable() }: Props = $props();

	let selectedId = $state<string | null>(null);
	let loadingPreset = $state<string | null>(null);
	let presetCatalog = $state<LayoutPreset[]>([]);
	let defaultMirrorSplit = $state(true);
	let editorSnap = $state<EditorSnapConfig>({ ...DEFAULT_EDITOR_SNAP });

	const snap = $derived(editorSnap);
	const visiblePresets = $derived(presetsForFormFactor(presetCatalog, layout.formFactor));

	const selectedKey = $derived.by(() => {
		if (layout.keys.length === 0) return null;
		const found = layout.keys.find((k) => k.id === selectedId);
		return found ?? layout.keys[0];
	});
	const splitAxis = $derived(
		layout.formFactor === 'split' ? splitAxisX(layout.keys, layout.splitAnchor) : null
	);
	const mirrorPairCount = $derived(
		layout.mirrorEdits && layout.formFactor === 'split'
			? countMirrorPairs(layout.keys)
			: 0
	);

	onMount(async () => {
		const init = await initLayoutEditor();
		presetCatalog = init.presets;
		defaultMirrorSplit = init.defaultMirrorSplit;
		editorSnap = { ...getEditorSnapConfig() };
		ensureSelection();
	});

	$effect(() => {
		layout.keys.map((k) => k.id).join(',');
		ensureSelection();
	});

	function ensureSelection(preferredId?: string | null) {
		if (layout.keys.length === 0) {
			selectedId = null;
			return;
		}
		if (preferredId && layout.keys.some((k) => k.id === preferredId)) {
			selectedId = preferredId;
			return;
		}
		if (selectedId && layout.keys.some((k) => k.id === selectedId)) return;
		selectedId = layout.keys[0].id;
	}

	function patchKey(id: string, patch: Partial<LayoutKey>, snapPos = true) {
		let key = layout.keys.find((k) => k.id === id);
		if (!key) return;

		let editId = id;
		const anchor = getSplitAnchor(layout);

		if (layout.mirrorEdits && layout.formFactor === 'split' && !isLeftHalf(key, anchor)) {
			editId = key.mirrorOf ?? id;
			key = layout.keys.find((k) => k.id === editId) ?? key;
			if (typeof patch.rotation === 'number') {
				patch = {
					...patch,
					rotation: snapRotation(-patch.rotation, snap.rotationStepDeg)
				};
			}
		}

		const next = { ...patch };
		if (snapPos && (typeof next.x === 'number' || typeof next.y === 'number')) {
			let x = typeof next.x === 'number' ? next.x : key.x;
			let y = typeof next.y === 'number' ? next.y : key.y;

			if (layout.mirrorEdits && layout.formFactor === 'split') {
				({ x, y } = clampLeftHalfMove(key, x, y, anchor, snap.snapStepU));
			} else {
				({ x, y } = clampFreeMove(x, y, snap.snapStepU));
			}

			next.x = x;
			next.y = y;
		}
		if (typeof next.rotation === 'number') {
			next.rotation = snapRotation(next.rotation, snap.rotationStepDeg);
		}
		layout = {
			...layout,
			presetName: 'Custom',
			keys: applyKeyPatch(layout, editId, next, snap.snapStepU, snap.rotationStepDeg)
		};
		ensureSelection(id);
	}

	function moveKey(id: string, x: number, y: number) {
		patchKey(id, { x, y });
	}

	function setPosition(id: string, x: number, y: number) {
		patchKey(id, {
			x: snapToGrid(x, snap.snapStepU),
			y: snapToGrid(y, snap.snapStepU)
		});
	}

	function addKey() {
		const base = selectedKey ?? layout.keys[layout.keys.length - 1];
		const template = emptyKey(
			base ? snapToGrid(base.x + base.width + snap.snapStepU, snap.snapStepU) : 0,
			base?.y ?? 0
		);

		if (layout.formFactor === 'split' && layout.mirrorEdits) {
			const anchor = getSplitAnchor(layout);
			template.x = snapToGrid(anchor.leftBase, snap.snapStepU);
			layout = {
				...layout,
				presetName: 'Custom',
				keys: addMirroredKeyPair(layout, template, snap.snapStepU)
			};
			selectedId = template.id;
			return;
		}

		const key = { ...template, id: uid() };
		layout = { ...layout, presetName: 'Custom', keys: [...layout.keys, key] };
		selectedId = key.id;
	}

	function duplicateKey() {
		if (!selectedKey) return;
		const offset = findDuplicateOffset(layout, selectedKey, snap.snapStepU);
		const copy = {
			...selectedKey,
			id: uid(),
			x: offset.x,
			y: offset.y,
			mirrorOf: undefined
		};
		if (layout.formFactor === 'split' && layout.mirrorEdits) {
			layout = {
				...layout,
				presetName: 'Custom',
				keys: addMirroredKeyPair(layout, copy, snap.snapStepU)
			};
			selectedId = copy.id;
			return;
		}
		layout = { ...layout, presetName: 'Custom', keys: [...layout.keys, copy] };
		selectedId = copy.id;
	}

	function deleteKey(id: string) {
		layout = {
			...layout,
			presetName: 'Custom',
			keys: deleteKeyWithMirror(layout, id)
		};
		ensureSelection();
	}

	function setMirrorEdits(enabled: boolean) {
		layout = finalizeLayoutKeys({ ...layout, mirrorEdits: enabled });
		ensureSelection();
	}

	function setSplitGap(gapU: number) {
		if (layout.formFactor !== 'split') return;
		layout = applySplitGap(layout, gapU, snap.snapStepU, snap.rotationStepDeg);
		ensureSelection();
	}

	function setFormFactor(formFactor: 'split' | 'unibody') {
		if (formFactor === layout.formFactor) return;
		void switchFormFactor(formFactor);
	}

	async function switchFormFactor(formFactor: 'split' | 'unibody') {
		const next = presetsForFormFactor(presetCatalog, formFactor);
		const blank = next.find((p) => p.id.startsWith('blank'));
		const targetId = blank?.id ?? next[0]?.id;

		if (targetId) {
			await applyPreset(targetId);
			return;
		}

		clearLayoutDraft();
		layout = finalizeLayoutKeys({
			...emptyLayout('Custom'),
			formFactor,
			mirrorEdits: formFactor === 'split' ? defaultMirrorSplit : false,
			splitGapU: formFactor === 'split' ? 3 : 0,
			keys: []
		});
		ensureSelection();
	}

	async function applyPreset(id: string) {
		loadingPreset = id;
		try {
			clearLayoutDraft();
			layout = await loadLayoutPreset(id);
			ensureSelection(layout.keys[0]?.id);
		} finally {
			loadingPreset = null;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!selectedKey) return;
		const tag = (e.target as HTMLElement).tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

		let step = snap.nudgeFineU;
		if (e.shiftKey) step = 1;
		else if (e.altKey) step = snap.nudgeCoarseU;

		let dx = 0;
		let dy = 0;
		if (e.key === 'ArrowLeft') dx = -step;
		else if (e.key === 'ArrowRight') dx = step;
		else if (e.key === 'ArrowUp') dy = -step;
		else if (e.key === 'ArrowDown') dy = step;
		else if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			deleteKey(selectedKey.id);
			return;
		} else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			duplicateKey();
			return;
		} else return;

		e.preventDefault();
		const next = nudgeKey(selectedKey, dx, dy, layout.keys);
		patchKey(selectedKey.id, next);
	}

	const widthOptions = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 6.25];
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="layout-editor">
	<div class="toolbar graybox">
		<div class="toolbar-row">
			<span class="label">{$t('editor.form')}</span>
			<div class="pill-row">
				<button
					type="button"
					class="pill"
					class:pill-active={layout.formFactor === 'split'}
					onclick={() => setFormFactor('split')}
				>
					{$t('editor.split')}
				</button>
				<button
					type="button"
					class="pill"
					class:pill-active={layout.formFactor === 'unibody'}
					onclick={() => setFormFactor('unibody')}
				>
					{$t('editor.unibody')}
				</button>
			</div>
			{#if layout.formFactor === 'split'}
				<label class="mirror-toggle">
					<input
						type="checkbox"
						checked={layout.mirrorEdits}
						onchange={(e) => setMirrorEdits(e.currentTarget.checked)}
					/>
					<span>{$t('editor.mirrorHalf')}</span>
				</label>
			{/if}
		</div>

		<div class="toolbar-row">
			<span class="label">{$t('editor.presets', { formFactor: layout.formFactor })}</span>
			<div class="pill-row wrap">
				{#each visiblePresets as preset (preset.id)}
					<button
						type="button"
						class="pill"
						title={preset.description}
						disabled={loadingPreset !== null}
						onclick={() => applyPreset(preset.id)}
					>
						{loadingPreset === preset.id ? '…' : preset.label}
					</button>
				{:else}
					<span class="text-xs text-muted">no presets — admin can add them</span>
				{/each}
			</div>
		</div>

		<div class="toolbar-row actions">
			<Button label="+ key" variant="default" onclick={addKey} />
			<Button label="duplicate" variant="ghost" onclick={duplicateKey} disabled={!selectedKey} />
			{#if visiblePresets.length}
				<Button
					label="reset layout"
					variant="ghost"
					disabled={loadingPreset !== null}
					onclick={() => applyPreset(visiblePresets[0].id)}
				/>
			{/if}
			{#if layout.formFactor === 'split'}
				<label class="gap-field">
					<span class="label">split gap</span>
					<input
						type="number"
						class="input input-compact"
						min="0"
						max="20"
						step="0.5"
						value={layout.splitGapU}
						onchange={(e) => setSplitGap(Number(e.currentTarget.value))}
					/>
					<span class="text-xs text-muted">u</span>
				</label>
			{/if}
			<span class="text-xs text-muted ml-auto">
				{layout.keys.length} keys
				{#if mirrorPairCount > 0}
					· {mirrorPairCount} mirror pairs
				{/if}
				· snap {snap.snapStepU}u · {LAYOUT_EDITOR_VERSION}
			</span>
		</div>
		<p class="text-xs text-dim">
			{#if layout.formFactor === 'split' && layout.mirrorEdits}
				Mirror on: edit left half — right reflects · split gap widens halves · snap
				{snap.snapStepU}u
			{:else if layout.formFactor === 'split'}
				Split layout · snap {snap.snapStepU}u
			{:else}
				Unibody layout · ANSI rows use horizontal stagger · snap {snap.snapStepU}u
			{/if}
			· {LAYOUT_EDITOR_VERSION}
		</p>
	</div>

	<div class="editor-body">
		<LayoutCanvas
			keys={layout.keys}
			selectedId={selectedKey?.id ?? null}
			splitAxisU={splitAxis}
			snapStepU={snap.snapStepU}
			mirrorEdits={layout.mirrorEdits && layout.formFactor === 'split'}
			canDrag={(key) =>
				!layout.mirrorEdits ||
				layout.formFactor !== 'split' ||
				isLeftHalf(key, getSplitAnchor(layout))}
			onSelect={(id) => ensureSelection(id)}
			onMove={moveKey}
		/>

		<div class="inspector graybox">
			{#if selectedKey}
				<p class="label mb-3">selected key</p>
				{#if selectedKey.mirrorOf && layout.mirrorEdits}
					<p class="text-xs text-muted mb-2">
						mirror linked — edit left half; right reflects position &amp; rotation
					</p>
				{/if}
				<div class="field">
					<label class="label" for="key-label">label</label>
					<input
						id="key-label"
						class="input"
						value={selectedKey.label}
						oninput={(e) => patchKey(selectedKey.id, { label: e.currentTarget.value }, false)}
					/>
				</div>
				<div class="field-grid">
					<div class="field">
						<label class="label" for="key-x">x (u)</label>
						<input
							id="key-x"
							type="number"
							class="input"
							step={snap.snapStepU}
							min="0"
							value={selectedKey.x}
							onchange={(e) =>
								setPosition(
									selectedKey.id,
									Number(e.currentTarget.value),
									selectedKey.y
								)}
						/>
					</div>
					<div class="field">
						<label class="label" for="key-y">y (u)</label>
						<input
							id="key-y"
							type="number"
							class="input"
							step={snap.snapStepU}
							min="0"
							value={selectedKey.y}
							onchange={(e) =>
								setPosition(
									selectedKey.id,
									selectedKey.x,
									Number(e.currentTarget.value)
								)}
						/>
					</div>
				</div>
				<div class="field-grid">
					<div class="field">
						<label class="label" for="key-width">width</label>
						<select
							id="key-width"
							class="input"
							value={selectedKey.width}
							onchange={(e) =>
								patchKey(selectedKey.id, { width: Number(e.currentTarget.value) }, false)}
						>
							{#each widthOptions as w}
								<option value={w}>{w}u</option>
							{/each}
						</select>
					</div>
					<div class="field">
						<label class="label" for="key-height">height</label>
						<select
							id="key-height"
							class="input"
							value={selectedKey.height}
							onchange={(e) =>
								patchKey(selectedKey.id, { height: Number(e.currentTarget.value) }, false)}
						>
							<option value={1}>1u</option>
							<option value={1.5}>1.5u</option>
							<option value={2}>2u</option>
						</select>
					</div>
				</div>
				<div class="field">
					<label class="label" for="key-rot">rotation °</label>
					<input
						id="key-rot"
						type="range"
						min="-45"
						max="45"
						step={snap.rotationStepDeg}
						value={selectedKey.rotation}
						oninput={(e) =>
							patchKey(selectedKey.id, { rotation: Number(e.currentTarget.value) }, false)}
					/>
					<span class="text-xs text-muted">{selectedKey.rotation}°</span>
				</div>
				<div class="field-grid">
					<div class="field">
						<label class="label" for="key-pivot-x">pivot x</label>
						<input
							id="key-pivot-x"
							type="number"
							class="input"
							step={snap.snapStepU}
							min="0"
							value={selectedKey.pivotX ?? ''}
							placeholder="center"
							onchange={(e) => {
								const v = e.currentTarget.value;
								patchKey(
									selectedKey.id,
									{ pivotX: v === '' ? undefined : Number(v) },
									false
								);
							}}
						/>
					</div>
					<div class="field">
						<label class="label" for="key-pivot-y">pivot y</label>
						<input
							id="key-pivot-y"
							type="number"
							class="input"
							step={snap.snapStepU}
							min="0"
							value={selectedKey.pivotY ?? ''}
							placeholder="center"
							onchange={(e) => {
								const v = e.currentTarget.value;
								patchKey(
									selectedKey.id,
									{ pivotY: v === '' ? undefined : Number(v) },
									false
								);
							}}
						/>
					</div>
				</div>
				<Button label="delete key" variant="ghost" onclick={() => deleteKey(selectedKey.id)} />
			{:else}
				<p class="label mb-2">key inspector</p>
				<p class="text-sm text-muted">Add a key to start editing.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.layout-editor {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.toolbar {
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.toolbar-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}

	.toolbar-row.actions {
		padding-top: 0.25rem;
		border-top: 1px solid var(--gb-bg2);
	}

	.mirror-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--gb-fg3);
		cursor: pointer;
		margin-left: 0.5rem;
	}

	.mirror-toggle input {
		accent-color: var(--gb-yellow);
	}

	.pill-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.pill {
		padding: 0.2rem 0.55rem;
		border: 1px solid var(--gb-bg3);
		background: var(--gb-bg0-s);
		color: var(--gb-fg3);
		font-size: 0.75rem;
		text-transform: lowercase;
		cursor: pointer;
		transition: border-color 0.1s, color 0.1s, background 0.1s;
	}

	.pill:hover:not(:disabled) {
		border-color: var(--gb-gray);
		color: var(--gb-fg1);
	}

	.pill:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.pill-active {
		border-color: var(--gb-yellow);
		color: var(--gb-yellow);
		background: var(--gb-bg1);
	}

	.gap-field {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.input-compact {
		width: 4rem;
		padding: 0.25rem 0.4rem;
		font-size: 0.8rem;
	}

	.editor-body {
		display: grid;
		gap: 0.75rem;
	}

	@media (min-width: 900px) {
		.editor-body {
			grid-template-columns: 1fr 260px;
			align-items: start;
		}
	}

	.inspector {
		padding: 1rem;
		min-height: 320px;
		position: sticky;
		top: 0.75rem;
	}

	.field {
		margin-bottom: 0.75rem;
	}

	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
</style>
