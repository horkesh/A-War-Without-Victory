/**
 * Peace-phase §4.8: Washington Agreement evaluator (precondition-driven).
 *
 * TWO trigger pathways (either fires the agreement):
 *
 * Path A — Diplomatic preconditions (ALL must be true):
 *   W1: ceasefire active
 *   W2: ceasefire duration >= WASH_CEASEFIRE_DURATION turns
 *   W3: IVP negotiation_momentum > WASH_IVP_THRESHOLD
 *   W4: HRHB patron_state.constraint_severity > WASH_PATRON_CONSTRAINT
 *   W5: RS territorial control share > WASH_RS_THREAT_SHARE
 *   W6: combined RBiH + HRHB exhaustion > WASH_COMBINED_EXHAUSTION
 *
 * Path B — Patron override (ALL must be true):
 *   P1: alliance < WASH_ALLIANCE_WAR_THRESHOLD (-0.30) — bilateral war ongoing
 *   P2: bilateral war duration > WASH_MIN_WAR_DURATION (40 weeks)
 *   P3: HRHB patron override_authority > WASH_PATRON_OVERRIDE_THRESHOLD (50)
 *
 * Effects (when fired by either path):
 *   - Alliance set to WASH_ALLIANCE_LOCK_VALUE (0.80) and locked
 *   - Bilateral ceasefire activated
 *   - HRHB capability profiles shift (equipment_access 0.65, croatian_support 0.90)
 *   - HRHB embargo enhanced (external_pipeline_status 0.85, heavy_equipment_access 0.65)
 *   - COORDINATED_STRIKE "HV coordination enabled" flag set
 *   - Joint ops vs RS get POST_WASH_JOINT_PRESSURE_BONUS (1.15)
 *   - Mixed municipalities restored to joint status
 *
 * Canon: Phase_I_Specification_v0_4_0.md §4.8; Systems_Manual §10; Engine_Invariants §J.
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Tunable Washington precondition thresholds ──

/** W2: Minimum ceasefire duration (turns). */
export const WASH_CEASEFIRE_DURATION = 4;
/** W3: IVP negotiation_momentum threshold. */
export const WASH_IVP_THRESHOLD = 0.50;
/** W4: HRHB patron constraint_severity threshold. */
export const WASH_PATRON_CONSTRAINT = 0.55;
/** W5: RS territorial control share threshold (fraction of total settlements). */
export const WASH_RS_THREAT_SHARE = 0.40;
/** W6: Combined RBiH + HRHB exhaustion threshold. */
export const WASH_COMBINED_EXHAUSTION = 55;

/** Alliance value set and locked when Washington fires. */
export const WASH_ALLIANCE_LOCK_VALUE = 0.80;

/** Post-Washington HRHB capability: equipment_access. */
export const POST_WASH_EQUIPMENT_ACCESS = 0.65;
/** Post-Washington HRHB capability: croatian_support. */
export const POST_WASH_CROATIAN_SUPPORT = 0.90;
/** Post-Washington HRHB embargo: external_pipeline_status. */
export const POST_WASH_EXTERNAL_PIPELINE = 0.85;
/** Post-Washington HRHB embargo: heavy_equipment_access. */
export const POST_WASH_HEAVY_EQUIPMENT = 0.65;
/** Post-Washington joint pressure bonus vs RS on shared fronts. */
export const POST_WASH_JOINT_PRESSURE_BONUS = 1.15;

// ── Path B: Patron override trigger thresholds ──

/** P1: Alliance must be below this value (bilateral war active). */
export const WASH_ALLIANCE_WAR_THRESHOLD = -0.30;
/** P2: Minimum bilateral war duration in turns (weeks). */
export const WASH_MIN_WAR_DURATION = 40;
/** P3: HRHB patron override_authority threshold (from negotiation system). */
export const WASH_PATRON_OVERRIDE_THRESHOLD = 50;

export interface WashingtonPatronOverrideResult {
    p1_alliance_below_threshold: boolean;
    p2_war_duration_met: boolean;
    p3_patron_override_met: boolean;
    all_met: boolean;
}

