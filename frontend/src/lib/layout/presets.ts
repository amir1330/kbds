import { fetchPresetRaw } from '$lib/kle/presets';
import { api, type EditorConfig, type LayoutPresetMeta } from '$lib/api/client';
import { DEFAULT_ROTATION_STEP, DEFAULT_SNAP_STEP_U, setEditorSnapConfig } from './grid';
import { layoutFromKleRaw } from './kle-import';
import { finalizeLayoutKeys } from './mirror';
import { NATIVE_PRESET_LOADERS } from './native-presets';
import type { BuildLayout, FormFactor } from './types';

export interface LayoutPreset {
	id: string;
	label: string;
	description: string;
	file?: string;
	formFactor: FormFactor;
	native?: boolean;
}

/** Built-in fallback when API is unavailable. */
export const SPLIT_PRESETS: LayoutPreset[] = [
	{
		id: 'corne',
		label: 'Corne',
		description: 'c0psrul3 crkbd · rotated thumbs',
		file: 'corne.json',
		formFactor: 'split'
	},
	{
		id: 'sofle',
		label: 'Sofle',
		description: '6×4+3 split',
		file: 'sofle.json',
		formFactor: 'split'
	},
	{
		id: 'lily58',
		label: 'Lily58',
		description: '58-key split',
		file: 'lily58.json',
		formFactor: 'split'
	},
	{
		id: 'ferris',
		label: 'Ferris',
		description: '3×5+2 sweep',
		file: 'ferris.json',
		formFactor: 'split'
	},
	{
		id: 'blank-split',
		label: 'Blank layout',
		description: 'Empty split canvas',
		formFactor: 'split',
		native: true
	}
];

export const UNIBODY_PRESETS: LayoutPreset[] = [
	{
		id: 'blank-unibody',
		label: 'Blank layout',
		description: 'Empty unibody canvas',
		formFactor: 'unibody',
		native: true
	},
	{
		id: '60-ansi',
		label: '60% ANSI',
		description: 'QMK LAYOUT_60_ansi',
		file: '60-ansi.json',
		formFactor: 'unibody'
	}
];

const FALLBACK_BY_ID = new Map(
	[...SPLIT_PRESETS, ...UNIBODY_PRESETS].map((p) => [p.id, p])
);

let cachedApiPresets: LayoutPresetMeta[] | null = null;

function metaToPreset(meta: LayoutPresetMeta): LayoutPreset {
	const native =
		!meta.static_file && !meta.layout_json && meta.slug in NATIVE_PRESET_LOADERS;
	return {
		id: meta.slug,
		label: meta.label,
		description: meta.description,
		file: meta.static_file ?? undefined,
		formFactor: meta.form_factor as FormFactor,
		native: native || undefined
	};
}

/** Load editor snap settings + preset catalog from API (static fallback). */
export async function initLayoutEditor(): Promise<{
	presets: LayoutPreset[];
	defaultMirrorSplit: boolean;
}> {
	let defaultMirrorSplit = true;
	try {
		const config: EditorConfig = await api.getEditorConfig();
		setEditorSnapConfig({
			snapStepU: Math.max(0.25, config.snap_step_u),
			rotationStepDeg: config.rotation_step_deg,
			nudgeFineU: Math.max(0.25, config.nudge_fine_u),
			nudgeCoarseU: config.nudge_coarse_u
		});
		defaultMirrorSplit = config.default_mirror_split;
	} catch {
		/* keep grid defaults */
	}
	const presets = await fetchPresetCatalog();
	return { presets, defaultMirrorSplit };
}

const NATIVE_PRESETS = [...SPLIT_PRESETS, ...UNIBODY_PRESETS].filter((p) => p.native);

export async function fetchPresetCatalog(): Promise<LayoutPreset[]> {
	try {
		cachedApiPresets = await api.getLayoutPresets();
		const catalog = cachedApiPresets.filter((p) => p.enabled).map(metaToPreset);
		for (const native of NATIVE_PRESETS) {
			if (!catalog.some((p) => p.id === native.id)) catalog.push(native);
		}
		return catalog;
	} catch {
		return [...SPLIT_PRESETS, ...UNIBODY_PRESETS];
	}
}

export function presetsForFormFactor(
	catalog: LayoutPreset[],
	formFactor: FormFactor
): LayoutPreset[] {
	return catalog.filter((p) => p.formFactor === formFactor);
}

async function loadFromStatic(preset: LayoutPreset): Promise<BuildLayout> {
	if (preset.native || NATIVE_PRESET_LOADERS[preset.id]) {
		return NATIVE_PRESET_LOADERS[preset.id]();
	}
	if (!preset.file) throw new Error(`Preset ${preset.id} has no layout source`);
	const raw = await fetchPresetRaw(preset.file);
	const layout = layoutFromKleRaw(raw, preset.formFactor);
	layout.keys = layout.keys.map((k) => ({ ...k, label: '·' }));
	return finalizeLayoutKeys(layout, DEFAULT_SNAP_STEP_U, DEFAULT_ROTATION_STEP);
}

export async function loadLayoutPreset(id: string): Promise<BuildLayout> {
	if (cachedApiPresets) {
		const meta = cachedApiPresets.find((p) => p.slug === id && p.enabled);
		if (meta?.layout_json) {
			const layout = meta.layout_json as unknown as BuildLayout;
			return finalizeLayoutKeys(
				{
					...layout,
					splitAnchor: undefined,
					keys: layout.keys.map((k) => ({ ...k, label: '·' }))
				},
				DEFAULT_SNAP_STEP_U,
				DEFAULT_ROTATION_STEP
			);
		}
		if (meta) {
			return loadFromStatic(metaToPreset(meta));
		}
	}

	const fallback = FALLBACK_BY_ID.get(id);
	if (!fallback) throw new Error(`Unknown preset ${id}`);
	return loadFromStatic(fallback);
}
