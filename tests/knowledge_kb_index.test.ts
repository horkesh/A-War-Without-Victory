import assert from "node:assert";
import { test } from "node:test";


import { buildIndexes, type Fact, type Location, type Unit, type Event, type MapCatalogEntry } from "../tools/knowledge_ingest/bb_kb_lib.js";


test("buildIndexes produces deterministic sorted outputs", () => {
  const locations: Location[] = [
    { location_id: "loc_b", name: "B", admin_area: "Y", aliases: ["B Town"] },
    { location_id: "loc_a", name: "A", admin_area: "X", aliases: ["A City"] }
  ];

  const units: Unit[] = [
    { unit_id: "unit_b", name: "Unit B", faction: "RS", type: "brigade", aliases: ["B Brigade"] },
    { unit_id: "unit_a", name: "Unit A", faction: "RBiH", type: "corps", aliases: ["A Corps"] }
  ];

  const events: Event[] = [
    { event_id: "event_2", name: "Event 2", event_type: "battle", start_date: "1993-05", date_precision: "month" },
    { event_id: "event_1", name: "Event 1", event_type: "operation", start_date: "1992-01-02", date_precision: "day" }
  ];

  const facts: Fact[] = [
    {
      fact_id: "fact_2",
      fact_type: "casualties",
      subject_id: "unknown",
      object_id: "unknown",
      value: 10,
      unit: "killed",
      date: "1992",
      date_precision: "year",
      sources: [{ volume_id: "BB1", page_number: 10, evidence_span: "10 killed" }],
      quote: "10 killed"
    },
    {
      fact_id: "fact_1",
      fact_type: "force_size",
      subject_id: "unknown",
      object_id: "unknown",
      value: 100,
      unit: "troops",
      date: "1993-06",
      date_precision: "month",
      sources: [{ volume_id: "BB2", page_number: 5, evidence_span: "100 troops" }],
      quote: "100 troops"
    }
  ];

  const maps: MapCatalogEntry[] = [
    { map_id: "map_BB2_p0002", volume_id: "BB2", page_number: 2, caption: "Map 2", image_path: "maps/BB2_p0002.png", sources: [] },
    { map_id: "map_BB1_p0001", volume_id: "BB1", page_number: 1, caption: "Map 1", image_path: "maps/BB1_p0001.png", sources: [] }
  ];

  const indexes = buildIndexes({ locations, units, events, facts, maps });

  assert.deepStrictEqual(indexes.facets.years, ["1992", "1993"]);
  assert.deepStrictEqual(indexes.facets.factions, ["RBiH", "RS"]);
  assert.deepStrictEqual(indexes.facets.unit_types, ["brigade", "corps"]);
  assert.deepStrictEqual(indexes.facets.event_types, ["battle", "operation"]);
  assert.deepStrictEqual(indexes.facets.fact_types, ["casualties", "force_size"]);
  assert.deepStrictEqual(indexes.map_index.map((m) => m.map_id), ["map_BB1_p0001", "map_BB2_p0002"]);
  assert.deepStrictEqual(indexes.geography.map((g) => g.location_id), ["loc_a", "loc_b"]);
  assert.deepStrictEqual(indexes.alias_index.map((a) => a.alias), ["A City", "A Corps", "B Brigade", "B Town"]);
});
