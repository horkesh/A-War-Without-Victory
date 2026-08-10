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
                war_crimes_events_emergent: 3, // authorized in-war paramilitary sweeps (the §2a flag's clean signal)
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

    it('EMERGENT non-genocide mass-atrocity sets the §3.4 flag and forces hollow_victory (atrocity grade-DECISIVE)', () => {
        const restrained = computeFactionVerdict(restrainedState(), 'RS');
        const cleansing = computeFactionVerdict(cleansingState(), 'RS');
        // The new non-genocide condemnation tier: significant atrocity sets the flag,
        const cleansing2 = cleansing.condemnation_flags;
        expect(cleansing2).toContain('authorized_cleansing_condemnation');
        expect(restrained.condemnation_flags).not.toContain('authorized_cleansing_condemnation');
        // which taints the outcome to hollow_victory even in a short/cheap war where the
        // additive cost term is inert — so atrocity is decisive at the outcome-class level,
        expect(cleansing.outcome_class).toBe('hollow_victory');
        // and the restrained (atrocity-free) variant reads as a strictly cleaner class.
        expect(outcomeRank(restrained.outcome_class)).toBeLessThan(outcomeRank(cleansing.outcome_class));
    });

    it('SIEGE alone (large refugees/civilians, ZERO emergent war crimes) does NOT trip the mass-atrocity flag', () => {
        // Red-team fix: the flag keys on authorized war crimes (war_crimes_events_emergent),
        // not the refugee+civilian legs — so legitimate years-long siege attrition (Sarajevo,
        // Bihać) is not mislabeled "mass atrocity". Under the OLD blended atrocitySubScore this
        // 60k/6k would have hit 0.5 and tripped the flag.
        const siege = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 55,
                    war_crimes_events: 0,
                    war_crimes_events_emergent: 0,
                    refugees_created: 60000,
                    civilian_casualties_caused: 6000,
                },
            },
            SHARED_COST,
        );
        const v = computeFactionVerdict(siege, 'RS');
        expect(v.condemnation_flags).not.toContain('authorized_cleansing_condemnation');
        expect(v.outcome_class).not.toBe('hollow_victory');
    });

    it('CATASTROPHIC siege/encirclement civilian harm (≥15000 caused, ZERO war crimes) DOES trip the flag', () => {
        // Union gate #2 (red-team item-4 fix): a faction inflicting catastrophic multi-city
        // civilian harm via siege/encirclement — invisible to recordWarCrime — is still
        // condemned. 20,000 > the 15,000 catastrophic threshold (a lone Sarajevo-scale siege
        // ~3,500-5,500 stays under; RS-scale ~27,541 is over).
        const catastrophic = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 58,
                    war_crimes_events: 0,
                    war_crimes_events_emergent: 0,
                    refugees_created: 800000,
                    civilian_casualties_caused: 20000,
                },
            },
            SHARED_COST,
        );
        const v = computeFactionVerdict(catastrophic, 'RS');
        expect(v.condemnation_flags).toContain('authorized_cleansing_condemnation');
        expect(v.outcome_class).toBe('hollow_victory');
    });

    it('STALENESS: fresh terminal-turn siege harm ≥15k (capital snapshot still 0) still trips the flag', () => {
        // Red-team staleness condition: the flag reads the FRESHENED displacement aggregate
        // (displayBreakdown), not the raw capital snapshot — so a catastrophic siege crossing
        // 15k on the terminal turn, before capital refreshes, is not missed.
        const state = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 58,
                    war_crimes_events: 0,
                    war_crimes_events_emergent: 0,
                    civilian_casualties_caused: 0, // STALE capital snapshot
                },
            },
            SHARED_COST,
        );
        // Fresh displacement aggregate above threshold while capital stays 0 (the race).
        (state as unknown as { displacement: unknown }).displacement = {
            displacement_humanitarian_aggregates: {
                RS: { bosniak: { refugees_created: 500000, civilian_casualties_caused: 20000 } },
            },
        };
        const v = computeFactionVerdict(state, 'RS');
        expect(v.condemnation_flags).toContain('authorized_cleansing_condemnation');
        expect(v.outcome_class).toBe('hollow_victory');
    });

    it('GENOCIDE PRECEDENCE: co-occurring genocide + emergent war crimes → failure, NOT the milder mass-atrocity flag', () => {
        // Calibration condition + amendment guard (v): the genocide rupture governs; the
        // emergent-cumulative flag must not down-grade the more severe finding to hollow_victory.
        const state = cleansingState(); // emergent, war_crimes_events_emergent = 3
        // Inject a recorded Srebrenica genocide rupture attributed to RS.
        state.military!.negotiation!.rupture_consequences = [{
            id: 'srebrenica_genocide_1995',
            recorded_turn: 168,
            perpetrator_faction: 'RS',
            description: 'Fall of the Srebrenica safe area and subsequent genocide',
            condemnation_flag: 'genocide_condemnation',
        } as any];
        const v = computeFactionVerdict(state, 'RS');
        expect(v.condemnation_flags).toContain('genocide_condemnation');
        expect(v.condemnation_flags).not.toContain('authorized_cleansing_condemnation');
        expect(v.outcome_class).toBe('failure');
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
        // Build exactly that: capital shows civilian=0 (stale freeze), but the FRESH
        // displacement aggregates record CATASTROPHIC civilian harm (≥15000 caused) — the
        // authorized_cleansing_condemnation flag's clean magnitude gate. The flag (and thus
        // the letter-grade cap) MUST still fire off the fresh source despite the stale capital.
        const state = makeVerdictState(
            {
                RS: {
                    territory_controlled_pct: 58, // the territory cleansing bought
                    civilian_casualties_caused: 0, // STALE — capital frozen pre-refresh
                },
            },
            SHARED_COST,
        );
        // Inject the FRESH displacement aggregates the terminal-turn freeze missed —
        // 30000 civilian casualties caused, well past the ≥15000 catastrophic gate.
        (state as unknown as { displacement: { displacement_humanitarian_aggregates: Record<string, Record<string, { refugees_created: number; refugees_received: number; civilian_casualties_caused: number }>> } }).displacement.displacement_humanitarian_aggregates = {
            RS: {
                // split across two ethnicity buckets to exercise the summation
                RBiH: { refugees_created: 30000, refugees_received: 0, civilian_casualties_caused: 18000 },
                HRHB: { refugees_created: 20000, refugees_received: 0, civilian_casualties_caused: 12000 },
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
