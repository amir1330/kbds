/**
 * Convert QMK info.json physical layout → KLE raw array.
 * Source layouts: QMK Firmware (GPL-2.0) — keyboards/crkbd, sofle, ferris, etc.
 */

export interface QmkLayoutKey {
	x: number;
	y: number;
	w?: number;
	h?: number;
	r?: number;
	rx?: number;
	ry?: number;
	matrix?: [number, number];
	label?: string;
}

const ROW_Y_TOLERANCE = 0.55;

function round(n: number, step = 0.001): number {
	return Math.round(n / step) * step;
}

function metaForKey(
	key: QmkLayoutKey,
	cursorX: number,
	rowBaseY: number,
	isFirstInRow: boolean
): Record<string, number> | null {
	const meta: Record<string, number> = {};
	const xGap = round(key.x - cursorX);
	const yOff = round(key.y - rowBaseY);

	if (Math.abs(xGap) > 0.001) meta.x = xGap;
	if (isFirstInRow && Math.abs(yOff) > 0.001) meta.y = yOff;
	else if (!isFirstInRow && Math.abs(yOff) > 0.001) meta.y = yOff;

	if (key.w && key.w !== 1) meta.w = key.w;
	if (key.h && key.h !== 1) meta.h = key.h;
	if (key.r) meta.a = key.r;
	if (key.rx) meta.rx = key.rx;
	if (key.ry) meta.ry = key.ry;

	return Object.keys(meta).length ? meta : null;
}

export function qmkLayoutToKleRaw(
	name: string,
	author: string,
	keys: QmkLayoutKey[],
	labels?: string[]
): unknown[] {
	const tagged = keys.map((k, i) => ({
		...k,
		label: labels?.[i] ?? k.label ?? '·'
	}));

	const sorted = [...tagged].sort((a, b) => a.y - b.y || a.x - b.x);
	const visualRows: QmkLayoutKey[][] = [];

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
		const rowBaseY = row[0].y;

		for (let i = 0; i < row.length; i++) {
			const key = row[i];
			const meta = metaForKey(key, cursorX, rowBaseY, i === 0);
			if (meta) kleRow.push(meta);
			kleRow.push(key.label ?? '·');
			cursorX = key.x + (key.w ?? 1);
		}

		kleRows.push(kleRow);
	}

	return [{ name, author }, ...kleRows];
}

export function blankSplitGrid(
	name: string,
	leftRows: number,
	leftCols: number,
	rightRows: number,
	rightCols: number,
	gapU = 3
): unknown[] {
	const rows: unknown[][] = [];
	const maxRows = Math.max(leftRows, rightRows);

	for (let r = 0; r < maxRows; r++) {
		const row: unknown[] = [];
		for (let c = 0; c < leftCols; c++) row.push('·');
		if (gapU > 0) row.push({ x: gapU });
		for (let c = 0; c < rightCols; c++) row.push('·');
		rows.push(row);
	}

	return [{ name, author: 'kbds' }, ...rows];
}

export function blankUnibodyGrid(name: string, rows: number, cols: number): unknown[] {
	const kleRows: unknown[][] = [];
	for (let r = 0; r < rows; r++) {
		kleRows.push(Array.from({ length: cols }, () => '·'));
	}
	return [{ name, author: 'kbds' }, ...kleRows];
}

/** Append one key to the last row, or start a new row. */
export function appendKey(kleRaw: unknown[], label = '·'): unknown[] {
	const copy = structuredClone(kleRaw) as unknown[];
	const rows = copy.filter((r) => Array.isArray(r)) as unknown[][];
	if (rows.length === 0) return [{ name: 'Custom' }, [label]];
	const last = rows[rows.length - 1] as unknown[];
	last.push(label);
	return copy;
}

/** Append a row with `cols` keys (split-aware: gap in the middle). */
export function appendRow(
	kleRaw: unknown[],
	cols: number,
	opts: { split?: boolean; gapU?: number } = {}
): unknown[] {
	const copy = structuredClone(kleRaw) as unknown[];
	const row: unknown[] = [];
	const half = opts.split ? Math.ceil(cols / 2) : cols;
	for (let i = 0; i < half; i++) row.push('·');
	if (opts.split) {
		row.push({ x: opts.gapU ?? 3 });
		for (let i = half; i < cols; i++) row.push('·');
	}
	copy.push(row);
	return copy;
}

/** Add one column — one key per half on split layouts. */
export function appendColumn(kleRaw: unknown[], opts: { split?: boolean } = {}): unknown[] {
	const copy = structuredClone(kleRaw) as unknown[];
	for (const entry of copy) {
		if (!Array.isArray(entry)) continue;
		const row = entry as unknown[];
		if (!opts.split) {
			row.push('·');
			continue;
		}
		const gapIdx = row.findIndex(
			(c) => c && typeof c === 'object' && !Array.isArray(c) && 'x' in (c as object)
		);
		if (gapIdx < 0) {
			row.push('·');
			continue;
		}
		row.splice(gapIdx, 0, '·');
		row.push('·');
	}
	return copy;
}

export function detectSplitGap(kleRaw: unknown[]): number {
	for (const entry of kleRaw) {
		if (!Array.isArray(entry)) continue;
		for (const cell of entry) {
			if (cell && typeof cell === 'object' && !Array.isArray(cell) && 'x' in cell) {
				const x = (cell as { x: number }).x;
				if (x >= 2) return x;
			}
		}
	}
	return 3;
}

export function isSplitLayout(kleRaw: unknown[]): boolean {
	return detectSplitGap(kleRaw) > 0 && kleRaw.some((e) => Array.isArray(e));
}
