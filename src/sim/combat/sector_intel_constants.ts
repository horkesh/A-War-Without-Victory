/**
 * Sector-facing intelligence system � faction recon profiles and confidence thresholds.
 *
 * Faction profiles are faction-level constants (not unit-level).
 * ARBiH advantage is baked into higher passive_buildup_per_turn and longer recon range.
 *
 * Pipeline: derive-sector-intel (after partition-corps-front-sectors, before generate-bot-corps-orders)
 */

import type { FactionId } from '../../state/game_state.js';

export interface FactionReconProfile {
    /** Confidence gained per turn for each sector pair sharing front edges with an enemy sector. */
    passive_buildup_per_turn: number;
    /** Confidence lost per turn (applies universally — intel goes stale even in contact). */
    confidence_decay_per_turn: number;
    /** How many sector hops away deep intel (offensive_signs, second-echelon) is detectable. */
    recon_range: number;
    /** Confidence gained when a brigade executes a probe action against the enemy sector. */
    probe_confidence_gain: number;
    /** Fraction of normal casualties incurred by a probing brigade. */
    probe_casualty_factor: number;
}

/** Faction recon profiles (constants, not unit-level).
 *
 * Passive buildup represents observation posts, patrols, signals intercept —
 * slow, incremental. Real operational intelligence comes from probes (recon-by-force)
 * and combat. Without active reconnaissance, a corps should remain uncertain about
 * enemy strength and dispositions for weeks, not days.
 *
 * Decay now applies universally — even in-contact sectors lose confidence each turn
 * (intel goes stale). Passive buildup partially offsets decay but net effect is
 * negative, so only combat or probes keep confidence high.
 *
 * Net in-contact rate = passive_buildup - confidence_decay:
 *   RS:   0.08 - 0.12 = -0.04/turn → combat intel (1.0) drops to threshold (0.35) in ~16 turns
 *   RBiH: 0.12 - 0.10 = +0.02/turn → sustains above threshold indefinitely in contact
 *   HRHB: 0.08 - 0.12 = -0.04/turn → combat intel (1.0) drops to threshold (0.30) in ~18 turns
 */
export const FACTION_RECON_PROFILES: Record<NonNullable<FactionId>, FactionReconProfile> = {
    RBiH: {
        passive_buildup_per_turn: 0.12,
        confidence_decay_per_turn: 0.10,   // was 0.08 — intel goes stale universally
        recon_range: 2,
        probe_confidence_gain: 0.50,
        probe_casualty_factor: 0.15,
    },
    RS: {
        passive_buildup_per_turn: 0.08,
        confidence_decay_per_turn: 0.12,   // was 0.10 — blitz intel fades within ~16 turns
        recon_range: 1,
        probe_confidence_gain: 0.35,
        probe_casualty_factor: 0.25,
    },
    HRHB: {
        passive_buildup_per_turn: 0.08,
        confidence_decay_per_turn: 0.12,   // was 0.10 — intel goes stale universally
        recon_range: 1,
        probe_confidence_gain: 0.35,
        probe_casualty_factor: 0.25,
    },
};

/**
 * Faction-specific initial intel confidence for newly-encountered enemy sectors.
 * VRS: 0.30 — JNA inheritance gives general picture (maps, unit locations) but not
 *              current dispositions. Still above rough-strength threshold (0.2).
 * RBiH: 0.05 — Near-zero; no institutional intelligence, only local knowledge.
 * HRHB: 0.15 — Croatian SIS (SIS/HIS) in Herzegovina provides some starting intel.
 */
export const FACTION_INITIAL_INTEL_CONFIDENCE: Record<NonNullable<FactionId>, number> = {
    RS: 0.30,
    RBiH: 0.05,
    HRHB: 0.15,
};

/** Below this confidence: strength=unknown, posture=unknown, no visible brigades. */
export const CONFIDENCE_ROUGH_STRENGTH = 0.2;

/** At or above this confidence: front-adjacent enemy brigades become visible. */
export const CONFIDENCE_FRONT_BRIGADES = 0.3;

/** At or above this confidence: accurate strength category + posture (defensive/entrenched) + all sector brigades visible. */
export const CONFIDENCE_FULL_STRENGTH = 0.5;

/** At or above this confidence (and recon_range >= 2): offensive_signs detectable + second-echelon sectors + deeper brigades visible. */
export const CONFIDENCE_DEEP_INTEL = 0.8;

/**
 * Intel confidence threshold for launching a full sector offensive.
 * Below this: launch a probe-type operation to gather intel first.
 * At or above: launch a sector_attack normally.
 * Per-faction: VRS has JNA intel inheritance (lower threshold needed),
 * ARBiH starts blind (higher threshold to compensate), HRHB moderate.
 */
export const INTEL_GATE_LAUNCH_THRESHOLD: Record<NonNullable<FactionId>, number> = {
    RS: 0.35,    // Post-blitz VRS should probe before committing corps-level ops
    RBiH: 0.40,  // Starting blind — need more intel before committing
    HRHB: 0.30,  // Croatian SIS provides moderate baseline
};

/**
 * Maximum probe operations a corps can launch consecutively before
 * forcing a full operation regardless of intel. Prevents infinite
 * probe loops when intel never reaches threshold (e.g., decaying sectors).
 */
export const MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2;
