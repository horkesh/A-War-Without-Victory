/**
 * Phase H1.1: Headless scenario harness.
 * Run N weekly turns deterministically; emit final_save.json, weekly_report.jsonl, replay.jsonl, run_summary.json.
 * No timestamps; no randomness; no derived state in saves (Engine Invariants §13.1).
 */

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadSettlementEthnicityData } from '../data/settlement_ethnicity.js';
import { computeFrontEdges, computeFrontEdgesOsid } from '../map/front_edges.js';
import type { LoadedSettlementGraph } from '../map/settlements.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { BotManager } from '../sim/bot/bot_manager.js';
import { getBotStrategyProfile } from '../sim/bot/bot_strategy.js';
import { getFrontActiveSettlements } from '../sim/emergence/aor_instantiation.js';
import { getEligiblePressureEdges } from '../sim/emergence/pressure_eligibility.js';
import { aggregateSettlementDisplacementToMunicipalities } from '../sim/displacement_pipeline/displacement_municipality_aggregation.js';
import { ensureRbihHrhbState } from '../sim/early_war/alliance_update.js';
import { buildSettlementsByMun } from '../sim/early_war/control_strain.js';
import { updateMilitiaEmergence } from '../sim/early_war/militia_emergence.js';
import { applyRsJnaInheritanceBonus, runPoolPopulation } from '../sim/early_war/pool_population.js';
import { initializeCorpsCommand } from '../sim/combat/corps_command.js';
import { initStrategicDepth } from '../sim/combat/strategic_depth.js';
import { findBrigadeOperation } from '../sim/combat/corps_operation_helpers.js';
import { injectPrePlannedOperations } from '../sim/combat/pre_planned_operations.js';
import { spawnJnaPhantomBrigades } from '../sim/combat/jna_phantom_brigades.js';
import {
    initializeRecruitmentResources,
    runBotRecruitment
} from '../sim/recruitment_engine.js';
import type { MunicipalityPopulation1991 } from '../sim/turn_pipeline.js';
import { runTurn } from '../sim/turn_pipeline.js';
import { loadEventDefinitions } from '../sim/events/event_loader.js';
import {
    applyControlFlipProposals,
    buildAdjacencyMap,
    computeControlFlipProposals
} from '../state/control_flip_proposals.js';
import { computeFrontBreaches } from '../state/front_breaches.js';
import type { FactionId, GameState, MunicipalityId } from '../state/game_state.js';
import { CANONICAL_FACTIONS, CURRENT_SCHEMA_VERSION } from '../state/game_state.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';
import {
    applyMunicipalityControllersFromMun1990Only,
    applyOsidControlOverrides,
    loadInitialMunicipalityControllers1990
} from '../state/political_control_init.js';
import {
    seedOrganizationalPenetrationFromControl,
    type OrganizationalPenetrationSeedOptions,
    type PlannedWarStartBrigadePresenceByMunicipality
} from '../state/seed_organizational_penetration_from_control.js';
import { applyJnaInheritanceBonus, ensureSupplyReserves } from '../state/supply_reserves.js';
import { deserializeState, serializeState } from '../state/serialize.js';
import { runOneTurn } from '../state/turn_pipeline.js';
import { computeSpatialContext } from '../sim/spatial_context.js';
import { strictCompare } from '../state/validateGameState.js';
import { stableStringify } from '../utils/stable_json.js';
import {
    emitRoutineConsoleDebug,
    popRoutineConsoleDiagnosticsSuppressed,
    pushRoutineConsoleDiagnosticsSuppressed,
} from '../utils/routine_console_diagnostics.js';
import {
    applyBaselineOpsDisplacement,
    applyBaselineOpsExhaustion,
    computeEngagementLevel
} from './baseline_ops_scheduler.js';
import { backfillFormationLocationOsid, loadOperationalCentroids, loadOperationalData, loadOperationalEdges } from './../data/operational_data.js';
import { setUrbanOsidSet, setForestOsidSet } from '../sim/combat/combat_math.js';
import { loadUrbanOsidSet, loadForestOsidSet } from '../sim/combat/combat_terrain_sets_node.js';
import { displaceFormationsInEnemyTerritory } from '../sim/combat/attack_resolution_osid.js';
import { reconcileFinalSectorTruth, sealFinalSectorTruthFromCurrentSectors } from '../sim/combat/final_sector_truth_reconciliation.js';
import {
    applyBotOpportunityDecisions,
    autoResolveOpportunityProposalReviews,
} from '../sim/combat/operation_opportunities.js';
import { loadInitialFormations } from './initial_formations_loader.js';
import { resolvePendingDaytonCloseOut } from '../sim/negotiation/dayton_negotiation.js';
import { applyPoliticalLeaderDataInit } from '../sim/political/political_leader_data_loader.js';
import {
    loadMunicipalityHqSettlement,
    loadOobBrigades,
    loadOobCorps,
    type OobBrigade,
    type OobCorps
} from './oob_loader.js';
import {
    buildOsidToMunFromReverseMap,
    buildSidToMunFromSettlements,
    createOobFormations as createOobFormationsAtPhaseIEntry,
    spreadBrigadesToFrontOsids
} from './oob_early_war_entry.js';
import { buildOpsCompareConclusion, formatOpsCompareMarkdown } from './ops_compare.js';
import { setEnablePhase3A } from '../sim/pressure/phase3a_pressure_eligibility.js';
import { setEnablePhase3B } from '../sim/pressure/phase3b_pressure_exhaustion.js';
import { setEnablePhase3C } from '../sim/pressure/phase3c_exhaustion_collapse_gating.js';
import { setEnablePhase3D } from '../sim/collapse/phase3d_collapse_resolution.js';
import { setEnableExhaustionDragV2 } from '../sim/combat/commander/plan.js';
import {
    buildCombatCausalitySummary,
    buildOperationCombatDiagnostics,
    type CombatCausalityInvalidationReason,
    type CombatCausalitySummary
} from './combat_causality.js';
import { buildOsidAdjacency } from '../sim/combat/osid_adjacency.js';
import {
    countInitOverrideChanges,
    mergeControlChangeAttributionSummaries,
    summarizeControlChangeAttribution,
    type ControlChangeAttributionSummary
} from './control_change_attribution.js';
import {
    computeActivitySummary,
    computeArmyStrengthsSummary,
    computeControlDelta,
    computeFormationDelta,
    evaluateBotBenchmarks,
    validateBotBenchmarkSummary,
    extractSettlementControlSnapshot,
    formatEndReportMarkdown,
    type BaselineOpsSummary,
    type BotBenchmarkDefinition,
    type BotControlShareRow,
    type BotWeeklyDiagnosticsRow,
    type ControlKey,
    type FormationFatigueSummary,
    type HistoricalAlignmentDiagnostics,
    type HistoricalFactionMetrics,
    type AttackResolutionSummary,
    type AttackResolutionWeekRollup,
    type CorpsAiSnapshot,
    type ActiveOperationSummary
} from './scenario_end_report.js';
import {
    HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992 as CANONICAL_HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992,
    resolveEpochOsidAnchors,
} from './historical_anchors.js';
import { runAnomalyDetection } from './anomaly_detector.js';
import type { AnomalyReport } from './anomaly_types.js';
import type { OperationAAR } from '../sim/combat/operation_aar.js';
import { computeRunId, loadScenario, normalizeActions, resolveInitControlPath, resolveInitFormationsPath } from './scenario_loader.js';
import {
    buildCompareResult,
    formatProbeCompareMarkdown,
    type CompareResult
} from './scenario_probe_compare.js';
import type {
    WeeklyActivityCounts,
    WeeklyBattleEntry,
    WeeklyCombatCausalitySummary,
    WeeklyControlChangeAttributionSummary,
    WeeklyCorpsSummaryEntry,
    WeeklyReportRow
} from './scenario_reporting.js';
import { buildWeeklyReport } from './scenario_reporting.js';
import { buildBrigadeTemporalRows } from './brigade_temporal_emit.js';
// LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: per-turn full-state snapshot
// stream + end-of-run consolidated `replay_save_sequence.json` artifact powering
// the VerdictScreen Replay tab via Mission J's `replayPlayer()` consumer.
// LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING (2026-05-05): per-turn JSONL append
// is the single source of truth; consolidated artifact is finalized by
// stream-reading the JSONL on disk so peak heap is bounded by one frame, not
// the whole sequence. This unblocks 188w hash-identity gates that previously
// OOM'd at the post-sim summary write (~4.4 GB replay buffer).
import {
    buildReplayFrameRow,
    streamFinalizeReplaySaveSequenceFromJsonl,
    writeReplaySaveManifest,
} from './replay_save_emit.js';
import { buildReplayFrameSummary } from '../sim/replay/replay_frame_summary.js';
import type { ReplayFrameSummary } from '../sim/replay/replay_frame_summary.js';
import type { TurnReport } from '../sim/turn_pipeline_types.js';
import type { Scenario, ScenarioAction } from './scenario_types.js';
import { evaluateVictoryConditions } from './victory_conditions.js';

/** Apply scenario actions to state. Noop/note do nothing to state. */
export function applyActionsToState(_state: GameState, _actions: ScenarioAction[]): void {
    // No-op and note do not mutate state. Future action types will mutate here.
}

function safeDebugLog(...args: unknown[]): void {
    emitRoutineConsoleDebug(...args);
}

export function repairScenarioArtifactState(
    state: GameState,
    edges: import('../map/settlements.js').EdgeRecord[] | undefined,
    operationalToCanonical?: import('../data/operational_data.js').OperationalToCanonicalReverseMap | null,
    centroids?: import('../data/operational_data_types.js').OsidCentroidMap,
): void {
    if (state.meta.phase !== 'war' || !edges?.length || !operationalToCanonical) {
        return;
    }
    displaceFormationsInEnemyTerritory(state, edges, operationalToCanonical);
    state.military.war_front_edges_osid = computeFrontEdgesOsid(state, edges, operationalToCanonical);
    reconcileFinalSectorTruth(state, edges, operationalToCanonical, centroids);
}

function buildZeroBattleCombatCausalitySummary(): CombatCausalitySummary {
    return {
        valid_for_combat_calibration: false,
        invalidation_reasons: ['zero_battles'],
        total_attack_orders: 0,
        total_objective_attempts: 0,
        total_objective_captures: 0,
        movement_only_execution_turns: 0,
        total_battles: 0,
        total_orders_by_faction: {},
        invalid_operation_count: 0,
        zero_eligible_attacker_operation_count: 0,
        recovery_without_logged_attempt_count: 0
    };
}

/**
 * Build initial GameState using canonical constructor (fixed minimal config; no env-dependent values).
 * Uses same default loadSettlementGraph() and prepareNewGameState() as sim_run; requires
 * municipality controller mapping (data/source/municipality_political_controllers.json or
 * 1990 mapping when graph has mun1990_id) to exist.
 * When controlPath is set (Option A), uses that file for initial political control (mun1990-only format).
 * When initOptions provided (ethnic_1991, hybrid_1992), uses ethnicity-based init per scenario.
 * When baseDir is set, loadSettlementGraph uses paths under baseDir (for Electron/desktop).
 */
export async function createInitialGameState(
    seed: string,
    controlPath?: string,
    initOptions?: { init_control_mode?: 'institutional' | 'ethnic_1991' | 'hybrid_1992'; ethnic_override_threshold?: number },
    options?: {
        baseDir?: string;
        organizationalPenetrationSeed?: OrganizationalPenetrationSeedOptions;
        /** When provided, use this graph for control init (must match graph used for run/recruitment). */
        settlementGraph?: LoadedSettlementGraph;
        /** When provided, political_controllers are promoted to OSID keying (OSID as base layer). */
        operationalData?: Awaited<ReturnType<typeof loadOperationalData>> | null;
    }
): Promise<GameState> {
    const graph =
        options?.settlementGraph ??
        (options?.baseDir
            ? await loadSettlementGraph({
                settlementsPath: join(options.baseDir, 'data/derived/operational/operational_settlements.geojson'),
                edgesPath: join(options.baseDir, 'data/derived/operational/operational_contact_graph.json')
            })
            : await loadSettlementGraph());
    const state: GameState = {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 0, seed, phase: 'war' },
  factions: [],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as GameState['military'],
  political: {} as GameState['political'],
  displacement: {} as GameState['displacement']
};
    const CANONICAL_IDS = ['RBiH', 'RS', 'HRHB'] as const;
    state.factions = CANONICAL_IDS.map((id) => {
        let supply_sources: string[] = [];
        if (id === 'RBiH') supply_sources = ['S166499', 'S162973', 'S155551', 'S100838', 'S158275', 'S127477']; // Sarajevo, Zenica, Tuzla, Bihac, Visoko, Konjic
        if (id === 'RS') supply_sources = ['S200026', 'S216984', 'S200891', 'S208019', 'S230545', 'S226084']; // Banja Luka, Pale, Bijeljina, Doboj, Zvornik, Trebinje
        if (id === 'HRHB') supply_sources = ['S166090', 'S120880', 'S130486', 'S110442', 'S113611']; // Mostar, Grude, Livno, Capljina, Tomislavgrad

        return {
            id,
            profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
            areasOfResponsibility: [],
            supply_sources,
            negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }
        };
    });
    const mergedInitOptions = options?.operationalData
        ? { ...initOptions, operationalToCanonical: options.operationalData.operationalToCanonical }
        : initOptions;
    await prepareNewGameState(state, graph, controlPath, mergedInitOptions);
    if (controlPath || initOptions?.init_control_mode) {
        seedOrganizationalPenetrationFromControl(state, graph.settlements, options?.organizationalPenetrationSeed);
    }
    // Initialize presidential command authority (Level 3 override resource)
    state.military.command_authority = { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 };
    return state;
}

/**
 * Canonicalize a freshly built campaign-start state onto the same save contract
 * desktop/load paths consume. This prevents "birth state" from being weaker or
 * differently shaped than the first loaded save.
 */
export function canonicalizeStartupState(state: GameState): { state: GameState; serializedState: string } {
    const initialSerialized = serializeState(state);
    const canonicalState = deserializeState(initialSerialized);
    return {
        state: canonicalState,
        serializedState: serializeState(canonicalState)
    };
}

export function hasCivilianCasualtyRecords(casualties: unknown): boolean {
    if (casualties == null || typeof casualties !== 'object' || Array.isArray(casualties)) {
        return false;
    }
    for (const entry of Object.values(casualties as Record<string, unknown>)) {
        if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const row = entry as Record<string, unknown>;
        const killed = row.killed;
        const fledAbroad = row.fled_abroad;
        if (
            typeof killed === 'number' &&
            Number.isFinite(killed) &&
            killed >= 0 &&
            typeof fledAbroad === 'number' &&
            Number.isFinite(fledAbroad) &&
            fledAbroad >= 0 &&
            killed + fledAbroad > 0
        ) {
            return true;
        }
    }
    return false;
}

/** H1.11: Scope for baseline_ops displacement (derived-only; no new mechanics). */
export type BaselineOpsScopeMode = 'all_front_active' | 'static_front_only' | 'fluid_front_only';
export type ReplayPayloadMode = 'manifest_only' | 'full';

export interface RunScenarioOptions {
    scenarioPath: string;
    outDirBase?: string;
    emitEvery?: number;
    /** When true, emit a weekly save every turn to support tactical-map replay/video workflows. */
    emitWeeklySavesForVideo?: boolean;
    weeksOverride?: number;
    /** Test-only: if set, called immediately after writing run_meta.json; throw to simulate early crash. */
    injectFailureAfterRunMeta?: () => void;
    /** Phase H1.8: when true, strip probe_intent from actions (baseline run). */
    filterProbeIntent?: boolean;
    /** H1.11: scope for baseline_ops displacement (all_front_active = current behavior). */
    scopeMode?: BaselineOpsScopeMode;
    /** H1.11: scalar multiplier for baseline_ops exhaustion and displacement (harness-only; default 1). */
    baselineOpsScalar?: number;
    /** H1.11: override run directory (e.g. run_scope_26w_x0.5); when set, used instead of outDirBase/run_id. */
    outDirOverride?: string;
    /** When true, append _<timestamp> to run directory so each run gets a new folder (no overwrite). */
    uniqueRunFolder?: boolean;
    /** Legacy harness flag: observe/apply real breach-based control flips without seeding synthetic frontier state. */
    postureAllPushAndApplyBreaches?: boolean;
    use_smart_bots?: boolean;
    /** Optional per-week AI diagnostics artifact (bot_diagnostics.json). */
    bot_diagnostics?: boolean;
    /** Optional base directory for data paths (default process.cwd()). Used by desktop createStateFromScenario. */
    baseDir?: string;
    /** When true, build state and write initial_save only; skip week loop and end-of-run artifacts (faster for desktop New Campaign). */
    initialStateOnly?: boolean;
    /** Resume a scenario run from a canonical save artifact produced by the harness or desktop save pipeline. */
    resumeFromSavePath?: string;
    /** Optional explicit resume week. Defaults to the resumed state's meta.turn and must match when provided. */
    resumeFromWeekIndex?: number;
    /** Emit routine init/sector console diagnostics during scenario runs. Defaults off under Vitest, on elsewhere. */
    consoleDiagnostics?: boolean;
    /** Optional wall-clock bucket report for benchmark instrumentation. Not part of deterministic scenario artifacts. */
    emitTimingJson?: boolean;
    /** Replay payload policy. Default manifest_only avoids full-state replay bloat; full preserves legacy sidecars. */
    replayPayloadMode?: ReplayPayloadMode;
}

export interface RunScenarioResult {
    outDir: string;
    run_id: string;
    final_state_hash: string;
    paths: {
        initial_save: string;
        final_save: string;
        weekly_report: string;
        replay: string;
        run_summary: string;
        control_delta: string;
        end_report: string;
        /** Phase H1.7: activity diagnostics (machine-readable). */
        activity_summary: string;
        /** Phase H2.2: formation delta (initial vs final). */
        formation_delta: string;
        /** Destroyed named brigades reconstructed at summary time. */
        destroyed_brigades: string;
        /** Operation AARs (completed operations). */
        operation_aars: string;
        /** Triggered-operation lifecycle diagnostics for watched historical operations. */
        watched_operations?: string;
        /** LANE-2026-05-02-A1: Per-turn brigade-keyed snapshot (read-only observability). */
        brigade_temporal_log: string;
        /** LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: per-turn full-state JSONL stream. */
        replay_sequence_log: string;
        /** LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: end-of-run consolidated GameState[] artifact. */
        replay_save_sequence: string;
        /** Sparse replay summary manifest emitted beside replay_save_sequence.json. */
        replay_save_manifest: string;
        /** LANE D-CONTENT (Path A): per-turn displacement event JSONL stream (events written before per-turn buffer clear). */
        displacement_event_log: string;
        /** Optional list of deterministic weekly save paths (save_w1..save_wN). */
        weekly_saves?: string[];
        /** Optional replay timeline bundle for tactical-map animation playback/export. */
        replay_timeline?: string;
        /** Optional per-week smart-bot diagnostics. */
        bot_diagnostics?: string;
        /** Optional wall-clock timing bucket report. Durations are intentionally non-deterministic measurements. */
        timing_json?: string;
    };
}

