# General Surface Polish, Temp Cleanup, and PMTiles CI Hardening

Date: 2026-06-22

## Summary

Closed a general non-BCS polish batch from the Pyrrhic surface sweep. The work makes sector, brigade, formation, settlement, inbox, and ORBAT drilldowns more truthful and testable; removes tracked temporary scenario sweep fixtures from `data/scenarios`; and fixes the live browser gate failure where MapLibre could log unsupported `pmtiles://` fetch errors after map teardown.

This is UI/read-model/browser-QA/test/docs cleanup plus tracked temp-fixture removal. It does not resume packaged-installer work and does not change simulation logic, scenario source data, startup snapshots, calibration artifacts, or save schema.

## Changes

- Preserved corps context when routing `field-formation-in-sector` targets from map and ORBAT paths.
- Added stable panel selectors for Corps Front, Formation Detail, and Settlement Detail so live browser proof can assert exact sector, formation, and settlement identity across drilldowns.
- Made Formation Detail explicit when a brigade has no active sector assignment, and included `rear_brigade_ids` in sector lookup with a distinct rear/support role label.
- Added a player-safe `forming` lifecycle label instead of falling back to `Readiness pending`.
- Added corps-owner context to OOB sector rows and current-sector/no-sector context to ORBAT brigade rows.
- Standardized visible sector/ORBAT action copy from `Field` to `Inspect`.
- Limited the Presidential Inbox opening brief to turn zero and made the quiet capsule say when no record has been filed yet.
- Added startup snapshot guardrails for known active no-sector/forming exceptions so turn-zero truth stays explicit.
- Changed PMTiles protocol registration to a shared lifetime helper so one map cleanup cannot unregister the global `pmtiles` handler while another map or late tile request is still active.
- Removed tracked temporary scenario sweep fixtures under `data/scenarios/_tmp*`.

## Browser Proof

`qa:live-surface:browser` now proves the owner journey with identity continuity:

- clicked OOB sector id matches the landed Corps Front panel,
- clicked Corps Front brigade id matches Formation Detail,
- formation location OSID matches the settlement link,
- clicked settlement OSID matches Settlement Detail,
- settlement overview, municipality, and timeline tabs expose stable active-panel selectors.

## Verification

- `npm.cmd run typecheck` passed.
- Focused startup/formation/routing pack passed 35/35:
  `node node_modules\vitest\vitest.mjs run tests\startup_snapshot_contract.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot`
- Inbox regression pack passed 10/10:
  `node node_modules\vitest\vitest.mjs run tests\ui\inbox_dedup.test.ts --pool=forks --reporter=dot`
- `npm.cmd run qa:live-surface:browser` passed after the PMTiles fix and verified dev-server cleanup.
- `npm.cmd run qa:player-journeys` passed 254/254 after updating the ORBAT route contract to expect current-sector field inspection.

## Scope

UI/read-model/browser-QA/test/docs cleanup plus tracked temp-fixture removal only. No simulation logic, scenario source data, event mechanics, turn pipeline, save schema, startup snapshot, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Follow-Ups

- Ops modal validation copy still needs a structured warning-code pass so raw engine validator text stays internal.
- Decision Room memory/report counts should share a filed-record helper with Records instead of reading raw `turnSummaries.length`.
- Settlement timeline memo dependencies and Records focus assertions should be tightened in the next browser-proof tranche.
- Remaining English command-surface shorthand in officer/OOB/operation-planning rows should be batched separately.
