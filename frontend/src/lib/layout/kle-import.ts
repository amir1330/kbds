import { deserialize } from 'kle-serial-alt';
import { finalizeLayoutKeys } from './mirror';
import { uid, type BuildLayout, type FormFactor } from './types';

export function layoutFromKleRaw(
	raw: unknown[],
	formFactor: FormFactor = 'split'
): BuildLayout {
	const kb = deserialize(raw);
	const header = raw[0];
	const presetName =
		kb.meta.name ||
		(typeof header === 'object' && header !== null && !Array.isArray(header) && 'name' in header
			? String((header as { name: string }).name)
			: 'Custom');

	const keys = kb.keys
		.filter((k) => !k.decal && !k.ghost)
		.map((k) => ({
			id: uid(),
			label: (k.labels[0] ?? '·').split('\n')[0] || '·',
			x: k.x,
			y: k.y,
			width: k.width,
			height: k.height,
			rotation: k.rotation_angle || 0,
			...(k.rotation_x !== 0 ? { pivotX: k.rotation_x } : {}),
			...(k.rotation_y !== 0 ? { pivotY: k.rotation_y } : {})
		}));

	return finalizeLayoutKeys({
		formFactor,
		presetName,
		splitGapU: formFactor === 'split' ? 3 : 0,
		mirrorEdits: formFactor === 'split',
		keys
	});
}
