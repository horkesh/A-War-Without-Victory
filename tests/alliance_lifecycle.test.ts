/**
 * Peace-phase §4.8: RBiH–HRHB alliance lifecycle tests.
 * Tests: alliance update, ceasefire, Washington Agreement, minority erosion, mixed municipalities.
 * Determinism: all tests verify identical outputs for identical inputs (no randomness).
 */

import { describe, expect, test } from 'vitest';
import {
    ALLIANCE_FLOOR_BEFORE_WAR,
    areRbihHrhbAllied,
    CEASEFIRE_RECOVERY_RATE,
    computeRefugeePressure,
    countBilateralFlips,
    DEFAULT_INIT_ALLIANCE,
    DEFAULT_MIXED_MUNICIPALITIES,
    ensureRbihHrhbState,
    getAlliancePhase,
    HOSTILE_THRESHOLD,
    isRbihHrhbAtWar,
    REFUGEE_PRESSURE_RATE,
    REFUGEE_PRESSURE_RATIO_CAP,
    updateAllianceValue
} from '../src/sim/early_war/alliance_update.js';
import {
    CEASEFIRE_HRHB_EXHAUSTION,
    CEASEFIRE_IVP_THRESHOLD,
    CEASEFIRE_MIN_WAR_DURATION,
    CEASEFIRE_PATRON_CONSTRAINT,
    CEASEFIRE_RBIH_EXHAUSTION,
    CEASEFIRE_STALEMATE_MIN,
    checkAndApplyCeasefire,
    evaluateCeasefirePreconditions
} from '../src/sim/early_war/bilateral_ceasefire.js';
import { MINORITY_EROSION_RATE_PER_TURN, runMinorityErosion } from '../src/sim/early_war/minority_erosion.js';
import { ALLIED_COORDINATION_FACTOR, computeAlliedDefense } from '../src/sim/early_war/mixed_municipality.js';
import {
    checkAndApplyWashington,
    evaluateWashingtonPreconditions,
    POST_WASH_CROATIAN_SUPPORT,
    POST_WASH_EQUIPMENT_ACCESS,
    WASH_ALLIANCE_LOCK_VALUE,
    WASH_CEASEFIRE_DURATION
} from '../src/sim/early_war/washington_agreement.js';
import type { DisplacementState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Minimal GameState for alliance tests. */
function makeState(overrides?: Partial<GameState>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'alliance-test', phase: 'war', referendum_held: true, war_start_turn: 1 },
        factions: [
            {
                id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: false, declaration_turn: null
            },
            {
                id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 1
            },
            {
                id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [], supply_sources: [], declared: true, declaration_turn: 2,
                patron_state: { material_support_level: 0.5, diplomatic_isolation: 0.2, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 5 }
            }
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {}
        } as any,
        political: {
            political_controllers: {},
            municipalities: {},
            settlements: {}
        } as any,
        displacement: {} as DisplacementState,
        ...overrides,
    } as unknown as GameState;
}

// ── Alliance Update Tests ──

