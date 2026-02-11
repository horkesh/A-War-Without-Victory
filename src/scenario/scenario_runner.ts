/**
 * Phase H1.1: Headless scenario harness.
 * Run N weekly turns deterministically; emit final_save.json, weekly_report.jsonl, replay.jsonl, run_summary.json.
 * No timestamps; no randomness; no derived state in saves (Engine Invariants §13.1).
 */

import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { loadSettlementGraph } from '../map/settlements.js';
import type { MunicipalityPopulation1991 } from '../sim/turn_pipeline.js';
import { CURRENT_SCHEMA_VERSION } from '../state/game_state.js';
import type { GameState } from '../state/game_state.js';
import { prepareNewGameState } from '../state/initialize_new_game_state.js';
import { seedOrganizationalPenetrationFromControl } from '../state/seed_organizational_penetration_from_control.js';
import { serializeState } from '../state/serialize.js';
import { runTurn } from '../sim/turn_pipeline.js';
import { runOneTurn } from '../state/turn_pipeline.js';
import { loadScenario, computeRunId, normalizeActions, resolveInitControlPath, resolveInitFormationsPath } from './scenario_loader.js';
import { loadInitialFormations } from './initial_formations_loader.js';
import {
  loadOobBrigades,
  loadOobCorps,
  loadMunicipalityHqSettlement,
  type OobBrigade,
  type OobCorps
} from './oob_loader.js';
import {
  createOobFormationsAtPhaseIEntry,
  buildSidToMunFromSettlements
} from './oob_phase_i_entry.js';
import type { Scenario, ScenarioAction } from './scenario_types.js';
import { buildWeeklyReport } from './scenario_reporting.js';
import type { WeeklyReportRow, WeeklyActivityCounts } from './scenario_reporting.js';
import {
  extractSettlementControlSnapshot,
  computeControlDelta,
  formatEndReportMarkdown,
  computeActivitySummary,
  computeFormationDelta,
  evaluateBotBenchmarks,
  computeArmyStrengthsSummary,
  type BaselineOpsSummary,
  type BotBenchmarkDefinition,
  type BotControlShareRow,
  type BotWeeklyDiagnosticsRow,
  type ControlEventsSummary,
  type FormationFatigueSummary
} from './scenario_end_report.js';
import type { ControlEvent } from '../sim/phase_i/control_flip.js';
import {
  buildCompareResult,
  formatProbeCompareMarkdown,
  type CompareResult
} from './scenario_probe_compare.js';
import { buildOpsCompareConclusion, formatOpsCompareMarkdown } from './ops_compare.js';
import { getEligiblePressureEdges } from '../sim/phase_e/pressure_eligibility.js';
import { getFrontActiveSettlements } from '../sim/phase_e/aor_instantiation.js';
import { buildSettlementsByMun } from '../sim/phase_i/control_strain.js';
import { computeFrontEdges } from '../map/front_edges.js';
import { computeFrontBreaches, FRONT_BREACH_THRESHOLD } from '../state/front_breaches.js';
import {
  buildAdjacencyMap,
  computeControlFlipProposals,
  applyControlFlipProposals
} from '../state/control_flip_proposals.js';
import { ensureRbihHrhbState } from '../sim/phase_i/alliance_update.js';
import { aggregateSettlementDisplacementToMunicipalities } from '../sim/phase_f/displacement_municipality_aggregation.js';
import {
  computeEngagementLevel,
  applyBaselineOpsExhaustion,
  applyBaselineOpsDisplacement
} from './baseline_ops_scheduler.js';
import { stableStringify } from '../utils/stable_json.js';
import { BotManager } from '../sim/bot/bot_manager.js';
import { getBotStrategyProfile } from '../sim/bot/bot_strategy.js';
import { evaluateVictoryConditions } from './victory_conditions.js';

/** Apply scenario actions to state. Noop/note do nothing to state. */
export function applyActionsToState(_state: GameState, _actions: ScenarioAction[]): void {
  // No-op and note do not mutate state. Future action types will mutate here.
}

import {
  populateFactionAoRFromControl,
  ensureFormationHomeMunsInFactionAoR
} from './aor_init.js';
export { populateFactionAoRFromControl, ensureFormationHomeMunsInFactionAoR };

