import { describe, expect, it } from 'vitest';

import { enMessages } from '../src/ui/map/i18n/messages.en.js';
import { qpsMessages } from '../src/ui/map/i18n/messages.qps.js';
import {
    buildPseudolocale,
    pseudolocalizeMessage,
    serializePseudolocaleModule,
} from '../tools/i18n/build_pseudolocale.js';

describe('deterministic qps pseudolocalization', () => {
    it('adds delimiters and approximately forty percent expansion', () => {
        const source = 'Review the strategic situation before advancing this weekly command cycle.';
        const rendered = pseudolocalizeMessage(source);
        const ratio = rendered.length / source.length;

        expect(rendered.startsWith('[[')).toBe(true);
        expect(rendered.endsWith(']]')).toBe(true);
        expect(ratio).toBeGreaterThanOrEqual(1.35);
        expect(ratio).toBeLessThanOrEqual(1.55);
    });

    it('preserves interpolation tokens markup entities and printf tokens byte-for-byte', () => {
        const source = '<strong>{count}</strong> units &amp; {faction} at %s';
        const rendered = pseudolocalizeMessage(source);

        for (const token of ['<strong>', '</strong>', '{count}', '&amp;', '{faction}', '%s']) {
            expect(rendered).toContain(token);
            expect(rendered.split(token)).toHaveLength(2);
        }
    });

    it('is stable and covers every English key without unsupported glyphs', () => {
        const first = buildPseudolocale(enMessages);
        const second = buildPseudolocale(enMessages);
        const sourceGlyphs = new Set(Object.values(enMessages).join(''));
        const introducedGlyphs = new Set('čćšžđČĆŠŽĐ');

        expect(first).toEqual(second);
        expect(Object.keys(first)).toEqual(Object.keys(enMessages).sort((a, b) => a < b ? -1 : a > b ? 1 : 0));
        expect(Object.keys(qpsMessages).sort((a, b) => a < b ? -1 : a > b ? 1 : 0)).toEqual(Object.keys(first));
        expect(Object.values(first).every((message) => [...message].every((character) => (
            (character >= ' ' && character <= '~')
            || sourceGlyphs.has(character)
            || introducedGlyphs.has(character)
        )))).toBe(true);
        const firstModule = serializePseudolocaleModule(enMessages);
        const secondModule = serializePseudolocaleModule(enMessages);
        expect(firstModule).toBe(secondModule);
        expect(firstModule).toContain(JSON.stringify(first[Object.keys(first)[0]!]));
        expect(firstModule).not.toMatch(/generated_at|timestamp|[A-Z]:\\|\/tmp\//i);
    });
});
