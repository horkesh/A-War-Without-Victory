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
    /** Confidence lost per turn when no front edges shared with an enemy sector. */
    confidence_decay_per_turn: number;
    /** How many sector hops away deep intel (offensive_signs, second-echelon) is detectable. */
    recon_range: number;
    /** Confidence gained when a brigade executes a probe action against the enemy sector. */
    probe_confidence_gain: number;
    /** Fraction of normal casualties incurred by a probing brigade. */
    probe_casualty_factor: number;
}

/** Faction recon profiles (constants, not unit-level). */
export const FACTION_RECON_PROFILES: Record<NonNullable<FactionId>, FactionReconProfile> = {
    RBiH: {
        passive_buildup_per_turn: 0.30,
        confidence_decay_per_turn: 0.10,
        recon_range: 2,
        probe_confidence_gain: 0.50,
        probe_casualty_factor: 0.15,
    },
    RS: {
        passive_buildup_per_turn: 0.20,
        confidence_decay_per_turn: 0.25,
        recon_range: 1,
        probe_confidence_gain: 0.35,
        probe_casualty_factor: 0.25,
    },
    HRHB: {
        passive_buildup_per_turn: 0.20,
        confidence_decay_per_turn: 0.25,
        recon_range: 1,
        probe_confidence_gain: 0.35,
        probe_casualty_factor: 0.25,
    },
};

/**
 * Faction-specific initial intel confidence for newly-encountered enemy sectors.
 * VRS: 0.60 — JNA intelligence inheritance (signals intercepts, pre-war mapping, informant networks).
 * RBiH: 0.05 — Near-zero; no institutional intelligence, only local knowledge.
 * HRHB: 0.25 — Croatian SIS (SIS/HIS) in Herzegovina provides moderate starting intel.
 */
export const FACTION_INITIAL_INTEL_CONFIDENCE: Record<NonNullable<FactionId>, number> = {
    RS: 0.60,
    RBiH: 0.05,
    HRHB: 0.25,
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
    RS: 0.25,    // JNA inheritance means they know enough to attack sooner
    RBiH: 0.40,  // Starting blind — need more intel before committing
    HRHB: 0.30,  // Croatian SIS provides moderate baseline
};

/**
 * Maximum probe operations a corps can launch consecutively before
 * forcing a full operation regardless of intel. Prevents infinite
 * probe loops when intel never reaches threshold (e.g., decaying sectors).
 */
export const MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT = 2;
