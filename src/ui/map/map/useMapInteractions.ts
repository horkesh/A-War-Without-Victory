import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';

export interface MapInteractionCallbacks {
  onOsidClick?: (osid: string, properties: Record<string, unknown>) => void;
  onFormationClick?: (formationId: string, properties: Record<string, unknown>) => void;
  onFrontEdgeClick?: (edgeId: string, properties: Record<string, unknown>) => void;
  /** Tooltip: set after 300ms hover; position from event. */
  onOsidHover?: (osid: string | null, point: { x: number; y: number } | null) => void;
  onFormationHover?: (formationId: string | null, point: { x: number; y: number } | null) => void;
  onFrontEdgeHover?: (edgeId: string | null, point: { x: number; y: number } | null) => void;
  onMapMouseLeave?: () => void;
}

const HOVER_DELAY_MS = 300;

let hoverTimeout: number | undefined;
let formationHoverTimeout: number | undefined;
let frontHoverTimeout: number | undefined;
let hoveredFrontEdgeId: string | null = null;

const FRONT_EDGES_SOURCE = 'front-edges-hover';

export function useMapInteractions(
  map: MapLibreMap | null,
  callbacks: MapInteractionCallbacks | ((osid: string) => void)
) {
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

  const safeSetFeatureState = (
    target: { source: string; id: string },
    state: Record<string, unknown>
  ) => {
    try {
      map.setFeatureState(target, state);
    } catch (_) { /* source may be removed during teardown */ }
  };

  const onOsidClick = typeof callbacks === 'function' ? callbacks : callbacks.onOsidClick;
  const onFormationClick = typeof callbacks === 'function' ? undefined : callbacks.onFormationClick;
  const onFrontEdgeClick = typeof callbacks === 'function' ? undefined : callbacks.onFrontEdgeClick;
  const onOsidHover = typeof callbacks === 'function' ? undefined : callbacks.onOsidHover;
  const onFormationHover = typeof callbacks === 'function' ? undefined : callbacks.onFormationHover;
  const onFrontEdgeHover = typeof callbacks === 'function' ? undefined : callbacks.onFrontEdgeHover;
  const onMapMouseLeave = typeof callbacks === 'function' ? undefined : callbacks.onMapMouseLeave;

  const handleOsidClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;
    const osid = feature.properties.osid as string | undefined;
    if (osid) {
      const props = feature.properties as Record<string, unknown>;
      onOsidClick?.(osid, props);
    }
  };

  const handleFormationClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;
    const id = feature.properties.id as string | undefined;
    if (id) {
      const props = feature.properties as Record<string, unknown>;
      onFormationClick?.(id, props);
    }
  };

  const handleOsidMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    const feature = e.features?.[0];
    const osid = feature?.properties?.osid as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
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
        if (formationHoverTimeout) clearTimeout(formationHoverTimeout);
        formationHoverTimeout = window.setTimeout(() => {
          onFormationHover!(id, point);
          formationHoverTimeout = undefined;
        }, HOVER_DELAY_MS);
      } else {
        if (formationHoverTimeout) clearTimeout(formationHoverTimeout);
        formationHoverTimeout = undefined;
        onFormationHover(null, null);
      }
    }
  };

  const handleFormationMouseLeave = () => {
    if (formationHoverTimeout) {
      clearTimeout(formationHoverTimeout);
      formationHoverTimeout = undefined;
    }
    onFormationHover?.(null, null);
    onMapMouseLeave?.();
  };

  const handleFrontEdgeMouseMove = (e: MapLayerMouseEvent) => {
    map.getCanvas().style.cursor = 'pointer';
    const feature = e.features?.[0];
    const edgeId = feature?.properties?.edge_id as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;

    // Update feature-state highlight
    if (edgeId && edgeId !== hoveredFrontEdgeId) {
      if (hoveredFrontEdgeId) {
        safeSetFeatureState({ source: FRONT_EDGES_SOURCE, id: hoveredFrontEdgeId }, { hover: false });
      }
      hoveredFrontEdgeId = edgeId;
      safeSetFeatureState({ source: FRONT_EDGES_SOURCE, id: edgeId }, { hover: true });
    }

    if (onFrontEdgeHover) {
      if (edgeId) {
        if (frontHoverTimeout) clearTimeout(frontHoverTimeout);
        frontHoverTimeout = window.setTimeout(() => {
          onFrontEdgeHover!(edgeId, point);
          frontHoverTimeout = undefined;
        }, HOVER_DELAY_MS);
      } else {
        if (frontHoverTimeout) clearTimeout(frontHoverTimeout);
        frontHoverTimeout = undefined;
        onFrontEdgeHover(null, null);
      }
    }
  };

  const handleFrontEdgeMouseLeave = () => {
    map.getCanvas().style.cursor = '';
    if (hoveredFrontEdgeId) {
      safeSetFeatureState({ source: FRONT_EDGES_SOURCE, id: hoveredFrontEdgeId }, { hover: false });
      hoveredFrontEdgeId = null;
    }
    if (frontHoverTimeout) {
      clearTimeout(frontHoverTimeout);
      frontHoverTimeout = undefined;
    }
    onFrontEdgeHover?.(null, null);
    onMapMouseLeave?.();
  };

  safeOn('click', 'osid-control-fill', handleOsidClick);
  safeOn('mousemove', 'osid-control-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
  safeOn('click', 'osid-ethnic-fill', handleOsidClick);
  safeOn('mousemove', 'osid-ethnic-fill', handleOsidMouseMove);
  safeOn('mouseleave', 'osid-ethnic-fill', handleOsidMouseLeave);

  if (onFormationClick) {
    safeOn('click', 'formation-markers', handleFormationClick);
    safeOn('click', 'formation-labels', handleFormationClick);
  }
  if (onFormationHover) {
    safeOn('mousemove', 'formation-markers', handleFormationMouseMove);
    safeOn('mouseleave', 'formation-markers', handleFormationMouseLeave);
    safeOn('mousemove', 'formation-labels', handleFormationMouseMove);
    safeOn('mouseleave', 'formation-labels', handleFormationMouseLeave);
  }

  const frontEdgeLayers = ['front-edges-hover-pos', 'front-edges-hover-neg'];

  const handleFrontEdgeClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature?.properties) return;
    const edgeId = feature.properties.edge_id as string | undefined;
    if (edgeId) {
      const props = feature.properties as Record<string, unknown>;
      onFrontEdgeClick?.(edgeId, props);
    }
  };

  for (const layerId of frontEdgeLayers) {
    if (onFrontEdgeClick) {
      safeOn('click', layerId, handleFrontEdgeClick);
    }
    if (onFrontEdgeHover) {
      safeOn('mousemove', layerId, handleFrontEdgeMouseMove);
      safeOn('mouseleave', layerId, handleFrontEdgeMouseLeave);
    }
  }

  return () => {
    safeOff('click', 'osid-control-fill', handleOsidClick);
    safeOff('mousemove', 'osid-control-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
    safeOff('click', 'osid-ethnic-fill', handleOsidClick);
    safeOff('mousemove', 'osid-ethnic-fill', handleOsidMouseMove);
    safeOff('mouseleave', 'osid-ethnic-fill', handleOsidMouseLeave);
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (onFormationClick) {
      safeOff('click', 'formation-markers', handleFormationClick);
      safeOff('click', 'formation-labels', handleFormationClick);
    }
    if (onFormationHover) {
      safeOff('mousemove', 'formation-markers', handleFormationMouseMove);
      safeOff('mouseleave', 'formation-markers', handleFormationMouseLeave);
      safeOff('mousemove', 'formation-labels', handleFormationMouseMove);
      safeOff('mouseleave', 'formation-labels', handleFormationMouseLeave);
    }
    if (formationHoverTimeout) clearTimeout(formationHoverTimeout);
    for (const layerId of frontEdgeLayers) {
      if (onFrontEdgeClick) {
        safeOff('click', layerId, handleFrontEdgeClick);
      }
      safeOff('mousemove', layerId, handleFrontEdgeMouseMove);
      safeOff('mouseleave', layerId, handleFrontEdgeMouseLeave);
    }
    if (hoveredFrontEdgeId) {
      safeSetFeatureState({ source: FRONT_EDGES_SOURCE, id: hoveredFrontEdgeId }, { hover: false });
      hoveredFrontEdgeId = null;
    }
    if (frontHoverTimeout) clearTimeout(frontHoverTimeout);
  };
}
