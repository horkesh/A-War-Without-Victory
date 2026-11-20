/**
 * §6 D1 stage 2: the paramilitary standing policy binds every non-manual spawn.
 *
 * Integrated ruling 2026-11-18 §1, §2, §9, with round-2 amendments A1 (a human-controlled faction
 * follows the human's current standing order at every level; unanswered or `ask` sends none at
 * Assisted to Observer) and A3 (march turns pinned at 0; the C4 start-week guard). Bots follow
 * the decided card flag, else the card's historical default read from the event data.
 *
 * Synthetic matrix: three factions x (bot, autonomy 0-3) x each order plus unanswered, through
 * the real `detectParamilitaryTargets` gate. Live checks run the desktop campaign path.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    detectParamilitaryTargets,
    resolvePlayerParamilitaryDecisions,
} from '../src/sim/combat/paramilitary_sweep.js';
import {
    findParamilitaryPolicyCard,
    historicalParamilitaryPolicy,
    resolveNonManualParamilitaryPolicy,
} from '../src/sim/combat/paramilitary_policy.js';
import {
    paramilitaryPolicyFlagKey,
    PARAMILITARY_POLICY_CARD_ID_BY_FACTION,
} from '../src/sim/events/paramilitary_policy_flag.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import { PARAMILITARY_MARCH_TURNS } from '../src/state/formation_constants.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { withoutComments } from './helpers/sourceComments';

const CATALOG = loadEventDefinitions(0);
const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
type Faction = typeof FACTIONS[number];
type Controller = 'bot' | 0 | 1 | 2 | 3;
type Order = 'always_allow' | 'always_deny' | 'ask' | 'unanswered';
const CONTROLLERS: Controller[] = ['bot', 0, 1, 2, 3];
const ORDERS: Order[] = ['always_allow', 'always_deny', 'ask', 'unanswered'];

/** The side that holds the pocket the attacker would sweep (never an RBiH-HRHB pair). */
const POCKET_HOLDER: Record<Faction, FactionId> = { RBiH: 'RS', RS: 'RBiH', HRHB: 'RS' };
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

function penetrationFor(attacker: Faction): Record<string, number> {
    return {
        patriotska_liga: attacker === 'RBiH' ? 70 : 0,
        sda_penetration: attacker === 'RBiH' ? 60 : 0,
        paramilitary_rs: attacker === 'RS' ? 70 : 0,
        sds_penetration: attacker === 'RS' ? 60 : 0,
        paramilitary_hrhb: attacker === 'HRHB' ? 70 : 0,
        hdz_penetration: attacker === 'HRHB' ? 60 : 0,
    };
}

/** A turn-5 war state in which `attacker` surrounds one undefended enemy cell. */
function pocketState(attacker: Faction, meta: Partial<GameState['meta']> = {}): GameState {
    const holder = POCKET_HOLDER[attacker];
    const controllers: Record<string, FactionId> = { [TARGET]: holder };
    for (const cell of RING) controllers[cell] = attacker;
    return {
        meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'binding-test', ...meta } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: { testmun: { organizational_penetration: penetrationFor(attacker) } },
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

/** The card FIRED at t3: with its receipt and flag, its answer has applied (§6 T3's `hasParamilitaryPolicyCardApplied`). */
function markCardFired(state: GameState, cardId: string): void {
    state.military.fired_event_ids = [...(state.military.fired_event_ids ?? []), cardId];
    state.military.event_fire_counts = { ...(state.military.event_fire_counts ?? {}), [cardId]: 1 };
    state.military.event_last_fired_turn = { ...(state.military.event_last_fired_turn ?? {}), [cardId]: 3 };
}

/**
 * Write `order` the way the game does for this faction. A bot's order is its card flag. A human's
 * order is `state.paramilitary_policy`, carried by the card answer (flag + decision log) or, for a
 * side with no card (HRHB), by a filed review-modal decision. A card answer is an APPLIED one: the card
 * fired (since §6 T merged, a receipt without a firing is only a filed answer, which binds nothing).
 */
function applyOrder(state: GameState, faction: Faction, controller: Controller, order: Order): void {
    if (order === 'unanswered') {
        if (controller !== 'bot') state.paramilitary_policy = 'ask'; // migration v12 / opening default
        return;
    }
    const key = paramilitaryPolicyFlagKey(faction);
    const cardId = PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction];
    if (controller === 'bot') {
        state.military.event_flags = { [key]: order };
        if (cardId) {
            markCardFired(state, cardId);
            state.military.event_decision_log = [
                { event_id: cardId, response_id: order, decision_source: 'bot_ai_default', faction, turn: 3 },
            ];
        }
        return;
    }
    state.paramilitary_policy = order;
    if (cardId) {
        markCardFired(state, cardId);
        state.military.event_flags = { [key]: order };
        state.military.event_decision_log = [
            { event_id: cardId, response_id: order, decision_source: 'player', faction, turn: 3 },
        ];
    } else {
        state.paramilitary_decision_history = [{
            id: 'paramilitary:3:op:elsewhere:x',
            turn: 3,
            target_osid: 'op:elsewhere:x',
            faction,
            strength: 150,
            decision: order === 'always_allow' ? 'allow' : 'deny',
        }];
    }
}

