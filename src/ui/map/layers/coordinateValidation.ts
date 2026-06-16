import type { MultiPolygon, Polygon } from 'geojson';

const warnedInvalidPolygonKeys = new Set<string>();

function isFiniteLngLat(position: unknown): boolean {
  if (!Array.isArray(position) || position.length < 2) return false;
  const lng = position[0];
  const lat = position[1];
  return (
    typeof lng === 'number'
    && typeof lat === 'number'
    && Number.isFinite(lng)
    && Number.isFinite(lat)
    && lng >= -180
    && lng <= 180
    && lat >= -90
    && lat <= 90
  );
}

function sameLngLat(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function ringHasArea(ring: number[][]): boolean {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  const unique = new Set<string>();
  for (const position of ring) {
    const lng = position[0];
    const lat = position[1];
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    unique.add(`${lng},${lat}`);
  }
  return unique.size >= 3 && maxLng > minLng && maxLat > minLat;
}

function isValidRing(ring: unknown): ring is number[][] {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  if (!ring.every((position) => isFiniteLngLat(position))) return false;
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];
  return sameLngLat(first, last) && ringHasArea(ring as number[][]);
}

function isValidPolygonCoordinates(coordinates: unknown): coordinates is number[][][] {
  return (
    Array.isArray(coordinates)
    && coordinates.length > 0
    && coordinates.every((ring) => isValidRing(ring))
  );
}

export function hasValidLngLatCoordinates(geom: Polygon | MultiPolygon): boolean {
  if (geom.type === 'Polygon') {
    return isValidPolygonCoordinates(geom.coordinates);
  }
  return (
    Array.isArray(geom.coordinates)
    && geom.coordinates.length > 0
    && geom.coordinates.every((polygon) => isValidPolygonCoordinates(polygon))
  );
}

export function warnInvalidOverlayPolygonOnce(layerId: string, osid: string): void {
  const key = `${layerId}|${osid}`;
  if (warnedInvalidPolygonKeys.has(key)) return;
  warnedInvalidPolygonKeys.add(key);
  console.warn(`[AWWV] Skipping ${layerId} polygon with invalid coordinates: ${osid}`);
}
