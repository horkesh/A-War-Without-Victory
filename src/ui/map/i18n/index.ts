import { useSyncExternalStore } from 'react';
import { enMessages, type MessageKey } from './messages.en';
import { bcsMessages } from './messages.bcs';
import { corpsNameKey, isBcsCase, renamedCorpsIdForSavedName, resolveBcsCase } from './bcsCases';

export const SUPPORTED_LOCALES = ['en', 'bcs'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'awwv.locale';

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type MessageParams = Record<string, string | number>;

const dictionaries: Record<Locale, Partial<Record<MessageKey, string>>> = {
    en: enMessages,
    bcs: bcsMessages,
};

const subscribers = new Set<() => void>();

function getBrowserStorage(): LocaleStorage | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

export function isSupportedLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
    return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLocale(storage: LocaleStorage | undefined = getBrowserStorage()): Locale {
    if (!storage) return DEFAULT_LOCALE;
    try {
        return resolveLocale(storage.getItem(LOCALE_STORAGE_KEY));
    } catch {
        return DEFAULT_LOCALE;
    }
}

let activeLocale: Locale = getLocale();

export function setLocale(nextLocale: Locale, storage: LocaleStorage | undefined = getBrowserStorage()): Locale {
    activeLocale = resolveLocale(nextLocale);
    if (storage) {
        try {
            storage.setItem(LOCALE_STORAGE_KEY, activeLocale);
        } catch {
            // Preference persistence is best-effort; the in-memory locale still updates.
        }
    }
    subscribers.forEach((notify) => notify());
    return activeLocale;
}

export function getActiveLocale(): Locale {
    const storage = getBrowserStorage();
    if (!storage) return activeLocale;
    const storedLocale = getLocale(storage);
    activeLocale = storedLocale === activeLocale ? activeLocale : storedLocale;
    return activeLocale;
}

export function subscribeLocale(listener: () => void): () => void {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
}

/**
 * `{name}` interpolates a parameter as passed. `{name:gen}` (BCS templates) also
 * asks for a grammatical case: a corps name or a registered fallback phrase is
 * declined (see ./bcsCases.ts). The case suffix is ignored outside BCS.
 */
function interpolate(template: string, params: MessageParams | undefined, locale: Locale): string {
    if (!params) return template;
    return template.replace(/\{([a-zA-Z0-9_]+)(?::([a-z]+))?\}/g, (match, key: string, grammaticalCase?: string) => {
        const value = params[key];
        if (value == null) return match;
        // A renamed corps passed by its saved data name shows its current label.
        const renamedId = renamedCorpsIdForSavedName(String(value));
        const text = renamedId
            ? dictionaries[locale][corpsNameKey(renamedId)] ?? enMessages[corpsNameKey(renamedId)]
            : String(value);
        return locale === 'bcs' && isBcsCase(grammaticalCase) ? resolveBcsCase(text, grammaticalCase) : text;
    });
}

export function t(key: MessageKey, params?: MessageParams, locale: Locale = getActiveLocale()): string {
    const template = dictionaries[locale][key] ?? enMessages[key];
    return interpolate(template, params, locale);
}

export function useLocale(): [Locale, (nextLocale: Locale) => void] {
    const locale = useSyncExternalStore(subscribeLocale, getActiveLocale, () => DEFAULT_LOCALE);
    return [locale, setLocale];
}

export type { MessageKey };
export type { BcsCase } from './bcsCases';
