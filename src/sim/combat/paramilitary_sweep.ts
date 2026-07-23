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
 * Offensive faction eligibility and per-turn caps are explicit.
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
import { defaultArmyLabelForSide, type PoliticalSideId } from '../../state/identity.js';
import { appendDisplacementEvent } from '../../state/displacement_event_log.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';
import {
    PARAMILITARY_UNIT_SIZE,
    PARAMILITARY_MARCH_TURNS,
    PARAMILITARY_CASUALTY_RATE,
    PARAMILITARY_CIVILIAN_CASUALTY_RATE,
    PARAMILITARY_COHESION,
    PARAMILITARY_INITIAL_MORALE,
    PARAMILITARY_TARGET_AVG_POPULATION,
    PARAMILITARY_FADE_WEEK,
    PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN,
    PARAMILITARY_REAR_MIN_ORGANIZATIONAL_PENETRATION,
    PARAMILITARY_MAX_DEPLOYMENTS_PER_MUNICIPALITY_TURN,
    OFFENSIVE_PARA_UNIT_SIZE,
    OFFENSIVE_PARA_FADE_WEEK,
    OFFENSIVE_PARA_MARCH_TURNS,
    OFFENSIVE_PARA_MAX_DEPLOYMENTS_PER_FACTION_TURN,
    OFFENSIVE_PARA_MIN_ORGANIZATIONAL_PENETRATION,
    OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE,
    OFFENSIVE_PARA_MUNICIPALITY_SCOPE,
} from '../../state/formation_constants.js';
import { analyzeFactionGraph } from './osid_graph_analysis.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from './enclave_resilience.js';
import { isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';
import { lookupParamilitaryNamedUnit } from '../../../data/source/oob/paramilitary_named_units.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { EdgeRecord } from '../../map/settlements.js';
// Casualty split routed through the B1 casualty-realism V2 gate. Flag-OFF returns the
// shipped main-path split (KIA 0.22 / WIA 0.74 / MIA 0.04), byte-identical to before.
import { getMainCasualtySplit } from './casualty_realism_v2_gate.js';
/** Casualty multiplier when paramilitary retreats from defended OSID (heavy losses). */
const DEFENDED_RETREAT_CASUALTY_MULT = 3;
const OFFENSIVE_PARAMILITARY_FACTIONS = new Set<FactionId>(['HRHB', 'RS']);

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ParamilitarySweepReport {
    spawned: Array<{ faction: FactionId; target_osid: string; formation_id: FormationId }>;
    captured: Array<{ faction: FactionId; osid: string; formation_id: FormationId; casualties_inflicted: number; casualties_suffered: number }>;
    dissolved: FormationId[];
    pending_player_requests: number;
}

export type ParamilitarySeverityBand = 'minor' | 'mid' | 'severe';

function emptyReport(): ParamilitarySweepReport {
    return { spawned: [], captured: [], dissolved: [], pending_player_requests: 0 };
}

const PLAYER_PARAMILITARY_POLICY_EVENT: Partial<Record<FactionId, string>> = {
    RS: 'rs_paramilitary_policy_1992',
    RBiH: 'rbih_paramilitary_policy_1992',
};

function isPlayerParamilitaryPolicyDecisionPending(
    state: GameState,
    playerFaction: FactionId | null,
): boolean {
    if (!playerFaction) return false;
    const eventId = PLAYER_PARAMILITARY_POLICY_EVENT[playerFaction];
    if (!eventId || !(state.military.enabled_event_ids ?? []).includes(eventId)) return false;
    return !(state.military.event_decision_log ?? []).some((entry) => entry.event_id === eventId);
}

function removePrematurePlayerParamilitaryRequests(state: GameState, playerFaction: FactionId): void {
    if (!Array.isArray(state.pending_paramilitary_requests)) return;
    state.pending_paramilitary_requests = state.pending_paramilitary_requests
        .filter((request) => request.faction !== playerFaction);
}

export function classifyParamilitaryDeploymentBand(deploymentCount: number): ParamilitarySeverityBand {
    if (deploymentCount >= 10) return 'severe';
    if (deploymentCount >= 4) return 'mid';
    return 'minor';
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

/** Build a map of OSID → defending faction for non-paramilitary brigades. */
function buildDefenderFactionMap(state: GameState): Map<string, FactionId> {
    const map = new Map<string, FactionId>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active' || f.kind === 'paramilitary') continue;
        if (f.location_osid && !map.has(f.location_osid)) {
            map.set(f.location_osid, f.faction);
        }
    }
    return map;
}

/** Check if an OSID has a same-controller brigade at any adjacent OSID.
 *  Paramilitaries avoid villages adjacent to organized military presence. */
function hasAdjacentDefender(
    osid: string,
    controller: string,
    adjacency: Map<string, string[]>,
    defenderFactionMap: Map<string, FactionId>
): boolean {
    const neighbors = adjacency.get(osid);
    if (!neighbors) return false;
    for (const n of neighbors) {
        const defFaction = defenderFactionMap.get(n);
        if (defFaction && defFaction === controller) return true;
    }
    return false;
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

type ParamilitaryMode = 'rear_pocket' | 'offensive';

interface ParamilitaryOrganizationScore {
    paramilitary: number;
    party: number;
}

interface RankedParamilitaryTarget {
    osid: string;
    municipalityId: string;
    organization: ParamilitaryOrganizationScore;
    dominance: number;
    support: number;
}

function municipalityIdFromOsid(osid: string): string {
    return osid.split(':')[1] ?? osid;
}

function getFactionOrganizationScore(
    state: GameState,
    faction: FactionId,
    osid: string,
): ParamilitaryOrganizationScore {
    const penetration = state.political.municipalities?.[municipalityIdFromOsid(osid)]
        ?.organizational_penetration;
    if (!penetration) return { paramilitary: 0, party: 0 };

    switch (faction) {
        case 'RBiH':
            return {
                paramilitary: penetration.patriotska_liga ?? 0,
                party: penetration.sda_penetration ?? 0,
            };
        case 'RS':
            return {
                paramilitary: penetration.paramilitary_rs ?? 0,
                party: penetration.sds_penetration ?? 0,
            };
        case 'HRHB':
            return {
                paramilitary: penetration.paramilitary_hrhb ?? 0,
                party: penetration.hdz_penetration ?? 0,
            };
        default:
            return { paramilitary: 0, party: 0 };
    }
}

function buildRankedParamilitaryTarget(
    state: GameState,
    faction: FactionId,
    controller: FactionId,
    osid: string,
    minimumOrganization: number,
    adjacency: Map<string, string[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): RankedParamilitaryTarget | null {
    const organization = getFactionOrganizationScore(state, faction, osid);
    const controllerOrganization = getFactionOrganizationScore(state, controller, osid);
    if (
        organization.paramilitary < minimumOrganization
        || organization.paramilitary <= controllerOrganization.paramilitary
    ) {
        return null;
    }
    return {
        osid,
        municipalityId: municipalityIdFromOsid(osid),
        organization,
        dominance: organization.paramilitary - controllerOrganization.paramilitary,
        support: countFriendlyAdjacentOsids(osid, faction, adjacency, state, reverseMap),
    };
}

function compareRankedParamilitaryTargets(
    a: RankedParamilitaryTarget,
    b: RankedParamilitaryTarget,
): number {
    if (a.organization.paramilitary !== b.organization.paramilitary) {
        return b.organization.paramilitary - a.organization.paramilitary;
    }
    if (a.organization.party !== b.organization.party) {
        return b.organization.party - a.organization.party;
    }
    if (a.support !== b.support) return b.support - a.support;
    if (a.dominance !== b.dominance) return b.dominance - a.dominance;
    const municipalityOrder = strictCompare(a.municipalityId, b.municipalityId);
    return municipalityOrder !== 0 ? municipalityOrder : strictCompare(a.osid, b.osid);
}

function getFormationParamilitaryMode(formation: FormationState): ParamilitaryMode {
    return formation.paramilitary_mode === 'offensive' ? 'offensive' : 'rear_pocket';
}

function getRequestParamilitaryMode(
    request: NonNullable<GameState['pending_paramilitary_requests']>[number],
): ParamilitaryMode {
    return request.mode === 'offensive' ? 'offensive' : 'rear_pocket';
}

function collectParamilitaryIssuedTargets(
    state: GameState,
    faction: FactionId,
    turn: number,
    mode?: ParamilitaryMode,
): Set<string> {
    const targets = new Set<string>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[fid];
        if (
            !formation
            || formation.kind !== 'paramilitary'
            || formation.faction !== faction
            || formation.created_turn !== turn
            || !formation.paramilitary_target
        ) {
            continue;
        }
        if (mode && getFormationParamilitaryMode(formation) !== mode) continue;
        targets.add(formation.paramilitary_target);
    }
    for (const request of state.pending_paramilitary_requests ?? []) {
        if (request.faction !== faction) continue;
        if (mode && getRequestParamilitaryMode(request) !== mode) continue;
        targets.add(request.target_osid);
    }
    for (const decision of state.paramilitary_decision_history ?? []) {
        if (decision.faction !== faction || decision.turn !== turn) continue;
        const decisionMode = decision.mode === 'offensive' ? 'offensive' : 'rear_pocket';
        if (mode && decisionMode !== mode) continue;
        targets.add(decision.target_osid);
    }
    return targets;
}

function buildRegularForceClaimedTargets(state: GameState): Set<string> {
    const targets = new Set<string>();
    const attackOrders = state.military.brigade_attack_orders ?? {};
    for (const formationId of Object.keys(attackOrders).sort(strictCompare)) {
        const target = attackOrders[formationId];
        if (target) targets.add(target);
    }
    return targets;
}

/** Split total casualties into KIA/WIA/MIA using the main-path split.
 * Routed through the B1 casualty-realism V2 gate (default OFF ⇒ KIA/WIA_FRACTION exactly). */
function splitCasualties(total: number): { killed: number; wounded: number; missing_captured: number } {
    const { kia, wia } = getMainCasualtySplit();
    const killed = Math.floor(total * kia);
    const wounded = Math.floor(total * wia);
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
    const playerFaction = state.meta?.player_faction ?? null;
    const playerPolicyDecisionPending = isPlayerParamilitaryPolicyDecisionPending(state, playerFaction);
    if (playerPolicyDecisionPending && playerFaction) {
        removePrematurePlayerParamilitaryRequests(state, playerFaction);
    } else {
        resolveStandingPolicyPendingParamilitaryRequests(state, playerFaction);
    }
    if (turn > PARAMILITARY_FADE_WEEK) return report;

    const adjacency = buildOsidAdjacency(edges);
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);
    const defendedOsids = buildDefendedOsids(state);
    const defenderFactionMap = buildDefenderFactionMap(state);
    const regularForceClaimedTargets = buildRegularForceClaimedTargets(state);

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
        if (faction === playerFaction && playerPolicyDecisionPending) continue;
        // LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-DEDUPE bisect (2026-05-05): this call site
        // MUST stay on legacy `analyzeFactionGraph`. Routing it through `analyzeFactionGraphCached`
        // produced reproducible 40w hash drift (`51dca710b9db7d37` cached vs baseline
        // `ef03ab4d6c5ecd28`); reverting only this site to legacy restored byte-identity (n1648).
        // Cause is structural (paramilitary runs at war_phases:809 BEFORE bot-orders at 1148; if
        // it seeds the per-(state, faction) cache, the bot-orders pipeline reads pre-paramilitary-
        // mutation graph state) — keep this site fresh-recompute. The G3-safe dedup ships at
        // bot_corps_ai.ts + bot_brigade_ai_osid.ts (the audit's primary 198 ms/turn target).
        const graphAnalysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);
        const pockets = [...graphAnalysis.enemy_pockets].sort(strictCompare);
        if (pockets.length === 0) continue;

        let spawnIndex = 0;
        const issuedTargets = collectParamilitaryIssuedTargets(state, faction, turn, 'rear_pocket');
        const allModeIssuedTargets = collectParamilitaryIssuedTargets(state, faction, turn);
        for (const target of allModeIssuedTargets) existingTargets.add(`${faction}:${target}`);
        let deploymentsThisTurn = issuedTargets.size;
        const municipalityDeploymentCounts = new Map<string, number>();
        for (const target of allModeIssuedTargets) {
            const municipalityId = municipalityIdFromOsid(target);
            municipalityDeploymentCounts.set(
                municipalityId,
                (municipalityDeploymentCounts.get(municipalityId) ?? 0) + 1,
            );
        }

        const candidates: RankedParamilitaryTarget[] = [];
        for (const pocketOsid of pockets) {
            if (existingTargets.has(`${faction}:${pocketOsid}`)) continue;
            // Skip enclave OSIDs — surrounded topology is correct siege geometry, not abandoned pocket
            if (ENCLAVE_DEFINITIONS.some(enc => enc.faction !== faction && osidBelongsToEnclave(pocketOsid, enc))) continue;
            const currentController = getPoliticalControllerOSID(state, pocketOsid, reverseMap);
            if (!currentController || currentController === faction) continue;
            if (isRbihHrhbCombatBlocked(state, faction, currentController)) continue;
            if (regularForceClaimedTargets.has(pocketOsid)) continue;
            if (hasAdjacentDefender(pocketOsid, currentController, adjacency, defenderFactionMap)) continue;
            if (isDefendedAgainst(defendedOsids, state, pocketOsid, faction)) continue;
            const candidate = buildRankedParamilitaryTarget(
                state,
                faction,
                currentController,
                pocketOsid,
                PARAMILITARY_REAR_MIN_ORGANIZATIONAL_PENETRATION,
                adjacency,
                reverseMap,
            );
            if (candidate) candidates.push(candidate);
        }

        candidates.sort(compareRankedParamilitaryTargets);
        for (const candidate of candidates) {
            if (deploymentsThisTurn >= PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN) break;
            const deploymentsInMunicipality = municipalityDeploymentCounts.get(candidate.municipalityId) ?? 0;
            if (deploymentsInMunicipality >= PARAMILITARY_MAX_DEPLOYMENTS_PER_MUNICIPALITY_TURN) continue;

            // Player faction: create request instead of auto-spawning
            if (faction === playerFaction) {
                const policy = state.paramilitary_policy ?? 'ask';
                if (policy === 'always_deny') continue;
                if (policy === 'always_allow') {
                    spawnParamilitary(state, faction, candidate.osid, turn, spawnIndex, report);
                    spawnIndex++;
                    deploymentsThisTurn++;
                    existingTargets.add(`${faction}:${candidate.osid}`);
                    municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
                    continue;
                }
                // 'ask' — add to pending
                const requests = state.pending_paramilitary_requests ??= [];
                requests.push({
                    target_osid: candidate.osid,
                    faction,
                    strength: PARAMILITARY_UNIT_SIZE,
                    estimated_civilian_risk: estimateParamilitaryCivilianRisk('rear_pocket'),
                    mode: 'rear_pocket',
                });
                report.pending_player_requests++;
                deploymentsThisTurn++;
                existingTargets.add(`${faction}:${candidate.osid}`);
                municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
                continue;
            }

            // Bot faction: auto-approve
            spawnParamilitary(state, faction, candidate.osid, turn, spawnIndex, report);
            spawnIndex++;
            deploymentsThisTurn++;
            existingTargets.add(`${faction}:${candidate.osid}`);
            municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
        }
    }

    return report;
}

