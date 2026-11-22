/**
 * v0.8.2 Phase 1 — Political Leader Bot: Personality Framework
 *
 * Types and pure functions for the political personality system.
 * No GameState writes. No side effects. No imports from commander system.
 *
 * PoliticalPersonality = faction decision-weights for the bot engine.
 * PoliticalLeaderProfile (state/political_leader_types.ts) = per-leader static scenario data.
 * These are distinct. Do NOT merge.
 *
 * Design contract: every political decision using personality-weighted scoring
 * MUST have a PoliticalAssessment in scope at call time. No assessment = use pickBotResponseV1 fallback.
 *
 * Historian gate applied 2026-04-05:
 * - war_crimes_tolerance RETIRED 2026-11-22 (§6 sitting 8-0, lane C): a constant nothing read;
 *   no scorer or assessment consumed it, so it shaped no decision. Removal is hash-neutral.
 * - RS patron_confidence weight = 0.20, static all war. (B5 fix 5, 2026-11-16, historian + game-designer:
 *   an earlier note that it "decays post-1993" was inaccurate. Pale's regard for Belgrade rose and fell
 *   with each plan — defiant on Vance-Owen May 1993, compliant Aug-Oct 1993, defiant on the Contact
 *   Group plan and the Aug 1994 blockade, deferring again by Aug 1995 — and that split is modelled as
 *   state: the patron dimension, override_authority and the Belgrade events, not this weight.)
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { DimensionId } from '../events/event_types.js';
import { clamp } from '../../utils/math.js';
import { recoveredExhaustionLevel } from '../../state/war_weariness_bands.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Faction decision-weights for the political bot engine.
 *
 * NOT the same as PoliticalLeaderProfile (state/political_leader_types.ts),
 * which is a static per-leader personality loaded from scenario JSON.
 * PoliticalPersonality encodes how the faction *weighs strategic dimensions*
 * when scoring bot options — a separate layer of abstraction.
 */
export interface PoliticalPersonality {
    faction: FactionId;
    /** Human-readable archetype label (e.g. 'expansionist_nationalist'). */
    archetype: string;
    /**
     * Weights per strategic dimension for option scoring.
     * Keys are DimensionId. Missing keys treated as weight 0.
     * Weights should sum to 1.0.
     */
    dimension_weights: Partial<Record<DimensionId, number>>;
    /** Willingness to accept risky options. [0, 1]. */
    risk_tolerance: number;
    /** Sensitivity to patron override_authority signals. [0, 1]. */
    patron_sensitivity: number;
    /**
     * Score margin (scorePoliticalOption units) by which an option must beat the event's
     * authored historical response before an emergent bot takes it, and then only once the
     * war's map has left history's territory band (historical_territory_band.ts). A tie or a
     * smaller margin keeps history. Lower = more reactive. Read by `divergesFromHistory`
     * (political_event_decision.ts). B5 fix 4, 2026-11-16: the authored 12/18/8 were on a
     * different scale from the built scorer (largest margin in a run ≈4.4; state terms ≤≈1.3),
     * so they are rescaled ÷6, with RS raised to RBiH's value on the historian's ruling that
     * Pale's institutional commitments were at least as firm as Sarajevo's.
     */
    divergence_threshold: number;
    /**
     * How the situation_score is weighted over time.
     * Early in the war: battlefield situation dominates.
     * Late: strategic dimensions dominate.
     */
    situation_weight_curve: {
        /** Weight applied at war week 0. */
        early: number;
        /** Weight applied at war week >= war_week_crossover. */
        late: number;
        /** War week at which the late weight fully applies. */
        war_week_crossover: number;
    };
}

/**
 * Per-faction situational assessment computed each time the political bot
 * needs to score options. Read-only snapshot derived from GameState.
 */
