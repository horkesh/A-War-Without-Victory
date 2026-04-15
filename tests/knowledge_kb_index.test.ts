import { describe, expect, it } from 'vitest';

import {
    buildIndexes,
    type Event,
    type Fact,
    type Location,
    type MapCatalogEntry,
    type Unit
} from '../tools/knowledge_ingest/bb_kb_lib.js';

describe('knowledge KB indexing', () => {
    it('buildIndexes produces deterministic sorted outputs', () => {
        const locations: Location[] = [
            { location_id: 'loc_b', name: 'B', admin_area: 'Y', aliases: ['B Town'] },
            { location_id: 'loc_a', name: 'A', admin_area: 'X', aliases: ['A City'] }
        ];

        const units: Unit[] = [
            { unit_id: 'unit_b', name: 'Unit B', faction: 'RS', type: 'brigade', aliases: ['B Brigade'] },
            { unit_id: 'unit_a', name: 'Unit A', faction: 'RBiH', type: 'corps', aliases: ['A Corps'] }
        ];

        const events: Event[] = [
            { event_id: 'event_2', name: 'Event 2', event_type: 'battle', start_date: '1993-05', date_precision: 'month' },
            { event_id: 'event_1', name: 'Event 1', event_type: 'operation', start_date: '1992-01-02', date_precision: 'day' }
        ];

        const facts: Fact[] = [
            {
                fact_id: 'fact_2',
                fact_type: 'casualties',
                subject_id: 'unknown',
                object_id: 'unknown',
                value: 10,
                unit: 'killed',
                date: '1992',
                date_precision: 'year',
                sources: [{ volume_id: 'BB1', page_number: 10, evidence_span: '10 killed' }],
                quote: '10 killed'
            },
            {
                fact_id: 'fact_1',
                fact_type: 'force_size',
                subject_id: 'unknown',
                object_id: 'unknown',
                value: 100,
                unit: 'troops',
                date: '1993-06',
                date_precision: 'month',
                sources: [{ volume_id: 'BB2', page_number: 5, evidence_span: '100 troops' }],
                quote: '100 troops'
            }
        ];

        const maps: MapCatalogEntry[] = [
            { map_id: 'map_BB2_p0002', volume_id: 'BB2', page_number: 2, caption: 'Map 2', image_path: 'maps/BB2_p0002.png', sources: [] },
            { map_id: 'map_BB1_p0001', volume_id: 'BB1', page_number: 1, caption: 'Map 1', image_path: 'maps/BB1_p0001.png', sources: [] }
        ];

        const indexes = buildIndexes({ locations, units, events, facts, maps });

        expect(indexes.facets.years).toEqual(['1992', '1993']);
        expect(indexes.facets.factions).toEqual(['RBiH', 'RS']);
        expect(indexes.facets.unit_types).toEqual(['brigade', 'corps']);
        expect(indexes.facets.event_types).toEqual(['battle', 'operation']);
        expect(indexes.facets.fact_types).toEqual(['casualties', 'force_size']);
        expect(indexes.map_index.map((m) => m.map_id)).toEqual(['map_BB1_p0001', 'map_BB2_p0002']);
        expect(indexes.geography.map((g) => g.location_id)).toEqual(['loc_a', 'loc_b']);
        expect(indexes.alias_index.map((a) => a.alias)).toEqual(['A City', 'A Corps', 'B Brigade', 'B Town']);
    });
});
