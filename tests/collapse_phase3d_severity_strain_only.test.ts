/**
 * Phase 3D severity is STRAIN-ONLY — regression pin. // legacy-phase-term-ok
 *
 * `computeSeverity` once accepted a `persistence` parameter and never referenced it, so
 * chronic and acute strain produced identical severity while the signature advertised
 * otherwise. The parameter was REMOVED rather than wired up (2026-08-13).
 *
 * The ratified transform carries no persistence term:
 *   severity = clamp((strain − STRAIN_THRESHOLD)/(STRAIN_MAX − STRAIN_THRESHOLD), 0, 1),
 *   zeroed below SEVERITY_MIN
 * — docs/40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md §2 (Phase 3D
 * "Transform" row). Persistence is consumed UPSTREAM in Phase 3C as the eligibility gate
 * (TIER1_PERSIST_TURNS = 4, spec C10), and elapsed exposure is already carried by
 * `local_strain`, which is itself a monotonic accumulator. Letting persistence also scale
 * magnitude would double-count duration and would require inventing a curve no canon
 * states — a railroad.
 *
 * These tests exist so that reintroducing a persistence term is a RED TEST, not a silent
 * behavioural change. If a future calibration packet genuinely wants persistence to shape
 * magnitude, amend the spec §2 transform first, then update this file deliberately.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import {
    applyPhase3DCollapseResolution,
    setEnablePhase3D,
    resetEnablePhase3D,
} from '../src/sim/collapse/phase3d_collapse_resolution.js';
import {
    setEnablePhase3C,
    resetEnablePhase3C,
} from '../src/sim/pressure/phase3c_exhaustion_collapse_gating.js';
import { getEnclaveDefForOsid } from '../src/sim/combat/enclave_resilience.js';

// Two NON-enclave OSIDs — a guarded enclave OSID would be skipped wholesale by §6 guard
// G1 and would prove nothing about severity. Asserted below rather than assumed.
const OSID_LOW_PERSIST = 'op:zvornik:zvornik';
const OSID_HIGH_PERSIST = 'op:banja_luka:banja_luka';

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

/**
 * Tier-1-eligible in the authority domain at a given strain and persistence counter.
 * Phase 3D reads `domains[domain]` as the eligibility verdict; the persistence counter is
 * carried in the same record, which is exactly why it was reachable — and mis-signatured.
 */
function tier1State(osid: string, strain: number, persistence: number): GameState {
    const state = baseState();
    state.political.collapse_eligibility_tier1 = {
        [osid]: {
            domains: { authority: true, cohesion: false, spatial: false },
            persistence: { authority: persistence, cohesion: 0, spatial: 0 },
            suppressed: false,
            immune: false,
        },
    };
    state.political.local_strain = { by_entity: { [osid]: strain } };
    return state;
}

function resolveAuthorityDamage(state: GameState, osid: string): number | undefined {
    applyPhase3DCollapseResolution(state);
    return state.political.collapse_damage?.by_entity?.[osid]?.authority;
}

describe('Phase 3D severity — strain-only (persistence is a 3C gate, not a magnitude term)', () => { // legacy-phase-term-ok
    afterEach(() => {
        resetEnablePhase3C();
        resetEnablePhase3D();
    });

    it('sanity: both fixture OSIDs are non-enclave (not skipped by §6 guard G1)', () => {
        expect(getEnclaveDefForOsid(OSID_LOW_PERSIST)).toBeNull();
        expect(getEnclaveDefForOsid(OSID_HIGH_PERSIST)).toBeNull();
    });

    it('equal strain + wildly different persistence → IDENTICAL damage', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        // Mid-band strain 80 (severity 2/3), persistence 4 (bare gate) vs 400 (chronic).
        // Strain must stay BELOW the point where severity clamps at 1.0, or a persistence
        // term would be hidden by the clamp and this test would pass vacuously.
        const acute = resolveAuthorityDamage(tier1State(OSID_LOW_PERSIST, 80, 4), OSID_LOW_PERSIST);
        const chronic = resolveAuthorityDamage(tier1State(OSID_HIGH_PERSIST, 80, 400), OSID_HIGH_PERSIST);
        expect(acute).toBeCloseTo(2 / 3, 6);
        expect(chronic).toBe(acute);
    });

    it('equal strain + different persistence → IDENTICAL severity in applied_events', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        // Mid-band strain (80 → severity (80-40)/60 = 0.6667) to catch a multiplicative
        // persistence term that a clamped severity of 1.0 would mask.
        const acute = applyPhase3DCollapseResolution(tier1State(OSID_LOW_PERSIST, 80, 4));
        const chronic = applyPhase3DCollapseResolution(tier1State(OSID_HIGH_PERSIST, 80, 400));
        const acuteSeverity = acute.applied_events?.[0]?.severity;
        const chronicSeverity = chronic.applied_events?.[0]?.severity;
        expect(acuteSeverity).toBeCloseTo(2 / 3, 6);
        expect(chronicSeverity).toBe(acuteSeverity);
    });

    it('persistence 0 does not suppress damage (eligibility already decided it upstream)', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        // A zero persistence counter alongside an eligible domain must still resolve — 3D
        // trusts 3C's verdict and must not re-gate on the counter.
        const damage = resolveAuthorityDamage(tier1State(OSID_LOW_PERSIST, 100, 0), OSID_LOW_PERSIST);
        expect(damage).toBeCloseTo(1.0, 6);
    });

    it('strain IS the live input: higher strain → strictly higher severity', () => {
        setEnablePhase3C(true);
        setEnablePhase3D(true);
        // Guards against the tests above passing because severity is constant/ignored.
        const lower = applyPhase3DCollapseResolution(tier1State(OSID_LOW_PERSIST, 70, 4));
        const higher = applyPhase3DCollapseResolution(tier1State(OSID_LOW_PERSIST, 100, 4));
        const lowerSeverity = lower.applied_events?.[0]?.severity ?? 0;
        const higherSeverity = higher.applied_events?.[0]?.severity ?? 0;
        expect(lowerSeverity).toBeGreaterThan(0);
        expect(higherSeverity).toBeGreaterThan(lowerSeverity);
    });
});
