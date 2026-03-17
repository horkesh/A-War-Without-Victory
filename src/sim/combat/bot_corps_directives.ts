/**
 * Corps directive generation: the HoI-style command hierarchy layer that
 * tells subordinate brigades what to attack, hold, and avoid.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type {
    CorpsDirective,
    CorpsFrontSector,
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    SectorStance,
} from '../../state/game_state.js';
import { CORPS_STANCE_ALLOWED_SECTOR_STANCES } from './combat_math.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    FACTION_STRATEGIES,
    getActiveDoctrinePhase,
    getCorpsArmyPriorities,
} from './bot_strategy.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { OUTCOME_RANK } from './bot_brigade_targeting.js';
import type { PredictedOutcome } from './combat_predictor.js';
import { analyzeFrontGeometry, type FrontGeometryAssessment } from './front_geometry_analysis.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import { evaluateSectorOffensiveLaunch, getEquipmentOffensivePriority, resolveEquipmentClass } from './sector_offensive.js';
import { CONFIDENCE_ROUGH_STRENGTH, INTEL_GATE_LAUNCH_THRESHOLD, MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT } from './sector_intel_constants.js';
import { getSectorIntelConfidence } from './sector_intel.js';
import { RS_BLITZ_PHASE_END_WEEK } from './bot_constants.js';
import {
    getTruceBreakAggressionBonus,
    shouldGrazBlockAttack,
    isGrazAccordsActive,
    isHerzegovinaTruceActive,
    isKiseljakExclusionActive,
    isEastHerzegovinaPair,
    GRAZ_KISELJAK_VRS_EXCLUSION,
    GRAZ_KISELJAK_HRHB_EXCLUSION,
    GRAZ_EXEMPT_RS_CORPS,
    GRAZ_EXEMPT_HRHB_CORPS,
} from '../local_truces.js';
import { areRbihHrhbAllied } from '../early_war/alliance_update.js';
import { getCorpsCommander, getEffectiveCompetence, assignOperationCommander } from './officer_system.js';
import { concentrateSectorsForOffensive, rearrangeSectorsForCorps } from './sector_rearrangement.js';
import { splitNonContiguousSectors, GARRISON_BUDGET_EDGES_PER_BRIGADE } from './corps_front_sectors.js';
import { computeReinforcementPool } from './operation_reinforcement.js';
import { MIN_BRIGADES_FOR_SECTOR_ATTACK } from './operation_reinforcement_constants.js';
import { buildFriendlyComponents } from './sector_utils.js';
import type { FactionGraphAnalysis } from './osid_graph_analysis.js';
import {
    assessCorpsSupplyHealth,
    getFactionCorps,
    getCorpsSubordinates,
} from './bot_corps_helpers.js';
import type { CampaignPlan } from './army_hq_gathering_types.js';
import { PRIORITY_AGGRESSION, PRIORITY_RESERVE } from './army_hq_gathering_constants.js';

/**
 * Salient risk: fraction of a target OSID's neighbors that are enemy-controlled.
 * High risk (>0.75) means capturing this OSID creates an indefensible salient —
 * one friendly position surrounded by enemy on 3+ sides. No real commander would
 * hold a single OSID inside enemy territory with no supply line.
 *
 * Returns 0.0 (surrounded by friends — pocket cleanup, always good)
 *    to   1.0 (surrounded by enemies — deep salient, avoid).
 */
function computeSalientRisk(
    targetOsid: string,
    adjacency: Map<Osid, Osid[]>,
    pc: Record<string, string>,
    faction: string,
): number {
    const neighbors = adjacency.get(targetOsid as Osid) ?? [];
    let friendlyCount = 0;
    let enemyCount = 0;
    for (const n of neighbors) {
        const ctrl = pc[n];
        if (ctrl === faction) friendlyCount++;
        else if (ctrl && ctrl !== faction) enemyCount++;
    }
    const total = friendlyCount + enemyCount;
    if (total === 0) return 0;
    return enemyCount / total;
}

/** Salient risk threshold: skip targets where >75% of neighbors are enemy. */
const SALIENT_RISK_THRESHOLD = 0.75;

/**
 * Graduated supply response for operation sizing.
 * Critical → 0 (blocked). Adequate → full. Strained → limited to surplus.
 */
export function computeSupplyAwareOpSize(
    supplyHealth: { critical_fraction: number; adequate_fraction: number },
    surplusBrigadeCount: number,
    maxParticipatingBrigades: number,
): number {
    if (supplyHealth.critical_fraction > 0.5) return 0;
    if (supplyHealth.adequate_fraction >= 0.5) return maxParticipatingBrigades;
    return Math.min(surplusBrigadeCount, maxParticipatingBrigades);
}

/**
 * Compute surplus brigades across all corps sectors (brigades beyond garrison budget).
 * Budget per sector = ceil(length_edges / 6).
 */
function computeCorpsSurplus(
    corpsSectors: CorpsFrontSector[],
): number {
    let surplus = 0;
    for (const sector of corpsSectors) {
        const budget = Math.ceil(sector.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
        const excess = sector.assigned_brigade_ids.length - budget;
        if (excess > 0) surplus += excess;
    }
    return surplus;
}

export const AGGRESSION_FLOOR: Record<string, number> = {
    'offensive': 0.0,
    'balanced': -0.10,
    'defensive': -0.30,
    'reorganize': -0.50,
};

/**
 * After a completed operation, how many turns before the corps may launch ops in a DIFFERENT theater.
 * 8 turns ≈ 2 months of reconsolidation. Prevents a corps from immediately pivoting to an
 * opportunistic secondary theater the turn after its primary operation ends. Same-theater
 * follow-on ops are always allowed regardless of cooldown (they share theater with the last op).
 */
export const SECONDARY_OP_COOLDOWN_TURNS = 8;

/**
 * Collect all objective OSIDs from an operation (from both the flat objectives list and
 * all axis objectives). Used for theater-overlap detection.
 */
function getOperationObjectives(op: CorpsOperation): Set<string> {
    const objectives = new Set<string>(op.objectives ?? []);
    if (op.axes) {
        for (const axis of op.axes) {
            for (const obj of axis.objectives ?? []) objectives.add(obj);
        }
    }
    return objectives;
}

/** Extract municipality slug from OSID (format: op:municipality:slug → municipality). */
function getMunicipalityFromOsid(osid: string): string | undefined {
    const parts = osid.split(':');
    return parts.length >= 3 ? parts[1] : undefined;
}

/**
 * Returns true when two operations share the same theater — same sector_id, at least one
 * overlapping objective OSID, OR at least one overlapping objective municipality.
 * Municipality-level overlap handles pre-planned ops (no sector_id) targeting the same
 * area as auto-generated follow-on ops that have different but co-located objectives.
 */
function operationsShareTheater(op1: CorpsOperation, op2Sector: string | undefined, op2Objectives: Set<string>): boolean {
    if (op1.sector_id && op2Sector && op1.sector_id === op2Sector) return true;
    const op1Objectives = getOperationObjectives(op1);
    // Direct OSID overlap
    for (const obj of op1Objectives) {
        if (op2Objectives.has(obj)) return true;
    }
    // Municipality-level overlap (e.g. Koridor → 'brcko' and follow-on Brcko ops)
    const op1Municipalities = new Set<string>();
    for (const obj of op1Objectives) {
        const mun = getMunicipalityFromOsid(obj);
        if (mun) op1Municipalities.add(mun);
    }
    for (const obj of op2Objectives) {
        const mun = getMunicipalityFromOsid(obj);
        if (mun && op1Municipalities.has(mun)) return true;
    }
    return false;
}

/**
 * Should the bot launch a probe-type operation instead of a full sector_attack?
 * Returns true when intel confidence is below the faction's threshold and the
 * corps hasn't exhausted its consecutive probe limit.
 *
 * Exemptions:
 * - RS during blitz phase (w0-12): JNA-style pre-planned ops attack blind.
 * - Corps that already probed MAX_CONSECUTIVE_PROBES times: force commitment.
 */
export function shouldLaunchProbeInstead(
    faction: FactionId,
    sectorIntelConfidence: number,
    consecutiveProbes: number,
    turn?: number,
): boolean {
    // RS blitz phase exemption: JNA-trained forces attack without probing
    if (faction === 'RS' && (turn ?? 999) <= RS_BLITZ_PHASE_END_WEEK) return false;

    // Already probed enough — commit regardless
    if (consecutiveProbes >= MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT) return false;

    const threshold = INTEL_GATE_LAUNCH_THRESHOLD[faction as NonNullable<FactionId>] ?? 0.30;
    return sectorIntelConfidence < threshold;
}

/**
 * Derive which front segments a corps covers, based on where its brigades are.
 * A corps "covers" a front segment if any of its brigades are at an OSID that
 * is an endpoint of one of the segment's hostile boundary edges.
 *
 * Returns Record<corpsId, frontId[]> (sorted).
 * Deterministic: sorted iteration throughout.
 */
export function deriveCorpsFrontMapping(
    state: GameState,
    faction: FactionId
): Map<FormationId, string[]> {
    const result = new Map<FormationId, string[]>();
    const segments = state.military.assignable_front_segments ?? [];
    const formations = state.military.formations ?? {};

    // Build brigade_osid → corps_id mapping
    const osidToCorps = new Map<string, Set<string>>();
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !f.corps_id) continue;
        let set = osidToCorps.get(f.location_osid);
        if (!set) { set = new Set(); osidToCorps.set(f.location_osid, set); }
        set.add(f.corps_id);
    }

    // For each front segment, find which corps have brigades at its edge endpoints
    for (const seg of segments) {
        if (seg.side_a !== faction && seg.side_b !== faction) continue;
        // Extract OSIDs from edge_ids (format: "osidA__osidB")
        const segOsids = new Set<string>();
        for (const eid of seg.edge_ids) {
            const parts = eid.split('__');
            if (parts.length === 2) {
                segOsids.add(parts[0]!);
                segOsids.add(parts[1]!);
            }
        }
        // Find corps with brigades at or adjacent to segment OSIDs
        for (const osid of segOsids) {
            const corpsSet = osidToCorps.get(osid);
            if (corpsSet) {
                for (const corpsId of corpsSet) {
                    let list = result.get(corpsId);
                    if (!list) { list = []; result.set(corpsId, list); }
                    if (!list.includes(seg.front_id)) list.push(seg.front_id);
                }
            }
        }
    }

    // Sort each corps's front list
    for (const list of result.values()) list.sort(strictCompare);
    return result;
}

