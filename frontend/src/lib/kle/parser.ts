/**
 * Lightweight KLE (Keyboard Layout Editor) JSON parser.
 * Parses the raw nested-array format used by keyboard-layout-editor.com
 *
 * Based on the MIT-licensed Keyboard Layout Editor project:
 * https://github.com/ijprest/keyboard-layout-editor
 */

export const KEY_UNIT_MM = 19.05;

export interface KleKey {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	rotationX: number;
	rotationY: number;
	label: string;
	profile: string;
	color: string;
	textColor: string;
}

export interface KleLayout {
	keys: KleKey[];
	width: number;
	height: number;
}

const DEFAULT_KEY_WIDTH = 1;
const DEFAULT_KEY_HEIGHT = 1;

function parseKeyMetadata(obj: Record<string, unknown>): Partial<KleKey> {
	const meta: Partial<KleKey> = {};
	if (typeof obj.c === 'string') meta.color = obj.c;
	if (typeof obj.t === 'string') meta.textColor = obj.t;
	if (typeof obj.p === 'string') meta.profile = obj.p;
	if (typeof obj.a === 'number') meta.rotation = obj.a;
	if (typeof obj.rx === 'number') meta.rotationX = obj.rx;
	if (typeof obj.ry === 'number') meta.rotationY = obj.ry;
	if (typeof obj.w === 'number') meta.width = obj.w;
	if (typeof obj.h === 'number') meta.height = obj.h;
	if (typeof obj.x === 'number') meta.x = obj.x;
	if (typeof obj.y === 'number') meta.y = obj.y;
	return meta;
}

function isMetadata(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse KLE raw JSON (nested array format) into renderable key positions.
 */
export function parseKleRaw(raw: unknown): KleLayout {
	if (!Array.isArray(raw)) {
		throw new Error('KLE data must be a nested array');
	}

	const keys: KleKey[] = [];
	let cursorX = 0;
	let cursorY = 0;
	let pendingMeta: Partial<KleKey> = {};
	let currentColor = '#3c3836';
	let currentTextColor = '#d5c4a1';
	let currentProfile = 'CHICKLET';

	for (const row of raw) {
		if (!Array.isArray(row)) continue;

		cursorX = 0;

		for (const cell of row) {
			if (isMetadata(cell)) {
				pendingMeta = { ...pendingMeta, ...parseKeyMetadata(cell) };
				if (cell.c) currentColor = String(cell.c);
				if (cell.t) currentTextColor = String(cell.t);
				if (cell.p) currentProfile = String(cell.p);
				continue;
			}

			if (cell === '\n' || cell === '\n\n') {
				cursorY += 1;
				cursorX = 0;
				continue;
			}

			const meta = { ...pendingMeta };
			pendingMeta = {};

			const width = meta.width ?? DEFAULT_KEY_WIDTH;
			const height = meta.height ?? DEFAULT_KEY_HEIGHT;
			const x = (meta.x ?? 0) + cursorX;
			const y = (meta.y ?? 0) + cursorY;

			keys.push({
				x,
				y,
				width,
				height,
				rotation: meta.rotation ?? 0,
				rotationX: meta.rotationX ?? 0,
				rotationY: meta.rotationY ?? 0,
				label: String(cell ?? ''),
				profile: meta.profile ?? currentProfile,
				color: meta.color ?? currentColor,
				textColor: meta.textColor ?? currentTextColor
			});

			cursorX += width;
		}

		cursorY += 1;
	}

	const width = keys.reduce((max, k) => Math.max(max, k.x + k.width), 0);
	const height = keys.reduce((max, k) => Math.max(max, k.y + k.height), 0);

	return { keys, width, height };
}

/**
 * Parse KLE JSON from either raw array format or { layout: [...] } wrapper.
 */
export function parseKleJson(data: unknown): KleLayout {
	if (Array.isArray(data)) {
		return parseKleRaw(data);
	}

	if (typeof data === 'object' && data !== null && 'layout' in data) {
		return parseKleRaw((data as { layout: unknown }).layout);
	}

	throw new Error('Unrecognized KLE JSON format');
}

export const KLE_ATTRIBUTION = {
	name: 'Keyboard Layout Editor',
	url: 'https://github.com/ijprest/keyboard-layout-editor',
	license: 'MIT'
};

export { KLE_CREDITS, KLE_EDITOR_URL } from './share';
