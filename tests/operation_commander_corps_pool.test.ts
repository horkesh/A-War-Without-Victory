/**
 * Commander attribution PR 2a: an operation's commander must belong to its corps (home or compatible).
 * Before, selectOperationCommander fell through to any reserve corps_commander of the faction, so
 * 2nd Corps officers (Sead Delić) and, after his Srebrenica lock ended, Naser Orić led 7th Corps
 * operations. The historian's table gives the 7th Corps its own officers (Alagić, Čuskić; Cikotić
 * compatible).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { selectOperationCommander } from '../src/sim/combat/officer_system.js';
import type { NamedOfficer } from '../src/state/officer_types.js';
import type { GameState } from '../src/state/game_state.js';

const officersFile = JSON.parse(readFileSync(join(process.cwd(), 'data', 'scenarios', 'officers', 'apr1992_officers.json'), 'utf8')) as { officers: NamedOfficer[] };

function stateWith(reserveIds: string[], turn = 120): GameState {
    const data = officersFile.officers.filter((o) => o.faction === 'RBiH');
    const named: Record<string, unknown> = {};
    for (const o of data) named[o.id] = { status: reserveIds.includes(o.id) ? 'reserve' : 'retired', assigned_corps_id: null };
    return { meta: { turn }, military: { named_officer_data: data, named_officers: named } } as unknown as GameState;
}

describe('operation commander corps pool', () => {
    it('never draws an officer of another corps', () => {
        // Only 2nd Corps officers are free: a 7th Corps operation gets no named commander.
        const state = stateWith(['arbih_s_delic', 'arbih_hodzic', 'arbih_oric']);
        expect(selectOperationCommander(state, 'arbih_7th_corps', 'RBiH')).toBeNull();
    });

    it("draws the 7th Corps' own officers once they are free", () => {
        const state = stateWith(['arbih_s_delic', 'arbih_cuskic', 'arbih_oric']);
        expect(selectOperationCommander(state, 'arbih_7th_corps', 'RBiH')).toBe('arbih_cuskic');
    });

    it('lets a compatible officer serve when no home officer is free', () => {
        const state = stateWith(['arbih_cikotic', 'arbih_s_delic']);
        expect(selectOperationCommander(state, 'arbih_7th_corps', 'RBiH')).toBe('arbih_cikotic');
    });
});
