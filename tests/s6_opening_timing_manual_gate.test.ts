/**
 * §6 design T3 (signed 2026-11-19, round 2 R2-1): the manual paramilitary request gate.
 *
 * A manual (Full Control) RBiH or RS player gets no paramilitary request, and no stale request is
 * approved or replayed, until that player's own registered policy card has APPLIED an answer:
 * fired, with a receipt on record, and a valid policy flag. A filed answer is not an applied one.
 * There is no turn test: a card that never applies holds the player until the sweeps fade.
 * HRHB has no card and is never held; staff-controlled players and headless runs are never held.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    detectParamilitaryTargets,
    isPlayerParamilitaryRequestGateHolding,
} from '../src/sim/combat/paramilitary_sweep.js';
import {
    PARAMILITARY_POLICY_CARD_BY_FACTION,
    appliedParamilitaryPolicyCardAnswer,
    hasParamilitaryPolicyCardApplied,
} from '../src/sim/events/paramilitary_policy_card.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { PARAMILITARY_FADE_WEEK } from '../src/state/formation_constants.js';
import { EVENT_CATALOG, RBIH_POLICY, RS_POLICY } from './helpers/s6_opening_lane_fixtures.js';

const HUBS = ['op:pocket:hub_a', 'op:pocket:hub_b', 'op:pocket:hub_c'];
const TARGET = 'op:pocket:target';
const ENEMY: Record<string, FactionId> = { RBiH: 'RS', RS: 'RBiH', HRHB: 'RS' };
const POLICY_FLAG: Record<string, string> = { RBiH: 'rbih_paramilitary_policy', RS: 'rs_paramilitary_policy' };
const CARD: Record<string, string> = { RBiH: RBIH_POLICY, RS: RS_POLICY };

function edges(): EdgeRecord[] {
    const pairs: Array<[string, string]> = [[HUBS[0]!, HUBS[1]!], [HUBS[0]!, HUBS[2]!]];
    for (const hub of HUBS) pairs.push([hub, TARGET]);
    return pairs.map(([a, b]) => ({ a, b }) as EdgeRecord);
}

function reverseMap(): OperationalToCanonicalReverseMap {
    return new Map([...HUBS, TARGET].map((osid) => [osid, [osid]]));
}

/** One rear pocket of the enemy inside the player's ground, with the player's paramilitary capacity. */
function pocketState(player: FactionId | null, turn: number, autonomy = 0): GameState {
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

function fileAnswer(state: GameState, faction: FactionId, response: string, turn = 0, source: 'player' | 'bot_ai_default' = 'player'): void {
    state.military.event_decision_log.push({ event_id: CARD[faction]!, response_id: response, decision_source: source, faction, turn });
}

function fireCard(state: GameState, faction: FactionId, turn: number): void {
    const card = CARD[faction]!;
    state.military.fired_event_ids.push(card);
    state.military.event_fire_counts[card] = 1;
    state.military.event_last_fired_turn[card] = turn;
}

/** The card fired and its answer applied (the only writer of the policy flag is the applied answer). */
function applyCard(state: GameState, faction: FactionId, response: string, turn: number, receiptTurn = turn): void {
    fireCard(state, faction, turn);
    fileAnswer(state, faction, response, receiptTurn);
    state.military.event_flags[POLICY_FLAG[faction]!] = response;
    state.paramilitary_policy = response as GameState['paramilitary_policy'];
}

function staleRequest(faction: FactionId, decision?: 'allow' | 'deny') {
    return {
        target_osid: 'op:stale:target',
        faction,
        strength: 150,
        mode: 'rear_pocket' as const,
        ...(decision ? { decision } : {}),
    };
}

function detect(state: GameState) {
    return detectParamilitaryTargets(state, edges(), reverseMap());
}

function ownRequests(state: GameState, faction: FactionId) {
    return (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === faction);
}

describe('T3 manual paramilitary gate (released only by the applied card answer)', () => {
    it('fixture check: a released manual player gets the pocket as a request', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const state = pocketState(faction, 5);
            applyCard(state, faction, 'ask', 4);
            const report = detect(state);
            expect(report.pending_player_requests, faction).toBe(1);
            expect(ownRequests(state, faction).map((request) => request.target_osid)).toEqual([TARGET]);
        }
    });

    it('manual_gate_rbih_holds_until_card_applied', () => {
        // Filed Refuse at t0 (the opening lane), the card enabled at t3 by the identity answer, fired at t4.
        const state = pocketState('RBiH', 1);
        fileAnswer(state, 'RBiH', 'always_deny', 0);
        state.pending_paramilitary_requests = [staleRequest('RBiH')];
        for (const turn of [1, 2, 3]) {
            state.meta.turn = turn;
            if (turn === 3) state.military.enabled_event_ids.push(RBIH_POLICY);
            const report = detect(state);
            expect(report.pending_player_requests, `t${turn}`).toBe(0);
            expect(report.spawned.filter((spawn) => spawn.faction === 'RBiH'), `t${turn}`).toHaveLength(0);
            expect(ownRequests(state, 'RBiH'), `t${turn}`).toHaveLength(0);
            expect(state.paramilitary_decision_history ?? [], `t${turn}`).toHaveLength(0);
            expect(isPlayerParamilitaryRequestGateHolding(state), `t${turn}`).toBe(true);
        }
        // t4: evaluate-events fired the card and applied the filed answer before detect ran.
        state.meta.turn = 4;
        fireCard(state, 'RBiH', 4);
        state.military.event_flags.rbih_paramilitary_policy = 'ask';
        state.paramilitary_policy = 'ask';
        expect(isPlayerParamilitaryRequestGateHolding(state)).toBe(false);
        expect(detect(state).pending_player_requests).toBe(1);
    });

    it('manual_gate_rs_holds_before_card_enabled', () => {
        // The goals card is left pending, so the RS card is never enabled: the old gate let t1 requests through.
        const state = pocketState('RS', 1);
        expect(state.military.enabled_event_ids).not.toContain(RS_POLICY);
        const report = detect(state);
        expect(report.pending_player_requests).toBe(0);
        expect(ownRequests(state, 'RS')).toHaveLength(0);
        expect(isPlayerParamilitaryRequestGateHolding(state)).toBe(true);
    });

    it('manual_gate_filed_receipt_does_not_release', () => {
        for (const faction of ['RBiH', 'RS'] as const) {
            const state = pocketState(faction, 3);
            state.military.enabled_event_ids.push(CARD[faction]!);
            fileAnswer(state, faction, 'always_allow', 0);
            const report = detect(state);
            expect(report.pending_player_requests, faction).toBe(0);
            expect(report.spawned.filter((spawn) => spawn.faction === faction), faction).toHaveLength(0);
            expect(hasParamilitaryPolicyCardApplied(state, faction), faction).toBe(false);
            expect(appliedParamilitaryPolicyCardAnswer(state, faction), faction).toBeNull();
        }
    });

    it('manual_gate_fired_pending_card_holds_past_window', () => {
        // The RS card fired at t2 and was left pending (no receipt). Past its turn_max (8) the gate must
        // still hold: releasing would let the player approve acts and then answer Refuse for credit.
        const turnMax = EVENT_CATALOG.find((def) => def.id === RS_POLICY)!.trigger.turn_max!;
        for (const enabledRecorded of [true, false]) {
            const state = pocketState('RS', turnMax + 2);
            fireCard(state, 'RS', 2);
            if (enabledRecorded) state.military.enabled_event_ids.push(RS_POLICY);
            state.pending_paramilitary_requests = [staleRequest('RS', 'allow')];
            const report = detect(state);
            expect(report.pending_player_requests, `enabled=${enabledRecorded}`).toBe(0);
            expect(report.spawned.filter((spawn) => spawn.faction === 'RS'), `enabled=${enabledRecorded}`).toHaveLength(0);
            expect(ownRequests(state, 'RS'), `enabled=${enabledRecorded}`).toHaveLength(0);
            expect(state.paramilitary_decision_history ?? [], `enabled=${enabledRecorded}`).toHaveLength(0);
        }
    });

    it('manual_gate_unapplied_card_never_releases', () => {
        // The card never applies (its enabling card left unanswered, or it lapsed). No exit by window or
        // closure: the player stays held through the fade week, and nothing is made after it.
        for (const faction of ['RBiH', 'RS'] as const) {
            for (const closed of [false, true]) {
                const state = pocketState(faction, 1);
                if (closed) (state.military.closed_event_ids ??= []).push(CARD[faction]!);
                for (let turn = 1; turn <= PARAMILITARY_FADE_WEEK + 2; turn += 1) {
                    state.meta.turn = turn;
                    state.pending_paramilitary_requests = [staleRequest(faction)];
                    const report = detect(state);
                    expect(report.pending_player_requests, `${faction} closed=${closed} t${turn}`).toBe(0);
                    expect(report.spawned.filter((spawn) => spawn.faction === faction)).toHaveLength(0);
                    expect(ownRequests(state, faction), `${faction} closed=${closed} t${turn}`).toHaveLength(0);
                    expect(state.paramilitary_decision_history ?? []).toHaveLength(0);
                }
            }
        }
    });

    it('legacy_identity_lane_save_holds_rbih_requests', () => {
        // A legacy save (no birth card; the identity is answered in its t2-5 window) loaded at t1 with
        // RBiH requests an older build made before the card was enabled, one of them already approved.
        const state = pocketState('RBiH', 1);
        state.pending_paramilitary_requests = [staleRequest('RBiH'), { ...staleRequest('RBiH', 'allow'), target_osid: 'op:stale:approved' }];
        expect(isPlayerParamilitaryRequestGateHolding(state)).toBe(true);
        const report = detect(state);
        expect(report.pending_player_requests).toBe(0);
        expect(report.spawned.filter((spawn) => spawn.faction === 'RBiH')).toHaveLength(0);
        expect(ownRequests(state, 'RBiH')).toHaveLength(0);
        expect(state.paramilitary_decision_history ?? []).toHaveLength(0);
    });

    it('a skipped card keeps the hold, and the held requests are deleted, never replayed', () => {
        // RS card fired at t2 and skipped in the pause; answered (and applied) only at t5.
        const state = pocketState('RS', 2);
        fireCard(state, 'RS', 2);
        state.military.enabled_event_ids.push(RS_POLICY);
        for (const turn of [2, 3, 4]) {
            state.meta.turn = turn;
            state.pending_paramilitary_requests = [
                { ...staleRequest('RS', 'allow'), target_osid: `op:held:t${turn}` },
            ];
            expect(detect(state).pending_player_requests, `t${turn}`).toBe(0);
            expect(ownRequests(state, 'RS'), `t${turn}`).toHaveLength(0);
        }
        // Answered Always allow at t5: the standing order now spawns on fresh detection only.
        state.meta.turn = 5;
        fileAnswer(state, 'RS', 'always_allow', 5);
        state.military.event_flags.rs_paramilitary_policy = 'always_allow';
        state.paramilitary_policy = 'always_allow';
        const report = detect(state);
        expect(report.spawned.filter((spawn) => spawn.faction === 'RS').map((spawn) => spawn.target_osid)).toEqual([TARGET]);
        const replayed = [...(state.paramilitary_decision_history ?? []).map((row) => row.target_osid),
            ...Object.values(state.military.formations ?? {}).map((formation) => formation.paramilitary_target)];
        expect(replayed.filter((target) => typeof target === 'string' && target.startsWith('op:held:'))).toEqual([]);
    });

    it('releases on an applied answer from any source (Observer included)', () => {
        const state = pocketState('RBiH', 5);
        fireCard(state, 'RBiH', 4);
        fileAnswer(state, 'RBiH', 'ask', 4, 'bot_ai_default');
        state.military.event_flags.rbih_paramilitary_policy = 'ask';
        expect(hasParamilitaryPolicyCardApplied(state, 'RBiH')).toBe(true);
        expect(detect(state).pending_player_requests).toBe(1);
    });

    it('a fired card with a receipt but no valid policy flag does not release', () => {
        const state = pocketState('RBiH', 5);
        fireCard(state, 'RBiH', 4);
        fileAnswer(state, 'RBiH', 'ask', 0);
        state.military.event_flags.rbih_paramilitary_policy = 'forged';
        expect(appliedParamilitaryPolicyCardAnswer(state, 'RBiH')).toBeNull();
        expect(detect(state).pending_player_requests).toBe(0);
    });

    it('never holds HRHB, a staff-controlled player, or a headless run', () => {
        const hrhb = pocketState('HRHB', 3);
        expect(isPlayerParamilitaryRequestGateHolding(hrhb)).toBe(false);
        expect(detect(hrhb).pending_player_requests).toBe(1);

        for (const autonomy of [1, 2, 3]) {
            for (const faction of ['RBiH', 'RS'] as const) {
                const staff = pocketState(faction, 3, autonomy);
                expect(isPlayerParamilitaryRequestGateHolding(staff), `${faction} a${autonomy}`).toBe(false);
                const report = detect(staff);
                expect(report.pending_player_requests, `${faction} a${autonomy}`).toBe(0);
                expect(report.spawned.filter((spawn) => spawn.faction === faction).map((spawn) => spawn.target_osid), `${faction} a${autonomy}`)
                    .toEqual([TARGET]);
            }
        }

        const headless = pocketState(null, 3);
        expect(isPlayerParamilitaryRequestGateHolding(headless)).toBe(false);
        expect(detect(headless).spawned.filter((spawn) => spawn.faction === 'RS').map((spawn) => spawn.target_osid)).toEqual([TARGET]);
    });

    it('registers exactly the RBiH and RS cards, each pinned to the catalog flag its every option sets', () => {
        expect(Object.keys(PARAMILITARY_POLICY_CARD_BY_FACTION).sort()).toEqual(['RBiH', 'RS']);
        for (const [faction, entry] of Object.entries(PARAMILITARY_POLICY_CARD_BY_FACTION)) {
            const def = EVENT_CATALOG.find((row) => row.id === entry!.eventId);
            expect(def, faction).toBeTruthy();
            expect(def!.responding_faction).toBe(faction);
            const options = def!.response_options ?? [];
            expect(options.map((option) => option.id).sort()).toEqual(['always_allow', 'always_deny', 'ask']);
            for (const option of options) {
                expect(option.sets_flags?.[entry!.flag], `${faction}:${option.id}`).toBe(option.id);
            }
        }
    });

    it('D5: the paramilitary IPC refuses an approval while the gate holds, through the shared predicate', () => {
        const electronMain = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
        const start = electronMain.indexOf("ipcMain.handle('resolve-paramilitary-requests'");
        const handler = electronMain.slice(start, electronMain.indexOf('ipcMain.handle(', start + 10));
        expect(handler).toContain('sim.isPlayerParamilitaryRequestGateHolding(state)');
        expect(handler).toContain("error: 'paramilitary_policy_not_applied'");
        const desktopSim = readFileSync(resolve(process.cwd(), 'src/desktop/desktop_sim.ts'), 'utf8');
        expect(desktopSim).toMatch(/isPlayerParamilitaryRequestGateHolding/);
    });
});
