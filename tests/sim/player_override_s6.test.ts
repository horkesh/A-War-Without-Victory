/**
 * Player-override model, the §6 group (PR-C): H-14, H-21, H-20 and H-17.
 *
 * Owner: "There should be no drift between live and headless games." A live game with no human input is the bot playing
 * that faction; the staff of a human faction keep the historical default and the player can refuse (owner 2026-11-22,
 * "THIS goes for any similar items"; 2026-11-23 #854). §6 HOW ruling (lane C s8, 4 seats, unanimous with G1-G5) for
 * H-14, H-21, H-17; RB5 (9/9) as the broader panel of record and the orchestrator's settlement (2026-11-25) for H-20.
 *
 * Proven here, on small engine fixtures driven through the real code (detect, evaluate-events, the silence resolver,
 * the review IPC, the displacement step, save/load):
 * - silence = the bot's choice at every level 0-3, for each site (live equals a headless copy of the same state);
 * - an explicit refusal or halt outranks silence and persists across turns, a level change and a save/load round trip
 *   (negative controls), and is never clamped into `ask` (G1);
 * - Review each at Full Control blocks Advance; a request still undecided at the next Advance resolves as the staff's
 *   choice with a receipt, never into the player's history (G2); the request gate still holds requests (T3);
 * - the halt card comes before the first expulsion wave at every level, and a halt on record also retires a wave that
 *   was seeded before it; an old save with an answered card keeps its answer; fail-closed reads (RB5 item 1);
 * - H-17: the penalty stays keyed on the seat; a display-only `authored_by: 'staff_default'` attribution names the
 *   side's forces and the open refusal, never "you ordered";
 * - a banned-word scan of the new receipts and copy.
 */

import { describe, expect, it } from 'vitest';

import type { SettlementRecord } from '../../src/map/settlements.js';
import type { EdgeRecord } from '../../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../../src/data/operational_data.js';
import type { FactionId, FactionState, GameState } from '../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import { initializeCasualtyLedger } from '../../src/state/casualty_ledger.js';
import { createEmptyCapital } from '../../src/state/negotiation_types.js';
import { serializeState, deserializeState } from '../../src/state/serialize.js';
import { computeFactionVerdict } from '../../src/sim/negotiation/scoring.js';
import { countBlockingPlayerDecisions } from '../../src/state/player_decision_manifest.js';
import {
    MINORITY_POLICY_CARD_ID_BY_FACTION,
    MINORITY_POLICY_DEFAULT_RESPONSE_ID,
    MINORITY_POLICY_HALT_FLAG_BY_FACTION,
    MINORITY_POLICY_HALT_RESPONSE_ID,
    hasMinorityExpulsionPolicy,
    minorityPolicyAppliedFlag,
    processDisplacementTakeover,
} from '../../src/state/displacement_takeover.js';
import type { MunicipalityPopulation1991Map } from '../../src/state/population_share.js';
import { detectParamilitaryTargets, isPlayerParamilitaryRequestGateHolding } from '../../src/sim/combat/paramilitary_sweep.js';
import { explicitParamilitaryOrder, resolveNonManualParamilitaryPolicy } from '../../src/sim/combat/paramilitary_policy.js';
import { evaluateEvents } from '../../src/sim/events/evaluate_events.js';
import { resolveEventDecisionCore } from '../../src/sim/events/resolve_decision_core.js';
import { resolvePlayerEventDecisionsBySilence } from '../../src/sim/events/silence_resolution.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import { initializeStrategicDimensions } from '../../src/sim/events/strategic_dimensions.js';
import { PARAMILITARY_POLICY_CARD_ID_BY_FACTION } from '../../src/sim/events/paramilitary_policy_flag.js';
import { resolveParamilitaryReviewRequests } from '../../src/desktop/paramilitary_review_ipc.js';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter.js';
import { buildDecisionConsequenceLedger } from '../../src/ui/map/data/decisionConsequenceLedger.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';

const CATALOG = loadEventDefinitions(0);
const LEVELS = [0, 1, 2, 3] as const;
type Level = typeof LEVELS[number];
type Side = 'RS' | 'RBiH' | 'HRHB';
const noRng = () => 0;

/** Banned in a §6 staff receipt or attribution (lane C s8 copy rules; RB5 item 2 and 5). */
const BANNED = /\b(allow\w*|authori[sz]\w*|approv\w*|permit\w*|relocat\w*|cleared)\b/i;

// ─── Paramilitary fixture: one undefended enemy cell ringed by the side ────────────────────────────────────────────

