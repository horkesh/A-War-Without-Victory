import { useSyncExternalStore } from 'react';
import { enMessages, type MessageKey } from './messages.en';
import { bsMessages } from './messages.bs';
import { qpsMessages } from './messages.qps';

/** Player-selectable, persistable locales. English remains the default. */
export const SUPPORTED_LOCALES = ['en', 'bs'] as const;
export type PersistedLocale = (typeof SUPPORTED_LOCALES)[number];
export type QaLocale = 'qps';
export type Locale = PersistedLocale | QaLocale;
export type RuntimeLocale = Locale;
export type LegacyLocale = 'bcs';
export type LocaleInput = RuntimeLocale | LegacyLocale;

export const DEFAULT_LOCALE: PersistedLocale = 'en';
export const BOSNIAN_FORMATTING_LOCALE = 'bs-BA' as const;
export const ENGLISH_FORMATTING_LOCALE = 'en-US' as const;
export const LOCALE_STORAGE_KEY = 'awwv.locale';

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type MessageParams = Record<string, string | number>;

const dictionaries: Record<RuntimeLocale, Partial<Record<MessageKey, string>>> = {
    en: enMessages,
    bs: bsMessages,
    qps: qpsMessages,
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

export function isSupportedLocale(value: unknown): value is PersistedLocale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isQaLocale(value: unknown): value is QaLocale {
    return value === 'qps';
}

/** Resolve persistence/input values. `bcs` is accepted only for migration. */
export function resolveLocale(value: unknown): PersistedLocale {
    if (value === 'bcs') return 'bs';
    return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

export function getIntlLocale(locale: LocaleInput = getActiveLocale()): typeof BOSNIAN_FORMATTING_LOCALE | typeof ENGLISH_FORMATTING_LOCALE {
    return locale === 'bs' || locale === 'bcs' ? BOSNIAN_FORMATTING_LOCALE : ENGLISH_FORMATTING_LOCALE;
}

/** Player-facing number formatting must not inherit the host operating-system locale. */
export function formatLocalizedNumber(
    value: number,
    locale: LocaleInput = getActiveLocale(),
    options?: Intl.NumberFormatOptions,
): string {
    return new Intl.NumberFormat(getIntlLocale(locale), options).format(value);
}

/** Legacy authored JSON still uses a `bcs` localization field. */
export function getLegacyContentLocale(locale: RuntimeLocale): 'bcs' | undefined {
    return locale === 'bs' ? 'bcs' : undefined;
}

export function getLocale(storage: LocaleStorage | undefined = getBrowserStorage()): PersistedLocale {
    if (!storage) return DEFAULT_LOCALE;
    let stored: string | null;
    try {
        stored = storage.getItem(LOCALE_STORAGE_KEY);
    } catch {
        return DEFAULT_LOCALE;
    }
    const resolved = resolveLocale(stored);
    if (stored === 'bcs') {
        try {
            storage.setItem(LOCALE_STORAGE_KEY, resolved);
        } catch {
            // Migration writes are best-effort; the successfully read preference still resolves.
        }
    }
    return resolved;
}

let activeLocale: RuntimeLocale = getLocale();

export function setLocale(nextLocale: PersistedLocale | LegacyLocale, storage: LocaleStorage | undefined = getBrowserStorage()): PersistedLocale {
    const resolved = resolveLocale(nextLocale);
    activeLocale = resolved;
    if (storage) {
        try {
            storage.setItem(LOCALE_STORAGE_KEY, resolved);
        } catch {
            // Preference persistence is best-effort; the in-memory locale still updates.
        }
    }
    subscribers.forEach((notify) => notify());
    return resolved;
}

/** Activate QA pseudolocalization without writing a production preference. */
export function setQaLocale(nextLocale: QaLocale): QaLocale {
    activeLocale = nextLocale;
    subscribers.forEach((notify) => notify());
    return nextLocale;
}

export function getActiveLocale(): RuntimeLocale {
    if (activeLocale === 'qps') return activeLocale;
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

function interpolate(template: string, params: MessageParams | undefined): string {
    if (!params) return template;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
        const value = params[key];
        return value == null ? match : String(value);
    });
}

function resolveRuntimeLocale(locale: LocaleInput): RuntimeLocale {
    if (locale === 'bcs') return 'bs';
    return locale;
}

export function t(key: MessageKey, params?: MessageParams, locale: LocaleInput = getActiveLocale()): string {
    const runtimeLocale = resolveRuntimeLocale(locale);
    const template = dictionaries[runtimeLocale][key] ?? enMessages[key];
    return interpolate(template, params);
}

export function useLocale(): [RuntimeLocale, (nextLocale: PersistedLocale | LegacyLocale) => void] {
    const locale = useSyncExternalStore(subscribeLocale, getActiveLocale, () => DEFAULT_LOCALE);
    return [locale, setLocale];
}

export type { MessageKey };
