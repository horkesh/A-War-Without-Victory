import { describe, expect, it, vi } from 'vitest';

import type { EdgeRecord } from '../src/map/settlements.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { classifyReleasedOperationParticipants } from '../src/sim/combat/stranded_brigade_lifecycle.js';
import { computeSpatialContext } from '../src/sim/spatial_context.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { warPhaseReconciliationSteps } from '../src/sim/turn_phases/war_phase_reconciliation_steps.js';
import { setSpatialContextCache, type TurnContext } from '../src/sim/turn_pipeline_types.js';
import {
    CURRENT_SCHEMA_VERSION,
    type CorpsFrontSector,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';

function brigade(id: string, locationOsid: string): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 910,
        cohesion: 61,
        morale: 58,
        corps_id: 'rs_corps',
        location_osid: locationOsid,
        home_osid: 'op:home:home',
    } as FormationState;
}

function sector(): CorpsFrontSector {
    return {
        sector_id: 'sector:rs_corps:0',
        corps_id: 'rs_corps',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: ['op:front:line__op:front:enemy'],
        sub_segments: [{
            sub_segment_id: 'subseg:sector:rs_corps:0:0',
            edge_ids: ['op:front:line__op:front:enemy'],
            friendly_osids: ['op:front:line'],
            enemy_osids: ['op:front:enemy'],
            primary_brigade_ids: [],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: ['op:front:line'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function fixture(): { state: GameState; edges: EdgeRecord[]; context: TurnContext } {
    const released = brigade('released_disconnected', 'op:pocket:held');
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 16,
            phase: 'war',
            seed: 'operation-completion-stranded-handoff',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        },
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ],
        military: {
            formations: {
                rs_corps: {
                    id: 'rs_corps', name: 'RS Corps', faction: 'RS', kind: 'corps', status: 'active',
                    created_turn: 1, assignment: null, personnel: 50, cohesion: 80,
                } as FormationState,
                released_disconnected: released,
            },
            corps_front_sectors: { 'sector:rs_corps:0': sector() },
            corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Operation Release Fixture',
                        type: 'sector_attack',
                        phase: 'recovery',
                        started_turn: 10,
                        phase_started_turn: 13,
                        participating_brigades: ['released_disconnected'],
                        objectives: ['op:front:enemy'],
                        current_objective_index: 1,
                        attack_attempt_count: 1,
                        objective_capture_count: 1,
                        initial_strength: 910,
                        recovery_reason: 'completed',
                        sector_id: 'sector:rs_corps:0',
                    }],
                },
            },
            war_front_edges_osid: [
                { edge_id: 'op:front:line__op:front:enemy', a: 'op:front:line', b: 'op:front:enemy', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:pocket:held__op:pocket:enemy', a: 'op:pocket:held', b: 'op:pocket:enemy', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {
                'op:front:line': 'RS',
                'op:front:enemy': 'RBiH',
                'op:pocket:held': 'RS',
                'op:pocket:enemy': 'RBiH',
                'op:home:home': 'RS',
            },
        },
        displacement: {},
    } as unknown as GameState;
    const edges = [
        { a: 'op:front:line', b: 'op:front:enemy' },
        { a: 'op:pocket:held', b: 'op:pocket:enemy' },
    ] as EdgeRecord[];
    const finalSpatial = computeSpatialContext(
        edges,
        state.political.political_controllers ?? {},
        ['HRHB', 'RBiH', 'RS'],
        state.meta.turn,
        'post-combat',
        state.military.war_front_edges_osid,
    );
    const context = {
        state,
        rng: () => { throw new Error('randomness forbidden'); },
        input: { seed: state.meta.seed },
        report: { seed: state.meta.seed, phases: [] },
    } as unknown as TurnContext;
    setSpatialContextCache(context, { preCombat: finalSpatial, postCombat: finalSpatial });
    return { state, edges, context };
}

function addCompletionParticipant(state: GameState, formation: FormationState): void {
    state.military.formations![formation.id] = formation;
    state.military.corps_command!.rs_corps!.active_operations[0]!.participating_brigades.push(formation.id);
}

async function runProductionHandoff(context: TurnContext): Promise<void> {
    await warPhases.find((step) => step.name === 'advance-sector-offensives')!.run(context);
    const start = warPhaseReconciliationSteps.findIndex((step) => step.name === 'reconcile-final-operation-truth');
    const end = warPhaseReconciliationSteps.findIndex((step) => step.name === 'seal-final-sector-truth-after-distribution');
    for (const step of warPhaseReconciliationSteps.slice(start, end + 1)) {
        await step.run(context);
    }
}