const TARGET = 'op:testmun:pocket';
const RING = ['op:testmun:ring_a', 'op:testmun:ring_b', 'op:testmun:ring_c'];
const VICTIM: Record<Side, FactionId> = { RS: 'RBiH', RBiH: 'RS', HRHB: 'RS' };
const CARD_ID = PARAMILITARY_POLICY_CARD_ID_BY_FACTION as Record<string, string | undefined>;
const CARD: Record<string, EventDefinition> = Object.fromEntries(
    Object.entries(CARD_ID).map(([side, id]) => [side, CATALOG.find((def) => def.id === id)!]),
);
const FIRE_TURN: Record<string, number> = { RS: 1, RBiH: 3 };

function graph(): { edges: EdgeRecord[]; reverseMap: OperationalToCanonicalReverseMap } {
    const edges = [
        ...RING.map((cell) => ({ a: cell, b: TARGET }) as EdgeRecord),
        { a: RING[0], b: RING[1] } as EdgeRecord,
        { a: RING[1], b: RING[2] } as EdgeRecord,
    ];
    const reverseMap = new Map<string, string[]>();
    for (const cell of [TARGET, ...RING]) reverseMap.set(cell, [cell]);
    return { edges, reverseMap };
}

function pocket(side: Side, meta: Partial<GameState['meta']>, turn = 1): GameState {
    const controllers: Record<string, FactionId> = { [TARGET]: VICTIM[side] };
    for (const cell of RING) controllers[cell] = side;
    return {
        meta: { turn, phase: 'war', schema_version: 1, seed: 'player-override-s6', ...meta } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        paramilitary_policy: 'ask',
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_fire_counts: {},
            event_last_fired_turn: {},
            enabled_event_ids: [],
            event_flags: side === 'RBiH' ? { rbih_state_identity: 'civic' } : {},
            event_decision_log: [],
            pending_event_decisions: [],
            negotiation: {
                strategic_dimensions: initializeStrategicDimensions(),
                capital: { RS: createEmptyCapital(), RBiH: createEmptyCapital(), HRHB: createEmptyCapital() },
            },
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: {
                testmun: {
                    organizational_penetration: {
                        patriotska_liga: side === 'RBiH' ? 70 : 0, sda_penetration: side === 'RBiH' ? 60 : 0,
                        paramilitary_rs: side === 'RS' ? 70 : 0, sds_penetration: side === 'RS' ? 60 : 0,
                        paramilitary_hrhb: side === 'HRHB' ? 70 : 0, hdz_penetration: side === 'HRHB' ? 60 : 0,
                    },
                },
            },
        } as any,
        displacement: {
            civilian_casualties: {
                RS: { killed: 0, fled_abroad: 0 },
                RBiH: { killed: 0, fled_abroad: 0 },
                HRHB: { killed: 0, fled_abroad: 0 },
            },
        } as any,
    } as GameState;
}

function human(side: Side, level: Level): Partial<GameState['meta']> {
    return { player_faction: side, autonomy_level: level, headless_scenario_auto_control: false };
}

/** The bot playing the side: the same state with no player (the headless harness has no player faction). */
function botCopy(state: GameState): GameState {
    const copy = structuredClone(state);
    delete (copy.meta as { player_faction?: unknown }).player_faction;
    delete (copy.meta as { autonomy_level?: unknown }).autonomy_level;
    copy.meta.headless_scenario_auto_control = true;
    return copy;
}

/** One detect pass: the side's sweep targets and its pending requests. */
function detect(state: GameState, side: Side): { sweeps: string[]; requests: number } {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
    return {
        sweeps: report.spawned.filter((spawn) => spawn.faction === side).map((spawn) => spawn.formation_id + '>' + spawn.target_osid),
        requests: (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === side).length,
    };
}

/** evaluate-events with the side's card, then the pause boundary: what the turn pipeline does (silence at levels 0-2). */
function eventsStep(state: GameState, defs: EventDefinition[], turn = state.meta.turn): void {
    state.meta.turn = turn;
    evaluateEvents(state, noRng, turn, defs);
    resolvePlayerEventDecisionsBySilence(state, defs, turn);
}

function cardRows(state: GameState, eventId: string) {
    return (state.military.event_decision_log ?? []).filter((row) => row.event_id === eventId);
}

function silenceReceipts(state: GameState) {
    return (state.meta.proposal_decision_history ?? []).filter((row) => row.resolved_by === 'silence');
}

