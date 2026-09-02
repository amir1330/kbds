<script lang="ts">
	import { locale, localeOptions, setLocale, type Locale } from '$lib/i18n';
</script>

<div class="locale-wrapper">
	<div class="select-container">
		<span class="bracket">[</span>
		<select 
			class="locale-select" 
			bind:value={$locale} 
			onchange={(e) => setLocale(e.currentTarget.value as Locale)}
		>
			{#each localeOptions as code (code)}
				<option value={code}>
					{code === 'en' ? 'EN' : code === 'ru' ? 'RU' : 'KZ'}
				</option>
			{/each}
		</select>
		<span class="bracket">]</span>
	</div>
</div>

<style>
	.locale-wrapper {
		display: flex;
		align-items: center;
	}

	.select-container {
		display: inline-flex;
		align-items: center;
		position: relative;
	}

	.locale-select {
		appearance: none;
		background: transparent;
		border: none;
		color: var(--gb-fg3);
		font-size: 0.65rem;
		text-transform: uppercase;
		padding: 0;
		cursor: pointer;
		outline: none;
		font-family: inherit;
	}

	.locale-select:hover {
		color: var(--gb-fg1);
	}

	.bracket {
		color: var(--gb-gray);
		font-size: 0.65rem;
		pointer-events: none;
		user-select: none;
	}
</style>
