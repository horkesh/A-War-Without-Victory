import assert from 'node:assert';
import { test } from 'vitest';

import type { CorpsFrontSector, FormationState } from '../src/state/game_state.js';
import { canonicalizeSameFactionEdgeOwnership } from '../src/sim/combat/corps_front_sectors.js';

test('same-faction edge canonicalization prunes stale truth from non-empty losing sectors', () => {
    const duplicateEdge = 'op:alpha:a__op:enemy:e1';
    const retainedEdge = 'op:beta:b__op:enemy:e2';
    const sectors = {
        loser: {
            sector_id: 'loser',
            faction: 'RBiH',
            corps_id: 'loser_corps',
            edge_ids: [duplicateEdge, retainedEdge],
            sub_segments: [{
                sub_segment_id: 'subseg:loser:0',
                edge_ids: [duplicateEdge, retainedEdge],
                friendly_osids: ['op:alpha:a', 'op:beta:b'],
                enemy_osids: ['op:enemy:e1', 'op:enemy:e2'],
                length_edges: 2,
                primary_brigade_ids: ['brigade_at_removed_edge', 'brigade_at_retained_edge'],
            }],
            assigned_brigade_ids: ['brigade_at_removed_edge', 'brigade_at_retained_edge'],
            reserve_brigade_ids: ['reserve_at_removed_edge'],
            rear_brigade_ids: ['rear_behind_retained_edge'],
            territory_osids: ['op:alpha:a', 'op:beta:b', 'op:rear:r'],
            length_edges: 2,
        } as unknown as CorpsFrontSector,
        winner: {
            sector_id: 'winner',
            faction: 'RBiH',
            corps_id: 'winner_corps',
            edge_ids: [duplicateEdge],
            sub_segments: [{
                sub_segment_id: 'subseg:winner:0',
                edge_ids: [duplicateEdge],
                friendly_osids: ['op:alpha:a'],
                enemy_osids: ['op:enemy:e1'],
                length_edges: 1,
                primary_brigade_ids: ['winner_brigade'],
            }],
            assigned_brigade_ids: ['winner_brigade', 'winner_brigade_2', 'winner_brigade_3'],
            reserve_brigade_ids: ['winner_reserve', 'winner_reserve_2'],
            territory_osids: ['op:alpha:a'],
            length_edges: 1,
        } as unknown as CorpsFrontSector,
    };
    const formations = {
        brigade_at_removed_edge: { id: 'brigade_at_removed_edge', location_osid: 'op:alpha:a' },
        brigade_at_retained_edge: { id: 'brigade_at_retained_edge', location_osid: 'op:beta:b' },
        reserve_at_removed_edge: { id: 'reserve_at_removed_edge', location_osid: 'op:alpha:a' },
        rear_behind_retained_edge: { id: 'rear_behind_retained_edge', location_osid: 'op:rear:r' },
        winner_brigade: { id: 'winner_brigade', location_osid: 'op:alpha:a' },
        winner_brigade_2: { id: 'winner_brigade_2', location_osid: 'op:alpha:a' },
        winner_brigade_3: { id: 'winner_brigade_3', location_osid: 'op:alpha:a' },
        winner_reserve: { id: 'winner_reserve', location_osid: 'op:alpha:a' },
        winner_reserve_2: { id: 'winner_reserve_2', location_osid: 'op:alpha:a' },
    } as unknown as Record<string, FormationState>;
    const edgeMeta = new Map([
        [duplicateEdge, { a: 'op:alpha:a', b: 'op:enemy:e1', side_a: 'RBiH', side_b: 'RS' }],
        [retainedEdge, { a: 'op:beta:b', b: 'op:enemy:e2', side_a: 'RBiH', side_b: 'RS' }],
    ]);

    const emptied = canonicalizeSameFactionEdgeOwnership(sectors, formations, edgeMeta);

    assert.deepStrictEqual(emptied, []);
    assert.deepStrictEqual(sectors.loser.edge_ids, [retainedEdge]);
    assert.deepStrictEqual(sectors.loser.sub_segments, [{
        sub_segment_id: 'subseg:loser:0',
        edge_ids: [retainedEdge],
        friendly_osids: ['op:beta:b'],
        enemy_osids: ['op:enemy:e2'],
        length_edges: 1,
        primary_brigade_ids: ['brigade_at_retained_edge'],
    }]);
    assert.deepStrictEqual(sectors.loser.territory_osids, ['op:beta:b', 'op:rear:r']);
    assert.deepStrictEqual(sectors.loser.assigned_brigade_ids, ['brigade_at_retained_edge']);
    assert.deepStrictEqual(sectors.loser.reserve_brigade_ids, []);
    assert.deepStrictEqual(sectors.loser.rear_brigade_ids, ['rear_behind_retained_edge']);
    assert.deepStrictEqual(sectors.winner.edge_ids, [duplicateEdge]);
});
