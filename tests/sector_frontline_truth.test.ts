/**
 * Sector Frontline Truth — consolidated regression tests (Waves 1–4).
 *
 * Cluster 5 — sector_frontline_truth waves merge.
 * Merged verbatim from:
 *   - sector_frontline_truth_wave1.test.ts (Phase 1.5 front-adjacency, reachability,
 *     sector sync after dissolution, displacement double-count guard,
 *     brigade_front_assignment write-path is dead)
 *   - sector_frontline_truth_wave2.test.ts (assigned_sub_segment_id cleared on
 *     demotion, adapter canonical-vs-stale fallback)
 *   - sector_frontline_truth_wave3.test.ts (proxy-fork observability,
 *     zero-activity integrity, activity summary stats)
 *   - sector_frontline_truth_wave4.test.ts (fragmented-topology reachability,
 *     adapter re-assignment fidelity, proxy/canonical pressure parity)
 *
 * Lane: Command Chain Truth — Waves 1–4 complete.
 *
 * Also absorbs:
 *   - sector_frontline_contiguity_repro.test.ts (single-file absorption)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    classifyBrigadesByTerritory,
    syncSectorAssignmentsToFormations,
} from '../src/sim/combat/brigade_assignment.js';
import { assertBrigadeReachability } from '../src/sim/combat/sector_assertions.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { evaluateDisplacementTriggers } from '../src/sim/displacement_pipeline/displacement_triggers.js';
import { deriveWeeklyActivityCounts } from '../src/scenario/scenario_runner.js';
import { computeActivitySummary } from '../src/scenario/scenario_end_report.js';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    CURRENT_SCHEMA_VERSION,
    type CorpsFrontSector,
    type CorpsFrontSubSegment,
    type FactionId,
    type FormationId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { CorpsCommanderProfile } from '../src/sim/combat/commander_override.js';
import type { WeeklyActivityCounts } from '../src/scenario/scenario_reporting.js';
import type { TurnReport } from '../src/sim/turn_pipeline_types.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// ── Fixture helpers (shared across all waves) ────────────────────────────────

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
    primaryBrigadeIds: string[] = [],
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: Array.from({ length: edgeCount }, (_, i) => `edge_${id}_${i}`),
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        length_edges: edgeCount,
        primary_brigade_ids: primaryBrigadeIds,
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

/** Minimal war-phase GameState with empty corps_front_sectors (no sector truth). */
function makeStateNoSectors(withActiveBrigade = false): GameState {
    const formations = withActiveBrigade
        ? {
            'brig_test': {
                id: 'brig_test',
                name: 'brig_test',
                faction: 'RS' as FactionId,
                kind: 'brigade',
                status: 'active',
                personnel: 1000,
                corps_id: 'vrs_drina',
                location_osid: 'op:mun:test',
            },
        }
        : {};
    return {
        meta: { turn: 3, phase: 'war', seed: 'wave3-test' },
        factions: [
            { id: 'RBiH' as FactionId },
            { id: 'RS' as FactionId },
            { id: 'HRHB' as FactionId },
        ],
        military: {
            formations,
            corps_front_sectors: {}, // empty — hasLiveSectorFrontlineTruth() returns false
        },
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
            war_supply_pressure: {},
        },
        displacement: {
            settlement_displacement: {},
            municipality_displacement: {},
        },
    } as unknown as GameState;
}

/** Minimal TurnReport with no phase_f_displacement section. */
function makeTurnReportNoDisplacement(): Pick<
    Partial<TurnReport>,
    'phase_f_displacement' | 'front_pressure' | 'displacement'
> {
    return {};
}

// ── Wave 1 ───────────────────────────────────────────────────────────────────

describe('Wave 1: Phase 1.5 front-adjacency gate', () => {
    it('brigade in territory but unreachable from front → not assigned (remains for Phase 2)', () => {
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

        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:deep_rear': 0,
        });

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

        expect(sector.assigned_brigade_ids).not.toContain('brig_deep_rear');
        expect(sector.reserve_brigade_ids).not.toContain('brig_deep_rear');
    });

    it('brigade in territory within 30 hops of front → assigned_brigade_ids', () => {
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

        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:isolated': 1,
        });

        const unreachable = assertBrigadeReachability([sector], formations, componentOf);

        expect(unreachable).toContain('brig_wrong_comp');

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

        expect(formations['brig_active']?.assignment).toEqual(
            expect.objectContaining({ kind: 'sector', role: 'front' })
        );
        expect(formations['brig_reserve']?.assignment).toEqual(
            expect.objectContaining({ kind: 'sector', role: 'front' })
        );
        const unassignedAssignment = formations['brig_unassigned']?.assignment;
        expect(unassignedAssignment).toBeFalsy();
    });
});

