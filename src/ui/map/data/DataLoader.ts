/**
 * Data loading and classification for the Tactical Map.
 * Fetches all required JSON/GeoJSON files in parallel, classifies base map features,
 * builds control lookups, computes centroids and search index.
 */

import type {
  LoadedData, SettlementFeature, BaseMapFeature, ClassifiedBaseFeatures,
  PoliticalControlData, SettlementNamesData, Mun1990NamesData,
  SettlementEthnicityData, SettlementEdge, SearchIndexEntry, BBox,
  SharedBorderSegment, PolygonCoords, Position,
} from '../types.js';
import { buildControlLookup, buildStatusLookup } from './ControlLookup.js';
import { boundsFromPolygons, expandBounds, computeFeatureCentroid, computeFeatureBBox } from '../geo/MapProjection.js';

function getBaseUrl(): string {
  if (typeof window === 'undefined' || !window.location?.origin) return '';
  return window.location.origin;
}

async function loadJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  if (text.trimStart().startsWith('<')) throw new Error(`Got HTML instead of JSON: ${url}`);
  return JSON.parse(text) as T;
}

async function loadJsonOptional<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.trimStart().startsWith('<')) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Normalize text for diacritic-insensitive search. */
export function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function classifyBaseMapFeatures(features: BaseMapFeature[]): ClassifiedBaseFeatures {
  const result: ClassifiedBaseFeatures = {
    boundary: [],
    rivers: [],
    roadsMSR: [],
    roadsSecondary: [],
    controlRegions: [],
  };
  for (const f of features) {
    const role = f.properties?.role;
    if (role === 'boundary') result.boundary.push(f);
    else if (role === 'river') result.rivers.push(f);
    else if (role === 'road') {
      if (f.properties?.nato_class === 'MSR') result.roadsMSR.push(f);
      else result.roadsSecondary.push(f);
    }
    else if (role === 'control_region') result.controlRegions.push(f);
  }
  return result;
}

export type LoadingProgress = {
  stage: string;
  detail?: string;
};

/**
 * Load all data for the Tactical Map.
 * @param onProgress Optional callback for loading progress updates.
 */
