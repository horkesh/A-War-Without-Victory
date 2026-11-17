/**
 * Humanitarian convoy decisions (moved out of the retired supply_reserves.ts, 2026-11-17).
 *
 * Fable consult 6 retired the supply-reserve economy: convoys no longer add to a faction
 * general supply reserve (there is none). A convoy decision still records its receipt and,
 * when blocked or diverted, still raises enclave humanitarian pressure and the route
 * faction's diplomatic isolation.
 *
 * The producer (`evaluateHumanitarianConvoys`) is still gated on the compatibility-only
 * `meta.supply_reserves_enabled` flag exactly as before, so no new game creates convoys.
 * Whether the convoy decision is retired or ungated is an open decision (lane report).
 *
 * All iteration is deterministic (sorted ids).
 */

import type { EnclaveState, FactionId, GameState, PendingConvoyDecision } from './game_state.js';
import type { EdgeRecord } from '../map/settlements.js';
import { strictCompare } from './validateGameState.js';
import { ensureInternationalVisibilityPressure, ensurePatronState } from './patron_pressure.js';

function getPlayerFaction(state: GameState): FactionId | undefined {
    const rootPlayerFaction = (state as GameState & { player_faction?: FactionId }).player_faction;
    return state.meta?.player_faction ?? rootPlayerFaction ?? undefined;
}

function determineConvoyRouteFaction(enclave: EnclaveState, state: GameState, edges: EdgeRecord[]): FactionId | null {
    const enclaveSet = new Set(enclave.settlement_ids);
    const hostileCounts = new Map<FactionId, number>();
    for (const edge of edges) {
        let externalSid: string | null = null;
        if (enclaveSet.has(edge.a) && !enclaveSet.has(edge.b)) externalSid = edge.b;
        if (enclaveSet.has(edge.b) && !enclaveSet.has(edge.a)) externalSid = edge.a;
        if (!externalSid) continue;
        const controller = state.political.political_controllers?.[externalSid];
        if (!controller || controller === enclave.faction_id) continue;
        hostileCounts.set(controller, (hostileCounts.get(controller) ?? 0) + 1);
    }
    return [...hostileCounts.entries()]
        .sort((a, b) => (b[1] - a[1]) || strictCompare(String(a[0]), String(b[0])))
        .map(([faction]) => faction)[0] ?? null;
}

export function evaluateHumanitarianConvoys(state: GameState, edges: EdgeRecord[]): PendingConvoyDecision[] {
    if (!state.meta?.supply_reserves_enabled) return [];
    const ivp = ensureInternationalVisibilityPressure(state);
    const pending = Array.isArray(state.military.pending_convoy_decisions) ? [...state.military.pending_convoy_decisions] : [];
    const pendingIds = new Set(pending.map((convoy) => convoy.id));
    const created: PendingConvoyDecision[] = [];

    for (const enclave of [...(state.political.enclaves ?? [])].sort((a, b) => strictCompare(a.id, b.id))) {
        if (enclave.siege_duration < 4 || enclave.collapsed) continue;
        const routeFaction = determineConvoyRouteFaction(enclave, state, edges);
        if (!routeFaction) continue;
        const convoyScore = enclave.siege_duration * 0.1 + enclave.humanitarian_pressure + (ivp.composite_ivp ?? 0) * 0.5;
        if (convoyScore < 1) continue;
        const convoy: PendingConvoyDecision = {
            id: `convoy:${state.meta.turn}:${enclave.id}:${routeFaction}`,
            target_enclave: enclave.id,
            route_faction: routeFaction,
            supply_amount: Math.max(0.3, Math.min(0.8, 0.3 + enclave.humanitarian_pressure * 0.5)),
        };
        if (pendingIds.has(convoy.id)) continue;
        created.push(convoy);
        pending.push(convoy);
        pendingIds.add(convoy.id);
    }

    state.military.pending_convoy_decisions = pending.sort((a, b) => strictCompare(a.id, b.id));
    return created;
}

export function applyHumanitarianConvoyDecisions(state: GameState): void {
    const pending = Array.isArray(state.military.pending_convoy_decisions) ? [...state.military.pending_convoy_decisions] : [];
    if (pending.length === 0) return;

    const ivp = ensureInternationalVisibilityPressure(state);
    const playerFaction = getPlayerFaction(state);
    const remaining: PendingConvoyDecision[] = [];
    const history = Array.isArray(state.military.convoy_decision_history)
        ? [...state.military.convoy_decision_history]
        : [];

    for (const convoy of pending.sort((a, b) => strictCompare(a.id, b.id))) {
        let decision = convoy.decision;
        const wasPlayerFiled = Boolean(playerFaction && convoy.route_faction === playerFaction && decision);
        if (!decision) {
            if (playerFaction && convoy.route_faction === playerFaction) {
                remaining.push(convoy);
                continue;
            }
            const composite = ivp.composite_ivp ?? 0;
            decision = composite > 0.5 ? 'allow' : composite < 0.3 ? 'block' : 'divert';
        }

        const targetFaction = state.political.enclaves?.find((enclave) => enclave.id === convoy.target_enclave)?.faction_id ?? 'RBiH';
        const ivpMult = convoy.route_faction === 'HRHB' ? 0.6 : 1.0;
        const routePatron = ensurePatronState(state, convoy.route_faction);
        history.push({
            id: convoy.id,
            turn: state.meta?.turn ?? 0,
            target_enclave: convoy.target_enclave,
            route_faction: convoy.route_faction,
            target_faction: targetFaction,
            supply_amount: convoy.supply_amount,
            decision,
            decided_by: wasPlayerFiled ? 'player' : 'bot',
        });

        // Retired 2026-11-17 (Fable consult 6): allowed and diverted convoys no longer add to a
        // general supply reserve; the supply-reserve economy is not modelled in 1.0.
        if (decision === 'allow') continue;
        if (decision === 'block') {
            ivp.enclave_humanitarian_pressure = Math.min(1, ivp.enclave_humanitarian_pressure + 0.03 * ivpMult);
            routePatron.diplomatic_isolation = Math.min(1, routePatron.diplomatic_isolation + 0.05 * ivpMult);
            continue;
        }
        ivp.enclave_humanitarian_pressure = Math.min(1, ivp.enclave_humanitarian_pressure + 0.01 * ivpMult);
        routePatron.diplomatic_isolation = Math.min(1, routePatron.diplomatic_isolation + 0.02 * ivpMult);
    }

    state.military.pending_convoy_decisions = remaining;
    state.military.convoy_decision_history = history.sort((a, b) =>
        a.turn !== b.turn ? a.turn - b.turn : strictCompare(a.id, b.id)
    );
}
