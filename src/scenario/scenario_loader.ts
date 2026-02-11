/**
 * Phase H1.1: Load, validate, and normalize scenario from file.
 * Rejects duplicate week_index, week_index outside [0, weeks-1].
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { Scenario, ScenarioTurn, ScenarioAction } from './scenario_types.js';
import { strictCompare } from '../state/validateGameState.js';
import { stableStringify } from '../utils/stable_json.js';

/**
 * Resolve init_control to an absolute path. Key (e.g. apr1992) -> data/source/municipalities_1990_initial_political_controllers_<key>.json; path-like -> resolve against baseDir.
 */
export function resolveInitControlPath(keyOrPath: string, baseDir: string): string {
  const trimmed = keyOrPath.trim();
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.endsWith('.json')) {
    return resolve(baseDir, trimmed);
  }
  return resolve(baseDir, `data/source/municipalities_1990_initial_political_controllers_${trimmed}.json`);
}

/**
 * Resolve init_formations to an absolute path. Key (e.g. apr1992) -> data/scenarios/initial_formations/initial_formations_<key>.json; path-like -> resolve against baseDir.
 */
export function resolveInitFormationsPath(keyOrPath: string, baseDir: string): string {
  const trimmed = keyOrPath.trim();
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.endsWith('.json')) {
    return resolve(baseDir, trimmed);
  }
  return resolve(baseDir, `data/scenarios/initial_formations/initial_formations_${trimmed}.json`);
}

/**
 * Normalize a single action (validate shape; probe_intent.enabled defaults to true).
 */
function normalizeAction(raw: unknown): ScenarioAction {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Action must be an object');
  }
  const a = raw as Record<string, unknown>;
  const type = typeof a.type === 'string' ? a.type.trim() : undefined;
  if (!type) throw new Error('Action must have type (string)');
  if (type === 'noop') return { type: 'noop' };
  if (type === 'note') {
    const text = typeof a.text === 'string' ? a.text : '';
    return { type: 'note', text };
  }
  if (type === 'probe_intent') {
    const enabled = a.enabled === undefined ? true : Boolean(a.enabled);
    return { type: 'probe_intent', enabled };
  }
  if (type === 'baseline_ops') {
    const enabled = a.enabled === undefined ? true : Boolean(a.enabled);
    let intensity = typeof a.intensity === 'number' && Number.isFinite(a.intensity) ? a.intensity : 1;
    intensity = Math.max(0, Math.min(5, intensity));
    return { type: 'baseline_ops', enabled, intensity };
  }
  throw new Error(`Unknown action type: ${type}`);
}

/**
 * Normalize actions for deterministic order: sort by type then by stable JSON string.
 */
export function normalizeActions(actions: ScenarioAction[]): ScenarioAction[] {
  return [...actions].sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    return strictCompare(stableStringify(a), stableStringify(b));
  });
}

/**
 * Normalize prerequisites: optional array of scenario_ids, non-empty strings, dedupe, stable sort for determinism.
 */
function normalizePrerequisites(raw: unknown): Scenario['prerequisites'] {
  if (!Array.isArray(raw)) return undefined;
  const list = (raw as unknown[])
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of list.sort(strictCompare)) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Normalize coercion_pressure_by_municipality: optional object, keys non-empty strings (mun1990_id), values clamped [0, 1]. Sorted keys for determinism.
 */
