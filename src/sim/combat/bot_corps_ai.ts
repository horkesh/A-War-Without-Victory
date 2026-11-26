/**
 * Bot AI for corps-level decisions: stance selection, named operations and
 * operational group activation. (The corridor-breach pass was retired 2026-11-15,
 * RF-corridor-breach: corridor fights are authored operations, and the commander
 * loop plans opportunities.)
 *
 * Sits above bot_brigade_ai_osid.ts in the decision hierarchy.
 * Corps stance flows down to modulate brigade posture decisions.
 *
 * This file is the slim orchestrator + backward-compatible re-export hub.
 * Implementation lives in:
 *   - bot_corps_helpers.ts    (shared utilities)
 *   - bot_corps_stance.ts     (stance selection, army standing orders)
 *   - bot_corps_operations.ts (named ops, OG activation, emergency defense)
 *   - bot_corps_directives.ts (directive generation)
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type {
    CorpsDirective,
    CorpsStance,
    FactionId,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import type { SpatialContext } from '../spatial_context.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { analyzeFactionGraphCached, type FactionGraphAnalysis } from './osid_graph_analysis.js';

// ── Submodule imports for orchestrator ──────────────────────────────────
import { setArmyStandingOrder, generateCorpsStanceOrders, capCorpsStancesWithoutOperation, type CorpsStanceTrace } from './bot_corps_stance.js';
import { clampHeldCorpsStances } from './stance_matter_holds.js';
import { clampHeldOgStances } from './stance_matters.js';
import { evaluateOperationProgress } from './sector_offensive.js';
import { generateOGActivationOrders } from './bot_corps_operations.js';
import { generateArmyHQOverrides } from './army_hq_overrides.js';
import {
    buildCorpsSubordinatesByCorps,
    getFactionCorps,
    getCorpsSubordinates,
} from './bot_corps_helpers.js';
import { strictCompare } from '../../state/validateGameState.js';
import { emitCommanderCreationRecord, isReasonCodeTopicEnabled } from './reason_code_debug.js';
import { emitCorpsPlanTrace } from './corps_plan_trace.js';
import { botOrdersPerfTime } from './_perf_profile_bot_orders.js';
import { isRbihHrhbAtWar, isRbihHrhbCombatEnabled } from '../early_war/alliance_update.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from './bot_constants.js';

// ── v0.8 Commander Loop ────────────────────────────────────────────────
import { runCommanderForCorps, applyCommanderOutput } from './commander/commander_loop.js';
import { buildEnemyEquipmentSummaryContext } from './commander/briefing.js';

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports for backward compatibility
// All public symbols that were previously exported from this file.
// ═══════════════════════════════════════════════════════════════════════════

// From bot_corps_helpers
export {
    assessCorpsSupplyHealth,
    buildCorpsSubordinatesByCorps,
    getFactionCorps,
    getCorpsSubordinates,
    averagePersonnelFraction,
    averageCohesion,
    sortByPersonnelDesc,
    getCorpsHomeMun,
    computeSectorThreat,
} from './bot_corps_helpers.js';

// From bot_corps_stance
export {
    generateCorpsStanceOrders,
    setArmyStandingOrder,
} from './bot_corps_stance.js';

// From sector_offensive (canonical lifecycle owner)
export { evaluateOperationProgress } from './sector_offensive.js';

// From bot_corps_operations (creation/activation entry points only)
export {
    generateOGActivationOrders,
} from './bot_corps_operations.js';

// From bot_corps_directives
export {
    AGGRESSION_FLOOR,
    collectSectorFriendlyOsids,
    collectSectorEnemyOsids,
    areDirectiveSectorsAdjacent,
    findTargetOsidsFromMunicipalities,
    findFriendlyOsidsFromMunicipalities,
} from './bot_corps_directives.js';

// ═══════════════════════════════════════════════════════════════════════════
// Report types
// ═══════════════════════════════════════════════════════════════════════════

/** Per-corps AI report entry for observability. */
export interface CorpsAiReportEntry {
    corps_id: string;
    faction: string;
    stance: string;
    active_operations: string[];
    offensive_target_count: number;
    offensive_target_municipalities: string[];
    hold_osid_count: number;
    aggression_modifier: number;
    subordinate_count: number;
}

