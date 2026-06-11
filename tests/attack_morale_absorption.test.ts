/**
 * Tests for src/sim/combat/attack_morale_absorption.ts
 *
 * Covers: evaluateAndApplyMoraleAbsorption — morale-based retreat resistance,
 *         homeland determination extra casualties, snap event emission.
 */

import { describe, expect, it } from 'vitest';
import {
    evaluateAndApplyMoraleAbsorption,
    MORALE_ABSORPTION_CAS_MULT,
} from '../src/sim/combat/attack_morale_absorption.js';
import { splitKiaWiaMia } from '../src/sim/combat/attack_casualty_distribution.js';
import { MIN_COMBAT_PERSONNEL } from '../src/state/formation_constants.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { FactionId, FormationState, BrigadeComposition } from '../src/state/game_state.js';
import type { CombatOutcome } from '../src/sim/combat/combat_math.js';
import type { AttackResolutionOsidReport, AttackResolutionOsidSnapEvent } from '../src/sim/combat/attack_resolution_types.js';
import type { OsidEthnicComposition } from '../src/sim/combat/ethnic_defense.js';
import {
    makeAttackComposition as makeComposition,
    makeAttackFormation as makeFormation,
} from './_helpers/combat.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers (extracted to tests/_helpers/combat.ts; aliased for local readability)
// ═══════════════════════════════════════════════════════════════════════════

function makeReport(): AttackResolutionOsidReport {
    return {
        orders_processed: 0,
        unique_attack_targets: 0,
        flips_applied: 0,
        casualty_attacker: 0,
        casualty_defender: 0,
        orders_by_faction: {},
        engaged_formation_ids: [],
        snap_events: [],
        snap_event_counts: {},
        battles: [],
    };
}

function makeEthnicMap(osid: string, bosniak: number, serb: number, croat: number): OsidEthnicComposition {
    return new Map([[osid, { bosniak, serb, croat }]]);
}

const TARGET_OSID = 'op:test:test_2';
const ENCLAVE_CAPITAL_OSID = 'op:srebrenica:srebrenica_2';

