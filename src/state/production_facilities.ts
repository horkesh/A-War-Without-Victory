import type { GameState, MunicipalityId, ProductionFacilityState } from './game_state.js';
import type { SettlementRecord } from '../map/settlements.js';

interface ProductionFacilitySeed {
  facility_id: string;
  name: string;
  municipality_id: MunicipalityId;
  type: ProductionFacilityState['type'];
  base_capacity: number;
}

const FACILITY_SEEDS: ProductionFacilitySeed[] = [
  {
    facility_id: 'prod_breza_ammo',
    name: 'Breza Munitions',
    municipality_id: 'breza',
    type: 'ammunition' as const,
    base_capacity: 4
  },
  {
    facility_id: 'prod_bugojno_arms',
    name: 'Bugojno Factory',
    municipality_id: 'bugojno',
    type: 'small_arms' as const,
    base_capacity: 5
  },
  {
    facility_id: 'prod_konjic_igman',
    name: 'Igman Konjic',
    municipality_id: 'konjic',
    type: 'small_arms' as const,
    base_capacity: 6
  },
  {
    facility_id: 'prod_novi_travnik_bratstvo',
    name: 'Bratstvo Novi Travnik',
    municipality_id: 'novi_travnik',
    type: 'ammunition' as const,
    base_capacity: 6
  },
  {
    facility_id: 'prod_vitez_ammo',
    name: 'Vitez Munitions Factory',
    municipality_id: 'vitez',
    type: 'ammunition' as const,
    base_capacity: 6
  },
  {
    facility_id: 'prod_vogosca_mortar',
    name: 'Vogosca Industrial Complex',
    municipality_id: 'vogosca',
    type: 'ammunition' as const,
    base_capacity: 3
  },
  {
    facility_id: 'prod_zenica_steel',
    name: 'Zenica Steel Works',
    municipality_id: 'zenica',
    type: 'heavy_equipment' as const,
    base_capacity: 8
  }
].sort((a, b) => a.facility_id.localeCompare(b.facility_id));

export function ensureProductionFacilities(state: GameState): void {
  if (state.production_facilities && Object.keys(state.production_facilities).length > 0) return;
  const out: Record<string, ProductionFacilityState> = {};
  for (const seed of FACILITY_SEEDS) {
    out[seed.facility_id] = {
      facility_id: seed.facility_id,
      name: seed.name,
      municipality_id: seed.municipality_id,
      type: seed.type,
      base_capacity: seed.base_capacity,
      current_condition: 1,
      required_inputs: {
        electricity: true,
        raw_materials: true,
        skilled_labor: true
      }
    };
  }
  state.production_facilities = out;
}

function getMunicipalityControllerByMajority(
  state: GameState,
  settlements: Map<string, SettlementRecord>
): Map<MunicipalityId, string | null> {
  const counts = new Map<MunicipalityId, Map<string, number>>();
  const controllers = state.political_controllers ?? {};
  const sids = Array.from(settlements.keys()).sort((a, b) => a.localeCompare(b));
  for (const sid of sids) {
    const rec = settlements.get(sid);
    if (!rec) continue;
    const mun = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
    const controller = controllers[sid] ?? null;
    if (!controller) continue;
    const byFaction = counts.get(mun) ?? new Map<string, number>();
    byFaction.set(controller, (byFaction.get(controller) ?? 0) + 1);
    counts.set(mun, byFaction);
  }
  const out = new Map<MunicipalityId, string | null>();
  for (const [mun, byFaction] of counts.entries()) {
    const ranked = Array.from(byFaction.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    out.set(mun, ranked.length > 0 ? ranked[0]![0] : null);
  }
  return out;
}

export function calculateFactionProductionBonus(
  state: GameState,
  settlements: Map<string, SettlementRecord>
): Record<string, number> {
  ensureProductionFacilities(state);
  const facilities = state.production_facilities ?? {};
  const factionIds = (state.factions ?? []).map((f) => f.id).sort((a, b) => a.localeCompare(b));
  const bonuses: Record<string, number> = {};
  for (const fid of factionIds) bonuses[fid] = 0;
  const munController = getMunicipalityControllerByMajority(state, settlements);
  const facilityIds = Object.keys(facilities).sort((a, b) => a.localeCompare(b));
  for (const facilityId of facilityIds) {
    const f = facilities[facilityId];
    if (!f) continue;
    const controller = munController.get(f.municipality_id) ?? null;
    if (!controller) continue;
    if (!f.required_inputs.electricity || !f.required_inputs.raw_materials || !f.required_inputs.skilled_labor) {
      continue;
    }
    if (f.current_condition <= 0.3) continue;
    const bonus = f.base_capacity * f.current_condition;
    bonuses[controller] = (bonuses[controller] ?? 0) + bonus;
  }
  return Object.fromEntries(Object.entries(bonuses).sort((a, b) => a[0].localeCompare(b[0])));
}
