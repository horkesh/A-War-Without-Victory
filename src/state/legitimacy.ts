import type { GameState, FactionId, LegitimacyState, MunicipalityId, SettlementId } from './game_state.js';
import type { LoadedSettlementGraph } from '../map/settlements.js';
import { loadInitialMunicipalityControllers1990 } from './political_control_init.js';
import { loadMunicipalityPopulation1991, getFactionDemographicFraction } from '../data/municipality_population.js';

// Re-export browser-safe utilities from legitimacy_utils so existing consumers
// that import from this module continue to work without changes.
export {
  DEMOGRAPHIC_WEIGHT,
  INSTITUTIONAL_WEIGHT,
  COERCION_PENALTY_INCREMENT,
  COERCION_DECAY_RATE,
  STABILITY_BONUS_RATE,
  STABILITY_BONUS_CAP,
  RECRUITMENT_LEGITIMACY_MIN,
  getFactionLegitimacyAverages
} from './legitimacy_utils.js';

// Also import constants for local use in updateLegitimacyState.
import {
  DEMOGRAPHIC_WEIGHT,
  INSTITUTIONAL_WEIGHT,
  COERCION_PENALTY_INCREMENT,
  COERCION_DECAY_RATE,
  STABILITY_BONUS_RATE,
  STABILITY_BONUS_CAP,
} from './legitimacy_utils.js';

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getMunicipalityIdForSettlement(
  settlements: LoadedSettlementGraph,
  sid: SettlementId
): MunicipalityId | null {
  const record = settlements.settlements.get(sid);
  if (!record) return null;
  return (record.mun1990_id ?? record.mun_code) as MunicipalityId;
}

function getInstitutionalLegitimacy(
  controller: FactionId | null,
  prewarController: FactionId | null
): number {
  if (!controller) return 0.3;
  if (controller === prewarController) return 1.0;
  if (prewarController === null) return 0.6;
  return 0.3;
}

function isCoerciveFlip(state: GameState, munId: MunicipalityId | null): boolean {
  if (!munId) return false;
  const mun = state.municipalities?.[munId];
  if (!mun) return false;
  const status = mun.control_status;
  if (status === 'HIGHLY_CONTESTED') return true;
  const score = mun.stability_score ?? 50;
  return score < 40;
}

export async function updateLegitimacyState(
  state: GameState,
  graph: LoadedSettlementGraph
): Promise<void> {
  if (!state.political_controllers) return;
  if (!state.settlements) state.settlements = {};
  const turn = state.meta.turn;
  const populationData = await loadMunicipalityPopulation1991();
  const prewarControllers = await loadInitialMunicipalityControllers1990();

  const sids = Object.keys(state.political_controllers).sort((a, b) => a.localeCompare(b));
  for (const sid of sids) {
    const controller = state.political_controllers[sid] ?? null;
    const munId = getMunicipalityIdForSettlement(graph, sid);
    const settlementState = state.settlements[sid] ?? {};
    const legitimacy = settlementState.legitimacy_state;

    const demographic = clamp01(getFactionDemographicFraction(populationData, munId ?? '', controller));
    const prewarController = munId ? (prewarControllers[munId] ?? null) : null;
    const institutional = clamp01(getInstitutionalLegitimacy(controller, prewarController));

    const previousController = legitimacy?.last_controller ?? controller;
    const controllerChanged = previousController !== controller;
    let coercionPenalty = clamp01((legitimacy?.coercion_penalty ?? 0) - COERCION_DECAY_RATE);
    let stabilityBonus = legitimacy?.stability_bonus ?? 0;

    if (controllerChanged) {
      stabilityBonus = 0;
      if (isCoerciveFlip(state, munId)) {
        coercionPenalty = clamp01(coercionPenalty + COERCION_PENALTY_INCREMENT);
      }
    } else {
      stabilityBonus = clamp01(Math.min(STABILITY_BONUS_CAP, stabilityBonus + STABILITY_BONUS_RATE));
    }

    const legitimacyScore = clamp01(
      demographic * DEMOGRAPHIC_WEIGHT + institutional * INSTITUTIONAL_WEIGHT + stabilityBonus - coercionPenalty
    );

    const next: LegitimacyState = {
      legitimacy_score: legitimacyScore,
      demographic_legitimacy: demographic,
      institutional_legitimacy: institutional,
      stability_bonus: stabilityBonus,
      coercion_penalty: coercionPenalty,
      last_updated_turn: turn,
      last_controller: controller,
      last_control_change_turn: controllerChanged ? turn : legitimacy?.last_control_change_turn ?? null
    };

    settlementState.legitimacy_state = next;
    state.settlements[sid] = settlementState;
  }
}