export function deriveWeeklyActivityCounts(
    _state: GameState,
    turnReport: Pick<Partial<TurnReport>, 'phase_f_displacement' | 'front_pressure' | 'displacement'>,
): WeeklyActivityCounts {
    const triggerReport = turnReport.phase_f_displacement?.trigger_report;
    if (triggerReport) {
        return {
            front_active_set_size: triggerReport.front_active_set_size,
            pressure_eligible_size: triggerReport.pressure_eligible_size,
            displacement_trigger_eligible_size: triggerReport.displacement_trigger_eligible_size,
        };
    }

    return {
        front_active_set_size: 0,
        pressure_eligible_size: 0,
        displacement_trigger_eligible_size: 0,
    };
}

type AttackResolutionSummaryLike = {
    orders_processed?: number;
    unique_attack_targets?: number;
    flips_applied?: number;
    casualty_attacker?: number;
    casualty_defender?: number;
    orders_by_faction?: Record<string, number>;
    battles?: Array<{ defender_brigade?: string | null }>;
};

export function selectCanonicalAttackResolutionSummary(
    turnReport: Pick<Partial<TurnReport>, 'resolve_attack_orders' | 'attack_resolution_osid'>,
): {
    summary?: AttackResolutionSummaryLike;
    battles: Array<{ defender_brigade?: string | null }>;
} {
    const legacyResolution = turnReport.resolve_attack_orders;
    const osidResolution = turnReport.attack_resolution_osid as AttackResolutionSummaryLike | undefined;

    if (osidResolution) {
        return {
            summary: osidResolution,
            battles: osidResolution.battles ?? [],
        };
    }

    return {
        summary: legacyResolution,
        battles: legacyResolution?.battle_report?.battles ?? [],
    };
}

function computeControlShareByFaction(state: GameState): Array<{ faction: string; control_share: number }> {
    const controllers = state.political.political_controllers ?? {};
    const totalSettlements = Object.keys(controllers).length;
    const byFaction = new Map<string, number>();
    for (const faction of (state.factions ?? []).map((f) => f.id)) {
        byFaction.set(faction, 0);
    }
    for (const value of Object.values(controllers)) {
        const key = value ?? '';
        if (!key) continue;
        byFaction.set(key, (byFaction.get(key) ?? 0) + 1);
    }
    return Array.from(byFaction.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([faction, count]) => ({
            faction,
            control_share: totalSettlements > 0 ? Math.round((count / totalSettlements) * 1e6) / 1e6 : 0
        }));
}

function captureHistoricalFactionMetrics(state: GameState): HistoricalFactionMetrics[] {
    const factions = [...(state.factions ?? [])].sort((a, b) => strictCompare(a.id, b.id));
    const formations = state.military.formations ?? {};
    const recruitment = state.military.recruitment_state;
    const out: HistoricalFactionMetrics[] = [];
    for (const faction of factions) {
        let personnel_total = 0;
        let brigades_active = 0;
        let brigades_inactive = 0;
        let brigades_total = 0;
        for (const formationId of Object.keys(formations).sort(strictCompare)) {
            const f = formations[formationId];
            if (!f || f.faction !== faction.id) continue;
            if ((f.kind ?? 'brigade') !== 'brigade') continue;
            brigades_total += 1;
            if (f.status === 'active') brigades_active += 1;
            if (f.status === 'inactive') brigades_inactive += 1;
            personnel_total += f.personnel ?? 0;
        }
        const recruitment_capital =
            recruitment?.recruitment_capital?.[faction.id]?.points ?? 0;
        const negotiation_capital = faction.negotiation?.capital ?? 0;
        const prewar_capital = faction.prewar_capital ?? 0;
        out.push({
            faction: faction.id,
            personnel_total,
            brigades_active,
            brigades_inactive,
            brigades_total,
            recruitment_capital,
            negotiation_capital,
            prewar_capital
        });
    }
    return out;
}

function computeHistoricalAlignmentDiagnostics(
    initial: HistoricalFactionMetrics[],
    final: HistoricalFactionMetrics[]
): HistoricalAlignmentDiagnostics {
    const finalByFaction = new Map(final.map((row) => [row.faction, row]));
    return {
        initial,
        final,
        delta: initial
            .map((row) => {
                const end = finalByFaction.get(row.faction);
                if (!end) return null;
                return {
                    faction: row.faction,
                    personnel_total_delta: end.personnel_total - row.personnel_total,
                    brigades_active_delta: end.brigades_active - row.brigades_active,
                    brigades_inactive_delta: end.brigades_inactive - row.brigades_inactive,
                    brigades_total_delta: end.brigades_total - row.brigades_total,
                    recruitment_capital_delta: end.recruitment_capital - row.recruitment_capital,
                    negotiation_capital_delta: end.negotiation_capital - row.negotiation_capital,
                    prewar_capital_delta: end.prewar_capital - row.prewar_capital
                };
            })
            .filter((row): row is NonNullable<typeof row> => row != null)
            .sort((a, b) => strictCompare(a.faction, b.faction))
    };
}

/** Round numeric fields in run_summary for stable regression (no floats in casualty/personnel totals). */
function shouldPreserveFractionalRunSummaryField(key: string): boolean {
    return /(?:^|_)(share|ratio|rate|tolerance|deviation)$/.test(key);
}

function integerizeRunSummaryCounts(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
            out[k] = shouldPreserveFractionalRunSummaryField(k)
                ? Math.round(v * 1e6) / 1e6
                : Math.round(v);
        } else if (Array.isArray(v)) {
            out[k] = v.map((item) =>
                item !== null && typeof item === 'object' && !Array.isArray(item)
                    ? integerizeRunSummaryCounts(item as Record<string, unknown>)
                    : typeof item === 'number' && Number.isFinite(item)
                        ? (shouldPreserveFractionalRunSummaryField(k)
                            ? Math.round(item * 1e6) / 1e6
                            : Math.round(item))
                        : item
            );
        } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = integerizeRunSummaryCounts(v as Record<string, unknown>);
        } else {
            out[k] = v;
        }
    }
    return out;
}

interface HistoricalControlDeltaRow {
    controller: string;
    reference_count: number;
    final_count: number;
    delta: number;
}

interface OsidPairMatchRow {
    controller: string;
    sim_count: number;
    painted_count: number;
    correctly_placed: number;
    /**
     * correctly_placed / max(sim_count, painted_count) — spatial precision for
     * this faction. Named `accuracy_ratio` (not `accuracy`) so the suffix
     * matches `shouldPreserveFractionalRunSummaryField` whitelist, otherwise
     * `integerizeRunSummaryCounts` rounds it to an integer at serialization.
     */
    accuracy_ratio: number;
}

/**
 * Per-OSID spatial-accuracy diagnostic — complements the faction-count delta
 * (`HistoricalControlAlignmentDiagnostics.counts_by_controller`) which only
 * measures whether sim and painted have the SAME TOTAL per faction, not whether
 * they have the SAME OSIDs.
 *
 * Two runs can have identical count deltas while one is spatially correct
 * (right factions in right places) and the other is spatially wrong (right
 * counts via the wrong captures). This metric distinguishes them.
 */
interface OsidPairMatchDiagnostics {
    reference_key: string;
    /** OSIDs present in BOTH the sim final state and the painted reference. */
    total_osids: number;
    /** Of those, OSIDs where sim controller === painted controller. */
    matched_osids: number;
    /**
     * matched_osids / total_osids ∈ [0, 1]. Named `match_ratio` (not
     * `match_percentage`) so the suffix matches
     * `shouldPreserveFractionalRunSummaryField` whitelist; otherwise
     * `integerizeRunSummaryCounts` rounds it to an integer at serialization.
     */
    match_ratio: number;
    /** Per-faction accuracy breakdown. */
    per_faction: OsidPairMatchRow[];
    /** First N OSID mismatches for debugging — capped to keep run_summary readable. */
    sample_mismatches: Array<{ osid: string; sim: string; painted: string }>;
}

interface HistoricalControlAlignmentDiagnostics {
    reference_key: string;
    reference_total: number;
    final_total: number;
    counts_by_controller: HistoricalControlDeltaRow[];
}

interface HistoricalAnchorCheck {
    anchor_type: 'settlement' | 'osid';
    anchor_id: string;
    expected_controller: string;
    actual_controller: string | null;
    passed: boolean;
}

interface OverrideInventoryEntry {
    mechanism: 'osid_control_overrides' | 'avoided_osids_by_faction';
    classification: 'initial_state_correction' | 'bot_compensation';
    active_entries: number;
    rationale: string;
}

function countControllers(snapshot: ControlKey[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of snapshot) {
        if (!row.controller) continue;
        counts.set(row.controller, (counts.get(row.controller) ?? 0) + 1);
    }
    return counts;
}

/**
 * Pick the historical-control reference key for a scenario based on its
 * declared duration. Scenarios that end at jan1993 (40w / 52w / 56w from
 * apr1992) compare to the jan1993 painted snapshot; longer scenarios pick
 * the closest later painted snapshot we maintain (apr1994 / apr1995 / oct1995).
 *
 * Wave 15 architectural fix: prior to this, scenario_runner hardcoded a
 * jan1993 reference for ALL apr1992 scenarios regardless of duration, so a
 * 188w run that ended in oct1995 was compared to a 30-month-stale snapshot.
 * Painted snapshots come from `data/source/calibration/painted_control_*.json`.
 */
function pickHistoricalReferenceKey(scenario: Scenario): 'jan1993' | 'apr1994' | 'apr1995' | 'oct1995' {
    const weeks = scenario.weeks ?? 0;
    if (weeks <= 56) return 'jan1993';   // 40w / 52w / 56w apr1992-start scenarios
    if (weeks <= 108) return 'apr1994';  // ~104 weeks from apr1992 → apr1994
    if (weeks <= 160) return 'apr1995';  // ~156 weeks from apr1992 → apr1995
    return 'oct1995';                     // ~187+ weeks → oct1995 endpoint
}

/**
 * Load a painted-control reference snapshot directly from
 * `data/source/calibration/painted_control_{refKey}.json` as a ControlKey[].
 *
 * The painted files are OSID-keyed under `by_settlement_id` (keys like
 * `op:banja_luka:banja_luka_2`). This loader bypasses the
 * `createInitialGameState` detour used for the legacy jan1993 path —
 * painted controls are already at OSID granularity, no municipality→OSID
 * promotion needed.
 */
async function loadPaintedControlReferenceSnapshot(
    refKey: string,
    baseDir: string
): Promise<ControlKey[]> {
    const path = join(baseDir, 'data', 'source', 'calibration', `painted_control_${refKey}.json`);
    const json = JSON.parse(await readFile(path, 'utf8')) as { by_settlement_id?: Record<string, string> };
    const bySettlement = json.by_settlement_id ?? {};
    const keys = Object.keys(bySettlement).sort(strictCompare);
    return keys.map((osid) => ({
        settlement_id: osid,
        municipality_id: osid.startsWith('op:') ? (osid.split(':')[1] ?? null) : null,
        controller: bySettlement[osid] ?? null,
    }));
}

/**
 * Compute per-OSID spatial-match diagnostic. For each OSID present in BOTH
 * the sim final state and the painted reference, check whether the sim
 * controller equals the painted controller. Counts matched + per-faction
 * accuracy + samples first 20 mismatches for debugging.
 *
 * Wave 27 (2026-05-23) added to complement the count-delta metric. Two runs
 * can have identical count deltas while one is spatially correct and the
 * other isn't — this metric makes the difference visible.
 */
function computeOsidPairMatchDiagnostics(
    final: ControlKey[],
    reference: ControlKey[],
    referenceKey: string
): OsidPairMatchDiagnostics {
    const refByOsid = new Map(reference.map((r) => [r.settlement_id, r.controller ?? 'null']));
    let total = 0;
    let matched = 0;
    const perFaction = new Map<string, { sim: number; painted: number; matched: number }>();
    const mismatches: Array<{ osid: string; sim: string; painted: string }> = [];
    const finalSorted = [...final].sort((a, b) => strictCompare(a.settlement_id, b.settlement_id));
    for (const row of finalSorted) {
        const ref = refByOsid.get(row.settlement_id);
        if (ref === undefined) continue;
        total++;
        const sim = row.controller ?? 'null';
        const painted = ref;
        for (const c of [sim, painted]) {
            if (!perFaction.has(c)) perFaction.set(c, { sim: 0, painted: 0, matched: 0 });
        }
        perFaction.get(sim)!.sim++;
        perFaction.get(painted)!.painted++;
        if (sim === painted) {
            matched++;
            perFaction.get(sim)!.matched++;
        } else if (mismatches.length < 20) {
            mismatches.push({ osid: row.settlement_id, sim, painted });
        }
    }
    const controllers = Array.from(perFaction.keys()).sort(strictCompare);
    return {
        reference_key: referenceKey,
        total_osids: total,
        matched_osids: matched,
        match_ratio: total > 0 ? matched / total : 0,
        per_faction: controllers.map((controller) => {
            const t = perFaction.get(controller)!;
            const denom = Math.max(t.sim, t.painted);
            return {
                controller,
                sim_count: t.sim,
                painted_count: t.painted,
                correctly_placed: t.matched,
                accuracy_ratio: denom > 0 ? t.matched / denom : 0,
            };
        }),
        sample_mismatches: mismatches,
    };
}

function computeHistoricalControlAlignmentDiagnostics(
    final: ControlKey[],
    reference: ControlKey[],
    referenceKey: string
): HistoricalControlAlignmentDiagnostics {
    const finalCounts = countControllers(final);
    const referenceCounts = countControllers(reference);
    const controllers = Array.from(new Set([...finalCounts.keys(), ...referenceCounts.keys()])).sort(strictCompare);
    return {
        reference_key: referenceKey,
        reference_total: reference.length,
        final_total: final.length,
        counts_by_controller: controllers.map((controller) => ({
            controller,
            reference_count: referenceCounts.get(controller) ?? 0,
            final_count: finalCounts.get(controller) ?? 0,
            delta: (finalCounts.get(controller) ?? 0) - (referenceCounts.get(controller) ?? 0)
        }))
    };
}

/**
 * Grade OSID anchors against the EPOCH-APPROPRIATE expectation set.
 *
 * The early-war (apr1992-dec1992) OSID list encodes 1992 controllers. Grading a
 * late-war scenario (e.g. 188w → Oct 1995) against it is wrong for OSIDs that
 * changed hands after Dec 1992. `resolveEpochOsidAnchors(epoch)` merges the
 * stable early-war anchors with the epoch-specific overrides (Srebrenica/Žepa →
 * RS, Velika Kladuša → RBiH, etc.), so the count reflects the right history at
 * the scenario's endpoint. The epoch is derived from the same reference key the
 * painted-control diagnostics use (`pickHistoricalReferenceKey`). This touches
 * ONLY the report/validation field — never sim state or the final hash.
 */
function computeHistoricalAnchorChecks(
    final: ControlKey[],
    epoch: 'jan1993' | 'apr1994' | 'apr1995' | 'oct1995'
): HistoricalAnchorCheck[] {
    const bySid = new Map(final.map((row) => [row.settlement_id, row.controller ?? null]));
    const settlementChecks = CANONICAL_HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992.map((anchor) => {
        const actual = bySid.get(anchor.settlement_id) ?? null;
        return {
            anchor_type: 'settlement' as const,
            anchor_id: anchor.settlement_id,
            expected_controller: anchor.expected_controller,
            actual_controller: actual,
            passed: actual === anchor.expected_controller
        };
    });
    const osidChecks = resolveEpochOsidAnchors(epoch).map((anchor) => {
        const actual = bySid.get(anchor.osid) ?? null;
        return {
            anchor_type: 'osid' as const,
            anchor_id: anchor.osid,
            expected_controller: anchor.expected_controller,
            actual_controller: actual,
            passed: actual === anchor.expected_controller
        };
    });
    return [...settlementChecks, ...osidChecks];
}

function buildOverrideInventory(scenario: Scenario): OverrideInventoryEntry[] {
    const osidOverrideCount = Object.keys(scenario.osid_control_overrides ?? {}).length;
    const avoidedOsidCount = Object.values(scenario.avoided_osids_by_faction ?? {})
        .reduce((sum, values) => sum + values.length, 0);
    return [
        {
            mechanism: 'osid_control_overrides',
            classification: 'initial_state_correction',
            active_entries: osidOverrideCount,
            rationale: 'Pins historically required starting control where OSID reality differs from the broader initialization substrate.'
        },
        {
            mechanism: 'avoided_osids_by_faction',
            classification: 'bot_compensation',
            active_entries: avoidedOsidCount,
            rationale: 'Biases faction targeting away from known ahistorical pressure paths without changing who starts in control.'
        }
    ];
}

/**
 * Deterministic unique run folder: read/increment a counter file under outDirBase.
 * No Date.now() or Math.random; safe for determinism static scan.
 */
async function getNextRunCounter(outDirBase: string): Promise<number> {
    const counterPath = join(outDirBase, '.run_counter');
    let n = 0;
    try {
        const s = await readFile(counterPath, 'utf8');
        n = parseInt(s, 10);
        if (!Number.isFinite(n) || n < 0) n = 0;
    } catch {
        // no file or invalid
    }
    await writeFile(counterPath, String(n + 1), 'utf8');
    return n;
}

/**
 * Write deterministic failure report artifacts (no timestamps).
 */
async function writeFailureReport(
    outDir: string,
    run_id: string,
    scenario_id: string,
    weeks: number,
    err: unknown
): Promise<void> {
    const error_name = err instanceof Error ? err.name : 'Error';
    const error_message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? err.stack : null;

    const txtLines = [
        'SCENARIO RUN FAILED',
        `run_id: ${run_id}`,
        `scenario: ${scenario_id}`,
        `weeks: ${weeks}`,
        `error_name: ${error_name}`,
        `error_message: ${error_message}`,
        'stack:',
        stack ?? '(no stack)'
    ];
    const failureReportPath = join(outDir, 'failure_report.txt');
    const failureReportJsonPath = join(outDir, 'failure_report.json');
    await ensureRunOutputDir(outDir);
    await writeFile(failureReportPath, txtLines.join('\n'), 'utf8');
    const failureJson = { run_id, scenario_id, weeks, error_name, error_message, stack };
    await writeFile(failureReportJsonPath, stableStringify(failureJson, 2), 'utf8');
}

async function ensureRunOutputDir(outDir: string): Promise<void> {
    await mkdir(outDir, { recursive: true });
}

