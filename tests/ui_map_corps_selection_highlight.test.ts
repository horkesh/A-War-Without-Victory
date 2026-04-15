import { expect, it } from 'vitest';

import {
    collectEmphasizedFormationIds,
    collectHighlightedFormationIds,
} from '../src/ui/map/map/highlightSelection.js';

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

it('corps selection highlights all corps brigades, not only brigades with sector assignments', () => {
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

    expect(
        ids,
        'corps selection should include reserve/non-sector brigades belonging to the corps',
    ).toEqual(['rs_front', 'rs_reserve']);
});

it('sector selection remains sector-scoped', () => {
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

    expect(ids).toEqual(['rs_front']);
});

it('corps emphasis ids stay roster-scoped instead of collapsing back to active sector buckets', () => {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: [
            makeFeature('rs_front', 'vrs_1kk', 'sector:1'),
            makeFeature('rs_reserve', 'vrs_1kk', null),
            makeFeature('rs_rear', 'vrs_1kk', null),
            makeFeature('other_corps', 'vrs_drina', 'sector:2'),
        ],
    } as any;

    const ids = collectEmphasizedFormationIds({
        formationsGeoJson,
        loadedGameState: null,
        selectedCorpsId: 'vrs_1kk',
        selectedCorpsFrontSectorId: null,
    });

    expect(
        ids,
        'corps emphasis should include all visible corps brigades, not only sector-attached ones',
    ).toEqual(['rs_front', 'rs_rear', 'rs_reserve']);
});