describe('Wave 1: displacement double-count guard', () => {
    it('else-branch: System C = 0 and System A has 5 municipalities → System A fires once (no double-count)', () => {
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
                settlement_displacement: {},
                municipality_displacement: {},
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

        expect(report.municipality_displacement_count).toBe(5);
        expect(report.municipality_displacement_total).toBe(5400);
        expect(report.settlement_displacement_count).toBe(0);
    });

    it('else-branch: System C has data → System A fallback does NOT fire (guard holds)', () => {
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
                settlement_displacement: { s_001: 500, s_002: 300 },
                municipality_displacement: { mun_x: 800 },
                displacement_state: {
                    mun_a: { displaced_out: 9999, lost_population: 9999 },
                },
            },
        } as unknown as GameState;

        const report = buildWeeklyReport(mockState);

        expect(report.municipality_displacement_count).toBe(1);
        expect(report.municipality_displacement_total).toBe(800);
        expect(report.settlement_displacement_count).toBe(2);
        expect(report.settlement_displacement_total).toBe(800);
    });
});

describe('Wave 1: brigade_front_assignment write-path is dead', () => {
    it('no live war_phases pipeline step writes brigade_front_assignment', () => {
        const warPhasesPath = join(process.cwd(), 'src/sim/turn_phases/war_phases.ts');
        const content = readFileSync(warPhasesPath, 'utf-8');

        const lines = content.split('\n');
        const liveWriteLines = lines.filter((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
            return trimmed.includes('brigade_front_assignment') &&
                (trimmed.includes('=') || trimmed.includes('ensure-brigade-front-assignment'));
        });

        expect(liveWriteLines).toHaveLength(0);
    });

    it('no live runtime file outside _archived and serialize.ts writes brigade_front_assignment', () => {
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

        const violators: string[] = [];
        for (const file of files) {
            if (file.includes('serialize.ts')) continue;
            const content = readFileSync(file, 'utf-8');
            if (!content.includes('brigade_front_assignment')) continue;

            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
                if (trimmed.includes('brigade_front_assignment') &&
                    trimmed.match(/brigade_front_assignment\s*[^?]?=\s*/)) {
                    violators.push(`${file}: ${trimmed.slice(0, 80)}`);
                }
            }
        }

        expect(violators).toHaveLength(0);
    });
});

// ── Wave 2 ───────────────────────────────────────────────────────────────────

describe('Wave 2 GAP 1: assigned_sub_segment_id cleared on demotion', () => {
    it('demoted brigade has assigned_sub_segment_id cleared to undefined', () => {
        const ss1 = makeSubSeg('seg-1', ['op:m:front_a'], ['op:m:enemy_1'], 2, ['brig_demoted']);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a'],
        );
        sector.assigned_brigade_ids = ['brig_demoted'];

        const brig = makeFormation({
            id: 'brig_demoted',
            location_osid: 'op:m:isolated',
            corps_id: 'vrs_drina',
            assigned_sub_segment_id: 'seg-1',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_demoted: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:isolated': 1,
        });

        const unreachableIds = assertBrigadeReachability([sector], formations, componentOf);
        expect(unreachableIds).toContain('brig_demoted');

        const unreachableSet = new Set(unreachableIds);
        for (const sec of [sector]) {
            const demoted: string[] = [];
            sec.assigned_brigade_ids = sec.assigned_brigade_ids.filter(bid => {
                if (unreachableSet.has(bid)) { demoted.push(bid); return false; }
                return true;
            });
            for (const bid of demoted) {
                if (!sec.reserve_brigade_ids.includes(bid)) {
                    sec.reserve_brigade_ids.push(bid);
                }
                const f = formations[bid];
                if (f) f.assigned_sub_segment_id = undefined;
            }
        }

        expect(sector.assigned_brigade_ids).not.toContain('brig_demoted');
        expect(sector.reserve_brigade_ids).toContain('brig_demoted');
        expect(formations['brig_demoted']?.assigned_sub_segment_id).toBeUndefined();
    });

    it('reachable brigade retains its assigned_sub_segment_id after demotion pass', () => {
        const ss1 = makeSubSeg('seg-good', ['op:m:front_a'], ['op:m:enemy_1'], 2, ['brig_good']);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a'],
        );
        sector.assigned_brigade_ids = ['brig_good'];

        const brig = makeFormation({
            id: 'brig_good',
            location_osid: 'op:m:front_a',
            corps_id: 'vrs_drina',
            assigned_sub_segment_id: 'seg-good',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_good: brig,
        };

        const componentOf = makeComponentOf({ 'op:m:front_a': 0 });

        const unreachableIds = assertBrigadeReachability([sector], formations, componentOf);
        expect(unreachableIds).toHaveLength(0);

        expect(formations['brig_good']?.assigned_sub_segment_id).toBe('seg-good');
    });
});

