/**
 * §6 design M (M-a, signed unanimously 2026-11-19; s6_tm_outcome "M (M-a)" and both round-2 sections):
 * the paramilitary review modal can never raise the standing order above the answer the side's policy card
 * has APPLIED, nor above `ask` before the card has applied.
 *
 * - The cap is the card's APPLIED flag (fired, receipted, valid `event_flags.<faction>_paramilitary_policy`),
 *   never the filed receipt; `ask` when the card has not applied or the flag is missing (fails closed).
 * - Ranks: always_deny < ask < always_allow, and the IPC compares ranks (engine D9): after Refuse, `ask` and a
 *   per-request Allow are refused too. Re-raising is allowed when the card itself said Always allow.
 *   HRHB has no card and is not capped.
 * - The IPC refuses the WHOLE packet with `paramilitary_policy_cannot_loosen` and writes nothing (M-a1: the
 *   handler's decision logic is called directly, never through the UI).
 * - One accessor clamps every reader of the standing order, so an old save whose modal-written order is above
 *   its card's answer reads clamped (M-a2), and a source scan pins that no reader bypasses it (M-a3).
 * - Headless has no player, so the clamp is the identity there.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { resolveDesktopEventDecision, serializeState } from '../src/desktop/desktop_sim.js';
import { resolveParamilitaryReviewRequests } from '../src/desktop/paramilitary_review_ipc.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { detectParamilitaryTargets } from '../src/sim/combat/paramilitary_sweep.js';
import { buildGhostEntries } from '../src/sim/codex/dynamic_section_builder.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import {
    PARAMILITARY_POLICY_CANNOT_LOOSEN,
    PARAMILITARY_POLICY_CARD_BY_FACTION,
    appliedParamilitaryPolicyCardAnswer,
    isParamilitaryOrderWithinCap,
    paramilitaryStandingOrderCap,
    readParamilitaryStandingOrder,
    type ParamilitaryPolicyOrder,
} from '../src/sim/events/paramilitary_policy_card.js';
import { updateEventReadiness } from '../src/sim/events/pressure_system.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import {
    IDENTITY,
    RBIH_POLICY,
    RS_GOALS,
    RS_POLICY,
    cloneState,
    eventDef,
    newCampaign,
} from './helpers/s6_opening_lane_fixtures.js';
import { withoutComments } from './helpers/sourceComments.js';

const requireCjs = createRequire(import.meta.url);
const { projectPlayerVisibleState, OWN_PARAMILITARY_POLICY_FLAG_BY_FACTION } = requireCjs('../src/desktop/player_visible_state.cjs') as {
    projectPlayerVisibleState: (state: unknown) => any;
    OWN_PARAMILITARY_POLICY_FLAG_BY_FACTION?: Record<string, string>;
};

const CANNOT_LOOSEN = 'paramilitary_policy_cannot_loosen';
const ORDERS: readonly ParamilitaryPolicyOrder[] = ['always_deny', 'ask', 'always_allow'];
const CARD: Record<string, string> = { RBiH: RBIH_POLICY, RS: RS_POLICY };
const POLICY_FLAG: Record<string, string> = { RBiH: 'rbih_paramilitary_policy', RS: 'rs_paramilitary_policy' };

// ─── Synthetic fixtures (the T3 gate test's pocket: one enemy pocket inside the player's ground) ───

const HUBS = ['op:pocket:hub_a', 'op:pocket:hub_b', 'op:pocket:hub_c'];
const TARGET = 'op:pocket:target';
const STALE = 'op:stale:target';
const ENEMY: Record<string, FactionId> = { RBiH: 'RS', RS: 'RBiH', HRHB: 'RS' };

function edges(): EdgeRecord[] {
    const pairs: Array<[string, string]> = [[HUBS[0]!, HUBS[1]!], [HUBS[0]!, HUBS[2]!]];
    for (const hub of HUBS) pairs.push([hub, TARGET]);
    return pairs.map(([a, b]) => ({ a, b }) as EdgeRecord);
}

function reverseMap(): OperationalToCanonicalReverseMap {
    return new Map([...HUBS, TARGET].map((osid) => [osid, [osid]]));
}

function pocketState(player: FactionId | null, turn = 6, autonomy = 0): GameState {
    const controllers: Record<string, FactionId> = {};
    const owner: FactionId = player ?? 'RS';
    for (const hub of HUBS) controllers[hub] = owner;
    controllers[TARGET] = ENEMY[owner]!;
    return {
        meta: {
            turn,
            phase: 'war',
            schema_version: 1,
            seed: 'test',
            ...(player ? { player_faction: player, headless_scenario_auto_control: false, autonomy_level: autonomy } : {}),
        } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_fire_counts: {},
            event_last_fired_turn: {},
            enabled_event_ids: [],
            closed_event_ids: [],
            event_decision_log: [],
            event_flags: {},
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: {
                pocket: {
                    organizational_penetration: {
                        sda_penetration: 85,
                        sds_penetration: 85,
                        hdz_penetration: 85,
                        patriotska_liga: owner === 'RBiH' ? 90 : 5,
                        paramilitary_rs: owner === 'RS' ? 90 : 5,
                        paramilitary_hrhb: owner === 'HRHB' ? 90 : 5,
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

/** The card fired and its answer applied: the policy flag is written only by an applied answer. */
function applyCard(state: GameState, faction: FactionId, answer: ParamilitaryPolicyOrder, turn = 4): void {
    const card = CARD[faction]!;
    state.military.fired_event_ids.push(card);
    state.military.event_fire_counts[card] = 1;
    state.military.event_last_fired_turn[card] = turn;
    state.military.event_decision_log.push({ event_id: card, response_id: answer, decision_source: 'player', faction, turn });
    state.military.event_flags[POLICY_FLAG[faction]!] = answer;
    state.paramilitary_policy = answer;
}

