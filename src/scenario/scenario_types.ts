/**
 * Phase H1.1: Scenario input types (inputs only; no derived fields).
 * Actions are order-normalized (stable sort) before application and logging.
 */

/** Discriminated union: noop, note, probe_intent (H1.8), baseline_ops (H1.9). */
export type ScenarioAction =
  | { type: 'noop' }
  | { type: 'note'; text: string }
  | { type: 'probe_intent'; enabled?: boolean }
  | { type: 'baseline_ops'; enabled?: boolean; intensity?: number };

export interface ScenarioTurn {
  week_index: number;
  actions: ScenarioAction[];
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface FactionVictoryCondition {
  min_controlled_settlements?: number;
  max_exhaustion?: number;
  required_settlements_all?: string[];
}

export interface ScenarioVictoryConditions {
  by_faction: Record<string, FactionVictoryCondition>;
}

export interface Scenario {
  scenario_id: string;
  /** Optional absolute week index anchor (weeks since Jan 1992). Enables time-adaptive bot doctrine profiles. */
  scenario_start_week?: number;
  /** When "phase_0", scenario starts at Turn 0 in Phase 0; transitions to Phase I at war_start_turn. */
  start_phase?: string;
  /** For start_phase phase_0: turn when referendum was held. War starts at referendum_turn + 4 per canon. */
  phase_0_referendum_turn?: number;
  /** For start_phase phase_0: turn when war starts (Phase I). Must be referendum_turn + 4. Default: phase_0_referendum_turn + 4. */
  phase_0_war_start_turn?: number;
  weeks: number;
  turns?: ScenarioTurn[];
  /** Phase H2.4: When true, harness injects baseline_ops for each week that has none (harness-only; off by default). */
  use_harness_bots?: boolean;
  /** Option A: scenario date key (e.g. apr1992) or path to mun1990-only control file. When set, harness uses it for initial political control. */
  init_control?: string;
  /** Option A: scenario date key (e.g. apr1992) or path to initial formations JSON. When set, harness loads and merges formations at start. */
  init_formations?: string;
  /** When true or a key (e.g. "default"), at Phase I entry create OOB formations from data/source/oob_brigades.json and oob_corps.json, gated by control. */
  init_formations_oob?: boolean | string;
  /** Formation spawn directive (FORAWWV H2.4). When set, harness applies at init so Phase I spawns militia/brigades from pools. */
  formation_spawn_directive?: { kind?: 'militia' | 'brigade' | 'both'; turn?: number; allow_displaced_origin?: boolean };
  /** When true, harness instantiates BotManager and runs bots each turn (Apr 1992 - Jan 1993 sim). */
  use_smart_bots?: boolean;
  /** Optional bot behavior profile intensity. Defaults to "medium". */
  bot_difficulty?: BotDifficulty;
  /** Optional per-turn smart-bot diagnostics artifact in scenario outputs. */
  bot_diagnostics?: boolean;
  /** Optional end-of-scenario victory evaluation contract. */
  victory_conditions?: ScenarioVictoryConditions;
  /** Phase I §4.8: Initial RBiH–HRHB alliance value [-1, 1]. Default 0.35 (fragile alliance, Apr 1992). */
  init_alliance_rbih_hrhb?: number;
  /** Phase I §4.8: Override default mixed municipalities list. */
  init_mixed_municipalities?: string[];
  /** Phase I §4.8: Enable dynamic RBiH–HRHB alliance mechanics (update, ceasefire, Washington). Default true when init_alliance_rbih_hrhb is set. */
  enable_rbih_hrhb_dynamics?: boolean;
  /** Phase I §4.8 (historical fidelity): Earliest scenario week when RBiH–HRHB open war can begin (bilateral flips, war_started_turn). April 1992 start: 26 = first week of October 1992. Default 26. */
  rbih_hrhb_war_earliest_week?: number;
  /** B4: Coercion pressure [0, 1] per municipality (mun1990_id). When set, applied to state at init; reduces Phase I flip threshold in those muns. E.g. Prijedor, Zvornik, Foča. */
  coercion_pressure_by_municipality?: Record<string, number>;
  /** B2: Scenario IDs that must be completed before this scenario is playable. Empty or omitted = no prerequisites. */
  prerequisites?: string[];
}
