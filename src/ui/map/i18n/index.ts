import { useSyncExternalStore } from 'react';
import { enMessages, type MessageKey } from './messages.en';
import { bcsMessages } from './messages.bcs';

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
    const storedLocale = getLocale();
    activeLocale = storedLocale === activeLocale ? activeLocale : storedLocale;
    return activeLocale;
}

export function subscribeLocale(listener: () => void): () => void {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
}

function interpolate(template: string, params: MessageParams | undefined): string {
    if (!params) return template;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
        const value = params[key];
        return value == null ? match : String(value);
    });
}

export function t(key: MessageKey, params?: MessageParams, locale: Locale = getActiveLocale()): string {
    const template = dictionaries[locale][key] ?? enMessages[key];
    return interpolate(template, params);
}

export function useLocale(): [Locale, (nextLocale: Locale) => void] {
    const locale = useSyncExternalStore(subscribeLocale, getActiveLocale, () => DEFAULT_LOCALE);
    return [locale, setLocale];
}

export type { MessageKey };