/** An answer filed ahead of the card's firing: the decision log only (§6 design T2). */
function fileCardAnswer(state: GameState, faction: FactionId, answer: ParamilitaryPolicyOrder): void {
    state.military.event_decision_log.push({ event_id: CARD[faction]!, response_id: answer, decision_source: 'player', faction, turn: 0 });
}

function pendingRequest(faction: FactionId, target = TARGET, decision?: 'allow' | 'deny') {
    return {
        target_osid: target,
        faction,
        strength: 150,
        estimated_civilian_risk: 40,
        mode: 'rear_pocket' as const,
        ...(decision ? { decision } : {}),
    };
}

function ownRequests(state: GameState, faction: FactionId) {
    return (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === faction);
}

function spawnedFor(report: { spawned: Array<{ faction: FactionId }> }, faction: FactionId) {
    return report.spawned.filter((spawn) => spawn.faction === faction);
}

function review(state: GameState, decisions: Array<[string, 'allow' | 'deny']>, policy?: ParamilitaryPolicyOrder) {
    return resolveParamilitaryReviewRequests(state, {
        decisions: decisions.map(([target_osid, decision]) => ({ target_osid, decision })),
        ...(policy ? { policy } : {}),
    });
}

/** A refused packet: the state is byte-for-byte what it was, and the result carries the cannot-loosen code. */
function expectRefusedUnchanged(state: GameState, run: () => ReturnType<typeof review>, label: string): void {
    const before = JSON.stringify(state);
    const result = run();
    expect(result, label).toEqual({ ok: false, error: CANNOT_LOOSEN });
    expect(JSON.stringify(state), label).toBe(before);
}

// ─── Real-lane fixtures: the card answered Review in person and applied by the product resolver ───

function answer(state: GameState, eventId: string, responseId: string): GameState {
    return resolveDesktopEventDecision(state, eventId, responseId, process.cwd());
}

