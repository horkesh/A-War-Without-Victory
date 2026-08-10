/**
 * Endgame verdict owner — JUDGMENT only.
 *
 * Owner split:
 * - TERMINATION: war_termination.ts -> checkWarTermination() -> WarTerminationResult
 * - JUDGMENT: scoring.ts -> computeFullVerdict() -> GameVerdict (this file)
 * - COMPARISON: future downstream consumer, not this file
 *
 * Pyrrhic score is supporting context, not sovereign truth.
 * OutcomeClass + grade are the primary verdict drivers.
 * Condemnation flags can cap or taint any result.
 *
 * Deterministic: no Math.random(), sorted iteration via strictCompare.
 *
 * "The least bad version of a tragedy."
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { NegotiationBreakdown, OutcomeClass } from '../../state/negotiation_types.js';
import type { FactionVerdict, GameVerdict, DimensionGrade } from '../../state/negotiation_types.js';
import { collectCondemnationFlags } from './rupture_consequences.js';
import { computePeaceDysfunctionBreakdown, computePeaceDysfunctionIndex, capOutcomeByPeaceDysfunction } from './peace_dysfunction.js';
import { DIMENSION_WEIGHTS, computeNegotiatingCapital } from '../events/strategic_dimensions.js';
import type { DimensionStore } from '../events/strategic_dimensions.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

const STRATEGIC_DIMENSIONS = [
    'military_credibility',
    'territorial_legitimacy',
    'international_standing',
    'patron_confidence',
    'internal_cohesion',
    'negotiating_leverage',
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Dimension Grading — per-dimension letter grades based on raw 0-100 score
// ═══════════════════════════════════════════════════════════════════════════

const DIMENSION_GRADE_THRESHOLDS: Array<{ min: number; grade: string }> = [
    { min: 90, grade: 'A+' },
    { min: 75, grade: 'A' },
    { min: 60, grade: 'B' },
    { min: 40, grade: 'C' },
    { min: 20, grade: 'D' },
    { min: 0,  grade: 'F' },
];

function gradeDimension(score: number): string {
    for (const t of DIMENSION_GRADE_THRESHOLDS) {
        if (score >= t.min) return t.grade;
    }
    return 'F';
}

// ═══════════════════════════════════════════════════════════════════════════
// War-cost floor — the negative-sum keystone (Free War Phase 3, Part A)
// ═══════════════════════════════════════════════════════════════════════════
//
// The verdict grade is, by its anchors, territory-dominated: a faction that
// holds enough ground reads as A+/A no matter how long or bloody the war was.
// That is a conquest scoreboard, and it betrays the negative-sum soul — the
// Bosnian War was a tragedy *nobody won*. This floor makes a long, bloody war
// structurally unable to read as `strategic_success` regardless of territory.
//
// It is POST-TERMINATION reflection: it READS already-accrued, monotonic cost
// values (war exhaustion, cumulative casualties, war duration) and applies a
// grade CAP. It never writes state, never touches accrual, and can only LOWER
// a grade — never raise one. Determinism: pure arithmetic over persisted state.
//
// ── OWNER-TUNABLE GAME-DESIGN KNOBS ─────────────────────────────────────────
// These thresholds are deliberate balance dials. Tune them; do not over-tune.
// `war_cost_index` is a 0..1 scale built from three monotonic sub-scores that
// each saturate at the reference ceiling below, then blended by COST_WEIGHTS.

/** Reference ceilings: the value at which each sub-score saturates to 1.0. */
const COST_REFERENCE = Object.freeze({
    /** War exhaustion at max cost. Post-2026-05-22 rescale, war_exhaustion runs on a 0..10000
     *  scale (100x; saturation cap 10000, combat tempo thresholds 3000/8000) — see
     *  src/sim/combat/exhaustion.ts. 8000 = the "high exhaustion" tempo threshold (formerly 80). */
    exhaustion_full: 8000,
    /** Cumulative faction casualties (killed + wounded + missing/captured) at max cost. */
    casualties_full: 40000,
    /** War duration in weeks/turns at max cost (~3 years of grinding war). */
    duration_full_weeks: 156,
    // ── Atrocity sub-score references (Free War Phase 5, Slice 1) ──────────────
    // The atrocity term saturates at these reference ceilings. They are
    // deliberately LOW so that even a modest cleansing campaign pushes the
    // atrocity sub-score toward 1.0 — the bright line requires atrocity to
    // dominate any territory-driven grade gain, never merely shade it.
    /** War-crimes event count at which the war-crimes component saturates. */
    war_crimes_full: 3,
    /** Refugees created at which the displacement component saturates. */
    refugees_full: 50000,
    /** Civilian casualties caused at which the civilian-harm component saturates. */
    civilian_casualties_full: 5000,
});

/** Blend weights for the three monotonic base sub-scores. Must sum to 1.0. */
const COST_WEIGHTS = Object.freeze({
    exhaustion: 0.4,
    casualties: 0.4,
    duration: 0.2,
});

/**
 * Flag-gated "catastrophe-ceiling" BASE references (Pyrrhic scoring A-reachability,
 * 2026-08-10). Default OFF ⇒ the frozen COST_REFERENCE above (byte-identical historical
 * verdict). ON (`AWWV_SCORING_CEILING_V2`): the base exhaustion/casualties/duration
 * references sit ABOVE historical (annihilation-scale), so historical-level play lands
 * ~B instead of the saturated flat-C, better-than-historical play reaches A, and worse
 * play caps to C/D/F. ONLY the base references move — the atrocity references
 * (war_crimes_full / refugees_full / civilian_casualties_full) stay ABSOLUTE at their
 * deliberately-low values (canon §3.5 A2; scoring-panel Condition 1). Weights unchanged.
 * This is the sign-off grade-table lever; it becomes the default only after owner
 * sign-off + the §3.5 canon amendment. Pairs with the casualty ledger/territory decouple
 * (realistic totals) and the hardened §6 letter-grade cap (capGradeByCondemnation).
 */
