/**
 * §6 D1 stage 2 merged onto §6 T and §6 M (2026-11-20): the duties T and M put on D1 (s6_tm_outcome.md; SHDG §6 records for
 * T and M, "D1's inherited duties").
 *
 * - D1's own proof after the merge (T+M merged proof list): no paramilitary sweep at Assisted, Delegated or Observer (autonomy
 *   1-3) before the player's own policy card has APPLIED an answer. RBiH files its answer at t0 and the card applies it at t4;
 *   RS answers its card when it fires. The worst case is pinned: an older build's modal Always allow on record.
 * - A filed answer the card has not applied yet has no effect (T2, red-team): D1's resolver treats it as unanswered, through
 *   T's one shared accessor (`hasParamilitaryPolicyCardApplied`), never a second "applied" test.
 * - D1's readers of the standing order read it through M's cap (`readParamilitaryStandingOrder`): F1-B's in-person check
 *   never sees an order above the side's applied card answer, nor above `ask` before it applies.
 */

import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { detectParamilitaryTargets } from '../src/sim/combat/paramilitary_sweep.js';
import { resolveNonManualParamilitaryPolicy } from '../src/sim/combat/paramilitary_policy.js';
import { selectInPersonParamilitaryOrderResponse } from '../src/sim/events/ai_default_response.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { hasParamilitaryPolicyCardApplied } from '../src/sim/events/paramilitary_policy_card.js';
import { hasInPersonParamilitaryStandingOrder } from '../src/sim/events/paramilitary_policy_flag.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';

const CATALOG = loadEventDefinitions(0);
type Side = 'RBiH' | 'RS';
const CARD: Record<Side, string> = { RBiH: 'rbih_paramilitary_policy_1992', RS: 'rs_paramilitary_policy_1992' };
const FLAG: Record<Side, string> = { RBiH: 'rbih_paramilitary_policy', RS: 'rs_paramilitary_policy' };
/** The turn each card applies: RBiH's filed answer at t4 (§6 T), the RS card answered when it fires at t2. */
const APPLY_TURN: Record<Side, number> = { RBiH: 4, RS: 2 };
const HOLDER: Record<Side, FactionId> = { RBiH: 'RS', RS: 'RBiH' };
const TARGET = 'op:testmun:pocket';
const RING = ['op:testmun:ring_a', 'op:testmun:ring_b', 'op:testmun:ring_c'];

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

