// @vitest-environment jsdom
/**
 * VerdictScreen direct mount proof with live React hooks.
 *
 * Mounts the REAL VerdictScreen component with real useState hook.
 * The Zustand store is replaced via vi.mock with a simple selector
 * function that reads from a test-controlled state object. That keeps
 * the full-component mount narrow and deterministic while still
 * mounting the real component with real React hooks.
 *
 * Proof classification: DIRECT LIVE-HOOK MOUNT PROOF
 * - Real VerdictScreen component, real useState, real JSX tree
 * - Store selector replaced with test-controlled state (not a bare mock)
 * - renderToStaticMarkup produces inspectable HTML
 * - useIPC returns { isAvailable: false } naturally
 *
 * This proves: the ACTUAL VerdictScreen React component mounts, reads
 * endgame state, and renders outcome_class, condemnation, cost ledger,
 * comparison, and divergence notes into real HTML output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FactionReport } from '../../src/ui/map/components/VerdictScreen';
import { WarCostSummary } from '../../src/ui/map/components/WarCostSummary';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';

// Cluster 3 — endgame mount proofs merge.
// Absorbed: endgame_mount_proof.test.ts (FactionReport + WarCostSummary mount tests).
// Note: endgame_proof_truth.test.ts dropped (string-grep fragility — see lane prompt).

// ── Test-controlled store state ─────────────────────────────────────────────

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

// Dynamic import after mocks — vitest handles top-level await in ESM.
// @ts-expect-error TS1378: top-level await requires module=esnext in tsconfig; vitest provides it at runtime.
const { VerdictScreen } = await import('../../src/ui/map/components/VerdictScreen');
// @ts-expect-error TS1378: top-level await requires module=esnext in tsconfig; vitest provides it at runtime.
const { ReplayInspectionBanner } = await import('../../src/ui/map/components/replay/ReplayInspectionBanner');

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeFV(faction: string, ov?: Partial<FactionVerdict>): FactionVerdict {
    return {
        faction, pyrrhic_score: 55, grade: 'B',
        grade_description: 'Acceptable compromise',
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
            outcome_label: 'Stalemate \u2014 Exhaustion',
            turn: 188, date: '1995-10-01', duration_weeks: 188,
            faction_verdicts: {
                RBiH: makeFV('RBiH', { grade: 'A', pyrrhic_score: 65, outcome_class: 'survival' as any, grade_description: 'Multi-ethnic state endures at enormous cost' }),
                RS: makeFV('RS', { grade: 'C', pyrrhic_score: 42, outcome_class: 'failure' as any, condemnation_flags: ['genocide_condemnation'], grade_description: 'Territorial gains tainted by condemnation', capital_breakdown: { territory_controlled_pct: 58, territory_controlled_km2: 30000, military_casualties_inflicted: 91000, military_casualties_taken: 42000, operations_launched: 120, operations_successful: 70, refugees_created: 600000, refugees_received: 80000, civilians_under_protection: 150000, civilian_casualties_caused: 45000, peace_plans_accepted: [], peace_plans_rejected: ['vance_owen', 'contact_group'], enclaves_held: [], enclaves_lost: [], war_crimes_events: 35, combat_effective_brigades: 35 } as any }),
                HRHB: makeFV('HRHB', { grade: 'B', pyrrhic_score: 55, outcome_class: 'negotiated_escape' as any }),
            },
        } as GameVerdict,
        costLedger: { war_duration_weeks: 188, total_military_killed: 46500, total_civilian_killed: 38000, entries: [], rupture_consequences: [{ id: 'srebrenica_genocide_1995', perpetrator_faction: 'RS', description: 'Fall of Srebrenica' }], findings: [] } as CostLedger,
        historicalComparison: {
            duration_delta_weeks: 6,
            territory_divergence: { RS: 9.0, RBiH_HRHB_Federation: -9.0 },
            casualty_ratio: 0.85,
            displacement_ratio: 0.9,
            rupture_divergence: [],
            divergence_notes: ['War lasted 6 weeks longer than the historical 182 weeks', 'Srebrenica genocide occurred as in the historical war'],
            milestone_comparison: [
                {
                    id: 'washington',
                    label: 'Washington Agreement',
                    historical_week: 101,
                    player_week: 109,
                    delta_weeks: 8,
                    status: 'late',
                    summary: 'Federation alignment came later than the reference timeline.',
                },
            ],
        } as ComparisonResult,
        ...ov,
    } as LoadedGameState;
}

function render(): string {
    return renderToStaticMarkup(createElement(VerdictScreen));
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('VerdictScreen mount — gating', () => {
    beforeEach(() => { storeState = { loadedGameState: null }; });

    it('empty when null', () => { expect(render()).toBe(''); });
    it('empty when gameOver false', () => {
        storeState = { loadedGameState: endgame({ gameOver: false }) };
        expect(render()).toBe('');
    });
    it('renders when gameOver true', () => {
        storeState = { loadedGameState: endgame() };
        const html = render();
        expect(html.length).toBeGreaterThan(500);
        expect(html).toContain('A War Without Victory');
    });
});

describe('VerdictScreen mount — verdict content', () => {
    beforeEach(() => { storeState = { loadedGameState: endgame() }; });

    it('outcome label', () => { expect(render()).toContain('Stalemate'); });
    it('date', () => { expect(render()).toContain('1995-10-01'); });
    it('all faction tabs with outcome badges', () => {
        const h = render();
        expect(h).toContain('ARBiH'); expect(h).toContain('VRS'); expect(h).toContain('HVO');
        expect(h).toContain('Survival'); expect(h).toContain('Failure'); expect(h).toContain('Negotiated Escape');
    });
    it('RBiH pyrrhic score', () => { expect(render()).toContain('65.0'); });
    it('RBiH grade description', () => { expect(render()).toContain('Multi-ethnic state endures'); });
    it('dimension bars', () => {
        const h = render();
        expect(h).toContain('Military Credibility'); expect(h).toContain('International Standing');
    });
    it('footer', () => {
        const h = render();
        expect(h).toContain('least bad version'); expect(h).toContain('View Your War'); expect(h).toContain('New Game');
    });

    it('renders replay from a sparse manifest when full frame sequence is absent', () => {
        storeState = {
            loadedGameState: endgame({
                replaySaveManifest: {
                    schema_version: 1,
                    frame_count: 1,
                    frames: [{
                        turn: 188,
                        date: '1995-10-01',
                        activeFormations: 37,
                        totalCasualties: 46500,
                        totalDisplaced: 900000,
                        controlByFaction: [{ faction: 'RS', osids: 42 }],
                    }],
                },
            }),
        };
        const h = render();
        expect(h).toContain('Replay');
        expect(h).toContain('Active formations');
        expect(h).toContain('46500');
        expect(h).toContain('RS:42');
    });

    it('renders a map inspection action when full replay frames are available', () => {
        storeState = {
            loadedGameState: endgame({
                replaySaveSequence: [
                    {
                        meta: { turn: 12, phase: 'war', date: '1992-06-21' },
                        military: { formations: {}, militia_pools: {} },
                        political: { political_controllers: {} },
                        displacement: { displacement_event_log: [] },
                    } as any,
                ],
            }),
            startReplayInspection: () => undefined,
        };
        const h = render();
        expect(h).toContain('Inspect Map');
        expect(h).toContain('data-awwv-replay-inspect');
    });
});

describe('VerdictScreen mount — cost ledger', () => {
    beforeEach(() => { storeState = { loadedGameState: endgame() }; });

    it('renders War Cost section', () => {
        const h = render();
        expect(h).toContain('War Cost'); expect(h).toContain('Historical Comparison');
    });
    it('divergence notes in order', () => {
        const h = render();
        expect(h).toContain('6 weeks longer'); expect(h).toContain('Srebrenica genocide occurred');
        expect(h.indexOf('6 weeks longer')).toBeLessThan(h.indexOf('Srebrenica genocide occurred'));
    });
    it('renders milestone comparison rows', () => {
        const h = render();
        expect(h).toContain('Milestone Comparison');
        expect(h).toContain('Washington Agreement');
        expect(h).toContain('W101');
        expect(h).toContain('W109');
        expect(h).toContain('8w late');
        expect(h).toContain('data-awwv-milestone-comparison');
    });
    it('omits cost section when absent', () => {
        storeState = { loadedGameState: endgame({ costLedger: undefined, historicalComparison: undefined }) };
        const h = render();
        expect(h).not.toContain('War Cost'); expect(h).toContain('Stalemate');
    });
});

describe('VerdictScreen mount — fallback', () => {
    it('FallbackGameOver when no verdict', () => {
        storeState = { loadedGameState: endgame({ gameVerdict: undefined }) };
        const h = render();
        expect(h).toContain('Final Standings'); expect(h).toContain('Stalemate');
    });
});

// ── Absorbed: endgame_mount_proof.test.ts ────────────────────────────────────
//
// Direct component mount proof for FactionReport and WarCostSummary.
// Mounts via React renderToStaticMarkup() with realistic upstream contracts.
// Does NOT mount VerdictScreen itself (that is covered by the describes above).

function makeRsVerdictMP(overrides?: Partial<FactionVerdict>): FactionVerdict {
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

function makeRbihVerdictMP(): FactionVerdict {
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

function makeCostLedgerMP(): CostLedger {
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
        findings: [
            {
                id: 'rupture_srebrenica_genocide_1995',
                category: 'rupture',
                severity: 'rupture',
                faction: 'RS',
                title: 'Srebrenica genocide',
                text: 'The ledger records the Srebrenica genocide after the fall of the Srebrenica safe area; the historical reference is 8,000 killed.',
                sources: ['ICTY Krstic IT-98-33-T', 'ICJ Bosnia v. Serbia (2007)'],
            },
        ],
        operation_opportunities: {
            total_decisions: 2,
            approved: 1,
            declined: 1,
            expired: 0,
            completed: 1,
            successes: 1,
            failures: 0,
            by_faction: {
                RBiH: { total_decisions: 1, approved: 1, declined: 0, expired: 0, completed: 1, successes: 1, failures: 0, did_not_launch: 0, t3_authorized: 0 },
                RS: { total_decisions: 1, approved: 0, declined: 1, expired: 0, completed: 0, successes: 0, failures: 0, did_not_launch: 0, t3_authorized: 0 },
            },
            entries: [
                {
                    proposal_id: 'OPP_175_sana_95',
                    opportunity_id: 'sana_95',
                    display_name: 'Operation Sana',
                    faction: 'RBiH',
                    response: 'approve',
                    response_turn: 175,
                    exit_class: 'partial_success',
                    executed_op_name: 'Operation Sana',
                    executed_op_aar_id: 'aar_sana_95',
                    aar_outcome: 'partial',
                    total_attacks: 7,
                    objectives_targeted: 2,
                    objectives_captured: 1,
                    grade_stars: 3,
                },
                {
                    proposal_id: 'OPP_178_failed_probe',
                    opportunity_id: 'failed_probe',
                    display_name: 'failed probe',
                    faction: 'RS',
                    response: 'decline',
                    response_turn: 178,
                    total_attacks: 0,
                    objectives_targeted: 0,
                    objectives_captured: 0,
                },
            ],
        },
    } as CostLedger;
}

function makeComparisonMP(): ComparisonResult {
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

function renderComponentMP(component: any, props: any): string {
    return renderToStaticMarkup(createElement(component, props));
}

describe('FactionReport — direct component mount proof', () => {
    it('mounts without error with realistic RS verdict', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html.length).toBeGreaterThan(100);
    });

    it('renders pyrrhic score in mounted output', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('42.5');
    });

    it('renders grade in mounted output', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('>C<');
    });

    it('renders outcome_class badge in mounted output', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('Failure');
    });

    it('renders condemnation notice when genocide_condemnation flag present', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
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
        const html = renderComponentMP(FactionReport, {
            verdict: makeRbihVerdictMP(),
            factionOsids: 199,
            totalOsids: 712,
            brigadeCount: 25,
            personnel: 55000,
        });
        expect(html).not.toContain('International Condemnation');
        expect(html).not.toContain('genocide');
    });

    it('renders outcome_class "Survival" for RBiH verdict', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRbihVerdictMP(),
            factionOsids: 199,
            totalOsids: 712,
            brigadeCount: 25,
            personnel: 55000,
        });
        expect(html).toContain('Survival');
    });

    it('renders all 6 dimension bars', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
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
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('catastrophic moral cost');
    });

    it('renders war crimes count in statistics', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRsVerdictMP(),
            factionOsids: 413,
            totalOsids: 712,
            brigadeCount: 35,
            personnel: 85000,
        });
        expect(html).toContain('War Crimes Events');
        expect(html).toContain('35');
    });

    it('renders enclaves lost for RBiH', () => {
        const html = renderComponentMP(FactionReport, {
            verdict: makeRbihVerdictMP(),
            factionOsids: 199,
            totalOsids: 712,
            brigadeCount: 25,
            personnel: 55000,
        });
        expect(html).toContain('Enclaves Lost');
        expect(html).toContain('Srebrenica');
    });
});

describe('WarCostSummary — direct component mount proof', () => {
    it('mounts without error with realistic inputs', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html.length).toBeGreaterThan(100);
    });

    it('renders total military killed', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        // toLocaleString() output varies by locale (46,500 or 46.500)
        expect(html).toMatch(/46[,.]500/);
    });

    it('renders total civilian killed', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toMatch(/38[,.]000/);
    });

    it('renders war duration', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('170 weeks');
    });

    it('renders duration comparison with historical', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('shorter');
    });

    it('renders territory divergence section', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('Territory vs Dayton');
    });

    it('renders divergence notes in order', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        const notes = makeComparisonMP().divergence_notes;
        for (const note of notes) {
            expect(html).toContain(note);
        }
        const idx1 = html.indexOf(notes[0]);
        const idx3 = html.indexOf(notes[2]);
        expect(idx1).toBeLessThan(idx3);
    });

    it('renders Srebrenica divergence note', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('Srebrenica genocide occurred');
    });

    it('renders Historical Divergence section heading', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('Historical Divergence');
    });

    it('renders operation opportunity reckoning when present', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('Opportunity Decisions');
        expect(html).toContain('Operation Sana');
        expect(html).toContain('Partial Success');
        expect(html).toContain('7 attacks');
    });

    it('renders prosecutorial findings with sources', () => {
        const html = renderComponentMP(WarCostSummary, {
            costLedger: makeCostLedgerMP(),
            comparison: makeComparisonMP(),
        });
        expect(html).toContain('Prosecutorial Findings');
        expect(html).toContain('Srebrenica genocide');
        expect(html).toContain('ICTY Krstic IT-98-33-T');
        expect(html).not.toMatch(/less costly|more costly|of historical levels/i);
    });
});

describe('ReplayInspectionBanner mount', () => {
    beforeEach(() => { storeState = { loadedGameState: endgame(), exitReplayInspection: () => undefined }; });

    it('is empty outside replay inspection mode', () => {
        storeState = { loadedGameState: endgame(), replayInspection: null, exitReplayInspection: () => undefined };
        expect(renderToStaticMarkup(createElement(ReplayInspectionBanner))).toBe('');
    });

    it('renders the inspected frame and return action', () => {
        storeState = {
            loadedGameState: endgame(),
            replayInspection: {
                frameIndex: 0,
                turn: 12,
                date: '1992-06-21',
                finalTurn: 188,
                finalDate: '1995-10-01',
            },
            exitReplayInspection: () => undefined,
        };
        const h = renderToStaticMarkup(createElement(ReplayInspectionBanner));
        expect(h).toContain('Replay Inspection');
        expect(h).toContain('Turn 12');
        expect(h).toContain('Return to Final');
        expect(h).toContain('data-awwv-replay-inspection-banner');
    });
});