const CEILING_V2_BASE = Object.freeze({
    exhaustion_full: 12000,
    casualties_full: 250000,
    duration_full_weeks: 250,
});
function scoringCeilingV2Enabled(): boolean {
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_SCORING_CEILING_V2;
    return raw === '1' || raw === 'true' || raw === 'on';
}

// ── ATROCITY TERM — the ethics bright line (Free War Phase 5, Slice 1) ────────
//
// OWNER-TUNABLE. The atrocity sub-score (0..1) is built from war-crimes events,
// refugees created, and civilian casualties caused — each saturating at its
// COST_REFERENCE ceiling above, then blended by ATROCITY_WEIGHTS (sum 1.0).
//
// It is added to the base war-cost index (the result is clamped to 1.0), scaled
// by ATROCITY_COST_GAIN. The gain is sized so a meaningful cleansing campaign
// alone can lift the cost index across the 0.78 "hollow" cap — i.e. push an
// otherwise-A+ territory grade down to C. That is the whole point: the extra
// territory cleansing buys is NET-NEGATIVE at the verdict.
//
// CRITICAL — EMERGENT-GATED: the atrocity term applies ONLY when
// state.meta.decision_mode === 'emergent'. The historical 52w baseline contains
// the real Drina cleansing (war_crimes_events > 0); applying the term there
// would raise its cost index, lower its grade, and break the byte-identical
// baseline. Historical/unset mode is therefore left exactly as before.

/** Blend weights for the three atrocity components. Must sum to 1.0. */
const ATROCITY_WEIGHTS = Object.freeze({
    war_crimes: 0.5,
    refugees: 0.3,
    civilian_casualties: 0.2,
});

/**
 * Additive gain applied to the (0..1) atrocity sub-score before it is added to
 * the base cost index. At full saturation (atrocity sub-score 1.0) this adds
 * +0.85 to the index — enough that even a low-cost short war crosses the 0.78
 * hollow cap on cleansing alone, so atrocity DOMINATES territory at the verdict.
 */
const ATROCITY_COST_GAIN = 0.85;

/**
 * Non-genocide `authorized_cleansing_condemnation` (2026-08-10, EMERGENT-ONLY).
 *
 * The additive atrocity cost term (ATROCITY_COST_GAIN) is grade-INERT for a
 * full-length campaign: the base war_cost_index already saturates to ≥0.78 from
 * genuine casualties/exhaustion, so cleansing cannot make the C-cap worse. Canon
 * §3.5:166 assigns "pushing an outcome BELOW C" to CONDEMNATION FLAGS (§3.4), not
 * the cost cap — and the only pre-existing flag is `genocide_condemnation` (Srebrenica).
 * This adds the missing tier: significant non-genocide cleansing sets
 * `authorized_cleansing_condemnation`, which `classifyOutcome` turns into a
 * hollow_victory — so atrocity is grade-DECISIVE at the outcome-class level (a bloody
 * campaign's `pyrrhic_success` C becomes `hollow_victory`) without any casualty-scoring
 * change. EMERGENT-ONLY (historical mode byte-identical). Genocide takes precedence.
 *
 * TRIGGER — UNION of two calendar-CLEAN emergent signals (§6-panel v2, 2026-08-10):
 *   (1) `war_crimes_events_emergent ≥ 1` — any single player/bot-AUTHORIZED paramilitary
 *       sweep (deliberate cleansing of a settlement). Sole writer is `recordWarCrime`;
 *       scripted `humanitarian_impact` events never touch it (no calendar leak). MIN=1
 *       because a pattern requirement is a "free atrocity budget" the §6 bright line
 *       forbids, and the record (Bijeljina/Zvornik/Višegrad/Foča 1992) shows a single
 *       authorized cleansing was already atrocity-grade (ICTY Vasiljević/Kunarac/Krajišnik).
 *   (2) `civilian_casualties_caused ≥ 15000` — CATASTROPHIC siege/encirclement-driven
 *       civilian harm, backstopping the `updateDisplacement` blind spot (that pipeline
 *       never calls `recordWarCrime`). Attributed to the CAUSER faction. 15,000 sits 2.7×
 *       above a lone Sarajevo-scale siege (~3,500-5,500 civilian dead, ICTY Galić — a
 *       single brutal siege must NOT trip this) and 1.84× below RS's modeled multi-
 *       municipality campaign (~27,541) — the "brutal single siege vs catastrophic
 *       campaign" line. `refugees_created` is deliberately NOT gated (too coarse: ordinary
 *       front movement displaces on all sides).
 * Panel history: v1 (blended atrocitySubScore≥0.5) RETIRED — calendar-contaminated +
 * siege-false-positive + cliff-gameable. See docs/plans/2026-08-10-emergent-cumulative-
 * condemnation-amendment.md.
 */
const AUTHORIZED_CLEANSING_WAR_CRIMES_MIN = 1;
/** Catastrophic siege/encirclement civilian harm (causer-attributed) that alone condemns. */
const CATASTROPHIC_CIVILIAN_HARM_MIN = 15000;