export function collectSectorFriendlyOsids(sector: CorpsFrontSector): string[] {
    const friendlyOsids: string[] = [];
    for (const ss of sector.sub_segments) {
        for (const osid of ss.friendly_osids) {
            if (!friendlyOsids.includes(osid)) {
                friendlyOsids.push(osid);
            }
        }
    }
    friendlyOsids.sort(strictCompare);
    return friendlyOsids;
}

export function collectSectorEnemyOsids(sector: CorpsFrontSector): string[] {
    const enemyOsids: string[] = [];
    for (const ss of sector.sub_segments) {
        for (const osid of ss.enemy_osids) {
            if (!enemyOsids.includes(osid)) {
                enemyOsids.push(osid);
            }
        }
    }
    enemyOsids.sort(strictCompare);
    return enemyOsids;
}

export function areDirectiveSectorsAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    adjacency: Map<Osid, Osid[]>,
): boolean {
    const bFriendly = new Set(collectSectorFriendlyOsids(b));
    for (const osid of collectSectorFriendlyOsids(a)) {
        if (bFriendly.has(osid)) return true;
        for (const neighbor of adjacency.get(osid) ?? []) {
            if (bFriendly.has(neighbor)) return true;
        }
    }
    return false;
}

/**
 * Find OSIDs matching municipality patterns that are enemy-controlled and adjacent to friendly territory.
 * These become offensive targets in the corps directive.
 *
 * Deterministic: sorted output.
 */
export function findTargetOsidsFromMunicipalities(
    state: GameState,
    faction: FactionId,
    targetMunicipalities: string[],
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    if (targetMunicipalities.length === 0) return [];
    const targetSet = new Set(targetMunicipalities);
    const result: Osid[] = [];

    // Iterate over all known OSIDs (from reverseMap keys, not political_controllers)
    const allOsids = [...reverseMap.keys()].sort(strictCompare);
    for (const osid of allOsids) {
        // Check if OSID matches target municipality (OSID format: op:municipality:slug)
        const munMatch = osid.match(/^op:([^:]+):/);
        if (!munMatch) continue;
        const mun = munMatch[1]!;
        if (!targetSet.has(mun)) continue;

        // Must be enemy-controlled
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
        if (ctrl === faction || ctrl === null) continue;

        // No adjacency filter — brigade AI handles reachability via BFS march (Rule 5b)
        // and only attacks adjacent enemies (Rule 5a). Corps lists strategic objectives.
        result.push(osid);
    }
    return result.sort(strictCompare);
}

/**
 * Find OSIDs matching municipality patterns that are friendly-controlled.
 * These become avoid_osids or hold_osids in the corps directive.
 *
 * Deterministic: sorted output.
 */
export function findFriendlyOsidsFromMunicipalities(
    state: GameState,
    faction: FactionId,
    municipalities: string[],
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    if (municipalities.length === 0) return [];
    const munSet = new Set(municipalities);
    const result: Osid[] = [];
    for (const osid of [...reverseMap.keys()].sort(strictCompare)) {
        const munMatch = osid.match(/^op:([^:]+):/);
        if (!munMatch) continue;
        if (!munSet.has(munMatch[1]!)) continue;
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
        if (ctrl === faction) result.push(osid);
    }
    return result;
}

// ── Sector stance evaluation (Layer B) ──────────────────────────────────────

/**
 * Is this sector on a cold front (RS↔HRHB truce under Graz Accords)?
 * Simplified check for bot AI — mirrors frontline_attrition.ts isColdFront.
 * Applies to ALL RS↔HRHB fronts except Posavina exempt corps and
 * east Herzegovina before Op Jackal ends.
 */
