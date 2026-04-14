/**
 * Direct render proof for verdict / condemnation / cost ledger surfaces.
 *
 * These tests exercise the canonical display helpers with realistic data
 * matching the actual type contracts from the engine. Fixtures are
 * derived from real n1575 scenario field shapes.
 *
 * Proof classification: DIRECT RENDER PROOF
 * - Helpers tested with contract-realistic data (not synthetic minimums)
 * - Fixtures match actual NegotiationBreakdown / FactionVerdict / CostLedger shapes
 * - No React component mounting (no @testing-library/react available)
 * - Adapter integration tested via buildCostLedger / compareToHistorical calls
 */

import { describe, it, expect } from 'vitest';
import {
    formatOutcomeClass,
    getOutcomeClassStyle,
    formatCondemnationFlag,
} from '../../src/ui/map/components/VerdictScreen';
import {
    formatDurationDelta,
    formatCasualtyRatio,
    formatTerritoryDivergence,
} from '../../src/ui/map/components/WarCostSummary';
import { buildCostLedger } from '../../src/sim/endgame/cost_ledger';
import { compareToHistorical } from '../../src/sim/endgame/endgame_comparison';
import { classifyOutcome } from '../../src/sim/negotiation/scoring';
import { collectCondemnationFlags } from '../../src/sim/negotiation/rupture_consequences';
import type { GameState } from '../../src/state/game_state';
import type { NegotiationBreakdown } from '../../src/state/negotiation_types';

// ── Realistic fixture derived from n1575 scenario field shapes ─────────────

/** GameState fixture at turn 170 with Srebrenica fallen and rupture recorded. */
function buildEndgameFixture(): GameState {
    return {
        meta: {
            turn: 170,
            phase: 'war',
            scenario_id: 'render_proof_fixture',
            game_over: true,
            outcome: 'timeout_stalemate',
        },
        political: {
            political_controllers: {
                'op:srebrenica:srebrenica_2': 'RS',
                'op:gorazde:gorazde_2': 'RBiH',
                'op:bihac:bihac_2': 'RBiH',
            },
        },
        military: {
            formations: {},
            casualty_ledger: {
                RBiH: { killed: 31000, wounded: 45000, missing_captured: 15000 },
                RS: { killed: 12000, wounded: 22000, missing_captured: 8000 },
                HRHB: { killed: 3500, wounded: 6000, missing_captured: 2000 },
            },
            event_flags: { srebrenica_enclave_formed: true },
            negotiation: {
                capital: {
                    RBiH: {
                        territory_controlled_pct: 28, territory_controlled_km2: 14500,
                        military_casualties_inflicted: 15000, military_casualties_taken: 91000,
                        operations_launched: 80, operations_successful: 25,
                        refugees_created: 1200000, refugees_received: 200000,
                        civilians_under_protection: 300000, civilian_casualties_caused: 2000,
                        peace_plans_accepted: ['vance_owen'], peace_plans_rejected: [],
                        enclaves_held: ['sarajevo', 'gorazde', 'bihac'], enclaves_lost: ['srebrenica', 'zepa'],
                        war_crimes_events: 5, combat_effective_brigades: 25,
                    },
                    RS: {
                        territory_controlled_pct: 58, territory_controlled_km2: 30000,
                        military_casualties_inflicted: 91000, military_casualties_taken: 42000,
                        operations_launched: 120, operations_successful: 70,
                        refugees_created: 600000, refugees_received: 80000,
                        civilians_under_protection: 150000, civilian_casualties_caused: 45000,
                        peace_plans_accepted: [], peace_plans_rejected: ['vance_owen', 'contact_group'],
                        enclaves_held: [], enclaves_lost: [],
                        war_crimes_events: 35, combat_effective_brigades: 35,
                    },
                    HRHB: {
                        territory_controlled_pct: 14, territory_controlled_km2: 7000,
                        military_casualties_inflicted: 4000, military_casualties_taken: 11500,
                        operations_launched: 25, operations_successful: 8,
                        refugees_created: 150000, refugees_received: 40000,
                        civilians_under_protection: 60000, civilian_casualties_caused: 1500,
                        peace_plans_accepted: ['vance_owen'], peace_plans_rejected: [],
                        enclaves_held: [], enclaves_lost: [],
                        war_crimes_events: 3, combat_effective_brigades: 8,
                    },
                },
                rupture_consequences: [
                    {
                        id: 'srebrenica_genocide_1995',
                        recorded_turn: 168,
                        perpetrator_faction: 'RS',
                        description: 'Fall of the Srebrenica safe area and subsequent genocide of Bosniak men and boys',
                        condemnation_flag: 'genocide_condemnation',
                    },
                ],
                patron_relationships: {
                    RBiH: { support_level: 35, override_authority: 25, sanctions_active: false, relationship_events: [] },
                    RS: { support_level: 10, override_authority: 85, sanctions_active: true, relationship_events: [] },
                    HRHB: { support_level: 50, override_authority: 55, sanctions_active: false, relationship_events: [] },
                },
            },
            war_exhaustion: { RBiH: 500, RS: 700, HRHB: 550 },
        },
        displacement: {
            displacement_event_log: [],
            displacement_state: {},
        },
    } as unknown as GameState;
}