/**
 * Grade ceilings keyed by ascending war_cost_index threshold.
 * Evaluated high-to-low; the first threshold the cost index meets or exceeds
 * sets the BEST achievable grade. A higher-cost war can never read as a clean
 * triumph. `max_grade` is the highest grade still permitted at that cost tier.
 *
 *   cost < 0.45  → no cap (clean, short, cheap wars keep their earned grade)
 *   cost ≥ 0.45  → cannot exceed A   (a real war is never a flawless A+)
 *   cost ≥ 0.60  → cannot exceed B   (costly_victory band — pyrrhic at best)
 *   cost ≥ 0.78  → cannot exceed C   (hollow — won something at ruinous cost)
 */
const COST_GRADE_CAPS: Array<{ min_cost_index: number; max_grade: string }> = [
    { min_cost_index: 0.78, max_grade: 'C' },
    { min_cost_index: 0.60, max_grade: 'B' },
    { min_cost_index: 0.45, max_grade: 'A' },
];

/** Letter grades ranked best→worst; index = severity (0 = best). */
const GRADE_RANK: readonly string[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

function gradeRank(grade: string): number {
    const idx = GRADE_RANK.indexOf(grade);
    return idx === -1 ? GRADE_RANK.length - 1 : idx; // unknown grade treated as worst
}

function clamp01(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value >= 1 ? 1 : value;
}

/**
 * Sum the FRESH humanitarian aggregates for a faction directly from
 * displacement state — `state.displacement.displacement_humanitarian_aggregates`
 * keyed by causer faction × ethnicity. These are written at append-time by
 * appendDisplacementEvent (src/state/displacement_event_log.ts), BEFORE the
 * later compute-negotiation-capital step copies them onto negotiation.capital.
 *
 * Reading them here makes the atrocity score independent of capital-refresh
 * timing: on a TERMINAL turn the verdict snapshot is frozen in
 * check-victory-conditions BEFORE compute-negotiation-capital runs, so the
 * capital copy of refugees_created / civilian_casualties_caused can be stale
 * (omitting harm appended earlier the same turn). The displacement aggregates
 * are always current. Pure, deterministic, sorted iteration.
 */
function freshDisplacementHarm(
    state: GameState,
    faction: string,
): { refugees: number; civilianCasualties: number } {
    const humAgg = state.displacement?.displacement_humanitarian_aggregates;
    const byEth = humAgg?.[faction];
    if (!byEth) return { refugees: 0, civilianCasualties: 0 };

    let refugees = 0;
    let civilianCasualties = 0;
    for (const eth of Object.keys(byEth).sort(strictCompare)) {
        const slot = byEth[eth];
        if (!slot) continue;
        refugees += slot.refugees_created ?? 0;
        civilianCasualties += slot.civilian_casualties_caused ?? 0;
    }
    return { refugees, civilianCasualties };
}

/**
 * Compute the monotonic atrocity sub-score in [0, 1] for a faction.
 *
 * Reads already-accrued, monotonic per-faction war-data, sourced so the score
 * holds on TERMINAL turns (when the negotiation.capital snapshot may be frozen
 * one step before compute-negotiation-capital refreshes its displacement copy):
 *   - war_crimes_events         — read from negotiation.capital. recordWarCrime
 *                                 (paramilitary_sweep.ts) and apply_effects.ts
 *                                 increment this IN PLACE during the turn, so
 *                                 capital is already the freshest store.
 *   - refugees_created          — max(capital, FRESH displacement aggregate).
 *   - civilian_casualties_caused — max(capital, FRESH displacement aggregate).
 *
 * For the two displacement-derived inputs we take the MAX of the (possibly
 * stale) capital value and the always-current displacement aggregate, so the
 * score can never UNDER-count terminal-turn harm — a faction cannot commit
 * atrocities on the final turn and evade the bright-line penalty exactly at the
 * end-state being scored.
 *
 * Each component saturates at its COST_REFERENCE ceiling, then blends by
 * ATROCITY_WEIGHTS. Higher = more atrocity. Pure & deterministic. This is the
 * raw signal; the emergent gate and additive gain are applied by the caller.
 */
function computeAtrocitySubScore(state: GameState, faction: string): number {
    const cap = state.military?.negotiation?.capital?.[faction];

    const warCrimes = cap?.war_crimes_events ?? 0;
    const capRefugees = cap?.refugees_created ?? 0;
    const capCivilian = cap?.civilian_casualties_caused ?? 0;

    // FRESH source — never under-count terminal-turn harm (see freshDisplacementHarm).
    const fresh = freshDisplacementHarm(state, faction);
    const refugees = Math.max(capRefugees, fresh.refugees);
    const civilianCasualties = Math.max(capCivilian, fresh.civilianCasualties);

    if (warCrimes === 0 && refugees === 0 && civilianCasualties === 0) return 0;

    const warCrimesScore = clamp01(warCrimes / COST_REFERENCE.war_crimes_full);
    const refugeesScore = clamp01(refugees / COST_REFERENCE.refugees_full);
    const civilianScore = clamp01(civilianCasualties / COST_REFERENCE.civilian_casualties_full);

    return clamp01(
        warCrimesScore * ATROCITY_WEIGHTS.war_crimes +
        refugeesScore * ATROCITY_WEIGHTS.refugees +
        civilianScore * ATROCITY_WEIGHTS.civilian_casualties,
    );
}

/**
 * Return the breakdown to DISPLAY for a faction, with its atrocity/humanitarian
 * facts raised to the SAME fresh source the grade used (Free War Phase 5, Codex
 * P2 on #96). The verdict grade is capped using max(capital, FRESH displacement
 * aggregate) for refugees_created / civilian_casualties_caused (see
 * computeAtrocitySubScore). On a TERMINAL turn the capital snapshot can be frozen
 * one step before compute-negotiation-capital refreshes its displacement copy, so
 * the raw capital values can be STALE. Displaying the raw snapshot would put a
 * fresh-derived grade next to stale numbers — internally inconsistent.
 *
 * EMERGENT-GATED: the atrocity term (and thus this display correction) is OFF in
 * historical/unset mode, where the raw capital snapshot is returned UNCHANGED so
 * the byte-identical 52w baseline is preserved by construction. war_crimes_events
 * is already fresh on capital (recordWarCrime increments it in place), so it is
 * left as-is. Pure & deterministic; never lowers a displayed value (max only).
 */
function freshenBreakdownForDisplay(
    state: GameState,
    faction: string,
    capital: NegotiationBreakdown,
): NegotiationBreakdown {
    // Historical/unset mode: the atrocity term is OFF, so display is untouched.
    if (state.meta?.decision_mode !== 'emergent') return capital;

    const fresh = freshDisplacementHarm(state, faction);
    const freshRefugees = Math.max(capital.refugees_created ?? 0, fresh.refugees);
    const freshCivilian = Math.max(capital.civilian_casualties_caused ?? 0, fresh.civilianCasualties);

    // No drift between capital and fresh — return the original object unchanged.
    if (freshRefugees === capital.refugees_created && freshCivilian === capital.civilian_casualties_caused) {
        return capital;
    }

    return {
        ...capital,
        refugees_created: freshRefugees,
        civilian_casualties_caused: freshCivilian,
    };
}

/**
 * Compute the monotonic war-cost index in [0, 1] for a faction.
 *
 * Reads only already-accrued, monotonic state:
 *   - war exhaustion         (state.political.war_exhaustion[faction], §8 monotonic)
 *   - cumulative casualties  (state.military.casualty_ledger[faction], monotonic)
 *   - war duration in weeks  (state.meta.turn, monotonic)
 *
 * Each sub-score saturates at its COST_REFERENCE ceiling, then blends by
 * COST_WEIGHTS. Higher = more catastrophic war. Pure & deterministic.
 *
 * EMERGENT-ONLY atrocity term (Free War Phase 5, Slice 1 — the ethics bright
 * line): when meta.decision_mode === 'emergent', an additive atrocity penalty
 * (war_crimes_events + refugees + civilian casualties, scaled by
 * ATROCITY_COST_GAIN) is folded in so cleansing RAISES the cost index — pushing
 * the grade cap down enough that the territory cleansing buys is net-negative at
 * the verdict. In historical/unset mode the term is OFF, so the index (and thus
 * the 52w baseline grade) is byte-identical to before this slice.
 */
export function computeWarCostIndex(state: GameState, faction: string): number {
    // Flag-gated catastrophe-ceiling BASE references (default OFF = byte-identical).
    const v2 = scoringCeilingV2Enabled();
    const exhFull = v2 ? CEILING_V2_BASE.exhaustion_full : COST_REFERENCE.exhaustion_full;
    const casFull = v2 ? CEILING_V2_BASE.casualties_full : COST_REFERENCE.casualties_full;
    const durFull = v2 ? CEILING_V2_BASE.duration_full_weeks : COST_REFERENCE.duration_full_weeks;

    const exhaustion = state.political?.war_exhaustion?.[faction] ?? 0;
    const exhaustionScore = clamp01(exhaustion / exhFull);

    const ledger = state.military?.casualty_ledger?.[faction];
    const casualties = ledger
        ? (ledger.killed ?? 0) + (ledger.wounded ?? 0) + (ledger.missing_captured ?? 0)
        : 0;
    const casualtyScore = clamp01(casualties / casFull);

    const weeks = state.meta?.turn ?? 0;
    const durationScore = clamp01(weeks / durFull);

    const baseIndex =
        exhaustionScore * COST_WEIGHTS.exhaustion +
        casualtyScore * COST_WEIGHTS.casualties +
        durationScore * COST_WEIGHTS.duration;

    // EMERGENT-GATED: the atrocity term is OFF in historical/unset mode, keeping
    // the historical 52w war_cost_index (and verdict) byte-identical.
    if (state.meta?.decision_mode !== 'emergent') {
        return clamp01(baseIndex);
    }

    const atrocityPenalty = computeAtrocitySubScore(state, faction) * ATROCITY_COST_GAIN;
    return clamp01(baseIndex + atrocityPenalty);
}

/**
 * Cap a faction's earned grade by its war-cost index. Can only LOWER the grade
 * (toward F), never raise it. Returns the input grade unchanged when the cost
 * index is below all cap thresholds.
 */
export function capGradeByCost(grade: string, costIndex: number): string {
    let maxGrade: string | null = null;
    for (const cap of COST_GRADE_CAPS) {
        if (costIndex >= cap.min_cost_index) {
            maxGrade = cap.max_grade;
            break; // COST_GRADE_CAPS is ordered high→low; first hit is the tightest cap
        }
    }
    if (maxGrade === null) return grade;
    // Only lower: keep the worse (higher-rank-index) of earned vs cap.
    return gradeRank(grade) >= gradeRank(maxGrade) ? grade : maxGrade;
}

/**
 * Cap a faction's LETTER grade by its atrocity condemnation flags — the §6 bright-line
 * letter-grade guard. Can only LOWER the grade, never raise it (mirrors capGradeByCost).
 *   genocide_condemnation            → max grade D (→ classifyOutcome `failure`)
 *   authorized_cleansing_condemnation → max grade C
 *
 * INDEPENDENT of the cost index. Before this (Pyrrhic scoring panel, red-team L1,
 * 2026-08-10) condemnation flags fed ONLY classifyOutcome (the outcome_class), so
 * atrocity never capped the LETTER grade — the "impossible to atrocity your way to an A"
 * bright line held ONLY by cost-index saturation (every full campaign saturated to C).
 * The moment scoring de-saturates to differentiate good play (the casualty decouple /
 * reference re-derivation), a low-cost run with a single authorized sweep could reach
 * grade A. This makes the bright line STRUCTURAL: a condemnation caps the letter grade
 * regardless of how low the cost index is driven. Determinism: pure, order-independent.
 *
 * Historical/unset mode is byte-identical: no condemnation flag fires there (genocide is
 * event-gated to the Srebrenica path; authorized_cleansing is emergent-only), so with an
 * empty flag list this returns the input grade unchanged.
 */
export function capGradeByCondemnation(grade: string, condemnationFlags: readonly string[]): string {
    let cap: string | null = null;
    if (condemnationFlags.includes('genocide_condemnation')) cap = 'D';
    else if (condemnationFlags.includes('authorized_cleansing_condemnation')) cap = 'C';
    if (cap === null) return grade;
    // Only lower: keep the worse (higher-rank-index) of earned vs cap.
    return gradeRank(grade) >= gradeRank(cap) ? grade : cap;
}

/**
 * SIMPLE SCORING MODEL (2026-08-10, owner-directed — replaces the war_cost_index
 * weighted-clamp-cap machine that saturated every full campaign to C).
 *
 *   final grade = atrocityGate( earnedGrade + humanCostShift )
 *
 * - earnedGrade: the §3.2 anchor grade (already differentiates by play).
 * - humanCostShift: a signed grade step from the faction's casualties vs a FROZEN
 *   historical constant (no live baseline, no clamped references, no saturation).
 *   Materially LESS bloody than history → +1 ("you authored a less-catastrophic war");
 *   historical-level → 0 (par); markedly/​catastrophically bloodier → −1 / −2.
 *   Positive shift is capped so cost alone can never MANUFACTURE A+ (strategic_success
 *   stays anchor-reserved — game-design panel condition).
 * - atrocityGate: capGradeByCondemnation (already shipped) — any authorized atrocity
 *   caps to C regardless of how "cheap" the war was, closing the A0 inversion.
 *
 * Flag-gated `AWWV_SCORING_SIMPLE`; default OFF ⇒ the legacy war_cost_index path
 * (byte-identical). The frozen baseline is a HISTORICAL FACT (KIA+WIA+MIA), not fit to
 * sim output (§3.5 A2), and the cost axis is casualties, never territory (§3.5 A3).
 */
const HISTORICAL_CASUALTY_BASELINE: Record<string, number> = Object.freeze({
    RBiH: 140000,
    RS: 95000,
    HRHB: 35000,
});
function scoringSimpleEnabled(): boolean {
    // DEFAULT-ON (owner-adopted 2026-08-10): the simple grade model replaces the
    // war_cost_index weighted-clamp-cap machine. Explicit '0'/'false'/'off' restores the
    // legacy path (regression/comparison). Pairs with the DEFAULT-ON casualty decouple —
    // the frozen 140k/95k/35k baseline is calibrated for decoupled (realistic) casualties.
    const raw = typeof process === 'undefined' ? undefined : process.env.AWWV_SCORING_SIMPLE;
    if (raw === '0' || raw === 'false' || raw === 'off') return false;
    return true;
}
/** Signed grade step from casualties vs the frozen historical baseline. +1..−2. */
export function humanCostGradeShift(faction: string, casualties: number): number {
    const hist = HISTORICAL_CASUALTY_BASELINE[faction];
    if (!hist || hist <= 0 || casualties <= 0) return 0;
    const ratio = casualties / hist;
    if (ratio <= 0.75) return 1;   // materially less bloody than history
    if (ratio < 1.33) return 0;    // historical-level (par)
    if (ratio < 2.0) return -1;    // markedly bloodier
    return -2;                     // catastrophically bloodier
}
/**
 * Apply the human-cost shift to an earned grade (simple model). Positive shift is
 * floored at A — cost alone never manufactures A+ (that stays anchor-reserved).
 */
export function applyHumanCostShift(grade: string, faction: string, casualties: number): string {
    const shift = humanCostGradeShift(faction, casualties);
    if (shift === 0) return grade;
    const earnedIdx = gradeRank(grade);
    let newIdx = earnedIdx - shift; // +1 shift ⇒ toward the better (lower-index) grade
    if (shift > 0 && earnedIdx > 0) newIdx = Math.max(1, newIdx); // no A+ from cost alone
    newIdx = Math.max(0, Math.min(GRADE_RANK.length - 1, newIdx));
    return GRADE_RANK[newIdx]!;
}
/** Sum a faction's cumulative casualties (killed + wounded + missing) from the ledger. */
function factionTotalCasualties(state: GameState, faction: string): number {
    const l = state.military?.casualty_ledger?.[faction];
    return l ? (l.killed ?? 0) + (l.wounded ?? 0) + (l.missing_captured ?? 0) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Faction Grade Anchors — historical outcome-based grading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Grade anchor: describes the conditions for each letter grade per faction.
 * Evaluated in order — first match wins.
 */
interface GradeAnchor {
    grade: string;
    description: string;
    test: (cap: NegotiationBreakdown, state: GameState) => boolean;
}

const RBIH_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Defended most territory, minimal civilian losses, enclaves held, strong international position',
        test: (cap) =>
            cap.territory_controlled_pct > 33 &&
            cap.enclaves_lost.length === 0 &&
            cap.war_crimes_events === 0,
    },
    {
        grade: 'A',
        description: 'Roughly historical outcome — 30-33% territory, Sarajevo held, enclaves mostly defended',
        test: (cap) =>
            cap.territory_controlled_pct >= 30 &&
            cap.enclaves_lost.length <= 1 &&
            !cap.enclaves_lost.includes('sarajevo'),
    },
    {
        grade: 'B',
        description: 'Lost some key positions but maintained core territory, moderate civilian losses',
        test: (cap) =>
            cap.territory_controlled_pct >= 25 &&
            !cap.enclaves_lost.includes('sarajevo'),
    },
    {
        grade: 'C',
        description: 'Lost significant territory, high civilian casualties, enclaves fallen early',
        test: (cap) =>
            cap.territory_controlled_pct >= 18 &&
            cap.enclaves_lost.length <= 3,
    },
    {
        grade: 'D',
        description: 'Catastrophic losses, most cities fallen, massive displacement',
        test: (cap) => cap.territory_controlled_pct >= 10,
    },
    {
        grade: 'F',
        description: 'Faction effectively destroyed',
        test: () => true, // fallback
    },
];

