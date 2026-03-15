/**
 * Patron Pressure Engine — Phase 3 of Endgame System.
 *
 * Updates patron override_authority and support_level each turn based on
 * military situation, sanctions, war crimes, and patron exhaustion.
 *
 * Deterministic: sorted iteration, no Math.random().
 *
 * Design source: docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md §3b
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { PatronRelationship, NegotiationCapital } from '../../state/negotiation_types.js';
import { createDefaultPatronRelationship } from '../../state/negotiation_types.js';
import { clamp } from '../../utils/math.js';
import { strictCompare } from '../../state/validateGameState.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Override authority bonus when patron has sanctions active on client. */
export const SANCTIONS_OVERRIDE_BONUS = 30;

/** Maximum override from territory loss rate (over last 10 turns). */
export const MAX_TERRITORY_LOSS_OVERRIDE = 20;

/** Number of turns over which territory loss rate is measured. */
export const TERRITORY_LOSS_WINDOW = 10;

/** Per war-crime override authority gain. */
export const WAR_CRIMES_OVERRIDE_PER_EVENT = 5;

/** Maximum override from war crimes / international isolation. */
export const MAX_WAR_CRIMES_OVERRIDE = 15;

/** Maximum override from patron exhaustion. */
export const MAX_PATRON_EXHAUSTION_OVERRIDE = 15;

/** Maximum override reduction from client military strength. */
export const MAX_MILITARY_STRENGTH_REDUCTION = 25;

/** Maximum override from recent defeats. */
export const MAX_RECENT_DEFEATS_OVERRIDE = 20;

/** Number of turns over which recent defeats are counted. */
export const RECENT_DEFEATS_WINDOW = 8;

/** Per-defeat override authority gain. */
export const DEFEAT_OVERRIDE_PER_EVENT = 10;

/** Support level loss per turn when sanctions are active. */
export const SANCTIONS_SUPPORT_DECAY_PER_TURN = 0.5;

/** Support level loss when client rejects a peace plan. */
export const PEACE_PLAN_REJECTION_SUPPORT_COST = 5;

/** Default patron support levels by faction. */
export const DEFAULT_SUPPORT: Record<string, number> = {
    RS: 80,
    HRHB: 70,
    RBiH: 40,
};

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Called each turn from war_phases pipeline. Updates override_authority and
 * support_level for each faction's patron relationship.
 */
