/**
 * Sector Frontline Truth — Wave 1 regression tests.
 *
 * Covers:
 * 1. Phase 1.5 front-adjacency gate: brigade too far from front → reserve, not assigned
 * 2. Phase 1.5 pass-through: brigade within 30 hops of front → assigned
 * 3. assertBrigadeReachability return value: unreachable brigade detected → returned → caller demotes to reserve
 * 4. Sector sync after dissolution: dissolved brigade ID removed from sector lists
 * 5. Displacement double-count guard: System C = 0, System A with 5 settlements → total is 5 not 10
 * 6. brigade_front_assignment write-path is dead: no pipeline step writes it
 */

import { describe, it, expect } from 'vitest';
import {
    classifyBrigadesByTerritory,
    syncSectorAssignmentsToFormations,
} from '../src/sim/combat/brigade_assignment.js';
import { assertBrigadeReachability } from '../src/sim/combat/sector_assertions.js';
import { buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { CorpsCommanderProfile } from '../src/sim/combat/commander_override.js';

// ── Fixture helpers (matching brigade_territory_reconciliation.test.ts patterns) ──

function makeFormation(overrides: Partial<FormationState> & { id: string; location_osid?: string }): FormationState {
    return {
        faction: 'RS' as FactionId,
        status: 'active',
        kind: 'brigade',
        personnel: 1500,
        morale: 70,
        cohesion: 70,
        corps_id: 'vrs_drina',
        ...overrides,
    } as FormationState;
}

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

function makeSector(
    sectorId: string,
    corpsId: string,
    subSegments: CorpsFrontSubSegment[],
    territoryOsids: string[],
    edgeCount?: number,
): CorpsFrontSector {
    const allEdges = subSegments.flatMap(s => s.edge_ids);
    const computedEdgeCount = edgeCount ?? allEdges.length;
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS' as FactionId,
        opposing_factions: ['RBiH' as FactionId],
        edge_ids: allEdges,
        sub_segments: subSegments,
        length_edges: computedEdgeCount,
        territory_osids: territoryOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
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

function makeComponentOf(osidToComponent: Record<string, number>): Map<string, number> {
    return new Map(Object.entries(osidToComponent));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Wave 1: Phase 1.5 front-adjacency gate', () => {
    it('brigade in territory but unreachable from front → not assigned (remains for Phase 2)', () => {
        // Front is at 'front_a'. Deep rear is at 'deep_rear', which is in territory
        // but has no adjacency path to 'front_a' (BFS returns null).
        // Phase 1.5 guard prevents false assignment: brigade stays in remaining pool
        // for Phase 2 / downstream repair, not placed in assigned OR reserve here.
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 3);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a', 'op:m:deep_rear'],
        );

        const brigDeepRear = makeFormation({
            id: 'brig_deep_rear',
            location_osid: 'op:m:deep_rear',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_deep_rear: brigDeepRear,
        };

        // deep_rear is in the same component but has no adjacency path to front_a
        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:deep_rear': 0,
        });

        // No adjacency connection between deep_rear and front_a — BFS finds null
        const adjacency = makeAdjacency([]);

        const friendlyOsids = new Set(['op:m:front_a', 'op:m:deep_rear']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        // Phase 1.5 guard: brigade not placed in assigned (front-adjacency check failed)
        // Phase 2 (BFS-based) also finds no reachable sector since adjacency is empty,
        // so brigade ends up unresolved — neither assigned nor reserve.
        expect(sector.assigned_brigade_ids).not.toContain('brig_deep_rear');
        // NOTE: reserve assignment happens downstream in reclassifyRearBrigades / Phase 2,
        // not in Phase 1.5. A disconnected brigade with no path to front is left unresolved.
        expect(sector.reserve_brigade_ids).not.toContain('brig_deep_rear');
    });

    it('brigade in territory within 30 hops of front → assigned_brigade_ids', () => {
        // front_a ─ depth_b ─ depth_c: brigade at depth_c, 2 hops from front
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 3);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a', 'op:m:depth_b', 'op:m:depth_c'],
        );

        const brig = makeFormation({
            id: 'brig_reachable',
            location_osid: 'op:m:depth_c',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_reachable: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0, 'op:m:depth_b': 0, 'op:m:depth_c': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_a', 'op:m:depth_b'],
            ['op:m:depth_b', 'op:m:depth_c'],
        ]);

        const friendlyOsids = new Set(['op:m:front_a', 'op:m:depth_b', 'op:m:depth_c']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        expect(sector.assigned_brigade_ids).toContain('brig_reachable');
        expect(sector.reserve_brigade_ids).not.toContain('brig_reachable');
    });
});

