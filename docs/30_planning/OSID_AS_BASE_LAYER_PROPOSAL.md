# OSID as Base Layer — Proposal and Scope

**Date:** 2026-02-23  
**Status:** Phase 1 (Option A) implemented 2026-02-24; Phase 2 (Option B) in backlog.  
**Goal:** Make OSIDs the base layer so we don’t depend on “SIDs first, then derive OSIDs.” Clarify what can be skipped and what cannot.

---

## 1. Current Dependency Chain

| Layer | What exists today | Depends on |
|-------|-------------------|------------|
| **Canonical (SID)** | settlements_wgs84_1990.geojson, settlement_contact_graph.json, settlement_ethnicity_data.json | Map build from SVG/census → SIDs and geometry |
| **Operational (OSID)** | operational_settlements.geojson, canonical_to_operational_map.json, operational_contact_graph.json | Canonical geometry + merge_progress.json (SID→group) → union polygons and SID→OSID map |
| **Game state** | political_controllers (mixed: Phase I SID, Phase II OSID), control_by_settlement (SID in adapters), formation.location_osid | State init from scenario (init_control often SID-keyed); Phase I flips by SID; Phase II by OSID |
| **Scenarios** | init_control, init_formations (hq_sid, municipality_id) | Scenario format uses SIDs or mun IDs; at load we resolve to OSID via canonical_to_operational_map |

So today: **SIDs are “initialized” first** (canonical build) → then OSIDs are **derived** (merge + map). At runtime we still use SIDs for Phase I control and for display/adapters in places.

---

## 2. What “OSID as Base Layer” Can Mean

**Option A — Runtime/state OSID-only (no SID in state)**  
- **Scope:** Game state, pipeline, UI, and scenario *consumption* use OSID only.  
- **Change:**  
  - `political_controllers` (or equivalent) keyed only by OSID. Phase I control init and flips use OSID.  
  - Scenario `init_control` and formation init use OSID (or we resolve SID→OSID once at load and never store SID in state).  
  - Adapters and map data expose OSID as the only settlement key; any “control by settlement” is by OSID.  
- **Build pipeline:** Unchanged. We still derive operational from canonical (merge_progress + SID geometry). So we don’t “skip” SID in the **build**, but we **do** skip SID as a required concept at **runtime** — everything is OSID-first after load.  
- **Benefit:** One mental model: “settlement = OSID.” No “initialize SIDs first” in the engine or UI.

**Option B — Build pipeline OSID-first (no canonical SID as source of geometry)**  
- **Scope:** Operational geometry and contact graph are produced **without** using canonical SID geometry as input.  
- **Change:** We’d need a way to define OSID polygons and adjacency that does not start from SIDs (e.g. hand-drawn OSID boundaries, or a single source that is already operational). Today operational geometry is the **union of SID polygons** per merge group; giving that up means a new source for OSID geometry.  
- **Benefit:** True “skip SID initialization” in the data pipeline.  
- **Risk/Cost:** Large. merge_progress is “these SIDs form this OSID”; we’d need either a different merge definition (e.g. by other IDs) or direct OSID geometry. Canonical layer might become optional (e.g. for census/display only, derived from OSID→constituents).

**Option C — Phased: A then B**  
- Phase 1: Implement Option A (runtime/state OSID-only).  
- Phase 2 (optional): If we ever have an OSID-native geometry source, migrate build to Option B.

---

## 3. Recommended Scope (STOP AND ASK)

- **Immediate ask:** Confirm whether the goal is **Option A** (OSID as base at runtime/state/scenario consumption; build still uses SID geometry to derive OSID) or **Option B** (OSID as base in the build too; no SID geometry as input).  
- If **Option A**, next step is a concrete stepwise plan for:  
  - State: political_controllers / control keying OSID-only; Phase I init and flips in OSID space.  
  - Scenarios: init_control by OSID (or load-time SID→OSID resolution and never store SID in state).  
  - Adapters / map: “settlement” = OSID everywhere; remove or isolate SID-only paths.  
  - Determinism: stable ordering for OSID keys; no new sources of nondeterminism.  
- If **Option B**, we need a separate design for how OSID geometry and contact graph are produced without SID geometry (new data source or format).

---

## 4. References

- AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md (control keying, Phase II OSID)  
- 20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md (merge_progress, derive pipeline)  
- canonical_to_operational_map, operational_data.ts, political_control_init.ts  

---

*Proposal only; no canon or code changes until scope is confirmed.*
