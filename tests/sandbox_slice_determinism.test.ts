import { describe, expect, it } from 'vitest';
import { canonicalizeSliceData, type SliceData } from '../src/ui/map/sandbox/sandbox_slice.js';

function makeSlice(): SliceData {
    return {
        region: { id: 'test', name: 'Test', bbox: [17, 43, 18, 44], description: 'Determinism fixture region' },
        settlements: [
            { sid: 'S3', name: 'C', mun1990_id: 'M2', pop: 300, pop_bosniaks: 100, pop_serbs: 100, pop_croats: 100, geometry: { type: 'Polygon', coordinates: [] }, centroid: [17.3, 43.3] },
            { sid: 'S1', name: 'A', mun1990_id: 'M1', pop: 100, pop_bosniaks: 80, pop_serbs: 10, pop_croats: 10, geometry: { type: 'Polygon', coordinates: [] }, centroid: [17.1, 43.1] },
            { sid: 'S2', name: 'B', mun1990_id: 'M1', pop: 200, pop_bosniaks: 90, pop_serbs: 60, pop_croats: 50, geometry: { type: 'Polygon', coordinates: [] }, centroid: [17.2, 43.2] },
        ],
        edges: [
            { a: 'S3', b: 'S2' },
            { a: 'S1', b: 'S2' },
            { a: 'S3', b: 'S1' },
        ],
        political_controllers: {
            S2: 'RBiH',
            S3: 'RS',
            S1: null,
        },
        formations: {
            F2: { id: 'F2', faction: 'RS', name: 'F2', kind: 'brigade', personnel: 500, cohesion: 70, fatigue: 5, experience: 30, posture: 'defend', hq_sid: 'S3', status: 'active' },
            F1: { id: 'F1', faction: 'RBiH', name: 'F1', kind: 'brigade', personnel: 700, cohesion: 75, fatigue: 4, experience: 40, posture: 'probe', hq_sid: 'S2', status: 'active' },
        },
        brigade_aor: {
            S3: 'F2',
            S1: null,
            S2: 'F1',
        },
        sidSet: new Set(['S3', 'S1', 'S2']),
        sidToMun: new Map([
            ['S3', 'M2'],
            ['S1', 'M1'],
            ['S2', 'M1'],
        ]),
    };
}

describe('canonicalizeSliceData', () => {
    it('produces stable settlement and edge ordering', () => {
        const out = canonicalizeSliceData(makeSlice());
        expect(out.settlements.map((s) => s.sid)).toEqual(['S1', 'S2', 'S3']);
        expect(out.edges.map((e) => `${e.a}:${e.b}`)).toEqual(['S1:S2', 'S1:S3', 'S2:S3']);
        expect(Object.keys(out.political_controllers)).toEqual(['S1', 'S2', 'S3']);
        expect(Object.keys(out.formations)).toEqual(['F1', 'F2']);
        expect([...out.sidSet]).toEqual(['S1', 'S2', 'S3']);
        expect([...out.sidToMun.keys()]).toEqual(['S1', 'S2', 'S3']);
    });

    it('is idempotent', () => {
        const once = canonicalizeSliceData(makeSlice());
        const twice = canonicalizeSliceData(once);
        expect(once).toEqual(twice);
    });
});
