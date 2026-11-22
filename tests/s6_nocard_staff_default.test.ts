/**
 * §6 D1 stage 2, round 4s (R5 under the owner rule of 2026-11-22): a human side with NO paramilitary
 * policy card (HRHB) follows the bot's historical default at Assisted, Delegated and Observer until the
 * player has a paramilitary decision of their own for that side on record.
 *
 * Owner rule (verbatim): "If expulsions were historical choice, then why not do it. You are not doing it
 * for the human player - you are just doing it as bot playing the live game. Humans will have choice when
 * playing." Then: "This goes for any similar items you might have had."
 *
 * Signed HOW (six §6 seats, unanimous after round 2; s6_d1s2_r4s_*.md):
 * - H1: no registered card and no own record at all → the bot branch's result (never an `'HRHB'` literal,
 *   never a literal allow); an in-person standing order decides; requests filed under `ask` refuse at
 *   levels 1-3, even when every request was allowed.
 * - P1 (G1, fail closed): ANY own record ends the default, even one outranked by another side's newer
 *   decision; then the existing `humanStandingParamilitaryOrder` decides, unchanged.
 * - H2: RS and RBiH keep A1 exactly; the manual (autonomy 0) path is untouched; headless is untouched.
 * The RED proof runs on a fixture: hands-off HRHB has no rear-pocket candidate in t0-t20, so a live
 * harness comparison reads 0 = 0 (scenario-tester, operations, historian, game-designer).
 */

import { describe, expect, it } from 'vitest';

