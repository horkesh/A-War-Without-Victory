/**
 * Shared sector utilities for map visualization.
 * Used by Tooltip (Phase A), sector fill (Phase B), brigade sync (Phase C), density mode (Phase E).
 */
import { isFieldedTacticalFormation } from '../../shared/playerVisibility';

const FACTION_SUFFIXES = [':RS', ':RBiH', ':HRHB'] as const;

/**
 * Strip the faction suffix from a composite front-edge hover ID.
 * Hover features use format `op:a:b__op:c:d:RS` but canonical edge IDs are `op:a:b__op:c:d`.
 */
export function stripFactionSuffix(compositeEdgeId: string): string {
  for (const suffix of FACTION_SUFFIXES) {
    if (compositeEdgeId.endsWith(suffix)) {
      return compositeEdgeId.slice(0, -suffix.length);
    }
  }
  return compositeEdgeId;
}

/**
 * Extract the faction suffix from a composite front-edge hover ID.
 * Returns the faction string (e.g. 'RS') or null if no known suffix.
 */
export function extractFactionFromEdgeId(compositeEdgeId: string): string | null {
  for (const suffix of FACTION_SUFFIXES) {
    if (compositeEdgeId.endsWith(suffix)) {
      return suffix.slice(1); // strip leading ':'
    }
  }
  return null;
}

interface FrontEdgeView {
  edge_id: string;
  a: string;
  b: string;
  side_a: string | null;
  side_b: string | null;
}

interface SectorView {
  sector_id: string;
  corps_id?: string;
  faction: string;
  edge_ids: string[];
  territory_osids?: string[];
  assigned_brigade_ids: string[];
  reserve_brigade_ids: string[];
  rear_brigade_ids?: string[];
}

interface FormationSectorView {
  id: string;
  faction?: string;
  kind?: string;
  status?: string;
  corps_id?: string;
  sectorOverrideId?: string;
}

export interface SectorFormationAssignment {
  frontlineIds: string[];
  reserveIds: string[];
  rearIds: string[];
  overrideIds: string[];
  lineHoldingIds: string[];
  allCurrentIds: string[];
  unresolvedRosterIds: string[];
}

export type SectorCoverageTier = 'uncovered' | 'thin' | 'held' | 'dense';

export function getSectorCoverageTier(
  density: number | undefined | null,
  assignment: Pick<SectorFormationAssignment, 'lineHoldingIds'>,
): SectorCoverageTier {
  if (assignment.lineHoldingIds.length === 0 || !Number.isFinite(density) || (density ?? 0) <= 0) return 'uncovered';
  const reportedDensity = density ?? 0;
  if (reportedDensity < 0.12) return 'thin';
  if (reportedDensity < 0.28) return 'held';
  return 'dense';
}

/**
 * Collect the friendly-side OSIDs for a given sector.
 * For each edge in the sector, finds the OSID on the sector's faction side.
 */
export function collectSectorFriendlyOsids(
  sector: SectorView,
  frontEdgesOsid: FrontEdgeView[] | undefined
): string[] {
  if (!frontEdgesOsid) return [];
  const edgeIdSet = new Set(sector.edge_ids);
  const osids = new Set<string>();
  for (const edge of frontEdgesOsid) {
    if (!edgeIdSet.has(edge.edge_id)) continue;
    if (edge.side_a === sector.faction) osids.add(edge.a);
    if (edge.side_b === sector.faction) osids.add(edge.b);
  }
  return [...osids].sort();
}

/**
 * Build a lookup map from OSID to sector_id.
 * Used for hover previews where hovering an OSID highlights the entire sector.
 */
export function buildOsidToSectorMap(
  corpsFrontSectors: SectorView[],
  frontEdgesOsid: FrontEdgeView[]
): Map<string, string> {
  const osidToSector = new Map<string, string>();
  for (const sector of corpsFrontSectors) {
    for (const osid of sector.territory_osids ?? []) {
      if (!osidToSector.has(osid)) {
        osidToSector.set(osid, sector.sector_id);
      }
    }
    const friendlyOsids = collectSectorFriendlyOsids(sector, frontEdgesOsid);
    for (const osid of friendlyOsids) {
      // If an OSID belongs to multiple sectors (rare/overlap), first one wins for hover.
      if (!osidToSector.has(osid)) {
        osidToSector.set(osid, sector.sector_id);
      }
    }
  }
  return osidToSector;
}

/**
 * Find the sector_id assigned to a given formation (corps-front sector).
 */