const RS_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Held >55% territory, maintained international standing, avoided catastrophic isolation',
        test: (cap) =>
            cap.territory_controlled_pct > 55 &&
            cap.war_crimes_events <= 2, // proxy for international standing
    },
    {
        grade: 'A',
        description: '49% contiguous territory, entity intact, Belgrade relationship intact',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.RS?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct >= 49 && cohesion >= 30;
        },
    },
    {
        grade: 'B',
        description: '45-49% territory, some international concessions',
        test: (cap) =>
            cap.territory_controlled_pct >= 45,
    },
    {
        grade: 'C',
        description: '<45% territory, international isolation',
        test: (cap) =>
            cap.territory_controlled_pct >= 40,
    },
    {
        grade: 'D',
        description: '<40% territory, military collapse, patron abandonment',
        test: (cap) => cap.territory_controlled_pct >= 30,
    },
    {
        grade: 'F',
        description: 'Entity dissolved or catastrophic military collapse',
        test: () => true,
    },
];

const HRHB_GRADE_ANCHORS: GradeAnchor[] = [
    {
        grade: 'A+',
        description: 'Strong territorial position with high political cohesion, Herzegovina secured',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.HRHB?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct > 20 && cohesion >= 50;
        },
    },
    {
        grade: 'A',
        description: 'Federation partner with constitutional protections, Herzegovina intact',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.HRHB?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct >= 15 && cohesion >= 40;
        },
    },
    {
        grade: 'B',
        description: 'Federation absorbed but Croat interests protected',
        test: (cap, state) => {
            const dimStore = state.military?.negotiation?.strategic_dimensions;
            const cohesion = dimStore?.HRHB?.internal_cohesion?.effective_value ?? 50;
            return cap.territory_controlled_pct >= 12 && cohesion >= 30;
        },
    },
    {
        grade: 'C',
        description: 'Marginalized within Federation, lost central Bosnia',
        test: (cap) =>
            cap.territory_controlled_pct >= 8,
    },
    {
        grade: 'D',
        description: 'No constitutional protections, Croatian support withdrawn',
        test: (cap) => cap.territory_controlled_pct >= 4,
    },
    {
        grade: 'F',
        description: 'Faction irrelevant at negotiations',
        test: () => true,
    },
];