import type { FactionId, FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { detectParamilitaryTargets } from '../src/sim/combat/paramilitary_sweep.js';
import { resolveNonManualParamilitaryPolicy } from '../src/sim/combat/paramilitary_policy.js';
import { PARAMILITARY_POLICY_CARD_ID_BY_FACTION } from '../src/sim/events/paramilitary_policy_flag.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';

const CATALOG = loadEventDefinitions(0);
const LEVELS = [1, 2, 3] as const;
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

/** A war state at `turn` in which HRHB surrounds one undefended RS cell (the binding test's pocket). */
function hrhbPocket(meta: Partial<GameState['meta']>, turn = 5): GameState {
    const controllers: Record<string, FactionId> = { [TARGET]: 'RS' };
    for (const cell of RING) controllers[cell] = 'HRHB';
    return {
        meta: { turn, phase: 'war', schema_version: 1, seed: 'nocard-default-test', ...meta } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
        } as any,
        political: {
            political_controllers: controllers,
            municipalities: {
                testmun: {
                    organizational_penetration: {
                        patriotska_liga: 0, sda_penetration: 0, paramilitary_rs: 0, sds_penetration: 0,
                        paramilitary_hrhb: 70, hdz_penetration: 60,
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
        paramilitary_policy: 'ask', // migration v12 / opening default: not a decision
    } as GameState;
}

function human(level: 0 | 1 | 2 | 3): Partial<GameState['meta']> {
    return { player_faction: 'HRHB', autonomy_level: level, headless_scenario_auto_control: false };
}

function hrhbRecord(turn: number, decision: 'allow' | 'deny'): NonNullable<GameState['paramilitary_decision_history']>[number] {
    return { id: `paramilitary:${turn}:op:elsewhere:x`, turn, target_osid: 'op:elsewhere:x', faction: 'HRHB', strength: 150, decision };
}

function outcome(state: GameState, catalog: readonly EventDefinition[] | undefined = CATALOG): {
    spawns: Array<{ faction: string; target_osid: string; formation_id: string; strength: number | undefined }>;
    pending: number;
} {
    const { edges, reverseMap } = graph();
    const report = detectParamilitaryTargets(state, edges, reverseMap, catalog);
    const spawns = report.spawned
        .filter((spawn) => spawn.faction === 'HRHB')
        .map((spawn) => ({
            faction: spawn.faction,
            target_osid: spawn.target_osid,
            formation_id: spawn.formation_id,
            strength: (state.military.formations?.[spawn.formation_id] as { personnel?: number } | undefined)?.personnel,
        }));
    const pending = (state.pending_paramilitary_requests ?? []).filter((request) => request.faction === 'HRHB').length;
    return { spawns, pending };
}

describe('§6 D1 stage 2 round 4s: a no-card human side follows the historical default until its own decision', () => {
    it('the registry still has no HRHB card (the precondition of every row below)', () => {
        expect(PARAMILITARY_POLICY_CARD_ID_BY_FACTION.HRHB).toBeUndefined();
    });

    for (const level of LEVELS) {
        it(`T1/T2 HRHB human at autonomy ${level}, no record: the bot's sweep, equal to the headless-flag copy`, () => {
            const live = hrhbPocket(human(level));
            const headless = hrhbPocket({ ...human(level), headless_scenario_auto_control: true });
            expect(resolveNonManualParamilitaryPolicy(live, 'HRHB', CATALOG)).toBe('always_allow');
            expect(resolveNonManualParamilitaryPolicy(live, 'HRHB', CATALOG))
                .toBe(resolveNonManualParamilitaryPolicy(headless, 'HRHB', CATALOG));
            const a = outcome(live);
            const b = outcome(headless);
            expect(a.spawns.length).toBe(1);
            expect(a).toEqual(b);
        });

        it(`T2 HRHB human at autonomy ${level}: same sweep as headless at the fade week (t20), none after it (t21)`, () => {
            for (const turn of [20, 21]) {
                const a = outcome(hrhbPocket(human(level), turn));
                const b = outcome(hrhbPocket({ ...human(level), headless_scenario_auto_control: true }, turn));
                expect(a, `t${turn}`).toEqual(b);
                expect(a.spawns.length, `t${turn}`).toBe(turn === 20 ? 1 : 0);
            }
        });

        it(`the default goes through the bot code path at autonomy ${level}: the same with and without a catalog`, () => {
            const state = hrhbPocket(human(level));
            expect(resolveNonManualParamilitaryPolicy(state, 'HRHB', undefined)).toBe('always_allow');
            expect(resolveNonManualParamilitaryPolicy(state, 'HRHB', CATALOG)).toBe('always_allow');
        });

        it(`T3 HRHB in-person Always deny at autonomy ${level}: none; in-person Always allow: the sweep`, () => {
            const deny = hrhbPocket(human(level));
            deny.paramilitary_policy = 'always_deny';
            deny.paramilitary_decision_history = [hrhbRecord(3, 'deny')];
            expect(outcome(deny).spawns).toEqual([]);
            const allow = hrhbPocket(human(level));
            allow.paramilitary_policy = 'always_allow';
            allow.paramilitary_decision_history = [hrhbRecord(3, 'allow')];
            expect(outcome(allow).spawns.length).toBe(1);
        });

        it(`T4 HRHB requests decided one by one at Full Control under ask refuse at autonomy ${level}, ALLOW records included`, () => {
            for (const decision of ['allow', 'deny'] as const) {
                const state = hrhbPocket(human(level));
                state.paramilitary_policy = 'ask';
                state.paramilitary_decision_history = [hrhbRecord(2, decision), hrhbRecord(3, decision)];
                expect(outcome(state).spawns, decision).toEqual([]);
                expect(outcome(state).pending, decision).toBe(0);
            }
        });
    }

    describe('T5 faction switch (a rule for saves and tests: player_faction is written only at campaign start)', () => {
        it('no HRHB record, another side\'s applied Always deny in the global field: the default applies (not HRHB\'s order)', () => {
            const state = hrhbPocket(human(2));
            state.paramilitary_policy = 'always_deny';
            state.military.fired_event_ids = ['rs_paramilitary_policy_1992'];
            state.military.event_fire_counts = { rs_paramilitary_policy_1992: 1 };
            state.military.event_last_fired_turn = { rs_paramilitary_policy_1992: 1 };
            state.military.event_flags = { rs_paramilitary_policy: 'always_deny' };
            state.military.event_decision_log = [
                { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_deny', decision_source: 'player', faction: 'RS', turn: 1 },
            ];
            expect(outcome(state).spawns.length).toBe(1);
        });

        it('no HRHB record, another side\'s applied Always allow: the default applies', () => {
            const state = hrhbPocket(human(2));
            state.paramilitary_policy = 'always_allow';
            state.military.fired_event_ids = ['rs_paramilitary_policy_1992'];
            state.military.event_fire_counts = { rs_paramilitary_policy_1992: 1 };
            state.military.event_last_fired_turn = { rs_paramilitary_policy_1992: 1 };
            state.military.event_flags = { rs_paramilitary_policy: 'always_allow' };
            state.military.event_decision_log = [
                { event_id: 'rs_paramilitary_policy_1992', response_id: 'always_allow', decision_source: 'player', faction: 'RS', turn: 1 },
            ];
            expect(outcome(state).spawns.length).toBe(1);
        });

        it('P1 (G1, fail closed): an own HRHB refusal, then a newer other-side decision, then HRHB again: none', () => {
            const state = hrhbPocket(human(2));
            state.paramilitary_policy = 'always_deny';
            state.paramilitary_decision_history = [
                hrhbRecord(3, 'deny'),
                { id: 'paramilitary:5:op:elsewhere:y', turn: 5, target_osid: 'op:elsewhere:y', faction: 'RBiH', strength: 150, decision: 'deny' },
            ];
            expect(outcome(state).spawns).toEqual([]);
        });

        it('P1: an older own HRHB record plus another side\'s Always allow in the global field: none', () => {
            const state = hrhbPocket(human(2));
            state.paramilitary_policy = 'always_allow';
            state.paramilitary_decision_history = [
                hrhbRecord(3, 'allow'),
                { id: 'paramilitary:5:op:elsewhere:y', turn: 5, target_osid: 'op:elsewhere:y', faction: 'RBiH', strength: 150, decision: 'allow' },
            ];
            expect(outcome(state).spawns).toEqual([]);
        });

        it('tie pin: an own HRHB record on the same turn as another side\'s decision counts as HRHB\'s own', () => {
            const state = hrhbPocket(human(2));
            state.paramilitary_policy = 'always_allow';
            state.paramilitary_decision_history = [
                hrhbRecord(5, 'allow'),
                { id: 'paramilitary:5:op:elsewhere:y', turn: 5, target_osid: 'op:elsewhere:y', faction: 'RBiH', strength: 150, decision: 'allow' },
            ];
            expect(outcome(state).spawns.length).toBe(1);
        });
    });

    describe('scope guards (H2, T6, T7)', () => {
        it('HRHB at Full Control with no record raises a request, as before (manual path untouched)', () => {
            const state = hrhbPocket(human(0));
            expect(outcome(state)).toEqual({ spawns: [], pending: 1 });
        });

        it('the HRHB bot keeps its allow', () => {
            expect(outcome(hrhbPocket({})).spawns.length).toBe(1);
        });

        it('RS and RBiH humans with no card answer at levels 1-3 still send nothing (A1)', () => {
            for (const faction of ['RS', 'RBiH'] as const) {
                for (const level of LEVELS) {
                    const state = hrhbPocket({ player_faction: faction, autonomy_level: level, headless_scenario_auto_control: false });
                    expect(resolveNonManualParamilitaryPolicy(state, faction, CATALOG), `${faction} a${level}`).toBe('always_deny');
                }
            }
        });
    });
});
