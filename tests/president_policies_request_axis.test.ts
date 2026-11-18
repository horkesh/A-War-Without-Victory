/**
 * Played-test options for the appendix C President (package "1994-95 attack and defence",
 * 2026-11-16): a one-axis Request-op and a preference for an exhausted corps. Both opt-in; without
 * them the candidate order is unchanged.
 */

import { describe, expect, it } from 'vitest';
import { axisCorpsOrder, bindPresidentRequestAttempts, joinPresidentRequests, recordsRequestDetails, requestCandidates, type PresidentRequestDetail } from '../tools/ai_play/president_policies.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(): GameState {
    const sector = (corps: string, enemy: string[]) => ({
        sector_id: `sector:${corps}:0`, corps_id: corps, faction: 'RBiH', sub_segments: [{ enemy_osids: enemy }],
    });
    return {
        meta: { turn: 120 },
        military: {
            corps_front_sectors: {
                a: sector('arbih_2nd_corps', ['op:doboj:x', 'op:gracanica:y', 'op:lukavac:z']),
                b: sector('arbih_3rd_corps', ['op:maglaj:donja_bocinja_2', 'op:zavidovici:vozuca_2']),
            },
            corps_command: {
                arbih_2nd_corps: { corps_exhaustion: 10 },
                arbih_3rd_corps: { corps_exhaustion: 80 },
            },
        },
    } as unknown as GameState;
}

describe('President Request-op candidates', () => {
    it('without options keeps the busiest-front order', () => {
        expect(requestCandidates(makeState(), 'RBiH').map(c => c.corpsId)).toEqual(['arbih_2nd_corps', 'arbih_3rd_corps']);
    });

    it('preferExhausted puts a corps above the planning gate first', () => {
        expect(requestCandidates(makeState(), 'RBiH', { preferExhausted: true }).map(c => c.corpsId))
            .toEqual(['arbih_3rd_corps', 'arbih_2nd_corps']);
    });

    it('requestAxis keeps only the named corps and only targets in the axis municipalities', () => {
        expect(requestCandidates(makeState(), 'RBiH', { requestAxis: { corpsIds: ['arbih_3rd_corps'], municipalities: ['maglaj'] } }))
            .toEqual([{ corpsId: 'arbih_3rd_corps', targets: ['op:maglaj:donja_bocinja_2'] }]);
    });

    it('an axis with no matching target yields no candidate', () => {
        expect(requestCandidates(makeState(), 'RBiH', { requestAxis: { corpsIds: ['arbih_3rd_corps'], municipalities: ['tuzla'] } })).toEqual([]);
    });
});

describe('President Request-op: several corps on one axis', () => {
    it('serves an exhausted corps first with preferExhausted, else in corps id order (Codex review on #742)', () => {
        const ids = ['arbih_2nd_corps', 'arbih_3rd_corps'];
        expect(axisCorpsOrder(makeState(), ids, true)).toEqual(['arbih_3rd_corps', 'arbih_2nd_corps']);
        expect(axisCorpsOrder(makeState(), ids, false)).toEqual(['arbih_2nd_corps', 'arbih_3rd_corps']);
    });

    it('keeps every named corps, each with only its axis targets', () => {
        expect(requestCandidates(makeState(), 'RBiH', {
            requestAxis: { corpsIds: ['arbih_2nd_corps', 'arbih_3rd_corps'], municipalities: ['doboj', 'maglaj'] },
        })).toEqual([
            { corpsId: 'arbih_2nd_corps', targets: ['op:doboj:x'] },
            { corpsId: 'arbih_3rd_corps', targets: ['op:maglaj:donja_bocinja_2'] },
        ]);
    });
});

describe('Request-op detail records (Codex review on #821)', () => {
    it('--request-from alone turns on request_details (the old predicate left it out)', () => {
        expect(recordsRequestDetails({ requestFrom: 91 })).toBe(true);
        expect(recordsRequestDetails({ requestFrom: 0 })).toBe(true);
    });

    it('every other played-test option still turns it on; none leaves it off', () => {
        expect(recordsRequestDetails({ requestAxis: { corpsIds: ['arbih_2nd_corps'], municipalities: ['doboj'] } })).toBe(true);
        expect(recordsRequestDetails({ preferExhausted: true })).toBe(true);
        expect(recordsRequestDetails({ requestEvery: 1 })).toBe(true);
        expect(recordsRequestDetails({ requestOnly: true })).toBe(true);
        expect(recordsRequestDetails({})).toBe(false);
        expect(recordsRequestDetails(undefined)).toBe(false);
    });
});

describe('Request-op outcomes bound to their own attempt (Codex review on #706)', () => {
    const target = 'op:maglaj:donja_bocinja_2';
    const name = `Presidential Directive — ${target}`;
    const order = (turn: number): PresidentRequestDetail => ({
        turn, corps_id: 'arbih_3rd_corps', target_osid: target, operation_name: name,
        corps_exhaustion_at_order: 10, above_planning_gate: false, forced_over_objection: false, ca_cost: 25, clash: null,
    });
    const stateAt = (turn: number, extra: Record<string, unknown>) => ({
        meta: { turn },
        military: { corps_command: { arbih_3rd_corps: { active_operations: [], ...extra } } },
        operation_history: [],
    }) as unknown as GameState;

    it('a rejected order stays rejected when a later order on the same target completes', () => {
        const first = order(10);
        const second = order(20);
        // Week 10: the first order is refused.
        bindPresidentRequestAttempts([first], stateAt(11, { op_directive_rejection: { target_osid: target, reason: 'no_available_slot', turn: 10 } }), 10);
        // Week 20: the second order is injected (the stale rejection field is gone).
        bindPresidentRequestAttempts([second], stateAt(21, { active_operations: [{ name, started_turn: 20, phase: 'planning' }] }), 20);
        const final = stateAt(40, {});
        (final as any).operation_history = [{
            operation_name: name, corps_id: 'arbih_3rd_corps', started_turn: 20, ended_turn: 30, outcome: 'success',
            objectives_captured: [target, 'op:maglaj:replayed_loss'], objectives_logged_captured: [target],
        }];
        const [a, b] = joinPresidentRequests([first, second], final);
        expect(a.result).toEqual({ status: 'rejected', reason: 'no_available_slot', turn: 10 });
        expect(b.result).toMatchObject({ status: 'completed', started_turn: 20, outcome: 'success' });
        // The canonical AAR field, not the logged-capture subset.
        expect((b.result as any).objectives_captured).toEqual([target, 'op:maglaj:replayed_loss']);
    });

    it('an earlier rejection of the same target does not bind to a later order', () => {
        const later = order(20);
        bindPresidentRequestAttempts([later], stateAt(21, { op_directive_rejection: { target_osid: target, reason: 'no_available_slot', turn: 10 } }), 20);
        expect(later.rejection).toBeUndefined();
        expect(joinPresidentRequests([later], stateAt(40, {}))[0]!.result).toEqual({ status: 'not_found' });
    });

    it('an order is not credited with a same-name operation started in another week', () => {
        const early = order(10);
        bindPresidentRequestAttempts([early], stateAt(11, {}), 10);
        const final = stateAt(40, {});
        (final as any).operation_history = [{ operation_name: name, corps_id: 'arbih_3rd_corps', started_turn: 20, outcome: 'success', objectives_captured: [target] }];
        expect(joinPresidentRequests([early], final)[0]!.result).toEqual({ status: 'not_found' });
    });
});
