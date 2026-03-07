/**
 * Paramilitary rear pocket cleanup.
 *
 * Small autonomous paramilitary units that spawn when rear enemy pockets are detected,
 * march to them, capture undefended territory, and dissolve.
 *
 * Casualties inflicted and suffered count toward faction totals.
 * Faction-differentiated spawn rates based on organizational_penetration paramilitary scores.
 * Active mainly weeks 0-20, fade out as war professionalizes.
 *
 * Player choice: bot factions auto-approve; player gets batch decision panel.
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
    ParamilitaryRequest
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { recordBattleCasualties } from '../../state/casualty_ledger.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    PARAMILITARY_UNIT_SIZE,
    PARAMILITARY_MARCH_TURNS,
    PARAMILITARY_FADE_WEEK,
    PARAMILITARY_SPAWN_RATE,
    PARAMILITARY_CASUALTY_RATE,
    PARAMILITARY_CIVILIAN_CASUALTY_RATE,
    PARAMILITARY_COHESION
} from '../../state/formation_constants.js';
import { analyzeFactionGraph } from './osid_graph_analysis.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { EdgeRecord } from '../../map/settlements.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ParamilitarySweepReport {
    spawned: Array<{ faction: FactionId; target_osid: string; formation_id: FormationId }>;
    captured: Array<{ faction: FactionId; osid: string; formation_id: FormationId; casualties_inflicted: number; casualties_suffered: number }>;
    dissolved: FormationId[];
    pending_player_requests: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Check if an OSID has a defending formation (any faction). */
function hasDefender(state: GameState, osid: string, excludeFaction: FactionId): boolean {
    const formations = state.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.faction === excludeFaction) continue;
        if (f.kind === 'paramilitary') continue;
        if (f.location_osid === osid) return true;
    }
    return false;
}

