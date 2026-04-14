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
 * - RBiH war_crimes_tolerance = 0.10 (hard floor, never changes regardless of situation_score)
 * - HRHB war_crimes_tolerance = 0.55 (raised from 0.4 per Prlic/Kordic ICTY findings)
 * - RS patron_confidence weight = 0.20 (accurate for 1992; decays to vulnerability post-1993)
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { DimensionId } from '../events/event_types.js';
import { clamp } from '../../utils/math.js';

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
     * Points above the historical option score required for the bot to deviate.
     * Lower = more erratic / reactive. Higher = more cautious.
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
    /**
     * Tolerance for war crimes by subordinates. [0, 1].
     * ICTY-verified: RS = 0.70, HRHB = 0.55, RBiH = 0.10.
     */
    war_crimes_tolerance: number;
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
 *   war_crimes_tolerance = 0.70 (ICTY-verified). patron_confidence 0.20
 *   (secondary in 1992, decays to liability post-1993).
 * - RBiH: Izetbegovic — Survival-Internationalist. No leadership-directed JCE.
 *   war_crimes_tolerance = 0.10 (hard floor).
 * - HRHB: Boban — Opportunist-Patron-Dependent. Reactive to Zagreb.
 *   war_crimes_tolerance = 0.55 (Prlic/Kordic ICTY findings on systematic
 *   HVO ethnic cleansing policy; raised from 0.4).
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
        divergence_threshold: 12,
        situation_weight_curve: {
            early: 0.7,
            late: 0.4,
            war_week_crossover: 120,
        },
        war_crimes_tolerance: 0.70,
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
        divergence_threshold: 18,
        situation_weight_curve: {
            early: 0.7,
            late: 0.4,
            war_week_crossover: 120,
        },
        war_crimes_tolerance: 0.10,
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
        divergence_threshold: 8,
        situation_weight_curve: {
            early: 0.7,
            late: 0.4,
            war_week_crossover: 120,
        },
        war_crimes_tolerance: 0.55,
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
    // war_exhaustion is unbounded monotonic (Engine Invariants §8), typically 0-600+
    // at 40w. Normalize to 0-100 scale for situation_score: divide by 6 so that
    // exhaustion 600 maps to 100. Previous 0-100 clamp made ALL factions read 100
    // after ~w5, contributing zero differential to political decisions.
    const exhaustion_level = clamp(
        (state.political?.war_exhaustion?.[faction] ?? 0) / 6,
        0,
        100,
    );

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
    // Derived from the last 3 turn_summaries' territory_snapshot for this faction.
    let territory_trend: 'gaining' | 'stable' | 'losing' = 'stable';
    const summaries = state.turn_summaries;
    if (Array.isArray(summaries) && summaries.length >= 2) {
        const last3 = summaries.slice(-3);
        // Use territory_snapshot if available; fall back to territory_controlled_pct from capital.
        const getPct = (idx: number): number | undefined => {
            const s = last3[idx];
            if (!s) return undefined;
            const snap = s.territory_snapshot?.[faction];
            if (snap != null) return snap;
            return undefined;
        };
        const earliest = getPct(0);
        const latest = getPct(last3.length - 1);
        if (earliest != null && latest != null) {
            const delta = latest - earliest;
            if (delta > 1.0) {
                territory_trend = 'gaining';
            } else if (delta < -1.0) {
                territory_trend = 'losing';
            } else {
                territory_trend = 'stable';
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