function metaFor(faction: Faction, controller: Controller): Partial<GameState['meta']> {
    return controller === 'bot'
        ? {}
        : { player_faction: faction, autonomy_level: controller, headless_scenario_auto_control: false };
}

/** Expected [spawns, pending requests] for the attacking faction. */
function expected(faction: Faction, controller: Controller, order: Order): [number, number] {
    if (controller === 'bot') {
        if (order === 'always_allow') return [1, 0];
        if (order === 'unanswered') {
            // The card's historical default: RBiH Refuse, RS Always allow; HRHB has no card (allow, as before).
            return faction === 'RBiH' ? [0, 0] : [1, 0];
        }
        return [0, 0]; // always_deny; `ask` with no human asking denies (§2)
    }
    if (controller === 0) {
        // Manual path, byte-unchanged: Always allow deploys, Always deny sends none, ask raises a request.
        if (order === 'always_allow') return [1, 0];
        if (order === 'always_deny') return [0, 0];
        // §6 T3 (merged): unanswered, a side with a card raises no request until the card applies an answer.
        if (order === 'unanswered' && PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction]) return [0, 0];
        return [0, 1];
    }
    // Assisted, Delegated, Observer: the human's standing order binds; nothing but Always allow sends a sweep.
    return order === 'always_allow' ? [1, 0] : [0, 0];
}

function attackerOutcome(state: GameState, faction: Faction, catalog: readonly EventDefinition[] | undefined = CATALOG): [number, number] {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(
        state, edges, reverseMap, catalog,
    );
    const spawns = report.spawned.filter((spawn) => spawn.faction === faction).length;
    const pending = (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === faction).length;
    return [spawns, pending];
}

