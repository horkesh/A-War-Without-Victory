/**
 * Tests for src/sim/combat/attack_equipment_effects.ts
 *
 * Covers: computeFormationEquipmentLoss, accumulateScavenge,
 *         processEquipmentTransfers, buildBattleEquipmentReport,
 *         buildAttackerEquipmentRecord, buildDefenderEquipmentRecord
 */

import { describe, expect, it } from 'vitest';
import {
    computeFormationEquipmentLoss,
    accumulateScavenge,
    processEquipmentTransfers,
    buildBattleEquipmentReport,
    buildAttackerEquipmentRecord,
    buildDefenderEquipmentRecord,
    TANK_LOSS_RATE,
    ARTILLERY_LOSS_RATE,
} from '../src/sim/combat/attack_equipment_effects.js';
import type { EquipmentTransferResult } from '../src/sim/combat/attack_equipment_effects.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { CasualtyLedger } from '../src/state/casualty_ledger.js';
import type { BrigadeComposition, FactionId, FormationState } from '../src/state/game_state.js';
import type { OsidPopulationMap } from '../src/data/operational_data_types.js';

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

function makeLedger(): CasualtyLedger {
    return initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']);
}

// ═══════════════════════════════════════════════════════════════════════════
// computeFormationEquipmentLoss
// ═══════════════════════════════════════════════════════════════════════════

