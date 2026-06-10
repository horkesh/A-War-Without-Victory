/**
 * War-Weariness / Exhaustion FEEL surface — Collapse Repurpose Design A.
 *
 * Provenance: docs/40_reports/proposals/20260610_COLLAPSE_REPURPOSE_EXHAUSTION_SCOPE.md
 * (Design A — "War-Weariness Surface", C-feel-only, framing a+c). RECOMMENDED FIRST.
 *
 * PURE READ-MODEL. This module derives a player-facing "will-to-fight /
 * political-collapse pressure" descriptor from data already on the live
 * GameState — it touches NO sim state, writes NO persisted field, bumps NO
 * save schema, and moves NO territory or combat. It is the "feel" half of the
 * shelved collapse pipeline: the negative-sum grind made *visible* without the
 * territory-moving Tier-1/3D machine (which stays dormant — §6 G1 guard
 * untouched, this surface never writes per-OSID damage).
 *
 * SIGNAL: `state.political.war_exhaustion[fid] / 100`.
 *   - `war_exhaustion` is the engine's open-ended, MONOTONIC (irreversible —
 *     Engine Invariants §8) faction war-weariness accumulator, rescaled 0..10000
 *     (cap 10000; src/sim/combat/exhaustion.ts). `/100` recovers the original
 *     0..100 percentage scale the collapse Tier-0 thresholds were authored on
 *     (phase3c_exhaustion_collapse_gating.ts: crosses ~65 in early-mid 1993,
 *     saturates ~100 by ~w80).
 *   - Because it is monotonic, the CURRENT descriptor level is also the
 *     highest-ever level: a faction now "cracking" necessarily passed
 *     "strained" earlier. This is what lets the Chronicle beat be derived
 *     deterministically with no per-turn history field (see warWearinessChronicle.ts).
 *
 * HISTORY: by 1995 ALL three factions were spent — ARBiH manpower-tapped, VRS
 * over-extended and desertion-ridden after Krajina, HVO patron-constrained. The
 * descriptor is universal and negative-sum: every faction grinds toward
 * collapse, nobody "wins". `war_exhaustion` already encodes this (it gates
 * Washington/ceasefire timing today), so the feel layer reuses a field already
 * validated against that history.
 *
 * Determinism: pure function of its numeric input. No RNG, no clock.
 */

import type { CollapseEligibilityState, FactionId } from '../../../state/game_state.js';

/** Ordered war-weariness bands, lowest → highest. */
export type WarWearinessLevel = 'steady' | 'strained' | 'cracking' | 'collapsing';

/** Ordinal rank for each level (0 = steady baseline). Higher = more exhausted. */
export const WAR_WEARINESS_RANK: Record<WarWearinessLevel, number> = {
    steady: 0,
    strained: 1,
    cracking: 2,
    collapsing: 3,
};

/**
 * Band thresholds on the recovered 0..100 exhaustion scale. A faction is "at"
 * a band when its exhaustion is >= that band's floor.
 *
 * Chosen to track the collapse Tier-0 plateau semantics (cohesion/authority
 * gate at 70, spatial at 65; saturates ~100 by ~w80) while giving the early/mid
 * war a readable progression:
 *   - steady     [0, 40)   — early-war; the faction is fighting but not yet ground down
 *   - strained   [40, 65)  — the war is biting; manpower and will under load
 *   - cracking   [65, 85)  — late-war exhaustion plateau; will-to-fight fraying
 *   - collapsing [85, ∞)   — spent; running on empty (1995 texture for all sides)
 *
 * These are FEEL-layer descriptor cuts, NOT the engine's collapse-eligibility
 * gates (those live in phase3c and are unchanged). Kept here so a designer can
 * retune the narrative bands without touching sim constants.
 */
export const WAR_WEARINESS_THRESHOLDS = {
    strained: 40,
    cracking: 65,
    collapsing: 85,
} as const;