describe('Wave 2 GAP 2: adapter derives sub_segment from canonical sector truth', () => {
    it('adapter reverse map: brigade in primary_brigade_ids → canonical sub_segment_id wins over stale formation field', () => {
        const rawCfs: Record<string, Record<string, unknown>> = {
            'sector:vrs_drina:0': {
                corps_id: 'vrs_drina',
                faction: 'RS',
                sub_segments: [
                    {
                        sub_segment_id: 'seg-canonical',
                        friendly_osids: ['op:m:front_a'],
                        enemy_osids: ['op:m:enemy_1'],
                        primary_brigade_ids: ['brig_x'],
                    },
                ],
                assigned_brigade_ids: ['brig_x'],
                reserve_brigade_ids: [],
            },
        };

        const brigadeSubSegmentFromSectors = new Map<string, string>();
        for (const sector of Object.values(rawCfs)) {
            if (!sector || typeof sector !== 'object') continue;
            const subSegs = Array.isArray(sector.sub_segments)
                ? sector.sub_segments as Array<Record<string, unknown>>
                : [];
            for (const ss of subSegs) {
                const ssId = typeof ss.sub_segment_id === 'string' ? ss.sub_segment_id : undefined;
                if (!ssId) continue;
                const primaries = Array.isArray(ss.primary_brigade_ids)
                    ? ss.primary_brigade_ids as unknown[]
                    : [];
                for (const bid of primaries) {
                    if (typeof bid === 'string' && bid) brigadeSubSegmentFromSectors.set(bid, ssId);
                }
            }
        }

        const staleFormationField = 'seg-stale';

        const id = 'brig_x';
        const assigned_sub_segment_id: string | undefined =
            brigadeSubSegmentFromSectors.get(id) ??
            (staleFormationField ? staleFormationField : undefined);

        expect(assigned_sub_segment_id).toBe('seg-canonical');
    });

    it('adapter falls back to formation field when brigade not in any sector sub_segment', () => {
        const rawCfs: Record<string, Record<string, unknown>> = {
            'sector:vrs_drina:0': {
                corps_id: 'vrs_drina',
                faction: 'RS',
                sub_segments: [
                    {
                        sub_segment_id: 'seg-canonical',
                        friendly_osids: ['op:m:front_a'],
                        primary_brigade_ids: ['brig_front'],
                    },
                ],
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: ['brig_rear'],
            },
        };

        const brigadeSubSegmentFromSectors = new Map<string, string>();
        for (const sector of Object.values(rawCfs)) {
            if (!sector || typeof sector !== 'object') continue;
            const subSegs = Array.isArray(sector.sub_segments)
                ? sector.sub_segments as Array<Record<string, unknown>>
                : [];
            for (const ss of subSegs) {
                const ssId = typeof ss.sub_segment_id === 'string' ? ss.sub_segment_id : undefined;
                if (!ssId) continue;
                const primaries = Array.isArray(ss.primary_brigade_ids)
                    ? ss.primary_brigade_ids as unknown[]
                    : [];
                for (const bid of primaries) {
                    if (typeof bid === 'string' && bid) brigadeSubSegmentFromSectors.set(bid, ssId);
                }
            }
        }

        const formationField = 'seg-from-formation';
        const id = 'brig_rear';
        const assigned_sub_segment_id: string | undefined =
            brigadeSubSegmentFromSectors.get(id) ??
            (formationField ? formationField : undefined);

        expect(assigned_sub_segment_id).toBe('seg-from-formation');
    });

    it('adapter returns undefined when neither sector nor formation has sub_segment', () => {
        const brigadeSubSegmentFromSectors = new Map<string, string>();
        const id = 'brig_unknown';
        const formationField: string | undefined = undefined;
        const assigned_sub_segment_id: string | undefined =
            brigadeSubSegmentFromSectors.get(id) ??
            (typeof formationField === 'string' && formationField ? formationField : undefined);

        expect(assigned_sub_segment_id).toBeUndefined();
    });
});

