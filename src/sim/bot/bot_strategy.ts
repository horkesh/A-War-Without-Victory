import type { FactionId, PhaseName, GameState } from '../../state/game_state.js';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotBenchmarkTarget {
  turn: number;
  objective: string;
  expected_control_share: number;
  tolerance: number;
}

export interface BotStrategyProfile {
  faction: FactionId;
  early_war_aggression: number;
  late_war_aggression: number;
  planned_ops_min_aggression: number;
  front_length_penalty_strength: number;
  manpower_sensitivity: number;
  preferred_objective_sids: string[];
  /** Weight for consolidation scoring (rear cleanup / fast-cleanup mun). 0 = off. Deterministic. */
  consolidation_priority_weight: number;
  benchmarks: BotBenchmarkTarget[];
}

export interface BotTimeContext {
  /** Absolute week index (weeks since Jan 1992). */
  global_week: number;
}

export interface BotAggressionProfile {
  broad_aggression: number;
  planned_ops_aggression: number;
}

export interface BotDifficultyTuning {
  push_share: number;
  reassign_bias: number;
}

const DIFFICULTY_TUNING: Record<BotDifficulty, BotDifficultyTuning> = {
  easy: { push_share: 0.25, reassign_bias: 0.12 },
  medium: { push_share: 0.4, reassign_bias: 0.2 },
  hard: { push_share: 0.55, reassign_bias: 0.3 }
};

const STRATEGY_PROFILES: Record<string, BotStrategyProfile> = {
  RBiH: {
    faction: 'RBiH',
    early_war_aggression: 0.62,
    late_war_aggression: 0.56,
    planned_ops_min_aggression: 0.58,
    front_length_penalty_strength: 0.08,
    manpower_sensitivity: 0.18,
    preferred_objective_sids: ['S166499', 'S155551', 'S162973', 'S100838', 'S117994', 'S224065', 'S163520', 'S123749', 'S208019', 'S151360'],
    consolidation_priority_weight: 0.5,
    benchmarks: [
      { turn: 26, objective: 'hold_core_centers', expected_control_share: 0.2, tolerance: 0.1 },
      { turn: 52, objective: 'preserve_survival_corridors', expected_control_share: 0.25, tolerance: 0.12 }
    ]
  },
  RS: {
    faction: 'RS',
    early_war_aggression: 0.64,
    late_war_aggression: 0.42,
    planned_ops_min_aggression: 0.48,
    front_length_penalty_strength: 0.22,
    manpower_sensitivity: 0.3,
    preferred_objective_sids: ['S200026', 'S216984', 'S200891', 'S230545', 'S227897', 'S205176', 'S202258', 'S203009', 'S220469', 'S218375', 'S120154', 'S162094'],
    consolidation_priority_weight: 0.8,
    benchmarks: [
      { turn: 26, objective: 'early_territorial_expansion', expected_control_share: 0.45, tolerance: 0.15 },
      { turn: 52, objective: 'consolidate_gains', expected_control_share: 0.5, tolerance: 0.15 }
    ]
  },
  HRHB: {
    faction: 'HRHB',
    early_war_aggression: 0.34,
    late_war_aggression: 0.40,
    planned_ops_min_aggression: 0.40,
    front_length_penalty_strength: 0.26,
    manpower_sensitivity: 0.30,
    preferred_objective_sids: ['S166090', 'S120880', 'S130486'],
    consolidation_priority_weight: 0.4,
    benchmarks: [
      { turn: 26, objective: 'secure_herzegovina_core', expected_control_share: 0.15, tolerance: 0.08 },
      { turn: 52, objective: 'hold_central_bosnia_nodes', expected_control_share: 0.18, tolerance: 0.1 }
    ]
  }
};

export function resolveBotDifficulty(value: unknown): BotDifficulty {
  if (value === 'easy' || value === 'medium' || value === 'hard') return value;
  return 'medium';
}

export function getBotDifficultyTuning(difficulty: BotDifficulty): BotDifficultyTuning {
  return DIFFICULTY_TUNING[difficulty];
}

export function getBotStrategyProfile(faction: FactionId): BotStrategyProfile {
  return STRATEGY_PROFILES[faction] ?? {
    faction,
    early_war_aggression: 0.5,
    late_war_aggression: 0.5,
    planned_ops_min_aggression: 0.5,
    front_length_penalty_strength: 0.15,
    manpower_sensitivity: 0.2,
    preferred_objective_sids: [],
    consolidation_priority_weight: 0,
    benchmarks: []
  };
}

export function resolveAggressionForPhase(profile: BotStrategyProfile, phase: PhaseName | undefined): number {
  if (phase === 'phase_ii') return profile.late_war_aggression;
  return profile.early_war_aggression;
}

const AGGRESSION_TAPER_START_WEEK = 0;
const AGGRESSION_TAPER_END_WEEK = 156;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function resolveAggression(profile: BotStrategyProfile, phase: PhaseName | undefined, timeContext?: BotTimeContext, state?: GameState): BotAggressionProfile {
  const phaseAggression = resolveAggressionForPhase(profile, phase);
  let broadBase: number;
  if (!timeContext) {
    broadBase = phaseAggression;
  } else {
    const t = clamp01((timeContext.global_week - AGGRESSION_TAPER_START_WEEK) / (AGGRESSION_TAPER_END_WEEK - AGGRESSION_TAPER_START_WEEK));
    broadBase = lerp(profile.early_war_aggression, profile.late_war_aggression, t);
  }

  // Phase I §4.8: Alliance-aware aggression modifiers
  let allianceMod = 0;
  if (state) {
    const rhs = state.rbih_hrhb_state;
    const allianceValue = state.phase_i_alliance_rbih_hrhb;
    if (rhs && allianceValue !== undefined && allianceValue !== null) {
      if (profile.faction === 'HRHB') {
        // HRHB: patron pressure drives confrontation — higher aggression when alliance strained
        const patronCommitment = (state.factions ?? []).find((f) => f.id === 'HRHB')?.patron_state?.patron_commitment ?? 0;
        if (allianceValue <= 0.20 && patronCommitment > 0.3) {
          allianceMod = 0.10; // Boost aggression toward confrontation
        }
        // Post-Washington: redirect aggression to RS
        if (rhs.washington_signed) {
          allianceMod = 0.05; // Slight boost for joint operations
        }
      } else if (profile.faction === 'RBiH') {
        // RBiH: de-escalation — reduce aggression when fragile alliance
        if (allianceValue > 0.0 && allianceValue <= 0.50) {
          allianceMod = -0.05; // Slightly less aggressive to appease
        }
        // Post-Washington: boost for joint RS operations
        if (rhs.washington_signed) {
          allianceMod = 0.05;
        }
      }
    }
  }

  const broad = clamp01(broadBase + allianceMod);
  return {
    broad_aggression: broad,
    planned_ops_aggression: clamp01(Math.max(profile.planned_ops_min_aggression, broad))
  };
}
