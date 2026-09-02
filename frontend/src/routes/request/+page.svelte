<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import LayoutEditor from '$lib/components/LayoutEditor.svelte';
	import Button from '$lib/components/Button.svelte';
	import { initLayoutEditor } from '$lib/layout/presets';
	import type { BuildLayout } from '$lib/layout/types';
	import {
		defaultLayoutDraft,
		loadLayoutDraft,
		saveLayoutDraft
	} from '$lib/stores/build-request';
	import { t } from '$lib/i18n';

	let layout = $state<BuildLayout | null>(null);
	let ready = $state(false);

	onMount(async () => {
		await initLayoutEditor();
		const draft = loadLayoutDraft() ?? (await defaultLayoutDraft());
		layout = draft.layout;
		ready = true;
	});

	function continueToDetails() {
		if (!layout) return;
		saveLayoutDraft(layout);
		void goto('/request/details');
	}
</script>

<div class="page request-layout-page">
	<header class="page-head">
		<p class="text-dim text-xs uppercase tracking-[0.2em] mb-1">{$t('request.step1')}</p>
		<h1 class="page-title">{$t('request.designTitle')}</h1>
		<p class="page-lead">{$t('request.designLead')}</p>
	</header>

	{#if ready && layout}
		<LayoutEditor bind:layout />

		<div class="sticky-footer graybox mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
			<p class="text-sm text-muted">
				{layout.presetName} · {$t('request.keysSummary', { count: layout.keys.length, formFactor: layout.formFactor })}
			</p>
			<Button label={$t('request.continueDetails')} variant="primary" onclick={continueToDetails} />
		</div>
	{:else}
		<div class="graybox p-6 text-sm text-muted">{$t('request.loadingEditor')}</div>
	{/if}
</div>

<style>
	:global(.request-layout-page.page) {
		max-width: 1100px;
	}

	.request-layout-page {
		padding-bottom: 2rem;
	}

	.page-head {
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--gb-bg2);
		padding-bottom: 1rem;
	}

	.sticky-footer {
		position: sticky;
		bottom: 0.75rem;
		z-index: 20;
	}
</style>
