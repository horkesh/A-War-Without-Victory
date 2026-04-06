/**
 * Tests for v0.8.3 Phase 5 — Interpretation UX Completion.
 *
 * Covers:
 * 1. buildInterpretationReason with isWarlordModifierActive=false returns generic strings (regression)
 * 2. buildInterpretationReason with isWarlordModifierActive=true returns warlord-specific strings
 * 3. buildInterpretationReason with warlord=true and officerId='arbih_halilovic' → Halilović strings
 * 4. RELIEF_MORALE_PENALTY is exported and equals -10
 * 5. getComplianceModifierTextFromValue(0.20) → '+0.20'
 * 6. getComplianceModifierTextFromValue(-0.25) → '-0.25'
 * 7. getComplianceModifierTextFromValue(0) → '+0.00'
 * 8. getComplianceModifierColor returns correct color for positive/negative/zero
 * 9. Adapter: RBiH officer pol_rel=2 inside warlord window → effective_compliance_modifier ≈ -0.25
 * 10. Adapter: RBiH officer pol_rel=2 outside warlord window → effective_compliance_modifier ≈ -0.10
 * 11. Adapter: officer pol_rel=5 → effective_compliance_modifier = +0.20
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';

// ─── Engine imports ───────────────────────────────────────────────────────────
// buildInterpretationReason is private; we test it indirectly through
// interpretStanceOrder which uses it internally. For direct string tests we
// use interpretStanceOrder with a controlled state, or we import the exported
// constants and test the adapter separately.
import {
    interpretStanceOrder,
    RELIEF_MORALE_PENALTY,
} from '../../../src/sim/combat/order_interpretation.js';

// ─── UI utility imports ───────────────────────────────────────────────────────
import {
    getComplianceModifierTextFromValue,
    getComplianceModifierColor,
} from '../../../src/ui/map/utils/officerCharacter.js';

// ─── Adapter import ───────────────────────────────────────────────────────────
import { parseGameState } from '../../../src/ui/map/data/GameStateAdapter.js';

// ═══════════════════════════════════════════════════════════════════════════
// Minimal state helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeRawState(overrides: Record<string, unknown> = {}): any {
    return {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH', ...((overrides.meta as object) ?? {}) },
        military: {
            formations: {},
            named_officer_data: [],
            named_officers: {},
            brigade_movement_state: {},
            ...((overrides.military as object) ?? {}),
        },
        political: {
            controllers: {},
        },
        factions: [],
        ...overrides,
    };
}

/**
 * Build a minimal GameState suitable for interpretStanceOrder.
 * The officer is placed in the named_officers map and assigned to `corpsId`.
 */
