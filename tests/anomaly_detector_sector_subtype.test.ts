/**
 * LANE-2026-05-02-B3-ANOMALY-SECTOR-SUBTYPE — Type A/B/C classification.
 *
 * /sector-expert Tier 1 finding on n1621: 3 empty sectors + 3 undefended
 * front subsegments are reported as a single warning each. The single
 * warning conflates distinct root causes:
 *   - Type A: brigade-pool-exhausted (the owning corps has 0 unassigned
 *             active brigades; pool is genuinely empty).
 *   - Type B: brigade-misallocated (the owning corps has 1+ unassigned
 *             active brigades; the gap could be filled by reassignment).
 *   - Type C: structural orphan (sub-segment exists with edges but no
 *             owning sector covers them — out of scope here; reserved
 *             for future iteration).
 *
 * This lane adds a `subtype` field on emitted reports so consumers can
 * route Type A → operations/formation-expert (replacement pool) vs Type B →
 * corps-army-commander (rebalance).
 *
 * Truth this test asserts:
 *   T1 — empty_contested_sector with corps having 0 unassigned brigades
 *        emits subtype='pool_exhausted'.
 *   T2 — empty_contested_sector with corps having 1+ unassigned brigades
 *        emits subtype='misallocated'.
 *   T3 — undefended_front_subsegments respect the same subtype split.
 *   T4 — When BOTH subtypes occur in one run, two distinct reports of the
 *        same type are emitted, each carrying its own subtype.
 *
 * Determinism: pure synchronous assertions over a hand-built minimal
 * GameState. No I/O, no async, no random, no timestamps.
 */

import { describe, it, expect } from 'vitest';
import { runAnomalyDetection } from '../src/scenario/anomaly_detector.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { AnomalyReport } from '../src/scenario/anomaly_types.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(input: {
    corpsBrigades: Record<string, number>; // corpsId -> active brigade count
    sectorOwners: Array<{ sectorId: string; corpsId: string; edgeCount: number; assigned: number; reserve: number; subSegments?: Array<{ subSegId: string; edgeCount: number; gap: boolean }> }>;
}): GameState {
    const formations: Record<string, any> = {};
    let bid = 0;
    for (const corpsId of Object.keys(input.corpsBrigades).sort()) {
        const count = input.corpsBrigades[corpsId];
        // Add the corps formation itself.
        formations[corpsId] = {
            id: corpsId, faction: 'RS', name: corpsId, created_turn: 0,
            status: 'active', assignment: null, kind: 'corps',
        };
        for (let i = 0; i < count; i++) {
            const id = `b_${corpsId}_${bid++}`;
            formations[id] = {
                id, faction: 'RS', name: id, created_turn: 0,
                status: 'active', assignment: null, kind: 'brigade',
                corps_id: corpsId, personnel: 1500, morale: 50, cohesion: 30,
            };
        }
    }

    const corpsCommand: Record<string, any> = {};
    const corpsFrontSectors: Record<string, any> = {};
    // Track which brigade ids are sector-assigned.
    const assignedAcrossSectors = new Set<string>();
    let assignedCounter = 0;
    const formationIdsByCorps: Record<string, string[]> = {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (f.kind !== 'brigade') continue;
        const cid = f.corps_id;
        if (!formationIdsByCorps[cid]) formationIdsByCorps[cid] = [];
        formationIdsByCorps[cid].push(fid);
    }
    for (const sec of input.sectorOwners) {
        const corpsBrigadeIds = formationIdsByCorps[sec.corpsId] ?? [];
        const assignedIds: string[] = [];
        const reserveIds: string[] = [];
        for (let i = 0; i < sec.assigned && assignedCounter + i < corpsBrigadeIds.length; i++) {
            const id = corpsBrigadeIds[assignedCounter + i];
            assignedIds.push(id);
            assignedAcrossSectors.add(id);
        }
        assignedCounter += sec.assigned;
        for (let i = 0; i < sec.reserve && assignedCounter + i < corpsBrigadeIds.length; i++) {
            const id = corpsBrigadeIds[assignedCounter + i];
            reserveIds.push(id);
            assignedAcrossSectors.add(id);
        }
        assignedCounter += sec.reserve;
        const subSegments = sec.subSegments?.map((s) => ({
            sub_segment_id: s.subSegId,
            edge_ids: Array.from({ length: s.edgeCount }, (_, k) => `${sec.sectorId}:e${k}`),
            gap: s.gap,
            // Other anomaly checks (e.g., detectRearBrigadesInSector) iterate
            // these fields; provide empty arrays to avoid crashes.
            friendly_osids: [],
            enemy_osids: [],
        })) ?? [];
        corpsFrontSectors[sec.sectorId] = {
            sector_id: sec.sectorId,
            corps_id: sec.corpsId,
            edge_ids: Array.from({ length: sec.edgeCount }, (_, k) => `${sec.sectorId}:e${k}`),
            assigned_brigade_ids: assignedIds,
            reserve_brigade_ids: reserveIds,
            sub_segments: subSegments,
            territory_osids: [],
        };
        if (!corpsCommand[sec.corpsId]) {
            corpsCommand[sec.corpsId] = {
                command_span: 1,
                subordinate_count: 1,
                og_slots: 0,
                active_ogs: [],
                corps_exhaustion: 0,
                stance: 'defensive',
                active_operations: [],
            };
        }
    }
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 1, phase: 'war', seed: 'b3-test' } as any,
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: corpsCommand,
            corps_front_sectors: corpsFrontSectors,
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
}