describe('§6 D1 stage 2: the standing policy binds every non-manual paramilitary spawn', () => {
    describe('resolver matrix through the detect gate: three factions x (bot, autonomy 0-3) x each order plus unanswered', () => {
        for (const faction of FACTIONS) {
            for (const controller of CONTROLLERS) {
                for (const order of ORDERS) {
                    const [spawns, pending] = expected(faction, controller, order);
                    it(`${faction} ${controller === 'bot' ? 'bot' : `human at autonomy ${controller}`} under ${order}: ${spawns} sweep(s), ${pending} request(s)`, () => {
                        const state = pocketState(faction, metaFor(faction, controller));
                        applyOrder(state, faction, controller, order);
                        expect(attackerOutcome(state, faction)).toEqual([spawns, pending]);
                    });
                }
            }
        }
    });

    it('an RBiH bot with no decision sends no sweep: the card\'s historical default is Refuse, read from the event data', () => {
        const state = pocketState('RBiH');
        expect(state.military.event_flags?.rbih_paramilitary_policy).toBeUndefined();
        expect(attackerOutcome(state, 'RBiH')).toEqual([0, 0]);
        expect(resolveNonManualParamilitaryPolicy(state, 'RBiH', CATALOG)).toBe('always_deny');
        // The RS bot's historical default still sends its sweeps.
        expect(resolveNonManualParamilitaryPolicy(pocketState('RS'), 'RS', CATALOG)).toBe('always_allow');
    });

    it('Always allow is a positive control at Delegated: staff send the sweep and it is booked when it takes the cell', () => {
        const state = pocketState('RBiH', metaFor('RBiH', 2));
        applyOrder(state, 'RBiH', 2, 'always_allow');
        expect(attackerOutcome(state, 'RBiH')).toEqual([1, 0]);
    });

    it('a mid-campaign order change through the review modal binds the staff; the stale card flag does not', () => {
        // The human answered the card Always allow, then, at Full Control, set Always deny in the review
        // modal (the IPC writes state.paramilitary_policy and resolves the pending requests), then delegated.
        const state = pocketState('RBiH', metaFor('RBiH', 0));
        applyOrder(state, 'RBiH', 0, 'always_allow');
        state.pending_paramilitary_requests = [{ target_osid: 'op:other:q', faction: 'RBiH', strength: 150, mode: 'rear_pocket' }];
        state.meta.turn = 4;
        state.paramilitary_policy = 'always_deny';
        state.pending_paramilitary_requests[0]!.decision = 'deny';
        resolvePlayerParamilitaryDecisions(state);
        expect(state.military.event_flags?.rbih_paramilitary_policy).toBe('always_allow');
        state.meta.turn = 5;
        state.meta.autonomy_level = 2;
        expect(attackerOutcome(state, 'RBiH')).toEqual([0, 0]);

        // The other direction: a card Refuse, then Always allow in the modal, binds too.
        const reverse = pocketState('RBiH', metaFor('RBiH', 0));
        applyOrder(reverse, 'RBiH', 0, 'always_deny');
        reverse.pending_paramilitary_requests = [{ target_osid: 'op:other:q', faction: 'RBiH', strength: 150, mode: 'rear_pocket' }];
        reverse.meta.turn = 4;
        reverse.paramilitary_policy = 'always_allow';
        reverse.pending_paramilitary_requests[0]!.decision = 'allow';
        resolvePlayerParamilitaryDecisions(reverse);
        reverse.meta.turn = 5;
        reverse.meta.autonomy_level = 2;
        expect(attackerOutcome(reverse, 'RBiH')).toEqual([1, 0]);
    });

    it('an order never carries across a faction switch', () => {
        // RS human answered Always allow, then the campaign switched to RBiH; the RBiH bot had refused.
        // Both cards fired and applied (a receipt alone is a filed answer since §6 T, and binds nothing).
        const toRbih = pocketState('RBiH', metaFor('RBiH', 2));
        markCardFired(toRbih, 'rs_paramilitary_policy_1992');
        markCardFired(toRbih, 'rbih_paramilitary_policy_1992');
        toRbih.paramilitary_policy = 'always_allow';
        toRbih.military.event_flags = { rs_paramilitary_policy: 'always_allow', rbih_paramilitary_policy: 'always_deny' };
        toRbih.military.event_decision_log = [
            { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RS', turn: 2 },
            { event_id: 'rbih_paramilitary_policy_1992', response_id: 'always_deny', decision_source: 'bot_ai_default', faction: 'RBiH', turn: 4 },
        ];
        expect(attackerOutcome(toRbih, 'RBiH')).toEqual([0, 0]);

        // RBiH human answered Always allow, then switched to RS, whose bot had answered Always allow too:
        // the value coincides, but the human never answered for RS, so RS staff send none.
        const toRs = pocketState('RS', metaFor('RS', 2));
        markCardFired(toRs, 'rbih_paramilitary_policy_1992');
        markCardFired(toRs, 'rs_paramilitary_policy_1992');
        toRs.paramilitary_policy = 'always_allow';
        toRs.military.event_flags = { rs_paramilitary_policy: 'always_allow', rbih_paramilitary_policy: 'always_allow' };
        toRs.military.event_decision_log = [
            { event_id: 'rbih_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RBiH', turn: 0 },
            { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 2 },
        ];
        expect(attackerOutcome(toRs, 'RS')).toEqual([0, 0]);

        // An HRHB human's modal order (filed for HRHB) does not carry to RBiH either.
        const fromHrhb = pocketState('RBiH', metaFor('RBiH', 2));
        applyOrder(fromHrhb, 'HRHB', 2, 'always_allow');
        expect(attackerOutcome(fromHrhb, 'RBiH')).toEqual([0, 0]);
    });

    it('pending requests carried across an autonomy switch never spawn without a decision', () => {
        const state = pocketState('RBiH', metaFor('RBiH', 0));
        applyOrder(state, 'RBiH', 0, 'ask');
        expect(attackerOutcome(state, 'RBiH')).toEqual([0, 1]);
        state.meta.autonomy_level = 2;
        for (const order of ['ask', 'always_deny', 'always_allow'] as const) {
            if (order === 'always_allow') applyOrder(state, 'RBiH', 2, 'always_allow');
            else state.paramilitary_policy = order;
            const before = JSON.stringify(state.pending_paramilitary_requests);
            const [spawns] = attackerOutcome(state, 'RBiH');
            // The carried request names the only pocket: it is never auto-approved, and no new sweep takes its cell.
            expect(spawns, order).toBe(0);
            expect(JSON.stringify(state.pending_paramilitary_requests), order).toBe(before);
            expect(state.pending_paramilitary_requests?.[0]?.decision, order).toBeUndefined();
        }
    });

    it('Observer: a modal Always deny stays binding, and an HRHB human with no order sends none', () => {
        const rs = pocketState('RS', metaFor('RS', 0));
        applyOrder(rs, 'RS', 0, 'always_allow');
        rs.pending_paramilitary_requests = [{ target_osid: 'op:other:q', faction: 'RS', strength: 150, mode: 'rear_pocket' }];
        rs.meta.turn = 4;
        rs.paramilitary_policy = 'always_deny';
        rs.pending_paramilitary_requests[0]!.decision = 'deny';
        resolvePlayerParamilitaryDecisions(rs);
        rs.meta.turn = 5;
        rs.meta.autonomy_level = 3;
        expect(attackerOutcome(rs, 'RS')).toEqual([0, 0]);

        const hrhb = pocketState('HRHB', metaFor('HRHB', 3));
        applyOrder(hrhb, 'HRHB', 3, 'unanswered');
        expect(attackerOutcome(hrhb, 'HRHB')).toEqual([0, 0]);
    });

    describe('catalog and data guards', () => {
        it('the card registry matches the unfiltered event data: RBiH and RS have one card each, HRHB none', () => {
            for (const faction of FACTIONS) {
                expect(findParamilitaryPolicyCard(CATALOG, faction)?.id ?? null, faction)
                    .toBe(PARAMILITARY_POLICY_CARD_ID_BY_FACTION[faction] ?? null);
            }
            expect(historicalParamilitaryPolicy(findParamilitaryPolicyCard(CATALOG, 'RBiH')!, 'RBiH')).toBe('always_deny');
            expect(historicalParamilitaryPolicy(findParamilitaryPolicyCard(CATALOG, 'RS')!, 'RS')).toBe('always_allow');
            // Every card that writes any <faction>_paramilitary_policy flag is registered.
            const writers = CATALOG.filter((def) => (def.response_options ?? [])
                .some((option) => Object.keys(option.sets_flags ?? {}).some((key) => /^[a-z]+_paramilitary_policy$/.test(key))))
                .map((def) => def.id)
                .sort();
            expect(writers).toEqual(Object.values(PARAMILITARY_POLICY_CARD_ID_BY_FACTION).sort());
        });

        it('one flag-key helper: the card mirror and the resolver use the same key', () => {
            expect(paramilitaryPolicyFlagKey('RBiH')).toBe('rbih_paramilitary_policy');
            expect(paramilitaryPolicyFlagKey('RS')).toBe('rs_paramilitary_policy');
            const mirror = withoutComments(readFileSync('src/sim/events/evaluate_events.ts', 'utf8'));
            expect(mirror).toMatch(/paramilitaryPolicyFlagKey\(/);
            expect(mirror).not.toMatch(/'rbih_paramilitary_policy'|'rs_paramilitary_policy'/);
            // Since the merge onto §6 T the sweep's request gate reads T's card registry, from which D1's id map derives.
            const sweep = withoutComments(readFileSync('src/sim/combat/paramilitary_sweep.ts', 'utf8'));
            expect(sweep).toMatch(/PARAMILITARY_POLICY_CARD_BY_FACTION/);
            expect(sweep).not.toMatch(/'rbih_paramilitary_policy_1992'|'rs_paramilitary_policy_1992'/);
        });

        it('the resolver throws when more than one card sets the key, and a card with no default fails', () => {
            const rbihCard = findParamilitaryPolicyCard(CATALOG, 'RBiH')!;
            const twin = { ...rbihCard, id: 'rbih_paramilitary_policy_twin' } as EventDefinition;
            expect(() => resolveNonManualParamilitaryPolicy(pocketState('RBiH'), 'RBiH', [rbihCard, twin])).toThrow(/2 cards set/);
            const noDefault = { ...rbihCard, historical_default_response_id: undefined, bot_response_logic: 'historical' } as unknown as EventDefinition;
            expect(() => resolveNonManualParamilitaryPolicy(pocketState('RBiH'), 'RBiH', [noDefault])).toThrow(/no authored AI default/);
            const badDefault = {
                ...rbihCard,
                response_options: (rbihCard.response_options ?? []).map((option) => option.id === 'always_deny'
                    ? { ...option, sets_flags: { rbih_paramilitary_refused: true } }
                    : option),
            } as EventDefinition;
            expect(() => resolveNonManualParamilitaryPolicy(pocketState('RBiH'), 'RBiH', [badDefault])).toThrow(/does not set/);
        });

        it('C4: a card the start-week filter removed never reads as "no card"', () => {
            const filtered = loadEventDefinitions(10);
            expect(filtered.some((def) => def.id === 'rbih_paramilitary_policy_1992')).toBe(false);
            expect(resolveNonManualParamilitaryPolicy(pocketState('RBiH'), 'RBiH', filtered)).toBe('always_deny');
            expect(attackerOutcome(pocketState('RBiH'), 'RBiH', filtered)).toEqual([0, 0]);
            // A decided flag still binds whatever the catalog holds.
            const decided = pocketState('RS');
            decided.military.event_flags = { rs_paramilitary_policy: 'always_allow' };
            expect(resolveNonManualParamilitaryPolicy(decided, 'RS', filtered)).toBe('always_allow');
            // Every shipped scenario's filtered catalog still holds both cards.
            for (const file of readdirSync('data/scenarios').filter((name) => name.endsWith('.json')).sort()) {
                const scenario = JSON.parse(readFileSync(`data/scenarios/${file}`, 'utf8'));
                if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario) || !('scenario_id' in scenario)) continue;
                const startWeek = typeof scenario.scenario_start_week === 'number' ? scenario.scenario_start_week : 0;
                const ids = new Set(loadEventDefinitions(startWeek).map((def) => def.id));
                for (const cardId of Object.values(PARAMILITARY_POLICY_CARD_ID_BY_FACTION)) {
                    expect(ids.has(cardId!), `${file}: ${cardId}`).toBe(true);
                }
            }
        });

        it('eventDefinitions is a required argument, and the war phase and both entry points pass the catalog', () => {
            expect(detectParamilitaryTargets.length).toBe(4);
            const phases = withoutComments(readFileSync('src/sim/turn_phases/war_phases.ts', 'utf8'));
            expect(phases).toMatch(/detectParamilitaryTargets\(\s*context\.state,\s*od\.edges,\s*od\.opData\.operationalToCanonical,\s*context\.input\.eventDefinitions,?\s*\)/);
            const runner = withoutComments(readFileSync('src/scenario/scenario_runner.ts', 'utf8'));
            expect(runner).toMatch(/const eventDefinitions = loadEventDefinitions\(/);
            expect(runner).toMatch(/runTurn\(state, \{[\s\S]{0,2000}?\n\s*eventDefinitions,\n/);
            const desktop = withoutComments(readFileSync('src/desktop/desktop_sim.ts', 'utf8'));
            expect(desktop).toMatch(/runTurn\(turnState, \{[\s\S]{0,2000}?eventDefinitions: loadDesktopEventDefinitions\(baseDir\)/);
        });

        it('PARAMILITARY_MARCH_TURNS is 0: spawn and capture fall in the same turn, so no sweep marches across an order change', () => {
            expect(PARAMILITARY_MARCH_TURNS).toBe(0);
        });
    });
});
