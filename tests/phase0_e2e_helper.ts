/**
 * Phase B1.1: Helper for Phase 0 end-to-end tests via runOneTurn.
 * Builds minimal valid GameState starting in phase_0 at a known turn.
 */

import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

const DEFAULT_FACTION = {
  profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
  areasOfResponsibility: [] as string[],
  supply_sources: [] as string[],
  command_capacity: 0,
  negotiation: {
    pressure: 0,
    last_change_turn: null,
    capital: 0,
    spent_total: 0,
    last_capital_change_turn: null
  },
  declaration_pressure: 0,
  declared: false,
  declaration_turn: null as number | null
};

/**
 * Build a minimal valid GameState in phase_0 at the given turn.
 * Deterministic; no randomness.
 */
export function buildMinimalPhase0State(opts?: {
  turn?: number;
  seed?: string;
  /** Set both RS and HRHB declared (makes referendum eligible). */
  bothDeclared?: boolean;
  /** referendum_eligible_turn (set when both declared; used to pre-set deadline scenario). */
  referendum_eligible_turn?: number;
  /** referendum_deadline_turn (set when both declared). */
  referendum_deadline_turn?: number;
  /** Referendum was held; use with referendum_turn and war_start_turn for war-start tests. */
  referendum_held?: boolean;
  /** Turn when referendum was held (canon: war_start_turn = referendum_turn + 4). */
  referendum_turn?: number;
  /** Turn when war starts (Phase I); must be referendum_turn + 4. */
  war_start_turn?: number;
}): GameState {
  const turn = opts?.turn ?? 0;
  const seed = opts?.seed ?? 'e2e-seed';

  const state: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
      turn,
      seed,
      phase: 'phase_0'
    },
    factions: [
      { id: 'RBiH', ...DEFAULT_FACTION },
      { id: 'RS', ...DEFAULT_FACTION },
      { id: 'HRHB', ...DEFAULT_FACTION }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
    ceasefire: {},
    negotiation_ledger: [],
    supply_rights: { corridors: [] },
    municipalities: { M1: {}, M2: {} }
  };

  if (opts?.bothDeclared) {
    const rs = state.factions.find((f) => f.id === 'RS')!;
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    rs.declared = true;
    hrhb.declared = true;
  }

  if (opts?.referendum_eligible_turn !== undefined) {
    state.meta.referendum_eligible_turn = opts.referendum_eligible_turn;
  }
  if (opts?.referendum_deadline_turn !== undefined) {
    state.meta.referendum_deadline_turn = opts.referendum_deadline_turn;
  }
  if (opts?.referendum_held === true) {
    state.meta.referendum_held = true;
  }
  if (opts?.referendum_turn !== undefined) {
    state.meta.referendum_turn = opts.referendum_turn;
  }
  if (opts?.war_start_turn !== undefined) {
    state.meta.war_start_turn = opts.war_start_turn;
  }

  return state;
}
