/**
 * Collapse Pipeline Phase I — unit tests (pipeline DISABLED build). // legacy-phase-term-ok
 *
 * Covers: Phase 3C gates + constants, Phase 3D severity/damage/modifier derivation,
 * the §6 guard G1 (enclave-OSID exclusion at the capacity_modifiers write site),
 * the C13==C9 consistency invariant, and determinism (no RNG/clock, stable ordering).
 *
 * Spec: docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §3, §4, §5.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('collapse Phase I — sanity: enclave defs', () => { // legacy-phase-term-ok
    it('the chosen enclave OSID is an RBiH enclave; the non-enclave OSID is not', () => {
        const e = getEnclaveDefForOsid(ENCLAVE_OSID);
        expect(e).not.toBeNull();
        expect(e?.faction).toBe('RBiH');
        expect(getEnclaveDefForOsid(NON_ENCLAVE_OSID)).toBeNull();
    });
});

describe('collapse Phase I — Phase 3C gating', () => { // legacy-phase-term-ok
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

describe('collapse Phase I — Phase 3D resolution + §6 guard G1', () => { // legacy-phase-term-ok
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
            // Sarajevo is a PREFIX enclave. The LOGICAL capital below is not a node in the
            // 712-OSID universe, so no operation can target it and no control flip can touch
            // it. It still genuinely exercises G1 — the predicate is a pure string test — so
            // this row is not vacuous, but it can never be the cell that matters. The PAINTED
            // core cell is therefore pinned alongside it, as the G2 suite already does.
            ['op:centar_sarajevo:centar_sarajevo', 'RBiH'],
            ['op:centar_sarajevo:sarajevo_dio_centar_sajarevo', 'RBiH'],
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

/**
 * §6 GUARD G1 — THE SIX MEASURED PENDING HAZARDS (RC panel, Stage 2, 2026-08-14).
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT A DUPLICATE OF THE BLOCK ABOVE.
 * The Stage-2 collapse-ON 188w run (n222 ON / n221 OFF) passed every §6 case — and passed
 * VACUOUSLY. Tier-0 opened for HRHB spatial only; Tier-1 yielded exactly two HRHB entities,
 * at strain 53.475 and 42.300 against the 55.0 field floor, and both hit `severity <= 0`
 * before the sole write site. **G1 was never reached.** The empirical §6 proof from that
 * pair is therefore silent about the guard: the independent variable never moved.
 *
 * The fixture above closes that with a synthetic seed, and it is sound — it bypasses Tier-0
 * and carries a real discriminator. What it does NOT cover is the hazard the run actually
 * measured. Forty OSIDs sit at or above the 55.0 floor (RBiH 20, RS 20, HRHB 0) and SIX of
 * them are enclave-guarded, held back by nothing except their faction's closed Tier-0 gate.
 * Any packet that opens RBiH's or RS's Tier-0 — including exhaustion re-tuning that never
 * mentions collapse — puts all six through G1 on the first turn it opens.
 *
 * Two things here that no existing fixture touches:
 *  1. These are prefix/list MEMBERS at their real measured strains, not enclave capitals at
 *     a synthetic strain 100. Severity at 56.40 is 0.2733 — barely over the 0.25 floor — so
 *     these exercise the guard in the narrow band where it actually has to work.
 *  2. FOUR OF THE SIX ARE RS-HELD. A guarded cell held by the BESIEGER is a class no fixture
 *     covered before. `op:novo_sarajevo:lukavica` is the SRK's own corps HQ: the guard
 *     written to protect the besieged currently also protects the besieger's headquarters.
 *     That is a real finding (panel P0-4), not a defect of this test — it is recorded here
 *     because the guard's behaviour on those cells is now pinned either way.
 *
 * Determinism: pure seeded state, no RNG/clock, sorted iteration inside the SUT.
 */