describe('operation-completion stranded ownership handoff', () => {
    it('classifies a newly released disconnected participant before final distribution and seal without same-turn decay', async () => {
        const { state, context } = fixture();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const before = structuredClone(state.military.formations!.released_disconnected!);

        try {
            await runProductionHandoff(context);
            expect(state.military.corps_command!.rs_corps!.active_operations).toEqual([]);
        } finally {
            warn.mockRestore();
        }

        const released = state.military.formations!.released_disconnected!;
        expect(released.stranded_status).toBe('holding');
        expect(released.stranded_since_turn).toBe(16);
        expect(released).toMatchObject({
            location_osid: before.location_osid,
            assignment: null,
            personnel: before.personnel,
            cohesion: before.cohesion,
            morale: before.morale,
        });
        expect(state.military.brigade_movement_orders?.released_disconnected).toBeUndefined();
        expect(state.military.corps_front_sectors!['sector:rs_corps:0']!.assigned_brigade_ids)
            .not.toContain('released_disconnected');
        expect(state.military.unresolved_sector_brigades).toEqual([]);
    });

    it('leaves reachable, movement-owned, loaned, otherwise-operation-owned, queued, enclave, assigned, and already-holding participants with their owners', async () => {
        const { state, context } = fixture();
        const reachable = brigade('reachable', 'op:front:line');
        const homeReturn = brigade('home_return', 'op:away:enemy');
        homeReturn.home_osid = 'op:front:line';
        const loaned = brigade('loaned', 'op:pocket:held');
        loaned.elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'receiving_corps',
            loan_start_turn: 10,
        } as FormationState['elite_loan_state'];
        const returnToCorps = brigade('return_to_corps', 'op:pocket:held');
        const otherMovement = brigade('other_movement', 'op:pocket:held');
        const otherOperation = brigade('other_operation', 'op:pocket:held');
        const queued = brigade('rs_22nd_krajina_infantry', 'op:pocket:held');
        queued.corps_id = 'vrs_1st_krajina';
        const enclave = brigade('enclave', 'op:pocket:held');
        enclave.tags = ['enclave'];
        const assigned = brigade('assigned', 'op:pocket:held');
        assigned.assignment = { kind: 'sector', id: 'protected-assignment' } as FormationState['assignment'];
        const alreadyHolding = brigade('already_holding', 'op:pocket:held');
        alreadyHolding.stranded_status = 'holding';
        alreadyHolding.stranded_since_turn = 12;

        for (const formation of [
            reachable, homeReturn, loaned, returnToCorps, otherMovement, otherOperation,
            queued, enclave, assigned, alreadyHolding,
        ]) addCompletionParticipant(state, formation);
        state.political.political_controllers!['op:away:enemy'] = 'RBiH';
        state.military.brigade_movement_orders = {
            return_to_corps: { destination_sids: ['op:front:line'], stance: 'column' },
        };
        state.military.brigade_movement_state = {
            other_movement: {
                status: 'in_transit',
                destination_sids: ['op:front:line'],
                stance: 'column',
                turns_remaining: 2,
            },
        } as GameState['military']['brigade_movement_state'];
        state.military.corps_command!.other_corps = {
            command_span: 5,
            subordinate_count: 1,
            og_slots: 1,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'defensive',
            active_operations: [{
                name: 'Other Owner',
                type: 'sector_attack',
                phase: 'recovery',
                started_turn: 15,
                phase_started_turn: 16,
                participating_brigades: ['other_operation'],
            }],
        };
        state.military.corps_command!.vrs_1st_krajina = {
            command_span: 5,
            subordinate_count: 1,
            og_slots: 1,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'defensive',
            active_operations: [],
            queued_operations: ['Operation Donji Vakuf'],
        };
        const movementBefore = structuredClone(state.military.brigade_movement_orders);
        const movementStateBefore = structuredClone(state.military.brigade_movement_state);
        const holdingBefore = {
            personnel: alreadyHolding.personnel,
            cohesion: alreadyHolding.cohesion,
            morale: alreadyHolding.morale,
            since: alreadyHolding.stranded_since_turn,
        };
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            await runProductionHandoff(context);
        } finally {
            warn.mockRestore();
        }

        expect(reachable.stranded_status).toBeUndefined();
        expect(reachable.assignment?.kind).toBe('sector');
        expect(state.military.brigade_movement_orders?.home_return).toEqual({
            destination_sids: ['op:front:line'],
            stance: 'column',
        });
        expect(homeReturn.stranded_status).toBeUndefined();
        expect(loaned.stranded_status).toBeUndefined();
        expect(returnToCorps.stranded_status).toBeUndefined();
        expect(otherMovement.stranded_status).toBeUndefined();
        expect(otherOperation.stranded_status).toBeUndefined();
        expect(queued.stranded_status).toBeUndefined();
        expect(enclave.stranded_status).toBeUndefined();
        expect(assigned.stranded_status).toBeUndefined();
        expect(state.military.brigade_movement_orders?.return_to_corps).toEqual(movementBefore?.return_to_corps);
        expect(state.military.brigade_movement_state?.other_movement).toEqual(movementStateBefore?.other_movement);
        expect(alreadyHolding).toMatchObject({
            personnel: holdingBefore.personnel,
            cohesion: holdingBefore.cohesion,
            morale: holdingBefore.morale,
            stranded_status: 'holding',
            stranded_since_turn: holdingBefore.since,
        });
    });

    it('retains the former unresolved=1 collector result when no current-pass completion receipt exists', async () => {
        const { state, context } = fixture();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        try {
            advanceSectorOffensives(state, null);
            const start = warPhaseReconciliationSteps.findIndex((step) => step.name === 'reconcile-final-operation-truth');
            const end = warPhaseReconciliationSteps.findIndex((step) => step.name === 'seal-final-sector-truth-after-distribution');
            for (const step of warPhaseReconciliationSteps.slice(start, end + 1)) {
                await step.run(context);
            }
        } finally {
            warn.mockRestore();
        }

        expect(state.military.formations!.released_disconnected!.stranded_status).toBeUndefined();
        expect(state.military.unresolved_sector_brigades).toEqual(['released_disconnected']);
    });

    it('keeps current-pass receipts, classification, and save bytes stable across reversed completing-operation inputs', async () => {
        const run = async (reversed: boolean) => {
            const { state, context } = fixture();
            delete state.military.formations!.released_disconnected;
            const formationIds = ['alpha_a', 'alpha_b', 'zulu_a', 'zulu_b'];
            const reorderedFormations = reversed ? [...formationIds].reverse() : formationIds;
            for (const id of reorderedFormations) {
                const formation = brigade(id, 'op:pocket:held');
                formation.corps_id = id.startsWith('alpha') ? 'alpha_corps' : 'zulu_corps';
                state.military.formations![id] = formation;
            }

            const makeCompletedProbe = (corpsId: string, participantIds: string[]) => ({
                command_span: 5,
                subordinate_count: participantIds.length,
                og_slots: 1,
                active_ogs: [],
                corps_exhaustion: 0,
                stance: 'offensive' as const,
                active_operations: [{
                    name: `Probe ${corpsId}`,
                    type: 'probe' as const,
                    phase: 'recovery' as const,
                    started_turn: 10,
                    phase_started_turn: 13,
                    participating_brigades: participantIds,
                    objectives: ['op:front:enemy'],
                    current_objective_index: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                    recovery_reason: 'probe_complete' as const,
                    sector_id: `sector:${corpsId}:0`,
                }],
            });
            const alphaCommand = makeCompletedProbe(
                'alpha_corps',
                reversed ? ['alpha_b', 'alpha_a'] : ['alpha_a', 'alpha_b'],
            );
            const zuluCommand = makeCompletedProbe(
                'zulu_corps',
                reversed ? ['zulu_b', 'zulu_a'] : ['zulu_a', 'zulu_b'],
            );
            state.military.corps_command = reversed
                ? { zulu_corps: zuluCommand, alpha_corps: alphaCommand }
                : { alpha_corps: alphaCommand, zulu_corps: zuluCommand };
            const baseSector = sector();
            const alphaSector = structuredClone(baseSector);
            Object.assign(alphaSector, {
                sector_id: 'sector:alpha_corps:0',
                corps_id: 'alpha_corps',
            });
            const zuluSector = structuredClone(baseSector);
            Object.assign(zuluSector, {
                sector_id: 'sector:zulu_corps:0',
                corps_id: 'zulu_corps',
            });
            state.military.corps_front_sectors = reversed
                ? { 'sector:zulu_corps:0': zuluSector, 'sector:alpha_corps:0': alphaSector }
                : { 'sector:alpha_corps:0': alphaSector, 'sector:zulu_corps:0': zuluSector };

            const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            try {
                await warPhases.find((step) => step.name === 'advance-sector-offensives')!.run(context);
                const completionReceipt = [...(context.completedOperationParticipantIds ?? [])];
                const start = warPhaseReconciliationSteps.findIndex((step) => step.name === 'reconcile-final-operation-truth');
                const end = warPhaseReconciliationSteps.findIndex((step) => step.name === 'seal-final-sector-truth-after-distribution');
                for (const step of warPhaseReconciliationSteps.slice(start, end + 1)) await step.run(context);
                return {
                    completionReceipt,
                    classification: structuredClone(context.report.stranded_brigade_lifecycle),
                    serialized: serializeState(state),
                    state,
                };
            } finally {
                warn.mockRestore();
            }
        };

        const forward = await run(false);
        const reversed = await run(true);

        expect(forward.completionReceipt).toEqual(['alpha_a', 'alpha_b', 'zulu_a', 'zulu_b']);
        expect(reversed.completionReceipt).toEqual(forward.completionReceipt);
        expect(reversed.classification).toEqual(forward.classification);
        expect(forward.classification?.newly_stranded).toEqual(['alpha_a', 'alpha_b', 'zulu_a', 'zulu_b']);
        expect(forward.state.operation_history).toBeUndefined();
        expect(reversed.state.operation_history).toBeUndefined();
        expect(forward.state.military.corps_command!.alpha_corps!.active_operations).toEqual([]);
        expect(forward.state.military.corps_command!.zulu_corps!.active_operations).toEqual([]);
        expect(reversed.serialized).toBe(forward.serialized);
    });

    it('classifies in stable ID order and persists holding fields across the canonical save round trip', () => {
        const left = fixture();
        const right = fixture();
        const alpha = brigade('alpha_released', 'op:pocket:held');
        const zulu = brigade('zulu_released', 'op:pocket:held');
        const protectedAssignment = brigade('protected_assignment', 'op:pocket:held');
        protectedAssignment.assignment = { kind: 'sector', id: 'protected-assignment' } as FormationState['assignment'];
        left.state.military.formations = {
            zulu_released: structuredClone(zulu),
            ...left.state.military.formations,
            alpha_released: structuredClone(alpha),
            protected_assignment: structuredClone(protectedAssignment),
        };
        right.state.military.formations = {
            protected_assignment: structuredClone(protectedAssignment),
            alpha_released: structuredClone(alpha),
            ...right.state.military.formations,
            zulu_released: structuredClone(zulu),
        };
        const leftSpatial = computeSpatialContext(
            left.edges,
            left.state.political.political_controllers ?? {},
            ['HRHB', 'RBiH', 'RS'],
            left.state.meta.turn,
            'post-combat',
            left.state.military.war_front_edges_osid,
        );
        const rightSpatial = computeSpatialContext(
            right.edges,
            right.state.political.political_controllers ?? {},
            ['HRHB', 'RBiH', 'RS'],
            right.state.meta.turn,
            'post-combat',
            right.state.military.war_front_edges_osid,
        );

        const leftReport = classifyReleasedOperationParticipants(
            left.state,
            ['zulu_released', 'protected_assignment', 'alpha_released', 'zulu_released'],
            leftSpatial.adjacency,
        );
        const rightReport = classifyReleasedOperationParticipants(
            right.state,
            ['alpha_released', 'protected_assignment', 'zulu_released'],
            rightSpatial.adjacency,
        );

        expect(leftReport.newly_stranded).toEqual(['alpha_released', 'zulu_released']);
        expect(rightReport).toEqual(leftReport);
        expect(left.state.military.formations!.protected_assignment!.assignment)
            .toEqual({ kind: 'sector', id: 'protected-assignment' });
        expect(serializeState(left.state)).toBe(serializeState(right.state));
        const restored = deserializeState(serializeState(left.state));
        expect(restored.military.formations!.alpha_released).toMatchObject({
            stranded_status: 'holding',
            stranded_since_turn: 16,
        });
        expect(restored.military.formations!.zulu_released).toMatchObject({
            stranded_status: 'holding',
            stranded_since_turn: 16,
        });
    });
});
