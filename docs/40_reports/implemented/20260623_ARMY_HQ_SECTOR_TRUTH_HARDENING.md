# Army HQ Sector Truth Hardening

**Date:** 2026-06-23
**Run ID:** N/A
**Baseline:** `main` after `20260622_COMMAND_SURFACE_TRUTH_POLISH`
**Result:** Sector-builder/startup artifact and Army HQ proof-hook hardening implemented on `codex/army-hq-sector-truth-hardening`

## Summary
- Closed the Army HQ sector truth parity residual from the Pyrrhic sector/UI scouts.
- Added Army HQ sector row proof attributes for current, frontline, reserve, command-directed, and coverage-tier assignment truth.
- Fixed a real startup sector-builder defect: 17 HRHB duplicate same-faction edge claims on the Bosnian Posavina front are now canonicalized to one owner.
- Regenerated the baked April 1992 startup snapshot from the canonical builder.

## Changes Made

### Army HQ Sector Truth Hooks
- `SectorsSection` now computes sector assignment through the shared `buildSectorFormationAssignment(...)` helper and exposes stable row attributes for:
  - `data-coverage-tier`
  - `data-current-brigade-count`
  - `data-frontline-brigade-count`
  - `data-reserve-brigade-count`
  - `data-command-directed-brigade-count`
- The new focused UI test proves a zero-formation sector with nonzero density and high threat renders as uncovered/`0 on line`, not held or dense coverage.

### Same-Faction Edge Canonicalization
- `buildCorpsFrontSectors(...)` now runs a deterministic same-faction edge-ownership canonicalization pass after side-coverage recovery and final owner truth.
- If two sectors from the same faction claim the same front edge, the pass selects one owner using:
  - more commanded brigades first;
  - regional command affinity for the Bosnian Posavina command/frontage edge case;
  - corps HQ distance to the friendly edge endpoint;
  - wider current edge ownership;
  - stable sector id fallback.
- The pass removes duplicate edge claims from losing sectors, prunes stale removed-edge front endpoints and brigade buckets in partial-removal cases, normalizes touched sector sub-segments, and deletes sectors left with no front edges.

### Startup Artifact
- The baked April 1992 startup artifact now contains 160 sectors and zero duplicate same-faction edge claims.
- The previously duplicated HVO Bosnian Posavina edge set is owned by `sector:hvo_northwest_bosnia:0` / `hvo_northwest_bosnia`, not `hvo_central_bosnia`.

## Scenario Results
The committed startup artifact was regenerated and checked against the canonical startup builder. Local 40w structural fingerprint stayed at the expected `f282883abbab76cf`, and baseline regression reported all scenarios match.

## Lessons Learned
- Sector coverage display parity needs proof hooks on every major command surface, including Army HQ, not only OOB and Corps Detail.
- Duplicate same-faction edge ownership is invalid sector-builder output; it should be canonicalized in the builder and pinned in startup contracts, not treated as a UI presentation issue.
- When no brigade count distinguishes duplicate sector claims, regional command affinity and spatial proximity are safer deterministic tie-breaks than lexicographic sector id alone.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | Added deterministic same-faction edge ownership canonicalization |
| `data/derived/startup/apr_1992_initial_save.json` | Regenerated baked startup artifact with duplicate HRHB Posavina edge ownership removed |
| `src/ui/map/components/army_hq/SectorsSection.tsx` | Added Army HQ sector assignment/coverage proof attributes |
| `tests/startup_snapshot_contract.test.ts` | Pinned no duplicate same-faction edge claims and Posavina ownership |
| `tests/corps_front_sector_duplicate_edge_canonicalization.test.ts` | Pinned partial duplicate-edge loser pruning |
| `tests/ui/army_hq_sector_truth.test.ts` | Added Army HQ zero-formation sector truth proof |
| `tools/ui/live_surface_browser_sweep.cjs` | Added live Army HQ assignment-truth attribute and zero-current coverage proof |

## Verification
- `npm.cmd run desktop:startup-snapshot:build` regenerated the artifact.
- Startup sanity script reported `{ sectors: 160, duplicates: 0, central: null, northwest: 17 }`.
- `node node_modules\vitest\vitest.mjs run tests\corps_front_sector_duplicate_edge_canonicalization.test.ts tests\startup_snapshot_contract.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts --pool=forks --reporter=dot` passed 20/20.
- `npm.cmd run desktop:startup-snapshot:check` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 271/271.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified; evidence recorded `armyHqSectorAssignmentTruthLiveProof: { rows: 19, zeroCurrentRows: 6, badZeroRows: [] }`.
- `npm.cmd run ci:structural-fingerprint:check` passed with expected fingerprint `f282883abbab76cf`.
- `npm.cmd run test:baselines` passed: baseline regression reported all scenarios match.
- `git diff --check` passed.

## Determinism And Scope
Simulation sector-builder logic and the baked startup artifact changed. The new pass uses sorted iteration and stable tie-breaks; no randomness, timestamps, locale sorting, save schema, event mechanics, Srebrenica/Zepa event ownership, packaged installer artifact, or player decision content changed. Startup output changed intentionally to remove invalid duplicate same-faction edge ownership.

## Next Steps
- Monitor post-push CI until green.
- Continue the broader sector-builder/data audit for zero-assignment sectors as a separate task; this tranche fixes duplicate edge ownership and Army HQ proof parity.
