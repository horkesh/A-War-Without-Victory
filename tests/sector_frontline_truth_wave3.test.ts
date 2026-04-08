/**
 * Sector Frontline Truth — Wave 3 regression tests.
 *
 * Covers activity/reporting truth alignment:
 * A. Proxy-fork observability: displacement triggers emit a console.warn when
 *    hasLiveSectorFrontlineTruth() is false in an operational-context run.
 *    Settlement-only compatibility runs stay quiet.
 * B. Zero-activity integrity: deriveWeeklyActivityCounts returns explicit zeros
 *    (not undefined) when phase_f_displacement trigger_report is absent.
 * C. Activity summary fidelity: computeActivitySummary aggregates weekly counts
 *    correctly (sum→mean, max, nonzero_weeks).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { evaluateDisplacementTriggers } from '../src/sim/displacement_pipeline/displacement_triggers.js';
import { deriveWeeklyActivityCounts } from '../src/scenario/scenario_runner.js';
import { computeActivitySummary } from '../src/scenario/scenario_end_report.js';
import type { GameState, FactionId } from '../src/state/game_state.js';
import type { WeeklyActivityCounts } from '../src/scenario/scenario_reporting.js';
import type { TurnReport } from '../src/sim/turn_pipeline_types.js';

// ── Fixture helpers ────────────────────────────────────────────────────────────

/** Minimal war-phase GameState with empty corps_front_sectors (no sector truth). */
function makeStateNoSectors(withActiveBrigade = false): GameState {
    const formations = withActiveBrigade
        ? {
            'brig_test': {
                id: 'brig_test',
                name: 'brig_test',
                faction: 'RS' as FactionId,
                kind: 'brigade',
                status: 'active',
                personnel: 1000,
                corps_id: 'vrs_drina',
                location_osid: 'op:mun:test',
            },
        }
        : {};
    return {
        meta: { turn: 3, phase: 'war', seed: 'wave3-test' },
        factions: [
            { id: 'RBiH' as FactionId },
            { id: 'RS' as FactionId },
            { id: 'HRHB' as FactionId },
        ],
        military: {
            formations,
            corps_front_sectors: {}, // empty — hasLiveSectorFrontlineTruth() returns false
        },
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 100, RS: 80, HRHB: 50 },
            war_supply_pressure: {},
        },
        displacement: {
            settlement_displacement: {},
            municipality_displacement: {},
        },
    } as unknown as GameState;
}

/** Minimal TurnReport with no phase_f_displacement section. */
function makeTurnReportNoDisplacement(): Pick<
    Partial<TurnReport>,
    'phase_f_displacement' | 'front_pressure' | 'displacement'
> {
    return {};
}

// ── Test A — Proxy fork is observable (P0) ────────────────────────────────────

describe('Wave 3 Test A: displacement triggers proxy path observability', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('displacement triggers: proxy path emits diagnostic warning when sectors unavailable in operational-context runs', () => {
        const state = makeStateNoSectors(true);
        const edges: import('../src/map/settlements.js').EdgeRecord[] = [];

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        evaluateDisplacementTriggers(state, edges, { sid_a: 'op:mun:a' });

        expect(warnSpy).toHaveBeenCalled();
        const calls = warnSpy.mock.calls;
        const allMessages = calls.map((c) => String(c[0])).join('\n');
        expect(allMessages).toMatch(
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i
        );
    });

    it('displacement triggers: settlement-only compatibility path stays quiet when sectors are unavailable', () => {
        const state = makeStateNoSectors();
        const edges: import('../src/map/settlements.js').EdgeRecord[] = [];

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        evaluateDisplacementTriggers(state, edges, undefined);

        const legacyWarnings = warnSpy.mock.calls.filter((c) =>
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i.test(String(c[0]))
        );
        expect(legacyWarnings).toHaveLength(0);
    });

    it('displacement triggers: canonical path does NOT emit a warning when sectors are present', () => {
        // State with at least one live sector edge → canonical path chosen → no warn
        const state = makeStateNoSectors();
        // Inject a live sector with one edge to satisfy hasLiveSectorFrontlineTruth
        (state.military.corps_front_sectors as Record<string, unknown>)['sector:vrs_drina:0'] = {
            sector_id: 'sector:vrs_drina:0',
            corps_id: 'vrs_drina',
            faction: 'RS',
            edge_ids: ['op:m:a||op:m:b'],
            sub_segments: [],
            territory_osids: ['op:m:a'],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
            density: 0,
            threat_ratio: 0,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
            opposing_factions: [],
        };

        const edges: import('../src/map/settlements.js').EdgeRecord[] = [];
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        evaluateDisplacementTriggers(state, edges, undefined);

        // warn must not have been called about the legacy fallback
        const calls = warnSpy.mock.calls;
        const legacyWarnings = calls.filter((c) =>
            /legacy.*fallback|proxy.*path|hasLiveSectorFrontlineTruth.*false/i.test(String(c[0]))
        );
        expect(legacyWarnings).toHaveLength(0);
    });
});