function resolveStandingPolicyPendingParamilitaryRequests(
    state: GameState,
    playerFaction: FactionId | null,
): void {
    const policy = state.paramilitary_policy ?? 'ask';
    if (policy === 'ask' || !playerFaction || !Array.isArray(state.pending_paramilitary_requests)) return;
    let changed = false;
    for (const request of state.pending_paramilitary_requests) {
        if (!request || request.faction !== playerFaction) continue;
        if (request.decision === 'allow' || request.decision === 'deny' || request.decision === 'regular') continue;
        request.decision = policy === 'always_allow' ? 'allow' : 'deny';
        changed = true;
    }
    if (changed) resolvePlayerParamilitaryDecisions(state);
}

function countFriendlyAdjacentOsids(
    osid: string,
    faction: FactionId,
    adjacency: Map<string, string[]>,
    state: GameState,
    reverseMap: OperationalToCanonicalReverseMap,
): number {
    let count = 0;
    const neighbors = [...(adjacency.get(osid) ?? [])].sort(strictCompare);
    for (const neighbor of neighbors) {
        if (getPoliticalControllerOSID(state, neighbor, reverseMap) === faction) count++;
    }
    return count;
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
    const formations = state.military.formations ??= {};
    let resolvedIndex = index;
    let fid = isOffensive
        ? `opara_${faction.toLowerCase()}_t${turn}_${resolvedIndex}`
        : makeParamilitaryId(faction, turn, resolvedIndex);
    while (formations[fid]) {
        resolvedIndex++;
        fid = isOffensive
            ? `opara_${faction.toLowerCase()}_t${turn}_${resolvedIndex}`
            : makeParamilitaryId(faction, turn, resolvedIndex);
    }
    const namedUnit = lookupParamilitaryNamedUnit(faction, mode, resolvedIndex, turn);

    formations[fid] = {
        id: fid,
        faction,
        force_label: defaultArmyLabelForSide(faction as PoliticalSideId),
        name: namedUnit?.name ?? (isOffensive ? `Offensive Paramilitary (${faction})` : `Paramilitary Unit (${faction})`),
        created_turn: turn,
        status: 'active',
        assignment: null,
        kind: 'paramilitary',
        readiness: 'active',
        personnel: isOffensive ? OFFENSIVE_PARA_UNIT_SIZE : PARAMILITARY_UNIT_SIZE,
        cohesion: PARAMILITARY_COHESION,
        morale: PARAMILITARY_INITIAL_MORALE,
        activation_gated: false,
        activation_turn: null,
        ops: { fatigue: 0, last_supplied_turn: null },
        paramilitary_target: targetOsid,
        paramilitary_eta: isOffensive ? OFFENSIVE_PARA_MARCH_TURNS : PARAMILITARY_MARCH_TURNS,
        ...(isOffensive ? { paramilitary_mode: 'offensive' as const } : {}),
    } satisfies FormationState;

    const counts = ensureParamilitaryDeploymentCountMap(state);
    counts[faction] = (counts[faction] ?? 0) + 1;
    recordParamilitaryCostAnnotation(state, faction, counts[faction], turn);

    report.spawned.push({ faction, target_osid: targetOsid, formation_id: fid });
}

