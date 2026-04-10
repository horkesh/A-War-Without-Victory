import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';

export interface MapInteractionCallbacks {
  onOsidClick?: (osid: string, properties: Record<string, unknown>) => void;
  onFormationClick?: (id: string, props: any, point: { x: number; y: number }) => void;
  onFrontEdgeClick?: (edgeId: string, properties: Record<string, unknown>) => void;
  onBattleClick?: (osid: string, properties: Record<string, unknown>) => void;
  /** Tooltip: set after 300ms hover; position from event. */
  onOsidHover?: (osid: string | null, point: { x: number; y: number } | null) => void;
  onFormationHover?: (formationId: string | null, point: { x: number; y: number } | null) => void;
  onFrontEdgeHover?: (edgeId: string | null, point: { x: number; y: number } | null) => void;
  onBattleHover?: (osid: string | null, point: { x: number; y: number } | null) => void;
  onSectorHover?: (sectorId: string | null, point: { x: number; y: number } | null) => void;
  onMouseMove?: (lngLat: [number, number]) => void;
  onMapMouseLeave?: () => void;
  onContextMenu?: (type: 'formation' | 'front' | 'osid' | 'empty', properties: Record<string, unknown> | null, point: { x: number; y: number }) => void;
}

const HOVER_DELAY_MS = 300;
/** Throttle interval for mousemove handlers that call queryRenderedFeatures (ms). */
const MOUSEMOVE_THROTTLE_MS = 50;

const HIGHLIGHT_POS_LAYER = 'front-edges-highlight-pos';
const HIGHLIGHT_NEG_LAYER = 'front-edges-highlight-neg';

