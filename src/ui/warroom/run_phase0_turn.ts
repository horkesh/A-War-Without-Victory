/**
 * Browser-safe Phase 0 turn advancement for the warroom.
 * Uses runPhase0Turn from the phase0 pipeline and advances meta.turn by 1.
 * No Node/fs dependencies so it can run in the Vite bundle.
 * Phase I+ is not supported here; use sim/turn_pipeline runTurn in Node for war phases.
 *
 * Now wires real options (buildPhase0TurnOptions), bot AI (runPhase0BotInvestments),
 * alliance tracking, and event generation (generatePhase0Events) into the
 * Phase 0 pipeline.
 *
 * Phase I handoff: when runPhase0Turn transitions to phase_i, seeds org-pen for
 * un-invested municipalities based on political controller, initializes JNA
 * transition state, and emits a war_begins event.
 */

import type { GameState, FactionId, Phase0Event } from '../../state/game_state.js';
import { cloneGameState } from '../../state/clone.js';
import { runPhase0Turn } from '../../phase0/turn.js';
import { buildPhase0TurnOptions } from '../../phase0/phase0_options_builder.js';
import { runPhase0BotInvestments } from '../../phase0/bot_phase0.js';
import { generatePhase0Events } from '../../phase0/phase0_events.js';
import { initializePhase0Relationships } from '../../phase0/alliance.js';
import type { OrganizationalPenetration } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { deriveOrganizationalPenetrationFromFormula } from '../../state/organizational_penetration_formula.js';

const FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

/** Returns true if the org-pen object has any non-zero investment field. */
function hasAnyOrgInvestment(op: OrganizationalPenetration): boolean {
  return (
    (op.sds_penetration ?? 0) > 0 ||
    (op.sda_penetration ?? 0) > 0 ||
    (op.hdz_penetration ?? 0) > 0 ||
    (op.paramilitary_rs ?? 0) > 0 ||
    (op.patriotska_liga ?? 0) > 0 ||
    (op.paramilitary_hrhb ?? 0) > 0 ||
    op.police_loyalty === 'loyal' ||
    op.to_control === 'controlled'
  );
}

function resolveMunicipalityController(state: GameState, munId: string): FactionId | null {
  const direct = state.political_controllers?.[munId];
  if (direct === 'RBiH' || direct === 'RS' || direct === 'HRHB') return direct;
  const op = state.municipalities?.[munId]?.organizational_penetration;
  if (!op) return null;
  const partyScores: Record<FactionId, number> = {
    RBiH: op.sda_penetration ?? 0,
    RS: op.sds_penetration ?? 0,
    HRHB: op.hdz_penetration ?? 0
  };
  let bestFaction: FactionId | null = null;
  let bestScore = 0;
  for (const faction of FACTIONS) {
    const score = partyScores[faction];
    if (score > bestScore) {
      bestScore = score;
      bestFaction = faction;
    }
  }
  return bestScore > 0 ? bestFaction : null;
}

function getFormationHomeMunicipality(formation: { tags?: string[] }): string | null {
  const homeMunTag = formation.tags?.find((tag) => typeof tag === 'string' && tag.startsWith('mun:'));
  if (!homeMunTag) return null;
  const mun = homeMunTag.slice(4);
  return mun.length > 0 ? mun : null;
}

function buildCurrentPlannedBrigadeByFaction(state: GameState, munId: string): Partial<Record<FactionId, boolean>> {
  const presence: Partial<Record<FactionId, boolean>> = {};
  const formationIds = Object.keys(state.formations ?? {}).sort(strictCompare);
  for (const formationId of formationIds) {
    const formation = state.formations?.[formationId];
    if (!formation) continue;
    if ((formation.kind ?? 'brigade') !== 'brigade') continue;
    if (getFormationHomeMunicipality(formation) !== munId) continue;
    const faction = formation.faction;
    if (faction !== 'RBiH' && faction !== 'RS' && faction !== 'HRHB') continue;
    presence[faction] = true;
  }
  return presence;
}

