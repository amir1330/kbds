import { KEY_UNIT_MM } from '$lib/kle/parser';
import type { Keyboard } from 'kle-serial-alt';

export interface KlePlateKey {
	label: string;
	x_u: number;
	y_u: number;
	width_u: number;
	height_u: number;
	rotation_deg: number;
	x_mm: number;
	y_mm: number;
	width_mm: number;
	height_mm: number;
}

export interface KlePlateExport {
	preset_name: string;
	unit_mm: number;
	keys: KlePlateKey[];
	summary_text: string;
	plate_json: string;
	kle_raw: unknown[];
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}

export function exportKlePlate(kleRaw: unknown[], keyboard: Keyboard): KlePlateExport {
	const name =
		keyboard.meta.name ||
		(typeof kleRaw[0] === 'object' &&
		kleRaw[0] !== null &&
		!Array.isArray(kleRaw[0]) &&
		'name' in kleRaw[0]
			? String((kleRaw[0] as { name: string }).name)
			: 'Custom layout');

	const keys: KlePlateKey[] = keyboard.keys
		.filter((k) => !k.decal && !k.ghost)
		.map((k) => ({
			label: k.labels[0] ?? '',
			x_u: k.x,
			y_u: k.y,
			width_u: k.width,
			height_u: k.height,
			rotation_deg: k.rotation_angle,
			x_mm: round(k.x * KEY_UNIT_MM),
			y_mm: round(k.y * KEY_UNIT_MM),
			width_mm: round(k.width * KEY_UNIT_MM),
			height_mm: round(k.height * KEY_UNIT_MM)
		}));

	const summaryLines = [
		`Layout: ${name}`,
		`Keys: ${keys.length}`,
		`Unit: ${KEY_UNIT_MM} mm (1u)`,
		'',
		...keys.map(
			(k) =>
				`  ${k.label}: ${k.x_mm}, ${k.y_mm} mm · ${k.width_mm}×${k.height_mm} mm${k.rotation_deg ? ` · rot ${k.rotation_deg}°` : ''}`
		)
	];

	const plate = {
		preset_name: name,
		unit_mm: KEY_UNIT_MM,
		keys
	};

	return {
		preset_name: name,
		unit_mm: KEY_UNIT_MM,
		keys,
		summary_text: summaryLines.join('\n'),
		plate_json: JSON.stringify(plate, null, 2),
		kle_raw: kleRaw
	};
}

export function klePlateToSvg(keyboard: Keyboard, unitPx = 18, gap = 2): string {
	const keys = keyboard.keys.filter((k) => !k.decal && !k.ghost);
	if (keys.length === 0) {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="32"><text x="4" y="18" fill="#928374" font-size="10">empty</text></svg>';
	}

	const maxX = Math.max(...keys.map((k) => k.x + k.width), 1);
	const maxY = Math.max(...keys.map((k) => k.y + k.height), 1);
	const w = maxX * unitPx + (maxX - 1) * gap;
	const h = maxY * unitPx + (maxY - 1) * gap;

	const rects = keys
		.map((k) => {
			const u = unitPx + gap;
			const x = k.x * u;
			const y = k.y * u;
			const rw = k.width * unitPx + (k.width - 1) * gap;
			const rh = k.height * unitPx + (k.height - 1) * gap;
			const pivotX = (k.rotation_x > 0 ? k.rotation_x : k.x + k.width / 2) * u;
			const pivotY = (k.rotation_y > 0 ? k.rotation_y : k.y + k.height / 2) * u;
			const rot = k.rotation_angle || 0;
			const label = escapeXml((k.labels[0] ?? '').split('\n')[0] || '·');
			const gOpen = rot ? `<g transform="rotate(${rot} ${pivotX} ${pivotY})">` : '<g>';
			return `${gOpen}<rect x="${x + 1}" y="${y + 1}" width="${Math.max(1, rw - 2)}" height="${Math.max(1, rh - 2)}" fill="#3c3836" stroke="#665c54" rx="2"/><text x="${x + rw / 2}" y="${y + rh / 2 + 3}" text-anchor="middle" fill="#d5c4a1" font-size="8" font-family="monospace">${label}</text></g>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${rects}</svg>`;
}

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
