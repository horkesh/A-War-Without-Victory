import { describe, expect, it } from 'vitest';

import { buildTacticalDeckLayers, isStackBadgeRow } from '../src/ui/map/layers/buildTacticalDeckLayers.js';

describe('Workstream D map inspection', () => {
  it('renders one deterministic stack count badge on the top counter', () => {
    const features = Array.from({ length: 9 }, (_, stackIndex) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [17.8, 44.1] },
      properties: {
        id: `brigade_${stackIndex + 1}`,
        icon_id: `brigade__RBiH__${stackIndex + 1}`,
        location_osid: 'op:test:stack',
        stack_index: stackIndex,
        stack_count: 9,
        is_stack_top: stackIndex === 0,
      },
    }));

    const layers = buildTacticalDeckLayers({
      type: 'FeatureCollection',
      features,
    } as any, false, true, 10);
    const icons = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const badges = icons.props.data.filter((row: any) => isStackBadgeRow(row));

    // One badge, painted in the counter layer straight after its own top counter.
    expect(badges.map((row: any) => row.properties.id)).toEqual(['brigade_1']);
    expect(badges[0].properties.stack_count).toBe(9);
    const badgeIndex = icons.props.data.indexOf(badges[0]);
    expect(icons.props.data[badgeIndex - 1].properties.id).toBe('brigade_1');
    expect(layers.some((layer: any) => /stack-(circle|text)/.test(layer.id))).toBe(false);
  });
});