describe('Wave 2: Wave 1 displacement double-count guard regression', () => {
    it('else-branch: System C = 0 and System A has 5 municipalities → System A fires once (no double-count)', () => {
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
                settlement_displacement: {},
                municipality_displacement: {},
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
        expect(report.municipality_displacement_count).toBe(5);
        expect(report.municipality_displacement_total).toBe(5400);
        expect(report.settlement_displacement_count).toBe(0);
    });
});

// ── Wave 3 ───────────────────────────────────────────────────────────────────

describe('Wave 3 Test A: displacement triggers proxy path observability', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('displacement triggers: proxy path emits diagnostic warning when sectors unavailable in operational-context runs', () => {
        const state = makeStateNoSectors(true);
        const edges: import('../src/map/settlements.js').EdgeRecord[] = [];

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        evaluateDisplacementTriggers(state, edges, { sid_a: 'op:mun:a' });

        expect(warnSpy).toHaveBeenCalled();
        const calls = warnSpy.mock.calls;
        const allMessages = calls.map((c) => String(c[0])).join('\n');
        expect(allMessages).toMatch(
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i
        );
    });

    it('displacement triggers: settlement-only compatibility path stays quiet when sectors are unavailable', () => {
        const state = makeStateNoSectors();
        const edges: import('../src/map/settlements.js').EdgeRecord[] = [];

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        evaluateDisplacementTriggers(state, edges, undefined);

        const legacyWarnings = warnSpy.mock.calls.filter((c) =>
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i.test(String(c[0]))
        );
        expect(legacyWarnings).toHaveLength(0);
    });

    it('displacement triggers: canonical path does NOT emit a warning when sectors are present', () => {
        const state = makeStateNoSectors();
        (state.military.corps_front_sectors as Record<string, unknown>)['sector:vrs_drina:0'] = {
            sector_id: 'sector:vrs_drina:0',
            corps_id: 'vrs_drina',
            faction: 'RS',
            edge_ids: ['op:m:a||op:m:b'],
            sub_segments: [],
            territory_osids: ['op:m:a'],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
            opposing_factions: [],
        };

        const edges: import('../src/map/settlements.js').EdgeRecord[] = [];
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        evaluateDisplacementTriggers(state, edges, undefined);

        const calls = warnSpy.mock.calls;
        const legacyWarnings = calls.filter((c) =>
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i.test(String(c[0]))
        );
        expect(legacyWarnings).toHaveLength(0);
    });
});

describe('Wave 3 Test B: deriveWeeklyActivityCounts zero-fill when trigger_report absent', () => {
    it('returns explicit zeros when turnReport has no phase_f_displacement', () => {
        const state = makeStateNoSectors();
        const turnReport = makeTurnReportNoDisplacement();

        const result = deriveWeeklyActivityCounts(state, turnReport);

        expect(result).toEqual({
            front_active_set_size: 0,
            pressure_eligible_size: 0,
            displacement_trigger_eligible_size: 0,
        });
        expect(typeof result.front_active_set_size).toBe('number');
        expect(typeof result.pressure_eligible_size).toBe('number');
        expect(typeof result.displacement_trigger_eligible_size).toBe('number');
    });

    it('returns canonical values when trigger_report is present (regression guard)', () => {
        const state = makeStateNoSectors();
        const turnReport = {
            phase_f_displacement: {
                trigger_report: {
                    triggered_settlements: ['s1', 's2', 's3'],
                    deltas: {},
                    reasons: {},
                    front_active_set_size: 12,
                    pressure_eligible_size: 7,
                    displacement_trigger_eligible_size: 12,
                },
            },
        } as unknown as TurnReport;

        const result = deriveWeeklyActivityCounts(state, turnReport);

        expect(result.front_active_set_size).toBe(12);
        expect(result.pressure_eligible_size).toBe(7);
        expect(result.displacement_trigger_eligible_size).toBe(12);
    });
});

