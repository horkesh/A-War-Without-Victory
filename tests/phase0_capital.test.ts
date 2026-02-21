/**
 * Phase B Step 2: Pre-War Capital System tests.
 * - Initial capital correct (RS=100, RBiH=70, HRHB=40).
 * - Spending deducts correctly; cannot spend beyond pool.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
    applyPrewarCapitalTrickle,
    getPrewarCapital,
    initializePrewarCapital,
    PHASE0_FACTION_ORDER,
    PREWAR_CAPITAL_INITIAL,
    PREWAR_CAPITAL_TRICKLE_MAX_BONUS,
    PREWAR_CAPITAL_TRICKLE_PER_TURN,
    spendPrewarCapital
} from '../src/phase0/capital.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhase0State(withoutPrewarCapital = false): GameState {
    const factions: GameState['factions'] = [
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
    ];
    if (!withoutPrewarCapital) {
        factions[0].prewar_capital = 70;
        factions[1].prewar_capital = 100;
        factions[2].prewar_capital = 40;
    }
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'cap-test', phase: 'phase_0' },
        factions,
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        municipalities: {}
    };
}

function withScheduledPhase0Timing(state: GameState): GameState {
    state.meta.phase_0_scheduled_referendum_turn = 26;
    state.meta.phase_0_scheduled_war_start_turn = 30;
    return state;
}

test('PREWAR_CAPITAL_INITIAL has RS=100, RBiH=70, HRHB=40', () => {
    assert.strictEqual(PREWAR_CAPITAL_INITIAL.RS, 100);
    assert.strictEqual(PREWAR_CAPITAL_INITIAL.RBiH, 70);
    assert.strictEqual(PREWAR_CAPITAL_INITIAL.HRHB, 40);
});

test('PHASE0_FACTION_ORDER is RBiH, RS, HRHB', () => {
    assert.deepStrictEqual([...PHASE0_FACTION_ORDER], ['RBiH', 'RS', 'HRHB']);
});

test('initializePrewarCapital sets RS=100, RBiH=70, HRHB=40 when undefined', () => {
    const state = minimalPhase0State(true);
    initializePrewarCapital(state);
    assert.strictEqual(state.factions.find((f) => f.id === 'RBiH')?.prewar_capital, 70);
    assert.strictEqual(state.factions.find((f) => f.id === 'RS')?.prewar_capital, 100);
    assert.strictEqual(state.factions.find((f) => f.id === 'HRHB')?.prewar_capital, 40);
});

test('initializePrewarCapital is idempotent (does not overwrite existing)', () => {
    const state = minimalPhase0State(false);
    state.factions.find((f) => f.id === 'RS')!.prewar_capital = 50;
    initializePrewarCapital(state);
    assert.strictEqual(state.factions.find((f) => f.id === 'RS')?.prewar_capital, 50);
    assert.strictEqual(state.factions.find((f) => f.id === 'RBiH')?.prewar_capital, 70);
});

test('spendPrewarCapital deducts correctly and returns remaining', () => {
    const state = minimalPhase0State(false);
    const result = spendPrewarCapital(state, 'RS', 30);
    assert.strictEqual(result.ok, true);
    assert.strictEqual((result as { remaining: number }).remaining, 70);
    assert.strictEqual(state.factions.find((f) => f.id === 'RS')?.prewar_capital, 70);
});

test('spendPrewarCapital spending zero returns current and does not change state', () => {
    const state = minimalPhase0State(false);
    const result = spendPrewarCapital(state, 'HRHB', 0);
    assert.strictEqual(result.ok, true);
    assert.strictEqual((result as { remaining: number }).remaining, 40);
    assert.strictEqual(state.factions.find((f) => f.id === 'HRHB')?.prewar_capital, 40);
});

test('spendPrewarCapital cannot spend beyond pool', () => {
    const state = minimalPhase0State(false);
    const result = spendPrewarCapital(state, 'HRHB', 41);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { reason: string }).reason.includes('insufficient capital'));
    assert.strictEqual(state.factions.find((f) => f.id === 'HRHB')?.prewar_capital, 40);
});

test('spendPrewarCapital rejects negative amount', () => {
    const state = minimalPhase0State(false);
    const result = spendPrewarCapital(state, 'RS', -1);
    assert.strictEqual(result.ok, false);
});

test('spendPrewarCapital returns error for unknown faction', () => {
    const state = minimalPhase0State(false);
    const result = spendPrewarCapital(state, 'UNKNOWN' as any, 10);
    assert.strictEqual(result.ok, false);
    assert.ok((result as { reason: string }).reason.includes('not found'));
});

test('getPrewarCapital returns current pool', () => {
    const state = minimalPhase0State(false);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 100);
    spendPrewarCapital(state, 'RS', 25);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 75);
});

test('getPrewarCapital returns 0 for missing faction or undefined capital', () => {
    const state = minimalPhase0State(true);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 0);
    assert.strictEqual(getPrewarCapital(state, 'UNKNOWN' as any), 0);
});

test('trickle constants are conservative and deterministic', () => {
    assert.strictEqual(PREWAR_CAPITAL_TRICKLE_PER_TURN, 1);
    assert.strictEqual(PREWAR_CAPITAL_TRICKLE_MAX_BONUS, 20);
});

test('applyPrewarCapitalTrickle no-ops when scenario is not scheduled phase_0', () => {
    const state = minimalPhase0State(false);
    applyPrewarCapitalTrickle(state);
    assert.strictEqual(getPrewarCapital(state, 'RBiH'), 70);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 100);
    assert.strictEqual(getPrewarCapital(state, 'HRHB'), 40);
});

test('applyPrewarCapitalTrickle no-ops outside phase_0', () => {
    const state = withScheduledPhase0Timing(minimalPhase0State(false));
    state.meta.phase = 'phase_i';
    applyPrewarCapitalTrickle(state);
    assert.strictEqual(getPrewarCapital(state, 'RBiH'), 70);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 100);
    assert.strictEqual(getPrewarCapital(state, 'HRHB'), 40);
});

test('applyPrewarCapitalTrickle adds deterministic +1 per faction in scheduled phase_0', () => {
    const state = withScheduledPhase0Timing(minimalPhase0State(false));
    applyPrewarCapitalTrickle(state);
    assert.strictEqual(getPrewarCapital(state, 'RBiH'), 71);
    assert.strictEqual(getPrewarCapital(state, 'RS'), 101);
    assert.strictEqual(getPrewarCapital(state, 'HRHB'), 41);
});

test('applyPrewarCapitalTrickle respects max bonus reserve cap', () => {
    const state = withScheduledPhase0Timing(minimalPhase0State(false));
    const rbih = state.factions.find((f) => f.id === 'RBiH')!;
    const rs = state.factions.find((f) => f.id === 'RS')!;
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    rbih.prewar_capital = PREWAR_CAPITAL_INITIAL.RBiH + PREWAR_CAPITAL_TRICKLE_MAX_BONUS;
    rs.prewar_capital = PREWAR_CAPITAL_INITIAL.RS + PREWAR_CAPITAL_TRICKLE_MAX_BONUS;
    hrhb.prewar_capital = PREWAR_CAPITAL_INITIAL.HRHB + PREWAR_CAPITAL_TRICKLE_MAX_BONUS - 1;
    applyPrewarCapitalTrickle(state);
    assert.strictEqual(rbih.prewar_capital, PREWAR_CAPITAL_INITIAL.RBiH + PREWAR_CAPITAL_TRICKLE_MAX_BONUS);
    assert.strictEqual(rs.prewar_capital, PREWAR_CAPITAL_INITIAL.RS + PREWAR_CAPITAL_TRICKLE_MAX_BONUS);
    assert.strictEqual(hrhb.prewar_capital, PREWAR_CAPITAL_INITIAL.HRHB + PREWAR_CAPITAL_TRICKLE_MAX_BONUS);
});
