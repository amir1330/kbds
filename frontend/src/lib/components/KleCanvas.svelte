<script lang="ts">
	import type { KleLayout } from '$lib/kle/parser';

	interface Props {
		layout: KleLayout;
		unitSize?: number;
		gap?: number;
		editable?: boolean;
		onKeyClick?: (index: number, label: string) => void;
	}

	let {
		layout,
		unitSize = 48,
		gap = 3,
		editable = false,
		onKeyClick
	}: Props = $props();

	const KEY_FILL = '#3c3836';
	const KEY_STROKE = '#665c54';
	const KEY_TEXT = '#d5c4a1';

	const svgWidth = $derived(layout.width * unitSize + (layout.width - 1) * gap);
	const svgHeight = $derived(layout.height * unitSize + (layout.height - 1) * gap);

	function keyX(k: KleLayout['keys'][0]) {
		return k.x * (unitSize + gap);
	}

	function keyY(k: KleLayout['keys'][0]) {
		return k.y * (unitSize + gap);
	}

	function keyWidth(k: KleLayout['keys'][0]) {
		return k.width * unitSize + (k.width - 1) * gap;
	}

	function keyHeight(k: KleLayout['keys'][0]) {
		return k.height * unitSize + (k.height - 1) * gap;
	}
</script>

<svg
	viewBox="0 0 {svgWidth} {svgHeight}"
	class="max-w-full"
	role="img"
	aria-label="Keyboard layout"
>
	{#each layout.keys as key, index (index)}
		<g
			transform="rotate({key.rotation}, {keyX(key) + keyWidth(key) / 2}, {keyY(key) +
				keyHeight(key) / 2})"
		>
			{#if editable}
				<foreignObject
					x={keyX(key)}
					y={keyY(key)}
					width={keyWidth(key)}
					height={keyHeight(key)}
				>
					<button
						type="button"
						class="kle-key"
						onclick={() => onKeyClick?.(index, key.label)}
					>
						{key.label}
					</button>
				</foreignObject>
			{:else}
				<rect
					x={keyX(key)}
					y={keyY(key)}
					width={keyWidth(key)}
					height={keyHeight(key)}
					fill={KEY_FILL}
					stroke={KEY_STROKE}
					stroke-width="1"
				/>
				<text
					x={keyX(key) + keyWidth(key) / 2}
					y={keyY(key) + keyHeight(key) / 2}
					text-anchor="middle"
					dominant-baseline="central"
					fill={KEY_TEXT}
					font-size="10"
					font-family="JetBrains Mono, monospace"
					pointer-events="none"
				>
					{key.label}
				</text>
			{/if}
		</g>
	{/each}
</svg>

<style>
	.kle-key {
		width: 100%;
		height: 100%;
		padding: 0;
		border: 1px solid #665c54;
		background: #3c3836;
		color: #d5c4a1;
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s, color 0.1s;
	}

	.kle-key:hover {
		background: #504945;
		border-color: #fabd2f;
		color: #fbf1c7;
	}
</style>
