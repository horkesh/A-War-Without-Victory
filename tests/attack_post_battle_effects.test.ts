/**
 * Tests for src/sim/combat/attack_post_battle_effects.ts
 *
 * Covers: applyExperienceGain, applyOfficerCasualtyLoss,
 *         getDefenderOutcomePerspective, applyDisruptionFromOutcome,
 *         applyAmmoCrisisPyrrhicEffects, applyPostBattleMorale
 */

import { describe, expect, it } from 'vitest';
import {
    applyExperienceGain,
    applyOfficerCasualtyLoss,
    getDefenderOutcomePerspective,
    applyDisruptionFromOutcome,
    applyAmmoCrisisPyrrhicEffects,
    applyPostBattleMorale,
    BASE_EXPERIENCE_GAIN,
    VICTORY_EXPERIENCE_BONUS,
    DEFEAT_EXPERIENCE_GAIN,
    FACTION_LEARNING_RATE,
    DEFAULT_LEARNING_RATE,
} from '../src/sim/combat/attack_post_battle_effects.js';
import { recordBattleHistory } from '../src/sim/combat/attack_history_recording.js';
import { OFFICER_CASUALTY_MULT, OFFICER_QUALITY_FLOOR } from '../src/sim/combat/officer_quality_update.js';
import type { FactionId, FormationId, FormationState, BrigadeComposition, GameState } from '../src/state/game_state.js';
import type { CombatOutcome } from '../src/sim/combat/combat_math.js';

// Cluster 8 — attack_history_recording.test.ts (9 it) absorbed below.

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeComposition(overrides: Partial<BrigadeComposition> = {}): BrigadeComposition {
    return {
        infantry: 800,
        tanks: 20,
        artillery: 10,
        aa_systems: 5,
        tank_condition: { operational: 0.8, degraded: 0.1, non_operational: 0.1 },
        artillery_condition: { operational: 0.8, degraded: 0.1, non_operational: 0.1 },
        ...overrides,
    };
}

function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RS' as FactionId,
        name: 'Test Brigade',
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        morale: 60,
        cohesion: 60,
        experience: 0.3,
        tags: [],
        composition: makeComposition(),
        ...overrides,
    } as FormationState;
}

// ═══════════════════════════════════════════════════════════════════════════
// applyExperienceGain
// ═══════════════════════════════════════════════════════════════════════════

