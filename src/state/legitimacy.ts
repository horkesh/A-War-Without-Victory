import type { GameState, FactionId, LegitimacyState, MunicipalityId, SettlementId } from './game_state.js';
import type { LoadedSettlementGraph } from '../map/settlements.js';
import { loadInitialMunicipalityControllers1990 } from './political_control_init.js';
import { loadMunicipalityPopulation1991, getFactionDemographicFraction } from '../data/municipality_population.js';

export const DEMOGRAPHIC_WEIGHT = 0.4;
export const INSTITUTIONAL_WEIGHT = 0.3;
export const COERCION_PENALTY_INCREMENT = 0.2;
export const COERCION_DECAY_RATE = 0.01;
export const STABILITY_BONUS_RATE = 0.01;
export const STABILITY_BONUS_CAP = 0.3;
export const RECRUITMENT_LEGITIMACY_MIN = 0.5;

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

export function getFactionLegitimacyAverages(state: GameState): Record<string, number> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const faction of state.factions) {
    totals[faction.id] = { sum: 0, count: 0 };
  }
  const controllers = state.political_controllers ?? {};
  const settlements = state.settlements ?? {};
  for (const [sid, controller] of Object.entries(controllers)) {
    if (!controller) continue;
    const leg = settlements[sid]?.legitimacy_state?.legitimacy_score;
    if (typeof leg !== 'number') continue;
    const bucket = totals[controller];
    if (!bucket) continue;
    bucket.sum += leg;
    bucket.count += 1;
  }
  const averages: Record<string, number> = {};
  for (const [fid, agg] of Object.entries(totals)) {
    averages[fid] = agg.count > 0 ? agg.sum / agg.count : 0.5;
  }
  return averages;
}
