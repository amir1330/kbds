import { roundU, snapKeyPosition, snapRotation, snapToGrid } from './grid';
import {
	uid,
	type BuildLayout,
	type LayoutKey,
	type SplitAnchor
} from './types';

export type { SplitAnchor };

export function layoutSpan(keys: LayoutKey[]): number {
	if (keys.length === 0) return 15;
	return Math.max(...keys.map((k) => k.x + k.width));
}

/** Stable anchor when only the left half exists (blank split template). */
export function anchorFromLeftHalfAndGap(keys: LayoutKey[], splitGapU: number): SplitAnchor {
	if (keys.length === 0) {
		return { axis: 7, leftBase: 0, rightBase: 9 };
	}

	let source = keys;
	if (hasDistinctRightHalf(keys, splitGapU)) {
		const detected = detectSplitAnchor(keys);
		source = keys.filter((k) => k.x + k.width / 2 <= detected.axis + 0.01);
	}

	const leftBase = Math.min(...source.map((k) => k.x));
	const leftMax = Math.max(...source.map((k) => k.x + k.width));
	const rightBase = roundU(leftMax + splitGapU);
	const axis = roundU((leftMax + rightBase) / 2);
	return { axis, leftBase, rightBase };
}

/** True when keys form two separated clusters (real split), not a single half. */
export function hasDistinctRightHalf(keys: LayoutKey[], _gapU = 3): boolean {
	if (keys.length === 0) return false;

	const detected = detectSplitAnchor(keys);
	const left = keys.filter((k) => k.x + k.width / 2 <= detected.axis + 0.01);
	const right = keys.filter((k) => k.x + k.width / 2 > detected.axis + 0.01);
	if (right.length === 0 || left.length === 0) return false;

	// Single-half templates (blank split) span ~5u; loaded splits span ~12u+.
	if (layoutSpan(keys) < 7) return false;

	const minSide = Math.min(left.length, right.length);
	if (minSide < Math.max(3, keys.length * 0.15)) return false;

	const leftMax = Math.max(...left.map((k) => k.x + k.width));
	const rightMin = Math.min(...right.map((k) => k.x));
	if (rightMin - leftMax >= 0.25) return true;

	// Lily58-style: rotated inner thumbs overlap in bbox but centers stay separated.
	const maxLeftCenter = Math.max(...left.map((k) => k.x + k.width / 2));
	const minRightCenter = Math.min(...right.map((k) => k.x + k.width / 2));
	return minRightCenter - maxLeftCenter >= 0.25;
}

export function detectSplitAnchor(keys: LayoutKey[]): SplitAnchor {
	if (keys.length === 0) {
		return { axis: 7, leftBase: 0, rightBase: 9 };
	}

	const byCenter = [...keys].sort(
		(a, b) => a.x + a.width / 2 - (b.x + b.width / 2)
	);

	let maxGap = 0;
	let axis = byCenter[0].x + byCenter[0].width / 2;

	for (let i = 1; i < byCenter.length; i++) {
		const prev = byCenter[i - 1];
		const curr = byCenter[i];
		const gap = curr.x - (prev.x + prev.width);
		if (gap > maxGap) {
			maxGap = gap;
			axis = (prev.x + prev.width + curr.x) / 2;
		}
	}

	if (maxGap < 0.75) {
		axis = layoutSpan(keys) / 2;
	}

	const left = keys.filter((k) => k.x + k.width / 2 <= axis + 0.01);
	const right = keys.filter((k) => k.x + k.width / 2 > axis + 0.01);

	return {
		axis: roundU(axis),
		leftBase: left.length ? Math.min(...left.map((k) => k.x)) : 0,
		rightBase: right.length ? Math.min(...right.map((k) => k.x)) : roundU(axis + 1)
	};
}

export function getSplitAnchor(layout: BuildLayout): SplitAnchor {
	if (layout.splitAnchor) return layout.splitAnchor;
	return detectSplitAnchor(layout.keys);
}

export function splitAxisX(keys: LayoutKey[], anchor?: SplitAnchor): number {
	return (anchor ?? detectSplitAnchor(keys)).axis;
}

export function isLeftHalf(key: LayoutKey, anchor: SplitAnchor): boolean {
	if (key.half) return key.half === 'left';
	return key.x + key.width / 2 <= anchor.axis + 0.01;
}

/** Plate x for the key reflected across the split axis. Works for keys on either half. */
export function mirrorPartnerX(key: LayoutKey, anchor: SplitAnchor): number {
	const center = key.x + key.width / 2;
	const mirroredCenter = 2 * anchor.axis - center;
	return roundU(mirroredCenter - key.width / 2);
}