export interface WashingtonPreconditionResult {
    w1_ceasefire_active: boolean;
    w2_ceasefire_duration: boolean;
    w3_ivp_momentum: boolean;
    w4_patron_constraint: boolean;
    w5_rs_territorial_threat: boolean;
    w6_combined_exhaustion: boolean;
    all_met: boolean;
}

export interface WashingtonCheckReport {
    preconditions: WashingtonPreconditionResult;
    patron_override?: WashingtonPatronOverrideResult;
    /** Which trigger path fired: 'diplomatic' (Path A), 'patron_override' (Path B), or null. */
    trigger_path?: 'diplomatic' | 'patron_override' | null;
    fired: boolean;
    already_signed: boolean;
}

/**
 * Compute RS territorial control share (fraction of total settlements controlled by RS).
 * Deterministic: counts settlements keyed in political_controllers.
 */
function computeRsTerritorialShare(state: GameState): number {
    const pc = state.political.political_controllers;
    if (!pc) return 0;
    const entries = Object.values(pc);
    if (entries.length === 0) return 0;
    let rsCount = 0;
    for (const controller of entries) {
        if (controller === 'RS') rsCount++;
    }
    return rsCount / entries.length;
}

/**
 * Evaluate Washington preconditions. Pure function of state.
 */
export function evaluateWashingtonPreconditions(state: GameState): WashingtonPreconditionResult {
    const rhs = state.political.rbih_hrhb_state;
    const turn = state.meta.turn;

    // W1: ceasefire active
    const w1 = rhs?.ceasefire_active === true;

    // W2: ceasefire duration
    const ceasefireSince = rhs?.ceasefire_since_turn ?? null;
    const ceasefireDuration = (ceasefireSince !== null && w1) ? turn - ceasefireSince : 0;
    const w2 = ceasefireDuration >= WASH_CEASEFIRE_DURATION;

    // W3: IVP negotiation_momentum
    const ivp = state.political.international_visibility_pressure;
    const negotiationMomentum = ivp?.negotiation_momentum ?? 0;
    const w3 = negotiationMomentum > WASH_IVP_THRESHOLD;

    // W4: HRHB patron constraint_severity
    const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
    const constraintSeverity = hrhbFaction?.patron_state?.constraint_severity ?? 0;
    const w4 = constraintSeverity > WASH_PATRON_CONSTRAINT;

    // W5: RS territorial control share
    const rsShare = computeRsTerritorialShare(state);
    const w5 = rsShare > WASH_RS_THREAT_SHARE;

    // W6: Combined exhaustion
    const rbihExhaustion = state.political.war_exhaustion?.['RBiH'] ?? 0;
    const hrhbExhaustion = state.political.war_exhaustion?.['HRHB'] ?? 0;
    const combinedExhaustion = rbihExhaustion + hrhbExhaustion;
    const w6 = combinedExhaustion > WASH_COMBINED_EXHAUSTION;

    return {
        w1_ceasefire_active: w1,
        w2_ceasefire_duration: w2,
        w3_ivp_momentum: w3,
        w4_patron_constraint: w4,
        w5_rs_territorial_threat: w5,
        w6_combined_exhaustion: w6,
        all_met: w1 && w2 && w3 && w4 && w5 && w6
    };
}

/**
 * Evaluate Path B: Patron override trigger.
 * When bilateral war has lasted long enough and Zagreb's override authority is high,
 * Washington fires regardless of ceasefire/IVP preconditions.
 */
