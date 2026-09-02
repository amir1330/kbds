const STORAGE_KEY = 'kbds_layout_draft';
/** Bump when layout draft shape or mirror logic changes — invalidates stale session drafts. */
const DRAFT_VERSION = 20;

import type { BuildLayout } from '$lib/layout/types';
import { detectSplitAnchor, finalizeLayoutKeys, isLeftHalf } from '$lib/layout/mirror';
import { DEFAULT_SNAP_STEP_U, DEFAULT_ROTATION_STEP } from '$lib/layout/grid';
import { loadLayoutPreset } from '$lib/layout/presets';

export interface LayoutDraft {
	layout: BuildLayout;
	updated_at: string;
}

export function saveLayoutDraft(layout: BuildLayout): void {
	if (typeof sessionStorage === 'undefined') return;
	const draft: LayoutDraft = {
		layout,
		updated_at: new Date().toISOString()
	};
	sessionStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ ...draft, v: DRAFT_VERSION })
	);
}

function repairDoubledSplit(layout: BuildLayout): BuildLayout {
	if (layout.formFactor !== 'split' || layout.keys.length <= 46) return layout;

	const anchor = detectSplitAnchor(layout.keys);
	const left = layout.keys.filter((k) => k.x + k.width / 2 <= anchor.axis + 0.01);
	const right = layout.keys.filter((k) => k.x + k.width / 2 > anchor.axis + 0.01);

	// Bug v9: materialize ran on full preset → ~42 left + ~42 mirrored right = 84
	if (left.length >= 35 && right.length >= 35 && layout.keys.length >= 80) {
		const seen = new Set<string>();
		const deduped = layout.keys.filter((k) => {
			const cell = `${k.x.toFixed(2)}:${k.y.toFixed(2)}:${k.width}:${k.height}`;
			if (seen.has(cell)) return false;
			seen.add(cell);
			return true;
		});
		if (deduped.length < layout.keys.length) {
			return { ...layout, keys: deduped, splitAnchor: undefined };
		}
	}

	return layout;
}

function repairStackedMirror(layout: BuildLayout): BuildLayout {
	if (layout.formFactor !== 'split' || layout.keys.length <= 46) return layout;

	const span = Math.max(...layout.keys.map((k) => k.x + k.width));
	if (layout.keys.length > 50 && span > 12) {
		const anchor = detectSplitAnchor(layout.keys);
		const left = layout.keys.filter((k) => isLeftHalf(k, anchor));
		if (left.length > 0 && left.length < layout.keys.length) {
			return { ...layout, keys: left, splitAnchor: undefined };
		}
	}

	return layout;
}

function repairBrokenSplit(layout: BuildLayout): BuildLayout {
	if (layout.formFactor !== 'split' || layout.keys.length === 0) return layout;

	layout = repairDoubledSplit(layout);
	layout = repairStackedMirror(layout);

	const maxX = Math.max(...layout.keys.map((k) => k.x + k.width));
	if (maxX <= 24) return layout;

	// Drop stray keys dragged far away that broke mirror axis.
	const sane = layout.keys.filter((k) => k.x < 24);
	if (sane.length < layout.keys.length * 0.5) return layout;

	return { ...layout, keys: sane, splitAnchor: undefined };
}

export function loadLayoutDraft(): LayoutDraft | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as LayoutDraft & { v?: number };
		if (parsed.v !== DRAFT_VERSION) return null;

		let layout = parsed.layout as BuildLayout;
		if (!layout?.keys) return null;

		layout = repairBrokenSplit(layout);
		layout = finalizeLayoutKeys(
			{
				...layout,
				mirrorEdits: layout.mirrorEdits ?? layout.formFactor === 'split',
				splitAnchor: layout.splitAnchor
			},
			DEFAULT_SNAP_STEP_U,
			DEFAULT_ROTATION_STEP
		);

		return { layout, updated_at: new Date().toISOString() };
	} catch {
		return null;
	}
}

export function clearLayoutDraft(): void {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.removeItem(STORAGE_KEY);
}

export async function defaultLayoutDraft(): Promise<LayoutDraft> {
	const layout = await loadLayoutPreset('corne');
	return {
		layout,
		updated_at: new Date().toISOString()
	};
}