/**
 * COLLAPSE PHASE IV-b — G2-A collapse-ON run marker (§6 review BLOCKING gap fix,
 * docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md).
 *
 * Collapse-ON runs (ENABLE_COLLAPSE=true, the IV-a env gate) write a SIDECAR marker
 * `collapse_enabled.json` into the run dir so the G2 §6 invariant test can verify an
 * artifact was genuinely produced with the collapse pipeline enabled — without it,
 * G2-GREEN against a collapse-OFF artifact is a false-green for §6. Sidecar file (NOT
 * embedded in final_save.json, NOT persisted game state): the canonical save hash and
 * the save schema are untouched. Content is constant — no timestamps, no RNG.
 *
 * IV-b D2 (review-383 BLOCKING defect fix): the marker must never survive a
 * collapse-OFF rerun of a REUSED run dir (uniqueRunFolder defaults to false), or G2-A
 * would assert the §6 collapse-ON proof against an OFF artifact — exactly the
 * false-green G2-A exists to kill. On the OFF path, delete any stale marker at
 * save-write time. Fresh OFF runs have no marker → rm is a no-op (force: true) and the
 * OFF path's final_save bytes are untouched either way. Pre-marker artifacts (IV-a era,
 * no sidecar) classify as collapse-OFF by design.
 *
 * Exported for the marker-hygiene regression test (collapse run-dir reuse).
 */
export async function syncCollapseEnabledMarker(outDir: string): Promise<void> {
    const collapseMarkerPath = join(outDir, 'collapse_enabled.json');
    if (process.env.ENABLE_COLLAPSE === 'true') {
        await writeFile(
            collapseMarkerPath,
            stableStringify({ collapse_enabled: true, gate: 'ENABLE_COLLAPSE' }, 2),
            'utf8'
        );
    } else {
        await rm(collapseMarkerPath, { force: true });
    }
}

type ScenarioTimingBucket =
    | 'setup'
    | 'simulation'
    | 'diagnostics_reporting'
    | 'serialization_artifacts';

type ScenarioTimingTotals = Record<ScenarioTimingBucket, bigint>;

const SCENARIO_TIMING_NOTES: Record<ScenarioTimingBucket, string> = {
    setup: 'Scenario load, run folder preparation, startup state construction, and resume-save hydration.',
    simulation: 'Turn pipeline and scenario-state mutation boundaries; some in-loop aggregation remains here where current code interleaves it with state updates.',
    diagnostics_reporting: 'Weekly report projection and end-of-run diagnostics/report model construction.',
    serialization_artifacts: 'Stable JSON serialization, stream/file writes, final save hashing, replay finalization, and artifact-path handoff work.',
};

function createScenarioTimingTotals(): ScenarioTimingTotals {
    return {
        setup: 0n,
        simulation: 0n,
        diagnostics_reporting: 0n,
        serialization_artifacts: 0n,
    };
}

function timingStart(enabled: boolean): bigint {
    return enabled ? process.hrtime.bigint() : 0n;
}

function timingAdd(totals: ScenarioTimingTotals, bucket: ScenarioTimingBucket, start: bigint): void {
    if (start === 0n) return;
    totals[bucket] += process.hrtime.bigint() - start;
}

async function timedAsync<T>(
    enabled: boolean,
    totals: ScenarioTimingTotals,
    bucket: ScenarioTimingBucket,
    fn: () => Promise<T>,
): Promise<T> {
    const start = timingStart(enabled);
    try {
        return await fn();
    } finally {
        timingAdd(totals, bucket, start);
    }
}

function timedSync<T>(
    enabled: boolean,
    totals: ScenarioTimingTotals,
    bucket: ScenarioTimingBucket,
    fn: () => T,
): T {
    const start = timingStart(enabled);
    try {
        return fn();
    } finally {
        timingAdd(totals, bucket, start);
    }
}

function nsToMs(value: bigint): number {
    return Math.round((Number(value) / 1_000_000) * 1000) / 1000;
}

// Batch-33 serialization attribution: module-local accumulator gated by
// PERF_PROFILE_SERIALIZATION=true. Independent of the --timing-json bucket
// gate so the default 40w npm script (which omits --timing-json) can profile.
// Dumped to stderr in the runScenario `finally` block. Use this surface to
// identify the next byte-identical serialization optimization target;
// see docs/40_reports/implemented/20260518_BATCH33_SERIALIZATION_ATTRIBUTION.md
// for the n1911 baseline and the consumer-audit verdict on the replay-frame
// downgrade option.
const _serDetailNs = new Map<string, bigint>();
const _serDetailCalls = new Map<string, number>();
const _serDetailEnabled = (): boolean =>
    typeof process !== 'undefined' && process.env?.PERF_PROFILE_SERIALIZATION === 'true';

function _serTimeSync<T>(
    enabled: boolean,
    totals: ScenarioTimingTotals,
    label: string,
    fn: () => T,
): T {
    // SPIKE: timer is started if EITHER the timing-json bucket gate is on OR the
    // serialization detail gate is on. Detail recording must not be coupled to
    // --timing-json since the default 40w npm script omits that flag.
    const detailOn = _serDetailEnabled();
    const start = (enabled || detailOn) ? process.hrtime.bigint() : 0n;
    try {
        return fn();
    } finally {
        if (start !== 0n) {
            const ns = process.hrtime.bigint() - start;
            if (enabled) totals.serialization_artifacts += ns;
            if (detailOn) {
                _serDetailNs.set(label, (_serDetailNs.get(label) ?? 0n) + ns);
                _serDetailCalls.set(label, (_serDetailCalls.get(label) ?? 0) + 1);
            }
        }
    }
}

async function _serTimeAsync<T>(
    enabled: boolean,
    totals: ScenarioTimingTotals,
    label: string,
    fn: () => Promise<T>,
): Promise<T> {
    const detailOn = _serDetailEnabled();
    const start = (enabled || detailOn) ? process.hrtime.bigint() : 0n;
    try {
        return await fn();
    } finally {
        if (start !== 0n) {
            const ns = process.hrtime.bigint() - start;
            if (enabled) totals.serialization_artifacts += ns;
            if (detailOn) {
                _serDetailNs.set(label, (_serDetailNs.get(label) ?? 0n) + ns);
                _serDetailCalls.set(label, (_serDetailCalls.get(label) ?? 0) + 1);
            }
        }
    }
}

function _serDetailDumpToStderr(): void {
    if (!_serDetailEnabled() || _serDetailNs.size === 0) return;
    const rows: Array<{ label: string; ms: number; calls: number }> = [];
    for (const [label, ns] of _serDetailNs.entries()) {
        rows.push({
            label,
            ms: nsToMs(ns),
            calls: _serDetailCalls.get(label) ?? 0,
        });
    }
    rows.sort((a, b) => b.ms - a.ms);
    process.stderr.write('\n[serialization-detail] sub-label breakdown:\n');
    for (const row of rows) {
        process.stderr.write(`  ${row.label.padEnd(28)} ${row.ms.toFixed(1).padStart(10)} ms  ×${row.calls}\n`);
    }
    const totalLabeledMs = rows.reduce((acc, r) => acc + r.ms, 0);
    process.stderr.write(`  ${'(labeled total)'.padEnd(28)} ${totalLabeledMs.toFixed(1).padStart(10)} ms\n`);
    _serDetailNs.clear();
    _serDetailCalls.clear();
}

function buildScenarioTimingJson(args: {
    run_id: string;
    scenario_id: string;
    weeks: number;
    final_state_hash: string;
    totals: ScenarioTimingTotals;
    totalNs: bigint;
}): Record<string, unknown> {
    return {
        schema_version: 1,
        run_id: args.run_id,
        scenario_id: args.scenario_id,
        weeks: args.weeks,
        final_state_hash: args.final_state_hash,
        buckets_ms: {
            diagnostics_reporting: nsToMs(args.totals.diagnostics_reporting),
            serialization_artifacts: nsToMs(args.totals.serialization_artifacts),
            setup: nsToMs(args.totals.setup),
            simulation: nsToMs(args.totals.simulation),
            total: nsToMs(args.totalNs),
        },
        notes: SCENARIO_TIMING_NOTES,
    };
}

/**
 * Run scenario: load, normalize, create state, run N weeks, emit artifacts.
 * Writes run_meta.json immediately after creating outDir so the directory is never empty.
 * On any throw after that, writes failure_report.txt and failure_report.json then rethrows.
 */
/** Phase H1.8: Build a scenario with probe_intent actions stripped (for baseline run). */
export function scenarioWithoutProbeIntent(scenario: Scenario): Scenario {
    return {
        ...scenario,
        turns: (scenario.turns ?? []).map((t) => ({
            week_index: t.week_index,
            actions: normalizeActions(t.actions.filter((a) => a.type !== 'probe_intent'))
        }))
    };
}

/** H1.11: Collect settlement IDs from War phase front descriptors filtered by stability. Edge ID format: a__b. */
function settlementIdsFromFrontDescriptors(
    descriptors: Array<{ edge_ids: string[]; stability: string }> | undefined,
    stabilityFilter: 'static' | 'fluid'
): string[] {
    if (!descriptors || descriptors.length === 0) return [];
    const set = new Set<string>();
    for (const d of descriptors) {
        if (d.stability !== stabilityFilter) continue;
        for (const eid of d.edge_ids) {
            const parts = eid.split('__');
            const [left, right] = parts;
            if (left !== undefined && right !== undefined) {
                set.add(left);
                set.add(right);
            }
        }
    }
    return Array.from(set).sort(strictCompare);
}

/**
 * Create OOB formations at Peace phase entry via recruitment or legacy auto-spawn.
 * Shared helper to avoid duplication across startup and Phase 0→I transitions.
 */
async function createOobFormations(
    state: GameState,
    scenario: Scenario,
    oobCorps: OobCorps[],
    oobBrigades: OobBrigade[],
    settlements: Map<string, import('../map/settlements.js').SettlementRecord>,
    municipalityHqSettlement: Record<string, string>,
    sidToMun: Map<string, string>,
    municipalityPopulation1991: MunicipalityPopulation1991 | undefined,
    canonicalToOperational?: import('../data/operational_data.js').CanonicalToOperationalMap,
    operationalData?: Awaited<ReturnType<typeof loadOperationalData>> | null,
    baseDir?: string
): Promise<void> {
    if (scenario.recruitment_mode === 'player_choice') {
        // Ensure peace phase militia strength exists before deriving pool availability.
        if (!state.military.war_militia_strength || Object.keys(state.military.war_militia_strength).length === 0) {
            updateMilitiaEmergence(state);
        }
        // Recruitment spends from militia pools; seed them first at Peace phase entry.
        if (!state.military.militia_pools || Object.keys(state.military.militia_pools).length === 0) {
            runPoolPopulation(state, settlements, municipalityPopulation1991);
            applyRsJnaInheritanceBonus(state, municipalityPopulation1991);
        }
        const factionIds = (state.factions ?? []).map(f => f.id);
        const resources = initializeRecruitmentResources(
            factionIds,
            scenario.recruitment_capital,
            scenario.equipment_points,
            scenario.recruitment_capital_trickle,
            scenario.equipment_points_trickle,
            scenario.max_recruits_per_faction_per_turn
        );
        state.military.recruitment_state = resources;
        if (scenario.no_initial_brigade_formations) {
            createOobFormationsAtPhaseIEntry(
                state,
                oobCorps,
                [],
                municipalityHqSettlement,
                sidToMun,
                municipalityPopulation1991,
                canonicalToOperational
            );
            safeDebugLog('[Recruitment] Deferred start enabled: initial setup created corps/army_hq only.');
            return;
        }
        const report = runBotRecruitment(state, oobCorps, oobBrigades, resources, sidToMun, municipalityHqSettlement, { canonicalToOperational });
        safeDebugLog(
            `[Recruitment] Mandatory: ${report.mandatory_recruited}, ` +
            `Elective: ${report.elective_recruited}, ` +
            `Skipped: control=${report.brigades_skipped_no_control} ` +
            `manpower=${report.brigades_skipped_no_manpower} ` +
            `capital=${report.brigades_skipped_no_capital} ` +
            `equipment=${report.brigades_skipped_no_equipment}`
        );
        for (const faction of factionIds) {
            safeDebugLog(
                `  ${faction}: capital=${report.remaining_capital[faction] ?? 0} ` +
                `equipment=${report.remaining_equipment[faction] ?? 0}`
            );
        }
    } else if (scenario.init_formations_oob) {
        createOobFormationsAtPhaseIEntry(state, oobCorps, oobBrigades, municipalityHqSettlement, sidToMun, municipalityPopulation1991, canonicalToOperational);
    }

    // Spread brigades from stacked HQ OSIDs to front-line positions.
    // Requires operational data (edges + reverse map) for OSID graph analysis.
    if (operationalData?.operationalToCanonical) {
        try {
            const opEdges = await loadOperationalEdges(baseDir);
            if (opEdges.length > 0) {
                const spreadReport = spreadBrigadesToFrontOsids(state, opEdges, operationalData.operationalToCanonical);
                const totalSpread = Object.values(spreadReport.brigades_spread).reduce((a, b) => a + b, 0);
                const totalCovered = Object.values(spreadReport.front_osids_covered).reduce((a, b) => a + b, 0);
                safeDebugLog(`[Placement] Spread ${totalSpread} brigades to front; ${totalCovered} front OSIDs now covered`);
                for (const faction of Object.keys(spreadReport.brigades_spread).sort()) {
                    safeDebugLog(`  ${faction}: spread=${spreadReport.brigades_spread[faction]} covered=${spreadReport.front_osids_covered[faction]}`);
                }
            }
        } catch (e) {
            safeDebugLog(`[Placement] Skipped front spreading: ${(e as Error).message}`);
        }
    }
}

function buildPlannedWarStartBrigadePresenceByMunicipality(
    oobBrigades: OobBrigade[],
    warStartTurn: number
): PlannedWarStartBrigadePresenceByMunicipality | undefined {
    const byMun: PlannedWarStartBrigadePresenceByMunicipality = {};
    for (const brigade of oobBrigades) {
        if (brigade.kind !== 'brigade') continue;
        if (!Number.isFinite(brigade.available_from) || brigade.available_from > warStartTurn) continue;
        const existing = byMun[brigade.home_mun] ?? {};
        existing[brigade.faction] = true;
        byMun[brigade.home_mun] = existing;
    }
    return Object.keys(byMun).length > 0 ? byMun : undefined;
}

/** Collect summary of active (not-yet-completed) operations at run end. */
function collectActiveOperations(state: GameState): ActiveOperationSummary[] {
    const cc = state.military.corps_command;
    if (!cc) return [];
    const results: ActiveOperationSummary[] = [];
    const corpsIds = Object.keys(cc).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = cc[corpsId];
        if (!cmd?.active_operations?.length) continue;
        for (const op of cmd.active_operations) {
        // Collect objectives
        const objectives: string[] = [];
        if (op.axes) {
            for (const axis of op.axes) {
                if (axis.objectives) {
                    for (const o of axis.objectives) {
                        if (!objectives.includes(o)) objectives.push(o);
                    }
                }
            }
        } else if (op.objectives) {
            for (const o of op.objectives) {
                if (!objectives.includes(o)) objectives.push(o);
            }
        }
        const totalAttacks = op.weekly_log
            ? op.weekly_log.reduce((s, e) => s + e.attacks_this_turn, 0)
            : (op.attack_attempt_count ?? 0);
        const objsCaptured = op.objective_capture_count ?? 0;
        results.push({
            corps_id: corpsId,
            operation_name: op.name,
            phase: op.phase,
            started_turn: op.started_turn,
            total_attacks: totalAttacks,
            objectives_targeted: objectives.length,
            objectives_captured: objsCaptured,
        });
        } // end for-of active_operations
    }
    return results;
}

type HistoricalNameLookup = (faction: string, mun_id: string, ordinal: number) => string | null;

interface ScenarioStartupBuildResult {
    state: GameState;
    graph: Awaited<ReturnType<typeof loadSettlementGraph>>;
    municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    settlementPopulationBySid: Record<string, number> | undefined;
    settlementDataRaw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> | undefined;
    oobBrigades: OobBrigade[];
    oobCorps: OobCorps[];
    municipalityHqSettlement: Record<string, string>;
    operationalData: Awaited<ReturnType<typeof loadOperationalData>> | null;
    operationalCentroids: Awaited<ReturnType<typeof loadOperationalCentroids>> | undefined;
    historicalNameLookup?: HistoricalNameLookup;
    sidToMun: Map<string, string>;
    initOverrideChangeCount: number;
}

function validateScenarioMustHoldContract(
    scenario: Awaited<ReturnType<typeof loadScenario>>,
    liveCorpsIdsSource: Iterable<string>,
    operationalData: Awaited<ReturnType<typeof loadOperationalData>> | null
): void {
    const mustHold = scenario.must_hold_osids_by_corps;
    if (!mustHold || Object.keys(mustHold).length === 0) return;

    const liveCorpsIds = new Set(liveCorpsIdsSource);
    const realOsids = operationalData ? new Set(operationalData.operationalToCanonical.keys()) : null;
    const problems: string[] = [];

    for (const corpsId of Object.keys(mustHold).sort(strictCompare)) {
        if (!liveCorpsIds.has(corpsId)) {
            problems.push(`unknown corps "${corpsId}"`);
        }
        for (const osid of mustHold[corpsId] ?? []) {
            if (realOsids && !realOsids.has(osid)) {
                problems.push(`unknown OSID "${osid}" for corps "${corpsId}"`);
            }
        }
    }

    if (problems.length > 0) {
        throw new Error(`Scenario must_hold_osids_by_corps contract invalid: ${problems.join('; ')}`);
    }
}