export function getSectorIdForFormation(
  formationId: string,
  corpsFrontSectors: SectorView[] | undefined
): string | null {
  if (!corpsFrontSectors) return null;
  const sector = corpsFrontSectors.find(
    s => s.assigned_brigade_ids.includes(formationId)
      || s.reserve_brigade_ids.includes(formationId)
      || (s.rear_brigade_ids ?? []).includes(formationId)
  );
  return sector?.sector_id ?? null;
}

function isValidOverrideSector(formation: FormationSectorView, sector: SectorView): boolean {
  if (!formation.sectorOverrideId || formation.sectorOverrideId !== sector.sector_id) return false;
  if (formation.corps_id && sector.corps_id && formation.corps_id !== sector.corps_id) return false;
  if (formation.faction && sector.faction && formation.faction !== sector.faction) return false;
  return true;
}

function resolveValidOverrideSector(
  formation: FormationSectorView,
  corpsFrontSectors: readonly SectorView[] | undefined,
): SectorView | null {
  if (!formation.sectorOverrideId || !corpsFrontSectors) return null;
  return corpsFrontSectors.find((sector) => isValidOverrideSector(formation, sector)) ?? null;
}

function compareStableText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolve the sector the UI should treat as the brigade's current command
 * assignment. Player sector overrides win only when they still point at a
 * valid same-corps/same-faction sector; otherwise the physical roster arrays
 * remain the fallback.
 */
export function resolveCurrentSectorForFormation(
  formation: FormationSectorView | null | undefined,
  corpsFrontSectors: SectorView[] | undefined,
): SectorView | null {
  if (!formation) return null;
  const overrideSector = resolveValidOverrideSector(formation, corpsFrontSectors);
  if (overrideSector) return overrideSector;
  const rosterSectorId = getSectorIdForFormation(formation.id, corpsFrontSectors);
  return rosterSectorId
    ? corpsFrontSectors?.find((sector) => sector.sector_id === rosterSectorId) ?? null
    : null;
}

/**
 * Current player-facing sector membership projection. Engine sector rosters
 * stay unchanged, but command surfaces should not keep counting a brigade in
 * its stale roster sector after a valid player override points it elsewhere.
 */
export function buildSectorFormationAssignment(
  sector: SectorView,
  formations: readonly FormationSectorView[] | undefined,
  allSectors: readonly SectorView[] | undefined = [sector],
): SectorFormationAssignment {
  const formationById = new Map((formations ?? []).map((formation) => [formation.id, formation]));
  const isResolvedFielded = (formationId: string): boolean => {
    const formation = formationById.get(formationId);
    return formation != null && isFieldedTacticalFormation(formation);
  };
  const isOverriddenAway = (formationId: string): boolean => {
    const formation = formationById.get(formationId);
    if (!formation?.sectorOverrideId || formation.sectorOverrideId === sector.sector_id) return false;
    return resolveValidOverrideSector(formation, allSectors) !== null;
  };

  const frontlineIds = [...(sector.assigned_brigade_ids ?? [])]
    .filter(isResolvedFielded)
    .filter((id) => !isOverriddenAway(id))
    .sort(compareStableText);
  const reserveIds = [...(sector.reserve_brigade_ids ?? [])]
    .filter(isResolvedFielded)
    .filter((id) => !isOverriddenAway(id))
    .sort(compareStableText);
  const rearIds = [...(sector.rear_brigade_ids ?? [])]
    .filter(isResolvedFielded)
    .filter((id) => !isOverriddenAway(id))
    .sort(compareStableText);
  const unresolvedRosterIds = [...new Set([
    ...(sector.assigned_brigade_ids ?? []),
    ...(sector.reserve_brigade_ids ?? []),
    ...(sector.rear_brigade_ids ?? []),
  ].filter((id) => !formationById.has(id)))].sort(compareStableText);
  const rosterIds = new Set([...frontlineIds, ...reserveIds, ...rearIds]);
  const overrideIds = (formations ?? [])
    .filter((formation) => formation.kind === undefined || isFieldedTacticalFormation(formation))
    .filter((formation) => isValidOverrideSector(formation, sector))
    .map((formation) => formation.id)
    .filter((id) => !rosterIds.has(id))
    .sort(compareStableText);
  const lineHoldingIds = [...new Set([...frontlineIds, ...overrideIds])].sort(compareStableText);
  const allCurrentIds = [...new Set([...frontlineIds, ...reserveIds, ...overrideIds])].sort(compareStableText);
  return { frontlineIds, reserveIds, rearIds, overrideIds, lineHoldingIds, allCurrentIds, unresolvedRosterIds };
}
