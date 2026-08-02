import { describe, expect, it } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import { solveCorpsFrontSectorsPure } from '../src/sim/combat/sector_topology_solver.js';
import type {
    SectorTopologyFormation,
    SectorTopologyMutation,
    SectorTopologySolveInput,
    SectorTopologySolveOptions,
} from '../src/sim/combat/sector_topology_solver_types.js';
import type {
    CorpsFrontSector,
    FactionId,
    FormationAssignment,
} from '../src/state/game_state.js';

const FRONT_A = 'op:alpha:a';
const FRONT_B = 'op:bravo:b';
const FRONT_EDGE = `${FRONT_A}__${FRONT_B}`;

const SOLVE_OPTIONS: SectorTopologySolveOptions = {
    isFinalPass: false,
    finalSaveGeometryProjection: false,
    useFixedPointShortcuts: true,
    occupancyStrategy: 'dense-index',
    frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
};

function formation(
    id: string,
    faction: FactionId,
    kind: 'corps' | 'brigade',
    corpsId: string,
    locationOsid: string,
): SectorTopologyFormation {
    return {
        id,
        name: id,
        faction,
        status: 'active',
        assignment: null,
        kind,
        corps_id: kind === 'corps' ? null : corpsId,
        location_osid: locationOsid,
        home_osid: locationOsid,
        personnel: kind === 'brigade' ? 1_500 : 0,
        cohesion: 70,
        experience: 0.25,
        entrenchment_turns: 2,
    };
}

function contactEdges(): EdgeRecord[] {
    return [{
        a: FRONT_A,
        b: FRONT_B,
        type: 'shared_border',
        shared_segments: 1,
        min_dist: 0,
    }];
}

function constructedInput(withFront: boolean): SectorTopologySolveInput {
    const frontEdges = withFront
        ? [{
            edge_id: FRONT_EDGE,
            a: FRONT_A,
            b: FRONT_B,
            side_a: 'RBiH' as const,
            side_b: 'RS' as const,
        }]
        : [];
    return {
        provenance: {
            turn: 7,
            frontEdgeFingerprint: JSON.stringify(frontEdges.map((edge) => [
                edge.edge_id,
                edge.a,
                edge.b,
                edge.side_a,
                edge.side_b,
            ])),
            spatialComputedAtTurn: null,
            spatialPhase: null,
        },
        options: SOLVE_OPTIONS,
        turn: 7,
        decisionMode: 'historical',
        factionIds: ['RBiH', 'RS'],
        frontEdges,
        edges: contactEdges(),
        reverseMapEntries: [],
        centroidEntries: [],
        spatial: {
            adjacencyEntries: [],
            sharedBoundaryAdjacencyEntries: [],
            friendlyOsidsByFactionEntries: [],
            componentsByFactionEntries: [],
            computedAtTurn: null,
            phase: null,
        },
        politicalControllers: {
            [FRONT_A]: 'RBiH',
            [FRONT_B]: 'RS',
        },
        grazEastHerzegovinaActiveTurn: undefined,
        controlEvents: [],
        lastSupplyStateByOsid: {},
        campaignPlans: {},
        formations: {
            arbih_corps: formation('arbih_corps', 'RBiH', 'corps', 'arbih_corps', FRONT_A),
            arbih_brigade: formation('arbih_brigade', 'RBiH', 'brigade', 'arbih_corps', FRONT_A),
            vrs_corps: formation('vrs_corps', 'RS', 'corps', 'vrs_corps', FRONT_B),
            vrs_brigade: formation('vrs_brigade', 'RS', 'brigade', 'vrs_corps', FRONT_B),
        },
        brigadeMovementOrders: {},
        brigadeMovementState: {},
        brigadePostureOrders: [],
        brigadeSectorOverride: {},
        unresolvedSectorBrigades: undefined,
        corpsCommand: {},
        namedOfficers: {},
        namedOfficerData: [],
    };
}