describe('H-14 + H-21: silence is the bot\'s order at every level (paramilitary)', () => {
    for (const side of ['RS', 'RBiH', 'HRHB'] as const) {
        for (const level of LEVELS) {
            it(`${side} a${level}, before any card: the side sweeps as the bot does, and no request reaches the player`, () => {
                const live = pocket(side, human(side, level));
                const bot = botCopy(live);
                const a = detect(live, side);
                const b = detect(bot, side);
                expect(a.sweeps).toEqual(b.sweeps);
                expect(a.requests).toBe(0);
                // The bot's historical default: RS and HRHB send the sweep, RBiH refuses.
                expect(a.sweeps.length).toBe(side === 'RBiH' ? 0 : 1);
                if (level === 0 && side !== 'HRHB') expect(isPlayerParamilitaryRequestGateHolding(live)).toBe(true);
            });
        }
    }

    for (const side of ['RS', 'RBiH'] as const) {
        for (const level of LEVELS) {
            it(`${side} a${level}: the card left unanswered is answered as the bot answers it, in its fire turn, and the side then sweeps as the bot does`, () => {
                const live = pocket(side, human(side, level), FIRE_TURN[side]);
                if (side === 'RBiH') live.military.enabled_event_ids = [CARD_ID.RBiH!];
                const bot = botCopy(live);
                eventsStep(live, [CARD[side]!]);
                eventsStep(bot, [CARD[side]!]);
                const liveRow = cardRows(live, CARD_ID[side]!);
                const botRow = cardRows(bot, CARD_ID[side]!);
                expect(liveRow.map((row) => [row.response_id, row.decision_source, row.turn]))
                    .toEqual(botRow.map((row) => [row.response_id, row.decision_source, row.turn]));
                expect(live.military.event_flags?.[`${side.toLowerCase()}_paramilitary_policy`])
                    .toBe(bot.military.event_flags?.[`${side.toLowerCase()}_paramilitary_policy`]);
                expect(live.military.pending_event_decisions ?? []).toEqual([]);
                // Levels 0-2: one "staff proceeded" receipt; Observer answers at fire time as before (no receipt).
                expect(silenceReceipts(live).map((row) => row.id)).toEqual(level < 3 ? [`EVENT_SILENCE_${CARD_ID[side]}`] : []);
                expect(detect(live, side).sweeps).toEqual(detect(bot, side).sweeps);
                expect(resolveNonManualParamilitaryPolicy(live, side, CATALOG)).toBe(resolveNonManualParamilitaryPolicy(bot, side, CATALOG));
            });
        }
    }

    it('silence costs what the bot\'s act costs (G5): the same war-crime count after the sweep lands', async () => {
        const { advanceParamilitaries } = await import('../../src/sim/combat/paramilitary_sweep.js');
        const live = pocket('RS', human('RS', 1));
        const bot = botCopy(live);
        const { edges, reverseMap } = graph();
        for (const state of [live, bot]) {
            detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
            for (let t = 1; t <= 4; t++) {
                state.meta.turn = t + 1;
                advanceParamilitaries(state, edges, reverseMap);
            }
        }
        const count = (state: GameState) => (state.military.negotiation as any).capital.RS.war_crimes_events_emergent;
        expect(count(live)).toBeGreaterThan(0);
        expect(count(live)).toBe(count(bot));
        expect(live.political.political_controllers).toEqual(bot.political.political_controllers);
        // BRIGHTLINE-MODE (2026-11-27): the verdict has no seat or mode gate, so the hands-off live seat and the
        // headless run read the same verdict, condemned for the same act.
        expect(computeFactionVerdict(live, 'RS').condemnation_flags).toContain('authorized_cleansing_condemnation');
        expect(JSON.stringify(computeFactionVerdict(live, 'RS'))).toBe(JSON.stringify(computeFactionVerdict(bot, 'RS')));
    });
});

