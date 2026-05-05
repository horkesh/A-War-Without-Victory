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

  /**
   * Force-Quality Glow: per-OSID per-faction officer_quality intensity
   * overlay (PolygonLayer tinting OSIDs by mean officer_quality of active
   * brigades present). Faction-symmetric (palette lookup, no asymmetric
   * branching). Default false → byte-stable (no layer added to overlay).
   * Renders below front-edge layers and above territory fill, layered above
   * the Map That Scars scar overlay so the glow reads on darkened ground.
   */
  readonly forceQualityVisible: boolean;

  /**
   * Refugee Column: per-displacement-event PathLayer drawing OSID-centroid
   * → OSID-centroid escape routes whose width scales with displaced count
   * (capped to prevent a single mass-displacement event from dominating).
   * Faction-symmetric — color comes from the same `FACTION_GLOW_RGB`
   * palette used by Force-Quality Glow (lookup over `ethnicity` field of
   * the displacement event log, which carries canonical faction id).
   * Default false → byte-stable (no layer added to overlay). Renders above
   * Force-Quality Glow and below experimental tactical layers.
   */
  readonly refugeeColumnVisible: boolean;

  /**
   * Corridor Heartbeat: per-strategic-corridor PathLayer drawing
   * friendly→hostile pulses along contested OSID-pair segments derived
   * from `frontEdgesOsid`. Width scales with normalized intensity 0..1
   * (front pressure if available, otherwise a small fallback so the
   * corridor structure remains visible). Faction-symmetric — color comes
   * from the same `FACTION_GLOW_RGB` palette used by Force-Quality Glow
   * + Refugee Column (lookup keyed on the friendly side of the contested
   * edge). Default false → byte-stable (no layer added to overlay).
   * Renders above Refugee Column and below experimental tactical layers.
   */
  readonly corridorHeartbeatVisible: boolean;
}

/** Default: Deck.gl formation counters ON (enriched); other experiments off. */
export const DEFAULT_DECK_LAYER_CAPABILITIES: DeckLayerCapabilities = {
  deckFormationCounters: true,
  operationArcs: false,
  deckFrontLines: false,
  unitScatterDots: false,
  ghostMapVisible: false,
  mapScarsVisible: false,
  forceQualityVisible: false,
  refugeeColumnVisible: false,
  corridorHeartbeatVisible: false,
};
