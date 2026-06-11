/**
 * Tests for src/sim/combat/attack_casualty_distribution.ts
 *
 * Covers: splitKiaWiaMia, computeFinalCasualties, computeAttackerCasualtyShares,
 *         distributeDefenderCasualties, buildDefenderContributions
 */

import { describe, expect, it } from 'vitest';
import {
    splitKiaWiaMia,
    computeFinalCasualties,
    computeAttackerCasualtyShares,
    computeDefenderCasualtyShares,
    distributeDefenderCasualties,
    buildDefenderContributions,
    DEFENDER_DISTANCE_UNREACHABLE_HOPS,
    KIA_FRACTION,
    WIA_FRACTION,
} from '../src/sim/combat/attack_casualty_distribution.js';
import type { AttackerCasualtyInput } from '../src/sim/combat/attack_casualty_distribution.js';
import {
    BASE_ATTACKER_LOSS_RATE,
    BASE_DEFENDER_LOSS_RATE,
    OUTCOME_ATTACKER_MOD,
    OUTCOME_DEFENDER_MOD,
} from '../src/sim/combat/combat_math.js';
import { MAIN_CASUALTY_MULT, SUPPORT_CASUALTY_MULT } from '../src/sim/combat/bot_constants.js';
import { MIN_COMBAT_PERSONNEL } from '../src/state/formation_constants.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { CasualtyLedger } from '../src/state/casualty_ledger.js';
import type { BrigadeComposition, FactionId, FormationState } from '../src/state/game_state.js';
import {
    makeAttackComposition as makeComposition,
    makeAttackFormation as makeFormation,
} from './_helpers/combat.js';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers (extracted to tests/_helpers/combat.ts; aliased for local readability)
// ═══════════════════════════════════════════════════════════════════════════

function makeLedger(): CasualtyLedger {
    return initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']);
}

// ═══════════════════════════════════════════════════════════════════════════
// splitKiaWiaMia
// ═══════════════════════════════════════════════════════════════════════════

