import { describe, it, expect } from 'vitest';
import { detectSalients, getLineShorteningScore, analyzeFrontGeometry, DEFAULT_ETHNIC_NECK_THRESHOLD } from '../src/sim/combat/front_geometry_analysis.js';
import type { OsidEthnicComposition } from '../src/sim/combat/ethnic_defense.js';

// ── Helper: build adjacency from edge pairs ───────────────────────────────

function buildAdj(pairs: [string, string][]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const [a, b] of pairs) {
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
    }
    // Sort for determinism
    for (const [, neighbors] of adj) neighbors.sort();
    return adj;
}

// ── Shared topology builder for salient tests ─────────────────────────────
//
// Naming convention: "a_" prefix for main body (sorts first in BFS),
// "neck" for neck OSID, "d_" prefix for bulge/tip (sorts after neck).
// This ensures BFS from neck's first friendly neighbor reaches the main body,
// leaving the bulge side as the "disconnected" salient body.
//
// Topology (single neck):
//   a_rear1 -- a_rear2 -- neck -- d_tip1 -- d_tip2
//                                   |          |
//                                 d_tip3 -- d_tip4
//   (neck also connects to d_tip3 to prevent d_tip1 from being a sub-articulation point)
//   Enemy surrounds bulge + neck.

function buildSingleNeckSalient() {
    return buildAdj([
        // Main body
        ['op:a:a_rear1', 'op:a:a_rear2'],
        ['op:a:a_rear2', 'op:a:neck'],
        // Neck → bulge (neck connects to two tip OSIDs to prevent sub-articulation)
        ['op:a:neck', 'op:a:d_tip1'],
        ['op:a:neck', 'op:a:d_tip3'],
        // Bulge cross-connected
        ['op:a:d_tip1', 'op:a:d_tip2'],
        ['op:a:d_tip1', 'op:a:d_tip3'],
        ['op:a:d_tip3', 'op:a:d_tip4'],
        ['op:a:d_tip2', 'op:a:d_tip4'],
        // Enemy adjacency
        ['op:a:d_tip1', 'op:e:enemy_1'],
        ['op:a:d_tip2', 'op:e:enemy_2'],
        ['op:a:d_tip3', 'op:e:enemy_3'],
        ['op:a:d_tip4', 'op:e:enemy_4'],
        ['op:a:neck', 'op:e:enemy_5'],
    ]);
}

const SINGLE_NECK_FACTION = [
    'op:a:a_rear1', 'op:a:a_rear2', 'op:a:neck',
    'op:a:d_tip1', 'op:a:d_tip2', 'op:a:d_tip3', 'op:a:d_tip4',
];
const SINGLE_NECK_ENEMY = new Set([
    'op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3', 'op:e:enemy_4', 'op:e:enemy_5',
]);

// ── Salient Detection ─────────────────────────────────────────────────────

