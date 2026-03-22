# OSID as Base Layer â€” Phase 2 Implementation Plan (Option B)

**Date:** 2026-02-24  
**Status:** B(a) locked; implementation in progress.  
**Source:** [OSID_AS_BASE_LAYER_PROPOSAL.md](OSID_AS_BASE_LAYER_PROPOSAL.md) Â§2 Option B, Â§3; [CONSOLIDATED_BACKLOG.md](../40_reports/CONSOLIDATED_BACKLOG.md) Â§5; [20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md](../40_reports/implemented/20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md).

**Decision (user + orchestrator):** Option **B(a)** â€” OSID-native geometry source. **canonical_to_operational_map** remains required; derived via **point-in-polygon** (canonical settlement centroids â†’ containing OSID polygon). No SID geometry used to *build* operational boundaries; operational_settlements.geojson is the source of truth (bootstrap from current derived file or future Merger export).

---

## 1. Goal and scope

### 1.1 What â€œOSID-first buildâ€ means (concrete)

- **Goal:** Produce operational geometry and contact graph **without** using canonical SID geometry as the input to the build. Today operational outputs are derived from: (1) canonical settlement polygons (e.g. `settlements_wgs84_1990.geojson`), (2) canonical contact graph, (3) `merge_progress.json` (SID â†’ OSID group). Option B requires either an **OSID-native geometry source** or a **merge definition that does not start from SID geometry**.

- **In scope (Phase 2):**
  - Build pipeline that can produce `operational_settlements.geojson`, `canonical_to_operational_map.json`, and `operational_contact_graph.json` from an OSID-first or alternative source.
  - Migration path from current SID-derived operational data to Phase 2 without breaking scenario runs or HoI map.
  - Clear data contracts so downstream (engine, HoI map, scenario runner, `operational_data.ts`) can remain unchanged or change in a controlled way.

- **Out of scope (this plan):**
  - Phase 1 (runtime/state OSID-only) â€” already implemented 2026-02-24.
  - Changing canon or game mechanics.
  - Implementing code in this document; output is the plan only.

### 1.2 What stays vs what changes

| Aspect | Stays | Changes |
|--------|------|--------|
| **Output artifacts** | Same paths and filenames: `data/derived/operational/operational_settlements.geojson`, `canonical_to_operational_map.json`, `operational_contact_graph.json` (and existing political/initial outputs). | How they are produced (source and pipeline steps). |
| **Output schemas** | GeoJSON FeatureCollection with `osid`, `mun1990_id`, `settlement_name`, `constituent_sids` (or equivalent), population/ethnic fields; map format `{ canonicalSid: osid }`; graph with `nodes`/`edges` keyed by OSID. | If Option B uses a source with no SIDs, `constituent_sids` and/or `canonical_to_operational_map` may need to be optional or derived by a separate path (see Â§3). |
| **Consumers** | `operational_data.ts`, HoIMapRenderer, scenario_runner, political_control_init, zoc/attack_resolution_osid, merger tool. | Only if contract (e.g. presence of canonical map) changes; plan aims to keep contracts stable. |
| **Current derive script** | Phases 0â€“1 (Mostar split, mun grouping) and 5â€“7 (topology, simplify, output) logic are reference for topology and output format. | Phase 2 (source of merge groups) and input data (geometry source) change; Phases 5â€“6 may run on OSID polygons directly instead of SID union. |

---

## 2. Design options

### 2.1 Option B(a): OSID-native geometry source

- **Idea:** A single geometry source that is already â€œoperationalâ€ â€” e.g. hand-drawn OSID boundaries (one polygon per OSID) or an external dataset keyed by OSID.
- **Pros:**
  - No dependency on canonical SID geometry in the build.
  - Single source of truth for operational boundaries; no union/merge from SIDs.
- **Cons / risks:**
  - Requires creating or sourcing ~753 OSID polygons and maintaining them (e.g. in Settlement Merger or a new tool).
  - **canonical_to_operational_map:** If there are no SIDs in the source, we must either (i) derive SIDâ†’OSID by point-in-polygon from canonical settlement points into OSID polygons, or (ii) make the canonical map optional and change scenario/init to be OSID-only (larger change).
  - **Contact graph:** Must be derived from OSID geometry (shared boundaries or adjacency) rather than from canonical graph + merge_progress.
- **Suitable when:** We are willing to author or ingest OSID polygons and (if needed) derive or drop canonical mapping.

### 2.2 Option B(b): Alternative merge definition (no SID geometry as driver)

