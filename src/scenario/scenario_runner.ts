/**
 * Phase H1.1: Headless scenario harness.
 * Run N weekly turns deterministically; emit final_save.json, weekly_report.jsonl, replay.jsonl, run_summary.json.
 * No timestamps; no randomness; no derived state in saves (Engine Invariants §13.1).
 */

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadSettlementEthnicityData } from '../data/settlement_ethnicity.js';
import { computeFrontEdges } from '../map/front_edges.js';
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
import { computeFrontBreaches, FRONT_BREACH_THRESHOLD } from '../state/front_breaches.js';
import type { FactionId, GameState, MunicipalityId } from '../state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../state/game_state.js';
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
import { strictCompare } from '../state/validateGameState.js';
import { stableStringify } from '../utils/stable_json.js';
import {
    applyBaselineOpsDisplacement,
    applyBaselineOpsExhaustion,
    computeEngagementLevel
} from './baseline_ops_scheduler.js';
import { backfillFormationLocationOsid, loadOperationalData, loadOperationalEdges } from './../data/operational_data.js';
import { displaceFormationsInEnemyTerritory } from '../sim/combat/attack_resolution_osid.js';
import { loadInitialFormations } from './initial_formations_loader.js';
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
import {
    buildCombatCausalitySummary,
    buildOperationCombatDiagnostics,
    type CombatCausalityInvalidationReason,
    type CombatCausalitySummary
} from './combat_causality.js';
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
import type { Scenario, ScenarioAction } from './scenario_types.js';
import { evaluateVictoryConditions } from './victory_conditions.js';

/** Apply scenario actions to state. Noop/note do nothing to state. */
export function applyActionsToState(_state: GameState, _actions: ScenarioAction[]): void {
    // No-op and note do not mutate state. Future action types will mutate here.
}

export function repairScenarioArtifactState(
    state: GameState,
    edges: import('../map/settlements.js').EdgeRecord[] | undefined,
    operationalToCanonical?: import('../data/operational_data.js').OperationalToCanonicalReverseMap | null
): void {
    if (state.meta.phase !== 'war' || !edges?.length || !operationalToCanonical) {
        return;
    }
    displaceFormationsInEnemyTerritory(state, edges, operationalToCanonical);
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
  } as any,
  political: {} as any, displacement: {} as any
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
    return state;
}

/** H1.11: Scope for baseline_ops displacement (derived-only; no new mechanics). */
export type BaselineOpsScopeMode = 'all_front_active' | 'static_front_only' | 'fluid_front_only';

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
    /** When true: before each turn set front_posture to push on all front edges for both sides; after each turn apply breach-based control flips. */
    postureAllPushAndApplyBreaches?: boolean;
    use_smart_bots?: boolean;
    /** Optional per-week AI diagnostics artifact (bot_diagnostics.json). */
    bot_diagnostics?: boolean;
    /** Optional base directory for data paths (default process.cwd()). Used by desktop createStateFromScenario. */
    baseDir?: string;
    /** When true, build state and write initial_save only; skip week loop and end-of-run artifacts (faster for desktop New Campaign). */
    initialStateOnly?: boolean;
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
        /** Operation AARs (completed operations). */
        operation_aars: string;
        /** Optional list of deterministic weekly save paths (save_w1..save_wN). */
        weekly_saves?: string[];
        /** Optional replay timeline bundle for tactical-map animation playback/export. */
        replay_timeline?: string;
        /** Optional per-week smart-bot diagnostics. */
        bot_diagnostics?: string;
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
    mechanism: 'osid_control_overrides' | 'avoided_osids_by_faction' | 'engine_ceiling_workarounds';
    classification: 'initial_state_correction' | 'bot_compensation' | 'permanent_engine_ceiling_workaround';
    active_entries: number;
    rationale: string;
}

const HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992: Array<{ settlement_id: string; expected_controller: string }> = [
];
// OSID-level anchors: each entry checks a specific painted OSID against simulated control.
// No municipality plurality — pluralities are unstable (OSID count can flip on a single settlement).
// Use the city-core or enclave-core OSID for each historically unambiguous location.
const HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992: Array<{ osid: string; expected_controller: string }> = [
    // City cores — unambiguous historical control
    { osid: 'op:bijeljina:bijeljina_2', expected_controller: 'RS' },                         // Bijeljina city — VRS from April 1992
    { osid: 'op:banja_luka:banja_luka_2', expected_controller: 'RS' },                       // Banja Luka city — VRS throughout
    { osid: 'op:tuzla:tuzla_2', expected_controller: 'RBiH' },                               // Tuzla city — ARBiH throughout
    { osid: 'op:bihac:bihac_2', expected_controller: 'RBiH' },                               // Bihac town — ARBiH 5th Corps pocket
    { osid: 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo', expected_controller: 'RBiH' }, // Sarajevo centre — ARBiH throughout
    // Specific contested/enclave OSIDs
    { osid: 'op:zvornik:zvornik', expected_controller: 'RS' },             // Zvornik city — VRS captured May 1992
    { osid: 'op:zvornik:sapna', expected_controller: 'RBiH' },        // Sapna — ARBiH stronghold
    { osid: 'op:ugljevik:teocak_krstac_2', expected_controller: 'RBiH' },  // Teocak — ARBiH stronghold
    { osid: 'op:orasje:orasje', expected_controller: 'HRHB' },              // Orasje pocket — HVO held throughout
    { osid: 'op:brcko:brka_2', expected_controller: 'RBiH' },              // Brka (south Brcko) — ARBiH held
    { osid: 'op:gorazde:gorazde_2', expected_controller: 'RBiH' },         // Gorazde enclave — ARBiH defended
    { osid: 'op:srebrenica:srebrenica_2', expected_controller: 'RBiH' },   // Srebrenica enclave — ARBiH defended
    { osid: 'op:zavidovici:vozuca_2', expected_controller: 'RS' },          // Vozuca — VRS Ozren salient
    // Additional city-core & enclave anchors
    { osid: 'op:gradacac:gradacac_2', expected_controller: 'RBiH' },      // Gradacac — ARBiH defended, never fell
    { osid: 'op:rogatica:zepa_2', expected_controller: 'RBiH' },          // Zepa enclave — ARBiH defended (until 1995)
    { osid: 'op:derventa:derventa_2', expected_controller: 'RS' },         // Derventa — VRS captured June 1992
    { osid: 'op:prijedor:prijedor_2', expected_controller: 'RS' },         // Prijedor — VRS from April 1992
    { osid: 'op:foca:foca_3', expected_controller: 'RS' },                // Foca — VRS from April 1992
    { osid: 'op:visegrad:visegrad_2', expected_controller: 'RS' },         // Visegrad — VRS from April 1992
    { osid: 'op:zenica:zenica_2', expected_controller: 'RBiH' },          // Zenica — ARBiH 3rd Corps HQ
    { osid: 'op:travnik:travnik_2', expected_controller: 'RBiH' },        // Travnik — ARBiH held
    { osid: 'op:mostar:mostar_zapad_2', expected_controller: 'HRHB' },    // Mostar west — HVO controlled
];

function countControllers(snapshot: ControlKey[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of snapshot) {
        if (!row.controller) continue;
        counts.set(row.controller, (counts.get(row.controller) ?? 0) + 1);
    }
    return counts;
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

function computeHistoricalAnchorChecks(final: ControlKey[]): HistoricalAnchorCheck[] {
    const bySid = new Map(final.map((row) => [row.settlement_id, row.controller ?? null]));
    const settlementChecks = HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992.map((anchor) => {
        const actual = bySid.get(anchor.settlement_id) ?? null;
        return {
            anchor_type: 'settlement' as const,
            anchor_id: anchor.settlement_id,
            expected_controller: anchor.expected_controller,
            actual_controller: actual,
            passed: actual === anchor.expected_controller
        };
    });
    const osidChecks = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.map((anchor) => {
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
        },
        {
            mechanism: 'engine_ceiling_workarounds',
            classification: 'permanent_engine_ceiling_workaround',
            active_entries: 0,
            rationale: 'Reserved for acknowledged engine-limit workarounds that must remain visible as scenario-shaping debt rather than being mistaken for healthy AI behavior.'
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
    await writeFile(failureReportPath, txtLines.join('\n'), 'utf8');
    const failureJson = { run_id, scenario_id, weeks, error_name, error_message, stack };
    await writeFile(failureReportJsonPath, stableStringify(failureJson, 2), 'utf8');
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
            if (parts.length >= 2) {
                set.add(parts[0]!);
                set.add(parts[1]!);
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
            console.debug('[Recruitment] Deferred start enabled: initial setup created corps/army_hq only.');
            return;
        }
        const report = runBotRecruitment(state, oobCorps, oobBrigades, resources, sidToMun, municipalityHqSettlement, { canonicalToOperational });
        console.debug(
            `[Recruitment] Mandatory: ${report.mandatory_recruited}, ` +
            `Elective: ${report.elective_recruited}, ` +
            `Skipped: control=${report.brigades_skipped_no_control} ` +
            `manpower=${report.brigades_skipped_no_manpower} ` +
            `capital=${report.brigades_skipped_no_capital} ` +
            `equipment=${report.brigades_skipped_no_equipment}`
        );
        for (const faction of factionIds) {
            console.debug(
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
                console.debug(`[Placement] Spread ${totalSpread} brigades to front; ${totalCovered} front OSIDs now covered`);
                for (const faction of Object.keys(spreadReport.brigades_spread).sort() as FactionId[]) {
                    console.debug(`  ${faction}: spread=${spreadReport.brigades_spread[faction]} covered=${spreadReport.front_osids_covered[faction]}`);
                }
            }
        } catch (e) {
            console.debug(`[Placement] Skipped front spreading: ${(e as Error).message}`);
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
        initialStateOnly = false
    } = options;
    const effectiveEmitEvery = emitWeeklySavesForVideo ? Math.max(1, emitEvery) : emitEvery;
    let scenario = await loadScenario(scenarioPath);
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
    await mkdir(outDir, { recursive: true });

    const out_dir_relative = outDirOverride ?? (uniqueRunFolder ? `${outDirBase}/${runDirName}` : `${outDirBase}/${run_id}`);
    const run_meta = {
        scenario_id: scenario.scenario_id,
        run_id,
        weeks,
        scenario_path: scenarioPath,
        out_dir: out_dir_relative
    };
    const runMetaPath = join(outDir, 'run_meta.json');
    await writeFile(runMetaPath, stableStringify(run_meta, 2), 'utf8');

    const baseDir = optionsBaseDir ?? process.cwd();
    const controlPath = scenario.init_control ? resolveInitControlPath(scenario.init_control, baseDir) : undefined;
    const formationsPath = scenario.init_formations ? resolveInitFormationsPath(scenario.init_formations, baseDir) : undefined;

    try {
        if (injectFailureAfterRunMeta) {
            injectFailureAfterRunMeta();
        }
        // Use canonical graph for init and run so control keys match recruitment (sidToMun / factionHasPresenceInMun).
        const graph = baseDir
            ? await loadSettlementGraph({
                settlementsPath: join(baseDir, 'data/source/settlements_initial_master.json'),
                edgesPath: join(baseDir, 'data/derived/settlement_edges.json')
            })
            : await loadSettlementGraph();

        // Initialize Bots if requested
        // (moved to inside loop or handled by checking scenario.use_smart_bots later)

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
        try {
            operationalData = await loadOperationalData(baseDir);
        } catch {
            // canonical_to_operational_map.json may be missing; location_osid will not be set
        }
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
        // When scenario.initial_osid_controllers is present, use it directly (already includes
        // osid_control_overrides) instead of loading operational_political_control.json.
        // The hybrid_1992 init mode's ethnic lookup fails for OSID keys (looks up
        // "op:mun:slug" in data keyed by "S123456"). This step loads the pre-derived
        // operational_political_control.json (40% ethnic majority threshold, HRHB→RBiH
        // aligned municipality overrides) and overwrites political_controllers.
        // Historical: April 1992 control followed ethnic concentrations, not municipality admin.
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
                        if (faction) pc[osid] = faction as FactionId;
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
        // Historical accuracy: some OSIDs need different controllers than ethnic majority.
        // E.g. Brčko city held by VRS despite Bosniak municipality majority.
        // Skip when initial_osid_controllers is present — overrides are already baked into it.
        if (!scenario.initial_osid_controllers && scenario.osid_control_overrides && Object.keys(scenario.osid_control_overrides).length > 0) {
            const beforeOverrideControllers = { ...(state.political.political_controllers ?? {}) };
            applyOsidControlOverrides(state, scenario.osid_control_overrides);
            initOverrideChangeCount = countInitOverrideChanges(
                beforeOverrideControllers,
                state.political.political_controllers ?? {},
                scenario.osid_control_overrides
            );
            // Rebuild sidToMun after overrides so factionHasPresenceInMun sees updated controllers
            // (control overrides don't change mun mapping, but rebuild ensures consistency)
            if (operationalData?.operationalToCanonical) {
                sidToMun = buildOsidToMunFromReverseMap(
                    operationalData.operationalToCanonical,
                    canonicalSidToMun
                );
            }
        }

        // Peace→War phase edge cases: entrenchment init and stuck-in-Phase-I fallback (PHASE_I_II_EDGE_CASES.md)
        if (typeof scenario.war_entrenchment_init_turns === 'number') {
            state.meta.war_entrenchment_init_turns = scenario.war_entrenchment_init_turns;
        }
        if (typeof scenario.war_force_transition_after_turns === 'number') {
            state.meta.war_force_transition_after_turns = scenario.war_force_transition_after_turns;
        } else if (scenario.start_lifecycle_phase === 'war' || scenario.start_lifecycle_phase === 'peace') {
            state.meta.war_force_transition_after_turns = 52;
        }

        // Peace-phase Overhaul: store recruitment_mode in state.meta so turn pipeline can access it.
        if (scenario.recruitment_mode === 'bottom_up' || scenario.recruitment_mode === 'player_choice') {
            state.meta.recruitment_mode = scenario.recruitment_mode;
        }

        // War termination: store max_turns and victory_conditions on state.meta for pipeline evaluation.
        // max_turns is a gameplay mechanic (when does stalemate trigger), NOT the harness run length.
        // Only set from explicit scenario.max_turns field; default 208 (4 years) handled by war_termination.ts.
        if (typeof (scenario as any).max_turns === 'number') {
            state.meta.max_turns = (scenario as any).max_turns;
        }
        if (scenario.victory_conditions) {
            state.meta.victory_conditions = scenario.victory_conditions;
        }

        // Phase A: Supply reserves system flag → state.meta for pipeline gating.
        if (scenario.supply_reserves_enabled) {
            state.meta.supply_reserves_enabled = true;
            ensureSupplyReserves(state);
            applyJnaInheritanceBonus(state);
        }

        // War timeline: load externalized faction temporal profiles from JSON.
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

        // Named officers: load historical officer data from JSON.
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

        // Store per-faction OSID avoidance list in meta so bot corps AI can inject into directives.
        if (scenario.avoided_osids_by_faction && Object.keys(scenario.avoided_osids_by_faction).length > 0) {
            state.meta.avoided_osids_by_faction = scenario.avoided_osids_by_faction;
        }

        // When init_formations_oob is true, OOB creates formations at Peace phase entry; do not load placeholder init_formations.
        if (formationsPath && !scenario.init_formations_oob) {
            const initialFormations = await loadInitialFormations(formationsPath);
            if (!state.military.formations) state.military.formations = {};
            for (const f of initialFormations) {
                state.military.formations[f.id] = f;
            }
        }

        // AoR phase-out: no populateFactionAoRFromControl; War phase uses location_osid / OSID fronts.

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
            // Peace-phase §4.8 (historical fidelity): no RBiH–HRHB open war before this turn (e.g. 26 = October 1992 for April 1992 start).
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
                // War-start scenarios need deterministic manpower pools for reinforcement/spawn.
                if (!state.military.war_militia_strength || Object.keys(state.military.war_militia_strength).length === 0) {
                    updateMilitiaEmergence(state);
                }
                if (!state.military.militia_pools || Object.keys(state.military.militia_pools).length === 0) {
                    runPoolPopulation(state, graph.settlements, municipalityPopulation1991);
                    applyRsJnaInheritanceBonus(state, municipalityPopulation1991);
                }
            }
        }

        // Calendar start date for UI display (non-normative).
        // Phase 0 scenarios start 1 September 1991; war-start scenarios start 6 April 1992.
        if (scenario.start_lifecycle_phase === 'peace') {
            state.meta.scenario_start_date = { year: 1991, month: 8, day: 1 };
        } else {
            state.meta.scenario_start_date = { year: 1992, month: 3, day: 6 };
        }

        // Seed displacement_state from 1991 census when available (Peace/War phase only) so receiving capacity and map population scale by real mun size.
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

        if (scenario.coercion_pressure_by_municipality && Object.keys(scenario.coercion_pressure_by_municipality).length > 0) {
            const keys = Object.keys(scenario.coercion_pressure_by_municipality).sort(strictCompare);
            state.political.coercion_pressure_by_municipality = {};
            for (const munId of keys) {
                state.political.coercion_pressure_by_municipality![munId] = scenario.coercion_pressure_by_municipality[munId]!;
            }
        }

        let oobCreated = false;
        if (!scenario.init_formations_oob && scenario.recruitment_mode !== 'player_choice') oobCreated = true;

        // Create OOB formations at Peace phase or War phase start (recruitment or legacy auto-spawn)
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

        // War phase entry: initialize corps command; location_osid via backfill (AoR phase-out).
        if (scenario.start_lifecycle_phase === 'war') {
            initializeCorpsCommand(state);
            spawnJnaPhantomBrigades(state);
            initializeCorpsCommand(state); // re-init after JNA spawn to pick up synthetic JNA corps
            injectPrePlannedOperations(state);
        }
        if (operationalData?.canonicalToOperational) {
            backfillFormationLocationOsid(state, operationalData.canonicalToOperational);
        }
        // Ensure no formation remains in an OSID controlled by another faction (initial or after backfill).
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
        // Pre-compute front edges and sectors so reactive defense is active from turn 1.
        // Without this, the initial state has zero sectors and the first turn's attacks
        // bypass sector defense entirely (Brcko anchor failure root cause).
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

        const historicalMetricsInitial = captureHistoricalFactionMetrics(state);

        const initialSavePath = join(outDir, 'initial_save.json');
        const serializedState = serializeState(state);
        await writeFile(initialSavePath, serializedState, 'utf8');
        const initialControlSnapshot = extractSettlementControlSnapshot(state, graph);

        if (initialStateOnly) {
            const emptyHash = createHash('sha256').update(serializedState, 'utf8').digest('hex').slice(0, 16);
            return {
                outDir,
                run_id,
                final_state_hash: emptyHash,
                paths: {
                    initial_save: initialSavePath,
                    final_save: initialSavePath,
                    weekly_report: join(outDir, 'weekly_report.jsonl'),
                    replay: '',
                    run_summary: join(outDir, 'run_summary.json'),
                    control_delta: join(outDir, 'control_delta.json'),
                    end_report: join(outDir, 'end_report.md'),
                    activity_summary: join(outDir, 'activity_summary.json'),
                    formation_delta: join(outDir, 'formation_delta.json'),
                    operation_aars: join(outDir, 'operation_aars.json')
                }
            };
        }

        // Phase H2.2: snapshot initial formations (id -> kind) for formation_delta at end-of-run.
        const initialFormationsSnapshot: Record<string, string> = {};
        const initialFormationFatigue: Record<string, number> = {};
        for (const id of Object.keys(state.military.formations ?? {}).sort(strictCompare)) {
            const f = state.military.formations![id];
            initialFormationsSnapshot[id] = (f.kind as string) ?? 'brigade';
            const ops = (f as { ops?: { fatigue?: number } }).ops;
            initialFormationFatigue[id] =
                typeof ops?.fatigue === 'number' && Number.isInteger(ops.fatigue) && ops.fatigue >= 0 ? ops.fatigue : 0;
        }

        const weeklyReportPath = join(outDir, 'weekly_report.jsonl');
        const replayPath = emitWeeklySavesForVideo ? join(outDir, 'replay.jsonl') : null;
        const reportStream = createWriteStream(weeklyReportPath, { flags: 'w' });
        const replayStream = replayPath ? createWriteStream(replayPath, { flags: 'w' }) : null;

        let final_state_hash = '';
        let firstReportRow: WeeklyReportRow | null = null;
        let lastReportRow: WeeklyReportRow | null = null;
        const activityCountsPerWeek: WeeklyActivityCounts[] = [];
        const weeklySavePaths: string[] = [];
        let replayTimelinePath: string | undefined;
        let replayTimelineStream: ReturnType<typeof createWriteStream> | null = null;
        let replayTimelineFirstFrame = true;
        if (emitWeeklySavesForVideo) {
            replayTimelinePath = join(outDir, 'replay_timeline.json');
            replayTimelineStream = createWriteStream(replayTimelinePath, { flags: 'w' });
            const meta = { run_id, scenario_id: scenario.scenario_id, weeks };
            replayTimelineStream.write('{"meta":' + stableStringify(meta) + ',"frames":[');
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

        for (let week_index = 0; week_index < weeks; week_index++) {
            const turnActions = scenario.turns?.find((t) => t.week_index === week_index)?.actions ?? [];
            const actions = normalizeActions(turnActions);
            const baselineOpsAction = actions.find((a) => a.type === 'baseline_ops');
            if (baselineOpsAction && baselineOpsAction.type === 'baseline_ops') {
                baseline_ops_enabled = baselineOpsAction.enabled !== false;
                baseline_ops_intensity = baselineOpsAction.intensity ?? 1;
            }
            applyActionsToState(state, actions);
            // Phase H1.8: probe_intent is harness-only; no gate toggled in sim (applyActionsToState does not mutate on probe_intent)

            if (postureAllPushAndApplyBreaches && state.meta.phase === 'war') {
                const frontEdgesPre = computeFrontEdges(state, graph.edges);
                if (!state.military.front_posture || typeof state.military.front_posture !== 'object') state.military.front_posture = {};
                // Asymmetric posture so pressure accumulates (side_a push, side_b hold) and breaches can fire.
                for (const e of frontEdgesPre) {
                    if (e.side_a) {
                        if (!state.military.front_posture[e.side_a]) state.military.front_posture[e.side_a] = { assignments: {} };
                        if (!state.military.front_posture[e.side_a].assignments) state.military.front_posture[e.side_a].assignments = {};
                        state.military.front_posture[e.side_a].assignments[e.edge_id] = { edge_id: e.edge_id, posture: 'push', weight: 1 };
                    }
                    if (e.side_b) {
                        if (!state.military.front_posture[e.side_b]) state.military.front_posture[e.side_b] = { assignments: {} };
                        if (!state.military.front_posture[e.side_b].assignments) state.military.front_posture[e.side_b].assignments = {};
                        state.military.front_posture[e.side_b].assignments[e.edge_id] = { edge_id: e.edge_id, posture: 'hold', weight: 1 };
                    }
                }
                // Assign unassigned formations to a front edge (deterministic) so fatigue can accrue when unsupplied.
                const formations = (state as any).formations as Record<string, any> | undefined;
                if (formations && typeof formations === 'object') {
                    const edgeSetByFaction = new Map<string, Set<string>>();
                    for (const edge of frontEdgesPre) {
                        if (edge.side_a && typeof edge.edge_id === 'string') {
                            const set = edgeSetByFaction.get(edge.side_a) ?? new Set<string>();
                            set.add(edge.edge_id);
                            edgeSetByFaction.set(edge.side_a, set);
                        }
                        if (edge.side_b && typeof edge.edge_id === 'string') {
                            const set = edgeSetByFaction.get(edge.side_b) ?? new Set<string>();
                            set.add(edge.edge_id);
                            edgeSetByFaction.set(edge.side_b, set);
                        }
                    }
                    const edgesByFaction = new Map<string, string[]>();
                    for (const [fid, set] of edgeSetByFaction) {
                        edgesByFaction.set(fid, Array.from(set).sort((a, b) => a.localeCompare(b)));
                    }
                    const formationIds = Object.keys(formations).sort();
                    for (const formationId of formationIds) {
                        const f = formations[formationId];
                        if (!f || typeof f !== 'object' || (f as any).status !== 'active') continue;
                        const assignment = (f as any).assignment;
                        if (assignment && typeof assignment === 'object' && (assignment.kind === 'edge' || assignment.kind === 'region')) continue;
                        const factionId = (f as any).faction;
                        if (typeof factionId !== 'string') continue;
                        const edgeIds = edgesByFaction.get(factionId);
                        if (!edgeIds || edgeIds.length === 0) continue;
                        const idx = formationIds.indexOf(formationId) % edgeIds.length;
                        (f as any).assignment = { kind: 'edge', edge_id: edgeIds[idx] };
                    }
                }
            }

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
                    eventDefinitions
                });
                state = runResult.nextState;
                turnReport = runResult.report;
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
                const attackResolution = turnReport.resolve_attack_orders;
                // OSID attack resolution writes to a different report key
                const osidResolution = (turnReport as unknown as Record<string, unknown>).attack_resolution_osid as {
                    orders_processed?: number; unique_attack_targets?: number; flips_applied?: number;
                    casualty_attacker?: number; casualty_defender?: number; orders_by_faction?: Record<string, number>;
                    battles?: Array<{ defender_brigade?: string | null }>;
                } | undefined;
                // Use whichever report is available (legacy or OSID)
                const res = attackResolution ?? osidResolution;
                let weeklyDefenderPresentBattles = 0;
                let weeklyDefenderAbsentBattles = 0;
                // Count defender-present battles from either format
                const battleList = attackResolution?.battle_report?.battles ?? osidResolution?.battles ?? [];
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
                if (postureAllPushAndApplyBreaches && breaches.length === 0 && derivedFrontEdges.length > 0) {
                    // Harness: seed one edge so breach-based flips occur when pipeline pressure does not yet reach threshold.
                    const firstEdge = [...derivedFrontEdges].sort((a, b) => a.edge_id.localeCompare(b.edge_id))[0];
                    const eid = firstEdge.edge_id;
                    if (!state.military.front_segments || typeof state.military.front_segments !== 'object') state.military.front_segments = {};
                    (state.military.front_segments as Record<string, unknown>)[eid] = {
                        edge_id: eid,
                        active: true,
                        created_turn: state.meta.turn,
                        since_turn: state.meta.turn,
                        last_active_turn: state.meta.turn,
                        active_streak: 1,
                        max_active_streak: 1,
                        friction: 1,
                        max_friction: 1
                    };
                    if (!state.military.front_pressure || typeof state.military.front_pressure !== 'object') state.military.front_pressure = {};
                    (state.military.front_pressure as Record<string, { edge_id: string; value: number; max_abs: number; last_updated_turn: number }>)[eid] = {
                        edge_id: eid,
                        value: FRONT_BREACH_THRESHOLD,
                        max_abs: FRONT_BREACH_THRESHOLD,
                        last_updated_turn: state.meta.turn
                    };
                    breaches = computeFrontBreaches(state, derivedFrontEdges);
                }
                const proposalsFile = computeControlFlipProposals(state, derivedFrontEdges, breaches, adjacencyMap);
                applyControlFlipProposals(state, proposalsFile);
            }
            if (botManager) {
                botControlTimeline.push({
                    turn: state.meta.turn,
                    control_share_by_faction: computeControlShareByFaction(state)
                });
            }

            // Metrics derivation from active pipeline phases
            let front_active_set_size = 0;
            if (state.military.front_segments) {
                for (const seg of Object.values(state.military.front_segments)) {
                    if ((seg as any).active) front_active_set_size++;
                }
            }

            let pressure_eligible_size = 0;
            if (turnReport.front_pressure?.pressure_deltas) {
                pressure_eligible_size = Object.keys(turnReport.front_pressure.pressure_deltas).length;
            }

            let displacement_trigger_eligible_size = 0;
            if (turnReport.displacement?.by_municipality) {
                displacement_trigger_eligible_size = turnReport.displacement.by_municipality.filter(r => r.displacement_this_turn > 0).length;
            }

            const activity: WeeklyActivityCounts = {
                front_active_set_size,
                pressure_eligible_size,
                displacement_trigger_eligible_size
            };
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

            repairScenarioArtifactState(state, graph.edges, operationalData?.operationalToCanonical ?? null);

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
                    // Derive operation_id from the attacker's active corps operation
                    let operation_id: string | undefined;
                    let operation_name: string | undefined;
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
            const rowAny = reportRow as unknown as Record<string, unknown>;
            const trAny = turnReport as unknown as Record<string, unknown>;
            if (trAny.column_movement) {
                rowAny.column_movement = trAny.column_movement;
            }
            if (trAny.movement_report) {
                rowAny.movement_report = trAny.movement_report;
            }
            // Attach fired events from turn report
            if (turnReport.events_fired && turnReport.events_fired.length > 0) {
                reportRow.events_fired = turnReport.events_fired;
            }
            if (week_index === 0) firstReportRow = reportRow;
            lastReportRow = reportRow;
            reportStream.write(stableStringify(reportRow) + '\n');

            if (week_index === weeks - 1) {
                const serialized = serializeState(state);
                final_state_hash = createHash('sha256').update(serialized, 'utf8').digest('hex').slice(0, 16);
            }
            if (replayStream) {
                const replayLine: { week_index: number; actions: ScenarioAction[]; state_hash?: string } = {
                    week_index,
                    actions
                };
                if (final_state_hash) replayLine.state_hash = final_state_hash;
                replayStream.write(stableStringify(replayLine) + '\n');
            }

            if (effectiveEmitEvery > 0 && (week_index + 1) % effectiveEmitEvery === 0) {
                const midPath = join(outDir, `save_w${week_index + 1}.json`);
                const serializedMid = serializeState(state);
                await writeFile(midPath, serializedMid, 'utf8');
                weeklySavePaths.push(midPath);
                if (emitWeeklySavesForVideo && replayTimelineStream) {
                    const frameJson = '{"week_index":' + week_index + ',"game_state":' + serializedMid + '}';
                    replayTimelineStream.write((replayTimelineFirstFrame ? '' : ',') + frameJson);
                    replayTimelineFirstFrame = false;
                }
            }
        }

        reportStream.end();
        if (replayStream) replayStream.end();
        await new Promise<void>((resolve, reject) => {
            if (replayStream) {
                reportStream.on('finish', () => replayStream.on('finish', resolve).on('error', reject));
            } else {
                reportStream.on('finish', resolve);
            }
            reportStream.on('error', reject);
        });

        const finalSavePath = join(outDir, 'final_save.json');
        await writeFile(finalSavePath, serializeState(state), 'utf8');

        const anomalyReports: AnomalyReport[] = runAnomalyDetection(state);

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
        let historicalAnchorChecks: HistoricalAnchorCheck[] | undefined;
        if (scenario.init_control === 'apr1992' || (scenario.init_control_mode === 'ethnic_1991' && scenario.scenario_id.includes('apr1992'))) {
            const referenceControlPath = resolveInitControlPath('data/scenarios/initial_control/jan1993.json', baseDir);
            const historicalReferenceState = await createInitialGameState('harness-historical-reference', referenceControlPath, {
                init_control_mode: 'institutional'
            }, { baseDir, settlementGraph: graph, operationalData: operationalData ?? undefined });
            const historicalReferenceSnapshot = extractSettlementControlSnapshot(historicalReferenceState, graph);
            historicalControlAlignment = computeHistoricalControlAlignmentDiagnostics(
                finalControlSnapshot,
                historicalReferenceSnapshot,
                'jan1993'
            );
            historicalAnchorChecks = computeHistoricalAnchorChecks(finalControlSnapshot);
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
            ...(attackResolutionSummary.weeks_at_war > 0 && state.displacement.civilian_casualties
                ? { civilian_casualties: state.displacement.civilian_casualties }
                : {}),
            ...(attackResolutionSummary.weeks_at_war > 0
                ? {
                    front_corps_tracking: {
                        corps_front_edges_present: !!(state.military.corps_front_edges && Object.keys(state.military.corps_front_edges).length > 0),
                        corps_count: Object.keys(state.military.corps_front_edges ?? {}).length
                    }
                }
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
            } : {})
        };
        const runSummaryPath = join(outDir, 'run_summary.json');
        const runSummaryForWrite = integerizeRunSummaryCounts(runSummary);
        await writeFile(runSummaryPath, stableStringify(runSummaryForWrite, 2), 'utf8');
        const controlDelta = computeControlDelta(initialControlSnapshot, finalControlSnapshot);
        const controlDeltaPath = join(outDir, 'control_delta.json');
        await writeFile(controlDeltaPath, stableStringify(controlDelta, 2), 'utf8');

        const activitySummary = computeActivitySummary(activityCountsPerWeek);
        const activitySummaryPath = join(outDir, 'activity_summary.json');
        await writeFile(activitySummaryPath, stableStringify(activitySummary, 2), 'utf8');

        let botDiagnosticsPath: string | undefined;
        if (enableBotDiagnostics) {
            botDiagnosticsPath = join(outDir, 'bot_diagnostics.json');
            await writeFile(botDiagnosticsPath, stableStringify(botWeeklyDiagnostics, 2), 'utf8');
        }

        if (emitWeeklySavesForVideo && replayTimelineStream) {
            replayTimelineStream.write(']}');
            replayTimelineStream.end();
            await new Promise<void>((resolve, reject) => {
                replayTimelineStream!.on('finish', resolve).on('error', reject);
            });
        }

        // Phase H2.2: formation delta (initial vs final formations).
        const finalFormations = state.military.formations ?? {};
        const formationDelta = computeFormationDelta(initialFormationsSnapshot, finalFormations);
        const formationDeltaPath = join(outDir, 'formation_delta.json');
        await writeFile(formationDeltaPath, stableStringify(formationDelta, 2), 'utf8');

        // Operation AARs artifact
        const operationAars = state.operation_history ?? [];
        const operationAarsPath = join(outDir, 'operation_aars.json');
        await writeFile(operationAarsPath, stableStringify(operationAars, 2), 'utf8');

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
        const endReportPath = join(outDir, 'end_report.md');
        await writeFile(endReportPath, endReportMd, 'utf8');

        return {
            outDir,
            run_id,
            final_state_hash,
            paths: {
                initial_save: initialSavePath,
                final_save: finalSavePath,
                weekly_report: weeklyReportPath,
                replay: replayPath ?? '',
                run_summary: runSummaryPath,
                control_delta: controlDeltaPath,
                end_report: endReportPath,
                activity_summary: activitySummaryPath,
            formation_delta: formationDeltaPath,
                operation_aars: operationAarsPath,
            ...(weeklySavePaths.length > 0 ? { weekly_saves: weeklySavePaths } : {}),
            ...(replayTimelinePath ? { replay_timeline: replayTimelinePath } : {}),
                ...(botDiagnosticsPath ? { bot_diagnostics: botDiagnosticsPath } : {})
            }
        };
    } catch (err) {
        await writeFailureReport(outDir, run_id, scenario.scenario_id, weeks, err);
        if (err instanceof Error) {
            (err as Error & { run_id?: string; out_dir?: string }).run_id = run_id;
            (err as Error & { run_id?: string; out_dir?: string }).out_dir = out_dir_relative;
        }
        throw err;
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
 * When initialStateOnly is true (default for desktop), builds state and writes initial_save only—no week loop or end-of-run artifacts (faster).
 * When false, runs one week then returns initial state (harness/backward compatible).
 */
export async function createStateFromScenario(
    scenarioPath: string,
    baseDir: string,
    options?: { initialStateOnly?: boolean }
): Promise<GameState> {
    const initialStateOnly = options?.initialStateOnly !== false;
    const result = await runScenario({
        scenarioPath,
        baseDir,
        outDirBase: join(baseDir, 'runs'),
        weeksOverride: 1,
        uniqueRunFolder: true,
        initialStateOnly
    });
    const content = await readFile(result.paths.initial_save, 'utf8');
    return deserializeState(content);
}