export async function buildScenarioStartupState(
    scenario: Awaited<ReturnType<typeof loadScenario>>,
    baseDir: string
): Promise<ScenarioStartupBuildResult> {
    const controlPath = scenario.init_control ? resolveInitControlPath(scenario.init_control, baseDir) : undefined;
    const formationsPath = scenario.init_formations ? resolveInitFormationsPath(scenario.init_formations, baseDir) : undefined;

    // Use canonical graph for init and run so control keys match recruitment (sidToMun / factionHasPresenceInMun).
    const graph = await loadSettlementGraph({
        settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
        edgesPath: join(baseDir, 'data/derived/settlement_edges.json')
    });

    let municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    let settlementPopulationBySid: Record<string, number> | undefined;
    try {
        const popPath = join(baseDir, 'data/derived/municipality_population_1991.json');
        const popRaw = JSON.parse(await readFile(popPath, 'utf8')) as {
            by_mun1990_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }>;
            by_municipality_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number }; mun1990_id?: string }>;
        };
        // Support both keying schemes: by_mun1990_id (kebab-case keys) or by_municipality_id (numeric keys with mun1990_id field)
        const byMunDirect = popRaw.by_mun1990_id;
        const byNumericId = popRaw.by_municipality_id;
        const flat: MunicipalityPopulation1991 = {};
        const addEntry = (munId: string, v: { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }) => {
            const b = v?.breakdown;
            flat[munId] = { total: v?.total ?? 0, bosniak: b?.bosniak ?? 0, serb: b?.serb ?? 0, croat: b?.croat ?? 0, other: b?.other ?? 0 };
        };
        if (byMunDirect && Object.keys(byMunDirect).length > 0) {
            for (const [munId, v] of Object.entries(byMunDirect)) addEntry(munId, v);
        } else if (byNumericId) {
            for (const [_numId, v] of Object.entries(byNumericId)) {
                if (v?.mun1990_id) addEntry(v.mun1990_id, v);
            }
        }
        municipalityPopulation1991 = flat;
    } catch {
        municipalityPopulation1991 = undefined;
    }
    try {
        const censusPath = join(baseDir, 'data/derived/census_rolled_up_wgs84.json');
        const censusRaw = JSON.parse(await readFile(censusPath, 'utf8')) as {
            by_sid?: Record<string, { p?: number[] }>;
        };
        const bySid = censusRaw.by_sid ?? {};
        const popBySid: Record<string, number> = {};
        for (const [sid, v] of Object.entries(bySid)) {
            const p = v?.p;
            if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'number' && p[0] > 0) {
                popBySid[sid] = p[0];
            }
        }
        settlementPopulationBySid = Object.keys(popBySid).length > 0 ? popBySid : undefined;
    } catch {
        settlementPopulationBySid = undefined;
    }
    let settlementDataRaw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> | undefined;
    try {
        const ethnicityData = await loadSettlementEthnicityData(join(baseDir, 'data/derived/settlement_ethnicity_data.json'));
        const sids = Array.from(graph.settlements.keys()).sort((a, b) => a.localeCompare(b));
        const raw: Array<{ sid: string; ethnicity?: { composition?: Record<string, number> }; population?: number }> = [];
        for (const sid of sids) {
            const entry = ethnicityData.by_settlement_id?.[sid];
            const pop = settlementPopulationBySid?.[sid];
            raw.push({
                sid,
                ...(entry?.composition ? { ethnicity: { composition: entry.composition } } : {}),
                ...(pop != null ? { population: pop } : {})
            });
        }
        settlementDataRaw = raw.length > 0 ? raw : undefined;
    } catch {
        settlementDataRaw = undefined;
    }
    let oobBrigades: OobBrigade[] = [];
    let oobCorps: OobCorps[] = [];
    let municipalityHqSettlement: Record<string, string> = {};
    let operationalData: Awaited<ReturnType<typeof loadOperationalData>> | null = null;
    let operationalCentroids: Awaited<ReturnType<typeof loadOperationalCentroids>> | undefined;
    try {
        operationalData = await loadOperationalData(baseDir);
        operationalCentroids = await loadOperationalCentroids(baseDir);
    } catch {
        // canonical_to_operational_map.json may be missing; location_osid will not be set
    }
    // Initialize data-driven terrain classification sets before combat runs.
    // Keep Node-only file loading out of combat_math so browser map bundles can
    // safely import the combat helpers without pulling in fs/path.
    setUrbanOsidSet(loadUrbanOsidSet());
    setForestOsidSet(loadForestOsidSet());
    if (scenario.init_formations_oob || scenario.recruitment_mode === 'player_choice') {
        oobBrigades = await loadOobBrigades(baseDir);
        oobCorps = await loadOobCorps(baseDir);
        municipalityHqSettlement = await loadMunicipalityHqSettlement(baseDir);
    } else if (scenario.formation_spawn_directive) {
        oobBrigades = await loadOobBrigades(baseDir);
    }
    /** Historical names for emergent brigades: (faction, home_mun) -> names[] in deterministic order. */
    const oobNamesByFactionMun = new Map<string, string[]>();
    for (const b of oobBrigades) {
        const key = `${b.faction}:${b.home_mun}`;
        const list = oobNamesByFactionMun.get(key) ?? [];
        list.push(b.name);
        oobNamesByFactionMun.set(key, list);
    }
    for (const list of oobNamesByFactionMun.values()) {
        list.sort((a, b) => a.localeCompare(b));
    }
    const historicalNameLookup =
        oobNamesByFactionMun.size > 0
            ? (faction: string, mun_id: string, ordinal: number): string | null => {
                const list = oobNamesByFactionMun.get(`${faction}:${mun_id}`);
                const name = list != null && ordinal >= 1 && ordinal <= list.length ? list[ordinal - 1] : null;
                return name ?? null;
            }
            : undefined;
    let sidToMun = buildSidToMunFromSettlements(graph.settlements);
    let initOverrideChangeCount = 0;
    const canonicalSidToMun = sidToMun; // Preserve original canonical SID→mun map for later rebuilds
    const warStartTurnForOrgPenSeeding =
        scenario.start_lifecycle_phase === 'peace'
            ? (scenario.peace_war_start_turn ?? (scenario.peace_referendum_turn ?? 0) + 4)
            : 0;
    const plannedWarStartBrigadeByMun = buildPlannedWarStartBrigadePresenceByMunicipality(
        oobBrigades,
        warStartTurnForOrgPenSeeding
    );
    let municipalityControllerByMun: Record<string, FactionId | null> | undefined;
    if (controlPath) {
        try {
            municipalityControllerByMun = await loadInitialMunicipalityControllers1990(controlPath);
        } catch {
            municipalityControllerByMun = undefined;
        }
    }
    const organizationalPenetrationSeed: OrganizationalPenetrationSeedOptions = {
        ...(municipalityControllerByMun ? { municipality_controller_by_mun: municipalityControllerByMun } : {}),
        ...(municipalityPopulation1991 ? { population_1991_by_mun: municipalityPopulation1991 } : {}),
        ...(plannedWarStartBrigadeByMun ? { planned_war_start_brigade_by_mun: plannedWarStartBrigadeByMun } : {})
    };

    const initOptions =
        scenario.init_control_mode
            ? {
                init_control_mode: scenario.init_control_mode,
                ethnic_override_threshold: scenario.ethnic_override_threshold,
                ...(baseDir ? { ethnicity_data_path: join(baseDir, 'data/derived/settlement_ethnicity_data.json') } : {})
            }
            : undefined;
    let state = await createInitialGameState('harness-seed', controlPath, initOptions, {
        baseDir,
        organizationalPenetrationSeed,
        settlementGraph: graph,
        operationalData: operationalData ?? undefined
    });
    // Harness-path player_faction fallback. The inner `createInitialGameState` call above
    // intentionally leaves player_faction undefined as the canonical faction-neutral state.
    // Scenario JSON may author a player_faction, but default historical scenario
    // data remains faction-neutral.
    //
    // Default to `null` (no player) for headless harness runs so the event evaluator
    // takes the bot-auto-respond path for every faction — including the 15+ events
    // authored with `requires_player_response: true`. The earlier 'RBiH' default
    // caused those events to queue-pending-forever, never applying their downstream
    // consequences (dimension shifts, additional sets_flags, mechanical effects from
    // chosen response branches). n1999 verification surfaced 15 RBiH events stuck
    // through the full 188-turn run.
    //
    // Scenario JSON can still author `player_faction` explicitly when an event-rich
    // RBiH/RS/HRHB lens is wanted; this only changes the harness default.
    const authoredPlayerFaction = state.meta.player_faction ?? scenario.player_faction;
    if (authoredPlayerFaction !== undefined && authoredPlayerFaction !== null) {
        state.meta.player_faction = authoredPlayerFaction;
    }
    if (scenario.decision_mode !== undefined) {
        state.meta.decision_mode = scenario.decision_mode;
    }
    // else: leave undefined — event evaluator's `playerFaction != null` gate then
    // routes every event with `requires_player_response: true` through the bot
    // auto-respond path, as a headless harness run requires.
    // A2 Dayton close-out (task #71): default-off flag; only set on meta when the
    // scenario explicitly opts in. Pulls the Dayton trigger to w180 and arms the
    // post-loop terminal resolution below. Omitted by calibration scenarios so their
    // 188w/40w baselines (and the t188 pending_dayton snapshot) stay byte-identical.
    if (scenario.dayton_close_out === true) {
        state.meta.dayton_close_out = true;
    }
    state.meta.headless_scenario_auto_control = true;

    // After state creation, political_controllers may have been promoted to OSID keys
    // (OSID-as-base-layer). Rebuild sidToMun as OSID→mun so factionHasPresenceInMun,
    // resolveValidHqSid, and other consumers match the pc keying scheme.
    if (operationalData?.operationalToCanonical) {
        const pc = state.political.political_controllers ?? {};
        const firstKey = Object.keys(pc)[0];
        if (firstKey?.startsWith('op:')) {
            sidToMun = buildOsidToMunFromReverseMap(
                operationalData.operationalToCanonical,
                canonicalSidToMun
            );
        }
    }

    // Apply ethnic-majority OSID control from derived data.
    if (operationalData?.operationalToCanonical) {
        try {
            let bySettlementId: Record<string, string> | undefined;
            if (scenario.initial_osid_controllers && Object.keys(scenario.initial_osid_controllers).length > 0) {
                bySettlementId = scenario.initial_osid_controllers;
            } else {
                const opControlPath = join(baseDir ?? '', 'data/derived/operational/operational_political_control.json');
                const opControlRaw = JSON.parse(await readFile(opControlPath, 'utf8')) as {
                    by_settlement_id?: Record<string, string>;
                };
                bySettlementId = opControlRaw.by_settlement_id;
            }
            if (bySettlementId) {
                const pc = state.political.political_controllers ?? {};
                const sortedOsids = Object.keys(bySettlementId).sort((a, b) => a.localeCompare(b));
                for (const osid of sortedOsids) {
                    const faction = bySettlementId[osid];
                    if (faction) pc[osid] = faction;
                }
                state.political.political_controllers = pc;
                // Reset contested_control to match (ethnic-based start = no contested)
                if (state.political.contested_control) {
                    for (const osid of sortedOsids) {
                        state.political.contested_control[osid] = false;
                    }
                }
            }
        } catch {
            // Non-fatal: fall through to existing municipality-based control
        }
        // Rebuild sidToMun after ethnic control override (always use original canonical map as base)
        sidToMun = buildOsidToMunFromReverseMap(
            operationalData.operationalToCanonical,
            canonicalSidToMun
        );
    }

    // Apply per-OSID political control overrides from scenario config (after ethnic control, before OOB).
    if (!scenario.initial_osid_controllers && scenario.osid_control_overrides && Object.keys(scenario.osid_control_overrides).length > 0) {
        const beforeOverrideControllers = { ...(state.political.political_controllers ?? {}) };
        applyOsidControlOverrides(state, scenario.osid_control_overrides);
        initOverrideChangeCount = countInitOverrideChanges(
            beforeOverrideControllers,
            state.political.political_controllers ?? {},
            scenario.osid_control_overrides
        );
        if (operationalData?.operationalToCanonical) {
            sidToMun = buildOsidToMunFromReverseMap(
                operationalData.operationalToCanonical,
                canonicalSidToMun
            );
        }
    }

    // Snapshot initial control for timeline provenance (before any sim turns mutate political_controllers).
    state.political.initial_political_controllers = { ...state.political.political_controllers };

    if (typeof scenario.war_entrenchment_init_turns === 'number') {
        state.meta.war_entrenchment_init_turns = scenario.war_entrenchment_init_turns;
    }
    if (typeof scenario.war_force_transition_after_turns === 'number') {
        state.meta.war_force_transition_after_turns = scenario.war_force_transition_after_turns;
    } else if (scenario.start_lifecycle_phase === 'war' || scenario.start_lifecycle_phase === 'peace') {
        state.meta.war_force_transition_after_turns = 52;
    }

    if (scenario.recruitment_mode === 'bottom_up' || scenario.recruitment_mode === 'player_choice') {
        state.meta.recruitment_mode = scenario.recruitment_mode;
    }

    if (typeof scenario.max_turns === 'number') {
        state.meta.max_turns = scenario.max_turns;
    }
    if (scenario.victory_conditions) {
        state.meta.victory_conditions = scenario.victory_conditions;
    }
    if (scenario.sarajevo_overrides) {
        state.meta.sarajevo_overrides = scenario.sarajevo_overrides;
    }

    if (scenario.supply_reserves_enabled) {
        state.meta.supply_reserves_enabled = true;
        ensureSupplyReserves(state);
        applyJnaInheritanceBonus(state);
    }

    if (scenario.war_timeline) {
        const { validateWarTimeline } = await import('../state/war_timeline.js');
        const timelinePath = join(baseDir, `data/scenarios/timelines/${scenario.war_timeline}.json`);
        let timelineRaw: unknown;
        try {
            timelineRaw = JSON.parse(await readFile(timelinePath, 'utf8'));
        } catch (err) {
            throw new Error(`Failed to load war timeline "${scenario.war_timeline}" from ${timelinePath}: ${err instanceof Error ? err.message : err}`);
        }
        state.military.war_timeline = validateWarTimeline(timelineRaw);
    }

    if (scenario.init_officers) {
        const { validateOfficerData, initializeNamedOfficers } = await import('../sim/combat/officer_system.js');
        const officerPath = join(baseDir, `data/scenarios/officers/${scenario.init_officers}_officers.json`);
        let officerRaw: unknown;
        try {
            officerRaw = JSON.parse(await readFile(officerPath, 'utf8'));
        } catch (err) {
            throw new Error(`Failed to load officers "${scenario.init_officers}" from ${officerPath}: ${err instanceof Error ? err.message : err}`);
        }
        const officerData = validateOfficerData(officerRaw);
        initializeNamedOfficers(state, officerData);
    }

    // ───────────────────────────────────────────────────────────────────────
    // LANE-NIGHTSHIFT-B2-POLITICAL-LEADER-DATA-INTEGRATION
    // Populate canonical political_leader_data + political_leaders substrate
    // for B1's producePoliticalDirective. Faction-symmetric loader; faction-
    // asymmetric DATA. Short-circuits when B2_POLITICAL_LEADER_DATA_DISABLED
    // env flag is set or when the JSON is unavailable (pre-B2 saves pass).
    // DDR: 941bd68e + 168d65c2. B1: 44053a32.
    // ───────────────────────────────────────────────────────────────────────
    {
        const leaderDataPath = join(baseDir, 'data/scenarios/political_leader_data.json');
        applyPoliticalLeaderDataInit(state, leaderDataPath);
    }

    if (scenario.avoided_osids_by_faction && Object.keys(scenario.avoided_osids_by_faction).length > 0) {
        state.meta.avoided_osids_by_faction = scenario.avoided_osids_by_faction;
    }

    if (formationsPath && !scenario.init_formations_oob) {
        const initialFormations = await loadInitialFormations(formationsPath);
        if (!state.military.formations) state.military.formations = {};
        for (const f of initialFormations) {
            state.military.formations[f.id] = f;
        }
    }

    if (scenario.start_lifecycle_phase === 'peace') {
        const referendumHeldAtStart = scenario.peace_referendum_held_at_start ?? true;
        const refTurn = scenario.peace_referendum_turn ?? 0;
        const warTurn = scenario.peace_war_start_turn ?? refTurn + 4;
        const warStartControlPath = scenario.peace_war_start_control
            ? resolveInitControlPath(scenario.peace_war_start_control, baseDir)
            : undefined;
        state.meta.phase = 'peace';
        state.meta.turn = 0;
        state.meta.referendum_held = referendumHeldAtStart;
        state.meta.referendum_turn = referendumHeldAtStart ? refTurn : null;
        state.meta.war_start_turn = referendumHeldAtStart ? warTurn : null;
        state.meta.peace_scheduled_referendum_turn = referendumHeldAtStart ? null : refTurn;
        state.meta.peace_scheduled_war_start_turn = referendumHeldAtStart ? null : warTurn;
        state.meta.peace_war_start_control_path = warStartControlPath ?? null;
        state.meta.referendum_eligible_turn = null;
        state.meta.referendum_deadline_turn = null;
        state.meta.game_over = false;
        state.meta.outcome = undefined;
        const rsDeclaredAtStart = scenario.peace_rs_declared_at_start ?? true;
        const hrhbDeclaredAtStart = scenario.peace_hrhb_declared_at_start ?? true;
        for (const f of state.factions ?? []) {
            if (f.id === 'RS') (f as { prewar_capital?: number }).prewar_capital = 100;
            if (f.id === 'RBiH') (f as { prewar_capital?: number }).prewar_capital = 70;
            if (f.id === 'HRHB') (f as { prewar_capital?: number }).prewar_capital = 40;
            (f as { declaration_pressure?: number }).declaration_pressure = 0;
            if (f.id === 'RS') {
                (f as { declared?: boolean }).declared = rsDeclaredAtStart;
                (f as { declaration_turn?: number | null }).declaration_turn = rsDeclaredAtStart ? 0 : null;
            }
            if (f.id === 'HRHB') {
                (f as { declared?: boolean }).declared = hrhbDeclaredAtStart;
                (f as { declaration_turn?: number | null }).declaration_turn = hrhbDeclaredAtStart ? 0 : null;
            }
        }
    }

    if (scenario.start_lifecycle_phase === 'war') {
        state.meta.phase = 'war';
        state.meta.turn = 0;
        state.meta.referendum_held = true;
        state.meta.referendum_turn = 0;
        state.meta.war_start_turn = 0;
        state.meta.peace_scheduled_referendum_turn = null;
        state.meta.peace_scheduled_war_start_turn = null;
        state.meta.peace_war_start_control_path = null;
        state.meta.rbih_hrhb_war_earliest_turn = scenario.rbih_hrhb_war_earliest_week ?? 26;
        if (scenario.enable_rbih_hrhb_dynamics === false) {
            state.meta.enable_rbih_hrhb_dynamics = false;
        }
        ensureRbihHrhbState(state, scenario.init_alliance_rbih_hrhb, scenario.init_mixed_municipalities);
        for (const f of state.factions ?? []) {
            if (f.id === 'RS') (f as { prewar_capital?: number }).prewar_capital = 100;
            if (f.id === 'RBiH') (f as { prewar_capital?: number }).prewar_capital = 70;
            if (f.id === 'HRHB') (f as { prewar_capital?: number }).prewar_capital = 40;
            (f as { declaration_pressure?: number }).declaration_pressure = 0;
            if (f.id === 'RS' || f.id === 'HRHB') {
                (f as { declared?: boolean }).declared = true;
                (f as { declaration_turn?: number | null }).declaration_turn = 0;
            }
            (f as { areasOfResponsibility?: string[] }).areasOfResponsibility = [];
        }
    }

    if (scenario.start_lifecycle_phase === 'war') {
        if (scenario.recruitment_mode === 'player_choice' || scenario.recruitment_mode === 'bottom_up' || scenario.init_formations_oob) {
            if (!state.military.war_militia_strength || Object.keys(state.military.war_militia_strength).length === 0) {
                updateMilitiaEmergence(state);
            }
            if (!state.military.militia_pools || Object.keys(state.military.militia_pools).length === 0) {
                runPoolPopulation(state, graph.settlements, municipalityPopulation1991);
                applyRsJnaInheritanceBonus(state, municipalityPopulation1991);
            }
        }
    }

    if (scenario.start_lifecycle_phase === 'peace') {
        state.meta.scenario_start_date = { year: 1991, month: 8, day: 1 };
    } else {
        state.meta.scenario_start_date = { year: 1992, month: 3, day: 6 };
    }

    if (
        scenario.start_lifecycle_phase === 'war' &&
        municipalityPopulation1991 &&
        Object.keys(municipalityPopulation1991).length > 0
    ) {
        if (!state.displacement.displacement_state) state.displacement.displacement_state = {};
        const turn = state.meta.turn;
        for (const munId of Object.keys(municipalityPopulation1991).sort(strictCompare)) {
            const entry = municipalityPopulation1991[munId];
            if (!entry || typeof entry.total !== 'number' || !Number.isFinite(entry.total)) continue;
            if (state.displacement.displacement_state[munId]) continue;
            state.displacement.displacement_state[munId] = {
                mun_id: munId as MunicipalityId,
                original_population: entry.total,
                displaced_out: 0,
                displaced_in: 0,
                lost_population: 0,
                last_updated_turn: turn
            };
        }
    }

    if (scenario.formation_spawn_directive) {
        state.military.formation_spawn_directive = scenario.formation_spawn_directive;
    }

    if (scenario.must_hold_osids_by_corps && Object.keys(scenario.must_hold_osids_by_corps).length > 0) {
        validateScenarioMustHoldContract(
            scenario,
            oobCorps.map((corps) => corps.id),
            operationalData
        );
        state.military.must_hold_osids_by_corps = scenario.must_hold_osids_by_corps;
    }

    if (scenario.comms_override_by_corps && Object.keys(scenario.comms_override_by_corps).length > 0) {
        state.military.comms_override_by_corps = scenario.comms_override_by_corps;
    }

    if (scenario.coercion_pressure_by_municipality && Object.keys(scenario.coercion_pressure_by_municipality).length > 0) {
        const keys = Object.keys(scenario.coercion_pressure_by_municipality).sort(strictCompare);
        const coercionPressure: Record<string, number> = {};
        for (const munId of keys) {
            const pressure = scenario.coercion_pressure_by_municipality[munId];
            if (pressure !== undefined) coercionPressure[munId] = pressure;
        }
        state.political.coercion_pressure_by_municipality = coercionPressure;
    }

    let oobCreated = false;
    if (!scenario.init_formations_oob && scenario.recruitment_mode !== 'player_choice') oobCreated = true;

    if (scenario.start_lifecycle_phase === 'war' && !oobCreated) {
        await createOobFormations(
            state,
            scenario,
            oobCorps,
            oobBrigades,
            graph.settlements,
            municipalityHqSettlement,
            sidToMun,
            municipalityPopulation1991,
            operationalData?.canonicalToOperational,
            operationalData,
            baseDir
        );
        oobCreated = true;
    }

    if (scenario.start_lifecycle_phase === 'war') {
        initializeCorpsCommand(state);
        spawnJnaPhantomBrigades(state);
        initializeCorpsCommand(state);
        // Synthesis §3 E-B3: seed initial per-corps strategic_depth at scenario
        // load so the first turn's combat / coherence reads see real depth
        // values rather than the default 1.0.
        initStrategicDepth(state);
        let prePlannedAdjacency;
        try {
            const preEdges = await loadOperationalEdges(baseDir);
            if (preEdges?.length) prePlannedAdjacency = buildOsidAdjacency(preEdges);
        } catch {
            // Operational edges may be missing in niche harness contexts.
        }
        injectPrePlannedOperations(state, prePlannedAdjacency);
    }
    if (operationalData?.canonicalToOperational) {
        backfillFormationLocationOsid(state, operationalData.canonicalToOperational);
    }
    if (state.meta.phase === 'war' && operationalData?.operationalToCanonical) {
        try {
            const edges = await loadOperationalEdges(baseDir);
            if (edges?.length) {
                displaceFormationsInEnemyTerritory(state, edges, operationalData.operationalToCanonical);
            }
        } catch {
            // Edges may be missing; skip displacement
        }
    }
    if (state.meta.phase === 'war' && operationalData?.operationalToCanonical) {
        try {
            const preEdges = await loadOperationalEdges(baseDir);
            if (preEdges?.length) {
                const { computeFrontEdgesOsid } = await import('../map/front_edges.js');
                const { buildCorpsFrontSectors } = await import('../sim/combat/corps_front_sectors.js');
                state.military.war_front_edges_osid = computeFrontEdgesOsid(
                    state, preEdges, operationalData.operationalToCanonical
                );
                state.military.corps_front_sectors = buildCorpsFrontSectors(
                    state, preEdges, operationalData.operationalToCanonical
                );
            }
        } catch {
            // Edges may be missing; sectors will compute on first turn
        }
    }

    state = canonicalizeStartupState(state).state;
    return {
        state,
        graph,
        municipalityPopulation1991,
        settlementPopulationBySid,
        settlementDataRaw,
        oobBrigades,
        oobCorps,
        municipalityHqSettlement,
        operationalData,
        operationalCentroids,
        historicalNameLookup,
        sidToMun,
        initOverrideChangeCount
    };
}