export interface PoliticalAssessment {
    /** [0, 100] overall military situation strength. */
    situation_score: number;
    /** [0, 100] strategic dimension composite (personality-weighted). */
    dimension_score: number;
    /**
     * Blended score: situation_weight * situation_score + (1 - situation_weight) * dimension_score.
     * Used as primary input to option scoring.
     */
    blended_score: number;
    /** Territory trend derived from last 3 turn summaries. */
    territory_trend: 'gaining' | 'stable' | 'losing';
    /** [0, 1] fraction of combat-effective brigades to total faction brigades. */
    military_strength: number;
    /** [0, 100] patron override_authority (higher = more patron pressure). */
    patron_pressure: number;
    /** [0, 100] war exhaustion level. */
    exhaustion_level: number;
    /** Monotonic negotiation pressure accumulator (unbounded, typically 0-4000+ at w40). */
    negotiation_pressure: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// POLITICAL_PERSONALITIES constant
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonical political personalities for all three AWWV factions.
 *
 * Historian gate 2026-04-05:
 * - RS: Karadzic — Expansionist-Nationalist. Four JCEs, Directive 7.
 *   patron_confidence 0.20 (static; the Pale-Belgrade split is state, see the header).
 * - RBiH: Izetbegovic — Survival-Internationalist. No leadership-directed JCE.
 * - HRHB: Boban — Opportunist-Patron-Dependent. Reactive to Zagreb.
 *
 * Note: 'humanitarian_standing' is not in the canonical DimensionId union but
 * is included as a forward-compatibility key. It will be treated as weight 0
 * by computePoliticalAssessment until it appears in the dimension store.
 */
// NOTE: The dimension_weights below are intentionally different from DIMENSION_WEIGHTS
// in strategic_dimensions.ts — they weight personality scoring factors for bot political
// decision-making, not Dayton negotiating capital composite scores.
export const POLITICAL_PERSONALITIES: Record<FactionId, PoliticalPersonality> = {
    RS: {
        faction: 'RS',
        archetype: 'expansionist_nationalist',
        dimension_weights: {
            territorial_legitimacy: 0.30,
            military_credibility: 0.25,
            patron_confidence: 0.20,
            international_standing: 0.10,
            internal_cohesion: 0.10,
            // humanitarian_standing: 0.05 — not yet a DimensionId; encoded in comment only
            // remaining 0.05 folded into negotiating_leverage as a catch-all
            negotiating_leverage: 0.05,
        },
        risk_tolerance: 0.65,
        patron_sensitivity: 0.45,
        // Assembly platform, referendums, peace-plan rejections: firm commitments (BB1 pp.44, 59, 61).
        divergence_threshold: 3.0,
        situation_weight_curve: {
            early: 0.7,
            late: 0.4,
            war_week_crossover: 120,
        },
    },

    RBiH: {
        faction: 'RBiH',
        archetype: 'survival_internationalist',
        dimension_weights: {
            international_standing: 0.30,
            internal_cohesion: 0.25,
            // humanitarian_standing: 0.20 — not yet a DimensionId; folded into negotiating_leverage
            negotiating_leverage: 0.20,
            territorial_legitimacy: 0.15,
            military_credibility: 0.05,
            patron_confidence: 0.05,
        },
        risk_tolerance: 0.35,
        patron_sensitivity: 0.60,
        divergence_threshold: 3.0,
        situation_weight_curve: {
            early: 0.7,
            late: 0.4,
            war_week_crossover: 120,
        },
    },

    HRHB: {
        faction: 'HRHB',
        archetype: 'opportunist_patron_dependent',
        dimension_weights: {
            patron_confidence: 0.30,
            territorial_legitimacy: 0.25,
            military_credibility: 0.20,
            internal_cohesion: 0.10,
            international_standing: 0.10,
            // humanitarian_standing: 0.05 — not yet a DimensionId; folded into negotiating_leverage
            negotiating_leverage: 0.05,
        },
        risk_tolerance: 0.50,
        patron_sensitivity: 0.80,
        // Followed Zagreb's turns (Feb-Mar 1994): the most reactive leadership.
        divergence_threshold: 1.33,
        situation_weight_curve: {
            early: 0.7,
            late: 0.4,
            war_week_crossover: 120,
        },
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// Accessor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the PoliticalPersonality for the given faction.
 *
 * Throws if faction is not found. All three canonical factions are defined,
 * so this should never throw in normal operation.
 */
export function getPoliticalPersonality(faction: FactionId): PoliticalPersonality {
    const personality = POLITICAL_PERSONALITIES[faction];
    if (!personality) {
        throw new Error(`[political_personality] No PoliticalPersonality defined for faction '${faction}'.`);
    }
    return personality;
}

// ═══════════════════════════════════════════════════════════════════════════
// computeSituationWeight
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the situation_score weight for a given war week.
 *
 * Pure function — takes raw war week number, NOT GameState.
 * The caller is responsible for computing warWeek from state.meta.turn.
 *
 * - At warWeek <= 0: returns curve.early
 * - At warWeek >= curve.war_week_crossover: returns curve.late
 * - In between: linear interpolation
 * - Result clamped to [0.4, 0.7]
 */
export function computeSituationWeight(
    warWeek: number,
    personality: PoliticalPersonality,
): number {
    const { early, late, war_week_crossover } = personality.situation_weight_curve;

    let weight: number;
    if (warWeek <= 0) {
        weight = early;
    } else if (warWeek >= war_week_crossover) {
        weight = late;
    } else {
        const t = warWeek / war_week_crossover; // [0, 1)
        weight = early + (late - early) * t;
    }

    return clamp(weight, 0.4, 0.7);
}

// ═══════════════════════════════════════════════════════════════════════════
// computePoliticalAssessment
// ═══════════════════════════════════════════════════════════════════════════

/** Number of most-recent territory snapshots the trend compares (newest vs oldest of the window). */
export const TERRITORY_TREND_WINDOW = 3;
/** Area change, in percentage points across the window, that counts as gaining or losing. */
export const TERRITORY_TREND_THRESHOLD_PP = 1.0;

/**
 * Derives a PoliticalAssessment from current GameState for the given faction
 * and personality. Read-only — no writes to GameState.
 *
 * All GameState reads use safe optional-chaining with fallbacks so this
 * function can be called at any point in scenario initialization order.
 *
 * Determinism guarantee: pure function of (state, faction, personality).
 * No Math.random(), no Date.now(), no side effects.
 */
export function computePoliticalAssessment(
    state: GameState,
    faction: FactionId,
    personality: PoliticalPersonality,
): PoliticalAssessment {
    // ── War week proxy ──────────────────────────────────────────────────────
    const warWeek = state.meta.turn ?? 0;

    // ── Military strength ───────────────────────────────────────────────────
    // combat_effective_brigades is a future field; fall back to 0.5 if absent.
    const capitalEntry = state.military?.negotiation?.capital?.[faction] as
        | (Record<string, unknown> & { combat_effective_brigades?: number })
        | undefined;
    const combatEffective: number = capitalEntry?.combat_effective_brigades ?? -1;

    let military_strength: number;
    if (combatEffective >= 0) {
        // Count total active brigades for this faction from formations.
        const formations = state.military?.formations ?? {};
        let totalBrigades = 0;
        for (const f of Object.values(formations)) {
            if (
                f.faction === faction &&
                f.status === 'active' &&
                (f.kind === 'brigade' || f.kind === undefined)
            ) {
                totalBrigades++;
            }
        }
        military_strength = totalBrigades > 0 ? clamp(combatEffective / totalBrigades, 0, 1) : 0.5;
    } else {
        // Field not yet populated — neutral fallback.
        military_strength = 0.5;
    }

    // ── Patron pressure ─────────────────────────────────────────────────────
    const rawOverrideAuthority: number =
        state.military?.negotiation?.patron_relationships?.[faction]?.override_authority ?? 0;
    const patron_pressure = clamp(rawOverrideAuthority, 0, 100);

    // ── Exhaustion ──────────────────────────────────────────────────────────
    // war_exhaustion approaches its 10000 cap asymptotically (Engine Invariants §8.6; combat/exhaustion.ts).
    // A full 188w war ends near it (historical end state: HRHB ~8100, RBiH ~8700, RS ~9800).
    // Read it on the shared 0..100 scale (recoveredExhaustionLevel, the same read as the war-weariness
    // bands). The earlier /600 divisor kept exhaustion_level at or below ~16 all war, so a war-weary
    // faction never read as exhausted and the survival term (situation_score < 50) could not fire.
    const exhaustion_level = recoveredExhaustionLevel(state.political?.war_exhaustion?.[faction] ?? 0);

    // ── Situation score ─────────────────────────────────────────────────────
    // Composite of military strength, low patron pressure, and low exhaustion.
    const situation_score = clamp(
        (military_strength * 100) * 0.4
        + (100 - patron_pressure) * 0.3
        + (100 - exhaustion_level) * 0.3,
        0,
        100,
    );

    // ── Dimension score ─────────────────────────────────────────────────────
    // Weighted sum over the personality's dimension_weights.
    // Reads from state.military.negotiation.strategic_dimensions (DimensionStore).
    const dimStore = state.military?.negotiation?.strategic_dimensions;
    let weightedSum = 0;
    let weightTotal = 0;
    for (const [dimKey, weight] of Object.entries(personality.dimension_weights)) {
        if (weight == null || weight === 0) continue;
        const effectiveValue: number =
            dimStore?.[faction]?.[dimKey]?.effective_value ?? 50;
        weightedSum += weight * effectiveValue;
        weightTotal += weight;
    }
    const dimension_score = clamp(
        weightTotal > 0 ? weightedSum / weightTotal : 50,
        0,
        100,
    );

    // ── Blended score ───────────────────────────────────────────────────────
    const situation_weight = computeSituationWeight(warWeek, personality);
    const blended_score = clamp(
        situation_weight * situation_score + (1 - situation_weight) * dimension_score,
        0,
        100,
    );

    // ── Territory trend ─────────────────────────────────────────────────────
    // Derived from the three most recent turn_summaries that carry a territory_snapshot for this
    // faction. turn_summaries is stored most-recent-first (war_phase_briefing_steps prepends) and
    // territory_snapshot is an area FRACTION (0..1, compile_turn_summary), so the change is converted
    // to percentage points before it meets the ±1 pp threshold.
    let territory_trend: 'gaining' | 'stable' | 'losing' = 'stable';
    const summaries = state.turn_summaries;
    if (Array.isArray(summaries)) {
        const recentSnaps: number[] = [];
        for (const s of summaries) {
            const snap = s?.territory_snapshot?.[faction];
            if (snap == null) continue;
            recentSnaps.push(snap);
            if (recentSnaps.length === TERRITORY_TREND_WINDOW) break;
        }
        if (recentSnaps.length >= 2) {
            const latest = recentSnaps[0];
            const earliest = recentSnaps[recentSnaps.length - 1];
            const deltaPp = (latest - earliest) * 100;
            if (deltaPp > TERRITORY_TREND_THRESHOLD_PP) {
                territory_trend = 'gaining';
            } else if (deltaPp < -TERRITORY_TREND_THRESHOLD_PP) {
                territory_trend = 'losing';
            }
        }
    }

    return {
        situation_score,
        dimension_score,
        blended_score,
        territory_trend,
        military_strength,
        patron_pressure,
        exhaustion_level,
        negotiation_pressure: (state.factions ?? []).find(f => f.id === faction)?.negotiation?.pressure ?? 0,
    };
}
