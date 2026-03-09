import type { Feature, FeatureCollection, LineString, Polygon, Point } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import type { StagedOrder } from '../../store/gameStore';
import { buildOsidCentroidLookup, resolveOsidKey } from './geojsonLookup';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';

// ── Types ────────────────────────────────────────────────────────────────────

type ArrowType = 'attack' | 'movement' | 'attack-staged' | 'movement-staged';

interface OrderArrowProperties {
  type: ArrowType;
  brigadeId: string;
  source_osid: string;
  target_osid: string;
  faction?: string;
}

interface ArrowHeadProperties {
  type: 'attack-head' | 'movement-head' | 'attack-head-staged' | 'movement-head-staged';
  faction?: string;
}

interface OriginDotProperties {
  type: 'origin-dot';
  faction?: string;
  arrow_type: ArrowType;
}

interface ArrowGlowProperties {
  type: 'attack-glow' | 'attack-glow-staged';
  faction?: string;
}

type OrderFeature =
  | Feature<LineString, OrderArrowProperties>
  | Feature<Polygon, ArrowHeadProperties>
  | Feature<Point, OriginDotProperties>
  | Feature<LineString, ArrowGlowProperties>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h;
}

/**
 * Build a quadratic Bezier curve from p0→p2 with a lateral offset for visual separation
 * when multiple arrows share endpoints.
 */
function buildBezierCurve(
  p0: [number, number],
  p2: [number, number],
  offsetMagnitude: number,
  steps = 20
): [number, number][] {
  const dx = p2[0] - p0[0];
  const dy = p2[1] - p0[1];
  const midX = p0[0] + dx * 0.5;
  const midY = p0[1] + dy * 0.5;

  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? -dy / len : 0;
  const ny = len > 0 ? dx / len : 0;

  const p1 = [midX + nx * offsetMagnitude, midY + ny * offsetMagnitude] as [number, number];

  const curve: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const invT = 1 - t;
    const x = invT * invT * p0[0] + 2 * invT * t * p1[0] + t * t * p2[0];
    const y = invT * invT * p0[1] + 2 * invT * t * p1[1] + t * t * p2[1];
    curve.push([x, y]);
  }
  return curve;
}

/**
 * Build a triangle polygon at the end of a curve to serve as an arrowhead.
 * The triangle points forward along the last segment of the curve.
 */
function buildArrowheadTriangle(
  curve: [number, number][],
  headLengthDeg = 0.012,
  headWidthDeg = 0.006,
): [number, number][] | null {
  if (curve.length < 2) return null;

  const tip = curve[curve.length - 1];
  const prev = curve[curve.length - 2];

  const dx = tip[0] - prev[0];
  const dy = tip[1] - prev[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;

  // Unit vectors: forward and perpendicular
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  // Base of the triangle (pulled back from tip)
  const baseX = tip[0] - ux * headLengthDeg;
  const baseY = tip[1] - uy * headLengthDeg;

  // Left and right wing points
  const left: [number, number] = [baseX + px * headWidthDeg, baseY + py * headWidthDeg];
  const right: [number, number] = [baseX - px * headWidthDeg, baseY - py * headWidthDeg];

  return [tip, left, right, tip]; // closed ring
}

function pushArrow(
  features: OrderFeature[],
  type: ArrowType,
  brigadeId: string,
  sourceOsid: string | null,
  targetOsidRaw: string | undefined,
  centroidLookup: OsidCentroidLookup,
  faction?: string
): void {
  if (!sourceOsid) return;
  const targetOsid = resolveOsidKey(targetOsidRaw, centroidLookup);
  if (!targetOsid || targetOsid === sourceOsid) return;
  const fromPoint = centroidLookup.get(sourceOsid);
  const toPoint = centroidLookup.get(targetOsid);
  if (!fromPoint || !toPoint) return;

  const dx = toPoint[0] - fromPoint[0];
  const dy = toPoint[1] - fromPoint[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  const hash = hashString(brigadeId);
  const offsetSign = (Math.abs(hash) % 2 === 0) ? 1 : -1;
  const offsetMagnitude = len * (0.05 + ((Math.abs(hash) % 100) / 100) * 0.15) * offsetSign;

  const curvePoints = buildBezierCurve(fromPoint, toPoint, offsetMagnitude);

  // 1. Main line
  features.push({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: curvePoints },
    properties: {
      type,
      brigadeId,
      source_osid: sourceOsid,
      target_osid: targetOsid,
      faction,
    },
  });

  // 2. Arrowhead triangle at target
  const isAttack = type === 'attack' || type === 'attack-staged';
  const headLength = isAttack ? 0.016 : 0.012;
  const headWidth = isAttack ? 0.008 : 0.005;
  const triangle = buildArrowheadTriangle(curvePoints, headLength, headWidth);
  if (triangle) {
    const headType = type === 'attack' ? 'attack-head'
      : type === 'movement' ? 'movement-head'
        : type === 'attack-staged' ? 'attack-head-staged'
          : 'movement-head-staged';
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [triangle] },
      properties: { type: headType, faction } as ArrowHeadProperties,
    });
  }

  // 3. Glow layer for attack arrows (wider, blurred copy behind main line)
  if (isAttack) {
    const glowType = type === 'attack' ? 'attack-glow' : 'attack-glow-staged';
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: curvePoints },
      properties: { type: glowType, faction } as ArrowGlowProperties,
    });
  }

  // 4. Origin dot at source
  features.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: fromPoint },
    properties: { type: 'origin-dot' as const, faction, arrow_type: type },
  });
}

