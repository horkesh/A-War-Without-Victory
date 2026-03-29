/**
 * Paramilitary sweep system.
 *
 * Two modes:
 * 1. Rear pocket cleanup (existing): Small units that capture isolated enemy pockets
 *    completely surrounded by friendly territory. Active weeks 0-20.
 * 2. Offensive sweep (v0.6.5): Larger paramilitary groups (Arkan's Tigers, White Eagles)
 *    that sweep hostile-controlled OSIDs adjacent to friendly territory.
 *    Municipality-scoped, time-limited (weeks 0-12). War crimes wired.
 *
 * Casualties inflicted and suffered count toward faction totals.
 * Faction-differentiated spawn rates based on organizational_penetration paramilitary scores.
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
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
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
    OFFENSIVE_PARA_UNIT_SIZE,
    OFFENSIVE_PARA_FADE_WEEK,
    OFFENSIVE_PARA_MARCH_TURNS,
    OFFENSIVE_PARA_SPAWN_RATE,
    OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE,
    OFFENSIVE_PARA_LIGHT_DEFENSE_THRESHOLD,
    OFFENSIVE_PARA_MUNICIPALITY_SCOPE,
} from '../../state/formation_constants.js';
import { analyzeFactionGraph } from './osid_graph_analysis.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from './enclave_resilience.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { EdgeRecord } from '../../map/settlements.js';

// Casualty split ratios — consistent with attack_resolution_osid.ts / frontline_attrition.ts
const KIA_FRACTION = 0.30;
const WIA_FRACTION = 0.55;
/** Casualty multiplier when paramilitary retreats from defended OSID (heavy losses). */
const DEFENDED_RETREAT_CASUALTY_MULT = 3;
/** Casualty multiplier when offensive paramilitary overwhelms light defense. */
const DEFENDED_CAPTURE_CASUALTY_MULT = 2;
/** Fraction of defender personnel lost when overwhelmed by offensive paramilitary. */
const OVERWHELMED_DEFENDER_LOSS_FRACTION = 0.30;

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
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
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
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
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
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
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

/** Spawn a paramilitary formation targeting an OSID. Shared by rear pocket and offensive modes. */
function spawnParamilitary(
    state: GameState,
    faction: FactionId,
    targetOsid: string,
    turn: number,
    index: number,
    report: ParamilitarySweepReport,
    mode: 'rear_pocket' | 'offensive' = 'rear_pocket'
): void {
    const isOffensive = mode === 'offensive';
    const fid = isOffensive
        ? `opara_${faction.toLowerCase()}_t${turn}_${index}`
        : makeParamilitaryId(faction, turn, index);
    const formations = state.military.formations ??= {};

    formations[fid] = {
        id: fid,
        faction,
        name: isOffensive ? `Offensive Paramilitary (${faction})` : `Paramilitary Unit (${faction})`,
        created_turn: turn,
        status: 'active',
        assignment: null,
        kind: 'paramilitary',
        personnel: isOffensive ? OFFENSIVE_PARA_UNIT_SIZE : PARAMILITARY_UNIT_SIZE,
        cohesion: PARAMILITARY_COHESION,
        morale: PARAMILITARY_INITIAL_MORALE,
        paramilitary_target: targetOsid,
        paramilitary_eta: isOffensive ? OFFENSIVE_PARA_MARCH_TURNS : PARAMILITARY_MARCH_TURNS,
        ...(isOffensive ? { paramilitary_mode: 'offensive' as const } : {}),
    } satisfies FormationState;

    const counts = state.paramilitary_deployment_count ??= {};
    counts[faction] = (counts[faction] ?? 0) + 1;

    report.spawned.push({ faction, target_osid: targetOsid, formation_id: fid });
}

// ═══════════════════════════════════════════════════════════════════════════
// Core: Detect offensive paramilitary targets (Drina valley ethnic cleansing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect hostile-controlled OSIDs adjacent to friendly territory for offensive paramilitary sweep.
 * Unlike rear pocket detection (all neighbors friendly), offensive mode targets OSIDs with
 * at least one friendly neighbor — the spearhead pushes into enemy territory.
 *
 * Municipality-scoped for bot factions (prevents ahistorical sweep).
 * Player factions are NOT scope-restricted (consequences follow).
 *
 * Call once per turn, after paramilitary-detect.
 */