const FACTION_GRADE_ANCHORS: Record<string, GradeAnchor[]> = {
    RBiH: RBIH_GRADE_ANCHORS,
    RS: RS_GRADE_ANCHORS,
    HRHB: HRHB_GRADE_ANCHORS,
};

// ═══════════════════════════════════════════════════════════════════════════
// Outcome Classification — maps grade + condemnation flags to OutcomeClass
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify a faction's endgame outcome from grade, breakdown, and condemnation flags.
 * Pure, deterministic. Condemnation flags can force hollow_victory or failure
 * regardless of territorial/military success.
 *
 * Evaluation order matters — checked top to bottom, first match wins.
 */
export function classifyOutcome(
    _faction: string,
    breakdown: NegotiationBreakdown,
    _dimensionStore: DimensionStore | undefined,
    grade: string,
    _pyrrhicScore: number,
    condemnationFlags: string[],
): OutcomeClass {
    // Collapse: faction destroyed or zero territory
    if (breakdown.territory_controlled_pct <= 0 || grade === 'F') return 'collapse';

    // Failure: grade D or genocide condemnation forces failure
    if (grade === 'D' || condemnationFlags.includes('genocide_condemnation')) return 'failure';

    // Hollow victory: any condemnation flag taints the result at ANY territory level.
    // (Pyrrhic scoring panel, red-team L2, 2026-08-10: the prior `territory > 30` gate let
    // a small faction — e.g. HRHB at 18% — commit an authorized sweep yet read a clean
    // survival. A condemnation must taint regardless of how much territory is held.)
    if (condemnationFlags.length > 0) return 'hollow_victory';

    // Strategic success: A+ grade, strong position
    if (grade === 'A+') return 'strategic_success';

    // Survival: A grade, maintained position
    if (grade === 'A') return 'survival';

    // Negotiated escape: B grade, acceptable compromise
    if (grade === 'B') return 'negotiated_escape';

    // Pyrrhic success: C grade, won something but at great cost
    if (grade === 'C') return 'pyrrhic_success';

    // Default to failure for anything unmapped
    return 'failure';
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the composite Pyrrhic Score (0-100) for a faction.
 * Uses DIMENSION_WEIGHTS from strategic_dimensions.ts.
 * Falls back to 50 if no dimension store is available.
 */
export function computePyrrhicScore(_breakdown: NegotiationBreakdown, faction: string, dimensionStore?: DimensionStore): number {
    if (!dimensionStore) return 50; // TODO: remove NegotiationBreakdown param once all callers pass dimensionStore
    return clamp(Math.round(computeNegotiatingCapital(dimensionStore, faction) * 10) / 10, 0, 100);
}

/**
 * Compute the letter grade for a faction based on historical anchors.
 * Returns { grade, description } where grade is 'A+', 'A', 'B', 'C', 'D', or 'F'.
 */
export function computeFactionGrade(
    capital: NegotiationBreakdown,
    faction: string,
    state: GameState,
): { grade: string; description: string } {
    const anchors = FACTION_GRADE_ANCHORS[faction];
    if (!anchors) return { grade: 'F', description: 'Unknown faction' };

    for (const anchor of anchors) {
        if (anchor.test(capital, state)) {
            return { grade: anchor.grade, description: anchor.description };
        }
    }

    return { grade: 'F', description: 'Faction effectively destroyed' };
}

/**
 * Compute per-dimension letter grades for a faction.
 * Uses strategic dimensions when available, falls back to zeros.
 */
export function computeDimensionGrades(_breakdown: NegotiationBreakdown, faction?: string, dimensionStore?: DimensionStore): DimensionGrade[] {
    return STRATEGIC_DIMENSIONS.map((dim) => {
        const score = (faction ? dimensionStore?.[faction]?.[dim]?.effective_value : undefined) ?? 0;
        return {
            dimension: dim,
            label: formatDimensionLabel(dim),
            score,
            grade: gradeDimension(score),
        };
    });
}

/**
 * Compute a single faction's full verdict.
 */
export function computeFactionVerdict(
    state: GameState,
    faction: string,
): FactionVerdict {
    const neg = state.military?.negotiation;
    const capital = neg?.capital[faction];

    const dimStore = neg?.strategic_dimensions;

    if (!capital) {
        // No negotiation data — return minimal verdict
        const emptyDims = STRATEGIC_DIMENSIONS.map((dim) => ({
            dimension: dim,
            label: formatDimensionLabel(dim),
            score: 0,
            grade: 'F' as string,
        }));
        return {
            faction,
            pyrrhic_score: 0,
            grade: 'F',
            grade_description: 'No negotiation data available',
            capital_breakdown: null,
            dimension_grades: emptyDims,
            outcome_class: 'collapse' as OutcomeClass,
            condemnation_flags: [],
        };
    }

    const pyrrhicScore = computePyrrhicScore(capital, faction, dimStore);
    const earned = computeFactionGrade(capital, faction, state);

    // War-cost floor (Free War Phase 3, Part A): a long, bloody war can never
    // read as a clean triumph. Post-termination reflection — reads accrued cost,
    // caps the grade downward only. Territory alone can no longer buy A+.
    const costIndex = computeWarCostIndex(state, faction);
    // Human-cost step (simple model, flag ON) OR the legacy war_cost_index cap (default).
    // Either way the atrocity condemnation LETTER-grade cap (§6 bright line) is applied
    // AFTER the condemnation flags are collected below, then drives description +
    // classifyOutcome. Default OFF ⇒ the legacy cap ⇒ byte-identical.
    const costCappedGrade = scoringSimpleEnabled()
        ? applyHumanCostShift(earned.grade, faction, factionTotalCasualties(state, faction))
        : capGradeByCost(earned.grade, costIndex);

    const dimensionGrades = computeDimensionGrades(capital, faction, dimStore);

    // DISPLAY FRESHNESS (Free War Phase 5, Codex P2 on #96): the grade above is
    // capped using the FRESH atrocity source (max of the capital snapshot and the
    // always-current displacement aggregates — see computeAtrocitySubScore). On a
    // TERMINAL turn the capital snapshot can be frozen one step before
    // compute-negotiation-capital refreshes its displacement copy, so the raw
    // capital's refugees_created / civilian_casualties_caused can be STALE. If we
    // displayed the raw snapshot, the verdict would show a grade derived from
    // fresh terminal-turn atrocities next to stale pre-refresh numbers — an
    // internally inconsistent display. So the displayed breakdown takes the SAME
    // max(capital, fresh) the grade used. EMERGENT-GATED to keep historical mode
    // byte-identical (the term is emergent-only by construction).
    const displayBreakdown = freshenBreakdownForDisplay(state, faction, capital);

    // Collect condemnation flags from rupture consequences (Ring 2)
    const condemnationFlags = collectCondemnationFlags(state, faction);
    // EMERGENT-ONLY non-genocide authorized_cleansing_condemnation (§3.4 tier — see the
    // AUTHORIZED_CLEANSING_WAR_CRIMES_MIN / CATASTROPHIC_CIVILIAN_HARM_MIN block above):
    // significant cleansing that isn't the adjudicated Srebrenica genocide still taints the
    // outcome to hollow_victory, making atrocity grade-DECISIVE where the additive cost term
    // is inert. UNION of two calendar-clean emergent signals — ≥1 authorized paramilitary
    // sweep OR catastrophic siege/encirclement civilian harm. Skipped when genocide is already
    // flagged (that forces the worse `failure`). Historical/unset mode untouched
    // (emergent-gated), keeping the baseline verdict byte-identical.
    const atrocityCapital = state.military?.negotiation?.capital?.[faction];
    const emergentWarCrimes = atrocityCapital?.war_crimes_events_emergent ?? 0;
    // Use the FRESHENED displacement aggregate (displayBreakdown already applies
    // max(capital, freshDisplacementHarm) above), NOT the raw capital snapshot: on a
    // TERMINAL turn capital can be frozen one step before the fresh displacement copy
    // lands, which would let a catastrophic siege crossing the threshold on the final
    // turn escape the flag (red-team staleness condition, §6-panel v2).
    const civilianHarmCaused = displayBreakdown.civilian_casualties_caused
        ?? (atrocityCapital?.civilian_casualties_caused ?? 0);
    if (state.meta?.decision_mode === 'emergent'
        && !condemnationFlags.includes('genocide_condemnation')
        && !condemnationFlags.includes('authorized_cleansing_condemnation')
        && (emergentWarCrimes >= AUTHORIZED_CLEANSING_WAR_CRIMES_MIN
            || civilianHarmCaused >= CATASTROPHIC_CIVILIAN_HARM_MIN)) {
        condemnationFlags.push('authorized_cleansing_condemnation');
        condemnationFlags.sort();
    }
    // §6 bright-line LETTER-grade cap (Pyrrhic scoring panel, red-team L1, 2026-08-10):
    // a condemnation caps the letter grade INDEPENDENT of the cost index, so atrocity can
    // never reach A even once scoring de-saturates. Worst-of cost-cap and condemnation-cap.
    const grade = capGradeByCondemnation(costCappedGrade, condemnationFlags);
    const description = grade === earned.grade
        ? earned.description
        : grade !== costCappedGrade
            ? `${earned.description} — capped by atrocity condemnation`
            : scoringSimpleEnabled()
                ? `${earned.description} — adjusted by human cost vs. the historical war`
                : `${earned.description} — capped by war cost (index ${costIndex.toFixed(2)})`;
    const baseOutcomeClass = classifyOutcome(faction, displayBreakdown, dimStore, grade, pyrrhicScore, condemnationFlags);

    // Comprehensive Dayton D3 (2026-06-07): a high-dysfunction peace can never read
    // as a clean settlement, regardless of territory. capOutcomeByPeaceDysfunction
    // pulls a clean-win class (strategic_success / survival / negotiated_escape)
    // down to hollow_victory when the index crosses the threshold; it never improves
    // an outcome. Pure read of the frozen Dayton result. EMERGENT-GATED: the index
    // is null in historical/unset mode (and for non-Dayton endings), so this is a
    // no-op there and the historical baselines stay byte-identical. Mirrors the
    // existing condemnation-flag cap inside classifyOutcome.
    // Graduated cap (institutional-architecture expansion 2026-06-07): the
    // breakdown's structural flags feed the ≥80 ratified_cleansing → failure band.
    // computePeaceDysfunctionBreakdown is the SAME emergent-gated pure read; null
    // in historical/unset mode and for non-Dayton endings, so this stays a no-op
    // there and the historical baselines remain byte-identical.
    const dysfunctionBreakdown = computePeaceDysfunctionBreakdown(state);
    const outcomeClass = capOutcomeByPeaceDysfunction(
        baseOutcomeClass,
        dysfunctionBreakdown?.index ?? null,
        dysfunctionBreakdown?.flags,
    );

    return {
        faction,
        pyrrhic_score: pyrrhicScore,
        grade,
        grade_description: description,
        capital_breakdown: displayBreakdown,
        dimension_grades: dimensionGrades,
        outcome_class: outcomeClass,
        condemnation_flags: condemnationFlags,
    };
}

/**
 * Compute the complete game verdict for all factions.
 */
export function computeFullVerdict(state: GameState): GameVerdict {
    const meta = state.meta;
    const turn = meta.turn ?? 0;
    const date = typeof meta.date === 'string' ? meta.date : `Week ${turn}`;
    const neg = state.military?.negotiation;

    // Determine outcome type
    const outcome = meta.outcome;
    let outcomeType: 'dayton' | 'peace_plan' | 'termination' = 'termination';
    let outcomeLabel = 'War Ended';

    if (neg?.dayton_result) {
        outcomeType = 'dayton';
        outcomeLabel = 'Dayton Agreement';
    } else if (outcome?.startsWith('ceasefire') || outcome?.startsWith('peace_plan')) {
        outcomeType = 'peace_plan';
        outcomeLabel = 'Peace Agreement';
    } else if (outcome?.startsWith('victory_')) {
        outcomeLabel = outcome.replace('victory_', '') + ' Prevails';
    } else if (outcome === 'timeout_stalemate') {
        outcomeLabel = 'Exhaustion Stalemate';
    } else if (outcome === 'faction_collapse') {
        outcomeLabel = 'Faction Collapse';
    } else if (outcome) {
        outcomeLabel = outcome.replace(/_/g, ' ');
    }

    // Build per-faction verdicts
    const factionVerdicts: Record<string, FactionVerdict> = {};
    for (const faction of CANONICAL_FACTIONS) {
        factionVerdicts[faction] = computeFactionVerdict(state, faction);
    }

    // D2/D3 (2026-06-07): surface the settlement-level autonomy + dysfunction
    // metrics at the top of the verdict for display. The dysfunction index is the
    // live (emergent-gated) computation — null in historical/unset mode and for
    // non-Dayton endings, so non-emergent verdicts carry undefined (back-compat).
    const daytonResult = neg?.dayton_result;
    const dysfunctionIndex = computePeaceDysfunctionIndex(state);

    return {
        outcome_type: outcomeType,
        outcome_label: outcomeLabel,
        turn,
        date,
        duration_weeks: turn,
        faction_verdicts: factionVerdicts,
        dayton_result: daytonResult,
        entity_autonomy_index: daytonResult?.entity_autonomy_index,
        peace_dysfunction_index: dysfunctionIndex ?? daytonResult?.peace_dysfunction_index,
        peace_dysfunction_flags: daytonResult?.peace_dysfunction_flags,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function formatDimensionLabel(dim: string): string {
    return dim
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
