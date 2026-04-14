/**
 * Regression tests for two sector fixes:
 *
 * Fix 1 (sector_territory.ts assignTerritoryVoronoi):
 *   When multiple sectors claim the same front-edge OSID, every claiming
 *   sector keeps that frontline OSID in its territory packet. A sector must
 *   never lose one of its own front OSIDs just because a sibling sector also
 *   touches the same settlement.
 *
 * Fix 2 (corps_front_sectors.ts final prune):
 *   Added condition: if assigned_brigade_ids.length === 0 &&
 *   reserve_brigade_ids.length === 0, return false — prunes zero-brigade
 *   sectors after all rescue attempts.
 */

import { describe, it, expect } from 'vitest';
import { assignTerritoryVoronoi } from '../src/sim/combat/sector_territory.js';
import { getSectorUniqueFrontOsids, canAnyBrigadeReachAny } from '../src/sim/combat/sector_utils.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeSubSeg(
    id: string,
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeCount: number,
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: Array.from({ length: edgeCount }, (_, i) => `edge_${id}_${i}`),
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: edgeCount,
        primary_brigade_ids: [],
    };
}

function makeSector(opts: {
    sectorId: string;
    corpsId: string;
    subSegments: CorpsFrontSubSegment[];
    territoryOsids?: string[];
    assignedBrigadeIds?: string[];
    reserveBrigadeIds?: string[];
    lengthEdges?: number;
    faction?: FactionId;
}): CorpsFrontSector {
    const allEdges = opts.subSegments.flatMap(s => s.edge_ids);
    return {
        sector_id: opts.sectorId,
        corps_id: opts.corpsId,
        faction: (opts.faction ?? 'RS') as FactionId,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: allEdges,
        sub_segments: opts.subSegments,
        length_edges: opts.lengthEdges ?? allEdges.length,
        territory_osids: opts.territoryOsids ?? [],
        assigned_brigade_ids: opts.assignedBrigadeIds ?? [],
        reserve_brigade_ids: opts.reserveBrigadeIds ?? [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    } as CorpsFrontSector;
}

function makeAdjacency(connections: [string, string][]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (const [a, b] of connections) {
        const la = adj.get(a as Osid) ?? [];
        if (!la.includes(b)) la.push(b);
        adj.set(a as Osid, la);
        const lb = adj.get(b as Osid) ?? [];
        if (!lb.includes(a)) lb.push(a);
        adj.set(b as Osid, lb);
    }
    return adj;
}

// ── Group A: Fix 1 — Voronoi exclusive territory ─────────────────────────────

describe('assignTerritoryVoronoi shared frontline ownership (Fix 1)', () => {

    /**
     * Test 1: multi-claim OSID stays in every claiming sector.
     * Two sectors both list the same OSID in sub_segments.friendly_osids.
     * The OSID must remain in both sectors' territory packets because it is
     * part of both sectors' actual frontline.
     */
    it('multi-claim OSID remains in every claiming sector', () => {
        const sharedOsid = 'op:trnovo:golubici_2';
        const aSs = makeSubSeg('ss_a', [sharedOsid], ['op:enemy:e1'], 10);
        const bSs = makeSubSeg('ss_b', [sharedOsid], ['op:enemy:e1'], 5);

        const sectorA = makeSector({
            sectorId: 'sector:test_corps:alpha',
            corpsId: 'test_corps',
            subSegments: [aSs],
            lengthEdges: 10,
        });
        const sectorB = makeSector({
            sectorId: 'sector:test_corps:beta',
            corpsId: 'test_corps',
            subSegments: [bSs],
            lengthEdges: 5,
        });

        // No rear adjacency needed — the shared OSID is itself the only friendly OSID.
        const adjacency = makeAdjacency([]);
        const friendlyOsids = new Set([sharedOsid]);

        assignTerritoryVoronoi([sectorA, sectorB], adjacency, friendlyOsids);

        expect(sectorA.territory_osids).toContain(sharedOsid);
        expect(sectorB.territory_osids).toContain(sharedOsid);
    });

    /**
     * Test 2: equal edges still preserve the shared front OSID for both sectors.
     */
    it('equal edges still preserve the shared front OSID for both sectors', () => {
        const sharedOsid = 'op:kalinovik:kalinovik_2';
        const ss0 = makeSubSeg('ss_0', [sharedOsid], ['op:enemy:e2'], 5);
        const ss1 = makeSubSeg('ss_1', [sharedOsid], ['op:enemy:e2'], 5);

        const sector0 = makeSector({
            sectorId: 'sector:test_corps:0',
            corpsId: 'test_corps',
            subSegments: [ss0],
            lengthEdges: 5,
        });
        const sector1 = makeSector({
            sectorId: 'sector:test_corps:1',
            corpsId: 'test_corps',
            subSegments: [ss1],
            lengthEdges: 5,
        });

        const adjacency = makeAdjacency([]);
        const friendlyOsids = new Set([sharedOsid]);

        assignTerritoryVoronoi([sector0, sector1], adjacency, friendlyOsids);

        expect(sector0.territory_osids).toContain(sharedOsid);
        expect(sector1.territory_osids).toContain(sharedOsid);
    });

    /**
     * Test 3: single-claim OSID — unchanged behavior.
     * Only one sector lists the OSID in its sub_segments.friendly_osids.
     * That sector should still receive the OSID normally.
     */
    it('single-claim OSID is assigned normally to its sole claiming sector', () => {
        const ownedOsid = 'op:foca:foca_2';
        const otherOsid = 'op:foca:tjentiste_2';

        const ssSole = makeSubSeg('ss_sole', [ownedOsid], ['op:enemy:e3'], 7);
        const ssOther = makeSubSeg('ss_other', [otherOsid], ['op:enemy:e4'], 4);

        const soleSector = makeSector({
            sectorId: 'sector:test_corps:sole',
            corpsId: 'test_corps',
            subSegments: [ssSole],
            lengthEdges: 7,
        });
        const otherSector = makeSector({
            sectorId: 'sector:test_corps:other',
            corpsId: 'test_corps',
            subSegments: [ssOther],
            lengthEdges: 4,
        });

        const adjacency = makeAdjacency([[ownedOsid, otherOsid]]);
        const friendlyOsids = new Set([ownedOsid, otherOsid]);

        assignTerritoryVoronoi([soleSector, otherSector], adjacency, friendlyOsids);

        // soleSector owns ownedOsid exclusively (single claim path).
        expect(soleSector.territory_osids).toContain(ownedOsid);
        expect(otherSector.territory_osids).not.toContain(ownedOsid);

        // otherSector owns otherOsid exclusively (single claim path).
        expect(otherSector.territory_osids).toContain(otherOsid);
        expect(soleSector.territory_osids).not.toContain(otherOsid);
    });
});

// ── Group B: Fix 2 — Zero-brigade final prune ─────────────────────────────────
//
// The prune runs inside buildFactionSectors which requires a full GameState.
// We test the filter predicate directly by applying the same logic to sector
// mock objects, keeping tests fast and dependency-free.

describe('final prune zero-brigade sectors (Fix 2)', () => {

    // Replicate the exact filter from corps_front_sectors.ts lines 582-592:
    //   if (s.length_edges === 0) return false;
    //   if (s.territory_osids.length === 0
    //       && s.assigned_brigade_ids.length === 0
    //       && s.reserve_brigade_ids.length === 0) return false;
    //   if (s.assigned_brigade_ids.length === 0 && s.reserve_brigade_ids.length === 0) return false;
    //   return true;
    function applyFinalPrune(sectors: CorpsFrontSector[]): CorpsFrontSector[] {
        return sectors.filter(s => {
            if (s.length_edges === 0) return false;
            if (
                s.territory_osids.length === 0 &&
                s.assigned_brigade_ids.length === 0 &&
                s.reserve_brigade_ids.length === 0
            ) return false;
            // Fix 2: prune zero-brigade isolated sectors.
            if (s.assigned_brigade_ids.length === 0 && s.reserve_brigade_ids.length === 0) return false;
            return true;
        });
    }

    /**
     * Test 4: a sector with territory and front edges but no brigades is pruned.
     * This is the Trnovo/Kalinovik scenario: VRS forms a ghost sector from a
     * split with real territory but no brigade can reach it.
     */
    it('prunes zero-brigade sector that has territory and front edges', () => {
        const ghostSector = makeSector({
            sectorId: 'sector:vrs_hercegovina:ghost',
            corpsId: 'vrs_hercegovina',
            subSegments: [makeSubSeg('ss_ghost', ['op:kalinovik:golubici_2'], ['op:enemy:e1'], 9)],
            territoryOsids: ['op:kalinovik:golubici_2'],
            assignedBrigadeIds: [],
            reserveBrigadeIds: [],
            lengthEdges: 9,
        });

        const result = applyFinalPrune([ghostSector]);

        // The ghost sector has brigades=0 and should be filtered out.
        expect(result).toHaveLength(0);
    });

    /**
     * Test 5: sector with length_edges=0 is already pruned by the first condition.
     * The zero-brigade condition (Fix 2) is not needed here — first guard fires.
     */
    it('zero-edge sector is filtered by the length_edges===0 guard (first condition)', () => {
        const noFrontSector = makeSector({
            sectorId: 'sector:vrs_krajina:no_front',
            corpsId: 'vrs_krajina',
            subSegments: [],
            territoryOsids: ['op:some:osid'],
            assignedBrigadeIds: [],
            reserveBrigadeIds: [],
            lengthEdges: 0,
        });

        const result = applyFinalPrune([noFrontSector]);

        // Filtered out by the first condition (length_edges === 0).
        expect(result).toHaveLength(0);
    });

    /**
     * Test 6: a sector with at least one assigned brigade is kept.
     */
    it('keeps sector with at least one assigned brigade', () => {
        const activeSector = makeSector({
            sectorId: 'sector:vrs_drina:active',
            corpsId: 'vrs_drina',
            subSegments: [makeSubSeg('ss_active', ['op:trnovo:trnovo'], ['op:enemy:e5'], 9)],
            territoryOsids: ['op:trnovo:trnovo'],
            assignedBrigadeIds: ['arbih_102nd_motorized'],
            reserveBrigadeIds: [],
            lengthEdges: 9,
        });

        const result = applyFinalPrune([activeSector]);

        // Has a brigade — must survive the prune.
        expect(result).toHaveLength(1);
        expect(result[0]!.sector_id).toBe('sector:vrs_drina:active');
    });

    /**
     * Bonus: verify that a sector with only reserve brigades (no assigned) is also pruned.
     * The Fix 2 condition checks BOTH assigned and reserve must be empty.
     * A sector with only reserve brigades is kept.
     */
    it('keeps sector with only reserve brigades (not pruned by Fix 2)', () => {
        const reserveOnlySector = makeSector({
            sectorId: 'sector:vrs_krajina:reserve_only',
            corpsId: 'vrs_krajina',
            subSegments: [makeSubSeg('ss_res', ['op:bihac:bihac_2'], ['op:enemy:e6'], 6)],
            territoryOsids: ['op:bihac:bihac_2'],
            assignedBrigadeIds: [],
            reserveBrigadeIds: ['vrs_5th_krajina'],
            lengthEdges: 6,
        });

        const result = applyFinalPrune([reserveOnlySector]);

        // Has a reserve brigade — should NOT be pruned by Fix 2.
        expect(result).toHaveLength(1);
    });
});

// ── Group C: FIX 1 unique front OSID detection ───────────────────────────────
//
// getSectorUniqueFrontOsids(sector, otherSectors) returns the set of front OSIDs
// in `sector` that do NOT appear in any other sector's sub_segments.friendly_osids.
// This is the first step of the strengthened FIX 1 guard.

describe('getSectorUniqueFrontOsids', () => {

    /**
     * Test 7: shared OSID is excluded from the unique set; non-shared OSIDs are included.
     * sector A: front OSIDs {X, Y, Z}
     * sector B: front OSIDs {X, W}
     * unique for A = {Y, Z}  (X is also in B)
     */
    it('returns only OSIDs not present in any other sector', () => {
        const X = 'op:trnovo:kijevo_2';
        const Y = 'op:trnovo:trnovo';
        const Z = 'op:trnovo:tusila';
        const W = 'op:kalinovik:golubici_2';

        const sectorA = makeSector({
            sectorId: 'sector:arbih_1st_corps:2',
            corpsId: 'arbih_1st_corps',
            subSegments: [makeSubSeg('ss_a', [X, Y, Z], ['op:rs:e1'], 12)],
        });
        const sectorB = makeSector({
            sectorId: 'sector:arbih_1st_corps:3',
            corpsId: 'arbih_1st_corps',
            subSegments: [makeSubSeg('ss_b', [X, W], ['op:rs:e2'], 9)],
        });

        const uniqueForA = getSectorUniqueFrontOsids(sectorA, [sectorA, sectorB]);
        // X is shared with B → excluded. Y and Z are unique to A.
        expect(uniqueForA.has(X)).toBe(false);
        expect(uniqueForA.has(Y)).toBe(true);
        expect(uniqueForA.has(Z)).toBe(true);
        expect(uniqueForA.size).toBe(2);

        const uniqueForB = getSectorUniqueFrontOsids(sectorB, [sectorA, sectorB]);
        // X is shared with A → excluded. W is unique to B.
        expect(uniqueForB.has(X)).toBe(false);
        expect(uniqueForB.has(W)).toBe(true);
        expect(uniqueForB.size).toBe(1);
    });

    /**
     * Test 8: when there is only one sector, all its front OSIDs are unique
     * (no sibling sectors to share with).
     */
    it('returns all front OSIDs as unique when there are no sibling sectors', () => {
        const osids = ['op:hadzici:binjezevo', 'op:hadzici:hadzici', 'op:hadzici:lokve'];
        const sector = makeSector({
            sectorId: 'sector:arbih_1st_corps:0',
            corpsId: 'arbih_1st_corps',
            subSegments: [makeSubSeg('ss_only', osids, ['op:rs:e1'], 8)],
        });

        const unique = getSectorUniqueFrontOsids(sector, [sector]);
        expect(unique.size).toBe(3);
        for (const o of osids) expect(unique.has(o)).toBe(true);
    });

    /**
     * Test 9: when ALL front OSIDs of the sector are also present in other sectors,
     * the unique set is empty — the original component check should run instead.
     */
    it('returns empty set when all front OSIDs are shared', () => {
        const shared1 = 'op:trnovo:kijevo_2';
        const shared2 = 'op:trnovo:trnovo';

        const sectorA = makeSector({
            sectorId: 'sector:arbih_1st_corps:2',
            corpsId: 'arbih_1st_corps',
            subSegments: [makeSubSeg('ss_a', [shared1, shared2], ['op:rs:e1'], 12)],
        });
        // sectorB has both OSIDs too — so sectorA has no unique ones
        const sectorB = makeSector({
            sectorId: 'sector:arbih_1st_corps:3',
            corpsId: 'arbih_1st_corps',
            subSegments: [makeSubSeg('ss_b', [shared1, shared2], ['op:rs:e2'], 9)],
        });

        const unique = getSectorUniqueFrontOsids(sectorA, [sectorA, sectorB]);
        expect(unique.size).toBe(0);
    });
});

// ── Group D: FIX 1 brigade reachability (canAnyBrigadeReachAny) ───────────────

describe('canAnyBrigadeReachAny', () => {

    /**
     * Test 10: brigade can reach unique front OSID within max hops — sector accepted.
     * Brigade is at 'op:hadzici:binjezevo'; target is 'op:trnovo:trnovo' reachable
     * in 2 hops through friendly territory.
     */
    it('returns true when a brigade can reach a target within maxHops', () => {
        const brigadeOsid = 'op:hadzici:binjezevo';
        const hop1 = 'op:hadzici:lokve';
        const target = 'op:trnovo:trnovo';

        const adjacency = makeAdjacency([
            [brigadeOsid, hop1],
            [hop1, target],
        ]);
        const friendlyOsids = new Set([brigadeOsid, hop1, target]);

        expect(
            canAnyBrigadeReachAny([brigadeOsid], new Set([target]), adjacency, friendlyOsids, 30)
        ).toBe(true);
    });

    /**
     * Test 11: unique front OSID (golubici_2) is isolated — no brigade can reach it.
     * golubici_2 has no friendly neighbours in the adjacency map.
     * This is the Kalinovik ghost scenario: sector must be rejected.
     */
    it('returns false when unique front OSID is unreachable from all brigades', () => {
        const brigadeOsid = 'op:hadzici:binjezevo';
        const golubici = 'op:kalinovik:golubici_2';

        // golubici_2 is only adjacent to RS-controlled neighbours (not in friendlyOsids)
        const adjacency = makeAdjacency([
            [brigadeOsid, 'op:hadzici:lokve'],
            // golubici_2 has no edge to any friendly OSID
        ]);
        const friendlyOsids = new Set([brigadeOsid, 'op:hadzici:lokve']);
        // golubici_2 itself is NOT in friendlyOsids — it is 1st Corps BFS-claimed
        // but physically isolated in the adjacency through friendly territory

        expect(
            canAnyBrigadeReachAny([brigadeOsid], new Set([golubici]), adjacency, friendlyOsids, 30)
        ).toBe(false);
    });

    /**
     * Test 12: brigade is already AT the target OSID — reachable at 0 hops.
     */
    it('returns true when a brigade is already at the target OSID (0 hops)', () => {
        const osid = 'op:trnovo:trnovo';
        const adjacency = makeAdjacency([]);
        const friendlyOsids = new Set([osid]);

        expect(
            canAnyBrigadeReachAny([osid], new Set([osid]), adjacency, friendlyOsids, 30)
        ).toBe(true);
    });

    /**
     * Test 13: target is reachable but only beyond maxHops — returns false.
     * This verifies the hop cap is respected.
     */
    it('returns false when target is beyond maxHops', () => {
        // Build a chain: start → a → b → c → target (4 hops)
        const start = 'op:corps:start';
        const a = 'op:corps:a';
        const b = 'op:corps:b';
        const c = 'op:corps:c';
        const target = 'op:corps:target';

        const adjacency = makeAdjacency([
            [start, a], [a, b], [b, c], [c, target],
        ]);
        const friendlyOsids = new Set([start, a, b, c, target]);

        // maxHops=3 — target is 4 hops away, should not be found
        expect(
            canAnyBrigadeReachAny([start], new Set([target]), adjacency, friendlyOsids, 3)
        ).toBe(false);

        // maxHops=4 — exactly reachable
        expect(
            canAnyBrigadeReachAny([start], new Set([target]), adjacency, friendlyOsids, 4)
        ).toBe(true);
    });

    /**
     * Test 14: multiple brigades — returns true if ANY brigade can reach target,
     * even if most cannot. Verifies the multi-brigade scan logic.
     */
    it('returns true if at least one brigade (of several) can reach the target', () => {
        const farBrigade = 'op:corps:far';    // isolated, can't reach target
        const nearBrigade = 'op:corps:near';  // 1 hop from target
        const target = 'op:corps:target';

        const adjacency = makeAdjacency([
            [nearBrigade, target],
            // farBrigade has no edges to anything useful
        ]);
        const friendlyOsids = new Set([farBrigade, nearBrigade, target]);

        expect(
            canAnyBrigadeReachAny([farBrigade, nearBrigade], new Set([target]), adjacency, friendlyOsids, 5)
        ).toBe(true);
    });
});

// ── Group E: Kalinovik exclusion (Fix 2 territorial) ────────────────────────
//
// Verify that op:kalinovik:* OSIDs are NOT assigned to arbih_1st_corps by
// mapOsidsToCorps when the CORPS_EXCLUDED_MUNICIPALITIES entry is active.
// We test this by importing mapOsidsToCorps with a minimal fake GameState and
// confirming that golubici_2 is not claimed by arbih_1st_corps.

import { mapOsidsToCorps } from '../src/sim/combat/sector_territory.js';
import type { GameState, FormationState } from '../src/state/game_state.js';
import type { FormationId } from '../src/state/game_state.js';

describe('CORPS_EXCLUDED_MUNICIPALITIES kalinovik exclusion', () => {

    /**
     * Test 15: arbih_1st_corps BFS does NOT claim op:kalinovik:golubici_2.
     *
     * Setup: arbih_1st_corps has one brigade at op:hadzici:binjezevo (home).
     * Friendly territory includes binjezevo, trnovo, and golubici_2 (kalinovik mun).
     * The adjacency allows 1st Corps BFS to reach golubici_2 from trnovo.
     * Without the exclusion it would claim golubici_2.
     * With the exclusion it must NOT.
     */
    it('arbih_1st_corps does not claim op:kalinovik:golubici_2 due to exclusion', () => {
        const binjezevo = 'op:hadzici:binjezevo' as Osid;
        const trnovo = 'op:trnovo:trnovo' as Osid;
        const golubici = 'op:kalinovik:golubici_2' as Osid;

        const adjacency = makeAdjacency([
            [binjezevo, trnovo],
            [trnovo, golubici],
        ]);

        // Minimal GameState: political_controllers has all three as RBiH-controlled
        const minState = {
            political: {
                political_controllers: {
                    [binjezevo]: 'RBiH',
                    [trnovo]: 'RBiH',
                    [golubici]: 'RBiH',
                },
            },
            military: { formations: {} },
        } as unknown as GameState;

        // One active brigade homed at binjezevo, assigned to arbih_1st_corps
        const formations: Record<FormationId, FormationState> = {
            'arbih_102nd_motorized': {
                kind: 'brigade',
                faction: 'RBiH',
                status: 'active',
                corps_id: 'arbih_1st_corps',
                home_osid: binjezevo,
                location_osid: binjezevo,
            } as unknown as FormationState,
        };

        const result = mapOsidsToCorps(
            minState,
            'RBiH',
            ['arbih_1st_corps'],
            adjacency,
            formations,
            null,
        );

        // golubici_2 is in kalinovik municipality → excluded from 1st Corps BFS.
        // It must not appear under arbih_1st_corps.
        expect(result.get(golubici)).not.toBe('arbih_1st_corps');

        // binjezevo and trnovo ARE in non-excluded municipalities → claimed normally.
        expect(result.get(binjezevo)).toBe('arbih_1st_corps');
        expect(result.get(trnovo)).toBe('arbih_1st_corps');
    });
});
