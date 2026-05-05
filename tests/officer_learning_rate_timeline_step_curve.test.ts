/**
 * Tests for B'.2 timeline-data officer learning-rate step-curve precedence
 * (Phase 1 of LANE-NIGHTSHIFT-OFFICER-LEARNING-RATE-TIMELINE-DATA-PHASE-1, 2026-05-05).
 *
 * The B'.2 lever adds a NEW path #0 to the existing 4-level precedence chain in
 * `src/sim/combat/officer_quality_update.ts`:
 *
 *   0. timeline `learning_rate_per_turn_step_curve`  ← NEW (B'.2)
 *   1. timeline `learning_rate_per_turn`             (scalar)
 *   2. timeline `learning_rate_multiplier`           (multiplier on COMBAT_GROWTH_BASE)
 *   3. timeline `learning_rate`                      (DEPRECATED legacy)
 *   4. hardcoded fallback `FACTION_LEARNING_RATE`    (× COMBAT_GROWTH_BASE)
 *
 * Predecessor Phase 1 (`a42ebae0`) was DORMANT in production because it modified
 * path #4 while `apr1992.json` already defines `learning_rate_per_turn` at path #1.
 * B'.2 targets the actually-firing path by inserting a step-curve AHEAD of all
 * existing paths.
 *
 * Faction-symmetric mechanism; faction-asymmetric data only. The mechanism imposes
 * no constraint on the sign of the data — late-war bands may be negative.
 *
 * Deterministic: pure arithmetic, sorted iteration via strictCompare in production,
 * no Math.random / Date.now / locale-sensitive sort.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
    updateBrigadeOfficerQuality,
    COMBAT_GROWTH_BASE,
    FACTION_LEARNING_RATE,
    OFFICER_QUALITY_FLOOR,
} from '../src/sim/combat/officer_quality_update.js';
import { validateWarTimeline } from '../src/state/war_timeline.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

// ── Helpers ──────────────────────────────────────────────────────────────

const TOLERANCE = 1e-9;

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade_1',
        faction: 'RBiH',
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 60,
        ...overrides,
    } as FormationState;
}

function makeStateWithTimeline(
    formations: Record<string, FormationState>,
    officerConfig: Record<string, Record<string, unknown>> | null,
    turn: number = 5,
): GameState {
    const military: Record<string, unknown> = {
        formations,
        corps_front_sectors: {},
    };
    if (officerConfig !== null) {
        military.war_timeline = {
            officer_config: officerConfig,
        };
    }
    return {
        meta: { turn, phase: 'war' },
        military,
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// §1: Step-curve at-band-boundary semantics
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 step-curve: per-band evaluation", () => {
    it('evaluates RS step-curve correctly at band boundaries (canonical apr1992 numerics)', () => {
        // Canonical RS numerics from Phase 0 panel be6b95ff:
        //   [0,52)   → 0.007
        //   [52,78)  → 0.004
        //   [78,104) → 0.000
        //   [104,∞)  → -0.0028
        const stepCurve = [
            { start_turn: 0,   end_turn: 52,   value:  0.007 },
            { start_turn: 52,  end_turn: 78,   value:  0.004 },
            { start_turn: 78,  end_turn: 104,  value:  0.000 },
            { start_turn: 104, end_turn: 9999, value: -0.0028 },
        ];
        const probeTurns = [
            { turn: 0,   expectedRate:  0.007 },
            { turn: 51,  expectedRate:  0.007 },
            { turn: 52,  expectedRate:  0.004 },
            { turn: 77,  expectedRate:  0.004 },
            { turn: 78,  expectedRate:  0.000 },
            { turn: 103, expectedRate:  0.000 },
            { turn: 104, expectedRate: -0.0028 },
            { turn: 187, expectedRate: -0.0028 },
        ];

        for (const probe of probeTurns) {
            const f = makeFormation({
                id: 'rs_brigade',
                faction: 'RS',
                officer_quality: 0.50,
                kind: 'brigade',
            });
            const state = makeStateWithTimeline(
                { rs_brigade: f },
                {
                    RS: {
                        faction: 'RS',
                        learning_rate_per_turn_step_curve: stepCurve,
                    },
                },
                probe.turn,
            );
            const initialQuality = 0.50;
            updateBrigadeOfficerQuality(state, new Set(['rs_brigade']));
            const dampener = 1.0 - initialQuality * 0.5;
            const expectedQuality =
                initialQuality + probe.expectedRate * dampener;
            const clamped = Math.max(
                OFFICER_QUALITY_FLOOR,
                Math.min(0.90, expectedQuality),
            );
            assert.ok(
                Math.abs(f.officer_quality! - clamped) < TOLERANCE,
                `RS step-curve at turn ${probe.turn}: expected rate ${probe.expectedRate}, ` +
                    `quality ${clamped}, got ${f.officer_quality}`,
            );
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §2: Step-curve absent → falls through to scalar (path #1)
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 fallback to scalar path #1", () => {
    it('falls through to scalar learning_rate_per_turn when step-curve is absent (RBiH control)', () => {
        const f = makeFormation({
            id: 'rbih_brigade',
            faction: 'RBiH',
            officer_quality: 0.30,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { rbih_brigade: f },
            {
                RBiH: {
                    faction: 'RBiH',
                    learning_rate_per_turn: 0.015,
                    // No step-curve.
                },
            },
            150, // late-war turn — RBiH control faction is unaffected
        );
        updateBrigadeOfficerQuality(state, new Set(['rbih_brigade']));
        // Expected: 0.30 + 0.015 * (1 - 0.30 * 0.5) = 0.30 + 0.015 * 0.85 = 0.31275
        assert.ok(
            Math.abs(f.officer_quality! - 0.31275) < TOLERANCE,
            `Scalar fallback expected 0.31275, got ${f.officer_quality}. ` +
                `RBiH control faction unaffected by B'.2 lever (no step-curve).`,
        );
    });

    it('falls through to scalar at out-of-band turns when step-curve is empty', () => {
        const f = makeFormation({
            id: 'rs_brigade',
            faction: 'RS',
            officer_quality: 0.40,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { rs_brigade: f },
            {
                RS: {
                    faction: 'RS',
                    learning_rate_per_turn_step_curve: [], // empty array → falls through
                    learning_rate_per_turn: 0.007,
                },
            },
            10,
        );
        updateBrigadeOfficerQuality(state, new Set(['rs_brigade']));
        // Empty step-curve: falls through to scalar 0.007.
        // Expected: 0.40 + 0.007 * (1 - 0.40 * 0.5) = 0.40 + 0.007 * 0.80 = 0.4056
        assert.ok(
            Math.abs(f.officer_quality! - 0.4056) < TOLERANCE,
            `Empty step-curve fallback expected 0.4056, got ${f.officer_quality}`,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §3: Step-curve precedence — wins over scalar AND multiplier AND legacy
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 precedence: path #0 wins over all other paths", () => {
    it('step-curve wins when scalar AND multiplier AND legacy are all set', () => {
        const f = makeFormation({
            id: 'rs_brigade',
            faction: 'RS',
            officer_quality: 0.50,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { rs_brigade: f },
            {
                RS: {
                    faction: 'RS',
                    learning_rate_per_turn_step_curve: [
                        { start_turn: 0, end_turn: 9999, value: 0.001 },
                    ],
                    learning_rate_per_turn: 0.020, // would win at path #1
                    learning_rate_multiplier: 5.0, // would win at path #2
                    learning_rate: 5.0, // would win at path #3
                },
            },
            10,
        );
        updateBrigadeOfficerQuality(state, new Set(['rs_brigade']));
        // Step-curve wins: rate = 0.001.
        // Expected: 0.50 + 0.001 * (1 - 0.50 * 0.5) = 0.50 + 0.001 * 0.75 = 0.50075
        assert.ok(
            Math.abs(f.officer_quality! - 0.50075) < TOLERANCE,
            `Step-curve precedence broken: expected 0.50075, got ${f.officer_quality}. ` +
                `Step-curve must win over scalar/multiplier/legacy at path #0.`,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §4: Mutually-exclusive validator emits warning (DEV-mode)
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 validator: mutually-exclusive warning when both fields set", () => {
    it('emits a console.warn when BOTH step-curve and scalar are defined for the same faction', () => {
        const originalWarn = console.warn;
        const warnings: string[] = [];
        console.warn = (...args: unknown[]) => {
            warnings.push(args.map((a) => String(a)).join(' '));
        };
        try {
            const minimalTimeline = {
                id: 'test_timeline',
                doctrine_phases: {},
                standing_orders: {},
                cohesion_drift: {},
                cohesion_floor: {},
                cohesion_ceiling: {},
                reinforcement_mult: {},
                equipment_decay: [],
                external_support: [],
                maintenance_decay: [],
                officer_config: {
                    RS: {
                        faction: 'RS',
                        learning_rate_per_turn: 0.007,
                        learning_rate_per_turn_step_curve: [
                            { start_turn: 0, end_turn: 9999, value: 0.005 },
                        ],
                    },
                },
            };
            validateWarTimeline(minimalTimeline);
        } finally {
            console.warn = originalWarn;
        }
        assert.ok(
            warnings.some(
                (w) =>
                    w.includes('learning_rate_per_turn_step_curve') &&
                    w.includes('learning_rate_per_turn') &&
                    w.includes('shadowed'),
            ),
            `Expected mutually-exclusive warning, got: ${JSON.stringify(warnings)}`,
        );
    });

    it('rejects officer_config when NONE of the four learning-rate fields is present', () => {
        const minimalTimeline = {
            id: 'test_timeline',
            doctrine_phases: {},
            standing_orders: {},
            cohesion_drift: {},
            cohesion_floor: {},
            cohesion_ceiling: {},
            reinforcement_mult: {},
            equipment_decay: [],
            external_support: [],
            maintenance_decay: [],
            officer_config: {
                RS: {
                    faction: 'RS',
                    // No learning-rate fields.
                },
            },
        };
        assert.throws(
            () => validateWarTimeline(minimalTimeline),
            /must define one of/,
            'Validator must reject officer_config without any learning-rate field.',
        );
    });

    it('rejects officer_config with a malformed step-curve (non-contiguous)', () => {
        const minimalTimeline = {
            id: 'test_timeline',
            doctrine_phases: {},
            standing_orders: {},
            cohesion_drift: {},
            cohesion_floor: {},
            cohesion_ceiling: {},
            reinforcement_mult: {},
            equipment_decay: [],
            external_support: [],
            maintenance_decay: [],
            officer_config: {
                RS: {
                    faction: 'RS',
                    learning_rate_per_turn_step_curve: [
                        { start_turn: 0, end_turn: 52, value: 0.007 },
                        { start_turn: 60, end_turn: 78, value: 0.004 }, // gap at 52-60
                    ],
                },
            },
        };
        assert.throws(
            () => validateWarTimeline(minimalTimeline),
            /gap\/overlap/,
            'Validator must reject non-contiguous step-curve via validateStepCurveEntries.',
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §5: Faction-symmetric mechanism — accepts negative values without sign-clamping
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 negative-band behavior", () => {
    it('accepts negative-value step-curve bands and decrements officer_quality', () => {
        const f = makeFormation({
            id: 'rs_brigade',
            faction: 'RS',
            officer_quality: 0.60,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { rs_brigade: f },
            {
                RS: {
                    faction: 'RS',
                    learning_rate_per_turn_step_curve: [
                        { start_turn: 0, end_turn: 9999, value: -0.0028 },
                    ],
                },
            },
            150, // in the negative band
        );
        updateBrigadeOfficerQuality(state, new Set(['rs_brigade']));
        // Expected: 0.60 + (-0.0028) * (1 - 0.60 * 0.5) = 0.60 - 0.0028 * 0.70 = 0.59804
        assert.ok(
            Math.abs(f.officer_quality! - 0.59804) < TOLERANCE,
            `Negative-band growth expected 0.59804, got ${f.officer_quality}. ` +
                `Negative values must decrement officer_quality through the dampener.`,
        );
    });

    it('clamps officer_quality at OFFICER_QUALITY_FLOOR when negative band over-decrements', () => {
        const f = makeFormation({
            id: 'rs_brigade',
            faction: 'RS',
            officer_quality: OFFICER_QUALITY_FLOOR + 0.001, // just above floor
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            { rs_brigade: f },
            {
                RS: {
                    faction: 'RS',
                    learning_rate_per_turn_step_curve: [
                        { start_turn: 0, end_turn: 9999, value: -1.0 }, // catastrophic decline
                    ],
                },
            },
            150,
        );
        updateBrigadeOfficerQuality(state, new Set(['rs_brigade']));
        assert.ok(
            f.officer_quality! >= OFFICER_QUALITY_FLOOR - TOLERANCE,
            `Officer quality clamped at OFFICER_QUALITY_FLOOR=${OFFICER_QUALITY_FLOOR}, got ${f.officer_quality}. ` +
                `Negative bands must not push quality below floor.`,
        );
        assert.ok(
            Math.abs(f.officer_quality! - OFFICER_QUALITY_FLOOR) < TOLERANCE,
            `Officer quality should equal floor exactly after over-decrement, got ${f.officer_quality}`,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §6: Faction-symmetric mechanism check — three factions, same code path
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 faction-symmetric mechanism", () => {
    it('applies the same step-curve mechanism for all three canonical factions', () => {
        // Same step-curve, different factions — should produce identical deltas
        // when starting from identical quality. Mechanism is faction-symmetric.
        const sharedCurve = [
            { start_turn: 0, end_turn: 9999, value: 0.005 },
        ];
        const fRBiH = makeFormation({
            id: 'rbih_brigade',
            faction: 'RBiH',
            officer_quality: 0.40,
            kind: 'brigade',
        });
        const fRS = makeFormation({
            id: 'rs_brigade',
            faction: 'RS',
            officer_quality: 0.40,
            kind: 'brigade',
        });
        const fHRHB = makeFormation({
            id: 'hrhb_brigade',
            faction: 'HRHB',
            officer_quality: 0.40,
            kind: 'brigade',
        });
        const state = makeStateWithTimeline(
            {
                rbih_brigade: fRBiH,
                rs_brigade: fRS,
                hrhb_brigade: fHRHB,
            },
            {
                RBiH: { faction: 'RBiH', learning_rate_per_turn_step_curve: sharedCurve },
                RS: { faction: 'RS', learning_rate_per_turn_step_curve: sharedCurve },
                HRHB: { faction: 'HRHB', learning_rate_per_turn_step_curve: sharedCurve },
            },
            10,
        );
        updateBrigadeOfficerQuality(
            state,
            new Set(['rbih_brigade', 'rs_brigade', 'hrhb_brigade']),
        );
        // All three should have identical resulting quality (faction-symmetric mechanism).
        // Expected: 0.40 + 0.005 * (1 - 0.40 * 0.5) = 0.40 + 0.005 * 0.80 = 0.404
        const expected = 0.404;
        assert.ok(
            Math.abs(fRBiH.officer_quality! - expected) < TOLERANCE,
            `RBiH expected ${expected}, got ${fRBiH.officer_quality}`,
        );
        assert.ok(
            Math.abs(fRS.officer_quality! - expected) < TOLERANCE,
            `RS expected ${expected}, got ${fRS.officer_quality}`,
        );
        assert.ok(
            Math.abs(fHRHB.officer_quality! - expected) < TOLERANCE,
            `HRHB expected ${expected}, got ${fHRHB.officer_quality}`,
        );
        // Use FACTION_LEARNING_RATE constant (anchors the import; defends
        // against accidental dead-code removal during refactor).
        assert.ok(
            FACTION_LEARNING_RATE.RS === 0.7,
            `FACTION_LEARNING_RATE.RS expected 0.7, got ${FACTION_LEARNING_RATE.RS}`,
        );
        assert.ok(
            COMBAT_GROWTH_BASE === 0.01,
            `COMBAT_GROWTH_BASE expected 0.01, got ${COMBAT_GROWTH_BASE}`,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// §7: Frontline scaling preserves the 0.5× ratio for the step-curve path
// ═══════════════════════════════════════════════════════════════════════════

describe("B'.2 frontline ratio is 0.5× combat growth", () => {
    it('frontline growth = 0.5 × combat growth when step-curve is the active path', () => {
        const fCombat = makeFormation({
            id: 'combat_brigade',
            faction: 'RS',
            officer_quality: 0.30,
            kind: 'brigade',
            posture: 'attack',
        } as unknown as Partial<FormationState>);
        const fFrontline = makeFormation({
            id: 'frontline_brigade',
            faction: 'RS',
            officer_quality: 0.30,
            kind: 'brigade',
            posture: 'attack',
        } as unknown as Partial<FormationState>);
        const state = makeStateWithTimeline(
            { combat_brigade: fCombat, frontline_brigade: fFrontline },
            {
                RS: {
                    faction: 'RS',
                    learning_rate_per_turn_step_curve: [
                        { start_turn: 0, end_turn: 9999, value: 0.020 },
                    ],
                },
            },
            10,
        );
        // Disable live sector truth so posture fallback is used.
        state.military.corps_front_sectors =
            undefined as unknown as GameState['military']['corps_front_sectors'];
        updateBrigadeOfficerQuality(state, new Set(['combat_brigade']));

        const combatGrowth = fCombat.officer_quality! - 0.30;
        const frontlineGrowth = fFrontline.officer_quality! - 0.30;
        assert.ok(
            Math.abs(frontlineGrowth - 0.5 * combatGrowth) < TOLERANCE,
            `Frontline ratio expected 0.5×combat (combat=${combatGrowth}, frontline=${frontlineGrowth})`,
        );
        // Sanity: combat growth at rate 0.020, dampener 0.85 → 0.017
        assert.ok(
            Math.abs(combatGrowth - 0.017) < TOLERANCE,
            `Combat growth expected 0.017, got ${combatGrowth}`,
        );
    });
});
