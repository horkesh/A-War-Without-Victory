/**
 * Free War Phase 5, Slice 1 — THE ETHICS BRIGHT LINE as a tested invariant.
 *
 * Non-negotiable design law (design doc §8): *atrocity must NEVER produce a
 * better end-state.* Even when ethnic cleansing grants MORE held territory, the
 * cleansing path must score NO BETTER than the restrained path — its verdict
 * grade must be no higher and its outcome class must not be "better."
 *
 * This file constructs two otherwise-identical END-STATES that differ ONLY by
 * atrocity, and asserts the cleansing variant is capped strictly worse. It is
 * the executable form of the bright line: the territory cleansing buys is
 * NET-NEGATIVE at the verdict.
 *
 * Mechanism under test: the emergent-gated atrocity term in computeWarCostIndex
 * (src/sim/negotiation/scoring.ts) — war_crimes_events + refugees_created +
 * civilian_casualties_caused raise the war-cost index, which lowers the grade
 * cap below any territory-driven gain. Emergent mode only.
 *
 * Deterministic: pure arithmetic over persisted state. No randomness.
 */

import { describe, it, expect } from 'vitest';
import { computeFactionVerdict } from '../src/sim/negotiation/scoring.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../src/state/negotiation_types.js';
import type { NegotiationBreakdown, OutcomeClass } from '../src/state/negotiation_types.js';
import type { GameState } from '../src/state/game_state.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

// ── grade / outcome ranking (best → worst; index = severity, 0 = best) ────────

// Mirrors GRADE_RANK in scoring.ts (kept local so the test pins the contract).
const GRADE_RANK: readonly string[] = ['A+', 'A', 'B', 'C', 'D', 'F'];
function gradeRank(grade: string): number {
    const i = GRADE_RANK.indexOf(grade);
    return i === -1 ? GRADE_RANK.length - 1 : i;
}

// Outcome classes ranked best → worst. Used to assert the cleansing variant's
// outcome is not "better" (lower severity index) than the restrained variant.
const OUTCOME_RANK: readonly OutcomeClass[] = [
    'strategic_success',
    'survival',
    'negotiated_escape',
    'pyrrhic_success',
    'hollow_victory',
    'failure',
    'collapse',
];
function outcomeRank(o: OutcomeClass): number {
    const i = OUTCOME_RANK.indexOf(o);
    return i === -1 ? OUTCOME_RANK.length - 1 : i;
}

// ── state builder (mirrors free_war_verdict_cost_floor.test.ts) ───────────────

function makeBreakdown(overrides: Partial<NegotiationBreakdown> = {}): NegotiationBreakdown {
    return { ...createEmptyCapital(), ...overrides };
}

interface CostInputs {
    turn?: number;
    decision_mode?: 'historical' | 'emergent';
    exhaustion?: Partial<Record<string, number>>;
    casualties?: Partial<Record<string, { killed?: number; wounded?: number; missing_captured?: number }>>;
}

function makeVerdictState(
    factionBreakdowns: Record<string, Partial<NegotiationBreakdown>>,
    cost: CostInputs = {},
): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, any> = {};
    const casualty_ledger: Record<string, any> = {};
    for (const fid of ['RBiH', 'RS', 'HRHB']) {
        capital[fid] = makeBreakdown(factionBreakdowns[fid] ?? {});
        patron_relationships[fid] = createDefaultPatronRelationship(fid);
        const c = cost.casualties?.[fid] ?? {};
        casualty_ledger[fid] = {
            killed: c.killed ?? 0,
            wounded: c.wounded ?? 0,
            missing_captured: c.missing_captured ?? 0,
            equipment_lost: { tanks: 0, artillery: 0, aa_systems: 0 },
            per_formation: {},
        };
    }
    return {
        meta: {
            turn: cost.turn ?? 40,
            phase: 'war',
            seed: 1,
            date: '1995-01-15',
            decision_mode: cost.decision_mode ?? 'emergent',
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            casualty_ledger,
            negotiation: {
                capital,
                patron_relationships,
                peace_plan_history: [],
                strategic_dimensions: initializeStrategicDimensions(),
            },
        },
        political: {
            political_controllers: {},
            war_exhaustion: { RBiH: 0, RS: 0, HRHB: 0, ...(cost.exhaustion ?? {}) },
        },
        displacement: {},
    } as unknown as GameState;
}

// ── The two end-states: identical EXCEPT atrocity (and the territory it buys) ──
//
// Both are RS, EMERGENT mode, short & cheap war (so base war-cost is low — the
// ONLY thing that can move the grade is the atrocity term). The cleansing
// variant has MORE territory AND war crimes + refugees + civilian casualties.

const SHARED_COST: CostInputs = {
    decision_mode: 'emergent',
    turn: 8,
    exhaustion: { RS: 500 },
    casualties: { RS: { killed: 200 } },
};