export async function runScenario(options: RunScenarioOptions): Promise<RunScenarioResult> {
    const {
        scenarioPath,
        outDirBase = 'runs',
        emitEvery = 0,
        emitWeeklySavesForVideo = false,
        weeksOverride,
        injectFailureAfterRunMeta,
        filterProbeIntent = false,
        scopeMode = 'all_front_active',
        baselineOpsScalar = 1,
        outDirOverride,
        uniqueRunFolder = false,
        postureAllPushAndApplyBreaches = false,
        use_smart_bots = false,
        bot_diagnostics = false,
        baseDir: optionsBaseDir,
        initialStateOnly = false,
        resumeFromSavePath,
        resumeFromWeekIndex,
        consoleDiagnostics = process.env.VITEST !== 'true',
        emitTimingJson = false,
        replayPayloadMode = 'manifest_only',
    } = options;
    if (replayPayloadMode !== 'manifest_only' && replayPayloadMode !== 'full') {
        throw new Error(`Unsupported replayPayloadMode: ${String(replayPayloadMode)}`);
    }

    // COLLAPSE PHASE IV-a (2026-06-10) — env-gated collapse-pipeline enable. HELD / EXPLORATORY.
    // The collapse pipeline (Phase 3A→3D) is feature-gated OFF by default (every getEnablePhase3*()
    // returns false); only the CLI audit harness flips it. There is no production enable path yet —
    // Phase IV finalizes the enable + re-floor under owner sign-off. This env gate lets the
    // first-fire measurement run collapse-ON over a real 188w campaign WITHOUT touching any default
    // or scenario file. `ENABLE_COLLAPSE=true` turns on the whole serial chain (3A required by 3B
    // required by 3C required by 3D). When unset, this block is a no-op and the run is byte-identical
    // to the collapse-OFF baseline (the setters are only called when the env var is exactly 'true').
    // Determinism: reads only an env var at run start; no RNG/clock; identical across two runs with
    // the same env. Do NOT wire this into a default scenario — it is the Phase IV exploration switch.
    if (process.env.ENABLE_COLLAPSE === 'true') {
        setEnablePhase3A(true);
        setEnablePhase3B(true);
        setEnablePhase3C(true);
        setEnablePhase3D(true);
    }
    // COLLAPSE REPURPOSE Design B (2026-06-10) — env-gated exhaustion-drag V2 enable.
    // Default OFF: when unset this block is a no-op and the run is byte-identical to
    // the current 649 floor (the legacy `1-raw/600` drag path is preserved exactly).
    // `AWWV_EXHAUSTION_DRAG_V2=true` re-scales the existing faction-exhaustion op-launch
    // willingness drag into a late-war ramp (offense-only, intent-layer only, §6-inert —
    // never enters combat resolution; the triggered Srebrenica/Žepa ops are structurally
    // exempt). This is the Phase-IV exploration switch for the re-floor measurement run.
    // Determinism: reads only an env var at run start; no RNG/clock.
    if (process.env.AWWV_EXHAUSTION_DRAG_V2 === 'true') {
        setEnableExhaustionDragV2(true);
    }
    const emitFullReplayPayload = replayPayloadMode === 'full';
    const timingTotals = createScenarioTimingTotals();
    const totalTimingStart = timingStart(emitTimingJson);
    if (!consoleDiagnostics) {
        pushRoutineConsoleDiagnosticsSuppressed();
    }
    if (initialStateOnly && resumeFromSavePath) {
        throw new Error('initialStateOnly cannot be combined with resumeFromSavePath');
    }
    const effectiveEmitEvery = emitWeeklySavesForVideo ? Math.max(1, emitEvery) : emitEvery;
    let scenario = await timedAsync(emitTimingJson, timingTotals, 'setup', () => loadScenario(scenarioPath));
    if (filterProbeIntent) {
        scenario = scenarioWithoutProbeIntent(scenario);
    }
    const weeks = weeksOverride !== undefined ? weeksOverride : scenario.weeks;
    if (weeks < 1 || !Number.isInteger(weeks)) {
        throw new Error('weeks must be an integer >= 1');
    }
    const scenarioForId = weeksOverride !== undefined ? { ...scenario, weeks } : scenario;
    const run_id = computeRunId(scenarioForId);
    let runDirName: string;
    if (uniqueRunFolder) {
        await mkdir(outDirBase, { recursive: true });
        const counter = await getNextRunCounter(outDirBase);
        runDirName = `${run_id}_n${counter}`;
    } else {
        runDirName = run_id;
    }
    const outDir = outDirOverride ?? join(outDirBase, runDirName);
    await ensureRunOutputDir(outDir);

    const out_dir_relative = outDirOverride ?? (uniqueRunFolder ? `${outDirBase}/${runDirName}` : `${outDirBase}/${run_id}`);
    const run_meta = {
        scenario_id: scenario.scenario_id,
        run_id,
        weeks,
        scenario_path: scenarioPath,
        out_dir: out_dir_relative,
        ...(resumeFromSavePath ? { resume_from_save_path: resumeFromSavePath } : {}),
        ...(resumeFromWeekIndex != null ? { resume_from_week_index: resumeFromWeekIndex } : {})
    };
    const runMetaPath = join(outDir, 'run_meta.json');
    await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
        await ensureRunOutputDir(outDir);
        await writeFile(runMetaPath, stableStringify(run_meta, 2), 'utf8');
    });

    const baseDir = optionsBaseDir ?? process.cwd();

    try {
        if (injectFailureAfterRunMeta) {
            injectFailureAfterRunMeta();
        }
        const startup = await timedAsync(emitTimingJson, timingTotals, 'setup', () =>
            buildScenarioStartupState(scenario, baseDir)
        );
        let {
            state,
            graph,
            municipalityPopulation1991,
            settlementPopulationBySid,
            settlementDataRaw,
            oobBrigades,
            oobCorps,
            municipalityHqSettlement,
            operationalData,
            operationalCentroids,
            historicalNameLookup,
            sidToMun,
            initOverrideChangeCount
        } = startup;
        let startWeekIndex = 0;
        if (resumeFromSavePath) {
            const resumedSerialized = await timedAsync(emitTimingJson, timingTotals, 'setup', () =>
                readFile(resumeFromSavePath, 'utf8')
            );
            state = timedSync(emitTimingJson, timingTotals, 'setup', () => deserializeState(resumedSerialized));
            const impliedResumeWeek = state.meta.turn;
            if (!Number.isInteger(impliedResumeWeek) || impliedResumeWeek < 0) {
                throw new Error(`resume save has invalid meta.turn: ${String(impliedResumeWeek)}`);
            }
            if (resumeFromWeekIndex != null && resumeFromWeekIndex !== impliedResumeWeek) {
                throw new Error(
                    `resumeFromWeekIndex (${resumeFromWeekIndex}) must match resumed state's meta.turn (${impliedResumeWeek})`
                );
            }
            startWeekIndex = impliedResumeWeek;
            if (startWeekIndex > weeks) {
                throw new Error(
                    `resume week ${startWeekIndex} exceeds scenario length ${weeks}`
                );
            }
        }
        let oobCreated = resumeFromSavePath
            ? state.meta.phase === 'war' || Object.keys(state.military.formations ?? {}).length > 0
            : !scenario.init_formations_oob && scenario.recruitment_mode !== 'player_choice';
        const serializedState = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
            serializeState(state)
        );
        const historicalMetricsInitial = captureHistoricalFactionMetrics(state);

        const initialSavePath = join(outDir, 'initial_save.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(initialSavePath, serializedState, 'utf8');
        });
        const initialControlSnapshot = extractSettlementControlSnapshot(state, graph);

        if (initialStateOnly) {
            const emptyHash = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                createHash('sha256').update(serializedState, 'utf8').digest('hex').slice(0, 16)
            );
            const timingJsonPath = emitTimingJson ? join(outDir, 'timing.json') : undefined;
            if (timingJsonPath) {
                const totalNs = process.hrtime.bigint() - totalTimingStart;
                await writeFile(
                    timingJsonPath,
                    stableStringify(
                        buildScenarioTimingJson({
                            run_id,
                            scenario_id: scenario.scenario_id,
                            weeks,
                            final_state_hash: emptyHash,
                            totals: timingTotals,
                            totalNs,
                        }),
                        2,
                    ),
                    'utf8',
                );
            }
            return {
                outDir,
                run_id,
                final_state_hash: emptyHash,
                paths: {
                    initial_save: initialSavePath,
                    final_save: initialSavePath,
                    weekly_report: join(outDir, 'weekly_report.jsonl'),
                    brigade_temporal_log: join(outDir, 'brigade_temporal_log.jsonl'),
                    // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: not produced
                    // in initialStateOnly mode (no week loop runs), so paths are
                    // empty strings — consumers should treat empty as "absent".
                    replay_sequence_log: '',
                    replay_save_sequence: '',
                    replay_save_manifest: '',
                    replay: '',
                    run_summary: join(outDir, 'run_summary.json'),
                    control_delta: join(outDir, 'control_delta.json'),
                    end_report: join(outDir, 'end_report.md'),
                    activity_summary: join(outDir, 'activity_summary.json'),
                    formation_delta: join(outDir, 'formation_delta.json'),
                    destroyed_brigades: join(outDir, 'destroyed_brigades.json'),
                    operation_aars: join(outDir, 'operation_aars.json'),
                    // LANE D-CONTENT (Path A): not produced in initialStateOnly mode.
                    displacement_event_log: '',
                    ...(timingJsonPath ? { timing_json: timingJsonPath } : {})
                }
            };
        }

        // Phase H2.2: snapshot initial formations (id -> kind) for formation_delta at end-of-run.
        const initialFormationsSnapshot: Record<string, string> = {};
        const initialFormationFatigue: Record<string, number> = {};
        const formations = state.military.formations ?? {};
        for (const id of Object.keys(formations).sort(strictCompare)) {
            const f = formations[id];
            if (!f) continue;
            initialFormationsSnapshot[id] = (f.kind as string) ?? 'brigade';
            const ops = (f as { ops?: { fatigue?: number } }).ops;
            initialFormationFatigue[id] =
                typeof ops?.fatigue === 'number' && Number.isInteger(ops.fatigue) && ops.fatigue >= 0 ? ops.fatigue : 0;
        }

        const weeklyReportPath = join(outDir, 'weekly_report.jsonl');
        const brigadeTemporalLogPath = join(outDir, 'brigade_temporal_log.jsonl');
        const replayPath = emitWeeklySavesForVideo ? join(outDir, 'replay.jsonl') : null;
        // Replay payload policy: manifest_only (default) keeps the VerdictScreen
        // summary contract without writing full-state replay payloads. full keeps
        // the legacy JSONL + consolidated GameState[] sidecars for opt-in replay
        // inspection workflows.
        const replaySequencePath = emitFullReplayPayload ? join(outDir, 'replay_sequence.jsonl') : '';
        // LANE D-CONTENT (Path A): per-turn displacement event stream. The
        // engine's clear-displacement-event-log step calls
        // displacementEventStreamSink (provided via TurnInput) right before
        // truncating the per-turn buffer. Mirrors brigade_temporal_log.jsonl /
        // weekly_report.jsonl. No engine state mutation; pure observability.
        const displacementEventLogPath = join(outDir, 'displacement_event_log.jsonl');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () => ensureRunOutputDir(outDir));
        const reportStream = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
            createWriteStream(weeklyReportPath, { flags: 'w' })
        );
        // LANE-2026-05-02-A1: per-turn brigade-keyed snapshot stream. Pure observability,
        // mirrors weekly_report.jsonl pattern; no engine state mutation, no save scope.
        const brigadeTemporalStream = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
            createWriteStream(brigadeTemporalLogPath, { flags: 'w' })
        );
        const replayStream = replayPath
            ? timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                  createWriteStream(replayPath, { flags: 'w' })
              )
            : null;
        const replaySequenceStream = emitFullReplayPayload
            ? timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                  createWriteStream(replaySequencePath, { flags: 'w' })
              )
            : null;
        const displacementEventStream = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
            createWriteStream(displacementEventLogPath, { flags: 'w' })
        );
        // LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING: NO in-memory frame accumulator.
        // The per-turn JSONL stream is the single source of truth; the consolidated
        // `replay_save_sequence.json` is finalized at end-of-run by stream-reading
        // the JSONL line-by-line. Peak memory is bounded by one frame's serialized
        // state (~25 MB at 188w), not the whole sequence (~4.4 GB at 188w).

        let final_state_hash = '';
        let firstReportRow: WeeklyReportRow | null = null;
        let lastReportRow: WeeklyReportRow | null = null;
        const activityCountsPerWeek: WeeklyActivityCounts[] = [];
        const replayManifestSummaries: ReplayFrameSummary[] = [];
        const weeklySavePaths: string[] = [];
        let replayTimelinePath: string | undefined;
        let replayTimelineStream: ReturnType<typeof createWriteStream> | null = null;
        let replayTimelineFirstFrame = true;
        if (emitWeeklySavesForVideo) {
            replayTimelinePath = join(outDir, 'replay_timeline.json');
            await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () => ensureRunOutputDir(outDir));
            const stream = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                createWriteStream(replayTimelinePath!, { flags: 'w' })
            );
            replayTimelineStream = stream;
            const meta = { run_id, scenario_id: scenario.scenario_id, weeks };
            timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () => {
                stream.write('{"meta":' + stableStringify(meta) + ',"frames":[');
            });
        }
        let baseline_ops_enabled = false;
        let baseline_ops_intensity = 1;
        const engagementLevelsPerWeek: number[] = [];
        const settlementsByMun = buildSettlementsByMun(graph.settlements);
        const shouldApplyBreaches = postureAllPushAndApplyBreaches || scenario.use_smart_bots === true;
        const adjacencyMap = shouldApplyBreaches ? buildAdjacencyMap(graph.edges) : null;
        const enableBotDiagnostics = bot_diagnostics || scenario.bot_diagnostics === true;
        const botWeeklyDiagnostics: BotWeeklyDiagnosticsRow[] = [];
        const corpsAiSnapshots: CorpsAiSnapshot[] = [];
        const CORPS_AI_SNAPSHOT_TURNS = new Set([1, 13, 26, 52]);
        const botControlTimeline: BotControlShareRow[] = [];
        const attackResolutionSummary: AttackResolutionSummary = {
            weeks_at_war: 0,
            weeks_with_orders: 0,
            orders_processed: 0,
            unique_attack_targets: 0,
            flips_applied: 0,
            casualty_attacker: 0,
            casualty_defender: 0,
            defender_present_battles: 0,
            defender_absent_battles: 0,
            orders_by_faction: {}
        };
        const attackResolutionWeekly: AttackResolutionWeekRollup[] = [];
        const combatCausalityWeekly: Array<WeeklyCombatCausalitySummary & { week_index: number; turn: number }> = [];
        let combatCausalitySummary: CombatCausalitySummary | null = null;
        const controlChangeAttributionWeekly: Array<WeeklyControlChangeAttributionSummary & { week_index: number; turn: number }> = [];
        let controlChangeAttributionSummary: ControlChangeAttributionSummary | null = null;
        const takeoverDisplacementSummary = {
            weeks_at_war: 0,
            weeks_with_activity: 0,
            timers_started: 0,
            timers_matured: 0,
            camps_created: 0,
            camps_routed: 0,
            displaced_total: 0,
            killed_total: 0,
            fled_abroad_total: 0,
            routed_total: 0,
            sustained_fires: 0,
            sustained_displaced_total: 0
        };
        const takeoverDisplacementWeekly: Array<{
            week_index: number;
            turn: number;
            timers_started: number;
            timers_matured: number;
            camps_created: number;
            camps_routed: number;
            displaced_total: number;
            killed_total: number;
            fled_abroad_total: number;
            routed_total: number;
            sustained_fires: number;
            sustained_displaced_total: number;
            source_municipalities: string[];
        }> = [];
        const botManager = (scenario.use_smart_bots || use_smart_bots)
            ? new BotManager({
                seed: `${state.meta.seed}:smart-bots`,
                difficulty: scenario.bot_difficulty,
                scenarioStartWeek: scenario.scenario_start_week
            })
            : null;

        // Load historical event definitions from scenario JSON files
        const eventDefinitions = loadEventDefinitions(scenario.scenario_start_week ?? 0);

        for (let week_index = startWeekIndex; week_index < weeks; week_index++) {
            const weekSimulationStart = timingStart(emitTimingJson);
            const turnActions = scenario.turns?.find((t) => t.week_index === week_index)?.actions ?? [];
            const actions = normalizeActions(turnActions);
            const baselineOpsAction = actions.find((a) => a.type === 'baseline_ops');
            if (baselineOpsAction && baselineOpsAction.type === 'baseline_ops') {
                baseline_ops_enabled = baselineOpsAction.enabled !== false;
                baseline_ops_intensity = baselineOpsAction.intensity ?? 1;
            }
            applyActionsToState(state, actions);
            // Phase H1.8: probe_intent is harness-only; no gate toggled in sim (applyActionsToState does not mutate on probe_intent)

            // Run smart bots once per simulated week after scenario actions and posture overrides.
            if (botManager) {
                const currentFrontEdges = computeFrontEdges(state, graph.edges);
                const consolidationContext = {
                    edges: graph.edges,
                    sidToMun,
                    settlementsByMun
                };
                const botRun = botManager.runBots(state, currentFrontEdges, consolidationContext);
                if (enableBotDiagnostics) {
                    botWeeklyDiagnostics.push({
                        week_index,
                        turn: state.meta.turn + 1,
                        by_bot: botRun.by_bot,
                        total_reassignments: botRun.total_reassignments
                    });
                }
            }

            let turnReport: Awaited<ReturnType<typeof runTurn>>['report'];
            if (state.meta.phase === 'peace') {
                const phaseBeforeTurn = state.meta.phase;
                const result = runOneTurn(state, { seed: state.meta.seed });
                state = result.state;
                if (
                    phaseBeforeTurn === 'peace' &&
                    state.meta.phase === 'war' &&
                    state.meta.peace_war_start_control_path
                ) {
                    await applyMunicipalityControllersFromMun1990Only(
                        state,
                        graph,
                        state.meta.peace_war_start_control_path
                    );
                }
                turnReport = {
                    seed: state.meta.seed,
                    phases: result.phasesExecuted.map((name) => ({ name })),
                    control_flip: { flips: [], municipalities_evaluated: 0, control_events: [] },
                    phase_f_displacement: undefined,
                    front_emergence_report: []
                } as Awaited<ReturnType<typeof runTurn>>['report'];
                if (!oobCreated && state.meta.phase === 'war') {
                    await createOobFormations(
                        state,
                        scenario,
                        oobCorps,
                        oobBrigades,
                        graph.settlements,
                        municipalityHqSettlement,
                        sidToMun,
                        municipalityPopulation1991,
                        operationalData?.canonicalToOperational,
                        operationalData,
                        baseDir
                    );
                    oobCreated = true;
                }
            } else {
                const runResult = await runTurn(state, {
                    seed: state.meta.seed,
                    settlementGraph: graph,
                    settlementEdges: graph.edges,
                    municipalityPopulation1991,
                    settlementPopulationBySid,
                    settlementDataRaw,
                    municipalityHqSettlement: Object.keys(municipalityHqSettlement).length > 0 ? municipalityHqSettlement : undefined,
                    historicalNameLookup,
                    eventDefinitions,
                    // LANE D-CONTENT (Path A): wire per-turn displacement event sink.
                    // Engine clear-displacement-event-log step calls this with the
                    // turn's events right before truncating the buffer.
                    displacementEventStreamSink: (events) => {
                        for (const evt of events) {
                            displacementEventStream.write(stableStringify(evt) + '\n');
                        }
                    }
                });
                state = runResult.nextState;
                turnReport = runResult.report;
                autoResolveOpportunityProposalReviews(
                    state,
                    state.meta.turn,
                    state.meta.player_faction ?? null
                );
                // Scenario runs are non-interactive. Any opportunity still
                // pending after the war pipeline is headless-controlled and
                // should follow the same deterministic staff path as bot ops.
                applyBotOpportunityDecisions(state, state.meta.turn, null);
                if (!oobCreated && state.meta.phase === 'war') {
                    await createOobFormations(
                        state,
                        scenario,
                        oobCorps,
                        oobBrigades,
                        graph.settlements,
                        municipalityHqSettlement,
                        sidToMun,
                        municipalityPopulation1991,
                        operationalData?.canonicalToOperational,
                        operationalData,
                        baseDir
                    );
                    oobCreated = true;
                }
            }

            let weeklyCombatCausalityForReport: WeeklyCombatCausalitySummary | undefined;
            let weeklyControlChangeAttributionForReport: WeeklyControlChangeAttributionSummary | undefined;
            let operationDiagnosticsForReport: ReturnType<typeof buildOperationCombatDiagnostics> | undefined;
            if (state.meta.phase === 'war') {
                attackResolutionSummary.weeks_at_war += 1;
                takeoverDisplacementSummary.weeks_at_war += 1;
                const operationDiagnostics = buildOperationCombatDiagnostics(
                    state,
                    turnReport.bot_order_diagnostics,
                    turnReport.attack_resolution_osid
                );
                operationDiagnosticsForReport = operationDiagnostics;
                const weeklyCombatCausality = buildCombatCausalitySummary(
                    operationDiagnostics,
                    turnReport.bot_order_diagnostics,
                    turnReport.attack_resolution_osid
                );
                if (combatCausalitySummary === null) {
                    combatCausalitySummary = weeklyCombatCausality;
                } else {
                    const previousCombatCausality = combatCausalitySummary as CombatCausalitySummary;
                    combatCausalitySummary = {
                        valid_for_combat_calibration:
                            previousCombatCausality.valid_for_combat_calibration &&
                            weeklyCombatCausality.valid_for_combat_calibration,
                        invalidation_reasons: Array.from(new Set([
                            ...previousCombatCausality.invalidation_reasons,
                            ...weeklyCombatCausality.invalidation_reasons
                        ])).sort(strictCompare),
                        total_attack_orders:
                            previousCombatCausality.total_attack_orders + weeklyCombatCausality.total_attack_orders,
                        total_objective_attempts:
                            previousCombatCausality.total_objective_attempts + weeklyCombatCausality.total_objective_attempts,
                        total_objective_captures:
                            previousCombatCausality.total_objective_captures + weeklyCombatCausality.total_objective_captures,
                        movement_only_execution_turns:
                            previousCombatCausality.movement_only_execution_turns + weeklyCombatCausality.movement_only_execution_turns,
                        total_battles: previousCombatCausality.total_battles + weeklyCombatCausality.total_battles,
                        total_orders_by_faction: Object.keys({
                            ...previousCombatCausality.total_orders_by_faction,
                            ...weeklyCombatCausality.total_orders_by_faction
                        }).sort(strictCompare).reduce<Record<string, number>>((acc, factionId) => {
                            acc[factionId] =
                                (previousCombatCausality.total_orders_by_faction[factionId] ?? 0) +
                                (weeklyCombatCausality.total_orders_by_faction[factionId] ?? 0);
                            return acc;
                        }, {}),
                        invalid_operation_count:
                            previousCombatCausality.invalid_operation_count + weeklyCombatCausality.invalid_operation_count,
                        zero_eligible_attacker_operation_count:
                            previousCombatCausality.zero_eligible_attacker_operation_count +
                            weeklyCombatCausality.zero_eligible_attacker_operation_count,
                        recovery_without_logged_attempt_count:
                            previousCombatCausality.recovery_without_logged_attempt_count +
                            weeklyCombatCausality.recovery_without_logged_attempt_count
                    };
                }
                combatCausalityWeekly.push({
                    week_index,
                    turn: state.meta.turn,
                    valid_for_combat_calibration: weeklyCombatCausality.valid_for_combat_calibration,
                    total_attack_orders: weeklyCombatCausality.total_attack_orders,
                    total_objective_attempts: weeklyCombatCausality.total_objective_attempts,
                    total_objective_captures: weeklyCombatCausality.total_objective_captures,
                    movement_only_execution_turns: weeklyCombatCausality.movement_only_execution_turns,
                    total_battles: weeklyCombatCausality.total_battles,
                    invalid_operation_count: weeklyCombatCausality.invalid_operation_count,
                    zero_eligible_attacker_operation_count: weeklyCombatCausality.zero_eligible_attacker_operation_count,
                    recovery_without_logged_attempt_count: weeklyCombatCausality.recovery_without_logged_attempt_count,
                    invalidation_reasons: weeklyCombatCausality.invalidation_reasons
                });
                weeklyCombatCausalityForReport = {
                    valid_for_combat_calibration: weeklyCombatCausality.valid_for_combat_calibration,
                    total_attack_orders: weeklyCombatCausality.total_attack_orders,
                    total_objective_attempts: weeklyCombatCausality.total_objective_attempts,
                    total_objective_captures: weeklyCombatCausality.total_objective_captures,
                    movement_only_execution_turns: weeklyCombatCausality.movement_only_execution_turns,
                    total_battles: weeklyCombatCausality.total_battles,
                    invalid_operation_count: weeklyCombatCausality.invalid_operation_count,
                    zero_eligible_attacker_operation_count: weeklyCombatCausality.zero_eligible_attacker_operation_count,
                    recovery_without_logged_attempt_count: weeklyCombatCausality.recovery_without_logged_attempt_count,
                    invalidation_reasons: weeklyCombatCausality.invalidation_reasons
                };
                const { summary: res, battles: battleList } = selectCanonicalAttackResolutionSummary(turnReport);
                let weeklyDefenderPresentBattles = 0;
                let weeklyDefenderAbsentBattles = 0;
                // Count defender-present battles from the canonical combat summary for this turn.
                for (const battle of battleList) {
                    if (battle.defender_brigade != null) weeklyDefenderPresentBattles += 1;
                    else weeklyDefenderAbsentBattles += 1;
                }
                if (res) {
                    attackResolutionSummary.orders_processed += res.orders_processed ?? 0;
                    attackResolutionSummary.unique_attack_targets += res.unique_attack_targets ?? 0;
                    attackResolutionSummary.flips_applied += res.flips_applied ?? 0;
                    attackResolutionSummary.casualty_attacker += res.casualty_attacker ?? 0;
                    attackResolutionSummary.casualty_defender += res.casualty_defender ?? 0;
                    attackResolutionSummary.defender_present_battles += weeklyDefenderPresentBattles;
                    attackResolutionSummary.defender_absent_battles += weeklyDefenderAbsentBattles;
                    const obf = res.orders_by_faction ?? {};
                    for (const fid of Object.keys(obf).sort()) {
                        attackResolutionSummary.orders_by_faction[fid] =
                            (attackResolutionSummary.orders_by_faction[fid] ?? 0) + (obf[fid] ?? 0);
                    }
                    if ((res.orders_processed ?? 0) > 0) {
                        attackResolutionSummary.weeks_with_orders += 1;
                    }
                }
                const weeklyObf = res?.orders_by_faction ?? {};
                const weeklyOrdersByFaction: Record<string, number> = {};
                for (const fid of Object.keys(weeklyObf).sort()) {
                    weeklyOrdersByFaction[fid] = weeklyObf[fid] ?? 0;
                }
                attackResolutionWeekly.push({
                    week_index,
                    turn: state.meta.turn,
                    orders_processed: res?.orders_processed ?? 0,
                    unique_attack_targets: res?.unique_attack_targets ?? 0,
                    flips_applied: res?.flips_applied ?? 0,
                    casualty_attacker: res?.casualty_attacker ?? 0,
                    casualty_defender: res?.casualty_defender ?? 0,
                    defender_present_battles: weeklyDefenderPresentBattles,
                    defender_absent_battles: weeklyDefenderAbsentBattles,
                    orders_by_faction: weeklyOrdersByFaction
                });
                const takeoverReport = turnReport.takeover_displacement;
                if (takeoverReport) {
                    const hasActivity =
                        takeoverReport.timers_started > 0 ||
                        takeoverReport.timers_matured > 0 ||
                        takeoverReport.camps_created > 0 ||
                        takeoverReport.camps_routed > 0 ||
                        takeoverReport.displaced_total > 0 ||
                        takeoverReport.killed_total > 0 ||
                        takeoverReport.fled_abroad_total > 0 ||
                        takeoverReport.routed_total > 0;
                    if (hasActivity) {
                        takeoverDisplacementSummary.weeks_with_activity += 1;
                    }
                    takeoverDisplacementSummary.timers_started += takeoverReport.timers_started ?? 0;
                    takeoverDisplacementSummary.timers_matured += takeoverReport.timers_matured ?? 0;
                    takeoverDisplacementSummary.camps_created += takeoverReport.camps_created ?? 0;
                    takeoverDisplacementSummary.camps_routed += takeoverReport.camps_routed ?? 0;
                    takeoverDisplacementSummary.displaced_total += takeoverReport.displaced_total ?? 0;
                    takeoverDisplacementSummary.killed_total += takeoverReport.killed_total ?? 0;
                    takeoverDisplacementSummary.fled_abroad_total += takeoverReport.fled_abroad_total ?? 0;
                    takeoverDisplacementSummary.routed_total += takeoverReport.routed_total ?? 0;
                    takeoverDisplacementSummary.sustained_fires += takeoverReport.sustained_fires ?? 0;
                    takeoverDisplacementSummary.sustained_displaced_total += takeoverReport.sustained_displaced_total ?? 0;
                    takeoverDisplacementWeekly.push({
                        week_index,
                        turn: state.meta.turn,
                        timers_started: takeoverReport.timers_started ?? 0,
                        timers_matured: takeoverReport.timers_matured ?? 0,
                        camps_created: takeoverReport.camps_created ?? 0,
                        camps_routed: takeoverReport.camps_routed ?? 0,
                        displaced_total: takeoverReport.displaced_total ?? 0,
                        killed_total: takeoverReport.killed_total ?? 0,
                        fled_abroad_total: takeoverReport.fled_abroad_total ?? 0,
                        routed_total: takeoverReport.routed_total ?? 0,
                        sustained_fires: takeoverReport.sustained_fires ?? 0,
                        sustained_displaced_total: takeoverReport.sustained_displaced_total ?? 0,
                        source_municipalities: [...(takeoverReport.source_municipalities ?? [])].sort(strictCompare)
                    });
                }

                const currentTurnControlEvents = (state.political.control_events ?? [])
                    .filter((event) => event.turn === state.meta.turn)
                    .map((event) => ({ mechanism: event.mechanism }));
                const weeklyControlChangeAttribution = summarizeControlChangeAttribution(currentTurnControlEvents);
                controlChangeAttributionSummary = controlChangeAttributionSummary === null
                    ? summarizeControlChangeAttribution(currentTurnControlEvents, initOverrideChangeCount)
                    : mergeControlChangeAttributionSummaries(
                        controlChangeAttributionSummary,
                        weeklyControlChangeAttribution
                    );
                controlChangeAttributionWeekly.push({
                    week_index,
                    turn: state.meta.turn,
                    ...weeklyControlChangeAttribution
                });
                weeklyControlChangeAttributionForReport = weeklyControlChangeAttribution;
            }

            if (shouldApplyBreaches && adjacencyMap && state.meta.phase === 'war') {
                const derivedFrontEdges = computeFrontEdges(state, graph.edges);
                let breaches = computeFrontBreaches(state, derivedFrontEdges);
                const proposalsFile = computeControlFlipProposals(state, derivedFrontEdges, breaches, adjacencyMap);
                applyControlFlipProposals(state, proposalsFile);
            }
            if (botManager) {
                botControlTimeline.push({
                    turn: state.meta.turn,
                    control_share_by_faction: computeControlShareByFaction(state)
                });
            }

            const activity = deriveWeeklyActivityCounts(state, turnReport);
            activityCountsPerWeek.push(activity);

            let ops: { enabled: boolean; level: number } | undefined;
            if (baseline_ops_enabled) {
                const signal = {
                    front_active: activity.front_active_set_size,
                    pressure_edges: activity.pressure_eligible_size,
                    intensity: baseline_ops_intensity
                };
                const level = computeEngagementLevel(signal);
                engagementLevelsPerWeek.push(level);
                const scalar = Math.max(0, baselineOpsScalar);
                applyBaselineOpsExhaustion(state, level, scalar);
                let frontActiveIds: string[];
                if (scopeMode === 'static_front_only' || scopeMode === 'fluid_front_only') {
                    const descriptors = turnReport.front_emergence_report;
                    const stabilityFilter = scopeMode === 'static_front_only' ? 'static' : 'fluid';
                    frontActiveIds = settlementIdsFromFrontDescriptors(descriptors, stabilityFilter);
                } else {
                    const eligible = getEligiblePressureEdges(state, graph.edges, undefined, operationalData?.canonicalToOperational ?? undefined);
                    frontActiveIds = Array.from(getFrontActiveSettlements(eligible));
                }
                applyBaselineOpsDisplacement(state, frontActiveIds, level, scalar);
                aggregateSettlementDisplacementToMunicipalities(state, settlementsByMun);
                ops = { enabled: true, level };
            }

            repairScenarioArtifactState(
                state,
                graph.edges,
                operationalData?.operationalToCanonical ?? null,
                operationalCentroids,
            );
            timingAdd(timingTotals, 'simulation', weekSimulationStart);

            const weeklyDiagnosticsStart = timingStart(emitTimingJson);
            // Capture corps AI snapshots at key turns for the end report
            const currentTurn = state.meta.turn;
            if (CORPS_AI_SNAPSHOT_TURNS.has(currentTurn) && turnReport.corps_ai_report) {
                corpsAiSnapshots.push({ turn: currentTurn, entries: turnReport.corps_ai_report });
            }

            // Build per-faction corps AI summary for weekly report
            let corpsSummary: WeeklyCorpsSummaryEntry[] | undefined;
            if (turnReport.corps_ai_report && turnReport.corps_ai_report.length > 0) {
                const byFaction = new Map<string, { count: number; offTargets: number; holdOsids: number; stances: Record<string, number> }>();
                for (const entry of turnReport.corps_ai_report) {
                    let agg = byFaction.get(entry.faction);
                    if (!agg) {
                        agg = { count: 0, offTargets: 0, holdOsids: 0, stances: {} };
                        byFaction.set(entry.faction, agg);
                    }
                    agg.count += 1;
                    agg.offTargets += entry.offensive_target_count;
                    agg.holdOsids += entry.hold_osid_count;
                    agg.stances[entry.stance] = (agg.stances[entry.stance] ?? 0) + 1;
                }
                corpsSummary = [...byFaction.entries()]
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([faction, agg]) => ({
                        faction,
                        corps_count: agg.count,
                        offensive_targets_total: agg.offTargets,
                        hold_osids_total: agg.holdOsids,
                        stances: agg.stances
                    }));
            }

            // Extract per-battle results from attack resolution report
            const weeklyBattles: WeeklyBattleEntry[] | undefined =
                turnReport.attack_resolution_osid?.battles?.map(b => {
                    // Preserve the sim-owned battle-to-operation truth when available.
                    // Fallback to legacy derivation only for older reports/tests that omit it.
                    let operation_id = b.operation_id;
                    let operation_name = b.operation_name;
                    if (!operation_id || !operation_name) {
                        const attackerFmt = state.military.formations?.[b.attacker_brigade];
                        const attackerCorpsId = attackerFmt?.corps_id;
                        if (attackerCorpsId && state.military.corps_command) {
                            const cmd = state.military.corps_command[attackerCorpsId];
                            const op = findBrigadeOperation(cmd, b.attacker_brigade);
                            if (op && op.phase === 'execution') {
                                operation_id = `${attackerCorpsId}:${op.name}:t${op.started_turn}`;
                                operation_name = op.name;
                            }
                        }
                    }
                    return {
                        battle_id: b.battle_id,
                        attacker_brigade: b.attacker_brigade,
                        attacker_faction: b.attacker_faction,
                        defender_faction: b.defender_faction,
                        target_osid: b.target_osid,
                        outcome: b.outcome,
                        power_ratio: Math.round(b.power_ratio * 100) / 100,
                        attacker_won: b.attacker_won,
                        defender_brigade: b.defender_brigade,
                        attacker_casualties: b.attacker_casualties,
                        defender_casualties: b.defender_casualties,
                        ...(b.execution_friction ? { execution_friction: b.execution_friction } : {}),
                        ...(b.equipment ? { equipment: b.equipment } : {}),
                        ...(operation_id ? { operation_id, operation_name } : {}),
                    };
                });

            // Extract dissolution and reconstitution entries from turn report
            const weeklyDissolution = turnReport.brigade_dissolution?.dissolved_brigades;
            const weeklyReconstitution = turnReport.brigade_reconstitution?.reconstituted_brigades?.map(r => ({
                id: r.id, name: r.name, faction: r.faction,
                corps_id: r.corps_id, home_mun: r.home_mun,
                personnel_spawned: r.personnel_spawned,
            }));

            const reportRow = buildWeeklyReport(
                state,
                activity,
                ops,
                corpsSummary,
                weeklyCombatCausalityForReport,
                weeklyControlChangeAttributionForReport,
                operationDiagnosticsForReport,
                weeklyBattles,
                weeklyDissolution,
                weeklyReconstitution
            );
            // Attach movement diagnostics from turn report
            if (turnReport.column_movement) {
                reportRow.column_movement = turnReport.column_movement;
            }
            if (turnReport.movement_report) {
                reportRow.movement_report = turnReport.movement_report;
            }
            // Attach fired events from turn report
            if (turnReport.events_fired && turnReport.events_fired.length > 0) {
                reportRow.events_fired = turnReport.events_fired;
            }
            if (firstReportRow === null) firstReportRow = reportRow;
            lastReportRow = reportRow;
            timingAdd(timingTotals, 'diagnostics_reporting', weeklyDiagnosticsStart);
            _serTimeSync(emitTimingJson, timingTotals, 'weekly-report-write', () => {
                reportStream.write(stableStringify(reportRow) + '\n');
            });

            // LANE-2026-05-02-A1: brigade temporal snapshot — per-turn × per-brigade row.
            // Pure read-only projection over state.military.formations after all turn
            // reconciliation. strictCompare-sorted by brigade_id for byte-stability.
            const brigadeTemporalRows = buildBrigadeTemporalRows(state, week_index);
            _serTimeSync(emitTimingJson, timingTotals, 'brigade-temporal-write', () => {
                for (const row of brigadeTemporalRows) {
                    brigadeTemporalStream.write(stableStringify(row) + '\n');
                }
            });

            // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: per-turn replay frame.
            // LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING (2026-05-05): JSONL append-only
            // path; no in-memory accumulator. The consolidated artifact is
            // stream-finalized from this JSONL at end-of-run. Pure read-only —
            // `serializeState(state)` is the canonical writer (also produces
            // final_save.json). State is NOT mutated.
            // Current policy: every run records only sparse replay summaries by
            // default; full serialized frames are opt-in.
            replayManifestSummaries.push(buildReplayFrameSummary(state));
            if (replaySequenceStream) {
                const replayFrameRow = buildReplayFrameRow(state, week_index);
                _serTimeSync(emitTimingJson, timingTotals, 'replay-sequence-write', () => {
                    replaySequenceStream.write(JSON.stringify(replayFrameRow) + '\n');
                });
            }

            // Batch 38: the previous in-loop week-39 `serializeState(state)` +
            // hash and the post-loop `if (!final_state_hash)` fallback were both
            // structurally redundant — they produced a pre-reconciliation hash
            // that the post-loop step at line ~2503 unconditionally overwrites
            // with the canonical post-reconciliation hash actually written to
            // `final_save.json`. The pre-reconciliation hash was only attached
            // to `replay.jsonl`'s per-week `state_hash` field, which has zero
            // consumers anywhere in src/tests/tools (verified by grep). Removed:
            // saves one `serializeState` + one SHA-256 per scenario run, and
            // drops the documented "almost certainly wrong" pre-reconciliation
            // hash from the actions JSONL. Canonical `final_state_hash` in
            // `run_summary.json` is unchanged.
            if (replayStream) {
                const replayLine: { week_index: number; actions: ScenarioAction[] } = {
                    week_index,
                    actions
                };
                timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () => {
                    replayStream.write(stableStringify(replayLine) + '\n');
                });
            }

            if (effectiveEmitEvery > 0 && (week_index + 1) % effectiveEmitEvery === 0) {
                const midPath = join(outDir, `save_w${week_index + 1}.json`);
                const serializedMid = timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                    serializeState(state)
                );
                await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
                    await ensureRunOutputDir(outDir);
                    await writeFile(midPath, serializedMid, 'utf8');
                });
                weeklySavePaths.push(midPath);
                if (emitWeeklySavesForVideo && replayTimelineStream) {
                    const stream = replayTimelineStream;
                    const frameJson = '{"week_index":' + week_index + ',"game_state":' + serializedMid + '}';
                    timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () => {
                        stream.write((replayTimelineFirstFrame ? '' : ',') + frameJson);
                    });
                    replayTimelineFirstFrame = false;
                }
            }
        }

        // A2 Dayton close-out (task #71): the campaign has reached its horizon. If a
        // Dayton menu was opened (trigger fired) but never resolved — the freeze-frame
        // the instrumented-campaign audit flagged — resolve it now via the
        // deterministic historical-default proposal so the campaign CLOSES on a
        // terminal Pyrrhic verdict (meta.game_over=true, endgame_snapshot frozen)
        // instead of an open menu. No-op unless `meta.dayton_close_out` is on AND a
        // pending menu exists, so the calibration scenarios (which never set the flag)
        // are byte-identical. resolveDaytonNegotiation computes only a split %, never
        // repaints OSID control — the territorial baseline is untouched.
        resolvePendingDaytonCloseOut(state);

        // Batch 38: post-loop `if (!final_state_hash)` fallback removed —
        // structurally redundant with the unconditional final-save block at
        // line ~2503 below, which always re-serializes the post-reconciliation
        // state and overwrites `final_state_hash`. No external caller reads
        // `final_state_hash` between here and the canonical setter.

        timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () => {
            reportStream.end();
            brigadeTemporalStream.end();
            if (replayStream) replayStream.end();
            if (replaySequenceStream) replaySequenceStream.end();
            displacementEventStream.end();
        });
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () => new Promise<void>((resolve, reject) => {
            if (replayStream) {
                reportStream.on('finish', () => replayStream.on('finish', resolve).on('error', reject));
            } else {
                reportStream.on('finish', resolve);
            }
            reportStream.on('error', reject);
        }));
        // LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING: the consolidated finalize step
        // stream-reads `replay_sequence.jsonl` from disk, so we MUST wait for the
        // JSONL `finish` event before invoking the finalizer. Without this, the
        // finalizer can race against still-buffered writes on slow disks.
        if (replaySequenceStream) {
            await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () => new Promise<void>((resolve, reject) => {
                replaySequenceStream.on('finish', resolve).on('error', reject);
            }));
        }

        const finalSavePath = join(outDir, 'final_save.json');
        if (state.meta.phase === 'war' && operationalData) {
            const finalOperationalEdges = await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                loadOperationalEdges(baseDir)
            );
            state.military.war_front_edges_osid = computeFrontEdgesOsid(
                state,
                finalOperationalEdges,
                operationalData.operationalToCanonical,
            );
            const finalSpatial = computeSpatialContext(
                finalOperationalEdges,
                state.political.political_controllers ?? {},
                CANONICAL_FACTIONS,
                state.meta.turn,
                'post-combat',
                state.military.war_front_edges_osid,
            );
            reconcileFinalSectorTruth(
                state,
                finalOperationalEdges,
                operationalData.operationalToCanonical,
                operationalCentroids,
                finalSpatial,
            );
            sealFinalSectorTruthFromCurrentSectors(
                state,
                finalOperationalEdges,
                null,
                finalSpatial,
            );
        }
        const finalSerialized = _serTimeSync(emitTimingJson, timingTotals, 'final-save-serialize', () =>
            serializeState(state)
        );
        final_state_hash = _serTimeSync(emitTimingJson, timingTotals, 'final-save-hash', () =>
            createHash('sha256').update(finalSerialized, 'utf8').digest('hex').slice(0, 16)
        );
        await _serTimeAsync(emitTimingJson, timingTotals, 'final-save-write', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(finalSavePath, finalSerialized, 'utf8');
        });

        // COLLAPSE PHASE IV-b — G2-A collapse-ON marker write (ON path) + stale-marker
        // cleanup (OFF path, review-383 defect fix). See syncCollapseEnabledMarker docs.
        await syncCollapseEnabledMarker(outDir);

        // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: consolidated end-of-run
        // artifact. Separate file (NOT embedded in final_save.json) so canonical
        // save hash invariance holds and existing loaders continue working
        // unchanged. UI adapter / desktop IPC pick this up when present and
        // populate `LoadedGameState.replaySaveSequence` for the VerdictScreen.
        // LANE-NIGHTSHIFT-REPLAY-BUFFER-STREAMING (2026-05-05): finalized by
        // stream-reading `replay_sequence.jsonl` line-by-line — peak heap is
        // bounded by one frame's serialized state, never the whole sequence.
        // This unblocks 188w hash-identity gates that previously OOM'd here.
        // Current policy: manifest_only writes no full replay payload; full mode
        // preserves the separate replay_save_sequence.json sidecar.
        const replaySaveSequencePath = emitFullReplayPayload
            ? await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                  streamFinalizeReplaySaveSequenceFromJsonl(
                      outDir,
                      replaySequencePath,
                  )
              )
            : '';
        const replaySaveManifestPath = emitFullReplayPayload
            ? join(outDir, 'replay_save_manifest.json')
            : await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () =>
                  writeReplaySaveManifest(outDir, replayManifestSummaries)
              );

        let endDiagnosticsStart = timingStart(emitTimingJson);
        // Pass the absolute war-week anchor (apr1992 = 0, jan1993 = 39, …) so absolute-week-keyed
        // anomaly suppressors resolve correctly for non-apr1992 starts. Threaded as an argument
        // (not persisted to state.meta) so final_state_hash stays byte-identical.
        const anomalyReports: AnomalyReport[] = runAnomalyDetection(state, scenario.scenario_start_week ?? 0);

        let breachDiagnostic: { max_abs_pressure: number; breach_count_last_turn: number } | undefined;
        if (postureAllPushAndApplyBreaches && state.military.front_pressure && typeof state.military.front_pressure === 'object') {
            let maxAbs = 0;
            for (const rec of Object.values(state.military.front_pressure as Record<string, { value?: number }>)) {
                const v = rec?.value;
                if (rec && typeof v === 'number' && Number.isInteger(v)) maxAbs = Math.max(maxAbs, Math.abs(v));
            }
            const lastTurnEdges = computeFrontEdges(state, graph.edges);
            const lastTurnBreaches = computeFrontBreaches(state, lastTurnEdges);
            breachDiagnostic = { max_abs_pressure: maxAbs, breach_count_last_turn: lastTurnBreaches.length };
        }
        let botBenchmarkSummary: ReturnType<typeof evaluateBotBenchmarks> | undefined;
        let botBenchmarkContractStatus:
            | ReturnType<typeof validateBotBenchmarkSummary>
            | undefined;
        if (botManager) {
            const benchmarks: BotBenchmarkDefinition[] = [];
            const factions = [...(state.factions ?? [])].map((f) => f.id).sort((a, b) => a.localeCompare(b));
            for (const faction of factions) {
                const profile = getBotStrategyProfile(faction);
                for (const target of profile.benchmarks) {
                    benchmarks.push({
                        faction,
                        turn: target.turn,
                        objective: target.objective,
                        expected_control_share: target.expected_control_share,
                        tolerance: target.tolerance
                    });
                }
            }
            botBenchmarkSummary = evaluateBotBenchmarks(botControlTimeline, benchmarks);
            botBenchmarkContractStatus = validateBotBenchmarkSummary(botBenchmarkSummary);
        }
        const victoryEvaluation = evaluateVictoryConditions(state, scenario.victory_conditions);
        const historicalMetricsFinal = captureHistoricalFactionMetrics(state);
        const historicalAlignmentDiagnostics = computeHistoricalAlignmentDiagnostics(
            historicalMetricsInitial,
            historicalMetricsFinal
        );
        const overrideInventory = buildOverrideInventory(scenario);
        const finalControlSnapshot = extractSettlementControlSnapshot(state, graph);
        let historicalControlAlignment: HistoricalControlAlignmentDiagnostics | undefined;
        let osidPairMatch: OsidPairMatchDiagnostics | undefined;
        let historicalAnchorChecks: HistoricalAnchorCheck[] | undefined;
        if (scenario.init_control === 'apr1992' || (scenario.init_control_mode === 'ethnic_1991' && scenario.scenario_id.includes('apr1992'))) {
            // Wave 15: pick the painted reference matching scenario duration.
            // Loads the OSID-keyed painted_control_{key}.json directly, skipping
            // the createInitialGameState detour used by the legacy mun1990 path.
            const referenceKey = pickHistoricalReferenceKey(scenario);
            const historicalReferenceSnapshot = await loadPaintedControlReferenceSnapshot(referenceKey, baseDir);
            historicalControlAlignment = computeHistoricalControlAlignmentDiagnostics(
                finalControlSnapshot,
                historicalReferenceSnapshot,
                referenceKey
            );
            // Wave 27: per-OSID spatial-match metric. Complements the count-delta
            // above by measuring whether the sim has the right factions in the
            // right OSIDs, not just the right totals.
            osidPairMatch = computeOsidPairMatchDiagnostics(
                finalControlSnapshot,
                historicalReferenceSnapshot,
                referenceKey
            );
            // Grade OSID anchors against the epoch matching scenario duration
            // (same key the painted-control diagnostics use), so late-war runs
            // are not measured against 1992 expectations.
            historicalAnchorChecks = computeHistoricalAnchorChecks(finalControlSnapshot, referenceKey);
        }
        const runHasAnyBattles = (combatCausalitySummary?.total_battles ?? 0) > 0;
        if (combatCausalitySummary && !runHasAnyBattles) {
            combatCausalitySummary.valid_for_combat_calibration = false;
            combatCausalitySummary.invalidation_reasons = Array.from(new Set<CombatCausalityInvalidationReason>([
                ...combatCausalitySummary.invalidation_reasons,
                'zero_battles'
            ])).sort(strictCompare);
        }
        const validForCombatCalibration =
            (combatCausalitySummary?.valid_for_combat_calibration ?? false) && runHasAnyBattles;
        const combatCausalityForSummary =
            combatCausalitySummary ?? buildZeroBattleCombatCausalitySummary();
        const battlelessWeeks = combatCausalityWeekly
            .filter((row) => row.total_battles === 0)
            .map((row) => row.week_index);
        // Phase H2.2: formation delta (initial vs final formations) — hoisted so destroyedBrigades
        // is available for inclusion in runSummary before the summary is written.
        const finalFormations = state.military.formations ?? {};
        // Reconstruct destroyed brigades from final formations (deterministic, no new state).
        // Only named brigades (kind === 'brigade'); paramilitaries excluded.
        const destroyedBrigades = Object.entries(finalFormations)
            .filter(([, f]) =>
                f.status === 'inactive' &&
                f.lifecycle_status != null &&
                f.kind === 'brigade' &&
                !f.id.startsWith('para_') &&
                !f.id.startsWith('opara_')
            )
            .map(([id, f]) => ({
                brigade_id: id,
                faction: (f as { faction?: string }).faction ?? null,
                name: (f as { name?: string }).name ?? id,
                corps_id: (f as { corps_id?: string }).corps_id ?? null,
                turn_destroyed: f.destruction_turn ?? null,
                location_osid: (f as { location_osid?: string }).location_osid ?? null,
                lifecycle_status: f.lifecycle_status,
                battles_fought: (f as { brigade_history?: { battles_fought?: number } }).brigade_history?.battles_fought ?? 0,
                total_casualties_taken: (f as { brigade_history?: { total_casualties_taken?: number } }).brigade_history?.total_casualties_taken ?? 0,
            }))
            .sort((a, b) => strictCompare(a.brigade_id, b.brigade_id));

        const runSummary = {
            scenario_id: scenario.scenario_id,
            weeks,
            run_id,
            final_state_hash,
            recovery_status: {
                state_protected: true,
                reporting_split_complete: true,
                calibration_resumed_under_gate: validForCombatCalibration,
                calibration_resumed_run_id: validForCombatCalibration ? run_id : null,
                calibration_resumed_run_date: validForCombatCalibration ? '2026-03-06' : null
            },
            summary: {
                final_turn: state.meta.turn,
                phase: state.meta.phase
            },
            historical_alignment: historicalAlignmentDiagnostics,
            behavioral_health: {
                valid_for_combat_calibration: validForCombatCalibration,
                battleless_weeks: battlelessWeeks,
                combat_causality: combatCausalityForSummary,
                control_change_attribution:
                    controlChangeAttributionSummary ?? summarizeControlChangeAttribution([], initOverrideChangeCount)
            },
            historical_fit: {
                historical_alignment: historicalAlignmentDiagnostics,
                ...(historicalControlAlignment
                    ? {
                        control_alignment: historicalControlAlignment,
                        ...(osidPairMatch ? { osid_pair_match: osidPairMatch } : {}),
                        anchor_checks: historicalAnchorChecks
                    }
                    : {}),
                ...(botBenchmarkSummary
                    ? {
                        bot_benchmark_evaluation: botBenchmarkSummary,
                        bot_benchmark_status: botBenchmarkContractStatus ?? { contract_valid: true, contract_issues: [] }
                    }
                    : {
                        bot_benchmark_status: { contract_valid: true, contract_issues: [] }
                    }),
                override_inventory: overrideInventory,
                ...(victoryEvaluation ? { victory: victoryEvaluation } : {})
            },
            ...(historicalControlAlignment
                ? {
                    vs_historical: historicalControlAlignment,
                    anchor_checks: historicalAnchorChecks
                }
                : {}),
            ...(attackResolutionSummary.weeks_at_war > 0
                ? {
                    phase_ii_attack_resolution: attackResolutionSummary,
                    attack_resolution: attackResolutionSummary,
                    attack_resolution_weekly: attackResolutionWeekly,
                    combat_causality: combatCausalityForSummary,
                    combat_causality_weekly: combatCausalityWeekly
                }
                : {}),
            ...(attackResolutionSummary.weeks_at_war > 0
                ? {
                    control_change_attribution:
                        controlChangeAttributionSummary ?? summarizeControlChangeAttribution([], initOverrideChangeCount),
                    control_change_attribution_weekly: controlChangeAttributionWeekly
                }
                : {}),
            ...(takeoverDisplacementSummary.weeks_at_war > 0
                ? {
                    takeover_displacement: takeoverDisplacementSummary,
                    takeover_displacement_weekly: takeoverDisplacementWeekly
                }
                : {}),
            ...(attackResolutionSummary.weeks_at_war > 0 && hasCivilianCasualtyRecords(state.displacement.civilian_casualties)
                ? { civilian_casualties: state.displacement.civilian_casualties }
                : {}),
            ...(botBenchmarkSummary ? { bot_benchmark_evaluation: botBenchmarkSummary } : {}),
            ...(victoryEvaluation ? { victory: victoryEvaluation } : {}),
            ...(breachDiagnostic ? { breach_diagnostic: breachDiagnostic } : {}),
            ...(state.meta.phase === 'war'
                ? {
                      early_war_note: {
                          message:
                              'Opposing control edges have not yet persisted long enough',
                          streak: state.meta.war_opposing_edges_streak ?? 0,
                          required_streak: 4
                      }
                  }
                : {}),
            anomaly_detection: {
                count: anomalyReports.length,
                critical: anomalyReports.filter((r) => r.severity === 'critical').length,
                warning: anomalyReports.filter((r) => r.severity === 'warning').length,
                info: anomalyReports.filter((r) => r.severity === 'info').length,
                reports: anomalyReports
            },
            ...(state.military.op_injection_warnings?.length ? {
                op_injection_validation: {
                    count: state.military.op_injection_warnings.length,
                    errors: state.military.op_injection_warnings.filter(w => w.severity === 'error').length,
                    warnings: state.military.op_injection_warnings.filter(w => w.severity === 'warning').length,
                    issues: state.military.op_injection_warnings,
                }
            } : {}),
            destroyed_brigades: destroyedBrigades
        };
        const runSummaryPath = join(outDir, 'run_summary.json');
        const runSummaryForWrite = integerizeRunSummaryCounts(runSummary);
        timingAdd(timingTotals, 'diagnostics_reporting', endDiagnosticsStart);
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(runSummaryPath, stableStringify(runSummaryForWrite, 2), 'utf8');
        });
        const controlDelta = timedSync(emitTimingJson, timingTotals, 'diagnostics_reporting', () =>
            computeControlDelta(initialControlSnapshot, finalControlSnapshot)
        );
        const controlDeltaPath = join(outDir, 'control_delta.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(controlDeltaPath, stableStringify(controlDelta, 2), 'utf8');
        });

        const activitySummary = timedSync(emitTimingJson, timingTotals, 'diagnostics_reporting', () =>
            computeActivitySummary(activityCountsPerWeek)
        );
        const activitySummaryPath = join(outDir, 'activity_summary.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(activitySummaryPath, stableStringify(activitySummary, 2), 'utf8');
        });

        let botDiagnosticsPath: string | undefined;
        if (enableBotDiagnostics) {
            const pathForWrite = join(outDir, 'bot_diagnostics.json');
            botDiagnosticsPath = pathForWrite;
            await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
                await ensureRunOutputDir(outDir);
                await writeFile(pathForWrite, stableStringify(botWeeklyDiagnostics, 2), 'utf8');
            });
        }

        if (emitWeeklySavesForVideo && replayTimelineStream) {
            const stream = replayTimelineStream;
            timedSync(emitTimingJson, timingTotals, 'serialization_artifacts', () => {
                stream.write(']}');
                stream.end();
            });
            await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', () => new Promise<void>((resolve, reject) => {
                stream.on('finish', resolve).on('error', reject);
            }));
        }

        // Phase H2.2: formation delta (initial vs final formations).
        // finalFormations and destroyedBrigades are hoisted above runSummary.
        const formationDelta = timedSync(emitTimingJson, timingTotals, 'diagnostics_reporting', () =>
            computeFormationDelta(initialFormationsSnapshot, finalFormations)
        );
        const formationDeltaPath = join(outDir, 'formation_delta.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(formationDeltaPath, stableStringify(formationDelta, 2), 'utf8');
        });

        const destroyedBrigadesPath = join(outDir, 'destroyed_brigades.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(destroyedBrigadesPath, stableStringify(destroyedBrigades, 2), 'utf8');
        });

        // Operation AARs artifact
        const operationAars = state.operation_history ?? [];
        const operationAarsPath = join(outDir, 'operation_aars.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(operationAarsPath, stableStringify(operationAars, 2), 'utf8');
        });

        const watchedOperations = [...(state.military.watched_operations ?? [])].sort((a, b) =>
            (a.turn - b.turn)
            || strictCompare(a.operation_name, b.operation_name)
            || strictCompare(a.launch_status, b.launch_status)
            || strictCompare(a.blocker_code, b.blocker_code)
        );
        const watchedOperationsPath = join(outDir, 'watched_operations.json');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(watchedOperationsPath, stableStringify(watchedOperations, 2), 'utf8');
        });

        endDiagnosticsStart = timingStart(emitTimingJson);
        let formationFatigueSummary: FormationFatigueSummary | null = null;
        const formationIds = Object.keys(finalFormations).sort(strictCompare);
        if (formationIds.length > 0) {
            let total_fatigue_initial = 0;
            let total_fatigue_final = 0;
            const by_formation: FormationFatigueSummary['by_formation'] = [];
            for (const id of formationIds) {
                const f = finalFormations[id];
                const fatigue_initial = initialFormationFatigue[id] ?? 0;
                const ops = (f as { ops?: { fatigue?: number } })?.ops;
                const fatigue_final =
                    typeof ops?.fatigue === 'number' && Number.isInteger(ops.fatigue) && ops.fatigue >= 0 ? ops.fatigue : 0;
                total_fatigue_initial += fatigue_initial;
                total_fatigue_final += fatigue_final;
                by_formation.push({
                    id,
                    faction: (f as { faction?: string }).faction ?? '—',
                    name: (f as { name?: string }).name,
                    fatigue_initial,
                    fatigue_final
                });
            }
            formationFatigueSummary = { by_formation, total_fatigue_initial, total_fatigue_final };
        }

        let baselineOpsSummary: BaselineOpsSummary | null = null;
        if (baseline_ops_enabled && firstReportRow && lastReportRow) {
            const n = engagementLevelsPerWeek.length;
            const avg_level = n > 0 ? engagementLevelsPerWeek.reduce((a, b) => a + b, 0) / n : 0;
            const startExMap = new Map(firstReportRow.factions?.map((f) => [f.id, f.exhaustion ?? 0]) ?? []);
            const endExMap = new Map(lastReportRow.factions?.map((f) => [f.id, f.exhaustion ?? 0]) ?? []);
            let nonzero_exhaustion = false;
            for (const f of lastReportRow.factions ?? []) {
                if ((endExMap.get(f.id) ?? 0) > (startExMap.get(f.id) ?? 0)) {
                    nonzero_exhaustion = true;
                    break;
                }
            }
            const startDispTotal = firstReportRow.settlement_displacement_total ?? 0;
            const endDispTotal = lastReportRow.settlement_displacement_total ?? 0;
            const nonzero_displacement = endDispTotal > startDispTotal;
            baselineOpsSummary = {
                intensity: baseline_ops_intensity,
                avg_level,
                nonzero_exhaustion,
                nonzero_displacement
            };
        }

        const armyStrengthsSummary = computeArmyStrengthsSummary(state);
        const endReportMd = formatEndReportMarkdown({
            scenario_id: scenario.scenario_id,
            run_id,
            weeks,
            controlDelta,
            startWeeklyReport: firstReportRow,
            endWeeklyReport: lastReportRow,
            activitySummary,
            baselineOpsSummary,
            formationDelta,
            formationFatigueSummary,
            armyStrengthsSummary,
            victoryEvaluation,
            botBenchmarkSummary: botBenchmarkSummary ?? null,
            botWeeklyDiagnostics: enableBotDiagnostics ? botWeeklyDiagnostics : null,
            attackResolutionSummary:
                attackResolutionSummary.weeks_at_war > 0 ? attackResolutionSummary : null,
            attackResolutionWeekly:
                attackResolutionSummary.weeks_at_war > 0 ? attackResolutionWeekly : null,
            historicalAlignmentDiagnostics,
            corpsAiSnapshots: corpsAiSnapshots.length > 0 ? corpsAiSnapshots : null,
            operationHistory: operationAars.length > 0 ? operationAars : null,
            activeOperations: collectActiveOperations(state),
            anomalyReports: anomalyReports.length > 0 ? anomalyReports : null
        });
        timingAdd(timingTotals, 'diagnostics_reporting', endDiagnosticsStart);
        const endReportPath = join(outDir, 'end_report.md');
        await timedAsync(emitTimingJson, timingTotals, 'serialization_artifacts', async () => {
            await ensureRunOutputDir(outDir);
            await writeFile(endReportPath, endReportMd, 'utf8');
        });

        const timingJsonPath = emitTimingJson ? join(outDir, 'timing.json') : undefined;
        if (timingJsonPath) {
            const totalNs = process.hrtime.bigint() - totalTimingStart;
            await writeFile(
                timingJsonPath,
                stableStringify(
                    buildScenarioTimingJson({
                        run_id,
                        scenario_id: scenario.scenario_id,
                        weeks,
                        final_state_hash,
                        totals: timingTotals,
                        totalNs,
                    }),
                    2,
                ),
                'utf8',
            );
        }

        return {
            outDir,
            run_id,
            final_state_hash,
            paths: {
                initial_save: initialSavePath,
                final_save: finalSavePath,
                weekly_report: weeklyReportPath,
                brigade_temporal_log: brigadeTemporalLogPath,
                replay_sequence_log: replaySequencePath,
                replay_save_sequence: replaySaveSequencePath,
                replay_save_manifest: replaySaveManifestPath,
                replay: replayPath ?? '',
                run_summary: runSummaryPath,
                control_delta: controlDeltaPath,
                end_report: endReportPath,
                activity_summary: activitySummaryPath,
                formation_delta: formationDeltaPath,
                destroyed_brigades: destroyedBrigadesPath,
                operation_aars: operationAarsPath,
                watched_operations: watchedOperationsPath,
                displacement_event_log: displacementEventLogPath,
            ...(weeklySavePaths.length > 0 ? { weekly_saves: weeklySavePaths } : {}),
            ...(replayTimelinePath ? { replay_timeline: replayTimelinePath } : {}),
                ...(botDiagnosticsPath ? { bot_diagnostics: botDiagnosticsPath } : {}),
                ...(timingJsonPath ? { timing_json: timingJsonPath } : {})
            }
        };
    } catch (err) {
        await writeFailureReport(outDir, run_id, scenario.scenario_id, weeks, err);
        if (err instanceof Error) {
            (err as Error & { run_id?: string; out_dir?: string }).run_id = run_id;
            (err as Error & { run_id?: string; out_dir?: string }).out_dir = out_dir_relative;
        }
        throw err;
    } finally {
        if (!consoleDiagnostics) {
            popRoutineConsoleDiagnosticsSuppressed();
        }
        _serDetailDumpToStderr();
    }
}

