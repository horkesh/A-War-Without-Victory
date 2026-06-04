/**
 * Tests for src/sim/combat/attack_resource_aftermath.ts
 *
 * Covers: deductCombatSupplyExpenditure, applyFacilityCombatDamage, applyCombatFatigue
 * Extracted from attack_resolution_osid.ts (tranche 6).
 */

import { describe, expect, it } from 'vitest';
import {
    deductCombatSupplyExpenditure,
    applyFacilityCombatDamage,
    applyCombatFatigue,
    FATIGUE_ATTACKER,
    FATIGUE_DEFENDER,
} from '../src/sim/combat/attack_resource_aftermath.js';
import { FATIGUE_MAX } from '../src/state/formation_constants.js';
import { FACILITY_COMBAT_DAMAGE_RATE } from '../src/state/supply_reserve_constants.js';
import { COMBAT_HEAVY_MUNITIONS_RATE, COMBAT_GENERAL_SUPPLY_RATE } from '../src/state/supply_reserve_constants.js';
import type { FactionId, FormationState, GameState, BrigadeComposition } from '../src/state/game_state.js';
import {
    makeAttackComposition as makeComposition,
    makeAttackFormation as makeFormation,
} from './_helpers/combat.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers (extracted to tests/_helpers/combat.ts; aliased for local readability)
// ═══════════════════════════════════════════════════════════════════════════

