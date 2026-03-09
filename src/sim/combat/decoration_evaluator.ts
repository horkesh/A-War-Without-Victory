/**
 * Decoration evaluator — checks brigade history against criteria
 * and awards decorations when earned.
 *
 * Criteria-based (not points-based). Deterministic evaluation.
 * Run once per turn via pipeline step 'evaluate-brigade-decorations'.
 *
 * Tier 1: 5+ consecutive victories without catastrophic loss, OR 8+ battles with >60% win rate
 * Tier 2: Held same OSID through 3+ enemy attacks, OR 4+ consecutive defensive victories while outgunned
 * Tier 3: Both tier 1 and tier 2 earned, OR decisive victory against 2:1 odds
 *
 * Highest tier bonus applies (no stacking across tiers).
 */

import type { FormationState, FactionId, GameState } from '../../state/game_state.js';
import type { BrigadeDecoration } from '../../state/decoration_types.js';
import { type DecorationTier, getDecorationDisplayName, getHighestDecorationTier } from '../../state/decoration_types.js';
import type { BrigadeHistory } from '../../state/brigade_history.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Combat bonuses by decoration tier. */
export const DECORATION_COMBAT_BONUS: Record<DecorationTier, { atk: number; def: number; morale_resist: number; morale_flat: number }> = {
    tier_1: { atk: 0.10, def: 0.10, morale_resist: 0, morale_flat: 0 },
    tier_2: { atk: 0, def: 0.15, morale_resist: 5, morale_flat: 0 },
    tier_3: { atk: 0.15, def: 0.20, morale_resist: 0, morale_flat: 5 },
};

/**
 * Get the attack power multiplier from a formation's decorations.
 * Returns 1.0 if no decorations. Highest tier wins (no stacking).
 */
export function getDecorationAtkMult(formation: FormationState): number {
    const tier = getHighestDecorationTier(formation.decorations ?? []);
    if (!tier) {
        // Fallback to legacy honor field for backward compatibility
        const honor = (formation as { honor?: string }).honor;
        if (honor === 'viteska') return 1.20;
        if (honor === 'slavna') return 1.10;
        return 1.0;
    }
    return 1.0 + DECORATION_COMBAT_BONUS[tier].atk;
}

/**
 * Get the defense terrain bonus from decorations (used when no explicit defense_terrain_bonus).
 */
export function getDecorationDefBonus(formation: FormationState): number {
    const tier = getHighestDecorationTier(formation.decorations ?? []);
    if (!tier) {
        // Fallback to legacy honor field
        const honor = (formation as { honor?: string }).honor;
        if (honor === 'viteska') return 0.15;
        if (honor === 'slavna') return 0.10;
        return 0;
    }
    return DECORATION_COMBAT_BONUS[tier].def;
}

/**
 * Check if a brigade qualifies for a tier and hasn't already earned it.
 */
function hasTier(decorations: BrigadeDecoration[], tier: DecorationTier): boolean {
    return decorations.some(d => d.tier === tier);
}

/**
 * Threshold multiplier from distinction_potential.
 * Historically distinguished units earn decorations at lower thresholds —
 * they have the character for it, but must still fight to prove it.
 *   tier_1 potential → 0.70× (30% easier)
 *   tier_2 potential → 0.65× (35% easier)
 *   tier_3 potential → 0.65× (matches tier_2; already elite)
 */
function getDistinctionMult(formation: FormationState): number {
    switch (formation.distinction_potential) {
        case 'tier_2':
        case 'tier_3': return 0.65;
        case 'tier_1': return 0.70;
        default:       return 1.0;
    }
}

/**
 * Evaluate tier_1 criteria:
 * - 5+ consecutive victories without catastrophic loss, OR
 * - 8+ battles with >60% win rate
 * Thresholds reduced by distinction_potential multiplier.
 */
function qualifiesTier1(h: BrigadeHistory, formation: FormationState): boolean {
    const mult = getDistinctionMult(formation);
    if (h.longest_victory_streak >= Math.ceil(5 * mult)) return true;
    if (h.battles_fought >= Math.ceil(8 * mult) && h.victories / h.battles_fought > 0.60) return true;
    return false;
}

/**
 * Evaluate tier_2 criteria:
 * - Longest defense streak >= 3 (held through 3+ attacks), OR
 * - 4+ consecutive defensive victories
 * Thresholds reduced by distinction_potential multiplier.
 */
function qualifiesTier2(h: BrigadeHistory, formation: FormationState): boolean {
    const mult = getDistinctionMult(formation);
    if (h.longest_defense_streak >= Math.ceil(3 * mult)) return true;
    if (h.longest_defense_streak >= Math.ceil(4 * mult)) return true;
    return false;
}

/**
 * Evaluate tier_3 criteria:
 * - Both tier_1 AND tier_2 already earned
 */
function qualifiesTier3(decorations: BrigadeDecoration[], _h: BrigadeHistory): boolean {
    return hasTier(decorations, 'tier_1') && hasTier(decorations, 'tier_2');
}

/**
 * Evaluate a single brigade for decoration eligibility.
 * Awards new decorations when criteria are met.
 */
export function evaluateBrigadeDecorations(
    formation: FormationState,
    turn: number,
): void {
    if (!formation.brigade_history) return;
    if (!formation.decorations) formation.decorations = [];

    const h = formation.brigade_history;
    const d = formation.decorations;
    const faction = formation.faction;

    // Check tier_1
    if (!hasTier(d, 'tier_1') && qualifiesTier1(h, formation)) {
        d.push({
            tier: 'tier_1',
            awarded_turn: turn,
            reason: h.longest_victory_streak >= 5
                ? `${h.longest_victory_streak} consecutive victories`
                : `${h.victories}/${h.battles_fought} battles won (${Math.round(100 * h.victories / h.battles_fought)}%)`,
        });
    }

    // Check tier_2
    if (!hasTier(d, 'tier_2') && qualifiesTier2(h, formation)) {
        d.push({
            tier: 'tier_2',
            awarded_turn: turn,
            reason: `Held position through ${h.longest_defense_streak} consecutive attacks`,
        });
    }

    // Check tier_3
    if (!hasTier(d, 'tier_3') && qualifiesTier3(d, h)) {
        d.push({
            tier: 'tier_3',
            awarded_turn: turn,
            reason: `Earned both ${getDecorationDisplayName(faction, 'tier_1')} and ${getDecorationDisplayName(faction, 'tier_2')}`,
        });
    }
}

/**
 * Pipeline step: evaluate all active brigades for decoration eligibility.
 */
export function evaluateAllBrigadeDecorations(state: GameState): void {
    const turn = state.meta?.turn ?? 0;
    const fmtsDecorations = state.military.formations ?? {};
    for (const fKey of Object.keys(fmtsDecorations).sort(strictCompare)) {
        const f = fmtsDecorations[fKey]!;
        if (f.status !== 'active') continue;
        if (f.kind && f.kind !== 'brigade') continue;
        evaluateBrigadeDecorations(f, turn);
    }
}