// ── Test B — Zero activity integrity (P0) ─────────────────────────────────────

describe('Wave 3 Test B: deriveWeeklyActivityCounts zero-fill when trigger_report absent', () => {
    it('returns explicit zeros when turnReport has no phase_f_displacement', () => {
        const state = makeStateNoSectors();
        const turnReport = makeTurnReportNoDisplacement();

        const result = deriveWeeklyActivityCounts(state, turnReport);

        expect(result).toEqual({
            front_active_set_size: 0,
            pressure_eligible_size: 0,
            displacement_trigger_eligible_size: 0,
        });
        // Explicit number check — must be 0, not undefined
        expect(typeof result.front_active_set_size).toBe('number');
        expect(typeof result.pressure_eligible_size).toBe('number');
        expect(typeof result.displacement_trigger_eligible_size).toBe('number');
    });

    it('returns canonical values when trigger_report is present (regression guard)', () => {
        const state = makeStateNoSectors();
        const turnReport = {
            phase_f_displacement: {
                trigger_report: {
                    triggered_settlements: ['s1', 's2', 's3'],
                    deltas: {},
                    reasons: {},
                    front_active_set_size: 12,
                    pressure_eligible_size: 7,
                    displacement_trigger_eligible_size: 12,
                },
            },
        } as unknown as TurnReport;

        const result = deriveWeeklyActivityCounts(state, turnReport);

        expect(result.front_active_set_size).toBe(12);
        expect(result.pressure_eligible_size).toBe(7);
        expect(result.displacement_trigger_eligible_size).toBe(12);
    });
});

// ── Test C — Activity summary stats fidelity (P1) ─────────────────────────────

describe('Wave 3 Test C: computeActivitySummary aggregation correctness', () => {
    it('aggregates weekly counts correctly with min/max/mean/nonzero_weeks', () => {
        const weeks: WeeklyActivityCounts[] = [
            { front_active_set_size: 10, pressure_eligible_size: 5,  displacement_trigger_eligible_size: 2 },
            { front_active_set_size: 0,  pressure_eligible_size: 0,  displacement_trigger_eligible_size: 0 },
            { front_active_set_size: 20, pressure_eligible_size: 8,  displacement_trigger_eligible_size: 4 },
            { front_active_set_size: 15, pressure_eligible_size: 6,  displacement_trigger_eligible_size: 3 },
        ];

        const summary = computeActivitySummary(weeks);

        expect(summary.weeks).toBe(4);

        // front_active_set_size: values [10, 0, 20, 15], sum=45, mean=11.25, max=20, nonzero=3
        expect(summary.metrics.front_active_set_size.max).toBe(20);
        expect(summary.metrics.front_active_set_size.min).toBe(0);
        expect(summary.metrics.front_active_set_size.mean).toBeCloseTo(11.25, 5);
        expect(summary.metrics.front_active_set_size.nonzero_weeks).toBe(3);

        // pressure_eligible_size: values [5, 0, 8, 6], sum=19, mean=4.75, max=8, nonzero=3
        const pres = summary.metrics.pressure_eligible_size;
        expect(pres).not.toBeNull();
        expect(pres!.max).toBe(8);
        expect(pres!.min).toBe(0);
        expect(pres!.mean).toBeCloseTo(4.75, 5);
        expect(pres!.nonzero_weeks).toBe(3);

        // displacement_trigger_eligible_size: values [2, 0, 4, 3], sum=9, mean=2.25, max=4, nonzero=3
        const disp = summary.metrics.displacement_trigger_eligible_size;
        expect(disp).not.toBeNull();
        expect(disp!.max).toBe(4);
        expect(disp!.min).toBe(0);
        expect(disp!.mean).toBeCloseTo(2.25, 5);
        expect(disp!.nonzero_weeks).toBe(3);
    });

    it('returns all-zero stats for empty week list', () => {
        const summary = computeActivitySummary([]);

        expect(summary.weeks).toBe(0);
        expect(summary.metrics.front_active_set_size).toEqual({
            min: 0, max: 0, mean: 0, nonzero_weeks: 0,
        });
    });

    it('correctly identifies a single all-zero week as 0 nonzero_weeks', () => {
        const summary = computeActivitySummary([
            { front_active_set_size: 0, pressure_eligible_size: 0, displacement_trigger_eligible_size: 0 },
        ]);

        expect(summary.metrics.front_active_set_size.nonzero_weeks).toBe(0);
        expect(summary.metrics.front_active_set_size.max).toBe(0);
    });
});
