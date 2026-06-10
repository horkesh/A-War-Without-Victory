/**
 * Collapse Phase IV-b D1 — unit tests for computePressureExposureByEntityOsid
 * (scope doc §A.3 Option 2 + M1 adapter; NOT yet wired into Phase 3C — that is D2).
 *
 * Spec: docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md
 * §6 review: docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md
 *
 * Covers: empty-topology → empty map; exact M1 half-split values on a known topology;
 * determinism (repeat invocation + permuted-input-order invariance); and the §6
 * Condition-1 expectation that protected enclave OSIDs DO appear in exposure output
 * (guard-by-exclusion happens at the Phase 3D write, not here).
 *
 * Deterministic: pure in-memory fixtures; no RNG/clock/fs.
 */
import { describe, it, expect } from 'vitest';
import { computePressureExposureByEntityOsid } from '../src/sim/pressure/pressure_exposure.js';
import { getEnclaveDefForOsid } from '../src/sim/combat/enclave_resilience.js';
import type { GameState } from '../src/state/game_state.js';

interface EdgeFixture {
    edge_id: string;
    a: string;
    b: string;
    side_a: string | null;
    side_b: string | null;
}

function edge(a: string, b: string): EdgeFixture {
    return { edge_id: `${a}__${b}`, a, b, side_a: 'RBiH', side_b: 'RS' };
}

function stateWithOsidEdges(edges: EdgeFixture[] | undefined): GameState {
    return { military: { war_front_edges_osid: edges } } as unknown as GameState;
}

/** Sorted [key, value] entries for stable comparison. */
function sortedEntries(m: Map<string, number>): Array<[string, number]> {
    return [...m.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}

describe('computePressureExposureByEntityOsid (IV-b D1 adapter, M1 uniform magnitude)', () => {
    it('empty / missing war_front_edges_osid → empty exposure map', () => {
        expect(computePressureExposureByEntityOsid(stateWithOsidEdges([])).size).toBe(0);
        expect(computePressureExposureByEntityOsid(stateWithOsidEdges(undefined)).size).toBe(0);
        expect(computePressureExposureByEntityOsid({ military: {} } as unknown as GameState).size).toBe(0);
    });

    it('known topology → exact M1 half-split values (0.5 per endpoint per edge)', () => {
        // x touches two hostile fronts (y, z); y and z touch one each.
        const x = 'op:kljuc:kljuc_2';
        const y = 'op:kljuc:sanica_2';
        const z = 'op:kljuc:krasulje_2';
        const exposure = computePressureExposureByEntityOsid(
            stateWithOsidEdges([edge(x, y), edge(x, z)])
        );
        expect(exposure.get(x)).toBe(1.0); // 0.5 + 0.5 — the besieged-pocket signal
        expect(exposure.get(y)).toBe(0.5);
        expect(exposure.get(z)).toBe(0.5);
        expect(exposure.size).toBe(3);
    });

    it('malformed edge_id entries are skipped, not attributed', () => {
        const bad: EdgeFixture[] = [
            { edge_id: 'no-separator', a: 'no', b: 'separator', side_a: null, side_b: null },
            { edge_id: '', a: '', b: '', side_a: null, side_b: null },
            edge('op:a:a_1', 'op:b:b_1'),
        ];
        const exposure = computePressureExposureByEntityOsid(stateWithOsidEdges(bad));
        expect(sortedEntries(exposure)).toEqual([
            ['op:a:a_1', 0.5],
            ['op:b:b_1', 0.5],
        ]);
    });

    it('deterministic: repeat invocation + permuted input order → identical sorted output', () => {
        const edges = [
            edge('op:bihac:bihac_2', 'op:bosanska_krupa:krupa_2'),
            edge('op:kljuc:kljuc_2', 'op:kljuc:sanica_2'),
            edge('op:bihac:bihac_2', 'op:cazin:cazin_2'),
        ];
        const permuted = [edges[2], edges[0], edges[1]];

        const run1 = computePressureExposureByEntityOsid(stateWithOsidEdges(edges));
        const run2 = computePressureExposureByEntityOsid(stateWithOsidEdges(edges));
        const run3 = computePressureExposureByEntityOsid(stateWithOsidEdges(permuted));

        expect(sortedEntries(run1)).toEqual(sortedEntries(run2));
        expect(sortedEntries(run1)).toEqual(sortedEntries(run3));
        expect(run1.get('op:bihac:bihac_2')).toBe(1.0);
    });

    it('§6 Condition 1: protected enclave OSIDs DO appear in exposure output (by design)', () => {
        // Guard-by-exclusion-at-write (ratified #368): the enclave is excluded at the
        // Phase 3D collapse_damage/capacity_modifier WRITE (G1), not at exposure time.
        // Enclave OSIDs accruing exposure → local_strain → Tier-1 eligibility is the
        // EXPECTED collapse-ON behavior and is NOT a §6 breach (review Condition 1).
        const srebrenica = 'op:srebrenica:srebrenica_2';
        expect(getEnclaveDefForOsid(srebrenica), 'fixture OSID must be enclave-protected').not.toBeNull();

        const exposure = computePressureExposureByEntityOsid(
            stateWithOsidEdges([edge('op:bratunac:bratunac_2', srebrenica)])
        );
        expect(exposure.get(srebrenica)).toBe(0.5);
    });
});
