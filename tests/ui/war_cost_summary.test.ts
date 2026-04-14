/**
 * Proof tests for Cluster D WarCostSummary formatting helpers.
 *
 * Covers:
 *  - formatDurationDelta returns correct delta descriptions
 *  - formatCasualtyRatio returns correct percentage descriptions
 *  - formatTerritoryDivergence returns correct divergence descriptions
 *
 * Tests pure formatting functions only — no React rendering.
 */

import { describe, it, expect } from 'vitest';
import {
    formatDurationDelta,
    formatCasualtyRatio,
    formatTerritoryDivergence,
} from '../../src/ui/map/components/WarCostSummary';

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
    it('reports higher casualties correctly', () => {
        const result = formatCasualtyRatio(1.25);
        expect(result).toBe('125% of historical levels (more costly)');
    });

    it('reports lower casualties correctly', () => {
        const result = formatCasualtyRatio(0.73);
        expect(result).toBe('73% of historical levels (less costly)');
    });

    it('reports identical casualties', () => {
        const result = formatCasualtyRatio(1.0);
        expect(result).toBe('100% of historical levels (identical)');
    });

    it('reports zero casualties', () => {
        const result = formatCasualtyRatio(0);
        expect(result).toBe('0% of historical levels (less costly)');
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
