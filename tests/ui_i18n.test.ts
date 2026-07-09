import { describe, expect, it } from 'vitest';
import {
    bcsMessages,
} from '../src/ui/map/i18n/messages.bcs';
import { enMessages } from '../src/ui/map/i18n/messages.en';
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

// Keys that are deliberately English-only so the locale fallback path stays
// exercised. Any other EN key without a BCS translation is a parity gap.
const INTENTIONAL_EN_ONLY = new Set<string>(['settings.experimentalFallbackProbe']);

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

    it('translates every EN key into BCS (except documented fallback probes)', () => {
        const enKeys = Object.keys(enMessages);
        const bcsKeys = new Set(Object.keys(bcsMessages));
        const missing = enKeys.filter(
            (key) => !bcsKeys.has(key) && !INTENTIONAL_EN_ONLY.has(key),
        );
        expect(missing).toEqual([]);
    });

    it('has no orphan BCS keys without an English counterpart', () => {
        const enKeys = new Set(Object.keys(enMessages));
        const orphans = Object.keys(bcsMessages).filter((key) => !enKeys.has(key));
        expect(orphans).toEqual([]);
    });

    it('has no empty BCS or EN message values', () => {
        const emptyBcs = Object.entries(bcsMessages)
            .filter(([, value]) => typeof value === 'string' && value.trim() === '')
            .map(([key]) => key);
        const emptyEn = Object.entries(enMessages)
            .filter(([, value]) => typeof value === 'string' && value.trim() === '')
            .map(([key]) => key);
        expect(emptyBcs).toEqual([]);
        expect(emptyEn).toEqual([]);
    });

    it('keeps every documented intentional EN-only key absent from BCS', () => {
        for (const key of INTENTIONAL_EN_ONLY) {
            expect(bcsMessages).not.toHaveProperty(key);
            expect(enMessages).toHaveProperty(key);
        }
    });

    it('describes authority recovery as political capacity, never an unconditional flat gain (#127)', () => {
        const en = t('toolbar.commandAuthority.description', undefined, 'en');
        expect(en).toBe('Authority is the Presidency resource for exceptional intervention in the command chain. It recovers from political standing and command stability.');
        expect(en).toMatch(/political standing/i);
        expect(en).not.toMatch(/\+\d/);
        expect(en).not.toMatch(/each turn|per turn/i);

        const bcs = t('toolbar.commandAuthority.description', undefined, 'bcs');
        expect(bcs).toBe('Ovlast je predsjednicki resurs za izuzetnu intervenciju u komandni lanac. Obnavlja se iz politickog položaja i stabilnosti komande.');
        expect(bcs).toMatch(/politickog položaja/i);
        expect(bcs).not.toMatch(/\+\d/);
        expect(bcs).not.toMatch(/po potezu/);
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

    it('keeps targeted player-facing BCS copy free of raw OSID terminology', () => {
        const targetedCopy = [
            t('tooltip.noBrigadesAtOsid', undefined, 'bcs'),
            t('gameOver.osidsControlled', { count: 2 }, 'bcs'),
            t('gameOver.osidControlled.one', { count: 1 }, 'bcs'),
            t('gameOver.osidControlled.many', { count: 2 }, 'bcs'),
            t('directive.targetInput.ambiguousBody', { matches: 'Brcko, Brcko polje' }, 'bcs'),
        ].join('\n');

        expect(targetedCopy).not.toMatch(/\bOSID\b/i);
        expect(targetedCopy).toMatch(/polozaj|naselj|navedeni ciljevi/);
    });
});
