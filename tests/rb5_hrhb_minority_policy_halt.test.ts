// RB5 / RF-5B under the owner rule of 2026-11-22 (§6 broader bright-line panel, 9/9, 2026-11-23):
// a human-controlled HRHB's staff apply the side's historical default (the policy waves); the
// player's own decision can order a halt, once, when the decision comes at the start of the war.
// Gate (ruling item 1): BOT table AND NOT (human-controlled AND refused). Fail closed: a refusal is
// the halt flag OR any own player row for the card other than the default; a malformed row is a
// refusal; Observer's automatic answer (bot_ai_default) is never a refusal. For a human faction the
// seed also requires the card's decision on record. The headless flag with player_faction behaves
// as a bot. Supersedes the 2026-11-14 bot-only ruling (tests/displacement_policy_expulsion.test.ts).
import { describe, expect, test } from 'vitest';

import type { SettlementRecord } from '../src/map/settlements.js';
import {
    MINORITY_POLICY_CARD_ID_BY_FACTION,
    MINORITY_POLICY_DEFAULT_RESPONSE_ID,
    MINORITY_POLICY_HALT_FLAG_BY_FACTION,
    MINORITY_POLICY_HALT_RESPONSE_ID,
    hasMinorityExpulsionPolicy,
    minorityPolicyAppliedFlag,
    processDisplacementTakeover,
} from '../src/state/displacement_takeover.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import type { MunicipalityPopulation1991Map } from '../src/state/population_share.js';

const CARD = MINORITY_POLICY_CARD_ID_BY_FACTION.HRHB!;
const HALT_FLAG = MINORITY_POLICY_HALT_FLAG_BY_FACTION.HRHB!;

const pop1991: MunicipalityPopulation1991Map = {
    vitez: { total: 1000, bosniak: 410, serb: 50, croat: 450, other: 90 },
    mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
};

function osidRecord(osid: string, total: number, bosniaks: number, croats: number): SettlementRecord {
    return {
        sid: osid,
        source_id: osid,
        mun_code: osid.split(':')[1],
        mun: osid.split(':')[1],
        properties: {
            population_total: total,
            population_bosniaks: bosniaks,
            population_croats: croats,
            population_serbs: 0,
            population_others: 0,
        },
    } as unknown as SettlementRecord;
}

const osidSettlements = new Map<string, SettlementRecord>([
    ['op:vitez:vitez', osidRecord('op:vitez:vitez', 1000, 400, 600)],
    ['op:mostar:zapad', osidRecord('op:mostar:zapad', 2000, 600, 1400)],
]);

type Meta = Partial<GameState['meta']>;

function warState(turn: number, meta: Meta = {}, warStartedTurn = 49): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'rb5-halt', phase: 'war', war_start_turn: 0, rbih_hrhb_war_earliest_turn: 20, ...meta },
        factions: [],
        military: {
            formations: {},
            militia_pools: {},
            event_flags: {},
            event_decision_log: [],
            war_front_edges_osid: [],
            negotiation: {
                capital: {
                    HRHB: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RBiH: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RS: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                },
            },
        } as any,
        political: {
            war_alliance_rbih_hrhb: 0.05,
            rbih_hrhb_state: { war_started_turn: warStartedTurn },
            political_controllers: { 'op:vitez:vitez': 'HRHB', 'op:mostar:zapad': 'HRHB' },
        } as any,
        displacement: {} as any,
    } as GameState;
}

function human(level: 0 | 1 | 2 | 3): Meta {
    return { player_faction: 'HRHB', autonomy_level: level, headless_scenario_auto_control: false };
}

type Row = GameState['military']['event_decision_log'][number];
function logRow(state: GameState, row: Partial<Row> & Pick<Row, 'decision_source'>): void {
    state.military.event_decision_log.push({
        event_id: CARD,
        response_id: MINORITY_POLICY_DEFAULT_RESPONSE_ID,
        faction: 'HRHB',
        turn: state.meta.turn,
        ...row,
    } as Row);
}

function run(state: GameState) {
    return processDisplacementTakeover(state, new Map(), { battles: [] }, pop1991, osidSettlements);
}

function policyTimerKeys(state: GameState): string[] {
    return Object.entries(state.displacement.hostile_takeover_timers ?? {})
        .filter(([, t]) => t.cause === 'policy_expulsion')
        .map(([k]) => k)
        .sort();
}

const SEEDED = ['op:mostar:zapad|RBiH', 'op:vitez:vitez|RBiH'];