- **Idea:** Keep a â€œmergeâ€ concept but define it without SID polygons â€” e.g. merge groups keyed by mun + cluster id, or by a different identifier set; geometry then comes from another source (e.g. simplified mun subdivisions, or OSID polygons).
- **Pros:**
  - Can preserve a notion of â€œgroup of areasâ€ without tying to 5,823 SIDs.
  - Could align with future census/display at different granularity (e.g. mun-level first, then subdivide into OSIDs).
- **Cons / risks:**
  - **canonical_to_operational_map** today is SIDâ†’OSID; if we abandon SIDs in the build, we need a clear story for scenarios and for `getPoliticalControllerOSID` (Phase 1 uses majority-vote over constituent SIDs when OSID key is missing).
  - Non-trivial design work to define the new â€œmergeâ€ format and how it maps to existing outputs.
- **Suitable when:** We want to move away from SID as the atomic unit in the pipeline but keep some grouping structure.

### 2.3 Decision: B(a) locked

- **B(a)** chosen: OSID-native geometry source. **canonical_to_operational_map** is derived via point-in-polygon (canonical settlement centroids to containing OSID polygon); required for scenario init and Phase 1 promotion. Canonical layer is used only to derive the map, not to build operational boundaries.


---

## 3. Data contracts

### 3.1 Required outputs (unchanged names and locations)

| Artifact | Path | Current producer | Phase 2 requirement |
|----------|------|-------------------|----------------------|
| Operational geometry | `data/derived/operational/operational_settlements.geojson` | derive_operational_settlements.ts Phase 7 | Same GeoJSON FeatureCollection; each feature has `properties.osid` and properties needed by HoI map and init (mun1990_id, settlement_name, population_*, ethnic_key). Optional: `constituent_sids` if we still have a canonical mapping. |
| Canonical â†’ operational map | `data/derived/operational/canonical_to_operational_map.json` | Same script from `mergedInto` (SIDâ†’OSID) | If source is OSID-only: either (a) derive from point-in-polygon (canonical points â†’ OSID), or (b) make optional and document; consumers: political_control_init, scenario_runner, formation spawn, getPoliticalControllerOSID fallback. |
| Operational contact graph | `data/derived/operational/operational_contact_graph.json` | Same script from canonical edges + merge | Same schema (nodes by OSID, edges with a/b). Can be computed from OSID geometry (shared-boundary or adjacency) if no canonical graph. |

### 3.2 Schema stability

- **operational_settlements.geojson:** Schema can stay the same if we keep the same property set. If we drop SIDs from the source, we can omit `constituent_sids` or fill it from a derived canonical map (point-in-polygon) so that existing code that expects it does not break.
- **canonical_to_operational_map.json:** Schema is `Record<string, string>` (SID â†’ OSID). If we go OSID-first without SIDs, this file either (i) is produced by a derivation step (e.g. assign each canonical settlement to one OSID by containment), or (ii) is deprecated with a clear migration for all consumers (scenario init by OSID only, no majority-vote from SIDs).
- **operational_contact_graph.json:** Schema can stay the same (nodes, edges); only the way edges are computed changes (from geometry or from an OSID-level adjacency definition).

### 3.3 Downstream consumers (no change if contracts hold)

- **operational_data.ts:** Loads canonical_to_operational_map and operational_contact_graph; builds reverse map and edges. If the map is optional, loaders must tolerate missing file or empty map and callers must handle â€œno canonical mappingâ€ (e.g. scenario init already by OSID).
- **HoIMapRenderer / map_hoi:** Use operational_settlements.geojson and operational_contact_graph.json; no change if schemas and paths are unchanged.
- **Scenario runner / formation spawn / recruitment:** Use canonical_to_operational_map for hq_sid â†’ location_osid and init_control resolution. If scenarios move to OSID-only init, these paths can be simplified; otherwise derivation (point-in-polygon) must produce the map.
- **political_control_init / getPoliticalControllerOSID:** Phase 1 uses operationalToCanonical for promotion and for majority-vote fallback when pc[osid] is missing. If canonical map is absent, fallback cannot use â€œmajority of constituent SIDsâ€; we must either guarantee every OSID has a key in political_controllers or define another rule.

---

## 4. Pipeline steps: current vs proposed

### 4.1 Current pipeline (reference)

