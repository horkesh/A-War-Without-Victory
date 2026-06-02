import { describe, expect, it } from 'vitest';
import {
    bcsMessages,
} from '../src/ui/map/i18n/messages.bcs';
import {
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    getLocale,
    isSupportedLocale,
    resolveLocale,
    setLocale,
    t,
    type Locale,
} from '../src/ui/map/i18n';

describe('UI localization substrate', () => {
    it('defaults to English when no locale is provided', () => {
        expect(DEFAULT_LOCALE).toBe('en');
        expect(t('settings.title')).toBe('Settings');
    });

    it('returns BCS copy for first-batch keys', () => {
        expect(t('settings.title', undefined, 'bcs')).toBe('Postavke');
        expect(t('settings.language.option.bcs', undefined, 'bcs')).toBe('BCS');
    });

    it('falls back to English when a locale dictionary is missing a key', () => {
        expect(t('settings.experimentalFallbackProbe', undefined, 'bcs')).toBe('Experimental');
    });

    it('interpolates message parameters after locale fallback', () => {
        expect(t('settings.language.savedNotice', { locale: 'BCS' }, 'bcs')).toBe('Jezik sačuvan: BCS');
    });

    it('resolves unsupported locales to English', () => {
        expect(resolveLocale('fr')).toBe('en');
        expect(resolveLocale(null)).toBe('en');
        expect(isSupportedLocale('bcs')).toBe(true);
        expect(isSupportedLocale('fr')).toBe(false);
    });

    it('persists only supported locale values', () => {
        const memoryStorage = new Map<string, string>();
        const storage = {
            getItem: (key: string) => memoryStorage.get(key) ?? null,
            setItem: (key: string, value: string) => memoryStorage.set(key, value),
            removeItem: (key: string) => memoryStorage.delete(key),
        };

        setLocale('bcs', storage);
        expect(getLocale(storage)).toBe<Locale>('bcs');
        expect(memoryStorage.get(LOCALE_STORAGE_KEY)).toBe('bcs');

        memoryStorage.set(LOCALE_STORAGE_KEY, 'fr');
        expect(getLocale(storage)).toBe<Locale>('en');
    });

    it('keeps BCS copy free of common Serbian ekavian and Croatian lexical forms', () => {
        const bcsCopy = Object.values(bcsMessages).join('\n').toLowerCase();
        const forbiddenPatterns = [
            /\btjed/,
            /\bpovij/,
            /\bstozer/,
            /\bcasnik/,
            /\bzapov/,
            /\bopskr/,
            /\bsustav/,
            /\bvreme\b/,
            /\bsledec/,
            /\bprocena/,
            /\bopsta\b/,
            /\bopstina\b/,
        ];

        for (const pattern of forbiddenPatterns) {
            expect(bcsCopy).not.toMatch(pattern);
        }
    });
});