function normalizeCoercionPressure(raw: unknown): Scenario['coercion_pressure_by_municipality'] {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const key of Object.keys(o).sort(strictCompare)) {
    if (key.trim().length === 0) continue;
    const v = o[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out[key.trim()] = Math.max(0, Math.min(1, v));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Normalize a Record<string, number> resource map (e.g. recruitment_capital, equipment_points).
 * Returns undefined if empty/invalid. Sorted keys for determinism.
 */
function normalizeResourceRecord(raw: unknown): Record<string, number> | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const key of Object.keys(o).sort(strictCompare)) {
    if (key.trim().length === 0) continue;
    const v = o[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    out[key.trim()] = Math.max(0, Math.round(v));
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeVictoryConditions(raw: unknown): Scenario['victory_conditions'] {
  if (raw == null || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const byFactionRaw = o.by_faction;
  if (byFactionRaw == null || typeof byFactionRaw !== 'object' || Array.isArray(byFactionRaw)) {
    return undefined;
  }
  const byFaction = byFactionRaw as Record<string, unknown>;
  const out: Record<string, { min_controlled_settlements?: number; max_exhaustion?: number; required_settlements_all?: string[] }> = {};
  for (const faction of Object.keys(byFaction).sort(strictCompare)) {
    const value = byFaction[faction];
    if (value == null || typeof value !== 'object' || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    const min_controlled_settlements =
      typeof v.min_controlled_settlements === 'number' && Number.isInteger(v.min_controlled_settlements)
        ? Math.max(0, v.min_controlled_settlements)
        : undefined;
    const max_exhaustion =
      typeof v.max_exhaustion === 'number' && Number.isFinite(v.max_exhaustion)
        ? Math.max(0, v.max_exhaustion)
        : undefined;
    const required_settlements_all = Array.isArray(v.required_settlements_all)
      ? (v.required_settlements_all as unknown[])
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
          .sort(strictCompare)
      : undefined;
    out[faction] = {
      ...(min_controlled_settlements !== undefined ? { min_controlled_settlements } : {}),
      ...(max_exhaustion !== undefined ? { max_exhaustion } : {}),
      ...(required_settlements_all && required_settlements_all.length > 0 ? { required_settlements_all } : {})
    };
  }
  return Object.keys(out).length > 0 ? { by_faction: out } : undefined;
}

/**
 * Normalize and validate scenario. Throws on invalid input.
 */
export function normalizeScenario(raw: unknown): Scenario {
  if (raw == null || typeof raw !== 'object') {
    throw new Error('Scenario must be an object');
  }
  const o = raw as Record<string, unknown>;
  const scenario_id = typeof o.scenario_id === 'string' ? o.scenario_id.trim() : undefined;
  if (!scenario_id) {
    throw new Error('Scenario must have scenario_id (non-empty string)');
  }
  const weeks = typeof o.weeks === 'number' ? Math.floor(o.weeks) : undefined;
  const scenario_start_week =
    typeof o.scenario_start_week === 'number' && Number.isInteger(o.scenario_start_week)
      ? o.scenario_start_week
      : undefined;
  if (weeks === undefined || !Number.isInteger(weeks) || weeks < 1) {
    throw new Error('Scenario must have weeks (integer >= 1)');
  }
  const start_phase = typeof o.start_phase === 'string' ? o.start_phase.trim() : undefined;
  const phase_0_referendum_turn = typeof o.phase_0_referendum_turn === 'number' && Number.isInteger(o.phase_0_referendum_turn) ? o.phase_0_referendum_turn : undefined;
  const phase_0_war_start_turn = typeof o.phase_0_war_start_turn === 'number' && Number.isInteger(o.phase_0_war_start_turn) ? o.phase_0_war_start_turn : undefined;
  let turns: ScenarioTurn[] = Array.isArray(o.turns) ? (o.turns as ScenarioTurn[]) : [];
  turns = turns.map((t) => {
    const row = t as unknown as Record<string, unknown>;
    if (t == null || typeof row !== 'object') throw new Error('Each turn must be an object');
    const week_index = typeof row.week_index === 'number'
      ? Math.floor(row.week_index as number)
      : undefined;
    if (week_index === undefined || !Number.isInteger(week_index)) {
      throw new Error('Each turn must have week_index (integer)');
    }
    let actions: ScenarioAction[] = Array.isArray(row.actions)
      ? (row.actions as unknown[]).map(normalizeAction)
      : [];
    actions = normalizeActions(actions);
    return { week_index, actions };
  });
  turns.sort((a, b) => a.week_index - b.week_index);

  const seen = new Set<number>();
  for (const t of turns) {
    if (t.week_index < 0 || t.week_index >= weeks) {
      throw new Error(`week_index ${t.week_index} outside [0, ${weeks - 1}]`);
    }
    if (seen.has(t.week_index)) {
      throw new Error(`Duplicate week_index ${t.week_index}`);
    }
    seen.add(t.week_index);
  }

  const use_harness_bots = o.use_harness_bots === true;
  const init_control = typeof o.init_control === 'string' && o.init_control.trim() !== '' ? o.init_control.trim() : undefined;
  const init_control_mode =
    o.init_control_mode === 'institutional' || o.init_control_mode === 'ethnic_1991' || o.init_control_mode === 'hybrid_1992'
      ? o.init_control_mode
      : undefined;
  const ethnic_override_threshold =
    typeof o.ethnic_override_threshold === 'number' && Number.isFinite(o.ethnic_override_threshold)
      ? Math.max(0.45, Math.min(1, o.ethnic_override_threshold))
      : undefined;
  const init_formations = typeof o.init_formations === 'string' && o.init_formations.trim() !== '' ? o.init_formations.trim() : undefined;
  const init_formations_oob = o.init_formations_oob === true || (typeof o.init_formations_oob === 'string' && o.init_formations_oob.trim() !== '') ? (o.init_formations_oob as boolean | string) : undefined;

  let formation_spawn_directive: Scenario['formation_spawn_directive'] = undefined;
  if (o.formation_spawn_directive != null && typeof o.formation_spawn_directive === 'object') {
    const d = o.formation_spawn_directive as Record<string, unknown>;
    const kind = d.kind === 'militia' || d.kind === 'brigade' || d.kind === 'both' ? d.kind : 'both';
    const turn = typeof d.turn === 'number' && Number.isInteger(d.turn) ? d.turn : undefined;
    const allow_displaced_origin = d.allow_displaced_origin === true;
    formation_spawn_directive = { kind, ...(turn !== undefined && { turn }), ...(allow_displaced_origin && { allow_displaced_origin }) };
  }

  const use_smart_bots = o.use_smart_bots === true;
  const bot_difficulty = o.bot_difficulty === 'easy' || o.bot_difficulty === 'medium' || o.bot_difficulty === 'hard'
    ? o.bot_difficulty
    : undefined;
  const bot_diagnostics = o.bot_diagnostics === true;
  const victory_conditions = normalizeVictoryConditions(o.victory_conditions);

  // Phase I §4.8: RBiH–HRHB alliance dynamics config
  const init_alliance_rbih_hrhb =
    typeof o.init_alliance_rbih_hrhb === 'number' && Number.isFinite(o.init_alliance_rbih_hrhb)
      ? Math.max(-1, Math.min(1, o.init_alliance_rbih_hrhb))
      : undefined;
  const init_mixed_municipalities = Array.isArray(o.init_mixed_municipalities)
    ? (o.init_mixed_municipalities as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
        .sort(strictCompare)
    : undefined;
  const enable_rbih_hrhb_dynamics =
    typeof o.enable_rbih_hrhb_dynamics === 'boolean' ? o.enable_rbih_hrhb_dynamics : undefined;
  const rbih_hrhb_war_earliest_week =
    typeof o.rbih_hrhb_war_earliest_week === 'number' && Number.isInteger(o.rbih_hrhb_war_earliest_week) && o.rbih_hrhb_war_earliest_week >= 0
      ? o.rbih_hrhb_war_earliest_week
      : undefined;

  // B4: Coercion pressure by municipality (mun1990_id → [0, 1]). Sorted keys for determinism.
  const coercion_pressure_by_municipality = normalizeCoercionPressure(o.coercion_pressure_by_municipality);
  const disable_phase_i_control_flip = o.disable_phase_i_control_flip === true;
  const phase_i_military_action_attack_scale =
    typeof o.phase_i_military_action_attack_scale === 'number' &&
    Number.isFinite(o.phase_i_military_action_attack_scale)
      ? Math.max(0.1, Math.min(2.0, o.phase_i_military_action_attack_scale))
      : undefined;
  const phase_i_military_action_stability_buffer_factor =
    typeof o.phase_i_military_action_stability_buffer_factor === 'number' &&
    Number.isFinite(o.phase_i_military_action_stability_buffer_factor)
      ? Math.max(0.0, Math.min(1.0, o.phase_i_military_action_stability_buffer_factor))
      : undefined;

  // B2: Campaign branching — prerequisites (scenario_ids that must be completed before playable).
  const prerequisites = normalizePrerequisites(o.prerequisites);

  // Recruitment system fields
  const recruitment_mode = o.recruitment_mode === 'player_choice' ? 'player_choice' as const : undefined;
  const recruitment_capital = normalizeResourceRecord(o.recruitment_capital);
  const equipment_points = normalizeResourceRecord(o.equipment_points);

  // Phase H2.4: When use_harness_bots is true, ensure every week has at least one baseline_ops action (deterministic; uses existing baseline_ops only).
  if (use_harness_bots && weeks > 0) {
    const turnsByWeek = new Map<number, ScenarioTurn>();
    for (const t of turns) {
      turnsByWeek.set(t.week_index, t);
    }
    const normalizedTurns: ScenarioTurn[] = [];
    for (let w = 0; w < weeks; w++) {
      const t = turnsByWeek.get(w);
      const hasBaselineOps = t?.actions?.some((a) => a.type === 'baseline_ops') ?? false;
      if (t) {
        if (!hasBaselineOps) {
          const actions = normalizeActions([...t.actions, { type: 'baseline_ops' as const, enabled: true, intensity: 1 }]);
          normalizedTurns.push({ week_index: w, actions });
        } else {
          normalizedTurns.push(t);
        }
      } else {
        normalizedTurns.push({
          week_index: w,
          actions: normalizeActions([{ type: 'baseline_ops' as const, enabled: true, intensity: 1 }])
        });
      }
    }
    normalizedTurns.sort((a, b) => a.week_index - b.week_index);
    return {
      scenario_id,
      scenario_start_week,
      start_phase,
      phase_0_referendum_turn,
      phase_0_war_start_turn,
      weeks,
      turns: normalizedTurns,
      use_harness_bots,
      init_control,
      init_control_mode,
      ethnic_override_threshold,
      init_formations,
      init_formations_oob,
      formation_spawn_directive,
      use_smart_bots: use_smart_bots || undefined,
      bot_difficulty,
      bot_diagnostics: bot_diagnostics || undefined,
      victory_conditions,
      init_alliance_rbih_hrhb,
      init_mixed_municipalities,
      enable_rbih_hrhb_dynamics,
      rbih_hrhb_war_earliest_week,
      coercion_pressure_by_municipality,
      disable_phase_i_control_flip: disable_phase_i_control_flip || undefined,
      phase_i_military_action_attack_scale,
      phase_i_military_action_stability_buffer_factor,
      prerequisites,
      recruitment_mode,
      recruitment_capital,
      equipment_points
    };
  }

  return {
    scenario_id,
    scenario_start_week,
    start_phase,
    phase_0_referendum_turn,
    phase_0_war_start_turn,
    weeks,
    turns,
    use_harness_bots: use_harness_bots || undefined,
    init_control,
    init_control_mode,
    ethnic_override_threshold,
    init_formations,
    init_formations_oob,
    formation_spawn_directive,
    use_smart_bots: use_smart_bots || undefined,
    bot_difficulty,
    bot_diagnostics: bot_diagnostics || undefined,
    victory_conditions,
    init_alliance_rbih_hrhb,
    init_mixed_municipalities,
    enable_rbih_hrhb_dynamics,
    rbih_hrhb_war_earliest_week,
    coercion_pressure_by_municipality,
    disable_phase_i_control_flip: disable_phase_i_control_flip || undefined,
    phase_i_military_action_attack_scale,
    phase_i_military_action_stability_buffer_factor,
    prerequisites,
    recruitment_mode,
    recruitment_capital,
    equipment_points
  };
}

/**
 * Load scenario from path: read file, parse JSON, normalize and validate.
 */
export async function loadScenario(path: string): Promise<Scenario> {
  const content = await readFile(path, 'utf8');
  const raw = JSON.parse(content) as unknown;
  return normalizeScenario(raw);
}

/**
 * Deterministic run id: no timestamps. First 16 hex chars of sha256(stableStringify(scenario)).
 */
export function computeRunId(scenario: Scenario): string {
  const hash = createHash('sha256').update(stableStringify(scenario), 'utf8').digest('hex').slice(0, 16);
  return `${scenario.scenario_id}__${hash}__w${scenario.weeks}`;
}
