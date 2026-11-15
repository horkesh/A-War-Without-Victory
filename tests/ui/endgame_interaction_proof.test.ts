// @vitest-environment jsdom
/**
 * VerdictScreen interaction proof + App-level route proof.
 *
 * Uses @testing-library/react for client-side rendering with event
 * simulation. Proves tab switching, faction report content changes,
 * condemnation visibility on RS tab, and cost section stability.
 *
 * Proof classification:
 * - DIRECT INTERACTION PROOF (tab switching via fireEvent.click)
 * - DIRECT APP-ROUTE PROOF (gating, fallback, verdict → endgame surface)
 *
 * Does NOT prove:
 * - Desktop Electron shell routing
 * - Full App.tsx tree (only VerdictScreen subtree)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';
import { setLocale } from '../../src/ui/map/i18n';

// ── Mock store + IPC ────────────────────────────────────────────────────────

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (s: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
    useIPC: () => ({ isAvailable: false }),
}));

// @ts-expect-error TS1378: top-level await — vitest handles at runtime
const { VerdictScreen } = await import('../../src/ui/map/components/VerdictScreen');

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeFV(faction: string, ov?: Partial<FactionVerdict>): FactionVerdict {
    return {
        faction, pyrrhic_score: 55, grade: 'B',
        grade_description: `${faction} acceptable compromise`,
        capital_breakdown: {
            territory_controlled_pct: 30, territory_controlled_km2: 15000,
            military_casualties_inflicted: 20000, military_casualties_taken: 40000,
            operations_launched: 50, operations_successful: 15,
            refugees_created: 500000, refugees_received: 80000,
            civilians_under_protection: 150000, civilian_casualties_caused: 3000,
            peace_plans_accepted: [], peace_plans_rejected: [],
            enclaves_held: [], enclaves_lost: [],
            war_crimes_events: 0, combat_effective_brigades: 20,
        } as any,
        dimension_grades: [
            { dimension: 'military_credibility', label: 'Military Credibility', score: 50, grade: 'C' },
            { dimension: 'territorial_legitimacy', label: 'Territorial Legitimacy', score: 50, grade: 'C' },
            { dimension: 'international_standing', label: 'International Standing', score: 50, grade: 'C' },
            { dimension: 'patron_confidence', label: 'Patron Confidence', score: 50, grade: 'C' },
            { dimension: 'internal_cohesion', label: 'Internal Cohesion', score: 50, grade: 'C' },
            { dimension: 'negotiating_leverage', label: 'Negotiating Leverage', score: 50, grade: 'C' },
        ],
        outcome_class: 'negotiated_escape' as any,
        condemnation_flags: [],
        ...ov,
    };
}

function endgame(ov?: Partial<LoadedGameState>): LoadedGameState {
    return {
        label: 'proof', turn: 188, phase: 'war',
        metadata: { turn: 188, date: '1995-10-01' },
        formations: [], militiaPools: [],
        controlBySettlement: { 'op:banja_luka:centar': 'RS' },
        statusBySettlement: {}, brigadeAorByFormationId: {},
        attackOrders: [], aorOrders: [], recentControlEvents: [],
        allControlEvents: [], displacementEventLog: [],
        battlesByOsid: {}, movementsByOsid: {},
        supplyTransitionsByOsid: {}, historicalEventsByTurn: [],
        gameOver: true, gameOutcome: 'timeout_stalemate',
        gameVerdict: {
            outcome_type: 'termination',
            outcome_label: 'Stalemate',
            turn: 188, date: '1995-10-01', duration_weeks: 188,
            dayton_result: {
                territorial_packages_accepted: ['package_a'],
                territorial_packages_rejected: ['package_b'],
                institutional_choices: { presidency: 'decentralized' },
                final_territory_split: { RS: 49, Federation: 51 },
                patron_overrides_applied: ['belgrade_pressure'],
            },
            faction_verdicts: {
                RBiH: makeFV('RBiH', {
                    grade: 'A', pyrrhic_score: 65,
                    outcome_class: 'survival' as any,
                    grade_description: 'Multi-ethnic state endures',
                }),
                RS: makeFV('RS', {
                    grade: 'C', pyrrhic_score: 42,
                    outcome_class: 'failure' as any,
                    condemnation_flags: ['genocide_condemnation'],
                    grade_description: 'Territorial gains tainted by condemnation',
                    capital_breakdown: {
                        territory_controlled_pct: 58, territory_controlled_km2: 30000,
                        military_casualties_inflicted: 91000, military_casualties_taken: 42000,
                        operations_launched: 120, operations_successful: 70,
                        refugees_created: 600000, refugees_received: 80000,
                        civilians_under_protection: 150000, civilian_casualties_caused: 45000,
                        peace_plans_accepted: [], peace_plans_rejected: ['vance_owen'],
                        enclaves_held: [], enclaves_lost: [],
                        war_crimes_events: 35, combat_effective_brigades: 35,
                    } as any,
                }),
                HRHB: makeFV('HRHB', {
                    grade: 'B', pyrrhic_score: 55,
                    outcome_class: 'negotiated_escape' as any,
                    grade_description: 'HRHB Federation compromise',
                }),
            },
        } as GameVerdict,
        costLedger: {
            war_duration_weeks: 188, total_military_killed: 46500, total_civilian_killed: 38000,
            entries: [],
            rupture_consequences: [{ id: 'srebrenica_genocide_1995', perpetrator_faction: 'RS', description: 'Fall of Srebrenica' }],
            findings: [],
        } as CostLedger,
        historicalComparison: {
            duration_delta_weeks: 6, territory_divergence: { RS: 9.0 },
            casualty_ratio: 0.85, displacement_ratio: 0.9, rupture_divergence: [],
            divergence_notes: ['War lasted 6 weeks longer', 'Srebrenica genocide occurred'],
        } as ComparisonResult,
        ...ov,
    } as LoadedGameState;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderVS() {
    return render(createElement(VerdictScreen));
}

/** The faction rail button for a side (the rail names sides, so select by its outcome badge). */
function railTab(container: HTMLElement, faction: string): HTMLElement {
    const badge = container.querySelector(`[data-awwv-faction-tab-outcome="${faction}"]`);
    const button = badge?.closest('button');
    if (!button) throw new Error(`no rail tab for ${faction}`);
    return button as HTMLElement;
}

