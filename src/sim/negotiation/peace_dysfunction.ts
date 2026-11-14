/**
 * Peace Dysfunction Index — the Dayton-endgame keystone (Comprehensive Dayton, D3).
 *
 * Owner ruling D3 (2026-06-07): score the GAP between a functional settlement and
 * what was actually signed. The index (0-100, higher = more dysfunctional) CAPS the
 * verdict outcome_class — a high-dysfunction peace can never grade above
 * hollow_victory / pyrrhic_success regardless of how much territory a faction holds.
 * The player CAN sign a dysfunctional peace; it never reads as a clean win. This
 * mirrors the existing condemnation-flag cap in scoring.ts (classifyOutcome).
 *
 * The index blends five deterministic sub-components, each in [0,100]:
 *   1. autonomy        — how decentralized the state is (entity_autonomy_index, D2).
 *                        Dayton's residual-powers-to-the-Entities constitution is the
 *                        historical maximum; high autonomy = high dysfunction.
 *   2. fragmentation   — how fragmented the signed territorial map is (Shannon
 *                        evenness of the three-faction footprint; a clean partition
 *                        and a balanced three-way split are both fragmenting).
 *   3. brcko           — Brčko left to international arbitration (the unresolved knot,
 *                        Annex 2) rather than cleanly assigned to one entity.
 *   4. refugees        — war-displaced persons not returned (Annex 7 failure).
 *   5. condemnation    — locked Ring-2 rupture flags (atrocity/genocide) entrenched
 *                        by the settlement (a peace that ratifies cleansing).
 *
 * Determinism: pure read of already-frozen settlement + endgame state. No RNG, no
 * timestamps, sorted iteration via strictCompare, integer-rounded outputs.
 *
 * EVERY DECISION MODE (R8 ending truth pass, 2026-11-14, game-designer ruling C): the index
 * is computed for any signed Dayton. It was emergent-gated for baseline byte-identity only
 * ("belt-and-suspenders"); the gate meant a historical-mode player was warned in the Dayton
 * room that a dysfunctional peace caps the outcome and then saw a clean win on the Verdict
 * (R8 council B3). The calibration baselines never reach a signed Dayton (the 188w run ends
 * at turn 188 with game_over false), so their hashes do not move. The outcome cap reads each
 * side's OWN reading (`ownFaction`): its condemnation term and its ratified_cleansing flag
 * count only that side's rupture flags (§4 sensitive-copy panel, 2026-11-14), because the
 * pooled reading graded the victims of a genocide down, even to failure at ≥80, for it.
 */

import type { GameState } from '../../state/game_state.js';
import type { DaytonResult, PeaceDysfunctionBreakdown } from '../../state/negotiation_types.js';
import type { CompetencyOwner } from './competency_packages.js';
import { collectCondemnationFlags } from './rupture_consequences.js';
import { computeTreatyAutonomyIndex } from './institutional_packages.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

// ── OWNER-TUNABLE BLEND WEIGHTS (must sum to 1.0) ────────────────────────────
// How much each sub-component drives the composite dysfunction index. Autonomy
// and fragmentation are the structural heart of the Pyrrhic thesis ("rewarded
// ethnic territorial control with constitutional status"); refugees and
// condemnation are the human ledger; Brčko is the signature unresolved knot.
// Institutional-architecture expansion (2026-06-07): re-weighted to fund the NEW
// `gridlock` component (DIMENSION 4 → constitutional architecture). The 0.12
// gridlock weight is drawn proportionally from the five legacy components
// (autonomy −0.04, fragmentation −0.03, brcko −0.02, refugees −0.02,
// condemnation −0.01). Still sums to 1.00. Emergent-gated + post-w188 → the 40w/
// 52w/188w historical baselines never reach this code, so the re-weight is
// byte-identical on the calibration path by construction.
/** Exported so the Dayton room's live preview reads the engine's weights, never a stale copy. */
export const DYSFUNCTION_WEIGHTS = Object.freeze({
    autonomy: 0.26,
    fragmentation: 0.22,
    gridlock: 0.12,
    brcko: 0.08,
    refugees: 0.18,
    condemnation: 0.14,
});