describe('alliance update', () => {
    test('ensureRbihHrhbState initializes with defaults', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        expect(state.political.war_alliance_rbih_hrhb).toBe(DEFAULT_INIT_ALLIANCE);
        expect(state.political.rbih_hrhb_state).toBeTruthy();
        expect(state.political.rbih_hrhb_state!.allied_mixed_municipalities).toEqual([...DEFAULT_MIXED_MUNICIPALITIES].sort());
        expect(state.political.rbih_hrhb_state!.ceasefire_active).toBe(false);
        expect(state.political.rbih_hrhb_state!.washington_signed).toBe(false);
    });

    test('ensureRbihHrhbState uses custom init value', () => {
        const state = makeState();
        ensureRbihHrhbState(state, 0.50, ['travnik', 'mostar']);
        expect(state.political.war_alliance_rbih_hrhb).toBe(0.50);
        expect(state.political.rbih_hrhb_state!.allied_mixed_municipalities).toEqual(['mostar', 'travnik']);
    });

    test('updateAllianceValue decreases with patron pressure', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        ensureRbihHrhbState(state);
        const report = updateAllianceValue(state);
        // patron_commitment is 0.5, so patron_drag = 0.015 * 0.5 = 0.0075
        // appeasement = 0.003 (no incidents)
        // delta = 0.003 - 0.0075 = -0.0045
        expect(report.delta < 0).toBeTruthy();
        expect(report.previous_value).toBe(0.35);
        expect(report.new_value).toBe(ALLIANCE_FLOOR_BEFORE_WAR);
    });

    test('updateAllianceValue includes ceasefire recovery', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.20
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.ceasefire_active = true;
        state.political.rbih_hrhb_state!.ceasefire_since_turn = 8;
        const report = updateAllianceValue(state);
        expect(report.drivers.ceasefire_boost > 0).toBeTruthy();
        expect(report.drivers.ceasefire_boost).toBe(CEASEFIRE_RECOVERY_RATE);
    });

    test('updateAllianceValue is locked when Washington signed', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.80
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.washington_signed = true;
        state.political.rbih_hrhb_state!.washington_turn = 5;
        const report = updateAllianceValue(state);
        expect(report.locked).toBe(true);
        expect(report.delta).toBe(0);
        expect(report.new_value).toBe(0.80);
    });

    test('updateAllianceValue detects war start', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.01
  } as any,
});
        ensureRbihHrhbState(state);
        state.meta.rbih_hrhb_war_earliest_turn = 26;
        state.meta.turn = 30;
        // Set large patron pressure to push below 0
        const hrhbFaction = state.factions.find((f) => f.id === 'HRHB')!;
        hrhbFaction.patron_state!.patron_commitment = 1.0;
        // Also add incident penalty
        state.political.rbih_hrhb_state!.bilateral_flips_this_turn = 2;
        const report = updateAllianceValue(state);
        expect(report.new_value <= HOSTILE_THRESHOLD).toBeTruthy();
        expect(report.war_started_this_turn).toBe(true);
        expect(state.political.rbih_hrhb_state!.war_started_turn).toBe(state.meta.turn);
    });

    test('countBilateralFlips counts correctly', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        const flips = [
            { mun_id: 'travnik', from_faction: 'RBiH' as string, to_faction: 'HRHB' as string },
            { mun_id: 'banja_luka', from_faction: 'RBiH' as string, to_faction: 'RS' as string },
            { mun_id: 'vitez', from_faction: 'HRHB' as string, to_faction: 'RBiH' as string }
        ];
        const count = countBilateralFlips(state, flips);
        expect(count).toBe(2);
        expect(state.political.rbih_hrhb_state!.bilateral_flips_this_turn).toBe(2);
        expect(state.political.rbih_hrhb_state!.total_bilateral_flips).toBe(2);
    });

    test('stalemate counter increments on zero flips', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.stalemate_turns = 3;
        countBilateralFlips(state, []);
        expect(state.political.rbih_hrhb_state!.stalemate_turns).toBe(4);
    });

    test('stalemate counter resets on bilateral flip', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.stalemate_turns = 5;
        countBilateralFlips(state, [{ mun_id: 'travnik', from_faction: 'RBiH', to_faction: 'HRHB' }]);
        expect(state.political.rbih_hrhb_state!.stalemate_turns).toBe(0);
    });
});

// ── Alliance Phase Tests ──

describe('alliance phase', () => {
    test('getAlliancePhase returns correct phases', () => {
        expect(getAlliancePhase(0.60)).toBe('strong_alliance');
        expect(getAlliancePhase(0.35)).toBe('fragile_alliance');
        expect(getAlliancePhase(0.10)).toBe('strained');
        expect(getAlliancePhase(-0.20)).toBe('open_war');
        expect(getAlliancePhase(-0.60)).toBe('full_war');
    });

    test('areRbihHrhbAllied returns true when above threshold', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.30
  } as any,
});
        expect(areRbihHrhbAllied(state)).toBe(true);
    });

    test('areRbihHrhbAllied returns false when at or below threshold', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.20
  } as any,
});
        expect(areRbihHrhbAllied(state)).toBe(false);
    });

    test('areRbihHrhbAllied defaults to true when absent', () => {
        const state = makeState();
        expect(areRbihHrhbAllied(state)).toBe(true);
    });

    test('isRbihHrhbAtWar returns true below hostile threshold', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.10
  } as any,
});
        expect(isRbihHrhbAtWar(state)).toBe(true);
    });
});

