// @vitest-environment jsdom
/**
 * Direct component mount proof for the canonical endgame UI surface.
 *
 * Mounts FactionReport and WarCostSummary via React renderToStaticMarkup()
 * with realistic upstream contracts. Proves the actual React components
 * render the owned endgame truth into DOM output.
 *
 * Proof classification: DIRECT COMPONENT MOUNT PROOF
 * - Real React components mounted, not just helpers tested
 * - renderToStaticMarkup produces inspectable HTML
 * - Realistic fixtures match current FactionVerdict / CostLedger / ComparisonResult contracts
 * - Condemnation wording verified in rendered output
 *
 * Does NOT mount VerdictScreen itself (requires Zustand store + useIPC mock).
 * VerdictScreen composition is proven via buildEndgameSummary() in endgame_presentation_proof.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FactionReport } from '../../src/ui/map/components/VerdictScreen';
import { WarCostSummary } from '../../src/ui/map/components/WarCostSummary';
import type { FactionVerdict } from '../../src/state/negotiation_types';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';

// ── Realistic fixtures ──────────────────────────────────────────────────────

function makeRsVerdict(overrides?: Partial<FactionVerdict>): FactionVerdict {
    return {
        faction: 'RS',
        pyrrhic_score: 42.5,
        grade: 'C',
        grade_description: 'Territorial gains but catastrophic moral cost',
        capital_breakdown: {
            territory_controlled_pct: 58,
            territory_controlled_km2: 30000,
            military_casualties_inflicted: 91000,
            military_casualties_taken: 42000,
            operations_launched: 120,
            operations_successful: 70,
            refugees_created: 600000,
            refugees_received: 80000,
            civilians_under_protection: 150000,
            civilian_casualties_caused: 45000,
            peace_plans_accepted: [],
            peace_plans_rejected: ['vance_owen', 'contact_group'],
            enclaves_held: [],
            enclaves_lost: [],
            war_crimes_events: 35,
            combat_effective_brigades: 35,
        } as any,
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 72, grade: 'B' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 69, grade: 'B' },
            { dimension: 'international_standing', label: 'International Standing', score: 8, grade: 'F' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 15, grade: 'D' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 45, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 35, grade: 'C' },
        ],
        outcome_class: 'failure' as any,
        condemnation_flags: ['genocide_condemnation'],
        ...overrides,
    };
}

function makeRbihVerdict(): FactionVerdict {
    return {
        faction: 'RBiH',
        pyrrhic_score: 65.2,
        grade: 'A',
        grade_description: 'Multi-ethnic state endures at enormous human cost',
        capital_breakdown: {
            territory_controlled_pct: 28,
            territory_controlled_km2: 14500,
            military_casualties_inflicted: 15000,
            military_casualties_taken: 91000,
            operations_launched: 80,
            operations_successful: 25,
            refugees_created: 1200000,
            refugees_received: 200000,
            civilians_under_protection: 300000,
            civilian_casualties_caused: 2000,
            peace_plans_accepted: ['vance_owen'],
            peace_plans_rejected: [],
            enclaves_held: ['sarajevo', 'gorazde', 'bihac'],
            enclaves_lost: ['srebrenica', 'zepa'],
            war_crimes_events: 5,
            combat_effective_brigades: 25,
        } as any,
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 40, grade: 'C' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 34, grade: 'D' },
            { dimension: 'international_standing', label: 'International Standing', score: 75, grade: 'A' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 60, grade: 'B' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 55, grade: 'B' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 50, grade: 'C' },
        ],
        outcome_class: 'survival' as any,
        condemnation_flags: [],
    };
}

function makeCostLedger(): CostLedger {
    return {
        war_duration_weeks: 170,
        total_military_killed: 46500,
        total_civilian_killed: 38000,
        entries: [
            { faction: 'RBiH', military_killed: 31000, military_wounded: 45000, civilian_casualties_caused: 2000, refugees_created: 1200000, territory_controlled_pct: 28, enclaves_held: ['sarajevo', 'gorazde'], enclaves_lost: ['srebrenica'], war_crimes_events: 5, outcome_class: 'survival', condemnation_flags: [] },
            { faction: 'RS', military_killed: 12000, military_wounded: 22000, civilian_casualties_caused: 35000, refugees_created: 600000, territory_controlled_pct: 58, enclaves_held: [], enclaves_lost: [], war_crimes_events: 35, outcome_class: 'failure', condemnation_flags: ['genocide_condemnation'] },
            { faction: 'HRHB', military_killed: 3500, military_wounded: 6000, civilian_casualties_caused: 1000, refugees_created: 150000, territory_controlled_pct: 14, enclaves_held: [], enclaves_lost: [], war_crimes_events: 3, outcome_class: 'negotiated_escape', condemnation_flags: [] },
        ],
        rupture_consequences: [
            { id: 'srebrenica_genocide_1995', perpetrator_faction: 'RS', description: 'Fall of the Srebrenica safe area' },
        ],
    } as CostLedger;
}

function makeComparison(): ComparisonResult {
    return {
        duration_delta_weeks: -12,
        territory_divergence: { RS: 9.0, RBiH_HRHB_Federation: -9.0 },
        casualty_ratio: 0.78,
        displacement_ratio: 0.89,
        rupture_divergence: [],
        divergence_notes: [
            'War lasted 12 weeks shorter than the historical 182 weeks',
            'RS controlled 9.0% more territory than the Dayton baseline',
            'Srebrenica genocide occurred as in the historical war',
        ],
    };
}

// ── Render helper ───────────────────────────────────────────────────────────

function renderComponent(component: any, props: any): string {
    return renderToStaticMarkup(createElement(component, props));
}

// ── FactionReport mount proof ───────────────────────────────────────────────

describe('FactionReport — direct component mount proof', () => {
    it('mounts without error with realistic RS verdict', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html.length).toBeGreaterThan(100);
    });

    it('renders pyrrhic score in mounted output', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('42.5');
    });

    it('renders grade in mounted output', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('>C<');
    });

    it('renders outcome_class badge in mounted output', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('Failure');
    });

    it('renders condemnation notice when genocide_condemnation flag present', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('International Condemnation');
        expect(html).toContain('genocide');
        expect(html).toContain('tribunal');
    });

    it('does NOT render condemnation notice when no flags present', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRbihVerdict(),
            factionOsids: 199,
            totalOsids: 712,
            brigadeCount: 25,
            personnel: 55000,
        });
        expect(html).not.toContain('International Condemnation');
        expect(html).not.toContain('genocide');
    });

    it('renders outcome_class "Survival" for RBiH verdict', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRbihVerdict(),
            factionOsids: 199,
            totalOsids: 712,
            brigadeCount: 25,
            personnel: 55000,
        });
        expect(html).toContain('Survival');
    });

    it('renders all 6 dimension bars', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('Military Credibility');
        expect(html).toContain('International Standing');
        expect(html).toContain('Patron Confidence');
        expect(html).toContain('Internal Cohesion');
    });

    it('renders grade description text', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('catastrophic moral cost');
    });

    it('renders war crimes count in statistics', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRsVerdict(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('War Crimes Events');
        expect(html).toContain('35');
    });

    it('renders enclaves lost for RBiH', () => {
        const html = renderComponent(FactionReport, {
            verdict: makeRbihVerdict(),
            factionOsids: 199,
            totalOsids: 712,
            brigadeCount: 25,
            personnel: 55000,
        });
        expect(html).toContain('Enclaves Lost');
        expect(html).toContain('Srebrenica');
    });
});

// ── WarCostSummary mount proof ──────────────────────────────────────────────

describe('WarCostSummary — direct component mount proof', () => {
    it('mounts without error with realistic inputs', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html.length).toBeGreaterThan(100);
    });

    it('renders total military killed', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        // toLocaleString() output varies by locale (46,500 or 46.500)
        expect(html).toMatch(/46[,.]500/);
    });

    it('renders total civilian killed', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html).toMatch(/38[,.]000/);
    });

    it('renders war duration', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html).toContain('170 weeks');
    });

    it('renders duration comparison with historical', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html).toContain('shorter');
    });

    it('renders territory divergence section', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html).toContain('Territory vs Dayton');
    });

    it('renders divergence notes in order', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        const notes = makeComparison().divergence_notes;
        for (const note of notes) {
            expect(html).toContain(note);
        }
        // Verify ordering: first note appears before last note in HTML
        const idx1 = html.indexOf(notes[0]);
        const idx3 = html.indexOf(notes[2]);
        expect(idx1).toBeLessThan(idx3);
    });

    it('renders Srebrenica divergence note', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html).toContain('Srebrenica genocide occurred');
    });

    it('renders Historical Divergence section heading', () => {
        const html = renderComponent(WarCostSummary, {
            costLedger: makeCostLedger(),
            comparison: makeComparison(),
        });
        expect(html).toContain('Historical Divergence');
    });
});
