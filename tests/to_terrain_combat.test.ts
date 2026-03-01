/**
 * Phase I Overhaul Phase E: Tests for TO terrain combat modifiers.
 *
 * Tests cover:
 *  1.  getEquipmentRatio: RBiH detachment returns 0.15
 *  2.  getEquipmentRatio: HRHB detachment returns 0.5
 *  3.  getEquipmentRatio: RBiH battalion returns 0.4
 *  4.  getEquipmentRatio: RS battalion returns 0.7
 *  5.  getEquipmentRatio: regular brigade returns standard value (not overridden)
 *  6.  getToTerrainDefenseMult: detachment in urban OSID returns 2.5
 *  7.  getToTerrainDefenseMult: detachment in open terrain (terrainMult=1.0) returns 1.0
 *  8.  getToTerrainDefenseMult: detachment in mountain terrain (terrainMult=1.4) returns 2.0
 *  9.  getToTerrainDefenseMult: brigade always returns 1.0 regardless of terrain
 *  10. RS detachment returns 0.5 (same as HRHB for detachment tier)
 *  11. getToTerrainDefenseMult: battalion in mountain terrain returns 2.0
 *  12. getToTerrainDefenseMult: battalion in moderate terrain (terrainMult=1.2) returns 1.5
 *  13. getToTerrainDefenseMult: detachment in sarajevo OSID returns 2.5
 */

