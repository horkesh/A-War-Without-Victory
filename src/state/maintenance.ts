import type { GameState, MaintenanceCapacity } from './game_state.js';

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function defaultMaintenanceCapacity(embargoMaintenance: number): MaintenanceCapacity {
  const base = clamp01(0.6 + embargoMaintenance * 0.2);
  return {
    base_capacity: base,
    skilled_technicians: clamp01(0.7 + embargoMaintenance * 0.1),
    spare_parts_availability: clamp01(embargoMaintenance),
    workshop_access: clamp01(0.6 + embargoMaintenance * 0.2),
    external_support: 0.5
  };
}

export function ensureMaintenanceCapacity(state: GameState): void {
  for (const faction of state.factions) {
    if (!faction.maintenance_capacity) {
      const embargoMaintenance = faction.embargo_profile?.maintenance_capacity ?? 0.5;
      faction.maintenance_capacity = defaultMaintenanceCapacity(embargoMaintenance);
    }
  }
}