/** Evaluate-events on the named cards only, turn by turn (the pressure/readiness path the engine runs). */
function runCards(state: GameState, eventIds: string[], fromTurn: number, toTurn: number): void {
    const defs = eventIds.map(eventDef);
    for (let turn = fromTurn; turn <= toTurn; turn += 1) {
        state.meta.turn = turn;
        updateEventReadiness(state, defs);
        evaluateEvents(state, () => 0.5, turn, defs);
    }
}

let rbihFiled: GameState;
let rbihReviewApplied: GameState;
let rsReviewApplied: GameState;

beforeAll(async () => {
    // RBiH: identity and the policy card answered at birth, in person ("Review each deployment" = ask);
    // both filed; evaluate-events applies identity at t3 and the policy answer at t4 (design T).
    rbihFiled = answer(answer(await newCampaign('RBiH'), IDENTITY, 'civic'), RBIH_POLICY, 'ask');
    rbihReviewApplied = cloneState(rbihFiled);
    runCards(rbihReviewApplied, [IDENTITY, RBIH_POLICY], 1, 4);
    rbihReviewApplied.meta.autonomy_level = 0;

    // RS: goals filed at birth and applied at t1; the RS card fires at t2 and is answered then, in person,
    // with its Review-equivalent option ("Ask per deployment" = ask), applied at once.
    const rsFiled = answer(await newCampaign('RS'), RS_GOALS, 'all_six');
    runCards(rsFiled, [RS_GOALS, RS_POLICY], 1, 2);
    expect((rsFiled.military.pending_event_decisions ?? []).map((decision) => decision.event_id)).toContain(RS_POLICY);
    rsReviewApplied = answer(rsFiled, RS_POLICY, 'ask');
    rsReviewApplied.meta.autonomy_level = 0;
}, 300_000);

// ─── The accessor ───

describe('M-a: the one cap accessor (the APPLIED card answer; ask before it applies)', () => {
    it('M-a4 paramilitary_clamp_fails_closed_without_flag: the cap is ask until the card has applied a valid answer', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const unanswered = pocketState(faction);
            expect(paramilitaryStandingOrderCap(unanswered, faction), `${faction} unanswered`).toBe('ask');

            const filed = pocketState(faction);
            fileCardAnswer(filed, faction, 'always_allow');
            expect(appliedParamilitaryPolicyCardAnswer(filed, faction), `${faction} filed`).toBeNull();
            expect(paramilitaryStandingOrderCap(filed, faction), `${faction} filed`).toBe('ask');

            const noFlag = pocketState(faction);
            applyCard(noFlag, faction, 'always_allow');
            delete noFlag.military.event_flags[POLICY_FLAG[faction]!];
            expect(paramilitaryStandingOrderCap(noFlag, faction), `${faction} flag missing`).toBe('ask');

            const forged = pocketState(faction);
            applyCard(forged, faction, 'always_allow');
            forged.military.event_flags[POLICY_FLAG[faction]!] = 'forged';
            expect(paramilitaryStandingOrderCap(forged, faction), `${faction} flag invalid`).toBe('ask');

            for (const order of ORDERS) {
                const applied = pocketState(faction);
                applyCard(applied, faction, order);
                expect(paramilitaryStandingOrderCap(applied, faction), `${faction} applied ${order}`).toBe(order);
            }
        }
    });

    it('HRHB (no card), no faction, and a non-faction key are uncapped', () => {
        const hrhb = pocketState('HRHB');
        hrhb.paramilitary_policy = 'always_allow';
        expect(paramilitaryStandingOrderCap(hrhb, 'HRHB')).toBeNull();
        expect(readParamilitaryStandingOrder(hrhb, 'HRHB')).toBe('always_allow');
        expect(paramilitaryStandingOrderCap(hrhb, null)).toBeNull();
        expect(paramilitaryStandingOrderCap(hrhb, 'constructor')).toBeNull();
    });

    it('ranks always_deny < ask < always_allow; the rank check allows only orders at or below the cap', () => {
        for (const cap of ORDERS) {
            for (const order of ORDERS) {
                const expected = ORDERS.indexOf(order) <= ORDERS.indexOf(cap);
                expect(isParamilitaryOrderWithinCap(order, cap), `${order} under ${cap}`).toBe(expected);
            }
        }
        for (const order of ORDERS) expect(isParamilitaryOrderWithinCap(order, null), `${order} uncapped`).toBe(true);
    });

    it('the reader clamps to the cap and is the identity under it; a missing order reads ask', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            for (const cardAnswer of ORDERS) {
                for (const recorded of ORDERS) {
                    const state = pocketState(faction);
                    applyCard(state, faction, cardAnswer);
                    state.paramilitary_policy = recorded;
                    const expected = ORDERS.indexOf(recorded) <= ORDERS.indexOf(cardAnswer) ? recorded : cardAnswer;
                    expect(readParamilitaryStandingOrder(state, faction), `${faction} card ${cardAnswer} order ${recorded}`).toBe(expected);
                }
            }
            const missing = pocketState(faction);
            applyCard(missing, faction, 'always_allow');
            delete missing.paramilitary_policy;
            expect(readParamilitaryStandingOrder(missing, faction)).toBe('ask');
        }
    });

    it('headless (no player faction): the reader is the identity', () => {
        for (const recorded of ORDERS) {
            const state = pocketState(null);
            state.paramilitary_policy = recorded;
            expect(paramilitaryStandingOrderCap(state, state.meta.player_faction)).toBeNull();
            expect(readParamilitaryStandingOrder(state, state.meta.player_faction)).toBe(recorded);
        }
    });

    it('exports the one cannot-loosen code', () => {
        expect(PARAMILITARY_POLICY_CANNOT_LOOSEN).toBe(CANNOT_LOOSEN);
    });
});

