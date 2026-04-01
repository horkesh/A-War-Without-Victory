import type { FeatureCollection } from 'geojson';
import type { Layer } from '@deck.gl/core';
import type { LoadedGameState } from '../data/types';
import type { OsidCentroidLookup } from '../map/builders/geojsonLookup';
import { buildExperimentalDeckLayers } from './buildExperimentalDeckLayers';
import { buildTacticalDeckLayers } from './buildTacticalDeckLayers';
import { buildGhostMapLayer, type GhostMapDatum } from './buildGhostMapLayer';
import {
  DEFAULT_DECK_LAYER_CAPABILITIES,
  type DeckLayerCapabilities,
} from './deckLayerCapabilities';

export type { DeckLayerCapabilities } from './deckLayerCapabilities';
export { DEFAULT_DECK_LAYER_CAPABILITIES } from './deckLayerCapabilities';

/**
 * Single entry for MapboxOverlay `layers`.
 * When `deckFormationCounters` is false (default), only experimental layers are included — MapLibre owns counters/labels.
 */
export function composeTacticalDeckLayers(args: {
  formationsGeoJson: FeatureCollection;
  labelsVisible: boolean;
  formationsVisible: boolean;
  zoom: number;
  highlightedFormationIds?: readonly string[];
  loadedGameState: LoadedGameState | null;
  centroidLookup: OsidCentroidLookup;
  /** Omit to use {@link DEFAULT_DECK_LAYER_CAPABILITIES} (all off). */
  capabilities?: DeckLayerCapabilities;
  /** Pre-computed ghost map census data (pass when ghostMapVisible is true). */
  ghostMapData?: GhostMapDatum[];
}): Layer[] {
  const caps = args.capabilities ?? DEFAULT_DECK_LAYER_CAPABILITIES;

  // Ghost map renders UNDER everything else
  const ghost: Layer[] = (caps.ghostMapVisible && args.ghostMapData)
    ? [buildGhostMapLayer(args.ghostMapData)]
    : [];

  const under = buildExperimentalDeckLayers(
    args.loadedGameState,
    args.centroidLookup,
    caps,
    args.zoom,
  );
  const counters = caps.deckFormationCounters
    ? buildTacticalDeckLayers(
        args.formationsGeoJson,
        args.labelsVisible,
        args.formationsVisible,
        args.zoom,
        args.highlightedFormationIds,
      )
    : [];
  return [...ghost, ...under, ...counters];
}
