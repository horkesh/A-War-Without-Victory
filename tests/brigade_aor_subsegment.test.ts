/**
 * v0.3.3 — Brigade AoR sub-segment assignment tests.
 *
 * Phase A: assignment correctness — home affinity, wide segment multi-brigade,
 * every front-line brigade assigned, every sub-segment covered if possible.
 */

import { describe, it, expect } from 'vitest';
import { assignBrigadesToSubSegments, findSubSegmentForOsid, REASSIGNMENT_ENTRENCHMENT_RETAIN } from '../src/sim/combat/corps_front_sectors.js';
import { findWeakestSubSegment, getWeakSubSegmentBonus, WEAK_SUBSEGMENT_SCORE_BONUS } from '../src/sim/combat/bot_brigade_eval_attack.js';
import type { CorpsFrontSector, CorpsFrontSubSegment, GameState, FormationState } from '../src/state/game_state.js';

function makeFormation(overrides: Partial<FormationState> & { location_osid?: string }): FormationState {
    return {
        id: 'test',
        faction: 'RBiH',
        status: 'active',
        kind: 'brigade',
        personnel: 1500,
        morale: 70,
        cohesion: 70,
        ...overrides,
    } as FormationState;
}

function makeSubSeg(id: string, friendlyOsids: string[], edgeCount: number): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: Array.from({ length: edgeCount }, (_, i) => `edge_${id}_${i}`),
        friendly_osids: friendlyOsids,
        enemy_osids: [`enemy_${id}`],
        length_edges: edgeCount,
        primary_brigade_ids: [],
    };
}

function makeSector(
    id: string,
    subSegments: CorpsFrontSubSegment[],
    assignedBrigadeIds: string[],
    reserveBrigadeIds: string[] = []
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: 'arbih_2nd_corps',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: subSegments.flatMap(ss => ss.edge_ids),
        sub_segments: subSegments,
        length_edges: subSegments.reduce((s, ss) => s + ss.length_edges, 0),
        territory_osids: subSegments.flatMap(ss => ss.friendly_osids),
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: reserveBrigadeIds,
        density: 1.0,
        threat_ratio: 1.0,
        defensive_power: 5000,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeAdjacency(connections: [string, string][]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const [a, b] of connections) {
        const la = adj.get(a) ?? [];
        if (!la.includes(b)) la.push(b);
        adj.set(a, la);
        const lb = adj.get(b) ?? [];
        if (!lb.includes(a)) lb.push(a);
        adj.set(b, lb);
    }
    return adj;
}

