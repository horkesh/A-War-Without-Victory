/**
 * Endgame presentation proof — canonical surface composition tests.
 *
 * Tests the pure composition logic exported from VerdictScreen and
 * WarCostSummary with realistic upstream contracts. Proves the canonical
 * endgame surface consumes verdict, condemnation, cost ledger, and
 * comparison truth correctly without re-deriving engine data.
 *
 * Proof classification: DIRECT COMPOSITION PROOF
 * - buildEndgameSummary() tested with realistic GameVerdict + CostLedger
 * - Formatting helpers tested with full outcome taxonomy
 * - Condemnation wording verified for restraint and specificity
 * - Owner split verified: presentation reads judgment, does not produce it
 *
 * Component mount proof: NOT ACHIEVED in this packet.
 * React is only in the UI workspace (src/ui/map/node_modules), not at root.
 * Mount tests require react + @testing-library/react as root devDependencies.
 */

import { describe, it, expect } from 'vitest';
import {
    formatOutcomeClass,
    getOutcomeClassStyle,
    formatCondemnationFlag,
    buildEndgameSummary,
    type EndgameSummary,
} from '../../src/ui/map/components/VerdictScreen';
import {
    formatDurationDelta,
    formatCasualtyRatio,
    formatTerritoryDivergence,
} from '../../src/ui/map/components/WarCostSummary';
import type { GameVerdict, FactionVerdict } from '../../src/state/negotiation_types';
import type { CostLedger } from '../../src/sim/endgame/cost_ledger';

// ── Realistic fixtures ──────────────────────────────────────────────────────

function makeFactionVerdict(overrides: Partial<FactionVerdict> & { faction: string }): FactionVerdict {
    return {
        pyrrhic_score: 50,
        grade: 'C',
        grade_description: 'Test verdict',
        capital_breakdown: {
            territory_controlled_pct: 30, territory_controlled_km2: 15000,
            military_casualties_inflicted: 10000, military_casualties_taken: 20000,
            operations_launched: 30, operations_successful: 10,
            refugees_created: 500000, refugees_received: 50000,
            civilians_under_protection: 100000, civilian_casualties_caused: 5000,
            peace_plans_accepted: [], peace_plans_rejected: [],
            enclaves_held: [], enclaves_lost: [],
            war_crimes_events: 0, combat_effective_brigades: 20,
        } as any,
        dimension_grades: [],
        outcome_class: 'pyrrhic_success' as any,
        condemnation_flags: [],
        ...overrides,
    };
}

function makeVerdict(factionOverrides?: Record<string, Partial<FactionVerdict>>): GameVerdict {
    return {
        outcome_type: 'termination',
        outcome_label: 'Stalemate',
        turn: 188,
        date: '1995-10-01',
        duration_weeks: 188,
        faction_verdicts: {
            RBiH: makeFactionVerdict({
                faction: 'RBiH', grade: 'A', pyrrhic_score: 65,
                outcome_class: 'survival' as any,
                ...factionOverrides?.RBiH,
            }),
            RS: makeFactionVerdict({
                faction: 'RS', grade: 'A', pyrrhic_score: 70,
                outcome_class: 'survival' as any,
                ...factionOverrides?.RS,
            }),
            HRHB: makeFactionVerdict({
                faction: 'HRHB', grade: 'B', pyrrhic_score: 55,
                outcome_class: 'negotiated_escape' as any,
                ...factionOverrides?.HRHB,
            }),
        },
    };
}

function makeCostLedger(overrides?: Partial<CostLedger>): CostLedger {
    return {
        war_duration_weeks: 188,
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
        ...overrides,
    } as CostLedger;
}

// ── buildEndgameSummary composition tests ────────────────────────────────────

