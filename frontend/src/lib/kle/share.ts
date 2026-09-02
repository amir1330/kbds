import { deserialize, parse, type Keyboard } from 'kle-serial-alt';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/** Decode kle-ng #share= links (algorithm from kle-ng, MIT — adamws/kle-ng). */
export function encodeShareLink(kleRaw: unknown[]): string {
	deserialize(kleRaw);
	const compressed = compressToEncodedURIComponent(JSON.stringify(kleRaw));
	return `${KLE_EDITOR_URL}#share=${compressed}`;
}

export function editorUrlFromRaw(kleRaw: unknown[]): string {
	return encodeShareLink(kleRaw);
}

export function decodeShareLink(input: string): unknown[] {
	const trimmed = input.trim();
	if (!trimmed) throw new Error('Empty input');

	if (trimmed.includes('#share=')) {
		const encoded = trimmed.split('#share=')[1]?.split(/[#&]/)[0] ?? '';
		return decodeCompressedShare(encoded);
	}

	if (trimmed.startsWith('[')) {
		return parseRawArray(trimmed);
	}

	return decodeCompressedShare(trimmed);
}

function decodeCompressedShare(encoded: string): unknown[] {
	const decoded = decodeURIComponent(encoded);
	const json = decompressFromEncodedURIComponent(decoded);
	if (!json) throw new Error('Could not decompress share link');
	return parseRawArray(json);
}

function parseRawArray(json: string): unknown[] {
	const raw = JSON.parse(json) as unknown;
	if (!Array.isArray(raw)) throw new Error('KLE layout must be a JSON array');
	deserialize(raw);
	return raw;
}

export function keyboardFromRaw(raw: unknown[]): Keyboard {
	return deserialize(raw);
}

export function layoutName(raw: unknown[]): string {
	const meta = raw[0];
	if (meta && typeof meta === 'object' && !Array.isArray(meta) && 'name' in meta) {
		return String((meta as { name: string }).name || 'Custom layout');
	}
	return 'Custom layout';
}

export const KLE_CREDITS = [
	{
		name: 'kle-ng',
		url: 'https://github.com/adamws/kle-ng',
		license: 'MIT',
		role: 'Layout editor'
	},
	{
		name: 'Keyboard Layout Editor',
		url: 'https://github.com/ijprest/keyboard-layout-editor',
		license: 'MIT',
		role: 'KLE format'
	},
	{
		name: 'kle-serial-alt',
		url: 'https://github.com/digitarhythm/kle-serial-alt',
		license: 'MIT',
		role: 'Layout parser'
	}
] as const;

export const KLE_EDITOR_URL = 'https://editor.keyboard-tools.xyz/';

export function editorUrlForPreset(presetFile: string, origin: string): string {
	const fileUrl = `${origin}/kle-presets/${presetFile}`;
	return `${KLE_EDITOR_URL}#url=${encodeURIComponent(fileUrl)}`;
}