/** Phase H1.8: Run baseline (probe_intent stripped) and probe (honor probe_intent), then compare. */
export interface RunProbeCompareOptions {
    scenarioPath: string;
    outDirBase?: string;
}

export interface RunProbeCompareResult {
    run_ids: { baseline: string; probe: string };
    baselineOutDir: string;
    probeOutDir: string;
    compareResult: CompareResult;
    paths: { probe_compare_json: string; probe_compare_md: string };
}

export async function runProbeCompare(
    options: RunProbeCompareOptions
): Promise<RunProbeCompareResult> {
    const { scenarioPath, outDirBase = 'runs_probe' } = options;
    const scenario = await loadScenario(scenarioPath);
    const weeks = scenario.weeks;

    const baselineResult = await runScenario({
        scenarioPath,
        outDirBase,
        filterProbeIntent: true
    });
    const probeResult = await runScenario({
        scenarioPath,
        outDirBase,
        filterProbeIntent: false
    });

    const compareResult = await buildCompareResult(
        baselineResult.outDir,
        probeResult.outDir,
        scenario.scenario_id,
        weeks,
        baselineResult.run_id,
        probeResult.run_id
    );

    await mkdir(outDirBase, { recursive: true });
    const compareJsonPath = join(outDirBase, 'probe_compare.json');
    const compareMdPath = join(outDirBase, 'probe_compare.md');
    await writeFile(compareJsonPath, stableStringify(compareResult, 2), 'utf8');
    await writeFile(compareMdPath, formatProbeCompareMarkdown(compareResult), 'utf8');

    return {
        run_ids: { baseline: baselineResult.run_id, probe: probeResult.run_id },
        baselineOutDir: baselineResult.outDir,
        probeOutDir: probeResult.outDir,
        compareResult,
        paths: { probe_compare_json: compareJsonPath, probe_compare_md: compareMdPath }
    };
}

