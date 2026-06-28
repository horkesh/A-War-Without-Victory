import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';

export interface MapInteractionCallbacks {
  onOsidClick?: (osid: string, properties: Record<string, unknown>) => void;
  onFormationClick?: (id: string, props: any, point: { x: number; y: number }) => void;
  getFormationClickFallback?: (point: { x: number; y: number }) => { id: string; properties: Record<string, unknown> } | null;
  onFrontEdgeClick?: (edgeId: string, properties: Record<string, unknown>) => void;
  onBattleClick?: (osid: string, properties: Record<string, unknown>) => void;
  /** Tooltip: set after 300ms hover; position from event. */
  onOsidHover?: (osid: string | null, point: { x: number; y: number } | null) => void;
  onFormationHover?: (
    formationId: string | null,
    point: { x: number; y: number } | null,
    properties?: Record<string, unknown> | null,
  ) => void;
  onFrontEdgeHover?: (edgeId: string | null, point: { x: number; y: number } | null) => void;
  onBattleHover?: (osid: string | null, point: { x: number; y: number } | null) => void;
  onSectorHover?: (sectorId: string | null, point: { x: number; y: number } | null) => void;
  onMouseMove?: (lngLat: [number, number]) => void;
  onMapMouseLeave?: () => void;
  onContextMenu?: (type: 'formation' | 'front' | 'osid' | 'empty', properties: Record<string, unknown> | null, point: { x: number; y: number }) => void;
  /**
   * Guard ref: when true, the Deck.gl overlay already handled a formation click
   * in this event. MapLibre's handleMapClick must skip front-edge fallthrough to
   * prevent sector selection from overriding the formation selection.
   * Set by Deck.gl onClick handler, consumed (reset to false) by handleMapClick.
   */
  deckHandledFormationClick?: { current: boolean };
}

const HOVER_DELAY_MS = 300;
/** Throttle interval for mousemove handlers that call queryRenderedFeatures (ms). */
const MOUSEMOVE_THROTTLE_MS = 50;
export const FRONT_INTERACTION_PICK_RADIUS_PX = 10;

const HIGHLIGHT_POS_LAYER = 'front-edges-highlight-pos';
const HIGHLIGHT_NEG_LAYER = 'front-edges-highlight-neg';
const SECTOR_EDGE_GLOW_POS_LAYER = 'sector-edge-glow-pos';
const SECTOR_EDGE_GLOW_NEG_LAYER = 'sector-edge-glow-neg';
const SECTOR_EDGE_HIT_POS_LAYER = 'sector-edge-hit-pos';
const SECTOR_EDGE_HIT_NEG_LAYER = 'sector-edge-hit-neg';
const OSID_INTERACTIVE_FILL_LAYERS = [
  'osid-control-fill',
  'osid-ethnic-fill',
  'osid-supply-fill',
  'osid-casualties-fill',
  'osid-morale-fill',
  'osid-operations-fill',
  'osid-defense-fill',
  'political-metric-fill',
  'osid-density-fill',
];
export const FRONT_EDGE_INTERACTIVE_LAYERS = [
  'front-edges-hover-pos',
  'front-edges-hover-neg',
  HIGHLIGHT_POS_LAYER,
  HIGHLIGHT_NEG_LAYER,
  SECTOR_EDGE_GLOW_POS_LAYER,
  SECTOR_EDGE_GLOW_NEG_LAYER,
  SECTOR_EDGE_HIT_POS_LAYER,
  SECTOR_EDGE_HIT_NEG_LAYER,
];

export const getFrontFeatureSectorId = (feature: { properties?: Record<string, unknown> } | undefined): string | null => {
  const sectorId = feature?.properties?.sector_id;
  return typeof sectorId === 'string' && sectorId.length > 0 ? sectorId : null;
};

export const getFrontFeatureEdgeId = (feature: { properties?: Record<string, unknown> } | undefined): string | null => {
  const edgeId = feature?.properties?.edge_id;
  return typeof edgeId === 'string' && edgeId.length > 0 ? edgeId : null;
};

