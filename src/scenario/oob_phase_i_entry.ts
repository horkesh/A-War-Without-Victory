/**
 * Phase I entry: OOB slot creation and eligibility.
 * OOB formations (brigades, corps) are created once when entering Phase I, gated by
 * faction presence in home mun (and not fragmented).
 */

import type {
  GameState,
  FactionId,
  FormationId,
  FormationState,
  MunicipalityId,
  SettlementId
} from '../state/game_state.js';
import type { OobBrigade, OobCorps } from './oob_loader.js';
import { MIN_BRIGADE_SPAWN, MIN_ELIGIBLE_POPULATION_FOR_BRIGADE } from '../state/formation_constants.js';
import { resolveFormationName } from '../state/formation_naming.js';
import { getEligiblePopulationCount } from '../sim/phase_i/pool_population.js';
import type { MunicipalityPopulation1991Map } from '../sim/phase_i/pool_population.js';

/**
 * Returns true if faction F has presence in municipality M: at least one settlement
 * in M has political_controllers[sid] === F. Returns false if M is fragmented (no spawn).
 * Uses settlement→mun mapping (e.g. from LoadedSettlementGraph.settlements).
 */
export function factionHasPresenceInMun(
  state: GameState,
  faction: FactionId,
  munId: MunicipalityId,
  sidToMun: Map<SettlementId, MunicipalityId>
): boolean {
  if (state.municipalities?.[munId]?.control === 'fragmented') {
    return false;
  }
  const pc = state.political_controllers ?? {};
  for (const [sid, m] of sidToMun) {
    if (m === munId && pc[sid] === faction) {
      return true;
    }
  }
  return false;
}

/**
 * Build sid → mun1990_id map from a settlements Map (e.g. LoadedSettlementGraph.settlements).
 * Only includes entries where mun1990_id is present.
 */
export function buildSidToMunFromSettlements(
  settlements: Map<string, { mun1990_id?: string }>
): Map<SettlementId, MunicipalityId> {
  const out = new Map<SettlementId, MunicipalityId>();
  for (const [sid, rec] of settlements) {
    if (typeof rec.mun1990_id === 'string' && rec.mun1990_id) {
      out.set(sid, rec.mun1990_id);
    }
  }
  return out;
}

export interface CreateOobFormationsReport {
  corps_created: number;
  brigades_created: number;
}

/**
 * Create OOB formations (corps then brigades) at Phase I entry. Only creates slots when
 * faction has presence in home/hq mun and formation id does not already exist. Idempotent.
 * Mutates state.formations. Uses municipalityHqSettlement to set hq_sid on each formation.
 * When population1991ByMun is provided, brigades in muns where faction's 1991 population is
 * below MIN_ELIGIBLE_POPULATION_FOR_BRIGADE get a generic name (demographic gating).
 */
export function createOobFormationsAtPhaseIEntry(
  state: GameState,
  oobCorps: OobCorps[],
  oobBrigades: OobBrigade[],
  municipalityHqSettlement: Record<string, string>,
  sidToMun: Map<SettlementId, MunicipalityId>,
  population1991ByMun?: MunicipalityPopulation1991Map
): CreateOobFormationsReport {
  const report: CreateOobFormationsReport = { corps_created: 0, brigades_created: 0 };
  if (!state.formations || typeof state.formations !== 'object') {
    (state as GameState & { formations: Record<string, FormationState> }).formations = {};
  }
  const currentTurn = state.meta.turn;

  for (const c of oobCorps) {
    if (state.formations[c.id]) continue;
    if (!factionHasPresenceInMun(state, c.faction, c.hq_mun, sidToMun)) continue;
    const hq_sid = municipalityHqSettlement[c.hq_mun];
    const formation: FormationState = {
      id: c.id as FormationId,
      faction: c.faction,
      name: c.name,
      created_turn: currentTurn,
      status: 'active',
      assignment: null,
      tags: [`mun:${c.hq_mun}`],
      kind: c.kind === 'army_hq' ? 'army_hq' : 'corps_asset',
      personnel: 0,
      ...(hq_sid ? { hq_sid } : {})
    };
    state.formations[c.id] = formation;
    report.corps_created += 1;
  }

  const brigadeCountByFactionMun = new Map<string, number>();
  for (const b of oobBrigades) {
    if (state.formations[b.id]) continue;
    if (!factionHasPresenceInMun(state, b.faction, b.home_mun, sidToMun)) continue;
    const hq_sid = municipalityHqSettlement[b.home_mun];
    const tags = [`mun:${b.home_mun}`];
    if (b.corps) tags.push(`corps:${b.corps}`);
    tags.sort((x, y) => x.localeCompare(y));
    const eligiblePop = getEligiblePopulationCount(population1991ByMun, b.home_mun, b.faction);
    const ordinal = (brigadeCountByFactionMun.get(`${b.faction}:${b.home_mun}`) ?? 0) + 1;
    brigadeCountByFactionMun.set(`${b.faction}:${b.home_mun}`, ordinal);
    const name =
      population1991ByMun != null && eligiblePop < MIN_ELIGIBLE_POPULATION_FOR_BRIGADE
        ? resolveFormationName(b.faction as FactionId, b.home_mun, 'brigade', ordinal)
        : b.name;
    const formation: FormationState = {
      id: b.id as FormationId,
      faction: b.faction,
      name,
      created_turn: currentTurn,
      status: 'active',
      assignment: null,
      tags,
      kind: b.kind,
      personnel: MIN_BRIGADE_SPAWN, // so formation-aware Phase I flip sees strength from turn 0 (JNA/early RS historical fidelity)
      ...(hq_sid ? { hq_sid } : {})
    };
    state.formations[b.id] = formation;
    report.brigades_created += 1;
  }

  return report;
}