/** Sync every right key from its left partner (mirror is left-driven). */
export function syncAllMirrorPartners(
	keys: LayoutKey[],
	anchor: SplitAnchor,
	snapStep: number,
	rotationStep = 5
): LayoutKey[] {
	const byId = new Map(keys.map((k) => [k.id, k]));

	return keys.map((k) => {
		if (k.half !== 'right' || !k.mirrorOf) return k;
		const left = byId.get(k.mirrorOf);
		if (!left) return k;
		return { ...k, ...mirrorPartnerFields(left, anchor, snapStep, rotationStep) };
	});
}

function sortKeys(a: LayoutKey, b: LayoutKey): number {
	return a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);
}

function mirroredRotation(rotation: number, rotationStep: number): number {
	return snapRotation(rotation ? -rotation : 0, rotationStep);
}

/** Mirror KLE rotation pivot (absolute layout u) across the split axis. */
function mirrorPivotFields(
	key: LayoutKey,
	anchor: SplitAnchor
): { pivotX?: number; pivotY?: number } {
	if (!key.rotation && key.pivotX == null && key.pivotY == null) {
		return {};
	}

	const pivotAbsX = key.pivotX ?? key.x + key.width / 2;
	const pivotAbsY = key.pivotY ?? key.y + key.height / 2;
	const mirroredPivotAbsX = 2 * anchor.axis - pivotAbsX;

	return {
		pivotX: roundU(mirroredPivotAbsX),
		pivotY: roundU(pivotAbsY)
	};
}

/** Build mirrored partner fields from a driver key (geometry about split axis). */
export function mirrorPartnerFields(
	key: LayoutKey,
	anchor: SplitAnchor,
	snapStep: number,
	rotationStep = 5
): Partial<LayoutKey> {
	const pos = snapKeyPosition(mirrorPartnerX(key, anchor), key.y, snapStep);
	const pivots = mirrorPivotFields(key, anchor);
	return {
		x: pos.x,
		y: pos.y,
		width: key.width,
		height: key.height,
		rotation: mirroredRotation(key.rotation, rotationStep),
		label: key.label,
		...pivots
	};
}

function createMirroredPartner(
	left: LayoutKey,
	anchor: SplitAnchor,
	snapStep: number,
	rotationStep: number
): LayoutKey {
	const mirrored = mirrorPartnerFields(left, anchor, snapStep, rotationStep);
	return {
		...left,
		...mirrored,
		id: uid(),
		half: 'right',
		mirrorOf: left.id
	};
}

/** Left-only keys → left + geometrically mirrored right partners. */
export function materializeMirrorHalves(
	keys: LayoutKey[],
	anchor: SplitAnchor,
	snapStep: number,
	rotationStep = 5
): LayoutKey[] {
	const leftOnly = keys
		.filter((k) => isLeftHalf(k, anchor))
		.sort(sortKeys)
		.map((k) => ({ ...k, half: 'left' as const, mirrorOf: undefined as string | undefined }));

	const out: LayoutKey[] = [];
	for (const left of leftOnly) {
		const right = createMirroredPartner(left, anchor, snapStep, rotationStep);
		left.mirrorOf = right.id;
		right.mirrorOf = left.id;
		out.push(left, right);
	}
	return out;
}

/** Detect layouts where the right half is a translated copy, not a reflection. */
function isParallelDuplicateHalf(keys: LayoutKey[], anchor: SplitAnchor): boolean {
	const left = keys.filter((k) => isLeftHalf(k, anchor)).sort(sortKeys);
	const right = keys.filter((k) => !isLeftHalf(k, anchor)).sort(sortKeys);
	if (left.length === 0 || left.length !== right.length) return false;

	let parallel = 0;
	for (let i = 0; i < left.length; i++) {
		const parallelX = anchor.rightBase + (left[i].x - anchor.leftBase);
		const mirrorX = mirrorPartnerX(left[i], anchor);
		if (Math.abs(right[i].x - parallelX) < 0.01 && Math.abs(right[i].x - mirrorX) > 0.25) {
			parallel++;
		}
	}
	return parallel >= Math.ceil(left.length * 0.5);
}

