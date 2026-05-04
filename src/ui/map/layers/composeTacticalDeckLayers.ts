import type { FeatureCollection } from 'geojson';
import type { Layer } from '@deck.gl/core';
import type { LoadedGameState } from '../data/types';
import type { OsidCentroidLookup } from '../map/builders/geojsonLookup';
import { buildExperimentalDeckLayers } from './buildExperimentalDeckLayers';
import { buildTacticalDeckLayers } from './buildTacticalDeckLayers';
import { buildGhostMapLayer, type GhostMapDatum } from './buildGhostMapLayer';
import { buildOsidDamageOverlay, type OsidDamageDatum } from './buildOsidDamageOverlay';
import { buildForceQualityOverlay, type ForceQualityDatum } from './buildForceQualityOverlay';
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
  /** Pre-computed Map That Scars per-OSID damage data (pass when mapScarsVisible is true). */
  mapScarsData?: OsidDamageDatum[];
  /** Pre-computed Force-Quality glow per-(OSID,faction) data (pass when forceQualityVisible is true). */
  forceQualityData?: ForceQualityDatum[];
}): Layer[] {
  const caps = args.capabilities ?? DEFAULT_DECK_LAYER_CAPABILITIES;

  // Ghost map renders UNDER everything else
  const ghost: Layer[] = (caps.ghostMapVisible && args.ghostMapData)
    ? [buildGhostMapLayer(args.ghostMapData)]
    : [];

  // Map That Scars: render below front edges and counters, above territory fill.
  // Faction-agnostic dark scar tint.
  const scars: Layer[] = (caps.mapScarsVisible && args.mapScarsData && args.mapScarsData.length > 0)
    ? [buildOsidDamageOverlay(args.mapScarsData)]
    : [];

  // Force-Quality glow: render above scars (so glow reads on darkened ground)
  // and below experimental tactical layers. Faction-symmetric tint via palette
  // lookup; capability gate matches Map That Scars (`length > 0`).
  const forceQuality: Layer[] = (
    caps.forceQualityVisible
    && args.forceQualityData
    && args.forceQualityData.length > 0
  )
    ? [buildForceQualityOverlay(args.forceQualityData)]
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
  // Layer order (bottom → top): ghost → scars → forceQuality → experimental (front lines, ops arcs, unit dots) → counters.
  return [...ghost, ...scars, ...forceQuality, ...under, ...counters];
}
