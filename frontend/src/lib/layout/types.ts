export type FormFactor = 'split' | 'unibody';

export interface LayoutKey {
	id: string;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
	/** Rotation in degrees (KLE `a`). */
	rotation: number;
	/** Rotation pivot X in layout u (KLE `rx`, absolute). Uses key center when unset. */
	pivotX?: number;
	/** Rotation pivot Y in layout u (KLE `ry`, absolute). Uses key center when unset. */
	pivotY?: number;
	/** Linked key on the opposite split half (when mirror mode is used). */
	mirrorOf?: string;
	/** Which half this key belongs to (set on preset load). */
	half?: 'left' | 'right';
}

export interface BuildLayout {
	formFactor: FormFactor;
	presetName: string;
	splitGapU: number;
	/** Sync edits to the mirrored half (split only). */
	mirrorEdits: boolean;
	/** Fixed split geometry — set on preset load, never recalculated during edits. */
	splitAnchor?: SplitAnchor;
	keys: LayoutKey[];
}

/** Gap center + half offsets for split mirror (stable during drag). */
export interface SplitAnchor {
	axis: number;
	leftBase: number;
	rightBase: number;
}

export const KEY_UNIT_MM = 19.05;

export function uid(): string {
	return crypto.randomUUID().slice(0, 8);
}

export function emptyKey(x = 0, y = 0, label = 'key'): LayoutKey {
	return { id: uid(), label, x, y, width: 1, height: 1, rotation: 0 };
}

export function emptyLayout(presetName = 'Custom'): BuildLayout {
	return {
		formFactor: 'split',
		presetName,
		splitGapU: 3,
		mirrorEdits: true,
		keys: []
	};
}
