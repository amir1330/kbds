import { finalizeLayoutKeys } from './mirror';
import { uid, type BuildLayout, type LayoutKey } from './types';

type KeyDef = {
	x: number;
	y: number;
	label?: string;
	width?: number;
	height?: number;
	rotation?: number;
	pivotX?: number;
	pivotY?: number;
};

function keysFromDefs(defs: KeyDef[]): LayoutKey[] {
	return defs.map((d) => ({
		id: uid(),
		label: d.label ?? '·',
		x: d.x,
		y: d.y,
		width: d.width ?? 1,
		height: d.height ?? 1,
		rotation: d.rotation ?? 0,
		...(d.pivotX != null ? { pivotX: d.pivotX } : {}),
		...(d.pivotY != null ? { pivotY: d.pivotY } : {})
	}));
}

/** 3×5 columnar split + thumb row — left half only; mirror mode builds the right half. */
function blankSplitLeftDefs(): KeyDef[] {
	const defs: KeyDef[] = [];
	const stagger = [0.25, 0.25, 0.1, 0, 0.1];

	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 5; col++) {
			defs.push({
				x: col,
				y: row + stagger[col],
				label: '·'
			});
		}
	}
	defs.push({ x: 1, y: 3.5, label: '·' });
	defs.push({ x: 3, y: 3.5, label: '·' });

	return defs;
}

export function blankSplitLayout(): BuildLayout {
	return finalizeLayoutKeys({
		formFactor: 'split',
		presetName: 'Blank layout',
		splitGapU: 3,
		mirrorEdits: true,
		keys: keysFromDefs(blankSplitLeftDefs())
	});
}

export function blankUnibodyLayout(): BuildLayout {
	return finalizeLayoutKeys({
		formFactor: 'unibody',
		presetName: 'Blank layout',
		splitGapU: 0,
		mirrorEdits: false,
		keys: []
	});
}

export const NATIVE_PRESET_LOADERS: Record<string, () => BuildLayout> = {
	'blank-split': blankSplitLayout,
	'blank-unibody': blankUnibodyLayout
};
