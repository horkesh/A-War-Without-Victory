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
    isMovementOwnedReturnToCorps,
    rehomeUnassignedBrigadesToPhysicalSectorOwners,
    syncSectorAssignmentsToFormations,
    warnUnresolvedSectorAssignments,
} from '../src/sim/combat/brigade_assignment.js';
import { applyFinalSectorOwnerTruthPass, collectUnresolvedSectorBrigades } from '../src/sim/combat/corps_front_sectors.js';
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
import { strictCompare } from '../src/state/validateGameState.js';
import { makeAdjacency as makeAdjacencyShared } from './_helpers/adjacency.js';

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

// Wraps the shared `makeAdjacency` helper to preserve the local
// `Map<Osid, Osid[]>` return shape that downstream call-sites expect.
const makeAdjacency = (connections: [string, string][]): Map<Osid, Osid[]> =>
    makeAdjacencyShared(connections) as unknown as Map<Osid, Osid[]>;

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

    it('keeps same-corps same-component interior brigades sector-owned as rear brigades', () => {
        const sector = makeSector(
            'sector:vrs_2nd_krajina:0',
            'vrs_2nd_krajina',
            [makeSubSeg('front', ['op:m:front'], ['op:m:enemy'], 3)],
            ['op:m:front'],
        );
        const rearChain = Array.from({ length: 36 }, (_, i) => `op:m:rear_${i}`);
        const brigade = makeFormation({
            id: 'rs_17th_klju_light_infantry',
            corps_id: 'vrs_2nd_krajina',
            location_osid: rearChain[0],
            home_osid: rearChain[0],
        });
        const formations: Record<FormationId, FormationState> = {
            rs_17th_klju_light_infantry: brigade,
        };
        const links: [string, string][] = [];
        for (let i = 0; i < rearChain.length - 1; i++) {
            links.push([rearChain[i]!, rearChain[i + 1]!]);
        }
        links.push([rearChain[rearChain.length - 1]!, 'op:m:front']);
        const adjacency = makeAdjacency(links);
        const friendlyOsids = new Set<string>(['op:m:front', ...rearChain]);
        const componentOf = makeComponentOf(
            Object.fromEntries(['op:m:front', ...rearChain].map((osid) => [osid, 0])),
        );
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

        expect(sector.assigned_brigade_ids).toEqual([]);
        expect(sector.rear_brigade_ids).toEqual(['rs_17th_klju_light_infantry']);
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

    it('does not assign a brigade cross-corps when its corps has no sector in the brigade component', () => {
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
            home_osid: 'op:m:lost_home',
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

        expect(enclaveSector.assigned_brigade_ids).not.toContain('brig_enclave');
        expect(homeCorpsSector.assigned_brigade_ids).not.toContain('brig_enclave');
    });

    it('does not assign a drifted brigade cross-corps when its home municipality is still covered by own-corps territory', () => {
        const homeCorpsSector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('home', ['op:m:front_home'], ['op:m:enemy_home'], 3)],
            ['op:m:front_home', 'op:m:home_still_owned'],
        );
        const enclaveSector = makeSector(
            'sector:vrs_herzegovina:0',
            'vrs_herzegovina',
            [makeSubSeg('enclave', ['op:m:front_enclave'], ['op:m:enemy_enclave'], 3)],
            ['op:m:front_enclave', 'op:m:enclave_rear'],
        );

        const driftedBrigade = makeFormation({
            id: 'brig_drifted',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:enclave_rear',
            home_osid: 'op:m:home_still_owned',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_drifted: driftedBrigade,
        };

        const componentOf = makeComponentOf({
            'op:m:front_home': 0,
            'op:m:home_still_owned': 0,
            'op:m:front_enclave': 1,
            'op:m:enclave_rear': 1,
        });

        assignCrossCorpsEnclaveDefenders(
            [homeCorpsSector, enclaveSector],
            formations,
            'RS' as FactionId,
            componentOf,
        );

        expect(enclaveSector.assigned_brigade_ids).not.toContain('brig_drifted');
        expect(homeCorpsSector.assigned_brigade_ids).not.toContain('brig_drifted');
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

    it('absorbs collapsed rear-guard corps survivors into the truthful local faction sector owner', () => {
        const localSector = makeSector(
            'sector:vrs_1st_krajina:11',
            'vrs_1st_krajina',
            [makeSubSeg('front', ['op:bosanski_novi:suhaca_4'], ['op:enemy:a'], 3)],
            ['op:bosanski_novi:suhaca_4', 'op:sanski_most:jelasinovci'],
        );
        const disconnectedOwnCorpsSector = makeSector(
            'sector:vrs_2nd_krajina:4',
            'vrs_2nd_krajina',
            [makeSubSeg('own_front', ['op:bihac:trubar'], ['op:enemy:b'], 3)],
            ['op:bihac:trubar'],
        );
        const formations: Record<FormationId, FormationState> = {
            rs_11th_krupa_light_infantry: makeFormation({
                id: 'rs_11th_krupa_light_infantry',
                corps_id: 'vrs_2nd_krajina',
                location_osid: 'op:bosanski_novi:suhaca_4',
                home_osid: 'op:bosanska_krupa:donji_dubovik_2',
            }),
        };
        const adjacency = makeAdjacency([
            ['op:bosanski_novi:suhaca_4', 'op:sanski_most:jelasinovci'],
        ]);
        const friendlyOsids = new Set<string>([
            'op:bosanski_novi:suhaca_4',
            'op:sanski_most:jelasinovci',
        ]);

        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            [localSector, disconnectedOwnCorpsSector],
            formations,
            'RS' as FactionId,
            adjacency,
            friendlyOsids,
            { allowCollapsedRearGuardAbsorption: true },
        );

        expect(localSector.assigned_brigade_ids).toContain('rs_11th_krupa_light_infantry');
    });

    it('does not absorb collapsed rear-guard corps survivors outside the final repair pass', () => {
        const localSector = makeSector(
            'sector:vrs_1st_krajina:11',
            'vrs_1st_krajina',
            [makeSubSeg('front', ['op:bosanski_novi:suhaca_4'], ['op:enemy:a'], 3)],
            ['op:bosanski_novi:suhaca_4'],
        );
        const disconnectedOwnCorpsSector = makeSector(
            'sector:vrs_2nd_krajina:4',
            'vrs_2nd_krajina',
            [makeSubSeg('own_front', ['op:bihac:trubar'], ['op:enemy:b'], 3)],
            ['op:bihac:trubar'],
        );
        const formations: Record<FormationId, FormationState> = {
            rs_11th_krupa_light_infantry: makeFormation({
                id: 'rs_11th_krupa_light_infantry',
                corps_id: 'vrs_2nd_krajina',
                location_osid: 'op:bosanski_novi:suhaca_4',
            }),
        };

        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            [localSector, disconnectedOwnCorpsSector],
            formations,
            'RS' as FactionId,
            makeAdjacency([]),
            new Set<string>(['op:bosanski_novi:suhaca_4', 'op:bihac:trubar']),
        );

        expect(localSector.assigned_brigade_ids).not.toContain('rs_11th_krupa_light_infantry');
        expect(localSector.reserve_brigade_ids).not.toContain('rs_11th_krupa_light_infantry');
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

    it('treats a brigade on another same-faction corps frontline as sector-mandatory even when its own corps has sectors elsewhere', () => {
        const ownCorpsSector = makeSector(
            'sector:hvo_southeast_herzegovina:0',
            'hvo_southeast_herzegovina',
            [makeSubSeg('front', ['op:m:posusje_front'], ['op:m:posusje_enemy'], 3)],
            ['op:m:posusje_front', 'op:m:posusje_depth'],
        );
        const neighboringCorpsSector = makeSector(
            'sector:hvo_tomislavgrad:0',
            'hvo_tomislavgrad',
            [makeSubSeg('front', ['op:m:kongora'], ['op:m:kongora_enemy'], 3)],
            ['op:m:kongora', 'op:m:kongora_depth'],
        );
        const brigade = makeFormation({
            id: 'hrhb_herceg_stjepan_brigade',
            faction: 'HRHB' as FactionId,
            corps_id: 'hvo_southeast_herzegovina',
            location_osid: 'op:m:kongora',
        });
        const adjacency = makeAdjacency([
            ['op:m:kongora', 'op:m:kongora_enemy'],
            ['op:m:posusje_front', 'op:m:posusje_enemy'],
        ]);

        const requiresSector = brigadeRequiresSectorAssignment(
            brigade,
            [ownCorpsSector, neighboringCorpsSector],
            adjacency,
            [
                {
                    edge_id: 'op:m:kongora__op:m:kongora_enemy',
                    a: 'op:m:kongora',
                    b: 'op:m:kongora_enemy',
                    side_a: 'HRHB',
                    side_b: 'RBiH',
                },
                {
                    edge_id: 'op:m:posusje_front__op:m:posusje_enemy',
                    a: 'op:m:posusje_front',
                    b: 'op:m:posusje_enemy',
                    side_a: 'HRHB',
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

    // ─── Drifted-brigade gate in rehomeUnassignedBrigadesToPhysicalSectorOwners ──

    it('demotes a deeper same-sector reserve packet to rear physical truth', () => {
        const reserve = makeFormation({
            id: 'brig_reserve_depth',
            corps_id: 'vrs_drina',
            location_osid: 'op:m:rear_depth',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_reserve_depth: reserve,
        };

        const sector = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('front', ['op:m:front'], ['op:m:enemy'], 3)],
            ['op:m:front', 'op:m:rear_local', 'op:m:rear_depth'],
        );
        sector.reserve_brigade_ids = ['brig_reserve_depth'];

        const adjacency = makeAdjacency([
            ['op:m:front', 'op:m:rear_local'],
            ['op:m:rear_local', 'op:m:rear_depth'],
        ]);

        syncSectorAssignmentsToFormations(
            { [sector.sector_id]: sector },
            formations,
            adjacency,
        );

        expect(formations.brig_reserve_depth.assignment).toEqual({
            kind: 'sector',
            sector_id: sector.sector_id,
            role: 'rear',
        });
    });

    it('final owner truth pass deduplicates a brigade before syncing formation assignment', () => {
        const sectorA = makeSector(
            'sector:vrs_drina:0',
            'vrs_drina',
            [makeSubSeg('front_a', ['op:m:front'], ['op:m:enemy_a'], 3)],
            ['op:m:front'],
        );
        const sectorB = makeSector(
            'sector:vrs_drina:1',
            'vrs_drina',
            [makeSubSeg('front_b', ['op:m:front'], ['op:m:enemy_b'], 3)],
            ['op:m:front'],
        );
        sectorA.assigned_brigade_ids = ['brig_duplicate'];
        sectorB.assigned_brigade_ids = ['brig_duplicate'];
        sectorB.defensive_power = 999;

        const formations: Record<FormationId, FormationState> = {
            brig_duplicate: makeFormation({
                id: 'brig_duplicate',
                corps_id: 'vrs_drina',
                location_osid: 'op:m:front',
            }),
        };
        const sectors = {
            [sectorA.sector_id]: sectorA,
            [sectorB.sector_id]: sectorB,
        };
        const state = {
            meta: { turn: 2 },
            political: {
                political_controllers: {
                    'op:m:front': 'RS',
                    'op:m:enemy_a': 'RBiH',
                    'op:m:enemy_b': 'RBiH',
                },
            },
            military: {
                formations,
                brigade_movement_orders: {},
                corps_command: {},
            },
        } as unknown as GameState;
        const adjacency = makeAdjacency([
            ['op:m:front', 'op:m:enemy_a'],
            ['op:m:front', 'op:m:enemy_b'],
        ]);

        applyFinalSectorOwnerTruthPass(sectors, state, formations, adjacency);

        const claims = [sectorA, sectorB].flatMap((sector) => sector.assigned_brigade_ids);
        expect(claims).toEqual(['brig_duplicate']);
        expect(formations.brig_duplicate.assignment).toEqual({
            kind: 'sector',
            sector_id: 'sector:vrs_drina:0',
            role: 'front',
        });
        expect(sectorB.assigned_brigade_ids).toEqual([]);
        expect(sectorB.defensive_power).toBe(0);
    });

    it('final owner truth pass reruns minimum coverage after late rehome creates a same-corps donor', () => {
        const recipient = makeSector(
            'sector:vrs_1st_krajina:17',
            'vrs_1st_krajina',
            [makeSubSeg(
                'recipient',
                [
                    'op:jajce:grdovo',
                    'op:donji_vakuf:kutanja',
                    'op:donji_vakuf:babin_potok_2',
                    'op:sipovo:pribeljci_2',
                ],
                ['op:enemy:recipient'],
                10,
            )],
            ['op:jajce:grdovo', 'op:donji_vakuf:kutanja', 'op:donji_vakuf:babin_potok_2', 'op:sipovo:pribeljci_2'],
            10,
        );
        recipient.assigned_brigade_ids = ['rs_1st_sipovo_light_infantry'];
        recipient.threat_ratio = 16;

        const donor = makeSector(
            'sector:vrs_1st_krajina:5',
            'vrs_1st_krajina',
            [makeSubSeg(
                'donor',
                ['op:kljuc:donji_vrbljani_2', 'op:titov_drvar:prekaja_2', 'op:kljuc:front'],
                ['op:enemy:donor'],
                12,
            )],
            ['op:kljuc:donji_vrbljani_2', 'op:titov_drvar:prekaja_2', 'op:kljuc:front'],
            12,
        );
        donor.assigned_brigade_ids = ['rs_1st_banja_luka_light_infantry', 'rs_2nd_banja_luka_light_infantry'];
        donor.threat_ratio = 0;

        const formations: Record<FormationId, FormationState> = {
            rs_1st_sipovo_light_infantry: makeFormation({
                id: 'rs_1st_sipovo_light_infantry',
                corps_id: 'vrs_1st_krajina',
                location_osid: 'op:jajce:grdovo',
            }),
            rs_1st_banja_luka_light_infantry: makeFormation({
                id: 'rs_1st_banja_luka_light_infantry',
                corps_id: 'vrs_1st_krajina',
                location_osid: 'op:kljuc:front',
            }),
            rs_2nd_banja_luka_light_infantry: makeFormation({
                id: 'rs_2nd_banja_luka_light_infantry',
                corps_id: 'vrs_1st_krajina',
                location_osid: 'op:titov_drvar:prekaja_2',
            }),
            rs_4th_banja_luka_light_infantry: makeFormation({
                id: 'rs_4th_banja_luka_light_infantry',
                corps_id: 'vrs_1st_krajina',
                location_osid: 'op:kljuc:donji_vrbljani_2',
                home_osid: 'op:banja_luka:home',
            }),
        };

        const sectors = {
            [recipient.sector_id]: recipient,
            [donor.sector_id]: donor,
        };
        const state = {
            meta: { turn: 2 },
            political: {
                political_controllers: {
                    'op:jajce:grdovo': 'RS',
                    'op:donji_vakuf:kutanja': 'RS',
                    'op:donji_vakuf:babin_potok_2': 'RS',
                    'op:sipovo:pribeljci_2': 'RS',
                    'op:kljuc:donji_vrbljani_2': 'RS',
                    'op:titov_drvar:prekaja_2': 'RS',
                    'op:kljuc:front': 'RS',
                    'op:kljuc:relay_1': 'RS',
                    'op:kljuc:relay_2': 'RS',
                    'op:banja_luka:home': 'RS',
                    'op:enemy:recipient': 'RBiH',
                    'op:enemy:donor': 'RBiH',
                },
            },
            military: {
                formations,
                brigade_movement_orders: {},
                brigade_movement_state: {},
                corps_command: {},
            },
        } as unknown as GameState;
        const adjacency = makeAdjacency([
            ['op:jajce:grdovo', 'op:enemy:recipient'],
            ['op:jajce:grdovo', 'op:donji_vakuf:kutanja'],
            ['op:donji_vakuf:kutanja', 'op:donji_vakuf:babin_potok_2'],
            ['op:donji_vakuf:babin_potok_2', 'op:sipovo:pribeljci_2'],
            ['op:kljuc:front', 'op:enemy:donor'],
            ['op:kljuc:donji_vrbljani_2', 'op:kljuc:relay_1'],
            ['op:kljuc:relay_1', 'op:kljuc:relay_2'],
            ['op:kljuc:relay_2', 'op:donji_vakuf:kutanja'],
            ['op:kljuc:donji_vrbljani_2', 'op:kljuc:front'],
            ['op:titov_drvar:prekaja_2', 'op:kljuc:front'],
            ['op:kljuc:front', 'op:banja_luka:home'],
            ['op:banja_luka:home', 'op:kljuc:relay_1'],
        ]);

        applyFinalSectorOwnerTruthPass(sectors, state, formations, adjacency);

        expect(donor.assigned_brigade_ids).not.toContain('rs_4th_banja_luka_light_infantry');
        expect(recipient.assigned_brigade_ids).toContain('rs_4th_banja_luka_light_infantry');
        expect(formations.rs_4th_banja_luka_light_infantry.location_osid).toBe('op:donji_vakuf:kutanja');
        expect(formations.rs_4th_banja_luka_light_infantry.assignment).toEqual({
            kind: 'sector',
            sector_id: recipient.sector_id,
            role: 'front',
        });
    });

    it('rehome skips drifted brigade whose home_osid is still in own-corps territory', () => {
        // Brigade at foreign-corps territory but home_osid is in own-corps sector
        const ownCorpsSector = makeSector(
            'sector:vrs_1st_krajina:0',
            'vrs_1st_krajina',
            [makeSubSeg('front_own', ['op:banja_luka:front'], ['op:enemy:a'], 3)],
            ['op:banja_luka:front', 'op:banja_luka:melina_2'],
        );
        const foreignCorpsSector = makeSector(
            'sector:vrs_2nd_krajina:0',
            'vrs_2nd_krajina',
            [makeSubSeg('front_foreign', ['op:kljuc:front'], ['op:enemy:b'], 3)],
            ['op:kljuc:front', 'op:kljuc:donje_ratkovo_2'],
        );

        const driftedBrig = makeFormation({
            id: 'brig_drifted',
            corps_id: 'vrs_1st_krajina',
            location_osid: 'op:kljuc:donje_ratkovo_2',  // in foreign-corps territory
            home_osid: 'op:banja_luka:melina_2',         // still in own-corps territory
        });

        const formations: Record<FormationId, FormationState> = {
            brig_drifted: driftedBrig,
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:banja_luka:front' as Osid, ['op:banja_luka:melina_2' as Osid]],
            ['op:banja_luka:melina_2' as Osid, ['op:banja_luka:front' as Osid]],
            ['op:kljuc:front' as Osid, ['op:kljuc:donje_ratkovo_2' as Osid]],
            ['op:kljuc:donje_ratkovo_2' as Osid, ['op:kljuc:front' as Osid]],
        ]);
        const friendlyOsids = new Set<string>([
            'op:banja_luka:front', 'op:banja_luka:melina_2',
            'op:kljuc:front', 'op:kljuc:donje_ratkovo_2',
        ]);

        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            [ownCorpsSector, foreignCorpsSector],
            formations,
            'RS' as FactionId,
            adjacency,
            friendlyOsids,
        );

        // Should NOT be assigned to foreign corps sector
        expect(foreignCorpsSector.assigned_brigade_ids).not.toContain('brig_drifted');
        expect(foreignCorpsSector.reserve_brigade_ids).not.toContain('brig_drifted');
        // Should NOT be assigned to own corps sector either (it's not physically there)
        expect(ownCorpsSector.assigned_brigade_ids).not.toContain('brig_drifted');
        expect(ownCorpsSector.reserve_brigade_ids).not.toContain('brig_drifted');
    });

    it('rehome keeps same-corps friendly-reachable brigades as deep rear even when home remains in own-corps territory', () => {
        const sector = makeSector(
            'sector:vrs_1st_krajina:0',
            'vrs_1st_krajina',
            [makeSubSeg('front_own', ['op:prijedor:front'], ['op:enemy:a'], 3)],
            ['op:prijedor:front', 'op:banja_luka:home'],
        );

        const brigade = makeFormation({
            id: 'brig_same_corps_rear',
            corps_id: 'vrs_1st_krajina',
            location_osid: 'op:kljuc:rear',
            home_osid: 'op:banja_luka:home',
        });

        const formations: Record<FormationId, FormationState> = {
            brig_same_corps_rear: brigade,
        };
        const adjacency = makeAdjacency([
            ['op:kljuc:rear', 'op:kljuc:bridge'],
            ['op:kljuc:bridge', 'op:prijedor:front'],
            ['op:prijedor:front', 'op:banja_luka:home'],
            ['op:prijedor:front', 'op:enemy:a'],
        ]);
        const friendlyOsids = new Set<string>([
            'op:kljuc:rear',
            'op:kljuc:bridge',
            'op:prijedor:front',
            'op:banja_luka:home',
        ]);

        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            [sector],
            formations,
            'RS' as FactionId,
            adjacency,
            friendlyOsids,
        );

        expect(sector.rear_brigade_ids).toEqual(['brig_same_corps_rear']);
        expect(sector.territory_osids).toContain('op:kljuc:rear');
        expect(sector.territory_osids).toContain('op:kljuc:bridge');
    });

    it('does not warn when a rear-guard brigade is movement-owned on a column return home', () => {
        const sector = makeSector(
            'sector:vrs_1st_krajina:0',
            'vrs_1st_krajina',
            [makeSubSeg('front_home', ['op:prijedor:front'], ['op:enemy:a'], 3)],
            ['op:prijedor:front', 'op:prijedor:maricka_2'],
        );

        const movingBrigade = makeFormation({
            id: 'rs_1st_armored',
            corps_id: 'vrs_1st_krajina',
            location_osid: 'op:bosanska_krupa:vranjska_2',
            home_osid: 'op:prijedor:maricka_2',
        });

        const formations: Record<FormationId, FormationState> = {
            rs_1st_armored: movingBrigade,
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:bosanska_krupa:vranjska_2' as Osid, ['op:bosanska_krupa:jasenica_2' as Osid]],
            ['op:bosanska_krupa:jasenica_2' as Osid, ['op:bosanska_krupa:vranjska_2' as Osid]],
            ['op:prijedor:front' as Osid, ['op:prijedor:maricka_2' as Osid]],
            ['op:prijedor:maricka_2' as Osid, ['op:prijedor:front' as Osid]],
        ]);
        const friendlyOsids = new Set<string>([
            'op:bosanska_krupa:vranjska_2',
            'op:bosanska_krupa:jasenica_2',
            'op:prijedor:front',
            'op:prijedor:maricka_2',
        ]);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        classifyBrigadesByTerritory(
            [sector],
            'RS' as FactionId,
            formations,
            adjacency,
            friendlyOsids,
            new Map<string, number>([
                ['op:bosanska_krupa:vranjska_2', 1],
                ['op:bosanska_krupa:jasenica_2', 1],
                ['op:prijedor:front', 0],
                ['op:prijedor:maricka_2', 0],
            ]),
            new Map<string, CorpsCommanderProfile>(),
            undefined,
            {
                military: {
                    brigade_movement_orders: {
                        rs_1st_armored: {
                            destination_sids: ['op:prijedor:maricka_2'],
                            stance: 'column',
                        },
                    },
                    brigade_movement_state: {
                        rs_1st_armored: {
                            destination_sids: ['op:prijedor:maricka_2'],
                            path: ['op:bosanska_krupa:vranjska_2', 'op:prijedor:maricka_2'],
                            stance: 'column',
                            status: 'in_transit',
                            turns_remaining: 4,
                        },
                    },
                },
            } as unknown as GameState,
        );

        expect(warnSpy.mock.calls.join('\n')).not.toContain('UNASSIGNED rs_1st_armored');
        warnSpy.mockRestore();
    });

    it('recognizes a pending return-to-corps move into own-corps territory as movement-owned', () => {
        const ownCorpsSector = makeSector(
            'sector:hvo_southeast_herzegovina:0',
            'hvo_southeast_herzegovina',
            [makeSubSeg('front_own', ['op:stolac:front'], ['op:enemy:a'], 3)],
            ['op:posusje:posusje_2', 'op:stolac:front'],
        );
        const otherCorpsSector = makeSector(
            'sector:hvo_tomislavgrad:0',
            'hvo_tomislavgrad',
            [makeSubSeg('front_other', ['op:duvno:kongora'], ['op:kupres:bucovaca'], 3)],
            ['op:duvno:kongora'],
        );
        const brigade = makeFormation({
            id: 'hrhb_herceg_stjepan_brigade',
            faction: 'HRHB' as FactionId,
            corps_id: 'hvo_southeast_herzegovina',
            location_osid: 'op:duvno:kongora',
        });

        const movementOwned = isMovementOwnedReturnToCorps(
            {
                military: {
                    brigade_movement_orders: {
                        hrhb_herceg_stjepan_brigade: {
                            stance: 'column',
                            destination_sids: ['op:posusje:posusje_2'],
                        },
                    },
                },
            } as unknown as GameState,
            'hrhb_herceg_stjepan_brigade' as FormationId,
            brigade,
            [ownCorpsSector, otherCorpsSector],
        );

        expect(movementOwned).toBe(true);
    });

    it('does not keep a pending return-to-corps brigade in the final unresolved list', () => {
        const ownCorpsSector = makeSector(
            'sector:hvo_southeast_herzegovina:0',
            'hvo_southeast_herzegovina',
            [makeSubSeg('front_own', ['op:stolac:front'], ['op:enemy:a'], 3)],
            ['op:posusje:posusje_2', 'op:stolac:front'],
        );
        const otherCorpsSector = makeSector(
            'sector:hvo_tomislavgrad:0',
            'hvo_tomislavgrad',
            [makeSubSeg('front_other', ['op:duvno:kongora'], ['op:kupres:bucovaca'], 3)],
            ['op:duvno:kongora'],
        );
        const brigade = makeFormation({
            id: 'hrhb_herceg_stjepan_brigade',
            faction: 'HRHB' as FactionId,
            corps_id: 'hvo_southeast_herzegovina',
            location_osid: 'op:duvno:kongora',
        });
        const formations: Record<FormationId, FormationState> = {
            hrhb_herceg_stjepan_brigade: brigade,
        };
        const adjacency = makeAdjacency([
            ['op:duvno:kongora', 'op:kupres:bucovaca'],
            ['op:duvno:kongora', 'op:posusje:posusje_2'],
            ['op:stolac:front', 'op:enemy:a'],
        ]);

        const unresolved = collectUnresolvedSectorBrigades(
            {
                military: {
                    brigade_movement_orders: {
                        hrhb_herceg_stjepan_brigade: {
                            stance: 'column',
                            destination_sids: ['op:posusje:posusje_2'],
                        },
                    },
                    war_front_edges_osid: [{
                        edge_id: 'op:duvno:kongora__op:kupres:bucovaca',
                        a: 'op:duvno:kongora',
                        b: 'op:kupres:bucovaca',
                        side_a: 'HRHB',
                        side_b: 'RS',
                    }],
                },
            } as unknown as GameState,
            {
                [ownCorpsSector.sector_id]: ownCorpsSector,
                [otherCorpsSector.sector_id]: otherCorpsSector,
            },
            formations,
            adjacency,
        );

        expect(unresolved).toEqual([]);
    });

    it('rehome does not assign a foreign-corps enclave brigade whose home_osid is NOT in own-corps territory', () => {
        const foreignCorpsSector = makeSector(
            'sector:vrs_2nd_krajina:0',
            'vrs_2nd_krajina',
            [makeSubSeg('front_foreign', ['op:kljuc:front'], ['op:enemy:b'], 3)],
            ['op:kljuc:front', 'op:kljuc:depth'],
        );

        const enclaveBrig = makeFormation({
            id: 'brig_enclave',
            corps_id: 'vrs_1st_krajina',
            location_osid: 'op:kljuc:depth',     // in foreign-corps territory
            home_osid: 'op:lost:gone',            // home NOT in any sector territory
        });

        const formations: Record<FormationId, FormationState> = {
            brig_enclave: enclaveBrig,
        };
        const adjacency = new Map<Osid, Osid[]>([
            ['op:kljuc:front' as Osid, ['op:kljuc:depth' as Osid]],
            ['op:kljuc:depth' as Osid, ['op:kljuc:front' as Osid]],
        ]);
        const friendlyOsids = new Set<string>(['op:kljuc:front', 'op:kljuc:depth']);

        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            [foreignCorpsSector],
            formations,
            'RS' as FactionId,
            adjacency,
            friendlyOsids,
        );

        expect(foreignCorpsSector.assigned_brigade_ids).not.toContain('brig_enclave');
        expect(foreignCorpsSector.reserve_brigade_ids).not.toContain('brig_enclave');
    });
});
