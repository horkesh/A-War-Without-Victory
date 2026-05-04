/**
 * Opt-in Deck.gl experiments (default: all off).
 *
 * When you enable a flag, you may need to hide the matching MapLibre layer(s)
 * to avoid double-drawing — see each field’s note.
 */
export interface DeckLayerCapabilities {
  /**
   * When true: formation counters + Deck.gl labels/enrichments (IconLayer, TextLayer, supply dot, etc.);
   * MapLibre `formation-markers` / `formation-labels` must stay hidden to avoid double draw.
   * When false (default): MapLibre renders brigades exactly as pre-Deck; clicks hit `formation-markers` / `formation-labels`.
   */
  readonly deckFormationCounters: boolean;

  /**
   * Deck.gl `ArcLayer` for corps operations (staging → objectives).
   * When true, consider hiding MapLibre sources such as `order-arrows` / operation arrow layers.
   */
  readonly operationArcs: boolean;

  /**
   * Deck.gl dashed `PathLayer` stack for front segments.
   * When true, consider setting MapLibre front-edge layers to `visibility: 'none'`.
   */
  readonly deckFrontLines: boolean;

  /**
   * Deck.gl `ScatterplotLayer` unit dots (personnel-scaled), separate from NATO IconLayer counters.
   * When true, consider hiding MapLibre `formation-markers` / native formation symbol layers.
   */
  readonly unitScatterDots: boolean;

  /** Ghost Map: pre-war census demographics as ScatterplotLayer dots. */
  readonly ghostMapVisible: boolean;

  /**
   * Map That Scars: per-OSID damage overlay (PolygonLayer tinting OSIDs by
   * `data/derived/osid_damage_seed.json` damage_score). Faction-agnostic.
   * Default false → byte-stable (no layer added to overlay).
   * Renders below front-edge layers and above territory fill.
   */
  readonly mapScarsVisible: boolean;
}

/** Default: Deck.gl formation counters ON (enriched); other experiments off. */
export const DEFAULT_DECK_LAYER_CAPABILITIES: DeckLayerCapabilities = {
  deckFormationCounters: true,
  operationArcs: false,
  deckFrontLines: false,
  unitScatterDots: false,
  ghostMapVisible: false,
  mapScarsVisible: false,
};
