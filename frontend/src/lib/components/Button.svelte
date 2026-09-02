<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		variant?: 'default' | 'primary' | 'ghost';
		href?: string;
		type?: 'button' | 'submit';
		disabled?: boolean;
		class?: string;
		download?: boolean | string;
		target?: string;
		rel?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		label,
		variant = 'default',
		href,
		type = 'button',
		disabled = false,
		class: className = '',
		download,
		target,
		rel,
		onclick,
		children
	}: Props = $props();

	const classes = $derived(`btn btn-${variant} ${className}`.trim());
</script>

{#if href}
	<a {href} class={classes} {download} {target} {rel}>
		<span class="btn-bracket">[</span>
		<span class="px-1">{label}</span>
		<span class="btn-bracket">]</span>
		{@render children?.()}
	</a>
{:else}
	<button {type} class={classes} {disabled} {onclick}>
		<span class="btn-bracket">[</span>
		<span class="px-1">{label}</span>
		<span class="btn-bracket">]</span>
		{@render children?.()}
	</button>
{/if}