export function evaluateWashingtonPatronOverride(state: GameState): WashingtonPatronOverrideResult {
    const rhs = state.political.rbih_hrhb_state;
    const allianceValue = state.political.war_alliance_rbih_hrhb ?? 0;

    // P1: Alliance below war threshold
    const p1 = allianceValue < WASH_ALLIANCE_WAR_THRESHOLD;

    // P2: Bilateral war duration > threshold
    const warStartedTurn = rhs?.war_started_turn ?? null;
    const warDuration = warStartedTurn !== null ? state.meta.turn - warStartedTurn : 0;
    const p2 = warDuration > WASH_MIN_WAR_DURATION;

    // P3: HRHB patron override_authority from negotiation system
    const neg = state.military?.negotiation;
    const hrhbPatron = neg?.patron_relationships?.['HRHB'];
    const overrideAuthority = hrhbPatron?.override_authority ?? 0;
    const p3 = overrideAuthority > WASH_PATRON_OVERRIDE_THRESHOLD;

    return {
        p1_alliance_below_threshold: p1,
        p2_war_duration_met: p2,
        p3_patron_override_met: p3,
        all_met: p1 && p2 && p3,
    };
}

/**
 * Apply post-Washington effects to HRHB capabilities, embargo, and alliance.
 */
function applyWashingtonEffects(state: GameState): void {
    const rhs = state.political.rbih_hrhb_state!;

    // Lock alliance
    state.political.war_alliance_rbih_hrhb = WASH_ALLIANCE_LOCK_VALUE;
    rhs.washington_signed = true;
    rhs.washington_turn = state.meta.turn;

    // Activate bilateral ceasefire (if not already active)
    if (!rhs.ceasefire_active) {
        rhs.ceasefire_active = true;
        rhs.ceasefire_since_turn = state.meta.turn;
    }

    // HRHB capability shift
    const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
    if (hrhbFaction) {
        if (hrhbFaction.capability_profile) {
            hrhbFaction.capability_profile.equipment_access = POST_WASH_EQUIPMENT_ACCESS;
            hrhbFaction.capability_profile.croatian_support = POST_WASH_CROATIAN_SUPPORT;
        }
        // Embargo enhancement
        if (hrhbFaction.embargo_profile) {
            hrhbFaction.embargo_profile.external_pipeline_status = Math.max(
                hrhbFaction.embargo_profile.external_pipeline_status,
                POST_WASH_EXTERNAL_PIPELINE
            );
            hrhbFaction.embargo_profile.heavy_equipment_access = Math.max(
                hrhbFaction.embargo_profile.heavy_equipment_access,
                POST_WASH_HEAVY_EQUIPMENT
            );
        }
    }

    // Enable COORDINATED_STRIKE for HRHB formations
    const formations = state.military.formations ?? {};
    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formationIds) {
        const f = formations[fid];
        if (f.faction === 'HRHB' && f.doctrine_state) {
            f.doctrine_state.eligible['COORDINATED_STRIKE'] = true;
        }
    }
}

/**
 * Check and apply Washington Agreement if all preconditions met.
 * Must run AFTER ceasefire check.
 */
export function checkAndApplyWashington(state: GameState): WashingtonCheckReport {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs) {
        return {
            preconditions: {
                w1_ceasefire_active: false,
                w2_ceasefire_duration: false,
                w3_ivp_momentum: false,
                w4_patron_constraint: false,
                w5_rs_territorial_threat: false,
                w6_combined_exhaustion: false,
                all_met: false
            },
            fired: false,
            already_signed: false
        };
    }

    if (rhs.washington_signed) {
        return {
            preconditions: evaluateWashingtonPreconditions(state),
            patron_override: evaluateWashingtonPatronOverride(state),
            trigger_path: null,
            fired: false,
            already_signed: true
        };
    }

    const preconditions = evaluateWashingtonPreconditions(state);
    const patronOverride = evaluateWashingtonPatronOverride(state);

    // Path A: Diplomatic preconditions
    if (preconditions.all_met) {
        applyWashingtonEffects(state);
        return { preconditions, patron_override: patronOverride, trigger_path: 'diplomatic', fired: true, already_signed: false };
    }

    // Path B: Patron override
    if (patronOverride.all_met) {
        applyWashingtonEffects(state);
        return { preconditions, patron_override: patronOverride, trigger_path: 'patron_override', fired: true, already_signed: false };
    }

    return { preconditions, patron_override: patronOverride, trigger_path: null, fired: false, already_signed: false };
}