describe('splitKiaWiaMia', () => {
    it('totalCasualties = 100: EH-2 default-ON V2 main split 22/76/2', () => {
        const result = splitKiaWiaMia(100);
        // 0.22/0.76/0.02 (MC-leak fix default-ON; was 22/74/4 flag-OFF).
        expect(result.killed).toBe(22);
        expect(result.wounded).toBe(76);
        expect(result.missing_captured).toBe(2);
    });

    it('totalCasualties = 0: all zero', () => {
        const result = splitKiaWiaMia(0);
        expect(result.killed).toBe(0);
        expect(result.wounded).toBe(0);
        expect(result.missing_captured).toBe(0);
    });

    it('totalCasualties = 1: floor rounds kia and wia to 0, mia absorbs all', () => {
        const result = splitKiaWiaMia(1);
        // floor(1 * 0.22) = 0, floor(1 * 0.74) = 0, remainder = 1
        expect(result.killed).toBe(0);
        expect(result.wounded).toBe(0);
        expect(result.missing_captured).toBe(1);
    });

    it('totalCasualties = 10: kia=2, wia=7, mia=1', () => {
        const result = splitKiaWiaMia(10);
        // floor(10 * 0.22) = 2, floor(10 * 0.74) = 7, remainder = 1
        expect(result.killed).toBe(2);
        expect(result.wounded).toBe(7);
        expect(result.missing_captured).toBe(1);
    });

    it('mia absorbs rounding remainder: kia + wia + mia = total always', () => {
        // Test across a range of values
        for (const total of [0, 1, 2, 3, 7, 10, 50, 99, 100, 137, 500, 1000]) {
            const result = splitKiaWiaMia(total);
            expect(result.killed + result.wounded + result.missing_captured).toBe(total);
        }
    });

    it('large number: totalCasualties = 1000', () => {
        const result = splitKiaWiaMia(1000);
        // EH-2 default-ON: floor(1000 * 0.22) = 220, floor(1000 * 0.76) = 760, remainder = 20.
        expect(result.killed).toBe(220);
        expect(result.wounded).toBe(760);
        expect(result.missing_captured).toBe(20);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// computeFinalCasualties
// ═══════════════════════════════════════════════════════════════════════════

describe('computeFinalCasualties', () => {
    const baseParams = {
        personnelAttacker: 1000,
        personnelDefender: 800,
        outcome: 'victory' as const,
        lastStandCasMult: 1.0,
        militiaOnlyMult: 1.0,
        attCasMult: 1.0,
        defCasMult: 1.0,
        defensiveFireMult: 1.0,
        bombardmentMult: 1.0,
        attackerCount: 1,
        powerRatio: 1.0,
    };

    it('basic case: known multipliers produce expected output', () => {
        const result = computeFinalCasualties(baseParams);
        // baseAttackerCas = 1000 * 0.08 * 1.4 * 1 * 1 * 1 * 1 = 112
        // baseDefenderCas = 800 * 0.06 * 1.8 * 1 * 1 * 1 = 86.4
        // getLanchesterConcentrationBonus(1, 1.0) = 1.0 (attackerCount < 3)
        // finalAttacker = min(1000 - 100, max(0, round(112))) = min(900, 112) = 112
        // finalDefender = min(800, max(0, round(86.4 * 1.0))) = min(800, 86) = 86
        expect(result.finalAttackerCas).toBe(Math.round(1000 * BASE_ATTACKER_LOSS_RATE * OUTCOME_ATTACKER_MOD['victory']));
        expect(result.finalDefenderCas).toBe(Math.round(800 * BASE_DEFENDER_LOSS_RATE * OUTCOME_DEFENDER_MOD['victory']));
    });

    it('MIN_COMBAT_PERSONNEL cap: attacker cas cannot exceed personnel - MIN_COMBAT_PERSONNEL', () => {
        // Personnel barely above MIN_COMBAT_PERSONNEL + expected base cas
        // With catastrophic outcome (3.0 mult), 200 * 0.08 * 3.0 = 48 but cap is 200 - 100 = 100
        // Use very high multiplier to exceed the cap
        const result = computeFinalCasualties({
            ...baseParams,
            personnelAttacker: 150,
            outcome: 'catastrophic',
            defensiveFireMult: 5.0, // push casualties high
        });
        // baseAttackerCas = 150 * 0.08 * 3.0 * 1 * 1 * 1 * 5.0 = 180
        // cap = 150 - 100 = 50
        expect(result.finalAttackerCas).toBe(150 - MIN_COMBAT_PERSONNEL);
    });

    it('defender cap: defender cas cannot exceed personnelDefender', () => {
        const result = computeFinalCasualties({
            ...baseParams,
            personnelDefender: 50,
            outcome: 'decisive_victory',
            bombardmentMult: 10.0, // push defender casualties very high
            attackerCount: 5,
            powerRatio: 3.0,
        });
        expect(result.finalDefenderCas).toBeLessThanOrEqual(50);
    });

    it('zero personnelDefender: finalDefenderCas = 0', () => {
        const result = computeFinalCasualties({
            ...baseParams,
            personnelDefender: 0,
        });
        expect(result.finalDefenderCas).toBe(0);
    });

    it('outcome affects multipliers (decisive_victory vs repulsed)', () => {
        const decisive = computeFinalCasualties({
            ...baseParams,
            outcome: 'decisive_victory',
        });
        const repulsed = computeFinalCasualties({
            ...baseParams,
            outcome: 'repulsed',
        });
        // decisive_victory: attacker mod 1.3, defender mod 2.5
        // repulsed: attacker mod 2.0, defender mod 0.7
        expect(decisive.finalAttackerCas).toBeLessThan(repulsed.finalAttackerCas);
        expect(decisive.finalDefenderCas).toBeGreaterThan(repulsed.finalDefenderCas);
    });

    it('Lanchester bonus: attackerCount >= 3 with powerRatio >= 1.5 increases defender cas', () => {
        const noBonus = computeFinalCasualties({
            ...baseParams,
            attackerCount: 2,
            powerRatio: 2.0,
        });
        const withBonus = computeFinalCasualties({
            ...baseParams,
            attackerCount: 4,
            powerRatio: 2.0,
        });
        // getLanchesterConcentrationBonus(4, 2.0) = 1 + min(0.30, (4-2)*0.05) = 1.10
        // getLanchesterConcentrationBonus(2, 2.0) = 1.0 (below LANCHESTER_ATTACKER_MIN = 3)
        expect(withBonus.finalDefenderCas).toBeGreaterThan(noBonus.finalDefenderCas);
    });

    it('all multipliers = 1.0 baseline: verify base rates applied', () => {
        const result = computeFinalCasualties({
            personnelAttacker: 1000,
            personnelDefender: 1000,
            outcome: 'stalemate',
            lastStandCasMult: 1.0,
            militiaOnlyMult: 1.0,
            attCasMult: 1.0,
            defCasMult: 1.0,
            defensiveFireMult: 1.0,
            bombardmentMult: 1.0,
            attackerCount: 1,
            powerRatio: 1.0,
        });
        // stalemate attacker mod = 1.2, defender mod = 1.0
        // baseAttackerCas = 1000 * 0.08 * 1.2 = 96
        // baseDefenderCas = 1000 * 0.06 * 1.0 = 60
        expect(result.finalAttackerCas).toBe(Math.round(1000 * BASE_ATTACKER_LOSS_RATE * OUTCOME_ATTACKER_MOD['stalemate']));
        expect(result.finalDefenderCas).toBe(Math.round(1000 * BASE_DEFENDER_LOSS_RATE * OUTCOME_DEFENDER_MOD['stalemate']));
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// computeAttackerCasualtyShares
// ═══════════════════════════════════════════════════════════════════════════

describe('computeAttackerCasualtyShares', () => {
    it('single attacker with none role: gets all casualties', () => {
        const inputs: AttackerCasualtyInput[] = [
            { id: 'bde_1', personnel: 1000, supportRole: 'none' },
        ];
        const result = computeAttackerCasualtyShares(inputs, 1000, 50);
        expect(result.get('bde_1')).toBe(50);
    });

    it('two attackers equal personnel, both none: each gets ~50%', () => {
        const inputs: AttackerCasualtyInput[] = [
            { id: 'bde_1', personnel: 500, supportRole: 'none' },
            { id: 'bde_2', personnel: 500, supportRole: 'none' },
        ];
        const result = computeAttackerCasualtyShares(inputs, 1000, 100);
        expect(result.get('bde_1')).toBe(50);
        expect(result.get('bde_2')).toBe(50);
    });

    it('support/main split: support gets SUPPORT_CASUALTY_MULT, main gets MAIN_CASUALTY_MULT', () => {
        const inputs: AttackerCasualtyInput[] = [
            { id: 'bde_main', personnel: 500, supportRole: 'main' },
            { id: 'bde_support', personnel: 500, supportRole: 'support' },
        ];
        const result = computeAttackerCasualtyShares(inputs, 1000, 100);
        // frac for each = 0.5
        // main weight = 0.5 * 1.40 = 0.70
        // support weight = 0.5 * 0.55 = 0.275
        // weightSum = 0.975
        // main share = round(100 * 0.70 / 0.975) = round(71.79) = 72
        // support share = round(100 * 0.275 / 0.975) = round(28.21) = 28
        const mainCas = result.get('bde_main')!;
        const supportCas = result.get('bde_support')!;
        expect(mainCas).toBeGreaterThan(supportCas);
        // Verify the weights are correct relative to each other
        const mainWeight = 0.5 * MAIN_CASUALTY_MULT;
        const supportWeight = 0.5 * SUPPORT_CASUALTY_MULT;
        const weightSum = mainWeight + supportWeight;
        expect(mainCas).toBe(Math.round(100 * mainWeight / weightSum));
        expect(supportCas).toBe(Math.round(100 * supportWeight / weightSum));
    });

    it('three attackers: sum approximately equals finalCas (rounding may differ ±1)', () => {
        const inputs: AttackerCasualtyInput[] = [
            { id: 'bde_1', personnel: 400, supportRole: 'main' },
            { id: 'bde_2', personnel: 300, supportRole: 'support' },
            { id: 'bde_3', personnel: 300, supportRole: 'none' },
        ];
        const finalCas = 77;
        const result = computeAttackerCasualtyShares(inputs, 1000, finalCas);
        const sum = (result.get('bde_1') ?? 0) + (result.get('bde_2') ?? 0) + (result.get('bde_3') ?? 0);
        // Due to independent rounding per brigade, sum may differ by ±1 per brigade
        expect(Math.abs(sum - finalCas)).toBeLessThanOrEqual(inputs.length);
    });

    it('zero personnel edge case: gets 0 casualties', () => {
        const inputs: AttackerCasualtyInput[] = [
            { id: 'bde_1', personnel: 0, supportRole: 'none' },
            { id: 'bde_2', personnel: 1000, supportRole: 'none' },
        ];
        const result = computeAttackerCasualtyShares(inputs, 1000, 50);
        expect(result.get('bde_1')).toBe(0);
        expect(result.get('bde_2')).toBe(50);
    });

    it('all support role: weights still distribute correctly', () => {
        const inputs: AttackerCasualtyInput[] = [
            { id: 'bde_1', personnel: 600, supportRole: 'support' },
            { id: 'bde_2', personnel: 400, supportRole: 'support' },
        ];
        const result = computeAttackerCasualtyShares(inputs, 1000, 100);
        // Both use SUPPORT_CASUALTY_MULT, so distribution is purely by personnel fraction
        // bde_1: frac = 0.6, w = 0.6 * 0.55 = 0.33
        // bde_2: frac = 0.4, w = 0.4 * 0.55 = 0.22
        // weightSum = 0.55
        // bde_1 share = round(100 * 0.33 / 0.55) = round(60) = 60
        // bde_2 share = round(100 * 0.22 / 0.55) = round(40) = 40
        expect(result.get('bde_1')).toBe(60);
        expect(result.get('bde_2')).toBe(40);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// distributeDefenderCasualties
// ═══════════════════════════════════════════════════════════════════════════

describe('distributeDefenderCasualties', () => {
    it('single defender (no sector brigades): all casualties to primary', () => {
        const defender = makeFormation({ id: 'def_1', personnel: 1000 });
        const ledger = makeLedger();
        distributeDefenderCasualties({
            defenderFormation: defender,
            sectorDefenseBrigades: null,
            sectorBrigadeWeights: null,
            finalDefenderCas: 50,
            casualtyLedger: ledger,
        });
        // applyPersonnelLoss: max(MIN_COMBAT_PERSONNEL, 1000 - 50) = 950
        expect(defender.personnel).toBe(950);
        // Check ledger was updated
        const factionLedger = ledger['RS']!;
        expect(factionLedger.killed + factionLedger.wounded + factionLedger.missing_captured).toBe(50);
    });

    it('multi-brigade weighted: casualties distributed proportionally', () => {
        const def1 = makeFormation({ id: 'def_1', faction: 'RS', personnel: 1000 });
        const def2 = makeFormation({ id: 'def_2', faction: 'RS', personnel: 800 });
        const weights = new Map<string, number>([['def_1', 0.6], ['def_2', 0.4]]);
        const ledger = makeLedger();
        distributeDefenderCasualties({
            defenderFormation: def1,
            sectorDefenseBrigades: [def1, def2],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 100,
            casualtyLedger: ledger,
        });
        // def_1: round(100 * 0.6) = 60 -> personnel = 1000 - 60 = 940
        // def_2: round(100 * 0.4) = 40 -> personnel = 800 - 40 = 760
        expect(def1.personnel).toBe(940);
        expect(def2.personnel).toBe(760);
    });

    it('zero weight brigade: gets 0 casualties', () => {
        const def1 = makeFormation({ id: 'def_1', faction: 'RS', personnel: 1000 });
        const def2 = makeFormation({ id: 'def_2', faction: 'RS', personnel: 800 });
        const weights = new Map<string, number>([['def_1', 1.0], ['def_2', 0.0]]);
        const ledger = makeLedger();
        distributeDefenderCasualties({
            defenderFormation: def1,
            sectorDefenseBrigades: [def1, def2],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 50,
            casualtyLedger: ledger,
        });
        // def_1 gets all 50 (weight 1.0 / 1.0)
        expect(def1.personnel).toBe(950);
        // def_2 gets 0 (weight 0.0 / 1.0 = 0)
        expect(def2.personnel).toBe(800);
    });

    it('does not attribute casualties beyond removable personnel', () => {
        const primary = makeFormation({ id: 'primary', faction: 'RS', personnel: 180 });
        const reserve = makeFormation({ id: 'reserve', faction: 'RS', personnel: 120 });
        const weights = new Map<string, number>([
            [primary.id, 0.5],
            [reserve.id, 0.5],
        ]);

        // MIN_COMBAT_PERSONNEL = 100 → removable: primary 80, reserve 20.
        const shares = computeDefenderCasualtyShares({
            defenderFormation: primary,
            sectorDefenseBrigades: [primary, reserve],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 300,
        });

        expect(shares.get(primary.id)).toBeLessThanOrEqual(80);
        expect(shares.get(reserve.id)).toBeLessThanOrEqual(20);
        expect([...shares.values()].reduce((sum, cas) => sum + cas, 0)).toBeLessThan(300);
    });

    it('weights defender casualty shares proportionally across sector brigades', () => {
        const primary = makeFormation({ id: 'primary', faction: 'RS', personnel: 1000 });
        const reserve = makeFormation({ id: 'reserve', faction: 'RS', personnel: 1000 });
        const weights = new Map<string, number>([
            [primary.id, 0.5],
            [reserve.id, 0.5],
        ]);

        const shares = computeDefenderCasualtyShares({
            defenderFormation: primary,
            sectorDefenseBrigades: [primary, reserve],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 400,
        });

        expect(shares.get(primary.id)).toBe(200);
        expect(shares.get(reserve.id)).toBe(200);
    });

    it('uses deterministic equal fallback shares when shared defender weights sum to zero', () => {
        const primary = makeFormation({ id: 'primary', faction: 'RS', personnel: 1000 });
        const reserve = makeFormation({ id: 'reserve', faction: 'RS', personnel: 1000 });
        const weights = new Map<string, number>([
            [primary.id, 0],
            [reserve.id, 0],
        ]);

        const shares = computeDefenderCasualtyShares({
            defenderFormation: primary,
            sectorDefenseBrigades: [primary, reserve],
            sectorBrigadeWeights: weights,
            finalDefenderCas: 100,
        });

        expect([...shares.entries()].sort(([a], [b]) => a.localeCompare(b))).toEqual([
            [primary.id, 50],
            [reserve.id, 50],
        ]);
    });

    it('applyPersonnelLoss mutates personnel', () => {
        const defender = makeFormation({ id: 'def_1', personnel: 500 });
        const ledger = makeLedger();
        distributeDefenderCasualties({
            defenderFormation: defender,
            sectorDefenseBrigades: null,
            sectorBrigadeWeights: null,
            finalDefenderCas: 200,
            casualtyLedger: ledger,
        });
        // 500 - 200 = 300
        expect(defender.personnel).toBe(300);
    });

    it('recordBattleCasualties is called with splitKiaWiaMia format', () => {
        const defender = makeFormation({ id: 'def_1', faction: 'RBiH', personnel: 1000 });
        const ledger = makeLedger();
        distributeDefenderCasualties({
            defenderFormation: defender,
            sectorDefenseBrigades: null,
            sectorBrigadeWeights: null,
            finalDefenderCas: 100,
            casualtyLedger: ledger,
        });
        const factionLedger = ledger['RBiH']!;
        // splitKiaWiaMia(100), EH-2 default-ON V2 main split 0.22/0.76/0.02:
        // killed=22, wounded=76, missing_captured=2.
        expect(factionLedger.killed).toBe(22);
        expect(factionLedger.wounded).toBe(76);
        expect(factionLedger.missing_captured).toBe(2);
        // Check per-formation record
        const formationRecord = factionLedger.per_formation['def_1'];
        expect(formationRecord).toBeDefined();
        expect(formationRecord!.killed).toBe(22);
        expect(formationRecord!.wounded).toBe(76);
        expect(formationRecord!.missing_captured).toBe(2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildDefenderContributions
// ═══════════════════════════════════════════════════════════════════════════

describe('buildDefenderContributions', () => {
    it('two brigades with different weights: proportional casualties_taken', () => {
        const bde1 = makeFormation({ id: 'bde_1', personnel: 1000 });
        const bde2 = makeFormation({ id: 'bde_2', personnel: 800 });
        const weights = new Map<string, number>([['bde_1', 0.8], ['bde_2', 0.2]]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            ['bde_1', { hops: 0, isHome: true }],
            ['bde_2', { hops: 2, isHome: false }],
        ]);
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [bde1, bde2],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 100,
        });
        expect(contributions).toHaveLength(2);
        // bde_1: frac = 0.8 / 1.0 = 0.8, cas = round(100 * 0.8) = 80
        // bde_2: frac = 0.2 / 1.0 = 0.2, cas = round(100 * 0.2) = 20
        expect(contributions[0].casualties_taken).toBe(80);
        expect(contributions[1].casualties_taken).toBe(20);
    });

    it('distance_hops and is_home_municipality from meta', () => {
        const bde1 = makeFormation({ id: 'bde_1' });
        const weights = new Map<string, number>([['bde_1', 1.0]]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            ['bde_1', { hops: 3, isHome: true }],
        ]);
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [bde1],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 50,
        });
        expect(contributions[0].distance_hops).toBe(3);
        expect(contributions[0].is_home_municipality).toBe(true);
    });

    it('clamps Infinity hops (unreachable reserve) to the finite persisted sentinel (#95, the #358 class)', () => {
        // bfsDistanceFriendly returns Infinity when a reserve has no friendly path to
        // the battle OSID; the raw value used to persist into turn_summaries as
        // "distance_hops": null. The storage boundary now clamps it.
        const bde1 = makeFormation({ id: 'bde_1' });
        const weights = new Map<string, number>([['bde_1', 0]]); // unreachable reserve's reactive weight is 0
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            ['bde_1', { hops: Infinity, isHome: false }],
        ]);
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [bde1],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 50,
        });
        expect(contributions[0].distance_hops).toBe(DEFENDER_DISTANCE_UNREACHABLE_HOPS);
        expect(Number.isFinite(contributions[0].distance_hops)).toBe(true);
    });

    it('reactive_weight is rounded to 2 decimal places', () => {
        const bde1 = makeFormation({ id: 'bde_1' });
        // 0.123456 should become 0.12
        const weights = new Map<string, number>([['bde_1', 0.123456]]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            ['bde_1', { hops: 0, isHome: false }],
        ]);
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [bde1],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 10,
        });
        // Math.round(0.123456 * 100) / 100 = Math.round(12.3456) / 100 = 12 / 100 = 0.12
        expect(contributions[0].reactive_weight).toBe(0.12);
    });

    it('sum of casualties_taken approximately equals finalDefenderCas (integer rounding)', () => {
        const bde1 = makeFormation({ id: 'bde_1' });
        const bde2 = makeFormation({ id: 'bde_2' });
        const bde3 = makeFormation({ id: 'bde_3' });
        const weights = new Map<string, number>([
            ['bde_1', 0.5],
            ['bde_2', 0.3],
            ['bde_3', 0.2],
        ]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            ['bde_1', { hops: 0, isHome: true }],
            ['bde_2', { hops: 1, isHome: false }],
            ['bde_3', { hops: 2, isHome: false }],
        ]);
        const finalCas = 77;
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [bde1, bde2, bde3],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: finalCas,
        });
        const sum = contributions.reduce((s, c) => s + c.casualties_taken, 0);
        // Independent rounding per brigade: sum can differ by ±1 per brigade
        expect(Math.abs(sum - finalCas)).toBeLessThanOrEqual(contributions.length);
    });

    it('single brigade: gets all casualties', () => {
        const bde1 = makeFormation({ id: 'bde_1' });
        const weights = new Map<string, number>([['bde_1', 1.0]]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            ['bde_1', { hops: 0, isHome: false }],
        ]);
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [bde1],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 42,
        });
        expect(contributions).toHaveLength(1);
        expect(contributions[0].brigade_id).toBe('bde_1');
        expect(contributions[0].casualties_taken).toBe(42);
    });

    it('uses weighted defender shares when a primary defender id is provided', () => {
        const primary = makeFormation({ id: 'primary_defender', personnel: 1000 });
        const reserve = makeFormation({ id: 'reserve_defender', personnel: 600 });
        const weights = new Map<string, number>([
            [primary.id, 0.5],
            [reserve.id, 0.5],
        ]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            [primary.id, { hops: 0, isHome: false }],
            [reserve.id, { hops: 1, isHome: true }],
        ]);

        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [primary, reserve],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 400,
            primaryDefenderId: primary.id,
        });

        // 0.5/0.5 split, both well above MIN_COMBAT_PERSONNEL → 200 each, no clamping.
        expect(contributions.find((c) => c.brigade_id === reserve.id)?.casualties_taken).toBe(200);
        expect(contributions.reduce((sum, c) => sum + c.casualties_taken, 0)).toBe(400);
    });

    it('reports applied casualties when removable personnel caps bind', () => {
        const primary = makeFormation({ id: 'primary_defender', personnel: 180 });
        const reserve = makeFormation({ id: 'reserve_defender', personnel: 120 });
        const weights = new Map<string, number>([
            [primary.id, 0.5],
            [reserve.id, 0.5],
        ]);
        const meta = new Map<string, { hops: number; isHome: boolean }>([
            [primary.id, { hops: 0, isHome: false }],
            [reserve.id, { hops: 1, isHome: true }],
        ]);

        // MIN_COMBAT_PERSONNEL = 100 → removable: primary 80, reserve 20.
        const contributions = buildDefenderContributions({
            sectorDefenseBrigades: [primary, reserve],
            sectorBrigadeWeights: weights,
            sectorBrigadeMeta: meta,
            finalDefenderCas: 300,
            primaryDefenderId: primary.id,
        });

        expect(contributions.map((c) => [c.brigade_id, c.casualties_taken]).sort()).toEqual([
            [primary.id, 80],
            [reserve.id, 20],
        ]);
        expect(contributions.reduce((sum, c) => sum + c.casualties_taken, 0)).toBe(100);
    });
});
