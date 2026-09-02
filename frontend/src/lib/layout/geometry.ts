import type { LayoutKey } from './types';

/** Rotation pivot in pixel space (KLE rx/ry as absolute u when set, else key center). */
export function rotationPivotPx(
	key: LayoutKey,
	rect: { x: number; y: number; w: number; h: number },
	unitStep: number,
	padding = 0
): { px: number; py: number } {
	const px =
		key.pivotX != null
			? padding + key.pivotX * unitStep
			: rect.x + rect.w / 2;
	const py =
		key.pivotY != null
			? padding + key.pivotY * unitStep
			: rect.y + rect.h / 2;
	return { px, py };
}

/** Rotation pivot in layout u-space (for SVG export without canvas padding). */
export function rotationPivotU(
	key: LayoutKey,
	rect: { x: number; y: number; w: number; h: number },
	unitStep: number
): { px: number; py: number } {
	const px =
		key.pivotX != null ? key.pivotX * unitStep : rect.x + rect.w / 2;
	const py =
		key.pivotY != null ? key.pivotY * unitStep : rect.y + rect.h / 2;
	return { px, py };
}