/** Replace parallel-copy right keys with axis-mirrored partners (keeps left keys). */
export function rebuildMirrorRightHalf(
	keys: LayoutKey[],
	anchor: SplitAnchor,
	snapStep: number,
	rotationStep = 5
): LayoutKey[] {
	const left = keys
		.filter((k) => isLeftHalf(k, anchor))
		.sort(sortKeys)
		.map((k) => ({ ...k, half: 'left' as const, mirrorOf: undefined as string | undefined }));

	const out: LayoutKey[] = [];
	for (const leftKey of left) {
		const right = createMirroredPartner(leftKey, anchor, snapStep, rotationStep);
		leftKey.mirrorOf = right.id;
		right.mirrorOf = leftKey.id;
		out.push(leftKey, right);
	}
	return out;
}

function pairKeys(keys: LayoutKey[], anchor: SplitAnchor): LayoutKey[] {
	const left = keys.filter((k) => isLeftHalf(k, anchor)).sort(sortKeys);
	const right = keys.filter((k) => !isLeftHalf(k, anchor)).sort(sortKeys);

	const next = keys.map((k) => ({
		...k,
		mirrorOf: undefined as string | undefined,
		half: isLeftHalf(k, anchor) ? ('left' as const) : ('right' as const)
	}));

	const usedRight = new Set<string>();
	for (const lk of left) {
		const targetX = mirrorPartnerX(lk, anchor);
		let best: (typeof next)[0] | null = null;
		let bestScore = Infinity;

		for (const rk of right) {
			const node = next.find((k) => k.id === rk.id)!;
			if (usedRight.has(node.id)) continue;
			const score = Math.abs(node.x - targetX) + Math.abs(node.y - lk.y) * 2;
			if (score < bestScore) {
				bestScore = score;
				best = node;
			}
		}

		if (!best) continue;
		const leftNode = next.find((k) => k.id === lk.id)!;
		leftNode.mirrorOf = best.id;
		best.mirrorOf = leftNode.id;
		usedRight.add(best.id);
	}

	return next;
}

export function linkMirrorPairs(
	keys: LayoutKey[],
	anchor: SplitAnchor,
	_snapStep = 0.25
): LayoutKey[] {
	return pairKeys(keys, anchor);
}

export function snapKeyFields(
	key: LayoutKey,
	snapStep: number,
	rotationStep = 5
): Partial<LayoutKey> {
	const pos = snapKeyPosition(key.x, key.y, snapStep);
	return {
		x: pos.x,
		y: pos.y,
		rotation: snapRotation(key.rotation, rotationStep)
	};
}

export function snapAllKeys(
	keys: LayoutKey[],
	snapStep: number,
	rotationStep = 5
): LayoutKey[] {
	return keys.map((k) => ({
		...k,
		...snapKeyFields(k, snapStep, rotationStep)
	}));
}

export function applyKeyPatch(
	layout: BuildLayout,
	keyId: string,
	patch: Partial<LayoutKey>,
	snapStep: number,
	rotationStep = 5
): LayoutKey[] {
	if (!layout.mirrorEdits || layout.formFactor !== 'split') {
		return layout.keys.map((k) => (k.id === keyId ? { ...k, ...patch } : k));
	}

	const before = layout.keys.find((k) => k.id === keyId);
	if (!before?.mirrorOf) {
		return layout.keys.map((k) => (k.id === keyId ? { ...k, ...patch } : k));
	}

	const partnerId = before.mirrorOf;
	const anchor = getSplitAnchor(layout);

	let keys = layout.keys.map((k) => (k.id === keyId ? { ...k, ...patch } : k));
	const edited = keys.find((k) => k.id === keyId)!;

	const leftId = isLeftHalf(edited, anchor) ? keyId : partnerId;
	const rightId = isLeftHalf(edited, anchor) ? partnerId : keyId;

	// Right-half edits project onto the left driver, then mirror out.
	if (keyId === rightId) {
		const leftPatch = mirrorPartnerFields(edited, anchor, snapStep, rotationStep);
		keys = keys.map((k) => (k.id === leftId ? { ...k, ...leftPatch } : k));
	}

	const leftKey = keys.find((k) => k.id === leftId)!;
	const rightPatch = mirrorPartnerFields(leftKey, anchor, snapStep, rotationStep);

	return keys.map((k) => (k.id === rightId ? { ...k, ...rightPatch } : k));
}

export function deleteKeyWithMirror(layout: BuildLayout, keyId: string): LayoutKey[] {
	const key = layout.keys.find((k) => k.id === keyId);
	if (!key) return layout.keys;
	const toRemove = new Set([keyId]);
	if (layout.mirrorEdits && key.mirrorOf) toRemove.add(key.mirrorOf);
	return layout.keys.filter((k) => !toRemove.has(k.id));
}

