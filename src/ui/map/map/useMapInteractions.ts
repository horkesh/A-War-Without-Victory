import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';

export interface MapInteractionCallbacks {
  onOsidClick?: (osid: string, properties: Record<string, unknown>) => void;
  onFormationClick?: (formationId: string, properties: Record<string, unknown>) => void;
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

export function useMapInteractions(
  map: MapLibreMap | null,
  callbacks: MapInteractionCallbacks | ((osid: string) => void)
) {
  if (!map) return;

  const onOsidClick = typeof callbacks === 'function' ? callbacks : callbacks.onOsidClick;
  const onFormationClick = typeof callbacks === 'function' ? undefined : callbacks.onFormationClick;
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
    const feature = e.features?.[0];
    const edgeId = feature?.properties?.edge_id as string | undefined;
    const point = e.originalEvent ? { x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null;
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
    if (frontHoverTimeout) {
      clearTimeout(frontHoverTimeout);
      frontHoverTimeout = undefined;
    }
    onFrontEdgeHover?.(null, null);
    onMapMouseLeave?.();
  };

  map.on('click', 'osid-control-fill', handleOsidClick);
  map.on('mousemove', 'osid-control-fill', handleOsidMouseMove);
  map.on('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
  map.on('click', 'osid-ethnic-fill', handleOsidClick);
  map.on('mousemove', 'osid-ethnic-fill', handleOsidMouseMove);
  map.on('mouseleave', 'osid-ethnic-fill', handleOsidMouseLeave);

  if (onFormationClick) {
    map.on('click', 'formation-markers', handleFormationClick);
    map.on('click', 'formation-labels', handleFormationClick);
  }
  if (onFormationHover) {
    map.on('mousemove', 'formation-markers', handleFormationMouseMove);
    map.on('mouseleave', 'formation-markers', handleFormationMouseLeave);
    map.on('mousemove', 'formation-labels', handleFormationMouseMove);
    map.on('mouseleave', 'formation-labels', handleFormationMouseLeave);
  }

  const frontEdgesLayerId = 'front-edges-hover';
  if (onFrontEdgeHover && map.getLayer(frontEdgesLayerId)) {
    map.on('mousemove', frontEdgesLayerId, handleFrontEdgeMouseMove);
    map.on('mouseleave', frontEdgesLayerId, handleFrontEdgeMouseLeave);
  }

  return () => {
    map.off('click', 'osid-control-fill', handleOsidClick);
    map.off('mousemove', 'osid-control-fill', handleOsidMouseMove);
    map.off('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
    map.off('click', 'osid-ethnic-fill', handleOsidClick);
    map.off('mousemove', 'osid-ethnic-fill', handleOsidMouseMove);
    map.off('mouseleave', 'osid-ethnic-fill', handleOsidMouseLeave);
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (onFormationClick) {
      map.off('click', 'formation-markers', handleFormationClick);
      map.off('click', 'formation-labels', handleFormationClick);
    }
    if (onFormationHover) {
      map.off('mousemove', 'formation-markers', handleFormationMouseMove);
      map.off('mouseleave', 'formation-markers', handleFormationMouseLeave);
      map.off('mousemove', 'formation-labels', handleFormationMouseMove);
      map.off('mouseleave', 'formation-labels', handleFormationMouseLeave);
    }
    if (formationHoverTimeout) clearTimeout(formationHoverTimeout);
    if (map.getLayer(frontEdgesLayerId)) {
      map.off('mousemove', frontEdgesLayerId, handleFrontEdgeMouseMove);
      map.off('mouseleave', frontEdgesLayerId, handleFrontEdgeMouseLeave);
    }
    if (frontHoverTimeout) clearTimeout(frontHoverTimeout);
  };
}