describe('detectSalients', () => {
    it('detects a simple salient connected through one neck OSID', () => {
        const adj = buildSingleNeckSalient();

        const result = detectSalients(SINGLE_NECK_FACTION, SINGLE_NECK_ENEMY, adj);

        expect(result.length).toBe(1);
        expect(result[0]!.neck_osids).toEqual(['op:a:neck']);
        expect(result[0]!.neck_width).toBe(1);
        expect(result[0]!.body_size).toBe(4); // d_tip1..d_tip4
        expect(result[0]!.vulnerability).toBe(4); // 4 / 1
        expect(result[0]!.front_exposure).toBeGreaterThan(0);
    });

    it('detects a two-neck salient (serial neck chain)', () => {
        // Serial neck: a_rear → neck_a → neck_b → tips
        // Removing neck_a disconnects {neck_b, tips}; removing neck_b disconnects {tips}.
        // They merge (adjacent, overlapping disconnected sets).
        const adj = buildAdj([
            // Main body
            ['op:a:a_rear1', 'op:a:a_rear2'],
            ['op:a:a_rear2', 'op:a:c_neck_a'],
            // Neck chain
            ['op:a:c_neck_a', 'op:a:c_neck_b'],
            // Bulge: neck_b → tips (cross-connected)
            ['op:a:c_neck_b', 'op:a:d_tip1'],
            ['op:a:c_neck_b', 'op:a:d_tip2'],
            ['op:a:d_tip1', 'op:a:d_tip2'],
            ['op:a:d_tip1', 'op:a:d_tip3'],
            ['op:a:d_tip2', 'op:a:d_tip3'],
            ['op:a:d_tip1', 'op:a:d_tip4'],
            ['op:a:d_tip3', 'op:a:d_tip4'],
            // Enemy adjacency
            ['op:a:d_tip1', 'op:e:enemy_1'],
            ['op:a:d_tip2', 'op:e:enemy_2'],
            ['op:a:d_tip3', 'op:e:enemy_3'],
            ['op:a:d_tip4', 'op:e:enemy_4'],
            ['op:a:c_neck_a', 'op:e:enemy_5'],
            ['op:a:c_neck_b', 'op:e:enemy_6'],
        ]);

        const factionOsids = [
            'op:a:a_rear1', 'op:a:a_rear2',
            'op:a:c_neck_a', 'op:a:c_neck_b',
            'op:a:d_tip1', 'op:a:d_tip2', 'op:a:d_tip3', 'op:a:d_tip4',
        ];
        const enemyOsids = new Set([
            'op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3',
            'op:e:enemy_4', 'op:e:enemy_5', 'op:e:enemy_6',
        ]);

        const result = detectSalients(factionOsids, enemyOsids, adj);

        expect(result.length).toBe(1);
        expect(result[0]!.neck_width).toBe(2);
        expect(result[0]!.neck_osids).toContain('op:a:c_neck_a');
        expect(result[0]!.neck_osids).toContain('op:a:c_neck_b');
        expect(result[0]!.body_size).toBe(4); // d_tip1..d_tip4
        expect(result[0]!.vulnerability).toBe(2); // 4 / 2
    });

    it('returns empty for a straight front line (no salient)', () => {
        // All OSIDs evenly distributed — no narrow neck
        const adj = buildAdj([
            ['op:a:f1', 'op:a:f2'],
            ['op:a:f2', 'op:a:f3'],
            ['op:a:f3', 'op:a:f4'],
            ['op:a:f1', 'op:e:e1'],
            ['op:a:f2', 'op:e:e2'],
            ['op:a:f3', 'op:e:e3'],
            ['op:a:f4', 'op:e:e4'],
        ]);

        const factionOsids = ['op:a:f1', 'op:a:f2', 'op:a:f3', 'op:a:f4'];
        const enemyOsids = new Set(['op:e:e1', 'op:e:e2', 'op:e:e3', 'op:e:e4']);

        const result = detectSalients(factionOsids, enemyOsids, adj);
        expect(result).toEqual([]);
    });

    it('ignores salients with body_size < MIN_BODY_SIZE', () => {
        // Single OSID "salient" — too small to qualify
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:main_2', 'op:a:neck'],
            ['op:a:neck', 'op:a:tip'],
            ['op:a:tip', 'op:e:e1'],
            ['op:a:neck', 'op:e:e2'],
        ]);

        const factionOsids = ['op:a:main_1', 'op:a:main_2', 'op:a:neck', 'op:a:tip'];
        const enemyOsids = new Set(['op:e:e1', 'op:e:e2']);

        const result = detectSalients(factionOsids, enemyOsids, adj);
        expect(result).toEqual([]); // body_size=1 < MIN_BODY_SIZE=2
    });

    it('is deterministic — same input produces same output', () => {
        const adj = buildSingleNeckSalient();

        const r1 = detectSalients(SINGLE_NECK_FACTION, SINGLE_NECK_ENEMY, adj);
        const r2 = detectSalients(SINGLE_NECK_FACTION, SINGLE_NECK_ENEMY, adj);
        expect(r1).toEqual(r2);
    });
});

// ── Line-Shortening Score ─────────────────────────────────────────────────

describe('getLineShorteningScore', () => {
    it('returns negative for targets that shorten the line', () => {
        // 4 friendly neighbors, 1 enemy → score = 1 - 4 = -3
        const adj = buildAdj([
            ['op:target', 'op:f1'],
            ['op:target', 'op:f2'],
            ['op:target', 'op:f3'],
            ['op:target', 'op:f4'],
            ['op:target', 'op:e1'],
        ]);
        const factionSet = new Set(['op:f1', 'op:f2', 'op:f3', 'op:f4']);

        expect(getLineShorteningScore('op:target', adj, factionSet)).toBe(-3);
    });

    it('returns positive for targets that lengthen the line', () => {
        // 1 friendly, 4 enemy → score = 4 - 1 = 3
        const adj = buildAdj([
            ['op:target', 'op:f1'],
            ['op:target', 'op:e1'],
            ['op:target', 'op:e2'],
            ['op:target', 'op:e3'],
            ['op:target', 'op:e4'],
        ]);
        const factionSet = new Set(['op:f1']);

        expect(getLineShorteningScore('op:target', adj, factionSet)).toBe(3);
    });

    it('returns zero for neutral captures', () => {
        // 2 friendly, 2 enemy → score = 0
        const adj = buildAdj([
            ['op:target', 'op:f1'],
            ['op:target', 'op:f2'],
            ['op:target', 'op:e1'],
            ['op:target', 'op:e2'],
        ]);
        const factionSet = new Set(['op:f1', 'op:f2']);

        expect(getLineShorteningScore('op:target', adj, factionSet)).toBe(0);
    });
});

