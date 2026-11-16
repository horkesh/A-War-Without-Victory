/**
 * Played-test options for the appendix C President (package "1994-95 attack and defence",
 * 2026-11-16): a one-axis Request-op and a preference for an exhausted corps. Both opt-in; without
 * them the candidate order is unchanged.
 */

import { describe, expect, it } from 'vitest';
import { requestCandidates } from '../tools/ai_play/president_policies.js';
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
        expect(requestCandidates(makeState(), 'RBiH', { requestAxis: { corpsId: 'arbih_3rd_corps', municipalities: ['maglaj'] } }))
            .toEqual([{ corpsId: 'arbih_3rd_corps', targets: ['op:maglaj:donja_bocinja_2'] }]);
    });

    it('an axis with no matching target yields no candidate', () => {
        expect(requestCandidates(makeState(), 'RBiH', { requestAxis: { corpsId: 'arbih_3rd_corps', municipalities: ['tuzla'] } })).toEqual([]);
    });
});