describe('Wave 3 Test C: computeActivitySummary aggregation correctness', () => {
    it('aggregates weekly counts correctly with min/max/mean/nonzero_weeks', () => {
        const weeks: WeeklyActivityCounts[] = [
            { front_active_set_size: 10, pressure_eligible_size: 5,  displacement_trigger_eligible_size: 2 },
            { front_active_set_size: 0,  pressure_eligible_size: 0,  displacement_trigger_eligible_size: 0 },
            { front_active_set_size: 20, pressure_eligible_size: 8,  displacement_trigger_eligible_size: 4 },
            { front_active_set_size: 15, pressure_eligible_size: 6,  displacement_trigger_eligible_size: 3 },
        ];

        const summary = computeActivitySummary(weeks);

        expect(summary.weeks).toBe(4);

        expect(summary.metrics.front_active_set_size.max).toBe(20);
        expect(summary.metrics.front_active_set_size.min).toBe(0);
        expect(summary.metrics.front_active_set_size.mean).toBeCloseTo(11.25, 5);
        expect(summary.metrics.front_active_set_size.nonzero_weeks).toBe(3);

        const pres = summary.metrics.pressure_eligible_size;
        expect(pres).not.toBeNull();
        expect(pres!.max).toBe(8);
        expect(pres!.min).toBe(0);
        expect(pres!.mean).toBeCloseTo(4.75, 5);
        expect(pres!.nonzero_weeks).toBe(3);

        const disp = summary.metrics.displacement_trigger_eligible_size;
        expect(disp).not.toBeNull();
        expect(disp!.max).toBe(4);
        expect(disp!.min).toBe(0);
        expect(disp!.mean).toBeCloseTo(2.25, 5);
        expect(disp!.nonzero_weeks).toBe(3);
    });

    it('returns all-zero stats for empty week list', () => {
        const summary = computeActivitySummary([]);

        expect(summary.weeks).toBe(0);
        expect(summary.metrics.front_active_set_size).toEqual({
            min: 0, max: 0, mean: 0, nonzero_weeks: 0,
        });
    });

    it('correctly identifies a single all-zero week as 0 nonzero_weeks', () => {
        const summary = computeActivitySummary([
            { front_active_set_size: 0, pressure_eligible_size: 0, displacement_trigger_eligible_size: 0 },
        ]);

        expect(summary.metrics.front_active_set_size.nonzero_weeks).toBe(0);
        expect(summary.metrics.front_active_set_size.max).toBe(0);
    });
});

// ── Wave 4 ───────────────────────────────────────────────────────────────────

describe('Wave 4 Test A: assertBrigadeReachability fragmented topology stress', () => {
    it('correctly flags unreachable brigades across disconnected components', () => {
        const ss1 = makeSubSeg('ss_a', ['op:mun:a'], ['op:mun:enemy_1'], 3);
        const sector = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:mun:a', 'op:mun:b', 'op:mun:c'],
        );
        sector.assigned_brigade_ids = ['brig_c0_1', 'brig_c0_2', 'brig_c1_1', 'brig_c2_1'];

        const formations: Record<FormationId, FormationState> = {
            brig_c0_1: makeFormation({ id: 'brig_c0_1', location_osid: 'op:mun:a', corps_id: 'vrs_drina' }),
            brig_c0_2: makeFormation({ id: 'brig_c0_2', location_osid: 'op:mun:a', corps_id: 'vrs_drina' }),
            brig_c1_1: makeFormation({ id: 'brig_c1_1', location_osid: 'op:mun:d', corps_id: 'vrs_drina' }),
            brig_c2_1: makeFormation({ id: 'brig_c2_1', location_osid: 'op:mun:f', corps_id: 'vrs_drina' }),
        };

        const componentOf = makeComponentOf({
            'op:mun:a': 0,
            'op:mun:b': 0,
            'op:mun:c': 0,
            'op:mun:d': 1,
            'op:mun:e': 1,
            'op:mun:f': 2,
        });

        const unreachable = assertBrigadeReachability([sector], formations, componentOf);

        expect(unreachable).toContain('brig_c1_1');
        expect(unreachable).toContain('brig_c2_1');
        expect(unreachable).toHaveLength(2);

        expect(unreachable).not.toContain('brig_c0_1');
        expect(unreachable).not.toContain('brig_c0_2');
    });

    it('multi-sector fragmentation: brigades flagged by their respective sector component mismatch', () => {
        const ss_s1 = makeSubSeg('ss_s1', ['op:mun:s1'], ['op:mun:enemy_s1'], 2);
        const sector1 = makeSector('sector:vrs_drina:0', 'vrs_drina', [ss_s1], ['op:mun:s1']);
        sector1.assigned_brigade_ids = ['brig_s1_correct', 'brig_s2_wrong'];

        const ss_s2 = makeSubSeg('ss_s2', ['op:mun:s2'], ['op:mun:enemy_s2'], 2);
        const sector2 = makeSector('sector:vrs_drina:1', 'vrs_drina', [ss_s2], ['op:mun:s2']);
        sector2.assigned_brigade_ids = ['brig_s2_correct', 'brig_s1_wrong'];

        const formations: Record<FormationId, FormationState> = {
            brig_s1_correct: makeFormation({ id: 'brig_s1_correct', location_osid: 'op:mun:s1' }),
            brig_s2_wrong:   makeFormation({ id: 'brig_s2_wrong',   location_osid: 'op:mun:s2' }),
            brig_s2_correct: makeFormation({ id: 'brig_s2_correct', location_osid: 'op:mun:s2' }),
            brig_s1_wrong:   makeFormation({ id: 'brig_s1_wrong',   location_osid: 'op:mun:s1' }),
        };

        const componentOf = makeComponentOf({
            'op:mun:s1': 0,
            'op:mun:s2': 1,
        });

        const unreachable = assertBrigadeReachability([sector1, sector2], formations, componentOf);

        expect(unreachable).toContain('brig_s2_wrong');
        expect(unreachable).toContain('brig_s1_wrong');
        expect(unreachable).toHaveLength(2);

        expect(unreachable).not.toContain('brig_s1_correct');
        expect(unreachable).not.toContain('brig_s2_correct');
    });
});

