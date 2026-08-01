import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import * as corpsFrontSectorsModule from '../src/sim/combat/corps_front_sectors.js';
import { reconcileFinalOperationTruth } from '../src/sim/combat/final_operation_truth_reconciliation.js';
import {
    createFinalSectorReconciliationSession,
    recordFinalSectorReconciliationMutation,
    reconcileFinalSectorTruth,
    sealFinalSectorTruthFromCurrentSectors,
} from '../src/sim/combat/final_sector_truth_reconciliation.js';
import { buildOsidAdjacency } from '../src/sim/combat/osid_adjacency.js';
import { warPhaseReconciliationSteps } from '../src/sim/turn_phases/war_phase_reconciliation_steps.js';
import type { TurnContext } from '../src/sim/turn_pipeline_types.js';
import {
    CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';
import { strictCompare } from '../src/state/validateGameState.js';

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
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

function makeState(): { state: GameState; edges: EdgeRecord[] } {
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'final-sector-session-equivalence',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        },
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ],
        military: {
            formations: {
                corps_a: makeFormation('corps_a', {
                    kind: 'corps',
                    location_osid: 'op:test:rear',
                    personnel: 50,
                }),
                brig_seed: makeFormation('brig_seed', {
                    corps_id: 'corps_a',
                    location_osid: 'op:test:front_a',
                    home_osid: 'op:test:front_a',
                }),
                brig_stack: makeFormation('brig_stack', {
                    corps_id: 'corps_a',
                    location_osid: 'op:test:front_a',
                    home_osid: 'op:test:front_a',
                }),
                brig_inactive: makeFormation('brig_inactive', {
                    corps_id: 'corps_a',
                    location_osid: 'op:test:front_a',
                    home_osid: 'op:test:front_a',
                    status: 'inactive',
                }),
            },
            war_front_edges_osid: [
                { edge_id: 'op:test:front_a__op:test:enemy_a', a: 'op:test:front_a', b: 'op:test:enemy_a', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:test:front_b__op:test:enemy_b', a: 'op:test:front_b', b: 'op:test:enemy_b', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            phantoms_spawned: [],
            corps_front_sectors: {},
            sector_intel: {},
            corps_command: {
                corps_a: {
                    command_span: 4,
                    subordinate_count: 2,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'balanced',
                    active_operations: [{
                        name: 'active_roster_cleanup',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 10,
                        phase_started_turn: 10,
                        participating_brigades: ['brig_seed', 'brig_inactive', 'brig_seed'],
                        axes: [{
                            axis_id: 'axis_a',
                            objective_osids: ['op:test:enemy_a'],
                            assigned_brigades: ['brig_seed', 'brig_inactive', 'brig_seed'],
                        }],
                    }],
                },
            },
        },
        political: {
            political_controllers: {
                'op:test:rear': 'RS',
                'op:test:front_a': 'RS',
                'op:test:front_b': 'RS',
                'op:test:enemy_a': 'RBiH',
                'op:test:enemy_b': 'RBiH',
            },
        },
        displacement: {},
    } as unknown as GameState;

    const edges: EdgeRecord[] = [
        { a: 'op:test:rear', b: 'op:test:front_a' } as EdgeRecord,
        { a: 'op:test:front_a', b: 'op:test:front_b' } as EdgeRecord,
        { a: 'op:test:front_a', b: 'op:test:enemy_a' } as EdgeRecord,
        { a: 'op:test:front_b', b: 'op:test:enemy_b' } as EdgeRecord,
    ];
    return { state, edges };
}

function canonicalTruthProjection(state: GameState): unknown {
    const sectorEntries = Object.entries(state.military.corps_front_sectors ?? {})
        .sort(([a], [b]) => strictCompare(a, b));
    const formationEntries = Object.entries(state.military.formations ?? {})
        .sort(([a], [b]) => strictCompare(a, b))
        .map(([id, formation]) => [id, {
            location_osid: formation.location_osid,
            assignment: formation.assignment,
            assigned_sub_segment_id: formation.assigned_sub_segment_id,
        }]);
    const ratingEntries = Object.entries(state.military.sector_combat_ratings ?? {})
        .sort(([a], [b]) => strictCompare(a, b));
    return { sectorEntries, formationEntries, ratingEntries };
}

