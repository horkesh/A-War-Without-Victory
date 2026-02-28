import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import { buildOsidCentroidLookup, resolveOsidKey } from './geojsonLookup';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';

interface OrderArrowProperties {
  type: 'attack' | 'movement';
  brigadeId: string;
  source_osid: string;
  target_osid: string;
}

function pushArrow(
  features: Array<Feature<LineString, OrderArrowProperties>>,
  type: 'attack' | 'movement',
  brigadeId: string,
  sourceOsid: string | null,
  targetOsidRaw: string | undefined,
  centroidLookup: OsidCentroidLookup,
): void {
  if (!sourceOsid) return;
  const targetOsid = resolveOsidKey(targetOsidRaw, centroidLookup);
  if (!targetOsid || targetOsid === sourceOsid) return;
  const fromPoint = centroidLookup.get(sourceOsid);
  const toPoint = centroidLookup.get(targetOsid);
  if (!fromPoint || !toPoint) return;

  features.push({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [fromPoint, toPoint],
    },
    properties: {
      type,
      brigadeId,
      source_osid: sourceOsid,
      target_osid: targetOsid,
    },
  });
}

export function buildOrderArrowsGeoJSON(
  state: LoadedGameState,
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
    const sourceOsid = sourceByBrigadeId.get(order.brigadeId) ?? resolveFormationLocationOsid(formationById.get(order.brigadeId), centroidLookup);
    pushArrow(features, 'attack', order.brigadeId, sourceOsid, order.targetSettlementId, centroidLookup);
  }

  if (state.movementOrdersSettlement && state.movementOrdersSettlement.length > 0) {
    const settlementOrders = [...state.movementOrdersSettlement].sort((a, b) => a.brigadeId.localeCompare(b.brigadeId));
    for (const order of settlementOrders) {
      const sourceOsid = sourceByBrigadeId.get(order.brigadeId) ?? resolveFormationLocationOsid(formationById.get(order.brigadeId), centroidLookup);
      const targets = [...order.targetSettlementIds].sort((a, b) => a.localeCompare(b));
      for (const target of targets) {
        pushArrow(features, 'movement', order.brigadeId, sourceOsid, target, centroidLookup);
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
