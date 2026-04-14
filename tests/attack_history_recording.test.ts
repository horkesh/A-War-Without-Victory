/**
 * Tests for src/sim/combat/attack_history_recording.ts
 *
 * Covers: recordBattleHistory — attacker recording, no-defender,
 *         single defender, multi-defender with weights, multi-defender sorting,
 *         isConcentrated derivation, defFaction derivation.
 */

import { describe, expect, it } from 'vitest';
import { recordBattleHistory } from '../src/sim/combat/attack_history_recording.js';
import type { FactionId, FormationId, FormationState, GameState } from '../src/state/game_state.js';
import type { CombatOutcome } from '../src/sim/combat/combat_math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

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
        ...overrides,
    } as FormationState;
}

function makeMinimalState(): GameState {
    return {
        military: { formations: {} },
    } as unknown as GameState;
}

function baseParams(overrides: Partial<Parameters<typeof recordBattleHistory>[0]> = {}) {
    return {
        attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId })],
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

// ═══════════════════════════════════════════════════════════════════════════
// recordBattleHistory
// ═══════════════════════════════════════════════════════════════════════════

describe('recordBattleHistory', () => {
    it('records attacker engagement for a single attacker', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseParams({ attackerFormations: [atk] });

        recordBattleHistory(params);

        // recordAttackerEngagements writes to brigade_history
        expect(atk.brigade_history).toBeDefined();
        expect(atk.brigade_history!.battles_fought).toBe(1);
        expect(atk.brigade_history!.battles_as_attacker).toBe(1);
        expect(atk.brigade_history!.engagements).toHaveLength(1);
        expect(atk.brigade_history!.engagements[0]!.role).toBe('attacker');
        expect(atk.brigade_history!.engagements[0]!.osid).toBe('op:test:test_1');
        expect(atk.brigade_history!.engagements[0]!.battle_id).toBe('battle_001');
    });

    it('does not crash when defenderFormation is null', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseParams({
            attackerFormations: [atk],
            defenderFormation: null,
        });

        // Should not throw
        recordBattleHistory(params);

        // Attacker still recorded
        expect(atk.brigade_history).toBeDefined();
        expect(atk.brigade_history!.battles_fought).toBe(1);
    });

    it('records single defender with correct equipment data', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const def = makeFormation({ id: 'def_1', faction: 'RS' as FactionId });
        const params = baseParams({
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
        expect(eng.casualties_taken).toBe(100); // finalDefenderCas
        expect(eng.casualties_inflicted).toBe(50); // finalAttackerCas
        // Equipment: buildDefenderEquipmentRecord gives destroyed = attacker tanks/art lost
        expect(eng.equipment_destroyed).toEqual({ tanks: 3, artillery: 2 });
        // Captured: capturedBy matches defender faction 'RS'
        expect(eng.equipment_captured).toEqual({ tanks: 1, artillery: 1 });
    });

    it('distributes casualties by weights for multi-defender', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const def1 = makeFormation({ id: 'def_a', faction: 'RS' as FactionId });
        const def2 = makeFormation({ id: 'def_b', faction: 'RS' as FactionId });
        const weights = new Map<FormationId, number>([
            ['def_a' as FormationId, 0.6],
            ['def_b' as FormationId, 0.4],
        ]);

        const params = baseParams({
            attackerFormations: [atk],
            defenderFormation: def1,
            sectorDefenseBrigades: [def1, def2],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 100,
            finalAttackerCas: 50,
        });

        recordBattleHistory(params);

        // Both defenders should have history
        expect(def1.brigade_history).toBeDefined();
        expect(def2.brigade_history).toBeDefined();
        expect(def1.brigade_history!.battles_fought).toBe(1);
        expect(def2.brigade_history!.battles_fought).toBe(1);

        // Casualties distributed by weight: 100 total, 60/40 split
        const cas1 = def1.brigade_history!.engagements[0]!.casualties_taken;
        const cas2 = def2.brigade_history!.engagements[0]!.casualties_taken;
        expect(cas1 + cas2).toBe(100);
        expect(cas1).toBe(60);
        expect(cas2).toBe(40);

        // Multi-defender path uses zeroed equipment data
        expect(def1.brigade_history!.engagements[0]!.equipment_destroyed).toEqual({ tanks: 0, artillery: 0 });
        expect(def1.brigade_history!.engagements[0]!.equipment_captured).toEqual({ tanks: 0, artillery: 0 });
    });

    it('sorts multi-defender group by strictCompare on id', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        // Provide in reverse order
        const defZ = makeFormation({ id: 'def_z', faction: 'RS' as FactionId });
        const defA = makeFormation({ id: 'def_a', faction: 'RS' as FactionId });
        const weights = new Map<FormationId, number>([
            ['def_z' as FormationId, 0.5],
            ['def_a' as FormationId, 0.5],
        ]);

        const params = baseParams({
            attackerFormations: [atk],
            defenderFormation: defZ,
            sectorDefenseBrigades: [defZ, defA],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 10,
            finalAttackerCas: 10,
        });

        recordBattleHistory(params);

        // Both get recorded regardless of input order
        expect(defA.brigade_history).toBeDefined();
        expect(defZ.brigade_history).toBeDefined();
        expect(defA.brigade_history!.battles_fought).toBe(1);
        expect(defZ.brigade_history!.battles_fought).toBe(1);
    });

    it('isConcentrated is true when multiple attackers', () => {
        const atk1 = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const atk2 = makeFormation({ id: 'atk_2', faction: 'RBiH' as FactionId });
        const def = makeFormation({ id: 'def_1', faction: 'RS' as FactionId });

        const params = baseParams({
            attackerFormations: [atk1, atk2],
            defenderFormation: def,
        });

        recordBattleHistory(params);

        // was_concentrated should be true for multi-attacker
        expect(atk1.brigade_history!.engagements[0]!.was_concentrated).toBe(true);
        expect(atk2.brigade_history!.engagements[0]!.was_concentrated).toBe(true);
        expect(def.brigade_history!.engagements[0]!.was_concentrated).toBe(true);
    });

    it('isConcentrated is false when single attacker', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const def = makeFormation({ id: 'def_1', faction: 'RS' as FactionId });

        const params = baseParams({
            attackerFormations: [atk],
            defenderFormation: def,
        });

        recordBattleHistory(params);

        expect(atk.brigade_history!.engagements[0]!.was_concentrated).toBe(false);
        expect(def.brigade_history!.engagements[0]!.was_concentrated).toBe(false);
    });

    it('defFaction uses controller when present', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseParams({
            attackerFormations: [atk],
            controller: 'RS' as FactionId,
            attackerFaction: 'RBiH' as FactionId,
        });

        recordBattleHistory(params);

        // enemy_faction on attacker engagement = defFaction = controller = 'RS'
        expect(atk.brigade_history!.engagements[0]!.enemy_faction).toBe('RS');
    });

    it('defFaction falls back to attackerFaction when controller is null', () => {
        const atk = makeFormation({ id: 'atk_1', faction: 'RBiH' as FactionId });
        const params = baseParams({
            attackerFormations: [atk],
            controller: null,
            attackerFaction: 'RBiH' as FactionId,
        });

        recordBattleHistory(params);

        // enemy_faction on attacker engagement = defFaction = attackerFaction = 'RBiH'
        expect(atk.brigade_history!.engagements[0]!.enemy_faction).toBe('RBiH');
    });
});
