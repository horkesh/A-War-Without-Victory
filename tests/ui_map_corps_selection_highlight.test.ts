import assert from 'node:assert/strict';
import { test } from 'node:test';

import { collectHighlightedFormationIds } from '../src/ui/map/map/highlightSelection.js';

function makeFeature(id: string, corpsId: string | null, sectorId: string | null) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [17.8, 44.1] },
        properties: {
            id,
            corps_id: corpsId,
            sector_id: sectorId,
        },
    };
}

test('corps selection highlights all corps brigades, not only brigades with sector assignments', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('rs_front', 'vrs_1kk', 'sector:1'),
            makeFeature('rs_reserve', 'vrs_1kk', null),
            makeFeature('other_corps', 'vrs_drina', 'sector:2'),
        ],
    } as any;

    const loadedGameState = {
        corpsFrontSectors: [
            { corps_id: 'vrs_1kk', sector_id: 'sector:1' },
            { corps_id: 'vrs_drina', sector_id: 'sector:2' },
        ],
    } as any;

    const ids = collectHighlightedFormationIds({
        formationsGeoJson,
        loadedGameState,
        selectedFormationId: null,
        selectedCorpsId: 'vrs_1kk',
        selectedCorpsFrontSectorId: null,
    });

    assert.deepEqual(
        ids,
        ['rs_front', 'rs_reserve'],
        'corps selection should include reserve/non-sector brigades belonging to the corps',
    );
});

test('sector selection remains sector-scoped', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('rs_front', 'vrs_1kk', 'sector:1'),
            makeFeature('rs_reserve', 'vrs_1kk', null),
            makeFeature('rs_other_sector', 'vrs_1kk', 'sector:3'),
        ],
    } as any;

    const ids = collectHighlightedFormationIds({
        formationsGeoJson,
        loadedGameState: null,
        selectedFormationId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: 'sector:1',
    });

    assert.deepEqual(ids, ['rs_front']);
});
