import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import { messages, type Locale, type MessageKey } from './messages';

export type { Locale, MessageKey };

export const localeOptions: Locale[] = ['en', 'ru', 'kz'];

const localeLabels: Record<Locale, MessageKey> = {
	en: 'locale.en',
	ru: 'locale.ru',
	kz: 'locale.kz'
};

export function localeLabel(code: Locale): MessageKey {
	return localeLabels[code];
}

function detectLocale(): Locale {
	if (!browser) return 'en';
	const stored = localStorage.getItem('locale');
	if (stored === 'en' || stored === 'ru' || stored === 'kz') return stored;
	const lang = navigator.language.toLowerCase();
	if (lang.startsWith('ru')) return 'ru';
	if (lang.startsWith('kk') || lang.startsWith('kz')) return 'kz';
	return 'en';
}

export const locale = writable<Locale>(detectLocale());

export function htmlLang(code: Locale): string {
	return code === 'kz' ? 'kk' : code;
}

export function setLocale(next: Locale) {
	locale.set(next);
	if (browser) {
		localStorage.setItem('locale', next);
		document.documentElement.lang = htmlLang(next);
	}
}

export function translate(
	loc: Locale,
	key: MessageKey,
	params?: Record<string, string | number>
): string {
	let str: string = messages[loc][key] ?? messages.en[key] ?? key;
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			str = str.replaceAll(`{${k}}`, String(v));
		}
	}
	return str;
}

export const t = derived(locale, ($locale) => {
	return (key: MessageKey, params?: Record<string, string | number>) =>
		translate($locale, key, params);
});

export function getLocale(): Locale {
	return get(locale);
}

const intlLocales: Record<Locale, string> = {
	en: 'en-US',
	ru: 'ru-RU',
	kz: 'kk-KZ'
};

export function formatPrice(cents: number, loc?: Locale): string {
	const code = loc ?? getLocale();
	return new Intl.NumberFormat(intlLocales[code], {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(cents / 100);
}
