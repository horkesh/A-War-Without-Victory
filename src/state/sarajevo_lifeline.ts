/**
 * B7 — Sarajevo siege continuous-condition LIFELINE substrate.
 *
 * Consolidates the siege "external supply" channel (UN airlift + the
 * Dobrinja–Butmir tunnel) into a single deterministic 0..1 `throughput` scalar
 * and a banded `status` (OPEN | STRANGLED | SEVERED). This is the one genuinely
 * new mechanic of the lane: it replaces the `externalSupply = internalSupply`
 * alias in `sarajevo_exception.ts` (the fidelity bug — the tunnel/airlift were
 * fictional, never modelled) with a lifeline genuinely mediated by event truth.
 *
 * GATING: derived/read ONLY when `ENABLE_SARAJEVO_LIFELINE` is set
 * (`isSarajevoLifelineEnabled()`). When the flag is OFF, NOTHING in this module
 * runs and every consumer keeps its identical pre-change path — byte-identical.
 *
 * Determinism: event-flag + control inputs only; no Date.now / Math.random;
 * deterministic band thresholds; `throughput` clamped to 0..1.
 *
 * Sensitive-history: the lifeline is an accruing-cost mediator, NOT a lever or
 * a relieve-the-siege score (Gate §3). Markale stays Ring 2. See
 * docs/plans/2026-05-29-b7-sarajevo-siege-continuous-condition-plan.md.
 */

import { clamp01 } from '../utils/math.js';
import type { EnclaveResilienceEntry, GameState, SiegeLifelineState, SiegeLifelineStatus } from './game_state.js';
import { getSarajevoSiegeParams, isSarajevoLifelineEnabled } from '../sim/combat/sarajevo_siege_params.js';

/** Canonical event id whose firing makes the Dobrinja–Butmir tunnel a continuous relief. */
export const SARAJEVO_TUNNEL_EVENT_ID = 'sarajevo_tunnel_completed_1993';

/** Throughput at/below which the lifeline is SEVERED (total blockade). */
export const LIFELINE_SEVERED_MAX = 0.001;
/** Throughput at/above which the lifeline is OPEN (carrying significant relief). */
export const LIFELINE_OPEN_MIN = 0.6;

/**
 * Tunnel availability is EVENT TRUTH, never a calendar check (mirrors the
 * 5th-corps "event truth not date" rule). True once the tunnel-completed event
 * has fired (`fired_event_ids`) or the explicit operational flag is set.
 */
export function isTunnelActive(state: GameState): boolean {
    const fired = state.military?.fired_event_ids;
    if (Array.isArray(fired) && fired.includes(SARAJEVO_TUNNEL_EVENT_ID)) return true;
    return state.military?.sarajevo_tunnel_operational === true;
}

/**
 * UN airlift (Operation Provide Promise) availability. There is no discrete
 * airlift event in the data, so: active while the city is under siege unless an
 * optional incident flag (`provide_promise_suspended`) is set this turn. This
 * is flag-ON-only logic and never touches the flag-OFF path.
 */
export function isAirliftActive(state: GameState, besieged: boolean): boolean {
    if (!besieged) return false;
    if (state.military?.event_flags?.provide_promise_suspended === true) return false;
    return true;
}

/** Band a 0..1 throughput into the lifeline status enum (deterministic). */
export function bandLifelineStatus(throughput: number): SiegeLifelineStatus {
    if (throughput <= LIFELINE_SEVERED_MAX) return 'SEVERED';
    if (throughput >= LIFELINE_OPEN_MIN) return 'OPEN';
    return 'STRANGLED';
}

/**
 * Derive the lifeline state from event truth + control. Pure; deterministic.
 * Called ONLY when the flag is ON (callers gate on `isSarajevoLifelineEnabled`).
 *
 * @param besieged  whether siege_status is BESIEGED this turn (drives airlift).
 */
export function deriveSarajevoLifeline(
    state: GameState,
    besieged: boolean,
    turn: number,
): SiegeLifelineState {
    const params = getSarajevoSiegeParams(state);
    const tunnelActive = isTunnelActive(state);
    const airliftActive = isAirliftActive(state, besieged);

    let throughput = params.lifeline_base_throughput;
    if (airliftActive) throughput += params.lifeline_airlift_throughput;
    if (tunnelActive) throughput += params.lifeline_tunnel_throughput;
    throughput = clamp01(throughput);

    return {
        status: bandLifelineStatus(throughput),
        airlift_active: airliftActive,
        tunnel_active: tunnelActive,
        throughput,
        last_updated_turn: turn,
    };
}

/**
 * Read the currently-derived Sarajevo lifeline from state, but ONLY when the
 * flag is ON. Returns `undefined` when the flag is OFF or the lifeline has not
 * been derived this run — so every consumer that calls this on the flag-OFF
 * path receives `undefined` and takes its identical pre-change branch.
 */
export function getActiveSarajevoLifeline(state: GameState): SiegeLifelineState | undefined {
    if (!isSarajevoLifelineEnabled()) return undefined;
    return state.political?.sarajevo_state?.lifeline;
}

// isSarajevoCoreSiegeCounterKey / lifelineAttritionMultiplier retired 2026-11-17
// (§6 panel, Fable consult 6): their only readers were the retired siege counters,
// siege bombardment attrition and siege morale drain.
