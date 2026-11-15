/**
 * UI-5 Endgame Faction Report Mobile Subdivision (Batch 44).
 *
 * Splits the long endgame FactionReport into stable named sections so
 * a mobile viewport can collapse the lower-priority blocks without
 * losing access to any score, capital dimension, or Cost Ledger field.
 *
 * Verifies via React `renderToStaticMarkup` (the existing pattern
 * established by `tests/ui/endgame_verdict_screen_mount.test.ts`):
 *
 *  1. Every existing pyrrhic score / grade / dimension / statistic
 *     and Dayton field remains present in the mounted output (UI-5
 *     task: do not lose any score/result text).
 *  2. Each subdivisible section has a stable `data-testid` marker so
 *     mobile layout assertions and future Playwright shots can target
 *     specific anchors without coordinate guessing.
 *  3. Lower-priority sections (Capital Dimensions, Final Statistics,
 *     Dayton) are wrapped in `<details>` so the mobile viewport can
 *     collapse them. The `<details>` element defaults to open, and
 *     the toggle summary is `sm:hidden` so desktop renders unchanged
 *     (dense, no extra toggle chrome). All content stays in the DOM
 *     regardless of toggle state — primary cards stay reachable.
 *
 * Plan: docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md UI-5.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FactionReport } from '../../src/ui/map/components/VerdictScreen';
import type { FactionVerdict } from '../../src/state/negotiation_types';
import type { DaytonAgreementRecord, DaytonResult } from '../../src/state/negotiation_types';

function makeRichVerdict(): FactionVerdict {
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
            peace_plans_accepted: ['vance_owen'],
            peace_plans_rejected: ['contact_group'],
            enclaves_held: ['banja_luka'],
            enclaves_lost: ['srebrenica'],
            war_crimes_events: 35,
            combat_effective_brigades: 35,
        } as FactionVerdict['capital_breakdown'],
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 72, grade: 'B' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 69, grade: 'B' },
            { dimension: 'international_standing', label: 'International Standing', score: 8, grade: 'F' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 15, grade: 'D' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 45, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 35, grade: 'C' },
        ],
        outcome_class: 'failure' as FactionVerdict['outcome_class'],
        condemnation_flags: [],
    };
}

function makeDayton(): DaytonResult {
    return {
        territorial_packages_accepted: ['51_49_split'],
        territorial_packages_rejected: ['greater_serbia'],
        institutional_choices: { presidency: 'decentralized' },
        final_territory_split: { RBiH: 51, RS: 49 },
        patron_overrides_applied: [],
    } as DaytonResult;
}

function renderReport(extra?: { dayton?: DaytonResult; verdict?: FactionVerdict; signedAgreement?: DaytonAgreementRecord }): string {
    return renderToStaticMarkup(createElement(FactionReport, {
        verdict: extra?.verdict ?? makeRichVerdict(),
        factionOsids: 413,
        totalOsids: 712,
        brigadeCount: 35,
        personnel: 85000,
        daytonResult: extra?.dayton,
        signedAgreement: extra?.signedAgreement,
    }));
}

describe('FactionReport mobile subdivision (UI-5 / Batch 44)', () => {
    it('preserves Pyrrhic Score, grade and outcome class; the grade description lives in the grade trace', () => {
        const html = renderReport();
        expect(html).toContain('42.5');
        expect(html).toContain('>C<');
        expect(html).toContain('Failure');
        // A verdict frozen before the grade trace shows no "How the verdict was set" block and
        // no grade description (the description renders only inside that block).
        expect(html).not.toContain('data-testid="faction-report-grade-trace"');
        expect(html).not.toContain('catastrophic moral cost');

        const traced = renderReport({
            verdict: {
                ...makeRichVerdict(),
                grade_trace: {
                    territory_basis: 'front', territory_graded_pct: 58, earned_grade: 'B',
                    earned_description: 'Territorial gains but catastrophic moral cost', cost_step: 'war_cost_cap',
                    cost_capped_grade: 'C', condemnation_capped_grade: 'C', settlement_capped_grade: 'C',
                    base_outcome_class: 'pyrrhic_success', peace_dysfunction_index: null,
                    settlement_peace_dysfunction_index: null, peace_dysfunction_band: 'none',
                    outcome_class: 'pyrrhic_success',
                },
            },
        });
        const trace = traced.slice(traced.indexOf('data-testid="faction-report-grade-trace"'));
        expect(trace).toContain('How the verdict was set');
        expect(trace).toContain('Territory graded: 58.0%');
        expect(trace).toContain('End position: grade B');
        expect(trace).toContain('War cost: B → C');
        expect(trace).toContain('catastrophic moral cost');
    });

    it('preserves all 6 capital dimension labels', () => {
        const html = renderReport();
        expect(html).toContain('Military Credibility');
        expect(html).toContain('Territorial Legitimacy');
        expect(html).toContain('International Standing');
        expect(html).toContain('Patron Confidence');
        expect(html).toContain('Internal Cohesion');
        expect(html).toContain('Negotiating Leverage');
    });

    it('preserves all final-statistics labels, each figure with its basis', () => {
        const html = renderReport();
        expect(html).toContain('Territory graded');
        expect(html).toContain('Settlements held');
        expect(html).toContain('413 of 712 (58.0%)');
        expect(html).toContain('Area held');
        expect(html).toContain('Active Brigades');
        expect(html).toContain('Personnel');
        expect(html).toContain('Combat losses inflicted');
        expect(html).toContain('Combat losses suffered');
        expect(html).toContain('Population in held municipalities');
        expect(html).toContain('Displaced or killed');
        expect(html).toContain('Refugees Received');
        expect(html).toContain('Operations Launched');
        expect(html).toContain('Operations Successful');
        expect(html).toContain('War Crimes Events');
        // Every figure row states what it counts.
        expect(html).toContain('data-awwv-figure-basis="Share of the country&#x27;s area held at the war&#x27;s end (front line); cells of an overrun safe area are not credited"');
        expect(html).toContain('data-awwv-figure-basis="Killed, wounded and missing, summed over this side&#x27;s engagements; this campaign"');
        expect(html).not.toMatch(/data-awwv-figure-basis=""/);
    });

    it('preserves Dayton agreement fields when supplied, with package names rather than ids', () => {
        const html = renderReport({ dayton: makeDayton() });
        expect(html).toContain('Dayton Agreement');
        expect(html).toContain('Packages Accepted:');
        expect(html).toContain('51 49 Split');
        expect(html).toContain('Packages left out of the treaty:');
        expect(html).toContain('Greater Serbia');
        expect(html).not.toContain('51_49_split');
        expect(html).not.toContain('greater_serbia');
        expect(html).toContain('data-awwv-dayton-institutions="legacy"');
        expect(html).toContain('Republic of Bosnia and Herzegovina 51.0%, Republika Srpska 49.0%');
    });

    it('a signed treaty lists its institutions from the binder and no package lists', () => {
        const dayton = makeDayton();
        const signedAgreement = {
            version: 1,
            terms: { ...dayton, brcko_status: 'arbitration' },
            map: { controllers: {}, wartimeControllers: {}, specialOsids: [], territoryPct: { RBiH: 51, RS: 49 } },
            treaty: {
                faction: 'RS', draft_share: { RBiH: 51, RS: 49 }, signed_share: { RBiH: 51, RS: 49 },
                land_won: [], land_given: [], land_refused: [], powers_won: [], powers_refused: [],
            },
        } as unknown as DaytonAgreementRecord;
        const html = renderReport({ dayton, signedAgreement });
        expect(html).toContain('data-awwv-dayton-institutions="binder"');
        expect(html).not.toContain('data-awwv-dayton-institutions="legacy"');
        expect(html).not.toContain('Packages Accepted:');
        expect(html).not.toContain('Packages left out of the treaty:');
    });

    it('emits stable data-testid markers for each top-level section', () => {
        const html = renderReport({ dayton: makeDayton() });
        expect(html).toContain('data-testid="faction-report-score"');
        expect(html).toContain('data-testid="faction-report-dimensions"');
        expect(html).toContain('data-testid="faction-report-statistics"');
        expect(html).toContain('data-testid="faction-report-dayton"');
    });

    it('wraps lower-priority sections in <details> for mobile collapsibility', () => {
        const html = renderReport({ dayton: makeDayton() });
        // Dimensions, Statistics, Dayton subdivide via <details>; score hero stays exposed.
        expect(html).toMatch(/<details[^>]*data-testid="faction-report-dimensions"/);
        expect(html).toMatch(/<details[^>]*data-testid="faction-report-statistics"/);
        expect(html).toMatch(/<details[^>]*data-testid="faction-report-dayton"/);
        // Each defaults to open so desktop renders dense (sm:hidden summary).
        expect(html).toMatch(/<details[^>]*data-testid="faction-report-dimensions"[^>]*open/);
        expect(html).toMatch(/<details[^>]*data-testid="faction-report-statistics"[^>]*open/);
        expect(html).toMatch(/<details[^>]*data-testid="faction-report-dayton"[^>]*open/);
        // Summary toggles are mobile-only (Tailwind sm:hidden).
        expect(html).toMatch(/<summary[^>]*sm:hidden/);
    });

    it('does not wrap the score hero in <details> (always visible)', () => {
        const html = renderReport();
        const scoreSection = html.match(/data-testid="faction-report-score"[^>]*>[\s\S]*?42\.5/);
        expect(scoreSection).toBeTruthy();
        // Score hero must NOT be wrapped in a <details> tag.
        const scoreInDetails = /<details[^>]*data-testid="faction-report-score"/.test(html);
        expect(scoreInDetails).toBe(false);
    });
});