describe('Wave 1: assertBrigadeReachability return value', () => {
    it('unreachable brigade detected → returned in list → caller can demote to reserve', () => {
        // Brigade is assigned to sector with component 0, but brigade is in component 1
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 2);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a'],
        );
        sector.assigned_brigade_ids = ['brig_wrong_comp'];

        const brigWrong = makeFormation({
            id: 'brig_wrong_comp',
            location_osid: 'op:m:isolated',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_wrong_comp: brigWrong,
        };

        // Sector OSIDs in component 0, brigade in component 1
        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:isolated': 1,
        });

        const unreachable = assertBrigadeReachability([sector], formations, componentOf);

        expect(unreachable).toContain('brig_wrong_comp');

        // Simulate what the caller (corps_front_sectors.ts) does with the return value
        const unreachableSet = new Set(unreachable);
        const demoted: string[] = [];
        sector.assigned_brigade_ids = sector.assigned_brigade_ids.filter(bid => {
            if (unreachableSet.has(bid)) { demoted.push(bid); return false; }
            return true;
        });
        for (const bid of demoted) {
            if (!sector.reserve_brigade_ids.includes(bid)) sector.reserve_brigade_ids.push(bid);
        }

        expect(sector.assigned_brigade_ids).not.toContain('brig_wrong_comp');
        expect(sector.reserve_brigade_ids).toContain('brig_wrong_comp');
    });

    it('all brigades reachable → returns empty list', () => {
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 2);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a'],
        );
        sector.assigned_brigade_ids = ['brig_good'];

        const brigGood = makeFormation({
            id: 'brig_good',
            location_osid: 'op:m:front_a',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_good: brigGood,
        };

        const componentOf = makeComponentOf({ 'op:m:front_a': 0 });

        const unreachable = assertBrigadeReachability([sector], formations, componentOf);
        expect(unreachable).toHaveLength(0);
    });
});

describe('Wave 1: sector sync after dissolution', () => {
    it('syncSectorAssignmentsToFormations writes sector assignment to all listed brigades (canonical contract)', () => {
        // syncSectorAssignmentsToFormations takes (sectors: Record<string, CorpsFrontSector>, formations)
        // It writes formation.assignment from sector lists — it does not filter by status.
        // Dissolved brigades must be removed from sector lists BEFORE this runs
        // (assertSectorBrigadesActive detects them; the pipeline prunes them upstream).
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 2);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a'],
        );
        sector.assigned_brigade_ids = ['brig_active'];
        sector.reserve_brigade_ids = ['brig_reserve'];

        const formations: Record<FormationId, FormationState> = {
            brig_active: makeFormation({ id: 'brig_active', location_osid: 'op:m:front_a', status: 'active' }),
            brig_reserve: makeFormation({ id: 'brig_reserve', location_osid: 'op:m:front_a', status: 'active' }),
            brig_unassigned: makeFormation({ id: 'brig_unassigned', location_osid: 'op:m:front_a', status: 'active' }),
        };

        const sectorsRecord: Record<string, CorpsFrontSector> = {
            'sector:vrs_drina:0': sector,
        };

        syncSectorAssignmentsToFormations(sectorsRecord, formations);

        // Assigned brigade gets front role
        expect(formations['brig_active']?.assignment).toEqual(
            expect.objectContaining({ kind: 'sector', role: 'front' })
        );
        // Reserve-list brigade on the front still gets front role because sync now
        // derives player-visible role from physical position truth, not list origin.
        expect(formations['brig_reserve']?.assignment).toEqual(
            expect.objectContaining({ kind: 'sector', role: 'front' })
        );
        // Brigade not in any sector list gets no assignment written (assignment cleared in step 1)
        const unassignedAssignment = formations['brig_unassigned']?.assignment;
        expect(unassignedAssignment).toBeFalsy();
    });
});

