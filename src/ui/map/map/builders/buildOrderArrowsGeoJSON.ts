import type { Feature, FeatureCollection, LineString, Polygon, Point } from 'geojson';
import type { LoadedGameState, CorpsFrontSectorView } from '../../data/types';
import type { StagedOrder } from '../../store/gameStore';
import { buildOsidCentroidLookup, resolveOsidKey } from './geojsonLookup';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';
import { hashString, buildBezierCurve, buildArrowheadTriangle, getClosestPointOnSectorEdge } from './arrowGeometry';

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

function pushArrow(
  features: OrderFeature[],
  type: ArrowType,
  brigadeId: string,
  sourceOsid: string | null,
  targetOsidRaw: string | undefined,
  centroidLookup: OsidCentroidLookup,
  faction?: string,
  sector?: CorpsFrontSectorView,
  edgePoints?: [number, number][]
): void {
  if (!sourceOsid) return;
  const targetOsid = resolveOsidKey(targetOsidRaw, centroidLookup);
  if (!targetOsid || targetOsid === sourceOsid) return;

  const rawFromPoint = centroidLookup.get(sourceOsid);
  const toPoint = centroidLookup.get(targetOsid);
  if (!rawFromPoint || !toPoint) return;

  // Snapping logic: if the brigade is in a front sector, snap origin to the front line closest to target
  let fromPoint = rawFromPoint;
  if (sector && edgePoints && edgePoints.length > 0) {
    const snapped = getClosestPointOnSectorEdge(toPoint, edgePoints);
    if (snapped) fromPoint = snapped;
  }

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

  // Pre-index front edges and sectors for snapping
  const sectorByBrigade = new Map<string, CorpsFrontSectorView>();
  const edgePointsBySector = new Map<string, [number, number][]>();

  if (state.corpsFrontSectors) {
    const edgeMap = new Map<string, any>();
    if (state.frontEdges) {
      for (const e of state.frontEdges) edgeMap.set(e.edge_id, e);
    }

    for (const sector of state.corpsFrontSectors) {
      for (const bid of sector.assigned_brigade_ids) sectorByBrigade.set(bid, sector);
      for (const bid of sector.reserve_brigade_ids) sectorByBrigade.set(bid, sector);

      // Extract coordinates for the sector's edge list
      const points: [number, number][] = [];
      for (const eid of sector.edge_ids) {
        const edge = edgeMap.get(eid);
        if (edge) {
          const p1 = centroidLookup.get(edge.a);
          const p2 = centroidLookup.get(edge.b);
          if (p1) points.push(p1);
          if (p2) points.push(p2);
        }
      }
      if (points.length > 0) edgePointsBySector.set(sector.sector_id, points);
    }
  }

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
    const sector = sectorByBrigade.get(order.brigadeId);
    const edgePoints = sector ? edgePointsBySector.get(sector.sector_id) : undefined;
    pushArrow(features, 'attack', order.brigadeId, sourceOsid, order.targetSettlementId, centroidLookup, formation?.faction, sector, edgePoints);
  }

  if (state.movementOrdersSettlement && state.movementOrdersSettlement.length > 0) {
    const settlementOrders = [...state.movementOrdersSettlement].sort((a, b) => a.brigadeId.localeCompare(b.brigadeId));
    for (const order of settlementOrders) {
      const formation = formationById.get(order.brigadeId);
      const sourceOsid = sourceByBrigadeId.get(order.brigadeId) ?? resolveFormationLocationOsid(formation, centroidLookup);
      const sector = sectorByBrigade.get(order.brigadeId);
      const edgePoints = sector ? edgePointsBySector.get(sector.sector_id) : undefined;
      const targets = [...order.targetSettlementIds].sort((a, b) => a.localeCompare(b));
      for (const target of targets) {
        pushArrow(features, 'movement', order.brigadeId, sourceOsid, target, centroidLookup, formation?.faction, sector, edgePoints);
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
      const sector = sectorByBrigade.get(order.formationId);
      const edgePoints = sector ? edgePointsBySector.get(sector.sector_id) : undefined;
      if (order.targetOsid) {
        pushArrow(features, outputType, order.formationId, sourceOsid, order.targetOsid, centroidLookup, formation?.faction, sector, edgePoints);
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features: features as Feature[],
  };
}
