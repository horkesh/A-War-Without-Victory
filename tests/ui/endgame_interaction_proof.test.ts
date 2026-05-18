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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';

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

// ── INTERACTION PROOF: Tab switching ────────────────────────────────────────

describe('VerdictScreen interaction — faction tab switching', () => {
    beforeEach(() => { storeState = { loadedGameState: endgame() }; });
    afterEach(cleanup);

    it('default selected faction is RBiH', () => {
        renderVS();
        expect(screen.getByText('Multi-ethnic state endures')).toBeDefined();
    });

    it('clicking VRS tab shows RS faction report', () => {
        renderVS();
        // Find and click the VRS tab button
        const vrsTab = screen.getByText('VRS');
        fireEvent.click(vrsTab);
        // RS grade description should now be visible
        expect(screen.getByText('Territorial gains tainted by condemnation')).toBeDefined();
    });

    it('clicking VRS tab shows RS pyrrhic score', () => {
        renderVS();
        fireEvent.click(screen.getByText('VRS'));
        // Score appears in both tab badge and report — use getAllByText
        const matches = screen.getAllByText('42.0');
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('clicking VRS tab shows condemnation notice (genocide_condemnation)', () => {
        renderVS();
        fireEvent.click(screen.getByText('VRS'));
        expect(screen.getByText('International Condemnation')).toBeDefined();
        // Verify restrained wording
        const condemnation = screen.getByText(/genocide.*tribunal/i);
        expect(condemnation).toBeDefined();
    });

    it('condemnation notice NOT visible on RBiH tab (no flags)', () => {
        renderVS();
        // Default is RBiH — should not have condemnation
        expect(screen.queryByText('International Condemnation')).toBeNull();
    });

    it('clicking HVO tab shows HRHB faction report', () => {
        renderVS();
        fireEvent.click(screen.getByText('HVO'));
        expect(screen.getByText('HRHB Federation compromise')).toBeDefined();
    });

    it('switching back to ARBiH restores original report', () => {
        renderVS();
        fireEvent.click(screen.getByText('VRS'));
        expect(screen.getByText('Territorial gains tainted by condemnation')).toBeDefined();
        fireEvent.click(screen.getByText('ARBiH'));
        expect(screen.getByText('Multi-ethnic state endures')).toBeDefined();
    });

    it('War Cost section remains stable across tab switches', () => {
        renderVS();
        expect(screen.getByText(/War Cost/)).toBeDefined();
        fireEvent.click(screen.getByText('VRS'));
        expect(screen.getByText(/War Cost/)).toBeDefined();
        fireEvent.click(screen.getByText('HVO'));
        expect(screen.getByText(/War Cost/)).toBeDefined();
    });

    it('divergence notes remain stable across tab switches', () => {
        renderVS();
        expect(screen.getAllByText(/Srebrenica genocide occurred/).length).toBeGreaterThanOrEqual(1);
        fireEvent.click(screen.getByText('VRS'));
        expect(screen.getAllByText(/Srebrenica genocide occurred/).length).toBeGreaterThanOrEqual(1);
    });

    it('mobile verdict section controls switch the lower report flow without changing faction scoring', () => {
        const { container } = renderVS();
        const lowerFlow = container.querySelector('[data-awwv-mobile-verdict-flow]');
        expect(lowerFlow?.getAttribute('data-awwv-mobile-section-active')).toBe('report');

        fireEvent.click(screen.getByRole('button', { name: 'Reckoning' }));

        expect(lowerFlow?.getAttribute('data-awwv-mobile-section-active')).toBe('reckoning');
        expect(container.querySelector('[data-awwv-mobile-section="report"]')).toBeDefined();
        expect(container.querySelector('[data-awwv-mobile-section="reckoning"]')).toBeDefined();
        expect(screen.getByText('Multi-ethnic state endures')).toBeDefined();
        expect(screen.getByText(/War Cost/)).toBeDefined();
    });
});

// ── APP-ROUTE PROOF: Endgame reachability ───────────────────────────────────

describe('VerdictScreen route — endgame reachability', () => {
    afterEach(cleanup);

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
