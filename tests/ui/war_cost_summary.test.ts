// @vitest-environment jsdom

/**
 * Proof tests for Cluster D WarCostSummary formatting helpers.
 *
 * Covers:
 *  - formatDurationDelta returns correct delta descriptions
 *  - formatCasualtyRatio returns neutral historical-index descriptions
 *  - formatTerritoryDivergence returns correct divergence descriptions
 *
 * Tests pure formatting functions only — no React rendering.
 */

import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, it, expect } from 'vitest';
import {
    formatDurationDelta,
    formatCasualtyRatio,
    formatHistoricalDivergenceNote,
    formatTerritoryDivergence,
    WarCostSummary,
} from '../../src/ui/map/components/WarCostSummary';
import { setLocale } from '../../src/ui/map/i18n';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';
import type { ComparisonResult } from '../../src/sim/endgame/endgame_comparison';

afterEach(() => {
    cleanup();
    setLocale('en');
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDurationDelta
// ─────────────────────────────────────────────────────────────────────────────

describe('formatDurationDelta', () => {
    it('reports longer duration correctly', () => {
        const result = formatDurationDelta(10, 182);
        expect(result).toBe('10 weeks longer than the historical 182 weeks');
    });

    it('reports shorter duration correctly', () => {
        const result = formatDurationDelta(-20, 182);
        expect(result).toBe('20 weeks shorter than the historical 182 weeks');
    });

    it('reports exact match', () => {
        const result = formatDurationDelta(0, 182);
        expect(result).toBe('Exactly the historical 182 weeks');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatCasualtyRatio
// ─────────────────────────────────────────────────────────────────────────────

describe('formatCasualtyRatio', () => {
    it('reports higher casualties without cost-minimization language', () => {
        const result = formatCasualtyRatio(1.25);
        expect(result).toBe('Military casualty index 125 (historical reference = 100)');
        expect(result).not.toMatch(/more costly|less costly|of historical levels/i);
    });

    it('reports lower casualties without celebratory language', () => {
        const result = formatCasualtyRatio(0.73);
        expect(result).toBe('Military casualty index 73 (historical reference = 100)');
        expect(result).not.toMatch(/more costly|less costly|of historical levels/i);
    });

    it('reports identical casualties', () => {
        const result = formatCasualtyRatio(1.0);
        expect(result).toBe('Military casualty index 100 (historical reference = 100)');
    });

    it('reports zero casualties', () => {
        const result = formatCasualtyRatio(0);
        expect(result).toBe('Military casualty index 0 (historical reference = 100)');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatTerritoryDivergence
// ─────────────────────────────────────────────────────────────────────────────

describe('formatTerritoryDivergence', () => {
    it('reports RS divergence above threshold', () => {
        const result = formatTerritoryDivergence('RS', 3.2);
        expect(result).toBe('RS: 3.2% more than Dayton baseline');
    });

    it('reports Federation divergence below threshold', () => {
        const result = formatTerritoryDivergence('RBiH_HRHB_Federation', -2.5);
        expect(result).toBe('Federation: 2.5% less than Dayton baseline');
    });

    it('reports within historical range for small delta', () => {
        const result = formatTerritoryDivergence('RS', 0.3);
        expect(result).toBe('RS: within historical range');
    });

    it('reports within historical range for zero delta', () => {
        const result = formatTerritoryDivergence('RS', 0);
        expect(result).toBe('RS: within historical range');
    });
});

describe('formatHistoricalDivergenceNote', () => {
    it('preserves English generated duration notes by default', () => {
        expect(formatHistoricalDivergenceNote('War lasted 12 weeks shorter than the historical 188 weeks'))
            .toBe('War lasted 12 weeks shorter than the historical 188 weeks');
        expect(formatHistoricalDivergenceNote('War lasted exactly the historical 188 weeks'))
            .toBe('War lasted exactly the historical 188 weeks');
    });

    it('preserves unknown source-authored notes as fallback', () => {
        expect(formatHistoricalDivergenceNote('A source-authored divergence note'))
            .toBe('A source-authored divergence note');
    });

    it('localizes generated territory and casualty notes in BCS', () => {
        setLocale('bcs');

        expect(formatHistoricalDivergenceNote('Federation controlled 54.0% territory vs historical 51%'))
            .toBe('Federacija je kontrolisala 54.0% teritorije naspram historijskih 51%.');
        expect(formatHistoricalDivergenceNote('RS controlled 47.5% territory vs historical 49%'))
            .toBe('RS je kontrolisao 47.5% teritorije naspram historijskih 49%.');
        expect(formatHistoricalDivergenceNote('Total military casualties were 72% of historical levels'))
            .toBe('Ukupni vojni gubici bili su 72% historijskog nivoa.');
    });
});

describe('WarCostSummary player-facing labels', () => {
    it('keeps opportunity responses and finding badges player-safe while raw ids remain internal', () => {
        const costLedger: CostLedger = {
            war_duration_weeks: 40,
            entries: [],
            rupture_consequences: [],
            total_military_killed: 0,
            total_civilian_killed: 0,
            operation_opportunities: {
                total_decisions: 1,
                approved: 1,
                declined: 0,
                expired: 0,
                completed: 1,
                successes: 0,
                failures: 0,
                by_faction: {},
                entries: [{
                    proposal_id: 'proposal_1',
                    opportunity_id: 'opportunity_1',
                    display_name: 'Eastern corridor',
                    faction: 'RS',
                    response: 'under_resource',
                    response_turn: 12,
                    exit_class: 'failed',
                    total_attacks: 1,
                    objectives_targeted: 1,
                    objectives_captured: 0,
                }],
            },
            findings: [{
                id: 'finding_1',
                category: 'rupture',
                severity: 'rupture',
                faction: 'RS',
                title: 'Srebrenica genocide',
                text: 'Locked condemnation finding.',
                sources: ['Sensitive History Design Gate'],
            }],
        };
        const comparison: ComparisonResult = {
            duration_delta_weeks: 0,
            territory_divergence: {},
            casualty_ratio: 1,
            displacement_ratio: 1,
            rupture_divergence: [],
            divergence_notes: [],
        };

        const { container } = render(createElement(WarCostSummary, { costLedger, comparison }));
        const text = container.textContent ?? '';

        expect(text).toContain('Under-resourced approval');
        expect(text).toContain('Serb command / Locked condemnation');
        expect(text).not.toContain('under_resource');
        expect(text).not.toContain('RS / rupture');
        expect(text).not.toMatch(/\b(grave|record|rupture)\b/);
    });
});