// ─── M-a1: the IPC handler, called directly ───

describe('M-a1 review_modal_ipc_refuses_raise_above_applied_answer', () => {
    it('RBiH route: the card answered Review in person (applied), then Always allow through the IPC: refused, nothing written', () => {
        const state = cloneState(rbihReviewApplied);
        expect(appliedParamilitaryPolicyCardAnswer(state, 'RBiH')).toBe('ask');
        expect(state.paramilitary_policy).toBe('ask');
        expect((state.military.event_decision_log ?? []).filter((row) => row.event_id === RBIH_POLICY)
            .map((row) => [row.response_id, row.decision_source])).toEqual([['ask', 'player']]);
        state.pending_paramilitary_requests = [pendingRequest('RBiH', 'op:rbih:request_a'), pendingRequest('RBiH', 'op:rbih:request_b')];
        const before = serializeState(state);

        const result = review(state, [['op:rbih:request_a', 'allow'], ['op:rbih:request_b', 'deny']], 'always_allow');

        expect(result).toEqual({ ok: false, error: CANNOT_LOOSEN });
        expect(serializeState(state)).toBe(before);
        expect(state.paramilitary_policy).toBe('ask');
        expect(readParamilitaryStandingOrder(state, 'RBiH')).toBe('ask');
        // The whole packet is rejected: not even the per-request decisions are recorded.
        expect(ownRequests(state, 'RBiH').map((request) => request.decision)).toEqual([undefined, undefined]);
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
    });

    it('RS route: the card answered "Ask per deployment" in person (applied), then Always allow through the IPC: refused, nothing written', () => {
        const state = cloneState(rsReviewApplied);
        expect(appliedParamilitaryPolicyCardAnswer(state, 'RS')).toBe('ask');
        expect(state.paramilitary_policy).toBe('ask');
        state.pending_paramilitary_requests = [pendingRequest('RS', 'op:rs:request_a')];
        const before = serializeState(state);

        const result = review(state, [['op:rs:request_a', 'allow']], 'always_allow');

        expect(result).toEqual({ ok: false, error: CANNOT_LOOSEN });
        expect(serializeState(state)).toBe(before);
        expect(state.paramilitary_policy).toBe('ask');
        expect(state.paramilitary_decision_history ?? []).toEqual([]);
    });

    it('a filed but unapplied Always allow caps at ask (RBiH at t0, before the card fires)', () => {
        const state = cloneState(rbihFiled);
        state.meta.autonomy_level = 0;
        expect(appliedParamilitaryPolicyCardAnswer(state, 'RBiH')).toBeNull();
        expect(paramilitaryStandingOrderCap(state, 'RBiH')).toBe('ask');
        state.pending_paramilitary_requests = [pendingRequest('RBiH', 'op:legacy:request')];
        expectRefusedUnchanged(state, () => review(state, [['op:legacy:request', 'deny']], 'always_allow'), 'filed, unapplied');
    });

    it('after an applied Refuse: setting ask is refused, and so is a per-request Allow (with or without a standing order)', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const base = pocketState(faction);
            applyCard(base, faction, 'always_deny');
            base.pending_paramilitary_requests = [pendingRequest(faction), pendingRequest(faction, STALE)];
            const cases: Array<[string, Array<[string, 'allow' | 'deny']>, ParamilitaryPolicyOrder | undefined]> = [
                ['ask over Refuse', [[TARGET, 'deny'], [STALE, 'deny']], 'ask'],
                ['Always allow over Refuse', [[TARGET, 'deny'], [STALE, 'deny']], 'always_allow'],
                ['per-request Allow under Refuse', [[TARGET, 'allow'], [STALE, 'deny']], undefined],
                ['per-request Allow with Always deny', [[TARGET, 'allow'], [STALE, 'deny']], 'always_deny'],
            ];
            for (const [label, decisions, policy] of cases) {
                const state = cloneState(base);
                expectRefusedUnchanged(state, () => review(state, decisions, policy), `${faction}: ${label}`);
            }
            // Keeping the Refuse, or denying in person, is accepted.
            const kept = cloneState(base);
            expect(review(kept, [[TARGET, 'deny'], [STALE, 'deny']], 'always_deny').ok, faction).toBe(true);
            expect(kept.paramilitary_policy).toBe('always_deny');
            expect(kept.paramilitary_decision_history?.map((row) => row.decision)).toEqual(['deny', 'deny']);
        }
    });

    it('under an applied Review: Always allow is refused; keeping ask, tightening, and allowing one request in person are accepted', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const base = pocketState(faction);
            applyCard(base, faction, 'ask');
            base.pending_paramilitary_requests = [pendingRequest(faction)];

            const raised = cloneState(base);
            expectRefusedUnchanged(raised, () => review(raised, [[TARGET, 'allow']], 'always_allow'), `${faction}: Always allow over Review`);

            const kept = cloneState(base);
            expect(review(kept, [[TARGET, 'deny']], 'ask').ok, `${faction} keep`).toBe(true);
            expect(kept.paramilitary_policy).toBe('ask');

            const tightened = cloneState(base);
            expect(review(tightened, [[TARGET, 'deny']], 'always_deny').ok, `${faction} tighten`).toBe(true);
            expect(tightened.paramilitary_policy).toBe('always_deny');

            // R3: an act decided in person stays reachable at its own per-act charges.
            const inPerson = cloneState(base);
            const result = review(inPerson, [[TARGET, 'allow']]);
            expect(result.ok, `${faction} in person`).toBe(true);
            expect(inPerson.paramilitary_policy).toBe('ask');
            expect(inPerson.paramilitary_decision_history?.map((row) => row.decision)).toEqual(['allow']);
        }
    });

    it('re-raising is allowed when the card itself answered Always allow', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const state = pocketState(faction);
            applyCard(state, faction, 'always_allow');
            state.paramilitary_policy = 'always_deny'; // tightened earlier with the modal
            state.pending_paramilitary_requests = [pendingRequest(faction)];
            const result = review(state, [[TARGET, 'allow']], 'always_allow');
            expect(result.ok, faction).toBe(true);
            expect(state.paramilitary_policy).toBe('always_allow');
        }
    });

    it('before the card applies, the cap is ask: Always allow is refused even where the request gate does not hold', () => {
        // A staff-controlled player (autonomy 1) is never held by the T3 gate, so only the cap refuses here.
        for (const faction of ['RBiH', 'RS'] as const) {
            const state = pocketState(faction, 6, 1);
            state.pending_paramilitary_requests = [pendingRequest(faction)];
            expectRefusedUnchanged(state, () => review(state, [[TARGET, 'deny']], 'always_allow'), `${faction} a1 unapplied`);
            const kept = cloneState(state);
            expect(review(kept, [[TARGET, 'deny']], 'ask').ok, `${faction} keep ask`).toBe(true);
        }
    });

    it('HRHB has no card and is not capped: Always allow is accepted as before', () => {
        const state = pocketState('HRHB');
        state.paramilitary_policy = 'ask';
        state.pending_paramilitary_requests = [pendingRequest('HRHB')];
        const result = review(state, [[TARGET, 'allow']], 'always_allow');
        expect(result.ok).toBe(true);
        expect(state.paramilitary_policy).toBe('always_allow');
    });
});