/**
 * Build initial GameState using canonical constructor (fixed minimal config; no env-dependent values).
 * Uses same default loadSettlementGraph() and prepareNewGameState() as sim_run; requires
 * municipality controller mapping (data/source/municipality_political_controllers.json or
 * 1990 mapping when graph has mun1990_id) to exist.
 * When controlPath is set (Option A), uses that file for initial political control (mun1990-only format).
 */
async function createInitialGameState(seed: string, controlPath?: string): Promise<GameState> {
  const graph = await loadSettlementGraph();
  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed, phase: 'phase_ii' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  };
  const CANONICAL_IDS = ['RBiH', 'RS', 'HRHB'] as const;
  state.factions = CANONICAL_IDS.map((id) => {
    let supply_sources: string[] = [];
    if (id === 'RBiH') supply_sources = ['S166499', 'S162973', 'S155551', 'S100838']; // Sarajevo, Zenica, Tuzla, Bihac
    if (id === 'RS') supply_sources = ['S200026', 'S216984', 'S200891']; // Banja Luka, Pale, Bijeljina
    if (id === 'HRHB') supply_sources = ['S166090', 'S120880', 'S130486']; // Mostar, Grude, Livno

    return {
      id,
      profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
      areasOfResponsibility: [],
      supply_sources,
      negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }
    };
  });
  await prepareNewGameState(state, graph, controlPath);
  if (controlPath) {
    seedOrganizationalPenetrationFromControl(state, graph.settlements);
  }
  return state;
}

/** H1.11: Scope for baseline_ops displacement (derived-only; no new mechanics). */
export type BaselineOpsScopeMode = 'all_front_active' | 'static_front_only' | 'fluid_front_only';

export interface RunScenarioOptions {
  scenarioPath: string;
  outDirBase?: string;
  emitEvery?: number;
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
  /** When true: before each turn set front_posture to push on all front edges for both sides; after each turn apply breach-based control flips. */
  postureAllPushAndApplyBreaches?: boolean;
  use_smart_bots?: boolean;
  /** Optional per-week AI diagnostics artifact (bot_diagnostics.json). */
  bot_diagnostics?: boolean;
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
    /** Phase H2.2: control events log (one JSON line per event). */
    control_events: string;
    /** Phase H2.2: formation delta (initial vs final). */
    formation_delta: string;
    /** Optional per-week smart-bot diagnostics. */
    bot_diagnostics?: string;
  };
}