function ensureParamilitaryDeploymentCountMap(state: GameState): Record<FactionId, number> {
    if (!state.paramilitary_deployment_count || typeof state.paramilitary_deployment_count !== 'object') {
        state.paramilitary_deployment_count = {} as Record<FactionId, number>;
    }
    return state.paramilitary_deployment_count;
}

function recordParamilitaryCostAnnotation(
    state: GameState,
    faction: FactionId,
    deploymentCount: number,
    turn: number
): void {
    const annotations = state.military.cost_ledger_annotations ??= [];
    const eventId = `cost_war_crimes_findings_${faction}`;
    const tag = `paramilitary_war_crimes_${classifyParamilitaryDeploymentBand(deploymentCount)}`;
    const text = `deployment_count=${deploymentCount}`;
    const existing = annotations.find((entry) => entry.event_id === eventId && entry.turn === turn && entry.faction === faction);
    if (existing) {
        existing.tag = tag;
        existing.text = text;
        return;
    }
    annotations.push({ event_id: eventId, tag, text, turn, faction });
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
    const playerFaction = state.meta?.player_faction ?? null;
    const playerPolicyDecisionPending = isPlayerParamilitaryPolicyDecisionPending(state, playerFaction);
    if (playerPolicyDecisionPending && playerFaction) {
        removePrematurePlayerParamilitaryRequests(state, playerFaction);
    } else {
        resolveStandingPolicyPendingParamilitaryRequests(state, playerFaction);
    }
    if (turn > OFFENSIVE_PARA_FADE_WEEK) return report;

    const adjacency = buildOsidAdjacency(edges);
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare);
    const defendedOsids = buildDefendedOsids(state);

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
    const defenderFactionMap = buildDefenderFactionMap(state);
    const regularForceClaimedTargets = buildRegularForceClaimedTargets(state);

    for (const faction of factions) {
        if (!OFFENSIVE_PARAMILITARY_FACTIONS.has(faction)) continue;
        if (faction === playerFaction && playerPolicyDecisionPending) continue;

        const isPlayer = faction === playerFaction;
        const scopeMuns = isPlayer ? null : (OFFENSIVE_PARA_MUNICIPALITY_SCOPE[faction] ?? null);
        let spawnIndex = 0;
        const issuedTargets = collectParamilitaryIssuedTargets(state, faction, turn, 'offensive');
        const allModeIssuedTargets = collectParamilitaryIssuedTargets(state, faction, turn);
        for (const target of allModeIssuedTargets) existingTargets.add(`${faction}:${target}`);
        let deploymentsThisTurn = issuedTargets.size;
        const municipalityDeploymentCounts = new Map<string, number>();
        for (const target of allModeIssuedTargets) {
            const municipalityId = municipalityIdFromOsid(target);
            municipalityDeploymentCounts.set(
                municipalityId,
                (municipalityDeploymentCounts.get(municipalityId) ?? 0) + 1,
            );
        }

        const candidates: RankedParamilitaryTarget[] = [];
        for (const osid of sortedOsids) {
            const controller = getPoliticalControllerOSID(state, osid, reverseMap);
            // Must be hostile-controlled (not our faction)
            if (controller === faction || controller === null) continue;
            if (isRbihHrhbCombatBlocked(state, faction, controller)) continue;
            if (regularForceClaimedTargets.has(osid)) continue;

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

            // Adjacent defender projection — paramilitaries avoid areas near organized military
            if (isDefendedAgainst(defendedOsids, state, osid, faction)) continue;
            if (controller && hasAdjacentDefender(osid, controller, adjacency, defenderFactionMap)) continue;

            // Dedup
            if (existingTargets.has(`${faction}:${osid}`)) continue;
            const candidate = buildRankedParamilitaryTarget(
                state,
                faction,
                controller,
                osid,
                OFFENSIVE_PARA_MIN_ORGANIZATIONAL_PENETRATION,
                adjacency,
                reverseMap,
            );
            if (candidate) candidates.push(candidate);
        }

        candidates.sort(compareRankedParamilitaryTargets);
        for (const candidate of candidates) {
            if (deploymentsThisTurn >= OFFENSIVE_PARA_MAX_DEPLOYMENTS_PER_FACTION_TURN) break;
            const deploymentsInMunicipality = municipalityDeploymentCounts.get(candidate.municipalityId) ?? 0;
            if (deploymentsInMunicipality >= PARAMILITARY_MAX_DEPLOYMENTS_PER_MUNICIPALITY_TURN) continue;
            const osid = candidate.osid;

            // Player faction: respect paramilitary policy
            if (isPlayer) {
                const policy = state.paramilitary_policy ?? 'ask';
                if (policy === 'always_deny') continue;
                if (policy === 'always_allow') {
                    spawnParamilitary(state, faction, osid, turn, spawnIndex, report, 'offensive');
                    spawnIndex++;
                    deploymentsThisTurn++;
                    existingTargets.add(`${faction}:${osid}`);
                    municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
                    continue;
                }
                // 'ask' — add to pending
                const requests = state.pending_paramilitary_requests ??= [];
                requests.push({
                    target_osid: osid,
                    faction,
                    strength: OFFENSIVE_PARA_UNIT_SIZE,
                    estimated_civilian_risk: estimateParamilitaryCivilianRisk('offensive'),
                    mode: 'offensive',
                });
                report.pending_player_requests++;
                deploymentsThisTurn++;
                existingTargets.add(`${faction}:${osid}`);
                municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
                continue;
            }

            // Bot faction: auto-approve
            spawnParamilitary(state, faction, osid, turn, spawnIndex, report, 'offensive');
            spawnIndex++;
            deploymentsThisTurn++;
            existingTargets.add(`${faction}:${osid}`);
            municipalityDeploymentCounts.set(candidate.municipalityId, deploymentsInMunicipality + 1);
        }
    }

    return report;
}