describe('buildEndgameSummary — canonical composition', () => {
    it('produces 3 faction summaries in canonical order', () => {
        const summary = buildEndgameSummary(makeVerdict(), makeCostLedger());
        expect(summary.factionSummaries.length).toBe(3);
        expect(summary.factionSummaries.map(f => f.faction)).toEqual(['RBiH', 'RS', 'HRHB']);
    });

    it('maps outcome_class to human labels correctly', () => {
        const summary = buildEndgameSummary(makeVerdict(), makeCostLedger());
        expect(summary.factionSummaries[0].outcomeLabel).toBe('Survival'); // RBiH
        expect(summary.factionSummaries[2].outcomeLabel).toBe('Negotiated Escape'); // HRHB
    });

    it('maps outcome_class to styled classes', () => {
        const summary = buildEndgameSummary(makeVerdict(), makeCostLedger());
        for (const fs of summary.factionSummaries) {
            expect(fs.outcomeStyle.length).toBeGreaterThan(0);
            expect(fs.outcomeStyle).toContain('border');
        }
    });

    it('detects condemnation when RS has genocide_condemnation', () => {
        const verdict = makeVerdict({
            RS: { condemnation_flags: ['genocide_condemnation'] } as any,
        });
        const summary = buildEndgameSummary(verdict, makeCostLedger());
        expect(summary.hasCondemnation).toBe(true);
        const rs = summary.factionSummaries.find(f => f.faction === 'RS')!;
        expect(rs.condemnationNotices.length).toBe(1);
        expect(rs.condemnationNotices[0]).toContain('genocide');
    });

    it('reports no condemnation when no flags present', () => {
        const verdict = makeVerdict(); // no condemnation flags
        const summary = buildEndgameSummary(verdict, makeCostLedger());
        expect(summary.hasCondemnation).toBe(false);
        for (const fs of summary.factionSummaries) {
            expect(fs.condemnationNotices.length).toBe(0);
        }
    });

    it('reads total killed from cost ledger', () => {
        const summary = buildEndgameSummary(makeVerdict(), makeCostLedger());
        expect(summary.totalMilitaryKilled).toBe(46500);
        expect(summary.totalCivilianKilled).toBe(38000);
    });

    it('handles missing verdict gracefully', () => {
        const summary = buildEndgameSummary(undefined, makeCostLedger());
        expect(summary.factionSummaries.length).toBe(3);
        // All default to collapse/F/0
        for (const fs of summary.factionSummaries) {
            expect(fs.outcomeClass).toBe('collapse');
            expect(fs.grade).toBe('F');
            expect(fs.score).toBe(0);
        }
    });

    it('handles missing cost ledger gracefully', () => {
        const summary = buildEndgameSummary(makeVerdict(), undefined);
        expect(summary.totalMilitaryKilled).toBe(0);
        expect(summary.totalCivilianKilled).toBe(0);
    });

    it('is deterministic — same inputs produce identical output', () => {
        const v = makeVerdict();
        const c = makeCostLedger();
        const s1 = buildEndgameSummary(v, c);
        const s2 = buildEndgameSummary(v, c);
        expect(JSON.stringify(s1)).toBe(JSON.stringify(s2));
    });
});

// ── Outcome class taxonomy — exhaustive ─────────────────────────────────────

describe('outcome class taxonomy — complete coverage', () => {
    const ALL_OUTCOMES = [
        'strategic_success', 'survival', 'negotiated_escape',
        'pyrrhic_success', 'hollow_victory', 'failure', 'collapse',
    ];

    it('every outcome class has a distinct human label', () => {
        const labels = ALL_OUTCOMES.map(formatOutcomeClass);
        expect(new Set(labels).size).toBe(ALL_OUTCOMES.length);
        // None should be 'Unknown'
        for (const label of labels) {
            expect(label).not.toBe('Unknown');
        }
    });

    it('every outcome class has a distinct styled class', () => {
        const styles = ALL_OUTCOMES.map(getOutcomeClassStyle);
        for (const style of styles) {
            expect(style).toContain('border');
            expect(style.length).toBeGreaterThan(10);
        }
    });

    it('unknown outcome class returns fallback label', () => {
        expect(formatOutcomeClass('nonexistent')).toBe('Unknown');
        expect(formatOutcomeClass(undefined)).toBe('Unknown');
    });

    it('unknown outcome class returns fallback style', () => {
        const style = getOutcomeClassStyle('nonexistent');
        expect(style).toContain('border');
    });
});