describe('G1: an explicit refusal outranks silence and persists (negative controls)', () => {
    it('RS: a standing Always deny given at Full Control before the card binds the card\'s silence answer, every level after, and a save/load', () => {
        const state = pocket('RS', human('RS', 0), 1);
        expect(resolveParamilitaryReviewRequests(state, { decisions: [], policy: 'always_deny' })).toMatchObject({ ok: true });
        eventsStep(state, [CARD.RS!]);
        // F1-B: the staff answer the card with the player's own order, never the bot's Always allow.
        expect(cardRows(state, CARD_ID.RS!).map((row) => [row.response_id, row.decision_source])).toEqual([['always_deny', 'bot_ai_default']]);
        expect(detect(state, 'RS').sweeps).toEqual([]);
        for (const level of [1, 2, 3, 0] as const) {
            state.meta.autonomy_level = level;
            for (const turn of [2, 3]) {
                state.meta.turn = turn;
                expect(detect(state, 'RS').sweeps, `a${level} t${turn}`).toEqual([]);
            }
        }
        const reloaded = deserializeState(serializeState(state));
        reloaded.meta.autonomy_level = 2;
        reloaded.meta.turn = 4;
        expect(explicitParamilitaryOrder(reloaded, 'RS')).toBe('always_deny');
        expect(resolveNonManualParamilitaryPolicy(reloaded, 'RS', CATALOG)).toBe('always_deny');
        expect(detect(reloaded, 'RS').sweeps).toEqual([]);
        // Control: the same state with no order sweeps (the bot's Always allow).
        expect(detect(pocket('RS', human('RS', 2), 4), 'RS').sweeps.length).toBe(1);
    });

    it('RS: a refusal filed ahead (the card not fired) binds at once, never clamped into ask and so into the bot\'s allow', () => {
        for (const level of [1, 2, 3] as const) {
            const state = pocket('RS', human('RS', level), 1);
            state.military.event_decision_log = [{ event_id: CARD_ID.RS!, response_id: 'always_deny', decision_source: 'player', faction: 'RS', turn: 0 }];
            expect(explicitParamilitaryOrder(state, 'RS'), `a${level}`).toBe('always_deny');
            expect(detect(state, 'RS').sweeps, `a${level}`).toEqual([]);
        }
    });

    it('RS: an own refusal outlives a newer decision for another side (a faction switch) and is never read as allow', () => {
        const state = pocket('RS', human('RS', 2), 6);
        state.paramilitary_policy = 'always_allow';
        state.paramilitary_decision_history = [
            { kind: 'standing_order', id: 'paramilitary_order:2:RS', turn: 2, faction: 'RS', order: 'always_deny' },
            { id: 'paramilitary:4:op:x:y', turn: 4, target_osid: 'op:x:y', faction: 'RBiH', strength: 150, decision: 'allow' },
        ];
        expect(explicitParamilitaryOrder(state, 'RS')).toBe('always_deny');
        expect(detect(state, 'RS').sweeps).toEqual([]);
    });

    it('the cap only downgrades an Always allow (to silence), never a refusal', () => {
        // An older build's modal Always allow above the cap before the card applies: no order, the bot's order (RBiH Refuse).
        const allow = pocket('RBiH', human('RBiH', 2), 2);
        allow.paramilitary_policy = 'always_allow';
        allow.paramilitary_decision_history = [{ kind: 'standing_order', id: 'paramilitary_order:1:RBiH', turn: 1, faction: 'RBiH', order: 'always_allow' }];
        expect(explicitParamilitaryOrder(allow, 'RBiH')).toBeNull();
        expect(resolveNonManualParamilitaryPolicy(allow, 'RBiH', CATALOG)).toBe('always_deny');
        // A refusal is within every cap.
        const deny = pocket('RS', human('RS', 2), 2);
        deny.paramilitary_policy = 'always_deny';
        deny.paramilitary_decision_history = [{ kind: 'standing_order', id: 'paramilitary_order:1:RS', turn: 1, faction: 'RS', order: 'always_deny' }];
        expect(resolveNonManualParamilitaryPolicy(deny, 'RS', CATALOG)).toBe('always_deny');
    });

    it('a malformed own record reads as a refusal (fail closed)', () => {
        const state = pocket('HRHB', human('HRHB', 2), 3);
        state.paramilitary_decision_history = [{ kind: 'standing_order', id: 'paramilitary_order:2:HRHB', turn: 2, faction: 'HRHB', order: 'forged' } as never];
        expect(explicitParamilitaryOrder(state, 'HRHB')).toBe('always_deny');
        expect(detect(state, 'HRHB').sweeps).toEqual([]);
    });
});