/** Total war-displaced count at which the refugees sub-component saturates to 100. */
const REFUGEES_SATURATION = 200_000;

/**
 * Functional-autonomy floor. Below this autonomy level the autonomy component is
 * 0 (a centralized-enough state is functional). At/above 100 it saturates. The
 * historical Dayton default (maximally decentralized) sits at the top of the band.
 */
const AUTONOMY_FUNCTIONAL_FLOOR = 40;

// ── Structural flags ─────────────────────────────────────────────────────────
const FLAG_FROZEN_PARTITION = 'frozen_partition';
const FLAG_GRIDLOCK_BY_DESIGN = 'gridlock_by_design';
const FLAG_BRCKO_UNRESOLVED = 'brcko_unresolved';
const FLAG_REFUGEES_NOT_RETURNED = 'refugees_not_returned';
const FLAG_RATIFIED_CLEANSING = 'ratified_cleansing';
// Institutional-architecture expansion (2026-06-07): two NEW flags (7 total).
const FLAG_OHR_DEPENDENCY = 'ohr_dependency';
const FLAG_SEJDIC_FINCI_FAULT = 'sejdic_finci_fault';

// ── DIMENSION-4 gridlock raw sub-scores (constitutional architecture) ─────────
// gridlock_raw = veto + presidency + court + ohr; gridlock_component =
// clamp(gridlock_raw / 3.2). At the historical default (vital_interest_entity +
// tripartite_rotating + international_judges + bonn_powers) this is 100+80+40+100
// = 320 → /3.2 = 100 (maximal gridlock-by-design — the Pyrrhic signature).
const GRIDLOCK_VETO: Readonly<Record<string, number>> = Object.freeze({
    vital_interest_entity: 100, weighted_majority: 50, simple_majority: 0,
});
const GRIDLOCK_PRESIDENCY: Readonly<Record<string, number>> = Object.freeze({
    tripartite_rotating: 80, collective_civic: 40, single_elected: 0,
});
const GRIDLOCK_COURT: Readonly<Record<string, number>> = Object.freeze({
    international_judges: 40, domestic_only: 0,
});
const GRIDLOCK_OHR: Readonly<Record<string, number>> = Object.freeze({
    bonn_powers: 100, monitoring_only: 50, none: 0,
});
const GRIDLOCK_DIVISOR = 3.2;

// ── DIMENSION-5 refugee-return multiplier on the refugees component ───────────
const REFUGEE_RETURN_MULT: Readonly<Record<string, number>> = Object.freeze({
    full_right_of_return: 0.5, voluntary_only: 1.0, frozen_lines: 1.25,
});

/** Condemnation FLOOR when ICTY cooperation is refused — a non-tradeable rupture. */
const ICTY_NON_COOPERATION_CONDEMNATION_FLOOR = 75;

function clamp0to100(v: number): number {
    if (!Number.isFinite(v) || v <= 0) return 0;
    return v >= 100 ? 100 : v;
}

function round1(v: number): number {
    return Math.round(v * 10) / 10;
}

/**
 * Autonomy sub-component (0-100). Reuses the D2 entity_autonomy_index when present
 * on the result; otherwise derives it directly from the institutional choices so
 * this keystone is self-sufficient before D2 ships. Decentralized = high autonomy
 * = high dysfunction, measured as the distance above the functional floor.
 */