// ── Ceasefire Tests ──

describe('bilateral ceasefire', () => {
    test('evaluateCeasefirePreconditions all false when no state', () => {
        const state = makeState();
        const result = evaluateCeasefirePreconditions(state);
        expect(result.all_met).toBe(false);
    });

    test('ceasefire fires when all preconditions met', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.30
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.war_started_turn = 5;
        state.political.rbih_hrhb_state!.stalemate_turns = CEASEFIRE_STALEMATE_MIN;
        state.meta.turn = 5 + CEASEFIRE_MIN_WAR_DURATION + 1;
        // Set exhaustion
        state.political.war_exhaustion = { RBiH: CEASEFIRE_RBIH_EXHAUSTION + 1, RS: 10, HRHB: CEASEFIRE_HRHB_EXHAUSTION + 1 };
        // Set IVP
        state.political.international_visibility_pressure = {
            sarajevo_siege_visibility: 0, enclave_humanitarian_pressure: 0,
            atrocity_visibility: 0, negotiation_momentum: CEASEFIRE_IVP_THRESHOLD + 0.01,
            last_major_shift: null
        };
        // Set patron constraint
        const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
        hrhb.patron_state!.constraint_severity = CEASEFIRE_PATRON_CONSTRAINT + 0.01;

        const report = checkAndApplyCeasefire(state);
        expect(report.preconditions.all_met).toBe(true);
        expect(report.fired).toBe(true);
        expect(state.political.rbih_hrhb_state!.ceasefire_active).toBe(true);
        expect(state.political.rbih_hrhb_state!.ceasefire_since_turn).toBe(state.meta.turn);
    });

    test('ceasefire does not re-fire when already active', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.20
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.ceasefire_active = true;
        state.political.rbih_hrhb_state!.ceasefire_since_turn = 20;
        const report = checkAndApplyCeasefire(state);
        expect(report.fired).toBe(false);
        expect(report.already_active).toBe(true);
    });
});

// ── Washington Agreement Tests ──

describe('washington agreement', () => {
    test('evaluateWashingtonPreconditions all false when no ceasefire', () => {
        const state = makeState();
        ensureRbihHrhbState(state);
        const result = evaluateWashingtonPreconditions(state);
        expect(result.w1_ceasefire_active).toBe(false);
        expect(result.all_met).toBe(false);
    });

    test('washington fires when all preconditions met', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.10
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.ceasefire_active = true;
        state.political.rbih_hrhb_state!.ceasefire_since_turn = 90;
        state.meta.turn = 90 + WASH_CEASEFIRE_DURATION + 1;
        // Set exhaustion
        state.political.war_exhaustion = { RBiH: 30, RS: 20, HRHB: 30 };
        // Set IVP
        state.political.international_visibility_pressure = {
            sarajevo_siege_visibility: 0, enclave_humanitarian_pressure: 0,
            atrocity_visibility: 0, negotiation_momentum: 0.55,
            last_major_shift: null
        };
        // Set patron constraint
        const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
        hrhb.patron_state!.constraint_severity = 0.60;
        hrhb.capability_profile = { year: 1994, equipment_access: 0.4, training_quality: 0.5, organizational_maturity: 0.5, croatian_support: 0.3 };
        hrhb.embargo_profile = { heavy_equipment_access: 0.3, ammunition_resupply_rate: 0.4, maintenance_capacity: 0.3, smuggling_efficiency: 0.3, external_pipeline_status: 0.4 };
        // Set RS territorial share > 0.40
        const pc: Record<string, string | null> = {};
        for (let i = 0; i < 100; i++) {
            pc[`S${i}`] = i < 45 ? 'RS' : i < 75 ? 'RBiH' : 'HRHB';
        }
        state.political.political_controllers = pc;

        const report = checkAndApplyWashington(state);
        expect(report.preconditions.all_met).toBe(true);
        expect(report.fired).toBe(true);
        expect(state.political.war_alliance_rbih_hrhb).toBe(WASH_ALLIANCE_LOCK_VALUE);
        expect(state.political.rbih_hrhb_state!.washington_signed).toBe(true);
        expect(hrhb.capability_profile!.equipment_access).toBe(POST_WASH_EQUIPMENT_ACCESS);
        expect(hrhb.capability_profile!.croatian_support).toBe(POST_WASH_CROATIAN_SUPPORT);
    });

    test('washington does not fire when already signed', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.80
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.washington_signed = true;
        const report = checkAndApplyWashington(state);
        expect(report.fired).toBe(false);
        expect(report.already_signed).toBe(true);
    });
});

