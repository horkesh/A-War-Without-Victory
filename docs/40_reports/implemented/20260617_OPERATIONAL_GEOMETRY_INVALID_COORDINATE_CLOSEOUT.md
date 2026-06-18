# Operational Geometry Invalid Coordinate Closeout

## Summary

Nietzsche's map-data sidecar traced the live Deck.gl `Skipping ... polygon with invalid coordinates` warnings to committed operational settlement geometry, not to the overlay builders. Several OSID MultiPolygon rows carried degenerate or too-short secondary parts, so damage and force-quality overlays correctly skipped them at render time.

**Supersession note (2026-06-18):** the geometry cleanup remains accepted, but the live post-side-coverage sector geometry barrier described below was rejected after 188w proof. Current mainline uses projection-only final-save sector repair with active structural fingerprint `f282883abbab76cf`; see `docs/40_reports/CALIBRATION_MASTER.md` for the live contract.

## Implementation

- Hardened `scripts/derive_operational_settlements.ts` so normalization drops invalid MultiPolygon parts and invalid/tiny holes instead of carrying them into `data/derived/operational/operational_settlements.geojson`.
- Re-normalized polygons after the shared-boundary snap pass, so snap-created degeneracy cannot reach the written artifact.
- Kept committed generator outputs reviewable by writing operational GeoJSON/contact graph JSON with stable indentation in both operational derivation scripts.
- Regenerated `operational_settlements.geojson`, `operational_contact_graph.json`, and `canonical_to_operational_map.json`.
- Added `tests/operational_settlement_geometry_integrity.test.ts`, which fails if any committed operational settlement polygon ring is non-finite, unclosed, too short, or degenerate.
- Added a post-side-coverage final sector geometry barrier in `buildCorpsFrontSectors(...)`, because the cleaned graph exposed a late final-save writer that could append edge coverage after the previous contiguity barriers.

## Artifact Delta

- Feature count stayed stable at 744.
- SID-to-OSID map key count stayed stable at 5,797.
- Invalid polygon parts dropped from 27 to 0.
- MultiPolygon feature count dropped from 67 to 48 after invalid secondary parts were removed.
- Operational contact graph edge count moved from 2,047 to 2,130 because the graph is regenerated from the cleaned geometry.
- The 40w structural fingerprint was deliberately re-blessed to `dbd82a4719719c55` after the cleaned contact graph plus final-sector seal hardening changed structural fields to HRHB 94 / RBiH 258 / RS 382, 122 control flips, and 30/30 anchors.
- The scenario baseline manifest was also deliberately refreshed because the cleaned contact graph and final-sector seal hardening change hashed 4w/52w scenario artifacts. A mapped 40w latest-save refresh was run; `data/derived/latest_run_final_save.json` now carries the contiguous final-sector truth.
- GitHub's Linux Event CI exposed one platform-sensitive baseline hash in `apr1992_52w/control_delta.json`. The simulation output was stable, but report ordering used `localeCompare`; replacing it with `strictCompare` made the control-delta report hash platform-neutral. The affected baseline hash is now `9950073118957a122a91f111d8bbcdb192e724ed593858a53a965a13b9a73c55`.

## Verification

- Red proof: `npx.cmd vitest run tests\operational_settlement_geometry_integrity.test.ts --pool=forks --reporter=dot` failed on the pre-regeneration artifact with 34 ring issues.
- Green proof: same command passed after regeneration.
- `npx.cmd vitest run tests\operational_settlement_geometry_integrity.test.ts tests\ui\osid_damage_overlay_coord_validity.test.ts tests\ui\force_quality_overlay_coord_validity.test.ts tests\osid_damage_overlay_builder.test.ts tests\force_quality_overlay_builder.test.ts tests\refugee_column_overlay_builder.test.ts tests\corridor_heartbeat_overlay_builder.test.ts --pool=forks --reporter=dot` -> 7 files / 37 tests passed.
- `npx.cmd vitest run tests\operational_contact_graph_shared_border_precision.test.ts tests\operational_data_osid.test.ts tests\integration_run_diagnostics.test.ts --pool=forks --reporter=dot` -> 3 files / 19 tests passed.
- `npm.cmd run typecheck` passed.
- Live browser smoke on `http://127.0.0.1:4201/tactical_map.html?dev=1` started an RS campaign, mounted map canvases, and produced no invalid-coordinate overlay warnings, page errors, or console errors.
- `npm.cmd run sim:scenario:run:40w` refreshed `data/derived/latest_run_final_save.json`; `npx.cmd vitest run tests\real_save_sector_truth_contracts.test.ts --pool=forks --reporter=dot` passed 5/5.
- `npm.cmd run ci:structural-fingerprint:update` refreshed the expected 40w fingerprint to `dbd82a4719719c55`; `npm.cmd run ci:structural-fingerprint:check` must pass before merge.
- `UPDATE_BASELINES=1 npm.cmd run test:baselines`; `npm.cmd run test:baselines`.
- After the first GitHub push, Event CI failed on Linux with `Baseline mismatch: scenario=apr1992_52w artifact=control_delta.json`; after the strict-order fix, local `npm.cmd run test:baselines` passed with the Linux hash.

## Scope

Map-data generation, committed operational artifacts, and final-sector serialization hardening only. No save schema, startup snapshot, 188w floor, packaging artifact, or new gameplay rule changed. The 40w structural fingerprint moved because the cleaned operational contact graph and stricter final-sector seal change map-driven 40w territorial/sector structure.
