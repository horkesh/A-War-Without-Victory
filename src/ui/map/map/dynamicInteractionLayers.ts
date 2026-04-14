import type { Map as MapLibreMap } from 'maplibre-gl';
import { FRONT_EDGE_INTERACTIVE_LAYERS } from './useMapInteractions';

export const DYNAMIC_INTERACTION_LAYER_IDS = FRONT_EDGE_INTERACTIVE_LAYERS;

type LayerLookup = Pick<MapLibreMap, 'getLayer'>;

export function getPresentDynamicInteractionLayerIds(map: LayerLookup): string[] {
  return DYNAMIC_INTERACTION_LAYER_IDS.filter((layerId) => !!map.getLayer(layerId));
}

export function getDynamicInteractionLayerSignature(map: LayerLookup): string {
  return getPresentDynamicInteractionLayerIds(map).join('|');
}

export function shouldScheduleInteractionRetry(
  map: LayerLookup,
  attempts: number,
  maxAttempts = 20,
): boolean {
  if (attempts >= maxAttempts) return false;
  return getPresentDynamicInteractionLayerIds(map).length === 0;
}