/** Record war_crimes_events increment on negotiation capital for a faction. */
function recordWarCrime(state: GameState, faction: FactionId): void {
    const neg = state.military.negotiation;
    if (!neg?.capital?.[faction]) return;
    neg.capital[faction].war_crimes_events = (neg.capital[faction].war_crimes_events ?? 0) + 1;
}

function estimateParamilitaryCivilianRisk(mode: 'rear_pocket' | 'offensive'): number {
    const rate = mode === 'offensive'
        ? OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE
        : PARAMILITARY_CIVILIAN_CASUALTY_RATE;
    return Math.ceil(PARAMILITARY_TARGET_AVG_POPULATION * rate);
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
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): ParamilitarySweepReport {
    const report = emptyReport();
    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;
    const defendedOsids = buildDefendedOsids(state);
    const adjacency = buildOsidAdjacency(edges);
    const defenderFactionMap = buildDefenderFactionMap(state);

    const paraIds = Object.keys(formations)
        .filter(fid => formations[fid]?.kind === 'paramilitary' && formations[fid]?.status === 'active')
        .sort(strictCompare);

    for (const fid of paraIds) {
        const f = formations[fid];
        if (!f || !f.paramilitary_target) continue;

        if (turn > PARAMILITARY_FADE_WEEK) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

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

        // Apply the same bilateral-combat truth used by regular battle resolution.
        if (isRbihHrhbCombatBlocked(state, f.faction, currentController)) {
            dissolveParamilitary(state, fid, report);
            continue;
        }

        // Organized defense blocks autonomous paramilitary seizure in every mode.
        const defended = isDefendedAgainst(defendedOsids, state, targetOsid, f.faction);
        const hasAdjacentOrganizedDefense = currentController
            ? hasAdjacentDefender(targetOsid, currentController, adjacency, defenderFactionMap)
            : false;

        if (defended || hasAdjacentOrganizedDefense) {
            if (isOffensive) {
                const casualties = Math.ceil((f.personnel ?? OFFENSIVE_PARA_UNIT_SIZE) * PARAMILITARY_CASUALTY_RATE * DEFENDED_RETREAT_CASUALTY_MULT);
                if (state.military.casualty_ledger) {
                    recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(casualties));
                }
                dissolveParamilitary(state, fid, report);
                continue;
            } else {
                // Rear pocket mode: exact-tile or adjacent organized defense blocks silent cleanup capture
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
        const previousController = pc[targetOsid];
        pc[targetOsid] = f.faction;
        if (previousController && previousController !== f.faction) {
            seedDisplacementTimerOnFlip(state, targetOsid, previousController, f.faction);
        }

        (state.political.control_events ??= []).push({
            turn,
            settlement_id: targetOsid,
            mechanism: 'paramilitary' as const,
            from: currentController ?? null,
            to: f.faction
        });

        // Paramilitary casualties (suffered)
        const unitSize = isOffensive ? OFFENSIVE_PARA_UNIT_SIZE : PARAMILITARY_UNIT_SIZE;
        const selfCas = Math.ceil((f.personnel ?? unitSize) * PARAMILITARY_CASUALTY_RATE);
        if (state.military.casualty_ledger) {
            recordBattleCasualties(state.military.casualty_ledger, f.faction, fid, splitCasualties(selfCas));
        }

        // Civilian casualties inflicted (war crimes)
        const civCasRate = isOffensive ? OFFENSIVE_PARA_CIVILIAN_CASUALTY_RATE : PARAMILITARY_CIVILIAN_CASUALTY_RATE;
        const civCas = Math.ceil(PARAMILITARY_TARGET_AVG_POPULATION * civCasRate);
        if (currentController) {
            const targetMunId = targetOsid.split(':')[1];
            const cc = state.displacement.civilian_casualties ??= {} as typeof state.displacement.civilian_casualties & Record<string, { killed?: number; fled_abroad?: number }>;
            const civFaction = cc[currentController] ??= { killed: 0, fled_abroad: 0 };
            civFaction.killed = (civFaction.killed ?? 0) + civCas;

            const municipalityPopulation = targetMunId
                ? state.displacement.displacement_state?.[targetMunId]
                : undefined;
            if (municipalityPopulation) {
                municipalityPopulation.lost_population += civCas;
                municipalityPopulation.last_updated_turn = turn;
            }

            appendDisplacementEvent(state, {
                turn: state.meta.turn ?? 0,
                origin_mun: targetMunId ?? 'unknown',
                origin_osid: targetOsid,
                dest_mun: targetMunId ?? 'unknown',
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
    const f = (state.military.formations ?? {})[fid];
    if (f) {
        f.status = 'inactive';
        f.lifecycle_status = 'disbanded';
        f.readiness = 'degraded';
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
    const history = Array.isArray(state.paramilitary_decision_history)
        ? [...state.paramilitary_decision_history]
        : [];

    for (const req of [...requests].sort((a, b) => strictCompare(a.target_osid, b.target_osid))) {
        if (req.decision === 'allow' || req.decision === 'deny' || req.decision === 'regular') {
            history.push({
                id: `paramilitary:${turn}:${req.target_osid}`,
                turn,
                target_osid: req.target_osid,
                faction: req.faction,
                strength: req.strength,
                decision: req.decision,
                ...(req.mode === 'rear_pocket' || req.mode === 'offensive'
                    ? { mode: req.mode }
                    : {}),
                ...(typeof req.estimated_civilian_risk === 'number'
                    ? { estimated_civilian_risk: req.estimated_civilian_risk }
                    : {}),
            });
        }
        const requestFadeWeek = req.mode === 'offensive'
            ? OFFENSIVE_PARA_FADE_WEEK
            : PARAMILITARY_FADE_WEEK;
        if (req.decision === 'allow' && turn <= requestFadeWeek) {
            spawnParamilitary(
                state,
                req.faction,
                req.target_osid,
                turn,
                spawnIndex,
                report,
                req.mode === 'offensive' ? 'offensive' : 'rear_pocket',
            );
            spawnIndex++;
        }
    }

    state.pending_paramilitary_requests = [];
    state.paramilitary_decision_history = history.sort((a, b) =>
        a.turn !== b.turn ? a.turn - b.turn : strictCompare(a.id, b.id)
    );
    return report;
}
