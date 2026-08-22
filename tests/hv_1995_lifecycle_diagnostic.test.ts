import { describe, expect, it } from 'vitest';
import {
    HV_1995_FORMATION_IDS,
    analyzeHv1995Lifecycle,
    parseJsonLines,
} from '../tools/diagnostics/hv_1995_lifecycle.js';

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

        const result = analyzeHv1995Lifecycle({
            turnSummaries: [
                ...completeSpawnRows(),
                {
                    turn: 175,
                    formation_spawns: [],
                    movements: [{
                        formation_id: 'hv_4th_guards_split',
                        from_osid: 'op:a',
                        to_osid: 'op:b',
                    }],
                    battles: [],
                },
            ],
            temporalRows,
            weeklyRows: [{
                week_index: 175,
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
            }],
            positiveControlId: 'hv_4th_guards_split',
        });

        expect(result.liveness.expected_formations).toBe(6);
        expect(result.liveness.spawned_formations).toBe(6);
        expect(result.positive_controls).toEqual({
            battle_stack_projection: true,
            movement_event_projection: true,
            movement_order_projection: true,
            operation_membership_projection: true,
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
            positiveControlId: 'hv_4th_guards_split',
        });

        expect(result.positive_controls.battle_stack_projection).toBe(false);
        expect(result.formations.every((row) =>
            row.battle_participation_status === 'NOT_ESTABLISHED')).toBe(true);
    });
});
