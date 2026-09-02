#!/usr/bin/env node
/**
 * Plate presets from community KLE gists + QMK physical → sparse KLE (one key per row).
 * Run: node scripts/generate-kle-presets.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserialize } from 'kle-serial-alt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../static/kle-presets');

const COMMUNITY_KLE = {
	corne: {
		url: 'https://gist.githubusercontent.com/c0psrul3/adfa7c3cd8f0c6d3a7b9155c6eab1748/raw/Corne.crkbd_c0psrul3.default.json',
		file: 'corne.json',
		meta: { name: 'Corne', author: 'c0psrul3 / foostan crkbd (KLE gist)' }
	},
	lily58: {
		url: 'https://gist.githubusercontent.com/bytesoverflow/73d679bbce902ca0edd98e91d9c2b6d9/raw/Lily58.kbd.json',
		file: 'lily58.json',
		meta: { name: 'Lily58', author: 'bytesoverflow / kagawa lily58 (KLE gist)' }
	},
	sofle: {
		url: 'https://gist.githubusercontent.com/josefadamcik/76efb423a46cbbea75465cb468eef7ff/raw/4d5db46077fe7e575fb63598b42d3cd59cee8257/SofleKeyboard.kbd.json',
		file: 'sofle.json',
		meta: { name: 'Sofle', author: 'JosefAdamcik (KLE gist)' },
		/** Keep Josef's sparse plate rows; drop stacked firmware layers below. */
		plateRows: 16
	}
};

const QMK_SOURCES = {
	ferris: {
		url: 'https://raw.githubusercontent.com/qmk/qmk_firmware/master/keyboards/ferris/0_2/info.json',
		layout: 'LAYOUT_split_3x5_2',
		file: 'ferris.json',
		name: 'Ferris Sweep',
		author: 'pipoypipeta / QMK ferris 0_2'
	},
	'60-ansi': {
		url: 'https://raw.githubusercontent.com/qmk/qmk_firmware/master/layouts/default/60_ansi/info.json',
		layout: 'LAYOUT_60_ansi',
		file: '60-ansi.json',
		name: '60% ANSI',
		author: 'QMK LAYOUT_60_ansi'
	}
};

function simplifyLabels(raw) {
	return raw.map((entry) => {
		if (typeof entry === 'string') return entry.split('\n')[0] || '·';
		if (Array.isArray(entry)) {
			return entry.map((cell) =>
				typeof cell === 'string' ? cell.split('\n')[0] || '·' : cell
			);
		}
		return entry;
	});
}

function round(n) {
	return Math.round(n * 1000) / 1000;
}

/** QMK physical layout → sparse KLE (group keys that share a row). */
function qmkPhysicalToSparseKle(name, author, qmkKeys, label = '·') {
	const groups = new Map();
	for (const key of qmkKeys) {
		const y = round(key.y);
		if (!groups.has(y)) groups.set(y, []);
		groups.get(y).push(key);
	}

	const kleRows = [];
	let cursorY = 0;

	for (const y of [...groups.keys()].sort((a, b) => a - b)) {
		const keys = groups.get(y).sort((a, b) => a.x - b.x);
		const metaY = round(y - cursorY);
		const row = [];

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const cellMeta = {};

			if (i === 0) {
				cellMeta.x = round(key.x);
				cellMeta.y = metaY;
			} else {
				const prev = keys[i - 1];
				cellMeta.x = round(key.x - (prev.x + (prev.w ?? 1)));
			}

			if (key.w != null && key.w !== 1) cellMeta.w = key.w;
			if (key.h != null && key.h !== 1) cellMeta.h = key.h;
			if (key.r) cellMeta.a = key.r;
			if (key.rx) cellMeta.rx = key.rx;
			if (key.ry) cellMeta.ry = key.ry;

			if (Object.keys(cellMeta).length) row.push(cellMeta);
			row.push(label);
		}

		kleRows.push(row);
		cursorY += 1 + metaY;
	}

	return [{ name, author, plate: true }, ...kleRows];
}

function truncatePlateRows(raw, rowCount) {
	return [raw[0], ...raw.slice(1, 1 + rowCount)];
}

const blankSplit = [
	{ name: 'Blank split', author: 'kbds' },
	[{ x: 0, y: 0 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·'],
	[{ y: -0.75, x: 0 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 4 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·'],
	[{ y: -0.75, x: 0 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 4 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·'],
	[{ y: -0.75, x: 0 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 4 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·', { x: 1 }, '·'],
	[{ y: -0.25, x: 1 }, '·', { x: 2 }, '·', { x: 4 }, '·', { x: 1 }, '·', { x: 2 }, '·']
];

mkdirSync(outDir, { recursive: true });

for (const [id, cfg] of Object.entries(COMMUNITY_KLE)) {
	const res = await fetch(cfg.url);
	if (!res.ok) throw new Error(`Failed ${cfg.url}`);
	let raw = await res.json();

	if (cfg.plateRows != null) {
		raw = truncatePlateRows(raw, cfg.plateRows);
	}

	if (cfg.meta && raw[0] && typeof raw[0] === 'object') {
		raw[0] = {
			...raw[0],
			...cfg.meta,
			...(cfg.plateRows != null ? { plate: true } : {})
		};
	}
	raw = simplifyLabels(raw);

	deserialize(raw);
	writeFileSync(join(outDir, cfg.file), JSON.stringify(raw, null, 2) + '\n');
	const k = deserialize(raw);
	const keys = k.keys.filter((x) => !x.decal && !x.ghost);
	console.log(
		'community',
		id,
		keys.length,
		'keys',
		'maxY',
		Math.max(...keys.map((x) => x.y + x.height)).toFixed(2)
	);
}

for (const [id, cfg] of Object.entries(QMK_SOURCES)) {
	const res = await fetch(cfg.url);
	if (!res.ok) throw new Error(`Failed ${cfg.url}`);
	const data = await res.json();
	const layoutObj = data.layouts[cfg.layout];
	const raw = qmkPhysicalToSparseKle(cfg.name, cfg.author, layoutObj.layout);
	deserialize(raw);
	writeFileSync(join(outDir, cfg.file), JSON.stringify(raw, null, 2) + '\n');
	const k = deserialize(raw);
	console.log(
		'qmk',
		id,
		k.keys.filter((x) => !x.decal && !x.ghost).length,
		'keys',
		'maxY',
		Math.max(...k.keys.map((x) => x.y + x.height)).toFixed(2)
	);
}

for (const [file, raw] of [['blank-split.json', blankSplit]]) {
	deserialize(raw);
	writeFileSync(join(outDir, file), JSON.stringify(raw, null, 2) + '\n');
	console.log('static', file);
}

console.log('done');
