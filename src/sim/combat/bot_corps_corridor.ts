/**
 * Corridor breach detection and operation launch.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import type {
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    FACTION_STRATEGIES,
} from './bot_strategy.js';
import {
    CORRIDOR_BREACH_MAX_STRIP_WIDTH,
    MAX_EXHAUSTION_FOR_OPERATION,
} from './bot_constants.js';
import { buildAdjacencyFromEdges } from './war_adjacency.js';
import { assignOperationCommander } from './officer_system.js';
import {
    countHealthyBrigades,
    getCorpsSubordinates,
    getFactionCorps,
    sortByPersonnelDesc,
} from './bot_corps_helpers.js';
import { getAvailableBrigades, hasAvailableSlot } from './corps_operation_helpers.js';

export interface CorridorTarget {
    breachSettlements: SettlementId[];
    friendlyClusterA: SettlementId[];
    friendlyClusterB: SettlementId[];
    narrowestWidth: number;
}

/**
 * Detect corridor breach opportunities: narrow enemy-held strips between
 * two friendly clusters.
 *
 * Returns sorted list of corridor targets for a faction.
 */
export function detectCorridorBreachOpportunities(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): CorridorTarget[] {
    const pc = state.political.political_controllers ?? {};
    const adj = buildAdjacencyFromEdges(edges);
    const strategy = FACTION_STRATEGIES[faction];

    // Focus on corridor municipalities for this faction
    const corridorMuns = new Set(strategy.corridor_municipalities);
    if (corridorMuns.size === 0) return [];

    // Find enemy-held settlements in corridor municipalities
    const enemyCorridorSids: SettlementId[] = [];
    for (const sid of Object.keys(pc).sort(strictCompare)) {
        const mun = sidToMun.get(sid);
        if (!mun || !corridorMuns.has(mun)) continue;
        if (pc[sid] !== faction) {
            enemyCorridorSids.push(sid);
        }
    }

    if (enemyCorridorSids.length === 0 || enemyCorridorSids.length > CORRIDOR_BREACH_MAX_STRIP_WIDTH * 3) {
        return []; // No corridor threat or too wide to breach
    }

    // Simple check: if there are enemy settlements that separate two groups of friendly settlements
    // Find friendly settlements adjacent to enemy corridor settlements
    const friendlyBorderSids = new Set<SettlementId>();
    for (const enemySid of enemyCorridorSids) {
        const neighbors = adj.get(enemySid);
        if (!neighbors) continue;
        for (const nSid of neighbors) {
            if (pc[nSid] === faction) {
                friendlyBorderSids.add(nSid);
            }
        }
    }

    if (friendlyBorderSids.size < 2) return [];

    // If we have enemy corridor settlements <= CORRIDOR_BREACH_MAX_STRIP_WIDTH,
    // this is a potential breach point
    if (enemyCorridorSids.length <= CORRIDOR_BREACH_MAX_STRIP_WIDTH) {
        const target: CorridorTarget = {
            breachSettlements: enemyCorridorSids,
            friendlyClusterA: [...friendlyBorderSids].sort(strictCompare).slice(0, Math.ceil(friendlyBorderSids.size / 2)),
            friendlyClusterB: [...friendlyBorderSids].sort(strictCompare).slice(Math.ceil(friendlyBorderSids.size / 2)),
            narrowestWidth: enemyCorridorSids.length
        };
        return [target];
    }

    return [];
}

/**
 * If a corridor breach opportunity exists and no operation is active,
 * launch a corridor breach operation for the nearest corps.
 */
export function attemptCorridorBreach(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const targets = detectCorridorBreachOpportunities(state, faction, edges, sidToMun);
    if (targets.length === 0) return;

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;

    for (const target of targets) {
        // Find a corps without active operation that can reach the breach
        for (const corps of corpsList) {
            const cmd = corpsCommand[corps.id];
            if (!cmd) continue;
            const corridorSubordinates = getCorpsSubordinates(state, corps.id);
            if (!hasAvailableSlot(cmd, corridorSubordinates.length)) continue;
            if (cmd.stance === 'reorganize') continue;
            if (cmd.corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION) continue;

            const subordinates = getCorpsSubordinates(state, corps.id);
            const healthyCount = countHealthyBrigades(subordinates);
            if (healthyCount < 2) continue; // Lower threshold for corridor ops

            // Filter out brigades already committed to active operations
            const availableIds = new Set(getAvailableBrigades(cmd, subordinates.map(b => b.id)));

            // Select participating brigades
            const participants = sortByPersonnelDesc(
                subordinates.filter(b => availableIds.has(b.id) && (b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= 0.6 && (b.cohesion ?? 60) >= 40)
            ).slice(0, 4);

            if (participants.length < 2) continue;

            const operation: CorpsOperation = {
                name: `Corridor Breach (${faction})`,
                type: 'sector_attack',
                phase: 'planning',
                started_turn: turn,
                phase_started_turn: turn,
                target_settlements: target.breachSettlements,
                participating_brigades: participants.map(b => b.id)
            };

            cmd.active_operations.push(operation);
            assignOperationCommander(state, operation, corps.id, faction);
            // Force offensive stance for this corps during breach
            cmd.stance = 'offensive';
            return; // Only one breach operation at a time
        }
    }
}
