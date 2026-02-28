import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';

export interface MapInteractionCallbacks {
  onOsidClick?: (osid: string, properties: Record<string, unknown>) => void;
  onFormationClick?: (formationId: string, properties: Record<string, unknown>) => void;
}

export function useMapInteractions(
  map: MapLibreMap | null,
  callbacks: MapInteractionCallbacks | ((osid: string) => void)
) {
  if (!map) return;

  const onOsidClick = typeof callbacks === 'function' ? callbacks : callbacks.onOsidClick;
  const onFormationClick = typeof callbacks === 'function' ? undefined : callbacks.onFormationClick;

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

  const handleOsidMouseMove = () => {
    map.getCanvas().style.cursor = 'pointer';
  };

  const handleOsidMouseLeave = () => {
    map.getCanvas().style.cursor = '';
  };

  map.on('click', 'osid-control-fill', handleOsidClick);
  map.on('mousemove', 'osid-control-fill', handleOsidMouseMove);
  map.on('mouseleave', 'osid-control-fill', handleOsidMouseLeave);

  if (onFormationClick) {
    map.on('click', 'formation-markers', handleFormationClick);
    map.on('click', 'formation-labels', handleFormationClick);
  }

  return () => {
    map.off('click', 'osid-control-fill', handleOsidClick);
    map.off('mousemove', 'osid-control-fill', handleOsidMouseMove);
    map.off('mouseleave', 'osid-control-fill', handleOsidMouseLeave);
    if (onFormationClick) {
      map.off('click', 'formation-markers', handleFormationClick);
      map.off('click', 'formation-labels', handleFormationClick);
    }
  };
}
