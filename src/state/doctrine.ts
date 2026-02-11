import type { GameState, DoctrineState, DoctrineType, FormationState, PostureLevel } from './game_state.js';
import type { SupplyStateDerivationReport, SupplyStateLevel } from './supply_state_derivation.js';
import { getEffectiveEquipmentRatio } from './heavy_equipment.js';

export const INFILTRATE_TERRAIN_BONUS = 0.3;
export const INFILTRATE_VS_STATIC_DEFENSE = 0.4;
export const INFILTRATE_EXHAUSTION_MULT = 1.1;
export const ARTILLERY_COUNTER_DEFENSE_BONUS = 0.25;
export const ARTILLERY_COUNTER_AMMO_MULT = 1.5;
export const COORDINATED_STRIKE_PRESSURE_MULT = 1.4;
export const COORDINATED_STRIKE_DURATION = 4;

const DOCTRINES: DoctrineType[] = [
  'INFILTRATE',
  'ARTILLERY_COUNTER',
  'COORDINATED_STRIKE',
  'STATIC_DEFENSE',
  'ATTACK',
  'DEFEND'
];

function supplyStateScore(state: SupplyStateLevel): number {
  if (state === 'adequate') return 1;
  if (state === 'strained') return 0.5;
  return 0;
}

function getFormationSupplyState(
  formation: FormationState,
  supplyReport: SupplyStateDerivationReport | undefined,
  fallback: SupplyStateLevel = 'critical'
): SupplyStateLevel {
  const assignment = formation.assignment;
  if (!assignment || assignment.kind !== 'edge') return fallback;
  const edgeId = assignment.edge_id;
  if (!edgeId) return fallback;
  if (!supplyReport) return fallback;
  const entry = supplyReport.factions.find((f) => f.faction_id === formation.faction);
  if (!entry) return fallback;
  const matching = entry.by_settlement.find((s) => s.sid === edgeId.split('__')[0]);
  return matching?.state ?? fallback;
}

function getFormationPosture(
  formation: FormationState,
  effectivePosture?: Record<string, { assignments?: Record<string, { posture: PostureLevel }> }>
): PostureLevel | undefined {
  const assignment = formation.assignment;
  if (!assignment || assignment.kind !== 'edge') return undefined;
  const edgeId = assignment.edge_id;
  if (!edgeId) return undefined;
  return effectivePosture?.[formation.faction]?.assignments?.[edgeId]?.posture;
}

function ensureDoctrineState(formation: FormationState): DoctrineState {
  if (formation.doctrine_state) return formation.doctrine_state;
  const eligible: Record<DoctrineType, boolean> = {} as Record<DoctrineType, boolean>;
  for (const d of DOCTRINES) {
    eligible[d] = false;
  }
  formation.doctrine_state = { active: null, eligible, active_turns: 0 };
  return formation.doctrine_state;
}

export function updateDoctrineState(
  state: GameState,
  supplyReport: SupplyStateDerivationReport | undefined,
  effectivePosture?: Record<string, { assignments?: Record<string, { posture: PostureLevel }> }>
): void {
  const formations = Object.values(state.formations ?? {}).sort((a, b) => a.id.localeCompare(b.id));
  for (const formation of formations) {
    const doctrine = ensureDoctrineState(formation);
    for (const d of DOCTRINES) {
      doctrine.eligible[d] = false;
    }

    const supply = getFormationSupplyState(formation, supplyReport);
    const supplyOk = supplyStateScore(supply) >= 0.5;
    const equipmentRatio = getEffectiveEquipmentRatio(formation);
    const cohesion = formation.cohesion ?? 0;
    const experience = formation.experience ?? 0;
    const posture = getFormationPosture(formation, effectivePosture);
    const defensivePosture = posture === 'hold';

    if (formation.faction === 'RBiH') {
      doctrine.eligible.INFILTRATE =
        cohesion > 70 && experience > 0.6 && equipmentRatio < 0.5 && supplyOk;
    } else if (formation.faction === 'RS') {
      const ammoResupply = state.factions.find((f) => f.id === 'RS')?.embargo_profile?.ammunition_resupply_rate ?? 0;
      const operationalHeavy = formation.equipment_state?.operational_heavy ?? 0;
      doctrine.eligible.ARTILLERY_COUNTER =
        operationalHeavy > 60 && ammoResupply > 0.6 && supplyOk && defensivePosture;
    } else if (formation.faction === 'HRHB') {
      const pipeline = state.factions.find((f) => f.id === 'HRHB')?.embargo_profile?.external_pipeline_status ?? 0;
      const operationalHeavy = formation.equipment_state?.operational_heavy ?? 0;
      doctrine.eligible.COORDINATED_STRIKE =
        pipeline > 0.6 && operationalHeavy > 50 && supplyOk;
    }

    if (doctrine.active && !doctrine.eligible[doctrine.active]) {
      doctrine.active = null;
      doctrine.active_turns = 0;
    }

    if (!doctrine.active) {
      if (formation.faction === 'RBiH' && doctrine.eligible.INFILTRATE) doctrine.active = 'INFILTRATE';
      if (formation.faction === 'RS' && doctrine.eligible.ARTILLERY_COUNTER) doctrine.active = 'ARTILLERY_COUNTER';
      if (formation.faction === 'HRHB' && doctrine.eligible.COORDINATED_STRIKE) doctrine.active = 'COORDINATED_STRIKE';
      doctrine.active_turns = doctrine.active ? 1 : 0;
    } else {
      doctrine.active_turns += 1;
    }

    if (doctrine.active === 'COORDINATED_STRIKE' && doctrine.active_turns > COORDINATED_STRIKE_DURATION) {
      doctrine.active = null;
      doctrine.active_turns = 0;
    }
  }
}

export function getDoctrineTempoMultiplier(formation: FormationState): number {
  const active = formation.doctrine_state?.active;
  if (active === 'INFILTRATE') return 0.4;
  if (active === 'ARTILLERY_COUNTER') return 1.3;
  if (active === 'COORDINATED_STRIKE') return 1.1;
  return 1.0;
}

export function getDoctrinePressureMultiplier(formation: FormationState): number {
  const active = formation.doctrine_state?.active;
  if (active === 'INFILTRATE') return 0.8;
  if (active === 'ARTILLERY_COUNTER') return 0.0;
  if (active === 'COORDINATED_STRIKE') return COORDINATED_STRIKE_PRESSURE_MULT;
  return 1.0;
}

export function getFactionDoctrinePressureMultiplier(state: GameState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const faction of state.factions) {
    const formations = Object.values(state.formations ?? {}).filter((f) => f.faction === faction.id);
    if (formations.length === 0) {
      result[faction.id] = 1.0;
      continue;
    }
    let sum = 0;
    let count = 0;
    for (const formation of formations) {
      sum += getDoctrinePressureMultiplier(formation);
      count += 1;
    }
    result[faction.id] = count > 0 ? sum / count : 1.0;
  }
  return result;
}