describe('H-14 at Full Control: Review each blocks Advance; undecided at the next Advance it resolves as the staff\'s choice (G2)', () => {
    it('HRHB Review each: a request, blocking; left undecided, the next Advance sends the bot\'s sweep with a receipt and no player history', () => {
        const state = pocket('HRHB', human('HRHB', 0), 3);
        expect(resolveParamilitaryReviewRequests(state, { decisions: [], policy: 'ask' })).toMatchObject({ ok: true });
        expect(detect(state, 'HRHB')).toEqual({ sweeps: [], requests: 1 });
        expect(countBlockingPlayerDecisions(state as never, 'HRHB')).toBe(1);
        const historyBefore = structuredClone(state.paramilitary_decision_history);
        state.meta.turn = 4;
        const next = detect(state, 'HRHB');
        expect(next.sweeps.map((sweep) => sweep.split('>')[1])).toEqual([TARGET]);
        expect(state.paramilitary_decision_history).toEqual(historyBefore);
        const receipts = silenceReceipts(state);
        expect(receipts.map((row) => [row.id, row.domain, row.accepted, row.proposed_value])).toEqual([
            [`PARAMILITARY_SILENCE_${TARGET}`, 'military', true, 'sweep_sent'],
        ]);
        for (const row of receipts) expect(row.description).not.toMatch(BANNED);
    });

    it('RS Review each answered on the card: the undecided request resolves as the bot\'s order under an applied Review each (none sent)', () => {
        const state = pocket('RS', human('RS', 0), 1);
        evaluateEvents(state, noRng, 1, [CARD.RS!]);
        resolveEventDecisionCore(state, CARD_ID.RS!, 'ask');
        resolvePlayerEventDecisionsBySilence(state, [CARD.RS!], 1);
        expect(silenceReceipts(state)).toEqual([]); // the player answered: no silence
        expect(detect(state, 'RS')).toEqual({ sweeps: [], requests: 1 });
        state.meta.turn = 2;
        const next = detect(state, 'RS');
        expect(next.sweeps).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
        expect(silenceReceipts(state).map((row) => row.proposed_value)).toEqual(['no_sweep']);
        // Review each is the player's choice: the turn's fresh request comes to them again.
        expect(next.requests).toBe(1);
    });

    it('the gate-holds branch stays: no request is made or kept before the card applies; the held side does what the bot does', () => {
        const state = pocket('RS', human('RS', 0), 1);
        state.pending_paramilitary_requests = [{ target_osid: 'op:stale:x', faction: 'RS', strength: 150, mode: 'rear_pocket', decision: 'allow' }];
        expect(isPlayerParamilitaryRequestGateHolding(state)).toBe(true);
        const bot = botCopy(state);
        const live = detect(state, 'RS');
        expect(live.requests).toBe(0);
        expect(state.pending_paramilitary_requests ?? []).toEqual([]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
        expect(live.sweeps).toEqual(detect(bot, 'RS').sweeps.filter((sweep) => !sweep.endsWith('op:stale:x')));
        expect(live.sweeps.some((sweep) => sweep.endsWith('op:stale:x'))).toBe(false);
        // The IPC still refuses an approval while the gate holds.
        state.pending_paramilitary_requests = [{ target_osid: 'op:stale:y', faction: 'RS', strength: 150, mode: 'rear_pocket' }];
        expect(resolveParamilitaryReviewRequests(state, { decisions: [{ target_osid: 'op:stale:y', decision: 'allow' }] }))
            .toEqual({ ok: false, error: 'paramilitary_policy_not_applied' });
    });
});

// ─── Displacement fixture (H-20) ───────────────────────────────────────────────────────────────────────────────────

const HALT_CARD_ID = MINORITY_POLICY_CARD_ID_BY_FACTION.HRHB!;
const HALT_FLAG = MINORITY_POLICY_HALT_FLAG_BY_FACTION.HRHB!;
const HALT_CARD = CATALOG.find((def) => def.id === HALT_CARD_ID)!;
const WAR_STARTED = 49;
const pop1991: MunicipalityPopulation1991Map = {
    vitez: { total: 1000, bosniak: 410, serb: 50, croat: 450, other: 90 },
    mostar: { total: 1000, bosniak: 400, serb: 50, croat: 500, other: 50 },
};
function osidRecord(osid: string, total: number, bosniaks: number, croats: number): SettlementRecord {
    return {
        sid: osid, source_id: osid, mun_code: osid.split(':')[1], mun: osid.split(':')[1],
        properties: { population_total: total, population_bosniaks: bosniaks, population_croats: croats, population_serbs: 0, population_others: 0 },
    } as unknown as SettlementRecord;
}
const osidSettlements = new Map<string, SettlementRecord>([
    ['op:vitez:vitez', osidRecord('op:vitez:vitez', 1000, 400, 600)],
    ['op:mostar:zapad', osidRecord('op:mostar:zapad', 2000, 600, 1400)],
]);

function warState(meta: Partial<GameState['meta']>, turn = WAR_STARTED + 1): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'player-override-s6-h20', phase: 'war', war_start_turn: 0, rbih_hrhb_war_earliest_turn: 20, ...meta },
        factions: [],
        military: {
            formations: {},
            militia_pools: {},
            fired_event_ids: [],
            event_flags: {},
            event_decision_log: [],
            pending_event_decisions: [],
            war_front_edges_osid: [],
            negotiation: {
                strategic_dimensions: initializeStrategicDimensions(),
                capital: {
                    HRHB: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RBiH: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                    RS: { war_crimes_events: 0, war_crimes_events_emergent: 0 },
                },
            },
        } as any,
        political: {
            war_alliance_rbih_hrhb: 0.05,
            rbih_hrhb_state: { war_started_turn: WAR_STARTED },
            political_controllers: { 'op:vitez:vitez': 'HRHB', 'op:mostar:zapad': 'HRHB' },
        } as any,
        displacement: {} as any,
    } as GameState;
}

function hrhb(level: Level): Partial<GameState['meta']> {
    return { player_faction: 'HRHB', autonomy_level: level, headless_scenario_auto_control: false };
}

function displacementStep(state: GameState): void {
    processDisplacementTakeover(state, new Map(), { battles: [] }, pop1991, osidSettlements);
}

function policyTimers(state: GameState) {
    return Object.fromEntries(Object.entries(state.displacement.hostile_takeover_timers ?? {})
        .filter(([, timer]) => timer.cause === 'policy_expulsion'));
}

/** Turns from the halt card's fire turn on: events (with the pause boundary), then the displacement step. */
function runTurns(state: GameState, from: number, to: number, onPause?: (state: GameState, turn: number) => void): void {
    for (let turn = from; turn <= to; turn++) {
        state.meta.turn = turn;
        evaluateEvents(state, noRng, turn, [HALT_CARD]);
        onPause?.(state, turn);
        resolvePlayerEventDecisionsBySilence(state, [HALT_CARD], turn);
        displacementStep(state);
    }
}

