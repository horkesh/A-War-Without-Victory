import assert from 'node:assert';
import { test } from 'node:test';

import type { FrontEdge } from '../src/map/front_edges.js';
import { deriveAssignableFrontSegments } from '../src/state/assignable_front_segments.js';

test('deriveAssignableFrontSegments groups contiguous hostile edges deterministically', () => {
    const frontEdges: FrontEdge[] = [
        { edge_id: 'S1__S2', a: 'S1', b: 'S2', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'S2__S3', a: 'S2', b: 'S3', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'S4__S5', a: 'S4', b: 'S5', side_a: 'RS', side_b: 'RBiH' },
        { edge_id: 'S9__S8', a: 'S9', b: 'S8', side_a: 'HRHB', side_b: 'RBiH' }
    ];

    const out = deriveAssignableFrontSegments(frontEdges);
    assert.strictEqual(out.length, 3);

    const rsRbih = out.filter((segment) => segment.side_a === 'RBiH' || segment.side_a === 'RS');
    assert.strictEqual(rsRbih.length, 2);
    assert.deepStrictEqual(rsRbih[0].edge_ids, ['S1__S2', 'S2__S3']);
    assert.strictEqual(rsRbih[0].length_edges, 2);
    assert.deepStrictEqual(rsRbih[1].edge_ids, ['S4__S5']);
    assert.strictEqual(rsRbih[1].length_edges, 1);

    const hrhbRbih = out.find((segment) => segment.side_a === 'HRHB' || segment.side_b === 'HRHB');
    assert.ok(hrhbRbih, 'HRHB-RBiH segment should exist');
    assert.deepStrictEqual(hrhbRbih?.edge_ids, ['S9__S8']);
});

