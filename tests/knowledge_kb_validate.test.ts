import assert from "node:assert";
import { test } from "node:test";


import { validateCanonicalFacts, validateMapCatalog, type Fact, type MapCatalogEntry } from "../tools/knowledge_ingest/bb_kb_lib.js";


test("validateCanonicalFacts flags missing citations", () => {
    const facts: Fact[] = [
        {
            fact_id: "fact_ok",
            fact_type: "casualties",
            subject_id: "unknown",
            object_id: "unknown",
            value: 5,
            unit: "killed",
            date: "1992",
            date_precision: "year",
            sources: [{ volume_id: "BB1", page_number: 1, evidence_span: "5 killed" }],
            quote: "5 killed"
        },
        {
            fact_id: "fact_bad",
            fact_type: "casualties",
            subject_id: "unknown",
            object_id: "unknown",
            value: 7,
            unit: "killed",
            date: "1992",
            date_precision: "year",
            sources: [],
            quote: "7 killed"
        }
    ];

    const result = validateCanonicalFacts(facts);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.errors.length, 1);
});

test("validateMapCatalog uses fileExists override", () => {
    const maps: MapCatalogEntry[] = [
        { map_id: "map_1", volume_id: "BB1", page_number: 1, caption: "Map 1", image_path: "maps/BB1_p0001.png", sources: [] }
    ];

    const resultMissing = validateMapCatalog(maps, { fileExists: () => false });
    assert.strictEqual(resultMissing.ok, false);

    const resultPresent = validateMapCatalog(maps, { fileExists: () => true });
    assert.strictEqual(resultPresent.ok, true);
});
