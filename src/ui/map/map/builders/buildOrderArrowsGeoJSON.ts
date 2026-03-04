import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import type { StagedOrder } from '../../store/gameStore';
import { buildOsidCentroidLookup, resolveOsidKey } from './geojsonLookup';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';

interface OrderArrowProperties {
  type: 'attack' | 'movement' | 'attack-staged' | 'movement-staged';
  brigadeId: string;
  source_osid: string;
  target_osid: string;
  faction?: string;
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h;
}

function buildBezierCurve(
  p0: [number, number],
  p2: [number, number],
  offsetMagnitude: number,
  steps = 15
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

function pushArrow(
  features: Array<Feature<LineString, OrderArrowProperties>>,
  type: 'attack' | 'movement' | 'attack-staged' | 'movement-staged',
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

  features.push({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: curvePoints,
    },
    properties: {
      type,
      brigadeId,
      source_osid: sourceOsid,
      target_osid: targetOsid,
      faction,
    },
  });
}

export function buildOrderArrowsGeoJSON(
  state: LoadedGameState,
  stagedOrders: StagedOrder[],
  controlledOsidGeoJson: FeatureCollection,
): FeatureCollection<LineString, OrderArrowProperties> {
  const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
  const formationById = new Map(state.formations.map((f) => [f.id, f] as const));
  const sourceByBrigadeId = new Map<string, string | null>();

  for (const formation of [...state.formations].sort((a, b) => a.id.localeCompare(b.id))) {
    sourceByBrigadeId.set(formation.id, resolveFormationLocationOsid(formation, centroidLookup));
  }

  const features: Array<Feature<LineString, OrderArrowProperties>> = [];

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
      if (order.type === 'posture') continue; // Only arrow visuals
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
    features,
  };
}