describe('Wave 4 Test B: adapter canonical sub-segment wins over stale formation field after re-assignment', () => {
    it('canonical sub_segment wins over stale formation field after brigade moves between sub-segments', () => {
        const rawCfs: Record<string, Record<string, unknown>> = {
            'sector:vrs_drina:0': {
                corps_id: 'vrs_drina',
                faction: 'RS',
                sub_segments: [
                    {
                        sub_segment_id: 'seg_old',
                        friendly_osids: ['op:mun:front_a'],
                        enemy_osids: ['op:mun:enemy_1'],
                        primary_brigade_ids: [],
                    },
                    {
                        sub_segment_id: 'seg_new',
                        friendly_osids: ['op:mun:front_b'],
                        enemy_osids: ['op:mun:enemy_2'],
                        primary_brigade_ids: ['brig_mobile'],
                    },
                ],
                assigned_brigade_ids: ['brig_mobile'],
                reserve_brigade_ids: [],
            },
        };

        const brigadeSubSegmentFromSectors = new Map<string, string>();
        for (const sector of Object.values(rawCfs)) {
            if (!sector || typeof sector !== 'object') continue;
            const subSegs = Array.isArray(sector.sub_segments)
                ? sector.sub_segments as Array<Record<string, unknown>>
                : [];
            for (const ss of subSegs) {
                const ssId = typeof ss.sub_segment_id === 'string' ? ss.sub_segment_id : undefined;
                if (!ssId) continue;
                const primaries = Array.isArray(ss.primary_brigade_ids)
                    ? ss.primary_brigade_ids as unknown[]
                    : [];
                for (const bid of primaries) {
                    if (typeof bid === 'string' && bid) brigadeSubSegmentFromSectors.set(bid, ssId);
                }
            }
        }

        const staleFormationField = 'seg_old';

        const id = 'brig_mobile';
        const derived_sub_segment_id: string | undefined =
            brigadeSubSegmentFromSectors.get(id) ??
            (staleFormationField ? staleFormationField : undefined);

        expect(derived_sub_segment_id).toBe('seg_new');
        expect(derived_sub_segment_id).not.toBe('seg_old');
    });

    it('adapter: formation field used when brigade is not in any sub-segment primary_brigade_ids', () => {
        const rawCfs: Record<string, Record<string, unknown>> = {
            'sector:vrs_drina:0': {
                corps_id: 'vrs_drina',
                faction: 'RS',
                sub_segments: [
                    {
                        sub_segment_id: 'seg_front',
                        friendly_osids: ['op:mun:front_a'],
                        enemy_osids: ['op:mun:enemy_1'],
                        primary_brigade_ids: ['brig_front'],
                    },
                ],
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: ['brig_reserve'],
            },
        };

        const brigadeSubSegmentFromSectors = new Map<string, string>();
        for (const sector of Object.values(rawCfs)) {
            if (!sector || typeof sector !== 'object') continue;
            const subSegs = Array.isArray(sector.sub_segments)
                ? sector.sub_segments as Array<Record<string, unknown>>
                : [];
            for (const ss of subSegs) {
                const ssId = typeof ss.sub_segment_id === 'string' ? ss.sub_segment_id : undefined;
                if (!ssId) continue;
                const primaries = Array.isArray(ss.primary_brigade_ids)
                    ? ss.primary_brigade_ids as unknown[]
                    : [];
                for (const bid of primaries) {
                    if (typeof bid === 'string' && bid) brigadeSubSegmentFromSectors.set(bid, ssId);
                }
            }
        }

        const formationField = 'seg_from_last_turn';
        const id = 'brig_reserve';
        const derived: string | undefined =
            brigadeSubSegmentFromSectors.get(id) ??
            (formationField ? formationField : undefined);

        expect(derived).toBe('seg_from_last_turn');
    });

    it('adapter: cleared formation field + absent from sub-segments → undefined (no ghost assignment)', () => {
        const brigadeSubSegmentFromSectors = new Map<string, string>();
        const formationField: string | undefined = undefined;

        const id = 'brig_demoted';
        const derived: string | undefined =
            brigadeSubSegmentFromSectors.get(id) ??
            (typeof formationField === 'string' && formationField ? formationField : undefined);

        expect(derived).toBeUndefined();
    });
});