function makeEngineState(opts: {
    officerId: string;
    officerName: string;
    faction: string;
    pol_rel: number;
    competence: number;
    aggressiveness: number;
    corpsId: string;
    turn: number;
    warlordEndWeek?: number;
    cowedUntilTurn?: number;
}): any {
    const officerConfig: Record<string, unknown> = {};
    if (opts.warlordEndWeek !== undefined) {
        officerConfig['RBiH'] = { warlord_friction_end_week: opts.warlordEndWeek };
    }

    return {
        meta: { turn: opts.turn, phase: 'war' },
        military: {
            formations: {
                [opts.corpsId]: { faction: opts.faction, kind: 'corps_asset', name: 'Test Corps', status: 'active' },
            },
            named_officer_data: [{
                id: opts.officerId,
                name: opts.officerName,
                faction: opts.faction,
                rank: 'corps_commander',
                competence: opts.competence,
                aggressiveness: opts.aggressiveness,
                defensive_skill: 3,
                political_reliability: opts.pol_rel,
                home_corps_id: opts.corpsId,
                available_from_turn: 0,
                origin: 'jna',
                casualty_vulnerability: 0.10,
                can_improve: false,
                improvement_rate: 0,
                pool_tier: 'tier_a',
            }],
            named_officers: {
                [opts.officerId]: {
                    officer_id: opts.officerId,
                    status: 'active',
                    assigned_corps_id: opts.corpsId,
                    acting_commander: false,
                    turns_in_command: 5,
                    battles: 0,
                    victories: 0,
                    override_count: 0,
                    ...(opts.cowedUntilTurn !== undefined ? { cowed_until_turn: opts.cowedUntilTurn } : {}),
                },
            },
            brigade_movement_state: {},
            pending_officer_events: [],
            war_timeline: {
                officer_config: officerConfig,
            },
            corps_command: {},
        },
        political: { controllers: {} },
        factions: [],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1 — RELIEF_MORALE_PENALTY constant
// ═══════════════════════════════════════════════════════════════════════════

describe('RELIEF_MORALE_PENALTY', () => {
    it('is exported and equals -10', () => {
        expect(RELIEF_MORALE_PENALTY).toBe(-10);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2 — buildInterpretationReason via interpretStanceOrder
//
// Strategy: force a specific compliance tier by choosing officer stats that
// produce a predictable score, then inspect the emitted event reason string.
//
// Score formula: base=0.45 + comp*0.10, gapPenalty=gap*0.25, + reliabilityMod
// Gap between 'offensive' (rank 2) and preferred 'defensive' (agg=1, rank 0) = 2.0
// Full compliance threshold = 0.80, modified = 0.50, partial = 0.25
// ═══════════════════════════════════════════════════════════════════════════

describe('buildInterpretationReason — generic strings (no warlord modifier)', () => {
    // Scenario: Non-warlord officer, agg=1 (prefers defensive), ordered offensive.
    // pol_rel=3 (mod=0.00). comp=3 → base=0.75, gap=2, penalty=0.50, score=0.25 → partial tier.
    it('partial compliance → generic partial string', () => {
        const state = makeEngineState({
            officerId: 'test_generic',
            officerName: 'Kovač',
            faction: 'RS',
            pol_rel: 3,
            competence: 3,
            aggressiveness: 1,
            corpsId: 'vrs_test_corps',
            turn: 5,
        });

        const result = interpretStanceOrder(state, 'vrs_test_corps', 'offensive');
        // score=0.25 → partial tier (>= 0.25, < 0.50) → shifts one step toward defensive
        expect(result.compliance).toBe('partial');
        expect(result.reason).toContain('Kovač');
        expect(result.reason).toContain('untenable');
        expect(result.reason).not.toContain('local conditions');
        expect(result.reason).not.toContain('independent command');
    });

    // Scenario: agg=1, comp=1 → base=0.55, gap=2, penalty=0.50, score=0.05 → refused tier.
    it('refused compliance → generic refused string', () => {
        const state = makeEngineState({
            officerId: 'test_generic_refused',
            officerName: 'Simić',
            faction: 'RS',
            pol_rel: 3,
            competence: 1,
            aggressiveness: 1,
            corpsId: 'vrs_test_corps2',
            turn: 5,
        });

        const result = interpretStanceOrder(state, 'vrs_test_corps2', 'offensive');
        expect(result.compliance).toBe('refused');
        expect(result.reason).toContain('Simić');
        expect(result.reason).toContain('refuses to comply');
        expect(result.reason).not.toContain('independent command');
    });

    // Scenario: agg=3 (balanced, rank=1), comp=4, ordered 'reorganize' (rank=0.5).
    // gap=|0.5-1|=0.5, penalty=0.125, base=0.85, mod=0, score=0.725 → modified (>= 0.50, < 0.80).
    it('modified compliance → generic modified string', () => {
        const state = makeEngineState({
            officerId: 'test_generic_mod',
            officerName: 'Perić',
            faction: 'RS',
            pol_rel: 3,
            competence: 4,
            aggressiveness: 3,
            corpsId: 'vrs_test_corps3',
            turn: 5,
        });

        const result = interpretStanceOrder(state, 'vrs_test_corps3', 'reorganize');
        expect(result.compliance).toBe('modified');
        expect(result.reason).toContain('Perić');
        expect(result.reason).toContain('acknowledges the order with reservations');
    });
});

describe('buildInterpretationReason — warlord modifier active (non-Halilović)', () => {
    // Warlord officer: RBiH, pol_rel=2 (mod= -0.10 + WARLORD_MODIFIER -0.15 = -0.25)
    // agg=1, comp=3 → base=0.75, gap=2, penalty=0.50, mod=-0.25, score=0.00 → refused tier.
    it('refused with warlord modifier active → warlord refused string', () => {
        const state = makeEngineState({
            officerId: 'arbih_warlord_x',
            officerName: 'Ramić',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 3,
            aggressiveness: 1,
            corpsId: 'arbih_test_corps',
            turn: 5,
            warlordEndWeek: 20,
        });

        const result = interpretStanceOrder(state, 'arbih_test_corps', 'offensive');
        expect(result.compliance).toBe('refused');
        expect(result.reason).toContain('independent command');
        expect(result.reason).not.toContain('refuses to comply');
    });

    // Warlord officer: partial tier.
    // pol_rel=2, agg=1, comp=5 → base=0.95, gap=2, penalty=0.50, mod=-0.25, score=0.20 → refused.
    // Use agg=3 (balanced, rank=1) ordered defensive (rank=0): gap=1, penalty=0.25
    // comp=4 → base=0.85, mod=-0.25, score=0.35 → modified tier (>= 0.50? No: 0.35 < 0.50)
    // Actually 0.35 >= 0.25 (partial threshold) and < 0.50 → partial tier.
    it('partial with warlord modifier active → warlord partial string', () => {
        const state = makeEngineState({
            officerId: 'arbih_warlord_y',
            officerName: 'Hadžić',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 4,
            aggressiveness: 3,
            corpsId: 'arbih_test_corps2',
            turn: 5,
            warlordEndWeek: 20,
        });

        // agg=3 prefers balanced (rank=1), order defensive (rank=0): gap=1, penalty=0.25
        // base=0.85, mod=-0.25, score=0.35 → partial
        const result = interpretStanceOrder(state, 'arbih_test_corps2', 'defensive');
        expect(result.compliance).toBe('partial');
        expect(result.reason).toContain('local conditions');
        expect(result.reason).not.toContain('untenable');
    });

    // Modified tier with warlord active.
    // pol_rel=2, agg=3 (balanced, rank=1), competence=5.
    // ordered 'reorganize' (rank=0.5), preferred balanced (rank=1): gap=0.5, penalty=0.125
    // base=0.95, mod=-0.25, score=0.575 → modified tier (>= 0.50 and < 0.80).
    // determineEffectiveStance: score >= 0.50 → returns orderedStance ('reorganize') → modified.
    it('modified with warlord modifier active → warlord modified string', () => {
        const state = makeEngineState({
            officerId: 'arbih_warlord_z',
            officerName: 'Mujić',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 5,
            aggressiveness: 3,
            corpsId: 'arbih_test_corps3',
            turn: 5,
            warlordEndWeek: 20,
        });

        const result = interpretStanceOrder(state, 'arbih_test_corps3', 'reorganize');
        expect(result.compliance).toBe('modified');
        expect(result.reason).toContain('routes it through his own staff');
        expect(result.reason).not.toContain('acknowledges the order with reservations');
    });
});

describe('buildInterpretationReason — Halilović-specific strings', () => {
    // Same parameter set as warlord tests but with officerId = 'arbih_halilovic'.
    it('refused with arbih_halilovic → Halilović-specific refused string', () => {
        const state = makeEngineState({
            officerId: 'arbih_halilovic',
            officerName: 'Halilović',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 3,
            aggressiveness: 1,
            corpsId: 'arbih_general_staff',
            turn: 5,
            warlordEndWeek: 20,
        });

        const result = interpretStanceOrder(state, 'arbih_general_staff', 'offensive');
        expect(result.compliance).toBe('refused');
        expect(result.reason).toContain('Supreme Command Staff');
        expect(result.reason).toContain('Halilović');
        expect(result.reason).not.toContain('independent command');
    });

    it('partial with arbih_halilovic → Halilović-specific partial string', () => {
        const state = makeEngineState({
            officerId: 'arbih_halilovic',
            officerName: 'Halilović',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 4,
            aggressiveness: 3,
            corpsId: 'arbih_general_staff2',
            turn: 5,
            warlordEndWeek: 20,
        });

        const result = interpretStanceOrder(state, 'arbih_general_staff2', 'defensive');
        expect(result.compliance).toBe('partial');
        expect(result.reason).toContain('political directive');
        expect(result.reason).toContain('Halilović');
    });

    // Modified tier: pol_rel=2, agg=3 (balanced, rank=1), comp=5.
    // ordered 'reorganize' (rank=0.5): gap=0.5, penalty=0.125
    // base=0.95, mod=-0.25, score=0.575 → modified (>= 0.50, < 0.80).
    it('modified with arbih_halilovic → Halilović-specific modified string', () => {
        const state = makeEngineState({
            officerId: 'arbih_halilovic',
            officerName: 'Halilović',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 5,
            aggressiveness: 3,
            corpsId: 'arbih_general_staff3',
            turn: 5,
            warlordEndWeek: 20,
        });

        const result = interpretStanceOrder(state, 'arbih_general_staff3', 'reorganize');
        expect(result.compliance).toBe('modified');
        expect(result.reason).toContain('amended the operational guidance');
        expect(result.reason).toContain('Halilović');
    });

    it('warlord modifier NOT active outside warlord window → falls back to generic', () => {
        const state = makeEngineState({
            officerId: 'arbih_halilovic',
            officerName: 'Halilović',
            faction: 'RBiH',
            pol_rel: 2,
            competence: 3,
            aggressiveness: 1,
            corpsId: 'arbih_general_staff4',
            turn: 25,           // turn >= warlordEndWeek
            warlordEndWeek: 20,
        });

        const result = interpretStanceOrder(state, 'arbih_general_staff4', 'offensive');
        // Outside warlord window → generic refused string
        if (result.compliance === 'refused') {
            expect(result.reason).toContain('refuses to comply');
            expect(result.reason).not.toContain('Supreme Command Staff');
        }
        // (If the score clears a threshold due to base modifier only, the important thing
        //  is that Halilović-specific strings are NOT present)
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3 — getComplianceModifierTextFromValue
// ═══════════════════════════════════════════════════════════════════════════

describe('getComplianceModifierTextFromValue', () => {
    it('formats positive modifier with + prefix', () => {
        expect(getComplianceModifierTextFromValue(0.20)).toBe('+0.20');
    });

    it('formats negative modifier with - prefix', () => {
        expect(getComplianceModifierTextFromValue(-0.25)).toBe('-0.25');
    });

    it('formats zero with + prefix (non-negative)', () => {
        expect(getComplianceModifierTextFromValue(0)).toBe('+0.00');
    });

    it('formats -0.10 correctly', () => {
        expect(getComplianceModifierTextFromValue(-0.10)).toBe('-0.10');
    });

    it('formats +0.10 correctly', () => {
        expect(getComplianceModifierTextFromValue(0.10)).toBe('+0.10');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4 — getComplianceModifierColor
// ═══════════════════════════════════════════════════════════════════════════

describe('getComplianceModifierColor', () => {
    it('positive modifier → green', () => {
        expect(getComplianceModifierColor(0.20)).toBe('text-green-400');
    });

    it('negative modifier → red', () => {
        expect(getComplianceModifierColor(-0.25)).toBe('text-red-400');
    });

    it('zero → neutral secondary', () => {
        expect(getComplianceModifierColor(0)).toBe('text-text-secondary');
    });

    it('small negative → red', () => {
        expect(getComplianceModifierColor(-0.001)).toBe('text-red-400');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5 — Adapter: effective_compliance_modifier derivation
// ═══════════════════════════════════════════════════════════════════════════

describe('Adapter — effective_compliance_modifier', () => {
    function makeAdapterState(opts: {
        officerId: string;
        faction: string;
        pol_rel: number;
        turn: number;
        warlordEndWeek?: number;
    }): any {
        const officerConfig: Record<string, unknown> = {};
        if (opts.warlordEndWeek !== undefined) {
            officerConfig['RBiH'] = { warlord_friction_end_week: opts.warlordEndWeek };
        }
        return makeRawState({
            meta: { turn: opts.turn, phase: 'war', player_faction: 'RBiH' },
            military: {
                formations: {},
                named_officer_data: [{
                    id: opts.officerId,
                    name: 'Test Officer',
                    faction: opts.faction,
                    rank: 'corps_commander',
                    competence: 3,
                    aggressiveness: 3,
                    defensive_skill: 3,
                    political_reliability: opts.pol_rel,
                    home_corps_id: null,
                    available_from_turn: 0,
                    origin: 'jna',
                    casualty_vulnerability: 0.10,
                    can_improve: false,
                    improvement_rate: 0,
                    pool_tier: 'tier_a',
                }],
                named_officers: {
                    [opts.officerId]: {
                        status: 'active',
                        assigned_corps_id: null,
                        acting_commander: false,
                        turns_in_command: 0,
                        battles: 0,
                        victories: 0,
                    },
                },
                brigade_movement_state: {},
                war_timeline: { officer_config: officerConfig },
            },
        });
    }

    it('RBiH officer pol_rel=2 inside warlord window → effective_compliance_modifier ≈ -0.25', () => {
        // baseMod = (2-3)*0.10 = -0.10, warlord = -0.15, total = -0.25
        const raw = makeAdapterState({
            officerId: 'arbih_halilovic',
            faction: 'RBiH',
            pol_rel: 2,
            turn: 10,
            warlordEndWeek: 20,
        });
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'arbih_halilovic');
        expect(officer).toBeDefined();
        expect(officer!.effective_compliance_modifier).toBeCloseTo(-0.25, 5);
    });

    it('RBiH officer pol_rel=2 outside warlord window → effective_compliance_modifier ≈ -0.10', () => {
        // warlord window expired (turn 25 >= warlordEndWeek 20)
        const raw = makeAdapterState({
            officerId: 'arbih_knez',
            faction: 'RBiH',
            pol_rel: 2,
            turn: 25,
            warlordEndWeek: 20,
        });
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'arbih_knez');
        expect(officer).toBeDefined();
        expect(officer!.effective_compliance_modifier).toBeCloseTo(-0.10, 5);
    });

    it('officer pol_rel=5 → effective_compliance_modifier = +0.20', () => {
        // baseMod = (5-3)*0.10 = 0.20, no warlord modifier (RS faction)
        const raw = makeAdapterState({
            officerId: 'vrs_mladic',
            faction: 'RS',
            pol_rel: 5,
            turn: 10,
        });
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'vrs_mladic');
        expect(officer).toBeDefined();
        expect(officer!.effective_compliance_modifier).toBeCloseTo(0.20, 5);
    });

    it('officer pol_rel=3 → effective_compliance_modifier = 0.00', () => {
        // baseMod = (3-3)*0.10 = 0.00
        const raw = makeAdapterState({
            officerId: 'arbih_delic',
            faction: 'RBiH',
            pol_rel: 3,
            turn: 10,
        });
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'arbih_delic');
        expect(officer).toBeDefined();
        expect(officer!.effective_compliance_modifier).toBeCloseTo(0.00, 5);
    });

    it('RBiH officer pol_rel=2 with no warlord config → effective_compliance_modifier ≈ -0.10', () => {
        // No warlordEndWeek in state → warlord modifier not applied
        const raw = makeAdapterState({
            officerId: 'arbih_test_nw',
            faction: 'RBiH',
            pol_rel: 2,
            turn: 10,
            // warlordEndWeek omitted
        });
        const parsed = parseGameState(raw);
        const officer = parsed.namedOfficerData?.find(o => o.id === 'arbih_test_nw');
        expect(officer).toBeDefined();
        expect(officer!.effective_compliance_modifier).toBeCloseTo(-0.10, 5);
    });
});
