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

  // Build a formation location lookup for computing operation origins
  const formationLocationMap = new Map<string, string>();
  for (const f of state.formations) {
    if (f.location_osid) formationLocationMap.set(f.id, f.location_osid);
  }

  // Sector centroid from assigned brigade locations
  const sectorCentroids = new Map<string, [number, number]>();
  if (state.corpsFrontSectors) {
    for (const sector of state.corpsFrontSectors) {
      if (!sector.sector_id || sector.assigned_brigade_ids.length === 0) continue;
      let sx = 0, sy = 0, count = 0;
      for (const bid of sector.assigned_brigade_ids) {
        const loc = formationLocationMap.get(bid);
        if (loc) {
          const pt = centroidLookup.get(loc);
          if (pt) { sx += pt[0]; sy += pt[1]; count++; }
        }
      }
      if (count > 0) sectorCentroids.set(sector.sector_id, [sx / count, sy / count]);
    }
  }

  for (const op of ops) {
    if (!op.objectives || op.objectives.length === 0) continue;

    const colors = FACTION_ARROW_COLORS[op.faction] ?? DEFAULT_COLORS;

    // Compute origin: staging_osid → sector centroid → fallback
    const hasStaging = !!op.staging_osid;
    let rawOrigin: [number, number] | null = null;
    if (op.staging_osid) {
      rawOrigin = centroidLookup.get(op.staging_osid) ?? null;
    }
    if (!rawOrigin && op.sector_id) {
      rawOrigin = sectorCentroids.get(op.sector_id) ?? null;
    }
    if (!rawOrigin) {
      const firstObj = centroidLookup.get(op.objectives[0]);
      if (firstObj) {
        rawOrigin = [firstObj[0] - 0.05, firstObj[1] - 0.02];
      }
    }
    if (!rawOrigin) continue;

    // Shift staging origin toward first objective to approximate OSID edge
    const firstObjPt = centroidLookup.get(op.objectives[0]);
    let origin: [number, number];
    if (hasStaging && firstObjPt) {
      const dist = Math.sqrt((rawOrigin[0] - firstObjPt[0]) ** 2 + (rawOrigin[1] - firstObjPt[1]) ** 2);
      const shift = Math.min(0.4, 0.012 / Math.max(0.001, dist));
      origin = [rawOrigin[0] + (firstObjPt[0] - rawOrigin[0]) * shift, rawOrigin[1] + (firstObjPt[1] - rawOrigin[1]) * shift];
    } else {
      origin = rawOrigin;
    }

    // Draw sweeping arrow from origin to final objective
    const finalObjective = op.objectives[op.objectives.length - 1];
    const finalPt = centroidLookup.get(finalObjective);
    if (!finalPt) continue;

    // Compute curve offset — deterministic per operation, sweeping military feel
    const hash = hashString(op.name + op.corps_id);
    const dx = finalPt[0] - origin[0];
    const dy = finalPt[1] - origin[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const offsetSign = (Math.abs(hash) % 2 === 0) ? 1 : -1;
    const offsetMag = len * (0.08 + ((Math.abs(hash) % 50) / 50) * 0.12) * offsetSign;

    const curve = buildBezierCurve(origin, finalPt, offsetMag, 24);

    // Tapered body width scales with arrow length — HoI style
    const baseHalfW = Math.max(0.006, len * 0.04);
    const tipHalfW = Math.max(0.002, len * 0.012);

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

    // Arrowhead — wider than the tip of the body
    const headWidth = Math.max(0.009, len * 0.035);
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

    // Intermediate objectives — smaller arrows for multi-step operations
    if (op.objectives.length > 1) {
      let prevPt = origin;
      for (let i = 0; i < op.objectives.length - 1; i++) {
        const objPt = centroidLookup.get(op.objectives[i]);
        if (!objPt) continue;

        const segDx = objPt[0] - prevPt[0];
        const segDy = objPt[1] - prevPt[1];
        const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
        const segOffsetMag = segLen * 0.06 * offsetSign;
        const segCurve = buildBezierCurve(prevPt, objPt, segOffsetMag, 16);

        const segBaseHalfW = Math.max(0.004, segLen * 0.03);
        const segTipHalfW = Math.max(0.0015, segLen * 0.01);
        const segBody = buildTaperedArrowBody(segCurve, segBaseHalfW, segTipHalfW);
        if (segBody) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [segBody] },
            properties: { type: 'op-arrow-body', faction: op.faction, op_name: op.name, color: colors.line },
          });
        }

        const segHeadW = Math.max(0.006, segLen * 0.025);
        const segTriangle = buildArrowheadTriangle(segCurve, segHeadW * 1.8, segHeadW);
        if (segTriangle) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [segTriangle] },
            properties: { type: 'op-arrow-head', faction: op.faction, op_name: op.name, color: colors.head },
          });
        }

        prevPt = objPt;
      }
    }
  }

  return { type: 'FeatureCollection', features: features as Feature[] };
}
