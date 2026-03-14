# Session Report: OSID Centroid Restoration & Topological Diagnostic Fix
**Date:** March 14, 2026  
**Status:** Completed & Verified

## 1. Objective
The goal of this session was to resolve a critical data gap where **OSID (Operational Settlement ID) centroids** were missing from the operational contact graph. This gap caused diagnostic tools (specifically `diag_triple_junction_validity.cjs`) to fail when calculating spatial relationships (angles/bearings) and potentially impacted simulation logic that relies on settlement coordinates.

## 2. Investigation & Findings

### Core Issue: Coordinate Stripping
During the transition to Phase 2 B(a) (OSID-native geometry), the `derive_operational_osid_first.ts` script was producing an `operational_contact_graph.json` that only listed nodes by their ID, omitting the `lat` and `lon` fields present in earlier versions of the pipeline.

### Findings in `operational_data.ts`
The data loader `loadOperationalCentroids` was hardcoded to expect a specific JSON schema:
- **Expected:** `nodes: Record<string, { lat, lon }>`
- **Actual (from pipeline):** `nodes: Array<{ id }>`

This mismatch meant that even if coordinates were added back to the JSON, the loader would have failed to parse them unless they were in the exact mapping format it expected.

### Pipeline Inconsistency
I identified that there are two primary ways the operational layer is derived:
1. `derive_operational_osid_first.ts`: The current OSID-native source.
2. `derive_operational_settlements.ts`: The k-way partitioning pipeline.

Neither of these scripts was correctly writing centroids to the contact graph output, creating a systemic risk of regression if the user switched between pipelines.

## 3. Implementation Process

### Thought Process: "Fix the Source, then the Sink"
The strategy was to ensure data is generated correctly at the source (the scripts) and then ensure the consumer (the library) is resilient enough to handle different versions of that data.

#### Step A: Restoration in `derive_operational_osid_first.ts`
I modified the "OSID-first" script to calculate centroids on-the-fly using `turf.centroid`. 
- **Reasoning**: This is the most accurate way to get a representative point for the combined OSID polygons, as it handles complex shapes and multi-polygons correctly.

#### Step B: Polymorphic Loading in `operational_data.ts`
I updated `loadOperationalCentroids` to be format-agnostic. It now checks if `nodes` is an array or a record.
- **Reasoning**: This "defensive coding" approach ensures that even if legacy data or hand-edited JSONs are used, the system won't crash.

#### Step C: Future-Proofing `derive_operational_settlements.ts`
I applied the same centroid-generation logic to the partitioning pipeline.
- **Reasoning**: To prevent this issue from resurfacing the next time a full rereder of the settlements is triggered via the partitioning route.

## 4. Verification

### Diagnostic Execution
I executed `diag_triple_junction_validity.cjs` to confirm the fix.
- **Result**: The script successfully loaded centroids for the `hajderovici_2` hub and its hostile neighbors (`vukanovici`, `kamensko_2`, `gornja_borovica_2`).
- **Calculated Angles**: I was able to verify that `vukanovici` is at **-104.5°** (South/Southwest) while `kamensko_2` is at **-23.5°** (East/East-Southeast) from the hub, confirming that these polygons are indeed distinct faces of the unit's front.

### Data Integrity
The `operational_contact_graph.json` was verified to have 744 nodes, all with updated `lat` and `lon` fields.

## 5. Conclusions
The system is now spatially "aware" again at the operational level. The diagnostic scripts can now be used to implement more sophisticated "Case B" topological checks, which was the user's ultimate goal for refining the sector reassignment logic.