describe('Wave 4 Test C: displacement proxy fallback vs canonical produce consistent pressure_eligible_size', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('proxy path emits console.warn only in operational-context runs; canonical path does not, for identical contact graph', () => {
        const edges: import('../src/map/settlements.js').EdgeRecord[] = [
            { a: 'op:mun:osid_a', b: 'op:mun:osid_b' },
        ];

        const stateA: GameState = {
            meta: { turn: 5, phase: 'war', seed: 'wave4-test-a' },
            factions: [
                { id: 'RBiH' as FactionId },
                { id: 'RS' as FactionId },
                { id: 'HRHB' as FactionId },
            ],
            military: {
                formations: {
                    brig_test: makeFormation({ id: 'brig_test', location_osid: 'op:mun:osid_b' }),
                },
                corps_front_sectors: {},
            },
            political: {
                political_controllers: {
                    'op:mun:osid_a': 'RBiH',
                    'op:mun:osid_b': 'RS',
                },
                war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
                war_supply_pressure: {},
            },
            displacement: {
                settlement_displacement: {},
                municipality_displacement: {},
            },
        } as unknown as GameState;

        const stateB: GameState = {
            meta: { turn: 5, phase: 'war', seed: 'wave4-test-b' },
            factions: [
                { id: 'RBiH' as FactionId },
                { id: 'RS' as FactionId },
                { id: 'HRHB' as FactionId },
            ],
            military: {
                formations: {},
                corps_front_sectors: {
                    'sector:test:0': {
                        sector_id: 'sector:test:0',
                        corps_id: 'vrs_drina',
                        faction: 'RS',
                        edge_ids: ['op:mun:osid_a__op:mun:osid_b'],
                        sub_segments: [],
                        territory_osids: ['op:mun:osid_b'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        length_edges: 1,
                        density: 0,
                        threat_ratio: 0,
                        defensive_power: 0,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                        opposing_factions: ['RBiH'],
                    },
                },
            },
            political: {
                political_controllers: {
                    'op:mun:osid_a': 'RBiH',
                    'op:mun:osid_b': 'RS',
                },
                war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
                war_supply_pressure: {},
            },
            displacement: {
                settlement_displacement: {},
                municipality_displacement: {},
            },
        } as unknown as GameState;

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const resultA = evaluateDisplacementTriggers(stateA, edges, { 'op:mun:osid_a': 'op:mun:osid_a' });
        const resultB = evaluateDisplacementTriggers(stateB, edges, undefined);

        const warnCallsForA = warnSpy.mock.calls.filter((c) =>
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i.test(String(c[0]))
        );
        expect(warnCallsForA.length).toBeGreaterThan(0);

        vi.restoreAllMocks();
        const warnSpy2 = vi.spyOn(console, 'warn').mockImplementation(() => {});
        evaluateDisplacementTriggers(stateB, edges, undefined);
        const legacyWarnsForB = warnSpy2.mock.calls.filter((c) =>
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i.test(String(c[0]))
        );
        expect(legacyWarnsForB).toHaveLength(0);

        expect(resultA.report.pressure_eligible_size).toBeGreaterThanOrEqual(
            resultB.report.pressure_eligible_size
        );
    });

    it('proxy path: pressure_eligible_size > 0 when opposing OSIDs are adjacent in contact graph', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const state: GameState = {
            meta: { turn: 3, phase: 'war', seed: 'wave4-proxy-size' },
            factions: [
                { id: 'RBiH' as FactionId },
                { id: 'RS' as FactionId },
                { id: 'HRHB' as FactionId },
            ],
            military: {
                formations: {
                    brig_test: makeFormation({ id: 'brig_test', location_osid: 'op:mun:y' }),
                },
                corps_front_sectors: {},
            },
            political: {
                political_controllers: {
                    'op:mun:x': 'RBiH',
                    'op:mun:y': 'RS',
                },
                war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
                war_supply_pressure: {},
            },
            displacement: {
                settlement_displacement: {},
                municipality_displacement: {},
            },
        } as unknown as GameState;

        const edges: import('../src/map/settlements.js').EdgeRecord[] = [
            { a: 'op:mun:x', b: 'op:mun:y' },
        ];

        const { report } = evaluateDisplacementTriggers(state, edges, { 'op:mun:x': 'op:mun:x' });

        expect(report.pressure_eligible_size).toBe(1);

        expect(warnSpy).toHaveBeenCalled();
    });
});

