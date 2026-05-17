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

function allPositionsValid(coordinates: unknown): boolean {
  if (!Array.isArray(coordinates)) return false;
  if (coordinates.length === 0) return false;
  if (typeof coordinates[0] === 'number') {
    return isFiniteLngLat(coordinates);
  }
  return coordinates.every((child) => allPositionsValid(child));
}

export function hasValidLngLatCoordinates(geom: Polygon | MultiPolygon): boolean {
  return allPositionsValid(geom.coordinates);
}

export function warnInvalidOverlayPolygonOnce(layerId: string, osid: string): void {
  const key = `${layerId}|${osid}`;
  if (warnedInvalidPolygonKeys.has(key)) return;
  warnedInvalidPolygonKeys.add(key);
  console.warn(`[AWWV] Skipping ${layerId} polygon with invalid coordinates: ${osid}`);
}
