<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import { api } from '$lib/api/client';
	import { exportPlate, layoutToSvg } from '$lib/layout/plate-export';
	import type { BuildLayout } from '$lib/layout/types';
	import { clearLayoutDraft, loadLayoutDraft, saveLayoutDraft } from '$lib/stores/build-request';
	import { t } from '$lib/i18n';

	let layout = $state<BuildLayout | null>(null);
	let contact = $state('');
	let description = $state('');
	let submitting = $state(false);
	let success = $state(false);
	let successContact = $state('');
	let errorMsg = $state('');

	onMount(() => {
		const draft = loadLayoutDraft();
		if (!draft) {
			goto('/request');
			return;
		}
		layout = draft.layout;
	});

	const previewSvg = $derived(layout ? layoutToSvg(layout, 16, 2) : '');

	function editLayout() {
		if (layout) saveLayoutDraft(layout);
		goto('/request');
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!layout) return;
		submitting = true;
		errorMsg = '';
		const plate = exportPlate(layout);
		try {
			await api.submitBuildRequest({
				contact,
				description,
				layout: plate.layout,
				plate_spec: {
					preset_name: plate.preset_name,
					form_factor: plate.form_factor,
					unit_mm: plate.unit_mm,
					split_gap_u: plate.split_gap_u,
					split_gap_mm: plate.split_gap_mm,
					keys: plate.keys,
					summary_text: plate.summary_text,
					plate_json: plate.plate_json
				}
			});
			successContact = contact;
			success = true;
			clearLayoutDraft();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : $t('request.couldNotSend');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<header class="mb-6 border-b border-border-subtle pb-5">
		<p class="text-dim text-xs uppercase tracking-[0.2em] mb-1">{$t('request.step2')}</p>
		<h1 class="page-title">{$t('request.detailsTitle')}</h1>
		<p class="page-lead">{$t('request.detailsLead')}</p>
	</header>

	{#if success}
		<div class="graybox p-6 text-sm text-success">
			{#if successContact}
				{$t('request.requestSent', { contact: successContact })}
			{:else}
				{$t('request.requestSentFallback')}
			{/if}
		</div>
		<div class="mt-3 graybox p-4 text-xs text-muted leading-relaxed">
			<p>{$t('request.waitNotice')}</p>
			<p class="mt-1 text-dim">{$t('request.deliveryNote')}</p>
		</div>
		<div class="mt-4">
			<Button href="/" label={$t('common.backToStore')} variant="ghost" />
		</div>
	{:else if layout}
		<div class="mb-4 graybox p-4 text-xs text-muted leading-relaxed">
			<p>{$t('request.waitNotice')}</p>
			<p class="mt-1 text-dim">{$t('request.deliveryNote')}</p>
		</div>
		<div class="mb-8 grid gap-4">
			<div class="graybox p-4">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<div>
						<p class="text-sm text-bright">{layout.presetName}</p>
						<p class="text-xs text-muted">
							{$t('request.keysSummary', { count: layout.keys.length, formFactor: layout.formFactor })}
						</p>
					</div>
					<Button label={$t('request.editLayout')} variant="ghost" onclick={editLayout} />
				</div>
				<div class="preview-wrap overflow-x-auto">{@html previewSvg}</div>
			</div>
		</div>

		<form class="graybox max-w-xl space-y-4 p-5" onsubmit={handleSubmit}>
			<div>
				<label class="label" for="req-contact">{$t('request.detailsContactLabel')}</label>
				<input
					id="req-contact"
					class="input"
					placeholder={$t('request.detailsContactPlaceholder')}
					bind:value={contact}
					required
				/>
				<p class="mt-1 text-[10px] text-dim">whatsapp / telegram / email</p>
			</div>
			<div>
				<label class="label" for="req-desc">{$t('request.describeBuild')}</label>
				<textarea
					id="req-desc"
					class="input min-h-32"
					placeholder={$t('request.describePlaceholder')}
					bind:value={description}
					required
				></textarea>
			</div>
			{#if errorMsg}
				<p class="text-sm text-danger">{errorMsg}</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<Button label={$t('request.backToLayout')} variant="ghost" onclick={editLayout} />
				<Button
					label={submitting ? $t('common.sending') : $t('request.sendBuildRequest')}
					variant="primary"
					type="submit"
					disabled={submitting}
				/>
			</div>
		</form>
	{/if}
</div>

<style>
	.preview-wrap :global(svg) {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
