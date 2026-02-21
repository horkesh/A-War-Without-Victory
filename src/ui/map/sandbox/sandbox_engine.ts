/**
 * Sandbox Turn Engine — Minimal Phase II pipeline for the tactical sandbox.
 *
 * Wraps the real AWWV engine functions (battle resolution, movement, posture,
 * equipment degradation) in a simplified turn pipeline suitable for browser
 * execution on a small settlement slice.
 *
 * Deterministic: no Math.random(), sorted iteration via strictCompare.
 */

import type { EdgeRecord } from '../../../map/settlements.js';
import type { TerrainScalarsData } from '../../../map/terrain_scalars.js';
import type { ResolveAttackOrdersReport } from '../../../sim/phase_ii/resolve_attack_orders.js';
import type { FormationId, GameState } from '../../../state/game_state.js';

import { applyWiaTrickleback } from '../../../sim/formation_spawn.js';
import { processBrigadeMovement } from '../../../sim/phase_ii/brigade_movement.js';
import { applyPostureOrders } from '../../../sim/phase_ii/brigade_posture.js';
import { applyBrigadePressureToState } from '../../../sim/phase_ii/brigade_pressure.js';
import { degradeEquipment, ensureBrigadeComposition } from '../../../sim/phase_ii/equipment_effects.js';
import { resolveAttackOrders } from '../../../sim/phase_ii/resolve_attack_orders.js';
import { initializeCasualtyLedger } from '../../../state/casualty_ledger.js';
import { strictCompare } from '../../../state/validateGameState.js';

// ---------------------------------------------------------------------------
// Deployment mechanic (sandbox-only, not canon)
// ---------------------------------------------------------------------------

/** Baseline movement rate for undeployed brigades (column march). */
export const UNDEPLOYED_MOVEMENT_RATE = 12;
/** Movement rate for deployed brigades (combat posture — slower). */
export const DEPLOYED_MOVEMENT_RATE = 3;

export type DeploymentStatus = 'deployed' | 'deploying' | 'undeployed' | 'undeploying';

export interface DeploymentState {
    status: DeploymentStatus;
    saved_aor_sids: string[];    // AoR before state change (for restoration/reference)
    hq_sid: string;              // single settlement when undeployed
    turns_remaining?: number;    // 1 turn for deploying/undeploying transitions
}

// Backward compat aliases for existing code that references LoadUpState
export type LoadUpStatus = DeploymentStatus;
export type LoadUpState = DeploymentState;

/**
 * Process deployment state transitions each turn.
 * Called before processBrigadeMovement() in the sandbox pipeline.
 *
 * State machine:
 *   undeploying (1 turn) → undeployed (AoR contracted to HQ only)
 *   deploying (1 turn)   → deployed (AoR expands to HQ + adjacent, up to personnel cap)
 *   undeployed            → no auto-transition (waits for move order or deploy command)
 *   deployed              → no entry in deploymentStates (implicit: no entry = deployed)
 */
export function processDeploymentStates(
    deploymentStates: Record<string, DeploymentState>,
    state: GameState,
    edges: Array<{ a: string; b: string }>,
): string[] {
    const logs: string[] = [];
    const toDelete: string[] = [];

    for (const fid of Object.keys(deploymentStates).sort(strictCompare)) {
        const ds = deploymentStates[fid]!;

        if (ds.status === 'undeploying') {
            // Transition: undeploying → undeployed
            // Contract AoR to HQ only
            const brigadeAor = (state as any).brigade_aor as Record<string, string | null> ?? {};
            for (const [sid, bid] of Object.entries(brigadeAor)) {
                if (bid === fid && sid !== ds.hq_sid) {
                    brigadeAor[sid] = null;
                }
            }
            ds.status = 'undeployed';
            delete ds.turns_remaining;
            logs.push(`${fid}: undeployed (AoR contracted to ${ds.hq_sid})`);

        } else if (ds.status === 'deploying') {
            const remaining = (ds.turns_remaining ?? 1) - 1;
            if (remaining <= 0) {
                // Expand AoR to HQ + adjacent friendly/uncontrolled settlements
                const brigadeAor = (state as any).brigade_aor as Record<string, string | null> ?? {};
                const pc = (state as any).political_controllers as Record<string, string | null> ?? {};
                const formations = (state as any).formations as Record<string, { faction?: string; hq_sid?: string; personnel?: number }> ?? {};
                const formation = formations[fid];
                const faction = formation?.faction;
                const hqSid = formation?.hq_sid ?? ds.hq_sid;
                const personnel = formation?.personnel ?? 400;

                // Compute max AoR from personnel: floor(personnel / 400), clamped [1, 4]
                const maxAoR = Math.min(4, Math.max(1, Math.floor(personnel / 400)));

                // Assign HQ to brigade
                brigadeAor[hqSid] = fid;

                if (faction && maxAoR > 1) {
                    // Build adjacency from edges
                    const adj = new Map<string, string[]>();
                    for (const e of edges) {
                        if (!adj.has(e.a)) adj.set(e.a, []);
                        if (!adj.has(e.b)) adj.set(e.b, []);
                        adj.get(e.a)!.push(e.b);
                        adj.get(e.b)!.push(e.a);
                    }

                    // Expand to adjacent faction-controlled or uncontrolled settlements
                    const neighbors = (adj.get(hqSid) ?? []).sort(strictCompare);
                    let added = 0;
                    for (const nSid of neighbors) {
                        if (added >= maxAoR - 1) break;  // -1 because HQ already counted
                        const ctrl = pc[nSid];
                        if ((ctrl === faction || !ctrl || ctrl === null)
                            && (!brigadeAor[nSid] || brigadeAor[nSid] === null)) {
                            brigadeAor[nSid] = fid;
                            if (!ctrl || ctrl === null) pc[nSid] = faction;  // Claim uncontrolled
                            added++;
                        }
                    }
                }

                toDelete.push(fid);
                logs.push(`${fid}: deployed at ${hqSid} (${maxAoR} settlement AoR)`);
            } else {
                ds.turns_remaining = remaining;
            }
        }
        // 'undeployed' status: no automatic transition — waits for user move/deploy command
    }

    for (const fid of toDelete) {
        delete deploymentStates[fid];
    }

    return logs;
}