function autonomyComponent(result: DaytonResult): number {
    // One measure (DC walkthrough 2026-11-08): the treaty autonomy index, historical
    // Dayton = 100. It replaces the switch between the six-toggle index and the
    // extended index, which disagreed about the historical default (100 against 58.6)
    // and moved the reading when a competency was merely named at its default. At the
    // historical default it equals the old D2 index, so that reading is unchanged.
    // A signed result stores the index it was resolved with (the resolver now writes
    // this same measure); older saves keep the reading they were graded with.
    const autonomy = typeof result.entity_autonomy_index === 'number'
        ? result.entity_autonomy_index
        : computeTreatyAutonomyIndex({
            institutional_choices: result.institutional_choices ?? {},
            competency_allocation: result.competency_allocation as Record<string, CompetencyOwner> | undefined,
        });
    if (autonomy <= AUTONOMY_FUNCTIONAL_FLOOR) return 0;
    const span = 100 - AUTONOMY_FUNCTIONAL_FLOOR;
    return clamp0to100(((autonomy - AUTONOMY_FUNCTIONAL_FLOOR) / span) * 100);
}

/**
 * Gridlock sub-component (0-100) — DIMENSION 4 (constitutional architecture).
 * Blends the four constitutional sub-choices (veto regime, presidency, const.
 * court, OHR authority) into a single gridlock-by-design score. Each unspecified
 * sub-choice defaults to its historical 1995 Dayton value, so an empty
 * constitutional_choices map reads as the historical maximal-gridlock settlement
 * (=100). Pure & deterministic.
 */
function gridlockComponent(result: DaytonResult): number {
    const c = (result.constitutional_choices ?? {}) as Record<string, string>;
    const veto = GRIDLOCK_VETO[c.arch_veto_regime ?? 'vital_interest_entity'] ?? GRIDLOCK_VETO.vital_interest_entity;
    const presidency = GRIDLOCK_PRESIDENCY[c.arch_presidency ?? 'tripartite_rotating'] ?? GRIDLOCK_PRESIDENCY.tripartite_rotating;
    const court = GRIDLOCK_COURT[c.arch_const_court ?? 'international_judges'] ?? GRIDLOCK_COURT.international_judges;
    const ohr = GRIDLOCK_OHR[c.arch_ohr_authority ?? 'bonn_powers'] ?? GRIDLOCK_OHR.bonn_powers;
    return clamp0to100((veto + presidency + court + ohr) / GRIDLOCK_DIVISOR);
}

/**
 * Territorial fragmentation sub-component (0-100). Uses the normalized Shannon
 * evenness of the three-faction footprint: a single faction holding ~everything
 * is 0 (cohesive), a perfectly even three-way split is 100 (maximally fragmented).
 * A 51:49 partition lands high — the signed map is itself a fragmentation, exactly
 * the Pyrrhic thesis. Pure arithmetic over the frozen split.
 */
function fragmentationComponent(result: DaytonResult): number {
    const split = result.final_territory_split ?? {};
    const shares: number[] = [];
    let sum = 0;
    for (const f of [...CANONICAL_FACTIONS].sort(strictCompare)) {
        const v = split[f];
        const s = typeof v === 'number' && v > 0 ? v : 0;
        shares.push(s);
        sum += s;
    }
    if (sum <= 0) return 0;
    // Shannon entropy normalized by log(3) → evenness in [0,1].
    let entropy = 0;
    for (const s of shares) {
        if (s <= 0) continue;
        const p = s / sum;
        entropy -= p * Math.log(p);
    }
    const evenness = entropy / Math.log(CANONICAL_FACTIONS.length);
    return clamp0to100(evenness * 100);
}

/**
 * Brčko sub-component (0-100). 100 when Brčko is left to international arbitration
 * (the unresolved condominium — the hardest knot, deferred at Dayton), a modest
 * residual when cleanly assigned to one entity (a clean assignment is still a
 * contested corridor but is at least resolved).
 */
function brckoComponent(result: DaytonResult): number {
    if (result.brcko_status === 'arbitration' || result.brcko_arbitration === true) return 100;
    return 20;
}

/**
 * Refugees sub-component (0-100): total war-displaced not returned, saturating.
 * DIMENSION 5 (2026-06-07): scaled by the refugee-return choice — full right of
 * return halves the unreturned burden (×0.5), frozen lines worsen it (×1.25),
 * voluntary-only (the historical default) is neutral (×1.0). At the default the
 * multiplier is 1.0 so the historical reading is unchanged.
 */