function expectedSector(
    faction: FactionId,
    opposingFaction: FactionId,
    corpsId: string,
    brigadeId: string,
    friendlyOsid: string,
    enemyOsid: string,
): CorpsFrontSector {
    const sectorId = `sector:${corpsId}:0`;
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [opposingFaction],
        edge_ids: [FRONT_EDGE],
        sub_segments: [{
            sub_segment_id: `subseg:${sectorId}:0`,
            edge_ids: [FRONT_EDGE],
            friendly_osids: [friendlyOsid],
            enemy_osids: [enemyOsid],
            length_edges: 1,
            primary_brigade_ids: [],
        }],
        length_edges: 1,
        territory_osids: [friendlyOsid],
        assigned_brigade_ids: [brigadeId],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density: 1,
        threat_ratio: 2.0408163265306123,
        defensive_power: 735,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function expectedConstructedMutations(): SectorTopologyMutation[] {
    const rows: SectorTopologyMutation[] = [];
    const assignments: Record<string, FormationAssignment> = {
        arbih_brigade: {
            kind: 'sector',
            sector_id: 'sector:arbih_corps:0',
            role: 'front',
        },
        vrs_brigade: {
            kind: 'sector',
            sector_id: 'sector:vrs_corps:0',
            role: 'front',
        },
    };
    const pushSubSegment = (stage: string, formationId: string): void => {
        rows.push({
            sequence: rows.length,
            stage,
            kind: 'formation-assigned-sub-segment',
            formationId,
            before: undefined,
            after: undefined,
        });
    };
    const pushAssignment = (
        stage: string,
        formationId: string,
        before: FormationAssignment | null,
        after: FormationAssignment | null,
    ): void => {
        rows.push({
            sequence: rows.length,
            stage,
            kind: 'formation-assignment',
            formationId,
            before,
            after,
        });
    };

    const owner1 = 'apply-final-sector-owner-truth:1:sync-sector-assignments';
    pushSubSegment(owner1, 'arbih_brigade');
    pushSubSegment(owner1, 'vrs_brigade');
    pushAssignment(owner1, 'arbih_brigade', null, assignments.arbih_brigade!);
    pushAssignment(owner1, 'vrs_brigade', null, assignments.vrs_brigade!);

    for (const stage of [
        'apply-final-sector-owner-truth:2:sync-sector-assignments',
        'sync-sector-assignments',
    ]) {
        pushAssignment(stage, 'arbih_brigade', assignments.arbih_brigade!, null);
        pushSubSegment(stage, 'arbih_brigade');
        pushAssignment(stage, 'vrs_brigade', assignments.vrs_brigade!, null);
        pushSubSegment(stage, 'vrs_brigade');
        pushAssignment(stage, 'arbih_brigade', null, assignments.arbih_brigade!);
        pushAssignment(stage, 'vrs_brigade', null, assignments.vrs_brigade!);
    }
    rows.push({
        sequence: rows.length,
        stage: 'collect-unresolved-sector-brigades',
        kind: 'unresolved-sector-brigades',
        before: undefined,
        after: [],
    });
    return rows;
}

describe('sector topology constructed independent oracle', () => {
    it('returns the hand-authored empty-front oracle without consulting the imperative builder', () => {
        const input = constructedInput(false);

        const output = solveCorpsFrontSectorsPure(input);

        expect(output.sectors).toEqual({});
        expect(output.mutations).toEqual([]);
        expect(output.diagnostics).toEqual([]);
        expect(output.trace.stages).toEqual([
            {
                sequence: 0,
                kind: 'stage',
                stage: 'validate-topology-read-model',
                mutationCount: 0,
            },
            {
                sequence: 1,
                kind: 'branch',
                stage: 'front-edges-present',
                mutationCount: 0,
                branchTaken: false,
            },
        ]);
    });

    it('matches a hand-authored two-faction one-edge topology and journal oracle', () => {
        const input = constructedInput(true);

        const output = solveCorpsFrontSectorsPure(input);

        expect(output.sectors).toEqual({
            'sector:arbih_corps:0': expectedSector(
                'RBiH', 'RS', 'arbih_corps', 'arbih_brigade', FRONT_A, FRONT_B,
            ),
            'sector:vrs_corps:0': expectedSector(
                'RS', 'RBiH', 'vrs_corps', 'vrs_brigade', FRONT_B, FRONT_A,
            ),
        });
        expect(output.mutations).toEqual(expectedConstructedMutations());
        expect(output.diagnostics).toEqual([]);
        expect(output.trace.stages).toContainEqual({
            sequence: expect.any(Number),
            kind: 'branch',
            stage: 'front-edges-present',
            mutationCount: 0,
            branchTaken: true,
        });
        expect(output.trace.stages.some((row) => row.mutationCount > 0)).toBe(true);
    });
});