export async function loadAllData(
  onProgress?: (p: LoadingProgress) => void,
): Promise<LoadedData> {
  const base = getBaseUrl();
  if (!base) throw new Error('Cannot determine base URL.');

  onProgress?.({ stage: 'Fetching data files...' });

  // Parallel fetch of all required and optional data files
  const [
    settlementsRes,
    controlRes,
    baseMapRes,
    edgesRes,
    namesRes,
    munRes,
    ethRes,
  ] = await Promise.all([
    loadJson<{ features?: SettlementFeature[]; awwv_meta?: unknown }>(
      `${base}/data/derived/settlements_a1_viewer.geojson`
    ),
    loadJson<PoliticalControlData>(
      `${base}/data/derived/political_control_data.json`
    ),
    loadJsonOptional<{ features?: BaseMapFeature[] }>(
      `${base}/data/derived/A1_BASE_MAP.geojson`
    ),
    loadJsonOptional<{ edges?: SettlementEdge[] }>(
      `${base}/data/derived/settlement_edges.json`
    ),
    loadJsonOptional<{ by_census_id?: Record<string, { name: string; mun_code: string }> }>(
      `${base}/data/derived/settlement_names.json`
    ),
    loadJsonOptional<{ by_municipality_id?: Record<string, { display_name: string; mun1990_id: string }> }>(
      `${base}/data/derived/mun1990_names.json`
    ),
    loadJsonOptional<SettlementEthnicityData>(
      `${base}/data/derived/settlement_ethnicity_data.json`
    ),
  ]);

  onProgress?.({ stage: 'Processing settlements...' });

  // Build settlements map
  const settlements = new Map<string, SettlementFeature>();
  const rawFeatures = settlementsRes?.features ?? [];
  for (const f of rawFeatures) {
    const sid = f.properties?.sid;
    if (sid) settlements.set(sid, f);
  }
  if (settlements.size === 0) throw new Error('No settlement features in GeoJSON');

  // Build control lookups
  const controlLookup = buildControlLookup(controlRes.by_settlement_id ?? {});
  const statusLookup = buildStatusLookup(controlRes.control_status_by_settlement_id ?? {});

  // Classify base map features
  const baseFeatures = classifyBaseMapFeatures(baseMapRes?.features as BaseMapFeature[] ?? []);

  // Compute bounds from settlements, then expand with base map boundary
  onProgress?.({ stage: 'Computing bounds...' });
  let dataBounds = boundsFromPolygons(settlements);
  if (!dataBounds) throw new Error('Could not compute data bounds');

  if (baseFeatures.boundary.length > 0) {
    dataBounds = expandBounds(dataBounds, baseFeatures.boundary as Array<{ geometry: { coordinates: unknown } }>);
  }

  // Compute settlement centroids
  onProgress?.({ stage: 'Computing centroids...' });
  const settlementCentroids = new Map<string, [number, number]>();
  for (const [sid, feature] of settlements) {
    const c = computeFeatureCentroid(feature);
    if (c) settlementCentroids.set(sid, c);
  }

  // Compute municipality centroids from control_region features (keyed by display name)
  const municipalityCentroids = new Map<string, [number, number]>();
  for (const cr of baseFeatures.controlRegions) {
    const name = cr.properties?.name;
    if (!name || cr.geometry.type !== 'Polygon' && cr.geometry.type !== 'MultiPolygon') continue;
    // Use a simple centroid from the polygon
    const coords = cr.geometry.type === 'Polygon'
      ? [cr.geometry.coordinates as unknown as Array<Array<[number, number]>>]
      : cr.geometry.coordinates as unknown as Array<Array<Array<[number, number]>>>;
    let sx = 0, sy = 0, cnt = 0;
    for (const poly of coords) {
      const ring = poly[0];
      if (!ring) continue;
      for (const [x, y] of ring) {
        sx += x; sy += y; cnt++;
      }
    }
    if (cnt > 0) {
      municipalityCentroids.set(name, [sx / cnt, sy / cnt]);
      const mun1990Id = (cr.properties as Record<string, unknown>)?.mun1990_id as string | undefined;
      if (mun1990Id) municipalityCentroids.set(mun1990Id, [sx / cnt, sy / cnt]);
    }
  }

  // Build search index with display names and municipality info
  onProgress?.({ stage: 'Building search index...' });
  const searchIndex: SearchIndexEntry[] = [];
  for (const [sid, feature] of settlements) {
    const name = feature.properties?.name ?? '';
    if (!name) continue;
    const centroid = settlementCentroids.get(sid);
    if (!centroid) continue;
    searchIndex.push({
      sid,
      name,
      displayName: computeDisplayName(name),
      nameNormalized: normalizeForSearch(name),
      natoClass: feature.properties?.nato_class ?? 'SETTLEMENT',
      population: feature.properties?.pop ?? 0,
      municipalityId: feature.properties?.municipality_id,
      bbox: computeFeatureBBox(feature),
      centroid,
    });
  }
  searchIndex.sort((a, b) => a.name.localeCompare(b.name));

  // Compute primary label SIDs: for each municipality, pick the most populous URBAN_CENTER
  const primaryLabelSids = computePrimaryLabels(searchIndex);

  // Edges
  const edges: SettlementEdge[] = edgesRes?.edges ?? [];

  // Compute shared border segments for front line rendering
  onProgress?.({ stage: 'Computing shared borders...' });
  const sharedBorders = computeSharedBorders(edges, settlements);

  // Names
  const settlementNames: SettlementNamesData = {
    by_census_id: namesRes?.by_census_id ?? {},
  };
  const mun1990Names: Mun1990NamesData = {
    by_municipality_id: munRes?.by_municipality_id ?? {},
  };

  // Key municipality centroids by mun1990_id so formations (tag mun:xxx) resolve to a position.
  // Control regions are keyed by display name; formations use mun1990_id. Map display_name -> mun1990_id.
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  for (const rec of Object.values(mun1990Names.by_municipality_id ?? {})) {
    const mun1990Id = rec?.mun1990_id;
    const displayName = rec?.display_name;
    if (!mun1990Id || !displayName) continue;
    let centroid = municipalityCentroids.get(displayName);
    if (!centroid) {
      const normDisplay = norm(displayName);
      for (const [key, cen] of municipalityCentroids) {
        if (norm(key) === normDisplay) {
          centroid = cen;
          break;
        }
      }
    }
    if (centroid) municipalityCentroids.set(mun1990Id, centroid);
  }
  // Fallback: from settlements when they have mun1990_id or municipality_id (e.g. other pipelines).
  const byMun1990 = new Map<string, { sx: number; sy: number; cnt: number }>();
  for (const [sid, feature] of settlements) {
    const centroid = settlementCentroids.get(sid);
    if (!centroid) continue;
    const mun1990Id =
      (feature.properties as Record<string, unknown>)?.mun1990_id as string | undefined
      ?? mun1990Names.by_municipality_id?.[String((feature.properties as Record<string, unknown>)?.municipality_id ?? '')]?.mun1990_id;
    if (!mun1990Id) continue;
    const cur = byMun1990.get(mun1990Id) ?? { sx: 0, sy: 0, cnt: 0 };
    cur.sx += centroid[0];
    cur.sy += centroid[1];
    cur.cnt += 1;
    byMun1990.set(mun1990Id, cur);
  }
  for (const [mun1990Id, { sx, sy, cnt }] of byMun1990) {
    if (cnt > 0) municipalityCentroids.set(mun1990Id, [sx / cnt, sy / cnt]);
  }

  const ethnicityData: SettlementEthnicityData | null = ethRes ?? null;

  onProgress?.({ stage: 'Ready.' });

  return {
    settlements,
    baseFeatures,
    controlData: controlRes,
    controlLookup,
    statusLookup,
    edges,
    sharedBorders,
    settlementNames,
    mun1990Names,
    ethnicityData,
    dataBounds,
    searchIndex,
    primaryLabelSids,
    settlementCentroids,
    municipalityCentroids,
  };
}