// ── Absorbed: sector_frontline_contiguity_repro.test.ts (single-file absorption) ──
// Uses its own state/edge fixtures (different shape from wave helpers above).

describe('sector frontline contiguity repro', () => {
    function makeReproFormation(id: string, overrides: Partial<FormationState>): FormationState {
        return {
            id,
            name: id,
            faction: 'RS' as FactionId,
            kind: 'brigade',
            status: 'active',
            created_turn: 1,
            assignment: null,
            personnel: 1200,
            cohesion: 65,
            morale: 70,
            ...overrides,
        } as FormationState;
    }

    function makeReproState(): { state: GameState; edges: EdgeRecord[] } {
        const formations: Record<string, FormationState> = {
            corps_a: makeReproFormation('corps_a', {
                kind: 'corps',
                faction: 'RS',
                location_osid: 'op:test:rear',
            }),
            brig_1: makeReproFormation('brig_1', {
                corps_id: 'corps_a',
                location_osid: 'op:test:f1',
                home_osid: 'op:test:f1',
            }),
            brig_2: makeReproFormation('brig_2', {
                corps_id: 'corps_a',
                location_osid: 'op:test:f2',
                home_osid: 'op:test:f2',
            }),
        };

        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 10,
                seed: 'sector-frontline-contiguity-repro',
                phase: 'war',
                scenario_start_date: { year: 1992, month: 4, day: 6 },
                referendum_held: true,
                referendum_turn: 1,
                war_start_turn: 1,
            } as GameState['meta'],
            factions: [
                { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
                { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as unknown as GameState['factions'],
            military: {
                formations,
                war_front_edges_osid: [
                    { edge_id: 'op:test:f1__op:test:e1', a: 'op:test:f1', b: 'op:test:e1', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:f2__op:test:e1', a: 'op:test:f2', b: 'op:test:e1', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:f1__op:test:e2', a: 'op:test:f1', b: 'op:test:e2', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:test:f2__op:test:e2', a: 'op:test:f2', b: 'op:test:e2', side_a: 'RS', side_b: 'RBiH' },
                ],
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as GameState['military'],
            political: {
                political_controllers: {
                    'op:test:rear': 'RS',
                    'op:test:f1': 'RS',
                    'op:test:f2': 'RS',
                    'op:test:e1': 'RBiH',
                    'op:test:e2': 'RBiH',
                },
            } as GameState['political'],
            displacement: {} as GameState['displacement'],
        } as GameState;

        const edges: EdgeRecord[] = [
            { a: 'op:test:rear', b: 'op:test:f1' } as EdgeRecord,
            { a: 'op:test:rear', b: 'op:test:f2' } as EdgeRecord,
            { a: 'op:test:f1', b: 'op:test:f2' } as EdgeRecord,
            { a: 'op:test:f1', b: 'op:test:e1' } as EdgeRecord,
            { a: 'op:test:f2', b: 'op:test:e1' } as EdgeRecord,
            { a: 'op:test:f1', b: 'op:test:e2' } as EdgeRecord,
            { a: 'op:test:f2', b: 'op:test:e2' } as EdgeRecord,
        ];

        return { state, edges };
    }

    it('does not merge separate frontline pockets that only share friendly-side OSIDs', () => {
        const { state, edges } = makeReproState();

        const result = buildCorpsFrontSectors(state, edges, null);
        const sectors = Object.values(result).filter((sector) => sector.corps_id === 'corps_a');

        expect(sectors).toHaveLength(2);
        for (const sector of sectors) {
            expect(sector.sub_segments).toHaveLength(1);
        }

        const enemyPocketSets = sectors
            .map((sector) => [...new Set(sector.sub_segments.flatMap((subSegment) => subSegment.enemy_osids))].sort().join('|'))
            .sort();
        expect(enemyPocketSets).toEqual(['op:test:e1', 'op:test:e2']);
    });
});
