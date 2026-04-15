import { describe, expect, it } from 'vitest';

import { getFormationTier } from '../src/state/formation_constants.js';
import {
    getEquipmentRatio,
    getToTerrainDefenseMult,
} from '../src/sim/combat/combat_math.js';
import type { FormationState } from '../src/state/game_state.js';

function makeMilitia(id: string, faction: string, personnel: number): FormationState {
    return {
        id,
        faction,
        name: `TO ${id}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'militia',
        personnel,
        cohesion: 50,
        readiness: 'active',
        tags: ['mun:test_mun'],
    } as FormationState;
}

function makeBrigade(id: string, faction: string): FormationState {
    return {
        id,
        faction,
        name: `${faction} 1st Brigade`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 2000,
        cohesion: 60,
        readiness: 'active',
        tags: [],
        composition: {
            infantry: 2000,
            tanks: 10,
            artillery: 8,
            aa_systems: 2,
            tank_condition: { operational: 0.8, degraded: 0.1, non_operational: 0.1 },
            artillery_condition: { operational: 0.7, degraded: 0.2, non_operational: 0.1 },
        },
    } as FormationState;
}

describe('TO terrain combat modifiers', () => {
    it('returns faction-specific equipment ratios for detachments and battalions', () => {
        expect(getFormationTier(makeMilitia('rbih_det', 'RBiH', 200))).toBe('detachment');
        expect(getEquipmentRatio(makeMilitia('rbih_det', 'RBiH', 200))).toBe(0.15);
        expect(getEquipmentRatio(makeMilitia('hrhb_det', 'HRHB', 300))).toBe(0.5);
        expect(getEquipmentRatio(makeMilitia('rs_det', 'RS', 150))).toBe(0.5);
        expect(getEquipmentRatio(makeMilitia('rbih_bat', 'RBiH', 800))).toBe(0.4);
        expect(getEquipmentRatio(makeMilitia('rs_bat', 'RS', 1000))).toBe(0.7);
    });

    it('uses the standard composition-based ratio for regular brigades', () => {
        const ratio = getEquipmentRatio(makeBrigade('rs_brig', 'RS'));
        expect(ratio).toBeGreaterThan(0.5);
        expect(ratio).toBeLessThan(1.5);
        expect(ratio).not.toBe(0.7);
    });

    it('applies strong urban and Sarajevo defense multipliers to detachments', () => {
        expect(getToTerrainDefenseMult('detachment', 'op:centar_sarajevo:centar_1', { 'op:centar_sarajevo:centar_1': 1.1 })).toBe(2.5);
        expect(getToTerrainDefenseMult('detachment', 'op:sarajevo:stari_grad_1', { 'op:sarajevo:stari_grad_1': 1.0 })).toBe(2.5);
    });

    it('keeps open-terrain detachments at 1.0 and boosts rough terrain appropriately', () => {
        expect(getToTerrainDefenseMult('detachment', 'op:posavina:plain_1', { 'op:posavina:plain_1': 1.0 })).toBe(1.0);
        expect(getToTerrainDefenseMult('detachment', 'op:foca:mountain_2', { 'op:foca:mountain_2': 1.4 })).toBe(2.0);
        expect(getToTerrainDefenseMult('battalion', 'op:gorazde:mountain_1', { 'op:gorazde:mountain_1': 1.4 })).toBe(2.0);
        expect(getToTerrainDefenseMult('battalion', 'op:gradacac:wooded_1', { 'op:gradacac:wooded_1': 1.2 })).toBe(1.5);
    });

    it('leaves brigades at 1.0 regardless of terrain', () => {
        expect(getToTerrainDefenseMult('brigade', 'op:centar_sarajevo:centar_1', { 'op:centar_sarajevo:centar_1': 1.0 })).toBe(1.0);
        expect(getToTerrainDefenseMult('brigade', 'op:foca:mountain_2', { 'op:foca:mountain_2': 1.8 })).toBe(1.0);
        expect(getToTerrainDefenseMult('brigade', 'op:posavina:plain_1', {})).toBe(1.0);
    });
});
