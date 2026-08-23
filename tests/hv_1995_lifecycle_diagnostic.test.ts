import { describe, expect, it } from 'vitest';
import {
    HV_1995_FORMATION_IDS,
    analyzeHv1995CatalogCoverage,
    analyzeHv1995Lifecycle,
    parseJsonLines,
} from '../tools/diagnostics/hv_1995_lifecycle.js';
import { FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES } from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import type { GameState } from '../src/state/game_state.js';

function completeSpawnRows(): Array<Record<string, unknown>> {
    return HV_1995_FORMATION_IDS.map((formation_id) => ({
        turn: 174,
        formation_spawns: [{ formation_id, kind: 'hv_phantom' }],
        movements: formation_id === HV_1995_FORMATION_IDS[0]
            ? [{ formation_id, from_osid: 'op:a', to_osid: 'op:b' }]
            : [],
        battles: [],
    }));
}

describe('HV 1995 lifecycle diagnostic', () => {
    it('distinguishes absent roster authorship from a roster window that closes before spawn', () => {
        const result = analyzeHv1995CatalogCoverage(
            FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES,
            Object.fromEntries(HV_1995_FORMATION_IDS.map((formationId) => [formationId, 174])),
            {} as GameState,
            188,
        );

        expect(result.positive_controls).toEqual({
            catalog_opportunity_count: 4,
            known_assignment_observed: true,
            known_post_spawn_window_observed: true,
        });
        expect(result.formations.find((row) => row.formation_id === 'hv_112th_infantry_1995')).toMatchObject({
            status: 'REACHABLE_POST_SPAWN',
            assignments: [expect.objectContaining({
                opportunity_id: 'mistral_2_95',
                axis_id: 'mistral_drvar_grahovo',
                first_open_turn: 175,
                last_open_turn: 188,
                post_spawn_open_turn_count: 14,
            })],
        });
        expect(result.formations.find((row) => row.formation_id === 'hv_7th_hgr_1995')).toMatchObject({
            status: 'AUTHORED_WINDOW_PRE_SPAWN_ONLY',
            assignments: [expect.objectContaining({
                opportunity_id: 'mistral_1_95',
                axis_id: 'mistral_1_glamoc',
                first_open_turn: 160,
                last_open_turn: 170,
                post_spawn_open_turn_count: 0,
            })],
        });
        expect(result.formations.find((row) => row.formation_id === 'hv_1st_hgz_1995')).toMatchObject({
            status: 'REACHABLE_POST_SPAWN',
            assignments: [
                expect.objectContaining({
                    opportunity_id: 'mistral_2_95',
                    axis_id: 'mistral_sipovo',
                    first_open_turn: 175,
                    last_open_turn: 188,
                    post_spawn_open_turn_count: 14,
                }),
                expect.objectContaining({
                    opportunity_id: 'southern_move_95',
                    axis_id: 'southern_move_mrkonjic',
                    first_open_turn: 182,
                    last_open_turn: 188,
                    post_spawn_open_turn_count: 7,
                }),
            ],
        });
        for (const formationId of [
            'hv_126th_hgr_1995',
            'hv_134th_hgr_1995',
            'hv_141st_reserve_brigade_1995',
        ]) {
            expect(result.formations.find((row) => row.formation_id === formationId)).toMatchObject({
                status: 'NO_AUTHORED_CATALOG_ASSIGNMENT',
                assignments: [],
            });
        }
    });

    it('parses CRLF/LF JSONL deterministically and ignores blank lines', () => {
        expect(parseJsonLines('{"b":2}\r\n\r\n{"a":1}\n')).toEqual([{ b: 2 }, { a: 1 }]);
    });

    it('joins live boundary evidence and reports absence only behind positive controls', () => {
        const lead = HV_1995_FORMATION_IDS[0]!;
        const temporalRows: Array<Record<string, unknown>> = HV_1995_FORMATION_IDS.flatMap((brigade_id) => [
            {
                turn: 175,
                brigade_id,
                kind: 'hv_phantom',
                location_osid: 'op:a',
                mv_state: null,
                mv_destinations: brigade_id === lead ? ['op:b'] : null,
                active_op_id: brigade_id === lead ? 'corps:Operation Test:t174' : null,
                current_op_phase: brigade_id === lead ? 'execution' : null,
            },
        ]);
        temporalRows.push({
            turn: 175,
            brigade_id: 'hv_4th_guards_split',
            kind: 'brigade',
            location_osid: 'op:a',
            mv_state: 'in_transit',
            mv_destinations: ['op:b'],
            active_op_id: 'corps:Positive Control:t174',
            current_op_phase: 'execution',
        });
        temporalRows.push({
            turn: 100,
            brigade_id: 'future_exact',
            kind: 'brigade',
            location_osid: 'op:a',
            mv_state: null,
            mv_destinations: null,
            active_op_id: null,
            current_op_phase: null,
        });

        const result = analyzeHv1995Lifecycle({
            turnSummaries: [
                ...completeSpawnRows(),
                {
                    turn: 175,
                    formation_spawns: [{
                        formation_id: 'hv_4th_guards_split',
                        kind: 'brigade',
                    }],
                    movements: [{
                        formation_id: 'hv_4th_guards_split',
                        from_osid: 'op:a',
                        to_osid: 'op:b',
                    }],
                    battles: [{
                        osid: 'op:positive-control',
                        outcome: 'victory',
                        territory_flipped: true,
                    }],
                },
            ],
            temporalRows,
            weeklyRows: [{
                week_index: 175,
                column_movement: {
                    column_starts: 1,
                    column_rejections: [{
                        formation_id: lead,
                        reason: 'no_friendly_path',
                        location_osid: 'op:a',
                        destination_osid: 'op:c',
                    }],
                },
                battles: [{
                    battle_id: 'positive-control-battle',
                    attacker_brigades: [lead, 'hv_4th_guards_split'],
                }],
            }],
            opportunityTraces: [{
                turn: 176,
                opportunity_id: 'mistral_2_95',
                event: 'blocked',
                failed_required_axes: [{ axis: 'staging_access', reason: 'closed' }],
                participant_evaluations: [{
                    axis_id: 'mistral_2_main',
                    formation_id: lead,
                    decision: 'admitted',
                    reason: 'eligible_same_corps',
                }],
            }],
            operationAars: [{
                operation_name: 'Operation Mistral 1',
                operation_id: 'hvo_tomislavgrad:Operation Mistral 1:t160',
                started_turn: 160,
                ended_turn: 165,
                outcome: 'failure',
                recovery_reason: 'max_failures',
                participating_brigades: ['hv_4th_guards_split'],
                objectives_targeted: ['op:glamoc:vidimlije_2'],
                objectives_captured: [],
                total_attacks: 1,
                axis_summaries: [{
                    axis_id: 'mistral_1_glamoc',
                    brigades: ['hv_4th_guards_split'],
                    launch_blocker: 'max_failures',
                    total_attacks: 1,
                }],
            }],
            politicalControllers: {
                'op:kupres:bucovaca': 'HRHB',
                'op:glamoc:glamoc_2': 'RS',
                'op:sipovo:sipovo_2': 'RS',
                'op:sipovo:pribeljci_2': 'HRHB',
            },
            positiveControlId: 'hv_4th_guards_split',
            formations: {
                F_RBiH_0001: { tags: ['oob:alias_backed'] },
                future_exact: { tags: [] },
            },
            opInjectionWarnings: [
                {
                    turn: 164,
                    op_name: 'Alias-backed operation',
                    axis_id: 'main',
                    check: 'brigade_missing',
                    detail: 'Brigade "alias_backed" not found in formations',
                },
                {
                    turn: 69,
                    op_name: 'Positive control operation',
                    axis_id: 'main',
                    check: 'brigade_missing',
                    detail: 'Brigade "truly_missing" not found in formations',
                },
                {
                    turn: 50,
                    op_name: 'Deferred operation',
                    axis_id: 'main',
                    check: 'brigade_missing',
                    detail: 'Brigade "future_exact" not found in formations',
                },
            ],
        });

        expect(result.liveness.expected_formations).toBe(6);
        expect(result.liveness.spawned_formations).toBe(6);
        expect(result.positive_controls).toEqual({
            battle_stack_projection: true,
            movement_event_projection: true,
            movement_order_projection: true,
            operation_membership_projection: true,
            spawn_projection: true,
            temporal_population: true,
        });
        expect(result.formations[0]).toMatchObject({
            formation_id: lead,
            spawn_count: 1,
            temporal_row_count: 1,
            movement_order_turn_count: 1,
            operation_turn_count: 1,
            movement_event_count: 1,
            battle_stack_hit_count: 1,
            first_unobserved_boundary: null,
        });
        expect(result.formations[1]).toMatchObject({
            battle_stack_hit_count: 0,
            battle_participation_status: 'ABSENT_WITH_POSITIVE_CONTROL',
            first_unobserved_boundary: 'operation_assignment',
        });
        expect(result.opportunity_blockers).toEqual([{
            event: 'blocked',
            failed_required_axes: [{ axis: 'staging_access', reason: 'closed' }],
            opportunity_id: 'mistral_2_95',
            turn: 176,
        }]);
        expect(result.cascade.positive_controls).toEqual({
            column_movement_projection: true,
            final_controller_projection: true,
            movement_reject_projection: true,
            operation_aar_projection: true,
            opportunity_trace_projection: true,
            opportunity_roster_projection: true,
            opportunity_roster_admission_positive_control: true,
            turn_battle_flip_projection: true,
            weekly_operation_diagnostic_projection: false,
        });
        expect(result.cascade.operations).toContainEqual(expect.objectContaining({
            opportunity_id: 'mistral_1_95',
            operation_name: 'Operation Mistral 1',
            aar: expect.objectContaining({
                outcome: 'failure',
                recovery_reason: 'max_failures',
            }),
        }));
        expect(result.cascade.dependency_anchors).toContainEqual({
            consumer_opportunity_id: 'mistral_2_95',
            osid: 'op:glamoc:glamoc_2',
            final_controller: 'RS',
        });
        expect(result.cascade.movement_rejections).toEqual([expect.objectContaining({
            formation_id: lead,
            reason: 'no_friendly_path',
            turn: 175,
        })]);
        expect(result.operation_reference_integrity).toMatchObject({
            positive_controls: {
                brigade_missing_warning_projection: true,
                non_alias_warning_positive_control: true,
            },
            alias_backed_false_missing_count: 1,
            ambiguous_oob_alias_count: 0,
        });
        expect(result.operation_reference_integrity.warnings).toContainEqual(expect.objectContaining({
            authored_formation_id: 'alias_backed',
            live_oob_aliases: ['F_RBiH_0001'],
            classification: 'alias_backed_false_missing',
        }));
        expect(result.operation_reference_integrity.warnings).toContainEqual(expect.objectContaining({
            authored_formation_id: 'future_exact',
            first_observed_turn: 100,
            classification: 'not_yet_spawned_at_warning',
        }));
    });

    it('marks zero battle hits NOT_ESTABLISHED when stack projection has no positive control', () => {
        const result = analyzeHv1995Lifecycle({
            turnSummaries: completeSpawnRows(),
            temporalRows: HV_1995_FORMATION_IDS.map((brigade_id) => ({
                turn: 175,
                brigade_id,
                kind: 'hv_phantom',
                location_osid: 'op:a',
                mv_state: null,
                mv_destinations: null,
                active_op_id: null,
                current_op_phase: null,
            })),
            weeklyRows: [{ week_index: 175, battles: [{ battle_id: 'legacy-shape' }] }],
            opportunityTraces: [],
            operationAars: [],
            politicalControllers: {},
            positiveControlId: 'hv_4th_guards_split',
        });

        expect(result.positive_controls.battle_stack_projection).toBe(false);
        expect(result.formations.every((row) =>
            row.battle_participation_status === 'NOT_ESTABLISHED')).toBe(true);
    });

    it('does not treat an empty attacker stack as a battle-stack positive control', () => {
        const result = analyzeHv1995Lifecycle({
            turnSummaries: completeSpawnRows(),
            temporalRows: HV_1995_FORMATION_IDS.map((brigade_id) => ({
                turn: 175,
                brigade_id,
                kind: 'hv_phantom',
                location_osid: 'op:a',
                mv_state: null,
                mv_destinations: null,
                active_op_id: null,
                current_op_phase: null,
            })),
            weeklyRows: [{
                week_index: 175,
                battles: [{ battle_id: 'empty-stack', attacker_brigades: [] }],
            }],
            opportunityTraces: [],
            operationAars: [],
            politicalControllers: {},
            positiveControlId: 'hv_4th_guards_split',
        });

        expect(result.positive_controls.battle_stack_projection).toBe(false);
        expect(result.formations.every((row) =>
            row.battle_participation_status === 'NOT_ESTABLISHED')).toBe(true);
    });

    it('recognizes standard weekly operation and scalar attacker projections without temporal tracing', () => {
        const observed = HV_1995_FORMATION_IDS[3];
        const result = analyzeHv1995Lifecycle({
            turnSummaries: completeSpawnRows(),
            temporalRows: [],
            weeklyRows: [{
                week_index: 183,
                battles: [{ battle_id: 'standard-shape', attacker_brigade: observed }],
                operation_diagnostics: [{
                    operation_name: 'Generated Probe',
                    operation_phase: 'execution',
                    participating_brigades: [observed],
                }],
            }],
            opportunityTraces: [],
            operationAars: [],
            politicalControllers: {},
            positiveControlId: 'hv_4th_guards_split',
        });

        expect(result.positive_controls.battle_stack_projection).toBe(true);
        expect(result.positive_controls.operation_membership_projection).toBe(true);
        expect(result.liveness.traced_formations).toBe(0);
        expect(result.liveness.observed_formations).toBe(6);
        expect(result.formations.find((row) => row.formation_id === observed)).toMatchObject({
            operation_turn_count: 1,
            battle_stack_hit_count: 1,
            battle_participation_status: 'OBSERVED',
            first_unobserved_boundary: null,
        });
    });

    it('does not diagnose spawn or temporal absence when those projections lack a positive control', () => {
        const result = analyzeHv1995Lifecycle({
            turnSummaries: [],
            temporalRows: [],
            weeklyRows: [],
            opportunityTraces: [],
            operationAars: [],
            politicalControllers: {},
            positiveControlId: 'hv_4th_guards_split',
        });

        expect(result.positive_controls.spawn_projection).toBe(false);
        expect(result.positive_controls.temporal_population).toBe(false);
        expect(result.formations.every((row) => row.first_unobserved_boundary === null)).toBe(true);
    });
});