// ═══════════════════════════════════════════════════════════════════════════
// 1. No defender -> no absorption
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateAndApplyMoraleAbsorption', () => {
    describe('no defender', () => {
        it('returns moraleAbsorbed=false and flip unchanged when no defender', () => {
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: null,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
            expect(snapEvents).toHaveLength(0);
            expect(report.snap_events).toHaveLength(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Enclave capital last stand (capitalLastStand)
    // ═══════════════════════════════════════════════════════════════════════════

    describe('enclave capital last stand', () => {
        it('decisive_victory -> NOT absorbed (flip stays true)', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'decisive_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
            expect(snapEvents).toHaveLength(0);
        });

        it('victory -> absorbed (flip becomes false)', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(true);
            expect(result.flip).toBe(false);
            expect(snapEvents).toHaveLength(1);
            expect(snapEvents[0].snap_type).toBe('morale_absorption');
            expect(snapEvents[0].description).toContain('Enclave capital last stand');
        });

        it('costly_victory -> absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 30 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(true);
            expect(result.flip).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. ARBiH homeland (homelandLastStand, >= 50% co-ethnic)
    // ═══════════════════════════════════════════════════════════════════════════

    describe('ARBiH homeland last stand', () => {
        const ethnicMap = makeEthnicMap(TARGET_OSID, 0.6, 0.3, 0.1);

        it('costly_victory -> absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 30 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: TARGET_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: ethnicMap,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(true);
            expect(result.flip).toBe(false);
            expect(snapEvents[0].description).toContain('ARBiH homeland last stand');
        });

        it('victory -> absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 30 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: TARGET_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: ethnicMap,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(true);
            expect(result.flip).toBe(false);
        });

        it('decisive_victory -> NOT absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: TARGET_OSID,
                outcome: 'decisive_victory',
                flip: true,
                ethnicComposition: ethnicMap,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
        });

        it('stalemate -> NOT absorbed (flip was false to begin with)', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: TARGET_OSID,
                outcome: 'stalemate',
                flip: false,
                ethnicComposition: ethnicMap,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(false);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. Professional resilience (non-RBiH, morale >= floor)
    // ═══════════════════════════════════════════════════════════════════════════

    describe('professional resilience', () => {
        // RS floor = 55, HRHB floor = 60
        it('RS costly_victory at morale >= floor (55) -> absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 60 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(true);
            expect(result.flip).toBe(false);
            expect(snapEvents[0].description).toContain('Defender morale held');
        });

        it('RS victory at morale >= floor -> absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 70 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(true);
            expect(result.flip).toBe(false);
        });

        it('decisive_victory -> NOT absorbed even at high morale', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 90 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'decisive_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. Below morale floor -> no absorption
    // ═══════════════════════════════════════════════════════════════════════════

    describe('below morale floor', () => {
        it('RS morale below floor (55) on costly_victory -> no absorption', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 40 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
        });

        it('HRHB morale below floor (60) on victory -> no absorption', () => {
            const def = makeFormation({ id: 'def_1', faction: 'HRHB', morale: 55 });
            const report = makeReport();
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. Extra casualties when absorbed
    // ═══════════════════════════════════════════════════════════════════════════

    describe('extra casualties when absorbed', () => {
        it('attacker extra casualties = Math.round(finalAttackerCas * 0.6) distributed by personnel fraction', () => {
            const atk1 = makeFormation({ id: 'atk_1', faction: 'RS', personnel: 600 });
            const atk2 = makeFormation({ id: 'atk_2', faction: 'RS', personnel: 400 });
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80, personnel: 1000 });
            const report = makeReport();
            const ledger = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
            const finalAttackerCas = 100;
            const finalDefenderCas = 80;
            const extraMult = MORALE_ABSORPTION_CAS_MULT - 1.0; // 0.6
            const extraAttackerTotal = Math.round(finalAttackerCas * extraMult); // 60

            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [atk1, atk2],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas,
                finalDefenderCas,
                casualtyLedger: ledger,
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });

            // atk1 frac = 600/1000 = 0.6, extraCas = min(600-100, round(60*0.6)) = min(500, 36) = 36
            // atk2 frac = 400/1000 = 0.4, extraCas = min(400-100, round(60*0.4)) = min(300, 24) = 24
            expect(report.casualty_attacker).toBe(36 + 24);
            expect(atk1.personnel).toBe(600 - 36);
            expect(atk2.personnel).toBe(400 - 24);
        });

        it('defender extra casualties = Math.round(finalDefenderCas * 0.6) clamped by MIN_COMBAT_PERSONNEL', () => {
            const atk = makeFormation({ id: 'atk_1', faction: 'RS', personnel: 1000 });
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80, personnel: 150 });
            const report = makeReport();
            const ledger = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
            const finalDefenderCas = 200;

            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [atk],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas,
                casualtyLedger: ledger,
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });

            // extraDefenderTotal = min(max(0, 150-100), round(200*0.6)) = min(50, 120) = 50
            expect(report.casualty_defender).toBe(50);
            expect(def.personnel).toBe(150 - 50);
        });

        it('recordBattleCasualties called with correct KIA/WIA/MIA split', () => {
            const atk = makeFormation({ id: 'atk_1', faction: 'RS', personnel: 1000 });
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80, personnel: 1000 });
            const ledger = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
            const report = makeReport();
            const finalDefenderCas = 100;

            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [atk],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 100,
                finalDefenderCas,
                casualtyLedger: ledger,
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });

            // Defender: extraDefenderTotal = min(900, 60) = 60. Morale absorption now
            // records via splitKiaWiaMia (EH-2 gate, default-ON main split 0.22/0.76/0.02).
            const defSplit = splitKiaWiaMia(60);
            expect(ledger['RBiH'].killed).toBe(defSplit.killed);
            expect(ledger['RBiH'].wounded).toBe(defSplit.wounded);
            expect(ledger['RBiH'].missing_captured).toBe(defSplit.missing_captured);

            // Attacker: extraAttackerTotal = round(100*0.6) = 60, single attacker frac=1.0
            // extraCas = min(900, 60) = 60
            const atkSplit = splitKiaWiaMia(60);
            expect(ledger['RS'].killed).toBe(atkSplit.killed);
            expect(ledger['RS'].wounded).toBe(atkSplit.wounded);
            expect(ledger['RS'].missing_captured).toBe(atkSplit.missing_captured);
        });

        it('report.casualty_attacker and report.casualty_defender updated', () => {
            const atk = makeFormation({ id: 'atk_1', faction: 'RS', personnel: 1000 });
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80, personnel: 1000 });
            const report = makeReport();
            report.casualty_attacker = 100;
            report.casualty_defender = 80;

            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [atk],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 100,
                finalDefenderCas: 80,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });

            // Extra attacker: round(100*0.6) = 60, clamped by min(900, 60) = 60
            // Extra defender: min(900, round(80*0.6)) = min(900, 48) = 48
            expect(report.casualty_attacker).toBe(100 + 60);
            expect(report.casualty_defender).toBe(80 + 48);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. Morale drain
    // ═══════════════════════════════════════════════════════════════════════════

    describe('morale drain', () => {
        it('defender morale decreases by 5 when absorbed', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 70 });
            const report = makeReport();
            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(def.morale).toBe(65);
        });

        it('morale does not go below 0', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 3 });
            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RS' })],
                targetOsid: ENCLAVE_CAPITAL_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report: makeReport(),
                firstAttackerId: 'atk_1',
                battleSnapEvents: [],
            });
            expect(def.morale).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. Snap event
    // ═══════════════════════════════════════════════════════════════════════════

    describe('snap event', () => {
        it('morale_absorption event pushed to both battleSnapEvents and report', () => {
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 70 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [makeFormation({ id: 'atk_1', faction: 'RBiH' })],
                targetOsid: TARGET_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 50,
                finalDefenderCas: 30,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(snapEvents).toHaveLength(1);
            expect(snapEvents[0].snap_type).toBe('morale_absorption');
            expect(snapEvents[0].trigger_phase).toBe('post_battle');
            expect(snapEvents[0].attacker_brigade).toBe('atk_1');
            expect(snapEvents[0].target_osid).toBe(TARGET_OSID);
            expect(snapEvents[0].affected_formation).toBe('def_1');
            expect(snapEvents[0].effects).toEqual({ flip_prevented: true, morale_drain: -5 });

            expect(report.snap_events).toHaveLength(1);
            expect(report.snap_events[0]).toBe(snapEvents[0]);
            expect(report.snap_event_counts['morale_absorption']).toBe(1);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. No absorption -> no extra casualties, no snap event, flip unchanged
    // ═══════════════════════════════════════════════════════════════════════════

    describe('no absorption -> no side effects', () => {
        it('decisive_victory: no extra casualties, no snap event, flip stays true', () => {
            const atk = makeFormation({ id: 'atk_1', faction: 'RS', personnel: 1000 });
            const def = makeFormation({ id: 'def_1', faction: 'RBiH', morale: 80, personnel: 1000 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const ledger = initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']);
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [atk],
                targetOsid: TARGET_OSID,
                outcome: 'decisive_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 100,
                finalDefenderCas: 80,
                casualtyLedger: ledger,
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
            expect(snapEvents).toHaveLength(0);
            expect(report.casualty_attacker).toBe(0);
            expect(report.casualty_defender).toBe(0);
            expect(atk.personnel).toBe(1000);
            expect(def.personnel).toBe(1000);
            expect(def.morale).toBe(80);
        });

        it('below-floor morale on costly_victory: no side effects', () => {
            const atk = makeFormation({ id: 'atk_1', faction: 'RBiH', personnel: 1000 });
            const def = makeFormation({ id: 'def_1', faction: 'RS', morale: 40, personnel: 1000 });
            const report = makeReport();
            const snapEvents: AttackResolutionOsidSnapEvent[] = [];
            const result = evaluateAndApplyMoraleAbsorption({
                defenderFormation: def,
                attackerFormations: [atk],
                targetOsid: TARGET_OSID,
                outcome: 'costly_victory',
                flip: true,
                ethnicComposition: null,
                personnelAttacker: 1000,
                finalAttackerCas: 100,
                finalDefenderCas: 80,
                casualtyLedger: initializeCasualtyLedger(['RBiH', 'RS', 'HRHB']),
                report,
                firstAttackerId: 'atk_1',
                battleSnapEvents: snapEvents,
            });
            expect(result.moraleAbsorbed).toBe(false);
            expect(result.flip).toBe(true);
            expect(snapEvents).toHaveLength(0);
            expect(report.casualty_attacker).toBe(0);
            expect(report.casualty_defender).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // Constant export
    // ═══════════════════════════════════════════════════════════════════════════

    describe('MORALE_ABSORPTION_CAS_MULT', () => {
        it('is 1.6', () => {
            expect(MORALE_ABSORPTION_CAS_MULT).toBe(1.6);
        });
    });
});
