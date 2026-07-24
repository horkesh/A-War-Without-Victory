import type { FormationView, LoadedGameState, OperationView } from '../map/data/types';
import {
  getPlayerFacingFaction as normalizePlayerFacingFaction,
  getPlayerVisibleFactions,
  getPlayerVisibleOperations,
  type PlayerFacingFaction,
} from './playerFacingLabels';

type SectorView = NonNullable<LoadedGameState['corpsFrontSectors']>[number];

export function resolvePlayerFacingFaction(state: LoadedGameState | null | undefined): PlayerFacingFaction | null {
  return normalizePlayerFacingFaction(state);
}

export function getPlayerFacingFaction(state: LoadedGameState | null | undefined): PlayerFacingFaction | null {
  return resolvePlayerFacingFaction(state);
}

export function filterPlayerFacingFormations(state: LoadedGameState | null | undefined): FormationView[] {
  if (!state?.formations) return [];
  return getPlayerVisibleFactions(state.formations, resolvePlayerFacingFaction(state));
}

export function isFieldedBrigade(formation: { kind?: unknown; status?: unknown; readiness?: unknown } | null | undefined): boolean {
  return formation?.kind === 'brigade' && isActiveFormationStatus(formation);
}

export function isFieldedTacticalFormation(formation: { kind?: unknown; status?: unknown; readiness?: unknown } | null | undefined): boolean {
  return (formation?.kind === 'brigade' || formation?.kind === 'operational_group' || formation?.kind === 'og')
    && isActiveFormationStatus(formation)
    && isReadyForFieldDisplay(formation);
}

export function isPlayerVisibleTacticalMarker(
  formation: { kind?: unknown; status?: unknown; readiness?: unknown; faction?: unknown } | null | undefined,
  state: LoadedGameState | null | undefined,
): boolean {
  if (isFieldedTacticalFormation(formation)) return true;
  if (
    formation?.kind !== 'brigade'
    || !isActiveFormationStatus(formation)
    || String(formation.readiness).toLowerCase() !== 'forming'
  ) return false;
  const playerFaction = resolvePlayerFacingFaction(state);
  return playerFaction == null || formation.faction === playerFaction;
}

function isActiveFormationStatus(formation: { status?: unknown; readiness?: unknown } | null | undefined): boolean {
  if (formation?.status == null) return false;
  return String(formation.status).toLowerCase() === 'active';
}

function isReadyForFieldDisplay(formation: { readiness?: unknown } | null | undefined): boolean {
  if (formation?.readiness == null) return true;
  const readiness = String(formation.readiness).toLowerCase();
  return readiness !== 'forming' && readiness !== 'unreported' && readiness !== 'destroyed';
}

export function filterPlayerFacingSectors(state: LoadedGameState | null | undefined): SectorView[] {
  if (!state?.corpsFrontSectors) return [];
  return getPlayerVisibleFactions(state.corpsFrontSectors, resolvePlayerFacingFaction(state));
}

export function findPlayerFacingSectorById(
  state: LoadedGameState | null | undefined,
  sectorId: string | null | undefined,
): SectorView | null {
  if (!sectorId) return null;
  return filterPlayerFacingSectors(state).find((sector) => sector.sector_id === sectorId) ?? null;
}

export function filterPlayerFacingOperations(state: LoadedGameState | null | undefined): OperationView[] {
  if (!state?.operations) return [];
  return getPlayerVisibleOperations(state.operations, resolvePlayerFacingFaction(state));
}

export function findPlayerFacingOperationByKey(
  state: LoadedGameState | null | undefined,
  selectedOperationKey: string | null | undefined,
): OperationView | null {
  if (!selectedOperationKey) return null;
  return filterPlayerFacingOperations(state).find(
    (operation) => `${operation.corps_id}|${operation.name}` === selectedOperationKey,
  ) ?? null;
}

export function filterPlayerFacingActiveOperations(
  state: LoadedGameState | null | undefined,
): NonNullable<LoadedGameState['activeOperations']> {
  if (!state?.activeOperations) return [];
  return getPlayerVisibleFactions(state.activeOperations, resolvePlayerFacingFaction(state));
}

export function filterPlayerFacingOperationHistory(
  state: LoadedGameState | null | undefined,
): NonNullable<LoadedGameState['operationHistory']> {
  if (!state?.operationHistory) return [];
  return getPlayerVisibleFactions(state.operationHistory, resolvePlayerFacingFaction(state));
}

