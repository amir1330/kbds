/**
 * Convert QMK physical layout (info.json) to canonical sparse KLE raw format
 * (same style as community Corne/Lily58 gists — not flat row grids).
 *
 * QMK keyboard definitions: GPL-2.0 — https://github.com/qmk/qmk_firmware
 */

export interface QmkPhysicalKey {
	x: number;
	y: number;
	w?: number;
	h?: number;
	r?: number;
	rx?: number;
	ry?: number;
	label?: string;
}

const ROW_Y_TOLERANCE = 0.55;

function round(n: number): number {
	return Math.round(n * 1000) / 1000;
}

function labelFor(index: number, key: QmkPhysicalKey, labels?: string[]): string {
	if (labels?.[index]) return labels[index];
	if (key.label) return key.label;
	return '·';
}

export function qmkPhysicalToKleSparse(
	name: string,
	author: string,
	keys: QmkPhysicalKey[],
	labels?: string[]
): unknown[] {
	const tagged = keys.map((k, i) => ({ ...k, _label: labelFor(i, k, labels) }));
	const sorted = [...tagged].sort((a, b) => a.y - b.y || a.x - b.x);

	const visualRows: (typeof tagged)[] = [];
	for (const key of sorted) {
		const row = visualRows.find((r) => Math.abs(r[0].y - key.y) < ROW_Y_TOLERANCE);
		if (row) row.push(key);
		else visualRows.push([key]);
	}

	for (const row of visualRows) {
		row.sort((a, b) => a.x - b.x);
	}

	const kleRows: unknown[][] = [];

	for (const row of visualRows) {
		const kleRow: unknown[] = [];
		let cursorX = 0;
		const baseY = row[0].y;

		for (let i = 0; i < row.length; i++) {
			const key = row[i];
			const meta: Record<string, number> = {};

			const xGap = round(key.x - cursorX);
			if (Math.abs(xGap) > 0.001) meta.x = xGap;

			const yOff = round(key.y - baseY);
			if (Math.abs(yOff) > 0.001) meta.y = yOff;

			if (key.w && key.w !== 1) meta.w = key.w;
			if (key.h && key.h !== 1) meta.h = key.h;
			if (key.r) meta.a = key.r;
			if (key.rx !== undefined) meta.rx = key.rx;
			if (key.ry !== undefined) meta.ry = key.ry;

			if (Object.keys(meta).length) kleRow.push(meta);
			kleRow.push(key._label);
			cursorX = key.x + (key.w ?? 1);
		}

		kleRows.push(kleRow);
	}

	return [{ name, author, plate: true }, ...kleRows];
}

/** Strip multi-line legend keys down to first line for plate preview. */
export function simplifyKleLabels(raw: unknown[]): unknown[] {
	return raw.map((entry) => {
		if (typeof entry === 'string') {
			return entry.split('\n')[0] || '·';
		}
		if (Array.isArray(entry)) {
			return entry.map((cell) => {
				if (typeof cell === 'string') return cell.split('\n')[0] || '·';
				return cell;
			});
		}
		return entry;
	});
}