describe('RB5: a human HRHB follows the historical default until the player orders a halt', () => {
    test('the card ids and the single halt flag are HRHB-only', () => {
        expect(CARD).toBe('hrhb_minority_policy_1993');
        expect(HALT_FLAG).toBe('hrhb_minority_policy_halted');
        expect(MINORITY_POLICY_CARD_ID_BY_FACTION.RBiH).toBeUndefined();
        expect(MINORITY_POLICY_DEFAULT_RESPONSE_ID).not.toBe(MINORITY_POLICY_HALT_RESPONSE_ID);
    });

    for (const level of [0, 1, 2, 3] as const) {
        test(`autonomy ${level}, the card's default on record (player or automatic): seeds like the bot`, () => {
            const bot = warState(50);
            run(bot);
            for (const source of ['player', 'bot_ai_default'] as const) {
                const state = warState(50, human(level));
                logRow(state, { decision_source: source });
                run(state);
                expect(policyTimerKeys(state), source).toEqual(SEEDED);
                expect(state.displacement.hostile_takeover_timers, source).toEqual(bot.displacement.hostile_takeover_timers);
                expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')], source).toBe(50);
            }
        });

        test(`autonomy ${level}, no decision on record (card not fired, or fired and unanswered): no seed (fail closed)`, () => {
            const state = warState(50, human(level));
            for (let t = 50; t <= 60; t++) {
                state.meta.turn = t;
                run(state);
            }
            expect(policyTimerKeys(state)).toEqual([]);
            expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBeUndefined();
            expect(hasMinorityExpulsionPolicy(state, 'HRHB')).toBe(false);
        });

        test(`autonomy ${level}, the player ordered the halt: no seed, ever`, () => {
            const state = warState(50, human(level));
            logRow(state, { decision_source: 'player', response_id: MINORITY_POLICY_HALT_RESPONSE_ID });
            state.military.event_flags[HALT_FLAG] = true;
            for (let t = 50; t <= 70; t++) {
                state.meta.turn = t;
                run(state);
            }
            expect(policyTimerKeys(state)).toEqual([]);
            expect((state.displacement.displacement_event_log ?? []).filter((e) => e.caused_by === 'HRHB')).toEqual([]);
            expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBeUndefined();
        });
    }

    test('the halt flag alone is a refusal, even beside an automatic default row', () => {
        const state = warState(50, human(3));
        logRow(state, { decision_source: 'bot_ai_default' });
        state.military.event_flags[HALT_FLAG] = true;
        run(state);
        expect(policyTimerKeys(state)).toEqual([]);
    });

    test('any own player row other than the default is a refusal; a malformed row is a refusal', () => {
        for (const response_id of [MINORITY_POLICY_HALT_RESPONSE_ID, 'something_else', '', undefined as unknown as string]) {
            const state = warState(50, human(2));
            logRow(state, { decision_source: 'bot_ai_default' });
            logRow(state, { decision_source: 'player', response_id });
            run(state);
            expect(policyTimerKeys(state), String(response_id)).toEqual([]);
        }
        const nullFaction = warState(50, human(2));
        logRow(nullFaction, { decision_source: 'player', response_id: MINORITY_POLICY_HALT_RESPONSE_ID, faction: null });
        run(nullFaction);
        expect(policyTimerKeys(nullFaction)).toEqual([]);
    });

    test('rows for other events never count as the card decision', () => {
        const state = warState(50, human(2));
        logRow(state, { decision_source: 'player', event_id: 'hrhb_political_goal', response_id: 'croat_republic' });
        run(state);
        expect(policyTimerKeys(state)).toEqual([]);
    });

    test('Observer: the automatic answer is never a refusal', () => {
        const state = warState(50, human(3));
        logRow(state, { decision_source: 'bot_ai_default' });
        expect(hasMinorityExpulsionPolicy(state, 'HRHB')).toBe(true);
    });

    test('headless flag with player_faction HRHB behaves as the bot (no card decision needed)', () => {
        const bot = warState(50);
        run(bot);
        for (const level of [0, 1, 2, 3] as const) {
            const state = warState(50, { ...human(level), headless_scenario_auto_control: true });
            run(state);
            expect(state.displacement.hostile_takeover_timers, `a${level}`).toEqual(bot.displacement.hostile_takeover_timers);
        }
    });

    test('the bot HRHB needs no card decision and ignores a stray halt flag (only a human can halt)', () => {
        const bot = warState(50);
        bot.military.event_flags[HALT_FLAG] = true;
        run(bot);
        expect(policyTimerKeys(bot)).toEqual(SEEDED);
    });

    test('war start at a turn other than t49: seeds on the turn the decision is on record, not before', () => {
        const state = warState(70, human(1), 69);
        run(state);
        expect(policyTimerKeys(state)).toEqual([]);
        state.meta.turn = 71;
        logRow(state, { decision_source: 'player', turn: 71 });
        run(state);
        expect(policyTimerKeys(state)).toEqual(SEEDED);
        expect(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBe(71);
        const row = state.military.event_decision_log.find((r) => r.event_id === CARD)!;
        expect(row.turn).toBe(state.military.event_flags[minorityPolicyAppliedFlag('HRHB')]);
    });

    test('a human RBiH is untouched: RBiH has no policy and no card', () => {
        const state = warState(50, { player_faction: 'RBiH', autonomy_level: 0, headless_scenario_auto_control: false });
        run(state);
        expect(policyTimerKeys(state)).toEqual(SEEDED);
        expect(hasMinorityExpulsionPolicy(state, 'RBiH')).toBe(false);
    });
});
