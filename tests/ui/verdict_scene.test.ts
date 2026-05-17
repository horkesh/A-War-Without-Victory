import { describe, expect, it } from 'vitest';
import { buildVerdictScene } from '../../src/ui/map/data/verdictScene';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';
import type { FactionVerdict, GameVerdict, OutcomeClass } from '../../src/state/negotiation_types';

function verdictFor(faction: string, outcomeClass: OutcomeClass, overrides: Partial<FactionVerdict> = {}): FactionVerdict {
    return {
        faction,
        pyrrhic_score: 50,
        grade: 'C',
        grade_description: 'Test verdict',
        capital_breakdown: {
            territory_controlled_pct: 30,
            territory_controlled_km2: 15000,
            civilians_under_protection: 100000,
            refugees_created: 100000,
            refugees_received: 10000,
            military_casualties_inflicted: 10000,
            military_casualties_taken: 15000,
            civilian_casualties_caused: 3000,
            enclaves_held: [],
            enclaves_lost: [],
            peace_plans_accepted: [],
            peace_plans_rejected: [],
            operations_launched: 20,
            operations_successful: 8,
            war_crimes_events: 0,
            combat_effective_brigades: 12,
        },
        dimension_grades: [],
        outcome_class: outcomeClass,
        condemnation_flags: [],
        ...overrides,
    };
}

function makeVerdict(overrides: Partial<GameVerdict> = {}): GameVerdict {
    return {
        outcome_type: 'termination',
        outcome_label: 'Stalemate',
        turn: 188,
        date: '1995-10-01',
        duration_weeks: 188,
        faction_verdicts: {
            RBiH: verdictFor('RBiH', 'survival', { grade: 'A', pyrrhic_score: 66 }),
            RS: verdictFor('RS', 'failure', { grade: 'D', pyrrhic_score: 38 }),
            HRHB: verdictFor('HRHB', 'negotiated_escape', { grade: 'B', pyrrhic_score: 55 }),
        },
        ...overrides,
    };
}

function makeCostLedger(overrides: Partial<CostLedger> = {}): CostLedger {
    return {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        operation_opportunities: undefined,
        total_military_killed: 46500,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'human_cost_record',
                category: 'human_cost',
                severity: 'grave',
                title: 'Human cost record',
                text: 'The ledger records the human cost of the war path.',
                sources: ['test'],
            },
        ],
        ...overrides,
    };
}

function makeComparison(overrides: Partial<ComparisonResult> = {}): ComparisonResult {
    return {
        duration_delta_weeks: 6,
        territory_divergence: { RS: 9 },
        casualty_ratio: 0.85,
        displacement_ratio: 0.9,
        rupture_divergence: [],
        divergence_notes: [
            'Srebrenica enclave survived',
            'War lasted 6 weeks longer than history',
        ],
        ...overrides,
    };
}

describe('buildVerdictScene', () => {
    it('selects a pyrrhic scene when the focused verdict is pyrrhic success', () => {
        const scene = buildVerdictScene({
            verdict: makeVerdict({
                faction_verdicts: {
                    RBiH: verdictFor('RBiH', 'pyrrhic_success', { grade: 'C', pyrrhic_score: 49 }),
                    RS: verdictFor('RS', 'failure'),
                    HRHB: verdictFor('HRHB', 'negotiated_escape'),
                },
            }),
            costLedger: makeCostLedger(),
            historicalComparison: makeComparison(),
            focusFaction: 'RBiH',
        });

        expect(scene.tone).toBe('pyrrhic');
        expect(scene.headline).toContain('Pyrrhic');
        expect(scene.focusFaction).toBe('RBiH');
        expect(scene.costEmphasis.title).toBe('Human cost record');
        expect(scene.comparisonCallouts).toEqual([
            'Srebrenica enclave survived',
            'War lasted 6 weeks longer than history',
        ]);
    });

    it('selects a catastrophic scene when condemnation or collapse dominates', () => {
        const scene = buildVerdictScene({
            verdict: makeVerdict({
                faction_verdicts: {
                    RBiH: verdictFor('RBiH', 'survival'),
                    RS: verdictFor('RS', 'collapse', {
                        condemnation_flags: ['genocide_condemnation'],
                        grade: 'F',
                    }),
                    HRHB: verdictFor('HRHB', 'failure'),
                },
            }),
            costLedger: makeCostLedger({
                findings: [
                    {
                        id: 'rupture_srebrenica_genocide_1995',
                        category: 'rupture',
                        severity: 'rupture',
                        title: 'Srebrenica genocide',
                        text: 'The ledger records a locked rupture consequence.',
                        sources: ['test'],
                        faction: 'RS',
                    },
                    {
                        id: 'human_cost_record',
                        category: 'human_cost',
                        severity: 'grave',
                        title: 'Human cost record',
                        text: 'The ledger records the human cost.',
                        sources: ['test'],
                    },
                ],
            }),
            historicalComparison: makeComparison({
                divergence_notes: ['War lasted exactly the historical 188 weeks'],
            }),
            focusFaction: 'RBiH',
        });

        expect(scene.tone).toBe('catastrophic');
        expect(scene.headline).toContain('condemnation');
        expect(scene.costEmphasis.title).toBe('Srebrenica genocide');
        expect(scene.costEmphasis.severity).toBe('rupture');
    });

    it('selects an early-peace scene from a peace-plan verdict and duration finding', () => {
        const scene = buildVerdictScene({
            verdict: makeVerdict({
                outcome_type: 'peace_plan',
                outcome_label: 'Vance-Owen Peace Plan',
                duration_weeks: 44,
            }),
            costLedger: makeCostLedger({
                war_duration_weeks: 44,
                findings: [
                    {
                        id: 'early_peace_implementation_record',
                        category: 'duration',
                        severity: 'record',
                        title: 'Early negotiated settlement',
                        text: 'The ledger records acceptance of a peace plan at week 44.',
                        sources: ['test'],
                    },
                ],
            }),
            historicalComparison: makeComparison({
                duration_delta_weeks: -144,
                divergence_notes: [
                    'Total military casualties were 20% of historical levels',
                    'War lasted 144 weeks shorter than the historical 188 weeks',
                ],
            }),
        });

        expect(scene.tone).toBe('early_peace');
        expect(scene.headline).toContain('Early peace');
        expect(scene.costEmphasis.title).toBe('Early negotiated settlement');
        expect(scene.comparisonCallouts[0]).toBe('Total military casualties were 20% of historical levels');
    });
});
