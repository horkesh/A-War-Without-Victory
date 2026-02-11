# Paradox Team Convene: 1991 Census Master & Sarajevo Split Settlements

**Date:** 2026-02-07  
**Convened by:** Orchestrator  
**Status:** Open — team input requested

---

## 1. Problem Statement

### Immediate issue (rendering)

- **Sarajevo Dio - Novo Sarajevo** (S170666) does not appear in the A1 viewer or map viewer despite being present in the derived data (A1_BASE_MAP.geojson, settlements_a1_viewer.geojson, census_rolled_up_wgs84.json).
- Caching and server restart ruled out. A step in the **rendering phase** is likely missing or filtering out the settlement.
- **Handoff:** Graphics Programmer + UI/UX Developer — trace the full render path from GeoJSON → canvas and identify where S170666 (or settlements with duplicate names) might be dropped or skipped.
- **Rendering trace checklist:**
  - A1 viewer: loads `./A1_BASE_MAP.geojson`; draws `role=settlement` in control overlay, ethnicity overlay, urban areas (nato_class !== 'SETTLEMENT'), settlement borders; `findSettlementAt` uses point-in-polygon.
  - Map viewer: loads `settlements_a1_viewer.geojson` via data_index; iterates `settlementsGeoJSON.features`; `passesFilters` can skip if `filterUnknownControlCheck` and controller is null; `findFeatureAt` uses bbox only (not point-in-polygon).
  - Verify: does `political_control_data.by_settlement_id["S170666"]` exist? Does `filterUnknownControlCheck` or any filter exclude it? Are coordinates in correct space (A1) for both viewers?

### Strategic question (data architecture)

We have several municipalities that were split after the war, especially in the Sarajevo area. Some of these have **two settlements with the same name but different SIDs** (e.g. "Sarajevo Dio - Novo Sarajevo" as S170666 in Novo Sarajevo and S209490 in Istočno Novo Sarajevo; we merged S209490 → S170666 in the Voronoi pipeline but the underlying census model remains split).

**User question:** Would it be worthwhile to build a **new master census data** that combines everything into a **clean 1991 census file**? As it stands, the data exists but is split into post-1995 municipalities.

---

## 2. Role-Specific Questions

### Technical Architect

- What is the current **census data flow** from source (bih_census_1991.json, settlement_names.json) through to census_rolled_up_wgs84, settlements_initial_master, and viewers?
- If we introduce a **canonical 1991 census master** (pre–post-1995-split semantics), where would it sit in the pipeline? What would it replace or augment?
- What are the **risks** of a new canonical census layer vs. continuing to derive/merge at pipeline stages (e.g. Voronoi merge pairs, municipality overrides)?

### Product Manager

- What is the **scope impact** of a clean 1991 census master project? Phased delivery options?
- What are the **assumptions** (e.g. "all post-1995 splits can be deterministically rolled up to 1991 opštine") and their risk levels?
- Recommended **next single priority** if we pursue this vs. if we defer.

### Game Designer

- Is a **1991-opština-level census** (with post-1995 splits collapsed) the correct simulation substrate, or do we need post-1995 granularity for certain mechanics?
- Are there design implications of **duplicate settlement names** across split municipalities (e.g. search, tooltips, scenario authoring)?

### Asset Integration

- What **schema and ordering** requirements would a new 1991 census master need to satisfy (map build, settlement attributes, political control)?
- Integration points with existing bih_census_1991.json, municipality_post1995_to_mun1990.json, and mun1990_names.

### Map / Geometry (map-geometry-integrity-reviewer)

- Are there **geometry or SID consistency** issues when settlements are merged at census level vs. at Voronoi/derivation level?
- Validation rules for a 1991 master that must align with bih_adm3_1990.geojson and mun1990_ids.

---

## 3. Current State (Brief)

| Artifact | Role | Notes |
|----------|------|-------|
| bih_census_1991.json | Source | Post-1995 municipality codes; settlements keyed by census_id |
| municipality_post1995_to_mun1990.json | Mapping | Post-1995 → mun1990_id |
| settlements_wgs84_1990.geojson | Derived | Voronoi tessellation; MERGE_INTO_NOVO_SARAJEVO_PAIRS merges S209490 → S170666 |
| census_rolled_up_wgs84.json | Derived | by_sid; built from settlements_wgs84_1990 |
| A1_BASE_MAP.geojson | Derived | Projects WGS84 settlements to A1; contains S170666 |
| settlements_a1_viewer.geojson | Derived | Extracted from A1_BASE_MAP; contains S170666 |

