/**
 * Corps directive generation: the HoI-style command hierarchy layer that
 * tells subordinate brigades what to attack, hold, and avoid.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Transitional — bot directive generation (pre-commander-loop path)
 * DOMAIN:    Corps directive generation — offensive targets, hold OSIDs, patrol
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   What targets, hold positions, and patrol zones each corps assigns to brigades
 * WRITES:    CorpsDirective (offensive_targets, hold_osids, patrol_osids, reserve_fraction)
 * READS:     GameState (operations, sectors, stance), bot_strategy profiles, ethnic composition
 * MUST NOT:  issue movement orders; assign brigades to sectors (T1 authority)
 *
 * UPSTREAM:  bot_strategy.ts (faction doctrine), commander_loop.ts emit (sector stance)
 * DOWNSTREAM: bot_brigade_ai_osid.ts (T2 reads directive to generate brigade orders)
 *
 * TRUTH INVARIANTS:
 * - Faction personality expressed through CorpsDirective parameters, not hardcoded brigade logic
 * - Directive is guidance, not orders — brigades execute within it via T2 routing
 * - Deterministic: sorted iteration via strictCompare, no Math.random()
 * ═══════════════════════════════════════════════════════════════
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { getEnclaveIdForOsid } from './enclave_resilience.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type {
    CorpsDirective,
    CorpsFrontSector,
    CorpsOperation,
    FactionId,
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
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import { evaluateCorpsOffensiveLaunch, evaluateSectorOffensiveLaunch } from './sector_offensive.js';
import { getEquipmentOffensivePriority, resolveEquipmentClass } from './sector_offensive_launch_helpers.js';
import { CONFIDENCE_ROUGH_STRENGTH, INTEL_GATE_LAUNCH_THRESHOLD, MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT } from './sector_intel_constants.js';
import { getSectorIntelConfidence, getStalestSectorIntelConfidence } from './sector_intel.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from './bot_constants.js';
import type { WarTimeline } from '../../state/war_timeline.js';
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
import { areRbihHrhbAllied, isRbihHrhbCombatEnabled } from '../early_war/alliance_update.js';
import { getCorpsCommander, getEffectiveCompetence, assignOperationCommander } from './officer_system.js';
import { concentrateSectorsForOffensive, rearrangeSectorsForCorps } from './sector_rearrangement.js';
import { splitNonContiguousSectors, GARRISON_BUDGET_EDGES_PER_BRIGADE } from './corps_front_sectors.js';
import { MIN_BRIGADES_FOR_SECTOR_ATTACK } from './operation_reinforcement_constants.js';
import type { FactionGraphAnalysis } from './osid_graph_analysis.js';
import {
    assessCorpsSupplyHealth,
    getFactionCorps,
    getCorpsSubordinates,
} from './bot_corps_helpers.js';
import type { CampaignPlan } from './army_hq_gathering_types.js';
import { PRIORITY_AGGRESSION, PRIORITY_RESERVE } from './army_hq_gathering_constants.js';
import { isOperationBlocked, filterByScope } from '../events/event_constraints.js';
import { getAvailableBrigades, hasActiveOperation, hasAvailableSlot, findBrigadeOperation, getPrimaryOperation } from './corps_operation_helpers.js';

/**
 * Sum active (non-expired) event aggression modifiers for a faction.
 * Wired into the corps aggression computation (was a broken stub before v0.6.0).
 */
export function getEventAggressionBonus(faction: FactionId, state: GameState): number {
    const mods = state.military.event_aggression_modifiers ?? [];
    const currentTurn = state.meta?.turn ?? 0;
    return mods
        .filter(m => m.faction === faction && m.expires_turn > currentTurn)
        .reduce((sum, m) => sum + m.delta, 0);
}

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

function getSupplyStateForOsid(
    supplyByOsid: SupplyStateByOsidReport | null | undefined,
    faction: FactionId,
    osid: string,
): SupplyStateLevel {
    const factionEntry = supplyByOsid?.factions?.find((entry) => entry.faction_id === faction);
    const osidEntry = factionEntry?.by_osid?.find((entry) => entry.osid === osid);
    return osidEntry?.state ?? 'adequate';
}

/** Supply-aware target scoring: enemy critical supply is an opportunity, bounded so it cannot dominate target logic. */
export function computeEnemySupplyTargetScoreMultiplier(
    supplyByOsid: SupplyStateByOsidReport | null | undefined,
    enemyFaction: FactionId,
    targetOsid: string,
): number {
    const state = getSupplyStateForOsid(supplyByOsid, enemyFaction, targetOsid);
    if (state === 'critical') return 1.10;
    if (state === 'strained') return 1.05;
    return 1.00;
}

/** Supply-aware defense priority: own critical supply at home raises reserve attention without changing baseline adequate behavior. */
export function computeOwnSupplyDefensePriorityMultiplier(
    supplyByOsid: SupplyStateByOsidReport | null | undefined,
    faction: FactionId,
    homeOsid: string,
): number {
    const state = getSupplyStateForOsid(supplyByOsid, faction, homeOsid);
    if (state === 'critical') return 1.15;
    if (state === 'strained') return 1.07;
    return 1.00;
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
export const SECONDARY_OP_COOLDOWN_TURNS = 5;
/** Offensive corps use shorter cooldown — sustained pressure is the point of offensive stance. */
export const SECONDARY_OP_COOLDOWN_TURNS_OFFENSIVE = 3;

/** Probes are cheaper than full offensives — allow at higher exhaustion.
 *  Threshold = MAX_EXHAUSTION_FOR_OPERATION + PROBE_EXHAUSTION_MARGIN. */
export const PROBE_EXHAUSTION_MARGIN = 10;

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
    timeline?: WarTimeline,
): boolean {
    // Doctrine phase exemption: some phases (e.g. RS blitz) bypass probe requirement
    const doctrinePhase = getActiveDoctrinePhase(faction, turn ?? 0, timeline);
    if (doctrinePhase?.probe_exempt) return false;

    // n1194: Removed forced commitment after MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT.
    // If intel says enemy is stronger, correct response is "defend," not "attack
    // because you probed twice." Callers now pass stalest per-sector-pair confidence.

    const threshold = INTEL_GATE_LAUNCH_THRESHOLD[faction as NonNullable<FactionId>] ?? 0.30;
    return sectorIntelConfidence < threshold;
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

    // A sector that also faces a non-truce opponent (e.g. SRK facing both RBiH
    // and HRHB Kiseljak pocket) is NOT a cold front — it's an active combat zone.
    // Cold front only applies when the ONLY opponents are the truce pair (RS↔HRHB).
    const hasNonTruceFoe = fac === 'RS'
        ? opp.some(f => f !== 'HRHB')
        : opp.some(f => f !== 'RS');
    if (hasNonTruceFoe) return false;

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
    corpsCommand: Record<string, { active_operations: { sector_id?: string; phase?: string }[] }>,
    sector: CorpsFrontSector
): boolean {
    const cmd = corpsCommand[sector.corps_id];
    if (!cmd) return false;
    for (const op of cmd.active_operations) {
        if (op.sector_id === sector.sector_id && (op.phase === 'planning' || op.phase === 'execution')) return true;
    }
    return false;
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
