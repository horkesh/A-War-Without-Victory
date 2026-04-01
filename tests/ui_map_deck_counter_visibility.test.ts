import assert from 'node:assert/strict';
import { test } from 'node:test';

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

test('deck formation layer keeps all formation counters visible in normal state', () => {
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

    assert.ok(baseLayer, 'expected base Deck icon layer');
    assert.equal(baseLayer.props.data.length, 3, 'base Deck layer should render every formation feature');
});

test('highlight overlay remains a styling layer, not a visibility backdoor', () => {
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

    assert.ok(baseLayer, 'expected base Deck icon layer');
    assert.ok(highlightedLayer, 'expected highlighted Deck icon layer');
    assert.equal(baseLayer.props.data.length, 2, 'normal visibility should already include highlighted formations');
    assert.deepEqual(
        highlightedLayer.props.data.map((feature: any) => feature.properties.id),
        ['b_hidden'],
        'highlight layer should only restyle requested formations',
    );
});

test('base deck counters stay faction-colored while selected formations get a white overlay', () => {
    const feature = makeFeature('b_selected', false) as any;

    assert.equal(
        getBaseFormationIconId(feature),
        'brigade__RS__h100__m100_b_selected',
        'base layer should keep the selected formation in faction colors',
    );
    assert.equal(
        getHighlightedFormationIconId(feature),
        'white__brigade__RS__h100__m100_b_selected',
        'highlight overlay should provide the white selected counter',
    );
});
