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
import type { LoadedGameState } from '../../src/ui/map/data/types';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';

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
        costLedger: { war_duration_weeks: 188, total_military_killed: 46500, total_civilian_killed: 38000, entries: [], rupture_consequences: [{ id: 'srebrenica_genocide_1995', perpetrator_faction: 'RS', description: 'Fall of Srebrenica' }] } as CostLedger,
        historicalComparison: { duration_delta_weeks: 6, territory_divergence: { RS: 9.0, RBiH_HRHB_Federation: -9.0 }, casualty_ratio: 0.85, displacement_ratio: 0.9, rupture_divergence: [], divergence_notes: ['War lasted 6 weeks longer than the historical 182 weeks', 'Srebrenica genocide occurred as in the historical war'] } as ComparisonResult,
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