function findReports(reports: AnomalyReport[], type: string): AnomalyReport[] {
    return reports.filter((r) => r.type === type);
}

describe('LANE-B3 anomaly sector subtype classification', () => {
    it('T1 — empty_contested_sector with 0 unassigned brigades → subtype=pool_exhausted', () => {
        // Corps has exactly 2 brigades, both assigned to sector_a; sector_b is empty
        // and corps has no surplus brigades to fill it.
        const state = makeState({
            corpsBrigades: { vrs_drina: 2 },
            sectorOwners: [
                { sectorId: 'sector_a', corpsId: 'vrs_drina', edgeCount: 5, assigned: 2, reserve: 0 },
                { sectorId: 'sector_b', corpsId: 'vrs_drina', edgeCount: 5, assigned: 0, reserve: 0 },
            ],
        });
        const reports = runAnomalyDetection(state);
        const empties = findReports(reports, 'empty_contested_sector');
        expect(empties.length).toBeGreaterThan(0);
        const subtypes = empties.map((r) => r.subtype);
        expect(subtypes).toContain('pool_exhausted');
    });

    it('T2 — empty_contested_sector with surplus unassigned brigades → subtype=misallocated', () => {
        // Corps has 4 brigades; only 2 assigned. Sector_b empty AND corps has 2
        // unassigned brigades that could fill it.
        const state = makeState({
            corpsBrigades: { vrs_drina: 4 },
            sectorOwners: [
                { sectorId: 'sector_a', corpsId: 'vrs_drina', edgeCount: 5, assigned: 2, reserve: 0 },
                { sectorId: 'sector_b', corpsId: 'vrs_drina', edgeCount: 5, assigned: 0, reserve: 0 },
            ],
        });
        const reports = runAnomalyDetection(state);
        const empties = findReports(reports, 'empty_contested_sector');
        expect(empties.length).toBeGreaterThan(0);
        const subtypes = empties.map((r) => r.subtype);
        expect(subtypes).toContain('misallocated');
    });

    it('T3 — undefended_front_subsegments respect subtype split', () => {
        // Sector has a sub-segment with gap=true and >2 edges; corps has no surplus.
        const state = makeState({
            corpsBrigades: { vrs_drina: 2 },
            sectorOwners: [
                { sectorId: 'sector_a', corpsId: 'vrs_drina', edgeCount: 8, assigned: 2, reserve: 0,
                  subSegments: [
                      { subSegId: 'sector_a:0', edgeCount: 4, gap: true },
                      { subSegId: 'sector_a:1', edgeCount: 4, gap: false },
                  ] },
            ],
        });
        const reports = runAnomalyDetection(state);
        const gaps = findReports(reports, 'undefended_front_subsegments');
        expect(gaps.length).toBeGreaterThan(0);
        const subtypes = gaps.map((r) => r.subtype);
        expect(subtypes).toContain('pool_exhausted');
    });

    it('T4 — both subtypes coexist → two distinct reports per anomaly type', () => {
        // Two corps. vrs_drina is pool_exhausted (sector_b empty, no surplus).
        // vrs_krajina is misallocated (sector_d empty, surplus).
        const state = makeState({
            corpsBrigades: { vrs_drina: 2, vrs_krajina: 4 },
            sectorOwners: [
                { sectorId: 'sector_a', corpsId: 'vrs_drina', edgeCount: 5, assigned: 2, reserve: 0 },
                { sectorId: 'sector_b', corpsId: 'vrs_drina', edgeCount: 5, assigned: 0, reserve: 0 },
                { sectorId: 'sector_c', corpsId: 'vrs_krajina', edgeCount: 5, assigned: 2, reserve: 0 },
                { sectorId: 'sector_d', corpsId: 'vrs_krajina', edgeCount: 5, assigned: 0, reserve: 0 },
            ],
        });
        const reports = runAnomalyDetection(state);
        const empties = findReports(reports, 'empty_contested_sector');
        // Two distinct reports — one per subtype
        expect(empties.length).toBe(2);
        const subtypes = empties.map((r) => r.subtype).sort();
        expect(subtypes).toEqual(['misallocated', 'pool_exhausted']);
    });
});
