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
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { recordBattleCasualties } from '../../state/casualty_ledger.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    PARAMILITARY_UNIT_SIZE,
    PARAMILITARY_MARCH_TURNS,
    PARAMILITARY_SPAWN_RATE,
    PARAMILITARY_CASUALTY_RATE,
    PARAMILITARY_CIVILIAN_CASUALTY_RATE,
    PARAMILITARY_COHESION,
    PARAMILITARY_INITIAL_MORALE,
    PARAMILITARY_TARGET_AVG_POPULATION,
    PARAMILITARY_FADE_WEEK,
} from '../../state/formation_constants.js';
import { analyzeFactionGraph } from './osid_graph_analysis.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { EdgeRecord } from '../../map/settlements.js';

// Casualty split ratios — consistent with attack_resolution_osid.ts / frontline_attrition.ts
const KIA_FRACTION = 0.30;
const WIA_FRACTION = 0.55;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ParamilitarySweepReport {
    spawned: Array<{ faction: FactionId; target_osid: string; formation_id: FormationId }>;
    captured: Array<{ faction: FactionId; osid: string; formation_id: FormationId; casualties_inflicted: number; casualties_suffered: number }>;
    dissolved: FormationId[];
    pending_player_requests: number;
}

function emptyReport(): ParamilitarySweepReport {
    return { spawned: [], captured: [], dissolved: [], pending_player_requests: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Build a set of OSIDs that have an enemy defender, for O(1) lookup. */
function buildDefendedOsids(state: GameState): Set<string> {
    const defended = new Set<string>();
    const formations = state.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.location_osid) defended.add(f.location_osid);
    }
    return defended;
}

/** Check if an OSID is defended by a formation from a different faction. */
function isDefendedAgainst(defendedOsids: Set<string>, state: GameState, osid: string, attackerFaction: FactionId): boolean {
    if (!defendedOsids.has(osid)) return false;
    // Confirm at least one non-attacker active formation is there
    const formations = state.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.faction !== attackerFaction && f.location_osid === osid) return true;
    }
    return false;
}

/** Generate a deterministic paramilitary formation ID. */
function makeParamilitaryId(faction: FactionId, turn: number, index: number): FormationId {
    return `para_${faction.toLowerCase()}_t${turn}_${index}`;
}

/** Split total casualties into KIA/WIA/MIA using standard fractions. */
function splitCasualties(total: number): { killed: number; wounded: number; missing_captured: number } {
    const killed = Math.floor(total * KIA_FRACTION);
    const wounded = Math.floor(total * WIA_FRACTION);
    return { killed, wounded, missing_captured: Math.max(0, total - killed - wounded) };
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
    const report = emptyReport();
    const turn = state.meta?.turn ?? 0;
    if (turn > PARAMILITARY_FADE_WEEK) return report;

    const adjacency = buildOsidAdjacency(edges);
    const playerFaction = state.meta?.player_faction ?? null;
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);
    const defendedOsids = buildDefendedOsids(state);

    // Existing paramilitary targets — avoid duplicates
    const existingTargets = new Set<string>();
    const formations = state.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (f?.kind === 'paramilitary' && f.paramilitary_target) {
            existingTargets.add(`${f.faction}:${f.paramilitary_target}`);
        }
    }
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
            if (existingTargets.has(`${faction}:${pocketOsid}`)) continue;
            if (isDefendedAgainst(defendedOsids, state, pocketOsid, faction)) continue;

            const hashVal = deterministicHash(pocketOsid, turn) / 100;
            if (hashVal > baseRate) continue;

            // Player faction: create request instead of auto-spawning
            if (faction === playerFaction) {
                const policy = state.paramilitary_policy ?? 'ask';
                if (policy === 'always_deny') continue;
                if (policy === 'always_allow') {
                    spawnParamilitary(state, faction, pocketOsid, turn, spawnIndex, report);
                    spawnIndex++;
                    continue;
                }
                // 'ask' — add to pending
                const requests = state.pending_paramilitary_requests ??= [];
                requests.push({ target_osid: pocketOsid, faction, strength: PARAMILITARY_UNIT_SIZE });
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

/** Spawn a paramilitary formation targeting a pocket OSID. */
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

    formations[fid] = {
        id: fid,
        faction,
        name: `Paramilitary Unit (${faction})`,
        created_turn: turn,
        status: 'active',
        assignment: null,
        kind: 'paramilitary',
        personnel: PARAMILITARY_UNIT_SIZE,
        cohesion: PARAMILITARY_COHESION,
        morale: PARAMILITARY_INITIAL_MORALE,
        paramilitary_target: targetOsid,
        paramilitary_eta: PARAMILITARY_MARCH_TURNS
    } satisfies FormationState;

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
    const report = emptyReport();
    const formations = state.formations ?? {};
    const turn = state.meta?.turn ?? 0;
    const defendedOsids = buildDefendedOsids(state);

    const paraIds = Object.keys(formations)
        .filter(fid => formations[fid]?.kind === 'paramilitary' && formations[fid]?.status === 'active')
        .sort(strictCompare);

    for (const fid of paraIds) {
        const f = formations[fid];
        if (!f || !f.paramilitary_target) continue;

        const eta = (f.paramilitary_eta ?? 0) - 1;
        f.paramilitary_eta = eta;
        if (eta > 0) continue;

        const targetOsid = f.paramilitary_target;
        const currentController = getPoliticalControllerOSID(state, targetOsid, reverseMap);

        // Already faction-controlled — just dissolve
        if (currentController === f.faction) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Defended — paramilitary takes heavy casualties and retreats
        if (isDefendedAgainst(defendedOsids, state, targetOsid, f.faction)) {
            const casualties = Math.ceil(f.personnel! * PARAMILITARY_CASUALTY_RATE * 3);
            if (state.casualty_ledger) {
                recordBattleCasualties(state.casualty_ledger, f.faction, fid, splitCasualties(casualties));
            }
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Capture: flip control
        const pc = state.political_controllers ??= {};
        pc[targetOsid] = f.faction;

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
            recordBattleCasualties(state.casualty_ledger, f.faction, fid, splitCasualties(selfCas));
        }

        // Civilian casualties inflicted (war crimes)
        const civCas = Math.ceil(PARAMILITARY_TARGET_AVG_POPULATION * PARAMILITARY_CIVILIAN_CASUALTY_RATE);
        if (currentController) {
            const cc = state.civilian_casualties ??= {} as typeof state.civilian_casualties & Record<string, { killed?: number; fled_abroad?: number }>;
            const civFaction = cc![currentController] ??= { killed: 0, fled_abroad: 0 };
            civFaction.killed = (civFaction.killed ?? 0) + civCas;
        }

        report.captured.push({
            faction: f.faction,
            osid: targetOsid,
            formation_id: fid,
            casualties_inflicted: civCas,
            casualties_suffered: selfCas
        });

        dissolveParamilitary(state, fid, report);
    }

    return report;
}

/** Remove a paramilitary formation from state. */
function dissolveParamilitary(state: GameState, fid: FormationId, report: ParamilitarySweepReport): void {
    const f = (state.formations ?? {})[fid];
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
    const report = emptyReport();
    const requests = state.pending_paramilitary_requests ?? [];
    if (requests.length === 0) return report;

    const turn = state.meta?.turn ?? 0;
    let spawnIndex = 0;

    for (const req of requests) {
        if (req.decision === 'allow') {
            spawnParamilitary(state, req.faction, req.target_osid, turn, spawnIndex, report);
            spawnIndex++;
        }
    }

    state.pending_paramilitary_requests = [];
    return report;
}