/** A war state at `turn`: a human `side` at `autonomy`, surrounding one undefended enemy cell. */
function humanState(side: Side, autonomy: number, turn: number): GameState {
    const controllers: Record<string, FactionId> = { [TARGET]: HOLDER[side] };
    for (const cell of RING) controllers[cell] = side;
    return {
        meta: {
            turn, phase: 'war', schema_version: 1, seed: 'd1-on-t-and-m',
            player_faction: side, autonomy_level: autonomy, headless_scenario_auto_control: false,
        } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        paramilitary_policy: 'ask',
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_fire_counts: {},
            event_last_fired_turn: {},
            enabled_event_ids: [],
            event_decision_log: [],
            event_flags: {},
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: {
                testmun: {
                    organizational_penetration: {
                        patriotska_liga: side === 'RBiH' ? 70 : 0, sda_penetration: side === 'RBiH' ? 60 : 0,
                        paramilitary_rs: side === 'RS' ? 70 : 0, sds_penetration: side === 'RS' ? 60 : 0,
                        paramilitary_hrhb: 0, hdz_penetration: 0,
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

/** The answer filed ahead of the card's firing: the decision log only (§6 T2; RBiH's opening lane, at t0). */
function fileAnswer(state: GameState, side: Side, answer: string): void {
    state.military.event_decision_log.push({ event_id: CARD[side], response_id: answer, decision_source: 'player', faction: side, turn: 0 });
}

/**
 * An older build's review-modal Always allow, kept in the save: the raw order and the filed decision record. M's IPC refuses
 * this write today (above the cap), so only a save made before M carries it: the worst case for this proof.
 */
function legacyModalAllow(state: GameState, side: Side, turn = 0): void {
    state.paramilitary_policy = 'always_allow';
    state.paramilitary_decision_history = [
        { id: `paramilitary:${turn}:op:elsewhere:x`, turn, target_osid: 'op:elsewhere:x', faction: side, strength: 150, decision: 'allow' },
    ];
}

/** The card fires and its answer applies (evaluate-events, before paramilitary-detect on the same turn). */
function applyCard(state: GameState, side: Side, answer: string, source: 'player' | 'bot_ai_default', turn: number): void {
    state.military.fired_event_ids.push(CARD[side]);
    state.military.event_fire_counts[CARD[side]] = 1;
    state.military.event_last_fired_turn[CARD[side]] = turn;
    if (!state.military.event_decision_log.some((entry) => entry.event_id === CARD[side])) {
        state.military.event_decision_log.push({ event_id: CARD[side], response_id: answer, decision_source: source, faction: side, turn });
    }
    state.military.event_flags[FLAG[side]] = answer;
    state.paramilitary_policy = answer as GameState['paramilitary_policy'];
}

/** [sweeps spawned, requests pending] for `side` from one pass of the real detect gate. */
function detect(state: GameState, side: Side): [number, number] {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
    const pending = (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === side).length;
    return [report.spawned.filter((spawn) => spawn.faction === side).length, pending];
}

describe('D1 after T and M: no sweep at autonomy 1-3 before the player\'s own policy card applies', () => {
    for (const side of ['RBiH', 'RS'] as const) {
        for (const autonomy of [1, 2, 3]) {
            it(`${side} at autonomy ${autonomy}: an Always allow on record (filed${side === 'RBiH' ? ' at t0' : ''}, and an older build's modal order) sends nothing until the card applies at t${APPLY_TURN[side]}`, () => {
                const state = humanState(side, autonomy, 1);
                if (side === 'RBiH') fileAnswer(state, side, 'always_allow');
                else state.military.enabled_event_ids.push(CARD.RS); // the goals answer applied; the card fires at t2
                legacyModalAllow(state, side);
                for (let turn = 1; turn < APPLY_TURN[side]; turn += 1) {
                    state.meta.turn = turn;
                    expect(hasParamilitaryPolicyCardApplied(state, side), `t${turn}`).toBe(false);
                    expect(resolveNonManualParamilitaryPolicy(state, side, CATALOG), `t${turn}`).toBe('always_deny');
                    expect(detect(state, side), `t${turn}`).toEqual([0, 0]);
                    expect(state.military.formations, `t${turn}`).toEqual({});
                }
                // The card applies its Always allow: from that turn the staff send the sweep, and it is the side's act.
                state.meta.turn = APPLY_TURN[side];
                applyCard(state, side, 'always_allow', side === 'RBiH' ? 'player' : 'bot_ai_default', APPLY_TURN[side]);
                expect(hasParamilitaryPolicyCardApplied(state, side)).toBe(true);
                expect(detect(state, side)).toEqual([1, 0]);
            });
        }

        it(`${side} control: a filed or pending answer alone (no modal order) sends nothing at autonomy 1-3 before the card applies`, () => {
            for (const autonomy of [1, 2, 3]) {
                const state = humanState(side, autonomy, 1);
                if (side === 'RBiH') fileAnswer(state, side, 'always_allow');
                expect(detect(state, side), `a${autonomy}`).toEqual([0, 0]);
            }
        });
    }
});

describe('D1 after T: a filed answer the card has not applied is no answer (T\'s shared accessor)', () => {
    it('another side\'s filed, unapplied answer is not a human decision on record: an RS human at Observer follows its own automatic card answer', () => {
        // Engine state after a faction switch: the player filed the RBiH card at t0 as RBiH, then took RS. The RBiH card has not
        // fired. RS is at Observer; its card fired at t2 and was answered automatically (Always allow, the historical default).
        const state = humanState('RS', 3, 2);
        fileAnswer(state, 'RBiH', 'always_deny');
        applyCard(state, 'RS', 'always_allow', 'bot_ai_default', 2);
        expect(hasParamilitaryPolicyCardApplied(state, 'RBiH')).toBe(false);
        expect(resolveNonManualParamilitaryPolicy(state, 'RS', CATALOG)).toBe('always_allow');
        expect(detect(state, 'RS')).toEqual([1, 0]);
    });

    it('control: once that other card HAS applied, the earlier human answer counts, and the faction-switch rule holds (no sweep)', () => {
        const state = humanState('RS', 3, 5);
        fileAnswer(state, 'RBiH', 'always_deny');
        state.military.fired_event_ids.push(CARD.RBiH);
        state.military.event_fire_counts[CARD.RBiH] = 1;
        state.military.event_flags[FLAG.RBiH] = 'always_deny';
        applyCard(state, 'RS', 'always_allow', 'bot_ai_default', 2);
        expect(hasParamilitaryPolicyCardApplied(state, 'RBiH')).toBe(true);
        expect(resolveNonManualParamilitaryPolicy(state, 'RS', CATALOG)).toBe('always_deny');
        expect(detect(state, 'RS')).toEqual([0, 0]);
    });

    it('the side\'s own filed answer is no standing order: no in-person order for F1-B, and the staff send nothing', () => {
        for (const answer of ['always_allow', 'always_deny', 'ask'] as const) {
            const state = humanState('RBiH', 3, 2);
            fileAnswer(state, 'RBiH', answer);
            expect(hasInPersonParamilitaryStandingOrder(state, 'RBiH'), answer).toBe(false);
            expect(selectInPersonParamilitaryOrderResponse(state, CATALOG.find((def) => def.id === CARD.RBiH)!), answer).toBeNull();
            expect(resolveNonManualParamilitaryPolicy(state, 'RBiH', CATALOG), answer).toBe('always_deny');
        }
    });
});

describe('D1 after M: F1-B reads the order in force through the cap', () => {
    it('an older build\'s modal Always allow, above the cap before the card applies, is no in-person order: Observer takes the historical answer', () => {
        const state = humanState('RBiH', 3, 3);
        state.military.enabled_event_ids.push(CARD.RBiH);
        legacyModalAllow(state, 'RBiH', 1);
        expect(hasInPersonParamilitaryStandingOrder(state, 'RBiH')).toBe(false);
        expect(selectInPersonParamilitaryOrderResponse(state, CATALOG.find((def) => def.id === CARD.RBiH)!)).toBeNull();
    });

    it('control: an in-person Always deny is within any cap, so F1-B still answers the RS card with it', () => {
        const state = humanState('RS', 3, 2);
        state.military.enabled_event_ids.push(CARD.RS);
        state.paramilitary_policy = 'always_deny';
        state.paramilitary_decision_history = [
            { id: 'paramilitary:1:op:elsewhere:x', turn: 1, target_osid: 'op:elsewhere:x', faction: 'RS', strength: 150, decision: 'deny' },
        ];
        expect(hasInPersonParamilitaryStandingOrder(state, 'RS')).toBe(true);
        expect(selectInPersonParamilitaryOrderResponse(state, CATALOG.find((def) => def.id === CARD.RS)!)?.id).toBe('always_deny');
    });
});