// ── Minority Erosion Tests ──

describe('minority erosion', () => {
    test('no erosion when alliance above hostile threshold', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.30
  } as any,
});
        ensureRbihHrhbState(state);
        const report = runMinorityErosion(state);
        expect(report.municipalities_affected).toBe(0);
    });

    test('no erosion when ceasefire active', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.30
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.ceasefire_active = true;
        const report = runMinorityErosion(state);
        expect(report.municipalities_affected).toBe(0);
    });

    test('erosion occurs in mixed muns during open war', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: -0.30
  } as any,
});
        ensureRbihHrhbState(state);
        state.political.rbih_hrhb_state!.war_started_turn = 5;
        // Set militia: RBiH controls travnik, HRHB has minority militia
        state.military.war_militia_strength = {
            travnik: { RBiH: 100, HRHB: 200, RS: 0 }
        };
        // Need political_controllers for controller lookup
        // Build a minimal settlementsByMun
        const settlementsByMun = new Map<string, string[]>();
        settlementsByMun.set('travnik', ['S1', 'S2']);
        state.political.political_controllers = { S1: 'RBiH', S2: 'RBiH' };

        const report = runMinorityErosion(state, settlementsByMun);
        expect(report.municipalities_affected).toBe(1);
        expect(report.by_mun[0].minority_faction).toBe('HRHB');
        expect(report.by_mun[0].eroded > 0).toBeTruthy();
        expect(report.by_mun[0].militia_after).toBe(200 - Math.floor(200 * MINORITY_EROSION_RATE_PER_TURN));
    });
});

// ── Mixed Municipality Allied Defense Tests ──

describe('mixed municipality allied defense', () => {
    test('computeAlliedDefense adds allied militia when alliance is strong', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.60
  } as any,
});
        ensureRbihHrhbState(state);
        state.military.war_militia_strength = {
            travnik: { RBiH: 100, HRHB: 80, RS: 0 }
        };
        const effective = computeAlliedDefense(state, 'travnik', 'RBiH', 100);
        // 100 + (80 * 0.6) = 148
        expect(effective).toBe(100 + 80 * ALLIED_COORDINATION_FACTOR);
    });

    test('computeAlliedDefense returns controller only when not mixed mun', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.60
  } as any,
});
        ensureRbihHrhbState(state);
        state.military.war_militia_strength = {
            banja_luka: { RBiH: 100, HRHB: 0, RS: 80 }
        };
        const effective = computeAlliedDefense(state, 'banja_luka', 'RBiH', 100);
        expect(effective).toBe(100); // Not a mixed mun
    });

    test('computeAlliedDefense returns controller only when strained', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.10
  } as any,
}); // Below ALLIED_THRESHOLD
        ensureRbihHrhbState(state);
        state.military.war_militia_strength = {
            travnik: { RBiH: 100, HRHB: 80, RS: 0 }
        };
        const effective = computeAlliedDefense(state, 'travnik', 'RBiH', 100);
        expect(effective).toBe(100); // No coordination when strained
    });
});

// ── Determinism Tests ──