export interface WarWearinessDescriptor {
    /** Recovered 0..100 exhaustion scale (war_exhaustion / 100), clamped. */
    level: number;
    /** Raw monotonic accumulator value (0..10000) as stored, for callers that want it. */
    rawExhaustion: number;
    /** Narrative band. */
    band: WarWearinessLevel;
    /** Ordinal rank of the band (0..3). */
    rank: number;
    /**
     * 3C Tier-0 collapse-eligibility echo (any domain eligible). PURE READ —
     * mirrors the gating booleans when the collapse pipeline is active; false
     * when collapse is disabled (default) since the eligibility state is then
     * never written. Never drives the band (the band is signal-only); offered
     * as an optional intensifier for surfaces that want to flag "the engine now
     * considers this faction collapse-eligible".
     */
    collapseEligible: boolean;
}

/** Human-readable one-line descriptor per band (player-safe, somber, non-gamified). */
export const WAR_WEARINESS_LABEL: Record<WarWearinessLevel, string> = {
    steady: 'Holding',
    strained: 'Strained',
    cracking: 'Cracking',
    collapsing: 'Collapsing',
};

/**
 * Short narrative gloss per band — the negative-sum grind in words. Universal
 * (faction-agnostic): the war wears everyone down the same way.
 */
export const WAR_WEARINESS_GLOSS: Record<WarWearinessLevel, string> = {
    steady: 'The front holds. The war has not yet eaten the will to fight.',
    strained: 'The war is biting. Reserves thin, patience shorter, the grind setting in.',
    cracking: 'Will-to-fight is fraying. Reservists report late, crisis staffs argue, the line is held by exhaustion alone.',
    collapsing: 'Spent. The army runs on empty — what holds the front now is inertia, not resolve.',
};

/** Clamp a raw war_exhaustion (0..10000 scale) to the recovered 0..100 scale. */
export function exhaustionLevel(rawExhaustion: number): number {
    if (!Number.isFinite(rawExhaustion)) return 0;
    const scaled = rawExhaustion / 100;
    if (scaled < 0) return 0;
    if (scaled > 100) return 100;
    return scaled;
}

/** Map a recovered 0..100 exhaustion level to its narrative band. */
export function bandForLevel(level: number): WarWearinessLevel {
    if (level >= WAR_WEARINESS_THRESHOLDS.collapsing) return 'collapsing';
    if (level >= WAR_WEARINESS_THRESHOLDS.cracking) return 'cracking';
    if (level >= WAR_WEARINESS_THRESHOLDS.strained) return 'strained';
    return 'steady';
}

/**
 * Derive the full war-weariness descriptor for a single faction from its raw
 * war_exhaustion value and (optionally) its 3C Tier-0 eligibility state.
 *
 * @param rawExhaustion `state.political.war_exhaustion[fid]` (0..10000 scale).
 * @param eligibility   `state.political.collapse_eligibility[fid]` if present
 *                      (undefined when the collapse pipeline is disabled — default).
 */
export function deriveWarWeariness(
    rawExhaustion: number,
    eligibility?: CollapseEligibilityState | undefined,
): WarWearinessDescriptor {
    const safeRaw = Number.isFinite(rawExhaustion) ? rawExhaustion : 0;
    const level = exhaustionLevel(safeRaw);
    const band = bandForLevel(level);
    const collapseEligible = Boolean(
        eligibility
        && (eligibility.eligible_authority || eligibility.eligible_cohesion || eligibility.eligible_spatial),
    );
    return {
        level,
        rawExhaustion: safeRaw,
        band,
        rank: WAR_WEARINESS_RANK[band],
        collapseEligible,
    };
}

/**
 * Derive descriptors for all three factions from the political war_exhaustion
 * map (+ optional collapse_eligibility map). Returns a faction-keyed record in a
 * deterministic order. Factions absent from the map default to a 0/steady
 * descriptor so every side is always represented (the texture is universal).
 */
export function deriveAllWarWeariness(
    warExhaustion: Partial<Record<FactionId, number>> | undefined,
    collapseEligibility?: Partial<Record<FactionId, CollapseEligibilityState>> | undefined,
    factions: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'],
): Record<FactionId, WarWearinessDescriptor> {
    const out = {} as Record<FactionId, WarWearinessDescriptor>;
    for (const fid of factions) {
        const raw = Number(warExhaustion?.[fid] ?? 0);
        out[fid] = deriveWarWeariness(raw, collapseEligibility?.[fid]);
    }
    return out;
}
