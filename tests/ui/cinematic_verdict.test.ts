// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CinematicVerdict } from '../../src/ui/map/components/verdict/CinematicVerdict';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';
import type { FactionVerdict, GameVerdict, OutcomeClass } from '../../src/state/negotiation_types';

function factionVerdict(faction: string, outcomeClass: OutcomeClass, score: number): FactionVerdict {
    return {
        faction,
        pyrrhic_score: score,
        grade: score >= 60 ? 'B' : 'C',
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
    };
}

function makeVerdict(): GameVerdict {
    return {
        outcome_type: 'termination',
        outcome_label: 'Dayton reckoning',
        turn: 188,
        date: '1995-10-01',
        duration_weeks: 188,
        faction_verdicts: {
            RBiH: factionVerdict('RBiH', 'pyrrhic_success', 49),
            RS: factionVerdict('RS', 'failure', 38),
            HRHB: factionVerdict('HRHB', 'negotiated_escape', 55),
        },
    };
}

function makeCostLedger(): CostLedger {
    return {
        war_duration_weeks: 188,
        entries: [],
        rupture_consequences: [],
        total_military_killed: 46500,
        total_civilian_killed: 38000,
        findings: [
            {
                id: 'civilian_displacement_record',
                category: 'displacement',
                severity: 'grave',
                title: 'Civilian displacement record',
                text: 'The negotiation capital record attributes 1,950,000 refugees created to the war path.',
                sources: ['test'],
            },
        ],
    };
}

function makeComparison(): ComparisonResult {
    return {
        duration_delta_weeks: -12,
        territory_divergence: { RS: 2, RBiH_HRHB_Federation: -2 },
        casualty_ratio: 0.72,
        displacement_ratio: 0.8,
        rupture_divergence: [],
        divergence_notes: [
            'War lasted 12 weeks shorter than the historical 188 weeks',
            'Total military casualties were 72% of historical levels',
        ],
    };
}

describe('CinematicVerdict', () => {
    it('renders a cinematic verdict band over existing scoring truth and share summary', () => {
        const html = renderToStaticMarkup(createElement(CinematicVerdict, {
            verdict: makeVerdict(),
            costLedger: makeCostLedger(),
            historicalComparison: makeComparison(),
            focusFaction: 'RBiH',
            dateLabel: '1995-10-01',
            durationLabel: '3y 32w',
        }));

        expect(html).toContain('data-awwv-cinematic-verdict');
        expect(html).toContain('Pyrrhic success, measured against the bill');
        expect(html).toContain('RBiH');
        expect(html).toContain('Pyrrhic Success');
        expect(html).toContain('Civilian displacement record');
        expect(html).toContain('War lasted 12 weeks shorter');
        expect(html).toContain('A War Without Victory - Verdict');
        expect(html).not.toContain('undefined');
    });
});