function refugeesComponent(state: GameState, result: DaytonResult): number {
    const cap = state.military?.negotiation?.capital ?? {};
    let total = 0;
    for (const f of [...CANONICAL_FACTIONS].sort(strictCompare)) {
        total += cap[f]?.refugees_created ?? 0;
    }
    const rj = (result.return_justice ?? {}) as Record<string, string>;
    const mult = REFUGEE_RETURN_MULT[rj.rj_refugee_return ?? 'voluntary_only'] ?? 1.0;
    return clamp0to100((total / REFUGEES_SATURATION) * 100 * mult);
}

/**
 * Condemnation sub-component (0-100): locked Ring-2 rupture flags entrenched by the
 * settlement. Any flag → at least 50 (a peace that does not undo a rupture ratifies
 * it); a genocide condemnation saturates to 100. Non-tradeable by canon — return/
 * justice choices cannot erase a locked rupture.
 *
 * DIMENSION 5 HARD RULE (2026-06-07): when ICTY cooperation is REFUSED
 * (rj_icty_cooperation == 'non_cooperation') the condemnation component is FLOORED
 * to ≥75 — refusing to cooperate with the tribunal entrenches the rupture. This is
 * a FLOOR (max), never a discount: return/justice can only WORSEN the condemnation
 * reading, never buy down a locked rupture. Mirrors the existing condemnation cap.
 */
function condemnationComponent(
    state: GameState,
    result: DaytonResult,
    ownFaction?: string,
): { score: number; hasGenocide: boolean; any: boolean; flagged: boolean } {
    // Settlement-wide reading pools every side's flags. A side's own reading (the index that
    // caps that side's outcome) counts only the flags it holds itself; the ICTY
    // non-cooperation floor below is a term of the settlement and applies either way.
    const all = new Set<string>();
    const factions = ownFaction ? [ownFaction] : [...CANONICAL_FACTIONS].sort(strictCompare);
    for (const f of factions) {
        for (const flag of collectCondemnationFlags(state, f)) all.add(flag);
    }
    const rj = (result.return_justice ?? {}) as Record<string, string>;
    const ictyRefused = rj.rj_icty_cooperation === 'non_cooperation';

    if (all.size === 0) {
        // No locked rupture: refusing ICTY cooperation still entrenches a justice
        // failure (floored), but there is no genocide/atrocity flag to ratify.
        const score = ictyRefused ? ICTY_NON_COOPERATION_CONDEMNATION_FLOOR : 0;
        return { score, hasGenocide: false, any: ictyRefused, flagged: false };
    }
    const hasGenocide = all.has('genocide_condemnation');
    let score = hasGenocide ? 100 : Math.min(100, 50 + (all.size - 1) * 15);
    if (ictyRefused) score = Math.max(score, ICTY_NON_COOPERATION_CONDEMNATION_FLOOR);
    return { score, hasGenocide, any: true, flagged: true };
}

/**
 * Compute the full deterministic PeaceDysfunctionBreakdown for the frozen Dayton
 * settlement, or null if there is no Dayton result. Every decision mode (see the header).
 *
 * `ownFaction` (§4 sensitive-copy panel, ending truth pass, 2026-11-14): the reading that
 * caps that side's outcome. Its condemnation term counts only the side's own rupture flags
 * (plus the ICTY non-cooperation floor, a settlement term), so another side's crime never
 * caps a side's outcome: the victims' state is not capped for a genocide committed against
 * its people, and preventing it is not an outcome lever for them (Ring 3 #10). Omitted: the
 * settlement-wide reading (snapshot, Dayton result, the Dayton room).
 */
