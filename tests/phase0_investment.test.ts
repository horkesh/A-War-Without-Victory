/**
 * Phase B Step 3: Organizational Penetration Investment tests.
 * - Investment costs correct (Police 5/15, TO 8/25, Party 4/12, Paramilitary 10/30).
 * - TO only for RBiH; hostile-majority constraint enforced when provided.
 * - State updated correctly (organizational_penetration).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
    applyInvestment,
    getInvestmentCost,
    getInvestmentCostWithCoordination,
    getPrewarCapital,
    initializePrewarCapital,
    INVESTMENT_COST,
    isCoordinationEligibleFaction,
    isToAllowedForFaction,
    spendPrewarCapital
} from '../src/phase0/index.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhase0StateWithCapital(): GameState {
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'inv-test', phase: 'phase_0' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            },
            {
                id: 'HRHB',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 0,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: false,
                declaration_turn: null
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        municipalities: {}
    };
    initializePrewarCapital(state);
    return state;
}

test('INVESTMENT_COST matches Phase_0_Spec §4.2', () => {
    assert.strictEqual(INVESTMENT_COST.police.municipality, 5);
    assert.strictEqual(INVESTMENT_COST.police.region, 15);
    assert.strictEqual(INVESTMENT_COST.to.municipality, 8);
    assert.strictEqual(INVESTMENT_COST.to.region, 25);
    assert.strictEqual(INVESTMENT_COST.party.municipality, 4);
    assert.strictEqual(INVESTMENT_COST.party.region, 12);
    assert.strictEqual(INVESTMENT_COST.paramilitary.municipality, 10);
    assert.strictEqual(INVESTMENT_COST.paramilitary.region, 30);
});

test('getInvestmentCost returns correct cost for municipality and region', () => {
    assert.strictEqual(getInvestmentCost('police', { kind: 'municipality', mun_ids: ['M1'] }), 5);
    assert.strictEqual(getInvestmentCost('police', { kind: 'region', mun_ids: ['M1', 'M2', 'M3'] }), 15);
    assert.strictEqual(getInvestmentCost('to', { kind: 'municipality', mun_ids: ['M1'] }), 8);
    assert.strictEqual(getInvestmentCost('paramilitary', { kind: 'region', mun_ids: ['A', 'B', 'C'] }), 30);
});

test('isToAllowedForFaction: only RBiH can use TO', () => {
    assert.strictEqual(isToAllowedForFaction('RBiH'), true);
    assert.strictEqual(isToAllowedForFaction('RS'), false);
    assert.strictEqual(isToAllowedForFaction('HRHB'), false);
});

test('coordination eligibility limited to RBiH and HRHB', () => {
    assert.strictEqual(isCoordinationEligibleFaction('RBiH'), true);
    assert.strictEqual(isCoordinationEligibleFaction('HRHB'), true);
    assert.strictEqual(isCoordinationEligibleFaction('RS'), false);
});

test('getInvestmentCostWithCoordination applies 20% discount with deterministic rounding', () => {
    assert.strictEqual(getInvestmentCostWithCoordination('party', { kind: 'municipality', mun_ids: ['M1'] }, true), 4);
    assert.strictEqual(getInvestmentCostWithCoordination('police', { kind: 'municipality', mun_ids: ['M1'] }, true), 4);
    assert.strictEqual(getInvestmentCostWithCoordination('to', { kind: 'municipality', mun_ids: ['M1'] }, true), 7);
    assert.strictEqual(getInvestmentCostWithCoordination('paramilitary', { kind: 'region', mun_ids: ['A', 'B', 'C'] }, true), 24);
    assert.strictEqual(getInvestmentCostWithCoordination('paramilitary', { kind: 'region', mun_ids: ['A', 'B', 'C'] }, false), 30);
});

test('applyInvestment Police deducts 5 and sets police_loyalty to loyal', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(state, 'RS', 'police', { kind: 'municipality', mun_ids: ['MUN_A'] });
    assert.strictEqual(result.ok, true);
    assert.strictEqual((result as { spent: number }).spent, 5);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 95);
    assert.strictEqual(state.municipalities!['MUN_A'].organizational_penetration?.police_loyalty, 'loyal');
});

test('applyInvestment TO only for RBiH', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(state, 'RS', 'to', { kind: 'municipality', mun_ids: ['MUN_X'] });
    assert.strictEqual(result.ok, false);
    assert.ok((result as { reason: string }).reason.includes('RBiH'));
});

test('applyInvestment TO for RBiH deducts 8 and sets to_control to controlled', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(state, 'RBiH', 'to', { kind: 'municipality', mun_ids: ['MUN_B'] });
    assert.strictEqual(result.ok, true);
    assert.strictEqual((result as { spent: number }).spent, 8);
    assert.strictEqual(state.municipalities!['MUN_B'].organizational_penetration?.to_control, 'controlled');
});

test('applyInvestment coordinated discount is applied for eligible factions', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(
        state,
        'HRHB',
        'police',
        { kind: 'municipality', mun_ids: ['MUN_COORD'] },
        { coordinated: true }
    );
    assert.strictEqual(result.ok, true);
    assert.strictEqual((result as { spent: number }).spent, 4);
    assert.strictEqual(getPrewarCapital(state, 'HRHB'), 36);
});

test('applyInvestment Party updates sds_penetration for RS', () => {
    const state = minimalPhase0StateWithCapital();
    applyInvestment(state, 'RS', 'party', { kind: 'municipality', mun_ids: ['MUN_C'] });
    assert.strictEqual(state.municipalities!['MUN_C'].organizational_penetration?.sds_penetration, 15);
});

test('applyInvestment Party updates sda_penetration for RBiH, hdz_penetration for HRHB', () => {
    const state = minimalPhase0StateWithCapital();
    applyInvestment(state, 'RBiH', 'party', { kind: 'municipality', mun_ids: ['MUN_D'] });
    applyInvestment(state, 'HRHB', 'party', { kind: 'municipality', mun_ids: ['MUN_E'] });
    assert.strictEqual(state.municipalities!['MUN_D'].organizational_penetration?.sda_penetration, 15);
    assert.strictEqual(state.municipalities!['MUN_E'].organizational_penetration?.hdz_penetration, 15);
});

test('applyInvestment Paramilitary updates patriotska_liga for RBiH, paramilitary_rs for RS', () => {
    const state = minimalPhase0StateWithCapital();
    applyInvestment(state, 'RBiH', 'paramilitary', { kind: 'municipality', mun_ids: ['MUN_F'] });
    applyInvestment(state, 'RS', 'paramilitary', { kind: 'municipality', mun_ids: ['MUN_G'] });
    assert.strictEqual(state.municipalities!['MUN_F'].organizational_penetration?.patriotska_liga, 15);
    assert.strictEqual(state.municipalities!['MUN_G'].organizational_penetration?.paramilitary_rs, 15);
});

test('applyInvestment region scope uses region cost', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(state, 'RS', 'party', {
        kind: 'region',
        mun_ids: ['M1', 'M2', 'M3'] as MunicipalityId[]
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual((result as { spent: number }).spent, 12);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 88);
});

test('applyInvestment fails when insufficient capital', () => {
    const state = minimalPhase0StateWithCapital();
    spendPrewarCapital(state, 'HRHB', 35); // leave 5 (paramilitary mun = 10)
    const result = applyInvestment(state, 'HRHB', 'paramilitary', { kind: 'municipality', mun_ids: ['MUN_H'] });
    assert.strictEqual(result.ok, false);
    assert.ok((result as { reason: string }).reason.includes('insufficient'));
});

test('applyInvestment hostile-majority constraint blocks when provided', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(state, 'RS', 'party', { kind: 'municipality', mun_ids: ['HOSTILE_MUN'] }, {
        isHostileMajority: (munId, _factionId) => munId === 'HOSTILE_MUN'
    });
    assert.strictEqual(result.ok, false);
    assert.ok((result as { reason: string }).reason.includes('hostile-majority'));
});

test('applyInvestment empty mun_ids fails', () => {
    const state = minimalPhase0StateWithCapital();
    const result = applyInvestment(state, 'RS', 'party', { kind: 'municipality', mun_ids: [] });
    assert.strictEqual(result.ok, false);
});
