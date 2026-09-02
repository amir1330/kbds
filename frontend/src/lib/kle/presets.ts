export interface KlePreset {
	id: string;
	label: string;
	description: string;
	file: string;
}

export const KLE_PRESETS: KlePreset[] = [
	{ id: 'corne', label: 'Corne', description: 'c0psrul3 KLE · crkbd 3×6+3', file: 'corne.json' },
	{ id: 'sofle', label: 'Sofle', description: 'JosefAdamcik KLE · plate layer', file: 'sofle.json' },
	{ id: 'lily58', label: 'Lily58', description: 'bytesoverflow KLE · 58-key', file: 'lily58.json' },
	{ id: 'ferris', label: 'Ferris', description: 'QMK ferris 3×5+2', file: 'ferris.json' },
	{ id: '60-ansi', label: '60% ANSI', description: 'Standard unibody', file: '60-ansi.json' },
	{ id: 'blank-split', label: 'Blank split', description: 'Empty staggered split', file: 'blank-split.json' }
];

export async function fetchPresetRaw(file: string): Promise<unknown[]> {
	const res = await fetch(`/kle-presets/${file}`);
	if (!res.ok) throw new Error(`Could not load preset ${file}`);
	return res.json();
}
