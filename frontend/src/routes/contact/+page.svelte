<script lang="ts">
	import { api } from '$lib/api/client';
	import Button from '$lib/components/Button.svelte';
	import { t } from '$lib/i18n';

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let submitting = $state(false);
	let success = $state(false);
	let errorMsg = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		submitting = true;
		errorMsg = '';
		try {
			await api.submitContact({ name, email, message });
			success = true;
			name = '';
			email = '';
			message = '';
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : $t('contact.failed');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page">
	<header class="mb-8 border-b border-border-subtle pb-6">
		<h1 class="page-title">{$t('contact.title')}</h1>
		<p class="page-lead">{$t('contact.lead')}</p>
	</header>

	{#if success}
		<div class="graybox mb-6 p-4 text-xs text-success">{$t('contact.success')}</div>
	{/if}

	<form class="graybox max-w-lg space-y-4 p-5" onsubmit={handleSubmit}>
		<div>
			<label class="label" for="name">{$t('common.name')}</label>
			<input id="name" class="input" bind:value={name} required />
		</div>
		<div>
			<label class="label" for="email">{$t('common.email')}</label>
			<input id="email" class="input" type="email" bind:value={email} required />
		</div>
		<div>
			<label class="label" for="message">{$t('common.message')}</label>
			<textarea id="message" class="input min-h-32" bind:value={message} required></textarea>
		</div>
		{#if errorMsg}
			<p class="text-xs text-danger">{errorMsg}</p>
		{/if}
		<Button
			label={submitting ? $t('common.sending') : $t('contact.sendMessage')}
			variant="primary"
			type="submit"
			disabled={submitting}
		/>
	</form>
</div>
