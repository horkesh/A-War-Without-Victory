// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { buildVerdictShareSummary } from '../../src/ui/map/data/verdictShareSummary';
import { setLocale } from '../../src/ui/map/i18n';
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
            RS: factionVerdict('RS', 'failure', 38),
            HRHB: factionVerdict('HRHB', 'negotiated_escape', 55),
            RBiH: factionVerdict('RBiH', 'pyrrhic_success', 49),
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

describe('buildVerdictShareSummary', () => {
    afterEach(() => {
        setLocale('en');
    });

    it('generates deterministic plain text with outcome, cost ledger, and historical comparison', () => {
        const input = {
            verdict: makeVerdict(),
            costLedger: makeCostLedger(),
            historicalComparison: makeComparison(),
            focusFaction: 'RBiH',
        };

        const first = buildVerdictShareSummary(input);
        const second = buildVerdictShareSummary(input);

        expect(first).toBe(second);
        expect(first).toBe([
            'A War Without Victory - Verdict',
            'Outcome: RBiH - Pyrrhic Success (Grade C, Pyrrhic Score 49.0)',
            'War ended: Dayton reckoning, 1995-10-01',
            'Cost Ledger: Civilian displacement record - The negotiation capital record attributes 1,950,000 refugees created to the war path.',
            'Historical comparison: War lasted 12 weeks shorter than the historical 188 weeks',
            'Faction outcomes: RBiH Pyrrhic Success; RS Failure; HRHB Negotiated Escape',
        ].join('\n'));
        expect(first).not.toMatch(/\bweek\s+\d+\b/i);
    });

    it('falls back deterministically when optional inputs are missing', () => {
        expect(buildVerdictShareSummary({})).toBe([
            'A War Without Victory - Verdict',
            'Outcome: No verdict packet available',
            'War ended: Unknown end state',
            'Cost Ledger: No cost ledger packet available',
            'Historical comparison: No historical comparison packet available',
            'Faction outcomes: No faction verdicts available',
        ].join('\n'));
    });

    it('generates localized BCS wrapper text while preserving source-authored prose', () => {
        setLocale('bcs');

        const text = buildVerdictShareSummary({
            verdict: makeVerdict(),
            costLedger: makeCostLedger(),
            historicalComparison: makeComparison(),
            focusFaction: 'RBiH',
        });

        expect(text).toContain('A War Without Victory - Presuda');
        expect(text).toContain('Ishod: RBiH - Pirov uspjeh (Ocjena C, Pirov rezultat 49.0)');
        expect(text).toContain('Rat završen: Dayton reckoning, 1995-10-01');
        expect(text).toContain('Knjiga cijene: Civilian displacement record - The negotiation capital record attributes 1,950,000 refugees created to the war path.');
        expect(text).not.toContain('Historijsko poređenje: War lasted 12 weeks shorter than the historical 188 weeks');
        expect(text).toContain('Historijsko poređenje: Rat je trajao 12 sedmica kraće od historijskih 188 sedmica.');
        expect(text).toContain('Ishodi frakcija: RBiH Pirov uspjeh; RS Neuspjeh; HRHB Pregovarački izlaz');
        expect(text).not.toMatch(/\bsedmica\s+\d+\b/i);
    });
});