function firstWaveTurn(state: GameState): number | null {
    const turns = Object.values(policyTimers(state)).map((timer) => timer.matured_turn).filter((turn): turn is number => typeof turn === 'number');
    return turns.length > 0 ? Math.min(...turns) : null;
}

describe('H-20: the HRHB expulsion policy, silence = the default, the halt outranks', () => {
    for (const level of LEVELS) {
        it(`a${level}: hands-off, the same policy timers, wave turns and war-crime count as the bot; the card comes before the first wave`, () => {
            const live = warState(hrhb(level));
            const bot = warState({});
            let pendingAtPause: string[] = [];
            runTurns(live, WAR_STARTED + 1, WAR_STARTED + 18, (state, turn) => {
                if (turn === WAR_STARTED + 1) pendingAtPause = (state.military.pending_event_decisions ?? []).map((row) => row.event_id);
            });
            runTurns(bot, WAR_STARTED + 1, WAR_STARTED + 18);
            expect(policyTimers(live)).toEqual(policyTimers(bot));
            expect(Object.keys(policyTimers(live)).length).toBeGreaterThan(0);
            expect(live.military.event_flags[minorityPolicyAppliedFlag('HRHB')]).toBe(bot.military.event_flags[minorityPolicyAppliedFlag('HRHB')]);
            expect((live.military.negotiation as any).capital.HRHB.war_crimes_events).toBe((bot.military.negotiation as any).capital.HRHB.war_crimes_events);
            // The halt card fires the turn after the war began, before the seed, and waits at the pause at every level,
            // Observer included (H-20, orchestrator call 1): the refusal is reachable before the first wave at every level.
            const fired = live.military.event_last_fired_turn?.[HALT_CARD_ID];
            expect(fired).toBe(WAR_STARTED + 1);
            const wave = firstWaveTurn(live);
            expect(wave).not.toBeNull();
            expect(fired!).toBeLessThan(wave!);
            expect(cardRows(live, HALT_CARD_ID).map((row) => row.turn)).toEqual([WAR_STARTED + 1]);
            expect(pendingAtPause).toEqual([HALT_CARD_ID]);
            expect(cardRows(live, HALT_CARD_ID).map((row) => [row.response_id, row.decision_source])).toEqual([[MINORITY_POLICY_DEFAULT_RESPONSE_ID, 'bot_ai_default']]);
            expect(live.military.event_flags[HALT_FLAG]).toBeUndefined();
        });

        it(`a${level}: no decision on record at all (an old save, a trigger miss) applies the default on the bot's turn`, () => {
            const live = warState(hrhb(level));
            const bot = warState({});
            displacementStep(live);
            displacementStep(bot);
            expect(policyTimers(live)).toEqual(policyTimers(bot));
            expect(hasMinorityExpulsionPolicy(live, 'HRHB')).toBe(true);
        });
    }

    for (const level of [0, 1, 2, 3] as const) {
        it(`a${level}: a halt ordered at the pause outranks silence and persists across turns, a level change and save/load`, () => {
            let state = warState(hrhb(level));
            runTurns(state, WAR_STARTED + 1, WAR_STARTED + 1, (s, turn) => {
                if (turn === WAR_STARTED + 1) resolveEventDecisionCore(s, HALT_CARD_ID, MINORITY_POLICY_HALT_RESPONSE_ID);
            });
            expect(state.military.event_flags[HALT_FLAG]).toBe(true);
            expect(policyTimers(state)).toEqual({});
            state.meta.autonomy_level = 3;
            runTurns(state, WAR_STARTED + 2, WAR_STARTED + 6);
            state = deserializeState(serializeState(state));
            state.meta.autonomy_level = 1;
            runTurns(state, WAR_STARTED + 7, WAR_STARTED + 20);
            expect(policyTimers(state)).toEqual({});
            expect(firstWaveTurn(state)).toBeNull();
            expect(hasMinorityExpulsionPolicy(state, 'HRHB')).toBe(false);
            expect((state.military.negotiation as any).capital.HRHB.war_crimes_events).toBe(0);
            expect(silenceReceipts(state)).toEqual([]);
        });
    }

    it('a halt on record after the seed (the card came late) retires every wave not yet fired; the bot is unchanged by a stray flag', () => {
        const state = warState(hrhb(1));
        displacementStep(state); // seeded with no decision on record (silence)
        expect(Object.keys(policyTimers(state)).length).toBe(2);
        state.meta.turn = WAR_STARTED + 2;
        state.military.fired_event_ids = [HALT_CARD_ID];
        state.military.event_last_fired_turn = { [HALT_CARD_ID]: WAR_STARTED + 2 };
        state.military.event_decision_log.push({ event_id: HALT_CARD_ID, response_id: MINORITY_POLICY_HALT_RESPONSE_ID, decision_source: 'player', faction: 'HRHB', turn: WAR_STARTED + 2 });
        state.military.event_flags[HALT_FLAG] = true;
        for (let turn = WAR_STARTED + 2; turn <= WAR_STARTED + 20; turn++) {
            state.meta.turn = turn;
            displacementStep(state);
        }
        expect(policyTimers(state)).toEqual({});
        expect((state.military.negotiation as any).capital.HRHB.war_crimes_events).toBe(0);

        const bot = warState({});
        bot.military.event_flags[HALT_FLAG] = true;
        for (let turn = WAR_STARTED + 1; turn <= WAR_STARTED + 20; turn++) {
            bot.meta.turn = turn;
            displacementStep(bot);
        }
        expect(firstWaveTurn(bot)).not.toBeNull();
    });

    it('an old save with an answered card keeps its answer (no halt: the waves; halt: none), through save/load', () => {
        for (const [responseId, expectWaves] of [[MINORITY_POLICY_DEFAULT_RESPONSE_ID, true], [MINORITY_POLICY_HALT_RESPONSE_ID, false]] as const) {
            let state = warState(hrhb(2));
            state.military.fired_event_ids = [HALT_CARD_ID];
            state.military.event_last_fired_turn = { [HALT_CARD_ID]: WAR_STARTED + 1 };
            state.military.event_decision_log.push({ event_id: HALT_CARD_ID, response_id: responseId, decision_source: 'player', faction: 'HRHB', turn: WAR_STARTED + 1 });
            if (responseId === MINORITY_POLICY_HALT_RESPONSE_ID) state.military.event_flags[HALT_FLAG] = true;
            state = deserializeState(serializeState(state));
            for (let turn = WAR_STARTED + 1; turn <= WAR_STARTED + 18; turn++) {
                state.meta.turn = turn;
                displacementStep(state);
            }
            expect(firstWaveTurn(state) !== null, responseId).toBe(expectWaves);
        }
    });

    it('fail closed (RB5 item 1): a malformed own row is a refusal; Observer\'s bot_ai_default never is; a filed, unapplied halt is not a decision', () => {
        const malformed = warState(hrhb(2));
        malformed.military.fired_event_ids = [HALT_CARD_ID];
        malformed.military.event_last_fired_turn = { [HALT_CARD_ID]: WAR_STARTED + 1 };
        malformed.military.event_decision_log.push({ event_id: HALT_CARD_ID, response_id: '', decision_source: 'player', faction: 'HRHB', turn: WAR_STARTED + 1 });
        expect(hasMinorityExpulsionPolicy(malformed, 'HRHB')).toBe(false);

        const observer = warState(hrhb(3));
        observer.military.fired_event_ids = [HALT_CARD_ID];
        observer.military.event_decision_log.push({ event_id: HALT_CARD_ID, response_id: MINORITY_POLICY_HALT_RESPONSE_ID, decision_source: 'bot_ai_default', faction: 'HRHB', turn: WAR_STARTED + 1 });
        expect(hasMinorityExpulsionPolicy(observer, 'HRHB')).toBe(true);

        const filed = warState(hrhb(1));
        filed.military.event_decision_log.push({ event_id: HALT_CARD_ID, response_id: MINORITY_POLICY_HALT_RESPONSE_ID, decision_source: 'player', faction: 'HRHB', turn: WAR_STARTED });
        expect(hasMinorityExpulsionPolicy(filed, 'HRHB')).toBe(true);
    });

    it('headless: the headless flag with player_faction HRHB behaves as the bot (no card decision read)', () => {
        const bot = warState({});
        displacementStep(bot);
        for (const level of LEVELS) {
            const state = warState({ ...hrhb(level), headless_scenario_auto_control: true });
            state.military.event_flags[HALT_FLAG] = true;
            displacementStep(state);
            expect(policyTimers(state), `a${level}`).toEqual(policyTimers(bot));
        }
    });

    it('silence never orders the halt, in either decision mode (the halt is the player\'s act only)', () => {
        for (const mode of ['historical', 'emergent'] as const) {
            const state = warState({ ...hrhb(1), decision_mode: mode });
            runTurns(state, WAR_STARTED + 1, WAR_STARTED + 1);
            expect(cardRows(state, HALT_CARD_ID).map((row) => row.response_id), mode).toEqual([MINORITY_POLICY_DEFAULT_RESPONSE_ID]);
            expect(state.military.event_flags[HALT_FLAG], mode).toBeUndefined();
        }
    });
});