function isSectorColdFront(state: GameState, sector: CorpsFrontSector): boolean {
    if (!isGrazAccordsActive(state)) return false;
    const fac = sector.faction;
    const opp = sector.opposing_factions;
    const hasRsHrhb =
        (fac === 'RS' && opp.includes('HRHB')) ||
        (fac === 'HRHB' && opp.includes('RS'));
    if (!hasRsHrhb) return false;

    // Faction-level RS↔HRHB ceasefire (Herzegovina truce component)
    if (isHerzegovinaTruceActive(state)) {
        const corpsId = sector.corps_id;

        // Posavina corps are exempt (active fighting)
        if (corpsId && GRAZ_EXEMPT_RS_CORPS.has(corpsId)) return false;
        if (corpsId && GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) return false;

        // Op Jackal: east Herzegovina pair not yet frozen
        if (corpsId && isEastHerzegovinaPair(corpsId)
            && state.political.graz_east_herzegovina_active_turn == null) {
            return false;
        }

        // All other RS↔HRHB contact is cold
        return true;
    }

    // Kiseljak OSID exclusion
    if (isKiseljakExclusionActive(state)) {
        for (const ss of sector.sub_segments) {
            for (const osid of ss.friendly_osids) {
                if (GRAZ_KISELJAK_VRS_EXCLUSION.has(osid) || GRAZ_KISELJAK_HRHB_EXCLUSION.has(osid)) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Evaluate and set sector stances for all bot-controlled sectors of a faction.
 * Runs after sector construction and combat ratings, before directive generation.
 *
 * Rules:
 * - Player-set stances (`stance_source === 'player'`) are never overridden.
 * - Corps stance constrains allowed sector stances.
 * - Cold fronts → screening.
 * - Threat-based selection otherwise.
 *
 * Deterministic: sorted sector iteration, pure threat-ratio logic.
 */
export function evaluateSectorStances(state: GameState, faction: FactionId): void {
    const sectorLookup = state.military.corps_front_sectors ?? {};
    const corpsCommand = state.military.corps_command ?? {};

    // Sorted iteration for determinism
    const sectorIds = Object.keys(sectorLookup).sort(strictCompare);

    for (const sid of sectorIds) {
        const sector = sectorLookup[sid];
        if (!sector || sector.faction !== faction) continue;

        // Player override: never touch player-set stances
        if (sector.stance_source === 'player') continue;

        const cmd = corpsCommand[sector.corps_id];
        const corpsStance: string = cmd?.stance ?? 'balanced';
        const allowed = CORPS_STANCE_ALLOWED_SECTOR_STANCES[corpsStance]
            ?? CORPS_STANCE_ALLOWED_SECTOR_STANCES['balanced']!;

        let chosen: SectorStance = 'defend';

        // Cold front → screening (no shooting on truce lines)
        if (isSectorColdFront(state, sector)) {
            chosen = 'screening';
        }
        // Active operation staging in this sector → elastic (need reserves for the op)
        else if (hasStagingOperation(corpsCommand, sector)) {
            chosen = 'elastic';
        }
        // Threat-based selection
        else {
            const tr = sector.threat_ratio;
            const brigCount = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;

            if (tr > 2.0 && brigCount <= 2) {
                chosen = 'fortify'; // Outgunned, dig in
            } else if (tr > 1.5) {
                chosen = 'defend'; // Threatened but can hold
            } else if (tr < 0.5 && hasOffensiveTargets(state, sector)) {
                chosen = 'active_defense'; // Probe opportunity
            } else if (tr < 0.3 && !hasOffensiveTargets(state, sector)) {
                chosen = 'screening'; // Quiet sector, save effort
            } else {
                chosen = 'defend'; // Default
            }
        }

        // Constrain by corps stance ceiling
        if (!allowed.includes(chosen)) {
            // Fall back to 'defend' if allowed, else first allowed stance
            chosen = allowed.includes('defend') ? 'defend' : allowed[0]!;
        }

        sector.sector_stance = chosen;
        sector.stance_source = 'bot';
    }
}

/** Check if the corps has an active operation staging in this sector. */
function hasStagingOperation(
    corpsCommand: Record<string, { active_operation?: { sector_id?: string; phase?: string } | null }>,
    sector: CorpsFrontSector
): boolean {
    const cmd = corpsCommand[sector.corps_id];
    const op = cmd?.active_operation;
    if (!op) return false;
    return op.sector_id === sector.sector_id && (op.phase === 'planning' || op.phase === 'execution');
}

/** Check if this sector's corps has offensive targets that overlap this sector. */
function hasOffensiveTargets(state: GameState, sector: CorpsFrontSector): boolean {
    const cmd = state.military.corps_command?.[sector.corps_id];
    if (!cmd?.directive) return false;
    const targets = cmd.directive.offensive_targets ?? [];
    if (targets.length === 0) return false;
    // Check if any target is adjacent to sector's enemy OSIDs
    const enemyOsids = new Set<string>();
    for (const ss of sector.sub_segments) {
        for (const o of ss.enemy_osids) enemyOsids.add(o);
    }
    return targets.some(t => enemyOsids.has(t));
}

/**
 * Generate CorpsDirective for each corps of a faction.
 *
 * The directive tells subordinate brigades:
 * - Which front segments to cover
 * - Which OSIDs to attack (from army priorities + named operations)
 * - Which OSIDs to hold (chokepoints, corridors, enclaves)
 * - Which OSIDs to avoid
 * - Reserve policy and attack thresholds
 *
 * Called after stance selection and operation management.
 * Deterministic: sorted iteration, no randomness.
 */
export function generateCorpsDirectives(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid?: SupplyStateByOsidReport | null,
    ethnicMap?: OsidEthnicComposition | null
): void {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;
    if (!reverseMap) return; // Need operational data for OSID targeting

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const corpsFrontMapping = deriveCorpsFrontMapping(state, faction);
    const sectorLookup = state.military.corps_front_sectors ?? {};
    const adjacency = buildOsidAdjacency(edges);
    const strategy = FACTION_STRATEGIES[faction];
    const doctrinePhase = getActiveDoctrinePhase(faction, turn, state.military.war_timeline);

    // Army stance is recorded but does not artificially constrain corps behavior.
    // Offensive/defensive posture emerges organically from material capacity.
    const armyStance = state.military.army_stance?.[faction] ?? 'balanced';
    const armyAggressionBonus = 0;
    const armyReserveModifier = 0;

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;
        // Skip corps whose directives were already set by the AI command layer
        if (cmd.ai_decided) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length === 0) {
            cmd.directive = null;
            continue;
        }

        // Front segments this corps covers — always use front_id-based mapping so downstream
        // consumers (front_assignment.ts, brigade AI) can match against assignable_front_segments.
        // Sector sub_segment IDs are a separate organizational layer for target filtering only.
        const rawCorpsSectors = Object.values(sectorLookup)
            .filter(s => s.corps_id === corps.id)
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

        const pc = state.political.political_controllers ?? {};
        let corpsSectors = rearrangeSectorsForCorps(
            rawCorpsSectors, corps.id, adjacency,
            {
                politicalControllers: pc as Record<string, string>,
                faction,
            }
        );
        const assignedFrontIds = corpsFrontMapping.get(corps.id) ?? [];

        // ── Commander's defensive health assessment ──────────────────────
        // The corps commander evaluates his defensive coverage BEFORE considering
        // offensive operations. If his sectors are critically thin, he suppresses
        // offensive targeting and focuses on defense. A real commander's first
        // priority is to hold what he has — you don't attack Kakanj when your
        // siege ring is at 115:1 disadvantage.
        const totalCorpsEdges = corpsSectors.reduce((sum, s) => sum + s.length_edges, 0);
        const totalCorpsBrigades = subordinates.length;
        const corpsDensity = totalCorpsEdges > 0 ? totalCorpsBrigades / totalCorpsEdges : 0;
        // Critical threshold: fewer than 1 brigade per 10 edges means the front
        // is so thin that any attack could break through. Commander goes defensive.
        const CRITICAL_DENSITY_THRESHOLD = 0.10;
        // Strained threshold: fewer than 1 brigade per 6 edges. Commander stays
        // balanced but won't launch new operations — hold what you have.
        const STRAINED_DENSITY_THRESHOLD = 0.167;
        const isDefenseCritical = corpsDensity > 0 && corpsDensity < CRITICAL_DENSITY_THRESHOLD;
        const isDefenseStrained = corpsDensity > 0 && corpsDensity < STRAINED_DENSITY_THRESHOLD;

        // Army-level priorities for this corps
        const armyPriorities = getCorpsArmyPriorities(faction, corps.id, turn);

        // Collect offensive targets from army priorities
        const offensiveTargetSet = new Set<Osid>();
        let bestMinOutcome: CorpsDirective['min_attack_outcome'] = 'stalemate';
        const avoidOsids: Osid[] = [...(state.meta.avoided_osids_by_faction?.[faction] ?? [])];

        for (const priority of armyPriorities) {
            // Direct OSID targets (if specified)
            if (priority.target_osids && priority.target_osids.length > 0) {
                for (const osid of priority.target_osids) {
                    const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
                    if (ctrl !== faction && ctrl !== null && !offensiveTargetSet.has(osid)) {
                        offensiveTargetSet.add(osid);
                    }
                }
            }
            // Municipality-derived targets (always run — additive)
            const targets = findTargetOsidsFromMunicipalities(
                state, faction, priority.target_municipalities, reverseMap
            );
            for (const t of targets) {
                if (offensiveTargetSet.has(t)) continue;
                // Salient aversion: don't target OSIDs where capturing would
                // leave us surrounded (>75% enemy neighbors). Even priority
                // municipalities have bad individual OSIDs at the edges.
                if (computeSalientRisk(t, adjacency, pc as Record<string, string>, faction) >= SALIENT_RISK_THRESHOLD) continue;
                offensiveTargetSet.add(t);
            }
            // Use the most permissive min_outcome from active priorities
            if ((OUTCOME_RANK[priority.min_outcome as PredictedOutcome] ?? 2) < (OUTCOME_RANK[bestMinOutcome as PredictedOutcome] ?? 2)) {
                bestMinOutcome = priority.min_outcome;
            }
            // avoid_municipalities removed — supply constraints handle deterrence emergently.
        }

        // P3: Collect priority municipality slugs for opportunistic target filtering.
        // Opportunistic targets outside these municipalities are filtered to prevent
        // corps spreading into non-priority areas (e.g. 1KK sprawling into Central Corridor).
        const priorityMunicipalities = new Set<string>();
        for (const p of armyPriorities) {
            for (const m of p.target_municipalities) priorityMunicipalities.add(m);
        }

        // Rear-area cleanup: target undefended faction-controlled OSIDs
        // behind the front line with enemy formations. All factions
        // historically secured their rear before pushing forward (BB1 pp496-501).
        // No time gate — rear pockets should be cleared throughout the war.
        if (graphAnalysis) {
            for (const sub of subordinates) {
                const subOsid = sub.location_osid;
                if (!subOsid) continue;
                const neighbors = adjacency.get(subOsid) ?? [];
                for (const neighborOsid of neighbors) {
                    const controller = pc[neighborOsid];
                    if (controller !== faction) continue; // Must be own-controlled
                    // Skip if already a target
                    if (offensiveTargetSet.has(neighborOsid)) continue;
                    // Must have no enemy neighbors (behind front)
                    const neighborNeighbors = adjacency.get(neighborOsid) ?? [];
                    const hasEnemyNeighbor = neighborNeighbors.some(nn => {
                        const nnController = pc[nn];
                        return nnController && nnController !== faction;
                    });
                    if (hasEnemyNeighbor) continue;
                    // Must have enemy formation present (uncleared pocket/holdout)
                    const fmtsEnemy = state.military.formations ?? {};
                    // Order-independent: existence check via .some()
                    const hasEnemyFormation = Object.values(fmtsEnemy).some(f =>
                        f && f.status === 'active' && f.faction !== faction && f.location_osid === neighborOsid
                    );
                    if (!hasEnemyFormation) continue;
                    offensiveTargetSet.add(neighborOsid);
                }
            }
        }

        // Add targets from active named operation
        if (cmd.active_operation?.phase === 'execution' && cmd.active_operation.target_settlements) {
            for (const sid of cmd.active_operation.target_settlements) {
                const pc = state.political.political_controllers ?? {};
                if (pc[sid] !== faction && !offensiveTargetSet.has(sid)) {
                    offensiveTargetSet.add(sid);
                }
            }
        }

        // Opportunistic targets: enemy sectors with zero assigned brigades are
        // undefended — add their OSIDs as targets, but only if the enemy sector
        // is adjacent to one of this corps's own sectors. Without this filter,
        // corps accumulate 60+ targets from distant undefended sectors they
        // cannot actually reach.
        {
            const allSectors = state.military.corps_front_sectors ?? {};
            const corpsEnemyOsids = new Set<string>();
            for (const sec of corpsSectors) {
                for (const sub of sec.sub_segments) {
                    for (const osid of sub.enemy_osids) corpsEnemyOsids.add(osid);
                }
            }
            for (const [_sId, enemySector] of Object.entries(allSectors).sort((a, b) => strictCompare(a[0], b[0]))) {
                if (enemySector.faction === faction) continue;
                if (enemySector.assigned_brigade_ids.length > 0) continue;
                // Only target undefended sectors adjacent to this corps — check if
                // any of the enemy sector's friendly OSIDs appear in our enemy OSIDs
                let isAdjacent = false;
                for (const ss of enemySector.sub_segments) {
                    for (const osid of ss.friendly_osids) {
                        if (corpsEnemyOsids.has(osid)) {
                            isAdjacent = true;
                            break;
                        }
                    }
                    if (isAdjacent) break;
                }
                if (!isAdjacent) continue;
                for (const ss of enemySector.sub_segments) {
                    for (const osid of ss.friendly_osids) {
                        if (offensiveTargetSet.has(osid)) continue;
                        // Salient aversion: don't target OSIDs that would create
                        // indefensible salients (>75% enemy neighbors after capture).
                        if (computeSalientRisk(osid, adjacency, pc as Record<string, string>, faction) >= SALIENT_RISK_THRESHOLD) continue;
                        offensiveTargetSet.add(osid);
                    }
                }
            }
        }

        // Pocket targets: enemy OSIDs completely surrounded by faction territory — always attack these.
        // Rear pockets (all neighbors faction-controlled) are targeted even without an adjacent brigade,
        // so reserves will move toward them. Front pockets still require an adjacent brigade.
        // Rear pockets bypass the municipality constraint — they're free territory that should always
        // be consolidated. Front pockets still require operational-area membership to prevent adventurism.
        // Pocket targets: enemy OSIDs from cluster detection (1-3 connected same-controller OSIDs
        // completely surrounded by faction territory). All cluster members are in enemy_pockets.
        // Rear pockets bypass the municipality constraint — they're free territory to consolidate.
        // Front pockets still require operational-area membership to prevent adventurism.
        const rearPocketOsids = new Set<string>();
        if (graphAnalysis?.enemy_pockets.length) {
            const corpsMunSet = new Set<string>(
                armyPriorities.flatMap(p => p.target_municipalities ?? [])
            );
            const pc = state.political.political_controllers ?? {};
            const pocketSubLocations = new Set(subordinates.map(b => b.location_osid).filter(Boolean));
            // Skip rear pockets that already have a paramilitary dispatched — let paramilitaries handle them
            const paramilitaryTargets = new Set<string>();
            for (const [fid, f] of Object.entries(state.military.formations ?? {})) {
                if (f.kind === 'paramilitary' && f.status === 'active' && f.paramilitary_target && f.faction === faction) {
                    paramilitaryTargets.add(f.paramilitary_target);
                }
            }
            // Build set of all pocket OSIDs for intra-cluster neighbor filtering
            const allPocketSet = new Set(graphAnalysis.enemy_pockets);
            for (const pocketOsid of graphAnalysis.enemy_pockets) {
                if (offensiveTargetSet.has(pocketOsid)) continue;
                if (paramilitaryTargets.has(pocketOsid)) continue;
                const neighbors = adjacency.get(pocketOsid) ?? [];
                // Rear pocket: all non-cluster neighbors are faction-controlled
                const isRearPocket = neighbors.length > 0 && neighbors.every(n =>
                    allPocketSet.has(n) || (pc[n] ?? '') === faction
                );
                if (isRearPocket) {
                    offensiveTargetSet.add(pocketOsid);
                    rearPocketOsids.add(pocketOsid);
                } else {
                    // Front pockets: still require operational-area membership
                    const pocketMun = pocketOsid.split(':')[1];
                    if (!pocketMun || !corpsMunSet.has(pocketMun)) continue;
                    if (neighbors.some(n => pocketSubLocations.has(n))) {
                        offensiveTargetSet.add(pocketOsid);
                    }
                }
            }
        }

        // Convert to array for filtering/sorting phase
        const offensiveTargets: Osid[] = [...offensiveTargetSet].sort(strictCompare);

        corpsSectors = concentrateSectorsForOffensive(
            corpsSectors,
            corps.id,
            adjacency,
            offensiveTargets,
        );
        // Re-split any non-contiguous sectors created by concentration merges
        corpsSectors = splitNonContiguousSectors(corpsSectors, adjacency);
        for (const oldSec of rawCorpsSectors) {
            delete sectorLookup[oldSec.sector_id];
        }
        for (const newSec of corpsSectors) {
            sectorLookup[newSec.sector_id] = newSec;
        }
        const directiveEligibleSectors = corpsSectors.filter((sec) => sec.length_edges > 0);

        // Hold OSIDs: chokepoints + friendly OSIDs in defensive priority municipalities
        const holdOsids: Osid[] = [];
        // Add chokepoints from graph analysis
        if (graphAnalysis) {
            for (const cp of graphAnalysis.chokepoints) {
                // Only hold if a subordinate brigade is near
                const hasBrigade = subordinates.some(b => b.location_osid === cp);
                if (hasBrigade) holdOsids.push(cp);
            }
        }
        // Add friendly OSIDs in corridor/defensive priority municipalities — but only for
        // non-offensive corps. Offensive corps should be free to attack from defensive-priority
        // positions, not locked into defending. Chokepoints (above) still hold for all stances.
        if (cmd.stance !== 'offensive') {
            const corpsTerritory = new Set<string>();
            for (const sec of corpsSectors) {
                for (const osid of sec.territory_osids) corpsTerritory.add(osid);
                for (const sub of sec.sub_segments) {
                    for (const osid of sub.friendly_osids) corpsTerritory.add(osid);
                }
            }
            const defPriorityOsids = findFriendlyOsidsFromMunicipalities(state, faction, strategy.defensive_priorities, reverseMap);
            for (const osid of defPriorityOsids) {
                if (!corpsTerritory.has(osid)) continue;
                if (graphAnalysis) {
                    const analysis = graphAnalysis.osid_analysis.get(osid);
                    if (analysis && analysis.enemy_neighbors.length > 0 && !holdOsids.includes(osid)) {
                        holdOsids.push(osid);
                    }
                }
            }
        }

        // ── Front Geometry Analysis ──────────────────────────────────────
        const allSectorFriendlyOsids: string[] = [];
        const allSectorEnemyOsids: string[] = [];
        for (const sec of corpsSectors) {
            for (const sub of sec.sub_segments ?? []) {
                for (const osid of sub.friendly_osids) allSectorFriendlyOsids.push(osid);
                for (const osid of sub.enemy_osids) allSectorEnemyOsids.push(osid);
            }
            if (sec.territory_osids) {
                for (const osid of sec.territory_osids) {
                    if (!allSectorFriendlyOsids.includes(osid)) allSectorFriendlyOsids.push(osid);
                }
            }
        }

        let geometry: FrontGeometryAssessment | null = null;
        if (allSectorFriendlyOsids.length > 0 && allSectorEnemyOsids.length > 0) {
            let ethnicNeckThreshold = 0.40;
            if (state.military.named_officers && state.military.named_officer_data) {
                const cmdr = getCorpsCommander(corps.id, state);
                if (cmdr) {
                    ethnicNeckThreshold = 0.40 + (3 - cmdr.data.political_reliability) * 0.05;
                }
            }
            geometry = analyzeFrontGeometry(
                faction,
                allSectorFriendlyOsids,
                allSectorEnemyOsids,
                offensiveTargets,
                adjacency,
                ethnicMap,
                ethnicNeckThreshold,
            );
        }

        if (geometry) {
            const cmdr2 = state.military.named_officers && state.military.named_officer_data
                ? getCorpsCommander(corps.id, state)
                : null;
            const salientPriorityBoost = cmdr2 ? cmdr2.data.aggressiveness >= 4 : false;

            for (const salient of geometry.enemy_salients) {
                for (const neckOsid of salient.neck_osids) {
                    if (!offensiveTargets.includes(neckOsid) && !avoidOsids.includes(neckOsid)) {
                        if (salientPriorityBoost) {
                            offensiveTargets.unshift(neckOsid);
                        } else {
                            offensiveTargets.push(neckOsid);
                        }
                    }
                }
            }
        }

        // Inject geometry-derived critical holds (unconditional)
        if (geometry) {
            for (const hold of geometry.critical_holds) {
                if (!holdOsids.includes(hold.osid)) {
                    holdOsids.push(hold.osid);
                }
            }
        }

        // hold_municipalities from army priorities: friendly front OSIDs in those municipalities
        // are added to holdOsids UNCONDITIONALLY (regardless of corps stance).
        // Designed for siege rings: SRK must maintain the Sarajevo encirclement even while
        // offensive (launching Bastion/Lukavac-style operations outward).
        {
            const holdMunSet = new Set<string>();
            for (const priority of armyPriorities) {
                for (const mun of (priority.hold_municipalities ?? [])) holdMunSet.add(mun);
            }
            if (holdMunSet.size > 0) {
                // Collect friendly front OSIDs from this corps's sectors
                for (const sec of corpsSectors) {
                    for (const ss of sec.sub_segments) {
                        for (const osid of ss.friendly_osids) {
                            const munMatch = osid.match(/^op:([^:]+):/);
                            if (!munMatch) continue;
                            if (!holdMunSet.has(munMatch[1]!)) continue;
                            if (!holdOsids.includes(osid as Osid)) holdOsids.push(osid as Osid);
                        }
                    }
                }
            }
        }

        // Reserve fraction: corps stance base + army stance modifier
        let reserveFraction: number;
        switch (cmd.stance) {
            case 'offensive': reserveFraction = 0.1; break;
            case 'balanced': reserveFraction = 0.2; break;
            case 'defensive': reserveFraction = 0.3; break;
            case 'reorganize': reserveFraction = 0.0; break;
            default: reserveFraction = 0.2;
        }
        reserveFraction = Math.max(0, Math.min(0.5, reserveFraction + armyReserveModifier));

        // Max attackers: offensive/balanced allow concentration, defensive is more cautious
        let maxAttackersPerTarget = cmd.stance === 'defensive' || cmd.stance === 'reorganize' ? 2 : 3;

        // Aggression modifier: doctrine phase + army stance bonus + seasonal adjustment + officer aggressiveness
        const seasonalAdj = getSeasonalModifiers(
            state.meta?.turn ?? 0, state.meta?.scenario_start_date
        ).aggression_adj;
        // Truce-break retaliation: opponent faction broke truce → this faction gets aggression spike
        const truceBreakBonus = getTruceBreakAggressionBonus(faction, state);
        let aggressionModifier = (doctrinePhase?.aggression_modifier ?? 0) + armyAggressionBonus + seasonalAdj + truceBreakBonus;

        // C.1: Named officer aggressiveness shifts corps aggression
        if (state.military.named_officers && state.military.named_officer_data) {
            const commander = getCorpsCommander(corps.id, state);
            if (commander) {
                // Shift aggression by (aggressiveness - 3) × 0.08
                const officerAggressionShift = (commander.data.aggressiveness - 3) * 0.08;
                aggressionModifier += officerAggressionShift;
                // Aggressive commanders concentrate more force per target
                if (commander.data.aggressiveness >= 4) {
                    maxAttackersPerTarget = Math.min(maxAttackersPerTarget + 1, 5);
                }
                // Defensive skill modulates reserve fraction
                const defSkillAdj = (commander.data.defensive_skill - 3) * 0.03;
                reserveFraction = Math.max(0.05, Math.min(0.40, reserveFraction + defSkillAdj));
                // High-competence commanders (≥4) accept riskier attacks
                const effComp = getEffectiveCompetence(commander.state, commander.data);
                if (effComp >= 5) {
                    if (bestMinOutcome === 'victory' || bestMinOutcome === 'decisive_victory') {
                        bestMinOutcome = 'costly_victory';
                    }
                } else if (effComp >= 4) {
                    if (bestMinOutcome === 'victory') {
                        bestMinOutcome = 'costly_victory';
                    }
                } else if (effComp <= 2) {
                    if (bestMinOutcome === 'costly_victory') {
                        bestMinOutcome = 'victory';
                    }
                }
            }
        }

        // --- Campaign plan integration (gathering plan adjusts aggression + reserves) ---
        const gatherPlan: CampaignPlan | null | undefined = state.military.campaign_plans?.[faction];
        if (gatherPlan && gatherPlan.valid_until_turn >= turn) {
            const fp = gatherPlan.front_priorities.find(p => p.corps_id === corps.id);
            if (fp) {
                aggressionModifier += PRIORITY_AGGRESSION[fp.role] ?? 0;
                reserveFraction = Math.max(0, Math.min(0.5, reserveFraction + (PRIORITY_RESERVE[fp.role] ?? 0)));
                if (fp.role === 'contain') {
                    offensiveTargets.length = 0;
                }
                if (fp.offensive_targets && fp.offensive_targets.length > 0) {
                    const planTargets = fp.offensive_targets.filter(t => !offensiveTargets.includes(t as Osid));
                    offensiveTargets.unshift(...planTargets as Osid[]);
                }
                if (fp.hold_targets && fp.hold_targets.length > 0) {
                    for (const ht of fp.hold_targets) {
                        if (!holdOsids.includes(ht as Osid)) holdOsids.push(ht as Osid);
                    }
                }
            }
        }

        aggressionModifier = Math.max(
            AGGRESSION_FLOOR[cmd.stance] ?? -0.30,
            aggressionModifier
        );

        // Min attack outcome comes from doctrine phase + officer competence.
        // No artificial stance-based overrides.

        // Opportunistic targets are always retained — factions limit their own
        // offensive ambition organically through combat readiness and supply.

        // Commander's defensive health gate: if the front is critically thin,
        // the commander suppresses offensive operations. He won't send brigades
        // to attack Kakanj when his siege ring is at 115:1 disadvantage.
        if (isDefenseCritical) {
            // Critical: strip ALL offensive targets. Every brigade defends.
            offensiveTargets.length = 0;
        } else if (isDefenseStrained) {
            // Strained: keep targets (for counterattacks) but don't launch new ops.
            // This is handled below at the operation launch gate.
        }

        // Supply-aware operation sizing (graduated response)
        const supplyHealth = assessCorpsSupplyHealth(subordinates, faction, supplyByOsid);
        const surplusCount = computeCorpsSurplus(corpsSectors);
        const maxOpSize = computeSupplyAwareOpSize(supplyHealth, surplusCount, 12);

        if (maxOpSize === 0) {
            offensiveTargets.length = 0;  // critical: no operations
        }

        // Army HQ override: inject forced targets (overrides supply gate).
        // When army HQ has issued a direct override for this corps, the targets
        // bypass the supply gate — army-level strategic necessity trumps corps
        // supply caution. This models historical cases where army command forced
        // operations despite local commanders' reluctance (e.g. Srebrenica 1995).
        const armyHqOverrides = (state.military.army_hq_overrides ?? [])
            .filter(o => o.corps_id === corps.id);
        for (const hqOv of armyHqOverrides) {
            for (const osid of hqOv.target_osids) {
                if (!offensiveTargets.includes(osid)) {
                    offensiveTargets.push(osid);
                }
            }
        }

        // Strained supply penalty: arms embargo effect. When most brigades are
        // strained, the commander becomes more cautious — requires higher confidence
        // for attacks. But operations with SURPLUS brigades (beyond garrison) are
        // still allowed at reduced scale. This lets ARBiH launch limited Brčko
        // counterattacks while conserving ammunition.
        if (supplyHealth.adequate_fraction < 0.3) {
            const rankVal = OUTCOME_RANK[bestMinOutcome as PredictedOutcome] ?? 2;
            if (rankVal < 3) bestMinOutcome = 'stalemate';
        }

        // Save the pre-supply-adjustment threshold for operation launch.
        // Operations bake in their min_attack_outcome at creation — if we pass the
        // supply-inflated 'costly_victory' here, operations launched during an early
        // supply crisis carry that restriction even after supply recovers. The supply
        // penalty in combat power already handles the realism; double-penalizing via
        // the probe threshold causes persistent zero-attack stalls. (#35)
        const minAttackOutcomeForOpLaunch = bestMinOutcome;
        // Near-complete supply isolation → upgrade minimum outcome by one rank (max costly_victory).
        // Only applies when almost no brigades have adequate supply (< 5%).
        // Note: only affects the corps DIRECTIVE (not the operation probe threshold — see above).
        if (supplyHealth.adequate_fraction < 0.05) {
            const rankVal = OUTCOME_RANK[bestMinOutcome as PredictedOutcome] ?? 2;
            if (rankVal < 4) { // below costly_victory (4 in 6-scale) → upgrade to costly_victory
                bestMinOutcome = 'costly_victory';
            }
        }

        // Graz Accords truce: corps-pair truce (Herzegovina) + OSID-level Kiseljak exclusion.
        // Posavina and Krajina HRHB cells are NOT protected — VRS attacks freely.
        if (isGrazAccordsActive(state)) {
            const pc = state.political.political_controllers ?? {};
            for (let i = offensiveTargets.length - 1; i >= 0; i--) {
                const osid = offensiveTargets[i]!;
                if (shouldGrazBlockAttack(state, corps.id, faction, osid, pc[osid] ?? '')) {
                    offensiveTargets.splice(i, 1);
                }
            }
        }

        // RBiH–HRHB alliance: when allied, do not target each other's territory.
        // Historical: ARBiH and HVO were allies in 1992, fighting RS together.
        // Alliance degrades over time via alliance_update.ts; attacks unlock when
        // war_alliance_rbih_hrhb drops below ALLIED_THRESHOLD (~Oct 1992+).
        if (areRbihHrhbAllied(state) && (faction === 'RBiH' || faction === 'HRHB')) {
            const allyFaction = faction === 'RBiH' ? 'HRHB' : 'RBiH';
            const pc = state.political.political_controllers ?? {};
            for (let i = offensiveTargets.length - 1; i >= 0; i--) {
                if (pc[offensiveTargets[i]!] === allyFaction) {
                    offensiveTargets.splice(i, 1);
                }
            }
        }

        // Hard-enforce avoided_osids_by_faction before sector and sort steps:
        // remove any avoided OSID from offensive_targets regardless of how it got there.
        // Must run before sectorTargets is built so avoid list is respected in sector_targets too.
        // Without this, rear-pocket targeting bypasses the avoid list because pioneer attacks
        // skip the score filter and trigger purely on offensive_targets membership.
        if (avoidOsids.length > 0) {
            const avoidSet = new Set(avoidOsids);
            for (let i = offensiveTargets.length - 1; i >= 0; i--) {
                if (avoidSet.has(offensiveTargets[i]!)) offensiveTargets.splice(i, 1);
            }
        }

        // Failed-objective cooldown: suppress targets that have been attempted and failed
        // repeatedly. After OBJECTIVE_FAILURE_THRESHOLD failures the objective is on cooldown
        // for OBJECTIVE_FAILURE_COOLDOWN_TURNS. Prevents corps from hammering the same
        // hardened position every operation (Ripac/5th Corps pattern).
        const failedObjs = cmd?.failed_offensive_objectives;
        if (failedObjs) {
            for (let i = offensiveTargets.length - 1; i >= 0; i--) {
                const entry = failedObjs[offensiveTargets[i]!];
                if (entry && entry.cooldown_until_turn > turn) {
                    offensiveTargets.splice(i, 1);
                }
            }
        }

        // Sector-aware target filtering: restrict to OSIDs adjacent to corps' sectors.
        // Exempt: rear pockets (behind front, always consolidate) and targets adjacent
        // to a subordinate brigade (brigade is right there — don't filter just because
        // the sector assignment doesn't cover that part of the map).
        const subLocsForFilter = new Set(subordinates.map(b => b.location_osid).filter(Boolean));
        const hasAdjacentSubordinate = (osid: Osid): boolean => {
            for (const n of adjacency.get(osid) ?? []) {
                if (subLocsForFilter.has(n)) return true;
            }
            return false;
        };
        if (corpsSectors.length > 0 && offensiveTargets.length > 0) {
            const allSectorEnemyOsids = new Set<string>();
            for (const sec of corpsSectors) {
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) allSectorEnemyOsids.add(eo);
                }
            }
            const filtered = offensiveTargets.filter(t =>
                allSectorEnemyOsids.has(t) || rearPocketOsids.has(t) || hasAdjacentSubordinate(t)
            );
            // Keep all if filter removes everything (corps needs SOMETHING to aim at)
            if (filtered.length > 0) {
                offensiveTargets.length = 0;
                offensiveTargets.push(...filtered);
            }
        }

        // Multi-sector: populate per-sector offensive targets
        const sectorTargets: Record<string, string[]> = {};
        if (corpsSectors.length > 1 && offensiveTargets.length > 0) {
            for (const sec of corpsSectors) {
                const secEnemyOsids = new Set<string>();
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) secEnemyOsids.add(eo);
                }
                const secTargets = offensiveTargets.filter(t => secEnemyOsids.has(t));
                if (secTargets.length > 0) {
                    sectorTargets[sec.sector_id] = secTargets.sort(strictCompare);
                }
            }
        }

        // Sector-intel target scoring: prefer thin sectors, deprioritize fortress sectors.
        // Soft weight (+/-2) applied within the supply-aware sort below.
        const intelScoreByOsid = new Map<string, number>();
        if (state.military.sector_intel && corpsSectors.length > 0) {
            // target OSID -> friendly sector that faces it
            const targetToFriendlySector = new Map<string, string>();
            for (const sec of corpsSectors) {
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) targetToFriendlySector.set(eo, sec.sector_id);
                }
            }
            // target OSID -> enemy sector that owns it
            const targetToEnemySector = new Map<string, string>();
            for (const [sId, sec] of Object.entries(state.military.corps_front_sectors!)) {
                if (sec.faction === faction) continue;
                for (const ss of sec.sub_segments) {
                    for (const fo of ss.friendly_osids) targetToEnemySector.set(fo, sId);
                }
            }
            for (const osid of offensiveTargets) {
                const friendlySectorId = targetToFriendlySector.get(osid);
                const enemySectorId = targetToEnemySector.get(osid);
                if (!friendlySectorId || !enemySectorId) continue;
                const rec = state.military.sector_intel[friendlySectorId]?.find(r => r.enemy_sector_id === enemySectorId);
                if (!rec || rec.confidence < CONFIDENCE_ROUGH_STRENGTH) continue;
                if (rec.strength_category === 'thin') intelScoreByOsid.set(osid, -2);
                else if (rec.strength_category === 'fortress') intelScoreByOsid.set(osid, 2);
                else if (rec.strength_category === 'dense') intelScoreByOsid.set(osid, 1);
            }
        }

        // Supply-aware target sorting: prefer attacking enemy OSIDs with critical/strained supply.
        // Then prefer targets that shorten the line (many friendly neighbors — e.g. Teočak, Šapna:
        // capturing bulges reduces front length and consolidation cost).
        // Deterministic: ties broken by strictCompare (stable for same-supply-state targets).
        offensiveTargets.sort((a, b) => {
            const getSupplyPriority = (osid: string): number => {
                if (!supplyByOsid?.factions) return 2;
                const controller = (state.political.political_controllers ?? {})[osid];
                if (!controller || controller === faction) return 2;
                const facEntry = supplyByOsid.factions.find(f => f.faction_id === controller);
                if (!facEntry) return 2;
                const osidEntry = facEntry.by_osid.find(e => e.osid === osid);
                if (!osidEntry) return 2;
                if (osidEntry.state === 'critical') return 0;
                if (osidEntry.state === 'strained') return 1;
                return 2;
            };
            const getTargetShapeScore = (osid: string): number => {
                if (geometry?.line_shortening_scores.has(osid)) {
                    return geometry.line_shortening_scores.get(osid)!;
                }
                const neighbors = adjacency.get(osid) ?? [];
                return -(neighbors.filter(n => getPoliticalControllerOSID(state, n, reverseMap) === faction).length);
            };
            const supplyDiff = getSupplyPriority(a) - getSupplyPriority(b);
            if (supplyDiff !== 0) return supplyDiff;
            const intelDiff = (intelScoreByOsid.get(a) ?? 0) - (intelScoreByOsid.get(b) ?? 0);
            if (intelDiff !== 0) return intelDiff;
            const shapeDiff = getTargetShapeScore(a) - getTargetShapeScore(b);
            if (shapeDiff !== 0) return shapeDiff;
            return strictCompare(a, b);
        });
        holdOsids.sort(strictCompare);
        avoidOsids.sort(strictCompare);

        // Sector density balancing: find under-density sectors needing reinforcement.
        // Threat-weighted: sectors facing more enemy forces get proportionally more brigades.
        // Minimum weight of 0.25 per edge ensures undefended fronts still get some coverage.
        const reinforceSectorIds: string[] = [];
        if (directiveEligibleSectors.length > 1) {
            let totalAssigned = 0;
            let totalThreatWeight = 0;
            for (const sec of directiveEligibleSectors) {
                totalAssigned += sec.assigned_brigade_ids.length;
                const threatWeight = sec.length_edges * Math.max(0.25, sec.threat_ratio);
                totalThreatWeight += threatWeight;
            }
            for (const sec of directiveEligibleSectors) {
                const sectorThreatWeight = sec.length_edges * Math.max(0.25, sec.threat_ratio);
                const desiredShare = totalThreatWeight > 0 ? sectorThreatWeight / totalThreatWeight : 0;
                const desiredBrigades = totalAssigned * desiredShare;
                const actual = sec.assigned_brigade_ids.length;
                if (desiredBrigades > 0 && actual < desiredBrigades * 0.5) {
                    reinforceSectorIds.push(sec.sector_id);
                }
            }
            reinforceSectorIds.sort(strictCompare);
        }

        // High defensive_skill commanders prioritize reinforcing sectors with own salients
        if (geometry && geometry.own_salients.length > 0) {
            const cmdr3 = state.military.named_officers && state.military.named_officer_data
                ? getCorpsCommander(corps.id, state)
                : null;
            if (cmdr3 && cmdr3.data.defensive_skill >= 4) {
                for (const salient of geometry.own_salients) {
                    for (const sec of corpsSectors) {
                        const secFriendly = new Set<string>();
                        for (const sub of sec.sub_segments ?? []) {
                            for (const osid of sub.friendly_osids) secFriendly.add(osid);
                        }
                        const neckInSector = salient.neck_osids.some(n => secFriendly.has(n));
                        if (neckInSector && reinforceSectorIds.indexOf(sec.sector_id) === -1) {
                            reinforceSectorIds.push(sec.sector_id);
                        }
                    }
                }
            }
        }

        // Priority sector: for offensive/balanced corps, pick the sector with the most
        // offensive targets in its enemy_osids. Brigades will concentrate there.
        let prioritySectorId: string | undefined;
        if ((cmd.stance === 'offensive' || cmd.stance === 'balanced') &&
            directiveEligibleSectors.length > 0 && offensiveTargets.length > 0) {
            const targetSet = new Set(offensiveTargets);
            let bestOverlap = 0;
            for (const sec of directiveEligibleSectors) {
                let overlap = 0;
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) {
                        if (targetSet.has(eo)) overlap++;
                    }
                }
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    prioritySectorId = sec.sector_id;
                }
            }
        }

        // ── Density equalization: issue explicit brigade reassignment orders ──
        // Identify surplus (>1.3× target) and deficit (<0.7× target) sectors.
        // Move brigades from surplus to deficit, preferring brigades whose home_osid
        // is near the deficit sector and avoiding entrenched brigades.
        const sectorReassignmentOrders: Array<{ brigade_id: string; to_sector_id: string }> = [];
        if (directiveEligibleSectors.length > 1) {
            // ── Intel-driven threat weighting ──
            // Sectors where intel detects enemy offensive preparation or massing
            // get boosted threat weight, attracting more brigades proactively.
            const intelThreatBoost = new Map<string, number>();
            if (state.military.sector_intel) {
                for (const sec of directiveEligibleSectors) {
                    const records = state.military.sector_intel[sec.sector_id];
                    if (!records) continue;
                    let maxBoost = 0;
                    for (const rec of records) {
                        if (rec.confidence < CONFIDENCE_ROUGH_STRENGTH) continue;
                        if (rec.offensive_signs) maxBoost = Math.max(maxBoost, 2.0);
                        else if (rec.strength_category === 'fortress') maxBoost = Math.max(maxBoost, 1.5);
                        else if (rec.strength_category === 'dense') maxBoost = Math.max(maxBoost, 1.0);
                    }
                    if (maxBoost > 0) intelThreatBoost.set(sec.sector_id, maxBoost);
                }
            }

            // Pre-compute threat-weighted sector weights (one pass)
            const sectorWeights = new Map<string, number>();
            let totalAssignedForRebalance = 0;
            let totalThreatWeightForRebalance = 0;
            for (const sec of directiveEligibleSectors) {
                totalAssignedForRebalance += sec.assigned_brigade_ids.length;
                const intelBoost = 1.0 + (intelThreatBoost.get(sec.sector_id) ?? 0);
                const w = sec.length_edges * Math.max(0.25, sec.threat_ratio) * intelBoost;
                sectorWeights.set(sec.sector_id, w);
                totalThreatWeightForRebalance += w;
            }
            const sectorDesired = new Map<string, number>();
            const surplusSectors: typeof directiveEligibleSectors = [];
            const deficitSectors: typeof directiveEligibleSectors = [];
            for (const sec of directiveEligibleSectors) {
                const w = sectorWeights.get(sec.sector_id) ?? 0;
                const desired = totalThreatWeightForRebalance > 0
                    ? totalAssignedForRebalance * (w / totalThreatWeightForRebalance) : 0;
                sectorDesired.set(sec.sector_id, desired);
                // Tighter thresholds: a sector at 2× desired is clearly surplus,
                // a sector at 0.5× is clearly deficit. The old 1.3×/0.7× was too loose
                // for extreme imbalances (22× surplus vs 0.04× deficit in same corps).
                if (sec.assigned_brigade_ids.length > desired * 1.2 && sec.assigned_brigade_ids.length >= 2) {
                    surplusSectors.push(sec);
                } else if (desired > 0 && sec.assigned_brigade_ids.length < desired * 0.6) {
                    deficitSectors.push(sec);
                }
            }
            // Sort deficit sectors by severity (most under-staffed first)
            deficitSectors.sort((a, b) => {
                const aRatio = a.assigned_brigade_ids.length / (sectorDesired.get(a.sector_id) ?? 1);
                const bRatio = b.assigned_brigade_ids.length / (sectorDesired.get(b.sector_id) ?? 1);
                if (aRatio !== bRatio) return aRatio - bRatio;
                return strictCompare(a.sector_id, b.sector_id);
            });
            const alreadyMoved = new Set<string>();
            const homeCache = state.military.home_distance_cache ?? {};
            for (const deficit of deficitSectors) {
                const needed = Math.ceil((sectorDesired.get(deficit.sector_id) ?? 0) * 0.7) - deficit.assigned_brigade_ids.length;
                if (needed <= 0) continue;
                let moved = 0;
                // Look for candidates from surplus sectors
                for (const surplus of surplusSectors) {
                    if (moved >= needed) break;
                    const surplusDesired = sectorDesired.get(surplus.sector_id) ?? 0;
                    const canDonate = surplus.assigned_brigade_ids.length - Math.ceil(surplusDesired);
                    if (canDonate <= 0) continue;
                    // Rank surplus brigades: prefer low entrenchment, low home distance to deficit sector
                    const candidates = surplus.assigned_brigade_ids
                        .filter(bid => !alreadyMoved.has(bid))
                        .map(bid => {
                            const bf = state.military.formations?.[bid];
                            const entrench = bf?.entrenchment_turns ?? 0;
                            const homeDist = homeCache[bid] ?? 0;
                            return { bid, entrench, homeDist };
                        })
                        // Don't move heavily entrenched brigades — unless the deficit is
                        // critical (0.3× or less of desired). A commander facing 710:1 threat
                        // on one sector WILL pull entrenched troops from a quiet rear sector.
                        .filter(c => {
                            const deficitDesired = sectorDesired.get(deficit.sector_id) ?? 1;
                            const deficitRatio = deficit.assigned_brigade_ids.length / Math.max(0.1, deficitDesired);
                            const isCriticalDeficit = deficitRatio < 0.3;
                            return isCriticalDeficit ? c.entrench <= 8 : c.entrench <= 3;
                        })
                        .sort((a, b) => {
                            // Prefer less entrenched, then lower home distance (already far from home = more "loose")
                            if (a.entrench !== b.entrench) return a.entrench - b.entrench;
                            if (a.homeDist !== b.homeDist) return b.homeDist - a.homeDist;
                            return strictCompare(a.bid, b.bid);
                        });
                    let donated = 0;
                    for (const c of candidates) {
                        if (moved >= needed || donated >= canDonate) break;
                        sectorReassignmentOrders.push({ brigade_id: c.bid, to_sector_id: deficit.sector_id });
                        alreadyMoved.add(c.bid);
                        moved++;
                        donated++;
                    }
                }
            }

            // ── Cross-component pass: pull from rear (non-front) sectors ──
            // Deficit sectors still below 0.7× desired can draw idle brigades
            // from rear sectors (length_edges === 0) that aren't on any front.
            // These brigades column-march across multiple hops to reach the front.
            //
            // Guard: only pull brigades whose location_osid is in the territory of
            // a front sector (length_edges > 0). Brigades in disconnected pockets
            // (enclaves, cut-off territory) can't physically reach the deficit sector.
            const rearSectors = corpsSectors.filter(sec => sec.length_edges === 0);
            if (rearSectors.length > 0) {
                // Build set of all OSIDs that belong to front sectors — brigades
                // must be in this territory to be eligible for cross-component pull.
                const frontTerritoryOsids = new Set<string>();
                for (const sec of corpsSectors) {
                    if (sec.length_edges > 0) {
                        for (const osid of sec.territory_osids) frontTerritoryOsids.add(osid);
                    }
                }

                for (const deficit of deficitSectors) {
                    const desired = sectorDesired.get(deficit.sector_id) ?? 0;
                    if (desired <= 0) continue;
                    const currentCount = deficit.assigned_brigade_ids.length +
                        sectorReassignmentOrders.filter(o => o.to_sector_id === deficit.sector_id).length;
                    if (currentCount >= desired * 0.7) continue;
                    const stillNeeded = Math.ceil(desired * 0.7) - currentCount;
                    if (stillNeeded <= 0) continue;
                    let crossMoved = 0;
                    const MAX_CROSS_COMPONENT = 2;
                    for (const rear of rearSectors) {
                        if (crossMoved >= Math.min(stillNeeded, MAX_CROSS_COMPONENT)) break;
                        const allRearBids = [
                            ...rear.assigned_brigade_ids,
                            ...(rear.reserve_brigade_ids ?? []),
                        ];
                        const candidates = allRearBids
                            .filter(bid => !alreadyMoved.has(bid))
                            .map(bid => {
                                const bf = state.military.formations?.[bid];
                                const entrench = bf?.entrenchment_turns ?? 0;
                                const personnel = bf?.personnel ?? 0;
                                const status = bf?.status;
                                const loc = bf?.location_osid ?? '';
                                return { bid, entrench, personnel, status, loc };
                            })
                            .filter(c =>
                                c.entrench <= 3 &&
                                c.personnel >= 400 &&
                                c.status === 'active' &&
                                frontTerritoryOsids.has(c.loc), // must be in main front territory
                            )
                            .sort((a, b) => {
                                if (a.entrench !== b.entrench) return a.entrench - b.entrench;
                                if (a.personnel !== b.personnel) return b.personnel - a.personnel;
                                return strictCompare(a.bid, b.bid);
                            });
                        for (const c of candidates) {
                            if (crossMoved >= Math.min(stillNeeded, MAX_CROSS_COMPONENT)) break;
                            sectorReassignmentOrders.push({ brigade_id: c.bid, to_sector_id: deficit.sector_id });
                            alreadyMoved.add(c.bid);
                            crossMoved++;
                        }
                    }
                }
            }
        }

        // ─── Mech/Moto Staging: move offensive assets to priority sector ───
        // Motorized and mechanized brigades are offensive tools, not line troops.
        // When the corps has a priority sector (offensive target), stage mech/moto
        // from reserves to the priority sector so they're available when ops launch.
        if (prioritySectorId && state.military.corps_front_sectors) {
            const prioritySec = state.military.corps_front_sectors[prioritySectorId];
            if (prioritySec && prioritySec.length_edges > 0) {
                const alreadyReassigned = new Set(
                    sectorReassignmentOrders.map(r => r.brigade_id)
                );
                const mechStagingOrders: Array<{ brigade_id: string; to_sector_id: string }> = [];

                // Scan ALL sectors of this corps for mech/moto reserves
                for (const [secId, sec] of Object.entries(state.military.corps_front_sectors).sort(
                    (a, b) => strictCompare(a[0], b[0])
                )) {
                    if (sec.corps_id !== corps.id) continue;
                    if (secId === prioritySectorId) continue; // already there
                    for (const bid of sec.reserve_brigade_ids ?? []) {
                        if (alreadyReassigned.has(bid)) continue;
                        const f = state.military.formations?.[bid];
                        if (!f || f.status !== 'active') continue;
                        const priority = getEquipmentOffensivePriority(resolveEquipmentClass(f));
                        if (priority >= 2) { // motorized (2) or mechanized (3)
                            mechStagingOrders.push({ brigade_id: bid, to_sector_id: prioritySectorId });
                            alreadyReassigned.add(bid);
                        }
                    }
                }

                if (mechStagingOrders.length > 0) {
                    for (const order of mechStagingOrders) {
                        sectorReassignmentOrders.push(order);
                    }
                }
            }
        }

        const directive: CorpsDirective = {
            assigned_front_ids: assignedFrontIds,
            offensive_targets: offensiveTargets,
            hold_osids: holdOsids,
            avoid_osids: avoidOsids,
            max_attackers_per_target: maxAttackersPerTarget,
            reserve_fraction: reserveFraction,
            min_attack_outcome: bestMinOutcome,
            aggression_modifier: aggressionModifier,
            sector_targets: Object.keys(sectorTargets).length > 0 ? sectorTargets : undefined,
            reinforce_sector_ids: reinforceSectorIds.length > 0 ? reinforceSectorIds : undefined,
            priority_sector_id: prioritySectorId,
            sector_reassignment_orders: sectorReassignmentOrders.length > 0 ? sectorReassignmentOrders : undefined,
        };

        cmd.directive = directive;

        // Sector offensive launch evaluation:
        // Launch if offensive/balanced, no active SECTOR operation, and multi-sector corps.
        // Sector offensives replace general_offensive/strategic_defense with targeted multi-OSID push.
        const existingOp = cmd.active_operation;
        // If corps has queued operations, don't launch auto-ops — let queued injection handle it.
        // Don't replace recovery-phase ops — they must complete to accumulate exhaustion.
        const hasQueuedOps = cmd.queued_operations && cmd.queued_operations.length > 0;
        const canLaunchSectorOp = !hasQueuedOps && !existingOp && !isDefenseStrained;
        // Army HQ override allows defensive corps to launch probe operations
        const hasHqProbeOverride = armyHqOverrides.some(o => o.type === 'probe' || o.type === 'feint');
        const stanceAllowsOps = cmd.stance === 'offensive' || cmd.stance === 'balanced' || hasHqProbeOverride;
        if (canLaunchSectorOp && stanceAllowsOps &&
            directiveEligibleSectors.length > 0 && offensiveTargets.length > 0) {

            // Build faction-wide friendly OSID set + component map for reinforcement pool.
            const factionFriendlyOsids = new Set<string>();
            for (const [osid, ctrl] of Object.entries(pc)) {
                if (ctrl === faction) factionFriendlyOsids.add(osid);
            }
            const factionComponentOf = buildFriendlyComponents(adjacency, factionFriendlyOsids);

            // Sort sectors: priority sector first, then by offensive target overlap (descending).
            // This ensures pocket cleanup and high-value sectors get operations before quiet ones.
            const targetSetForSort = new Set(offensiveTargets);
            const sortedLaunchSectors = [...directiveEligibleSectors].sort((a, b) => {
                // Priority sector always first
                if (a.sector_id === prioritySectorId && b.sector_id !== prioritySectorId) return -1;
                if (b.sector_id === prioritySectorId && a.sector_id !== prioritySectorId) return 1;
                // Then by target overlap count
                const overlapA = a.sub_segments.reduce((sum, ss) => sum + ss.enemy_osids.filter(eo => targetSetForSort.has(eo)).length, 0);
                const overlapB = b.sub_segments.reduce((sum, ss) => sum + ss.enemy_osids.filter(eo => targetSetForSort.has(eo)).length, 0);
                if (overlapB !== overlapA) return overlapB - overlapA;
                return strictCompare(a.sector_id, b.sector_id);
            });
            // Theater-aware follow-on gate: after a completed op, suppress different-theater
            // secondary ops for SECONDARY_OP_COOLDOWN_TURNS turns. Same-theater follow-ons
            // benefit from reduced intel_gathering (corps already knows the area).
            const lastCompletedOp = cmd.last_completed_operation ?? null;
            const lastCompletedTurn = cmd.last_completed_operation_turn ?? -999;
            const currentTurn = state.meta?.turn ?? 0;
            const inCooldown = lastCompletedOp != null
                && (currentTurn - lastCompletedTurn) <= SECONDARY_OP_COOLDOWN_TURNS;

            // ── Proactive probe: scan all corps sectors for low intel ──
            // A real commander probes blind spots BEFORE committing to offensives.
            // Without this, the corps always attacks from its highest-intel sector
            // and never gathers intel about the rest of its front.
            {
                const consecutiveProbes = cmd.consecutive_probes ?? 0;
                const turn = state.meta?.turn ?? 0;
                // Find lowest-intel sector that faces enemies
                let worstSector: typeof directiveEligibleSectors[0] | undefined;
                let worstConf = Infinity;
                for (const sec of directiveEligibleSectors) {
                    const conf = getSectorIntelConfidence(state, sec.sector_id);
                    if (conf < worstConf) {
                        worstConf = conf;
                        worstSector = sec;
                    }
                }
                if (worstSector && shouldLaunchProbeInstead(faction, worstConf, consecutiveProbes, turn)) {
                    const secEnemyOsids = collectSectorEnemyOsids(worstSector).sort(strictCompare);
                    const secFriendlyOsids = new Set(collectSectorFriendlyOsids(worstSector));
                    const probeBrigadeIds = subordinates
                        .filter(b => b.location_osid && secFriendlyOsids.has(b.location_osid)
                            && b.status === 'active' && (b.personnel ?? 0) >= 400)
                        .map(b => b.id)
                        .sort(strictCompare)
                        .slice(0, 2);
                    if (probeBrigadeIds.length >= 1 && secEnemyOsids.length >= 1) {
                        const reachableTargets = secEnemyOsids.filter(target => {
                            const neighbors = adjacency.get(target) ?? [];
                            return neighbors.some(n => getPoliticalControllerOSID(state, n, reverseMap) === faction);
                        });
                        if (reachableTargets.length >= 1) {
                            const probeOp = evaluateSectorOffensiveLaunch(
                                state, corps.id, worstSector.sector_id, faction,
                                probeBrigadeIds, secEnemyOsids, reachableTargets.slice(0, 1), supplyByOsid,
                                'repulsed'
                            );
                            if (probeOp) {
                                probeOp.type = 'probe';
                                probeOp.planning_duration = 1;
                                cmd.active_operation = probeOp;
                                cmd.consecutive_probes = consecutiveProbes + 1;
                                assignOperationCommander(state, probeOp, corps.id, faction);
                                continue; // Skip to next corps — this one is probing
                            }
                        }
                    }
                }
            }

            for (const sec of sortedLaunchSectors) {
                if (inCooldown) {
                    // Check whether this sector shares theater with the last completed op.
                    const secEnemySet = new Set(collectSectorEnemyOsids(sec));
                    const sameTheater = operationsShareTheater(lastCompletedOp, sec.sector_id, secEnemySet);
                    if (!sameTheater) {
                        // Different theater — skip during cooldown (corps still reconsolidating).
                        continue;
                    }
                }
                const clusterSectors = [sec];
                const clusterFriendlyOsids = new Set(collectSectorFriendlyOsids(sec));
                const clusterEnemyOsids = new Set(collectSectorEnemyOsids(sec));
                let secBrigadeIds = subordinates
                    .filter((b) => b.location_osid && clusterFriendlyOsids.has(b.location_osid))
                    .map((b) => b.id)
                    .sort((a, b) => {
                        const fa = state.military.formations?.[a];
                        const fb = state.military.formations?.[b];
                        const pa = getEquipmentOffensivePriority(fa ? resolveEquipmentClass(fa) : undefined);
                        const pb = getEquipmentOffensivePriority(fb ? resolveEquipmentClass(fb) : undefined);
                        if (pa !== pb) return pb - pa;
                        return strictCompare(a, b);
                    });

                while (secBrigadeIds.length < 1) {
                    const donorCandidates = directiveEligibleSectors
                        .filter((candidate) =>
                            !clusterSectors.includes(candidate) &&
                            clusterSectors.some((clusterSector) => areDirectiveSectorsAdjacent(clusterSector, candidate, adjacency))
                        )
                        .map((candidate) => {
                            const candidateEnemyOsids = collectSectorEnemyOsids(candidate);
                            const overlap = candidateEnemyOsids.filter((osid) => offensiveTargets.includes(osid)).length;
                            const candidateFriendlyOsids = new Set(collectSectorFriendlyOsids(candidate));
                            const brigadeCount = subordinates.filter((b) => b.location_osid && candidateFriendlyOsids.has(b.location_osid)).length;
                            return { candidate, overlap, brigadeCount, candidateEnemyOsids, candidateFriendlyOsids };
                        })
                        .sort((a, b) => {
                            if (b.overlap !== a.overlap) return b.overlap - a.overlap;
                            if (b.brigadeCount !== a.brigadeCount) return b.brigadeCount - a.brigadeCount;
                            if (a.candidate.length_edges !== b.candidate.length_edges) {
                                return a.candidate.length_edges - b.candidate.length_edges;
                            }
                            return strictCompare(a.candidate.sector_id, b.candidate.sector_id);
                        });
                    const donor = donorCandidates[0];
                    if (!donor) {
                        break;
                    }
                    clusterSectors.push(donor.candidate);
                    for (const osid of donor.candidateFriendlyOsids) clusterFriendlyOsids.add(osid);
                    for (const osid of donor.candidateEnemyOsids) clusterEnemyOsids.add(osid);
                    secBrigadeIds = subordinates
                        .filter((b) => b.location_osid && clusterFriendlyOsids.has(b.location_osid))
                        .map((b) => b.id)
                        .sort((a, b) => {
                            const fa = state.military.formations?.[a];
                            const fb = state.military.formations?.[b];
                            const pa = getEquipmentOffensivePriority(fa ? resolveEquipmentClass(fa) : undefined);
                            const pb = getEquipmentOffensivePriority(fb ? resolveEquipmentClass(fb) : undefined);
                            if (pa !== pb) return pb - pa;
                            return strictCompare(a, b);
                        });
                }

                const secEnemyOsids = [...clusterEnemyOsids].sort(strictCompare);

                // Only brigades already in the sector cluster participate.
                // If the cluster lacks enough brigades, skip — corps density
                // balancing should reinforce the sector first.
                let finalBrigadeIds = secBrigadeIds;

                // Cap operation size by supply health (graduated response)
                if (maxOpSize > 0 && maxOpSize < finalBrigadeIds.length) {
                    finalBrigadeIds = finalBrigadeIds.slice(0, maxOpSize);
                }

                // Army HQ override: cap brigade count for probe/feint operations.
                // Probes are small recon-by-force; feints are limited diversions.
                const matchingHqOv = armyHqOverrides.find(o =>
                    o.target_osids.some(t => offensiveTargets.includes(t) || secEnemyOsids.includes(t))
                );
                if (matchingHqOv?.type === 'probe') {
                    const cap = matchingHqOv.max_brigades ?? 2;
                    if (finalBrigadeIds.length > cap) {
                        finalBrigadeIds = finalBrigadeIds.slice(0, cap);
                    }
                } else if (matchingHqOv?.type === 'feint') {
                    const cap = matchingHqOv.max_brigades ?? 3;
                    if (finalBrigadeIds.length > cap) {
                        finalBrigadeIds = finalBrigadeIds.slice(0, cap);
                    }
                }

                // Filter targets to only those adjacent to at least one friendly-held OSID.
                // Removes unreachable deep-enemy targets from operation objectives, preventing
                // operations from launching into cells that have no adjacent RS position to attack from.
                const reachableTargets = offensiveTargets.filter((target) => {
                    const neighbors = adjacency.get(target) ?? [];
                    return neighbors.some((n) => getPoliticalControllerOSID(state, n, reverseMap) === faction);
                });

                // ── Intel gate: check sector confidence before committing ──
                const sectorConfidence = getSectorIntelConfidence(state, sec.sector_id);
                const consecutiveProbes = cmd.consecutive_probes ?? 0;
                const turn = state.meta?.turn ?? 0;

                if (shouldLaunchProbeInstead(faction, sectorConfidence, consecutiveProbes, turn)) {
                    // Low intel — launch a probe operation instead of full attack.
                    // Probes are smaller (max 2 brigades), shorter planning, and generate
                    // recon-by-force intel when they engage.
                    const probeBrigades = finalBrigadeIds.slice(0, 2);
                    if (probeBrigades.length >= 1 && secEnemyOsids.length >= 1) {
                        const probeOp = evaluateSectorOffensiveLaunch(
                            state, corps.id, sec.sector_id, faction,
                            probeBrigades, secEnemyOsids, reachableTargets.slice(0, 1), supplyByOsid,
                            'repulsed' // Probes accept worse outcomes
                        );
                        if (probeOp) {
                            probeOp.type = 'probe';
                            probeOp.planning_duration = 1; // Fast planning
                            cmd.active_operation = probeOp;
                            cmd.consecutive_probes = consecutiveProbes + 1;
                            assignOperationCommander(state, probeOp, corps.id, faction);
                            break;
                        }
                    }
                    // If probe launch fails, fall through to try full attack
                }

                // Sector attacks require MIN_BRIGADES_FOR_SECTOR_ATTACK (3).
                // Probes (handled above) only need 1.
                if (finalBrigadeIds.length < MIN_BRIGADES_FOR_SECTOR_ATTACK) continue;

                const op = evaluateSectorOffensiveLaunch(
                    state, corps.id, sec.sector_id, faction,
                    finalBrigadeIds, secEnemyOsids, reachableTargets, supplyByOsid,
                    minAttackOutcomeForOpLaunch
                );
                if (op) {
                    // Army HQ override: set operation type from override directive.
                    if (matchingHqOv) {
                        if (matchingHqOv.type === 'probe') {
                            op.type = 'probe';
                            op.planning_duration = 1;
                        } else if (matchingHqOv.type === 'feint') {
                            op.type = 'feint';
                            op.planning_duration = 1;
                        }
                    }

                    // ── Corps-wide reinforcement: loan brigades from other sectors ──
                    // Only for sector_attack (probes and feints are sector-scoped).
                    if (op.type === 'sector_attack') {
                        const otherSectors = directiveEligibleSectors
                            .filter(s => s.sector_id !== sec.sector_id && s.corps_id === corps.id);
                        if (otherSectors.length > 0) {
                            const pool = computeReinforcementPool(
                                sec, otherSectors, state.military.formations ?? {},
                                adjacency, factionFriendlyOsids, factionComponentOf,
                                finalBrigadeIds.length,
                            );
                            if (pool.length > 0) {
                                op.loaned_brigades = pool;
                                // Add loaned brigade IDs to participating_brigades
                                for (const loan of pool) {
                                    if (!op.participating_brigades.includes(loan.brigade_id)) {
                                        op.participating_brigades.push(loan.brigade_id);
                                    }
                                    // Also add to first axis if multi-axis
                                    if (op.axes && op.axes.length > 0) {
                                        const axis = op.axes[0]!;
                                        if (!axis.assigned_brigades.includes(loan.brigade_id)) {
                                            axis.assigned_brigades.push(loan.brigade_id);
                                        }
                                    }
                                }
                                op.participating_brigades.sort(strictCompare);
                                if (op.axes?.[0]) {
                                    op.axes[0].assigned_brigades.sort(strictCompare);
                                }
                            }
                        }
                    }

                    // Same-theater follow-on: corps already has recon from previous op —
                    // skip the full intel_gathering phase (cap preparation to 1 turn).
                    if (lastCompletedOp != null) {
                        const opObjSet = new Set(op.objectives ?? []);
                        if (op.axes) {
                            for (const axis of op.axes) {
                                for (const obj of axis.objectives ?? []) opObjSet.add(obj);
                            }
                        }
                        if (operationsShareTheater(lastCompletedOp, op.sector_id, opObjSet)) {
                            op.preparation_sub_phase = 'intel_gathering';
                            op.preparation_turns_elapsed = 0;
                            op.preparation_max_turns = 1;
                            op.postponement_count = 0;
                        }
                    }
                    cmd.active_operation = op;
                    cmd.consecutive_probes = 0; // Reset probe counter on full attack
                    assignOperationCommander(state, op, corps.id, faction);
                    break; // One offensive at a time per corps
                }
            }
        }
    }

    // ── D2: Bot reserve commitment to fill gaps ──────────────────────────
    // After all directives are generated, scan each sector's sub-segments
    // for gaps. If a gap exists and the sector has reserve brigades, commit
    // the nearest reserve to fill by adding it to the gap sub-segment's
    // primary_brigade_ids. The actual movement happens via existing brigade
    // AI movement (interior movement / column march).
    const formations = state.military.formations ?? {};
    for (const [, sec] of Object.entries(sectorLookup).sort((a, b) => strictCompare(a[0], b[0]))) {
        if (sec.faction !== faction) continue;
        const gapSubSegments = sec.sub_segments.filter(ss => ss.gap);
        if (gapSubSegments.length === 0) continue;

        const availableReserves = [...(sec.reserve_brigade_ids ?? [])].sort(strictCompare);
        if (availableReserves.length === 0) continue;

        const usedReserves = new Set<string>();
        for (const gapSS of gapSubSegments) {
            // Find nearest reserve brigade to this gap sub-segment
            let bestReserve: string | null = null;
            let bestDist = Infinity;
            for (const rid of availableReserves) {
                if (usedReserves.has(rid)) continue;
                const rf = formations[rid];
                if (!rf || rf.status !== 'active') continue;
                const rLoc = rf.location_osid ?? '';
                // Distance = min hops from reserve location to any friendly OSID in the gap
                for (const fOsid of gapSS.friendly_osids) {
                    const d = rLoc === fOsid ? 0 : (adjacency.get(rLoc as Osid)?.includes(fOsid) ? 1 : 99);
                    if (d < bestDist) {
                        bestDist = d;
                        bestReserve = rid;
                    }
                }
            }
            if (bestReserve) {
                gapSS.primary_brigade_ids.push(bestReserve);
                gapSS.gap = false;
                usedReserves.add(bestReserve);
                const rf = formations[bestReserve];
                if (rf) rf.assigned_sub_segment_id = gapSS.sub_segment_id;
            }
        }
    }
}