// ─── M-a2: every reader reads the clamped order (old saves) ───

describe('M-a2 paramilitary_order_clamp_legacy_save: an old save whose modal order is above its card answer reads clamped', () => {
    it('a save carried across the update (card Review applied, modal Always allow) round-trips and reads ask everywhere', () => {
        const legacy = cloneState(rbihReviewApplied);
        legacy.paramilitary_policy = 'always_allow'; // written by the pre-fix modal
        const loaded = deserializeState(serializeState(legacy));
        expect(loaded.paramilitary_policy).toBe('always_allow'); // the save keeps its bytes; readers clamp
        expect(readParamilitaryStandingOrder(loaded, 'RBiH')).toBe('ask');
        const view = parseGameState(JSON.parse(serializeState(loaded)));
        expect(view.paramilitaryPolicy).toBe('ask');
        expect(view.paramilitaryPolicyCap).toBe('ask');
    });

    it('rear-pocket detection (Full Control): Review clamps a modal Always allow to requests, Refuse clamps it to nothing', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const underReview = pocketState(faction);
            applyCard(underReview, faction, 'ask');
            underReview.paramilitary_policy = 'always_allow';
            const reviewReport = detectParamilitaryTargets(underReview, edges(), reverseMap(), undefined);
            expect(spawnedFor(reviewReport, faction), `${faction} review`).toHaveLength(0);
            expect(ownRequests(underReview, faction).map((request) => request.target_osid), `${faction} review`).toEqual([TARGET]);

            const refuse = pocketState(faction);
            applyCard(refuse, faction, 'always_deny');
            refuse.paramilitary_policy = 'always_allow';
            const refuseReport = detectParamilitaryTargets(refuse, edges(), reverseMap(), undefined);
            expect(spawnedFor(refuseReport, faction), `${faction} refuse`).toHaveLength(0);
            expect(ownRequests(refuse, faction), `${faction} refuse`).toHaveLength(0);
        }
    });

    it('the standing-order resolver of pending requests does not auto-approve under a clamped order', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const state = pocketState(faction);
            applyCard(state, faction, 'ask');
            state.paramilitary_policy = 'always_allow';
            state.pending_paramilitary_requests = [pendingRequest(faction, STALE)];
            detectParamilitaryTargets(state, edges(), reverseMap(), undefined);
            const stale = ownRequests(state, faction).find((request) => request.target_osid === STALE);
            expect(stale, faction).toBeDefined();
            expect(stale!.decision, faction).toBeUndefined();
            expect(state.paramilitary_decision_history ?? [], faction).toEqual([]);
        }
    });

    // M pinned a third reader here, `detectOffensiveParamilitaryTargets`. §6 D1 stage 2 (§3, signed unanimously)
    // retired that detector (no production caller; tests/paramilitary_spawn_guard.test.ts), so the reader is gone.

    it('the Codex reads the order in force: an applied Refuse under a modal Always allow is a refusal', () => {
        const state = {
            paramilitary_policy: 'always_allow',
            meta: { turn: 120, phase: 'war', player_faction: 'RBiH' },
            factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
            military: {
                event_flags: { rbih_paramilitary_policy: 'always_deny' },
                event_fire_counts: { [RBIH_POLICY]: 1 },
                fired_event_ids: [RBIH_POLICY],
                event_decision_log: [{ event_id: RBIH_POLICY, response_id: 'always_deny', decision_source: 'player', faction: 'RBiH', turn: 4 }],
                event_last_fired_turn: { [RBIH_POLICY]: 4 },
                event_causality_log: [],
                negotiation: {
                    capital: {
                        RBiH: {
                            war_crimes_events_emergent: 0, war_crimes_events: 0, territory_controlled_pct: 0, territory_controlled_km2: 0,
                            civilians_under_protection: 0, refugees_created: 0, refugees_received: 0, military_casualties_inflicted: 0,
                            military_casualties_taken: 0, civilian_casualties_caused: 0, enclaves_held: [], enclaves_lost: [],
                            peace_plans_accepted: [], peace_plans_rejected: [], operations_launched: 0, operations_successful: 0,
                        },
                    },
                    patron_relationships: {},
                    peace_plan_history: [],
                },
            },
            political: {},
        } as unknown as GameState;
        const ghost = buildGhostEntries(state, 120).find((entry) => entry.ghost_id === 'cleansing_refused');
        expect(ghost).toBeDefined();
        expect(JSON.stringify(ghost!.claim_predicate)).toContain('"observed_value":"always_deny"');
    });

    it('the player-visible projection carries the player\'s own applied card flag (never the other side\'s), so the renderer reads the same cap', () => {
        expect(OWN_PARAMILITARY_POLICY_FLAG_BY_FACTION).toEqual(Object.fromEntries(
            Object.entries(PARAMILITARY_POLICY_CARD_BY_FACTION).map(([faction, card]) => [faction, card!.flag]),
        ));
        const full = cloneState(rbihReviewApplied);
        full.paramilitary_policy = 'always_allow';
        full.military.event_flags.rs_paramilitary_policy = 'always_allow';
        const projected = projectPlayerVisibleState(JSON.parse(serializeState(full)));
        expect(projected.military.event_flags.rbih_paramilitary_policy).toBe('ask');
        expect(projected.military.event_flags.rs_paramilitary_policy).toBeUndefined();
        expect(paramilitaryStandingOrderCap(projected, 'RBiH')).toBe(paramilitaryStandingOrderCap(full, 'RBiH'));
        const view = parseGameState(projected);
        expect(view.paramilitaryPolicy).toBe('ask');
        expect(view.paramilitaryPolicyCap).toBe('ask');
    });

    it('the renderer view: RS before its card applies caps at ask; HRHB is uncapped', () => {
        const rs = pocketState('RS');
        rs.paramilitary_policy = 'always_allow';
        const rsView = parseGameState(rs);
        expect(rsView.paramilitaryPolicy).toBe('ask');
        expect(rsView.paramilitaryPolicyCap).toBe('ask');

        const hrhb = pocketState('HRHB');
        hrhb.paramilitary_policy = 'always_allow';
        const hrhbView = parseGameState(hrhb);
        expect(hrhbView.paramilitaryPolicy).toBe('always_allow');
        expect(hrhbView.paramilitaryPolicyCap).toBeNull();
    });
});