export function computePeaceDysfunctionBreakdown(state: GameState, ownFaction?: string): PeaceDysfunctionBreakdown | null {
    const result = state.military?.negotiation?.dayton_result;
    if (!result) return null;

    const autonomy = autonomyComponent(result);
    const fragmentation = fragmentationComponent(result);
    const gridlock = gridlockComponent(result);
    const brcko = brckoComponent(result);
    const refugees = refugeesComponent(state, result);
    const condemnation = condemnationComponent(state, result, ownFaction);

    const index = clamp0to100(
        autonomy * DYSFUNCTION_WEIGHTS.autonomy +
        fragmentation * DYSFUNCTION_WEIGHTS.fragmentation +
        gridlock * DYSFUNCTION_WEIGHTS.gridlock +
        brcko * DYSFUNCTION_WEIGHTS.brcko +
        refugees * DYSFUNCTION_WEIGHTS.refugees +
        condemnation.score * DYSFUNCTION_WEIGHTS.condemnation,
    );

    // Constitutional choices feed the two NEW structural flags (DIMENSION 4).
    const cc = (result.constitutional_choices ?? {}) as Record<string, string>;
    const ohrAuthority = cc.arch_ohr_authority ?? 'bonn_powers';
    const constCourt = cc.arch_const_court ?? 'international_judges';
    const constituentModel = cc.arch_constituent_model ?? 'three_peoples';

    // Structural flags — deterministic, sorted.
    const flags: string[] = [];
    if (fragmentation >= 60) flags.push(FLAG_FROZEN_PARTITION);
    // gridlock_by_design now trips on entity autonomy OR constitutional gridlock.
    if (autonomy >= 60 || gridlock >= 60) flags.push(FLAG_GRIDLOCK_BY_DESIGN);
    if (brcko >= 100) flags.push(FLAG_BRCKO_UNRESOLVED);
    if (refugees >= 50) flags.push(FLAG_REFUGEES_NOT_RETURNED);
    // A side's own reading flags ratified cleansing only for its own rupture flags (§4 panel,
    // red-team B1, 2026-11-14: the ≥80 failure band must never fail a side for another side's
    // crime, nor for a justice term of the settlement); the settlement-wide reading is unchanged.
    if (ownFaction ? condemnation.flagged : condemnation.any) flags.push(FLAG_RATIFIED_CLEANSING);
    // DIMENSION 4 — supervised-peace dependency + the Sejdić–Finci fault.
    if (ohrAuthority === 'bonn_powers' || constCourt === 'international_judges') flags.push(FLAG_OHR_DEPENDENCY);
    if (constituentModel === 'three_peoples') flags.push(FLAG_SEJDIC_FINCI_FAULT);
    flags.sort(strictCompare);

    return {
        index: round1(index),
        autonomy_component: round1(autonomy),
        fragmentation_component: round1(fragmentation),
        gridlock_component: round1(gridlock),
        brcko_component: round1(brcko),
        refugees_component: round1(refugees),
        condemnation_component: round1(condemnation.score),
        flags,
    };
}

/**
 * Convenience: just the 0-100 index (or null when not applicable). Used by the
 * endgame snapshot freeze and the verdict outcome-class cap.
 */
export function computePeaceDysfunctionIndex(state: GameState): number | null {
    const breakdown = computePeaceDysfunctionBreakdown(state);
    return breakdown ? breakdown.index : null;
}

// ── Outcome-class cap (D3 + graduated bands) ─────────────────────────────────
//
// A high-dysfunction peace can never grade above hollow_victory / pyrrhic_success
// regardless of territory. This mirrors the condemnation-flag cap in
// classifyOutcome (scoring.ts). Worse outcome classes are left untouched; only the
// "clean win" tiers (strategic_success / survival / negotiated_escape) are pulled
// down. Pure, deterministic.
//
// GRADUATED BANDS (2026-06-07, owner-tunable):
//   index < 45            → no cap.
//   45 ≤ index < 60       → soft cap: strategic_success → survival (one notch).
//   60 ≤ index            → existing hard cap: any clean-win class → hollow_victory.
//   index ≥ 80 AND ratified_cleansing → failure (a ratified-cleansing peace at
//                           extreme dysfunction can read no better than failure).
// The existing 60-threshold behavior is preserved EXACTLY; the 45 and 80 bands
// are purely additive. The 80/failure band requires the flags argument (the
// ratified_cleansing structural flag); callers that omit flags get the legacy
// 45/60 behavior — backward-compatible.

