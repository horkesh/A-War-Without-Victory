/**
 * The decision logic of the paramilitary review IPC (`resolve-paramilitary-requests`), extracted from
 * electron-main.cjs so tests can call it directly (§6 design M, red-team condition M-a1).
 *
 * RED seam: a faithful copy of the current handler body; electron-main.cjs does not call it yet.
 */

import type { GameState } from '../state/game_state.js';
import {
    isPlayerParamilitaryRequestGateHolding,
    resolvePlayerParamilitaryDecisions,
    type ParamilitarySweepReport,
} from '../sim/combat/paramilitary_sweep.js';
import { isParamilitaryPolicyOrder, type ParamilitaryPolicyOrder } from '../sim/events/paramilitary_policy_card.js';

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
    // §6 design T3 (engine D5): while the manual gate holds (the player's policy card has not applied an
    // answer), nothing may be approved, not even a request an older build left in the save; the next
    // detect deletes such requests.
    const approves = policy === 'always_allow' || [...decisionByTarget.values()].includes('allow');
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
