import { expect, it } from 'vitest';

import {
    buildTacticalDeckLayers,
    getBaseFormationIconId,
    getHighlightedFormationIconId,
} from '../src/ui/map/layers/buildTacticalDeckLayers.js';

function makeFeature(id: string, isStackTop: boolean) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.8, 44.1] },
        properties: {
            id,
            icon_id: `brigade__RS__h100__m100_${id}`,
            white_icon_id: `white__brigade__RS__h100__m100_${id}`,
            is_stack_top: isStackTop,
        },
    };
}

it('deck formation layer keeps all formation counters visible in normal state', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('b_top', true),
            makeFeature('b_hidden_1', false),
            makeFeature('b_hidden_2', false),
        ],
    } as any;

    const layers = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, []);
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;

    expect(baseLayer, 'expected base Deck icon layer').toBeTruthy();
    expect(baseLayer.props.data.length, 'base Deck layer should render every formation feature').toBe(3);
});

it('highlight overlay remains a styling layer, not a visibility backdoor', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('b_top', true),
            makeFeature('b_hidden', false),
        ],
    } as any;

    const layers = buildTacticalDeckLayers(formationsGeoJson, false, true, 10, ['b_hidden']);
    const baseLayer = layers.find((layer: any) => layer.id === 'deck-formations-icons') as any;
    const highlightedLayer = layers.find((layer: any) => layer.id === 'deck-formations-highlighted') as any;

    expect(baseLayer, 'expected base Deck icon layer').toBeTruthy();
    expect(highlightedLayer, 'expected highlighted Deck icon layer').toBeTruthy();
    expect(baseLayer.props.data.length, 'normal visibility should already include highlighted formations').toBe(2);
    expect(
        highlightedLayer.props.data.map((feature: any) => feature.properties.id),
        'highlight layer should only restyle requested formations',
    ).toEqual(['b_hidden']);
});

it('base deck counters stay faction-colored while selected formations get a white overlay', () => {
    const feature = makeFeature('b_selected', false) as any;

    expect(
        getBaseFormationIconId(feature),
        'base layer should keep the selected formation in faction colors',
    ).toBe('brigade__RS__h100__m100_b_selected');
    expect(
        getHighlightedFormationIconId(feature),
        'highlight overlay should provide the white selected counter',
    ).toBe('white__brigade__RS__h100__m100_b_selected');
});