/** Dysfunction index at/above which the verdict cannot read as a clean settlement. */
export const PEACE_DYSFUNCTION_CAP_THRESHOLD = 60;
/** Soft-cap band floor: strategic_success → survival between this and the hard cap. */
export const PEACE_DYSFUNCTION_SOFT_CAP_THRESHOLD = 45;
/** Extreme-dysfunction band floor: with ratified_cleansing, the outcome → failure. */
export const PEACE_DYSFUNCTION_FAILURE_THRESHOLD = 80;

/** Outcome classes considered "clean wins" that a dysfunctional peace must cap. */
const CLEAN_WIN_CLASSES = new Set(['strategic_success', 'survival', 'negotiated_escape']);

/** Which band of capOutcomeByPeaceDysfunction changed the outcome class ('none' when it did not). */
export type PeaceDysfunctionBand = 'none' | 'soft' | 'hard' | 'failure';

/**
 * The band of capOutcomeByPeaceDysfunction that changed `outcomeClass`, for the Verdict's
 * grade trace. Same thresholds and arguments; 'none' when the cap left the class as it was.
 */
export function peaceDysfunctionBand(
    outcomeClass: string,
    dysfunctionIndex: number | null | undefined,
    flags?: readonly string[],
): PeaceDysfunctionBand {
    const capped = capOutcomeByPeaceDysfunction(outcomeClass, dysfunctionIndex, flags);
    if (capped === outcomeClass || typeof dysfunctionIndex !== 'number') return 'none';
    if (capped === 'failure') return 'failure';
    return dysfunctionIndex >= PEACE_DYSFUNCTION_CAP_THRESHOLD ? 'hard' : 'soft';
}

/**
 * Cap an outcome class by the peace dysfunction index (graduated). Never improves
 * an outcome; pyrrhic_success and worse are returned unchanged (except the extreme
 * ≥80 + ratified_cleansing band, which can pull anything ABOVE failure down to
 * failure but never below — collapse stays collapse).
 *
 * @param flags optional structural flags (peace_dysfunction_flags); required for
 *              the ≥80 ratified_cleansing → failure band. Omitting them yields the
 *              legacy 45/60 behavior.
 */
export function capOutcomeByPeaceDysfunction<T extends string>(
    outcomeClass: T,
    dysfunctionIndex: number | null | undefined,
    flags?: readonly string[],
): T {
    if (typeof dysfunctionIndex !== 'number') return outcomeClass;

    // Extreme band: a ratified-cleansing peace at ≥80 can read no better than
    // failure. Only pulls DOWN — collapse (already worse) is left untouched.
    if (
        dysfunctionIndex >= PEACE_DYSFUNCTION_FAILURE_THRESHOLD &&
        flags?.includes(FLAG_RATIFIED_CLEANSING) &&
        outcomeClass !== 'collapse'
    ) {
        return 'failure' as T;
    }

    // Hard cap (existing behavior): clean-win → hollow_victory at/above 60.
    if (dysfunctionIndex >= PEACE_DYSFUNCTION_CAP_THRESHOLD) {
        if (CLEAN_WIN_CLASSES.has(outcomeClass)) return 'hollow_victory' as T;
        return outcomeClass;
    }

    // Soft cap: 45 ≤ index < 60 → strategic_success is no longer a clean triumph,
    // it reads as survival (one notch down). Other classes untouched in this band.
    if (dysfunctionIndex >= PEACE_DYSFUNCTION_SOFT_CAP_THRESHOLD) {
        if (outcomeClass === 'strategic_success') return 'survival' as T;
        return outcomeClass;
    }

    return outcomeClass;
}
