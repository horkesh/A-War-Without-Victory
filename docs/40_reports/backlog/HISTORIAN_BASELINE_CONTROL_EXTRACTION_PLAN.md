# Historian extraction plan: Baseline control data (start, 20w, 52w)

**Date:** 2026-02-24  
**Purpose:** Define the Historian-led extraction of BB-citation-backed political control for scenario **starting**, **20-week**, and **52-week** checkpoints so we can establish **correct baselines** with broad coverage (as many locations/OSIDs as possible, not just a few anchor municipalities).  
**Consumer:** Scenario init-control data, baseline regression tests, TEST_BASELINE_STRATEGY.md.

---

## 0. Initial April 1992 control (canon)

**Initial April 1992 political control is based on ethnic majority of OSID**, not on BB-derived municipal control. The Historian extraction for April 1992 is for **reference and validation only**; it does not drive init. Init uses ethnic-majority-by-OSID logic (and any hybrid/ethnic init_control_mode as configured). Do not replace or override init with the Historian's BB municipal table for the start scenario.

---

## 1. Goal

- **Starting scenario (April 1992):** Citation-backed control for every municipality (mun1990_id) that Balkan Battlegrounds supports. Feeds/validates `data/source/municipalities_1990_initial_political_controllers_apr1992.json` and init-control tests. Current file has 110 muns; tests only assert 2 anchors (zvornik, bijeljina). We want **full coverage** where BB provides evidence.
- **20-week checkpoint (~Sept 1992):** Control snapshot at that point in the war. Used to establish a 20w baseline reference (for run_summary/control_delta or dedicated checkpoint validation).
- **52-week checkpoint (~April 1993):** Control snapshot for 52w baseline reference.

All three should cover **as many OSIDs as possible**: i.e. extract by **location/municipality** (BB speaks in place names); we map to mun1990_id (110 pre-1995 municipalities) and thence to OSIDs (operational layer). No limit to 4–7 anchor muns — aim for every location BB describes.

---

## 2. Data contract (engine)

- **Init control:** Schema `{ "controllers_by_mun1990_id": { "<mun1990_id>": "RBiH" | "RS" | "HRHB" | null } }`. File per key: `data/source/municipalities_1990_initial_political_controllers_<key>.json`. All 110 mun1990_ids must be present (null where unknown).
- **Checkpoint control (20w / 52w):** No engine schema yet. Historian output can be (a) extraction report with tables, (b) optional JSON in same schema keyed by mun1990_id for consumption by a future checkpoint-baseline step.

---

## 3. Historian deliverables

1. **Extraction report(s)** under `data/derived/knowledge_base/balkan_battlegrounds/extractions/`:
   - **Start (April 1992):** Table or list: location/mun1990_id, controller (RBiH|RS|HRHB), citation (BB1/BB2 p.X). Note any muns where BB is silent or ambiguous.
   - **20-week (~Sept 1992):** Same structure; timeframe label "20w" or "Sept 1992".
   - **52-week (~April 1993):** Same structure; timeframe label "52w" or "April 1993".
   - One report per timeframe or one combined report with clear sections. Every factual claim must cite BB; no invention.

2. **Optional machine-readable output** (if Historian can produce without invention):
   - Start: JSON matching `controllers_by_mun1990_id` for all 110 muns (use null where BB has no evidence).
   - 20w / 52w: Same schema in files e.g. `..._controllers_sept1992.json`, `..._controllers_apr1993.json`, or documented in report for later authoring.

3. **Coverage:** Maximize locations. Use BB narrative, maps (map_catalog.json), and facts_proposed.json. Map place names to our mun1990_id list (see `data/source/municipalities_1990_initial_political_controllers_apr1992.json` keys). Where BB gives settlement/area but not exact mun, note in report for scenario-creator or harness to resolve.

---

## 4. Mapping to OSIDs

- Historian works in **location/municipality** (BB) and **mun1990_id** (our 110). Operational layer (OSID) mapping is **downstream**: canonical_to_operational_map and settlement graph map mun1990 → OSID(s). Establishing "correct baselines" for "as many OSIDs as possible" means: extract control for as many muns/locations as BB supports → we then apply existing geography so every such mun contributes to the correct OSID(s). Historian does not need to output OSIDs.

---

## 5. References

- TEST_BASELINE_STRATEGY.md — baseline refresh and init-control anchor strategy.
- SCENARIO_DATA_CONTRACT.md — init_control schema and well-known keys.
- PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md — existing BB pattern report.
- Historian skill: `.cursor/skills/historian/SKILL.md`.
- Balkan Battlegrounds extractor: `.cursor/skills/balkan-battlegrounds-historical-extractor/SKILL.md`.