1. **Load:** settlements_wgs84_1990.geojson, settlement_contact_graph.json, settlement_ethnicity_data.json, clustering_zone_config.json.
2. **Phase 0:** Mostar split (canonical SID geometry).
3. **Phase 1:** Group by municipality (SID list per mun).
4. **Phase 2:** Import merge_progress.json (osid + memberSids); singletons for SIDs not in any group. Result: clusters = Map<osid, sids[]>.
5. **Phase 5:** Build global topology from canonical settlement polygons; simplify.
6. **Phase 6:** For each cluster, merge constituent topology geometries (TopoJSON merge); normalize; aggregate population/ethnic; build operational features.
7. **Phase 7:** Write operational_settlements.geojson; canonical_to_operational_map from mergedInto (SIDâ†’OSID); operational_contact_graph from canonical edges + mergedInto.

### 4.2 Proposed (Option B) â€” high level

- **Input:** Either (B(a)) OSID-native geometry (e.g. GeoJSON with one feature per OSID) plus optional canonical points for derivation, or (B(b)) alternative merge definition plus a geometry source (e.g. OSID polygons or mun-based).
- **Replace:** Phase 2 (merge_progress import) with â€œload OSID-native sourceâ€ or â€œload alternative merge definitionâ€; Phases 5â€“6 either (i) run on OSID polygons directly (no SID union), or (ii) run on a single topology built from OSID geometries.
- **Add (if B(a) and we keep canonical map):** Step to derive canonical_to_operational_map (e.g. for each canonical settlement point, find containing OSID polygon; stable sort for determinism).
- **Contact graph:** Compute from OSID geometry (shared-boundary or centroid adjacency) instead of from canonical edges + merge.
- **Deprecate or make optional:** Reading merge_progress.json and canonical geometry as the *driver* of operational boundaries; canonical geometry can remain for derivation of SIDâ†’OSID only.

### 4.3 Order of work (pipeline)

1. Define and document the chosen source format (OSID-native GeoJSON or alternative merge + geometry).
2. Implement or adopt a producer for that source (e.g. export from Settlement Merger to OSID polygons, or new script).
3. Implement topology + simplification + output generation from OSID geometry (replace current Phase 5â€“6 cluster merge with OSID-first merge or single-topology build).
4. Implement contact graph from OSID geometry (shared boundaries or deterministic adjacency).
5. Implement canonical_to_operational_map derivation (if kept): canonical points + OSID polygons â†’ SIDâ†’OSID; deterministic ordering.
6. Wire new pipeline (script or steps) to write the three artifacts to the same paths; run validation (same schema, deterministic hashes).
7. Deprecate or gate old path (e.g. flag or separate script) so we can switch without breaking existing runs.

---

## 5. Migration path

### 5.1 Non-breaking transition

- **Principle:** Existing scenario runs and HoI map must keep working. So either:
  - **A:** New pipeline produces bitwise-equivalent (or schema-equivalent) outputs so no consumer change is needed; or
  - **B:** New pipeline produces outputs that are backward-compatible (same schema, possibly different geometry or map contents) and we accept a one-time change in operational boundaries/counts after cutover, with scenario and init data updated in a single coordinated step.

### 5.2 Recommended approach

1. **Parallel output (optional):** Run new pipeline to a different directory (e.g. `data/derived/operational_osid_first/`) and compare schema and key metrics (count, mun coverage, contact graph size) against current.
2. **Validation:** Ensure operational_settlements.geojson validates (same property set), canonical_to_operational_map (if present) has expected keys, operational_contact_graph has consistent nodes/edges.
3. **Cutover:** Switch derive script or build config to write to `data/derived/operational/` from the new pipeline; retain old script as legacy (e.g. `derive_operational_settlements_legacy.ts`) for rollback or comparison.
4. **Scenario and init:** If canonical_to_operational_map is derived (e.g. point-in-polygon), re-run derivation after any OSID geometry change; if we move to OSID-only init, update scenario format and init_control/init_formations in one phase (see Â§6 dependencies).

### 5.3 Rollback

- Keep old pipeline runnable and documented; if Phase 2 output causes regressions, restore previous derive script and re-run to regenerate `data/derived/operational/` from merge_progress + canonical geometry.

---

## 6. Dependencies

