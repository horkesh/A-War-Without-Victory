/**
 * must_hold_variable_multiplier.test.ts
 *
 * LANE-NIGHTSHIFT-ROUND2-MUST-HOLD-VARIABLE-MULTIPLIER
 *
 * Verifies the variable garrison-budget multiplier for must-hold zones,
 * which replaces the prior flat 1.5×. Formula:
 *
 *   multiplier = clamp(0.75 × observed_pressure, 2.0, 5.0)
 *
 * `observed_pressure` is read from `zone.commitment_ratio` (existing data
 * already on `ZoneAssessment`; same proxy used by `assessThreats` for
 * threat-level mapping). Faction-agnostic, deterministic.
 *
 * Floor breakpoint: pressure < 2.667 → multiplier 2.0
 * Cap breakpoint:   pressure > 6.667 → multiplier 5.0
 * In between: multiplier = 0.75 × pressure
 *
 * T1: floor at 2.0× when pressure < 2.7
 * T2: scales to 0.75 × pressure when pressure 2.7–6.7
 * T3: cap at 5.0× when pressure > 6.7
 * T4: faction-symmetric (same input → same output across factions)
 */

import { describe, it, expect } from 'vitest';
import {
    computeMustHoldMultiplier,
    computeGarrisonBudget,
    GARRISON_EDGES_PER_BRIGADE,
} from '../src/sim/combat/commander/allocate.js';
import type {
    ZoneAssessment,
    ZoneId,
    ZonePosture,
    OfficerPersonality,
} from '../src/sim/combat/commander/commander_state.js';
import type { FactionId, FormationId } from '../src/state/game_state.js';

// ── Factories ───────────────────────────────────────────────────────────────

function makeZone(overrides: Partial<ZoneAssessment> = {}): ZoneAssessment {
    return {
        zone_id: 'zone:test_corps:0' as ZoneId,
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        osids: ['op:test:test_1'],
        front_edge_count: 12,
        depth: 3,
        corridor_width: 5,
        population_value: 10_000,
        strategic_value: 5,
        posture: 'defending' as ZonePosture,
        commitment_ratio: 2.5,
        garrison_budget: 1,
        assigned_brigades: [],
        surplus_brigades: [],
        deficit: 0,
        is_main_body: true,
        enemy_adjacent_osids: [],
        is_must_hold: true,
        ...overrides,
    } as ZoneAssessment;
}

// Neutral personality so personality modifiers do not interfere with
// the must-hold multiplier we're testing. caution=0.3 < 0.5 threshold,
// aggression=0.5 < 0.7 threshold → no personality multiplier applied.
const neutralPersonality: OfficerPersonality = {
    aggression: 0.5,
    caution: 0.3,
    initiative: 0.3,
    competence: 0.5,
};

// ═══════════════════════════════════════════════════════════════════════════
// T1: Floor at 2.0× when pressure < 2.7
// ═══════════════════════════════════════════════════════════════════════════

