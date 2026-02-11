/**
 * Coordinate transforms between data space and canvas space.
 * Handles zoom, pan, and view box computation.
 */

import type { BBox, ViewTransform, SettlementFeature, PolygonCoords } from '../types.js';
import { MAP_PADDING } from '../constants.js';

export class MapProjection {
  private dataBounds: BBox;

  constructor(dataBounds: BBox) {
    this.dataBounds = dataBounds;
  }

  /** Update data bounds (e.g. after loading base map extends settlement bounds). */
  updateBounds(bounds: BBox): void {
    this.dataBounds = bounds;
  }

  getBounds(): BBox {
    return this.dataBounds;
  }

  /**
   * Compute the current view transform for a given canvas size, zoom, and pan.
   */
  computeTransform(
    canvasW: number, canvasH: number,
    zoomFactor: number,
    panCenter: { x: number; y: number },
    padding = MAP_PADDING,
  ): ViewTransform {
    const { minX, minY, maxX, maxY } = this.dataBounds;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    let viewBox: BBox;
    if (zoomFactor <= 1) {
      viewBox = { minX, minY, maxX, maxY };
    } else {
      const cx = minX + rangeX * panCenter.x;
      const cy = minY + rangeY * panCenter.y;
      const halfW = (rangeX / zoomFactor) / 2;
      const halfH = (rangeY / zoomFactor) / 2;
      viewBox = {
        minX: cx - halfW,
        maxX: cx + halfW,
        minY: cy - halfH,
        maxY: cy + halfH,
      };
    }

    const vw = viewBox.maxX - viewBox.minX;
    const vh = viewBox.maxY - viewBox.minY;
    const scale = Math.min(
      (canvasW - padding * 2) / vw,
      (canvasH - padding * 2) / vh,
    );
    const offsetX = (canvasW - vw * scale) / 2;
    const offsetY = (canvasH - vh * scale) / 2;

    return { viewBox, scale, offsetX, offsetY, canvasW, canvasH };
  }

  /** Project data coordinates to canvas pixel coordinates. */
  project(dataX: number, dataY: number, t: ViewTransform): [number, number] {
    return [
      (dataX - t.viewBox.minX) * t.scale + t.offsetX,
      (dataY - t.viewBox.minY) * t.scale + t.offsetY,
    ];
  }

  /** Inverse project canvas pixel coordinates back to data coordinates. */
  unproject(canvasX: number, canvasY: number, t: ViewTransform): [number, number] {
    return [
      (canvasX - t.offsetX) / t.scale + t.viewBox.minX,
      (canvasY - t.offsetY) / t.scale + t.viewBox.minY,
    ];
  }

  /** Check if a bounding box intersects the current view. */
  isInViewport(bbox: BBox, vt: ViewTransform): boolean {
    return !(
      bbox.maxX < vt.viewBox.minX ||
      bbox.minX > vt.viewBox.maxX ||
      bbox.maxY < vt.viewBox.minY ||
      bbox.minY > vt.viewBox.maxY
    );
  }
}

// ─── Utility Functions ─────────────────────────────

/** Compute bounds from a collection of settlement polygons. */
export function boundsFromPolygons(polygons: Map<string, SettlementFeature>): BBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const feature of polygons.values()) {
    const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const poly of polys) {
      for (const ring of poly) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/** Expand bounds to include additional features (base map boundary, etc). */
export function expandBounds(existing: BBox, features: Array<{ geometry: { coordinates: unknown } }>): BBox {
  let { minX, minY, maxX, maxY } = existing;

  function scanCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const x = coords[0] as number;
      const y = coords[1] as number;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    for (const item of coords) {
      scanCoords(item);
    }
  }

  for (const f of features) {
    scanCoords(f.geometry.coordinates);
  }

  return { minX, minY, maxX, maxY };
}

/** Compute the centroid of a polygon feature (average of outer ring vertices). */
export function computeFeatureCentroid(feature: SettlementFeature): [number, number] | null {
  const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;

  let sumX = 0, sumY = 0, count = 0;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring) continue;
    for (const [x, y] of ring) {
      sumX += x;
      sumY += y;
      count++;
    }
  }
  if (count === 0) return null;
  return [sumX / count, sumY / count];
}

/** Compute the bounding box of a polygon feature. */
export function computeFeatureBBox(feature: SettlementFeature): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polys: PolygonCoords[] = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  for (const poly of polys) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}