describe('applyExperienceGain', () => {
    it('RBiH winning: rate 1.5, gain = (0.03 + 0.02) * 1.5 = 0.075 base', () => {
        const f = makeFormation({ faction: 'RBiH', experience: 0.0 });
        applyExperienceGain(f, true);
        // gain = (BASE + BONUS) * rate = 0.05 * 1.5 = 0.075
        // diminishing = 0.075 * (1.0 - 0.0 * 0.5) = 0.075
        expect(f.experience).toBeCloseTo(0.075, 6);
    });

    it('RS losing: rate 0.7, gain = max(0.03*0.7, 0.01*0.7) = 0.021', () => {
        const f = makeFormation({ faction: 'RS', experience: 0.0 });
        applyExperienceGain(f, false);
        // gain = BASE * rate = 0.03 * 0.7 = 0.021
        // max(0.021, DEFEAT * rate = 0.01 * 0.7 = 0.007) = 0.021
        // diminishing = 0.021 * (1.0 - 0.0 * 0.5) = 0.021
        expect(f.experience).toBeCloseTo(0.021, 6);
    });

    it('HRHB winning: rate 1.0', () => {
        const f = makeFormation({ faction: 'HRHB', experience: 0.0 });
        applyExperienceGain(f, true);
        // gain = (0.03 + 0.02) * 1.0 = 0.05
        expect(f.experience).toBeCloseTo(0.05, 6);
    });

    it('diminishing returns: formation with experience 0.8 gains less than one with 0.0', () => {
        const fHigh = makeFormation({ faction: 'RS', experience: 0.8 });
        const fLow = makeFormation({ faction: 'RS', experience: 0.0 });
        applyExperienceGain(fHigh, true);
        applyExperienceGain(fLow, true);
        const gainHigh = fHigh.experience! - 0.8;
        const gainLow = fLow.experience! - 0.0;
        expect(gainHigh).toBeLessThan(gainLow);
    });

    it('experience capped at 1.0', () => {
        const f = makeFormation({ faction: 'RBiH', experience: 0.99 });
        applyExperienceGain(f, true);
        expect(f.experience).toBe(1.0);
    });

    it('unknown faction uses DEFAULT_LEARNING_RATE (1.0)', () => {
        const f = makeFormation({ faction: 'UNKNOWN' as FactionId, experience: 0.0 });
        applyExperienceGain(f, true);
        // gain = (0.03 + 0.02) * 1.0 = 0.05, same as HRHB
        expect(f.experience).toBeCloseTo(0.05, 6);
    });

    it('mutates formation.experience in place', () => {
        const f = makeFormation({ faction: 'RS', experience: 0.1 });
        const before = f.experience!;
        applyExperienceGain(f, false);
        expect(f.experience).not.toBe(before);
        expect(f.experience).toBeGreaterThan(before);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyOfficerCasualtyLoss
// ═══════════════════════════════════════════════════════════════════════════

describe('applyOfficerCasualtyLoss', () => {
    it('basic loss: casualtyRatio * OFFICER_CASUALTY_MULT * (1.0 - oq * 0.3)', () => {
        const f = makeFormation({ officer_quality: 0.5 } as Partial<FormationState>);
        const cas = 100;
        const totalPersonnel = 1000;
        applyOfficerCasualtyLoss(f, cas, totalPersonnel);
        // ratio = 0.1, loss = 0.1 * 1.5 * (1.0 - 0.5 * 0.3) = 0.1 * 1.5 * 0.85 = 0.1275
        // new oq = 0.5 - 0.1275 = 0.3725
        expect((f as { officer_quality?: number }).officer_quality).toBeCloseTo(0.3725, 4);
    });

    it('floor: officer_quality never drops below OFFICER_QUALITY_FLOOR', () => {
        const f = makeFormation({ officer_quality: 0.1 } as Partial<FormationState>);
        applyOfficerCasualtyLoss(f, 900, 1000);
        // ratio = 0.9, loss = 0.9 * 1.5 * (1.0 - 0.1*0.3) = 0.9 * 1.5 * 0.97 = 1.3095
        // 0.1 - 1.3095 = negative → clamped to OFFICER_QUALITY_FLOOR
        expect((f as { officer_quality?: number }).officer_quality).toBe(OFFICER_QUALITY_FLOOR);
    });

    it('no officer_quality field → no-op', () => {
        const f = makeFormation();
        // FormationState without officer_quality should not crash
        applyOfficerCasualtyLoss(f, 100, 1000);
        expect((f as { officer_quality?: number }).officer_quality).toBeUndefined();
    });

    it('zero totalPersonnel → no-op', () => {
        const f = makeFormation({ officer_quality: 0.5 } as Partial<FormationState>);
        applyOfficerCasualtyLoss(f, 100, 0);
        expect((f as { officer_quality?: number }).officer_quality).toBe(0.5);
    });

    it('high officer quality reduces loss rate (the 0.3 factor)', () => {
        const fHigh = makeFormation({ officer_quality: 0.9 } as Partial<FormationState>);
        const fLow = makeFormation({ officer_quality: 0.2 } as Partial<FormationState>);
        applyOfficerCasualtyLoss(fHigh, 100, 1000);
        applyOfficerCasualtyLoss(fLow, 100, 1000);
        // Higher OQ → smaller multiplier (1 - oq*0.3), but also starts higher
        // fHigh: loss = 0.1 * 1.5 * (1 - 0.27) = 0.1095 → 0.9 - 0.1095 = 0.7905
        // fLow:  loss = 0.1 * 1.5 * (1 - 0.06) = 0.141  → 0.2 - 0.141  = 0.059
        const highLoss = 0.9 - (fHigh as { officer_quality?: number }).officer_quality!;
        const lowLoss = 0.2 - (fLow as { officer_quality?: number }).officer_quality!;
        // High OQ takes less proportional loss due to the 0.3 factor
        expect(highLoss).toBeLessThan(lowLoss);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// getDefenderOutcomePerspective
// ═══════════════════════════════════════════════════════════════════════════

describe('getDefenderOutcomePerspective', () => {
    it('decisive_victory → catastrophic', () => {
        expect(getDefenderOutcomePerspective('decisive_victory')).toBe('catastrophic');
    });
    it('victory → repulsed', () => {
        expect(getDefenderOutcomePerspective('victory')).toBe('repulsed');
    });
    it('costly_victory → stalemate', () => {
        expect(getDefenderOutcomePerspective('costly_victory')).toBe('stalemate');
    });
    it('stalemate → costly_victory', () => {
        expect(getDefenderOutcomePerspective('stalemate')).toBe('costly_victory');
    });
    it('repulsed → victory', () => {
        expect(getDefenderOutcomePerspective('repulsed')).toBe('victory');
    });
    it('catastrophic → decisive_victory', () => {
        expect(getDefenderOutcomePerspective('catastrophic')).toBe('decisive_victory');
    });
    it('unknown → pass-through', () => {
        expect(getDefenderOutcomePerspective('some_other' as CombatOutcome)).toBe('some_other');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyDisruptionFromOutcome
// ═══════════════════════════════════════════════════════════════════════════

describe('applyDisruptionFromOutcome', () => {
    it('costly_victory: disrupted_turns = 1, no last_repulsed_from', () => {
        const f = makeFormation();
        applyDisruptionFromOutcome(f, 'costly_victory', 'op:test:osid_1', 5);
        expect((f as { disrupted_turns?: number }).disrupted_turns).toBe(1);
        expect((f as { last_repulsed_from?: unknown }).last_repulsed_from).toBeUndefined();
    });

    it('repulsed: disrupted_turns = 1 + last_repulsed_from set', () => {
        const f = makeFormation();
        applyDisruptionFromOutcome(f, 'repulsed', 'op:test:osid_2', 10);
        expect((f as { disrupted_turns?: number }).disrupted_turns).toBe(1);
        expect((f as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from).toEqual({
            osid: 'op:test:osid_2',
            turn: 10,
        });
    });

    it('catastrophic: disrupted_turns = 1 + last_repulsed_from set', () => {
        const f = makeFormation();
        applyDisruptionFromOutcome(f, 'catastrophic', 'op:test:osid_3', 15);
        expect((f as { disrupted_turns?: number }).disrupted_turns).toBe(1);
        expect((f as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from).toEqual({
            osid: 'op:test:osid_3',
            turn: 15,
        });
    });

    it('victory: no disruption', () => {
        const f = makeFormation();
        applyDisruptionFromOutcome(f, 'victory', 'op:test:osid_4', 20);
        expect((f as { disrupted_turns?: number }).disrupted_turns).toBeUndefined();
    });

    it('decisive_victory: no disruption', () => {
        const f = makeFormation();
        applyDisruptionFromOutcome(f, 'decisive_victory', 'op:test:osid_5', 25);
        expect((f as { disrupted_turns?: number }).disrupted_turns).toBeUndefined();
    });

    it('stalemate: no disruption', () => {
        const f = makeFormation();
        applyDisruptionFromOutcome(f, 'stalemate', 'op:test:osid_6', 30);
        expect((f as { disrupted_turns?: number }).disrupted_turns).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyAmmoCrisisPyrrhicEffects
// ═══════════════════════════════════════════════════════════════════════════

describe('applyAmmoCrisisPyrrhicEffects', () => {
    it('both false: returns null, no mutations', () => {
        const attacker = makeFormation({ cohesion: 60, posture: 'attack' } as Partial<FormationState>);
        const result = applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: false,
            isPyrrhic: false,
            firstAttackerId: 'atk_1',
            targetOsid: 'op:test:osid_1',
            attackerFormations: [attacker],
        });
        expect(result).toBeNull();
        expect(attacker.cohesion).toBe(60);
    });

    it('ammo crisis: returns ammo_crisis snap event, cohesion -10, posture defend', () => {
        const attacker = makeFormation({ cohesion: 60, posture: 'attack' } as Partial<FormationState>);
        const result = applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: true,
            isPyrrhic: false,
            firstAttackerId: 'atk_1',
            targetOsid: 'op:test:osid_1',
            attackerFormations: [attacker],
        });
        expect(result).not.toBeNull();
        expect(result!.snap_type).toBe('ammo_crisis');
        expect(result!.trigger_phase).toBe('post_battle');
        expect(result!.description).toContain('ammunition');
        expect(attacker.cohesion).toBe(50);
        expect(attacker.posture).toBe('defend');
    });

    it('pyrrhic: returns pyrrhic_victory snap event, cohesion -10, posture defend', () => {
        const attacker = makeFormation({ cohesion: 60, posture: 'attack' } as Partial<FormationState>);
        const result = applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: false,
            isPyrrhic: true,
            firstAttackerId: 'atk_2',
            targetOsid: 'op:test:osid_2',
            attackerFormations: [attacker],
        });
        expect(result).not.toBeNull();
        expect(result!.snap_type).toBe('pyrrhic_victory');
        expect(result!.trigger_phase).toBe('post_battle');
        expect(result!.description).toContain('losses were severe');
        expect(attacker.cohesion).toBe(50);
        expect(attacker.posture).toBe('defend');
    });

    it('both true: ammo_crisis takes precedence (isAmmoCrisis checked first)', () => {
        const attacker = makeFormation({ cohesion: 60 });
        const result = applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: true,
            isPyrrhic: true,
            firstAttackerId: 'atk_3',
            targetOsid: 'op:test:osid_3',
            attackerFormations: [attacker],
        });
        expect(result!.snap_type).toBe('ammo_crisis');
    });

    it('snap event fields: attacker_brigade, target_osid, affected_formation, effects', () => {
        const attacker = makeFormation({ cohesion: 60 });
        const result = applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: true,
            isPyrrhic: false,
            firstAttackerId: 'atk_4',
            targetOsid: 'op:test:osid_4',
            attackerFormations: [attacker],
        });
        expect(result!.attacker_brigade).toBe('atk_4');
        expect(result!.target_osid).toBe('op:test:osid_4');
        expect(result!.affected_formation).toBe('atk_4');
        expect(result!.effects.forced_posture).toBe('defend');
        expect(result!.effects.attacker_cohesion_delta).toBe(-10);
    });

    it('all attacker formations mutated', () => {
        const a1 = makeFormation({ id: 'a1', cohesion: 70, posture: 'attack' } as Partial<FormationState>);
        const a2 = makeFormation({ id: 'a2', cohesion: 80, posture: 'attack' } as Partial<FormationState>);
        applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: true,
            isPyrrhic: false,
            firstAttackerId: 'a1',
            targetOsid: 'op:test:osid_5',
            attackerFormations: [a1, a2],
        });
        expect(a1.cohesion).toBe(60);
        expect(a1.posture).toBe('defend');
        expect(a2.cohesion).toBe(70);
        expect(a2.posture).toBe('defend');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// applyPostBattleMorale
// ═══════════════════════════════════════════════════════════════════════════

describe('applyPostBattleMorale', () => {
    it('attacker decisive_victory: +3 morale', () => {
        const a = makeFormation({ morale: 50 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'decisive_victory',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(53);
    });

    it('attacker victory: +1', () => {
        const a = makeFormation({ morale: 50 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'victory',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(51);
    });

    it('attacker costly_victory: no change', () => {
        const a = makeFormation({ morale: 50 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'costly_victory',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(50);
    });

    it('attacker stalemate: -2', () => {
        const a = makeFormation({ morale: 50 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'stalemate',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(48);
    });

    it('attacker repulsed: -5', () => {
        const a = makeFormation({ morale: 50 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'repulsed',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(45);
    });

    it('attacker catastrophic: -10', () => {
        const a = makeFormation({ morale: 50 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'catastrophic',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(40);
    });

    it('morale clamped 0-100 (lower)', () => {
        const a = makeFormation({ morale: 3 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'catastrophic',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(0);
    });

    it('morale clamped 0-100 (upper)', () => {
        const a = makeFormation({ morale: 99 });
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'decisive_victory',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBe(100);
    });

    it('attacker with undefined morale: skipped', () => {
        const a = makeFormation();
        delete (a as { morale?: number }).morale;
        applyPostBattleMorale({
            attackerFormations: [a],
            defenderFormation: null,
            outcome: 'decisive_victory',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(a.morale).toBeUndefined();
    });

    it('defender on flip: -5', () => {
        const d = makeFormation({ morale: 60 });
        applyPostBattleMorale({
            attackerFormations: [],
            defenderFormation: d,
            outcome: 'decisive_victory',
            flip: true,
            moraleAbsorbed: false,
        });
        expect(d.morale).toBe(55);
    });

    it('defender held (no absorption): +1', () => {
        const d = makeFormation({ morale: 60 });
        applyPostBattleMorale({
            attackerFormations: [],
            defenderFormation: d,
            outcome: 'repulsed',
            flip: false,
            moraleAbsorbed: false,
        });
        expect(d.morale).toBe(61);
    });

    it('defender morale absorbed: no change', () => {
        const d = makeFormation({ morale: 60 });
        applyPostBattleMorale({
            attackerFormations: [],
            defenderFormation: d,
            outcome: 'repulsed',
            flip: false,
            moraleAbsorbed: true,
        });
        expect(d.morale).toBe(60);
    });

    it('defender null: no crash', () => {
        expect(() => {
            applyPostBattleMorale({
                attackerFormations: [],
                defenderFormation: null,
                outcome: 'victory',
                flip: false,
                moraleAbsorbed: false,
            });
        }).not.toThrow();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Absorbed: attack_history_recording.test.ts (Cluster 8)
//
// Covers: recordBattleHistory — attacker recording, no-defender,
//         single defender, multi-defender with weights, multi-defender sorting,
//         isConcentrated derivation, defFaction derivation.
// ═══════════════════════════════════════════════════════════════════════════

function makeHistoryFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade',
        faction: 'RS' as FactionId,
        name: 'Test Brigade',
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        morale: 60,
        cohesion: 60,
        experience: 0.3,
        tags: [],
        ...overrides,
    } as FormationState;
}

function makeMinimalState(): GameState {
    return {
        military: { formations: {} },
    } as unknown as GameState;
}

function baseHistoryParams(overrides: Partial<Parameters<typeof recordBattleHistory>[0]> = {}) {
    return {
        attackerFormations: [makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId })],
        defenderFormation: null as FormationState | null,
        sectorDefenseBrigades: null as FormationState[] | null,
        sectorBrigadeWeights: null as Map<FormationId, number> | null,
        currentTurn: 5,
        targetOsid: 'op:test:test_1',
        outcome: 'victory' as CombatOutcome,
        attackerFaction: 'RBiH' as FactionId,
        controller: 'RS' as FactionId | null,
        flip: true,
        finalAttackerCas: 50,
        finalDefenderCas: 100,
        state: makeMinimalState(),
        battleId: 'battle_001',
        battleEquipDefenderTanksLost: 2,
        battleEquipDefenderArtLost: 1,
        battleEquipAttackerTanksLost: 0,
        battleEquipAttackerArtLost: 0,
        battleEquipCapturedBy: 'RBiH',
        battleEquipCapturedTanks: 1,
        battleEquipCapturedArt: 0,
        ...overrides,
    };
}

describe('recordBattleHistory', () => {
    it('records attacker engagement for a single attacker', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseHistoryParams({ attackerFormations: [atk] });

        recordBattleHistory(params);

        expect(atk.brigade_history).toBeDefined();
        expect(atk.brigade_history!.battles_fought).toBe(1);
        expect(atk.brigade_history!.battles_as_attacker).toBe(1);
        expect(atk.brigade_history!.engagements).toHaveLength(1);
        expect(atk.brigade_history!.engagements[0]!.role).toBe('attacker');
        expect(atk.brigade_history!.engagements[0]!.osid).toBe('op:test:test_1');
        expect(atk.brigade_history!.engagements[0]!.battle_id).toBe('battle_001');
    });

    it('does not crash when defenderFormation is null', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseHistoryParams({
            attackerFormations: [atk],
            defenderFormation: null,
        });

        recordBattleHistory(params);

        expect(atk.brigade_history).toBeDefined();
        expect(atk.brigade_history!.battles_fought).toBe(1);
    });

    it('records single defender with correct equipment data', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const def = makeHistoryFormation({ id: 'def_1', faction: 'RS' as FactionId });
        const params = baseHistoryParams({
            attackerFormations: [atk],
            defenderFormation: def,
            battleEquipAttackerTanksLost: 3,
            battleEquipAttackerArtLost: 2,
            battleEquipCapturedBy: 'RS',
            battleEquipCapturedTanks: 1,
            battleEquipCapturedArt: 1,
        });

        recordBattleHistory(params);

        expect(def.brigade_history).toBeDefined();
        expect(def.brigade_history!.battles_fought).toBe(1);
        expect(def.brigade_history!.battles_as_defender).toBe(1);
        const eng = def.brigade_history!.engagements[0]!;
        expect(eng.role).toBe('defender');
        expect(eng.casualties_taken).toBe(100);
        expect(eng.casualties_inflicted).toBe(50);
        expect(eng.equipment_destroyed).toEqual({ tanks: 3, artillery: 2 });
        expect(eng.equipment_captured).toEqual({ tanks: 1, artillery: 1 });
    });

    it('distributes casualties by weights for multi-defender', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const def1 = makeHistoryFormation({ id: 'def_a', faction: 'RS' as FactionId });
        const def2 = makeHistoryFormation({ id: 'def_b', faction: 'RS' as FactionId });
        const weights = new Map<FormationId, number>([
            ['def_a' as FormationId, 0.6],
            ['def_b' as FormationId, 0.4],
        ]);

        const params = baseHistoryParams({
            attackerFormations: [atk],
            defenderFormation: def1,
            sectorDefenseBrigades: [def1, def2],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 100,
            finalAttackerCas: 50,
        });

        recordBattleHistory(params);

        expect(def1.brigade_history).toBeDefined();
        expect(def2.brigade_history).toBeDefined();
        expect(def1.brigade_history!.battles_fought).toBe(1);
        expect(def2.brigade_history!.battles_fought).toBe(1);

        const cas1 = def1.brigade_history!.engagements[0]!.casualties_taken;
        const cas2 = def2.brigade_history!.engagements[0]!.casualties_taken;
        expect(cas1 + cas2).toBe(100);
        expect(cas1).toBe(60);
        expect(cas2).toBe(40);

        expect(def1.brigade_history!.engagements[0]!.equipment_destroyed).toEqual({ tanks: 0, artillery: 0 });
        expect(def1.brigade_history!.engagements[0]!.equipment_captured).toEqual({ tanks: 0, artillery: 0 });
    });

    it('sorts multi-defender group by strictCompare on id', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const defZ = makeHistoryFormation({ id: 'def_z', faction: 'RS' as FactionId });
        const defA = makeHistoryFormation({ id: 'def_a', faction: 'RS' as FactionId });
        const weights = new Map<FormationId, number>([
            ['def_z' as FormationId, 0.5],
            ['def_a' as FormationId, 0.5],
        ]);

        const params = baseHistoryParams({
            attackerFormations: [atk],
            defenderFormation: defZ,
            sectorDefenseBrigades: [defZ, defA],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 10,
            finalAttackerCas: 10,
        });

        recordBattleHistory(params);

        expect(defA.brigade_history).toBeDefined();
        expect(defZ.brigade_history).toBeDefined();
        expect(defA.brigade_history!.battles_fought).toBe(1);
        expect(defZ.brigade_history!.battles_fought).toBe(1);
    });

    it('isConcentrated is true when multiple attackers', () => {
        const atk1 = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const atk2 = makeHistoryFormation({ id: 'atk_2', faction: 'RBiH' as FactionId });
        const def = makeHistoryFormation({ id: 'def_1', faction: 'RS' as FactionId });

        const params = baseHistoryParams({
            attackerFormations: [atk1, atk2],
            defenderFormation: def,
        });

        recordBattleHistory(params);

        expect(atk1.brigade_history!.engagements[0]!.was_concentrated).toBe(true);
        expect(atk2.brigade_history!.engagements[0]!.was_concentrated).toBe(true);
        expect(def.brigade_history!.engagements[0]!.was_concentrated).toBe(true);
    });

    it('isConcentrated is false when single attacker', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const def = makeHistoryFormation({ id: 'def_1', faction: 'RS' as FactionId });

        const params = baseHistoryParams({
            attackerFormations: [atk],
            defenderFormation: def,
        });

        recordBattleHistory(params);

        expect(atk.brigade_history!.engagements[0]!.was_concentrated).toBe(false);
        expect(def.brigade_history!.engagements[0]!.was_concentrated).toBe(false);
    });

    it('defFaction uses controller when present', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseHistoryParams({
            attackerFormations: [atk],
            controller: 'RS' as FactionId,
            attackerFaction: 'RBiH' as FactionId,
        });

        recordBattleHistory(params);

        expect(atk.brigade_history!.engagements[0]!.enemy_faction).toBe('RS');
    });

    it('defFaction falls back to attackerFaction when controller is null', () => {
        const atk = makeHistoryFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseHistoryParams({
            attackerFormations: [atk],
            controller: null,
            attackerFaction: 'RBiH' as FactionId,
        });

        recordBattleHistory(params);

        expect(atk.brigade_history!.engagements[0]!.enemy_faction).toBe('RBiH');
    });
});