export function addMirroredKeyPair(
	layout: BuildLayout,
	template: LayoutKey,
	snapStep: number
): LayoutKey[] {
	const anchor = getSplitAnchor(layout);

	const left: LayoutKey = {
		...template,
		id: template.id || uid(),
		half: 'left',
		mirrorOf: undefined,
		...snapKeyFields(
			{
				...template,
				x:
					template.half === 'right'
						? anchor.leftBase
						: Math.min(template.x, anchor.axis - (template.width ?? 1)),
				y: template.y
			},
			snapStep
		)
	};

	const right = createMirroredPartner(left, anchor, snapStep, 5);
	left.mirrorOf = right.id;
	return [...layout.keys, left, right];
}

export function finalizeLayoutKeys(
	layout: BuildLayout,
	snapStep = 0.25,
	rotationStep = 5
): BuildLayout {
	let keys = snapAllKeys(layout.keys, snapStep, rotationStep);

	if (layout.formFactor !== 'split') {
		return { ...layout, keys, splitAnchor: undefined };
	}

	const gap = layout.splitGapU || 3;
	const detected = detectSplitAnchor(keys);
	const resolvedAnchor =
		layout.splitAnchor ??
		(hasDistinctRightHalf(keys, gap)
			? detected
			: anchorFromLeftHalfAndGap(keys, gap));

	if (layout.mirrorEdits) {
		// Right half is always derived from left — drops orphan/stale parallel-copy keys.
		keys = rebuildMirrorRightHalf(keys, resolvedAnchor, snapStep, rotationStep);
	} else {
		keys = linkMirrorPairs(keys, resolvedAnchor, snapStep);
	}

	return { ...layout, keys, splitAnchor: resolvedAnchor };
}

/** Widen/narrow split gap and re-sync mirrored right half from left drivers. */
export function applySplitGap(
	layout: BuildLayout,
	splitGapU: number,
	snapStep = 0.25,
	rotationStep = 5
): BuildLayout {
	if (layout.formFactor !== 'split') return layout;

	const gap = Math.max(0, splitGapU);
	const anchor = getSplitAnchor(layout);
	const leftKeys = layout.keys.filter((k) => isLeftHalf(k, anchor));
	const nextAnchor = anchorFromLeftHalfAndGap(
		leftKeys.length ? leftKeys : layout.keys,
		gap
	);

	return finalizeLayoutKeys(
		{ ...layout, splitGapU: gap, splitAnchor: nextAnchor },
		snapStep,
		rotationStep
	);
}

export function clampLeftHalfMove(
	key: LayoutKey,
	x: number,
	y: number,
	anchor: SplitAnchor,
	snapStep: number
): { x: number; y: number } {
	const maxX = anchor.axis - key.width / 2;
	const snapped = snapKeyPosition(x, y, snapStep);
	return {
		x: Math.max(anchor.leftBase, Math.min(snapped.x, maxX)),
		y: snapped.y
	};
}

export function clampRightHalfMove(
	key: LayoutKey,
	x: number,
	y: number,
	anchor: SplitAnchor,
	snapStep: number
): { x: number; y: number } {
	const minX = anchor.axis - key.width / 2 + 0.01;
	const snapped = snapKeyPosition(x, y, snapStep);
	return {
		x: Math.max(minX, snapped.x),
		y: snapped.y
	};
}

export function clampFreeMove(
	x: number,
	y: number,
	snapStep: number
): { x: number; y: number } {
	return snapKeyPosition(Math.max(0, x), y, snapStep);
}

export function findDuplicateOffset(
	layout: BuildLayout,
	base: LayoutKey,
	snapStep: number
): { x: number; y: number } {
	let x = snapToGrid(base.x + snapStep, snapStep);
	let y = snapToGrid(base.y, snapStep);
	const anchor = getSplitAnchor(layout);

	for (let i = 0; i < 40; i++) {
		const clash = layout.keys.some(
			(k) => Math.abs(k.x - x) < 0.01 && Math.abs(k.y - y) < 0.01
		);
		if (!clash) return { x, y };
		y = snapToGrid(y + snapStep, snapStep);
		if (y > 12) {
			y = snapToGrid(base.y, snapStep);
			x = snapToGrid(x + snapStep, snapStep);
		}
		if (layout.mirrorEdits && layout.formFactor === 'split' && x > anchor.axis - 1) {
			x = anchor.leftBase;
			y = snapToGrid(y + snapStep, snapStep);
		}
	}
	return { x, y };
}

export function countMirrorPairs(keys: LayoutKey[]): number {
	return keys.filter((k) => k.mirrorOf && (k.half === 'left' || !k.half)).length;
}
