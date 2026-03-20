import type { FeatureCollection } from 'geojson';
import type { Layer } from '@deck.gl/core';
import type { LoadedGameState } from '../data/types';
import type { OsidCentroidLookup } from '../map/builders/geojsonLookup';
import { buildExperimentalDeckLayers } from './buildExperimentalDeckLayers';
import { buildTacticalDeckLayers } from './buildTacticalDeckLayers';
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
  loadedGameState: LoadedGameState | null;
  centroidLookup: OsidCentroidLookup;
  /** Omit to use {@link DEFAULT_DECK_LAYER_CAPABILITIES} (all off). */
  capabilities?: DeckLayerCapabilities;
}): Layer[] {
  const caps = args.capabilities ?? DEFAULT_DECK_LAYER_CAPABILITIES;
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
      )
    : [];
  return [...under, ...counters];
}
