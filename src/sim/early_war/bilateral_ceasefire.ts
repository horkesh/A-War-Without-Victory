/**
 * Peace-phase §4.8: RBiH–HRHB bilateral ceasefire evaluator (precondition-driven).
 *
 * Six preconditions (ALL must be true):
 *   C1: war duration >= CEASEFIRE_MIN_WAR_DURATION turns since war_started_turn
 *   C2: HRHB exhaustion > CEASEFIRE_HRHB_EXHAUSTION
 *   C3: RBiH exhaustion > CEASEFIRE_RBIH_EXHAUSTION
 *   C4: stalemate >= CEASEFIRE_STALEMATE_MIN consecutive turns with 0 bilateral flips, OR the
 *       ceasefire is imposed: HRHB's last answer to `zagreb_orders_hrhb_ceasefire` is
 *       `acknowledge_pressure` (WASH-IMPOSED, ruling §29, 2026-11-26)
 *   C5: IVP negotiation_momentum > CEASEFIRE_IVP_THRESHOLD
 *   C6: HRHB patron_state.constraint_severity > CEASEFIRE_PATRON_CONSTRAINT
 *
 * Effects:
 *   - Freeze all RBiH–HRHB flips (ceasefire_active = true)
 *   - Alliance recovery begins (+CEASEFIRE_RECOVERY_RATE/turn via alliance_update)
 *   - Bots stop targeting each other; redirect to RS (bot layer reads ceasefire_active)
 *   - Minority erosion halted (erosion step checks ceasefire_active)
 *
 * Canon: Phase_I_Specification_v0_4_0.md §4.8; Engine_Invariants §J.
 */

import type { GameState } from '../../state/game_state.js';

// ── Tunable ceasefire precondition thresholds ──

/** C1: Minimum turns of war before ceasefire can fire.
 *
 * Phase 1c / #29 sub-issue 5: was 20. Empirically the binding gate for WA
 * timing in 188w runs (n17/n18 ceasefire fired at t56 = war_started_turn 36
 * + 20). Historical Lasva Valley war (Apr 1993 → Feb 1994) ran ~45 weeks
 * of bilateral combat before the US-brokered ceasefire that preceded
 * Washington Agreement. Setting to 45 produces ceasefire at war_started+45
 * → WA at war_started+49 via W2 = 4. Combined with tightening
 * rbih_hrhb_war_earliest_week to ~50, lands WA at historical w101. */
export const CEASEFIRE_MIN_WAR_DURATION = 45;
/** C2: HRHB exhaustion threshold.
 *  2026-05-22: rescaled 35 → 3500 alongside war_exhaustion cap 100 → 10000 per
 *  forensics memo `20260522_FORENSICS_WAR_EXHAUSTION_CONVERGENCE.md`. */
export const CEASEFIRE_HRHB_EXHAUSTION = 3500;
/** C3: RBiH exhaustion threshold.
 *  2026-05-22: rescaled 30 → 3000 alongside war_exhaustion cap 100 → 10000 per
 *  forensics memo `20260522_FORENSICS_WAR_EXHAUSTION_CONVERGENCE.md`. */
export const CEASEFIRE_RBIH_EXHAUSTION = 3000;
/** C4: Minimum consecutive stalemate turns (0 bilateral flips). */
export const CEASEFIRE_STALEMATE_MIN = 4;
/**
 * C4 alternative (WASH-IMPOSED, orchestrator ruling §29, 2026-11-26; historian + game-designer seats).
 * The 23 February 1994 ceasefire came from outside pressure on Zagreb, applied to a stalled front:
 * Boutros-Ghali's accusation that the HV was in Bosnia and Italy's threat to seek EU sanctions led
 * Tudjman to order a peace initiative, and Delic and Roso signed in Zagreb (BB2 pp.449-450). ARBiH
 * could still attack. The event models that pressure as Zagreb's order to the HVO. A C4 that
 * waits for four quiet weeks is circular: the bot keeps an ARBiH corps on the bilateral offensive
 * until a ceasefire exists. When HRHB has acknowledged Zagreb's order, the ceasefire is imposed;
 * C1-C3, C5 and C6 still bind. HRHB can refuse (`resist_patron`), and then only a real stalemate
 * satisfies C4.
 */
export const ZAGREB_CEASEFIRE_EVENT = 'zagreb_orders_hrhb_ceasefire';
export const ZAGREB_RESTRAINT_RESPONSE = 'acknowledge_pressure';

/** Last recorded response to an event (the decision log is append-only; last wins). */
export function lastEventResponse(state: GameState, eventId: string): string | null {
    const log = state.military?.event_decision_log ?? [];
    for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].event_id === eventId) return log[i].response_id;
    }
    return null;
}

