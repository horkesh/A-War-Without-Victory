import { describe, expect, it } from 'vitest';

import { buildTacticalDeckLayers } from '../src/ui/map/layers/buildTacticalDeckLayers.js';

describe('Workstream D map inspection', () => {
  it('renders one deterministic stack count badge on the top counter', () => {
    const features = Array.from({ length: 9 }, (_, stackIndex) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [17.8, 44.1] },
      properties: {
        id: `brigade_${stackIndex + 1}`,
        icon_id: `brigade__RBiH__${stackIndex + 1}`,
        stack_index: stackIndex,
        stack_count: 9,
        is_stack_top: stackIndex === 0,
      },
    }));

    const layers = buildTacticalDeckLayers({
      type: 'FeatureCollection',
      features,
    } as any, false, true, 10);
    const circle = layers.find((layer: any) => layer.id === 'deck-formations-stack-circle') as any;
    const text = layers.find((layer: any) => layer.id === 'deck-formations-stack-text') as any;

    expect(circle?.props.data.map((feature: any) => feature.properties.id)).toEqual(['brigade_1']);
    expect(circle.constructor.layerName).toBe('TextLayer');
    expect(circle.props.fontSettings).toEqual({ sdf: true });
    expect(circle.props.characterSet).toEqual(['\u25cf']);
    expect(text?.props.data.map((feature: any) => feature.properties.id)).toEqual(['brigade_1']);
    expect(text.props.getText(text.props.data[0])).toBe('9');
    expect(circle.props.getPixelOffset(circle.props.data[0])).toEqual(
      text.props.getPixelOffset(text.props.data[0]),
    );
  });
});
