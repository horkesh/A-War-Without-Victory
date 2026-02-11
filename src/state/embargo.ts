import type { GameState, EmbargoProfile, FactionId } from './game_state.js';

export const SMUGGLING_EFFICIENCY_GROWTH = 0.0015;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function defaultEmbargoProfile(factionId: FactionId): EmbargoProfile {
  if (factionId === 'RS') {
    return {
      heavy_equipment_access: 0.9,
      ammunition_resupply_rate: 0.8,
      maintenance_capacity: 0.7,
      smuggling_efficiency: 0.0,
      external_pipeline_status: 0.9
    };
  }
  if (factionId === 'HRHB') {
    return {
      heavy_equipment_access: 0.6,
      ammunition_resupply_rate: 0.6,
      maintenance_capacity: 0.6,
      smuggling_efficiency: 0.0,
      external_pipeline_status: 0.7
    };
  }
  return {
    heavy_equipment_access: 0.2,
    ammunition_resupply_rate: 0.3,
    maintenance_capacity: 0.4,
    smuggling_efficiency: 0.0,
    external_pipeline_status: 0.4
  };
}

export function ensureEmbargoProfiles(state: GameState): void {
  for (const faction of state.factions) {
    if (!faction.embargo_profile) {
      faction.embargo_profile = defaultEmbargoProfile(faction.id);
    }
  }
}

export function updateEmbargoProfiles(state: GameState): void {
  const turn = state.meta.turn;
  ensureEmbargoProfiles(state);
  for (const faction of state.factions) {
    const embargo = faction.embargo_profile!;
    const base = embargo.smuggling_efficiency ?? 0;
    const growth = (turn / 200) * 0.3;
    embargo.smuggling_efficiency = clamp01(base + growth);
    embargo.heavy_equipment_access = clamp01(embargo.heavy_equipment_access);
    embargo.ammunition_resupply_rate = clamp01(embargo.ammunition_resupply_rate);
    embargo.maintenance_capacity = clamp01(embargo.maintenance_capacity);
    embargo.external_pipeline_status = clamp01(embargo.external_pipeline_status);
  }
}

export function getEffectiveHeavyEquipmentAccess(profile: EmbargoProfile | undefined): number {
  if (!profile) return 1;
  const smuggle = profile.smuggling_efficiency ?? 0;
  return clamp01(profile.heavy_equipment_access * (0.7 + 0.3 * smuggle) * profile.external_pipeline_status);
}
