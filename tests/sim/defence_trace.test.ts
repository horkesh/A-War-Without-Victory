/** `defence` receipts (2026-11-16): one stdout line per settlement a faction lost last turn. Default off; observation only. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitDefenceTrace } from '../../src/sim/combat/defence_trace.js';
import { DEFENCE_PREFIX, resetReasonCodeTopicCacheForTests } from '../../src/sim/combat/reason_code_debug.js';
import type { FormationState, GameState } from '../../src/state/game_state.js';

function setFlag(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}
afterEach(() => setFlag(undefined));

const brig = (id: string, loc: string, extra: Record<string, unknown> = {}) =>
    ({ id, name: id, faction: 'RS', kind: 'brigade', status: 'active', created_turn: 0, assignment: null, corps_id: 'vrs_c', location_osid: loc, personnel: 1500, max_personnel: 2000, cohesion: 20, ...extra }) as unknown as FormationState;

function setup() {
    const sector = { sector_id: 'sector:vrs_c:0', corps_id: 'vrs_c', faction: 'RS', opposing_factions: ['RBiH'], edge_ids: [], length_edges: 1, territory_osids: [], density: 1,
        sub_segments: [{ friendly_osids: ['op:t:lost', 'op:t:b'] }], assigned_brigade_ids: ['line1'], reserve_brigade_ids: ['res1'] };
    const brigades = [brig('line1', 'op:t:b', { last_retreat_from: { osid: 'op:t:lost', turn: 9 } }), brig('res1', 'op:t:d', { cohesion: 60 })];
    const state = {
        meta: { turn: 10 },
        political: { control_events: [{ turn: 9, settlement_id: 'op:t:lost', mechanism: 'combat', from: 'RS', to: 'RBiH', attacker_brigade: 'a1' }] },
        military: { formations: {}, corps_command: { vrs_c: { stance: 'balanced', active_operations: [] } }, corps_front_sectors: { [sector.sector_id]: sector } },
    } as unknown as GameState;
    const adjacency = new Map([['op:t:lost', ['op:t:b']], ['op:t:b', ['op:t:lost', 'op:t:c']], ['op:t:c', ['op:t:b', 'op:t:d']], ['op:t:d', ['op:t:c']]]);
    const roles = new Map([['line1', { sector: sector as never, isReserve: false }], ['res1', { sector: sector as never, isReserve: true }]]);
    return { state, brigades, adjacency, roles };
}

function capture(fn: () => void): string[] {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { lines.push(String(a[0])); });
    try { fn(); } finally { spy.mockRestore(); }
    return lines;
}

describe('defence receipts', () => {
    it('are silent when the topic is off', () => {
        const { state, brigades, adjacency, roles } = setup();
        expect(capture(() => emitDefenceTrace(state, 'RS', brigades, adjacency, roles, new Map()))).toEqual([]);
    });

    it('record the lost settlement, the owning sector, the retreat trigger, the gates and the nearest idle brigade', () => {
        setFlag('defence');
        const { state, brigades, adjacency, roles } = setup();
        const before = JSON.stringify(state);
        const lines = capture(() => emitDefenceTrace(state, 'RS', brigades, adjacency, roles, new Map()));
        expect(JSON.stringify(state)).toBe(before);
        expect(lines).toHaveLength(1);
        const rec = JSON.parse(lines[0]!.slice(DEFENCE_PREFIX.length + 1));
        expect(rec).toMatchObject({ turn: 10, faction: 'RS', lost_osid: 'op:t:lost', to: 'RBiH', retreat_trigger: ['line1'] });
        expect(rec.sectors[0]).toMatchObject({ sector: 'sector:vrs_c:0', corps_stance: 'balanced' });
        expect(rec.sectors[0].reserve[0]).toMatchObject({ id: 'res1', hops: 3, gate_ok: true });
        expect(rec.near_brigades[0]).toMatchObject({ supply: 'adequate', encircled: false });
        expect(rec.near_brigades[0]).toMatchObject({ id: 'line1', hops: 1, role: 'line', corps_stance: 'balanced' });
        expect(rec.near_brigades[0].ca_gate).toMatchObject({ stance_defensive: false, cohesion_ok: false });
        expect(rec.nearest_idle).toMatchObject({ id: 'res1', hops: 3, role: 'reserve' });
    });
});