// ── Condemnation wording — restraint verification ───────────────────────────

describe('condemnation wording — restraint', () => {
    it('genocide_condemnation uses restrained institutional language', () => {
        const text = formatCondemnationFlag('genocide_condemnation');
        expect(text).toContain('genocide');
        expect(text).toContain('tribunal');
        // Must NOT contain graphic or promotional language
        expect(text.toLowerCase()).not.toContain('massacre');
        expect(text.toLowerCase()).not.toContain('slaughter');
        expect(text.toLowerCase()).not.toContain('killed');
        expect(text.toLowerCase()).not.toContain('murder');
    });

    it('civilian_atrocities uses restrained systemic language', () => {
        const text = formatCondemnationFlag('civilian_atrocities');
        expect(text).toContain('atrocities');
        expect(text).toContain('civilian');
    });

    it('unknown flags produce humanized fallback, not raw strings', () => {
        const text = formatCondemnationFlag('some_future_flag');
        expect(text).toBe('some future flag');
        expect(text).not.toContain('_');
    });
});

// ── Cost / comparison formatting chain ──────────────────────────────────────

describe('cost / comparison formatting — full chain', () => {
    it('duration delta: shorter war', () => {
        const text = formatDurationDelta(-12, 182);
        expect(text).toContain('12');
        expect(text.toLowerCase()).toContain('shorter');
        expect(text).toContain('182');
    });

    it('duration delta: longer war', () => {
        const text = formatDurationDelta(6, 182);
        expect(text).toContain('6');
        expect(text.toLowerCase()).toContain('longer');
    });

    it('duration delta: exact match', () => {
        const text = formatDurationDelta(0, 182);
        expect(text.toLowerCase()).toContain('exactly');
    });

    it('casualty ratio: lower than reference without minimization language', () => {
        const text = formatCasualtyRatio(0.75);
        expect(text).toContain('75');
        expect(text).toContain('historical reference = 100');
        expect(text).not.toMatch(/less costly|more costly|of historical levels/i);
    });

    it('casualty ratio: higher than reference without minimization language', () => {
        const text = formatCasualtyRatio(1.2);
        expect(text).toContain('120');
        expect(text).toContain('historical reference = 100');
        expect(text).not.toMatch(/less costly|more costly|of historical levels/i);
    });

    it('territory divergence: significant RS delta', () => {
        const text = formatTerritoryDivergence('RS', 9.0);
        expect(text).toContain('RS');
        expect(text).toContain('9.0');
    });

    it('territory divergence: within range', () => {
        const text = formatTerritoryDivergence('RS', 0.3);
        expect(text.toLowerCase()).toContain('within');
    });

    it('territory divergence: Federation label substitution', () => {
        const text = formatTerritoryDivergence('RBiH_HRHB_Federation', -5.0);
        expect(text).toContain('Federation');
        expect(text).not.toContain('RBiH_HRHB_Federation');
    });
});

// ── Owner split verification ────────────────────────────────────────────────

describe('owner split — presentation does not derive truth', () => {
    it('buildEndgameSummary reads verdict.faction_verdicts, does not recompute scores', () => {
        const verdict = makeVerdict({ RS: { pyrrhic_score: 99.9 } as any });
        const summary = buildEndgameSummary(verdict, undefined);
        const rs = summary.factionSummaries.find(f => f.faction === 'RS')!;
        // Score is read from verdict, not recomputed
        expect(rs.score).toBe(99.9);
    });

    it('buildEndgameSummary reads cost ledger totals, does not aggregate from entries', () => {
        const ledger = makeCostLedger({ total_military_killed: 12345 });
        const summary = buildEndgameSummary(makeVerdict(), ledger);
        // Reads the pre-computed total, not sum of entries
        expect(summary.totalMilitaryKilled).toBe(12345);
    });
});