// (Copy-row 6 condition, the T3 gate on the offensive path at Assisted/Delegated, is pinned by T in
// tests/s6_opening_timing_manual_gate.test.ts.)

// ─── M-a3: no reader bypasses the accessor ───

/**
 * Every line in src/ that reads `paramilitary_policy` as a property (`.paramilitary_policy` or
 * `['paramilitary_policy']`), comments stripped, with the reason it may. A reader of the player's standing
 * order must call `readParamilitaryStandingOrder` instead. New lines, and stale entries, both fail.
 */
const RAW_PARAMILITARY_POLICY_LINES: Record<string, Array<[line: string, why: string]>> = {
    'src/sim/events/paramilitary_policy_card.ts': [
        ['const recorded = state.paramilitary_policy;', 'the accessor itself'],
    ],
    'src/sim/events/evaluate_events.ts': [
        ['state.paramilitary_policy = policy;', 'writer: the applied card answer mirrored into the standing order'],
    ],
    'src/desktop/paramilitary_review_ipc.ts': [
        ['if (policy) state.paramilitary_policy = policy;', 'writer: the review modal, after the cap check'],
    ],
    'src/sim/events/opening_policy_transition.ts': [
        ['const orderBefore = candidate.paramilitary_policy;', 'writer check: the opening lane wrote no order'],
        ["|| candidate.paramilitary_policy !== 'ask') {", 'writer check: the opening lane wrote no order'],
        ['|| (candidate.military.enabled_event_ids ?? []).includes(POLICY) || candidate.paramilitary_policy !== orderBefore) {', 'writer check: the opening lane wrote no order'],
        ['|| candidate.paramilitary_policy !== orderBefore', 'writer check: the opening lane wrote no order'],
    ],
    'src/state/save_migration.ts': [
        ["s.paramilitary_policy !== 'ask' &&", 'serialization: load-time normalization of an invalid value'],
        ["s.paramilitary_policy !== 'always_allow' &&", 'serialization: load-time normalization of an invalid value'],
        ["s.paramilitary_policy !== 'always_deny'", 'serialization: load-time normalization of an invalid value'],
        ["s.paramilitary_policy = 'ask';", 'serialization: load-time normalization of an invalid value'],
    ],
    'src/desktop/player_visible_state.cjs': [
        ["if (state.paramilitary_policy === 'always_allow' || state.paramilitary_policy === 'always_deny' || state.paramilitary_policy === 'ask') {", 'serialization: the player-visible projection copies the field; its one renderer reader (GameStateAdapter) clamps'],
        ['projected.paramilitary_policy = state.paramilitary_policy;', 'serialization: the player-visible projection copies the field; its one renderer reader (GameStateAdapter) clamps'],
    ],
    'src/sim/codex/dynamic_section_builder.ts': [
        ["paramilitary_policy?: GameState['paramilitary_policy'];", 'type position'],
        ["expected: Exclude<GameState['paramilitary_policy'], undefined>,", 'type position'],
        ["owner_path: 'state.paramilitary_policy',", 'claim label (the value is read through the accessor)'],
        ['expression: `state.paramilitary_policy=${expected}`,', 'claim label (the value is read through the accessor)'],
    ],
};

function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) sourceFiles(path, out);
        else if (/\.(ts|tsx|cjs|js|mjs)$/.test(entry.name)) out.push(path);
    }
    return out;
}

describe('M-a3 paramilitary_policy_raw_reader_allowlist', () => {
    it('every raw read of paramilitary_policy in src/ is the accessor, a writer, serialization, or a label', () => {
        const root = process.cwd();
        const found: Record<string, string[]> = {};
        for (const file of sourceFiles(join(root, 'src')).sort()) {
            const rel = relative(root, file).split(sep).join('/');
            const lines = withoutComments(readFileSync(file, 'utf8')).split('\n');
            for (const line of lines) {
                if (/(?:\.|\[\s*['"`])paramilitary_policy\b/.test(line)) (found[rel] ??= []).push(line.trim());
            }
        }
        const allowed = Object.fromEntries(Object.entries(RAW_PARAMILITARY_POLICY_LINES)
            .map(([file, rows]) => [file, rows.map(([line]) => line)]));
        expect(found).toEqual(allowed);
    });
});