export function useMapInteractions(
  map: MapLibreMap | null,
  callbacks: MapInteractionCallbacks | ((osid: string) => void)
) {
  let hoverTimeout: number | undefined;
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
  const onFrontEdgeClick = typeof callbacks === 'function' ? undefined : callbacks.onFrontEdgeClick;
  const onBattleClick = typeof callbacks === 'function' ? undefined : callbacks.onBattleClick;
  const onOsidHover = typeof callbacks === 'function' ? undefined : callbacks.onOsidHover;
  const onFormationHover = typeof callbacks === 'function' ? undefined : callbacks.onFormationHover;
  const onFrontEdgeHover = typeof callbacks === 'function' ? undefined : callbacks.onFrontEdgeHover;
  const onBattleHover = typeof callbacks === 'function' ? undefined : callbacks.onBattleHover;
  const onMouseMove = typeof callbacks === 'function' ? undefined : callbacks.onMouseMove;
  const onMapMouseLeave = typeof callbacks === 'function' ? undefined : callbacks.onMapMouseLeave;
  const onContextMenu = typeof callbacks === 'function' ? undefined : callbacks.onContextMenu;


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
    if (e.point) {
      const frontHits = map.queryRenderedFeatures(e.point, { layers: ['front-edges-hover-pos', 'front-edges-hover-neg'].filter(id => !!map.getLayer(id)) });
      if (frontHits.length > 0) return; // front-edge handler will fire instead
    }
    if (onOsidHover) {
      if (osid) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = window.setTimeout(() => {
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
    const feature = e.features?.[0];
    const id = feature?.properties?.id as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
    if (onFormationHover) {
      if (id) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = window.setTimeout(() => {
          onFormationHover!(id, point);
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

    if (typeof callbacks !== 'function' && callbacks.onSectorHover) {
      callbacks.onSectorHover(sectorId, point);
    }
  };


  const handleFrontEdgeMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    // Throttle: skip processing if called too frequently
    const now = performance.now();
    if (now - lastFrontEdgeMoveTime < MOUSEMOVE_THROTTLE_MS) return;
    lastFrontEdgeMoveTime = now;
    const feature = e.features?.[0];
    const edgeId = feature?.properties?.edge_id as string | undefined;
    const sectorId = feature?.properties?.sector_id as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;

    // Highlight entire sector on hover
    if (sectorId) setHoverHighlight(sectorId, point);

    if (onFrontEdgeHover) {
      if (edgeId) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = window.setTimeout(() => {
          onFrontEdgeHover!(edgeId, point);
          hoverTimeout = undefined;
        }, HOVER_DELAY_MS);
      } else {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        hoverTimeout = undefined;
        onFrontEdgeHover(null, null);
      }
    }
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

  const handleMapMouseMove = (e: MapLayerMouseEvent) => {
    onMouseMove?.([e.lngLat.lng, e.lngLat.lat]);
  };

  const handleMapClick = (e: MapLayerMouseEvent) => {
    // Priority: Formations > Front Edges (Sectors) > Settlements (OSIDs)
    const priorityLayers = [
      'battle-markers-pulse',
      'formation-markers',
      'front-edges-hover-pos',
      'front-edges-hover-neg',
      'front-edges-highlight-pos',
      'front-edges-highlight-neg',
      'sector-fill',
      'osid-control-fill',
      'osid-ethnic-fill',
      'osid-density-fill',
    ];

    const features = map.queryRenderedFeatures(e.point, { layers: priorityLayers.filter(id => map.getLayer(id)) });

    if (features.length > 0) {
      // Battle markers have highest click priority
      const battleFeature = features.find(f => f.layer.id === 'battle-markers-pulse');
      if (battleFeature) {
        const osid = battleFeature.properties?.osid as string | undefined;
        if (osid) { onBattleClick?.(osid, battleFeature.properties as Record<string, unknown>); return; }
      }

      // Find the first formation-marker or label if it exists in the hits
      const formationFeature = features.find(f => f.layer.id.startsWith('formation-'));
      if (formationFeature) {
        const id = formationFeature.properties?.id as string | undefined;
        if (id) {
          onFormationClick?.(id, formationFeature.properties as Record<string, unknown>, e.point);
          return;
        }
      }

      const feature = features[0];
      const layerId = feature.layer.id;

      if (layerId.startsWith('front-edges-')) {
        const edgeId = feature.properties?.edge_id as string | undefined;
        if (edgeId) onFrontEdgeClick?.(edgeId, feature.properties as Record<string, unknown>);
      } else if (layerId === 'sector-fill' || layerId.startsWith('osid-')) {
        const osid = feature.properties?.osid as string | undefined;
        if (osid) onOsidClick?.(osid, feature.properties as Record<string, unknown>);
      }
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
      'osid-control-fill'].filter(id => !!map.getLayer(id));

    const hits = map.queryRenderedFeatures(e.point, { layers: contextLayerIds });
    const first = hits[0];

    if (!first) { onContextMenu('empty', null, point); return; }

    const props = first.properties as Record<string, unknown>;
    if (first.layer.id === 'formation-markers') {
      onContextMenu('formation', props, point);
    } else if (first.layer.id.includes('front-edges')) {
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


  safeOn('mousemove', 'osid-control-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
  safeOn('click', 'sector-fill', handleOsidClick);
  safeOn('mousemove', 'sector-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'sector-fill', handleOsidMouseLeave);
  safeOn('mousemove', 'osid-ethnic-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'osid-ethnic-fill', handleOsidMouseLeave);
  safeOn('click', 'osid-density-fill', handleOsidClick);
  safeOn('mousemove', 'osid-density-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'osid-density-fill', handleOsidMouseLeave);

  if (onFormationHover) {
    safeOn('mousemove', 'formation-markers', handleFormationMouseMove);
    safeOn('mouseleave', 'formation-markers', handleFormationMouseLeave);
  }

  for (const layerId of frontEdgeLayers) {
    if (onFrontEdgeHover) {
      safeOn('mousemove', layerId, handleFrontEdgeMouseMove);
      safeOn('mouseleave', layerId, handleFrontEdgeMouseLeave);
    }
  }

  for (const layerId of frontEdgeHighlightLayers) {
    if (onFrontEdgeHover) {
      safeOn('mousemove', layerId, handleFrontEdgeMouseMove);
      safeOn('mouseleave', layerId, handleFrontEdgeMouseLeave);
    }
  }

  // Battle markers hover
  if (onBattleHover) {
    const handleBattleMouseMove = (e: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      const osid = e.features?.[0]?.properties?.osid as string | undefined;
      const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
      if (osid) onBattleHover(osid, point);
    };
    const handleBattleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      onBattleHover(null, null);
    };
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
    safeOff('mousemove', 'osid-ethnic-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'osid-ethnic-fill', handleOsidMouseLeave);
    safeOff('click', 'osid-density-fill', handleOsidClick);
    safeOff('mousemove', 'osid-density-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'osid-density-fill', handleOsidMouseLeave);
    safeOff('click', 'sector-fill', handleOsidClick);
    safeOff('mousemove', 'sector-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'sector-fill', handleOsidMouseLeave);

    if (onFormationHover) {
      safeOff('mousemove', 'formation-markers', handleFormationMouseMove);
      safeOff('mouseleave', 'formation-markers', handleFormationMouseLeave);
    }

    if (hoverTimeout) clearTimeout(hoverTimeout);

    for (const layerId of frontEdgeLayers) {
      safeOff('mousemove', layerId, handleFrontEdgeMouseMove);
      safeOff('mouseleave', layerId, handleFrontEdgeMouseLeave);
    }
    for (const layerId of frontEdgeHighlightLayers) {
      safeOff('mousemove', layerId, handleFrontEdgeMouseMove);
      safeOff('mouseleave', layerId, handleFrontEdgeMouseLeave);
    }
    setHoverHighlight(null, null);
  };
}
