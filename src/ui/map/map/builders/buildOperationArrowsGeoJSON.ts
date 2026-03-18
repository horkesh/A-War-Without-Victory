import type { Feature, FeatureCollection, LineString, Polygon, Point } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import type { OsidCentroidLookup } from './geojsonLookup';
import { hashString, buildBezierCurve, buildArrowheadTriangle, buildTaperedArrowBody } from './arrowGeometry';

// ── Faction colors for operation arrows ─────────────────────────────────────

const FACTION_ARROW_COLORS: Record<string, { line: string; head: string; glow: string }> = {
  RS: { line: 'rgba(200, 70, 70, 0.55)', head: 'rgba(200, 70, 70, 0.7)', glow: 'rgba(200, 70, 70, 0.15)' },
  RBiH: { line: 'rgba(70, 165, 90, 0.55)', head: 'rgba(70, 165, 90, 0.7)', glow: 'rgba(70, 165, 90, 0.15)' },
  HRHB: { line: 'rgba(70, 130, 200, 0.55)', head: 'rgba(70, 130, 200, 0.7)', glow: 'rgba(70, 130, 200, 0.15)' },
};

const DEFAULT_COLORS = { line: 'rgba(160, 160, 160, 0.4)', head: 'rgba(160, 160, 160, 0.5)', glow: 'rgba(160, 160, 160, 0.1)' };

// ── Main builder ────────────────────────────────────────────────────────────

type OpArrowFeature =
  | Feature<LineString, { type: 'op-arrow-glow'; faction: string; op_name: string; color: string }>
  | Feature<Polygon, { type: 'op-arrow-body' | 'op-arrow-head'; faction: string; op_name: string; color: string }>
  | Feature<Point, { type: 'op-arrow-origin'; faction: string; op_name: string; color: string }>;

/**
 * Build sweeping military-style operation arrows for the main map.
 * One arrow per operation: from staging/sector origin → final objective.
 * Discreet, faction-colored, semi-transparent. Visible even when the operation is not selected.
 */
export function buildOperationArrowsGeoJSON(
  state: LoadedGameState,
  centroidLookup: OsidCentroidLookup,
): FeatureCollection {
  const features: OpArrowFeature[] = [];
  const ops = state.operations;
  if (!ops || ops.length === 0) return { type: 'FeatureCollection', features: [] };

  // Build formation location index for computing brigade centroid origins
  const formationLocationMap = new Map<string, string>();
  if (state.formations) {
    for (const f of state.formations) {
      if (f.location_osid) formationLocationMap.set(f.id, f.location_osid);
    }
  }

  for (const op of ops) {
    if (!op.objectives || op.objectives.length === 0) continue;

    const firstObjective = op.objectives[0];
    const firstObjPt = centroidLookup.get(firstObjective);

    // Compute origin: position of the lead brigade (closest to first objective)
    let rawOrigin: [number, number] | null = null;
    if (op.participating_brigade_ids && op.participating_brigade_ids.length > 0 && firstObjPt) {
      let bestDist = Infinity;
      for (const bid of op.participating_brigade_ids) {
        const locOsid = formationLocationMap.get(bid);
        if (!locOsid) continue;
        const pt = centroidLookup.get(locOsid);
        if (!pt) continue;
        const d = (pt[0] - firstObjPt[0]) ** 2 + (pt[1] - firstObjPt[1]) ** 2;
        if (d < bestDist) {
          bestDist = d;
          rawOrigin = pt;
        }
      }
    }

    // Fallback: staging OSID centroid
    if (!rawOrigin && op.staging_osid) {
      rawOrigin = centroidLookup.get(op.staging_osid) ?? null;
    }

    if (!rawOrigin && firstObjPt) {
      rawOrigin = [firstObjPt[0] - 0.05, firstObjPt[1] - 0.02];
    }
    if (!rawOrigin) continue;

    const colors = FACTION_ARROW_COLORS[op.faction] ?? DEFAULT_COLORS;

    const origin: [number, number] = rawOrigin;

    // Compute target: centroid of ALL objective positions (single pass).
    let sumX = 0, sumY = 0, objCount = 0;
    for (const obj of op.objectives) {
      const pt = centroidLookup.get(obj);
      if (pt) { sumX += pt[0]; sumY += pt[1]; objCount++; }
    }
    if (objCount === 0) continue;
    const targetPt: [number, number] = [sumX / objCount, sumY / objCount];

    // Compute curve offset — deterministic per operation, sweeping military feel
    const hash = hashString(op.name + op.corps_id);
    const dx = targetPt[0] - origin[0];
    const dy = targetPt[1] - origin[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const offsetSign = (Math.abs(hash) % 2 === 0) ? 1 : -1;
    const offsetMag = len * (0.08 + ((Math.abs(hash) % 50) / 50) * 0.12) * offsetSign;

    const curve = buildBezierCurve(origin, targetPt, offsetMag, 24);

    // Arrow thickness scales with number of objectives — more targets = wider arrow.
    // Base: 1 objective = standard width. Each additional objective adds ~30% width.
    const objScale = 1 + (op.objectives.length - 1) * 0.3;
    const baseHalfW = Math.max(0.006, len * 0.04) * objScale;
    const tipHalfW = Math.max(0.002, len * 0.012) * objScale;

    // Glow (wide, blurred — rendered behind)
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: curve },
      properties: { type: 'op-arrow-glow', faction: op.faction, op_name: op.name, color: colors.glow },
    });

    // Tapered body polygon (wide at base → narrow at tip)
    const body = buildTaperedArrowBody(curve, baseHalfW, tipHalfW);
    if (body) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [body] },
        properties: { type: 'op-arrow-body', faction: op.faction, op_name: op.name, color: colors.line },
      });
    }

    // Arrowhead — wider than the tip of the body, scales with objectives
    const headWidth = Math.max(0.009, len * 0.035) * objScale;
    const headLength = headWidth * 1.8;
    const triangle = buildArrowheadTriangle(curve, headLength, headWidth);
    if (triangle) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [triangle] },
        properties: { type: 'op-arrow-head', faction: op.faction, op_name: op.name, color: colors.head },
      });
    }

    // Origin dot
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: origin },
      properties: { type: 'op-arrow-origin', faction: op.faction, op_name: op.name, color: colors.line },
    });
  }

  return { type: 'FeatureCollection', features: features as Feature[] };
}
