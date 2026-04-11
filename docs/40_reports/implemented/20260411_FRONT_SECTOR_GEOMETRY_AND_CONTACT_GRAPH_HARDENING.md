# Front Sector Geometry and Contact Graph Hardening

**Date:** 2026-04-11
**Lane:** East Bosnia / sector-line geometry hardening
**Baseline symptom:** sector glow/line appeared as disconnected collections of OSIDs, and Donje Zesce did not show a front against Mazlina despite a real shared border and opposing control.
**Post-fix scenario:** `n1426`
**Post-fix hash:** `649b3e38b0b26009`

---

## Candidate Seams Considered

1. **UI-only sector glow rendering.** Rejected as insufficient. The bad packets already contained over-wide sector edge sets, so polishing the renderer would hide engine truth.
2. **Manual East Bosnia data patch.** Rejected as too narrow. Donje Zesce/Mazlina exposed a precision bug in the contact graph enrichment pipeline.
3. **Final sector geometry invariant enforcement.** Chosen. Late merge/canonicalization passes could reassemble sectors after earlier split guards had already run.
4. **Contact graph shared-border precision.** Chosen as the paired data seam. Exact-coordinate matching was downgrading real shared borders to point-only contact.

## Exact Seam Chosen

Two root causes were fixed together because the screenshot showed both:

1. Final sector packets could exceed `MAX_SECTOR_EDGES` after late merge passes, allowing a single sector to serialize as a non-line collection.
2. Donje Zesce and Mazlina share polygon boundary segments, but `shared_segments` was `0` because enrichment required exact coordinate identity instead of tolerance-aware segment equality.

## Root Cause

`mergeLateSiblingFrontFragments(...)` ran after earlier sector split guards and could union front edges into an oversized sector. In the live save, rebuilt sectors exceeded the hard 25-edge cap, including East Bosnia sectors. The UI then rendered the packet it was given, making the sector glow look like disconnected front chunks.

Separately, the operational contact graph had a geometry precision failure. Donje Zesce and Mazlina had near-identical shared boundary vertices but not byte-identical coordinates, so shared-segment enrichment recorded `shared_segments: 0`. `computeFrontEdgesOsid(...)` skips such contacts, which removed a real GUI-visible front edge.

## Changes

- Added a final sector-geometry enforcement pass after late sibling merges in `corps_front_sectors.ts`.
- The final pass normalizes sub-segments, re-splits non-contiguous sectors, re-applies the hard `MAX_SECTOR_EDGES` cap, renumbers sectors deterministically, then repartitions territory through the existing Voronoi owner path.
- Changed contact graph enrichment to compare segment endpoints with a small tolerance instead of exact coordinate strings.
- Updated both operational derivation scripts so regenerated contact graphs preserve the same tolerant `shared_segments` truth.
- Regenerated `data/derived/operational/operational_contact_graph.json`.
- Added live-save regressions for:
  - Donje Zesce/Mazlina shared-boundary precision.
  - Donje Zesce/Mazlina front-edge emission.
  - final sector edge cap enforcement.
  - UI display ownership on the Donje Zesce/Mazlina edge.

## Scenario Proof

Fresh 40-week run:

```text
n1426
hash: 649b3e38b0b26009
```

Scripted post-run proof on `data/derived/latest_run_final_save.json`:

```json
{
  "overCapCount": 0,
  "donjeMazlinaEdge": {
    "a": "op:foca:donje_zesce",
    "b": "op:foca:mazlina",
    "edge_id": "op:foca:donje_zesce__op:foca:mazlina",
    "side_a": "RBiH",
    "side_b": "RS"
  },
  "sectorOwners": [
    {
      "sector_id": "sector:arbih_1st_corps:4",
      "corps_id": "arbih_1st_corps",
      "faction": "RBiH",
      "edges": 20,
      "frontOsids": ["op:foca:donje_zesce"]
    },
    {
      "sector_id": "sector:vrs_herzegovina:0",
      "corps_id": "vrs_herzegovina",
      "faction": "RS",
      "edges": 16,
      "frontOsids": ["op:foca:mazlina"]
    }
  ]
}
```

## Verification

```text
npx.cmd vitest run tests/commander_driven_brigade_assignment.test.ts tests/sector_misassignment_relocation.test.ts tests/final_sector_edge_cap_real_save.test.ts
PASS: 3 files, 14 tests

npx.cmd vitest run tests/ui_front_edge_display_ownership_real_save.test.ts tests/operational_contact_graph_shared_border_precision.test.ts tests/front_edge_foca_shared_border_real_save.test.ts tests/final_sector_edge_cap_real_save.test.ts
PASS: 4 files, 5 tests

npm.cmd run sim:scenario:run:40w
PASS: n1426, hash 649b3e38b0b26009

node tools/validate_run_consistency.cjs runs\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1426
PASS: 0 unresolved brigades, 0 assignment sync misses, 0 reserve-cap violations

npm.cmd run test:vitest
PASS: 256 files, 3156 tests

npx.cmd tsc --noEmit -p tsconfig.json
PASS

npm.cmd run build
PASS

npm.cmd run recovery:check
PASS
```

## Canonical Owner After Cleanup

- Final sector geometry invariants are owned by `enforceFinalSectorGeometryInvariants(...)` after late sector merges and before seal/rehome passes.
- Shared-border truth is owned by tolerant `shared_segments` derivation in the contact graph pipeline.

## Demoted Paths

- Assuming early split passes are enough after later merge/canonicalization.
- Exact coordinate-string equality as proof of shared polygon boundary.
- UI-only sector-glow fixes for bad sector packets.

## Residual Risks

- This proves engine/save packet invariants and the Donje Zesce/Mazlina front edge. It does not claim every visible Electron artifact is fixed until the app is refreshed against the new save/build and visually inspected.
- Remaining map concerns should now be classified separately as renderer styling, stale loaded save, map-data geometry, or planner/doctrine behavior.
- Existing scenario anomaly warnings remain present and were not part of this lane.