import assert from 'node:assert';
import { describe, test } from 'node:test';
import { getFormationTier } from '../src/state/formation_constants.js';
import {
    getEquipmentRatio,
    getToTerrainDefenseMult,
} from '../src/sim/combat/combat_math.js';
import type { FormationState } from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMilitia(
    id: string,
    faction: string,
    personnel: number
): FormationState {
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
        tags: [`mun:test_mun`]
    };
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
            artillery_condition: { operational: 0.7, degraded: 0.2, non_operational: 0.1 }
        }
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase E: TO terrain combat modifiers', () => {

    // Test 1: RBiH detachment equipment ratio = 0.15
    test('1. getEquipmentRatio: RBiH detachment returns 0.15', () => {
        const f = makeMilitia('rbih_det', 'RBiH', 200); // < 500 = detachment
        assert.strictEqual(getFormationTier(f), 'detachment');
        assert.strictEqual(getEquipmentRatio(f), 0.15);
    });

    // Test 2: HRHB detachment equipment ratio = 0.5
    test('2. getEquipmentRatio: HRHB detachment returns 0.5', () => {
        const f = makeMilitia('hrhb_det', 'HRHB', 300); // < 500 = detachment
        assert.strictEqual(getFormationTier(f), 'detachment');
        assert.strictEqual(getEquipmentRatio(f), 0.5);
    });

    // Test 3: RBiH battalion equipment ratio = 0.4
    test('3. getEquipmentRatio: RBiH battalion returns 0.4', () => {
        const f = makeMilitia('rbih_bat', 'RBiH', 800); // 500-1499 = battalion
        assert.strictEqual(getFormationTier(f), 'battalion');
        assert.strictEqual(getEquipmentRatio(f), 0.4);
    });

    // Test 4: RS battalion equipment ratio = 0.7
    test('4. getEquipmentRatio: RS battalion returns 0.7', () => {
        const f = makeMilitia('rs_bat', 'RS', 1000); // battalion
        assert.strictEqual(getFormationTier(f), 'battalion');
        assert.strictEqual(getEquipmentRatio(f), 0.7);
    });

    // Test 5: regular brigade uses composition-based ratio (not overridden)
    test('5. getEquipmentRatio: regular brigade returns standard composition-based value', () => {
        const f = makeBrigade('rs_brig', 'RS');
        // Brigade with infantry=2000, tanks=10, artillery=8 — not militia, so standard formula
        // heavyCount=20, total=2020, heavyProportion=20/2020≈0.0099
        // heavyCondition=(10*0.8+8*0.7)/(10+8)=(8+5.6)/18≈0.756
        // heavyBonus=0.0099*0.756≈0.0075
        // result = 0.5+0.0075 = ~0.508, well below 1.5
        const ratio = getEquipmentRatio(f);
        assert.ok(ratio > 0.5 && ratio < 1.5, `Expected standard ratio 0.5–1.5, got ${ratio}`);
        assert.ok(ratio !== 0.7, 'Brigade should not use militia override 0.7');
    });

    // Test 6: detachment in urban OSID returns 2.5
    test('6. getToTerrainDefenseMult: detachment in urban OSID returns 2.5', () => {
        const terrainByOsid: Record<string, number> = { 'op:centar_sarajevo:centar_1': 1.1 };
        const mult = getToTerrainDefenseMult('detachment', 'op:centar_sarajevo:centar_1', terrainByOsid);
        assert.strictEqual(mult, 2.5);
    });

    // Test 7: detachment in open terrain returns 1.0
    test('7. getToTerrainDefenseMult: detachment in open terrain (terrainMult=1.0) returns 1.0', () => {
        const terrainByOsid: Record<string, number> = { 'op:posavina:plain_1': 1.0 };
        const mult = getToTerrainDefenseMult('detachment', 'op:posavina:plain_1', terrainByOsid);
        assert.strictEqual(mult, 1.0);
    });

    // Test 8: detachment in mountain terrain (terrainMult=1.4) returns 2.0
    test('8. getToTerrainDefenseMult: detachment in mountain terrain (terrainMult=1.4) returns 2.0', () => {
        const terrainByOsid: Record<string, number> = { 'op:foca:mountain_2': 1.4 };
        const mult = getToTerrainDefenseMult('detachment', 'op:foca:mountain_2', terrainByOsid);
        assert.strictEqual(mult, 2.0);
    });

    // Test 9: brigade always returns 1.0 regardless of terrain
    test('9. getToTerrainDefenseMult: brigade always returns 1.0 regardless of terrain', () => {
        const terrainByOsid: Record<string, number> = {
            'op:centar_sarajevo:centar_1': 1.0,
            'op:foca:mountain_2': 1.8
        };
        assert.strictEqual(getToTerrainDefenseMult('brigade', 'op:centar_sarajevo:centar_1', terrainByOsid), 1.0);
        assert.strictEqual(getToTerrainDefenseMult('brigade', 'op:foca:mountain_2', terrainByOsid), 1.0);
        assert.strictEqual(getToTerrainDefenseMult('brigade', 'op:posavina:plain_1', {}), 1.0);
    });

    // Test 10: RS detachment also returns 0.5 (not militia-specific low value)
    test('10. getEquipmentRatio: RS detachment returns 0.5', () => {
        const f = makeMilitia('rs_det', 'RS', 150); // < 500 = detachment
        assert.strictEqual(getFormationTier(f), 'detachment');
        assert.strictEqual(getEquipmentRatio(f), 0.5);
    });

    // Test 11: battalion in mountain terrain also gets boost
    test('11. getToTerrainDefenseMult: battalion in mountain terrain (terrainMult=1.4) returns 2.0', () => {
        const terrainByOsid: Record<string, number> = { 'op:gorazde:mountain_1': 1.4 };
        const mult = getToTerrainDefenseMult('battalion', 'op:gorazde:mountain_1', terrainByOsid);
        assert.strictEqual(mult, 2.0);
    });

    // Test 12: battalion in moderate terrain returns 1.5
    test('12. getToTerrainDefenseMult: battalion in moderate terrain (terrainMult=1.2) returns 1.5', () => {
        const terrainByOsid: Record<string, number> = { 'op:gradacac:wooded_1': 1.2 };
        const mult = getToTerrainDefenseMult('battalion', 'op:gradacac:wooded_1', terrainByOsid);
        assert.strictEqual(mult, 1.5);
    });

    // Test 13: detachment in OSID containing 'sarajevo' keyword returns 2.5
    test('13. getToTerrainDefenseMult: detachment in sarajevo OSID returns 2.5', () => {
        const terrainByOsid: Record<string, number> = { 'op:sarajevo:stari_grad_1': 1.0 };
        const mult = getToTerrainDefenseMult('detachment', 'op:sarajevo:stari_grad_1', terrainByOsid);
        assert.strictEqual(mult, 2.5);
    });

});
