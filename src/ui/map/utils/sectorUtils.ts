/**
 * Shared sector utilities for map visualization.
 * Used by Tooltip (Phase A), sector fill (Phase B), brigade sync (Phase C), density mode (Phase E).
 */

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
  faction: string;
  edge_ids: string[];
  territory_osids?: string[];
  assigned_brigade_ids: string[];
  reserve_brigade_ids: string[];
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
    s => s.assigned_brigade_ids.includes(formationId) || s.reserve_brigade_ids.includes(formationId)
  );
  return sector?.sector_id ?? null;
}