function derivePhaseIHandoffOp(state: GameState, munId: string): OrganizationalPenetration {
  const controller = resolveMunicipalityController(state, munId);
  return deriveOrganizationalPenetrationFromFormula({
    controller,
    aligned_population_share_by_faction: {
      RBiH: controller === 'RBiH' ? 1 : 0,
      RS: controller === 'RS' ? 1 : 0,
      HRHB: controller === 'HRHB' ? 1 : 0
    },
    planned_war_start_brigade_by_faction: buildCurrentPlannedBrigadeByFaction(state, munId)
  });
}

/**
 * Run one Phase 0 turn: bot investments → real options → runPhase0Turn → events → advance.
 * Returns new state; does not mutate the argument.
 * Only valid when state.meta.phase === 'phase_0'.
 *
 * @param state - Current game state (not mutated)
 * @param seed - Deterministic seed for this turn
 * @param playerFaction - The human player's faction, or undefined if all are bots
 */
export function runPhase0TurnAndAdvance(
  state: GameState,
  seed: string,
  playerFaction?: FactionId
): GameState {
  const working = cloneGameState(state);
  if (working.meta.phase !== 'phase_0') {
    return working;
  }

  const prevPhase: string = working.meta.phase;

  // Ensure Phase 0 relationships are initialized
  if (!working.phase0_relationships) {
    working.phase0_relationships = initializePhase0Relationships();
  }

  // Snapshot pre-turn state for event generation
  const preTurnSnapshot = cloneGameState(working);

  // 1. Bot AI: non-player factions invest
  runPhase0BotInvestments(working, playerFaction, seed);

  // 2. Build real options from current state
  const options = buildPhase0TurnOptions(working);

  // 3. Run the Phase 0 engine pipeline (declaration pressure, referendum, stability, transition)
  runPhase0Turn(working, options);

  // 4. Generate events by comparing pre/post state
  const events: Phase0Event[] = generatePhase0Events(preTurnSnapshot, working);

  // 5. Phase I handoff: if runPhase0Turn transitioned to phase_i
  // Note: runPhase0Turn mutates working.meta.phase in place, but TS control flow
  // still narrows it to 'phase_0' from the guard above. Cast to string for comparison.
  const currentPhase: string = working.meta.phase;
  if (prevPhase === 'phase_0' && currentPhase === 'phase_i') {
    applyPhaseIHandoff(working);
    // Emit war_begins event
    events.push({ type: 'war_begins', turn: working.meta.turn, details: {} });
  }

  // 6. Append events to log
  if (!working.phase0_events_log) {
    working.phase0_events_log = [];
  }
  working.phase0_events_log.push(events);

  // 7. Advance turn
  const nextTurn = working.meta.turn + 1;
  if (!Number.isInteger(nextTurn) || nextTurn < 0) {
    throw new Error(`Invariant: meta.turn must be non-negative integer; got ${nextTurn}`);
  }
  return {
    ...working,
    meta: {
      ...working.meta,
      turn: nextTurn,
      seed
    }
  };
}

/**
 * Apply Phase I handoff: seed organizational penetration for un-invested municipalities
 * based on political controller, and initialize JNA transition state.
 *
 * Per Phase 0 Spec §6: municipalities without explicit investment get a baseline
 * org-pen derived from their political controller (institutional control → baseline party pen).
 */
function applyPhaseIHandoff(state: GameState): void {
  // Seed org-pen for un-invested municipalities using the same deterministic formula family as init.
  if (state.municipalities) {
    const munIds = Object.keys(state.municipalities).sort(strictCompare);
    for (const munId of munIds) {
      const mun = state.municipalities[munId];
      if (!mun) continue;

      // Skip municipalities that already have explicit investment
      if (mun.organizational_penetration && hasAnyOrgInvestment(mun.organizational_penetration)) {
        continue;
      }
      mun.organizational_penetration = derivePhaseIHandoffOp(state, munId);
    }
  }

  // Initialize Phase I JNA transition state
  if (!state.phase_i_jna) {
    state.phase_i_jna = {
      transition_begun: false,
      withdrawal_progress: 0,
      asset_transfer_rs: 0,
    };
  }
}