export const isSelectableFrontFeature = (feature: { layer?: { id?: string }; properties?: Record<string, unknown> } | undefined): boolean =>
  !!feature
  && !!feature.layer?.id
  && FRONT_EDGE_INTERACTIVE_LAYERS.includes(feature.layer.id)
  && !!getFrontFeatureSectorId(feature);

const isOsidFillLayer = (layerId: string | undefined): boolean =>
  !!layerId && OSID_INTERACTIVE_FILL_LAYERS.includes(layerId);

const frontFeatureInteractionPriority = (feature: { layer?: { id?: string } } | undefined): number => {
  const layerId = feature?.layer?.id ?? '';
  if (layerId === SECTOR_EDGE_HIT_POS_LAYER || layerId === SECTOR_EDGE_HIT_NEG_LAYER) return 1;
  if (layerId === 'front-edges-hover-pos' || layerId === 'front-edges-hover-neg') return 2;
  if (layerId === SECTOR_EDGE_GLOW_POS_LAYER || layerId === SECTOR_EDGE_GLOW_NEG_LAYER) return 3;
  if (layerId === HIGHLIGHT_POS_LAYER || layerId === HIGHLIGHT_NEG_LAYER) return 4;
  return 99;
};

export const normalizeFrontFeatureProperties = (feature: { properties?: Record<string, unknown> } | undefined): Record<string, unknown> => {
  const props = { ...(feature?.properties ?? {}) } as Record<string, unknown>;
  if (typeof props.sector_id !== 'string' || props.sector_id.length === 0) {
    const fallbackSectorId = getFrontFeatureSectorId(feature);
    if (fallbackSectorId) props.sector_id = fallbackSectorId;
  }
  return props;
};

export const pickPreferredFrontFeature = <T extends { layer?: { id?: string }; properties?: Record<string, unknown> }>(
  features: T[] | undefined,
): T | undefined => {
  if (!features || features.length === 0) return undefined;
  const selectable = features.filter((feature) => isSelectableFrontFeature(feature));
  if (selectable.length === 0) return features[0];
  return [...selectable].sort((a, b) => frontFeatureInteractionPriority(a) - frontFeatureInteractionPriority(b))[0];
};

export const getPresentFrontInteractionLayers = (map: Pick<MapLibreMap, 'getLayer'>) =>
  FRONT_EDGE_INTERACTIVE_LAYERS.filter((layerId) => !!map.getLayer(layerId));

const queryPreferredFrontFeatureAtPoint = (
  map: MapLibreMap,
  point: MapLayerMouseEvent['point'] | undefined,
  fallbackFeatures: Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined,
): { layer?: { id?: string }; properties?: Record<string, unknown> } | undefined => {
  if (!point) return pickPreferredFrontFeature(fallbackFeatures);
  const layers = getPresentFrontInteractionLayers(map);
  if (layers.length === 0) return pickPreferredFrontFeature(fallbackFeatures);

  try {
    const queriedFeatures = map.queryRenderedFeatures(point, { layers }) as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }>;
    return pickPreferredFrontFeature([...(fallbackFeatures ?? []), ...queriedFeatures]);
  } catch (_) {
    return pickPreferredFrontFeature(fallbackFeatures);
  }
};