/**
 * Extract a report from current corps_command state after generateAllCorpsOrders.
 * Deterministic: corps sorted by strictCompare.
 */
export function extractCorpsAiReport(state: GameState, faction: FactionId): CorpsAiReportEntry[] {
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return [];

    const entries: CorpsAiReportEntry[] = [];
    const corpsList = getFactionCorps(state, faction);

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const directive = cmd.directive;
        const offensiveTargets = directive?.offensive_targets ?? [];

        // Deduplicate municipality names from OSID targets (format: op:municipality:slug)
        const munSet = new Set<string>();
        for (const osid of offensiveTargets) {
            const match = osid.match(/^op:([^:]+):/);
            if (match) munSet.add(match[1]);
        }
        const municipalities = [...munSet].sort(strictCompare);

        const opNames = cmd.active_operations.map(op => `${op.type}:${op.phase}`);

        entries.push({
            corps_id: corps.id,
            faction,
            stance: cmd.stance ?? 'balanced',
            active_operations: opNames,
            offensive_target_count: offensiveTargets.length,
            offensive_target_municipalities: municipalities,
            hold_osid_count: directive?.hold_osids?.length ?? 0,
            aggression_modifier: directive?.aggression_modifier ?? 0,
            subordinate_count: cmd.subordinate_count ?? 0,
        });
    }

    return entries;
}

export interface BilateralCorpsReassignmentReport {
    diverted_corps_id: string | null;
    released_corps_id: string | null;
    release_progress: number;
    joint_ops: boolean;
    reason: 'not_applicable' | 'insufficient_corps' | 'no_bilateral_front' | 'diverted' | 'releasing' | 'released' | 'washington_released';
}

const BILATERAL_RELEASE_TURNS = 3;

function munFromBilateralOsid(osid: string | undefined): string | null {
    if (!osid) return null;
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] : null;
}

function createBilateralDirective(
    sectorIds: string[],
    holdOsids: string[],
    enemyOsids: string[],
    faction: FactionId,
): CorpsDirective {
    return {
        assigned_front_ids: [...sectorIds].sort(strictCompare),
        offensive_targets: faction === 'RBiH' ? [...enemyOsids].sort(strictCompare) : [],
        hold_osids: [...holdOsids].sort(strictCompare),
        avoid_osids: [],
        max_attackers_per_target: 1,
        reserve_fraction: 0.2,
        min_attack_outcome: faction === 'HRHB' ? 'costly_victory' : 'stalemate',
        aggression_modifier: faction === 'HRHB' ? -0.05 : 0.1,
    };
}

function clearBilateralDirective(cmd: NonNullable<GameState['military']['corps_command']>[string]): void {
    if (!cmd.directive) return;
    cmd.directive = {
        ...cmd.directive,
        assigned_front_ids: [],
        offensive_targets: [],
        hold_osids: [],
        sector_targets: undefined,
        priority_sector_id: undefined,
    };
}

/**
 * Phase C2/C4: divert one eligible RBiH/HRHB corps to the bilateral front.
 * Writes only corps-level stance/directive hints; brigade movement remains
 * emergent through the existing sector assignment and brigade AI layers.
 */
