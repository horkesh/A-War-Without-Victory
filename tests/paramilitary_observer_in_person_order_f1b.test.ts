/**
 * §6 D1 stage 2, F1-B (signed 2026-11-19: engine/systems, red-team, scenario-tester, game-designer under SHDG §6 "Change to
 * paramilitary policy surface", historian, ui-ux-developer; copy by the §4 panel).
 *
 * The rule. When the player's own registered paramilitary policy card is answered automatically (Observer: at fire time, or
 * in the drain of decisions queued before Observer), and the player already gave that side an Always allow or Always deny in
 * person (`hasInPersonParamilitaryStandingOrder`), the automatic answer is the option whose `sets_flags` writes that order.
 * Its effects, flags, dimension shifts and (at fire time) notifications are then the order's own: the price equals answering
 * the card in person with that order. Every other case keeps the historical default. The decision stays logged
 * `bot_ai_default` (no enum or schema change).
 *
 * Without F1-B (E1 alone) the record and the act disagreed: an RBiH Always allow kept at Observer carried a refusal's +5 and
 * `rbih_paramilitary_refused` while the staff swept (a §2a reward path); an RS Always deny kept at Observer paid an
 * authorization it never acted on.
 *
 * Both mismatched cases (red-team E8) are driven at both entry points through the real `evaluateEvents`, the review-modal
 * IPC body, `resolveEventDecisionCore` (the in-person answer), the detect gate and the march step, and read back through the
 * real adapter, ledger and distance-from-history reader. RBiH runs on a synthetic state: its identity card's answer is
 * written directly (a legacy save, a faction switch or the harness reach this state; engine Q3).
 *
 * Registered, not changed here: the Observer drain sends no notifications and applies no runtime causality (engine Q3 point
 * 3). Neither policy card's options carry runtime causality, so B does not depend on it; the drain cases pin that no
 * notification at all is sent, in particular no false one.
 */

import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    advanceParamilitaries,
    detectParamilitaryTargets,
    resolvePlayerParamilitaryDecisions,
} from '../src/sim/combat/paramilitary_sweep.js';
import { resolveNonManualParamilitaryPolicy } from '../src/sim/combat/paramilitary_policy.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { resolveEventDecisionCore } from '../src/sim/events/resolve_decision_core.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition, EventResponseOption } from '../src/sim/events/event_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';
import { PARAMILITARY_POLICY_CARD_ID_BY_FACTION } from '../src/sim/events/paramilitary_policy_flag.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { buildDecisionConsequenceLedger } from '../src/ui/map/data/decisionConsequenceLedger.js';
import { buildDistanceFromHistory } from '../src/ui/map/data/distanceFromHistory.js';

const CATALOG = loadEventDefinitions(0);
type Side = 'RS' | 'RBiH';
type Order = 'always_allow' | 'always_deny';
type EntryPoint = 'fire time' | 'drain';
const ENTRY_POINTS: EntryPoint[] = ['fire time', 'drain'];

const CARD_ID: Record<Side, string> = {
    RS: PARAMILITARY_POLICY_CARD_ID_BY_FACTION.RS!,
    RBiH: PARAMILITARY_POLICY_CARD_ID_BY_FACTION.RBiH!,
};
const CARD: Record<Side, EventDefinition> = {
    RS: CATALOG.find((def) => def.id === CARD_ID.RS)!,
    RBiH: CATALOG.find((def) => def.id === CARD_ID.RBiH)!,
};
/** The first turn each card's window opens (war_1992.json: RS t2-8, RBiH t3-9). */
const FIRE_TURN: Record<Side, number> = { RS: 2, RBiH: 3 };
const RS_GOALS_ID = 'rs_strategic_goals';
const RS_GOALS = CATALOG.find((def) => def.id === RS_GOALS_ID)!;

/** The two mismatched cases: the order the player gives in person differs from the card's historical default. */
const CASES: { side: Side; order: Order; historical: Order }[] = [
    { side: 'RS', order: 'always_deny', historical: 'always_allow' },
    { side: 'RBiH', order: 'always_allow', historical: 'always_deny' },
];

function option(side: Side, id: string): EventResponseOption {
    const found = CARD[side].response_options?.find((candidate) => candidate.id === id);
    if (!found) throw new Error(`${CARD_ID[side]} has no option ${id}`);
    return found;
}

