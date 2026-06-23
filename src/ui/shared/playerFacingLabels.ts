type IdNameSource =
  | Map<string, string>
  | Record<string, string | undefined>
  | ReadonlyArray<{ id?: string | null; name?: string | null }>;

type FactionScopedItem = { faction: string };

export type PlayerFacingFaction = 'RS' | 'RBiH' | 'HRHB';
type PlayerFactionSource = string | null | undefined | { player_faction?: string | null | undefined };

function getNameFromSource(id: string | null | undefined, source: IdNameSource): string | null {
  if (!id) return null;
  if (source instanceof Map) return source.get(id) ?? null;
  if (Array.isArray(source)) {
    return source.find((entry) => entry.id === id)?.name ?? null;
  }
  return (source as Record<string, string | undefined>)[id] ?? null;
}

export function getPlayerFacingCorpsName(
  corpsId: string | null | undefined,
  source: IdNameSource,
  fallback = 'This corps',
): string {
  return getNameFromSource(corpsId, source) ?? fallback;
}

export function getAssignedCommandLabel(
  corpsId: string | null | undefined,
  source: IdNameSource,
  fallback = 'Assigned command',
): string {
  return getNameFromSource(corpsId, source) ?? fallback;
}

export function getPlayerFacingSectorName(
  sectorId: string | null | undefined,
  sectors: ReadonlyArray<{ sector_id?: string | null; display_name?: string | null }>,
  fallback = 'Assigned sector',
): string {
  if (!sectorId) return fallback;
  const displayName = sectors.find((sector) => sector.sector_id === sectorId)?.display_name?.trim();
  if (!displayName) return fallback;
  if (!displayName.includes('_') && !displayName.includes(':')) return displayName;
  return fallback;
}

export function getPlayerFacingFaction(source: PlayerFactionSource): PlayerFacingFaction | null {
  const playerFaction = typeof source === 'string' || source == null
    ? source
    : source.player_faction;
  return playerFaction === 'RS' || playerFaction === 'RBiH' || playerFaction === 'HRHB'
    ? playerFaction
    : null;
}

export function getPlayerVisibleFactions<T extends FactionScopedItem>(
  items: ReadonlyArray<T> | null | undefined,
  playerFaction: string | null | undefined,
): T[] {
  if (!items) return [];
  const normalizedFaction = getPlayerFacingFaction(playerFaction);
  if (!normalizedFaction) return [];
  return items.filter((item) => item.faction === normalizedFaction);
}

export function getPlayerVisibleOperations<T extends FactionScopedItem>(
  operations: ReadonlyArray<T> | null | undefined,
  playerFaction: string | null | undefined,
): T[] {
  return getPlayerVisibleFactions(operations, playerFaction);
}