/**
 * Compute a short display name for map labels.
 * "Sarajevo Dio - Centar Sajarevo" → "Sarajevo"
 * "Banja Luka" → "Banja Luka" (unchanged)
 */
function computeDisplayName(name: string): string {
  // Strip "Dio - ..." suffix pattern for sub-city districts
  const dioMatch = name.match(/^(.+?)\s+Dio\s*-/);
  if (dioMatch) return dioMatch[1];
  return name;
}

/**
 * For each municipality, pick the most populous URBAN_CENTER to be the label shown
 * at strategic and operational zoom (avoiding overlapping labels for sub-districts).
 */
function computePrimaryLabels(index: SearchIndexEntry[]): Set<string> {
  const primaries = new Set<string>();
  // Group URBAN_CENTERs by municipality
  const byMun = new Map<number, SearchIndexEntry[]>();
  const noMun: SearchIndexEntry[] = [];
  for (const entry of index) {
    if (entry.natoClass !== 'URBAN_CENTER') continue;
    if (entry.municipalityId != null) {
      let list = byMun.get(entry.municipalityId);
      if (!list) { list = []; byMun.set(entry.municipalityId, list); }
      list.push(entry);
    } else {
      noMun.push(entry);
    }
  }
  // For each municipality, pick most populous; also group by displayName for cross-mun dedup
  const byDisplayName = new Map<string, SearchIndexEntry>();
  for (const entries of byMun.values()) {
    entries.sort((a, b) => b.population - a.population);
    const best = entries[0];
    const existing = byDisplayName.get(best.displayName);
    if (!existing || best.population > existing.population) {
      byDisplayName.set(best.displayName, best);
    }
  }
  for (const entry of noMun) {
    const existing = byDisplayName.get(entry.displayName);
    if (!existing || entry.population > existing.population) {
      byDisplayName.set(entry.displayName, entry);
    }
  }
  for (const entry of byDisplayName.values()) {
    primaries.add(entry.sid);
  }
  return primaries;
}

/**
 * For each edge, extract the shared border vertices between the two settlement polygons.
 * These form the contact line used for front line rendering.
 */
function computeSharedBorders(
  edges: SettlementEdge[],
  settlements: Map<string, SettlementFeature>,
): SharedBorderSegment[] {
  const result: SharedBorderSegment[] = [];
  for (const edge of edges) {
    const fa = settlements.get(edge.a);
    const fb = settlements.get(edge.b);
    if (!fa || !fb) continue;
    const points = extractSharedVertices(fa, fb);
    if (points.length >= 2) {
      result.push({ a: edge.a, b: edge.b, points });
    }
  }
  return result;
}

/** Extract ordered shared vertices between two polygon features. */
function extractSharedVertices(a: SettlementFeature, b: SettlementFeature): Position[] {
  const ringsA = getOuterRings(a);
  const ringsB = getOuterRings(b);
  // Build a set of vertex keys from B
  const setB = new Set<string>();
  for (const ring of ringsB) {
    for (const pt of ring) {
      setB.add(`${pt[0]},${pt[1]}`);
    }
  }
  // Walk rings of A, collect consecutive shared vertices
  const shared: Position[] = [];
  for (const ring of ringsA) {
    for (const pt of ring) {
      if (setB.has(`${pt[0]},${pt[1]}`)) {
        shared.push(pt);
      }
    }
  }
  return shared;
}

function getOuterRings(feature: SettlementFeature): Position[][] {
  const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  return polys.map(poly => poly[0]);
}