Data is present in derived files; rendering path is the suspected gap for the immediate issue.

---

## 4. Options (Preliminary)

### Option A: Fix rendering only

- Trace and fix the missing step that prevents S170666 (and possibly other merged/duplicate-name settlements) from rendering in A1 viewer and map viewer.
- Leave census architecture as-is; continue merge logic at Voronoi and downstream stages.

### Option B: Build a clean 1991 census master

- Create a new canonical artifact: **bih_census_1991_master.geojson** (or equivalent) with:
  - All settlements keyed by a stable 1991 semantics (mun1990_id + census_id or canonical SID).
  - Post-1995 splits collapsed into 1991 opštine where appropriate.
  - Deterministic ordering and schema.
- Refactor pipeline to consume this master as the single source for settlement metadata; derive post-1995 views if needed.

### Option C: Hybrid

- Fix rendering (Option A) as an immediate patch.
- Conduct a short **feasibility study** for Option B (Technical Architect + Asset Integration), then decide.

---

## 5. Next Steps (Orchestrator)

1. **Immediate:** Hand off rendering trace to Graphics Programmer / UI/UX Developer. Deliverable: root cause of S170666 not showing and a fix.
2. **Strategic:** Await role input on Option B. PM to produce scope/phase plan if we proceed.
3. **Document:** Update this report with team responses and the chosen direction.

---

## 7. Option C Progress (2026-02-07)

**Rendering fixes applied:**
- **Map viewer:** Replaced bbox-only hit test with **point-in-polygon** for `findFeatureAt` — ensures correct settlement on click when polygons overlap (e.g. Sarajevo area).
- **Map viewer + A1 viewer:** Added **Go to SID or name** input — type `S170666` or `Sarajevo Dio` and click Go to zoom and select the settlement.
- **Build:** `scripts/map/build_map_viewer.ts` updated; `data/derived/A1_viewer.html` updated.

**Feasibility study:** See `docs/40_reports/FEASIBILITY_1991_CENSUS_MASTER.md`.

---

## 8. Orchestrator Decision (2026-02-07)

**State of the game:**
- Rendering fixes applied; S170666 (Sarajevo Dio - Novo Sarajevo) placement correct (seed override).
- New issue confirmed: **duplicate settlements** — two Lukavica, two Miljevići (same names, different SIDs in split municipalities).
- Feasibility study complete; Option C (incremental migration) recommended.

**Decision:** Proceed with **1991 Census Master** per Option C. Build `bih_census_1991_master.json` as derived artifact; migrate consumers incrementally.

**Scope for master design:**
- Merge rules: MERGE_INTO_NOVO_SARAJEVO_PAIRS (S209490 → S170666), municipality overrides, and **Lukavica** and **Miljevići** pairs (SIDs/census_ids to be identified by Asset Integration or Data).
- Single source of truth for settlement metadata (name, population, ethnicity) in 1990 opština semantics.

**Single priority:** Build 1991 Census Master.

**Handoffs:**
| From | To | Action |
|------|----|--------|
| Orchestrator | Product Manager | Produce phased plan per awwv-plan-change; scope: schema design, derivation script, incremental consumer migration. Include Lukavica and Miljevići merge-pair identification. |
| Product Manager | Technical Architect | Schema design and census flow; merge-rule config format. |
| Product Manager | Asset Integration | Lukavica and Miljevići: identify SIDs, census_ids, target merge pairs; add to merge config. |
| Product Manager | Gameplay Programmer / Build Engineer | Implementation handoff once plan locked. |

**Next step:** PM convenes /awwv_plan_change for 1991 Census Master build.

---

## 6. Handoffs (Historical)

| From | To | Action |
|------|----|--------|
| Orchestrator | Graphics Programmer | Trace A1 viewer and map viewer render path; identify why S170666 does not render |
| Orchestrator | UI/UX Developer | Assist with viewer code paths and any name/lookup filtering |
| Orchestrator | Technical Architect | Assess census data flow and 1991 master feasibility |
| Orchestrator | Product Manager | Scope and phase plan for Option B if pursued |
| Orchestrator | Game Designer | Design implications of 1991 vs. post-1995 census granularity |
| Orchestrator | Asset Integration | Schema/ordering requirements for a 1991 census master |