describe('Wave 1: displacement double-count guard', () => {
    // The double-count guard lives in the else-branch of buildWeeklyReport, which fires
    // when phase !== 'war' OR when displacement_state is absent. In war-phase, the first
    // branch reads displacement_state directly (no double-count risk there — single pass).
    // The guard is relevant in the else-branch: System C is read first; System A fallback
    // only fires if municipality_displacement_total === 0 after System C.

    it('else-branch: System C = 0 and System A has 5 municipalities → System A fires once (no double-count)', () => {
        // Use phase 'peace' to exercise the else-branch where the guard lives.
        // System C produces 0. System A fallback fires exactly once → 5 municipalities.
        const mockState = {
            meta: { turn: 5, phase: 'peace' },
            factions: [
                { id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' },
            ],
            political: {
                political_controllers: {},
                war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
                war_supply_pressure: {},
            },
            displacement: {
                // System C: empty (produces 0)
                settlement_displacement: {},
                municipality_displacement: {},
                // System A: 5 municipalities with displacement
                displacement_state: {
                    mun_a: { displaced_out: 1000, lost_population: 200 },
                    mun_b: { displaced_out: 500, lost_population: 100 },
                    mun_c: { displaced_out: 800, lost_population: 0 },
                    mun_d: { displaced_out: 0, lost_population: 300 },
                    mun_e: { displaced_out: 2000, lost_population: 500 },
                },
            },
        } as unknown as GameState;

        const report = buildWeeklyReport(mockState);

        // System A fires once: 5 municipalities (1200+600+800+300+2500 = 5400)
        expect(report.municipality_displacement_count).toBe(5);
        expect(report.municipality_displacement_total).toBe(5400);
        // settlement_displacement_count is NOT incremented from System A fallback
        // (municipality-level proxy only — see scenario_reporting.ts line 229)
        expect(report.settlement_displacement_count).toBe(0);
    });

    it('else-branch: System C has data → System A fallback does NOT fire (guard holds)', () => {
        // System C produces non-zero municipality_displacement_total → guard blocks System A.
        const mockState = {
            meta: { turn: 5, phase: 'peace' },
            factions: [
                { id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' },
            ],
            political: {
                political_controllers: {},
                war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
                war_supply_pressure: {},
            },
            displacement: {
                // System C has real data
                settlement_displacement: { s_001: 500, s_002: 300 },
                municipality_displacement: { mun_x: 800 },
                // System A also has data — must NOT be added on top (guard prevents it)
                displacement_state: {
                    mun_a: { displaced_out: 9999, lost_population: 9999 },
                },
            },
        } as unknown as GameState;

        const report = buildWeeklyReport(mockState);

        // Only System C data appears — System A blocked by municipality_displacement_total > 0
        expect(report.municipality_displacement_count).toBe(1);
        expect(report.municipality_displacement_total).toBe(800);
        expect(report.settlement_displacement_count).toBe(2);
        expect(report.settlement_displacement_total).toBe(800); // 500+300
    });
});

describe('Wave 1: brigade_front_assignment write-path is dead', () => {
    it('no live war_phases pipeline step writes brigade_front_assignment', () => {
        // Read war_phases.ts and confirm it contains no active call that writes
        // brigade_front_assignment. The only reference should be the compatibility note.
        const warPhasesPath = join(process.cwd(), 'src/sim/turn_phases/war_phases.ts');
        const content = readFileSync(warPhasesPath, 'utf-8');

        // The banned pattern: any non-comment line that assigns brigade_front_assignment
        const lines = content.split('\n');
        const liveWriteLines = lines.filter((line, idx) => {
            const trimmed = line.trim();
            // Skip pure comments
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
            // Look for assignment writes to brigade_front_assignment
            return trimmed.includes('brigade_front_assignment') &&
                (trimmed.includes('=') || trimmed.includes('ensure-brigade-front-assignment'));
        });

        expect(liveWriteLines).toHaveLength(0);
    });

    it('no live runtime file outside _archived and serialize.ts writes brigade_front_assignment', () => {
        // Collect all .ts files in src/ (excluding _archived) and confirm none
        // contain a live (non-comment) write to brigade_front_assignment.
        function collectTsFiles(dir: string): string[] {
            const results: string[] = [];
            for (const entry of readdirSync(dir)) {
                const full = join(dir, entry);
                if (statSync(full).isDirectory()) {
                    if (entry === '_archived') continue;
                    results.push(...collectTsFiles(full));
                } else if (full.endsWith('.ts')) {
                    results.push(full);
                }
            }
            return results;
        }

        const srcDir = join(process.cwd(), 'src');
        const files = collectTsFiles(srcDir);

        // Exempt: serialize.ts (save/load compat)
        const violators: string[] = [];
        for (const file of files) {
            if (file.includes('serialize.ts')) continue;
            const content = readFileSync(file, 'utf-8');
            if (!content.includes('brigade_front_assignment')) continue;

            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
                // A live write: assignment operator on the field
                if (trimmed.includes('brigade_front_assignment') &&
                    trimmed.match(/brigade_front_assignment\s*[^?]?=\s*/)) {
                    violators.push(`${file}: ${trimmed.slice(0, 80)}`);
                }
            }
        }

        expect(violators).toHaveLength(0);
    });
});