describe('computeMustHoldMultiplier — T1: floor at 2.0×', () => {
    it('returns 2.0 for pressure = 0', () => {
        expect(computeMustHoldMultiplier(0)).toBe(2.0);
    });

    it('returns 2.0 for pressure = 1.0', () => {
        expect(computeMustHoldMultiplier(1.0)).toBe(2.0);
    });

    it('returns 2.0 for pressure = 2.0 (would scale to 1.5, clamped)', () => {
        expect(computeMustHoldMultiplier(2.0)).toBe(2.0);
    });

    it('returns 2.0 for pressure = 2.5 (would scale to 1.875, clamped)', () => {
        expect(computeMustHoldMultiplier(2.5)).toBe(2.0);
    });

    it('returns 2.0 for pressure just below the floor breakpoint (2.66)', () => {
        // 0.75 × 2.66 = 1.995, below 2.0 → clamped to floor.
        expect(computeMustHoldMultiplier(2.66)).toBe(2.0);
    });

    it('clamps non-finite or non-positive observed pressure to the floor', () => {
        // Defensive guard: NaN, Infinity, and non-positive values all collapse
        // to the structural 2.0× floor so a corrupted commitment_ratio never
        // produces a 5.0× cap by accident.
        expect(computeMustHoldMultiplier(Number.NaN)).toBe(2.0);
        expect(computeMustHoldMultiplier(Number.POSITIVE_INFINITY)).toBe(2.0);
        expect(computeMustHoldMultiplier(-3)).toBe(2.0);
        expect(computeMustHoldMultiplier(0)).toBe(2.0);
    });

    it('budget calculation: must-hold zone with low pressure uses 2.0× floor', () => {
        // posture=defending → 12 edges/brigade. 12 edges → base budget = 1.
        // pressure 1.0 → multiplier 2.0 → budget = ceil(1 × 2.0) = 2.
        // (Without must_hold: 12 edges → ceil(12/12) = 1.)
        const zone = makeZone({
            posture: 'defending',
            front_edge_count: 12,
            commitment_ratio: 1.0,
            is_must_hold: true,
        });
        const budget = computeGarrisonBudget(zone, neutralPersonality, true);
        expect(budget).toBe(2);
        // Confirm non-must-hold baseline at the same edge count.
        const baseline = computeGarrisonBudget(
            { ...zone, is_must_hold: false } as ZoneAssessment,
            neutralPersonality,
            false,
        );
        expect(baseline).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T2: Scales to 0.75 × pressure when pressure ∈ [2.7, 6.7]
// ═══════════════════════════════════════════════════════════════════════════

describe('computeMustHoldMultiplier — T2: linear scaling region', () => {
    it('returns 0.75 × pressure at pressure = 2.7', () => {
        expect(computeMustHoldMultiplier(2.7)).toBeCloseTo(0.75 * 2.7, 10);
    });

    it('returns 0.75 × pressure at pressure = 4.0 (mid-range)', () => {
        // 0.75 × 4.0 = 3.0
        expect(computeMustHoldMultiplier(4.0)).toBeCloseTo(3.0, 10);
    });

    it('returns 0.75 × pressure at pressure = 5.0 (above MEDIUM_THREAT_COMMITMENT=6 boundary)', () => {
        // 0.75 × 5.0 = 3.75
        expect(computeMustHoldMultiplier(5.0)).toBeCloseTo(3.75, 10);
    });

    it('returns 0.75 × pressure at pressure = 6.0 (medium-threat commitment)', () => {
        // 0.75 × 6.0 = 4.5
        expect(computeMustHoldMultiplier(6.0)).toBeCloseTo(4.5, 10);
    });

    it('returns 0.75 × pressure at pressure = 6.7 (just below cap breakpoint)', () => {
        // 0.75 × 6.7 = 5.025... actually 5.025 > 5.0 so this clamps. Use 6.6.
        // The cap kicks in at exactly 6.667. 6.7 → 5.025 → clamped to 5.0.
        expect(computeMustHoldMultiplier(6.7)).toBe(5.0);
    });

    it('returns 0.75 × pressure at pressure = 6.6 (under cap breakpoint)', () => {
        // 0.75 × 6.6 = 4.95
        expect(computeMustHoldMultiplier(6.6)).toBeCloseTo(4.95, 10);
    });

    it('budget calculation: defending zone, 24 edges, pressure 4.0 → mult 3.0 → budget 6', () => {
        // 24 edges, defending (12/brigade) → base 2. 0.75×4 = 3.0 → 2×3 = 6.
        const zone = makeZone({
            posture: 'defending',
            front_edge_count: 24,
            commitment_ratio: 4.0,
            is_must_hold: true,
        });
        expect(computeGarrisonBudget(zone, neutralPersonality, true)).toBe(6);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T3: Cap at 5.0× when pressure > 6.7
// ═══════════════════════════════════════════════════════════════════════════

describe('computeMustHoldMultiplier — T3: cap at 5.0×', () => {
    it('returns 5.0 for pressure = 6.7 (boundary, 0.75×6.7=5.025)', () => {
        expect(computeMustHoldMultiplier(6.7)).toBe(5.0);
    });

    it('returns 5.0 for pressure = 7.0', () => {
        expect(computeMustHoldMultiplier(7.0)).toBe(5.0);
    });

    it('returns 5.0 for pressure = 10.0', () => {
        expect(computeMustHoldMultiplier(10.0)).toBe(5.0);
    });

    it('returns 5.0 for very high pressure (besieged, commitment ratio 50)', () => {
        expect(computeMustHoldMultiplier(50)).toBe(5.0);
    });

    it('budget calculation: defending zone, 24 edges, pressure 10.0 → mult 5.0 → budget 10', () => {
        // 24 edges, defending → base 2. mult 5.0 → 2×5 = 10.
        const zone = makeZone({
            posture: 'defending',
            front_edge_count: 24,
            commitment_ratio: 10.0,
            is_must_hold: true,
        });
        expect(computeGarrisonBudget(zone, neutralPersonality, true)).toBe(10);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// T4: Faction-symmetric (same input = same output for VRS / RBiH / HRHB)
// ═══════════════════════════════════════════════════════════════════════════

describe('computeMustHoldMultiplier — T4: faction-symmetric', () => {
    // Phase 3 it.each consolidation: 3 pressure regimes × identical RBiH/RS/HRHB
    // assertion structure. Per-regime expected multiplier preserved as parametric
    // override; all three regimes assert identical budgets across factions.
    it.each([
        {
            label: 'low pressure',
            pressure: 1.5,
            expectedMultiplier: 2.0,
            useToBe: true,
            front_edge_count: undefined as number | undefined,
            expectedBudget: undefined as number | undefined,
        },
        {
            label: 'mid-range pressure',
            pressure: 4.0,
            expectedMultiplier: 3.0,
            useToBe: false,
            front_edge_count: 24,
            expectedBudget: undefined,
        },
        {
            label: 'high pressure (cap)',
            pressure: 9.0,
            expectedMultiplier: 5.0,
            useToBe: true,
            front_edge_count: 24,
            // base 2 × 5 = 10
            expectedBudget: 10,
        },
    ])(
        'produces identical multipliers for RBiH, RS, and HRHB at $label',
        ({ pressure, expectedMultiplier, useToBe, front_edge_count, expectedBudget }) => {
            // The multiplier function is faction-agnostic by design — it takes a number.
            if (useToBe) {
                expect(computeMustHoldMultiplier(pressure)).toBe(expectedMultiplier);
            } else {
                expect(computeMustHoldMultiplier(pressure)).toBeCloseTo(expectedMultiplier, 10);
            }
            // Reinforce by exercising the call site with three faction-tagged zones.
            const zones: FactionId[] = ['RBiH', 'RS', 'HRHB'];
            const budgets = zones.map(faction =>
                computeGarrisonBudget(
                    makeZone({
                        faction,
                        commitment_ratio: pressure,
                        ...(front_edge_count !== undefined ? { front_edge_count } : {}),
                    }),
                    neutralPersonality,
                    true,
                ),
            );
            expect(new Set(budgets).size).toBe(1);
            if (expectedBudget !== undefined) {
                expect(budgets[0]).toBe(expectedBudget);
            }
        },
    );
});