// Legacy alias
export const processLoadUpStates = processDeploymentStates;

// ---------------------------------------------------------------------------
// Turn report
// ---------------------------------------------------------------------------

export interface SandboxTurnReport {
    turn: number;
    attackReport: ResolveAttackOrdersReport;
    movementProcessed: boolean;
    postureApplied: boolean;
    loadUpLogs: string[];
}

// ---------------------------------------------------------------------------
// Sandbox pipeline
// ---------------------------------------------------------------------------

/**
 * Advance the sandbox state by one turn using real engine functions.
 *
 * Steps (subset of full 30+ step pipeline):
 * 1. Apply posture orders
 * 2. Process brigade movement (pack → transit → unpack)
 * 3. Equipment degradation
 * 4. Compute brigade pressure
 * 5. Resolve attack orders → battles → control flips
 * 6. WIA trickleback
 * 7. Advance turn counter
 *
 * @param state  - Mutable GameState (will be modified in place)
 * @param edges  - Settlement edges for the slice
 * @param terrain - Terrain scalars for battle resolution (elevation, rivers, roads)
 * @param sidToMun - Settlement ID → municipality ID map
 * @param deploymentStates - Deployment state tracking (sandbox-only)
 */
export function advanceSandboxTurn(
    state: GameState,
    edges: EdgeRecord[],
    terrain: TerrainScalarsData,
    sidToMun: Map<string, string>,
    deploymentStates?: Record<string, DeploymentState>,
): SandboxTurnReport {
    const turnNumber = (state.meta?.turn ?? 0) + 1;

    // Ensure casualty ledger exists
    if (!state.casualty_ledger) {
        // Extract faction IDs from formations
        const factionIds = new Set<string>();
        for (const f of Object.values(state.formations ?? {})) {
            if (f && f.faction) factionIds.add(f.faction);
        }
        state.casualty_ledger = initializeCasualtyLedger([...factionIds].sort(strictCompare));
    }

    // 0. Process deployment states (sandbox-only mechanic, before movement)
    let loadUpLogs: string[] = [];
    if (deploymentStates && Object.keys(deploymentStates).length > 0) {
        loadUpLogs = processDeploymentStates(deploymentStates, state, edges as Array<{ a: string; b: string }>);
    }

    // 1. Apply posture orders
    let postureApplied = false;
    if (state.brigade_posture_orders && state.brigade_posture_orders.length > 0) {
        applyPostureOrders(state);
        postureApplied = true;
    }

    // 2. Process brigade movement
    let movementProcessed = false;
    if (state.brigade_movement_orders && Object.keys(state.brigade_movement_orders).length > 0) {
        processBrigadeMovement(state, edges);
        movementProcessed = true;
    }

    // 3. Equipment degradation (simplified: fixed maintenance=0.5)
    const formations = state.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid as FormationId];
        if (!f) continue;
        if (f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og') continue;
        ensureBrigadeComposition(f);
        degradeEquipment(f, f.posture ?? 'defend', 0.5);
    }

    // 4. Compute brigade pressure
    if (state.brigade_aor && Object.keys(state.brigade_aor).length > 0) {
        applyBrigadePressureToState(state, edges);
    }

    // 5. Resolve attack orders → battles → control flips
    const attackReport = resolveAttackOrders(state, edges, terrain, sidToMun);

    // 6. WIA trickleback
    try {
        applyWiaTrickleback(state);
    } catch {
        // WIA trickleback may fail if pending_wia not initialized; safe to skip
    }

    // 7. Advance turn counter
    if (!state.meta) {
        (state as any).meta = { turn: turnNumber, phase: 'phase_ii' };
    } else {
        state.meta.turn = turnNumber;
    }

    return {
        turn: turnNumber,
        attackReport,
        movementProcessed,
        postureApplied,
        loadUpLogs,
    };
}

/**
 * Deep-clone a GameState for determinism testing.
 */
export function cloneGameState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state)) as GameState;
}

/**
 * Compare two turn reports for determinism.
 * Returns list of differences (empty = identical).
 */
export function compareTurnReports(a: SandboxTurnReport, b: SandboxTurnReport): string[] {
    const diffs: string[] = [];
    if (a.turn !== b.turn) diffs.push(`turn: ${a.turn} vs ${b.turn}`);
    if (a.attackReport.orders_processed !== b.attackReport.orders_processed) {
        diffs.push(`orders_processed: ${a.attackReport.orders_processed} vs ${b.attackReport.orders_processed}`);
    }
    if (a.attackReport.flips_applied !== b.attackReport.flips_applied) {
        diffs.push(`flips_applied: ${a.attackReport.flips_applied} vs ${b.attackReport.flips_applied}`);
    }
    if (a.attackReport.casualty_attacker !== b.attackReport.casualty_attacker) {
        diffs.push(`casualty_attacker: ${a.attackReport.casualty_attacker} vs ${b.attackReport.casualty_attacker}`);
    }
    if (a.attackReport.casualty_defender !== b.attackReport.casualty_defender) {
        diffs.push(`casualty_defender: ${a.attackReport.casualty_defender} vs ${b.attackReport.casualty_defender}`);
    }
    return diffs;
}