// Restrained: territory T = 55%, ZERO atrocity.
function restrainedState(): GameState {
    return makeVerdictState(
        {
            RS: {
                territory_controlled_pct: 55,
                war_crimes_events: 0,
                refugees_created: 0,
                civilian_casualties_caused: 0,
            },
        },
        SHARED_COST,
    );
}

// Cleansing: MORE territory (T + ΔT = 58%, because cleansing grants held area)
// AND atrocity (war crimes + higher refugees + higher civilian casualties).
function cleansingState(): GameState {
    return makeVerdictState(
        {
            RS: {
                territory_controlled_pct: 58, // strictly MORE than the restrained 55
                war_crimes_events: 3,
                refugees_created: 50000,
                civilian_casualties_caused: 5000,
            },
        },
        SHARED_COST,
    );
}

describe('Free War — ethics bright line: atrocity never yields a better end-state', () => {
    it('the cleansing variant holds MORE territory than the restrained variant', () => {
        // Sanity: the only "incentive" for cleansing is the extra territory.
        const restrained = restrainedState();
        const cleansing = cleansingState();
        const tR = restrained.military!.negotiation!.capital.RS.territory_controlled_pct;
        const tC = cleansing.military!.negotiation!.capital.RS.territory_controlled_pct;
        expect(tC).toBeGreaterThan(tR);
    });

    it('the cleansing variant grade is NO BETTER than the restrained variant', () => {
        const restrained = computeFactionVerdict(restrainedState(), 'RS');
        const cleansing = computeFactionVerdict(cleansingState(), 'RS');
        // Higher rank index = worse. Cleansing must be ≥ restrained (no better).
        expect(gradeRank(cleansing.grade)).toBeGreaterThanOrEqual(gradeRank(restrained.grade));
    });

    it('the cleansing variant outcome_class is NOT better than the restrained one', () => {
        const restrained = computeFactionVerdict(restrainedState(), 'RS');
        const cleansing = computeFactionVerdict(cleansingState(), 'RS');
        // e.g. cleansing must NOT be strategic_success while restrained is lower.
        expect(outcomeRank(cleansing.outcome_class)).toBeGreaterThanOrEqual(
            outcomeRank(restrained.outcome_class),
        );
        expect(cleansing.outcome_class).not.toBe('strategic_success');
    });

    it('the extra territory cleansing buys is NET-NEGATIVE: cleansing scores strictly WORSE', () => {
        // The strong form of the bright line: despite MORE territory, the
        // cleansing path lands a strictly worse grade than restraint.
        const restrained = computeFactionVerdict(restrainedState(), 'RS');
        const cleansing = computeFactionVerdict(cleansingState(), 'RS');
        expect(gradeRank(cleansing.grade)).toBeGreaterThan(gradeRank(restrained.grade));
    });

    it('a high-cleansing run can NEVER read as strategic_success', () => {
        // Even with maximal territory, heavy cleansing cannot buy the top result.
        const state = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 75, // far above any A+ territory anchor
                    war_crimes_events: 5,
                    refugees_created: 120000,
                    civilian_casualties_caused: 12000,
                },
            },
            SHARED_COST,
        );
        const verdict = computeFactionVerdict(state, 'RS');
        expect(verdict.grade).not.toBe('A+');
        expect(verdict.outcome_class).not.toBe('strategic_success');
    });

    it('terminal-turn: atrocity harm in the FRESH displacement source is counted even when capital is STALE', () => {
        // Codex P2: on a run that TERMINATES inside warPhaseNegotiationSteps, the
        // verdict snapshot is frozen in check-victory-conditions BEFORE the later
        // compute-negotiation-capital step copies displacement aggregates onto
        // negotiation.capital. So a faction can append displacement/civilian harm
        // EARLIER in the terminal turn that the stale capital snapshot omits.
        //
        // Build exactly that: capital shows refugees_created=0 / civilian=0 (stale
        // freeze), but the FRESH displacement aggregates record the cleansing.
        // war_crimes_events stays on capital (recordWarCrime increments it in place,
        // so it is already fresh). The atrocity penalty MUST still apply.
        const state = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 58, // the territory cleansing bought
                    war_crimes_events: 3,         // fresh on capital (in-place increment)
                    refugees_created: 0,          // STALE — capital frozen pre-refresh
                    civilian_casualties_caused: 0, // STALE — capital frozen pre-refresh
                },
            },
            SHARED_COST,
        );
        // Inject the FRESH displacement aggregates the terminal-turn freeze missed.
        (state as unknown as { displacement: { displacement_humanitarian_aggregates: Record<string, Record<string, { refugees_created: number; refugees_received: number; civilian_casualties_caused: number }>> } }).displacement.displacement_humanitarian_aggregates = {
            RS: {
                // split across two ethnicity buckets to exercise the summation
                RBiH: { refugees_created: 30000, refugees_received: 0, civilian_casualties_caused: 3000 },
                HRHB: { refugees_created: 20000, refugees_received: 0, civilian_casualties_caused: 2000 },
            },
        };

        const terminal = computeFactionVerdict(state, 'RS');
        // Same cleansing magnitude as cleansingState() but sourced from displacement.
        const cleansing = computeFactionVerdict(cleansingState(), 'RS');
        const restrained = computeFactionVerdict(restrainedState(), 'RS');

        // The bright line holds despite the stale capital: terminal grade is capped
        // strictly worse than restraint, and matches the capital-fresh cleansing grade.
        expect(gradeRank(terminal.grade)).toBeGreaterThan(gradeRank(restrained.grade));
        expect(terminal.grade).toBe(cleansing.grade);
        expect(terminal.outcome_class).not.toBe('strategic_success');
    });

    it('terminal-turn DISPLAY: the breakdown shows the FRESH atrocity facts, not the stale capital snapshot (Codex P2 on #96)', () => {
        // The grade reads max(capital, fresh); the DISPLAYED breakdown must read
        // the same source, or the verdict shows a fresh-derived grade next to
        // stale (pre-refresh) numbers — internally inconsistent. Build the stale
        // capital + fresh displacement aggregates and assert the breakdown is
        // raised to the fresh totals (30000+20000 refugees, 3000+2000 civilian).
        const state = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 58,
                    war_crimes_events: 3,          // fresh on capital (in-place increment)
                    refugees_created: 0,           // STALE — capital frozen pre-refresh
                    civilian_casualties_caused: 0, // STALE — capital frozen pre-refresh
                },
            },
            SHARED_COST,
        );
        (state as unknown as { displacement: { displacement_humanitarian_aggregates: Record<string, Record<string, { refugees_created: number; refugees_received: number; civilian_casualties_caused: number }>> } }).displacement.displacement_humanitarian_aggregates = {
            RS: {
                RBiH: { refugees_created: 30000, refugees_received: 0, civilian_casualties_caused: 3000 },
                HRHB: { refugees_created: 20000, refugees_received: 0, civilian_casualties_caused: 2000 },
            },
        };

        const verdict = computeFactionVerdict(state, 'RS');
        // Displayed facts now match the fresh source the grade was capped with.
        expect(verdict.capital_breakdown?.refugees_created).toBe(50000);
        expect(verdict.capital_breakdown?.civilian_casualties_caused).toBe(5000);
        // war_crimes_events is already fresh on capital — left untouched.
        expect(verdict.capital_breakdown?.war_crimes_events).toBe(3);
    });

    it('display freshness is EMERGENT-GATED: in historical mode the breakdown keeps the raw capital snapshot', () => {
        // The atrocity term (and its display correction) is emergent-only. In
        // historical mode the displayed breakdown must be the UNCHANGED capital
        // snapshot, so the byte-identical 52w baseline is preserved by construction.
        const state = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 58,
                    war_crimes_events: 3,
                    refugees_created: 0,
                    civilian_casualties_caused: 0,
                },
            },
            { ...SHARED_COST, decision_mode: 'historical' },
        );
        (state as unknown as { displacement: { displacement_humanitarian_aggregates: Record<string, Record<string, { refugees_created: number; refugees_received: number; civilian_casualties_caused: number }>> } }).displacement.displacement_humanitarian_aggregates = {
            RS: {
                RBiH: { refugees_created: 30000, refugees_received: 0, civilian_casualties_caused: 3000 },
            },
        };

        const verdict = computeFactionVerdict(state, 'RS');
        // Historical mode: displayed breakdown stays the raw (stale=0) snapshot.
        expect(verdict.capital_breakdown?.refugees_created).toBe(0);
        expect(verdict.capital_breakdown?.civilian_casualties_caused).toBe(0);
    });

    it('emergent gating: the SAME cleansing end-state in HISTORICAL mode is NOT atrocity-capped', () => {
        // Proves the term is emergent-gated. In historical mode the atrocity
        // fields do not raise the cost index, so the cleansing state keeps its
        // territory-earned grade — guaranteeing the 52w baseline is unaffected.
        const histCleansing = computeFactionVerdict(
            makeVerdictState(
                {
                    RS: {
                        territory_controlled_pct: 58,
                        war_crimes_events: 3,
                        refugees_created: 50000,
                        civilian_casualties_caused: 5000,
                    },
                },
                { ...SHARED_COST, decision_mode: 'historical' },
            ),
            'RS',
        );
        const emergentCleansing = computeFactionVerdict(cleansingState(), 'RS');
        // Historical keeps the high grade; emergent is capped strictly worse.
        expect(gradeRank(emergentCleansing.grade)).toBeGreaterThan(gradeRank(histCleansing.grade));
    });
});