export function detectOffensiveParamilitaryTargets(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): ParamilitarySweepReport {
    const report = emptyReport();
    const turn = state.meta?.turn ?? 0;
    if (turn > OFFENSIVE_PARA_FADE_WEEK) return report;

    const adjacency = buildOsidAdjacency(edges);
    const playerFaction = state.meta?.player_faction ?? null;
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);

    // Existing paramilitary targets — avoid duplicates (shared with rear pocket)
    const existingTargets = new Set<string>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (f?.kind === 'paramilitary' && f.paramilitary_target) {
            existingTargets.add(`${f.faction}:${f.paramilitary_target}`);
        }
    }
    for (const req of state.pending_paramilitary_requests ?? []) {
        existingTargets.add(`${req.faction}:${req.target_osid}`);
    }

    // Build enclave OSID exclusion set — includes both explicit osid_list and prefix-matched OSIDs
    const enclaveOsids = new Set<string>();
    const allOsids = new Set<string>();
    for (const e of edges) {
        allOsids.add(e.a);
        allOsids.add(e.b);
    }
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (enclave.osid_list) {
            for (const osid of enclave.osid_list) enclaveOsids.add(osid);
        }
        if (enclave.osid_prefixes) {
            for (const osid of allOsids) {
                if (osidBelongsToEnclave(osid, enclave)) enclaveOsids.add(osid);
            }
        }
    }

    const sortedOsids = [...allOsids].sort(strictCompare);

    for (const faction of factions) {
        const baseRate = OFFENSIVE_PARA_SPAWN_RATE[faction] ?? 0;
        if (baseRate <= 0) continue;

        const isPlayer = faction === playerFaction;
        const scopeMuns = isPlayer ? null : (OFFENSIVE_PARA_MUNICIPALITY_SCOPE[faction] ?? null);
        let spawnIndex = 0;

        for (const osid of sortedOsids) {
            const controller = getPoliticalControllerOSID(state, osid, reverseMap);
            // Must be hostile-controlled (not our faction)
            if (controller === faction || controller === null) continue;

            if (enclaveOsids.has(osid)) continue;

            // Municipality scope check for bot factions
            const mun = osid.split(':')[1] ?? '';
            if (scopeMuns && !scopeMuns.includes(mun)) continue;

            // Must have at least one friendly adjacent neighbor
            const neighbors = adjacency.get(osid);
            if (!neighbors) continue;
            let hasFriendlyNeighbor = false;
            for (const n of neighbors) {
                if (getPoliticalControllerOSID(state, n, reverseMap) === faction) {
                    hasFriendlyNeighbor = true;
                    break;
                }
            }
            if (!hasFriendlyNeighbor) continue;

            // Dedup
            if (existingTargets.has(`${faction}:${osid}`)) continue;

            // Deterministic spawn decision
            const hashVal = deterministicHash(osid, turn + 1000) / 100; // offset to avoid collision with rear pocket hash
            if (hashVal > baseRate) continue;

            // Player faction: respect paramilitary policy
            if (isPlayer) {
                const policy = state.paramilitary_policy ?? 'ask';
                if (policy === 'always_deny') continue;
                if (policy === 'always_allow') {
                    spawnParamilitary(state, faction, osid, turn, spawnIndex, report, 'offensive');
                    spawnIndex++;
                    existingTargets.add(`${faction}:${osid}`);
                    continue;
                }
                // 'ask' — add to pending
                const requests = state.pending_paramilitary_requests ??= [];
                requests.push({ target_osid: osid, faction, strength: OFFENSIVE_PARA_UNIT_SIZE });
                report.pending_player_requests++;
                existingTargets.add(`${faction}:${osid}`);
                continue;
            }

            // Bot faction: auto-approve
            spawnParamilitary(state, faction, osid, turn, spawnIndex, report, 'offensive');
            spawnIndex++;
            existingTargets.add(`${faction}:${osid}`);
        }
    }

    return report;
}

/** Get total defender personnel at an OSID for a given attacker faction. */
function getDefenderPersonnel(state: GameState, osid: string, attackerFaction: FactionId): number {
    let total = 0;
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.faction !== attackerFaction && f.location_osid === osid) {
            total += f.personnel ?? 0;
        }
    }
    return total;
}