describe('collapse Phase I — §6 guard G1 against the six MEASURED pending hazards', () => { // legacy-phase-term-ok
    afterEach(() => {
        resetEnablePhase3C();
        resetEnablePhase3D();
    });

    /**
     * The six §6-guarded OSIDs measured at or above the severity floor in the Stage-2 run,
     * at their REAL strains — not rounded, not a stand-in. `severity` is
     * `(strain - 40) / (100 - 40)`, recorded per row so the multiplier expectations below
     * are pinned against the ratified impact constants rather than recomputed by the test.
     */
    const PENDING_HAZARDS: ReadonlyArray<{
        osid: string; controller: 'RBiH' | 'RS'; strain: number; severity: number;
    }> = [
        { osid: 'op:gorazde:osjecani_2', controller: 'RBiH', strain: 84.60, severity: 44.60 / 60 },
        { osid: 'op:novo_sarajevo:lukavica', controller: 'RS', strain: 84.60, severity: 44.60 / 60 },
        { osid: 'op:gorazde:sopotnica', controller: 'RS', strain: 70.50, severity: 30.50 / 60 },
        { osid: 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo', controller: 'RBiH', strain: 70.43, severity: 30.43 / 60 },
        { osid: 'op:centar_sarajevo:radava', controller: 'RS', strain: 56.40, severity: 16.40 / 60 },
        { osid: 'op:gorazde:kamen', controller: 'RS', strain: 56.40, severity: 16.40 / 60 },
    ];

    /** Real non-enclave OSIDs, one per hazard row, for the same-strain control. */
    const CONTROL_OSIDS: readonly string[] = [
        'op:zvornik:zvornik', 'op:banja_luka:banja_luka_2', 'op:tuzla:tuzla_2',
        'op:prijedor:prijedor_2', 'op:travnik:travnik_2', 'op:kalesija:tojsici_2',
    ];

    /** Tier-1-eligible state carrying MANY entities at their own strains. */
    function tier1ReadyMulti(entries: ReadonlyArray<{ osid: string; strain: number }>): GameState {
        const state = baseState();
        const tier1: Record<string, unknown> = {};
        const strain: Record<string, number> = {};
        for (const { osid, strain: s } of entries) {
            tier1[osid] = {
                domains: { authority: true, cohesion: false, spatial: true },
                persistence: { authority: 4, cohesion: 0, spatial: 4 },
                suppressed: false,
                immune: false,
            };
            strain[osid] = s;
        }
        state.political.collapse_eligibility_tier1 = tier1 as GameState['political']['collapse_eligibility_tier1'];
        state.political.local_strain = { by_entity: strain };
        return state;
    }

    // ── Liveness + premise ──────────────────────────────────────────────────
    //
    // A seeded set of zero would make every assertion below pass having examined nothing.
    // These pin the SIZE and the PREMISE before anything asserts an absence.

    it('LIVENESS + PREMISE: all six are enclave-guarded, at real strains that clear the severity floor', () => {
        expect(PENDING_HAZARDS.length, 'the measured hazard set must be all six').toBe(6);
        expect(CONTROL_OSIDS.length, 'one non-enclave control per hazard row').toBe(6);
        expect(new Set(PENDING_HAZARDS.map(h => h.osid)).size, 'hazard OSIDs must be distinct').toBe(6);

        for (const { osid, strain, severity } of PENDING_HAZARDS) {
            // Guarded — otherwise the absence assertions below prove nothing.
            expect(getEnclaveDefForOsid(osid), `${osid} must be enclave-guarded`).not.toBeNull();
            // AND above the floor — otherwise `severity <= 0` stops them and the GUARD is
            // untested, which is exactly how the Stage-2 run passed vacuously.
            expect(severity, `${osid} strain ${strain} must clear SEVERITY_MIN 0.25`).toBeGreaterThan(0.25);
            expect(severity).toBeCloseTo((strain - 40) / 60, 10);
        }
        for (const osid of CONTROL_OSIDS) {
            expect(getEnclaveDefForOsid(osid), `control ${osid} must NOT be enclave-guarded`).toBeNull();
        }
        // Four RS-held: the besieger-held guarded class no other fixture covers.
        expect(PENDING_HAZARDS.filter(h => h.controller === 'RS').length).toBe(4);
    });

    // ── 1. The six, seeded together, at their measured strains ──────────────

    it('the six measured hazards get NO collapse_damage and NO capacity_modifier (enclave_guarded_count === 6)', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const state = tier1ReadyMulti(PENDING_HAZARDS);
        const r = applyPhase3DCollapseResolution(state);
        expect(r.applied).toBe(true);

        for (const { osid } of PENDING_HAZARDS) {
            expect(state.political.collapse_damage?.by_entity?.[osid], `collapse_damage must not contain ${osid}`).toBeUndefined();
            expect(state.political.capacity_modifiers?.by_sid?.[osid], `capacity_modifiers must not contain ${osid}`).toBeUndefined();
            expect((r.applied_events ?? []).some(e => e.sid === osid), `no applied event for ${osid}`).toBe(false);
        }
        // Every one of the six was seen and withheld — not skipped for being below the floor.
        expect(
            r.stats.enclave_guarded_count,
            'all six must be COUNTED as guarded; a lower count means one fell below the severity '
            + 'floor and was never actually offered to the guard'
        ).toBe(6);
        // Nothing else leaked in either.
        expect(Object.keys(state.political.collapse_damage?.by_entity ?? {})).toEqual([]);
    });

    // ── 2. Same strains, non-enclave: damage MUST appear ────────────────────

    it('DISCRIMINATOR: non-enclave OSIDs at the SAME six strains DO receive damage and modifiers', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        const paired = PENDING_HAZARDS.map((h, i) => ({ osid: CONTROL_OSIDS[i], strain: h.strain, severity: h.severity }));
        const state = tier1ReadyMulti(paired);
        const r = applyPhase3DCollapseResolution(state);
        expect(r.applied).toBe(true);

        for (const { osid, severity } of paired) {
            const damage = state.political.collapse_damage?.by_entity?.[osid];
            expect(damage, `control ${osid} MUST receive collapse_damage`).toBeDefined();
            const mods = state.political.capacity_modifiers?.by_sid?.[osid];
            expect(mods, `control ${osid} MUST receive capacity_modifiers`).toBeDefined();
            // Ratified impacts C15 = 0.3 (authority), C17 = 0.4 (spatial→supply).
            expect(mods!.authority_mult, osid).toBeCloseTo(1 - 0.3 * severity, 6);
            expect(mods!.supply_mult, osid).toBeCloseTo(1 - 0.4 * severity, 6);
            expect(mods!.cohesion_mult, osid).toBeCloseTo(1.0, 6); // cohesion domain not eligible
        }
        expect(r.stats.enclave_guarded_count, 'no control is guarded').toBe(0);
        expect(r.stats.collapses_applied_count, 'every control must have collapsed').toBeGreaterThan(0);
        // THE POINT: the harness produces damage in the 56-85 band, so the six enclaves'
        // absence above is the GUARD and not a silently-zeroed severity in that band.
        expect(Object.keys(state.political.collapse_damage?.by_entity ?? {}).sort()).toEqual([...CONTROL_OSIDS].sort());
    });

    /**
     * STRUCTURAL PIN for a guard site that is UNREACHABLE, and therefore untestable
     * behaviourally. Found by mutation, not by reading.
     *
     * Deleting the G1 check inside `getOrInitCollapseDamage` — the site the module docblock
     * calls "the PRIMARY chokepoint" and "the SOLE production write site" — leaves the ENTIRE
     * suite green, this file's 21 tests included. Not because the tests are weak: because the
     * site is SHADOWED. `getOrInitCollapseDamage` has exactly one call site (`:543`), inside
     * the resolution loop, and the loop-skip at `:510` already `continue`s on every guarded
     * OSID before reaching it. The inline comment at `:542` concedes this — "enclaves
     * short-circuited above". So for a guarded OSID the chokepoint is dead code, no input can
     * reach it, and no behavioural test can distinguish its presence.
     *
     * It is still worth keeping, and that is the whole point: it is the safety net for the
     * refactor that removes the loop-skip. The hazard is the ORDER of two safe-looking edits —
     * delete the chokepoint (tests green, net silently gone), then later delete the loop-skip
     * believing the chokepoint covers it, and §6 breaches with a green suite.
     *
     * WHAT THIS PIN BUYS, AND WHAT IT DOES NOT: it is a source-text assertion, so it binds the
     * MECHANISM's presence, not its behaviour. It cannot verify the guard works — nothing can,
     * while the line is unreachable. Treat it as a tripwire on the first of those two edits,
     * not as proof of protection.
     *
     * NOT DEAD CODE, and this is the argument against deleting it: the guard is a precondition
     * on a shared helper that happens to have exactly one caller today. A function defending
     * its own contract is correct design irrespective of the current call graph, and this one
     * goes live the moment a second caller is added.
     *
     * The module docblock of `phase3d_collapse_resolution.ts` now states the same three-site
     * ordering, naming the loop-skip as load-bearing and this site as unreachable
     * defence-in-depth. THE TWO MUST STAY IN AGREEMENT — if you change one, change the other,
     * or the next reader resolves the contradiction by guessing.
     */
    it('STRUCTURAL: the shadowed chokepoint guard in getOrInitCollapseDamage is still present', () => {
        const src = readFileSync(
            join(process.cwd(), 'src', 'sim', 'collapse', 'phase3d_collapse_resolution.ts'), 'utf8'
        );
        // Strip comments first — the docblock names the function and the guard repeatedly,
        // so an unstripped match would pass on prose alone.
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

        const start = code.indexOf('function getOrInitCollapseDamage(');
        expect(start, 'getOrInitCollapseDamage must exist').toBeGreaterThan(-1);
        const nextFn = code.indexOf('\nfunction ', start + 1);
        const body = code.slice(start, nextFn === -1 ? undefined : nextFn);

        expect(
            body.includes('isPhase3DEnclaveGuarded(entityId)'),
            'The G1 predicate call was removed from (or replaced inside) getOrInitCollapseDamage.\n'
            + '\n'
            + 'WHY NO BEHAVIOURAL TEST COVERS THIS, AND WHY A GREEN SUITE IS NOT EVIDENCE:\n'
            + 'the line is UNREACHABLE today. getOrInitCollapseDamage has exactly one caller, and '
            + 'the loop-skip in applyPhase3DCollapseResolution `continue`s on every guarded OSID '
            + 'before reaching it. No input can therefore distinguish this guard being present '
            + 'from it being absent, and every other test in this repo passes either way — so a '
            + 'source-text pin is the ONLY instrument that can hold this defence layer in place. '
            + 'Do not delete this pin as unrigorous because you cannot write a behavioural '
            + 'version; that impossibility is the reason it exists.\n'
            + '\n'
            + 'IT IS NOT DEAD CODE: it is a precondition on a shared helper that happens to have '
            + 'one caller today, and it goes live and correct the moment a second caller is added.\n'
            + '\n'
            + 'THE HAZARD: remove this guard (suite green, redundancy silently gone), then later '
            + 'remove the loop-skip believing this one still covers it. That composition is a §6 '
            + 'breach no test would catch. Restore the call, and keep it and the module docblock '
            + 'telling the same story.'
        ).toBe(true);
    });

    // ── 3. The recompute path (defense-in-depth, and where D1 would land) ───

    it('recompute-from-damage: pre-seeded enclave damage yields NO modifier for any of the six', () => {
        // The CLI harness (phase3abc_audit_harness.ts:1193, defect D1) writes
        // collapse_damage.by_entity DIRECTLY, bypassing the getOrInitCollapseDamage
        // chokepoint entirely. recomputePhase3DCapacityModifiersFromDamage is the only thing
        // standing between that bypass and an enclave capacity_modifier. Nothing tested it
        // against these six.
        const state = baseState();
        const byEntity: Record<string, { authority: number; cohesion: number; spatial: number }> = {};
        for (const { osid, severity } of PENDING_HAZARDS) {
            byEntity[osid] = { authority: severity, cohesion: 0, spatial: severity };
        }
        const control = CONTROL_OSIDS[0];
        byEntity[control] = { authority: 1.0, cohesion: 0, spatial: 1.0 };
        state.political.collapse_damage = { by_entity: byEntity };

        recomputePhase3DCapacityModifiersFromDamage(state);

        for (const { osid } of PENDING_HAZARDS) {
            expect(
                state.political.capacity_modifiers?.by_sid?.[osid],
                `recompute must not derive a modifier for guarded ${osid}`
            ).toBeUndefined();
        }
        // Discriminator on the same call: the control DID get one, so the recompute ran.
        expect(state.political.capacity_modifiers?.by_sid?.[control]?.authority_mult).toBeCloseTo(0.7, 6);
        expect(Object.keys(state.political.capacity_modifiers?.by_sid ?? {})).toEqual([control]);
    });
});

describe('collapse Phase I — C13==C9 consistency invariant', () => { // legacy-phase-term-ok
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
