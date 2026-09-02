<script lang="ts">
	import { t } from '$lib/i18n';
</script>

<footer class="mt-auto border-t border-border-subtle">
	<div class="mx-auto flex max-w-page flex-col gap-3 px-4 py-5 text-[10px] text-dim md:flex-row md:items-center md:justify-between md:px-6">
		<p class="uppercase tracking-[0.15em]">{$t('footer.tagline')}</p>
		<nav class="flex flex-wrap gap-4 uppercase tracking-wide" aria-label={$t('nav.footer')}>
			<a href="/request" class="text-muted no-underline hover:text-bright">
				<span class="text-dim">[</span>{$t('nav.requestBuild')}<span class="text-dim">]</span>
			</a>
			<a href="/contact" class="text-muted no-underline hover:text-bright">
				<span class="text-dim">[</span>{$t('nav.contact')}<span class="text-dim">]</span>
			</a>
		</nav>
	</div>
</footer>