export function updatePatronPressure(state: GameState): void {
    const neg = state.military.negotiation;
    if (!neg) return;

    for (const faction of CANONICAL_FACTIONS) {
        if (!neg.patron_relationships[faction]) {
            neg.patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }

        const pr = neg.patron_relationships[faction];
        const cap = neg.capital[faction];
        if (!pr || !cap) continue;

        // Compute override authority from current conditions
        pr.override_authority = computeOverrideAuthority(state, faction, pr, cap);

        // Decay support level when sanctions active
        if (pr.sanctions_active) {
            pr.support_level = clamp(
                pr.support_level - SANCTIONS_SUPPORT_DECAY_PER_TURN,
                0,
                100
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Override authority computation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute override authority for a faction's patron.
 * Formula from design doc §3b.
 */
export function computeOverrideAuthority(
    state: GameState,
    faction: FactionId,
    pr: PatronRelationship,
    cap: NegotiationCapital
): number {
    let authority = 0;

    // 1. Patron sanctions on client faction
    if (pr.sanctions_active) {
        authority += SANCTIONS_OVERRIDE_BONUS;
    }

    // 2. Client military collapse (territory loss rate over last N turns)
    const lossRate = getTerritoryLossRate(state, faction);
    authority += Math.min(MAX_TERRITORY_LOSS_OVERRIDE, lossRate * 100);

    // 3. Client international isolation (war crimes events)
    authority += Math.min(
        MAX_WAR_CRIMES_OVERRIDE,
        cap.war_crimes_events * WAR_CRIMES_OVERRIDE_PER_EVENT
    );

    // 4. Patron's own exhaustion (derived from war duration)
    authority += Math.min(MAX_PATRON_EXHAUSTION_OVERRIDE, getPatronExhaustion(state, faction));

    // 5. Client military strength (strong army resists patron) — negative
    const milStrength = getMilitaryStrengthRatio(state, faction);
    authority -= Math.min(MAX_MILITARY_STRENGTH_REDUCTION, milStrength * 25);

    // 6. Recent defeats
    const defeats = getRecentDefeats(state, faction);
    authority += Math.min(MAX_RECENT_DEFEATS_OVERRIDE, defeats * DEFEAT_OVERRIDE_PER_EVENT);

    return clamp(Math.round(authority * 100) / 100, 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Territory loss rate over the last TERRITORY_LOSS_WINDOW turns.
 * Returns a positive number representing percentage-point loss (0-1 scale).
 * Uses negotiation capital's territory_controlled_pct vs. historical snapshots
 * from turn summaries.
 */
export function getTerritoryLossRate(state: GameState, faction: FactionId): number {
    const neg = state.military.negotiation;
    if (!neg) return 0;

    const currentPct = neg.capital[faction]?.territory_controlled_pct ?? 0;

    // Use turn summaries to estimate past territory: sum territory_net changes
    const summaries = state.turn_summaries ?? [];
    if (summaries.length === 0) return 0;

    // Count net OSIDs lost over recent turns from turn summaries
    let netLost = 0;
    const windowStart = state.meta.turn - TERRITORY_LOSS_WINDOW;
    for (const s of summaries) {
        if (s.turn >= windowStart) {
            const factionNet = s.territory_net?.[faction] ?? 0;
            if (factionNet < 0) {
                netLost += Math.abs(factionNet);
            }
        }
    }

    // Approximate: each OSID is ~0.135% of total area (744 OSIDs, 100%)
    // Territory loss rate as fraction of total
    const approxLossPct = netLost * (100 / 744);
    // Normalize to 0-0.2 range (20 OSIDs lost in 10 turns = max)
    return Math.min(0.2, approxLossPct / 100);
}

/**
 * Patron exhaustion from war duration.
 * Grows slowly over the war — patrons tire of supporting their clients.
 * Returns 0-15 override bonus.
 */
export function getPatronExhaustion(state: GameState, faction: FactionId): number {
    const warStartTurn = state.meta.war_start_turn ?? 0;
    const warWeek = state.meta.turn - warStartTurn;

    // Patrons start getting exhausted after ~52 weeks, max at ~180 weeks
    // RS: Serbia exhausted by sanctions + long war
    // HRHB: Croatia wants to normalize with EU
    // RBiH: International community frustrated by endlessness
    const exhaustionBase = Math.max(0, warWeek - 52) / (180 - 52);

    // Faction-specific patron exhaustion rates
    const rates: Record<string, number> = {
        RS: 1.2,    // Serbia under international sanctions — faster exhaustion
        HRHB: 1.0,  // Croatia balancing EU accession
        RBiH: 0.8,  // International community patient but frustrated
    };

    const rate = rates[faction] ?? 1.0;
    return clamp(exhaustionBase * MAX_PATRON_EXHAUSTION_OVERRIDE * rate, 0, MAX_PATRON_EXHAUSTION_OVERRIDE);
}

/**
 * Military strength ratio for a faction.
 * Strong factions can resist patron pressure.
 * Returns 0-1 where 1 = maximum strength (full resistance).
 */
export function getMilitaryStrengthRatio(state: GameState, faction: FactionId): number {
    const formations = state.military.formations ?? {};
    let totalPersonnel = 0;
    let activeFormations = 0;

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction || (f.kind ?? 'brigade') !== 'brigade') continue;
        const ls = f.lifecycle_status ?? 'active';
        if (ls === 'destroyed' || ls === 'disbanded' || ls === 'merged' || ls === 'withdrawn') continue;
        totalPersonnel += f.personnel ?? 0;
        activeFormations++;
    }

    // Strength ratio: personnel relative to expected peak
    // RS peak ~155k, RBiH ~180k, HRHB ~50k
    const peaks: Record<string, number> = {
        RS: 155000,
        RBiH: 180000,
        HRHB: 50000,
    };
    const peak = peaks[faction] ?? 100000;
    return clamp(totalPersonnel / peak, 0, 1);
}

/**
 * Count recent defeats from turn summaries.
 * A "defeat" is a turn where the faction lost territory (negative territory_net).
 */
export function getRecentDefeats(state: GameState, faction: FactionId): number {
    const summaries = state.turn_summaries ?? [];
    const windowStart = state.meta.turn - RECENT_DEFEATS_WINDOW;
    let defeats = 0;

    for (const s of summaries) {
        if (s.turn >= windowStart) {
            const factionNet = s.territory_net?.[faction] ?? 0;
            if (factionNet < 0) {
                defeats++;
            }
        }
    }

    return defeats;
}
