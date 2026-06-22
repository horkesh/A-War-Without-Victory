# Sector Coverage Truth Alignment

## Summary

OOB and Corps Detail sector rows now classify coverage from current formation assignment before density bands. A sector with no current frontline, reserve, or command-directed brigades renders as uncovered coverage even if its saved `density` field is non-zero.

This closes the immediate player-facing contradiction where a command surface could say `0 on line` and `Dense coverage` in the same row.

## Implementation

- Added `getSectorCoverageTier(...)` in `src/ui/map/utils/sectorUtils.ts`.
- Updated `src/ui/map/components/OOBSidebar.tsx` to use the shared tier after `buildSectorFormationAssignment(...)`.
- Updated `src/ui/map/components/CorpsDetail.tsx` to use the same shared tier.
- Added focused regression coverage in `tests/ui/oob_drilldown_routing.test.ts` and `tests/ui/corps_detail_sector_truth.test.ts`.

## Audit Note

The baked April 1992 startup snapshot currently contains 70 sectors with no assigned or reserve brigades:

- RBiH: 35
- HRHB: 21
- RS: 14

That confirms the UI must present uncovered command slices honestly. It does not prove every zero-assignment sector is correct sector-builder output, so the separate sector-builder/data audit remains tracked in `docs/plans/2026-06-22-sector-truth-and-command-surface-polish-plan.md`.

## Verification

- Red proof: the focused test pack failed before the fix because OOB and Corps Detail rendered `Dense coverage` for zero-formation sectors.
- Green proof: `node node_modules\vitest\vitest.mjs run tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts --pool=forks --reporter=dot` passed 4/4.
- Adjacent command-surface proof: `node node_modules\vitest\vitest.mjs run tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 24/24.
- TypeScript: `npm.cmd run typecheck` passed.
- Live browser: `npm.cmd run qa:live-surface:browser` passed; `.tmp_live_surface_browser_sweep` was removed after cleanup verification.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario source data, event mechanics, startup snapshot, save schema, generated calibration artifact, structural fingerprint, golden manifest, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