/** Minimal GameState with supply reserves enabled and populated. */
function makeSupplyState(overrides: Partial<{
    supply_reserves_enabled: boolean;
    general_supply_reserve: Record<string, number> | null;
    heavy_munitions_reserve: Record<string, number> | null;
    production_facilities: Record<string, any> | null;
}>): GameState {
    const {
        supply_reserves_enabled = true,
        general_supply_reserve = { RS: 50, RBiH: 30, HRHB: 40 },
        heavy_munitions_reserve = { RS: 60, RBiH: 10, HRHB: 25 },
        production_facilities = null,
    } = overrides;

    return {
        meta: {
            turn: 10,
            phase: 'war',
            supply_reserves_enabled,
        },
        factions: [
            { id: 'RBiH' },
            { id: 'RS' },
            { id: 'HRHB' },
        ],
        political: {
            political_controllers: {},
        },
        military: {
            formations: {},
            general_supply_reserve: general_supply_reserve as any,
            heavy_munitions_reserve: heavy_munitions_reserve as any,
            production_facilities: production_facilities as any,
        },
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// deductCombatSupplyExpenditure
// ═══════════════════════════════════════════════════════════════════════════

describe('deductCombatSupplyExpenditure', () => {
    it('skips when supply_reserves_enabled is false', () => {
        const state = makeSupplyState({ supply_reserves_enabled: false });
        const before = { ...state.military.general_supply_reserve };
        deductCombatSupplyExpenditure({
            state,
            attackerFaction: 'RS',
            attackerCount: 3,
            powerRatio: 2.0,
            defenderFormation: makeFormation({ faction: 'RBiH' }),
        });
        expect(state.military.general_supply_reserve).toEqual(before);
    });

    it('skips when general_supply_reserve is missing', () => {
        const state = makeSupplyState({ general_supply_reserve: null });
        // Should not throw
        deductCombatSupplyExpenditure({
            state,
            attackerFaction: 'RS',
            attackerCount: 2,
            powerRatio: 1.5,
            defenderFormation: null,
        });
        expect(state.military.general_supply_reserve).toBeNull();
    });

    it('skips when heavy_munitions_reserve is missing', () => {
        const state = makeSupplyState({ heavy_munitions_reserve: null });
        const beforeGeneral = { ...state.military.general_supply_reserve };
        deductCombatSupplyExpenditure({
            state,
            attackerFaction: 'RS',
            attackerCount: 2,
            powerRatio: 1.5,
            defenderFormation: null,
        });
        // general_supply_reserve should be unchanged because guard requires BOTH present
        expect(state.military.general_supply_reserve).toEqual(beforeGeneral);
    });

    it('calls deduction for attacker when enabled', () => {
        const state = makeSupplyState({});
        const beforeHeavy = state.military.heavy_munitions_reserve!['RS' as FactionId]!;
        const beforeGeneral = state.military.general_supply_reserve!['RS' as FactionId]!;
        const attackerCount = 3;
        const powerRatio = 2.0;

        deductCombatSupplyExpenditure({
            state,
            attackerFaction: 'RS',
            attackerCount,
            powerRatio,
            defenderFormation: null,
        });

        const expectedHeavyDrain = attackerCount * powerRatio * COMBAT_HEAVY_MUNITIONS_RATE / 100;
        const expectedGeneralDrain = attackerCount * powerRatio * COMBAT_GENERAL_SUPPLY_RATE / 100;
        expect(state.military.heavy_munitions_reserve!['RS' as FactionId]).toBeCloseTo(beforeHeavy - expectedHeavyDrain, 6);
        expect(state.military.general_supply_reserve!['RS' as FactionId]).toBeCloseTo(beforeGeneral - expectedGeneralDrain, 6);
    });

    it('calls deduction for both attacker and defender when defender present', () => {
        const state = makeSupplyState({});
        const beforeHeavyRS = state.military.heavy_munitions_reserve!['RS' as FactionId]!;
        const beforeGeneralRS = state.military.general_supply_reserve!['RS' as FactionId]!;
        const beforeHeavyRBiH = state.military.heavy_munitions_reserve!['RBiH' as FactionId]!;
        const beforeGeneralRBiH = state.military.general_supply_reserve!['RBiH' as FactionId]!;
        const attackerCount = 2;
        const powerRatio = 1.5;

        deductCombatSupplyExpenditure({
            state,
            attackerFaction: 'RS',
            attackerCount,
            powerRatio,
            defenderFormation: makeFormation({ faction: 'RBiH' }),
        });

        // Attacker deduction
        const expectedAttHeavy = attackerCount * powerRatio * COMBAT_HEAVY_MUNITIONS_RATE / 100;
        const expectedAttGeneral = attackerCount * powerRatio * COMBAT_GENERAL_SUPPLY_RATE / 100;
        expect(state.military.heavy_munitions_reserve!['RS' as FactionId]).toBeCloseTo(beforeHeavyRS - expectedAttHeavy, 6);
        expect(state.military.general_supply_reserve!['RS' as FactionId]).toBeCloseTo(beforeGeneralRS - expectedAttGeneral, 6);

        // Defender deduction: count=1, intensity=powerRatio*0.5
        const defIntensity = powerRatio * 0.5;
        const expectedDefHeavy = 1 * defIntensity * COMBAT_HEAVY_MUNITIONS_RATE / 100;
        const expectedDefGeneral = 1 * defIntensity * COMBAT_GENERAL_SUPPLY_RATE / 100;
        expect(state.military.heavy_munitions_reserve!['RBiH' as FactionId]).toBeCloseTo(beforeHeavyRBiH - expectedDefHeavy, 6);
        expect(state.military.general_supply_reserve!['RBiH' as FactionId]).toBeCloseTo(beforeGeneralRBiH - expectedDefGeneral, 6);
    });

    it('does not call defender deduction when no defender', () => {
        const state = makeSupplyState({});
        const beforeHeavyRBiH = state.military.heavy_munitions_reserve!['RBiH' as FactionId]!;
        const beforeGeneralRBiH = state.military.general_supply_reserve!['RBiH' as FactionId]!;

        deductCombatSupplyExpenditure({
            state,
            attackerFaction: 'RS',
            attackerCount: 2,
            powerRatio: 1.5,
            defenderFormation: null,
        });

        // RBiH reserves untouched
        expect(state.military.heavy_munitions_reserve!['RBiH' as FactionId]).toBe(beforeHeavyRBiH);
        expect(state.military.general_supply_reserve!['RBiH' as FactionId]).toBe(beforeGeneralRBiH);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyFacilityCombatDamage
// ═══════════════════════════════════════════════════════════════════════════

describe('applyFacilityCombatDamage', () => {
    function makeFacility(id: string, munId: string, condition: number) {
        return {
            facility_id: id,
            name: `Facility ${id}`,
            municipality_id: munId,
            type: 'arms_factory' as const,
            base_capacity: 10,
            current_condition: condition,
            required_inputs: { electricity: false, raw_materials: false, skilled_labor: false },
        };
    }

    it('skips when supply_reserves_enabled is false', () => {
        const state = makeSupplyState({
            supply_reserves_enabled: false,
            production_facilities: { f1: makeFacility('f1', 'bihac', 0.8) },
        });
        applyFacilityCombatDamage({ state, targetOsid: 'op:bihac:bihac_2' });
        expect((state.military.production_facilities as any).f1.current_condition).toBe(0.8);
    });

    it('skips when production_facilities is missing', () => {
        const state = makeSupplyState({ production_facilities: null });
        // Should not throw
        applyFacilityCombatDamage({ state, targetOsid: 'op:bihac:bihac_2' });
    });

    it('reduces condition of matching municipality facility', () => {
        const state = makeSupplyState({
            production_facilities: { f1: makeFacility('f1', 'bihac', 0.8) },
        });
        applyFacilityCombatDamage({ state, targetOsid: 'op:bihac:bihac_2' });
        expect((state.military.production_facilities as any).f1.current_condition).toBeCloseTo(0.8 - FACILITY_COMBAT_DAMAGE_RATE, 6);
    });

    it('does not affect facilities in other municipalities', () => {
        const state = makeSupplyState({
            production_facilities: {
                f1: makeFacility('f1', 'bihac', 0.8),
                f2: makeFacility('f2', 'tuzla', 0.9),
            },
        });
        applyFacilityCombatDamage({ state, targetOsid: 'op:bihac:bihac_2' });
        expect((state.military.production_facilities as any).f1.current_condition).toBeCloseTo(0.8 - FACILITY_COMBAT_DAMAGE_RATE, 6);
        expect((state.military.production_facilities as any).f2.current_condition).toBe(0.9);
    });

    it('clamps condition to 0 (never negative)', () => {
        const state = makeSupplyState({
            production_facilities: { f1: makeFacility('f1', 'bihac', 0.01) },
        });
        applyFacilityCombatDamage({ state, targetOsid: 'op:bihac:bihac_2' });
        expect((state.military.production_facilities as any).f1.current_condition).toBe(0);
    });

    it('processes facilities in deterministic sort order', () => {
        // Two facilities in same municipality — both should be damaged
        const state = makeSupplyState({
            production_facilities: {
                z_facility: makeFacility('z_facility', 'bihac', 1.0),
                a_facility: makeFacility('a_facility', 'bihac', 1.0),
            },
        });
        applyFacilityCombatDamage({ state, targetOsid: 'op:bihac:bihac_2' });
        const facilities = state.military.production_facilities as any;
        expect(facilities.a_facility.current_condition).toBeCloseTo(1.0 - FACILITY_COMBAT_DAMAGE_RATE, 6);
        expect(facilities.z_facility.current_condition).toBeCloseTo(1.0 - FACILITY_COMBAT_DAMAGE_RATE, 6);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyCombatFatigue
// ═══════════════════════════════════════════════════════════════════════════

describe('applyCombatFatigue', () => {
    it('applies FATIGUE_ATTACKER (2) to all attackers', () => {
        const a1 = makeFormation({ id: 'a1', ops: { fatigue: 5, last_supplied_turn: null } });
        const a2 = makeFormation({ id: 'a2', ops: { fatigue: 10, last_supplied_turn: null } });
        applyCombatFatigue({ attackerFormations: [a1, a2], defenderFormation: null });
        expect(a1.ops!.fatigue).toBe(5 + FATIGUE_ATTACKER);
        expect(a2.ops!.fatigue).toBe(10 + FATIGUE_ATTACKER);
    });

    it('applies FATIGUE_DEFENDER (1) to defender', () => {
        const def = makeFormation({ id: 'def', ops: { fatigue: 8, last_supplied_turn: null } });
        applyCombatFatigue({ attackerFormations: [], defenderFormation: def });
        expect(def.ops!.fatigue).toBe(8 + FATIGUE_DEFENDER);
    });

    it('keeps defender fatigue primary-only when shared sector defense is disabled', () => {
        const primary = makeFormation({ id: 'def-a', ops: { fatigue: 8, last_supplied_turn: null } });
        const reserve = makeFormation({ id: 'def-b', ops: { fatigue: 4, last_supplied_turn: null } });

        applyCombatFatigue({
            attackerFormations: [],
            defenderFormation: primary,
            sectorDefenseBrigades: [primary, reserve],
            sectorBrigadeWeights: new Map([
                [primary.id, 1],
                [reserve.id, 3],
            ]),
            enableSharedSectorDefense: false,
        });

        expect(primary.ops!.fatigue).toBe(8 + FATIGUE_DEFENDER);
        expect(reserve.ops!.fatigue).toBe(4);
    });

    it('distributes defender fatigue across weighted sector defenders when shared sector defense is enabled', () => {
        const primary = makeFormation({ id: 'def-a', ops: { fatigue: 8, last_supplied_turn: null } });
        const reserve = makeFormation({ id: 'def-b', ops: { fatigue: 4, last_supplied_turn: null } });
        const zeroWeight = makeFormation({ id: 'def-c', ops: { fatigue: 2, last_supplied_turn: null } });

        applyCombatFatigue({
            attackerFormations: [],
            defenderFormation: primary,
            sectorDefenseBrigades: [primary, reserve, zeroWeight],
            sectorBrigadeWeights: new Map([
                [primary.id, 1],
                [reserve.id, 3],
                [zeroWeight.id, 0],
            ]),
            enableSharedSectorDefense: true,
        });

        expect(primary.ops!.fatigue).toBeCloseTo(8.25, 6);
        expect(reserve.ops!.fatigue).toBeCloseTo(4.75, 6);
        expect(zeroWeight.ops!.fatigue).toBe(2);
    });

    it('initializes ops if missing', () => {
        const a1 = makeFormation({ id: 'a1' });
        delete (a1 as any).ops;
        const def = makeFormation({ id: 'def' });
        delete (def as any).ops;

        applyCombatFatigue({ attackerFormations: [a1], defenderFormation: def });
        expect(a1.ops).toBeDefined();
        expect(a1.ops!.fatigue).toBe(FATIGUE_ATTACKER);
        expect(a1.ops!.last_supplied_turn).toBeNull();
        expect(def.ops).toBeDefined();
        expect(def.ops!.fatigue).toBe(FATIGUE_DEFENDER);
        expect(def.ops!.last_supplied_turn).toBeNull();
    });

    it('caps at FATIGUE_MAX', () => {
        const a1 = makeFormation({ id: 'a1', ops: { fatigue: FATIGUE_MAX - 1, last_supplied_turn: null } });
        const def = makeFormation({ id: 'def', ops: { fatigue: FATIGUE_MAX, last_supplied_turn: null } });

        applyCombatFatigue({ attackerFormations: [a1], defenderFormation: def });
        // a1: 29 + 2 = 31, capped to 30
        expect(a1.ops!.fatigue).toBe(FATIGUE_MAX);
        // def: 30 + 1 = 31, capped to 30
        expect(def.ops!.fatigue).toBe(FATIGUE_MAX);
    });

    it('no-ops when no defender', () => {
        const a1 = makeFormation({ id: 'a1', ops: { fatigue: 0, last_supplied_turn: null } });
        applyCombatFatigue({ attackerFormations: [a1], defenderFormation: null });
        expect(a1.ops!.fatigue).toBe(FATIGUE_ATTACKER);
        // No crash, no defender mutation
    });
});