/** Phase H1.9: Run noop then baseline_ops scenario, compare and write ops_compare.json / ops_compare.md. */
export interface RunOpsCompareOptions {
    outDirBase?: string;
    noopScenarioPath?: string;
    opsScenarioPath?: string;
}

export interface RunOpsCompareResult {
    run_ids: { noop: string; ops: string };
    noopOutDir: string;
    opsOutDir: string;
    compareResult: CompareResult;
    paths: { ops_compare_json: string; ops_compare_md: string };
}

export async function runOpsCompare(options: RunOpsCompareOptions): Promise<RunOpsCompareResult> {
    const outDirBase = options.outDirBase ?? 'runs_ops_compare';
    const noopPath = options.noopScenarioPath ?? join(process.cwd(), 'data', 'scenarios', 'noop_52w.json');
    const opsPath = options.opsScenarioPath ?? join(process.cwd(), 'data', 'scenarios', 'baseline_ops_52w.json');

    const noopResult = await runScenario({ scenarioPath: noopPath, outDirBase });
    const opsResult = await runScenario({ scenarioPath: opsPath, outDirBase });

    const compareResult = await buildCompareResult(
        noopResult.outDir,
        opsResult.outDir,
        'baseline_ops_52w',
        52,
        noopResult.run_id,
        opsResult.run_id
    );
    compareResult.conclusion = buildOpsCompareConclusion(compareResult.deltas);

    await mkdir(outDirBase, { recursive: true });
    const compareJsonPath = join(outDirBase, 'ops_compare.json');
    const compareMdPath = join(outDirBase, 'ops_compare.md');
    await writeFile(compareJsonPath, stableStringify(compareResult, 2), 'utf8');
    await writeFile(compareMdPath, formatOpsCompareMarkdown(compareResult), 'utf8');

    return {
        run_ids: { noop: noopResult.run_id, ops: opsResult.run_id },
        noopOutDir: noopResult.outDir,
        opsOutDir: opsResult.outDir,
        compareResult,
        paths: { ops_compare_json: compareJsonPath, ops_compare_md: compareMdPath }
    };
}

/**
 * Create initial GameState from a scenario file (for desktop "Load scenario" / "New Campaign").
 * When initialStateOnly is true (default for desktop), builds canonical startup state in memory
 * without creating harness run artifacts.
 * When false, uses the harness path for backward compatibility and returns the initial state
 * from the generated initial_save artifact.
 */
export async function createStateFromScenario(
    scenarioPath: string,
    baseDir: string,
    options?: { initialStateOnly?: boolean }
): Promise<GameState> {
    const initialStateOnly = options?.initialStateOnly !== false;
    const scenario = await loadScenario(scenarioPath);
    if (!initialStateOnly) {
        const result = await runScenario({
            scenarioPath,
            baseDir,
            outDirBase: join(baseDir, 'runs'),
            weeksOverride: 1,
            uniqueRunFolder: true,
            initialStateOnly: false,
            consoleDiagnostics: false,
        });
        const content = await readFile(result.paths.initial_save, 'utf8');
        return deserializeState(content);
    }
    pushRoutineConsoleDiagnosticsSuppressed();
    try {
        const { state } = await buildScenarioStartupState(scenario, baseDir);
        return state;
    } finally {
        popRoutineConsoleDiagnosticsSuppressed();
    }
}
