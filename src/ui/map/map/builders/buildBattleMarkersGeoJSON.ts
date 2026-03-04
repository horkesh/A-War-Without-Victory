/**
 * buildBattleMarkersGeoJSON — Phase 5 GUI.
 *
 * Builds a point FeatureCollection marking OSIDs where combat control flips
 * occurred in the last 3 turns. Used for the battle-markers layer in MapContainer.
 *
 * Input:
 *   recentControlEvents — from LoadedGameState.recentControlEvents (GameStateAdapter)
 *   baseGeoJson         — the OSID polygon FeatureCollection (for centroid extraction)
 *   currentTurn         — current game turn (to compute event age)
 *
 * Deterministic: input events are pre-sorted; output features sorted by OSID.
 */
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon } from 'geojson';
import type { RecentControlEventView } from '../../data/types.js';

function polygonCentroid(coordinates: number[][][]): [number, number] {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  const ring = coordinates[0];
  for (const [x, y] of ring) {
    sumX += x;
    sumY += y;
    count++;
  }
  return [sumX / count, sumY / count];
}

function geometryCentroid(geometry: Polygon | MultiPolygon): [number, number] {
  if (geometry.type === 'Polygon') {
    return polygonCentroid(geometry.coordinates);
  }
  // MultiPolygon: centroid of the first (largest by ring-count) polygon
  const coords = geometry.coordinates[0];
  return polygonCentroid(coords);
}

export function buildBattleMarkersGeoJSON(
  recentControlEvents: RecentControlEventView[],
  baseGeoJson: FeatureCollection,
  currentTurn: number,
): FeatureCollection<Point> {
  // Index base features by OSID for O(1) centroid lookup
  const centroidByOsid = new Map<string, [number, number]>();
  for (const feature of baseGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown> | null)?.osid;
    if (typeof osid !== 'string') continue;
    const geom = feature.geometry;
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      centroidByOsid.set(osid, geometryCentroid(geom as Polygon | MultiPolygon));
    }
  }

  // Filter to combat flips in the last 3 turns
  const combatEvents = recentControlEvents.filter(
    (e) => e.mechanism === 'combat' && e.turn >= currentTurn - 2,
  );

  // Deduplicate: if an OSID flipped multiple times in 3 turns, keep latest flip.
  const latestByOsid = new Map<string, RecentControlEventView>();
  for (const e of combatEvents) {
    const existing = latestByOsid.get(e.settlementId);
    if (!existing || e.turn > existing.turn) {
      latestByOsid.set(e.settlementId, e);
    }
  }

  const features: Feature<Point>[] = [];
  for (const [osid, event] of [...latestByOsid.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const centroid = centroidByOsid.get(osid);
    if (!centroid) continue;
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: centroid },
      properties: {
        osid,
        from: event.from,
        to: event.to,
        turn: event.turn,
        age: currentTurn - event.turn, // 0 = this turn, 1 = last turn, 2 = two turns ago
      },
    });
  }

  return { type: 'FeatureCollection', features };
}
