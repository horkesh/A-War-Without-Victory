/**
 * The decision logic of the paramilitary review IPC (`resolve-paramilitary-requests`), extracted from
 * electron-main.cjs so tests call it directly (§6 design M, red-team condition M-a1). electron-main reads the
 * canonical state as a deserialized copy, calls this through the sim bundle, and writes the copy back only when
 * the result is `ok`; a refusal returns before any write, so the whole packet is rejected and nothing is recorded.
 *
 * §6 design M (M-a, signed 2026-11-19): the modal can never raise the standing order above the answer the side's
 * policy card has APPLIED, nor above `ask` before it applies. The handler compares ranks (always_deny < ask <
 * always_allow; engine D9): a standing order above the cap is refused, and so is a per-request Allow (an
 * `ask`-rank act) under an applied Refuse. Re-raising up to the card's own Always allow stays allowed. HRHB has
 * no card and is not capped. The refusal code maps to `paramilitaryReview.error.cannotLoosen` in the renderer.
 */

import type { GameState } from '../state/game_state.js';
import {
    isPlayerParamilitaryRequestGateHolding,
    resolvePlayerParamilitaryDecisions,
    type ParamilitarySweepReport,
} from '../sim/combat/paramilitary_sweep.js';
import {
    PARAMILITARY_POLICY_CANNOT_LOOSEN,
    isParamilitaryOrderWithinCap,
    isParamilitaryPolicyOrder,
    paramilitaryStandingOrderCap,
    type ParamilitaryPolicyOrder,
} from '../sim/events/paramilitary_policy_card.js';

export type ParamilitaryReviewResult =
    | { ok: true; report: ParamilitarySweepReport }
    | { ok: false; error: string };

type ReviewDecision = 'allow' | 'deny';

function isFinalParamilitaryDecision(decision: unknown): boolean {
    return decision === 'allow' || decision === 'deny' || decision === 'regular';
}

function policyDecision(policy: ParamilitaryPolicyOrder | null): ReviewDecision | null {
    if (policy === 'always_deny') return 'deny';
    if (policy === 'always_allow') return 'allow';
    return null;
}

export function resolveParamilitaryReviewRequests(state: GameState | null, payload: unknown): ParamilitaryReviewResult {
    const input = (payload !== null && typeof payload === 'object' ? payload : {}) as { decisions?: unknown; policy?: unknown };
    const decisions = Array.isArray(input.decisions) ? (input.decisions as unknown[]) : null;
    const policy = isParamilitaryPolicyOrder(input.policy) ? input.policy : null;
    if (input.policy !== undefined && !policy) return { ok: false, error: 'invalid_policy' };
    if (!state || !decisions) return { ok: false, error: 'no_state_or_invalid_payload' };

    const decisionByTarget = new Map<string, ReviewDecision>();
    for (const item of decisions) {
        const row = item as { target_osid?: unknown; decision?: unknown } | null;
        if (
            row
            && typeof row.target_osid === 'string'
            && (row.decision === 'allow' || row.decision === 'deny')
        ) {
            decisionByTarget.set(row.target_osid, row.decision);
        }
    }
    if (decisionByTarget.size === 0) return { ok: false, error: 'invalid_decisions' };

    const pending = Array.isArray(state.pending_paramilitary_requests) ? state.pending_paramilitary_requests : [];
    const playerFaction = state.meta?.player_faction ?? null;
    const approvesARequest = [...decisionByTarget.values()].includes('allow');
    // §6 design M (M-a): the rank check against the card's APPLIED answer (`ask` before it applies).
    const cap = paramilitaryStandingOrderCap(state, playerFaction);
    if ((policy && !isParamilitaryOrderWithinCap(policy, cap)) || (approvesARequest && !isParamilitaryOrderWithinCap('ask', cap))) {
        return { ok: false, error: PARAMILITARY_POLICY_CANNOT_LOOSEN };
    }
    // §6 design T3 (engine D5): while the manual gate holds (the player's policy card has not applied an
    // answer), nothing may be approved, not even a request an older build left in the save; the next
    // detect deletes such requests.
    const approves = policy === 'always_allow' || approvesARequest;
    if (approves && isPlayerParamilitaryRequestGateHolding(state)) {
        return { ok: false, error: 'paramilitary_policy_not_applied' };
    }
    if (policy) state.paramilitary_policy = policy;
    let matched = 0;

    for (const request of pending) {
        if (!request || typeof request.target_osid !== 'string') continue;
        if (playerFaction && request.faction !== playerFaction) continue;
        if (isFinalParamilitaryDecision(request.decision)) continue;
        const decision = decisionByTarget.get(request.target_osid) ?? policyDecision(policy);
        if (!decision) continue;
        request.decision = decision;
        matched += 1;
    }

    if (matched === 0) return { ok: false, error: 'request_not_found' };

    const unresolved = pending.filter((request) =>
        request
        && (!playerFaction || request.faction === playerFaction)
        && !isFinalParamilitaryDecision(request.decision),
    );
    if (unresolved.length > 0) return { ok: false, error: 'incomplete_decisions' };

    const report = resolvePlayerParamilitaryDecisions(state);
    return { ok: true, report };
}