/** C5: IVP negotiation_momentum threshold. */
export const CEASEFIRE_IVP_THRESHOLD = 0.40;
/** C6: HRHB patron constraint_severity threshold. */
export const CEASEFIRE_PATRON_CONSTRAINT = 0.45;

export interface CeasefirePreconditionResult {
    c1_war_duration: boolean;
    c2_hrhb_exhaustion: boolean;
    c3_rbih_exhaustion: boolean;
    c4_stalemate: boolean;
    /** C4 was met by the imposed path (HRHB acknowledged Zagreb's ceasefire order). */
    c4_imposed: boolean;
    c5_ivp_momentum: boolean;
    c6_patron_constraint: boolean;
    all_met: boolean;
}

export interface CeasefireCheckReport {
    preconditions: CeasefirePreconditionResult;
    fired: boolean;
    already_active: boolean;
}

/**
 * Evaluate ceasefire preconditions. Pure function of state.
 */
export function evaluateCeasefirePreconditions(state: GameState): CeasefirePreconditionResult {
    const rhs = state.political.rbih_hrhb_state;
    const turn = state.meta.turn;

    // C1: war duration
    const warStartedTurn = rhs?.war_started_turn ?? null;
    const warDuration = warStartedTurn !== null ? turn - warStartedTurn : 0;
    const c1 = warDuration >= CEASEFIRE_MIN_WAR_DURATION;

    // C2: HRHB exhaustion
    const hrhbExhaustion = state.political.war_exhaustion?.['HRHB'] ?? 0;
    const c2 = hrhbExhaustion > CEASEFIRE_HRHB_EXHAUSTION;

    // C3: RBiH exhaustion
    const rbihExhaustion = state.political.war_exhaustion?.['RBiH'] ?? 0;
    const c3 = rbihExhaustion > CEASEFIRE_RBIH_EXHAUSTION;

    // C4: stalemate, or imposed by Zagreb's acknowledged order (WASH-IMPOSED)
    const stalemateturns = rhs?.stalemate_turns ?? 0;
    const c4Imposed = lastEventResponse(state, ZAGREB_CEASEFIRE_EVENT) === ZAGREB_RESTRAINT_RESPONSE;
    const c4 = stalemateturns >= CEASEFIRE_STALEMATE_MIN || c4Imposed;

    // C5: IVP negotiation_momentum
    const ivp = state.political.international_visibility_pressure;
    const negotiationMomentum = ivp?.negotiation_momentum ?? 0;
    const c5 = negotiationMomentum > CEASEFIRE_IVP_THRESHOLD;

    // C6: HRHB patron constraint_severity
    const hrhbFaction = (state.factions ?? []).find((f) => f.id === 'HRHB');
    const constraintSeverity = hrhbFaction?.patron_state?.constraint_severity ?? 0;
    const c6 = constraintSeverity > CEASEFIRE_PATRON_CONSTRAINT;

    return {
        c1_war_duration: c1,
        c2_hrhb_exhaustion: c2,
        c3_rbih_exhaustion: c3,
        c4_stalemate: c4,
        c4_imposed: c4Imposed,
        c5_ivp_momentum: c5,
        c6_patron_constraint: c6,
        all_met: c1 && c2 && c3 && c4 && c5 && c6
    };
}

/**
 * Check and apply ceasefire if all preconditions met. Deterministic; no randomness.
 * Must run AFTER alliance update, BEFORE Washington check.
 */
export function checkAndApplyCeasefire(state: GameState): CeasefireCheckReport {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs) {
        return {
            preconditions: {
                c1_war_duration: false,
                c2_hrhb_exhaustion: false,
                c3_rbih_exhaustion: false,
                c4_stalemate: false,
                c4_imposed: false,
                c5_ivp_momentum: false,
                c6_patron_constraint: false,
                all_met: false
            },
            fired: false,
            already_active: false
        };
    }

    // Already active or Washington signed — no re-evaluation needed
    if (rhs.ceasefire_active) {
        return {
            preconditions: evaluateCeasefirePreconditions(state),
            fired: false,
            already_active: true
        };
    }
    if (rhs.washington_signed) {
        return {
            preconditions: evaluateCeasefirePreconditions(state),
            fired: false,
            already_active: false
        };
    }

    const preconditions = evaluateCeasefirePreconditions(state);
    if (!preconditions.all_met) {
        return { preconditions, fired: false, already_active: false };
    }

    // Fire ceasefire
    rhs.ceasefire_active = true;
    rhs.ceasefire_since_turn = state.meta.turn;

    return { preconditions, fired: true, already_active: false };
}

