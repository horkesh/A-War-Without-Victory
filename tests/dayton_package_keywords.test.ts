/**
 * Fixed Dayton packages take only cells in their own municipalities (RD-PACKAGE-KEYWORD-MATCH,
 * 2026-11-07). Substring matching used to let `ilidza`/`hadzici` (Sarajevo suburbs) take
 * villages of those names in Sanski Most and Ključ, and `travnik` take all of Novi Travnik.
 */
import { describe, expect, it } from 'vitest';

import { TERRITORIAL_PACKAGES } from '../src/sim/negotiation/territorial_packages.js';
import { getPackageAreaPct, resolveOsidsForKeywords } from '../src/sim/negotiation/package_area_resolver.js';

const munsOf = (keywords: readonly string[]) =>
    [...new Set(resolveOsidsForKeywords(keywords).map((o) => o.split(':')[1]))].sort();

describe('fixed Dayton package cells', () => {
    it('each package covers exactly its intended municipalities', () => {
        const byId = Object.fromEntries(TERRITORIAL_PACKAGES.map((p) => [p.id, munsOf(p.osid_keywords)]));
        expect(byId).toEqual({
            gorazde_corridor: ['foca', 'gorazde', 'visegrad'],
            brcko_district: ['brcko'],
            posavina_pocket: ['bosanski_samac', 'modrica', 'odzak', 'orasje'],
            sarajevo_suburbs: ['hadzici', 'ilidza', 'ilijas', 'vogosca'],
            western_bosnia: ['bihac', 'bosanska_krupa', 'bosanski_petrovac', 'kljuc', 'sanski_most'],
            mostar: ['mostar'],
            central_bosnia: ['busovaca', 'kakanj', 'travnik', 'vitez', 'zenica'],
            // Žepa lies in Rogatica municipality: a settlement keyword, matched by name.
            srebrenica_area: ['bratunac', 'rogatica', 'srebrenica'],
        });
    });

    it('a settlement keyword matches by name, not inside other names', () => {
        expect(resolveOsidsForKeywords(['zepa'])).toEqual(['op:rogatica:zepa_2']);
        const suburbs = resolveOsidsForKeywords(['ilidza', 'hadzici']);
        expect(suburbs).not.toContain('op:sanski_most:ilidza_2');
        expect(suburbs).not.toContain('op:kljuc:hadzici');
        expect(resolveOsidsForKeywords(['travnik']).some((o) => o.startsWith('op:novi_travnik:'))).toBe(false);
    });

    it('every keyword matches something', () => {
        for (const pkg of TERRITORIAL_PACKAGES) {
            for (const kw of pkg.osid_keywords) {
                expect(resolveOsidsForKeywords([kw]).length, `${pkg.id}:${kw}`).toBeGreaterThan(0);
            }
        }
    });

    it('package areas after the fix', () => {
        expect(getPackageAreaPct('sarajevo_suburbs')).toBe(1.6);
        expect(getPackageAreaPct('central_bosnia')).toBe(3.6);
    });
});