describe('alliance determinism', () => {
    test('two identical runs produce identical alliance updates', () => {
        const state1 = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        const state2 = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        ensureRbihHrhbState(state1);
        ensureRbihHrhbState(state2);
        const report1 = updateAllianceValue(state1);
        const report2 = updateAllianceValue(state2);
        expect(report1.new_value).toBe(report2.new_value);
        expect(report1.delta).toBe(report2.delta);
        expect(report1.phase).toBe(report2.phase);
    });

    test('serialized rbih_hrhb_state is deterministic', () => {
        const state1 = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        const state2 = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        ensureRbihHrhbState(state1);
        ensureRbihHrhbState(state2);
        expect(JSON.stringify(state1.political.rbih_hrhb_state)).toBe(JSON.stringify(state2.political.rbih_hrhb_state));
    });

    test('alliance update is idempotent given same state', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        ensureRbihHrhbState(state);
        const report1 = updateAllianceValue(state);
        // Run again on updated state
        const report2 = updateAllianceValue(state);
        // Second call should use updated value as previous
        expect(report2.previous_value).toBe(report1.new_value);
    });
});

// ── Full Lifecycle Smoke Test ──

describe('full alliance lifecycle', () => {
    test('alliance degrades from fragile to war to ceasefire to Washington', () => {
        const state = makeState({
  political: {
    war_alliance_rbih_hrhb: 0.35
  } as any,
});
        ensureRbihHrhbState(state);

        // Simulate turns: patron pressure degrades alliance
        const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
        hrhb.patron_state!.patron_commitment = 0.8;

        // Phase 1: Degrade alliance to strained / hostile
        let report;
        for (let i = 0; i < 80; i++) {
            state.meta.turn++;
            report = updateAllianceValue(state);
            // Simulate some bilateral flips during open war
            if (report.phase === 'open_war' || report.phase === 'full_war') {
                countBilateralFlips(state, [{ mun_id: 'travnik', from_faction: 'RBiH', to_faction: 'HRHB' }]);
            } else {
                countBilateralFlips(state, []);
            }
        }

        // Should have crossed into open war
        expect(state.political.rbih_hrhb_state!.war_started_turn !== null).toBe(true);
        expect(state.political.war_alliance_rbih_hrhb! <= HOSTILE_THRESHOLD).toBeTruthy();

        // Phase 2: Set up ceasefire conditions
        state.political.war_exhaustion = { RBiH: 35, RS: 20, HRHB: 40 };
        state.political.international_visibility_pressure = {
            sarajevo_siege_visibility: 0, enclave_humanitarian_pressure: 0,
            atrocity_visibility: 0, negotiation_momentum: 0.45,
            last_major_shift: null
        };
        hrhb.patron_state!.constraint_severity = 0.50;
        // Stop bilateral flips to build stalemate
        for (let i = 0; i < CEASEFIRE_STALEMATE_MIN + 1; i++) {
            state.meta.turn++;
            updateAllianceValue(state);
            countBilateralFlips(state, []);
        }

        const ceasefireReport = checkAndApplyCeasefire(state);
        expect(ceasefireReport.fired).toBe(true);

        // Phase 3: Alliance recovers during ceasefire
        for (let i = 0; i < WASH_CEASEFIRE_DURATION + 1; i++) {
            state.meta.turn++;
            updateAllianceValue(state);
            countBilateralFlips(state, []);
        }

        // Phase 4: Washington conditions
        state.political.international_visibility_pressure!.negotiation_momentum = 0.55;
        hrhb.patron_state!.constraint_severity = 0.60;
        const pc: Record<string, string | null> = {};
        for (let i = 0; i < 100; i++) {
            pc[`S${i}`] = i < 45 ? 'RS' : i < 75 ? 'RBiH' : 'HRHB';
        }
        state.political.political_controllers = pc;
        hrhb.capability_profile = { year: 1994, equipment_access: 0.4, training_quality: 0.5, organizational_maturity: 0.5, croatian_support: 0.3 };
        hrhb.embargo_profile = { heavy_equipment_access: 0.3, ammunition_resupply_rate: 0.4, maintenance_capacity: 0.3, smuggling_efficiency: 0.3, external_pipeline_status: 0.4 };

        const washReport = checkAndApplyWashington(state);
        expect(washReport.fired).toBe(true);
        expect(state.political.war_alliance_rbih_hrhb).toBe(WASH_ALLIANCE_LOCK_VALUE);
        expect(state.political.rbih_hrhb_state!.washington_signed).toBe(true);

        // Phase 5: Verify alliance locked
        state.meta.turn++;
        const lockedReport = updateAllianceValue(state);
        expect(lockedReport.locked).toBe(true);
        expect(lockedReport.new_value).toBe(WASH_ALLIANCE_LOCK_VALUE);
    });
});

