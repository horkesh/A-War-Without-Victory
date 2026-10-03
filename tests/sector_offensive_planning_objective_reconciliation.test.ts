import { describe, expect, it, vi } from 'vitest';

import { advanceSectorOffensives, emitSanaPlanningTraceReceipt, reconcilePlanningObjectives } from '../src/sim/combat/sector_offensive.js';
import { areParticipantsReadyForExecution, collectObjectiveApproachOsids } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { generateAllBotOrdersOsid, getSectorOffensiveApproachOsids } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { SANA_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import { getOperationAuthorizedDestinations } from '../src/sim/combat/brigade_routine_scope.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';

describe('planning objective reconciliation', () => {
    it('retains only the flagged Sana axis sequence while unflagged sibling axes still prune', () => {
        const makeAxis = (axis_id: string, objectives: string[], flagged = false) => Object.assign({
            axis_id,
            name: axis_id,
            assigned_brigades: [`${axis_id}_brigade`],
            objectives,
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }, flagged ? { preserve_objective_sequence: true } : {});
        const op: CorpsOperation = {
            name: 'Operation Sana',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 175,
            phase_started_turn: 175,
            participating_brigades: ['sanski_brigade', 'other_brigade'],
            objectives: ['op:sanski:prefix', 'op:sanski:reachable', 'op:other:prefix', 'op:other:reachable'],
            current_objective_index: 0,
            axes: [
                makeAxis('sanski', ['op:sanski:prefix', 'op:sanski:reachable'], true),
                makeAxis('other', ['op:other:prefix', 'op:other:reachable']),
            ],
        };
        const state = {
            meta: { turn: 176, phase: 'war' },
            military: {
                war_front_edges_osid: [
                    { edge_id: 'sanski-front', a: 'op:approach:sanski', b: 'op:sanski:reachable', side_a: 'RBiH', side_b: 'RS' },
                    { edge_id: 'other-front', a: 'op:approach:other', b: 'op:other:reachable', side_a: 'RBiH', side_b: 'RS' },
                ],
            },
            political: {
                political_controllers: {
                    'op:sanski:prefix': 'RS', 'op:sanski:reachable': 'RS', 'op:approach:sanski': 'RBiH',
                    'op:other:prefix': 'RS', 'op:other:reachable': 'RS', 'op:approach:other': 'RBiH',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'arbih_5th_corps', op, 'RBiH')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:sanski:prefix', 'op:sanski:reachable']);
        expect(op.axes?.[1]?.objectives).toEqual(['op:other:reachable']);
    });

    it('does not skip a flagged axis current objective for an approach or its planning destination', () => {
        const op: CorpsOperation = {
            name: 'Operation Sana',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 175,
            phase_started_turn: 175,
            participating_brigades: ['arbih_506th_mountain'],
            objectives: ['op:sanski:prefix', 'op:sanski:reachable'],
            current_objective_index: 0,
            axes: [Object.assign({
                axis_id: 'sana_sanski_most_kljuc',
                name: 'Sanski Most + Ključ Liberation',
                assigned_brigades: ['arbih_506th_mountain'],
                objectives: ['op:sanski:prefix', 'op:sanski:reachable'],
                current_objective_index: 0,
                status: 'executing' as const,
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
                staging_osid: 'op:bosanska_krupa:ivanjska_2',
            }, { preserve_objective_sequence: true })],
        };
        const state = {
            meta: { turn: 176, phase: 'war' },
            military: {
                formations: {
                    arbih_506th_mountain: { id: 'arbih_506th_mountain', faction: 'RBiH', corps_id: 'arbih_5th_corps', location_osid: 'op:bihac:bihac_2' },
                },
                war_front_edges_osid: [{ edge_id: 'later-only', a: 'op:approach:later', b: 'op:sanski:reachable', side_a: 'RBiH', side_b: 'RS' }],
            },
            political: {
                political_controllers: {
                    'op:sanski:prefix': 'RS', 'op:sanski:reachable': 'RS', 'op:approach:later': 'RBiH',
                },
            },
        } as unknown as GameState;
        const adjacency = new Map<string, string[]>();

        expect(getSectorOffensiveApproachOsids(state, op, 'RBiH', adjacency, new Map(), 'arbih_506th_mountain')).toEqual(new Set());
        expect(getOperationAuthorizedDestinations(state, 'arbih_506th_mountain', op, adjacency, new Map())).toEqual(
            new Set(['op:bosanska_krupa:ivanjska_2']),
        );

        state.military.war_front_edges_osid = [{
            edge_id: 'current-live-contact',
            a: 'op:approach:current',
            b: 'op:sanski:prefix',
            side_a: 'RBiH',
            side_b: 'RS',
        }];
        state.political!.political_controllers!['op:approach:current'] = 'RBiH';
        expect(getSectorOffensiveApproachOsids(state, op, 'RBiH', adjacency, new Map(), 'arbih_506th_mountain'))
            .toEqual(new Set(['op:approach:current']));
    });

    it('marks only the authored Sana Sanski axis for sequence commitment', () => {
        const sanskiAxis = SANA_95_OPPORTUNITY.axes.find(axis => axis.axis_id === 'sana_sanski_most_kljuc');
        expect(sanskiAxis?.preserve_objective_sequence).toBe(true);
        expect(SANA_95_OPPORTUNITY.axes.filter(axis => axis.preserve_objective_sequence).map(axis => axis.axis_id))
            .toEqual(['sana_sanski_most_kljuc']);
    });

    it('retains foreign-controlled objectives during reconciliation, including a combat-blocked one', () => {
        const axis = (axis_id: string, objective: string) => ({
            axis_id,
            name: axis_id,
            assigned_brigades: ['arbih_bde'],
            objectives: [objective],
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        });
        const op: CorpsOperation = {
            name: 'Post-Washington operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 101,
            phase_started_turn: 101,
            participating_brigades: ['arbih_bde'],
            objectives: ['op:allied', 'op:enemy'],
            axes: [axis('allied_axis', 'op:allied'), axis('enemy_axis', 'op:enemy')],
        };
        const state = {
            meta: { turn: 101, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'enemy-front',
                    a: 'op:approach',
                    b: 'op:enemy',
                    side_a: 'RBiH',
                    side_b: 'RS',
                }],
            },
            political: {
                war_alliance_rbih_hrhb: -0.5,
                rbih_hrhb_state: { washington_signed: true },
                political_controllers: {
                    'op:approach': 'RBiH',
                    'op:allied': 'HRHB',
                    'op:enemy': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'arbih_corps', op, 'RBiH')).toBe('valid');
        expect(op.axes?.map((entry) => entry.axis_id)).toEqual(['allied_axis', 'enemy_axis']);
        expect(op.objectives).toEqual(['op:allied', 'op:enemy']);
    });

    it('does not misclassify a combat-blocked foreign objective as completed', () => {
        const op: CorpsOperation = {
            name: 'Operacija Osvit shape',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 101,
            phase_started_turn: 101,
            participating_brigades: ['arbih_bde'],
            objectives: ['op:jablanica:doljani_2'],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 101, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'blocked-front',
                    a: 'op:jablanica:approach',
                    b: 'op:jablanica:doljani_2',
                    side_a: 'RBiH',
                    side_b: 'HRHB',
                }],
            },
            political: {
                war_alliance_rbih_hrhb: -0.5,
                rbih_hrhb_state: { washington_signed: true },
                political_controllers: {
                    'op:jablanica:approach': 'RBiH',
                    'op:jablanica:doljani_2': 'HRHB',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'arbih_4th_corps', op, 'RBiH')).toBe('valid');
        expect(op.objectives).toEqual(['op:jablanica:doljani_2']);
    });

    it('drops a stale objective prefix when a later objective still has a live corps approach', () => {
        const op: CorpsOperation = {
            name: 'Generated operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['hvo_a', 'hv_b'],
            objectives: ['op:stale', 'op:viable'],
            current_objective_index: 0,
            axes: [{
                axis_id: 'main',
                name: 'Main Axis',
                assigned_brigades: ['hvo_a', 'hv_b'],
                objectives: ['op:stale', 'op:viable'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:viable',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:stale': 'RBiH',
                    'op:approach': 'HRHB',
                    'op:viable': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:viable']);
        expect(op.objectives).toEqual(['op:viable']);
    });

    it('does not treat pre-planned provenance as an authored sequence constraint', () => {
        const op: CorpsOperation = {
            name: 'Pre-planned operation with stale prefix',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:stale', 'op:viable'],
            current_objective_index: 0,
            is_pre_planned: true,
            axes: [{
                axis_id: 'main',
                name: 'Main Axis',
                assigned_brigades: ['bde'],
                objectives: ['op:stale', 'op:viable'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:viable',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:stale': 'RS',
                    'op:approach': 'HRHB',
                    'op:viable': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:viable']);
        expect(op.objectives).toEqual(['op:viable']);
    });

    it('keeps a reachable first objective and its deeper objective chain', () => {
        const op: CorpsOperation = {
            name: 'Reachable operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:first', 'op:deep'],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:first',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:approach': 'HRHB',
                    'op:first': 'RS',
                    'op:deep': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.objectives).toEqual(['op:first', 'op:deep']);
    });

    it('does not bypass an unreachable objective to attack deeper territory held by the same defender', () => {
        const op: CorpsOperation = {
            name: 'Authored sequential operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:first', 'op:deep'],
            current_objective_index: 0,
            preserve_objective_sequence: true,
            axes: [{
                axis_id: 'main',
                name: 'Main Axis',
                assigned_brigades: ['bde'],
                objectives: ['op:first', 'op:deep'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:deep',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:first': 'RS',
                    'op:approach': 'HRHB',
                    'op:deep': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual(['op:first', 'op:deep']);
        expect(op.objectives).toEqual(['op:deep', 'op:first']);
    });

    it('leaves a wholly unreachable chain for the existing invalidation path', () => {
        const op: CorpsOperation = {
            name: 'Invalidated operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 10,
            phase_started_turn: 10,
            participating_brigades: ['bde'],
            objectives: ['op:first', 'op:deep'],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: { war_front_edges_osid: [] },
            political: {
                political_controllers: {
                    'op:first': 'RS',
                    'op:deep': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('invalidated');
        expect(op.objectives).toEqual(['op:first', 'op:deep']);
    });

    it('retains a staged sibling axis when another axis has an immediate approach', () => {
        const axis = (axis_id: string, objectives: string[]) => ({
            axis_id,
            name: axis_id,
            assigned_brigades: ['bde'],
            objectives,
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        });
        const op: CorpsOperation = {
            name: 'Mixed-axis operation',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 1,
            phase_started_turn: 1,
            participating_brigades: ['bde'],
            objectives: ['op:dead', 'op:live'],
            axes: [axis('dead', ['op:dead']), axis('live', ['op:live'])],
        };
        const state = {
            meta: { turn: 2, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-front',
                    a: 'op:approach',
                    b: 'op:live',
                    side_a: 'HRHB',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:dead': 'RS',
                    'op:approach': 'HRHB',
                    'op:live': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'hvo_corps', op, 'HRHB')).toBe('valid');
        expect(op.axes?.map((entry) => entry.axis_id)).toEqual(['dead', 'live']);
        expect(op.objectives).toEqual(['op:dead', 'op:live']);
    });

    it('reproduces the retained Sana suffix at the real Petrovac-to-Ključ approach boundary', () => {
        // Real-topology source: data/derived/operational/operational_contact_graph.json.
        // Retained receipts: runs/..._w188_n30/final_save.json (axis suffix and Otoka
        // staging), runs/..._w188_n29/final_save.json (14-objective axis), and the
        // n29/n30 brigade_temporal_log.jsonl + weekly_report.jsonl t175–180 receipts
        // retained under the corresponding run directories.
        const sanskiObjectives = [
            'op:bosanska_krupa:donji_dubovik_2',
            'op:sanski_most:budimlic_japra_2',
            'op:sanski_most:lusci_palanka_2',
            'op:sanski_most:jelasinovci',
            'op:sanski_most:skucani_vakuf_2',
            'op:sanski_most:stari_majdan',
            'op:sanski_most:sanski_most_2',
            'op:sanski_most:ostra_luka',
            'op:sanski_most:ilidza_2',
            'op:sanski_most:kljevci',
            'op:kljuc:sanica_2',
            'op:kljuc:hadzici',
            'op:kljuc:kljuc_2',
            'op:kljuc:krasulje_2',
        ];
        const op: CorpsOperation = {
            name: 'Operation Sana diagnostic',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 175,
            phase_started_turn: 175,
            participating_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
            objectives: sanskiObjectives,
            current_objective_index: 0,
            staging_osid: 'op:bosanska_krupa:otoka_2',
            axes: [{
                axis_id: 'sana_trace_diagnostic',
                name: 'Sanski Most + Ključ Liberation',
                assigned_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
                objectives: sanskiObjectives,
                current_objective_index: 0,
                staging_osid: 'op:bosanska_krupa:otoka_2',
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 175, phase: 'war' },
            military: {
                // Real graph edge supplied as live in this bounded synthetic state;
                // retained receipts do not prove it was the t175 front edge.
                // No live edge is supplied for the preceding Sanski objectives.
                war_front_edges_osid: [{
                    edge_id: 'petrovac-kljuc-live-front',
                    a: 'op:bosanski_petrovac:jasenovac_2',
                    b: 'op:kljuc:hadzici',
                    side_a: 'RBiH',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: Object.fromEntries(
                    [
                        ...sanskiObjectives.map((objective) => [objective, 'RS']),
                        ['op:bosanski_petrovac:jasenovac_2', 'RBiH'],
                    ],
                ),
            },
        } as unknown as GameState;

        // The first lawful approach in this boundary is Hadžići; reconciliation
        // therefore removes the preceding Sanski prefix, matching n30's suffix.
        expect(reconcilePlanningObjectives(state, 'arbih_5th_corps', op, 'RBiH')).toBe('valid');
        expect(op.axes?.[0]?.objectives).toEqual([
            'op:kljuc:hadzici',
            'op:kljuc:kljuc_2',
            'op:kljuc:krasulje_2',
        ]);
    });

    it('retains a real Sana prefix when the first objective has its lawful approach', () => {
        // Positive control from the same operational contact graph: ivanjska_2
        // → donji_dubovik_2 is the first authored Sana walk edge.
        const op: CorpsOperation = {
            name: 'Operation Sana positive control',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 175,
            phase_started_turn: 175,
            participating_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
            objectives: [
                'op:bosanska_krupa:donji_dubovik_2',
                'op:sanski_most:budimlic_japra_2',
                'op:sanski_most:lusci_palanka_2',
            ],
            current_objective_index: 0,
        };
        const state = {
            meta: { turn: 175, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'krupa-live-front',
                    a: 'op:bosanska_krupa:ivanjska_2',
                    b: 'op:bosanska_krupa:donji_dubovik_2',
                    side_a: 'RBiH',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:bosanska_krupa:ivanjska_2': 'RBiH',
                    'op:bosanska_krupa:donji_dubovik_2': 'RS',
                    'op:sanski_most:budimlic_japra_2': 'RS',
                    'op:sanski_most:lusci_palanka_2': 'RS',
                },
            },
        } as unknown as GameState;

        expect(reconcilePlanningObjectives(state, 'arbih_5th_corps', op, 'RBiH')).toBe('valid');
        expect(op.objectives).toEqual([
            'op:bosanska_krupa:donji_dubovik_2',
            'op:sanski_most:budimlic_japra_2',
            'op:sanski_most:lusci_palanka_2',
        ]);
    });

    it('does not use Sana staging OSID when reconciling the same real-topology input', () => {
        // Retained n29/n30 t175–180 receipts show different 506th/517th positions
        // (Bihać in n29; Bihać → Otoka → Veliki Badić in n30), but this selector
        // does not read brigade positions or staging_osid from its inputs.
        const makeOperation = (staging_osid: string): CorpsOperation => ({
            name: 'Operation Sana diagnostic',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 175,
            phase_started_turn: 175,
            participating_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
            objectives: ['op:sanski_most:sanski_most_2', 'op:kljuc:hadzici', 'op:kljuc:kljuc_2'],
            current_objective_index: 0,
            staging_osid,
        });
        const makeState = (): GameState => ({
            meta: { turn: 175, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'petrovac-kljuc-live-front',
                    a: 'op:bosanski_petrovac:jasenovac_2',
                    b: 'op:kljuc:hadzici',
                    side_a: 'RBiH',
                    side_b: 'RS',
                }],
            },
            political: {
                political_controllers: {
                    'op:bosanski_petrovac:jasenovac_2': 'RBiH',
                    'op:sanski_most:sanski_most_2': 'RS',
                    'op:kljuc:hadzici': 'RS',
                    'op:kljuc:kljuc_2': 'RS',
                },
            },
        } as unknown as GameState);

        const bihacStaged = makeOperation('op:bihac:bihac_2');
        const otokaStaged = makeOperation('op:bosanska_krupa:otoka_2');
        expect(reconcilePlanningObjectives(makeState(), 'arbih_5th_corps', bihacStaged, 'RBiH')).toBe('valid');
        expect(reconcilePlanningObjectives(makeState(), 'arbih_5th_corps', otokaStaged, 'RBiH')).toBe('valid');
        expect(bihacStaged.objectives).toEqual(otokaStaged.objectives);
        expect(bihacStaged.objectives).toEqual(['op:kljuc:hadzici', 'op:kljuc:kljuc_2']);
    });

    it('keeps the Sana planning trace off by default and emits a deterministic pre/post pair when enabled', () => {
        const objectives = ['op:stale', 'op:first', 'op:deep'];
        const op: CorpsOperation = {
            name: 'Operation Sana',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 175,
            phase_started_turn: 175,
            participating_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
            objectives: [...objectives],
            current_objective_index: 0,
            staging_osid: 'op:bosanska_krupa:otoka_2',
            preserve_objective_sequence: false,
            axes: [{
                axis_id: 'sana_sequence_diagnostic',
                name: 'Sanski Most + Ključ Liberation',
                assigned_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
                objectives: [...objectives],
                current_objective_index: 0,
                staging_osid: 'op:bosanska_krupa:otoka_2',
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        };
        const state = {
            meta: { turn: 175, phase: 'war' },
            military: {
                war_front_edges_osid: [{
                    edge_id: 'live-first',
                    a: 'op:approach',
                    b: 'op:first',
                    side_a: 'RBiH',
                    side_b: 'RS',
                }],
                formations: {
                    arbih_506th_mountain: { location_osid: 'op:bosanska_krupa:otoka_2' },
                    arbih_517th_light: { location_osid: 'op:bosanska_krupa:otoka_2' },
                },
                brigade_movement_state: {},
                brigade_movement_orders: {},
                corps_front_sectors: {},
            },
            political: {
                political_controllers: {
                    'op:stale': 'RS',
                    'op:first': 'RS',
                    'op:deep': 'RS',
                    'op:approach': 'RBiH',
                },
            },
        } as unknown as GameState;
        const staticAdjacency = new Map<string, string[]>([
            ['op:first', ['op:approach']],
            ['op:deep', ['op:behind-deep']],
        ]);
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const priorTrace = process.env.AWWV_SANA_PLANNING_TRACE;
        try {
            delete process.env.AWWV_SANA_PLANNING_TRACE;
            emitSanaPlanningTraceReceipt(state, 'arbih_5th_corps', op, 'RBiH', staticAdjacency, 'pre');
            expect(logSpy).not.toHaveBeenCalled();

            process.env.AWWV_SANA_PLANNING_TRACE = '1';
            emitSanaPlanningTraceReceipt(state, 'arbih_5th_corps', op, 'RBiH', staticAdjacency, 'pre');
            const verdict = reconcilePlanningObjectives(state, 'arbih_5th_corps', op, 'RBiH', staticAdjacency);
            emitSanaPlanningTraceReceipt(state, 'arbih_5th_corps', op, 'RBiH', staticAdjacency, 'post', verdict);

            expect(logSpy).toHaveBeenCalledTimes(2);
            const receipts = logSpy.mock.calls.map(([line]) => JSON.parse(String(line)));
            expect(receipts.map((receipt) => receipt.phase)).toEqual(['pre', 'post']);
            expect(receipts[0].objectives).toEqual(objectives);
            expect(receipts[1].resulting_objectives).toEqual(['op:first', 'op:deep']);
            expect(receipts[1].verdict).toBe('valid');
        } finally {
            if (priorTrace === undefined) delete process.env.AWWV_SANA_PLANNING_TRACE;
            else process.env.AWWV_SANA_PLANNING_TRACE = priorTrace;
            logSpy.mockRestore();
        }
    });

    it('compares Sana sequence preservation at the measured HRHB Prekaja contact', () => {
        const objectives = [
            'op:bosanska_krupa:donji_dubovik_2',
            'op:sanski_most:budimlic_japra_2',
            'op:sanski_most:lusci_palanka_2',
            'op:sanski_most:jelasinovci',
            'op:sanski_most:skucani_vakuf_2',
            'op:sanski_most:stari_majdan',
            'op:sanski_most:sanski_most_2',
            'op:sanski_most:ostra_luka',
            'op:sanski_most:ilidza_2',
            'op:sanski_most:kljevci',
            'op:kljuc:sanica_2',
            'op:kljuc:hadzici',
            'op:kljuc:kljuc_2',
            'op:kljuc:krasulje_2',
        ];
        const makeOperation = (preserve_objective_sequence: boolean): CorpsOperation => ({
            name: 'Operation Sana',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 176,
            phase_started_turn: 176,
            participating_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
            objectives: [...objectives],
            current_objective_index: 0,
            preserve_objective_sequence,
            axes: [{
            axis_id: 'sana_fixture_diagnostic',
                name: 'Sanski Most + Ključ Liberation',
                assigned_brigades: ['arbih_506th_mountain', 'arbih_517th_light'],
                objectives: [...objectives],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            }],
        });
        const makeState = (withPrekajaContact: boolean): GameState => ({
            meta: { turn: 176, phase: 'war' },
            military: {
                war_front_edges_osid: withPrekajaContact ? [{
                    edge_id: 'hadzici-prekaja-live-front',
                    a: 'op:kljuc:hadzici',
                    b: 'op:titov_drvar:prekaja_2',
                    side_a: 'RS',
                    side_b: 'HRHB',
                }] : [],
                formations: {
                    arbih_506th_mountain: {
                        status: 'active', personnel: 1200, location_osid: 'op:bihac:bihac_2',
                    },
                    arbih_517th_light: {
                        status: 'active', personnel: 1200, location_osid: 'op:bihac:bihac_2',
                    },
                },
                brigade_movement_state: {
                    arbih_506th_mountain: {
                        status: 'in_transit', destination_sids: ['op:bosanska_krupa:otoka_2'],
                    },
                    arbih_517th_light: {
                        status: 'in_transit', destination_sids: ['op:bosanska_krupa:otoka_2'],
                    },
                },
            },
            political: {
                war_alliance_rbih_hrhb: 1.0,
                political_controllers: Object.fromEntries([
                    ...objectives.map((objective) => [objective, 'RS']),
                    ['op:titov_drvar:prekaja_2', 'HRHB'],
                ]),
            },
        } as unknown as GameState);

        const defaultOp = makeOperation(false);
        const preservedOp = makeOperation(true);
        const alliedContactState = makeState(true);

        expect(reconcilePlanningObjectives(alliedContactState, 'arbih_5th_corps', defaultOp, 'RBiH')).toBe('valid');
        expect(defaultOp.axes?.[0]?.objectives).toEqual(objectives.slice(11));
        expect(defaultOp.objectives).toEqual(objectives.slice(11));
        expect(areParticipantsReadyForExecution(
            alliedContactState, 'arbih_5th_corps', 'RBiH', defaultOp,
        )).toBe(false);

        expect(reconcilePlanningObjectives(alliedContactState, 'arbih_5th_corps', preservedOp, 'RBiH')).toBe('valid');
        expect(preservedOp.axes?.[0]?.objectives).toEqual(objectives);
        expect(preservedOp.objectives).toEqual([...objectives].sort());
        expect(areParticipantsReadyForExecution(
            alliedContactState, 'arbih_5th_corps', 'RBiH', preservedOp,
        )).toBe(false);

        const noContactState = makeState(false);
        const noContactOp = makeOperation(false);
        expect(reconcilePlanningObjectives(noContactState, 'arbih_5th_corps', noContactOp, 'RBiH')).toBe('invalidated');
        expect(noContactOp.axes?.[0]?.objectives).toEqual(objectives);
        expect(noContactOp.objectives).toEqual([...objectives].sort());
    });

    it('characterizes multi-axis Sana readiness and later-objective approach discovery without accepting the prefix', () => {
        const sanaObjectives = [
            'op:bosanska_krupa:donji_dubovik_2',
            'op:sanski_most:budimlic_japra_2',
            'op:sanski_most:lusci_palanka_2',
            'op:sanski_most:jelasinovci',
            'op:sanski_most:skucani_vakuf_2',
            'op:sanski_most:stari_majdan',
            'op:sanski_most:sanski_most_2',
            'op:sanski_most:ostra_luka',
            'op:sanski_most:ilidza_2',
            'op:sanski_most:kljevci',
            'op:kljuc:sanica_2',
            'op:kljuc:hadzici',
            'op:kljuc:kljuc_2',
            'op:kljuc:krasulje_2',
        ];
        const axisObjectives = [
            ['op:bosanska_krupa:ivanjska_2', 'op:bosanska_krupa:arapusa_2', 'op:bosanska_krupa:donji_dubovik_2', 'op:bosanska_krupa:vranjska_2', 'op:bosanska_krupa:jasenica_2', 'op:bosanska_krupa:gornja_suvaja', 'op:bosanski_petrovac:krnjeusa', 'op:bosanski_novi:krslje_2', 'op:bosanski_novi:matavazi_2'],
            ['op:bihac:ripac', 'op:bihac:racic', 'op:bosanski_petrovac:vrtoce', 'op:bosanski_petrovac:dobro_selo_2', 'op:bosanski_petrovac:bosanski_petrovac_2', 'op:bosanski_petrovac:kolonic_2', 'op:bosanski_petrovac:jasenovac_2', 'op:kljuc:hadzici', 'op:kljuc:kljuc_2', 'op:kljuc:krasulje_2'],
            ['op:bihac:ripac', 'op:bihac:racic', 'op:bihac:orasac_2', 'op:bosanski_petrovac:vrtoce', 'op:bosanski_petrovac:prkosi', 'op:bosanski_petrovac:vodjenica'],
            sanaObjectives,
        ];
        const axisBrigades = [
            ['arbih_511th_slavna_mountain', 'arbih_505th_vitezka_mountain', 'arbih_503rd_slavna_mountain'],
            ['arbih_501st_slavna_mountain', 'arbih_510th_bosnian_liberation'],
            ['arbih_502nd_vitezka_mountain', 'arbih_504th_cazin_light', 'hvo_101st_bihac'],
            ['arbih_506th_mountain', 'arbih_517th_light'],
        ];
        const axisIds = [
            'sana_krupa',
            'sana_bihac_petrovac',
            'sana_bihac_petrovac_approach',
            'sana_sanski_most_kljuc',
        ];
        const axes = axisIds.map((axis_id, index) => ({
            axis_id,
            name: axis_id,
            assigned_brigades: axisBrigades[index]!,
            objectives: [...axisObjectives[index]!],
            current_objective_index: 0,
            staging_osid: [
                'op:bosanska_krupa:otoka_2', 'op:bihac:bihac_2',
                'op:bihac:bihac_2', 'op:bosanska_krupa:ivanjska_2',
            ][index],
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }));
        const op: CorpsOperation = {
            name: 'Operation Sana',
            type: 'sector_attack',
            phase: 'planning',
            started_turn: 176,
            phase_started_turn: 175,
            planning_duration: 1,
            preparation_sub_phase: 'ready',
            preparation_turns_elapsed: 1,
            preparation_max_turns: 5,
            commander_assessment: 'launch',
            participating_brigades: axisBrigades.flat(),
            objectives: [...sanaObjectives],
            current_objective_index: 0,
            // TEST-ONLY counterfactual: this retains the authored prefix on every
            // axis. It is not a proposed production-wide sequence policy.
            preserve_objective_sequence: true,
            sector_id: 'sector:arbih_5th_corps:sana_fixture',
            axes,
        };
        const friendlyApproach = 'op:bihac:bihac_2';
        const prekaja = 'op:titov_drvar:prekaja_2';
        const liveEdges = [
            // Controlled counterfactual only: the real Ripač–Bihać border.
            { edge_id: 'sana-fixture-ripac-bihac', a: 'op:bihac:ripac', b: friendlyApproach, side_a: 'RS', side_b: 'RBiH' },
            // Measured HRHB Prekaja contact: Hadžići (RS)–Prekaja (HRHB).
            { edge_id: 'hadzici-prekaja-live-front', a: 'op:kljuc:hadzici', b: prekaja, side_a: 'RS', side_b: 'HRHB' },
        ];
        const allObjectives = [...new Set(axisObjectives.flat())];
        const controllerEntries: Array<[string, string]> = allObjectives.map((objective) => [objective, 'RS']);
        controllerEntries.push(
            [friendlyApproach, 'RBiH'],
            [prekaja, 'HRHB'],
        );
        const makeFormation = (id: string, location_osid: string, faction: string): Record<string, unknown> => ({
            id, kind: 'brigade', status: 'active', faction, corps_id: 'arbih_5th_corps', personnel: 1200,
            cohesion: 70, location_osid,
        });
        const formations = Object.fromEntries([
            ...axisBrigades[0]!.map((id) => [id, makeFormation(id, 'op:bosanska_krupa:otoka_2', 'RBiH')]),
            ...axisBrigades[1]!.map((id) => [id, makeFormation(id, friendlyApproach, 'RBiH')]),
            ...axisBrigades[2]!.map((id) => [id, makeFormation(id, 'op:bosanska_krupa:otoka_2', id === 'hvo_101st_bihac' ? 'HRHB' : 'RBiH')]),
            ...axisBrigades[3]!.map((id) => [id, makeFormation(id, 'op:bihac:bihac_2', 'RBiH')]),
            ['arbih_5th_corps', { id: 'arbih_5th_corps', faction: 'RBiH', status: 'active' }],
        ]);
        const state = {
            meta: { turn: 176, phase: 'war' },
            factions: [
                { id: 'RBiH', areasOfResponsibility: [] },
                { id: 'RS', areasOfResponsibility: [] },
                { id: 'HRHB', areasOfResponsibility: [] },
            ],
            military: {
                formations,
                war_front_edges_osid: liveEdges,
                brigade_movement_state: {
                    arbih_506th_mountain: {
                        status: 'in_transit', stance: 'column',
                        destination_sids: ['op:bosanska_krupa:otoka_2'],
                        path: ['op:bihac:bihac_2', 'op:bihac:brekovica_2', 'op:bosanska_krupa:jezerski_2', 'op:bosanska_krupa:otoka_2'],
                        turns_remaining: 1, owner: 'bot_discretionary',
                    },
                    arbih_517th_light: {
                        status: 'in_transit', stance: 'column',
                        destination_sids: ['op:bosanska_krupa:otoka_2'],
                        path: ['op:bihac:bihac_2', 'op:bihac:brekovica_2', 'op:bosanska_krupa:jezerski_2', 'op:bosanska_krupa:otoka_2'],
                        turns_remaining: 1, owner: 'bot_discretionary',
                    },
                },
                corps_front_sectors: {},
                corps_command: {
                    arbih_5th_corps: {
                        command_span: 10, subordinate_count: 10, og_slots: 0, active_ogs: [],
                        corps_exhaustion: 0, stance: 'offensive', active_operations: [op],
                    },
                },
            },
            political: {
                war_alliance_rbih_hrhb: 1.0,
                political_controllers: Object.fromEntries(controllerEntries),
            },
        } as unknown as GameState;
        const donjiNeighbors = [
            'op:bosanska_krupa:arapusa_2', 'op:bosanska_krupa:ivanjska_2',
            'op:bosanska_krupa:jasenica_2', 'op:bosanski_novi:krslje_2',
            'op:bosanski_novi:matavazi_2', 'op:sanski_most:budimlic_japra_2',
        ];
        const adjacency = new Map<string, string[]>([
            [friendlyApproach, ['op:bihac:ripac']], ['op:bihac:ripac', [friendlyApproach]],
            ['op:bosanska_krupa:donji_dubovik_2', donjiNeighbors],
            ...donjiNeighbors.map((neighbor) => [neighbor, ['op:bosanska_krupa:donji_dubovik_2']] as [string, string[]]),
            ['op:kljuc:hadzici', [prekaja]], [prekaja, ['op:kljuc:hadzici']],
        ]);

        // Measured n31-shaped boundary: Donji itself remains unlawful. The only
        // ready sibling is the controlled real Ripač–Bihać border.
        expect(reconcilePlanningObjectives(state, 'arbih_5th_corps', op, 'RBiH')).toBe('valid');
        expect(op.axes?.[3]?.objectives).toEqual(sanaObjectives);
        expect(areParticipantsReadyForExecution(state, 'arbih_5th_corps', 'RBiH', op)).toBe(true);

        // Retained n31 t176 transit: exercise the top-level dispatcher while the
        // operation is still planning/active. Every edge here is a real graph edge;
        // in particular, there is no fabricated Bihać–Prekaja route.
        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [
                { a: 'op:bihac:bihac_2', b: 'op:bihac:brekovica_2' },
                { a: 'op:bihac:brekovica_2', b: 'op:bosanska_krupa:jezerski_2' },
                { a: 'op:bosanska_krupa:jezerski_2', b: 'op:bosanska_krupa:otoka_2' },
                { a: 'op:bihac:ripac', b: friendlyApproach },
                { a: 'op:kljuc:hadzici', b: prekaja },
                ...donjiNeighbors.map((neighbor) => ({ a: 'op:bosanska_krupa:donji_dubovik_2', b: neighbor })),
            ] as any,
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (formation) =>
                formation.id === 'arbih_506th_mountain' || formation.id === 'arbih_517th_light',
        });
        expect(state.military.brigade_posture_orders).toEqual([
            { brigade_id: 'arbih_506th_mountain', posture: 'defend' },
            { brigade_id: 'arbih_517th_light', posture: 'defend' },
        ]);
        expect(state.military.brigade_movement_state?.arbih_506th_mountain).toEqual({
            status: 'in_transit', stance: 'column',
            destination_sids: ['op:bosanska_krupa:otoka_2'],
            path: ['op:bihac:bihac_2', 'op:bihac:brekovica_2', 'op:bosanska_krupa:jezerski_2', 'op:bosanska_krupa:otoka_2'],
            turns_remaining: 1, owner: 'bot_discretionary',
        });
        expect(state.military.brigade_movement_state?.arbih_517th_light).toEqual({
            status: 'in_transit', stance: 'column',
            destination_sids: ['op:bosanska_krupa:otoka_2'],
            path: ['op:bihac:bihac_2', 'op:bihac:brekovica_2', 'op:bosanska_krupa:jezerski_2', 'op:bosanska_krupa:otoka_2'],
            turns_remaining: 1, owner: 'bot_discretionary',
        });
        expect(state.military.brigade_movement_orders?.arbih_506th_mountain).toBeUndefined();
        expect(state.military.brigade_movement_orders?.arbih_517th_light).toBeUndefined();

        // Controlled counterfactual only: the ready sibling can drive the any-axis
        // planning gate. Placement and timing are not measured n31 facts.
        advanceSectorOffensives(state);
        expect(op.phase).toBe('recovery');
        expect(op.recovery_reason).toBe('no_logged_attempt');
        expect(op.axes?.[3]?.objectives).toEqual(sanaObjectives);
        expect(op.axes?.[3]?.current_objective_index).toBe(0);

        expect(new Set(adjacency.get(sanaObjectives[0]!) ?? [])).toEqual(new Set(donjiNeighbors));
        expect(collectObjectiveApproachOsids(
            state, 'arbih_5th_corps', 'RBiH', ['op:bosanska_krupa:donji_dubovik_2'],
        )).toEqual(new Set());

        // Approach discovery is not an executable march. The preserved operation
        // exposes the real Hadžići–Prekaja contact only as later-objective
        // discovery; no route validity or order emission is claimed.
        expect(getSectorOffensiveApproachOsids(
            state, op, 'RBiH', adjacency, new Map(), 'arbih_506th_mountain',
        )).toEqual(new Set([prekaja]));
        state.military.brigade_movement_state!.arbih_506th_mountain!.status = 'deployed';
        state.military.brigade_movement_state!.arbih_517th_light!.status = 'deployed';
        generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: [
                { a: 'op:bihac:bihac_2', b: 'op:bihac:brekovica_2' },
                { a: 'op:bihac:brekovica_2', b: 'op:bosanska_krupa:jezerski_2' },
                { a: 'op:bosanska_krupa:jezerski_2', b: 'op:bosanska_krupa:otoka_2' },
                { a: 'op:kljuc:hadzici', b: prekaja },
                ...donjiNeighbors.map((neighbor) => ({ a: 'op:bosanska_krupa:donji_dubovik_2', b: neighbor })),
            ] as any,
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (formation) =>
                formation.id === 'arbih_506th_mountain' || formation.id === 'arbih_517th_light',
        });
        expect(state.military.brigade_movement_orders?.arbih_506th_mountain).toBeUndefined();
        expect(state.military.brigade_movement_orders?.arbih_517th_light).toBeUndefined();
        // The dispatcher has already recorded both in-transit skips above; recovery
        // remains an observation, not successful execution.
        expect(state.military.brigade_movement_state?.arbih_506th_mountain?.status).toBe('deployed');
        expect(state.military.brigade_movement_state?.arbih_517th_light?.status).toBe('deployed');
        expect(state.military.brigade_movement_orders?.arbih_506th_mountain).toBeUndefined();
        expect(state.military.brigade_movement_orders?.arbih_517th_light).toBeUndefined();
    });

});