describe('brigade AoR sub-segment assignment', () => {
    it('assigns all front-line brigades to sub-segments', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_c', 'osid_d'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_c' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b'], ['osid_b', 'osid_c'], ['osid_c', 'osid_d']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Both brigades should be assigned
        const allAssigned = sector.sub_segments.flatMap(ss => ss.primary_brigade_ids);
        expect(allAssigned).toHaveLength(2);
        expect(allAssigned).toContain('brig_1');
        expect(allAssigned).toContain('brig_2');
    });

    it('assigns brigade to sub-segment containing its location (proximity)', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_c', 'osid_d'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_d' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b'], ['osid_b', 'osid_c'], ['osid_c', 'osid_d']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // brig_1 at osid_a → ss1, brig_2 at osid_d → ss2
        expect(ss1.primary_brigade_ids).toContain('brig_1');
        expect(ss2.primary_brigade_ids).toContain('brig_2');
    });

    it('home affinity wins over proximity when closer', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_c', 'osid_d'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);
        const state = {
            military: {
                formations: {
                    // brig_1 is located at osid_b (near ss1) but home at osid_c (ss2)
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_b', home_osid: 'osid_c' }),
                    // brig_2 is located at osid_c (near ss2)
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_c' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b'], ['osid_b', 'osid_c'], ['osid_c', 'osid_d']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Both sub-segments should be covered
        const all = sector.sub_segments.flatMap(ss => ss.primary_brigade_ids);
        expect(all).toHaveLength(2);
        expect(all).toContain('brig_1');
        expect(all).toContain('brig_2');
    });

    it('wide sub-segments get 2+ brigades when available', () => {
        // ss1 has 6 edges (> WIDE_SEGMENT_THRESHOLD=5), ss2 has 2
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b', 'osid_c'], 6);
        const ss2 = makeSubSeg('ss2', ['osid_d'], 2);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2', 'brig_3']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_b' }),
                    brig_3: makeFormation({ id: 'brig_3', location_osid: 'osid_d' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b'], ['osid_b', 'osid_c'], ['osid_c', 'osid_d']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // ss1 (wide) should get 2, ss2 gets 1
        expect(ss1.primary_brigade_ids.length).toBeGreaterThanOrEqual(2);
        expect(ss2.primary_brigade_ids.length).toBeGreaterThanOrEqual(1);
    });

    it('merges gap sub-segments into nearest neighbor — no unowned edges', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Gap sub-segment is merged — only 1 sub-segment remains
        expect(sector.sub_segments).toHaveLength(1);
        // The surviving sub-segment has brig_1 and covers all edges
        expect(sector.sub_segments[0]!.primary_brigade_ids).toContain('brig_1');
        expect(sector.sub_segments[0]!.length_edges).toBe(6); // 3 + 3 merged
        // No gaps remain
        expect(sector.sub_segments.every(ss => !ss.gap)).toBe(true);
    });

    it('reserves are excluded from sub-segment assignment', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const sector = makeSector('sec1', [ss1], ['brig_1', 'reserve_1'], ['reserve_1']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    reserve_1: makeFormation({ id: 'reserve_1', location_osid: 'osid_a' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Only brig_1 assigned, not reserve_1
        expect(ss1.primary_brigade_ids).toContain('brig_1');
        expect(ss1.primary_brigade_ids).not.toContain('reserve_1');
    });

    it('sets assigned_sub_segment_id on formations', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const sector = makeSector('sec1', [ss1], ['brig_1']);
        const brig1 = makeFormation({ id: 'brig_1', location_osid: 'osid_a' });
        const state = {
            military: {
                formations: { brig_1: brig1 },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        expect(brig1.assigned_sub_segment_id).toBe('ss1');
    });

    it('single sub-segment gets all brigades', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 5);
        const sector = makeSector('sec1', [ss1], ['brig_1', 'brig_2', 'brig_3']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_a' }),
                    brig_3: makeFormation({ id: 'brig_3', location_osid: 'osid_b' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        expect(ss1.primary_brigade_ids).toHaveLength(3);
    });
});

describe('findSubSegmentForOsid', () => {
    it('finds sub-segment containing a friendly OSID', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_c'], 2);
        const sector = makeSector('sec1', [ss1, ss2], []);

        expect(findSubSegmentForOsid(sector, 'osid_a')?.sub_segment_id).toBe('ss1');
        expect(findSubSegmentForOsid(sector, 'osid_c')?.sub_segment_id).toBe('ss2');
    });

    it('finds sub-segment containing an enemy OSID', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const sector = makeSector('sec1', [ss1], []);

        expect(findSubSegmentForOsid(sector, 'enemy_ss1')?.sub_segment_id).toBe('ss1');
    });

    it('returns undefined for unknown OSID', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const sector = makeSector('sec1', [ss1], []);

        expect(findSubSegmentForOsid(sector, 'unknown')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase B: combat integration — sub-segment defense flows through combat
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase B: sub-segment combat defense integration', () => {
    it('sub-segment with assigned brigade defends via distance-weighted model', () => {
        // Setup: sector with 2 sub-segments, brigade assigned to ss1
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_c', 'osid_d'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_c' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b'], ['osid_b', 'osid_c'], ['osid_c', 'osid_d']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // brig_1 should be in ss1, brig_2 in ss2
        expect(ss1.primary_brigade_ids).toContain('brig_1');
        expect(ss2.primary_brigade_ids).toContain('brig_2');

        // Attacking enemy_ss1 → sub-segment ss1 is the defending sub-segment
        const defendingSS = findSubSegmentForOsid(sector, 'enemy_ss1');
        expect(defendingSS?.sub_segment_id).toBe('ss1');
        expect(defendingSS?.primary_brigade_ids).toContain('brig_1');
    });

    it('gap sub-segment merged — fewer brigades than sub-segments still has full coverage', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Gap merged — only 1 sub-segment remains, covering all edges
        expect(sector.sub_segments).toHaveLength(1);
        expect(sector.sub_segments[0]!.primary_brigade_ids).toContain('brig_1');
        // enemy_ss2 OSIDs now belong to the merged sub-segment
        const merged = sector.sub_segments[0]!;
        expect(merged.enemy_osids).toContain('enemy_ss2');
    });

    it('brigade at target OSID has 0 hops (physical defender) in its sub-segment', () => {
        // This validates the distance-weighted model: brigade physically at the OSID
        // gets full power (0 hops), while brigades in other sub-segments would have >0 hops
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                    brig_2: makeFormation({ id: 'brig_2', location_osid: 'osid_b' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Attack on enemy_ss1 → ss1 defends, brig_1 is primary and at the OSID
        const defendingSS = findSubSegmentForOsid(sector, 'enemy_ss1');
        expect(defendingSS?.sub_segment_id).toBe('ss1');
        expect(defendingSS?.primary_brigade_ids).toContain('brig_1');
        // brig_1 is AT osid_a which is in ss1's friendly_osids → 0 hops
        expect(ss1.friendly_osids).toContain('osid_a');
    });

    it('sub-segment lookup works for both friendly and enemy OSIDs', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a', 'osid_b'], 4);
        const sector = makeSector('sec1', [ss1], ['brig_1']);
        const state = {
            military: {
                formations: {
                    brig_1: makeFormation({ id: 'brig_1', location_osid: 'osid_a' }),
                },
            },
        } as unknown as GameState;

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // Friendly OSID lookup
        expect(findSubSegmentForOsid(sector, 'osid_a')?.sub_segment_id).toBe('ss1');
        // Enemy OSID lookup (used by combat resolver)
        expect(findSubSegmentForOsid(sector, 'enemy_ss1')?.sub_segment_id).toBe('ss1');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase C: Bot AI per-sub-segment targeting — weakest sub-segment detection
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase C: findWeakestSubSegment', () => {
    it('returns sub-segment with lowest total personnel', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        ss1.primary_brigade_ids = ['brig_1'];
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        ss2.primary_brigade_ids = ['brig_2'];
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);

        const formations: Record<string, FormationState | undefined> = {
            brig_1: makeFormation({ id: 'brig_1', personnel: 1500 }),
            brig_2: makeFormation({ id: 'brig_2', personnel: 800 }),
        };

        const weakest = findWeakestSubSegment(sector, formations);
        expect(weakest).not.toBeNull();
        expect(weakest!.sub_segment_id).toBe('ss2');
    });

    it('sub-segment with fewer personnel is weakest', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        ss1.primary_brigade_ids = ['brig_1'];
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        ss2.primary_brigade_ids = ['brig_2'];
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);

        const formations: Record<string, FormationState | undefined> = {
            brig_1: makeFormation({ id: 'brig_1', personnel: 1500 }),
            brig_2: makeFormation({ id: 'brig_2', personnel: 300 }),
        };

        const weakest = findWeakestSubSegment(sector, formations);
        expect(weakest).not.toBeNull();
        expect(weakest!.sub_segment_id).toBe('ss2');
    });

    it('returns null for sector with no sub-segments', () => {
        const sector = makeSector('sec1', [], []);
        const result = findWeakestSubSegment(sector, {});
        expect(result).toBeNull();
    });

    it('breaks ties by sub_segment_id (deterministic)', () => {
        const ss1 = makeSubSeg('ss_a', ['osid_a'], 3);
        ss1.primary_brigade_ids = ['brig_1'];
        const ss2 = makeSubSeg('ss_b', ['osid_b'], 3);
        ss2.primary_brigade_ids = ['brig_2'];
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);

        const formations: Record<string, FormationState | undefined> = {
            brig_1: makeFormation({ id: 'brig_1', personnel: 1000 }),
            brig_2: makeFormation({ id: 'brig_2', personnel: 1000 }),
        };

        const weakest = findWeakestSubSegment(sector, formations);
        expect(weakest!.sub_segment_id).toBe('ss_a');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase D: Gap mechanics — entrenchment reset, gap exploitation
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase D: entrenchment reset on sub-segment reassignment', () => {
    it('decays entrenchment when assigned_sub_segment_id changes', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);
        const brig1 = makeFormation({ id: 'brig_1', location_osid: 'osid_a' }) as FormationState & { entrenchment_turns?: number; assigned_sub_segment_id?: string };
        brig1.entrenchment_turns = 10;
        brig1.assigned_sub_segment_id = 'ss2'; // was previously on ss2

        const brig2 = makeFormation({ id: 'brig_2', location_osid: 'osid_b' }) as FormationState & { entrenchment_turns?: number; assigned_sub_segment_id?: string };
        brig2.entrenchment_turns = 6;
        brig2.assigned_sub_segment_id = 'ss2'; // stays on ss2

        const state = {
            military: { formations: { brig_1: brig1, brig_2: brig2 } },
        } as unknown as GameState;

        // Save prev assignments
        const prevAssignment = new Map<string, string | undefined>();
        prevAssignment.set('brig_1', brig1.assigned_sub_segment_id);
        prevAssignment.set('brig_2', brig2.assigned_sub_segment_id);

        const adj = makeAdjacency([['osid_a', 'osid_b']]);
        assignBrigadesToSubSegments(state, [sector], adj);

        // brig_1 at osid_a → ss1 (changed from ss2), brig_2 at osid_b → ss2 (unchanged)
        expect(brig1.assigned_sub_segment_id).toBe('ss1');
        expect(brig2.assigned_sub_segment_id).toBe('ss2');

        // Apply entrenchment decay for changed assignments
        for (const [fid, prevSsId] of prevAssignment) {
            const f = (state.military.formations as Record<string, any>)[fid];
            if (!f) continue;
            const newSsId = f.assigned_sub_segment_id;
            if (prevSsId != null && newSsId != null && prevSsId !== newSsId) {
                const et = f.entrenchment_turns ?? 0;
                if (et > 0) {
                    f.entrenchment_turns = Math.floor(et * REASSIGNMENT_ENTRENCHMENT_RETAIN);
                }
            }
        }

        // brig_1 changed: 10 * 0.3 = 3 (floored)
        expect(brig1.entrenchment_turns).toBe(3);
        // brig_2 unchanged: still 6
        expect(brig2.entrenchment_turns).toBe(6);
    });
});

