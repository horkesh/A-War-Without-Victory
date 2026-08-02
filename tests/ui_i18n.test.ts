import { describe, expect, it, vi } from 'vitest';
import { bsMessages } from '../src/ui/map/i18n/messages.bs';
import { enMessages } from '../src/ui/map/i18n/messages.en';
import {
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    getActiveLocale,
    getIntlLocale,
    getLocale,
    isSupportedLocale,
    resolveLocale,
    setLocale,
    setQaLocale,
    t,
    type Locale,
} from '../src/ui/map/i18n';

describe('UI localization substrate', () => {
    it('defaults to English when no locale is provided', () => {
        expect(DEFAULT_LOCALE).toBe('en');
        expect(t('settings.title')).toBe('Settings');
    });

    it('returns Bosnian copy from the canonical bs dictionary', () => {
        expect(t('settings.title', undefined, 'bs')).toBe('Postavke');
        expect(t('settings.language.option.bs', undefined, 'bs')).toBe('Bosanski (Preview)');
    });

    it('closes the previously intentional Bosnian fallback probe', () => {
        expect(t('settings.experimentalFallbackProbe', undefined, 'bs')).toBe('Eksperimentalno');
    });

    it('interpolates message parameters in Bosnian', () => {
        expect(t('settings.language.savedNotice', { locale: 'Bosanski' }, 'bs')).toBe('Jezik sačuvan: Bosanski');
        expect(t('opsPlanning.authorize.probeName', { name: 'Sana' }, 'en')).toBe('Sana (Probe)');
        expect(t('opsPlanning.authorize.probeName', { name: 'Sana' }, 'bs')).toBe('Sana (Izviđanje)');
    });

    it('resolves unsupported locales to English and exposes canonical support only', () => {
        expect(resolveLocale('fr')).toBe('en');
        expect(resolveLocale(null)).toBe('en');
        expect(isSupportedLocale('bs')).toBe(true);
        expect(isSupportedLocale('bcs')).toBe(false);
        expect(isSupportedLocale('fr')).toBe(false);
    });

    it('persists only supported locale values', () => {
        const memoryStorage = new Map<string, string>();
        const storage = {
            getItem: (key: string) => memoryStorage.get(key) ?? null,
            setItem: (key: string, value: string) => memoryStorage.set(key, value),
            removeItem: (key: string) => memoryStorage.delete(key),
        };

        setLocale('bs', storage);
        expect(getLocale(storage)).toBe<Locale>('bs');
        expect(memoryStorage.get(LOCALE_STORAGE_KEY)).toBe('bs');

        memoryStorage.set(LOCALE_STORAGE_KEY, 'fr');
        expect(getLocale(storage)).toBe<Locale>('en');
    });

    it('migrates legacy bcs input immediately and persists only bs', () => {
        const memoryStorage = new Map<string, string>([[LOCALE_STORAGE_KEY, 'bcs']]);
        const storage = {
            getItem: (key: string) => memoryStorage.get(key) ?? null,
            setItem: (key: string, value: string) => memoryStorage.set(key, value),
            removeItem: (key: string) => memoryStorage.delete(key),
        };

        expect(getLocale(storage)).toBe<Locale>('bs');
        expect(memoryStorage.get(LOCALE_STORAGE_KEY)).toBe('bs');
        expect(resolveLocale('bcs')).toBe<Locale>('bs');
        setLocale('bcs', storage);
        expect(memoryStorage.get(LOCALE_STORAGE_KEY)).toBe('bs');
    });

    it('maps canonical Bosnian to bs-BA formatting and qps to stable English formatting', () => {
        expect(getIntlLocale('bs')).toBe('bs-BA');
        expect(getIntlLocale('bcs')).toBe('bs-BA');
        expect(getIntlLocale('en')).toBe('en-US');
        expect(getIntlLocale('qps')).toBe('en-US');
    });

    it('activates qps without overwriting the persisted player locale', () => {
        const memoryStorage = new Map<string, string>();
        const storage = {
            getItem: (key: string) => memoryStorage.get(key) ?? null,
            setItem: (key: string, value: string) => memoryStorage.set(key, value),
            removeItem: (key: string) => memoryStorage.delete(key),
        };
        vi.stubGlobal('window', { localStorage: storage });
        try {
            setLocale('bs');
            setQaLocale('qps');
            expect(getActiveLocale()).toBe('qps');
            expect(memoryStorage.get(LOCALE_STORAGE_KEY)).toBe('bs');
        } finally {
            setLocale('en', storage);
            vi.unstubAllGlobals();
        }
    });

    it('translates every English key into canonical Bosnian', () => {
        const enKeys = Object.keys(enMessages);
        const bsKeys = new Set(Object.keys(bsMessages));
        expect(enKeys.filter((key) => !bsKeys.has(key))).toEqual([]);
    });

    it('has no orphan Bosnian keys without an English counterpart', () => {
        const enKeys = new Set(Object.keys(enMessages));
        expect(Object.keys(bsMessages).filter((key) => !enKeys.has(key))).toEqual([]);
    });

    it('has no empty Bosnian or English message values', () => {
        const emptyBs = Object.entries(bsMessages)
            .filter(([, value]) => typeof value === 'string' && value.trim() === '')
            .map(([key]) => key);
        const emptyEn = Object.entries(enMessages)
            .filter(([, value]) => typeof value === 'string' && value.trim() === '')
            .map(([key]) => key);
        expect(emptyBs).toEqual([]);
        expect(emptyEn).toEqual([]);
    });

    it('describes authority recovery as political capacity, never an unconditional flat gain (#127)', () => {
        const en = t('toolbar.commandAuthority.description', undefined, 'en');
        expect(en).toBe('Authority is the Presidency resource for exceptional intervention in the command chain. It recovers from political standing and command stability.');
        expect(en).toMatch(/political standing/i);
        expect(en).not.toMatch(/\+\d/);
        expect(en).not.toMatch(/each turn|per turn/i);

        const bs = t('toolbar.commandAuthority.description', undefined, 'bs');
        expect(bs).toBe('Ovlast je predsjednicki resurs za izuzetnu intervenciju u komandni lanac. Obnavlja se iz politickog položaja i stabilnosti komande.');
        expect(bs).toMatch(/politickog položaja/i);
        expect(bs).not.toMatch(/\+\d/);
        expect(bs).not.toMatch(/po potezu/);
    });

    it('keeps Bosnian copy free of common Serbian ekavian and Croatian lexical forms', () => {
        const bsCopy = Object.values(bsMessages).join('\n').toLowerCase();
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
        for (const pattern of forbiddenPatterns) expect(bsCopy).not.toMatch(pattern);
    });

    it('keeps targeted player-facing Bosnian copy free of raw OSID terminology', () => {
        const targetedCopy = [
            t('tooltip.noBrigadesAtOsid', undefined, 'bs'),
            t('gameOver.osidsControlled', { count: 2 }, 'bs'),
            t('gameOver.osidControlled.one', { count: 1 }, 'bs'),
            t('gameOver.osidControlled.many', { count: 2 }, 'bs'),
            t('directive.targetInput.ambiguousBody', { matches: 'Brcko, Brcko polje' }, 'bs'),
        ].join('\n');
        expect(targetedCopy).not.toMatch(/\bOSID\b/i);
        expect(targetedCopy).toMatch(/polozaj|naselj|navedeni ciljevi/);
    });
});
