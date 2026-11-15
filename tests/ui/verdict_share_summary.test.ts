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
        // Begins with the headline lines, names the sides, leads the cost line with the totals,
        // and compares the end of the war by date, never "N weeks shorter".
        expect(first).toBe([
            'A War Without Victory - Verdict',
            'The Republic of Bosnia and Herzegovina kept its gains at ruinous cost',
            'The cost ledger below records what the war took.',
            'Outcome: Republic of Bosnia and Herzegovina - Pyrrhic Success (Grade C, Pyrrhic Score 49.0)',
            'War ended: Dayton reckoning, 1995-10-01',
            'Cost Ledger: War cost totals - 46,500 military killed and 38,000 civilian killed recorded by the Cost Ledger.',
            'Historical comparison: This campaign ended in the week of 13 Nov 1995. Historically, the country-wide ceasefire came into force on 12 October 1995.',
            'Faction outcomes: Republic of Bosnia and Herzegovina Pyrrhic Success; Republika Srpska Failure; Herzeg-Bosnia Negotiated Escape',
        ].join('\n'));
        expect(first).not.toMatch(/\bweek\s+\d+\b/i);
        expect(first).not.toContain('War lasted');
        expect(first).not.toContain('72%');
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

        const lines = text.split('\n');
        expect(lines[0]).toBe('A War Without Victory - Presuda');
        expect(lines[1]).toBe('Republika Bosna i Hercegovina je zadržala dobitke uz razornu cijenu');
        expect(text).toContain('Ishod: Republika Bosna i Hercegovina - Pirov uspjeh (Ocjena C, Pirov rezultat 49.0)');
        expect(text).toContain('Rat završen: Dayton reckoning, 1995-10-01');
        expect(text).toContain('Knjiga cijene: Ukupna cijena rata - 46.500 poginulih vojnika i 38.000 poginulih civila zabilježeno u Knjizi cijene.');
        expect(text).not.toContain('War lasted 12 weeks shorter');
        expect(text).not.toContain('Rat je trajao 12 sedmica kraće');
        expect(text).toContain('Historijsko poređenje: Ova kampanja završila je u sedmici koja je počela 13 nov 1995. U historijskom ratu primirje na cijeloj teritoriji zemlje stupilo je na snagu 12. oktobra 1995.');
        expect(text).toContain('Ishodi frakcija: Republika Bosna i Hercegovina Pirov uspjeh; Republika Srpska Neuspjeh; Herceg-Bosna Pregovarački izlaz');
        expect(text).not.toMatch(/\bsedmica\s+\d+\b/i);
    });
});
