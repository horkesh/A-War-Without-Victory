import oobBrigades from '../../../../data/source/oob_brigades.json';
import type { EliteCommanderView } from './types';

interface OobEliteCommanderRow {
  name?: unknown;
  competence?: unknown;
  aggressiveness?: unknown;
  defensive_skill?: unknown;
}

interface OobBrigadeRow {
  id?: unknown;
  elite_commander?: OobEliteCommanderRow;
}

function finiteRating(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeEliteCommander(value: OobEliteCommanderRow | undefined): EliteCommanderView | undefined {
  if (!value || typeof value.name !== 'string' || !value.name.trim()) return undefined;
  return {
    name: value.name.trim(),
    competence: finiteRating(value.competence),
    aggressiveness: finiteRating(value.aggressiveness),
    defensive_skill: finiteRating(value.defensive_skill),
  };
}

const ELITE_COMMANDER_BY_FORMATION_ID = new Map<string, EliteCommanderView>();

for (const row of oobBrigades as OobBrigadeRow[]) {
  if (typeof row.id !== 'string' || !row.id) continue;
  const commander = normalizeEliteCommander(row.elite_commander);
  if (commander) ELITE_COMMANDER_BY_FORMATION_ID.set(row.id, commander);
}

export function getEliteCommanderForFormationId(formationId: string): EliteCommanderView | undefined {
  return ELITE_COMMANDER_BY_FORMATION_ID.get(formationId);
}