// ── Phase B1: Refugee Pressure Tests ──

/** Helper: create a DisplacementState for a municipality. */
function makeDisplacementEntry(munId: string, originalPop: number, displacedIn: number): DisplacementState {
    return {
        mun_id: munId,
        original_population: originalPop,
        displaced_out: 0,
        displaced_in: displacedIn,
        lost_population: 0,
        last_updated_turn: 10
    };
}

describe('refugee pressure (Phase B1)', () => {
    test('computeRefugeePressure returns 0 when no displacement state', () => {
        const state = makeState();
        const pressure = computeRefugeePressure(state);
        expect(pressure).toBe(0);
    });

    test('computeRefugeePressure returns 0 when displacement below 5% threshold', () => {
        const state = makeState();
        (state as any).displacement = {
            displacement_state: {
                travnik: makeDisplacementEntry('travnik', 100000, 4000) // 4% < 5%
            }
        };
        const pressure = computeRefugeePressure(state);
        expect(pressure).toBe(0);
    });

    test('computeRefugeePressure calculates pressure for single municipality above threshold', () => {
        const state = makeState();
        // 10% ratio, well above 5% min, below 30% cap
        (state as any).displacement = {
            displacement_state: {
                travnik: makeDisplacementEntry('travnik', 100000, 10000) // 10%
            }
        };
        const pressure = computeRefugeePressure(state);
        // scaledRatio = min(1.0, 0.10 / 0.30) = 0.3333...
        // pressure = 0.004 * 0.3333... ≈ 0.001333...
        const expected = REFUGEE_PRESSURE_RATE * Math.min(1.0, 0.10 / REFUGEE_PRESSURE_RATIO_CAP);
        expect(Math.abs(pressure - expected) < 1e-10).toBeTruthy();
    });

    test('computeRefugeePressure caps ratio at REFUGEE_PRESSURE_RATIO_CAP', () => {
        const state = makeState();
        // 50% ratio, well above 30% cap
        (state as any).displacement = {
            displacement_state: {
                vitez: makeDisplacementEntry('vitez', 10000, 5000) // 50%
            }
        };
        const pressure = computeRefugeePressure(state);
        // scaledRatio = min(1.0, 0.50 / 0.30) = 1.0 (capped)
        expect(Math.abs(pressure - REFUGEE_PRESSURE_RATE) < 1e-10).toBeTruthy();
    });

    test('computeRefugeePressure sums across multiple municipalities', () => {
        const state = makeState();
        (state as any).displacement = {
            displacement_state: {
                travnik: makeDisplacementEntry('travnik', 100000, 15000), // 15%
                vitez: makeDisplacementEntry('vitez', 20000, 4000), // 20%
                kiseljak: makeDisplacementEntry('kiseljak', 30000, 3000) // 10%
            }
        };
        const pressure = computeRefugeePressure(state);
        const p_travnik = REFUGEE_PRESSURE_RATE * Math.min(1.0, 0.15 / REFUGEE_PRESSURE_RATIO_CAP);
        const p_vitez = REFUGEE_PRESSURE_RATE * Math.min(1.0, 0.20 / REFUGEE_PRESSURE_RATIO_CAP);
        const p_kiseljak = REFUGEE_PRESSURE_RATE * Math.min(1.0, 0.10 / REFUGEE_PRESSURE_RATIO_CAP);
        const expected = p_travnik + p_vitez + p_kiseljak;
        expect(Math.abs(pressure - expected) < 1e-10).toBeTruthy();
        expect(pressure > 0).toBeTruthy();
    });

    test('computeRefugeePressure ignores non-mixed municipalities', () => {
        const state = makeState();
        (state as any).displacement = {
            displacement_state: {
                banja_luka: makeDisplacementEntry('banja_luka', 50000, 25000), // 50% but NOT a mixed mun
                travnik: makeDisplacementEntry('travnik', 100000, 10000) // 10%
            }
        };
        const pressure = computeRefugeePressure(state);
        // Only travnik should contribute
        const expected = REFUGEE_PRESSURE_RATE * Math.min(1.0, 0.10 / REFUGEE_PRESSURE_RATIO_CAP);
        expect(Math.abs(pressure - expected) < 1e-10).toBeTruthy();
    });

    test('refugee pressure feeds into updateAllianceValue as negative driver', () => {
        const state = makeState({
            political: {
                war_alliance_rbih_hrhb: 0.35
            } as any,
        });
        ensureRbihHrhbState(state);
        // Add displacement data
        (state as any).displacement = {
            displacement_state: {
                travnik: makeDisplacementEntry('travnik', 100000, 20000), // 20%
                vitez: makeDisplacementEntry('vitez', 20000, 6000), // 30%
                mostar: makeDisplacementEntry('mostar', 80000, 12000) // 15%
            }
        };
        const report = updateAllianceValue(state);
        expect(report.drivers.refugee_pressure > 0).toBeTruthy();
        // With refugee pressure, delta should be more negative than without
        const baselineDelta = report.drivers.appeasement - report.drivers.patron_drag - report.drivers.incident_penalty + report.drivers.ceasefire_boost;
        expect(report.delta < baselineDelta).toBeTruthy();
        expect(report.delta).toBe(baselineDelta - report.drivers.refugee_pressure);
    });

    test('refugee pressure accelerates alliance degradation toward bilateral war', () => {
        // Simulate turns with heavy refugee pressure to verify war triggers
        const state = makeState({
            political: {
                war_alliance_rbih_hrhb: 0.25 // Just above ALLIED_THRESHOLD (0.20)
            } as any,
        });
        ensureRbihHrhbState(state);
        state.meta.turn = 30; // Past earliest turn (26)

        // Heavy refugee pressure in multiple municipalities
        (state as any).displacement = {
            displacement_state: {
                travnik: makeDisplacementEntry('travnik', 50000, 20000), // 40% (capped)
                vitez: makeDisplacementEntry('vitez', 20000, 8000), // 40% (capped)
                bugojno: makeDisplacementEntry('bugojno', 40000, 16000), // 40% (capped)
                mostar: makeDisplacementEntry('mostar', 80000, 32000), // 40% (capped)
                kiseljak: makeDisplacementEntry('kiseljak', 30000, 12000), // 40% (capped)
                busovaca: makeDisplacementEntry('busovaca', 15000, 6000), // 40% (capped)
                novi_travnik: makeDisplacementEntry('novi_travnik', 25000, 10000) // 40% (capped)
            }
        };

        // High patron commitment too
        const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
        hrhb.patron_state!.patron_commitment = 0.8;

        // Run several turns
        let warStarted = false;
        for (let i = 0; i < 50; i++) {
            state.meta.turn++;
            const report = updateAllianceValue(state);
            countBilateralFlips(state, []);
            if (report.war_started_this_turn) {
                warStarted = true;
                break;
            }
        }
        expect(warStarted).toBe(true);
        expect(state.political.war_alliance_rbih_hrhb! <= HOSTILE_THRESHOLD).toBeTruthy();
    });
});

// ── Graz Accords + Alliance Coexistence Test ──

describe('graz accords with alliance dynamics enabled', () => {
    test('cold front state is independent of RBiH-HRHB alliance value', () => {
        // Verify that enabling alliance dynamics does not break Graz Accords state
        const state = makeState({
            political: {
                war_alliance_rbih_hrhb: 0.35
            } as any,
        });
        ensureRbihHrhbState(state);
        // Graz Accords fields exist on political state
        state.political.vienna_declaration_turn = 4;
        state.political.vienna_herzegovina_broken_by = undefined;

        // Alliance update should not touch Graz fields
        const report = updateAllianceValue(state);
        expect(state.political.vienna_declaration_turn).toBe(4);
        expect(state.political.vienna_herzegovina_broken_by).toBe(undefined);
        expect(report.new_value !== undefined).toBeTruthy();
    });
});