export const queryPreferredFrontFeatureNearPoint = (
  map: Pick<MapLibreMap, 'getLayer' | 'queryRenderedFeatures'>,
  point: { x: number; y: number } | undefined,
  allowNeighborhood = false,
) => {
  if (!point) return undefined;
  const layers = getPresentFrontInteractionLayers(map);
  if (layers.length === 0) return undefined;

  const queryPoint: [number, number] = [point.x, point.y];
  const exactHits = map.queryRenderedFeatures(queryPoint, { layers });
  const exactFeature = pickPreferredFrontFeature(exactHits as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined);
  if (exactFeature && isSelectableFrontFeature(exactFeature as { layer?: { id?: string }; properties?: Record<string, unknown> })) {
    return exactFeature;
  }

  if (!allowNeighborhood) return undefined;

  const radius = FRONT_INTERACTION_PICK_RADIUS_PX;
  const bbox: [[number, number], [number, number]] = [
    [point.x - radius, point.y - radius],
    [point.x + radius, point.y + radius],
  ];
  const nearbyHits = map.queryRenderedFeatures(bbox, { layers });
  const nearbyFeature = pickPreferredFrontFeature(nearbyHits as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined);
  return nearbyFeature && isSelectableFrontFeature(nearbyFeature as { layer?: { id?: string }; properties?: Record<string, unknown> })
    ? nearbyFeature
    : undefined;
};

