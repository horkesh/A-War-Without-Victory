import { describe, expect, it } from 'vitest';

import osidAreas from '../data/derived/operational/osid_areas.json';
import { TERRITORIAL_PACKAGES } from '../src/sim/negotiation/territorial_packages.js';
import {
    getPackageAreaPct,
    resolveOsidsForPackage,
} from '../src/sim/negotiation/package_area_resolver.js';

const AREAS = (osidAreas as unknown as { areas: Record<string, number> }).areas;

/**
 * Painted negotiation pieces name their settlements explicitly. That is stronger
 * than the legacy keyword rule but it is also brittle in a new way: a renamed or
 * merged OSID makes a package silently SHRINK instead of failing, because the
 * resolver drops ids it cannot price. These tests turn that silent shrink into a
 * red build.
 */
describe('territorial package OSID integrity', () => {
    it('every explicitly painted OSID exists in the canonical area data', () => {
        const missing: string[] = [];
        for (const pkg of TERRITORIAL_PACKAGES) {
            for (const osid of pkg.osids ?? []) {
                if (AREAS[osid] === undefined) missing.push(`${pkg.id}: ${osid}`);
            }
        }
        expect(missing).toEqual([]);
    });

    it('every package resolves to at least one OSID and a non-zero area', () => {
        for (const pkg of TERRITORIAL_PACKAGES) {
            expect(resolveOsidsForPackage(pkg).length).toBeGreaterThan(0);
            expect(getPackageAreaPct(pkg.id)).toBeGreaterThan(0);
        }
    });

    it('a package defines its extent exactly one way', () => {
        for (const pkg of TERRITORIAL_PACKAGES) {
            const hasOsids = (pkg.osids ?? []).length > 0;
            const hasKeywords = (pkg.osid_keywords ?? []).length > 0;
            // Not both — `osids` would win and the keywords would be dead weight
            // that reads as if it still governed the package's extent.
            expect(hasOsids && hasKeywords).toBe(false);
            expect(hasOsids || hasKeywords).toBe(true);
        }
    });

    it('no package lists the same OSID twice', () => {
        for (const pkg of TERRITORIAL_PACKAGES) {
            const osids = pkg.osids ?? [];
            expect(osids.length).toBe(new Set(osids).size);
        }
    });

    it('overlapping pieces share an alternative_group', () => {
        // Two pieces covering the same ground must be mutually exclusive, or a
        // single settlement gets bought twice in one negotiation. Partial overlap
        // between ADJACENT pieces is legitimate (the Drina corridor meets the
        // Goražde enclave at Slatina and Sopotnica), so only CONTAINMENT — one
        // piece wholly inside another, i.e. a minimal ask nested in a maximal one
        // — is required to be grouped.
        const ungrouped: string[] = [];
        for (const a of TERRITORIAL_PACKAGES) {
            for (const b of TERRITORIAL_PACKAGES) {
                if (a.id === b.id) continue;
                const aOsids = resolveOsidsForPackage(a);
                const bOsids = new Set(resolveOsidsForPackage(b));
                if (aOsids.length === 0 || aOsids.length >= bOsids.size) continue;
                if (!aOsids.every((o) => bOsids.has(o))) continue;
                if (!a.alternative_group || a.alternative_group !== b.alternative_group) {
                    ungrouped.push(`${a.id} is contained in ${b.id} but they are not alternatives`);
                }
            }
        }
        expect(ungrouped).toEqual([]);
    });

    it('grouped alternatives actually overlap', () => {
        // An alternative_group that shares no ground is a modelling error the
        // other direction: two unrelated pieces made needlessly exclusive.
        const groups = new Map<string, string[]>();
        for (const pkg of TERRITORIAL_PACKAGES) {
            if (!pkg.alternative_group) continue;
            const list = groups.get(pkg.alternative_group) ?? [];
            list.push(pkg.id);
            groups.set(pkg.alternative_group, list);
        }
        expect(groups.size).toBeGreaterThan(0);
        for (const [group, ids] of groups) {
            expect(ids.length, `group ${group} needs 2+ members`).toBeGreaterThan(1);
            const sets = ids.map((id) => new Set(resolveOsidsForPackage(
                TERRITORIAL_PACKAGES.find((p) => p.id === id)!,
            )));
            for (let i = 0; i < sets.length; i += 1) {
                const shares = sets.some((other, j) =>
                    j !== i && [...sets[i]].some((o) => other.has(o)));
                expect(shares, `${ids[i]} shares no ground with its group`).toBe(true);
            }
        }
    });

    it('small pieces keep a non-zero price', () => {
        // One-decimal rounding priced the 91.1 km² airport strip at 0.2% and
        // anything under 0.05% at 0.0% — free to demand. Three decimals keep the
        // deliberately small pieces payable.
        expect(getPackageAreaPct('sarajevo_corridor')).toBeCloseTo(0.177, 3);
        expect(getPackageAreaPct('bosanski_novi')).toBeCloseTo(0.23, 3);
    });
});
