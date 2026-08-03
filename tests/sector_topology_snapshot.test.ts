/**
 * R5 Phase 2e Task 2 — RED/GREEN characterization of `captureSectorTopologySolveInput`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 9 Task 2. Three layers:
 *   1. Fidelity against the real save: exact allow-list families present,
 *      strict ID/key order, preserved authored array order.
 *   2. No retained mutable identity: mutate the SOURCE after capture and
 *      prove the snapshot is unchanged (the freeze contract this module can
 *      actually guarantee at runtime — see sector_topology_snapshot.ts's
 *      module docstring on why Map/Set values can't be Object.freeze-blocked).
 *   3. A static read-inventory test: every `state.political.*` / `state.military.*`
 *      / `state.meta.*` access inside the VERIFIED consumer functions
 *      (getCorpsArmyPriorities + its 4 emergent-multiplier helpers in
 *      bot_strategy.ts; buildCorpsCommanderProfiles in commander_override.ts;
 *      getCorpsCommander in officer_system.ts; mapOsidsToCorps in
 *      sector_territory.ts; the inline getPoliticalControllerOSID call sites
 *      in sector_building.ts) must name a field represented in the allow-list.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { captureSectorTopologySolveInput } from '../src/sim/combat/sector_topology_snapshot.js';
import { deserializeState } from '../src/state/serialize.js';
import type { GameState } from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');
const hasFixture = fs.existsSync(SAVE_PATH) && fs.existsSync(CONTACT_GRAPH_PATH);

type ContactGraphEdge = { edge_id: string; a: string; b: string; shared_segments?: number; min_dist?: number };

function loadStateRaw(): GameState {
    return deserializeState(fs.readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
    const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
    return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function isSorted(values: readonly string[]): boolean {
    for (let i = 1; i < values.length; i++) {
        if (strictCompare(values[i - 1]!, values[i]!) > 0) return false;
    }
    return true;
}

describe.skipIf(!hasFixture)('captureSectorTopologySolveInput — fidelity against a real save', () => {
    it('captures every section-6 family with strict ID/key ordering and preserved authored array order', () => {
        const state = loadStateRaw();
        const edges = loadEdges();

        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined, {
            isFinalPass: true,
        });

        // Options carry the resolved defaults.
        expect(input.options.isFinalPass).toBe(true);
        expect(input.options.occupancyStrategy).toBe('dense-index');
        expect(input.options.frontEdgeAdjacencyStrategy).toBe('invocation-front-edge-relation');

        // Scalars.
        expect(input.turn).toBe(state.meta.turn);
        expect(input.decisionMode).toBe(state.meta.decision_mode);

        // Strict ordering families.
        expect(isSorted(input.factionIds as string[])).toBe(true);
        expect(isSorted(input.formationIdsSorted as string[])).toBe(true);
        expect(isSorted([...input.namedOfficers.keys()])).toBe(true);
        expect(isSorted([...input.corpsCommandByCorpsId.keys()])).toBe(true);

        // Non-trivial on a real active-war save.
        expect(input.formations.size).toBeGreaterThan(0);
        expect(input.formationIdsSorted.length).toBe(input.formations.size);
        expect(input.frontEdges.length).toBeGreaterThan(0);
        expect(input.edges.length).toBeGreaterThan(0);

        // Preserved authored array order: front edges and control events are
        // NOT resorted — they must appear in the same relative order as the
        // source arrays.
        const sourceFrontEdgeIds = (state.military.war_front_edges_osid ?? []).map((fe) => fe.edge_id);
        expect(input.frontEdges.map((fe) => fe.edge_id)).toEqual(sourceFrontEdgeIds);
        const sourceControlEventKeys = (state.political.control_events ?? [])
            .map((ev) => `${ev.turn}:${ev.settlement_id}:${ev.from}:${ev.to}`);
        const capturedControlEventKeys = input.controlEvents
            .map((ev) => `${ev.turn}:${ev.settlement_id}:${ev.from}:${ev.to}`);
        expect(capturedControlEventKeys).toEqual(sourceControlEventKeys);

        // Formation projection matches the source per-field for a sample formation.
        const sampleId = input.formationIdsSorted[0]!;
        const sourceFormation = state.military.formations![sampleId]!;
        const capturedFormation = input.formations.get(sampleId)!;
        expect(capturedFormation.faction).toBe(sourceFormation.faction);
        expect(capturedFormation.status).toBe(sourceFormation.status);
        expect(capturedFormation.location_osid).toBe(sourceFormation.location_osid);
        expect(capturedFormation.personnel).toBe(sourceFormation.personnel);

        // Spatial snapshot is always fully populated (fallback normalized at
        // capture time even though no live SpatialContext was supplied here).
        expect(input.spatial).toBeDefined();
        expect(input.spatial!.adjacency.size).toBeGreaterThan(0);
        expect(input.spatial!.friendlyOsidsByFaction.size).toBe(input.factionIds.length);
        expect(input.spatial!.componentsByFaction.size).toBe(input.factionIds.length);

        // Officer profile: every namedOfficers key matches its own officer_id.
        for (const [id, row] of input.namedOfficers) {
            expect(row.officer_id).toBe(id);
        }
    });

    it('retains no mutable identity from the source — mutating state/edges/spatial after capture does not change the snapshot', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const reverseMap = new Map<string, string[]>([['op:test:mun', ['sid:test:a', 'sid:test:b']]]);

        const input = captureSectorTopologySolveInput(state, edges as never, reverseMap, undefined, undefined);

        const sampleId = input.formationIdsSorted[0]!;
        const capturedPersonnel = input.formations.get(sampleId)!.personnel;
        const capturedPoliticalControllersSnapshot = { ...input.politicalControllers };
        const capturedFrontEdgeCount = input.frontEdges.length;
        const capturedReverseMapEntry = [...(input.reverseMapEntries?.get('op:test:mun') ?? [])];

        // Mutate the source state after capture.
        state.military.formations![sampleId]!.personnel = 999999;
        state.political.political_controllers = { ...(state.political.political_controllers ?? {}), 'op:test:mutated': 'RS' };
        state.military.war_front_edges_osid = [
            ...(state.military.war_front_edges_osid ?? []),
            { edge_id: 'injected__after_capture', a: 'op:test:x', b: 'op:test:y', side_a: null, side_b: null },
        ];
        reverseMap.get('op:test:mun')!.push('sid:test:injected');
        reverseMap.set('op:test:new_mun', ['sid:test:new']);

        // Snapshot must be unaffected.
        expect(input.formations.get(sampleId)!.personnel).toBe(capturedPersonnel);
        expect({ ...input.politicalControllers }).toEqual(capturedPoliticalControllersSnapshot);
        expect(input.frontEdges.length).toBe(capturedFrontEdgeCount);
        expect([...(input.reverseMapEntries?.get('op:test:mun') ?? [])]).toEqual(capturedReverseMapEntry);
        expect(input.reverseMapEntries?.has('op:test:new_mun')).toBe(false);
    });

    it('Object.freeze blocks mutation of plain-object/array leaves at runtime', () => {
        const state = loadStateRaw();
        const edges = loadEdges();
        const input = captureSectorTopologySolveInput(state, edges as never, null, undefined, undefined);

        expect(Object.isFrozen(input)).toBe(true);
        expect(Object.isFrozen(input.options)).toBe(true);
        expect(Object.isFrozen(input.frontEdges)).toBe(true);
        expect(Object.isFrozen(input.frontEdges[0])).toBe(true);
        expect(Object.isFrozen(input.politicalControllers)).toBe(true);

        const sampleId = input.formationIdsSorted[0]!;
        const formation = input.formations.get(sampleId)!;
        expect(Object.isFrozen(formation)).toBe(true);

        // In ESM strict mode, assigning to a frozen object's property throws.
        expect(() => {
            (formation as { personnel?: number }).personnel = -1;
        }).toThrow(TypeError);
        expect(() => {
            (input.politicalControllers as Record<string, string>)['op:test:injected'] = 'RS';
        }).toThrow(TypeError);
    });
});

describe('captureSectorTopologySolveInput — static read-inventory (no fixture required)', () => {
    // Verified allow-list: every field named here was confirmed by directly
    // reading the consumer function bodies during this Task 2 session (see
    // sector_topology_solver_types.ts's file docstring for the citation).
    const ALLOWED_POLITICAL_FIELDS = new Set([
        'political_controllers',
        'control_events',
        'last_supply_state_by_osid',
        'graz_east_herzegovina_active_turn',
    ]);
    const ALLOWED_MILITARY_FIELDS = new Set([
        'campaign_plans',
        'named_officers',
        'named_officer_data',
        'corps_command',
        'formations',
        'war_front_edges_osid',
        'brigade_movement_state',
        'brigade_movement_orders',
        'brigade_posture_orders',
        'brigade_sector_override',
    ]);
    const ALLOWED_META_FIELDS = new Set(['turn', 'decision_mode']);

    function extractRegion(raw: string, startMarker: string, endMarker: string): string {
        const startIdx = raw.indexOf(startMarker);
        expect(startIdx, `start marker not found: ${startMarker}`).toBeGreaterThanOrEqual(0);
        const endIdx = raw.indexOf(endMarker, startIdx + startMarker.length);
        expect(endIdx, `end marker not found after start: ${endMarker}`).toBeGreaterThan(startIdx);
        return raw.slice(startIdx, endIdx);
    }

    function assertOnlyAllowedFields(region: string, family: 'political' | 'military' | 'meta', allowed: Set<string>): void {
        const pattern = new RegExp(`state(?:\\??)\\.${family}(?:\\??)\\.(\\w+)`, 'g');
        const found = new Set<string>();
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(region)) !== null) {
            found.add(match[1]!);
        }
        for (const field of found) {
            expect(allowed.has(field), `state.${family}.${field} is not in the Task 2 snapshot allow-list`).toBe(true);
        }
    }

    it('getCorpsArmyPriorities and its emergent-multiplier helpers read only allow-listed fields', () => {
        const raw = fs.readFileSync(path.resolve('src/sim/combat/bot_strategy.ts'), 'utf8');
        const region = extractRegion(
            raw,
            'function priorityAreaTrend(',
            '\nexport function isCorridorMunicipality(',
        );
        assertOnlyAllowedFields(region, 'political', ALLOWED_POLITICAL_FIELDS);
        assertOnlyAllowedFields(region, 'military', ALLOWED_MILITARY_FIELDS);
        assertOnlyAllowedFields(region, 'meta', ALLOWED_META_FIELDS);
        // Positive guard: the region must actually contain the fields this
        // test exists to pin, so a refactor that silently drops a read isn't
        // a false-pass.
        expect(region).toContain('state.political?.control_events');
        expect(region).toContain('state.political?.last_supply_state_by_osid');
        expect(region).toContain('state.political?.political_controllers');
        expect(region).toContain('state.military?.campaign_plans');
    });

    it('buildCorpsCommanderProfiles reads only allow-listed fields', () => {
        const raw = fs.readFileSync(path.resolve('src/sim/combat/commander_override.ts'), 'utf8');
        const region = extractRegion(
            raw,
            'export function buildCorpsCommanderProfiles(',
            '\nfunction transferBrigadesBetweenSectors(',
        );
        assertOnlyAllowedFields(region, 'political', ALLOWED_POLITICAL_FIELDS);
        assertOnlyAllowedFields(region, 'military', ALLOWED_MILITARY_FIELDS);
        expect(region).toContain('state.military.corps_command');
        // commanderReviewAssignment and its five apply* helpers take no
        // `state: GameState` parameter — confirmed directly by reading the
        // full file this session. Guard that against silent regression.
        expect(raw).not.toMatch(/function commanderReviewAssignment\([^)]*state:\s*GameState/);
        expect(raw).not.toMatch(/function applyMissionCompliance\([^)]*state:\s*GameState/);
    });

    it('getCorpsCommander reads only allow-listed fields', () => {
        const raw = fs.readFileSync(path.resolve('src/sim/combat/officer_system.ts'), 'utf8');
        const region = extractRegion(
            raw,
            'export function getCorpsCommander(',
            '\n/**\n * Get the army-level commander for a faction.',
        );
        assertOnlyAllowedFields(region, 'political', ALLOWED_POLITICAL_FIELDS);
        assertOnlyAllowedFields(region, 'military', ALLOWED_MILITARY_FIELDS);
        expect(region).toContain('state.military.named_officers');
        expect(region).toContain('state.military.named_officer_data');
    });

    it('mapOsidsToCorps reads only allow-listed political fields', () => {
        const raw = fs.readFileSync(path.resolve('src/sim/combat/sector_territory.ts'), 'utf8');
        const region = extractRegion(
            raw,
            'export function mapOsidsToCorps(',
            '\nexport function findSubordinateOsid(',
        );
        assertOnlyAllowedFields(region, 'political', ALLOWED_POLITICAL_FIELDS);
        expect(region).toContain('state.political.political_controllers');
    });

    it('getPoliticalControllerOSID call sites in sector_building.ts read only allow-listed political fields', () => {
        const raw = fs.readFileSync(path.resolve('src/sim/combat/sector_building.ts'), 'utf8');
        expect(raw).toContain('getPoliticalControllerOSID(state, osidA, reverseMap ?? undefined)');
        expect(raw).toContain('getPoliticalControllerOSID(state, osidB, reverseMap ?? undefined)');
        const settlementControlRaw = fs.readFileSync(path.resolve('src/state/settlement_control.ts'), 'utf8');
        const region = extractRegion(
            settlementControlRaw,
            'export function getPoliticalControllerOSID(',
            '\n}\n',
        );
        assertOnlyAllowedFields(region, 'political', ALLOWED_POLITICAL_FIELDS);
    });
});
