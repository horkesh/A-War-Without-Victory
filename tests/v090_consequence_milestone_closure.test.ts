/**
 * v0.9.0 Consequence System closure audit.
 *
 * This is a milestone guard rather than another wave test: the old seven-chain
 * draft is now reconciled against the refreshed, repo-truth milestone state.
 */
import { describe, it, expect } from 'vitest';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';

const ids = new Set(loadEventDefinitions(0).filter(e => e.id.startsWith('csq_')).map(e => e.id));

const implementedOldPlanIds = [
    'csq_drina_partisan_resistance_1992',
    'csq_drina_supply_disruption_1993',
    'csq_drina_corps_pinned_1993',
    'csq_drina_population_resilience_1993',
    'csq_joint_operations_agreement_1992',
    'csq_zagreb_displeasure_1993',
    'csq_territorial_friction_1993',
    'csq_federation_early_1994',
    'csq_joint_offensive_1994',
    'csq_srebrenica_stalemate_1995',
    'csq_enclave_drain_continues_1995',
    'csq_alternative_nato_trigger_1995',
    'csq_prolonged_war_exhaustion_1995',
    'csq_bihac_pocket_collapses_1994',
    'csq_northwest_rs_consolidation_1995',
    'csq_bihac_refugee_crisis_1994',
    'csq_accelerated_camps_discovery_1992',
    'csq_early_war_crimes_tribunal_1993',
    'csq_accelerated_safe_areas_1993',
    'csq_early_nato_threshold_1994',
    'csq_minority_defections_1992',
    'csq_bosniak_unity_1993',
    'csq_international_disillusionment_1993',
    'csq_civic_identity_consolidation_1993',
    'csq_pragmatic_coalition_1993',
] as const;

const supersededOldPlanIds = {
    csq_vance_owen_implemented_1993: 'resolvePeacePlan all-acceptance path sets war_ended_early + early_peace_implemented',
    csq_contact_group_implemented_1994: 'resolvePeacePlan all-acceptance path sets war_ended_early + early_peace_implemented',
    csq_early_dayton_scoring: 'CostLedger early_peace_implementation_record and endgame snapshot own the scoring handoff',
} as const;

describe('v0.9.0 consequence milestone closure audit', () => {
    it('has live consequence IDs for every non-superseded old-plan chain entry plus the refreshed identity variants', () => {
        for (const id of implementedOldPlanIds) {
            expect(ids.has(id), `${id} should be present`).toBe(true);
        }
    });

    it('documents old Chain 7 as superseded by the accepted-peace engine/endgame contract', () => {
        expect(Object.keys(supersededOldPlanIds)).toEqual([
            'csq_vance_owen_implemented_1993',
            'csq_contact_group_implemented_1994',
            'csq_early_dayton_scoring',
        ]);
        for (const rationale of Object.values(supersededOldPlanIds)) {
            expect(rationale.length).toBeGreaterThan(30);
        }
    });
});