/** The selected faction report's score hero (score, grade, outcome, condemnation). */
function reportScore(container: HTMLElement) {
    const hero = container.querySelector('[data-testid="faction-report-score"]');
    if (!hero) throw new Error('no faction report score hero');
    return within(hero as HTMLElement);
}

// ── INTERACTION PROOF: Tab switching ────────────────────────────────────────

describe('VerdictScreen interaction — faction tab switching', () => {
    beforeEach(() => {
        setLocale('en');
        storeState = { loadedGameState: endgame() };
    });
    afterEach(() => {
        cleanup();
        setLocale('en');
    });

    it('the faction rail names the sides, not their armies', () => {
        const { container } = renderVS();
        expect(railTab(container, 'RBiH').textContent).toContain('Republic of Bosnia and Herzegovina');
        expect(railTab(container, 'RS').textContent).toContain('Republika Srpska');
        expect(railTab(container, 'HRHB').textContent).toContain('Herzeg-Bosnia');
        expect(screen.queryByText('ARBiH')).toBeNull();
        expect(screen.queryByText('VRS')).toBeNull();
        expect(screen.queryByText('HVO')).toBeNull();
    });

    it('default selected faction is RBiH', () => {
        const { container } = renderVS();
        expect(screen.getByText('The Republic of Bosnia and Herzegovina survived the war')).toBeDefined();
        const report = reportScore(container);
        expect(report.getByText('65.0')).toBeDefined();
        expect(report.getByText('Survival')).toBeDefined();
    });

    it('renders the grade description only inside the grade-trace block', () => {
        // A save frozen before the grade trace: no "How the verdict was set" block, no description.
        const { container, unmount } = renderVS();
        expect(container.querySelector('[data-testid="faction-report-grade-trace"]')).toBeNull();
        expect(screen.queryByText('How the verdict was set')).toBeNull();
        expect(screen.queryByText('Multi-ethnic state endures')).toBeNull();
        unmount();

        const base = endgame();
        const rbih = base.gameVerdict!.faction_verdicts.RBiH!;
        storeState = {
            loadedGameState: {
                ...base,
                gameVerdict: {
                    ...base.gameVerdict!,
                    faction_verdicts: {
                        ...base.gameVerdict!.faction_verdicts,
                        RBiH: {
                            ...rbih,
                            grade_trace: {
                                territory_basis: 'front', territory_graded_pct: 30, earned_grade: 'A',
                                earned_description: 'Multi-ethnic state endures', cost_step: 'war_cost_cap',
                                cost_capped_grade: 'A', condemnation_capped_grade: 'A', settlement_capped_grade: 'A',
                                base_outcome_class: 'survival', peace_dysfunction_index: null,
                                settlement_peace_dysfunction_index: null, peace_dysfunction_band: 'none',
                                outcome_class: 'survival',
                            },
                        },
                    },
                } as GameVerdict,
            },
        };
        const traced = renderVS();
        const trace = traced.container.querySelector('[data-testid="faction-report-grade-trace"]') as HTMLElement;
        expect(trace).not.toBeNull();
        expect(within(trace).getByText('How the verdict was set')).toBeDefined();
        expect(within(trace).getByText('Multi-ethnic state endures')).toBeDefined();
        expect(screen.getAllByText('Multi-ethnic state endures')).toHaveLength(1);
    });

    it('clicking the Republika Srpska tab shows the RS faction report', () => {
        const { container } = renderVS();
        fireEvent.click(railTab(container, 'RS'));
        expect(screen.getByText('Republika Srpska ended the war in failure: its forces committed the Srebrenica genocide')).toBeDefined();
        const report = reportScore(container);
        expect(report.getByText('42.0')).toBeDefined();
        expect(report.getByText('Failure')).toBeDefined();
    });

    it('clicking the Republika Srpska tab shows the RS pyrrhic score', () => {
        const { container } = renderVS();
        fireEvent.click(railTab(container, 'RS'));
        // Score appears in both tab badge and report — use getAllByText
        const matches = screen.getAllByText('42.0');
        expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('clicking the Republika Srpska tab shows condemnation notice (genocide_condemnation)', () => {
        const { container } = renderVS();
        fireEvent.click(railTab(container, 'RS'));
        expect(screen.getByText('International Condemnation')).toBeDefined();
        // Restrained, sourced wording naming the forces and the court findings.
        expect(screen.getByText('Its forces committed the Srebrenica genocide (found by the ICTY and the ICJ)')).toBeDefined();
    });

    it('condemnation notice NOT visible on RBiH tab (no flags)', () => {
        renderVS();
        // Default is RBiH — should not have condemnation
        expect(screen.queryByText('International Condemnation')).toBeNull();
    });

    it('clicking the Herzeg-Bosnia tab shows the HRHB faction report', () => {
        const { container } = renderVS();
        fireEvent.click(railTab(container, 'HRHB'));
        expect(screen.getByText('Herzeg-Bosnia left the war on negotiated terms')).toBeDefined();
        const report = reportScore(container);
        expect(report.getByText('55.0')).toBeDefined();
        expect(report.getByText('Negotiated Escape')).toBeDefined();
    });

    it('switching back to the Republic restores original report', () => {
        const { container } = renderVS();
        fireEvent.click(railTab(container, 'RS'));
        expect(reportScore(container).getByText('42.0')).toBeDefined();
        fireEvent.click(railTab(container, 'RBiH'));
        expect(screen.getByText('The Republic of Bosnia and Herzegovina survived the war')).toBeDefined();
        expect(reportScore(container).getByText('65.0')).toBeDefined();
    });

    it('War Cost section remains stable across tab switches', () => {
        const { container } = renderVS();
        expect(screen.getByText(/War Cost/)).toBeDefined();
        fireEvent.click(railTab(container, 'RS'));
        expect(screen.getByText(/War Cost/)).toBeDefined();
        fireEvent.click(railTab(container, 'HRHB'));
        expect(screen.getByText(/War Cost/)).toBeDefined();
    });

    it('historical comparison lines remain stable across tab switches', () => {
        const { container } = renderVS();
        const srebrenicaLine = () => container.querySelector('[data-tutorial-step="cost-ledger"] [data-awwv-comparison-line="srebrenica"]');
        const recordLine = 'The Srebrenica genocide, committed by Bosnian Serb forces against Bosniaks, is recorded in this campaign.';
        expect(srebrenicaLine()?.textContent).toBe(recordLine);
        fireEvent.click(railTab(container, 'RS'));
        expect(srebrenicaLine()?.textContent).toBe(recordLine);
        // The legacy producer notes are never printed raw.
        expect(screen.queryByText(/War lasted/)).toBeNull();
        expect(screen.queryByText('Srebrenica genocide occurred')).toBeNull();
    });

    it('mobile verdict section controls switch the lower report flow without changing faction scoring', () => {
        const { container } = renderVS();
        const lowerFlow = container.querySelector('[data-awwv-mobile-verdict-flow]');
        expect(lowerFlow?.getAttribute('data-awwv-mobile-section-active')).toBe('report');

        fireEvent.click(screen.getByRole('button', { name: 'Reckoning' }));

        expect(lowerFlow?.getAttribute('data-awwv-mobile-section-active')).toBe('reckoning');
        expect(container.querySelector('[data-awwv-mobile-section="report"]')).toBeDefined();
        expect(container.querySelector('[data-awwv-mobile-section="reckoning"]')).toBeDefined();
        expect(reportScore(container).getByText('65.0')).toBeDefined();
        expect(reportScore(container).getByText('Survival')).toBeDefined();
        expect(screen.getByText(/War Cost/)).toBeDefined();
    });

    it('renders localized rich verdict chrome when BCS is selected', () => {
        setLocale('bcs');

        const { container } = renderVS();
        const warCostSection = container.querySelector('[data-tutorial-step="cost-ledger"]');
        expect(warCostSection).toBeDefined();
        const warCost = within(warCostSection as HTMLElement);

        expect(screen.getByRole('button', { name: 'Izvještaj' })).toBeDefined();
        expect(screen.getByRole('button', { name: 'Obračun' })).toBeDefined();
        // The footer tagline is retired (§4 panel 2026-11-14).
        expect(screen.queryByText('Najmanje loša verzija tragedije')).toBeNull();
        expect(screen.getByRole('button', { name: 'Otvori pregled kampanje' })).toBeDefined();
        expect(screen.getByRole('button', { name: 'Nova igra' })).toBeDefined();
        expect(screen.getByText('Pirov rezultat')).toBeDefined();
        expect(screen.getAllByText('Bodovi položaja (kontekst; ocjena se ne izračunava iz ovog zbira)').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText('Military Credibility')).toBeNull();
        expect(screen.getByText('Vojni kredibilitet')).toBeDefined();
        expect(screen.getByText('Teritorijalni legitimitet')).toBeDefined();
        expect(screen.getByText('Međunarodni položaj')).toBeDefined();
        expect(screen.getByText('Povjerenje patrona')).toBeDefined();
        expect(screen.getByText('Unutrašnja kohezija')).toBeDefined();
        expect(screen.getByText('Pregovaračka poluga')).toBeDefined();
        expect(screen.getAllByText('Završna statistika').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Ocijenjena teritorija')).toBeDefined();
        expect(screen.getByText('Ukupna cijena rata')).toBeDefined();
        expect(screen.getAllByText('Trajanje rata').length).toBeGreaterThanOrEqual(1);
        // "Historical Divergence" is replaced by the rebuilt "Against the historical war" list.
        expect(screen.queryByText('Historijsko odstupanje')).toBeNull();
        expect(warCost.getByText('U poređenju s historijskim ratom')).toBeDefined();
        expect(warCost.queryByText('War lasted 6 weeks longer')).toBeNull();
        expect(warCost.queryByText('Srebrenica genocide occurred')).toBeNull();
        expect(warCost.queryByText('Rat je trajao 6 sedmica duže.')).toBeNull();
        expect(warCost.getByText('Genocid u Srebrenici, koji su snage bosanskih Srba počinile nad Bošnjacima, zabilježen je u ovoj kampanji.')).toBeDefined();
        // Banner tiles: Side / War-record grade / Outcome; no Cost Signal tile.
        expect(screen.getByText('Strana')).toBeDefined();
        expect(screen.getAllByText('Ocjena ratnog učinka').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Ishod')).toBeDefined();
        expect(screen.queryByText('Fokus')).toBeNull();
        expect(screen.queryByText('Signal cijene')).toBeNull();
        expect(screen.getByText('Podijeli sažetak')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Kopiraj' })).toBeDefined();
        expect(screen.queryByText('Survival')).toBeNull();
        expect(screen.getAllByText('Opstanak').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Daytonski sporazum').length).toBeGreaterThanOrEqual(1);
        // The only milestone here is the war end; its early/late row is not shown (§4 panel:
        // the end-of-war comparison line dates both endpoints instead).
        expect(screen.queryByText('Poređenje prekretnica')).toBeNull();
        expect(screen.getByText('U poređenju s historijskim ratom')).toBeDefined();
        expect(screen.queryByText('6s kasno')).toBeNull();
        expect(screen.queryByText('Kampanja je završila 6 sedmica kasnije od historijske reference.')).toBeNull();
        // The end of the war is dated instead, in the BCS comparison line.
        expect(screen.getAllByText(/13 nov 1995/).length).toBeGreaterThanOrEqual(1);

        fireEvent.click(railTab(container, 'RS'));

        expect(screen.getByText('Međunarodna osuda')).toBeDefined();
        expect(screen.queryByText(/Condemned for genocide/i)).toBeNull();
        expect(screen.getByText('Njene snage počinile su genocid u Srebrenici (nalaz MKSJ-a i Međunarodnog suda pravde)')).toBeDefined();
    });
});

// ── APP-ROUTE PROOF: Endgame reachability ───────────────────────────────────

describe('VerdictScreen route — endgame reachability', () => {
    beforeEach(() => {
        setLocale('en');
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
    });

    it('renders nothing when loadedGameState is null (non-game state)', () => {
        storeState = { loadedGameState: null };
        const { container } = renderVS();
        expect(container.innerHTML).toBe('');
    });

    it('renders nothing when gameOver is false (mid-game)', () => {
        storeState = { loadedGameState: endgame({ gameOver: false }) };
        const { container } = renderVS();
        expect(container.innerHTML).toBe('');
    });

    it('renders full endgame surface when gameOver is true', () => {
        storeState = { loadedGameState: endgame() };
        const { container } = renderVS();
        const surface = container.querySelector('[data-awwv-endgame-surface="verdict"]');
        expect(surface).toBeDefined();
        expect(surface?.getAttribute('data-awwv-endgame-outcome')).toBe('Stalemate');
    });

    it('renders FallbackGameOver when verdict absent but gameOver true', () => {
        storeState = { loadedGameState: endgame({ gameVerdict: undefined }) };
        renderVS();
        expect(screen.getByText('Final Standings')).toBeDefined();
    });

    it('renders localized FallbackGameOver copy when BCS is selected', () => {
        setLocale('bcs');
        storeState = { loadedGameState: endgame({ gameVerdict: undefined }) };

        renderVS();

        expect(screen.getByText('Pat pozicija')).toBeDefined();
        expect(screen.getByText('Konačni poredak')).toBeDefined();
        expect(screen.getByText('1 naselje pod kontrolom')).toBeDefined();
        expect(screen.getByText('Kampanja je trajala 188 sedmica (3 godina, 32 sedmica)')).toBeDefined();
        expect(screen.getByRole('button', { name: 'Otvori pregled kampanje' })).toBeDefined();
        expect(screen.getByRole('button', { name: 'Nova igra' })).toBeDefined();
        expect(document.body.textContent ?? '').not.toMatch(/\bOSID\b/i);
    });

    it('renders verdict path when verdict present and gameOver true', () => {
        storeState = { loadedGameState: endgame() };
        renderVS();
        // Verdict path shows Pyrrhic Score section
        expect(screen.getByText('Pyrrhic Score')).toBeDefined();
        // Fallback does NOT show
        expect(screen.queryByText('Final Standings')).toBeNull();
    });

    it('renders cost section only when costLedger present', () => {
        storeState = { loadedGameState: endgame() };
        renderVS();
        expect(screen.getByText(/War Cost/)).toBeDefined();
    });

    it('omits cost section when costLedger absent', () => {
        storeState = { loadedGameState: endgame({ costLedger: undefined, historicalComparison: undefined }) };
        renderVS();
        expect(screen.queryByText(/War Cost/)).toBeNull();
        // But verdict still renders
        expect(screen.getByText('Pyrrhic Score')).toBeDefined();
    });
});