| Role / system | Dependency |
|--------------|------------|
| **Map tooling** | Derive script(s), topology (TopoJSON/turf), simplification; possibly Settlement Merger changes to export OSID-native geometry. |
| **Asset-integration** | If OSID boundaries are hand-drawn or external, integration and validation of that source. |
| **Technical Architect** | Data pipeline design, schema stability, derivation of canonical_to_operational_map (if kept), deterministic ordering. |
| **Product Manager** | Phasing, prioritization, decision on B(a) vs B(b) and on optional vs required canonical map. |
| **Game Designer** | If scenario format or init rules change (e.g. OSID-only init). |
| **QA / scenario-harness** | Validation of scenario runs and HoI map after cutover; regression tests. |

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Large cost (proposal)** | Break into small deliverables: (1) OSID-native export from Merger + read path, (2) topology from OSID only, (3) contact graph from geometry, (4) canonical map derivation or deprecation, (5) cutover and validation. |
| **Breaking scenario runs** | Keep output schema and paths; validate with apr1992_definitive_52w (or equivalent) before and after; document any intentional change in OSID set or boundaries. |
| **HoI map regression** | Same GeoJSON property contract; visual and automated checks (e.g. 753 features, no duplicate osid). |
| **getPoliticalControllerOSID / init** | If canonical map is optional, document and implement fallback (e.g. no majority-vote; require every OSID keyed in init). |
| **Determinism** | All new steps must use stable sort and deterministic iteration; no timestamps or random seeds; document in Engine Invariants or pipeline spec. |
| **Scope creep** | This plan is Phase 2 â€œbuild pipeline OSID-firstâ€ only. Do not expand to Phase 1 (done) or to canon/mechanics changes without STOP AND ASK. |

---

## 8. Phased delivery (recommended order)

1. **Decision:** B(a) vs B(b); canonical_to_operational_map required vs optional. (PM / Architect / Game Designer.)
2. **Source format:** Define and document OSID-native geometry or alternative merge format; get sign-off. (Architect, asset-integration if external.)
3. **Produce OSID geometry:** Either extend Settlement Merger to export OSID polygons, or create a one-off migration from current operational_settlements.geojson as the first â€œOSID-nativeâ€ source. (Map tooling, asset-integration.)
4. **Pipeline: geometry â†’ topology â†’ GeoJSON:** New path that builds operational_settlements.geojson from OSID polygons only (no SID union). (Technical Architect, map tooling.)
5. **Pipeline: contact graph:** Derive operational_contact_graph from OSID geometry (shared boundaries or adjacency). (Same.)
6. **Pipeline: canonical map:** If kept, implement derivation (e.g. point-in-polygon) and write canonical_to_operational_map.json; determinism and tests. (Technical Architect.)
7. **Integration and validation:** Wire new pipeline to output dir; run existing scenario and HoI map; compare hashes/metrics. (QA, scenario-harness.)
8. **Cutover and deprecation:** Switch default build to new pipeline; document legacy path; update PROJECT_LEDGER and CONSOLIDATED_BACKLOG. (PM, Orchestrator.)
9. **Handoffs:** Map tooling â†’ Architect for pipeline; Architect â†’ PM for phasing; PM â†’ QA for acceptance.

**Parallel work:** Steps 4 and 5 can be developed in parallel once step 3 is done. Step 6 can start once OSID geometry and canonical points (if any) are defined.

---

## 9. Decisions and checklist

- **Scope:** Is the goal strictly â€œbuild pipeline OSID-firstâ€ (Option B), or do we also want to change scenario format or init to OSID-only in this phase?
- **Authority:** Who decides B(a) vs B(b) and whether canonical_to_operational_map remains required?
- **Canon:** Any canon touch (e.g. Phase II Spec, Systems Manual) for â€œoperational data sourceâ€ or â€œcanonical layer optionalâ€?
- **Ledger:** When implementation starts, a PROJECT_LEDGER entry is required (behavior/outputs change). This plan does not create the entry; implementer does at start of work.

---

## 10. References

- [OSID_AS_BASE_LAYER_PROPOSAL.md](OSID_AS_BASE_LAYER_PROPOSAL.md) â€” Option A/B/C, dependency chain, Â§3 recommended scope.
- [20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md](../40_reports/implemented/20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md) â€” Current derive pipeline, merge_progress, 753 OSIDs, outputs.
- [CONSOLIDATED_BACKLOG.md](../40_reports/CONSOLIDATED_BACKLOG.md) Â§5 â€” Phase 2 entry (OSID-first build pipeline).
- PROJECT_LEDGER 2026-02-24, CONSOLIDATED_IMPLEMENTED Â§38 â€” Phase 1 (runtime OSID-only) implemented.
- `scripts/derive_operational_settlements.ts` â€” Current phases 0â€“7; merge_progress import; topology and output.
- `data/source/merge_progress.json` â€” 702 merge groups (osid, memberSids).
- `src/data/operational_data.ts` â€” Load canonical_to_operational_map, reverse map, edges; consumed by political_control_init, turn_pipeline, scenario_runner, formation spawn, zoc.