// ── Seam C: Verdict and condemnation rendering with realistic data ──────────

describe('verdict render proof — realistic fixtures', () => {
    const state = buildEndgameFixture();

    it('collectCondemnationFlags returns genocide_condemnation for RS from rupture_consequences', () => {
        const flags = collectCondemnationFlags(state, 'RS');
        expect(flags).toEqual(['genocide_condemnation']);
    });

    it('collectCondemnationFlags returns empty for RBiH (not perpetrator)', () => {
        const flags = collectCondemnationFlags(state, 'RBiH');
        expect(flags).toEqual([]);
    });

    it('classifyOutcome returns failure for RS with genocide_condemnation', () => {
        const rsCapital = state.military.negotiation!.capital!.RS as NegotiationBreakdown;
        const flags = collectCondemnationFlags(state, 'RS');
        const result = classifyOutcome('RS', rsCapital, undefined, 'A', 75, flags);
        expect(result).toBe('failure');
    });

    it('classifyOutcome returns survival for RBiH with no condemnation', () => {
        const rbihCapital = state.military.negotiation!.capital!.RBiH as NegotiationBreakdown;
        const flags = collectCondemnationFlags(state, 'RBiH');
        const result = classifyOutcome('RBiH', rbihCapital, undefined, 'A', 65, flags);
        expect(result).toBe('survival');
    });

    it('formatOutcomeClass renders failure label for condemned faction', () => {
        expect(formatOutcomeClass('failure')).toBe('Failure');
    });

    it('formatCondemnationFlag renders restrained genocide wording', () => {
        const text = formatCondemnationFlag('genocide_condemnation');
        expect(text).toContain('genocide');
        expect(text).toContain('tribunal');
        // Verify wording is restrained — no graphic language
        expect(text).not.toContain('massacre');
        expect(text).not.toContain('killed');
    });

    it('getOutcomeClassStyle returns styled classes for all outcome types', () => {
        const outcomes = ['strategic_success', 'survival', 'negotiated_escape',
                          'pyrrhic_success', 'hollow_victory', 'failure', 'collapse'];
        for (const oc of outcomes) {
            const style = getOutcomeClassStyle(oc);
            expect(style.length).toBeGreaterThan(0);
            expect(style).toContain('border');
        }
    });
});

// ── Seam D: Cost ledger / comparison rendering with realistic data ──────────

describe('cost ledger render proof — realistic fixtures', () => {
    const state = buildEndgameFixture();

    it('buildCostLedger produces entries for all three factions', () => {
        const ledger = buildCostLedger(state);
        expect(ledger.entries.length).toBe(3);
        const factions = ledger.entries.map(e => e.faction).sort();
        expect(factions).toEqual(['HRHB', 'RBiH', 'RS']);
    });

    it('buildCostLedger includes rupture consequences', () => {
        const ledger = buildCostLedger(state);
        expect(ledger.rupture_consequences.length).toBe(1);
        expect(ledger.rupture_consequences[0].id).toBe('srebrenica_genocide_1995');
    });

    it('buildCostLedger reads military killed from casualty ledger', () => {
        const ledger = buildCostLedger(state);
        const rs = ledger.entries.find(e => e.faction === 'RS');
        expect(rs).toBeDefined();
        expect(rs!.military_killed).toBe(12000);
    });

    it('compareToHistorical computes realistic duration delta', () => {
        const ledger = buildCostLedger(state);
        const baseline = {
            war_duration_weeks: 182, territory_final: { RS: 49, RBiH_HRHB_Federation: 51 },
            total_killed: 97207, military_killed: { RBiH: 31270, RS: 21173, HRHB: 7788 },
            civilian_killed: 38476, total_displaced: 2200000, srebrenica_killed: 8372,
            source_notes: 'test fixture',
        };
        const comparison = compareToHistorical(ledger, baseline);
        // Turn 170 vs historical 182 weeks
        expect(comparison.duration_delta_weeks).toBe(170 - 182);
    });

    it('compareToHistorical includes Srebrenica rupture in divergence', () => {
        const ledger = buildCostLedger(state);
        const baseline = {
            war_duration_weeks: 182, territory_final: { RS: 49, RBiH_HRHB_Federation: 51 },
            total_killed: 97207, military_killed: { RBiH: 31270, RS: 21173, HRHB: 7788 },
            civilian_killed: 38476, total_displaced: 2200000, srebrenica_killed: 8372,
            source_notes: 'test fixture',
        };
        const comparison = compareToHistorical(ledger, baseline);
        const srebrenicaNote = comparison.divergence_notes.find(n =>
            n.toLowerCase().includes('srebrenica'));
        expect(srebrenicaNote).toBeDefined();
    });

    it('formatDurationDelta renders readable text for negative delta', () => {
        const text = formatDurationDelta(-12, 182);
        expect(text).toContain('12');
        expect(text.toLowerCase()).toContain('shorter');
    });

    it('formatCasualtyRatio renders readable text', () => {
        const text = formatCasualtyRatio(0.85);
        expect(text).toContain('85');
    });

    it('formatTerritoryDivergence renders faction and delta', () => {
        const text = formatTerritoryDivergence('RS', 9.0);
        expect(text).toContain('RS');
        expect(text).toContain('9');
    });
});