// ── Main builder ─────────────────────────────────────────────────────────────

export function buildOrderArrowsGeoJSON(
  state: LoadedGameState,
  stagedOrders: StagedOrder[],
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const formationById = new Map(state.formations.map((f) => [f.id, f] as const));
  const sourceByBrigadeId = new Map<string, string | null>();

  for (const formation of [...state.formations].sort((a, b) => a.id.localeCompare(b.id))) {
    sourceByBrigadeId.set(formation.id, resolveFormationLocationOsid(formation, centroidLookup));
  }

  const features: OrderFeature[] = [];

  const attackOrders = [...state.attackOrders].sort((a, b) =>
    a.brigadeId.localeCompare(b.brigadeId) ||
    a.targetSettlementId.localeCompare(b.targetSettlementId),
  );
  for (const order of attackOrders) {
    const formation = formationById.get(order.brigadeId);
    const sourceOsid = sourceByBrigadeId.get(order.brigadeId) ?? resolveFormationLocationOsid(formation, centroidLookup);
    pushArrow(features, 'attack', order.brigadeId, sourceOsid, order.targetSettlementId, centroidLookup, formation?.faction);
  }

  if (state.movementOrdersSettlement && state.movementOrdersSettlement.length > 0) {
    const settlementOrders = [...state.movementOrdersSettlement].sort((a, b) => a.brigadeId.localeCompare(b.brigadeId));
    for (const order of settlementOrders) {
      const formation = formationById.get(order.brigadeId);
      const sourceOsid = sourceByBrigadeId.get(order.brigadeId) ?? resolveFormationLocationOsid(formation, centroidLookup);
      const targets = [...order.targetSettlementIds].sort((a, b) => a.localeCompare(b));
      for (const target of targets) {
        pushArrow(features, 'movement', order.brigadeId, sourceOsid, target, centroidLookup, formation?.faction);
      }
    }
  }

  // Handle staged orders
  if (stagedOrders.length > 0) {
    for (const order of stagedOrders) {
      if (order.type === 'posture') continue;
      const outputType = order.type === 'attack' ? 'attack-staged' : 'movement-staged';
      const formation = formationById.get(order.formationId);
      const sourceOsid = sourceByBrigadeId.get(order.formationId) ?? resolveFormationLocationOsid(formation, centroidLookup);
      if (order.targetOsid) {
        pushArrow(features, outputType, order.formationId, sourceOsid, order.targetOsid, centroidLookup, formation?.faction);
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features: features as Feature[],
  };
}