// ── Ethnic Hold Constraints ───────────────────────────────────────────────

describe('analyzeFrontGeometry ethnic holds', () => {
    it('marks salient neck as ethnically critical when co-ethnic share >= threshold', () => {
        const adj = buildSingleNeckSalient();

        const ethnicMap: OsidEthnicComposition = new Map([
            ['op:a:neck', { bosniak: 0.10, serb: 0.70, croat: 0.20 }],
            ['op:a:d_tip1', { bosniak: 0.15, serb: 0.65, croat: 0.20 }],
            ['op:a:d_tip2', { bosniak: 0.20, serb: 0.55, croat: 0.25 }],
            ['op:a:d_tip3', { bosniak: 0.20, serb: 0.60, croat: 0.20 }],
            ['op:a:d_tip4', { bosniak: 0.25, serb: 0.50, croat: 0.25 }],
        ]);

        const result = analyzeFrontGeometry(
            'RS',
            SINGLE_NECK_FACTION,
            [...SINGLE_NECK_ENEMY],
            [],
            adj,
            ethnicMap,
        );

        // Should detect one own salient with neck at op:a:neck
        expect(result.own_salients.length).toBe(1);

        // Neck should be ethnically critical (70% Serb > 40% threshold)
        const neckHold = result.critical_holds.find(h => h.osid === 'op:a:neck');
        expect(neckHold).toBeDefined();
        expect(neckHold!.reason).toBe('ethnic_hold');
        expect(neckHold!.priority).toBe(100);
    });

    it('marks salient neck as structural hold when no ethnic majority', () => {
        const adj = buildSingleNeckSalient();

        const ethnicMap: OsidEthnicComposition = new Map([
            ['op:a:neck', { bosniak: 0.40, serb: 0.30, croat: 0.30 }],
        ]);

        const result = analyzeFrontGeometry(
            'RS',
            SINGLE_NECK_FACTION,
            [...SINGLE_NECK_ENEMY],
            [],
            adj,
            ethnicMap,
        );

        const neckHold = result.critical_holds.find(h => h.osid === 'op:a:neck');
        expect(neckHold).toBeDefined();
        expect(neckHold!.reason).toBe('salient_neck');
        expect(neckHold!.priority).toBe(60);
    });

    it('detects enemy salients for offensive exploitation', () => {
        // Same topology pattern but enemy has the salient.
        // "a_" prefix for enemy main body, "d_" prefix for enemy bulge.
        // Our faction OSIDs surround the enemy bulge.
        const adj = buildAdj([
            // Enemy main body
            ['op:e:a_rear1', 'op:e:a_rear2'],
            ['op:e:a_rear2', 'op:e:neck'],
            // Enemy neck → enemy bulge
            ['op:e:neck', 'op:e:d_tip1'],
            ['op:e:neck', 'op:e:d_tip3'],
            ['op:e:d_tip1', 'op:e:d_tip2'],
            ['op:e:d_tip1', 'op:e:d_tip3'],
            ['op:e:d_tip3', 'op:e:d_tip4'],
            ['op:e:d_tip2', 'op:e:d_tip4'],
            // Our faction adjacency to enemy bulge
            ['op:e:d_tip1', 'op:f:f1'],
            ['op:e:d_tip2', 'op:f:f2'],
            ['op:e:d_tip3', 'op:f:f3'],
            ['op:e:d_tip4', 'op:f:f4'],
            ['op:e:neck', 'op:f:f5'],
        ]);

        const result = analyzeFrontGeometry(
            'RS',
            ['op:f:f1', 'op:f:f2', 'op:f:f3', 'op:f:f4', 'op:f:f5'],
            [
                'op:e:a_rear1', 'op:e:a_rear2', 'op:e:neck',
                'op:e:d_tip1', 'op:e:d_tip2', 'op:e:d_tip3', 'op:e:d_tip4',
            ],
            ['op:e:neck'], // targeting the neck
            adj,
            null,
        );

        expect(result.enemy_salients.length).toBe(1);
        expect(result.enemy_salients[0]!.neck_osids).toContain('op:e:neck');
        expect(result.enemy_salients[0]!.side).toBe('enemy');
    });
});