/** Record war_crimes_events increment on negotiation capital for a faction. */
function recordWarCrime(state: GameState, faction: FactionId): void {
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    neg.capital[faction].war_crimes_events = (neg.capital[faction].war_crimes_events ?? 0) + 1;
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
    const formations = state.military.formations ?? {};
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
        const isOffensive = f.paramilitary_mode === 'offensive';

        // Already faction-controlled — just dissolve
        if (currentController === f.faction) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Defense check — compute once before any mutations
        const defended = isDefendedAgainst(defendedOsids, state, targetOsid, f.faction);
        const defenderPers = defended ? getDefenderPersonnel(state, targetOsid, f.faction) : 0;

        if (defended) {
            if (isOffensive && defenderPers <= OFFENSIVE_PARA_LIGHT_DEFENSE_THRESHOLD) {
                // Offensive mode vs light defense: overwhelm — capture proceeds below with extra casualties
            } else if (isOffensive) {
                // Offensive mode vs strong defense: heavy casualties, retreat, dissolve
                const casualties = Math.ceil((f.personnel ?? OFFENSIVE_PARA_UNIT_SIZE) * PARAMILITARY_CASUALTY_RATE * DEFENDED_RETREAT_CASUALTY_MULT);
                if (state.military.casualty_ledger) {
                    recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(casualties));
                }
                dissolveParamilitary(state, fid, report);
                continue;
            } else {
                // Rear pocket mode: any defense → retreat with heavy casualties
                const casualties = Math.ceil(f.personnel! * PARAMILITARY_CASUALTY_RATE * DEFENDED_RETREAT_CASUALTY_MULT);
                if (state.military.casualty_ledger) {
                    recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(casualties));
                }
                dissolveParamilitary(state, fid, report);
                continue;
            }
        }

        // Capture: flip control
        const pc = state.political.political_controllers ??= {};
        const previousController = pc[targetOsid] as FactionId | undefined;
        pc[targetOsid] = f.faction;
        if (previousController && previousController !== f.faction) {
            seedDisplacementTimerOnFlip(state, targetOsid, previousController, f.faction);
        }

        (state.political.control_events ??= []).push({
            turn,
            settlement_id: targetOsid,
            mechanism: 'combat' as const,
            from: currentController ?? null,
            to: f.faction
        });

        // Paramilitary casualties (suffered) — higher if fought through defense
        const unitSize = isOffensive ? OFFENSIVE_PARA_UNIT_SIZE : PARAMILITARY_UNIT_SIZE;
        const casualtyMult = defended ? DEFENDED_CAPTURE_CASUALTY_MULT : 1;
        const selfCas = Math.ceil((f.personnel ?? unitSize) * PARAMILITARY_CASUALTY_RATE * casualtyMult);
        if (state.military.casualty_ledger) {
            recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(selfCas));
        }

        // Civilian casualties inflicted (war crimes)
        const civCasRate = isOffensive ? OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE : PARAMILITARY_CIVILIAN_CASUALTY_RATE;
        const civCas = Math.ceil(PARAMILITARY_TARGET_AVG_POPULATION * civCasRate);
        if (currentController) {
            const cc = state.displacement.civilian_casualties ??= {} as typeof state.displacement.civilian_casualties & Record<string, { killed?: number; fled_abroad?: number }>;
            const civFaction = cc![currentController] ??= { killed: 0, fled_abroad: 0 };
            civFaction.killed = (civFaction.killed ?? 0) + civCas;

            if (!state.displacement.displacement_event_log) state.displacement.displacement_event_log = [];
            state.displacement.displacement_event_log.push({
                turn: state.meta.turn ?? 0,
                origin_mun: targetOsid.split(':')[1] ?? 'unknown',
                origin_osid: targetOsid,
                dest_mun: targetOsid.split(':')[1] ?? 'unknown',
                ethnicity: currentController,
                caused_by: f.faction,
                displaced: 0,
                killed: civCas,
                fled_abroad: 0,
                settled: 0,
            });
        }

        // War crimes wiring — every paramilitary capture is a war crime
        recordWarCrime(state, f.faction);

        // Inflict casualties on light defenders who were overwhelmed (offensive only)
        if (isOffensive && defended) {
            inflictDefenderCasualties(state, targetOsid, f.faction);
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

/** Inflict casualties on light defenders overwhelmed by offensive paramilitaries. */
function inflictDefenderCasualties(state: GameState, osid: string, attackerFaction: FactionId): void {
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.faction === attackerFaction || f.location_osid !== osid) continue;
        // 30% personnel loss to overwhelmed defender
        const loss = Math.ceil((f.personnel ?? 0) * OVERWHELMED_DEFENDER_LOSS_FRACTION);
        f.personnel = Math.max(50, (f.personnel ?? 0) - loss);
        f.cohesion = Math.max(10, (f.cohesion ?? 50) - 15);
        f.morale = Math.max(10, (f.morale ?? 50) - 20);
        if (state.military.casualty_ledger) {
            recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(loss));
        }
    }
}

/** Remove a paramilitary formation from state. */
function dissolveParamilitary(state: GameState, fid: FormationId, report: ParamilitarySweepReport): void {
    const f = (state.military.formations ?? {})[fid];
    if (f) {
        f.status = 'inactive';
        f.lifecycle_status = 'disbanded';
        f.personnel = 0;
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
