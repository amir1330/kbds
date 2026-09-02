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
	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let preferences = $state('');
	let description = $state('');
	let submitting = $state(false);
	let success = $state(false);
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
				name,
				email,
				phone: phone || undefined,
				preferences,
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
			{$t('request.requestSent', { email })}
		</div>
		<div class="mt-4">
			<Button href="/" label={$t('common.backToStore')} variant="ghost" />
		</div>
	{:else if layout}
		<div class="mb-8 grid gap-4 lg:grid-cols-[1fr_280px]">
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

			<div class="graybox p-4 text-xs text-muted leading-relaxed">
				<p class="label mb-2">{$t('request.whatWeReceive')}</p>
				<ul class="list-disc space-y-1 pl-4">
					<li>{$t('request.receive1')}</li>
					<li>{$t('request.receive2')}</li>
					<li>{$t('request.receive3')}</li>
					<li>{$t('request.receive4')}</li>
				</ul>
			</div>
		</div>

		<form class="graybox max-w-xl space-y-4 p-5" onsubmit={handleSubmit}>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="req-name">{$t('common.name')}</label>
					<input id="req-name" class="input" bind:value={name} required />
				</div>
				<div>
					<label class="label" for="req-email">{$t('common.email')}</label>
					<input id="req-email" class="input" type="email" bind:value={email} required />
				</div>
			</div>
			<div>
				<label class="label" for="req-phone">{$t('request.phoneOptional')}</label>
				<input id="req-phone" class="input" bind:value={phone} />
			</div>
			<div>
				<label class="label" for="req-prefs">{$t('request.prefsLabel')}</label>
				<input
					id="req-prefs"
					class="input"
					placeholder={$t('request.prefsPlaceholder')}
					bind:value={preferences}
				/>
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
