import { describe, expect, it } from 'vitest';

import {
    validateCanonicalFacts,
    validateMapCatalog,
    type Fact,
    type MapCatalogEntry
} from '../tools/knowledge_ingest/bb_kb_lib.js';

describe('knowledge KB validation', () => {
    it('validateCanonicalFacts flags missing citations', () => {
        const facts: Fact[] = [
            {
                fact_id: 'fact_ok',
                fact_type: 'casualties',
                subject_id: 'unknown',
                object_id: 'unknown',
                value: 5,
                unit: 'killed',
                date: '1992',
                date_precision: 'year',
                sources: [{ volume_id: 'BB1', page_number: 1, evidence_span: '5 killed' }],
                quote: '5 killed'
            },
            {
                fact_id: 'fact_bad',
                fact_type: 'casualties',
                subject_id: 'unknown',
                object_id: 'unknown',
                value: 7,
                unit: 'killed',
                date: '1992',
                date_precision: 'year',
                sources: [],
                quote: '7 killed'
            }
        ];

        const result = validateCanonicalFacts(facts);
        expect(result.ok).toBe(false);
        expect(result.errors).toHaveLength(1);
    });

    it('validateMapCatalog uses fileExists override', () => {
        const maps: MapCatalogEntry[] = [
            { map_id: 'map_1', volume_id: 'BB1', page_number: 1, caption: 'Map 1', image_path: 'maps/BB1_p0001.png', sources: [] }
        ];

        const resultMissing = validateMapCatalog(maps, { fileExists: () => false });
        expect(resultMissing.ok).toBe(false);

        const resultPresent = validateMapCatalog(maps, { fileExists: () => true });
        expect(resultPresent.ok).toBe(true);
    });
});