/** Two undefended pockets in one municipality, each ringed by the human's side: one deployment per municipality per turn. */
const POCKETS = ['op:testmun:pocket_a', 'op:testmun:pocket_b'];
const RINGS = [
    ['op:testmun:ring_a1', 'op:testmun:ring_a2', 'op:testmun:ring_a3'],
    ['op:testmun:ring_b1', 'op:testmun:ring_b2', 'op:testmun:ring_b3'],
];

function graph(): { edges: EdgeRecord[]; reverseMap: OperationalToCanonicalReverseMap } {
    const edges: EdgeRecord[] = [];
    POCKETS.forEach((pocket, i) => {
        for (const cell of RINGS[i]!) edges.push({ a: cell, b: pocket } as EdgeRecord);
        edges.push({ a: RINGS[i]![0], b: RINGS[i]![1] } as EdgeRecord, { a: RINGS[i]![1], b: RINGS[i]![2] } as EdgeRecord);
    });
    edges.push({ a: RINGS[0]![2], b: RINGS[1]![0] } as EdgeRecord);
    const reverseMap = new Map<string, string[]>();
    for (const cell of [...POCKETS, ...RINGS.flat()]) reverseMap.set(cell, [cell]);
    return { edges, reverseMap };
}

/** A turn-1 war state: a human `side` at Full Control, no standing order yet, a fresh strategic-dimension store. */
function humanState(side: Side): GameState {
    const holder: FactionId = side === 'RS' ? 'RBiH' : 'RS';
    const controllers: Record<string, string> = {};
    for (const pocket of POCKETS) controllers[pocket] = holder;
    for (const cell of RINGS.flat()) controllers[cell] = side;
    return {
        meta: {
            turn: 1,
            phase: 'war',
            schema_version: 1,
            seed: 'f1b-in-person-order',
            player_faction: side,
            autonomy_level: 0,
            headless_scenario_auto_control: false,
        } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        paramilitary_policy: 'ask',
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_flags: {},
            pending_event_decisions: [],
            negotiation: { strategic_dimensions: initializeStrategicDimensions() },
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

/**
 * Enable the side's policy card. RS: the strategic-goals card answered in person (as in the live campaign). RBiH: the identity
 * card's answer written directly, a synthetic state (engine Q3: a legacy save, a faction switch or the harness reach it).
 */
function enableCard(state: GameState, side: Side): void {
    if (side === 'RS') {
        state.military.fired_event_ids.push(RS_GOALS_ID);
        state.military.pending_event_decisions!.push({
            event_id: RS_GOALS_ID,
            event_title: RS_GOALS.title ?? RS_GOALS_ID,
            turn_fired: state.meta.turn,
            response_options: RS_GOALS.response_options!,
            faction: 'RS',
            requires_player_response: true,
        } as any);
        resolveEventDecisionCore(state, RS_GOALS_ID, 'all_six');
    } else {
        state.military.event_flags = { ...(state.military.event_flags ?? {}), rbih_state_identity: 'civic' };
        state.military.enabled_event_ids = [...(state.military.enabled_event_ids ?? []), CARD_ID.RBiH].sort();
    }
    expect(state.military.enabled_event_ids).toContain(CARD_ID[side]);
}

/** The review modal's standing order (the `resolve-paramilitary-requests` IPC body). */
function modalOrder(state: GameState, side: Side, order: Order): void {
    state.paramilitary_policy = order;
    for (const request of state.pending_paramilitary_requests ?? []) {
        if (request.faction === side) request.decision = order === 'always_allow' ? 'allow' : 'deny';
    }
    resolvePlayerParamilitaryDecisions(state);
}

/** [sweeps spawned, requests pending] for `side` from one pass of the real detect gate. */
function detect(state: GameState, side: Side): [number, number] {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
    const pending = (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === side).length;
    return [report.spawned.filter((spawn) => spawn.faction === side).length, pending];
}

/**
 * At Full Control, t1: the first pocket raises a request (the card is not enabled yet, so it is not pending), the human gives
 * the standing order in the review modal, and the side's card is then enabled.
 */
function inPersonOrderBeforeTheCard(side: Side, order: Order): GameState {
    const state = humanState(side);
    expect(detect(state, side)).toEqual([0, 1]);
    modalOrder(state, side, order);
    expect(state.paramilitary_policy).toBe(order);
    expect(state.paramilitary_decision_history?.map((record) => [record.faction, record.decision]))
        .toEqual([[side, order === 'always_allow' ? 'allow' : 'deny']]);
    enableCard(state, side);
    return state;
}

/** A human who never gave an order in person: the side's card is enabled and nothing was filed. */
function noInPersonOrder(side: Side): GameState {
    const state = humanState(side);
    enableCard(state, side);
    return state;
}

const noRng = () => 0;

/** Observer answers the card automatically at `entry`: it fires at Observer, or it fired at Full Control and is drained. */
function answerAtObserver(state: GameState, side: Side, entry: EntryPoint, registry: EventDefinition[] = [CARD[side]]): void {
    const turn = FIRE_TURN[side];
    if (entry === 'fire time') {
        state.meta.turn = turn;
        state.meta.autonomy_level = 3;
        evaluateEvents(state, noRng, turn, registry);
        return;
    }
    state.meta.turn = turn;
    evaluateEvents(state, noRng, turn, registry);
    expect((state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([CARD_ID[side]]);
    expect(cardEntries(state, side)).toEqual([]);
    state.meta.turn = turn + 1;
    state.meta.autonomy_level = 3;
    evaluateEvents(state, noRng, turn + 1, registry);
    expect(state.military.pending_event_decisions ?? []).toEqual([]);
}

/** The same card answered in person with `responseId`, at the same entry point's turn, then the human goes to Observer. */
function answerInPerson(state: GameState, side: Side, entry: EntryPoint, responseId: string): void {
    const turn = FIRE_TURN[side];
    state.meta.turn = turn;
    state.meta.autonomy_level = entry === 'fire time' ? 2 : 0;
    evaluateEvents(state, noRng, turn, [CARD[side]]);
    expect((state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([CARD_ID[side]]);
    if (entry === 'fire time') {
        resolveEventDecisionCore(state, CARD_ID[side], responseId);
        state.meta.autonomy_level = 3;
        return;
    }
    state.meta.turn = turn + 1;
    resolveEventDecisionCore(state, CARD_ID[side], responseId);
    state.meta.autonomy_level = 3;
    // The rest of the drain turn, with nothing left to drain.
    evaluateEvents(state, noRng, turn + 1, [CARD[side]]);
}

function cardEntries(state: GameState, side: Side) {
    return (state.military.event_decision_log ?? []).filter((entry) => entry.event_id === CARD_ID[side]);
}

function dimension(state: GameState, side: Side, id: string): number {
    return (state.military.negotiation as any).strategic_dimensions[side][id].event_modifier;
}

/** Each side's dimension accumulators, read before the card is answered (an earlier answer, e.g. RS goals, may have moved them). */
function dimensionsBefore(state: GameState): (side: Side, id: string) => number {
    const store = JSON.parse(JSON.stringify((state.military.negotiation as any).strategic_dimensions));
    return (side, id) => store[side][id].event_modifier;
}

function cardNotifications(state: GameState, side: Side) {
    return (state.military.pending_event_notifications ?? [])
        .filter((notification) => notification.event_id === CARD_ID[side])
        .map((notification) => [notification.target_faction, notification.response_id, notification.headline]);
}

/** The notifications the card's data authors for `responseId`, to every other side, in the emitter's order. */
function authoredNotifications(side: Side, responseId: string) {
    const authored = CARD[side].notifications_to_other_factions?.[responseId] ?? {};
    return Object.keys(authored).sort().map((target) => [target, responseId, (authored as any)[target].headline]);
}

/** Assert the card's record is the one the option `responseId` writes, and nothing of the other orders. */
function expectRecordOf(
    state: GameState,
    side: Side,
    responseId: string,
    entry: EntryPoint,
    before: (side: Side, id: string) => number,
): void {
    const chosen = option(side, responseId);
    expect(cardEntries(state, side)).toEqual([
        expect.objectContaining({ response_id: responseId, decision_source: 'bot_ai_default', faction: side }),
    ]);
    for (const [key, value] of Object.entries(chosen.sets_flags ?? {})) {
        expect(state.military.event_flags?.[key], key).toBe(value);
    }
    for (const other of CARD[side].response_options ?? []) {
        if (other.id === responseId) continue;
        for (const key of Object.keys(other.sets_flags ?? {})) {
            if (key in (chosen.sets_flags ?? {})) continue;
            expect(state.military.event_flags?.[key], `${key} (from ${other.id})`).toBeUndefined();
        }
    }
    for (const shift of chosen.dimension_shifts ?? []) {
        const moved = dimension(state, shift.faction as Side, shift.dimension) - before(shift.faction as Side, shift.dimension);
        expect(moved, shift.dimension).toBe(shift.delta);
    }
    expect(cardNotifications(state, side)).toEqual(entry === 'fire time' ? authoredNotifications(side, responseId) : []);
}

describe('§6 D1 stage 2 F1-B: Observer answers the card with the order the player gave in person', () => {
    for (const entry of ENTRY_POINTS) {
        it(`RS modal Always deny kept at Observer (${entry}): the card is answered Always deny, with the refusal's record and price`, () => {
            const state = inPersonOrderBeforeTheCard('RS', 'always_deny');
            const before = dimensionsBefore(state);
            answerAtObserver(state, 'RS', entry);

            expectRecordOf(state, 'RS', 'always_deny', entry, before);
            const flags = state.military.event_flags ?? {};
            expect(flags.rs_paramilitary_policy).toBe('always_deny');
            expect(flags.rs_paramilitary_refused).toBe(true);
            expect(flags).not.toHaveProperty('rs_paramilitary_authorized');
            // The refusal's shifts (war_1992.json: international standing +8, internal cohesion -10), not the authorization's -10.
            expect(dimension(state, 'RS', 'international_standing') - before('RS', 'international_standing')).toBe(8);
            expect(dimension(state, 'RS', 'internal_cohesion') - before('RS', 'internal_cohesion')).toBe(-10);
            expect(state.military.recruitment_modifiers).toEqual([
                { faction: 'RS', pool_multiplier: 0.95, expires_turn: (state.meta.turn ?? 0) + 52 },
            ]);
            expect(state.military.bot_priority_shifts).toEqual([
                expect.objectContaining({ faction: 'RS', remove_objectives: ['paramilitary_rear_clearance'] }),
            ]);
            if (entry === 'fire time') {
                // The other sides are told the true order: a refusal, never "authorizes".
                expect(cardNotifications(state, 'RS').map(([target, response]) => [target, response])).toEqual([
                    ['HRHB', 'always_deny'],
                    ['RBiH', 'always_deny'],
                ]);
            } else {
                // Registered drain asymmetry: no notification at all, so no false one.
                expect(cardNotifications(state, 'RS')).toEqual([]);
            }
            // The order in force is still the in-person Always deny, and the gate sends nothing.
            expect(state.paramilitary_policy).toBe('always_deny');
            expect(resolveNonManualParamilitaryPolicy(state, 'RS', CATALOG)).toBe('always_deny');
            expect(detect(state, 'RS')).toEqual([0, 0]);
        });

        it(`RBiH modal Always allow kept at Observer (${entry}, synthetic state): the card is answered Always allow, with the authorization's price and no refusal`, () => {
            const state = inPersonOrderBeforeTheCard('RBiH', 'always_allow');
            const before = dimensionsBefore(state);
            answerAtObserver(state, 'RBiH', entry);

            expectRecordOf(state, 'RBiH', 'always_allow', entry, before);
            const flags = state.military.event_flags ?? {};
            expect(flags.rbih_paramilitary_policy).toBe('always_allow');
            expect(flags.rbih_paramilitary_authorized).toBe(true);
            expect(flags).not.toHaveProperty('rbih_paramilitary_refused');
            // The authorization's price: -25 standing, -15 leverage, recruitment x0.95 for 52 turns; no refusal's +5 or -3.
            expect(dimension(state, 'RBiH', 'international_standing') - before('RBiH', 'international_standing')).toBe(-25);
            expect(dimension(state, 'RBiH', 'negotiating_leverage') - before('RBiH', 'negotiating_leverage')).toBe(-15);
            expect(dimension(state, 'RBiH', 'internal_cohesion') - before('RBiH', 'internal_cohesion')).toBe(0);
            expect(state.military.recruitment_modifiers).toEqual([
                { faction: 'RBiH', pool_multiplier: 0.95, expires_turn: (state.meta.turn ?? 0) + 52 },
            ]);
            if (entry === 'fire time') {
                expect(cardNotifications(state, 'RBiH').map(([target, response]) => [target, response])).toEqual([
                    ['HRHB', 'always_allow'],
                    ['RS', 'always_allow'],
                ]);
            } else {
                expect(cardNotifications(state, 'RBiH')).toEqual([]);
            }
            expect(state.paramilitary_policy).toBe('always_allow');
            expect(resolveNonManualParamilitaryPolicy(state, 'RBiH', CATALOG)).toBe('always_allow');
        });

        for (const { side, historical } of CASES) {
            it(`control (${side}, ${entry}): with no in-person order, Observer answers with the historical default`, () => {
                const state = noInPersonOrder(side);
                const before = dimensionsBefore(state);
                answerAtObserver(state, side, entry);
                expectRecordOf(state, side, historical, entry, before);
                expect(state.paramilitary_policy).toBe(historical);
            });
        }

        it(`control (RBiH, ${entry}): an in-person order filed for another side (a faction switch) is not this side's; the historical default stands`, () => {
            const state = noInPersonOrder('RBiH');
            state.paramilitary_policy = 'always_allow';
            state.paramilitary_decision_history = [
                { id: 'paramilitary:1:op:elsewhere:x', turn: 1, target_osid: 'op:elsewhere:x', faction: 'RS', strength: 150, decision: 'allow' } as any,
            ];
            const before = dimensionsBefore(state);
            answerAtObserver(state, 'RBiH', entry);
            expectRecordOf(state, 'RBiH', 'always_deny', entry, before);
        });

        it(`the selector fails loudly (${entry}): a card with no option, or two options, writing the in-person order throws`, () => {
            const none: EventDefinition = {
                ...CARD.RBiH,
                response_options: CARD.RBiH.response_options!.filter((candidate) => candidate.id !== 'always_allow'),
            };
            const allow = option('RBiH', 'always_allow');
            const twice: EventDefinition = {
                ...CARD.RBiH,
                response_options: [...CARD.RBiH.response_options!, { ...allow, id: 'always_allow_copy' }],
            };
            for (const def of [none, twice]) {
                const state = inPersonOrderBeforeTheCard('RBiH', 'always_allow');
                expect(() => answerAtObserver(state, 'RBiH', entry, [def])).toThrow(/rbih_paramilitary_policy/);
            }
        });
    }
});

/** Deep copy without the decision source, the only field B's automatic answer may differ in from an in-person answer. */
function withoutDecisionSource(state: GameState, dropNotifications = false): unknown {
    const copy = JSON.parse(JSON.stringify(state));
    for (const entry of copy.military?.event_decision_log ?? []) delete entry.decision_source;
    if (dropNotifications) delete copy.military.pending_event_notifications;
    return copy;
}

describe('§6 D1 stage 2 F1-B: price equality with an in-person answer (game-designer condition)', () => {
    for (const { side, order } of CASES) {
        for (const entry of ENTRY_POINTS) {
            it(`${side} ${order} (${entry}): the state after B's automatic answer equals the state after answering the card in person with ${order}`, () => {
                const automatic = inPersonOrderBeforeTheCard(side, order);
                answerAtObserver(automatic, side, entry);
                const inPerson = inPersonOrderBeforeTheCard(side, order);
                answerInPerson(inPerson, side, entry, order);

                expect(cardEntries(automatic, side).map((e) => e.decision_source)).toEqual(['bot_ai_default']);
                expect(cardEntries(inPerson, side).map((e) => e.decision_source)).toEqual(['player']);
                if (entry === 'fire time') {
                    // Effects, flags, shifts, the standing order, the log and the notifications: only the decision source differs.
                    expect(withoutDecisionSource(automatic)).toEqual(withoutDecisionSource(inPerson));
                } else {
                    // The drain sends no notifications (registered, pre-existing); everything else is equal.
                    expect(cardNotifications(automatic, side)).toEqual([]);
                    expect(cardNotifications(inPerson, side)).toEqual(authoredNotifications(side, order));
                    expect(withoutDecisionSource(automatic, true)).toEqual(withoutDecisionSource(inPerson, true));
                }
            });
        }
    }
});

/** March every sweep still on its way to its outcome. */
function marchToOutcome(state: GameState): void {
    const { edges, reverseMap } = graph();
    for (let step = 0; step < 6; step++) {
        const active = Object.values(state.military.formations ?? {})
            .some((formation) => formation.kind === 'paramilitary' && formation.status === 'active');
        if (!active) return;
        state.meta.turn = (state.meta.turn ?? 0) + 1;
        advanceParamilitaries(state, edges, reverseMap);
    }
    throw new Error('a paramilitary sweep never reached its outcome');
}

/** The receipts the player would see: [cause, ledger detail key] per unrequested sweep. */
function receipts(state: GameState): { cause: string | undefined; key: string | undefined }[] {
    const parsed = parseGameState(JSON.parse(JSON.stringify(state)));
    const rows = parsed.paramilitaryUnrequested ?? [];
    const ledger = buildDecisionConsequenceLedger(parsed, 100).filter((record) => record.familyId === 'paramilitary-receipt');
    return rows.map((row) => ({
        cause: row.cause,
        key: ledger.find((record) => record.id === `paramilitary-staff:${row.id}`)?.detailToken?.key,
    }));
}

describe('§6 D1 stage 2 F1-B: the readers never count B\'s answer as history', () => {
    for (const entry of ENTRY_POINTS) {
        for (const dissolved of [false, true]) {
            it(`RBiH modal Always allow, then Observer (${entry}): a staff sweep's receipt is neutral${dissolved ? ' (dissolved)' : ''}, never the historical policy`, () => {
                const state = inPersonOrderBeforeTheCard('RBiH', 'always_allow');
                answerAtObserver(state, 'RBiH', entry);
                expect(cardEntries(state, 'RBiH')).toEqual([
                    expect.objectContaining({ response_id: 'always_allow', decision_source: 'bot_ai_default' }),
                ]);
                // The staff sends the second pocket's sweep under the order in force.
                const { edges, reverseMap } = graph();
                const report = detectParamilitaryTargets(state, edges, reverseMap, CATALOG);
                expect(report.spawned.filter((spawn) => spawn.faction === 'RBiH').map((spawn) => spawn.target_osid)).toEqual([POCKETS[1]]);
                if (dissolved) state.political.political_controllers![POCKETS[1]!] = 'RBiH';
                advanceParamilitaries(state, edges, reverseMap);
                marchToOutcome(state);

                const shown = receipts(state);
                expect(shown).toHaveLength(1);
                expect(shown[0]!.cause).toBe('neutral');
                expect(shown[0]!.key).toBe(dissolved
                    ? 'decisionConsequences.detail.paramilitary.unrequestedDissolvedNeutral'
                    : 'decisionConsequences.detail.paramilitary.unrequestedNeutral');
                expect(shown[0]!.key).not.toMatch(/AutomaticOrder$/);
            });
        }

        for (const { side, order } of CASES) {
            it(`${side} ${order} (${entry}): distance from history ignores B's automatic entry; the departure is counted once, through the filed modal entry`, () => {
                const state = inPersonOrderBeforeTheCard(side, order);
                answerAtObserver(state, side, entry);
                expect(cardEntries(state, side)).toEqual([
                    expect.objectContaining({ response_id: order, decision_source: 'bot_ai_default' }),
                ]);

                const parsed = parseGameState(JSON.parse(JSON.stringify(state)));
                const view = buildDistanceFromHistory(parsed);
                // B's entry is neither matched history nor a divergence: the view is the same with the entry removed.
                const withoutCard = JSON.parse(JSON.stringify(state));
                withoutCard.military.event_decision_log = withoutCard.military.event_decision_log
                    .filter((logged: { event_id: string }) => logged.event_id !== CARD_ID[side]);
                expect(view).toEqual(buildDistanceFromHistory(parseGameState(withoutCard)));
                expect(view.divergences.map((divergence) => divergence.eventId)).not.toContain(CARD_ID[side]);

                // The Records ledger: one filed paramilitary decision (the modal entry), and no event-decision row for the card.
                const ledger = buildDecisionConsequenceLedger(parsed, 100);
                expect(ledger.filter((record) => record.familyId === 'paramilitary-authorization')).toHaveLength(1);
                expect(ledger.filter((record) => record.familyId === 'event-decision' && record.id.includes(CARD_ID[side]))).toEqual([]);
            });
        }
    }
});