function computeControlShareByFaction(state: GameState): Array<{ faction: string; control_share: number }> {
  const controllers = state.political_controllers ?? {};
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

/** H1.11: Collect settlement IDs from Phase II front descriptors filtered by stability. Edge ID format: a__b. */
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
  return Array.from(set).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export async function runScenario(options: RunScenarioOptions): Promise<RunScenarioResult> {
  const {
    scenarioPath,
    outDirBase = 'runs',
    emitEvery = 0,
    weeksOverride,
    injectFailureAfterRunMeta,
    filterProbeIntent = false,
    scopeMode = 'all_front_active',
    baselineOpsScalar = 1,
    outDirOverride,
    postureAllPushAndApplyBreaches = false,
    use_smart_bots = false,
    bot_diagnostics = false
  } = options;
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
  const outDir = outDirOverride ?? join(outDirBase, run_id);
  await mkdir(outDir, { recursive: true });

  const out_dir_relative = outDirOverride ?? `${outDirBase}/${run_id}`;
  const run_meta = {
    scenario_id: scenario.scenario_id,
    run_id,
    weeks,
    scenario_path: scenarioPath,
    out_dir: out_dir_relative
  };
  const runMetaPath = join(outDir, 'run_meta.json');
  await writeFile(runMetaPath, stableStringify(run_meta, 2), 'utf8');

  const baseDir = process.cwd();
  const controlPath = scenario.init_control ? resolveInitControlPath(scenario.init_control, baseDir) : undefined;
  const formationsPath = scenario.init_formations ? resolveInitFormationsPath(scenario.init_formations, baseDir) : undefined;

  try {
    if (injectFailureAfterRunMeta) {
      injectFailureAfterRunMeta();
    }
    const graph = await loadSettlementGraph();

    // Initialize Bots if requested
    // (moved to inside loop or handled by checking scenario.use_smart_bots later)

    let municipalityPopulation1991: MunicipalityPopulation1991 | undefined;
    try {
      const popPath = join(baseDir, 'data/derived/municipality_population_1991.json');
      const popRaw = JSON.parse(await readFile(popPath, 'utf8')) as {
        by_mun1990_id?: Record<string, { total: number; breakdown?: { bosniak: number; serb: number; croat: number; other: number } }>;
      };
      const byMun = popRaw.by_mun1990_id ?? {};
      const flat: MunicipalityPopulation1991 = {};
      for (const [munId, v] of Object.entries(byMun)) {
        const b = v?.breakdown;
        flat[munId] = {
          total: v?.total ?? 0,
          bosniak: b?.bosniak ?? 0,
          serb: b?.serb ?? 0,
          croat: b?.croat ?? 0,
          other: b?.other ?? 0
        };
      }
      municipalityPopulation1991 = flat;
    } catch {
      municipalityPopulation1991 = undefined;
    }
    let oobBrigades: OobBrigade[] = [];
    let oobCorps: OobCorps[] = [];
    let municipalityHqSettlement: Record<string, string> = {};
    if (scenario.init_formations_oob) {
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
    const sidToMun = buildSidToMunFromSettlements(graph.settlements);

    let state = await createInitialGameState('harness-seed', controlPath);

    // When init_formations_oob is true, OOB creates formations at Phase I entry; do not load placeholder init_formations.
    if (formationsPath && !scenario.init_formations_oob) {
      const initialFormations = await loadInitialFormations(formationsPath);
      if (!state.formations) state.formations = {};
      for (const f of initialFormations) {
        state.formations[f.id] = f;
      }
    }

    // Phase I forbids AoR; only populate when starting in phase_ii (or legacy no start_phase).
    if (scenario.start_phase !== 'phase_0' && scenario.start_phase !== 'phase_i') {
      populateFactionAoRFromControl(state, graph.settlements.keys());
    }

    if (scenario.start_phase === 'phase_0') {
      const refTurn = scenario.phase_0_referendum_turn ?? 0;
      const warTurn = scenario.phase_0_war_start_turn ?? refTurn + 4;
      state.meta.phase = 'phase_0';
      state.meta.turn = 0;
      state.meta.referendum_held = true;
      state.meta.referendum_turn = refTurn;
      state.meta.war_start_turn = warTurn;
      for (const f of state.factions ?? []) {
        if (f.id === 'RS') (f as { prewar_capital?: number }).prewar_capital = 100;
        if (f.id === 'RBiH') (f as { prewar_capital?: number }).prewar_capital = 70;
        if (f.id === 'HRHB') (f as { prewar_capital?: number }).prewar_capital = 40;
        (f as { declaration_pressure?: number }).declaration_pressure = 0;
        if (f.id === 'RS' || f.id === 'HRHB') {
          (f as { declared?: boolean }).declared = true;
          (f as { declaration_turn?: number | null }).declaration_turn = 0;
        }
      }
    }

    if (scenario.start_phase === 'phase_i') {
      state.meta.phase = 'phase_i';
      state.meta.turn = 0;
      state.meta.referendum_held = true;
      state.meta.referendum_turn = 0;
      state.meta.war_start_turn = 0;
      // Phase I §4.8 (historical fidelity): no RBiH–HRHB open war before this turn (e.g. 26 = October 1992 for April 1992 start).
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

    if (scenario.formation_spawn_directive) {
      state.formation_spawn_directive = scenario.formation_spawn_directive;
    }

    if (scenario.coercion_pressure_by_municipality && Object.keys(scenario.coercion_pressure_by_municipality).length > 0) {
      const keys = Object.keys(scenario.coercion_pressure_by_municipality).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      state.coercion_pressure_by_municipality = {};
      for (const munId of keys) {
        state.coercion_pressure_by_municipality![munId] = scenario.coercion_pressure_by_municipality[munId]!;
      }
    }

    let oobCreated = false;
    if (!scenario.init_formations_oob) oobCreated = true;
    // Create OOB formations at Phase I start so turn-0 flip and initial save see them (historical fidelity: JNA/early RS).
    if (scenario.init_formations_oob && scenario.start_phase === 'phase_i' && !oobCreated) {
      createOobFormationsAtPhaseIEntry(state, oobCorps, oobBrigades, municipalityHqSettlement, sidToMun, municipalityPopulation1991);
      oobCreated = true;
    }

    const initialSavePath = join(outDir, 'initial_save.json');
    await writeFile(initialSavePath, serializeState(state), 'utf8');
    const initialControlSnapshot = extractSettlementControlSnapshot(state, graph);

    // Phase H2.2: snapshot initial formations (id -> kind) for formation_delta at end-of-run.
    const initialFormationsSnapshot: Record<string, string> = {};
    const initialFormationFatigue: Record<string, number> = {};
    for (const id of Object.keys(state.formations ?? {}).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
      const f = state.formations![id];
      initialFormationsSnapshot[id] = (f.kind as string) ?? 'brigade';
      const ops = (f as { ops?: { fatigue?: number } }).ops;
      initialFormationFatigue[id] =
        typeof ops?.fatigue === 'number' && Number.isInteger(ops.fatigue) && ops.fatigue >= 0 ? ops.fatigue : 0;
    }

    const weeklyReportPath = join(outDir, 'weekly_report.jsonl');
    const replayPath = join(outDir, 'replay.jsonl');
    const reportStream = createWriteStream(weeklyReportPath, { flags: 'w' });
    const replayStream = createWriteStream(replayPath, { flags: 'w' });

    let final_state_hash = '';
    let firstReportRow: WeeklyReportRow | null = null;
    let lastReportRow: WeeklyReportRow | null = null;
    const activityCountsPerWeek: WeeklyActivityCounts[] = [];
    let baseline_ops_enabled = false;
    let baseline_ops_intensity = 1;
    const engagementLevelsPerWeek: number[] = [];
    const settlementsByMun = buildSettlementsByMun(graph.settlements);
    /** Phase H2.2: collect control events from each turn for control_events.jsonl. */
    const events_all: ControlEvent[] = [];
    const shouldApplyBreaches = postureAllPushAndApplyBreaches || scenario.use_smart_bots === true;
    const adjacencyMap = shouldApplyBreaches ? buildAdjacencyMap(graph.edges) : null;
    const enableBotDiagnostics = bot_diagnostics || scenario.bot_diagnostics === true;
    const botWeeklyDiagnostics: BotWeeklyDiagnosticsRow[] = [];
    const botControlTimeline: BotControlShareRow[] = [];

    const botManager = (scenario.use_smart_bots || use_smart_bots)
      ? new BotManager({
          seed: `${state.meta.seed}:smart-bots`,
          difficulty: scenario.bot_difficulty,
          scenarioStartWeek: scenario.scenario_start_week
        })
      : null;

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

      if (postureAllPushAndApplyBreaches && state.meta.phase === 'phase_ii') {
        const frontEdgesPre = computeFrontEdges(state, graph.edges);
        if (!state.front_posture || typeof state.front_posture !== 'object') state.front_posture = {};
        // Asymmetric posture so pressure accumulates (side_a push, side_b hold) and breaches can fire.
        for (const e of frontEdgesPre) {
          if (e.side_a) {
            if (!state.front_posture[e.side_a]) state.front_posture[e.side_a] = { assignments: {} };
            if (!state.front_posture[e.side_a].assignments) state.front_posture[e.side_a].assignments = {};
            state.front_posture[e.side_a].assignments[e.edge_id] = { edge_id: e.edge_id, posture: 'push', weight: 1 };
          }
          if (e.side_b) {
            if (!state.front_posture[e.side_b]) state.front_posture[e.side_b] = { assignments: {} };
            if (!state.front_posture[e.side_b].assignments) state.front_posture[e.side_b].assignments = {};
            state.front_posture[e.side_b].assignments[e.edge_id] = { edge_id: e.edge_id, posture: 'hold', weight: 1 };
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
        const botRun = botManager.runBots(state, currentFrontEdges);
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
      if (state.meta.phase === 'phase_0') {
        const result = runOneTurn(state, { seed: state.meta.seed });
        state = result.state;
        turnReport = {
          seed: state.meta.seed,
          phases: result.phasesExecuted.map((name) => ({ name })),
          phase_i_control_flip: { flips: [], municipalities_evaluated: 0, control_events: [] },
          phase_f_displacement: undefined,
          phase_ii_front_emergence: []
        } as Awaited<ReturnType<typeof runTurn>>['report'];
        if (scenario.init_formations_oob && !oobCreated && state.meta.phase === 'phase_i') {
          createOobFormationsAtPhaseIEntry(state, oobCorps, oobBrigades, municipalityHqSettlement, sidToMun, municipalityPopulation1991);
          oobCreated = true;
        }
      } else {
        const runResult = await runTurn(state, {
          seed: state.meta.seed,
          settlementEdges: graph.edges,
          municipalityPopulation1991,
          municipalityHqSettlement: Object.keys(municipalityHqSettlement).length > 0 ? municipalityHqSettlement : undefined,
          historicalNameLookup
        });
        state = runResult.nextState;
        turnReport = runResult.report;
        if (scenario.init_formations_oob && !oobCreated && state.meta.phase === 'phase_i') {
          createOobFormationsAtPhaseIEntry(state, oobCorps, oobBrigades, municipalityHqSettlement, sidToMun, municipalityPopulation1991);
          oobCreated = true;
        }

        if (turnReport.phase_i_control_flip?.control_events) {
          const count = turnReport.phase_i_control_flip.control_events.length;
          const flipCount = turnReport.phase_i_control_flip.flips.length;
          // console.log(`[DEBUG] Turn ${week_index}: ${flipCount} flips, ${count} events reported`);
          if (count > 0) {
            console.log(`[DEBUG] Turn ${week_index}: Pushing ${count} events`);
          }
          events_all.push(...turnReport.phase_i_control_flip.control_events);
        } else {
          // console.log(`[DEBUG] Turn ${week_index}: No phase_i_control_flip report`);
        }
      }

      if (shouldApplyBreaches && adjacencyMap && state.meta.phase === 'phase_ii') {
        const derivedFrontEdges = computeFrontEdges(state, graph.edges);
        let breaches = computeFrontBreaches(state, derivedFrontEdges);
        if (postureAllPushAndApplyBreaches && breaches.length === 0 && derivedFrontEdges.length > 0) {
          // Harness: seed one edge so breach-based flips occur when pipeline pressure does not yet reach threshold.
          const firstEdge = [...derivedFrontEdges].sort((a, b) => a.edge_id.localeCompare(b.edge_id))[0];
          const eid = firstEdge.edge_id;
          if (!state.front_segments || typeof state.front_segments !== 'object') state.front_segments = {};
          (state.front_segments as Record<string, unknown>)[eid] = {
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
          if (!state.front_pressure || typeof state.front_pressure !== 'object') state.front_pressure = {};
          (state.front_pressure as Record<string, { edge_id: string; value: number; max_abs: number; last_updated_turn: number }>)[eid] = {
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

      const controlEvents = turnReport.phase_i_control_flip?.control_events ?? [];
      for (const e of controlEvents) events_all.push(e);

      // Metrics derivation from active pipeline phases
      let front_active_set_size = 0;
      if (state.front_segments) {
        for (const seg of Object.values(state.front_segments)) {
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
          const descriptors = turnReport.phase_ii_front_emergence;
          const stabilityFilter = scopeMode === 'static_front_only' ? 'static' : 'fluid';
          frontActiveIds = settlementIdsFromFrontDescriptors(descriptors, stabilityFilter);
        } else {
          const eligible = getEligiblePressureEdges(state, graph.edges);
          frontActiveIds = Array.from(getFrontActiveSettlements(eligible));
        }
        applyBaselineOpsDisplacement(state, frontActiveIds, level, scalar);
        aggregateSettlementDisplacementToMunicipalities(state, settlementsByMun);
        ops = { enabled: true, level };
      }

      const reportRow = buildWeeklyReport(state, activity, ops);
      if (week_index === 0) firstReportRow = reportRow;
      lastReportRow = reportRow;
      reportStream.write(stableStringify(reportRow) + '\n');

      const replayLine: { week_index: number; actions: ScenarioAction[]; state_hash?: string } = {
        week_index,
        actions
      };
      if (week_index === weeks - 1) {
        const serialized = serializeState(state);
        final_state_hash = createHash('sha256').update(serialized, 'utf8').digest('hex').slice(0, 16);
        replayLine.state_hash = final_state_hash;
      }
      replayStream.write(stableStringify(replayLine) + '\n');

      if (emitEvery > 0 && (week_index + 1) % emitEvery === 0) {
        const midPath = join(outDir, `save_w${week_index + 1}.json`);
        await writeFile(midPath, serializeState(state), 'utf8');
      }
    }

    reportStream.end();
    replayStream.end();
    await new Promise<void>((resolve, reject) => {
      reportStream.on('finish', () => replayStream.on('finish', resolve).on('error', reject));
      reportStream.on('error', reject);
    });

    const finalSavePath = join(outDir, 'final_save.json');
    await writeFile(finalSavePath, serializeState(state), 'utf8');

    let breachDiagnostic: { max_abs_pressure: number; breach_count_last_turn: number } | undefined;
    if (postureAllPushAndApplyBreaches && state.front_pressure && typeof state.front_pressure === 'object') {
      let maxAbs = 0;
      for (const rec of Object.values(state.front_pressure as Record<string, { value?: number }>)) {
        const v = rec?.value;
        if (rec && typeof v === 'number' && Number.isInteger(v)) maxAbs = Math.max(maxAbs, Math.abs(v));
      }
      const lastTurnEdges = computeFrontEdges(state, graph.edges);
      const lastTurnBreaches = computeFrontBreaches(state, lastTurnEdges);
      breachDiagnostic = { max_abs_pressure: maxAbs, breach_count_last_turn: lastTurnBreaches.length };
    }
    let botBenchmarkSummary: ReturnType<typeof evaluateBotBenchmarks> | undefined;
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
    }
    const victoryEvaluation = evaluateVictoryConditions(state, scenario.victory_conditions);
    const runSummary = {
      scenario_id: scenario.scenario_id,
      weeks,
      run_id,
      final_state_hash,
      summary: {
        final_turn: state.meta.turn,
        phase: state.meta.phase
      },
      ...(botBenchmarkSummary ? { bot_benchmark_evaluation: botBenchmarkSummary } : {}),
      ...(victoryEvaluation ? { victory: victoryEvaluation } : {}),
      ...(breachDiagnostic ? { breach_diagnostic: breachDiagnostic } : {})
    };
    const runSummaryPath = join(outDir, 'run_summary.json');
    await writeFile(runSummaryPath, stableStringify(runSummary, 2), 'utf8');

    const finalControlSnapshot = extractSettlementControlSnapshot(state, graph);
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

    // Phase H2.2: sort and write control_events.jsonl (turn asc, mechanism asc, settlement_id asc).
    events_all.sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      const mech = (a.mechanism ?? '').localeCompare(b.mechanism ?? '');
      if (mech !== 0) return mech;
      return (a.settlement_id ?? '').localeCompare(b.settlement_id ?? '');
    });
    const controlEventsPath = join(outDir, 'control_events.jsonl');
    const controlEventsStream = createWriteStream(controlEventsPath, { flags: 'w' });
    for (const ev of events_all) {
      controlEventsStream.write(stableStringify(ev) + '\n');
    }
    controlEventsStream.end();
    await new Promise<void>((resolve, reject) => {
      controlEventsStream.on('finish', resolve).on('error', reject);
    });

    // Phase H2.2: formation delta (initial vs final formations).
    const finalFormations = state.formations ?? {};
    const formationDelta = computeFormationDelta(initialFormationsSnapshot, finalFormations);
    const formationDeltaPath = join(outDir, 'formation_delta.json');
    await writeFile(formationDeltaPath, stableStringify(formationDelta, 2), 'utf8');

    let formationFatigueSummary: FormationFatigueSummary | null = null;
    const formationIds = Object.keys(finalFormations).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
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

    const byMechanism = new Map<string, number>();
    for (const e of events_all) {
      const m = e.mechanism ?? 'unknown';
      byMechanism.set(m, (byMechanism.get(m) ?? 0) + 1);
    }
    const controlEventsSummary: ControlEventsSummary = {
      total: events_all.length,
      by_mechanism: Array.from(byMechanism.entries())
        .map(([mechanism, count]) => ({ mechanism, count }))
        .sort((a, b) => (a.mechanism < b.mechanism ? -1 : a.mechanism > b.mechanism ? 1 : 0))
    };

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
      controlEventsSummary,
      formationDelta,
      formationFatigueSummary,
      armyStrengthsSummary,
      victoryEvaluation,
      botBenchmarkSummary: botBenchmarkSummary ?? null,
      botWeeklyDiagnostics: enableBotDiagnostics ? botWeeklyDiagnostics : null
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
        replay: replayPath,
        run_summary: runSummaryPath,
        control_delta: controlDeltaPath,
        end_report: endReportPath,
        activity_summary: activitySummaryPath,
        control_events: controlEventsPath,
        formation_delta: formationDeltaPath,
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
