// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CinematicVerdict } from '../../src/ui/map/components/verdict/CinematicVerdict';
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
            RBiH: factionVerdict('RBiH', 'pyrrhic_success', 49),
            RS: factionVerdict('RS', 'failure', 38),
            HRHB: factionVerdict('HRHB', 'negotiated_escape', 55),
        },
    };
}

function makeCostLedger(severity: 'record' | 'grave' | 'rupture' = 'grave'): CostLedger {
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
                severity,
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
    afterEach(() => setLocale('en'));

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
        // Headline keyed on the focus side's final outcome class (verdictScene.ts), side named in full.
        expect(html).toContain('The Republic of Bosnia and Herzegovina kept its gains at ruinous cost');
        expect(html).toContain('Republic of Bosnia and Herzegovina');
        expect(html).toContain('Pyrrhic Success');
        // Banner tiles: Side / War-record grade / Outcome.
        expect(html).toContain('>Side<');
        expect(html).toContain('>War-record grade<');
        expect(html).toContain('>Outcome<');
        // The cost panel leads with the human-cost totals.
        expect(html).toContain('War cost totals');
        expect(html).toContain('46,500 military killed and 38,000 civilian killed');
        // Comparison lines are rebuilt from the ledger (verdictComparison.ts), never the legacy notes.
        expect(html).toContain('Military dead on all sides: 46,500 in this campaign. Historical war: 57,523 soldiers killed or missing');
        expect(html).toContain('Civilian dead on all sides: 38,000 in this campaign. Historical war: 39,684 civilians killed or missing');
        expect(html).not.toContain('War lasted');
        expect(html).not.toContain('72%');
        expect(html).toContain('A War Without Victory - Verdict');
        expect(html).not.toContain('undefined');
    });

    it.each(['record', 'grave', 'rupture'] as const)(
        'shows no Cost Signal tile and never a raw severity token for a %s finding',
        (severity) => {
            const html = renderToStaticMarkup(createElement(CinematicVerdict, {
                verdict: makeVerdict(),
                costLedger: makeCostLedger(severity),
                focusFaction: 'RBiH',
                dateLabel: '1995-10-01',
                durationLabel: '188 weeks',
            }));

            // The banner's third tile is the Outcome; a finding's severity no longer heads it.
            expect(html).not.toContain('Cost Signal');
            expect(html).toContain('data-awwv-verdict-metric="grade"');
            expect(html).toContain('data-awwv-verdict-metric="outcome"');
            expect(html).toContain('War cost totals');
            expect(html).not.toContain(`>${severity}<`);
        },
    );

    it('renders the absent cost ledger as player-facing copy', () => {
        const html = renderToStaticMarkup(createElement(CinematicVerdict, {
            verdict: makeVerdict(),
            focusFaction: 'RBiH',
            dateLabel: '1995-10-01',
            durationLabel: '188 weeks',
        }));

        expect(html).toContain('No cost ledger packet available');
        expect(html).not.toContain('Cost Signal');
        expect(html).not.toContain('>none<');
    });

    it('localizes the cinematic verdict shell labels in BCS mode', () => {
        setLocale('bcs');

        const html = renderToStaticMarkup(createElement(CinematicVerdict, {
            verdict: makeVerdict(),
            costLedger: makeCostLedger(),
            historicalComparison: makeComparison(),
            focusFaction: 'RBiH',
            dateLabel: '',
            durationLabel: '',
        }));

        expect(html).toContain('Strana');
        expect(html).toContain('Ocjena ratnog učinka');
        expect(html).toContain('Ishod');
        expect(html).not.toContain('Signal cijene');
        expect(html).toContain('Republika Bosna i Hercegovina');
        expect(html).toContain('Podijeli sažetak');
        expect(html).toContain('Kopiraj');
        expect(html).toContain('Nije zabilježeno');
    });
});
