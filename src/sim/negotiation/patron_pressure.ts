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
import type { PatronRelationship, NegotiationBreakdown } from '../../state/negotiation_types.js';
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

/**
 * RS override-authority contribution from the 1992 Drina valley cleansing.
 *
 * Historically the atrocity drew a sharp, front-loaded international reaction
 * (Belgrade leaned on Pale over the fallout) that then settled into a lower,
 * lasting baseline of elevated patron pressure. This is modelled as a BOUNDED,
 * DECAYING contribution — NOT a flat permanent per-turn add. The old flat
 * `+2 every turn for the whole war` (applied ~turn 8 → 188) pinned RS override
 * authority high for the entire conflict, pushing RS bots into sustained
 * concession and an ahistorical rear collapse. See `computeDrinaCleansingOverride`.
 *
 * Contribution = lerp(PEAK → FLOOR) over DECAY_WINDOW turns from the atrocity,
 * then holds at FLOOR for the remainder of the war.
 */
/** Peak Drina override contribution at the moment of the atrocity (v0.7.0 Phase 4). */
export const DRINA_CLEANSING_OVERRIDE_PEAK = 8;

/** Sustained Drina override floor once the initial political moment has faded. */
export const DRINA_CLEANSING_OVERRIDE_FLOOR = 2;

/** Turns over which the Drina contribution decays from PEAK down to FLOOR. */
export const DRINA_CLEANSING_DECAY_WINDOW = 52;

/**
 * Legacy alias retained for back-compat: equals the sustained floor (the value
 * the old flat-per-turn model used). Prefer the PEAK/FLOOR constants.
 * @deprecated use DRINA_CLEANSING_OVERRIDE_FLOOR / DRINA_CLEANSING_OVERRIDE_PEAK
 */
export const DRINA_CLEANSING_OVERRIDE_PER_TURN = DRINA_CLEANSING_OVERRIDE_FLOOR;

/** event_flags key recording the turn the Drina cleansing was first observed. */
const DRINA_CLEANSING_FIRST_TURN_FLAG = 'drina_cleansing_first_turn';

/** Event id that sets `drina_cleansing_occurred` (see data/scenarios/events/war_1992.json). */
const DRINA_CLEANSING_EVENT_ID = 'drina_valley_ethnic_cleansing_1992';

/**
 * Historical early-war fall-back first-turn for a truly old save that carries
 * `drina_cleansing_occurred` but neither the stamp nor the event fire-turn.
 * Equal to the Drina event's `trigger.turn_min` (the earliest the atrocity could
 * historically fire). Chosen deterministically — NOT from `state.meta.turn` — so
 * an upgraded LATE-WAR save never re-triggers a fresh PEAK and instead settles at
 * the FLOOR once `state.meta.turn - this >= DECAY_WINDOW`.
 */
const DRINA_CLEANSING_HISTORICAL_FIRST_TURN = 8;

/**
 * Resolve the turn the Drina cleansing first occurred for the decay calculation.
 *
 * Resolution order (all deterministic):
 *   1. Existing `event_flags.drina_cleansing_first_turn` stamp (live games).
 *   2. The fire turn recorded in `event_last_fired_turn[drina_valley_ethnic_cleansing_1992]`
 *      — the stable historical signal for an upgraded save that observed the event
 *      but predates the stamp.
 *   3. A fixed early-war historical default (the event's turn_min) — never the
 *      current turn — so an old LATE-WAR save lands at the FLOOR rather than
 *      re-applying a fresh PEAK.
 *
 * The resolved turn is stamped back into `event_flags` so the lookup is stable
 * across subsequent turns. `event_flags` is a free-form record, so no migration
 * or schema change is needed.
 */
function resolveDrinaCleansingFirstTurn(state: GameState): number {
    const flags = state.military.event_flags;
    const stamped = flags[DRINA_CLEANSING_FIRST_TURN_FLAG];
    if (typeof stamped === 'number') return stamped;

    const firedTurn = state.military.event_last_fired_turn?.[DRINA_CLEANSING_EVENT_ID];
    const firstTurn =
        typeof firedTurn === 'number' && firedTurn >= 0
            ? firedTurn
            : DRINA_CLEANSING_HISTORICAL_FIRST_TURN;

    flags[DRINA_CLEANSING_FIRST_TURN_FLAG] = firstTurn;
    return firstTurn;
}

/**
 * Compute the bounded, decaying Drina-cleansing override contribution for RS.
 *
 * The first turn the `drina_cleansing_occurred` flag is observed, the
 * first-occurrence turn is resolved deterministically (see
 * `resolveDrinaCleansingFirstTurn`) and stamped lazily into `event_flags`. The
 * contribution then decays linearly from PEAK to FLOOR over DECAY_WINDOW turns
 * and holds at FLOOR thereafter.
 *
 * Returns 0 when the flag is unset.
 */
export function computeDrinaCleansingOverride(state: GameState): number {
    if (state.military.event_flags?.drina_cleansing_occurred !== true) return 0;

    if (!state.military.event_flags) state.military.event_flags = {};

    const firstTurn = resolveDrinaCleansingFirstTurn(state);

    const elapsed = Math.max(0, state.meta.turn - firstTurn);
    const t = clamp(elapsed / DRINA_CLEANSING_DECAY_WINDOW, 0, 1);
    const contribution =
        DRINA_CLEANSING_OVERRIDE_PEAK -
        t * (DRINA_CLEANSING_OVERRIDE_PEAK - DRINA_CLEANSING_OVERRIDE_FLOOR);
    return Math.round(contribution * 100) / 100;
}

/** RS override authority bonus per turn when concentration camps revealed (v0.7.0 Phase 4). */
export const CAMPS_REVEALED_OVERRIDE_PER_TURN = 3;

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
    cap: NegotiationBreakdown
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

    // 3b. Drina valley cleansing increases RS international pressure (v0.7.0 Phase 4).
    //     Bounded + decaying (PEAK→FLOOR over DECAY_WINDOW), NOT a flat permanent
    //     per-turn add — the old model pinned RS override authority high all war.
    if (faction === 'RS') {
        authority += computeDrinaCleansingOverride(state);
    }

    // 3c. Camp revelations permanently increase RS pressure (v0.7.0 Phase 4)
    if (faction === 'RS' && state.military.event_flags?.camps_revealed === true) {
        authority += CAMPS_REVEALED_OVERRIDE_PER_TURN;
    }

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

    // Approximate: each OSID is ~0.14% of total area (712 OSIDs, 100%)
    // Territory loss rate as fraction of total
    const approxLossPct = netLost * (100 / 712);
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
