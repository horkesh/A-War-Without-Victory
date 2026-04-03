/**
 * Brigade territory reconciliation tests — Phase 1.5 of classifyBrigadesByTerritory.
 *
 * Phase 1.5 assigns pooled brigades by matching their location_osid against
 * sector territory_osids BEFORE Phase 2's BFS-based distribution kicks in.
 */

import { describe, it, expect, vi } from 'vitest';
import {
    classifyBrigadesByTerritory,
    ensureMinimumSectorCoverage,
    assignCrossCorpsEnclaveDefenders,
    brigadeRequiresSectorAssignment,
    enforcePhysicalSectorOwnership,
    rehomeUnassignedBrigadesToPhysicalSectorOwners,
    syncSectorAssignmentsToFormations,
    warnUnresolvedSectorAssignments,
} from '../src/sim/combat/brigade_assignment.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { CorpsCommanderProfile } from '../src/sim/combat/commander_override.js';
import { strictCompare } from '../src/state/validateGameState.js';

// ── Fixture helpers ─────────────────────────────────────────────────────────

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

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Phase 1.5: territory-based brigade assignment', () => {
    it('assigns brigade in depth territory to correct sector', () => {
        // Sector 1 has front OSIDs (front_a, front_b) and depth territory (depth_c).
        // Sector 2 has front OSIDs (front_d, front_e) and depth territory (depth_f).
        // Brigade is at depth_c — NOT on any front OSID — should go to sector 1.
        const ss1 = makeSubSeg('ss1', ['op:m:front_a', 'op:m:front_b'], ['op:m:enemy_1'], 3);
        const ss2 = makeSubSeg('ss2', ['op:m:front_d', 'op:m:front_e'], ['op:m:enemy_2'], 3);

        const sector1 = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a', 'op:m:front_b', 'op:m:depth_c'],
        );
        const sector2 = makeSector(
            'sector:vrs_drina:1', 'vrs_drina', [ss2],
            ['op:m:front_d', 'op:m:front_e', 'op:m:depth_f'],
        );

        const brig = makeFormation({
            id: 'brig_depth',
            location_osid: 'op:m:depth_c',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_depth: brig,
        };

        // All OSIDs in the same connected component
        const componentOf = makeComponentOf({
            'op:m:front_a': 0, 'op:m:front_b': 0, 'op:m:depth_c': 0,
            'op:m:front_d': 0, 'op:m:front_e': 0, 'op:m:depth_f': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_a', 'op:m:front_b'],
            ['op:m:front_b', 'op:m:depth_c'],
            ['op:m:front_d', 'op:m:front_e'],
            ['op:m:front_e', 'op:m:depth_f'],
            ['op:m:depth_c', 'op:m:depth_f'],
        ]);

        const friendlyOsids = new Set([
            'op:m:front_a', 'op:m:front_b', 'op:m:depth_c',
            'op:m:front_d', 'op:m:front_e', 'op:m:depth_f',
        ]);

        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector1, sector2],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        // Brigade at depth_c should be assigned to sector1 (which owns depth_c)
        expect(sector1.assigned_brigade_ids).toContain('brig_depth');
        expect(sector2.assigned_brigade_ids).not.toContain('brig_depth');
    });

    it('brigade on front OSID still uses Phase 1 (regression guard)', () => {
        // Brigade is on a front OSID — Phase 1 should claim it.
        // Phase 1.5 must not double-assign it.
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 3);
        const sector1 = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a', 'op:m:depth_b'],
        );

        const brig = makeFormation({
            id: 'brig_front',
            location_osid: 'op:m:front_a',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_front: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0, 'op:m:depth_b': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_a', 'op:m:depth_b'],
        ]);

        const friendlyOsids = new Set(['op:m:front_a', 'op:m:depth_b']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector1],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        // Brigade assigned exactly once (Phase 1 only), not duplicated by Phase 1.5
        expect(sector1.assigned_brigade_ids).toEqual(['brig_front']);
    });

    it('multiple territory matches prefer most understaffed sector', () => {
        // depth_shared is in both sector1 and sector2 territory.
        // sector1 already has a Phase-1 brigade; sector2 does not.
        // The depth brigade should go to sector2 (more understaffed).
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 4);
        const ss2 = makeSubSeg('ss2', ['op:m:front_b'], ['op:m:enemy_2'], 4);

        const sector1 = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a', 'op:m:depth_shared'],
        );
        const sector2 = makeSector(
            'sector:vrs_drina:1', 'vrs_drina', [ss2],
            ['op:m:front_b', 'op:m:depth_shared'],
        );

        const brigFront = makeFormation({
            id: 'brig_front',
            location_osid: 'op:m:front_a',
            corps_id: 'vrs_drina',
        });
        const brigDepth = makeFormation({
            id: 'brig_depth',
            location_osid: 'op:m:depth_shared',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_front: brigFront,
            brig_depth: brigDepth,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0, 'op:m:front_b': 0, 'op:m:depth_shared': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_a', 'op:m:depth_shared'],
            ['op:m:depth_shared', 'op:m:front_b'],
        ]);

        const friendlyOsids = new Set([
            'op:m:front_a', 'op:m:front_b', 'op:m:depth_shared',
        ]);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector1, sector2],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        // brig_front should be claimed by sector1 via Phase 1 (front OSID match)
        expect(sector1.assigned_brigade_ids).toContain('brig_front');

        // brig_depth at depth_shared: both sectors claim it in territory.
        // sector1 already has 1 brigade, sector2 has 0.
        // Both sectors have 4 edges. need = edges - assigned.
        // sector1 need = 4 - 1 = 3, sector2 need = 4 - 0 = 4.
        // Phase 1.5 picks highest need → sector2.
        expect(sector2.assigned_brigade_ids).toContain('brig_depth');
        expect(sector1.assigned_brigade_ids).not.toContain('brig_depth');
    });

    it('cross-component isolation preserved — Phase 1.5 skips sector in different component', () => {
        // Brigade is in sector1's territory (component 0) but the brigade itself
        // is in component 1. Sector2 is in the brigade's component (1).
        // Phase 1.5 should NOT assign the brigade to sector1 (wrong component).
        // Phase 2 should assign it to sector2 (correct component, reachable by BFS).
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 3);
        const sector1 = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a', 'op:m:depth_island'],  // depth_island in territory but different component
        );

        const ss2 = makeSubSeg('ss2', ['op:m:front_c'], ['op:m:enemy_2'], 3);
        const sector2 = makeSector(
            'sector:vrs_drina:1', 'vrs_drina', [ss2],
            ['op:m:front_c', 'op:m:depth_island'],  // also claims depth_island
        );

        const brig = makeFormation({
            id: 'brig_island',
            location_osid: 'op:m:depth_island',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_island: brig,
        };

        // front_a is in component 0, depth_island + front_c are in component 1
        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:depth_island': 1,
            'op:m:front_c': 1,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_a', 'op:m:enemy_1'],
            ['op:m:depth_island', 'op:m:front_c'],
        ]);

        const friendlyOsids = new Set(['op:m:front_a', 'op:m:depth_island', 'op:m:front_c']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector1, sector2],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        // Phase 1.5 respects component isolation: sector1 (comp 0) should NOT get the brigade
        // The brigade should end up in sector2 (comp 1) — either via Phase 1.5 or Phase 2
        expect(sector1.assigned_brigade_ids).not.toContain('brig_island');
        expect(sector2.assigned_brigade_ids).toContain('brig_island');
    });

    it('loaned brigade uses effective corps for territory matching', () => {
        // Brigade belongs to vrs_drina but is loaned to vrs_1st_krajina.
        // Sector belongs to vrs_1st_krajina. Brigade should match via loan.
        const ss1 = makeSubSeg('ss1', ['op:m:front_x'], ['op:m:enemy_x'], 3);
        const sectorKrajina = makeSector(
            'sector:vrs_1st_krajina:0', 'vrs_1st_krajina', [ss1],
            ['op:m:front_x', 'op:m:depth_y'],
        );

        // A second sector owned by the brigade's home corps (vrs_drina)
        const ss2 = makeSubSeg('ss2', ['op:m:front_z'], ['op:m:enemy_z'], 3);
        const sectorDrina = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss2],
            ['op:m:front_z'],
        );

        const brigLoaned = makeFormation({
            id: 'brig_loaned',
            location_osid: 'op:m:depth_y',
            corps_id: 'vrs_drina',
        });
        // Set elite loan state
        (brigLoaned as any).elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'vrs_1st_krajina',
        };

        const formations: Record<FormationId, FormationState> = {
            brig_loaned: brigLoaned,
        };

        const componentOf = makeComponentOf({
            'op:m:front_x': 0, 'op:m:depth_y': 0,
            'op:m:front_z': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_x', 'op:m:depth_y'],
            ['op:m:depth_y', 'op:m:front_z'],
        ]);

        const friendlyOsids = new Set([
            'op:m:front_x', 'op:m:depth_y', 'op:m:front_z',
        ]);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sectorKrajina, sectorDrina],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        // Brigade is loaned to vrs_1st_krajina → should match sectorKrajina, not sectorDrina
        expect(sectorKrajina.assigned_brigade_ids).toContain('brig_loaned');
        expect(sectorDrina.assigned_brigade_ids).not.toContain('brig_loaned');
    });

    it('leaves brigades unresolved when no truthful same-component sector exists', () => {
        const ss1 = makeSubSeg('ss1', ['op:m:front_a'], ['op:m:enemy_1'], 3);
        const sector1 = makeSector(
            'sector:vrs_drina:0', 'vrs_drina', [ss1],
            ['op:m:front_a'],
        );

        const brig = makeFormation({
            id: 'brig_unresolved',
            location_osid: 'op:m:depth_island',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_unresolved: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:depth_island': 1,
        });

        const adjacency = makeAdjacency([]);
        const friendlyOsids = new Set(['op:m:front_a', 'op:m:depth_island']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector1],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        expect(sector1.assigned_brigade_ids).not.toContain('brig_unresolved');
        expect(sector1.reserve_brigade_ids).not.toContain('brig_unresolved');
    });

    it('keeps loaned brigades unresolved when the loan target corps has only other-component sectors', () => {
        const ssLoan = makeSubSeg('ss_loan', ['op:m:front_x'], ['op:m:enemy_x'], 3);
        const sectorLoan = makeSector(
            'sector:vrs_1st_krajina:0', 'vrs_1st_krajina', [ssLoan],
            ['op:m:front_x'],
        );

        const brigLoaned = makeFormation({
            id: 'brig_loaned_unresolved',
            location_osid: 'op:m:depth_island',
            corps_id: 'vrs_drina',
        });
        (brigLoaned as any).elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'vrs_1st_krajina',
        };

        const formations: Record<FormationId, FormationState> = {
            brig_loaned_unresolved: brigLoaned,
        };

        const componentOf = makeComponentOf({
            'op:m:front_x': 0,
            'op:m:depth_island': 1,
        });

        const adjacency = makeAdjacency([]);
        const friendlyOsids = new Set(['op:m:front_x', 'op:m:depth_island']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sectorLoan],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
        );

        expect(sectorLoan.assigned_brigade_ids).not.toContain('brig_loaned_unresolved');
        expect(sectorLoan.reserve_brigade_ids).not.toContain('brig_loaned_unresolved');
    });

    it('does not use minimum coverage to transfer brigades across components', () => {
        const donor = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('donor', ['op:m:front_donor'], ['op:m:enemy_1'], 3)],
            ['op:m:front_donor'],
        );
        donor.assigned_brigade_ids = ['brig_donor_a', 'brig_donor_b'];

        const recipient = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('recipient', ['op:m:front_recipient'], ['op:m:enemy_2'], 3)],
            ['op:m:front_recipient'],
        );

        const formations: Record<FormationId, FormationState> = {
            brig_donor_a: makeFormation({
                id: 'brig_donor_a',
                location_osid: 'op:m:rear_donor',
                corps_id: 'vrs_drina',
            }),
            brig_donor_b: makeFormation({
                id: 'brig_donor_b',
                location_osid: 'op:m:rear_donor',
                corps_id: 'vrs_drina',
            }),
        };

        const adjacency = makeAdjacency([
            ['op:m:rear_donor', 'op:m:front_recipient'],
            ['op:m:rear_donor', 'op:m:front_donor'],
        ]);
        const friendlyOsids = new Set(['op:m:rear_donor', 'op:m:front_donor', 'op:m:front_recipient']);
        const componentOf = makeComponentOf({
            'op:m:front_donor': 0,
            'op:m:rear_donor': 0,
            'op:m:front_recipient': 1,
        });

        ensureMinimumSectorCoverage(
            [donor, recipient],
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
        );

        expect(recipient.assigned_brigade_ids).toEqual([]);
        expect(donor.assigned_brigade_ids).toEqual(['brig_donor_a', 'brig_donor_b']);
    });

    it('rescues an unreachable brigade into another same-corps sector that truthfully owns its territory', () => {
        const wrongSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('wrong', ['op:m:front_wrong'], ['op:m:enemy_1'], 3)],
            ['op:m:front_wrong'],
        );
        const correctSector = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('correct', ['op:m:front_correct'], ['op:m:enemy_2'], 3)],
            ['op:m:front_correct', 'op:m:rear_correct'],
        );

        const brig = makeFormation({
            id: 'brig_rehome',
            location_osid: 'op:m:rear_correct',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_rehome: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_wrong': 0,
            'op:m:front_correct': 0,
            'op:m:rear_correct': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:rear_correct', 'op:m:front_correct'],
        ]);

        const friendlyOsids = new Set(['op:m:front_wrong', 'op:m:front_correct', 'op:m:rear_correct']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [wrongSector, correctSector],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
            { brig_rehome: 'sector:vrs_drina:0' },
            {
                meta: { turn: 0 } as any,
                military: { formations } as any,
            } as any,
        );

        expect(wrongSector.assigned_brigade_ids).not.toContain('brig_rehome');
        expect(correctSector.assigned_brigade_ids).toContain('brig_rehome');
    });

    it('ignores stale player overrides that point into a different connected component', () => {
        const correctSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('correct', ['op:m:front_a'], ['op:m:enemy_1'], 3)],
            ['op:m:front_a', 'op:m:rear_a'],
        );
        const staleSector = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('stale', ['op:m:front_b'], ['op:m:enemy_2'], 3)],
            ['op:m:front_b'],
        );

        const brig = makeFormation({
            id: 'brig_override_guard',
            location_osid: 'op:m:rear_a',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_override_guard: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:rear_a': 0,
            'op:m:front_b': 1,
        });

        const adjacency = makeAdjacency([
            ['op:m:rear_a', 'op:m:front_a'],
        ]);

        const friendlyOsids = new Set(['op:m:front_a', 'op:m:rear_a', 'op:m:front_b']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [correctSector, staleSector],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
            { brig_override_guard: 'sector:vrs_drina:1' },
        );

        expect(staleSector.assigned_brigade_ids).not.toContain('brig_override_guard');
        expect(correctSector.assigned_brigade_ids).toContain('brig_override_guard');
    });

    it('keeps deep-rear brigades assigned when their sector front is truthful but farther than the phase-2 hop cap', () => {
        const deepSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('deep', ['op:m:front_0'], ['op:m:enemy_0'], 3)],
            ['op:m:front_0', 'op:m:rear_1', 'op:m:rear_2', 'op:m:rear_3', 'op:m:rear_4', 'op:m:rear_5'],
        );

        const brig = makeFormation({
            id: 'brig_deep_rear',
            location_osid: 'op:m:rear_5',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_deep_rear: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_0': 0,
            'op:m:rear_1': 0,
            'op:m:rear_2': 0,
            'op:m:rear_3': 0,
            'op:m:rear_4': 0,
            'op:m:rear_5': 0,
        });

        const adjacency = makeAdjacency([
            ['op:m:front_0', 'op:m:rear_1'],
            ['op:m:rear_1', 'op:m:rear_2'],
            ['op:m:rear_2', 'op:m:rear_3'],
            ['op:m:rear_3', 'op:m:rear_4'],
            ['op:m:rear_4', 'op:m:rear_5'],
        ]);

        const friendlyOsids = new Set(['op:m:front_0', 'op:m:rear_1', 'op:m:rear_2', 'op:m:rear_3', 'op:m:rear_4', 'op:m:rear_5']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [deepSector],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
            undefined,
            {
                meta: { turn: 0 } as any,
                military: { formations } as any,
            } as any,
        );

        expect(deepSector.assigned_brigade_ids).toContain('brig_deep_rear');
    });

    it('does not cross-component reassign an unreachable brigade during trap remediation', () => {
        const sector1 = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('s1', ['op:m:front_a'], ['op:m:enemy_a'], 3)],
            ['op:m:front_a', 'op:m:depth_a'],
        );
        const sector2 = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('s2', ['op:m:front_c'], ['op:m:enemy_c'], 3)],
            ['op:m:front_c'],
        );

        const brig = makeFormation({
            id: 'brig_trapped',
            location_osid: 'op:m:depth_a',
            corps_id: 'vrs_drina',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_trapped: brig,
        };

        const componentOf = makeComponentOf({
            'op:m:front_a': 0,
            'op:m:depth_a': 0,
            'op:m:front_c': 1,
        });

        const adjacency = makeAdjacency([
            ['op:m:depth_a', 'op:m:front_c'],
        ]);

        const friendlyOsids = new Set(['op:m:front_a', 'op:m:depth_a', 'op:m:front_c']);
        const commanderProfiles = new Map<string, CorpsCommanderProfile>();

        classifyBrigadesByTerritory(
            [sector1, sector2],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            componentOf,
            commanderProfiles,
            undefined,
            {
                meta: { turn: 0 } as any,
                military: { formations } as any,
            } as any,
        );

        expect(sector1.assigned_brigade_ids).not.toContain('brig_trapped');
        expect(sector2.assigned_brigade_ids).not.toContain('brig_trapped');
        expect(sector1.reserve_brigade_ids).not.toContain('brig_trapped');
        expect(sector2.reserve_brigade_ids).not.toContain('brig_trapped');
    });

    it('assigns an enclave defender when its corps has no sector in the brigade component', () => {
        const homeCorpsSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('home', ['op:m:front_home'], ['op:m:enemy_home'], 3)],
            ['op:m:front_home'],
        );
        const enclaveSector = makeSector(
            'sector:vrs_herzegovina:0',
            'vrs_herzegovina',
            [makeSubSeg('enclave', ['op:m:front_enclave'], ['op:m:enemy_enclave'], 3)],
            ['op:m:front_enclave', 'op:m:enclave_rear'],
        );

        const enclaveBrigade = makeFormation({
            id: 'brig_enclave',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:enclave_rear',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_enclave: enclaveBrigade,
        };

        const componentOf = makeComponentOf({
            'op:m:front_home': 0,
            'op:m:front_enclave': 1,
            'op:m:enclave_rear': 1,
        });

        assignCrossCorpsEnclaveDefenders(
            [homeCorpsSector, enclaveSector],
            formations,
            'RS' as FactionId,
            componentOf,
        );

        expect(enclaveSector.assigned_brigade_ids).toContain('brig_enclave');
        expect(homeCorpsSector.assigned_brigade_ids).not.toContain('brig_enclave');
    });

    it('does not assign an enclave defender to a same-component faction sector when its current OSID is not on that sector front or in its territory', () => {
        const homeCorpsSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('home', ['op:m:front_home'], ['op:m:enemy_home'], 3)],
            ['op:m:front_home'],
        );
        const localFactionSector = makeSector(
            'sector:vrs_herzegovina:0',
            'vrs_herzegovina',
            [makeSubSeg('local', ['op:m:front_local'], ['op:m:enemy_local'], 3)],
            ['op:m:front_local'],
        );

        const enclaveBrigade = makeFormation({
            id: 'brig_component_only',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:rear_local',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_component_only: enclaveBrigade,
        };

        const componentOf = makeComponentOf({
            'op:m:front_home': 0,
            'op:m:front_local': 1,
            'op:m:rear_local': 1,
        });

        assignCrossCorpsEnclaveDefenders(
            [homeCorpsSector, localFactionSector],
            formations,
            'RS' as FactionId,
            componentOf,
        );

        expect(localFactionSector.assigned_brigade_ids).not.toContain('brig_component_only');
        expect(homeCorpsSector.assigned_brigade_ids).not.toContain('brig_component_only');
    });

    it('does emit a final unresolved warning when enclave rescue has no truthful front or territory claim to assign', () => {
        const homeCorpsSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('home', ['op:m:front_home'], ['op:m:enemy_home'], 3)],
            ['op:m:front_home'],
        );
        const localFactionSector = makeSector(
            'sector:vrs_herzegovina:0',
            'vrs_herzegovina',
            [makeSubSeg('local', ['op:m:front_local'], ['op:m:enemy_local'], 3)],
            ['op:m:front_local'],
        );

        const enclaveBrigade = makeFormation({
            id: 'brig_rescued_enclave',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:rear_local',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_rescued_enclave: enclaveBrigade,
        };

        const componentOf = makeComponentOf({
            'op:m:front_home': 0,
            'op:m:front_local': 1,
            'op:m:rear_local': 1,
        });

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let emittedUnresolved = false;

        try {
            assignCrossCorpsEnclaveDefenders(
                [homeCorpsSector, localFactionSector],
                formations,
                'RS' as FactionId,
                componentOf,
            );

            warnUnresolvedSectorAssignments(
                [homeCorpsSector, localFactionSector],
                formations,
                'RS' as FactionId,
            );
            emittedUnresolved = warnSpy.mock.calls.some(([message]) =>
                String(message).includes('UNRESOLVED brig_rescued_enclave'),
            );
        } finally {
            warnSpy.mockRestore();
        }

        expect(localFactionSector.assigned_brigade_ids).not.toContain('brig_rescued_enclave');
        expect(emittedUnresolved).toBe(true);
    });

    it('strips late paper assignments that are not on the sector front, territory, or one-hop reserve band', () => {
        const sector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('front', ['op:m:front'], ['op:m:enemy'], 3)],
            ['op:m:front', 'op:m:sector_depth'],
        );

        const formations: Record<FormationId, FormationState> = {
            brig_false: makeFormation({
                id: 'brig_false',
                corps_id: 'vrs_drina',
                location_osid: 'op:m:wrong_rear',
            }),
        };

        sector.assigned_brigade_ids = ['brig_false'];

        const adjacency = new Map<Osid, Osid[]>([
            ['op:m:front' as Osid, ['op:m:sector_depth' as Osid]],
            ['op:m:sector_depth' as Osid, ['op:m:front' as Osid]],
            ['op:m:wrong_rear' as Osid, []],
        ]);
        const friendlyOsids = new Set<string>(['op:m:front', 'op:m:sector_depth', 'op:m:wrong_rear']);

        enforcePhysicalSectorOwnership([sector], formations, adjacency, friendlyOsids);

        expect(sector.assigned_brigade_ids).not.toContain('brig_false');
        expect(sector.reserve_brigade_ids).not.toContain('brig_false');
    });

    it('rehomes an unassigned brigade back into the truthful same-corps sector owner of its current location', () => {
        const sector = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('front', ['op:m:front'], ['op:m:enemy'], 3)],
            ['op:m:front', 'op:m:depth'],
        );
        const formations: Record<FormationId, FormationState> = {
            brig_rehome_final: makeFormation({
                id: 'brig_rehome_final',
                corps_id: 'vrs_drina',
                location_osid: 'op:m:front',
            }),
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:m:front' as Osid, ['op:m:depth' as Osid]],
            ['op:m:depth' as Osid, ['op:m:front' as Osid]],
        ]);
        const friendlyOsids = new Set<string>(['op:m:front', 'op:m:depth']);

        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            [sector],
            formations,
            'RS' as FactionId,
            adjacency,
            friendlyOsids,
        );

        expect(sector.assigned_brigade_ids).toContain('brig_rehome_final');
    });

    it('does emit a final unresolved warning for a loaned reserve brigade that still falls through', () => {
        const loanedReserve = makeFormation({
            id: 'brig_loaned_unresolved_final',
            corps_id: 'vrs_main_staff',
            location_osid: 'op:m:isolated_reserve',
        });
        (loanedReserve as any).elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'vrs_drina',
        };

        const formations: Record<FormationId, FormationState> = {
            brig_loaned_unresolved_final: loanedReserve,
        };

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let emittedUnresolved = false;

        try {
            warnUnresolvedSectorAssignments([], formations, 'RS' as FactionId);
            emittedUnresolved = warnSpy.mock.calls.some(([message]) =>
                String(message).includes('UNRESOLVED brig_loaned_unresolved_final'),
            );
        } finally {
            warnSpy.mockRestore();
        }

        expect(emittedUnresolved).toBe(true);
    });

    it('does not treat an allied interior brigade as sector-mandatory when no hostile frontline exists there', () => {
        const sector = makeSector(
            'sector:hvo_central_bosnia:0',
            'hvo_central_bosnia',
            [makeSubSeg('front', ['op:m:bugojno_front'], ['op:m:bugojno_enemy'], 3)],
            ['op:m:bugojno_front', 'op:m:bugojno_depth'],
        );
        const brigade = makeFormation({
            id: 'hrhb_travnik_brigade',
            faction: 'HRHB' as FactionId,
            corps_id: 'hvo_central_bosnia',
            location_osid: 'op:m:rat_2',
        });
        const adjacency = makeAdjacency([
            ['op:m:rat_2', 'op:m:orasac_2'],
            ['op:m:rat_2', 'op:m:zdrimci'],
        ]);

        const requiresSector = brigadeRequiresSectorAssignment(
            brigade,
            [sector],
            adjacency,
            [],
        );

        expect(requiresSector).toBe(false);
    });

    it('still treats a brigade on or one hop behind a hostile frontier as sector-mandatory even before sector assignment exists', () => {
        const brigade = makeFormation({
            id: 'brig_front_gap',
            location_osid: 'op:m:depth_behind_front',
            corps_id: 'vrs_drina',
        });
        const adjacency = makeAdjacency([
            ['op:m:depth_behind_front', 'op:m:front'],
            ['op:m:front', 'op:m:rear'],
        ]);

        const requiresSector = brigadeRequiresSectorAssignment(
            brigade,
            [],
            adjacency,
            [
                {
                    edge_id: 'op:m:front__op:m:enemy',
                    a: 'op:m:front',
                    b: 'op:m:enemy',
                    side_a: 'RS',
                    side_b: 'RBiH',
                },
            ],
        );

        expect(requiresSector).toBe(true);
    });

    it('clears stale assigned_sub_segment_id when a brigade is no longer sector-owned', () => {
        const dropped = makeFormation({
            id: 'brig_dropped',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:rear_local',
        });
        dropped.assignment = { kind: 'sector', sector_id: 'sector:vrs_drina:0', role: 'front' } as any;
        dropped.assigned_sub_segment_id = 'subseg:sector:vrs_drina:0:0';

        const kept = makeFormation({
            id: 'brig_kept',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:front',
        });
        kept.assigned_sub_segment_id = 'subseg:old';

        const formations: Record<FormationId, FormationState> = {
            brig_dropped: dropped,
            brig_kept: kept,
        };

        const sector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('front', ['op:m:front'], ['op:m:enemy'], 3)],
            ['op:m:front'],
        );
        sector.assigned_brigade_ids = ['brig_kept'];

        syncSectorAssignmentsToFormations(
            { [sector.sector_id]: sector },
            formations,
        );

        expect(formations.brig_dropped.assignment).toBeNull();
        expect(formations.brig_dropped.assigned_sub_segment_id).toBeUndefined();
        expect(formations.brig_kept.assignment).toEqual({ kind: 'sector', sector_id: sector.sector_id, role: 'front' });
        expect(formations.brig_kept.assigned_sub_segment_id).toBeUndefined();
    });
});