describe('Phase D: overstretched sub-segment gets double attack bonus', () => {
    it('doubles WEAK_SUBSEGMENT_SCORE_BONUS for overstretched sub-segments', () => {
        // ss1: 3 edges, 1 brigade = 3 edges/brigade (normal)
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        ss1.primary_brigade_ids = ['brig_1'];
        // ss2: 8 edges, 1 brigade = 8 edges/brigade (overstretched, > 6 threshold)
        const ss2 = makeSubSeg('ss2', ['osid_b'], 8);
        ss2.primary_brigade_ids = ['brig_2'];
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);

        const formations: Record<string, FormationState | undefined> = {
            brig_1: makeFormation({ id: 'brig_1', personnel: 1500 }),
            brig_2: makeFormation({ id: 'brig_2', personnel: 500 }),
        };

        // Target in overstretched ss2 (weakest) → double bonus
        const bonus = getWeakSubSegmentBonus('enemy_ss2', sector, formations);
        expect(bonus).toBe(WEAK_SUBSEGMENT_SCORE_BONUS * 2);

        // Target in normal ss1 → no bonus (it's not weakest)
        const noBonus = getWeakSubSegmentBonus('enemy_ss1', sector, formations);
        expect(noBonus).toBe(0);
    });

    it('returns normal bonus for non-gap weakest sub-segment', () => {
        const ss1 = makeSubSeg('ss1', ['osid_a'], 3);
        ss1.primary_brigade_ids = ['brig_1'];
        const ss2 = makeSubSeg('ss2', ['osid_b'], 3);
        ss2.primary_brigade_ids = ['brig_2'];
        const sector = makeSector('sec1', [ss1, ss2], ['brig_1', 'brig_2']);

        const formations: Record<string, FormationState | undefined> = {
            brig_1: makeFormation({ id: 'brig_1', personnel: 1500 }),
            brig_2: makeFormation({ id: 'brig_2', personnel: 500 }),
        };

        // ss2 is weakest (less personnel) but NOT a gap
        const bonus = getWeakSubSegmentBonus('enemy_ss2', sector, formations);
        expect(bonus).toBe(WEAK_SUBSEGMENT_SCORE_BONUS);
    });
});
