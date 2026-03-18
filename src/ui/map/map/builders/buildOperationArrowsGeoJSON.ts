import type { Feature, FeatureCollection, LineString, Polygon, Point } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import { type OsidCentroidLookup, resolveOsidKey } from './geojsonLookup';
import { hashString, buildBezierCurve, buildArrowheadTriangle, buildTaperedArrowBody } from './arrowGeometry';

// ── Faction colors for operation arrows ─────────────────────────────────────

const FACTION_ARROW_COLORS: Record<string, { line: string; head: string; glow: string }> = {
  RS: { line: 'rgba(200, 70, 70, 0.55)', head: 'rgba(200, 70, 70, 0.7)', glow: 'rgba(200, 70, 70, 0.15)' },
  RBiH: { line: 'rgba(70, 165, 90, 0.55)', head: 'rgba(70, 165, 90, 0.7)', glow: 'rgba(70, 165, 90, 0.15)' },
  HRHB: { line: 'rgba(70, 130, 200, 0.55)', head: 'rgba(70, 130, 200, 0.7)', glow: 'rgba(70, 130, 200, 0.15)' },
};

const DEFAULT_COLORS = { line: 'rgba(160, 160, 160, 0.4)', head: 'rgba(160, 160, 160, 0.5)', glow: 'rgba(160, 160, 160, 0.1)' };

// ── Types ───────────────────────────────────────────────────────────────────

type OpArrowFeature =
  | Feature<LineString, { type: 'op-arrow-glow'; faction: string; op_name: string; color: string }>
  | Feature<Polygon, { type: 'op-arrow-body' | 'op-arrow-head'; faction: string; op_name: string; color: string }>
  | Feature<Point, { type: 'op-arrow-origin'; faction: string; op_name: string; color: string }>;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve OSID to centroid, trying key normalization if direct lookup fails. */
function resolveCentroid(osid: string | undefined, lookup: OsidCentroidLookup): [number, number] | null {
  if (!osid) return null;
  const pt = lookup.get(osid);
  if (pt) return pt;
  // Try key normalization (S-prefix, op: prefix variations)
  const resolved = resolveOsidKey(osid, lookup);
  return resolved ? lookup.get(resolved) ?? null : null;
}

/** Compute geographic centroid of a list of OSIDs. Returns null if none resolve. */
function computeObjectiveCentroid(
  objectives: string[],
  centroidLookup: OsidCentroidLookup,
): [number, number] | null {
  let sumX = 0, sumY = 0, count = 0;
  for (const obj of objectives) {
    const pt = resolveCentroid(obj, centroidLookup);
    if (pt) { sumX += pt[0]; sumY += pt[1]; count++; }
  }
  return count > 0 ? [sumX / count, sumY / count] : null;
}

/** Push a single tapered arrow (glow + body + head + origin dot). */
function pushTaperedArrow(
  features: OpArrowFeature[],
  origin: [number, number],
  target: [number, number],
  hashSeed: string,
  objCount: number,
  faction: string,
  opName: string,
  colors: { line: string; head: string; glow: string },
): void {
  const hash = hashString(hashSeed);
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return; // Origin ≈ target — skip degenerate arrow

  const offsetSign = (Math.abs(hash) % 2 === 0) ? 1 : -1;
  const offsetMag = len * (0.08 + ((Math.abs(hash) % 50) / 50) * 0.12) * offsetSign;
  const curve = buildBezierCurve(origin, target, offsetMag, 24);

  // Arrow width scales with objective count — more targets = wider arrow
  const objScale = 1 + (objCount - 1) * 0.3;
  const baseHalfW = Math.max(0.006, len * 0.04) * objScale;
  const tipHalfW = Math.max(0.002, len * 0.012) * objScale;

  // Glow
  features.push({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: curve },
    properties: { type: 'op-arrow-glow', faction, op_name: opName, color: colors.glow },
  });

  // Tapered body
  const body = buildTaperedArrowBody(curve, baseHalfW, tipHalfW);
  if (body) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [body] },
      properties: { type: 'op-arrow-body', faction, op_name: opName, color: colors.line },
    });
  }

  // Arrowhead
  const headWidth = Math.max(0.009, len * 0.035) * objScale;
  const headLength = headWidth * 1.8;
  const triangle = buildArrowheadTriangle(curve, headLength, headWidth);
  if (triangle) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [triangle] },
      properties: { type: 'op-arrow-head', faction, op_name: opName, color: colors.head },
    });
  }

  // Origin dot
  features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: origin },
    properties: { type: 'op-arrow-origin', faction, op_name: opName, color: colors.line },
  });
}

// ── Main builder ────────────────────────────────────────────────────────────

/**
 * Build sweeping military-style operation arrows for the main map.
 *
 * - Single-axis ops: one arrow from staging OSID → objective centroid.
 * - Multi-axis ops: one arrow per axis from axis staging → axis objective centroid.
 * - Arrow thickness scales with objective count per axis.
 */
export function buildOperationArrowsGeoJSON(
  state: LoadedGameState,
  centroidLookup: OsidCentroidLookup,
): FeatureCollection {
  const features: OpArrowFeature[] = [];
  const ops = state.operations;
  if (!ops || ops.length === 0) return { type: 'FeatureCollection', features: [] };

  for (const op of ops) {
    if (!op.objectives || op.objectives.length === 0) continue;

    const colors = FACTION_ARROW_COLORS[op.faction] ?? DEFAULT_COLORS;

    // Resolve operation-level staging origin
    const opStagingPt = resolveCentroid(op.staging_osid, centroidLookup);

    // Multi-axis: draw one arrow per axis
    if (op.axes && op.axes.length > 1) {
      for (const axis of op.axes) {
        if (!axis.objectives || axis.objectives.length === 0) continue;

        // Axis origin: axis staging OSID → op staging OSID → first objective fallback
        let axisOrigin = resolveCentroid(axis.staging_osid, centroidLookup);
        if (!axisOrigin) axisOrigin = opStagingPt;
        if (!axisOrigin) {
          const firstPt = resolveCentroid(axis.objectives[0], centroidLookup);
          if (firstPt) axisOrigin = [firstPt[0] - 0.03, firstPt[1] - 0.01];
        }
        if (!axisOrigin) continue;

        const axisTarget = computeObjectiveCentroid(axis.objectives, centroidLookup);
        if (!axisTarget) continue;

        pushTaperedArrow(
          features, axisOrigin, axisTarget,
          op.name + axis.axis_id, axis.objectives.length,
          op.faction, op.name, colors,
        );
      }
      continue; // Multi-axis handled — skip single-arrow path
    }

    // Single-axis (or no axes): one arrow from staging → objective centroid
    let origin: [number, number] | null = opStagingPt;

    // If axes[0] has a staging OSID, prefer that
    if (!origin && op.axes?.[0]?.staging_osid) {
      origin = resolveCentroid(op.axes[0].staging_osid, centroidLookup);
    }

    // Fallback: first objective with offset
    if (!origin) {
      const firstPt = resolveCentroid(op.objectives[0], centroidLookup);
      if (firstPt) origin = [firstPt[0] - 0.05, firstPt[1] - 0.02];
    }
    if (!origin) continue;

    const target = computeObjectiveCentroid(op.objectives, centroidLookup);
    if (!target) continue;

    pushTaperedArrow(
      features, origin, target,
      op.name + (op.corps_id ?? ''), op.objectives.length,
      op.faction, op.name, colors,
    );
  }

  return { type: 'FeatureCollection', features: features as Feature[] };
}