export function reassignCorpsForBilateralWar(state: GameState, faction: FactionId): BilateralCorpsReassignmentReport {
    const rhs = state.political.rbih_hrhb_state;
    if (!rhs || (faction !== 'HRHB' && faction !== 'RBiH')) {
        return { diverted_corps_id: null, released_corps_id: null, release_progress: 0, joint_ops: false, reason: 'not_applicable' };
    }
    rhs.bilateral_diverted_corps ??= {};
    rhs.bilateral_corps_release_progress ??= {};

    const currentDiverted = rhs.bilateral_diverted_corps[faction] ?? null;
    const command = state.military.corps_command ?? {};
    const currentCmd = currentDiverted ? command[currentDiverted] : undefined;

    if (rhs.washington_signed) {
        if (currentDiverted && currentCmd) {
            clearBilateralDirective(currentCmd);
            currentCmd.stance = 'balanced';
            currentCmd.status_reason = 'post_washington_joint_operations';
        }
        if (currentDiverted) delete rhs.bilateral_diverted_corps[faction];
        rhs.bilateral_corps_release_progress[faction] = BILATERAL_RELEASE_TURNS;
        return {
            diverted_corps_id: null,
            released_corps_id: currentDiverted,
            release_progress: BILATERAL_RELEASE_TURNS,
            joint_ops: true,
            reason: 'washington_released',
        };
    }

    if (rhs.ceasefire_active) {
        if (!currentDiverted) {
            return { diverted_corps_id: null, released_corps_id: null, release_progress: 0, joint_ops: false, reason: 'not_applicable' };
        }
        const progress = Math.min(BILATERAL_RELEASE_TURNS, (rhs.bilateral_corps_release_progress[faction] ?? 0) + 1);
        rhs.bilateral_corps_release_progress[faction] = progress;
        if (progress >= BILATERAL_RELEASE_TURNS) {
            if (currentCmd) {
                clearBilateralDirective(currentCmd);
                currentCmd.stance = 'balanced';
                currentCmd.status_reason = 'bilateral_ceasefire_redeployed';
            }
            delete rhs.bilateral_diverted_corps[faction];
            return { diverted_corps_id: null, released_corps_id: currentDiverted, release_progress: progress, joint_ops: false, reason: 'released' };
        }
        if (currentCmd) currentCmd.stance = 'defensive';
        return { diverted_corps_id: currentDiverted, released_corps_id: null, release_progress: progress, joint_ops: false, reason: 'releasing' };
    }

    rhs.bilateral_corps_release_progress[faction] = 0;

    // A lull (alliance between HOSTILE and ALLIED with no ceasefire) is NOT a release: the front still
    // exists, the pick keeps its live targets and holds that front until the war resumes or the
    // ceasefire / Washington branches release it (orchestrator ruling 2026-11-20). The canonical
    // run has one at t62.
    if (!isRbihHrhbCombatEnabled(state) || !isRbihHrhbAtWar(state)) {
        return { diverted_corps_id: null, released_corps_id: null, release_progress: 0, joint_ops: false, reason: 'not_applicable' };
    }

    // F3b (2026-11-20): when the corps or the front really vanishes, there is nothing left to divert
    // to, so the current pick is released like a displaced corps. Before F3b it kept the diversion
    // tag, which the commander briefing reads as campaign role 'contain' once its directive empties.
    // Writes nothing when there is no pick.
    const lapse = (reason: 'insufficient_corps' | 'no_bilateral_front'): BilateralCorpsReassignmentReport => {
        if (currentDiverted) {
            if (currentCmd) {
                clearBilateralDirective(currentCmd);
                currentCmd.stance = 'balanced';
                currentCmd.status_reason = 'bilateral_diversion_lapsed';
            }
            const divertedMap = rhs.bilateral_diverted_corps;
            if (divertedMap) delete divertedMap[faction];
        }
        return { diverted_corps_id: null, released_corps_id: currentDiverted, release_progress: 0, joint_ops: false, reason };
    };

    const corpsList = getFactionCorps(state, faction);
    const minCorps = faction === 'HRHB' ? 3 : 4;
    if (corpsList.length < minCorps) {
        return lapse('insufficient_corps');
    }

    const otherFaction: FactionId = faction === 'HRHB' ? 'RBiH' : 'HRHB';
    const mixedMuns = new Set((rhs.allied_mixed_municipalities ?? []).map(m => m.trim().toLowerCase()));
    const sectors = Object.values(state.military.corps_front_sectors ?? {})
        .filter(sec => sec.faction === faction && sec.opposing_factions.includes(otherFaction))
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    if (sectors.length === 0) {
        return lapse('no_bilateral_front');
    }

    const scored = corpsList.map(corps => {
        const corpsSectors = sectors.filter(sec => sec.corps_id === corps.id);
        let mixedOverlap = 0;
        const holdOsids: string[] = [];
        const enemyOsids: string[] = [];
        for (const sec of corpsSectors) {
            const friendlyOsids = [
                ...sec.territory_osids,
                ...sec.sub_segments.flatMap(sub => sub.friendly_osids),
            ].sort(strictCompare);
            const sectorEnemyOsids = sec.sub_segments
                .flatMap(sub => sub.enemy_osids)
                .filter(osid => state.political.political_controllers?.[osid] === otherFaction)
                .sort(strictCompare);
            holdOsids.push(...friendlyOsids);
            enemyOsids.push(...sectorEnemyOsids);
            const osids = [...friendlyOsids, ...sectorEnemyOsids].sort(strictCompare);
            for (const osid of osids) {
                const mun = munFromBilateralOsid(osid)?.toLowerCase();
                if (!mun || !mixedMuns.has(mun)) continue;
                mixedOverlap++;
            }
        }
        return {
            corpsId: corps.id,
            sectorIds: corpsSectors.map(sec => sec.sector_id).sort(strictCompare),
            holdOsids: [...new Set(holdOsids)].sort(strictCompare),
            enemyOsids: [...new Set(enemyOsids)].sort(strictCompare),
            mixedOverlap,
            operationallyReady: (command[corps.id]?.corps_exhaustion ?? 0) <= MAX_EXHAUSTION_FOR_OPERATION,
        };
    }).filter(row => row.sectorIds.length > 0 && row.enemyOsids.length > 0)
        .sort((a, b) => {
            if (faction === 'RBiH' && a.operationallyReady !== b.operationallyReady) {
                return Number(b.operationallyReady) - Number(a.operationallyReady);
            }
            if (b.mixedOverlap !== a.mixedOverlap) return b.mixedOverlap - a.mixedOverlap;
            return strictCompare(a.corpsId, b.corpsId);
        });

    const selected = scored[0];
    if (!selected) {
        return lapse('no_bilateral_front');
    }

    // F3 (2026-11-20): the diversion moves to another corps, so release the displaced one the way
    // the ceasefire and Washington branches do. Before F3 it kept the diversion tag with zero
    // targets, which the commander briefing reads as campaign role 'contain' (no fresh plans) for
    // the rest of the war.
    const displacedCorpsId = currentDiverted !== null && currentDiverted !== selected.corpsId ? currentDiverted : null;
    if (displacedCorpsId && currentCmd) {
        clearBilateralDirective(currentCmd);
        currentCmd.stance = 'balanced';
        currentCmd.status_reason = 'bilateral_front_rotated';
    }

    rhs.bilateral_diverted_corps[faction] = selected.corpsId;
    const selectedCmd = command[selected.corpsId];
    if (selectedCmd) {
        selectedCmd.stance = (faction === 'HRHB' ? 'defensive' : 'offensive') as CorpsStance;
        selectedCmd.directive = createBilateralDirective(
            selected.sectorIds,
            selected.holdOsids,
            selected.enemyOsids,
            faction,
        );
        selectedCmd.status_reason = 'rbih_hrhb_bilateral_front_diversion';
    }

    return { diverted_corps_id: selected.corpsId, released_corps_id: displacedCorpsId, release_progress: 0, joint_ops: false, reason: 'diverted' };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all corps-level AI decisions for a faction.
 * Call before generate-bot-brigade-orders in the pipeline.
 *
 * Order:
 * 0. Set army stance from historical standing orders
 * 0b. (retired: multi-corps offensive pre-set, package P0 2026-11-16)
 * 1. Evaluate progress of existing operations (advance/abort)
 * 2. Set corps stances
 * 3. Launch new named operations
 * 3b. (retired: emergency defensive operations, RF-emergency-defense 2026-11-15)
 * 4. (retired: corridor breach, RF-corridor-breach 2026-11-15)
 * 5. Generate OG activation orders
 * 6. Generate corps directives for brigade AI
 */
export function generateAllCorpsOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
    osidEdges?: EdgeRecord[],
    supplyByOsid?: SupplyStateByOsidReport | null,
    ethnicMap?: OsidEthnicComposition | null,
    preComputedAdjacency?: ReadonlyMap<string, readonly string[]>,
    spatial?: SpatialContext | null,
    osidPopulationMap?: OsidPopulationMap,
    terrainData?: import('../../map/terrain_scalars.js').TerrainScalarsData | null,
    /** Read-only formula trace for the stance-matter path (live president only). */
    stanceTrace?: Map<string, CorpsStanceTrace>,
): void {
    // 0. Generate army HQ overrides for this turn (merge with any existing from gathering)
    const armyOverrides = generateArmyHQOverrides(state, faction);
    const existingOverrides = state.military.army_hq_overrides ?? [];
    const merged = [...existingOverrides, ...armyOverrides];
    state.military.army_hq_overrides = merged.length > 0 ? merged : undefined;

    // 0a. Set army stance from standing orders
    setArmyStandingOrder(state, faction);

    // 0b. (retired 2026-11-16: the multi-corps "offensive" pre-set. Step 2 rewrites every corps
    // stance, so it only survived for a corps with a player stance order, where it overrode the
    // President's accepted stance. Headless it changed nothing.)

    // 1. Evaluate existing operations
    evaluateOperationProgress(state, faction);

    // OSID contact edges (`od.edges`, the graph preCombat spatial adjacency is built from).
    // The corps threat ratio and the commander loop must read the same graph: brigade
    // locations are OSIDs, so the canonical settlement (S-id) edges in `edges` gave every
    // corps a threat of 0 (RF-F1g, 2026-11-15). Falls back to `edges` when no OSID graph is passed.
    const effectiveOsidEdges = osidEdges ?? edges;

    // 2. Corps stance selection. The default-off `corps_plan` receipts need the stance driver, so they
    // collect the read-only stance trace when no caller did (filling it writes no state).
    const planTraceStance = stanceTrace ?? (isReasonCodeTopicEnabled('corps_plan') ? new Map<string, CorpsStanceTrace>() : undefined);
    generateCorpsStanceOrders(state, faction, effectiveOsidEdges, sidToMun, planTraceStance);
    // Presidential stance holds (posture model option 2). Clamp point 1 of 3; inert without a hold.
    clampHeldCorpsStances(state, faction);
    reassignCorpsForBilateralWar(state, faction);

    // 3. Named operations now launch from sectors inside the commander loop (step 6).
    // The old catalog-based generateCorpsOperationOrders is disabled — it pulled brigades
    // from the entire corps pool without sector assignment, creating bloated non-sector ops.

    // 3b. (Retired 2026-11-15, RF-emergency-defense.) Emergency defensive operations never
    // fired (no threatened corps had two brigades at 70% of the 3,000 cap). Woken, the operation
    // had no axes, objectives or staging point: no tactical group, no attacks, no control. It
    // froze the corps' four strongest brigades for about seven turns (planning x1.05 defence,
    // recovery x0.9 defence and x0.6 attack, +15 exhaustion), blocked the commander loop and
    // took adjacent ALLIED ground as targets. A threatened corps was worse defended with it.
    // A real emergency defence (reserves, counterattack) is a post-1.0 design item.

    // 4. (Retired 2026-11-15, RF-corridor-breach.) The corridor-breach pass read OSID-keyed
    // control through an S-id sidToMun, so it never found a target; fixed, it would have built
    // a hollow operation with no objectives, taken a corps' four strongest brigades and forced
    // the corps offensive, including HRHB Herzegovina corps against ALLIED ARBiH Mostar.
    // Corridor fights are authored operations; the commander loop plans opportunities.
    // Clamp point 2 of 3: reassignCorpsForBilateralWar above may have rewritten a held corps'
    // stance; re-clamp before the OG ceiling reads cmd.stance.
    clampHeldCorpsStances(state, faction);

    // 5. OG activation
    generateOGActivationOrders(state, faction, edges);

    // 6. Generate corps directives (new: HoI-style command hierarchy)
    // Use OSID edges for adjacency (not canonical SID edges): `effectiveOsidEdges` above.
    const adjacency = (preComputedAdjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(effectiveOsidEdges);
    let graphAnalysis: FactionGraphAnalysis | null = null;
    if (reverseMap) {
        graphAnalysis = analyzeFactionGraphCached(state, faction, adjacency, reverseMap);
    }
    // 6b. OG (sector) stances are set by the commander loop below, the only deterministic bot writer (SE2;
    // the opt-in AI-commander override in ai_commander/corps_commander_ai.ts can also set them). The
    // truce-line screening and own-operation elastic rules are commander inputs
    // (briefing.sector_situations). Without spatial context no commander runs and OGs keep
    // the 'defend' they were built with.

    if (spatial) {
        // v0.8 Commander Loop: per-corps PERCEIVE→DECIDE→EXECUTE pipeline
        const corpsList = getFactionCorps(state, faction);
        if (isReasonCodeTopicEnabled('commander_creation')) {
            emitCommanderCreationRecord({
                schema: 'commander_creation.v1',
                phase: 'pass_start',
                turn: state.meta?.turn ?? null,
                faction,
                spatial_present: true,
                corps_ids: corpsList.map((entry) => entry.id).sort(strictCompare),
            });
        }
        const corpsSubordinatesByCorps = botOrdersPerfTime(
            'commander.runCommanderForCorps.corpsSubordinatesIndex',
            () => buildCorpsSubordinatesByCorps(state),
        );
        const enemyEquipmentSummaryContext = botOrdersPerfTime(
            'commander.runCommanderForCorps.enemyEquipmentSummaryContext',
            () => buildEnemyEquipmentSummaryContext(state),
        );
        for (const corps of corpsList) {
            const output = runCommanderForCorps(
                state,
                corps.id,
                faction,
                spatial,
                effectiveOsidEdges,
                reverseMap ?? null,
                graphAnalysis,
                supplyByOsid ?? null,
                ethnicMap ?? null,
                corpsSubordinatesByCorps,
                enemyEquipmentSummaryContext,
                osidPopulationMap,
                terrainData,
            );
            applyCommanderOutput(state, corps.id, output, faction);
        }
        if (isReasonCodeTopicEnabled('commander_creation')) {
            emitCommanderCreationRecord({
                schema: 'commander_creation.v1',
                phase: 'pass_end',
                turn: state.meta?.turn ?? null,
                faction,
                status: 'completed',
                completed_corps_count: corpsList.length,
            });
        }
    } else if (isReasonCodeTopicEnabled('commander_creation')) {
        // The commander block is skipped without spatial context: an explicit skip, never coverage by absence.
        emitCommanderCreationRecord({
            schema: 'commander_creation.v1',
            phase: 'pass_start',
            turn: state.meta?.turn ?? null,
            faction,
            spatial_present: false,
        });
        emitCommanderCreationRecord({
            schema: 'commander_creation.v1',
            phase: 'pass_end',
            turn: state.meta?.turn ?? null,
            faction,
            status: 'skipped_no_spatial',
        });
    }
    // Default-off per-corps plan receipts (why a corps made no plan). Observation only.
    emitCorpsPlanTrace(state, faction, planTraceStance);

    // P2.4: an offensive corps stance needs an operation in planning or execution. The formula
    // applies the cap itself; this pass catches the later writers (bilateral-war reassignment).
    capCorpsStancesWithoutOperation(state, faction);

    // Clamp point 3 of 3 (the hold is the last writer), then OG holds after the commander
    // loop, which rewrites every OG stance. Both inert without a hold.
    clampHeldCorpsStances(state, faction);
    clampHeldOgStances(state, faction);

    // Final cleanup: prune any 0-edge ghost sectors (pocket containment artifacts)
    if (state.military.corps_front_sectors) {
        for (const [sid, sec] of Object.entries(state.military.corps_front_sectors)) {
            if (sec.length_edges === 0) delete state.military.corps_front_sectors[sid];
        }
    }

    // Clear consumed army HQ overrides — they are per-turn directives
    state.military.army_hq_overrides = undefined;
}