describe('H-17: the penalty stays on the seat; a display-only staff-default attribution', () => {
    const ATTRIBUTION_KEY = 'decisionConsequences.attribution.staffDefault' as const;

    it('the attribution copy names the side\'s forces, the standing default and the open refusal, never an order of the player\'s', () => {
        const text = enMessages[ATTRIBUTION_KEY];
        expect(text).toMatch(/your side's forces/i);
        expect(text).toMatch(/standing default/i);
        expect(text).toMatch(/refusal was available/i);
        expect(text).not.toMatch(/you ordered|you authori[sz]ed|you approved/i);
        expect(text).not.toMatch(BANNED);
    });

    function rawSweepSave(faction: 'RS' | 'HRHB', log: unknown[]): any {
        return {
            meta: { turn: 9, phase: 'war', player_faction: faction },
            military: {
                formations: {
                    [`para_${faction.toLowerCase()}_t5_0`]: {
                        id: `para_${faction.toLowerCase()}_t5_0`, faction, kind: 'paramilitary', status: 'inactive',
                        created_turn: 5, paramilitary_target: 'op:kakanj:biljesevo',
                    },
                },
                event_decision_log: log,
                fired_event_ids: log.length > 0 ? [CARD_ID.RS] : [],
                event_fire_counts: log.length > 0 ? { [CARD_ID.RS!]: 1 } : {},
                event_last_fired_turn: log.length > 0 ? { [CARD_ID.RS!]: 1 } : {},
                negotiation: { capital: { RS: createEmptyCapital(), RBiH: createEmptyCapital(), HRHB: createEmptyCapital() } },
            },
            political: {
                political_controllers: { 'op:kakanj:biljesevo': faction },
                control_events: [{ turn: 6, settlement_id: 'op:kakanj:biljesevo', from: 'RBiH', to: faction, mechanism: 'paramilitary' }],
            },
            paramilitary_decision_history: [],
        };
    }

    function receiptRecord(raw: any, faction: string) {
        const parsed = parseGameState(raw);
        const ledger = buildDecisionConsequenceLedger({ ...parsed, player_faction: faction, rawGameState: { meta: { player_faction: faction } } } as any, 100)
            .filter((record) => record.familyId === 'paramilitary-receipt');
        return { view: parsed.paramilitaryUnrequested ?? [], ledger };
    }

    it('a sweep under the staff default (no card, or an automatic answer) carries the attribution; an in-person order does not', () => {
        const staff = receiptRecord(rawSweepSave('HRHB', []), 'HRHB');
        expect(staff.view.map((row) => [row.cause, row.authored_by, row.captured])).toEqual([['historical_default_staff', 'staff_default', true]]);
        expect(staff.ledger[0]!.attributionToken).toEqual({ key: ATTRIBUTION_KEY });
        expect(staff.ledger[0]!.attribution).toBe(enMessages[ATTRIBUTION_KEY]);

        const automatic = receiptRecord(rawSweepSave('RS', [
            { event_id: CARD_ID.RS, response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 1 },
        ]), 'RS');
        expect(automatic.view.map((row) => [row.cause, row.authored_by])).toEqual([['standing_order_automatic', 'staff_default']]);

        const inPerson = receiptRecord(rawSweepSave('RS', [
            { event_id: CARD_ID.RS, response_id: 'always_allow', decision_source: 'player', faction: 'RS', turn: 1 },
        ]), 'RS');
        expect(inPerson.view.map((row) => [row.cause, row.authored_by])).toEqual([['standing_order', undefined]]);
        expect(inPerson.ledger[0]!.attribution).toBeUndefined();
    });
});

describe('banned-word scan of the new receipts', () => {
    it('the §6 silence receipts and the staff resolution of a request never say allow, authorize, approve, permit, relocated or cleared', () => {
        const descriptions: string[] = [];
        for (const side of ['RS', 'RBiH'] as const) {
            const state = pocket(side, human(side, 1), FIRE_TURN[side]);
            if (side === 'RBiH') state.military.enabled_event_ids = [CARD_ID.RBiH!];
            eventsStep(state, [CARD[side]!]);
            descriptions.push(...silenceReceipts(state).map((row) => row.description));
            for (const row of silenceReceipts(state)) expect(row.proposed_value).toBeUndefined();
        }
        const halt = warState(hrhb(2));
        runTurns(halt, WAR_STARTED + 1, WAR_STARTED + 1);
        descriptions.push(...silenceReceipts(halt).map((row) => row.description));
        const review = pocket('HRHB', human('HRHB', 0), 3);
        resolveParamilitaryReviewRequests(review, { decisions: [], policy: 'ask' });
        detect(review, 'HRHB');
        review.meta.turn = 4;
        detect(review, 'HRHB');
        descriptions.push(...silenceReceipts(review).map((row) => row.description));
        expect(descriptions.length).toBe(4);
        for (const text of descriptions) {
            expect(text, text).not.toMatch(BANNED);
            expect(text).toMatch(/staff proceeded/);
        }
    });
});