function normalizeOperationRosterOnlyMutation(before: GameState, after: GameState): void {
    const beforeOp = before.military.corps_command!.corps_a!.active_operations[0]!;
    const afterOp = after.military.corps_command!.corps_a!.active_operations[0]!;
    beforeOp.participating_brigades = [...(afterOp.participating_brigades ?? [])];
    beforeOp.axes![0]!.assigned_brigades = [...(afterOp.axes![0]!.assigned_brigades ?? [])];
}

describe('turn-local final-sector reconciliation session', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('keeps active-operation postcombat cleanup roster-only, adds zero geometry builds, and equals legacy full reconciliation', () => {
        const fixture = makeState();
        const state = structuredClone(fixture.state);
        const legacy = structuredClone(fixture.state);
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');

        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        const sectorId = Object.values(state.military.corps_front_sectors ?? {})
            .find((sector) => sector.corps_id === 'corps_a')!.sector_id;
        state.military.corps_command!.corps_a!.active_operations[0]!.sector_id = sectorId;
        const beforeOperationTruth = structuredClone(state);

        const geometrySpy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        reconcileFinalOperationTruth(state);
        const afterOperationTruth = structuredClone(state);
        normalizeOperationRosterOnlyMutation(beforeOperationTruth, afterOperationTruth);
        expect(afterOperationTruth).toEqual(beforeOperationTruth);
        expect(state.military.corps_command!.corps_a!.active_operations[0]!.participating_brigades)
            .toEqual(['brig_seed']);

        recordFinalSectorReconciliationMutation(session, 'operation-roster', 'reconcile-final-operation-truth');
        const afterRosterTruth = serializeState(state);
        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        expect(geometrySpy).not.toHaveBeenCalled();
        expect(serializeState(state)).toBe(afterRosterTruth);

        reconcileFinalSectorTruth(legacy, fixture.edges, null);
        legacy.military.corps_command!.corps_a!.active_operations[0]!.sector_id = Object.values(
            legacy.military.corps_front_sectors ?? {},
        ).find((sector) => sector.corps_id === 'corps_a')!.sector_id;
        reconcileFinalOperationTruth(legacy);
        reconcileFinalSectorTruth(legacy, fixture.edges, null);

        expect(canonicalTruthProjection(state)).toEqual(canonicalTruthProjection(legacy));
        expect(serializeState(state)).toBe(serializeState(legacy));
        expect(session.geometry_builds).toBe(1);
        expect(session.stage_epochs).toEqual({ geometry: 1, territory: 1, roster: 2, ratings: 2 });
        expect(session.dirty_worklist).toEqual([]);
    });

    it('wires a postcombat location writeback to one explicit follow-up geometry epoch', async () => {
        const fixture = makeState();
        const context = {
            state: structuredClone(fixture.state),
            rng: () => { throw new Error('randomness forbidden'); },
            input: {
                seed: 'final-sector-session-phase-path',
                operationalData: {
                    edges: fixture.edges,
                    centroids: {},
                    opData: { operationalToCanonical: null },
                },
            },
            report: { seed: 'final-sector-session-phase-path', phases: [] },
        } as unknown as TurnContext;
        const byName = new Map(warPhaseReconciliationSteps.map((step) => [step.name, step]));

        await byName.get('reconcile-final-sector-truth')!.run(context);
        const legacy = structuredClone(context.state);
        const spatial = (context as TurnContext & {
            spatialContextCache?: { postCombat?: Parameters<typeof reconcileFinalSectorTruth>[4] };
        }).spatialContextCache?.postCombat;
        const geometrySpy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');

        await byName.get('reconcile-final-operation-truth')!.run(context);
        await byName.get('reconcile-final-sector-truth-after-ops')!.run(context);
        expect(geometrySpy).toHaveBeenCalledTimes(1);

        reconcileFinalOperationTruth(legacy);
        reconcileFinalSectorTruth(legacy, fixture.edges, null, undefined, spatial);

        expect(context.finalSectorReconciliationSession?.geometry_builds).toBe(2);
        expect(context.finalSectorReconciliationSession?.receipts.map((receipt) => receipt.source)).toEqual([
            'postcombat-geometry',
            'postcombat-formation-location-writeback',
            'reconcile-final-operation-truth',
        ]);
        expect(canonicalTruthProjection(context.state)).toEqual(canonicalTruthProjection(legacy));
        expect(serializeState(context.state)).toBe(serializeState(legacy));
    });

    it('does not add an operation receipt when operation truth makes no edit', async () => {
        const fixture = makeState();
        const operation = fixture.state.military.corps_command!.corps_a!.active_operations[0]!;
        operation.participating_brigades = ['brig_seed'];
        operation.axes![0]!.assigned_brigades = ['brig_seed'];
        const context = {
            state: structuredClone(fixture.state),
            rng: () => { throw new Error('randomness forbidden'); },
            input: {
                seed: 'final-sector-session-clean-operation-path',
                operationalData: {
                    edges: fixture.edges,
                    centroids: {},
                    opData: { operationalToCanonical: null },
                },
            },
            report: { seed: 'final-sector-session-clean-operation-path', phases: [] },
        } as unknown as TurnContext;
        const byName = new Map(warPhaseReconciliationSteps.map((step) => [step.name, step]));

        await byName.get('reconcile-final-sector-truth')!.run(context);
        const legacy = structuredClone(context.state);
        const spatial = (context as TurnContext & {
            spatialContextCache?: { postCombat?: Parameters<typeof reconcileFinalSectorTruth>[4] };
        }).spatialContextCache?.postCombat;
        const geometrySpy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');

        await byName.get('reconcile-final-operation-truth')!.run(context);
        expect(context.finalSectorReconciliationSession?.receipts.map((receipt) => receipt.source)).toEqual([
            'postcombat-geometry',
            'postcombat-formation-location-writeback',
        ]);
        await byName.get('reconcile-final-sector-truth-after-ops')!.run(context);
        expect(geometrySpy).toHaveBeenCalledTimes(1);

        expect(reconcileFinalOperationTruth(legacy).sector_reconciliation_required).toBe(false);
        reconcileFinalSectorTruth(legacy, fixture.edges, null, undefined, spatial);

        expect(canonicalTruthProjection(context.state)).toEqual(canonicalTruthProjection(legacy));
        expect(serializeState(context.state)).toBe(serializeState(legacy));
        expect(context.finalSectorReconciliationSession?.geometry_builds).toBe(2);
    });

    it('records a geometry receipt when the postcombat builder relocates a geometry input', async () => {
        const fixture = makeState();
        const context = {
            state: structuredClone(fixture.state),
            rng: () => { throw new Error('randomness forbidden'); },
            input: {
                seed: 'final-sector-session-location-writeback',
                operationalData: {
                    edges: fixture.edges,
                    centroids: {},
                    opData: { operationalToCanonical: null },
                },
            },
            report: { seed: 'final-sector-session-location-writeback', phases: [] },
        } as unknown as TurnContext;
        const byName = new Map(warPhaseReconciliationSteps.map((step) => [step.name, step]));
        vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors')
            .mockImplementation((state) => {
                state.military.formations!.brig_seed!.location_osid = 'op:test:front_b';
                return {};
            });

        await byName.get('reconcile-final-sector-truth')!.run(context);

        expect(context.finalSectorReconciliationSession?.receipts).toEqual([
            expect.objectContaining({
                mutation: 'geometry',
                source: 'postcombat-geometry',
            }),
            expect.objectContaining({
                mutation: 'geometry',
                source: 'postcombat-formation-location-writeback',
            }),
        ]);
        expect(context.finalSectorReconciliationSession?.dirty_worklist).toEqual([
            'geometry',
            'territory',
            'roster',
            'ratings',
        ]);
    });

    it('keeps roster-only reconciliation equivalent when operation cleanup retires an empty enemy feint', () => {
        const fixture = makeState();
        fixture.state.military.formations!.enemy_corps = makeFormation('enemy_corps', {
            faction: 'RBiH' as FactionId,
            kind: 'corps',
            location_osid: 'op:test:enemy_b',
            personnel: 50,
        });
        fixture.state.military.formations!.enemy_active = makeFormation('enemy_active', {
            faction: 'RBiH' as FactionId,
            corps_id: 'enemy_corps',
            location_osid: 'op:test:enemy_a',
            home_osid: 'op:test:enemy_a',
        });
        fixture.state.military.formations!.enemy_inactive = makeFormation('enemy_inactive', {
            faction: 'RBiH' as FactionId,
            corps_id: 'enemy_corps',
            location_osid: 'op:test:enemy_a',
            home_osid: 'op:test:enemy_a',
            status: 'inactive',
        });
        fixture.state.military.corps_command!.enemy_corps = {
            command_span: 4,
            subordinate_count: 1,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'balanced',
            active_operations: [{
                name: 'empty_enemy_feint',
                type: 'feint',
                phase: 'execution',
                started_turn: 10,
                phase_started_turn: 10,
                participating_brigades: ['enemy_inactive'],
                objectives: ['op:test:front_a'],
            }],
        };

        const state = structuredClone(fixture.state);
        const legacy = structuredClone(fixture.state);
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        reconcileFinalSectorTruth(legacy, fixture.edges, null);

        reconcileFinalOperationTruth(state);
        recordFinalSectorReconciliationMutation(session, 'operation-roster', 'reconcile-final-operation-truth');
        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        reconcileFinalOperationTruth(legacy);
        reconcileFinalSectorTruth(legacy, fixture.edges, null);

        expect(canonicalTruthProjection(state)).toEqual(canonicalTruthProjection(legacy));
        expect(serializeState(state)).toBe(serializeState(legacy));
        expect(session.geometry_builds).toBe(1);
    });

    it('reconciles the complete roster when operation cleanup removes an active foreign-corps claim', () => {
        const fixture = makeState();
        fixture.state.military.formations!.corps_b = makeFormation('corps_b', {
            kind: 'corps',
            location_osid: 'op:test:rear_b',
            personnel: 50,
        });
        fixture.state.military.formations!.brig_b = makeFormation('brig_b', {
            corps_id: 'corps_b',
            location_osid: 'op:test:front_b',
            home_osid: 'op:test:front_b',
        });
        fixture.state.political.political_controllers!['op:test:rear_b'] = 'RS';
        fixture.edges = fixture.edges.filter((edge) =>
            !((edge.a === 'op:test:front_a' && edge.b === 'op:test:front_b')
                || (edge.a === 'op:test:front_b' && edge.b === 'op:test:front_a')),
        );
        fixture.edges.push({ a: 'op:test:rear_b', b: 'op:test:front_b' } as EdgeRecord);

        const state = structuredClone(fixture.state);
        const legacy = structuredClone(fixture.state);
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');
        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        reconcileFinalSectorTruth(legacy, fixture.edges, null);

        const seedForeignClaim = (target: GameState): void => {
            const sectors = Object.values(target.military.corps_front_sectors ?? {});
            const own = sectors.find((sector) => sector.corps_id === 'corps_a');
            const foreign = sectors.find((sector) => sector.corps_id === 'corps_b');
            expect(own).toBeDefined();
            expect(foreign).toBeDefined();
            for (const sector of sectors) {
                sector.assigned_brigade_ids = sector.assigned_brigade_ids.filter((id) => id !== 'brig_seed');
                sector.reserve_brigade_ids = sector.reserve_brigade_ids.filter((id) => id !== 'brig_seed');
                if (sector.rear_brigade_ids) {
                    sector.rear_brigade_ids = sector.rear_brigade_ids.filter((id) => id !== 'brig_seed');
                }
            }
            foreign!.assigned_brigade_ids.push('brig_seed');
            foreign!.assigned_brigade_ids.sort(strictCompare);
            target.military.formations!.brig_seed!.assignment = {
                kind: 'sector',
                sector_id: foreign!.sector_id,
            };
            target.military.corps_command!.corps_a!.active_operations[0]!.sector_id = own!.sector_id;
        };
        seedForeignClaim(state);
        seedForeignClaim(legacy);

        const operationTruth = reconcileFinalOperationTruth(state);
        expect(operationTruth.sector_reconciliation_required).toBe(true);
        expect(state.military.corps_command!.corps_a!.active_operations[0]!.participating_brigades).toEqual([]);
        recordFinalSectorReconciliationMutation(session, 'operation-roster', 'reconcile-final-operation-truth');
        const geometrySpy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        expect(geometrySpy).not.toHaveBeenCalled();

        reconcileFinalOperationTruth(legacy);
        reconcileFinalSectorTruth(legacy, fixture.edges, null);

        expect(canonicalTruthProjection(state)).toEqual(canonicalTruthProjection(legacy));
        expect(state.military.unresolved_sector_brigades).toEqual(legacy.military.unresolved_sector_brigades);
        expect(serializeState(state)).toBe(serializeState(legacy));
        expect(session.geometry_builds).toBe(1);
    });

    it('runs roster/seal only after distribution and makes the already-sealed pass a no-op', () => {
        const fixture = makeState();
        const state = structuredClone(fixture.state);
        const legacy = structuredClone(fixture.state);
        const adjacency = buildOsidAdjacency(fixture.edges);
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'postcombat-geometry');

        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, { session });
        reconcileFinalSectorTruth(legacy, fixture.edges, null);
        distributeBrigadesToFront(state, Object.values(state.military.corps_front_sectors ?? {}), adjacency);
        distributeBrigadesToFront(legacy, Object.values(legacy.military.corps_front_sectors ?? {}), adjacency);

        recordFinalSectorReconciliationMutation(session, 'distribution-roster', 'final-distribute-brigades-to-front');
        const geometrySpy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');
        sealFinalSectorTruthFromCurrentSectors(state, fixture.edges, null, undefined, { session });
        const onceSealed = serializeState(state);
        const epochsAfterSeal = structuredClone(session.stage_epochs);
        sealFinalSectorTruthFromCurrentSectors(state, fixture.edges, null, undefined, { session });

        sealFinalSectorTruthFromCurrentSectors(legacy, fixture.edges);
        sealFinalSectorTruthFromCurrentSectors(legacy, fixture.edges);

        expect(geometrySpy).not.toHaveBeenCalled();
        expect(serializeState(state)).toBe(onceSealed);
        expect(session.stage_epochs).toEqual(epochsAfterSeal);
        expect(session.stage_epochs).toEqual({ geometry: 1, territory: 1, roster: 2, ratings: 2 });
        expect(canonicalTruthProjection(state)).toEqual(canonicalTruthProjection(legacy));
        expect(serializeState(state)).toBe(serializeState(legacy));
    });

    it('runs final-save projection as one fresh full geometry epoch before its roster seal', () => {
        const fixture = makeState();
        const state = structuredClone(fixture.state);
        const legacy = structuredClone(fixture.state);
        const session = createFinalSectorReconciliationSession(state.meta.turn, 'final-save-geometry');
        const geometrySpy = vi.spyOn(corpsFrontSectorsModule, 'buildCorpsFrontSectors');

        reconcileFinalSectorTruth(state, fixture.edges, null, undefined, undefined, null, false, {
            finalSaveGeometryProjection: true,
            session,
        });
        recordFinalSectorReconciliationMutation(session, 'seal-roster', 'final-save-seal');
        sealFinalSectorTruthFromCurrentSectors(state, fixture.edges, null, undefined, { session });

        reconcileFinalSectorTruth(legacy, fixture.edges, null, undefined, undefined, null, false, {
            finalSaveGeometryProjection: true,
        });
        sealFinalSectorTruthFromCurrentSectors(legacy, fixture.edges);

        expect(geometrySpy).toHaveBeenCalledTimes(2);
        expect(session.geometry_builds).toBe(1);
        expect(canonicalTruthProjection(state)).toEqual(canonicalTruthProjection(legacy));
        expect(serializeState(state)).toBe(serializeState(legacy));
    });
});