export function filterPlayerFacingMovementsByOsid(
  state: LoadedGameState | null | undefined,
): LoadedGameState['movementsByOsid'] {
  if (!state?.movementsByOsid) return {};
  const playerFormationIds = new Set(filterPlayerFacingFormations(state).map((formation) => formation.id));
  const filteredEntries = Object.entries(state.movementsByOsid).map(([osid, movements]) => ([
    osid,
    movements.filter((movement) => playerFormationIds.has(movement.formation_id)),
  ]));
  return Object.fromEntries(filteredEntries);
}

type BattleVisibilityRecord = {
  osid?: unknown;
  attacker_faction?: unknown;
  defender_faction?: unknown;
};

export function isPlayerVisibleBattle(
  battle: BattleVisibilityRecord | null | undefined,
  state: Pick<LoadedGameState, 'player_faction' | 'fogOfWar'> | null | undefined,
): boolean {
  const playerFaction = resolvePlayerFacingFaction(state as LoadedGameState | null | undefined);
  if (!playerFaction) return true;
  if (battle?.attacker_faction === playerFaction || battle?.defender_faction === playerFaction) return true;
  const osid = typeof battle?.osid === 'string' ? battle.osid : null;
  return Boolean(osid && state?.fogOfWar?.visibleEnemyOsids?.includes(osid));
}

export function filterPlayerVisibleBattles<T extends BattleVisibilityRecord>(
  battles: readonly T[] | null | undefined,
  state: Pick<LoadedGameState, 'player_faction' | 'fogOfWar'> | null | undefined,
): T[] {
  if (!battles) return [];
  return battles.filter((battle) => isPlayerVisibleBattle(battle, state));
}

export function filterPlayerFacingBattlesByOsid(
  state: LoadedGameState | null | undefined,
): LoadedGameState['battlesByOsid'] {
  if (!state?.battlesByOsid) return {};
  const out: LoadedGameState['battlesByOsid'] = {};
  for (const [osid, battles] of Object.entries(state.battlesByOsid).sort(([a], [b]) => a.localeCompare(b))) {
    const visible = battles.filter((battle) => isPlayerVisibleBattle({ ...battle, osid: battle.osid ?? osid }, state));
    if (visible.length > 0) out[osid] = visible;
  }
  return out;
}

export function filterPlayerVisibleMapFormations(state: LoadedGameState | null | undefined): FormationView[] {
  if (!state?.formations) return [];
  const playerFaction = resolvePlayerFacingFaction(state);
  if (!playerFaction) return state.formations;

  const visibleEnemyOsids = collectPlayerVisibleEnemyOsids(state, playerFaction);
  return state.formations.filter((formation) => (
    formation.faction === playerFaction
    || (typeof formation.location_osid === 'string' && visibleEnemyOsids.has(formation.location_osid))
  ));
}

export function isPlayerEnemyContactFormation(
  state: LoadedGameState | null | undefined,
  formation: { faction?: unknown; location_osid?: unknown } | null | undefined,
): boolean {
  const playerFaction = resolvePlayerFacingFaction(state);
  if (!playerFaction || !formation || formation.faction === playerFaction) return false;
  return typeof formation.location_osid === 'string'
    && collectPlayerVisibleEnemyOsids(state, playerFaction).has(formation.location_osid);
}

function collectPlayerVisibleEnemyOsids(
  state: LoadedGameState | null | undefined,
  playerFaction: PlayerFacingFaction,
): Set<string> {
  const visible = new Set(state?.fogOfWar?.visibleEnemyOsids ?? []);
  for (const edge of state?.frontEdgesOsid ?? []) {
    const a = typeof edge.a === 'string' ? edge.a : null;
    const b = typeof edge.b === 'string' ? edge.b : null;
    const sideA = typeof edge.side_a === 'string' ? edge.side_a : null;
    const sideB = typeof edge.side_b === 'string' ? edge.side_b : null;
    if (!a || !b || !sideA || !sideB || sideA === sideB) continue;
    if (sideA === playerFaction && sideB !== playerFaction) visible.add(b);
    if (sideB === playerFaction && sideA !== playerFaction) visible.add(a);
  }
  return visible;
}
