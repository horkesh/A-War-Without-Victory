/**
 * Phase H1.5: End-of-run report — control delta and key trajectory highlights.
 * Pure, deterministic; no timestamps; no derived state in saves.
 */

import type { GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';
import type { LoadedSettlementGraph } from '../map/settlements.js';
import type { WeeklyReportRow, WeeklyActivityCounts } from './scenario_reporting.js';
import type { VictoryEvaluation } from './victory_conditions.js';

export interface ControlKey {
  settlement_id: string;
  municipality_id: string | null;
  controller: string | null;
}

/**
 * Extract settlement control snapshot from state and graph. Deterministic: settlements in stable ID order.
 */
export function extractSettlementControlSnapshot(
  state: GameState,
  graph: LoadedSettlementGraph
): ControlKey[] {
  const sids = Array.from(graph.settlements.keys()).sort((a, b) => a.localeCompare(b));
  const pc = state.political_controllers ?? {};
  const out: ControlKey[] = [];
  for (const sid of sids) {
    const record = graph.settlements.get(sid);
    const municipality_id =
      record == null ? null : (record.mun1990_id ?? record.mun_code ?? null);
    const raw = pc[sid];
    const controller = raw === undefined || raw === null ? null : String(raw);
    out.push({
      settlement_id: sid,
      municipality_id: municipality_id ?? null,
      controller
    });
  }
  return out;
}

export interface ControlFlip {
  settlement_id: string;
  municipality_id: string | null;
  from: string | null;
  to: string | null;
}

export interface ControlDeltaResult {
  total_flips: number;
  flips: ControlFlip[];
  flips_by_direction: Array<{ from: string | null; to: string | null; count: number }>;
  flips_by_municipality: Array<{ municipality_id: string | null; count: number }>;
  net_control_counts_before: Array<{ controller: string | null; count: number }>;
  net_control_counts_after: Array<{ controller: string | null; count: number }>;
  net_control_count_delta: Array<{ controller: string | null; delta: number }>;
}

function nullLast(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

/**
 * Compute control delta between before and after snapshots. Deterministic ordering.
 */
export function computeControlDelta(
  before: ControlKey[],
  after: ControlKey[]
): ControlDeltaResult {
  const beforeMap = new Map(before.map((k) => [k.settlement_id, k]));
  const afterMap = new Map(after.map((k) => [k.settlement_id, k]));

  const flips: ControlFlip[] = [];
  for (const sid of beforeMap.keys()) {
    const b = beforeMap.get(sid);
    const a = afterMap.get(sid);
    if (!b || !a) continue;
    const from = b.controller;
    const to = a.controller;
    if (from !== to) {
      flips.push({
        settlement_id: sid,
        municipality_id: b.municipality_id,
        from,
        to
      });
    }
  }
  flips.sort((x, y) => {
    const cm = nullLast(x.municipality_id, y.municipality_id);
    if (cm !== 0) return cm;
    return x.settlement_id.localeCompare(y.settlement_id);
  });

  const dirCount = new Map<string, number>();
  for (const f of flips) {
    const key = `${f.from ?? 'null'}→${f.to ?? 'null'}`;
    dirCount.set(key, (dirCount.get(key) ?? 0) + 1);
  }
  const flips_by_direction = Array.from(dirCount.entries())
    .map(([key, count]) => {
      const [from, to] = key.split('→');
      return {
        from: from === 'null' ? null : from,
        to: to === 'null' ? null : to,
        count
      };
    })
    .sort((a, b) => {
      const c0 = nullLast(a.from, b.from);
      if (c0 !== 0) return c0;
      return nullLast(a.to, b.to);
    });

  const munCount = new Map<string | null, number>();
  for (const f of flips) {
    const mid = f.municipality_id;
    munCount.set(mid, (munCount.get(mid) ?? 0) + 1);
  }
  const flips_by_municipality = Array.from(munCount.entries())
    .map(([municipality_id, count]) => ({ municipality_id, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return nullLast(a.municipality_id, b.municipality_id);
    });

  function netCounts(keys: ControlKey[]): Array<{ controller: string | null; count: number }> {
    const m = new Map<string | null, number>();
    for (const k of keys) {
      const c = k.controller;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([controller, count]) => ({ controller, count }))
      .sort((a, b) => nullLast(a.controller, b.controller));
  }

  const net_control_counts_before = netCounts(before);
  const net_control_counts_after = netCounts(after);

  const deltaMap = new Map<string | null, number>();
  for (const { controller, count } of net_control_counts_after) {
    deltaMap.set(controller, count);
  }
  for (const { controller, count } of net_control_counts_before) {
    deltaMap.set(controller, (deltaMap.get(controller) ?? 0) - count);
  }
  const net_control_count_delta = Array.from(deltaMap.entries())
    .map(([controller, delta]) => ({ controller, delta }))
    .filter((e) => e.delta !== 0)
    .sort((a, b) => nullLast(a.controller, b.controller));

  return {
    total_flips: flips.length,
    flips,
    flips_by_direction,
    flips_by_municipality,
    net_control_counts_before,
    net_control_counts_after,
    net_control_count_delta
  };
}

/** Phase H1.9: Baseline ops run summary (reporting only). */
export interface BaselineOpsSummary {
  intensity: number;
  avg_level: number;
  nonzero_exhaustion: boolean;
  nonzero_displacement: boolean;
}

/** Phase H2.2: Formation delta (initial vs final formations). Harness-only; not in GameState. */
export interface FormationDeltaResult {
  formations_added: string[];
  formations_removed: string[];
  counts_initial_by_kind: Record<string, number>;
  counts_final_by_kind: Record<string, number>;
  counts_added_by_kind: Record<string, number>;
  counts_removed_by_kind: Record<string, number>;
}

/**
 * Compute formation delta from initial and final formation snapshots.
 * initialKinds: id -> kind (from start of run); finalFormations: id -> { kind? } (from end state).
 */
export function computeFormationDelta(
  initialKinds: Record<string, string>,
  finalFormations: Record<string, { kind?: string }>
): FormationDeltaResult {
  const initialIds = new Set(Object.keys(initialKinds));
  const finalIds = new Set(Object.keys(finalFormations));

  const formations_added = Object.keys(finalFormations)
    .filter((id) => !initialIds.has(id))
    .sort(strictCompare);
  const formations_removed = Object.keys(initialKinds)
    .filter((id) => !finalIds.has(id))
    .sort(strictCompare);

  function countByKind(ids: string[], getKind: (id: string) => string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const id of ids) {
      const k = getKind(id);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const keys = Object.keys(counts).sort(strictCompare);
    const out: Record<string, number> = {};
    for (const k of keys) out[k] = counts[k];
    return out;
  }

  const counts_initial_by_kind = countByKind(Object.keys(initialKinds), (id) => initialKinds[id] ?? 'brigade');
  const counts_final_by_kind = countByKind(
    Object.keys(finalFormations),
    (id) => (finalFormations[id]?.kind as string) ?? 'brigade'
  );
  const counts_added_by_kind = countByKind(
    formations_added,
    (id) => (finalFormations[id]?.kind as string) ?? 'brigade'
  );
  const counts_removed_by_kind = countByKind(
    formations_removed,
    (id) => initialKinds[id] ?? 'brigade'
  );

  return {
    formations_added,
    formations_removed,
    counts_initial_by_kind,
    counts_final_by_kind,
    counts_added_by_kind,
    counts_removed_by_kind
  };
}

/** Phase H2.2: Control events summary (for end report section). */
export interface ControlEventsSummary {
  total: number;
  by_mechanism: Array<{ mechanism: string; count: number }>;
}

/** Brigade casualties proxy: formation fatigue (initial vs final). */
export interface FormationFatigueSummary {
  by_formation: Array<{ id: string; faction: string; name?: string; fatigue_initial: number; fatigue_final: number }>;
  total_fatigue_initial: number;
  total_fatigue_final: number;
}

/** Army strengths at end of scenario: formations by faction+kind, militia pools. */
export interface ArmyStrengthsSummary {
  formations_by_faction: Array<{ faction: string; militia: number; brigade: number; other: number; total: number }>;
  militia_pools_by_faction: Array<{ faction: string; available: number; committed: number; exhausted: number }>;
  aor_counts_by_faction: Array<{ faction: string; settlement_count: number }>;
}

export interface BotBenchmarkDefinition {
  faction: string;
  turn: number;
  objective: string;
  expected_control_share: number;
  tolerance: number;
}

export interface BotControlShareRow {
  turn: number;
  control_share_by_faction: Array<{ faction: string; control_share: number }>;
}

export interface BotBenchmarkResult {
  faction: string;
  turn: number;
  objective: string;
  expected_control_share: number;
  tolerance: number;
  actual_control_share: number | null;
  deviation: number | null;
  passed: boolean | null;
  status: 'evaluated' | 'not_reached';
}

export interface BotBenchmarkSummary {
  evaluated: number;
  passed: number;
  failed: number;
  not_reached: number;
  results: BotBenchmarkResult[];
}

export interface BotWeeklyDiagnosticsRow {
  week_index: number;
  turn: number;
  by_bot: Array<{
    bot_id: string;
    faction: string;
    posture_counts: { hold: number; probe: number; push: number };
    formation_reassignments: number;
  }>;
  total_reassignments: number;
}

/**
 * Compute army strengths from final state. Deterministic ordering.
 */
export function computeArmyStrengthsSummary(state: GameState): ArmyStrengthsSummary {
  const formations = state.formations ?? {};
  const pools = state.militia_pools ?? {};
  const factions = [...(state.factions ?? [])].map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const formationByFaction = new Map<string, { militia: number; brigade: number; other: number }>();
  for (const fid of factions) {
    formationByFaction.set(fid, { militia: 0, brigade: 0, other: 0 });
  }
  for (const f of Object.values(formations)) {
    if (!f || typeof f !== 'object') continue;
    const faction = (f as { faction?: string }).faction ?? '';
    const kind = ((f as { kind?: string }).kind ?? 'brigade') as string;
    const entry = formationByFaction.get(faction) ?? { militia: 0, brigade: 0, other: 0 };
    if (kind === 'militia') entry.militia += 1;
    else if (kind === 'brigade' || kind === 'territorial_defense' || kind === 'operational_group' || kind === 'corps_asset') entry.brigade += 1;
    else entry.other += 1;
    formationByFaction.set(faction, entry);
  }
  const formations_by_faction = factions.map((faction) => {
    const e = formationByFaction.get(faction) ?? { militia: 0, brigade: 0, other: 0 };
    const total = e.militia + e.brigade + e.other;
    return { faction, militia: e.militia, brigade: e.brigade, other: e.other, total };
  });

  const poolByFaction = new Map<string, { available: number; committed: number; exhausted: number }>();
  for (const fid of factions) {
    poolByFaction.set(fid, { available: 0, committed: 0, exhausted: 0 });
  }
  for (const p of Object.values(pools)) {
    if (!p || typeof p !== 'object') continue;
    const faction = (p as { faction?: string }).faction ?? '';
    const entry = poolByFaction.get(faction) ?? { available: 0, committed: 0, exhausted: 0 };
    entry.available += (p as { available?: number }).available ?? 0;
    entry.committed += (p as { committed?: number }).committed ?? 0;
    entry.exhausted += (p as { exhausted?: number }).exhausted ?? 0;
    poolByFaction.set(faction, entry);
  }
  const militia_pools_by_faction = factions.map((faction) => {
    const e = poolByFaction.get(faction) ?? { available: 0, committed: 0, exhausted: 0 };
    return { faction, ...e };
  });

  const aor_counts_by_faction = (state.factions ?? []).map((f) => ({
    faction: f.id,
    settlement_count: Array.isArray(f.areasOfResponsibility) ? f.areasOfResponsibility.length : 0
  })).sort((a, b) => a.faction.localeCompare(b.faction));

  return { formations_by_faction, militia_pools_by_faction, aor_counts_by_faction };
}

/**
 * Evaluate bot strategy benchmarks against observed control-share timeline.
 * Uses exact benchmark turn when present; otherwise marks benchmark as not_reached.
 */
export function evaluateBotBenchmarks(
  timeline: BotControlShareRow[],
  benchmarks: BotBenchmarkDefinition[]
): BotBenchmarkSummary {
  const byTurn = new Map<number, Map<string, number>>();
  for (const row of timeline) {
    const shareByFaction = new Map<string, number>();
    for (const item of row.control_share_by_faction) {
      shareByFaction.set(item.faction, item.control_share);
    }
    byTurn.set(row.turn, shareByFaction);
  }

  const results = benchmarks
    .map((benchmark) => {
      const row = byTurn.get(benchmark.turn);
      if (!row) {
        return {
          ...benchmark,
          actual_control_share: null,
          deviation: null,
          passed: null,
          status: 'not_reached' as const
        };
      }
      const actual = row.get(benchmark.faction) ?? 0;
      const deviation = Math.round((actual - benchmark.expected_control_share) * 1e6) / 1e6;
      const passed = Math.abs(deviation) <= benchmark.tolerance;
      return {
        ...benchmark,
        actual_control_share: actual,
        deviation,
        passed,
        status: 'evaluated' as const
      };
    })
    .sort((a, b) => {
      if (a.turn !== b.turn) return a.turn - b.turn;
      const factionCmp = a.faction.localeCompare(b.faction);
      if (factionCmp !== 0) return factionCmp;
      return a.objective.localeCompare(b.objective);
    });

  let evaluated = 0;
  let passed = 0;
  let failed = 0;
  let not_reached = 0;
  for (const result of results) {
    if (result.status === 'not_reached') {
      not_reached += 1;
      continue;
    }
    evaluated += 1;
    if (result.passed) passed += 1;
    else failed += 1;
  }

  return { evaluated, passed, failed, not_reached, results };
}

export interface FormatEndReportParams {
  scenario_id: string;
  run_id: string;
  weeks: number;
  controlDelta: ControlDeltaResult;
  startWeeklyReport: WeeklyReportRow | null;
  endWeeklyReport: WeeklyReportRow | null;
  /** Phase H1.7: optional activity summary to append "Activity over run" section. */
  activitySummary?: ActivitySummary | null;
  /** Phase H1.9: optional baseline ops summary. */
  baselineOpsSummary?: BaselineOpsSummary | null;
  /** Phase H2.2: optional control events summary. */
  controlEventsSummary?: ControlEventsSummary | null;
  /** Phase H2.2: optional formation delta. */
  formationDelta?: FormationDeltaResult | null;
  /** Optional formation fatigue (brigade casualties proxy). */
  formationFatigueSummary?: FormationFatigueSummary | null;
  /** Army strengths at scenario end (formations, militia pools, AoR). */
  armyStrengthsSummary?: ArmyStrengthsSummary | null;
  /** End-of-scenario winner evaluation (optional). */
  victoryEvaluation?: VictoryEvaluation | null;
  /** Optional bot benchmark evaluation summary. */
  botBenchmarkSummary?: BotBenchmarkSummary | null;
  /** Optional per-turn bot diagnostics. */
  botWeeklyDiagnostics?: BotWeeklyDiagnosticsRow[] | null;
}

/** Phase H1.7: Run-level activity diagnostics (machine-readable). */
export interface ActivitySummary {
  weeks: number;
  metrics: {
    front_active_set_size: { min: number; max: number; mean: number; nonzero_weeks: number };
    pressure_eligible_size: { min: number; max: number; mean: number; nonzero_weeks: number } | null;
    displacement_trigger_eligible_size: {
      min: number;
      max: number;
      mean: number;
      nonzero_weeks: number;
    } | null;
  };
  notes: string[];
}

/** Round to 6 decimal places for stable mean (no timestamps, deterministic). */
function roundMean(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Compute run-level activity summary from per-week activity counts.
 * Mean uses 6-decimal rounding for deterministic output.
 */
export function computeActivitySummary(
  weeklyRows: WeeklyActivityCounts[]
): ActivitySummary {
  const weeks = weeklyRows.length;
  const notes: string[] = [];

  function agg(
    key: keyof WeeklyActivityCounts
  ): { min: number; max: number; mean: number; nonzero_weeks: number } {
    if (weeks === 0) {
      return { min: 0, max: 0, mean: 0, nonzero_weeks: 0 };
    }
    let min = Number.MAX_SAFE_INTEGER;
    let max = -1;
    let sum = 0;
    let nonzero = 0;
    for (const row of weeklyRows) {
      const v = row[key];
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
      if (v > 0) nonzero += 1;
    }
    if (min === Number.MAX_SAFE_INTEGER) min = 0;
    if (max === -1) max = 0;
    return {
      min,
      max,
      mean: roundMean(sum / weeks),
      nonzero_weeks: nonzero
    };
  }

  const front_active_set_size = agg('front_active_set_size');
  const pressure_eligible_size = agg('pressure_eligible_size');
  const displacement_trigger_eligible_size = agg('displacement_trigger_eligible_size');

  return {
    weeks,
    metrics: {
      front_active_set_size,
      pressure_eligible_size,
      displacement_trigger_eligible_size
    },
    notes
  };
}

/**
 * Format "Activity over run" section for end_report.md (human-readable).
 * If all metrics are zero every week, states stasis.
 */
export function formatActivitySectionMarkdown(summary: ActivitySummary): string {
  const lines: string[] = ['## Activity over run', ''];

  const m = summary.metrics;
  lines.push(
    `- Front-active: max ${m.front_active_set_size.max}, mean ${m.front_active_set_size.mean}, nonzero weeks ${m.front_active_set_size.nonzero_weeks}/${summary.weeks}`
  );
  if (m.pressure_eligible_size !== null) {
    lines.push(
      `- Pressure-eligible (edges): max ${m.pressure_eligible_size.max}, mean ${m.pressure_eligible_size.mean}, nonzero weeks ${m.pressure_eligible_size.nonzero_weeks}/${summary.weeks}`
    );
  }
  if (m.displacement_trigger_eligible_size !== null) {
    lines.push(
      `- Displacement-trigger eligible: max ${m.displacement_trigger_eligible_size.max}, mean ${m.displacement_trigger_eligible_size.mean}, nonzero weeks ${m.displacement_trigger_eligible_size.nonzero_weeks}/${summary.weeks}`
    );
  }
  lines.push('');

  const allZero =
    m.front_active_set_size.nonzero_weeks === 0 &&
    (m.pressure_eligible_size === null || m.pressure_eligible_size.nonzero_weeks === 0) &&
    (m.displacement_trigger_eligible_size === null ||
      m.displacement_trigger_eligible_size.nonzero_weeks === 0);
  if (allZero) {
    lines.push(
      'No active fronts or eligible pressure/displacement triggers were detected; the run represents stasis under current activation rules.'
    );
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Produce human-readable markdown report. No timestamps; concise.
 */
export function formatEndReportMarkdown(params: FormatEndReportParams): string {
  const {
    scenario_id,
    run_id,
    weeks,
    controlDelta,
    startWeeklyReport,
    endWeeklyReport
  } = params;

  const lines: string[] = [
    '# AWWV Scenario report',
    '',
    `- Scenario: ${scenario_id}`,
    `- Weeks simulated: ${weeks}`,
    `- Run id: ${run_id}`,
    '',
    '## Control changes (most important)',
    ''
  ];

  const total = controlDelta.total_flips;
  lines.push(`- Total settlements with controller change: ${total}`);

  const before = controlDelta.net_control_counts_before
    .map((e) => `${e.controller ?? 'null'}: ${e.count}`)
    .join(', ');
  const after = controlDelta.net_control_counts_after
    .map((e) => `${e.controller ?? 'null'}: ${e.count}`)
    .join(', ');
  lines.push(`- Net control counts (start → end): ${before} → ${after}`);
  lines.push('');

  if (total === 0) {
    lines.push('No settlement-level control changes detected in this run.');
  } else {
    const topMun = controlDelta.flips_by_municipality.slice(0, 10);
    lines.push('Top municipalities by number of flips (aggregates settlement flips by municipality):');
    for (const { municipality_id, count } of topMun) {
      lines.push(`  - ${municipality_id ?? 'null'}: ${count}`);
    }
    lines.push('');
    const topDir = controlDelta.flips_by_direction.slice(0, 6);
    lines.push('Top direction changes:');
    for (const { from, to, count } of topDir) {
      lines.push(`  - ${from ?? 'null'} → ${to ?? 'null'}: ${count}`);
    }
  }

  lines.push('');
  lines.push('## Other key shifts');
  lines.push('');

  if (startWeeklyReport?.factions && endWeeklyReport?.factions) {
    lines.push('Exhaustion (start → end):');
    const startEx = new Map(startWeeklyReport.factions.map((f) => [f.id, f.exhaustion]));
    const endEx = new Map(endWeeklyReport.factions.map((f) => [f.id, f.exhaustion]));
    for (const f of endWeeklyReport.factions) {
      const s = startEx.get(f.id) ?? 0;
      const e = f.exhaustion ?? 0;
      lines.push(`  - ${f.id}: ${s} → ${e}`);
    }
    lines.push('');
    const hasSupply =
      startWeeklyReport.factions.some((f) => f.supply_pressure != null) ||
      endWeeklyReport.factions.some((f) => f.supply_pressure != null);
    if (hasSupply) {
      lines.push('Supply pressure (start → end):');
      for (const f of endWeeklyReport.factions) {
        const s = startWeeklyReport.factions.find((x) => x.id === f.id)?.supply_pressure ?? '—';
        const e = f.supply_pressure ?? '—';
        lines.push(`  - ${f.id}: ${s} → ${e}`);
      }
      lines.push('');
    }
    lines.push(
      'Displacement: settlement count/total (start → end): ' +
        `${startWeeklyReport.settlement_displacement_count}/${startWeeklyReport.settlement_displacement_total} → ` +
        `${endWeeklyReport.settlement_displacement_count}/${endWeeklyReport.settlement_displacement_total}`
    );
    lines.push(
      'Displacement: municipality count/total (start → end): ' +
        `${startWeeklyReport.municipality_displacement_count}/${startWeeklyReport.municipality_displacement_total} → ` +
        `${endWeeklyReport.municipality_displacement_count}/${endWeeklyReport.municipality_displacement_total}`
    );
  }

  lines.push('');
  if (params.activitySummary) {
    lines.push(formatActivitySectionMarkdown(params.activitySummary));
    lines.push('');
  }
  if (params.baselineOpsSummary) {
    const b = params.baselineOpsSummary;
    lines.push('## Baseline ops');
    lines.push('');
    lines.push(`- Intensity: ${b.intensity}`);
    lines.push(`- Average engagement level: ${b.avg_level}`);
    lines.push(
      `- Produced nonzero exhaustion: ${b.nonzero_exhaustion ? 'yes' : 'no'}, nonzero displacement: ${b.nonzero_displacement ? 'yes' : 'no'}`
    );
    lines.push('');
  }
  if (params.controlEventsSummary) {
    const c = params.controlEventsSummary;
    lines.push('## Control events (harness log)');
    lines.push('');
    lines.push(`- Total control events: ${c.total}`);
    for (const { mechanism, count } of c.by_mechanism) {
      lines.push(`  - ${mechanism}: ${count}`);
    }
    lines.push('');
  }
  if (params.formationDelta) {
    const fd = params.formationDelta;
    const added = fd.formations_added.length;
    const removed = fd.formations_removed.length;
    lines.push('## Formation delta');
    lines.push('');
    lines.push(`- Formations added: ${added}, removed: ${removed}`);
    if (Object.keys(fd.counts_added_by_kind).length > 0) {
      lines.push('  Added by kind: ' + Object.entries(fd.counts_added_by_kind).map(([k, n]) => `${k}: ${n}`).join(', '));
    }
    if (Object.keys(fd.counts_removed_by_kind).length > 0) {
      lines.push(
        '  Removed by kind: ' + Object.entries(fd.counts_removed_by_kind).map(([k, n]) => `${k}: ${n}`).join(', ')
      );
    }
    lines.push('');
  }
  if (params.formationFatigueSummary) {
    const ff = params.formationFatigueSummary;
    lines.push('## Brigade casualties (fatigue proxy)');
    lines.push('');
    lines.push(`- Total fatigue (start → end): ${ff.total_fatigue_initial} → ${ff.total_fatigue_final}`);
    lines.push('');
    for (const row of ff.by_formation) {
      lines.push(`- **${row.id}** (${row.faction}${row.name ? `, ${row.name}` : ''}): fatigue ${row.fatigue_initial} → ${row.fatigue_final}`);
    }
    lines.push('');
  }
  if (params.armyStrengthsSummary) {
    const as = params.armyStrengthsSummary;
    lines.push('## Army strengths (end state)');
    lines.push('');
    lines.push('Formations by faction (militia / brigade / other):');
    for (const row of as.formations_by_faction) {
      const parts = [row.militia, row.brigade, row.other].filter((n) => n > 0);
      lines.push(`  - ${row.faction}: ${row.total} total (${parts.join(' / ') || '—'})`);
    }
    lines.push('');
    lines.push('Militia pools by faction (available / committed / exhausted):');
    for (const row of as.militia_pools_by_faction) {
      lines.push(`  - ${row.faction}: ${row.available} / ${row.committed} / ${row.exhausted}`);
    }
    if (as.aor_counts_by_faction.length > 0) {
      lines.push('');
      lines.push('Areas of responsibility (settlements per faction):');
      for (const row of as.aor_counts_by_faction) {
        lines.push(`  - ${row.faction}: ${row.settlement_count} settlements`);
      }
    }
    lines.push('');
  }
  if (params.victoryEvaluation) {
    const v = params.victoryEvaluation;
    lines.push('## Victory evaluation');
    lines.push('');
    lines.push(`- Result: ${v.result}`);
    if (v.winner) lines.push(`- Winner: ${v.winner}`);
    if (v.co_winners.length > 0) lines.push(`- Co-winners: ${v.co_winners.join(', ')}`);
    lines.push('');
    lines.push('Per-faction checks:');
    for (const row of v.by_faction) {
      const checkParts: string[] = [];
      if (row.checks.controlled_settlements) {
        const c = row.checks.controlled_settlements;
        checkParts.push(`controlled ${c.actual}/${c.required} (${c.passed ? 'pass' : 'fail'})`);
      }
      if (row.checks.exhaustion) {
        const e = row.checks.exhaustion;
        checkParts.push(`exhaustion ${e.actual}<=${e.max} (${e.passed ? 'pass' : 'fail'})`);
      }
      if (row.checks.required_settlements_all) {
        const r = row.checks.required_settlements_all;
        checkParts.push(`required_sids ${r.missing.length === 0 ? 'pass' : `missing ${r.missing.join(',')}`}`);
      }
      lines.push(`  - ${row.faction}: ${row.passed ? 'PASS' : 'FAIL'}${checkParts.length > 0 ? ` — ${checkParts.join('; ')}` : ''}`);
    }
    lines.push('');
  }
  if (params.botBenchmarkSummary) {
    const b = params.botBenchmarkSummary;
    lines.push('## Bot benchmark evaluation');
    lines.push('');
    lines.push(`- Evaluated: ${b.evaluated}`);
    lines.push(`- Passed: ${b.passed}`);
    lines.push(`- Failed: ${b.failed}`);
    lines.push(`- Not reached (turn outside run): ${b.not_reached}`);
    lines.push('');
    if (b.results.length > 0) {
      lines.push('Benchmark checks:');
      for (const result of b.results) {
        if (result.status === 'not_reached') {
          lines.push(
            `  - [${result.faction}] turn ${result.turn} (${result.objective}): not reached (expected ${result.expected_control_share} ± ${result.tolerance})`
          );
          continue;
        }
        lines.push(
          `  - [${result.faction}] turn ${result.turn} (${result.objective}): actual ${result.actual_control_share} vs expected ${result.expected_control_share} ± ${result.tolerance} => ${result.passed ? 'PASS' : 'FAIL'}`
        );
      }
      lines.push('');
    }
  }
  if (params.botWeeklyDiagnostics && params.botWeeklyDiagnostics.length > 0) {
    lines.push('## Bot diagnostics (weekly)');
    lines.push('');
    const totalsByFaction = new Map<string, { hold: number; probe: number; push: number; formation_reassignments: number }>();
    for (const row of params.botWeeklyDiagnostics) {
      for (const item of row.by_bot) {
        const entry = totalsByFaction.get(item.faction) ?? { hold: 0, probe: 0, push: 0, formation_reassignments: 0 };
        entry.hold += item.posture_counts.hold;
        entry.probe += item.posture_counts.probe;
        entry.push += item.posture_counts.push;
        entry.formation_reassignments += item.formation_reassignments;
        totalsByFaction.set(item.faction, entry);
      }
    }
    const factions = Array.from(totalsByFaction.keys()).sort((a, b) => a.localeCompare(b));
    for (const faction of factions) {
      const total = totalsByFaction.get(faction)!;
      lines.push(
        `- ${faction}: push ${total.push}, probe ${total.probe}, hold ${total.hold}, formation reassignments ${total.formation_reassignments}`
      );
    }
    lines.push('');
  }
  lines.push('## Notes on interpretation');
  lines.push('');
  lines.push(
    'This is a read-only summary of canonical state and derived reporting. No claim of causality; only deltas.'
  );
  lines.push('');

  return lines.join('\n');
}
