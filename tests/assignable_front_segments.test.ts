import { expect, test } from 'vitest';

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
    expect(out.length).toBe(3);

    const rsRbih = out.filter((segment) => segment.side_a === 'RBiH' || segment.side_a === 'RS');
    expect(rsRbih.length).toBe(2);
    expect(rsRbih[0].edge_ids).toEqual(['S1__S2', 'S2__S3']);
    expect(rsRbih[0].length_edges).toBe(2);
    expect(rsRbih[1].edge_ids).toEqual(['S4__S5']);
    expect(rsRbih[1].length_edges).toBe(1);

    const hrhbRbih = out.find((segment) => segment.side_a === 'HRHB' || segment.side_b === 'HRHB');
    expect(hrhbRbih).toBeTruthy();
    expect(hrhbRbih?.edge_ids).toEqual(['S9__S8']);
});

