import { describe, expect, it } from 'vitest';

import { validateGameStateShape } from '../src/state/validateGameState.js';

function minimalState(): any {
    return {
        schema_version: 0,
        meta: {
            turn: 175,
            seed: 'operation-opportunity-state-validation',
            player_faction: 'RBiH',
        },
        factions: [],
        military: {
            formations: {},
        },
        political: {
            political_controllers: {},
        },
        displacement: {},
    };
}

describe('operation opportunity state validation', () => {
    it('accepts absent or well-formed operation opportunity lifecycle records', () => {
        const absent = minimalState();
        const withRows = minimalState();
        withRows.military.operation_opportunities = [
            {
                opportunity_id: 'sana_95',
                proposal_id: 'OPP_175_sana_95',
                eligibility_turn: 175,
                expires_turn: 178,
                status: 'eligible_pending_review',
                approver_faction: 'RBiH',
                last_axis_evaluation: [
                    { axis: 'logistics', mode: 'optional', green: true, reason: 'supply adequate' },
                ],
                last_footprint: {
                    objectives: ['op:prijedor:prijedor_1'],
                    staging_osids: ['op:bihac:bihac_1'],
                },
                redirect_variants: [
                    {
                        variant_id: 'western_axis',
                        name: 'Western axis',
                        objectives: [],
                        staging_osids: ['op:bihac:bihac_1'],
                    },
                ],
                last_force_quality_traits: {
                    operation_readiness: 0.62,
                    staging_reliability: 0.7,
                    axis_coordination: 0.58,
                    support_delivery: 0.5,
                    failure_recovery: 0.61,
                    reserve_response: 0.48,
                    collapse_susceptibility: 0.35,
                },
                response_turn: 176,
                redirect_variant_id: 'western_axis',
                executed_op_id: 'op:sana_95',
                reevaluate_at_turn: 177,
            },
        ];
        withRows.military.operation_opportunity_resolutions = [
            {
                proposal_id: 'OPP_175_sana_95',
                opportunity_id: 'sana_95',
                response: 'approve',
                response_turn: 176,
                executed_op_name: 'Operation Sana',
                executed_op_aar_id: 'aar:sana_95',
                exit_class: 'partial_success',
            },
        ];
        withRows.military.operation_opportunity_diagnostics = [
            {
                turn: 175,
                opportunity_id: 'sana_95',
                failed_required_axes: [{ axis: 'staging_access', reason: 'blocked' }],
                failed_optional_axes: [],
                optional_green_count: 1,
                min_optional_axes: 2,
            },
        ];
        withRows.military.operation_opportunity_traces = [
            {
                turn: 175,
                opportunity_id: 'sana_95',
                event: 'blocked',
                proposal_id: 'OPP_175_sana_95',
                failed_required_axes: [],
                failed_optional_axes: [{ axis: 'logistics', reason: 'thin supply' }],
                optional_green_count: 1,
                min_optional_axes: 2,
                executed_op_name: 'Operation Sana',
                redirect_variant_id: 'western_axis',
            },
        ];

        expect(validateGameStateShape(absent).ok).toBe(true);
        expect(validateGameStateShape(withRows).ok).toBe(true);
    });

    it('rejects malformed present operation opportunity lifecycle records', () => {
        const state = minimalState();
        state.military.operation_opportunities = [
            {
                opportunity_id: '',
                proposal_id: 42,
                eligibility_turn: -1,
                expires_turn: 174,
                status: 'waiting',
                approver_faction: 'JNA',
                response_turn: 1.5,
                redirect_variant_id: '',
                executed_op_id: 99,
                reevaluate_at_turn: -1,
                last_axis_evaluation: [
                    { axis: 'luck', mode: 'required', green: 'yes', reason: 12 },
                    42,
                ],
                last_footprint: { objectives: ['op:prijedor:prijedor_1', 42], staging_osids: 'bihac' },
                redirect_variants: [
                    { variant_id: '', name: 42, objectives: ['op:prijedor:prijedor_1'], staging_osids: [99] },
                    42,
                ],
                last_force_quality_traits: {
                    operation_readiness: 'bad',
                    staging_reliability: 0.7,
                    axis_coordination: 0.58,
                    support_delivery: 0.5,
                    failure_recovery: 0.61,
                    reserve_response: 0.48,
                    collapse_susceptibility: 0.35,
                },
            },
            null,
        ];
        state.military.operation_opportunity_resolutions = [
            {
                proposal_id: '',
                opportunity_id: '',
                response: 'maybe',
                response_turn: -1,
                executed_op_name: 42,
                executed_op_aar_id: 42,
                exit_class: 'total_victory',
            },
            42,
        ];
        state.military.operation_opportunity_diagnostics = [
            {
                turn: 1.5,
                opportunity_id: '',
                failed_required_axes: [{ axis: 'luck', reason: 12 }],
                failed_optional_axes: [42],
                optional_green_count: -1,
                min_optional_axes: 1.5,
            },
            null,
        ];
        state.military.operation_opportunity_traces = [
            {
                turn: -1,
                opportunity_id: '',
                event: 'maybe',
                proposal_id: 42,
                failed_required_axes: 'bad',
                failed_optional_axes: [{ axis: 'luck', reason: 12 }],
                optional_green_count: -1,
                min_optional_axes: 1.5,
                executed_op_name: 42,
                redirect_variant_id: '',
            },
            42,
        ];

        const result = validateGameStateShape(state);

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.errors).toEqual(expect.arrayContaining([
                'military.operation_opportunities[0].opportunity_id must be a non-empty string',
                'military.operation_opportunities[0].proposal_id must be a non-empty string',
                'military.operation_opportunities[0].eligibility_turn must be a non-negative integer',
                'military.operation_opportunities[0].status must be a valid opportunity status',
                'military.operation_opportunities[0].approver_faction must be one of: RBiH, RS, HRHB',
                'military.operation_opportunities[0].last_axis_evaluation[0].axis must be a valid opportunity axis',
                'military.operation_opportunities[0].last_axis_evaluation[0].green must be a boolean',
                'military.operation_opportunities[0].last_axis_evaluation[0].reason must be a string',
                'military.operation_opportunities[0].last_footprint.objectives must be a string array',
                'military.operation_opportunities[0].redirect_variants[0].variant_id must be a non-empty string',
                'military.operation_opportunities[0].last_force_quality_traits.operation_readiness must be a finite number between 0 and 1',
                'military.operation_opportunity_resolutions[0].response must be a valid opportunity response',
                'military.operation_opportunity_resolutions[0].exit_class must be a valid opportunity exit class when present',
                'military.operation_opportunity_diagnostics[0].failed_required_axes[0].axis must be a valid opportunity axis',
                'military.operation_opportunity_traces[0].event must be a valid opportunity trace event',
                'military.operation_opportunity_traces[0].failed_required_axes must be an array when present',
            ]));
        }
    });
});