/** Generate a deterministic paramilitary formation ID. */
function makeParamilitaryId(faction: FactionId, turn: number, index: number): FormationId {
    return `para_${faction.toLowerCase()}_t${turn}_${index}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// Core: Detect pockets and create requests
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect rear enemy pockets for all factions and generate paramilitary requests.
 * Bot factions auto-approve. Player faction populates pending_paramilitary_requests.
 *
 * Call once per turn, after partition-corps-front-sectors.
 */
export function detectParamilitaryTargets(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): ParamilitarySweepReport {
    const report: ParamilitarySweepReport = {
        spawned: [],
        captured: [],
        dissolved: [],
        pending_player_requests: 0
    };

    const turn = state.meta?.turn ?? 0;

    // No paramilitaries after fade week
    if (turn > PARAMILITARY_FADE_WEEK) return report;

    const adjacency = buildOsidAdjacency(edges);
    const playerFaction = state.meta?.player_faction ?? null;
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);

    // Check for existing paramilitary targets to avoid duplicates
    const existingTargets = new Set<string>();
    for (const fid of Object.keys(state.formations ?? {}).sort(strictCompare)) {
        const f = (state.formations ?? {})[fid];
        if (f?.kind === 'paramilitary' && f.paramilitary_target) {
            existingTargets.add(`${f.faction}:${f.paramilitary_target}`);
        }
    }
    // Also track pending requests
    for (const req of state.pending_paramilitary_requests ?? []) {
        existingTargets.add(`${req.faction}:${req.target_osid}`);
    }

    for (const faction of factions) {
        const graphAnalysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);
        const pockets = graphAnalysis.enemy_pockets;
        if (pockets.length === 0) continue;

        const baseRate = PARAMILITARY_SPAWN_RATE[faction] ?? 0.3;

        let spawnIndex = 0;
        for (const pocketOsid of pockets) {
            // Skip if already targeted
            if (existingTargets.has(`${faction}:${pocketOsid}`)) continue;

            // Skip if defended by a formation
            if (hasDefender(state, pocketOsid, faction)) continue;

            // Effective spawn rate is the faction base rate directly.
            // Organizational penetration already determined which factions have
            // paramilitary networks — the base rates encode that difference.
            const effectiveRate = baseRate;

            // Deterministic threshold: use turn + osid hash to create stable yes/no
            // Simple deterministic hash: sum of char codes mod 100 / 100
            const hashVal = deterministicHash(pocketOsid, turn) / 100;
            if (hashVal > effectiveRate) continue;

            // Player faction: create request instead of auto-spawning
            if (faction === playerFaction) {
                const policy = state.paramilitary_policy ?? 'ask';
                if (policy === 'always_deny') continue;
                if (policy === 'always_allow') {
                    // Auto-approve
                    spawnParamilitary(state, faction, pocketOsid, turn, spawnIndex, report);
                    spawnIndex++;
                    continue;
                }
                // 'ask' — add to pending
                const requests = state.pending_paramilitary_requests ??= [];
                requests.push({
                    target_osid: pocketOsid,
                    faction,
                    strength: PARAMILITARY_UNIT_SIZE
                });
                report.pending_player_requests++;
                continue;
            }

            // Bot faction: auto-approve
            spawnParamilitary(state, faction, pocketOsid, turn, spawnIndex, report);
            spawnIndex++;
        }
    }

    return report;
}

/**
 * Deterministic hash for spawn decision. Returns 0-99.
 * Uses char code sum of osid + turn for stable, reproducible result.
 */
function deterministicHash(osid: string, turn: number): number {
    let hash = turn * 31;
    for (let i = 0; i < osid.length; i++) {
        hash = (hash * 37 + osid.charCodeAt(i)) | 0;
    }
    return ((hash < 0 ? -hash : hash) % 100);
}

/**
 * Spawn a paramilitary formation targeting a pocket OSID.
 */
function spawnParamilitary(
    state: GameState,
    faction: FactionId,
    targetOsid: string,
    turn: number,
    index: number,
    report: ParamilitarySweepReport
): void {
    const fid = makeParamilitaryId(faction, turn, index);
    const formations = state.formations ??= {};

    const formation: FormationState = {
        id: fid,
        faction,
        name: `Paramilitary Unit (${faction})`,
        created_turn: turn,
        status: 'active',
        assignment: null,
        kind: 'paramilitary',
        personnel: PARAMILITARY_UNIT_SIZE,
        cohesion: PARAMILITARY_COHESION,
        morale: 80,
        paramilitary_target: targetOsid,
        paramilitary_eta: PARAMILITARY_MARCH_TURNS
    };

    formations[fid] = formation;

    // Track deployment count for consequences
    const counts = state.paramilitary_deployment_count ??= {};
    counts[faction] = (counts[faction] ?? 0) + 1;

    report.spawned.push({ faction, target_osid: targetOsid, formation_id: fid });
}

// ═══════════════════════════════════════════════════════════════════════════
// Core: Advance and resolve paramilitary units
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advance all active paramilitary formations.
 * - Decrement ETA
 * - At ETA=0: capture target, suffer/inflict casualties, dissolve
 *
 * Call once per turn, after detection.
 */
export function advanceParamilitaries(
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap
): ParamilitarySweepReport {
    const report: ParamilitarySweepReport = {
        spawned: [],
        captured: [],
        dissolved: [],
        pending_player_requests: 0
    };

    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    // Collect paramilitary IDs sorted for determinism
    const paraIds = Object.keys(formations)
        .filter(fid => formations[fid]?.kind === 'paramilitary' && formations[fid]?.status === 'active')
        .sort(strictCompare);

    for (const fid of paraIds) {
        const f = formations[fid];
        if (!f || !f.paramilitary_target) continue;

        // Decrement ETA
        const eta = (f.paramilitary_eta ?? 0) - 1;
        f.paramilitary_eta = eta;

        if (eta > 0) continue;

        // ETA reached: attempt capture
        const targetOsid = f.paramilitary_target;
        const currentController = getPoliticalControllerOSID(state, targetOsid, reverseMap);

        // If target is already faction-controlled (someone else captured it), just dissolve
        if (currentController === f.faction) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Check if still undefended
        if (hasDefender(state, targetOsid, f.faction)) {
            // Defended now — paramilitary takes casualties and retreats (dissolves)
            const casualties = Math.ceil(f.personnel! * PARAMILITARY_CASUALTY_RATE * 3);
            if (state.casualty_ledger) {
                recordBattleCasualties(state.casualty_ledger, f.faction, fid, {
                    killed: Math.ceil(casualties * 0.5),
                    wounded: Math.ceil(casualties * 0.3),
                    missing_captured: Math.max(0, casualties - Math.ceil(casualties * 0.5) - Math.ceil(casualties * 0.3))
                });
            }
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Capture: flip control
        const pc = state.political_controllers ??= {};
        pc[targetOsid] = f.faction;

        // Record control event for GUI
        (state.control_events ??= []).push({
            turn,
            settlement_id: targetOsid,
            mechanism: 'combat' as const,
            from: currentController ?? null,
            to: f.faction
        });

        // Paramilitary casualties (suffered)
        const selfCas = Math.ceil((f.personnel ?? PARAMILITARY_UNIT_SIZE) * PARAMILITARY_CASUALTY_RATE);
        if (state.casualty_ledger) {
            recordBattleCasualties(state.casualty_ledger, f.faction, fid, {
                killed: Math.ceil(selfCas * 0.3),
                wounded: Math.ceil(selfCas * 0.4),
                missing_captured: Math.max(0, selfCas - Math.ceil(selfCas * 0.3) - Math.ceil(selfCas * 0.4))
            });
        }

        // Civilian casualties inflicted (war crimes — recorded against the target's civilian population)
        // This uses the civilian_casualties system on state
        const civCas = Math.ceil(5000 * PARAMILITARY_CIVILIAN_CASUALTY_RATE); // ~100 per sweep
        if (state.civilian_casualties && currentController) {
            const civFaction = state.civilian_casualties[currentController];
            if (civFaction) {
                civFaction.killed = (civFaction.killed ?? 0) + civCas;
            }
        }

        report.captured.push({
            faction: f.faction,
            osid: targetOsid,
            formation_id: fid,
            casualties_inflicted: civCas,
            casualties_suffered: selfCas
        });

        // Dissolve after capture
        dissolveParamilitary(state, fid, report);
    }

    return report;
}

/** Remove a paramilitary formation from state. */
function dissolveParamilitary(state: GameState, fid: FormationId, report: ParamilitarySweepReport): void {
    const formations = state.formations ?? {};
    const f = formations[fid];
    if (f) {
        f.status = 'inactive';
        f.lifecycle_status = 'disbanded';
    }
    report.dissolved.push(fid);
}

// ═══════════════════════════════════════════════════════════════════════════
// Player decision resolution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve player paramilitary decisions from the pending requests queue.
 * Called after player UI submits choices.
 */
export function resolvePlayerParamilitaryDecisions(state: GameState): ParamilitarySweepReport {
    const report: ParamilitarySweepReport = {
        spawned: [],
        captured: [],
        dissolved: [],
        pending_player_requests: 0
    };

    const requests = state.pending_paramilitary_requests ?? [];
    if (requests.length === 0) return report;

    const turn = state.meta?.turn ?? 0;
    let spawnIndex = 0;

    for (const req of requests) {
        if (req.decision === 'allow') {
            spawnParamilitary(state, req.faction, req.target_osid, turn, spawnIndex, report);
            spawnIndex++;
        }
        // 'deny' and 'regular' — no paramilitary spawned
        // 'regular' could flag for corps priority (future enhancement)
    }

    // Clear pending
    state.pending_paramilitary_requests = [];

    return report;
}