export function useMapInteractions(
  map: MapLibreMap | null,
  callbacks: MapInteractionCallbacks | ((osid: string) => void)
) {
  let hoverTimeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  let hoveredSectorId: string | null = null;
  let lastOsidMoveTime = 0;
  let lastFrontEdgeMoveTime = 0;

  if (!map) return;

  const safeOn = (event: string, layerId: string, handler: (e: MapLayerMouseEvent) => void) => {
    try {
      map.on(event as 'click' | 'mousemove' | 'mouseleave', layerId, handler);
      return true;
    } catch (e) {
      console.error('[useMapInteractions] map.on failed', { event, layerId, error: e });
      return false;
    }
  };

  const safeOff = (event: string, layerId: string, handler: (e: MapLayerMouseEvent) => void) => {
    try {
      map.off(event as 'click' | 'mousemove' | 'mouseleave', layerId, handler);
      return true;
    } catch (e) {
      console.error('[useMapInteractions] map.off failed', { event, layerId, error: e });
      return false;
    }
  };

  const onOsidClick = typeof callbacks === 'function' ? callbacks : callbacks.onOsidClick;
  const onFormationClick = typeof callbacks === 'function' ? undefined : callbacks.onFormationClick;
  const getFormationClickFallback = typeof callbacks === 'function' ? undefined : callbacks.getFormationClickFallback;
  const onFrontEdgeClick = typeof callbacks === 'function' ? undefined : callbacks.onFrontEdgeClick;
  const onBattleClick = typeof callbacks === 'function' ? undefined : callbacks.onBattleClick;
  const onOsidHover = typeof callbacks === 'function' ? undefined : callbacks.onOsidHover;
  const onFormationHover = typeof callbacks === 'function' ? undefined : callbacks.onFormationHover;
  const onFrontEdgeHover = typeof callbacks === 'function' ? undefined : callbacks.onFrontEdgeHover;
  const onBattleHover = typeof callbacks === 'function' ? undefined : callbacks.onBattleHover;
  const onSectorHover = typeof callbacks === 'function' ? undefined : callbacks.onSectorHover;
  const onMouseMove = typeof callbacks === 'function' ? undefined : callbacks.onMouseMove;
  const onMapMouseLeave = typeof callbacks === 'function' ? undefined : callbacks.onMapMouseLeave;
  const onContextMenu = typeof callbacks === 'function' ? undefined : callbacks.onContextMenu;
  const deckHandledFormationClick = typeof callbacks === 'function' ? undefined : callbacks.deckHandledFormationClick;

  const needsFrontSurfaceHover = !!onFrontEdgeHover || !!onSectorHover;


  const handleOsidMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    // Throttle: skip processing if called too frequently (queryRenderedFeatures is expensive)
    const now = performance.now();
    if (now - lastOsidMoveTime < MOUSEMOVE_THROTTLE_MS) return;
    lastOsidMoveTime = now;
    const feature = e.features?.[0];
    const osid = feature?.properties?.osid as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
    // Suppress OSID tooltip when cursor is also over a front edge (front tooltip takes priority)
    if (e.point && queryPreferredFrontFeatureNearPoint(map, e.point, true)) {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
      }
      onOsidHover?.(null, null);
      return;
    }
    if (onOsidHover) {
      if (osid) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = globalThis.setTimeout(() => {
          onOsidHover(osid, point);
          hoverTimeout = undefined;
        }, HOVER_DELAY_MS);
      } else {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
        onOsidHover(null, null);
      }
    }
  };

  const handleOsidClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    const osid = feature?.properties?.osid as string | undefined;
    if (osid) onOsidClick?.(osid, (feature?.properties ?? {}) as Record<string, unknown>);
  };

  const handleOsidMouseLeave = () => {
    map.getCanvas().style.cursor = '';
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = undefined;
    }
    onOsidHover?.(null, null);
    onMapMouseLeave?.();
  };

  const handleFormationMouseMove = (e: MapLayerMouseEvent) => {
    if (e.point && queryPreferredFrontFeatureNearPoint(map, e.point, true)) {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
      }
      onFormationHover?.(null, null);
      return;
    }
    const feature = e.features?.[0];
    const id = feature?.properties?.id as string | undefined;
    const properties = feature?.properties ? { ...(feature.properties as Record<string, unknown>) } : null;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
    if (onFormationHover) {
      if (id) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = globalThis.setTimeout(() => {
          onFormationHover!(id, point, properties);
          hoverTimeout = undefined;
        }, HOVER_DELAY_MS);
      } else {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
        onFormationHover(null, null);
      }
    }
  };

  const handleFormationMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = undefined;
    }
    onFormationHover?.(null, null);
    onMapMouseLeave?.();
  };

  const setHoverHighlight = (sectorId: string | null, point: { x: number; y: number } | null) => {
    if (sectorId === hoveredSectorId) return;
    hoveredSectorId = sectorId;
    const noMatch = '__none__';
    const sid = sectorId ?? noMatch;
    try {
      if (map.getLayer(HIGHLIGHT_POS_LAYER)) {
        map.setFilter(HIGHLIGHT_POS_LAYER, ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], sid]]);
      }
      if (map.getLayer(HIGHLIGHT_NEG_LAYER)) {
        map.setFilter(HIGHLIGHT_NEG_LAYER, ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sector_id'], sid]]);
      }
    } catch (_) { /* layers may not exist yet */ }

    onSectorHover?.(sectorId, point);
  };


  const handleFrontFeatureHover = (
    features: Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined,
    point: { x: number; y: number } | null,
  ) => {
    const feature = pickPreferredFrontFeature(features);
    const edgeId = getFrontFeatureEdgeId(feature);
    const sectorId = getFrontFeatureSectorId(feature);

    if (sectorId) setHoverHighlight(sectorId, point);

    if (onFrontEdgeHover) {
      if (edgeId) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = globalThis.setTimeout(() => {
          onFrontEdgeHover!(edgeId, point);
          hoverTimeout = undefined;
        }, HOVER_DELAY_MS);
      } else {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
      }
    }
  };

  const handleFrontEdgeMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    // Throttle: skip processing if called too frequently
    const now = performance.now();
    if (now - lastFrontEdgeMoveTime < MOUSEMOVE_THROTTLE_MS) return;
    lastFrontEdgeMoveTime = now;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
    handleFrontFeatureHover(
      e.features as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined,
      point,
    );
  };

  const handleFrontEdgeMouseLeave = () => {
    map.getCanvas().style.cursor = '';
    setHoverHighlight(null, null);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = undefined;
    }
    onFrontEdgeHover?.(null, null);
    onMapMouseLeave?.();
  };

  const handleFrontEdgeClick = (e: MapLayerMouseEvent) => {
    const fallbackFormation = e.point ? getFormationClickFallback?.(e.point) : null;
    if (fallbackFormation) {
      onFormationClick?.(fallbackFormation.id, fallbackFormation.properties, e.point);
      return;
    }

    const fallbackFeatures = e.features as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined;
    const pointFeature = queryPreferredFrontFeatureNearPoint(map, e.point, true);
    const feature = pickPreferredFrontFeature([
      ...(fallbackFeatures ?? []),
      ...(pointFeature ? [pointFeature] : []),
    ]);
    const props = normalizeFrontFeatureProperties(feature);
    const edgeId = getFrontFeatureEdgeId(feature) ?? '';
    const sectorId = getFrontFeatureSectorId(feature) ?? '';
    if (!sectorId) return;
    onFrontEdgeClick?.(edgeId, props);
  };

  const handleMapMouseMove = (e: MapLayerMouseEvent) => {
    onMouseMove?.([e.lngLat.lng, e.lngLat.lat]);
    if (!needsFrontSurfaceHover || !e.point) return;

    const now = performance.now();
    if (now - lastFrontEdgeMoveTime < MOUSEMOVE_THROTTLE_MS) return;
    lastFrontEdgeMoveTime = now;

    const selectableFrontHit = queryPreferredFrontFeatureNearPoint(map, e.point, true);
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
    if (selectableFrontHit && isSelectableFrontFeature(selectableFrontHit)) {
      map.getCanvas().style.cursor = 'pointer';
      handleFrontFeatureHover([selectableFrontHit], point);
      return;
    }

    if (hoveredSectorId) {
      map.getCanvas().style.cursor = '';
      setHoverHighlight(null, null);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
      }
      onFrontEdgeHover?.(null, null);
    }
  };

  const handleMapClick = (e: MapLayerMouseEvent) => {
    // Deck.gl overlay fires its onClick before MapLibre's click handler.
    // When Deck.gl already resolved a formation click, skip MapLibre fallthrough
    // to prevent front-edge/sector selection from overriding the formation.
    if (deckHandledFormationClick?.current) {
      deckHandledFormationClick.current = false;
      return;
    }

    // Priority: Formations > Front Edges (Sectors) > Settlements (OSIDs)
    const priorityLayers = [
      'battle-markers-pulse',
      'formation-markers',
      'front-edges-hover-pos',
      'front-edges-hover-neg',
      'front-edges-highlight-pos',
      'front-edges-highlight-neg',
      SECTOR_EDGE_GLOW_POS_LAYER,
      SECTOR_EDGE_GLOW_NEG_LAYER,
      SECTOR_EDGE_HIT_POS_LAYER,
      SECTOR_EDGE_HIT_NEG_LAYER,
      'sector-fill',
      ...OSID_INTERACTIVE_FILL_LAYERS,
    ];

    const features = map.queryRenderedFeatures(e.point, { layers: priorityLayers.filter(id => map.getLayer(id)) });

    if (features.length > 0) {
      // Battle markers have highest click priority
      const battleFeature = features.find(f => f.layer.id === 'battle-markers-pulse');
      if (battleFeature) {
        const osid = battleFeature.properties?.osid as string | undefined;
        if (osid) { onBattleClick?.(osid, battleFeature.properties as Record<string, unknown>); return; }
      }

      const fallbackFormation = getFormationClickFallback?.(e.point);
      if (fallbackFormation) {
        onFormationClick?.(fallbackFormation.id, fallbackFormation.properties, e.point);
        return;
      }

      // Exact formation hits own the click; nearby front rescue must not steal brigade selection.
      const formationFeature = features.find(f => f.layer.id.startsWith('formation-'));
      if (formationFeature) {
        const id = formationFeature.properties?.id as string | undefined;
        if (id) {
          onFormationClick?.(id, formationFeature.properties as Record<string, unknown>, e.point);
          return;
        }
      }

      const selectableFrontFeature = queryPreferredFrontFeatureNearPoint(map, e.point, true)
        ?? pickPreferredFrontFeature(
          features as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined,
        );
      if (selectableFrontFeature && isSelectableFrontFeature(selectableFrontFeature as { layer?: { id?: string }; properties?: Record<string, unknown> })) {
        const props = normalizeFrontFeatureProperties(selectableFrontFeature as { properties?: Record<string, unknown> });
        const edgeId = getFrontFeatureEdgeId(selectableFrontFeature as { properties?: Record<string, unknown> }) ?? '';
        onFrontEdgeClick?.(edgeId, props);
        return;
      }

      const frontFeature = features.find((f) =>
        FRONT_EDGE_INTERACTIVE_LAYERS.includes(f.layer.id)
        && !!getFrontFeatureSectorId(f as { properties?: Record<string, unknown> })
      );
      if (frontFeature) {
        const props = frontFeature.properties as Record<string, unknown>;
        const edgeId = getFrontFeatureEdgeId(frontFeature as { properties?: Record<string, unknown> }) ?? '';
        onFrontEdgeClick?.(edgeId, props);
        return;
      }

      const feature = features[0];
      const layerId = feature.layer.id;

      if (layerId.startsWith('front-edges-') || layerId.startsWith('sector-edge-glow-')) {
        const props = feature.properties as Record<string, unknown>;
        const edgeId = getFrontFeatureEdgeId(feature as { properties?: Record<string, unknown> }) ?? '';
        const sectorId = getFrontFeatureSectorId(feature as { properties?: Record<string, unknown> });
        if (sectorId) onFrontEdgeClick?.(edgeId, props);
      } else if (layerId === 'sector-fill' || isOsidFillLayer(layerId)) {
        const osid = feature.properties?.osid as string | undefined;
        if (osid) onOsidClick?.(osid, feature.properties as Record<string, unknown>);
      }
      return;
    }

    const fallbackFormation = getFormationClickFallback?.(e.point);
    if (fallbackFormation) {
      onFormationClick?.(fallbackFormation.id, fallbackFormation.properties, e.point);
      return;
    }

    // Clicked empty area
    onOsidClick?.('', {});
  };

  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault();
    if (!onContextMenu) return;
    const point = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };

    const contextLayerIds = ['formation-markers',
      'front-edges-hover-pos', 'front-edges-hover-neg',
      'front-edges-highlight-pos', 'front-edges-highlight-neg',
      SECTOR_EDGE_GLOW_POS_LAYER, SECTOR_EDGE_GLOW_NEG_LAYER,
      SECTOR_EDGE_HIT_POS_LAYER, SECTOR_EDGE_HIT_NEG_LAYER,
      ...OSID_INTERACTIVE_FILL_LAYERS].filter(id => !!map.getLayer(id));

    const hits = map.queryRenderedFeatures(e.point, { layers: contextLayerIds });
    const first = hits[0];
    if (first?.layer.id === 'formation-markers') {
      const props = first.properties as Record<string, unknown>;
      onContextMenu('formation', props, point);
      return;
    }

    const fallbackFormation = getFormationClickFallback?.(e.point);
    if (fallbackFormation) {
      onContextMenu('formation', fallbackFormation.properties, point);
      return;
    }

    const selectableFrontFeature = pickPreferredFrontFeature(
      hits as Array<{ layer?: { id?: string }; properties?: Record<string, unknown> }> | undefined,
    );

    if (selectableFrontFeature && isSelectableFrontFeature(selectableFrontFeature)) {
      onContextMenu('front', normalizeFrontFeatureProperties(selectableFrontFeature), point);
      return;
    }

    if (!first) { onContextMenu('empty', null, point); return; }

    const props = first.properties as Record<string, unknown>;
    if (
      first.layer.id.includes('front-edges')
      || first.layer.id.startsWith('sector-edge-glow-')
      || first.layer.id.startsWith('sector-edge-hit-')
    ) {
      onContextMenu('front', props, point);
    } else {
      onContextMenu('osid', props, point);
    }
  };

  // Suppress browser default context menu on map canvas
  const suppressDefault = (e: Event) => e.preventDefault();
  map.getCanvas().addEventListener('contextmenu', suppressDefault);

  map.on('contextmenu', handleContextMenu);
  map.on('click', handleMapClick);
  map.on('mousemove', handleMapMouseMove);

  const frontEdgeLayers = ['front-edges-hover-pos', 'front-edges-hover-neg'];
  const frontEdgeHighlightLayers = ['front-edges-highlight-pos', 'front-edges-highlight-neg'];
  const sectorGlowLayers = [SECTOR_EDGE_GLOW_POS_LAYER, SECTOR_EDGE_GLOW_NEG_LAYER];
  const sectorHitLayers = [SECTOR_EDGE_HIT_POS_LAYER, SECTOR_EDGE_HIT_NEG_LAYER];
  safeOn('mousemove', 'osid-control-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
  safeOn('click', 'sector-fill', handleOsidClick);
  safeOn('mousemove', 'sector-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'sector-fill', handleOsidMouseLeave);
  safeOn('click', 'osid-density-fill', handleOsidClick);
  for (const layerId of OSID_INTERACTIVE_FILL_LAYERS.filter((id) => id !== 'osid-control-fill')) {
    safeOn('mousemove', layerId, handleOsidMouseMove);
    safeOn('mouseleave', layerId, handleOsidMouseLeave);
  }

  if (onFormationHover) {
    safeOn('mousemove', 'formation-markers', handleFormationMouseMove);
    safeOn('mouseleave', 'formation-markers', handleFormationMouseLeave);
  }

  for (const layerId of frontEdgeLayers) {
    safeOn('click', layerId, handleFrontEdgeClick);
  }

  for (const layerId of frontEdgeHighlightLayers) {
    safeOn('click', layerId, handleFrontEdgeClick);
  }

  for (const layerId of sectorGlowLayers) {
    safeOn('click', layerId, handleFrontEdgeClick);
  }

  for (const layerId of sectorHitLayers) {
    safeOn('click', layerId, handleFrontEdgeClick);
  }

  const handleBattleMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    const osid = e.features?.[0]?.properties?.osid as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
    if (osid) onBattleHover?.(osid, point);
  };
  const handleBattleMouseLeave = () => {
    map.getCanvas().style.cursor = '';
    onBattleHover?.(null, null);
  };

  // Battle markers hover
  if (onBattleHover) {
    safeOn('mousemove', 'battle-markers-pulse', handleBattleMouseMove);
    safeOn('mouseleave', 'battle-markers-pulse', handleBattleMouseLeave);
  }

  return () => {
    map.off('contextmenu', handleContextMenu);
    map.off('click', handleMapClick);
    map.off('mousemove', handleMapMouseMove);
    map.getCanvas().removeEventListener('contextmenu', suppressDefault);

    safeOff('mousemove', 'osid-control-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
    safeOff('click', 'osid-density-fill', handleOsidClick);
    for (const layerId of OSID_INTERACTIVE_FILL_LAYERS.filter((id) => id !== 'osid-control-fill')) {
      safeOff('mousemove', layerId, handleOsidMouseMove);
      safeOff('mouseleave', layerId, handleOsidMouseLeave);
    }
    safeOff('click', 'sector-fill', handleOsidClick);
    safeOff('mousemove', 'sector-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'sector-fill', handleOsidMouseLeave);

    if (onFormationHover) {
      safeOff('mousemove', 'formation-markers', handleFormationMouseMove);
      safeOff('mouseleave', 'formation-markers', handleFormationMouseLeave);
    }

    if (hoverTimeout) clearTimeout(hoverTimeout);

    for (const layerId of frontEdgeLayers) {
      safeOff('click', layerId, handleFrontEdgeClick);
    }
    for (const layerId of frontEdgeHighlightLayers) {
      safeOff('click', layerId, handleFrontEdgeClick);
    }
    for (const layerId of sectorGlowLayers) {
      safeOff('click', layerId, handleFrontEdgeClick);
    }
    for (const layerId of sectorHitLayers) {
      safeOff('click', layerId, handleFrontEdgeClick);
    }
    if (onBattleHover) {
      safeOff('mousemove', 'battle-markers-pulse', handleBattleMouseMove);
      safeOff('mouseleave', 'battle-markers-pulse', handleBattleMouseLeave);
    }
    setHoverHighlight(null, null);
  };
}