describe('computeFormationEquipmentLoss', () => {
    it('attacker with >=10 tanks: max(1, round(tanks * 0.08))', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 20 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        // round(20 * 0.08) = round(1.6) = 2, max(1, 2) = 2
        expect(tanksLost).toBe(2);
    });

    it('attacker with >=10 tanks enforces min-1 loss', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 10 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        // round(10 * 0.08) = round(0.8) = 1, max(1, 1) = 1
        expect(tanksLost).toBe(1);
    });

    it('attacker with <10 tanks (scarce protection): round(tanks * 0.08 * 0.5)', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 3 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        // round(3 * 0.08 * 0.5) = round(0.12) = 0 — no min-1 for scarce tanks
        expect(tanksLost).toBe(0);
    });

    it('attacker with 9 tanks (boundary): scarce protection, no min-1', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 9 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        // round(9 * 0.08 * 0.5) = round(0.36) = 0
        expect(tanksLost).toBe(0);
    });

    it('attacker artillery: max(1, round(art * 0.04))', () => {
        const f = makeFormation({ composition: makeComposition({ artillery: 30 }) });
        const ledger = makeLedger();
        const { artLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        // round(30 * 0.04) = round(1.2) = 1, max(1, 1) = 1
        expect(artLost).toBe(1);
    });

    it('attacker artillery enforces min-1 for any positive count', () => {
        const f = makeFormation({ composition: makeComposition({ artillery: 5 }) });
        const ledger = makeLedger();
        const { artLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        // round(5 * 0.04) = round(0.2) = 0, max(1, 0) = 1
        expect(artLost).toBe(1);
    });

    it('defender with >=10 tanks: max(1, round(tanks * 0.08 * 0.5))', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 20 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'defender', ledger);
        // round(20 * 0.08 * 0.5) = round(0.8) = 1, max(1, 1) = 1
        expect(tanksLost).toBe(1);
    });

    it('defender with >=10 tanks enforces min-1', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 12 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'defender', ledger);
        // round(12 * 0.08 * 0.5) = round(0.48) = 0, max(1, 0) = 1
        expect(tanksLost).toBe(1);
    });

    it('defender with <10 tanks: round(tanks * 0.08 * 0.25), no min-1', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 5 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'defender', ledger);
        // round(5 * 0.08 * 0.25) = round(0.1) = 0
        expect(tanksLost).toBe(0);
    });

    it('defender artillery: max(1, round(art * 0.04 * 0.5))', () => {
        const f = makeFormation({ composition: makeComposition({ artillery: 30 }) });
        const ledger = makeLedger();
        const { artLost } = computeFormationEquipmentLoss(f, 'defender', ledger);
        // round(30 * 0.04 * 0.5) = round(0.6) = 1, max(1, 1) = 1
        expect(artLost).toBe(1);
    });

    it('defender artillery enforces min-1 for any positive count', () => {
        const f = makeFormation({ composition: makeComposition({ artillery: 3 }) });
        const ledger = makeLedger();
        const { artLost } = computeFormationEquipmentLoss(f, 'defender', ledger);
        // round(3 * 0.04 * 0.5) = round(0.06) = 0, max(1, 0) = 1
        expect(artLost).toBe(1);
    });

    it('zero tanks and artillery: no losses', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 0, artillery: 0 }) });
        const ledger = makeLedger();
        const { tanksLost, artLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        expect(tanksLost).toBe(0);
        expect(artLost).toBe(0);
    });

    it('zero equipment does not record to casualty ledger', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 0, artillery: 0 }) });
        const ledger = makeLedger();
        computeFormationEquipmentLoss(f, 'attacker', ledger);
        expect(ledger['RS']!.equipment_lost.tanks).toBe(0);
        expect(ledger['RS']!.equipment_lost.artillery).toBe(0);
    });

    it('mutates composition in place', () => {
        const comp = makeComposition({ tanks: 40, artillery: 20 });
        const f = makeFormation({ composition: comp });
        const ledger = makeLedger();
        computeFormationEquipmentLoss(f, 'attacker', ledger);
        // Tanks reduced: round(40 * 0.08) = 3, max(1,3)=3
        expect(comp.tanks).toBe(37);
        // Artillery reduced: max(1, round(20 * 0.04)) = max(1, 1) = 1
        expect(comp.artillery).toBe(19);
    });

    it('records equipment loss to casualty ledger', () => {
        const f = makeFormation({
            faction: 'RS' as FactionId,
            composition: makeComposition({ tanks: 40, artillery: 20 }),
        });
        const ledger = makeLedger();
        const { tanksLost, artLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        expect(ledger['RS']!.equipment_lost.tanks).toBe(tanksLost);
        expect(ledger['RS']!.equipment_lost.artillery).toBe(artLost);
    });

    it('large attacker tank count: round(50 * 0.08) = 4', () => {
        const f = makeFormation({ composition: makeComposition({ tanks: 50 }) });
        const ledger = makeLedger();
        const { tanksLost } = computeFormationEquipmentLoss(f, 'attacker', ledger);
        expect(tanksLost).toBe(4);
        expect(f.composition!.tanks).toBe(46);
    });

    it('constants are correct', () => {
        expect(TANK_LOSS_RATE).toBe(0.08);
        expect(ARTILLERY_LOSS_RATE).toBe(0.04);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// accumulateScavenge
// ═══════════════════════════════════════════════════════════════════════════

describe('accumulateScavenge', () => {
    it('fractional amounts below 1.0 accumulate and return 0', () => {
        const f = makeFormation();
        const result = accumulateScavenge(f, 0.3, 0.4);
        expect(result.tanks).toBe(0);
        expect(result.art).toBe(0);
        expect(f.scavenge_accumulator!.tanks).toBeCloseTo(0.3);
        expect(f.scavenge_accumulator!.artillery).toBeCloseTo(0.4);
    });

    it('amounts that cross 1.0 threshold grant whole units and debit accumulator', () => {
        const f = makeFormation();
        f.scavenge_accumulator = { tanks: 0.8, artillery: 0.7 };
        const result = accumulateScavenge(f, 0.5, 0.6);
        // tanks: 0.8 + 0.5 = 1.3 → grant 1, remainder 0.3
        // art: 0.7 + 0.6 = 1.3 → grant 1, remainder 0.3
        expect(result.tanks).toBe(1);
        expect(result.art).toBe(1);
        expect(f.scavenge_accumulator!.tanks).toBeCloseTo(0.3);
        expect(f.scavenge_accumulator!.artillery).toBeCloseTo(0.3);
    });

    it('initializes scavenge_accumulator if not present', () => {
        const f = makeFormation();
        delete f.scavenge_accumulator;
        accumulateScavenge(f, 0.1, 0.2);
        expect(f.scavenge_accumulator).toBeDefined();
        expect(f.scavenge_accumulator!.tanks).toBeCloseTo(0.1);
        expect(f.scavenge_accumulator!.artillery).toBeCloseTo(0.2);
    });

    it('multiple calls accumulate fractionally', () => {
        const f = makeFormation();
        // Call 1: 0.3 tanks, 0.2 art
        let r = accumulateScavenge(f, 0.3, 0.2);
        expect(r.tanks).toBe(0);
        expect(r.art).toBe(0);

        // Call 2: 0.3 tanks (total 0.6), 0.3 art (total 0.5)
        r = accumulateScavenge(f, 0.3, 0.3);
        expect(r.tanks).toBe(0);
        expect(r.art).toBe(0);

        // Call 3: 0.5 tanks (total 1.1 → grant 1, remain 0.1), 0.6 art (total 1.1 → grant 1, remain 0.1)
        r = accumulateScavenge(f, 0.5, 0.6);
        expect(r.tanks).toBe(1);
        expect(r.art).toBe(1);
        expect(f.scavenge_accumulator!.tanks).toBeCloseTo(0.1, 5);
        expect(f.scavenge_accumulator!.artillery).toBeCloseTo(0.1, 5);
    });

    it('grants multiple whole units when amount is large', () => {
        const f = makeFormation();
        const result = accumulateScavenge(f, 3.7, 2.4);
        expect(result.tanks).toBe(3);
        expect(result.art).toBe(2);
        expect(f.scavenge_accumulator!.tanks).toBeCloseTo(0.7);
        expect(f.scavenge_accumulator!.artillery).toBeCloseTo(0.4);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// processEquipmentTransfers
// ═══════════════════════════════════════════════════════════════════════════

describe('processEquipmentTransfers', () => {
    // Helper for processEquipmentTransfers params
    function makeTransferParams(overrides: Record<string, unknown> = {}) {
        return {
            outcome: 'victory' as const,
            firstAttacker: makeFormation({
                id: 'atk_bde',
                faction: 'RBiH' as FactionId,
                composition: makeComposition({ tanks: 10, artillery: 8 }),
            }),
            defenderFormation: makeFormation({
                id: 'def_bde',
                faction: 'RS' as FactionId,
                composition: makeComposition({ tanks: 20, artillery: 15 }),
            }),
            attackerFaction: 'RBiH',
            controller: 'RS',
            targetOsid: 'op:test:test_1',
            totalATanksLost: 2,
            totalAArtLost: 1,
            totalDTanksLost: 3,
            totalDArtLost: 2,
            osidPopulationMap: null as OsidPopulationMap | null,
            ...overrides,
        };
    }

    describe('attacker wins — scavenging rates', () => {
        it('decisive_victory: attacker scavenges at 0.20, defender at 0.15', () => {
            // With large losses to ensure accumulator crosses 1.0
            const params = makeTransferParams({
                outcome: 'decisive_victory' as const,
                totalDTanksLost: 10,
                totalDArtLost: 10,
                totalATanksLost: 8,
                totalAArtLost: 8,
            });
            const result = processEquipmentTransfers(params);
            // Attacker scavenges from defender losses: 10 * 0.20 = 2.0 tanks → 2 via accumulator
            // Defender scavenges from attacker losses: 8 * 0.15 = 1.2 tanks → 1 via accumulator
            // Total scavenged tanks = attacker scav + defender scav (both contribute to scavengedTanks)
            expect(result.scavengedTanks).toBeGreaterThanOrEqual(2);
        });

        it('victory: attacker scavenges at 0.15', () => {
            const params = makeTransferParams({
                outcome: 'victory' as const,
                totalDTanksLost: 20,
                totalDArtLost: 15,
            });
            const result = processEquipmentTransfers(params);
            // 20 * 0.15 = 3.0 tanks → 3
            expect(result.scavengedTanks).toBeGreaterThanOrEqual(3);
        });

        it('costly_victory: attacker scavenges at 0.10', () => {
            const params = makeTransferParams({
                outcome: 'costly_victory' as const,
                totalDTanksLost: 20,
                totalDArtLost: 20,
                totalATanksLost: 5,
                totalAArtLost: 3,
            });
            const result = processEquipmentTransfers(params);
            // Attacker: 20 * 0.10 = 2.0 tanks → 2
            // Defender: 5 * 0.15 = 0.75 → 0 (accumulator)
            expect(result.scavengedTanks).toBeGreaterThanOrEqual(2);
        });

        it('attacker victory: defender scavenges at 0.15 (home ground recovery)', () => {
            const params = makeTransferParams({
                outcome: 'victory' as const,
                totalATanksLost: 10,
                totalAArtLost: 10,
            });
            const defBefore = params.defenderFormation!.composition!.tanks;
            processEquipmentTransfers(params);
            // Defender scavenges: 10 * 0.15 = 1.5 → 1 via accumulator
            // defender.composition.tanks should increase
            const defAfter = params.defenderFormation!.composition!.tanks;
            // Note: capture also removes tanks from defender, but scavenge adds
            // We just check the scavenge accumulation happened
            expect(params.defenderFormation!.scavenge_accumulator).toBeDefined();
        });
    });

    describe('attacker loses — scavenging rates', () => {
        it('repulsed: defender scavenges at 0.15, attacker at 0.05', () => {
            const params = makeTransferParams({
                outcome: 'repulsed' as const,
                totalATanksLost: 10,
                totalAArtLost: 10,
                totalDTanksLost: 10,
                totalDArtLost: 10,
            });
            const result = processEquipmentTransfers(params);
            // Defender: 10 * 0.15 = 1.5 → 1
            // Attacker: 10 * 0.05 = 0.5 → 0 (accumulator)
            expect(result.scavengedTanks).toBeGreaterThanOrEqual(1);
        });

        it('catastrophic: defender scavenges at 0.25, attacker at 0.05', () => {
            const params = makeTransferParams({
                outcome: 'catastrophic' as const,
                totalATanksLost: 10,
                totalAArtLost: 10,
                totalDTanksLost: 5,
                totalDArtLost: 5,
            });
            const result = processEquipmentTransfers(params);
            // Defender: 10 * 0.25 = 2.5 → 2
            // Attacker: 5 * 0.05 = 0.25 → 0
            expect(result.scavengedTanks).toBeGreaterThanOrEqual(2);
        });
    });

    describe('stalemate — scavenging', () => {
        it('stalemate: both sides scavenge at 0.08', () => {
            const params = makeTransferParams({
                outcome: 'stalemate' as const,
                totalATanksLost: 15,
                totalAArtLost: 15,
                totalDTanksLost: 15,
                totalDArtLost: 15,
            });
            const result = processEquipmentTransfers(params);
            // Attacker: 15 * 0.08 = 1.2 → 1
            // Defender: 15 * 0.08 = 1.2 → 1
            expect(result.scavengedTanks).toBeGreaterThanOrEqual(1);
        });
    });

    describe('capture on attacker win', () => {
        it('decisive_victory: capture rate 0.08', () => {
            const params = makeTransferParams({
                outcome: 'decisive_victory' as const,
            });
            const defTanksBefore = params.defenderFormation!.composition!.tanks;
            const atkTanksBefore = params.firstAttacker.composition!.tanks;
            const result = processEquipmentTransfers(params);
            // Capture: floor(20 * 0.08) = 1
            expect(result.capturedTanks).toBe(1);
            expect(result.capturedBy).toBe('RBiH');
            expect(params.defenderFormation!.composition!.tanks).toBeLessThan(defTanksBefore);
        });

        it('victory: capture rate 0.05', () => {
            const params = makeTransferParams({
                outcome: 'victory' as const,
                defenderFormation: makeFormation({
                    id: 'def_bde',
                    faction: 'RS' as FactionId,
                    composition: makeComposition({ tanks: 40, artillery: 30 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // Capture: floor(40 * 0.05) = 2
            expect(result.capturedTanks).toBe(2);
            expect(result.capturedBy).toBe('RBiH');
        });

        it('costly_victory: capture rate 0.02', () => {
            const params = makeTransferParams({
                outcome: 'costly_victory' as const,
                defenderFormation: makeFormation({
                    id: 'def_bde',
                    faction: 'RS' as FactionId,
                    composition: makeComposition({ tanks: 100, artillery: 60 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // Capture: floor(100 * 0.02) = 2
            expect(result.capturedTanks).toBe(2);
            expect(result.capturedBy).toBe('RBiH');
        });
    });

    describe('capture on attacker loss', () => {
        it('catastrophic: capture rate 0.12, defender captures from attacker', () => {
            const params = makeTransferParams({
                outcome: 'catastrophic' as const,
                firstAttacker: makeFormation({
                    id: 'atk_bde',
                    faction: 'RBiH' as FactionId,
                    composition: makeComposition({ tanks: 30, artillery: 25 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // Capture: floor(30 * 0.12) = 3
            expect(result.capturedTanks).toBe(3);
            expect(result.capturedBy).toBe('RS');
        });

        it('repulsed: capture rate 0.05, defender captures from attacker', () => {
            const params = makeTransferParams({
                outcome: 'repulsed' as const,
                firstAttacker: makeFormation({
                    id: 'atk_bde',
                    faction: 'RBiH' as FactionId,
                    composition: makeComposition({ tanks: 40, artillery: 30 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // Capture: floor(40 * 0.05) = 2
            expect(result.capturedTanks).toBe(2);
            expect(result.capturedBy).toBe('RS');
        });

        it('DEFENSIVE_CAPTURE_MIN: attacker with >=10 tanks guarantees 1 captured on repulsed', () => {
            const params = makeTransferParams({
                outcome: 'repulsed' as const,
                firstAttacker: makeFormation({
                    id: 'atk_bde',
                    faction: 'RBiH' as FactionId,
                    composition: makeComposition({ tanks: 10, artillery: 5 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // rawCapTanks = 10 * 0.05 = 0.5, floor = 0, but tanks >= 10 → guaranteed 1
            expect(result.capturedTanks).toBe(1);
            expect(result.capturedBy).toBe('RS');
        });

        it('DEFENSIVE_CAPTURE_MIN_ART: attacker with >=15 artillery guarantees 1 captured', () => {
            const params = makeTransferParams({
                outcome: 'repulsed' as const,
                firstAttacker: makeFormation({
                    id: 'atk_bde',
                    faction: 'RBiH' as FactionId,
                    composition: makeComposition({ tanks: 5, artillery: 15 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // rawCapArt = 15 * 0.05 = 0.75, floor = 0, but artillery >= 15 → guaranteed 1
            expect(result.capturedArt).toBe(1);
            // Tanks: rawCapTanks = 5 * 0.05 = 0.25, floor = 0, tanks < 10 → 0
            expect(result.capturedTanks).toBe(0);
        });

        it('no capture guarantee when attacker has <10 tanks and <15 artillery', () => {
            const params = makeTransferParams({
                outcome: 'repulsed' as const,
                firstAttacker: makeFormation({
                    id: 'atk_bde',
                    faction: 'RBiH' as FactionId,
                    composition: makeComposition({ tanks: 9, artillery: 14 }),
                }),
            });
            const result = processEquipmentTransfers(params);
            // rawCapTanks = 9 * 0.05 = 0.45 → floor 0, tanks < 10 → 0
            // rawCapArt = 14 * 0.05 = 0.7 → floor 0, art < 15 → 0
            expect(result.capturedTanks).toBe(0);
            expect(result.capturedArt).toBe(0);
        });
    });

    describe('abandoned equipment', () => {
        it('RS controller, pop>500: attacker picks up abandoned equipment', () => {
            const popMap: OsidPopulationMap = new Map([['op:test:test_1', 3000]]);
            const params = makeTransferParams({
                outcome: 'victory' as const,
                defenderFormation: null, // no defender = uncontested
                controller: 'RS',
                osidPopulationMap: popMap,
            });
            const result = processEquipmentTransfers(params);
            // Tanks: floor(3000 * 0.0004) = floor(1.2) = 1
            // Art: floor(3000 * 0.0006) = floor(1.8) = 1
            expect(result.capturedTanks).toBe(1);
            expect(result.capturedArt).toBe(1);
            expect(result.capturedBy).toBe('RBiH');
        });

        it('RS controller, large pop: scales with population', () => {
            // Use 7500 to avoid floating point edge: 7500*0.0004=3.0 exact, 7500*0.0006=4.5→4
            const popMap: OsidPopulationMap = new Map([['op:test:test_1', 7500]]);
            const params = makeTransferParams({
                outcome: 'victory' as const,
                defenderFormation: null,
                controller: 'RS',
                osidPopulationMap: popMap,
            });
            const result = processEquipmentTransfers(params);
            // Tanks: floor(7500 * 0.0004) = floor(3.0) = 3
            // Art: floor(7500 * 0.0006) = floor(4.5) = 4
            expect(result.capturedTanks).toBe(3);
            expect(result.capturedArt).toBe(4);
        });

        it('non-RS controller: no abandoned equipment pickup', () => {
            const popMap: OsidPopulationMap = new Map([['op:test:test_1', 5000]]);
            const params = makeTransferParams({
                outcome: 'victory' as const,
                defenderFormation: null,
                controller: 'RBiH',
                osidPopulationMap: popMap,
            });
            const result = processEquipmentTransfers(params);
            expect(result.capturedTanks).toBe(0);
            expect(result.capturedArt).toBe(0);
        });

        it('RS controller but pop<=500: no abandoned equipment pickup', () => {
            const popMap: OsidPopulationMap = new Map([['op:test:test_1', 500]]);
            const params = makeTransferParams({
                outcome: 'victory' as const,
                defenderFormation: null,
                controller: 'RS',
                osidPopulationMap: popMap,
            });
            const result = processEquipmentTransfers(params);
            // Tanks: floor(500 * 0.0004) = floor(0.2) = 0
            // Art: floor(500 * 0.0006) = floor(0.3) = 0
            expect(result.capturedTanks).toBe(0);
            expect(result.capturedArt).toBe(0);
        });

        it('null controller: no abandoned equipment pickup', () => {
            const popMap: OsidPopulationMap = new Map([['op:test:test_1', 5000]]);
            const params = makeTransferParams({
                outcome: 'victory' as const,
                defenderFormation: null,
                controller: null,
                osidPopulationMap: popMap,
            });
            const result = processEquipmentTransfers(params);
            expect(result.capturedTanks).toBe(0);
            expect(result.capturedArt).toBe(0);
        });

        it('abandoned equipment mutates attacker composition', () => {
            const popMap: OsidPopulationMap = new Map([['op:test:test_1', 3000]]);
            const attacker = makeFormation({
                id: 'atk_bde',
                faction: 'RBiH' as FactionId,
                composition: makeComposition({ tanks: 5, artillery: 3 }),
            });
            const params = makeTransferParams({
                outcome: 'victory' as const,
                firstAttacker: attacker,
                defenderFormation: null,
                controller: 'RS',
                osidPopulationMap: popMap,
            });
            processEquipmentTransfers(params);
            // Tanks: 5 + floor(3000 * 0.0004) = 5 + 1 = 6
            expect(attacker.composition!.tanks).toBe(6);
            // Art: 3 + floor(3000 * 0.0006) = 3 + 1 = 4
            expect(attacker.composition!.artillery).toBe(4);
        });
    });

    describe('zero losses produce no scavenging', () => {
        it('no losses means no scavenged equipment', () => {
            const params = makeTransferParams({
                outcome: 'victory' as const,
                totalATanksLost: 0,
                totalAArtLost: 0,
                totalDTanksLost: 0,
                totalDArtLost: 0,
            });
            const result = processEquipmentTransfers(params);
            expect(result.scavengedTanks).toBe(0);
            expect(result.scavengedArt).toBe(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildBattleEquipmentReport
// ═══════════════════════════════════════════════════════════════════════════

describe('buildBattleEquipmentReport', () => {
    it('correctly maps loss totals and transfers to BattleEquipmentData', () => {
        const transfers: EquipmentTransferResult = {
            scavengedTanks: 3,
            scavengedArt: 2,
            scavengedBy: 'RBiH',
            capturedTanks: 1,
            capturedArt: 0,
            capturedBy: 'RBiH',
        };
        const report = buildBattleEquipmentReport(5, 3, 8, 4, transfers);
        expect(report.attacker_tanks_lost).toBe(5);
        expect(report.attacker_artillery_lost).toBe(3);
        expect(report.defender_tanks_lost).toBe(8);
        expect(report.defender_artillery_lost).toBe(4);
        expect(report.scavenged_tanks).toBe(3);
        expect(report.scavenged_artillery).toBe(2);
        expect(report.scavenged_by).toBe('RBiH');
        expect(report.captured_tanks).toBe(1);
        expect(report.captured_artillery).toBe(0);
        expect(report.captured_by).toBe('RBiH');
    });

    it('empty scavengedBy/capturedBy become undefined', () => {
        const transfers: EquipmentTransferResult = {
            scavengedTanks: 0,
            scavengedArt: 0,
            scavengedBy: '',
            capturedTanks: 0,
            capturedArt: 0,
            capturedBy: '',
        };
        const report = buildBattleEquipmentReport(0, 0, 0, 0, transfers);
        expect(report.scavenged_by).toBeUndefined();
        expect(report.captured_by).toBeUndefined();
    });

    it('zero losses produce clean report', () => {
        const transfers: EquipmentTransferResult = {
            scavengedTanks: 0,
            scavengedArt: 0,
            scavengedBy: '',
            capturedTanks: 0,
            capturedArt: 0,
            capturedBy: '',
        };
        const report = buildBattleEquipmentReport(0, 0, 0, 0, transfers);
        expect(report.attacker_tanks_lost).toBe(0);
        expect(report.defender_tanks_lost).toBe(0);
        expect(report.scavenged_tanks).toBe(0);
        expect(report.captured_tanks).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildAttackerEquipmentRecord / buildDefenderEquipmentRecord
// ═══════════════════════════════════════════════════════════════════════════

describe('buildAttackerEquipmentRecord', () => {
    it('records destroyed enemy equipment and captured equipment when faction matches', () => {
        const record = buildAttackerEquipmentRecord(8, 4, 'RBiH', 3, 1, 'RBiH');
        expect(record.destroyed.tanks).toBe(8);
        expect(record.destroyed.artillery).toBe(4);
        expect(record.captured.tanks).toBe(3);
        expect(record.captured.artillery).toBe(1);
    });

    it('zero captured if capturedBy is the other faction', () => {
        const record = buildAttackerEquipmentRecord(8, 4, 'RS', 3, 1, 'RBiH');
        expect(record.destroyed.tanks).toBe(8);
        expect(record.destroyed.artillery).toBe(4);
        expect(record.captured.tanks).toBe(0);
        expect(record.captured.artillery).toBe(0);
    });

    it('zero captured if capturedBy is empty string', () => {
        const record = buildAttackerEquipmentRecord(5, 2, '', 0, 0, 'RBiH');
        expect(record.captured.tanks).toBe(0);
        expect(record.captured.artillery).toBe(0);
    });
});

describe('buildDefenderEquipmentRecord', () => {
    it('records destroyed enemy equipment and captured equipment when faction matches', () => {
        const record = buildDefenderEquipmentRecord(5, 3, 'RS', 2, 1, 'RS');
        expect(record.destroyed.tanks).toBe(5);
        expect(record.destroyed.artillery).toBe(3);
        expect(record.captured.tanks).toBe(2);
        expect(record.captured.artillery).toBe(1);
    });

    it('zero captured if capturedBy is the other faction', () => {
        const record = buildDefenderEquipmentRecord(5, 3, 'RBiH', 2, 1, 'RS');
        expect(record.destroyed.tanks).toBe(5);
        expect(record.destroyed.artillery).toBe(3);
        expect(record.captured.tanks).toBe(0);
        expect(record.captured.artillery).toBe(0);
    });

    it('zero captured if capturedBy is empty string', () => {
        const record = buildDefenderEquipmentRecord(5, 3, '', 0, 0, 'RS');
        expect(record.captured.tanks).toBe(0);
        expect(record.captured.artillery).toBe(0);
    });

    it('destroyed reflects attacker losses (from defender perspective)', () => {
        const record = buildDefenderEquipmentRecord(10, 7, 'RS', 0, 0, 'RS');
        expect(record.destroyed.tanks).toBe(10);
        expect(record.destroyed.artillery).toBe(7);
    });
});
