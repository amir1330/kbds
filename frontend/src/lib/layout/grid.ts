import type { LayoutKey } from './types';

/** Default position snap (u). Overridden by admin editor config. */
export const DEFAULT_SNAP_STEP_U = 0.25;

/** Default rotation snap (degrees). */
export const DEFAULT_ROTATION_STEP = 5;

/** Coarse grid lines in the canvas. */
export const GRID_MAJOR_U = 1;

/** Minor grid lines. */
export const GRID_MINOR_U = 0.25;

export interface EditorSnapConfig {
	snapStepU: number;
	rotationStepDeg: number;
	nudgeFineU: number;
	nudgeCoarseU: number;
}

export const DEFAULT_EDITOR_SNAP: EditorSnapConfig = {
	snapStepU: DEFAULT_SNAP_STEP_U,
	rotationStepDeg: DEFAULT_ROTATION_STEP,
	nudgeFineU: DEFAULT_SNAP_STEP_U,
	nudgeCoarseU: 1
};

let activeSnapConfig: EditorSnapConfig = { ...DEFAULT_EDITOR_SNAP };

export function setEditorSnapConfig(config: Partial<EditorSnapConfig>): void {
	activeSnapConfig = { ...activeSnapConfig, ...config };
}

export function getEditorSnapConfig(): EditorSnapConfig {
	return activeSnapConfig;
}

export function roundU(n: number): number {
	return Math.round(n * 100) / 100;
}

export function snapToGrid(value: number, step?: number): number {
	const s = step ?? activeSnapConfig.snapStepU;
	return roundU(Math.round(value / s) * s);
}

export function snapRotation(deg: number, step?: number): number {
	const s = step ?? activeSnapConfig.rotationStepDeg;
	return Math.round(deg / s) * s;
}

export function snapKeyPosition(
	x: number,
	y: number,
	step?: number
): { x: number; y: number } {
	return {
		x: Math.max(0, snapToGrid(x, step)),
		y: snapToGrid(y, step)
	};
}

export function snapDragDelta(dx: number, dy: number, step?: number): { dx: number; dy: number } {
	const s = step ?? activeSnapConfig.snapStepU;
	return {
		dx: Math.round(dx / s) * s,
		dy: Math.round(dy / s) * s
	};
}

type KeyBox = Pick<LayoutKey, 'id' | 'x' | 'y' | 'width' | 'height'>;

export function boxesOverlap(a: KeyBox, b: KeyBox, minDepth = 0.1): boolean {
	const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
	const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
	return ox > minDepth && oy > minDepth;
}

export function overlappingKeyIds(keys: LayoutKey[]): Set<string> {
	const ids = new Set<string>();
	for (let i = 0; i < keys.length; i++) {
		for (let j = i + 1; j < keys.length; j++) {
			if (boxesOverlap(keys[i], keys[j])) {
				ids.add(keys[i].id);
				ids.add(keys[j].id);
			}
		}
	}
	return ids;
}

export function clampMove(
	key: LayoutKey,
	x: number,
	y: number,
	_others: LayoutKey[]
): { x: number; y: number } {
	return snapKeyPosition(x, y);
}

export function findFreeSlot(
	keys: LayoutKey[],
	width = 1,
	height = 1
): { x: number; y: number } {
	const step = activeSnapConfig.snapStepU;
	const maxX = keys.length ? Math.max(...keys.map((k) => k.x + k.width), 6) : 6;
	const maxY = keys.length ? Math.max(...keys.map((k) => k.y + k.height), 3) : 3;
	const cols = Math.ceil((maxX + 2) / step);
	const rows = Math.ceil((maxY + 2) / step);

	for (let row = 0; row <= rows; row++) {
		for (let col = 0; col <= cols; col++) {
			const x = roundU(col * step);
			const y = roundU(row * step);
			const probe: KeyBox = { id: '__probe', x, y, width, height };
			if (!keys.some((k) => boxesOverlap(probe, k, 0.5))) {
				return { x, y };
			}
		}
	}

	return { x: 0, y: roundU(maxY + step) };
}

export function nudgeKey(
	key: LayoutKey,
	dx: number,
	dy: number,
	others: LayoutKey[]
): { x: number; y: number } {
	return clampMove(key, key.x + dx, key.y + dy, others);
}
