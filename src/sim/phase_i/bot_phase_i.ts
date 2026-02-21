/**
 * Phase I Bot AI: lightweight posture assignment for non-player factions.
 *
 * Sets front_posture assignments (hold/probe/push) for bot-controlled factions
 * during the Phase I transitional period (typically 2-8 weeks).
 *
 * Simpler than Phase II bot (no corps/brigade hierarchy, no AoR, no OGs).
 * Uses front edges + faction-specific aggression levels to assign posture.
 *
 * Deterministic: strictCompare ordering, no Math.random().
 */

import type { FrontEdge } from '../../map/front_edges.js';
import type { FactionId, GameState, PostureLevel } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Faction-specific aggression profile for Phase I posture assignment. */
interface PhaseIFactionProfile {
    /** Fraction of front edges assigned to 'push' posture. */
    push_share: number;
    /** Fraction of front edges assigned to 'probe' posture. */
    probe_share: number;
    /** Early-war push boost (weeks 0-12). */
    early_push_boost: number;
}

const PHASE_I_PROFILES: Record<FactionId, PhaseIFactionProfile> = {
    RS: {
        // RS: aggressively pushes early (JNA equipment advantage)
        push_share: 0.40,
        probe_share: 0.30,
        early_push_boost: 0.15,
    },
    RBiH: {
        // RBiH: mostly defensive in Phase I (survival mode)
        push_share: 0.08,
        probe_share: 0.25,
        early_push_boost: -0.05,
    },
    HRHB: {
        // HRHB: moderate, consolidating Herzegovina
        push_share: 0.20,
        probe_share: 0.25,
        early_push_boost: 0.0,
    }
};

/** Deterministic hash for tie-breaking edge assignment. */
function edgeHash(edgeId: string, faction: FactionId): number {
    let h = 0;
    const s = edgeId + faction;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return (h & 0x7fffffff);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign posture (hold/probe/push) to all front edges for each bot faction.
 * Writes to state.front_posture[faction].assignments.
 *
 * For each faction:
 * 1. Filter front edges to those where the faction is on one side
 * 2. Sort edges deterministically by hash
 * 3. Assign 'push' to the top push_share fraction
 * 4. Assign 'probe' to the next probe_share fraction
 * 5. Assign 'hold' to the rest
 *
 * Alliance-aware: RBiH and HRHB skip each other's edges when allied.
 */
export function runPhaseIBotPosture(
    state: GameState,
    frontEdges: FrontEdge[],
    botFactions: FactionId[]
): void {
    if (!state.front_posture) state.front_posture = {};

    const turn = state.meta?.turn ?? 0;
    const allianceValue = state.phase_i_alliance_rbih_hrhb ?? 1.0;
    const rhs = state.rbih_hrhb_state;
    const rbihHrhbAllied = allianceValue >= 0.2 || rhs?.ceasefire_active || rhs?.washington_signed;
    const rbihHrhbAtWar = allianceValue < 0.0 && !rhs?.ceasefire_active && !rhs?.washington_signed;

    for (const faction of botFactions) {
        const profile = PHASE_I_PROFILES[faction];
        if (!profile) continue;

        // Filter to edges where this faction is one side
        const factionEdges = frontEdges.filter(e => {
            const isSideA = e.side_a === faction;
            const isSideB = e.side_b === faction;
            if (!isSideA && !isSideB) return false;

            // Alliance-aware: skip or include RBiH-HRHB edges based on alliance state
            const otherSide = isSideA ? e.side_b : e.side_a;
            const isBilateral =
                (faction === 'RBiH' && otherSide === 'HRHB') ||
                (faction === 'HRHB' && otherSide === 'RBiH');
            if (isBilateral && rbihHrhbAllied) return false;

            return true;
        });

        if (factionEdges.length === 0) continue;

        // Sort edges deterministically by hash (not alphabetical — varied assignment)
        const sorted = factionEdges
            .map(e => ({ edge: e, hash: edgeHash(e.edge_id, faction) }))
            .sort((a, b) => {
                if (a.hash !== b.hash) return a.hash - b.hash;
                return strictCompare(a.edge.edge_id, b.edge.edge_id);
            });

        // Compute push/probe counts with early-war boost
        const earlyBoost = turn < 12 ? profile.early_push_boost : 0;
        const effectivePushShare = Math.max(0, Math.min(0.6, profile.push_share + earlyBoost));
        const pushCount = Math.floor(sorted.length * effectivePushShare);
        const probeCount = Math.floor(sorted.length * profile.probe_share);

        // Ensure faction posture state exists
        if (!state.front_posture[faction]) {
            state.front_posture[faction] = { assignments: {} };
        }
        const assignments = state.front_posture[faction].assignments;

        // Assign postures
        for (let i = 0; i < sorted.length; i++) {
            const edgeId = sorted[i].edge.edge_id;
            let posture: PostureLevel = 'hold';
            if (i < pushCount) {
                posture = 'push';
            } else if (i < pushCount + probeCount) {
                posture = 'probe';
            }
            assignments[edgeId] = {
                edge_id: edgeId,
                posture,
                weight: 1
            };
        }

        // Bilateral edge posture overrides
        if (rbihHrhbAtWar && (faction === 'RBiH' || faction === 'HRHB')) {
            for (const { edge } of sorted) {
                const eId = edge.edge_id;
                const isBilateral =
                    (faction === 'RBiH' && (edge.side_a === 'HRHB' || edge.side_b === 'HRHB')) ||
                    (faction === 'HRHB' && (edge.side_a === 'RBiH' || edge.side_b === 'RBiH'));
                if (!isBilateral) continue;

                const assignment = assignments[eId];
                if (!assignment) continue;
                // HRHB pushes moderately against RBiH, RBiH mostly defensive
                if (faction === 'HRHB') {
                    // 30% of bilateral edges get push, rest hold
                    // Use deterministic hash to pick
                    const h = edgeHash(eId, faction);
                    assignment.posture = (h % 100 < 30) ? 'push' : 'hold';
                } else {
                    // RBiH: mostly hold, 10% probe
                    const h = edgeHash(eId, faction);
                    assignment.posture = (h % 100 < 10) ? 'probe' : 'hold';
                }
            }
        }
    }
}
