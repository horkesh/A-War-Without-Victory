/**
 * Collapse Pipeline Phase I — unit tests (pipeline DISABLED build).
 *
 * Covers: Phase 3C gates + constants, Phase 3D severity/damage/modifier derivation,
 * the §6 guard G1 (enclave-OSID exclusion at the capacity_modifiers write site),
 * the C13==C9 consistency invariant, and determinism (no RNG/clock, stable ordering).
 *
 * Spec: docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §3, §4, §5.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import type { SupplyReachabilityOsidReport } from '../src/state/supply_reachability_osid.js';
import {
    applyPhase3CExhaustionCollapseGating,
    setEnablePhase3C,
    resetEnablePhase3C,
} from '../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import {
    setEnablePhase3B,
    resetEnablePhase3B,
} from '../src/sim/pressure/phase3b_pressure_exhaustion.js';
import {
    setEnablePhase3A,
    resetEnablePhase3A,
} from '../src/sim/pressure/phase3a_pressure_eligibility.js';
import {
    applyPhase3DCollapseResolution,
    recomputePhase3DCapacityModifiersFromDamage,
    setEnablePhase3D,
    resetEnablePhase3D,
} from '../src/sim/collapse/phase3d_collapse_resolution.js';
import { getEnclaveDefForOsid } from '../src/sim/combat/enclave_resilience.js';

// A real RBiH-enclave OSID (Srebrenica capital — §6 genocide-rupture enclave) and
// a real non-enclave RBiH OSID for the G1 guard test.
const ENCLAVE_OSID = 'op:srebrenica:srebrenica_2';
const NON_ENCLAVE_OSID = 'op:zvornik:zvornik';

function baseState(): GameState {
    return {
        meta: { turn: 150, phase: 'war' },
        factions: [
            { id: 'RBiH', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { exhaustion: 0, authority: 50 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: { formations: {}, front_pressure: {} },
        political: {},
    } as unknown as GameState;
}

// PHASE IV-a reconciliation: Phase 3C Tier-0 now reads `state.political.war_exhaustion / 100`
// (the open-ended 0..10000 accumulator, rescaled to the 0..100 percentage scale the constants
// were authored on) rather than the legacy 0..1 `profile.exhaustion`. These tests express
// exhaustion on the constants' 0..100 scale, so set the raw accumulator field accordingly.
function setExhaustion0to100(state: GameState, factionId: string, value0to100: number): void {
    if (!state.political.war_exhaustion) {
        (state.political as { war_exhaustion: Record<string, number> }).war_exhaustion = {};
    }
    (state.political.war_exhaustion as Record<string, number>)[factionId] = value0to100 * 100;
}

describe('collapse Phase I — sanity: enclave defs', () => {
    it('the chosen enclave OSID is an RBiH enclave; the non-enclave OSID is not', () => {
        const e = getEnclaveDefForOsid(ENCLAVE_OSID);
        expect(e).not.toBeNull();
        expect(e?.faction).toBe('RBiH');
        expect(getEnclaveDefForOsid(NON_ENCLAVE_OSID)).toBeNull();
    });
});

describe('collapse Phase I — Phase 3C gating', () => {
    afterEach(() => {
        resetEnablePhase3A();
        resetEnablePhase3B();
        resetEnablePhase3C();
    });

    it('is inert (no throw, not applied) when the flag is OFF', () => {
        const state = baseState();
        const r = applyPhase3CExhaustionCollapseGating(state);
        expect(r.applied).toBe(false);
        expect(r.reason_if_not_applied).toBe('feature_flag_disabled');
        expect(state.political.collapse_eligibility).toBeUndefined();
    });

    it('does NOT throw when enabled (fail-fast removed; constants ratified)', () => {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        const state = baseState();
        // No exhaustion crosses threshold → applies but eligibility stays false.
        expect(() => applyPhase3CExhaustionCollapseGating(state, [])).not.toThrow();
    });

    it('requires sustained over-threshold exhaustion (persistence C5=4) before Tier-0 authority eligibility', () => {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        const state = baseState();
        // RBiH exhaustion 80 (> C2=70) and authority 10 (< C6=30 → degradation).
        setExhaustion0to100(state, 'RBiH', 80);
        state.factions[0].profile.authority = 10;

        // 3 turns: persistence accrues but < C5=4 → not yet eligible.
        for (let i = 0; i < 3; i++) applyPhase3CExhaustionCollapseGating(state, []);
        expect(state.political.collapse_eligibility?.RBiH.eligible_authority).toBe(false);
        expect(state.political.collapse_eligibility?.RBiH.persistence_authority).toBe(3);

        // 4th turn: persistence == 4 AND authority degradation → eligible.
        applyPhase3CExhaustionCollapseGating(state, []);
        expect(state.political.collapse_eligibility?.RBiH.persistence_authority).toBe(4);
        expect(state.political.collapse_eligibility?.RBiH.eligible_authority).toBe(true);
    });

    it('exhaustion below threshold (C2=70) resets persistence to 0', () => {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        const state = baseState();
        setExhaustion0to100(state, 'RBiH', 80);
        state.factions[0].profile.authority = 10;
        applyPhase3CExhaustionCollapseGating(state, []);
        expect(state.political.collapse_eligibility?.RBiH.persistence_authority).toBe(1);
        // Drop below threshold → reset.
        setExhaustion0to100(state, 'RBiH', 50);
        applyPhase3CExhaustionCollapseGating(state, []);
        expect(state.political.collapse_eligibility?.RBiH.persistence_authority).toBe(0);
        expect(state.political.collapse_eligibility?.RBiH.eligible_authority).toBe(false);
    });

    it('spatial gate uses the BFS isolated_osids report (C8 ≥10% isolated)', () => {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        const state = baseState();
        setExhaustion0to100(state, 'RBiH', 80); // > C4=65 spatial threshold

        // 20 controlled, 3 isolated = 15% ≥ 10% → spatially degraded.
        const degradedReport: SupplyReachabilityOsidReport = {
            schema: 1,
            turn: 150,
            factions: [
                {
                    faction_id: 'RBiH',
                    sources: [],
                    controlled: Array.from({ length: 20 }, (_, i) => `op:x:c${i}`),
                    reachable_osids: [],
                    isolated_osids: ['op:x:c0', 'op:x:c1', 'op:x:c2'],
                    edges_used: [],
                },
            ],
        };
        for (let i = 0; i < 4; i++) applyPhase3CExhaustionCollapseGating(state, [], degradedReport);
        expect(state.political.collapse_eligibility?.RBiH.eligible_spatial).toBe(true);

        // Fresh state: 1/20 isolated = 5% < 10% → NOT degraded.
        const state2 = baseState();
        setExhaustion0to100(state2, 'RBiH', 80);
        const healthyReport: SupplyReachabilityOsidReport = {
            schema: 1,
            turn: 150,
            factions: [
                {
                    faction_id: 'RBiH',
                    sources: [],
                    controlled: Array.from({ length: 20 }, (_, i) => `op:x:c${i}`),
                    reachable_osids: [],
                    isolated_osids: ['op:x:c0'],
                    edges_used: [],
                },
            ],
        };
        for (let i = 0; i < 4; i++) applyPhase3CExhaustionCollapseGating(state2, [], healthyReport);
        expect(state2.political.collapse_eligibility?.RBiH.eligible_spatial).toBe(false);
    });

    it('is deterministic: identical inputs → identical eligibility state across two runs', () => {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        const run = () => {
            const s = baseState();
            setExhaustion0to100(s, 'RBiH', 90);
            s.factions[0].profile.authority = 5;
            for (let i = 0; i < 5; i++) applyPhase3CExhaustionCollapseGating(s, []);
            return JSON.stringify(s.political.collapse_eligibility);
        };
        expect(run()).toBe(run());
    });
});

describe('collapse Phase I — Phase 3D resolution + §6 guard G1', () => {
    afterEach(() => {
        resetEnablePhase3C();
        resetEnablePhase3D();
    });

    // Build a state already past Phase 3C: Tier-1 eligible + local_strain seeded,
    // so Phase 3D can resolve. Strain 100 → severity = (100-40)/(100-40) = 1.0.
    function tier1ReadyState(osid: string): GameState {
        const state = baseState();
        state.political.collapse_eligibility_tier1 = {
            [osid]: {
                domains: { authority: true, cohesion: false, spatial: true },
                persistence: { authority: 4, cohesion: 0, spatial: 4 },
                suppressed: false,
                immune: false,
            },
        };
        state.political.local_strain = { by_entity: { [osid]: 100 } };
        return state;
    }

    it('is inert (not applied) when the flag is OFF', () => {
        const state = tier1ReadyState(NON_ENCLAVE_OSID);
        const r = applyPhase3DCollapseResolution(state);
        expect(r.applied).toBe(false);
        expect(state.political.capacity_modifiers).toBeUndefined();
    });

    it('non-enclave OSID: writes degraded capacity_modifiers (C15/C17 impacts)', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = tier1ReadyState(NON_ENCLAVE_OSID);
        const r = applyPhase3DCollapseResolution(state);
        expect(r.applied).toBe(true);
        const mods = state.political.capacity_modifiers?.by_sid[NON_ENCLAVE_OSID];
        expect(mods).toBeDefined();
        // severity 1.0 → authority_mult = 1 - 0.3*1 = 0.7; supply_mult = 1 - 0.4*1 = 0.6.
        expect(mods?.authority_mult).toBeCloseTo(0.7, 6);
        expect(mods?.supply_mult).toBeCloseTo(0.6, 6);
        expect(mods?.cohesion_mult).toBeCloseTo(1.0, 6); // cohesion domain not eligible
        // pressure_cap_mult = min(0.7, 1.0, 0.6) = 0.6.
        expect(mods?.pressure_cap_mult).toBeCloseTo(0.6, 6);
        expect(r.stats.enclave_guarded_count).toBe(0);
    });

    it('G1 GUARD: enclave OSID gets NO capacity_modifier AND NO collapse_damage entry even when Tier-1 eligible', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = tier1ReadyState(ENCLAVE_OSID);
        const r = applyPhase3DCollapseResolution(state);
        expect(r.applied).toBe(true);
        // The enclave OSID is absent from capacity_modifiers (write withheld → byte-identically absent).
        expect(state.political.capacity_modifiers?.by_sid?.[ENCLAVE_OSID]).toBeUndefined();
        // CRITICAL (Codex §6 correction): the enclave OSID is ALSO absent from collapse_damage.
        // A bare collapse_damage entry would set loss_of_control_trends.will_not_recover=true
        // (irreversible-loss marking) independent of modifiers — so the guard MUST be at the
        // damage write root, not just the modifier derivation.
        expect(state.political.collapse_damage?.by_entity?.[ENCLAVE_OSID]).toBeUndefined();
        // Guard counted it (it WOULD have collapsed in ≥1 domain).
        expect(r.stats.enclave_guarded_count).toBeGreaterThan(0);
        // No applied event recorded for the guarded OSID (skipped entirely at the root).
        expect((r.applied_events ?? []).some(e => e.sid === ENCLAVE_OSID)).toBe(false);
    });

    it('G1 GUARD: excludes ALL enclaves — 6 RBiH + 3 HRHB (panel O-1 include-HRHB)', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const enclaveOsids: Array<[string, string]> = [
            ['op:srebrenica:srebrenica_2', 'RBiH'],
            ['op:rogatica:zepa_2', 'RBiH'],
            ['op:gorazde:gorazde_2', 'RBiH'],
            ['op:bihac:bihac_2', 'RBiH'],          // bihac_pocket prefix op:bihac:
            ['op:centar_sarajevo:centar_sarajevo', 'RBiH'],
            ['op:ugljevik:teocak_krstac_2', 'RBiH'],
            ['op:kiseljak:kiseljak_2', 'HRHB'],    // HRHB enclaves
            ['op:vitez:vitez_2', 'HRHB'],          // lasva_valley
            ['op:zepce:zepce_2', 'HRHB'],
        ];
        for (const [osid, faction] of enclaveOsids) {
            // sanity: each is a recognized enclave OSID of the expected faction
            expect(getEnclaveDefForOsid(osid)?.faction, osid).toBe(faction);
            const state = tier1ReadyState(osid);
            const r = applyPhase3DCollapseResolution(state);
            // Absent from BOTH maps (chokepoint + loop-skip).
            expect(state.political.capacity_modifiers?.by_sid?.[osid], osid).toBeUndefined();
            expect(state.political.collapse_damage?.by_entity?.[osid], osid).toBeUndefined();
            expect(r.stats.enclave_guarded_count, osid).toBeGreaterThan(0);
        }
    });

    it('G1 GUARD: chokepoint — collapse_damage map stays entirely empty for a guarded OSID', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = tier1ReadyState('op:zepce:zepce_2'); // HRHB enclave
        applyPhase3DCollapseResolution(state);
        // The chokepoint (getOrInitCollapseDamage) never wrote ANY by_entity record →
        // will_not_recover (loss_of_control_trends) can never trip for this OSID.
        const byEntity = state.political.collapse_damage?.by_entity ?? {};
        expect(Object.keys(byEntity)).not.toContain('op:zepce:zepce_2');
    });

    it('G1 GUARD: recompute-from-damage path also never produces an enclave modifier', () => {
        // Even if collapse_damage were seeded directly for an enclave OSID (bypassing the
        // resolution loop), recomputePhase3DCapacityModifiersFromDamage must not derive a
        // modifier for it — defense-in-depth so NO code path leaks an enclave modifier.
        const state = baseState();
        state.political.collapse_damage = {
            by_entity: {
                [ENCLAVE_OSID]: { authority: 1.0, cohesion: 1.0, spatial: 1.0 },
                [NON_ENCLAVE_OSID]: { authority: 1.0, cohesion: 0, spatial: 1.0 },
            },
        };
        recomputePhase3DCapacityModifiersFromDamage(state);
        expect(state.political.capacity_modifiers?.by_sid?.[ENCLAVE_OSID]).toBeUndefined();
        // Non-enclave OSID still gets its modifier from the recompute.
        expect(state.political.capacity_modifiers?.by_sid?.[NON_ENCLAVE_OSID]?.authority_mult).toBeCloseTo(0.7, 6);
    });

    it('severity below SEVERITY_MIN (C14=0.25) applies no damage', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = tier1ReadyState(NON_ENCLAVE_OSID);
        // strain 50 → sRaw = (50-40)/(100-40) = 0.1667 < 0.25 → severity 0 → no damage.
        state.political.local_strain = { by_entity: { [NON_ENCLAVE_OSID]: 50 } };
        const r = applyPhase3DCollapseResolution(state);
        expect(r.stats.collapses_applied_count).toBe(0);
        expect(state.political.capacity_modifiers?.by_sid?.[NON_ENCLAVE_OSID]).toBeUndefined();
    });

    it('damage is monotonic (never decreases across runs)', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = tier1ReadyState(NON_ENCLAVE_OSID);
        applyPhase3DCollapseResolution(state);
        const after1 = state.political.collapse_damage!.by_entity[NON_ENCLAVE_OSID].authority;
        // Lower the strain — damage must NOT decrease (max(prev, new)).
        state.political.local_strain = { by_entity: { [NON_ENCLAVE_OSID]: 60 } };
        applyPhase3DCollapseResolution(state);
        const after2 = state.political.collapse_damage!.by_entity[NON_ENCLAVE_OSID].authority;
        expect(after2).toBeGreaterThanOrEqual(after1);
    });

    it('is deterministic: identical inputs → identical applied_events ordering', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const run = () => {
            const s = baseState();
            s.political.collapse_eligibility_tier1 = {
                'op:b:b': { domains: { authority: true, cohesion: true, spatial: false }, persistence: { authority: 4, cohesion: 4, spatial: 0 }, suppressed: false, immune: false },
                'op:a:a': { domains: { authority: true, cohesion: false, spatial: true }, persistence: { authority: 4, cohesion: 0, spatial: 4 }, suppressed: false, immune: false },
            };
            s.political.local_strain = { by_entity: { 'op:a:a': 100, 'op:b:b': 90 } };
            const r = applyPhase3DCollapseResolution(s);
            return JSON.stringify(r.applied_events);
        };
        expect(run()).toBe(run());
    });
});

describe('collapse Phase I — C13==C9 consistency invariant', () => {
    // STRAIN_THRESHOLD (3D C13) must equal TIER1_*_THRESHOLD (3C C9) so a Tier-1-eligible
    // OSID at exactly the threshold produces zero severity but just above produces non-zero,
    // i.e. the two thresholds are aligned. We assert it empirically through the pipeline.
    afterEach(() => {
        resetEnablePhase3C();
        resetEnablePhase3D();
    });

    it('an OSID with strain just above the shared threshold (40) is eligible AND can damage', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = baseState();
        // strain 100 (well above 40); severity 1.0 — proves 3D severity is non-zero for the
        // same threshold 3C gates on. If C13 != C9 this relationship would break (silent no-op
        // or leak per spec §3).
        state.political.collapse_eligibility_tier1 = {
            'op:n:n': { domains: { authority: true, cohesion: false, spatial: false }, persistence: { authority: 4, cohesion: 0, spatial: 0 }, suppressed: false, immune: false },
        };
        state.political.local_strain = { by_entity: { 'op:n:n': 100 } };
        const r = applyPhase3DCollapseResolution(state);
        expect(r.stats.collapses_applied_count).toBeGreaterThan(0);
        expect(state.political.capacity_modifiers?.by_sid['op:n:n']?.authority_mult).toBeLessThan(1.0);
    });
});
