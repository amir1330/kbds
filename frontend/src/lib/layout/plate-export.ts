import { KEY_UNIT_MM, type BuildLayout } from './types';
import { rotationPivotU } from './geometry';

export interface PlateKey {
	label: string;
	x_u: number;
	y_u: number;
	width_u: number;
	height_u: number;
	rotation_deg: number;
	pivot_x_u?: number;
	pivot_y_u?: number;
	x_mm: number;
	y_mm: number;
	width_mm: number;
	height_mm: number;
}

export interface PlateExport {
	preset_name: string;
	form_factor: string;
	unit_mm: number;
	split_gap_u: number;
	split_gap_mm: number;
	keys: PlateKey[];
	summary_text: string;
	plate_json: string;
	layout: BuildLayout;
}

function round(n: number): number {
	return Math.round(n * 100) / 100;
}

export function exportPlate(layout: BuildLayout): PlateExport {
	const keys: PlateKey[] = layout.keys.map((k) => ({
		label: k.label,
		x_u: k.x,
		y_u: k.y,
		width_u: k.width,
		height_u: k.height,
		rotation_deg: k.rotation,
		...(k.pivotX != null ? { pivot_x_u: k.pivotX } : {}),
		...(k.pivotY != null ? { pivot_y_u: k.pivotY } : {}),
		x_mm: round(k.x * KEY_UNIT_MM),
		y_mm: round(k.y * KEY_UNIT_MM),
		width_mm: round(k.width * KEY_UNIT_MM),
		height_mm: round(k.height * KEY_UNIT_MM)
	}));

	const summaryLines = [
		`Layout: ${layout.presetName}`,
		`Form: ${layout.formFactor}`,
		`Keys: ${keys.length}`,
		`Unit: ${KEY_UNIT_MM} mm (1u)`,
		layout.formFactor === 'split' ? `Split gap: ${layout.splitGapU}u (${round(layout.splitGapU * KEY_UNIT_MM)} mm)` : '',
		'',
		...keys.map(
			(k) =>
				`  ${k.label}: ${k.x_mm}, ${k.y_mm} mm · ${k.width_mm}×${k.height_mm} mm${k.rotation_deg ? ` · rot ${k.rotation_deg}°` : ''}`
		)
	].filter(Boolean);

	const plate = {
		preset_name: layout.presetName,
		form_factor: layout.formFactor,
		unit_mm: KEY_UNIT_MM,
		split_gap_u: layout.splitGapU,
		split_gap_mm: round(layout.splitGapU * KEY_UNIT_MM),
		keys
	};

	return {
		preset_name: layout.presetName,
		form_factor: layout.formFactor,
		unit_mm: KEY_UNIT_MM,
		split_gap_u: layout.splitGapU,
		split_gap_mm: round(layout.splitGapU * KEY_UNIT_MM),
		keys,
		summary_text: summaryLines.join('\n'),
		plate_json: JSON.stringify(plate, null, 2),
		layout
	};
}

export function layoutToSvg(layout: BuildLayout, unitPx = 18, gap = 2): string {
	const keys = layout.keys;
	if (keys.length === 0) {
		return '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="32"><text x="4" y="18" fill="#928374" font-size="10">empty</text></svg>';
	}

	const maxX = Math.max(...keys.map((k) => k.x + k.width), 1);
	const maxY = Math.max(...keys.map((k) => k.y + k.height), 1);
	const w = maxX * unitPx + (maxX - 1) * gap;
	const h = maxY * unitPx + (maxY - 1) * gap;
	const u = unitPx + gap;

	const rects = keys
		.map((k) => {
			const x = k.x * u;
			const y = k.y * u;
			const rw = k.width * unitPx + (k.width - 1) * gap;
			const rh = k.height * unitPx + (k.height - 1) * gap;
			const { px, py } = rotationPivotU(k, { x, y, w: rw, h: rh }, u);
			const rot = k.rotation || 0;
			const label = escapeXml(k.label || '·');
			const gOpen = rot ? `<g transform="rotate(${rot} ${px} ${py})">` : '<g>';
			const stroke = '#665c54';
			return `${gOpen}<rect x="${x + 1}" y="${y + 1}" width="${Math.max(1, rw - 2)}" height="${Math.max(1, rh - 2)}" fill="#3c3836" stroke="${stroke}" rx="2"/><text x="${x + rw / 2}" y="${y + rh / 2 + 3}" text-anchor="middle" fill="#d5c4a1" font-size="8" font-family="monospace">${label}</text></g>`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${rects}</svg>`;
}

function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
