<script lang="ts">
	import { GRID_MAJOR_U, snapKeyPosition, overlappingKeyIds } from '$lib/layout/grid';
	import { rotationPivotPx } from '$lib/layout/geometry';
	import type { LayoutKey } from '$lib/layout/types';

	interface Props {
		keys: LayoutKey[];
		selectedId: string | null;
		splitAxisU?: number | null;
		snapStepU?: number;
		mirrorEdits?: boolean;
		canDrag?: (key: LayoutKey) => boolean;
		unitPx?: number;
		gap?: number;
		showGrid?: boolean;
		onSelect: (id: string) => void;
		onMove: (id: string, x: number, y: number) => void;
	}

	let {
		keys,
		selectedId,
		splitAxisU = null,
		snapStepU = 0.25,
		mirrorEdits = false,
		canDrag = () => true,
		unitPx = 44,
		gap = 4,
		showGrid = true,
		onSelect,
		onMove
	}: Props = $props();

	const u = $derived(unitPx + gap);
	const pad = 16;

	const bounds = $derived(() => {
		if (keys.length === 0) return { maxX: 10, maxY: 6 };
		return {
			maxX: Math.max(...keys.map((k) => k.x + k.width), 4) + 0.25,
			maxY: Math.max(...keys.map((k) => k.y + k.height), 3) + 0.25
		};
	});

	const overlapIds = $derived(overlappingKeyIds(keys));

	const minorCols = $derived(Math.ceil(bounds().maxX / snapStepU));
	const minorRows = $derived(Math.ceil(bounds().maxY / snapStepU));
	const majorCols = $derived(Math.ceil(bounds().maxX));
	const majorRows = $derived(Math.ceil(bounds().maxY));

	const svgW = $derived(bounds().maxX * u + pad * 2);
	const svgH = $derived(bounds().maxY * u + pad * 2);

	let dragging: {
		id: string;
		startPxX: number;
		startPxY: number;
		keyX: number;
		keyY: number;
	} | null = $state(null);

	function keyRect(k: LayoutKey) {
		return {
			x: pad + k.x * u,
			y: pad + k.y * u,
			w: k.width * unitPx + (k.width - 1) * gap,
			h: k.height * unitPx + (k.height - 1) * gap
		};
	}

	function snapDragPosition(clientX: number, clientY: number) {
		const dx = (clientX - dragging!.startPxX) / u;
		const dy = (clientY - dragging!.startPxY) / u;
		return snapKeyPosition(dragging!.keyX + dx, dragging!.keyY + dy, snapStepU);
	}

	function onWindowMove(e: PointerEvent) {
		if (!dragging) return;
		const { x, y } = snapDragPosition(e.clientX, e.clientY);
		onMove(dragging.id, x, y);
	}

	function endDrag(e: PointerEvent) {
		if (!dragging) return;
		const { x, y } = snapDragPosition(e.clientX, e.clientY);
		onMove(dragging.id, x, y);
		dragging = null;
		window.removeEventListener('pointermove', onWindowMove);
		window.removeEventListener('pointerup', endDrag);
		window.removeEventListener('pointercancel', endDrag);
	}

	function pointerDown(e: PointerEvent, key: LayoutKey) {
		e.stopPropagation();
		e.preventDefault();
		onSelect(key.id);
		if (!canDrag(key)) return;

		dragging = {
			id: key.id,
			startPxX: e.clientX,
			startPxY: e.clientY,
			keyX: key.x,
			keyY: key.y
		};
		window.addEventListener('pointermove', onWindowMove);
		window.addEventListener('pointerup', endDrag);
		window.addEventListener('pointercancel', endDrag);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="canvas-shell" role="presentation">
	<svg
		viewBox="0 0 {svgW} {svgH}"
		preserveAspectRatio="xMinYMin meet"
		class="layout-svg"
		role="img"
		aria-label="Keyboard layout canvas"
	>
		{#if showGrid}
			<g class="grid-minor" aria-hidden="true">
				{#each Array(minorCols + 1) as _, col}
					{@const isMajor = col % (GRID_MAJOR_U / snapStepU) === 0}
					{#if !isMajor}
						<line
							x1={pad + col * snapStepU * u}
							y1={pad}
							x2={pad + col * snapStepU * u}
							y2={svgH - pad}
						/>
					{/if}
				{/each}
				{#each Array(minorRows + 1) as _, row}
					{@const isMajor = row % (GRID_MAJOR_U / snapStepU) === 0}
					{#if !isMajor}
						<line
							x1={pad}
							y1={pad + row * snapStepU * u}
							x2={svgW - pad}
							y2={pad + row * snapStepU * u}
						/>
					{/if}
				{/each}
			</g>
			<g class="grid-major" aria-hidden="true">
				{#each Array(majorCols) as _, col}
					<line x1={pad + col * u} y1={pad} x2={pad + col * u} y2={svgH - pad} />
				{/each}
				{#each Array(majorRows) as _, row}
					<line x1={pad} y1={pad + row * u} x2={svgW - pad} y2={pad + row * u} />
				{/each}
			</g>
		{/if}

		{#if splitAxisU != null}
			<line
				x1={pad + splitAxisU * u}
				y1={pad}
				x2={pad + splitAxisU * u}
				y2={svgH - pad}
				class="split-axis"
				stroke-dasharray="4 4"
				aria-hidden="true"
			/>
		{/if}

		{#each keys as key (key.id)}
			{@const r = keyRect(key)}
			{@const selected = key.id === selectedId}
			{@const overlapped = overlapIds.has(key.id)}
			{@const mirrored = !!key.mirrorOf}
			{@const locked = mirrorEdits && !canDrag(key)}
			{@const pivot = rotationPivotPx(key, r, u, pad)}
			<g
				transform={key.rotation
					? `rotate(${key.rotation} ${pivot.px} ${pivot.py})`
					: undefined}
				class="key-group"
				class:selected
				class:overlapped
				class:mirrored
				class:locked
				onpointerdown={(e) => pointerDown(e, key)}
				role="button"
				tabindex="0"
				aria-label="Key {key.label}"
				aria-pressed={selected}
			>
				<rect
					x={r.x}
					y={r.y}
					width={r.w}
					height={r.h}
					class="key-rect"
					class:selected
					class:overlapped
				/>
				<text x={r.x + r.w / 2} y={r.y + r.h / 2 + 4} text-anchor="middle" class="key-label">
					{key.label}
				</text>
			</g>
		{/each}
	</svg>
</div>

<style>
	.canvas-shell {
		overflow: auto;
		min-height: 320px;
		max-height: min(70vh, 640px);
		padding: 0.75rem;
		background: var(--gb-bg0-h);
		border: 1px solid var(--gb-bg2);
		cursor: default;
		touch-action: none;
	}

	.layout-svg {
		display: block;
		width: 100%;
		max-width: 100%;
		height: auto;
	}

	.grid-minor :global(line) {
		stroke: var(--gb-bg2);
		stroke-width: 1;
	}

	.grid-major :global(line) {
		stroke: var(--gb-bg3);
		stroke-width: 1;
	}

	.split-axis {
		stroke: var(--gb-blue);
		stroke-width: 1;
		opacity: 0.45;
	}

	.key-group {
		cursor: grab;
	}

	.key-group:active {
		cursor: grabbing;
	}

	.key-rect {
		fill: var(--gb-bg1);
		stroke: var(--gb-bg3);
		stroke-width: 1;
	}

	.key-group:hover .key-rect {
		fill: var(--gb-bg2);
		stroke: var(--gb-gray);
	}

	.key-rect.selected {
		fill: var(--gb-bg2);
		stroke: var(--gb-yellow);
		stroke-width: 2;
	}

	.key-rect.overlapped:not(.selected) {
		stroke: var(--gb-orange);
	}

	.key-group.mirrored:not(.selected) .key-rect {
		stroke: var(--gb-aqua);
		stroke-opacity: 0.55;
	}

	.key-group.locked {
		cursor: default;
	}

	.key-group.locked .key-rect {
		opacity: 0.72;
	}

	.key-label {
		fill: var(--gb-fg2);
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		pointer-events: none;
		user-select: none;
	}

	.key-group.selected .key-label {
		fill: var(--gb-fg0);
	}
</style>
