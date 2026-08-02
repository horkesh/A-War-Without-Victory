import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import { computeSpatialContext } from '../src/sim/spatial_context.js';
import { getCorpsArmyPrioritiesFromReadModel } from '../src/sim/combat/bot_strategy.js';
import { buildCorpsCommanderProfilesFromReadModel } from '../src/sim/combat/commander_override.js';
import {
    captureSectorTopologySolveInput,
    sectorTopologyPoliticalController,
} from '../src/sim/combat/sector_topology_snapshot.js';
import { deserializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(
    ROOT,
    'data',
    'derived',
    'operational',
    'operational_contact_graph.json',
);
const hasRealSave = fs.existsSync(SAVE_PATH) && fs.existsSync(CONTACT_GRAPH_PATH);

function loadState(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): EdgeRecord[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as {
        edges: EdgeRecord[];
    };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function deepFreeze(value: unknown): void {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
}

describe.skipIf(!hasRealSave)('sector topology immutable solve snapshot', () => {
    it('captures the complete allow-list in strict key order without retaining mutable caller identity', () => {
        const state = loadState();
        const edges = loadEdges();
        const factionIds = state.factions.map((faction) => faction.id).sort(strictCompare);
        const spatial = computeSpatialContext(
            edges,
            state.political.political_controllers ?? {},
            factionIds,
            state.meta.turn,
            'pre-combat',
            state.military.war_front_edges_osid,
        );
        const reverseMap = new Map<string, string[]>([
            ['op:z', ['sid:z:2', 'sid:z:1']],
            ['op:a', ['sid:a:1']],
        ]);
        const centroids = new Map([
            ['op:z', { lat: 44.2, lon: 18.1 }],
            ['op:a', { lat: 43.9, lon: 17.8 }],
        ]);

        const input = captureSectorTopologySolveInput(
            state,
            edges,
            reverseMap,
            centroids,
            spatial,
            {
                isFinalPass: true,
                finalSaveGeometryProjection: false,
                useFixedPointShortcuts: true,
                occupancyStrategy: 'dense-index',
                frontEdgeAdjacencyStrategy: 'invocation-front-edge-relation',
            },
        );

        expect(Object.keys(input)).toEqual([
            'provenance',
            'options',
            'turn',
            'decisionMode',
            'factionIds',
            'frontEdges',
            'edges',
            'reverseMapEntries',
            'centroidEntries',
            'spatial',
            'politicalControllers',
            'grazEastHerzegovinaActiveTurn',
            'controlEvents',
            'lastSupplyStateByOsid',
            'campaignPlans',
            'formations',
            'brigadeMovementOrders',
            'brigadeMovementState',
            'brigadePostureOrders',
            'brigadeSectorOverride',
            'corpsCommand',
            'namedOfficers',
            'namedOfficerData',
        ]);
        expect(input.factionIds).toEqual([...input.factionIds].sort(strictCompare));
        expect(Object.keys(input.formations)).toEqual(
            Object.keys(input.formations).sort(strictCompare),
        );
        expect(Object.keys(input.politicalControllers)).toEqual(
            Object.keys(input.politicalControllers).sort(strictCompare),
        );
        expect(input.reverseMapEntries.map(([key]) => key)).toEqual(['op:a', 'op:z']);
        expect(input.reverseMapEntries[1]?.[1]).toEqual(['sid:z:2', 'sid:z:1']);
        expect(input.centroidEntries.map(([key]) => key)).toEqual(['op:a', 'op:z']);
        expect(input.frontEdges.map((edge) => edge.edge_id)).toEqual(
            state.military.war_front_edges_osid?.map((edge) => edge.edge_id),
        );
        expect(input.controlEvents).toEqual(state.political.control_events ?? []);
        expect(input.brigadePostureOrders).toEqual(state.military.brigade_posture_orders ?? []);

        const formationId = Object.keys(input.formations).find((id) =>
            state.military.formations[id]?.assignment != null,
        )!;
        const sourceFormation = state.military.formations[formationId]!;
        const capturedFormation = input.formations[formationId]!;
        expect(capturedFormation).not.toBe(sourceFormation);
        expect(capturedFormation.assignment).not.toBe(sourceFormation.assignment);
        if (sourceFormation.tags) expect(capturedFormation.tags).not.toBe(sourceFormation.tags);
        if (sourceFormation.elite_loan_state) {
            expect(capturedFormation.elite_loan_state).not.toBe(sourceFormation.elite_loan_state);
        }
        expect(input.edges).not.toBe(edges);
        expect(input.edges[0]).not.toBe(edges[0]);
        expect(input.reverseMapEntries).not.toBe(reverseMap);
        expect(input.spatial.adjacencyEntries).not.toBe(spatial.adjacency);
        expect(input.namedOfficers).not.toBe(state.military.named_officers);
        expect(input.namedOfficerData).not.toBe(state.military.named_officer_data);
        const firstCorpsId = Object.keys(input.corpsCommand)[0];
        const firstCapturedOperation = firstCorpsId
            ? input.corpsCommand[firstCorpsId]?.active_operations[0]
            : undefined;
        const firstSourceOperation = firstCorpsId
            ? state.military.corps_command?.[firstCorpsId]?.active_operations[0]
            : undefined;
        if (firstCapturedOperation && firstSourceOperation) {
            expect(firstCapturedOperation).not.toBe(firstSourceOperation);
            expect(firstCapturedOperation.participating_brigades).not.toBe(
                firstSourceOperation.participating_brigades,
            );
        }

        deepFreeze(input);
        expect(sectorTopologyPoliticalController(input, input.reverseMapEntries[0]![0])).toBe(
            input.politicalControllers[input.reverseMapEntries[0]![0]] ?? null,
        );
        expect(() => getCorpsArmyPrioritiesFromReadModel(
            input,
            input.factionIds[0]!,
            Object.keys(input.corpsCommand)[0] ?? '',
        )).not.toThrow();
        expect(() => buildCorpsCommanderProfilesFromReadModel(input, [])).not.toThrow();
    });

    it('is independent from later source mutation, including exact entrenchment before-values', () => {
        const state = loadState();
        const edges = loadEdges();
        const formationId = Object.keys(state.military.formations)
            .sort(strictCompare)
            .find((id) => state.military.formations[id]?.entrenchment_turns !== undefined)!;
        const formation = state.military.formations[formationId]!;
        const originalEntrenchment = formation.entrenchment_turns;
        const input = captureSectorTopologySolveInput(
            state,
            edges,
            null,
            undefined,
            undefined,
            {
                isFinalPass: false,
                finalSaveGeometryProjection: true,
                useFixedPointShortcuts: false,
                occupancyStrategy: 'test-only-legacy-scan',
                frontEdgeAdjacencyStrategy: 'test-only-legacy-edge-adjacency',
            },
        );

        expect(input.formations[formationId]?.entrenchment_turns).toBe(originalEntrenchment);
        formation.entrenchment_turns = (originalEntrenchment ?? 0) + 99;
        formation.location_osid = 'op:mutated:source';
        formation.assignment = { kind: 'region', region_id: 'mutated' };
        edges[0]!.min_dist = 999;
        const politicalControllers = state.political.political_controllers ??= {};
        politicalControllers['op:mutated:source'] = 'RS';
        state.military.brigade_posture_orders?.push({
            brigade_id: formationId,
            posture: 'hold',
        });

        expect(input.formations[formationId]?.entrenchment_turns).toBe(originalEntrenchment);
        expect(input.formations[formationId]?.location_osid).not.toBe('op:mutated:source');
        expect(input.formations[formationId]?.assignment).not.toEqual({
            kind: 'region',
            region_id: 'mutated',
        });
        expect(input.edges[0]?.min_dist).not.toBe(999);
        expect(input.politicalControllers['op:mutated:source']).toBeUndefined();
        expect(input.brigadePostureOrders).not.toContainEqual({
            brigade_id: formationId,
            posture: 'hold',
        });
    });

    it('declares every full-state read family and forbids a partial GameState cast', () => {
        const source = fs.readFileSync('src/sim/combat/sector_topology_snapshot.ts', 'utf8');
        const statePaths = [...source.matchAll(/state\.(meta|military|political)(?:\?\.)?\.([A-Za-z0-9_]+)/g)]
            .map((match) => `${match[1]}.${match[2]}`)
            .filter((value, index, values) => values.indexOf(value) === index)
            .sort(strictCompare);
        if (source.includes('state.factions')) statePaths.push('factions');
        statePaths.sort(strictCompare);

        expect(statePaths).toEqual([
            'factions',
            'meta.decision_mode',
            'meta.turn',
            'military.brigade_movement_orders',
            'military.brigade_movement_state',
            'military.brigade_posture_orders',
            'military.brigade_sector_override',
            'military.campaign_plans',
            'military.corps_command',
            'military.formations',
            'military.named_officer_data',
            'military.named_officers',
            'military.war_front_edges_osid',
            'political.control_events',
            'political.graz_east_herzegovina_active_turn',
            'political.last_supply_state_by_osid',
            'political.political_controllers',
        ]);
        expect(source).not.toMatch(/as\s+(?:unknown\s+as\s+)?GameState/);
        expect(source).not.toMatch(/satisfies\s+GameState/);
    });
});
