# Sector OOB Startup Truth

**Date:** 2026-06-23
**Baseline:** April 1992 startup sector rosters and shared command-surface read models after the command/canon field-context follow-up.
**Result:** Startup sector OOB truth is physically bucketed, rear/support-aware, and guarded by focused tests plus structural/baseline gates.

## Summary
- Implemented the systems/data scout lane for sector roster truth: forming/destroyed/non-fielded units no longer count as active sector strength.
- Removed the reserve-to-front fallback that could hide a reserve-only sector by inventing front coverage.
- Exposed rear/support sector membership through shared UI read models and command surfaces without inflating frontline density.

## Changes Made
### Sector Runtime
- Added `src/sim/combat/sector_roster_eligibility.ts` as the shared active-fielded tactical-formation boundary.
- Updated sector construction, assignment sync, assertions, and audit logic to use the shared boundary.
- Required physical bucket claims when syncing formation sector assignment roles: front from sector-front OSIDs, reserve from one-hop reserve band, and rear/support from sector territory.
- Kept `reserve_only_live_sectors` as an audit diagnostic while excluding it from the release-failure `ok` gate.

### UI Read Models
- Extended shared sector assignment helpers to carry `rearIds`.
- Surfaced rear/support counts in OOB, Corps Detail, Corps Front, Formation Detail, and Army HQ sectors.
- Preserved density/frontline counts as current front/reserve/override truth rather than letting rear/support inflate live-line coverage.

### Startup and Baselines
- Regenerated `data/derived/startup/apr_1992_initial_save.json`.
- Refreshed `data/calibration/structural_fingerprint_40w.json` and `data/derived/scenario/baselines/manifest.json`.

## Scenario Results
### Sector Truth Audit
- Saved audit: `reserve_only_live_sectors: 1`; all other release-gate counts zero; `ok: true`.
- Rebuilt audit: `reserve_only_live_sectors: 1`; all other release-gate counts zero; `rebuilt_ok: true`.

### Structural Fingerprint
- `npm.cmd run ci:structural-fingerprint:check` passed with `b9f5a40aa0a1726e`.

### Baseline Regression
- `npm.cmd run test:baselines` passed after manifest refresh.

## Lessons Learned
- A reserve-only sector is an important diagnostic, not a defect to mask with false front assignment.
- Sector read models need an explicit rear/support lane so command surfaces can be complete without mislabeling rear units as frontline strength.
- Startup contracts should test physical bucket membership directly, not only count-level parity.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/sector_roster_eligibility.ts` | Shared active-fielded tactical roster boundary |
| `src/sim/combat/brigade_assignment.ts` | Physical bucket sync for formation sector roles |
| `src/sim/combat/corps_front_sectors.ts` | Eligibility filtering and no reserve-to-front promotion |
| `src/sim/combat/sector_assertions.ts` | Rear-aware active-roster assertions |
| `src/sim/combat/sector_truth_audit.ts` | Reserve-only sector treated as diagnostic |
| `src/ui/map/utils/sectorUtils.ts` | Rear/support assignment read model |
| `src/ui/map/components/*` | Rear/support count visibility across command surfaces |
| `tests/startup_snapshot_contract.test.ts` | Physical front/reserve/rear bucket contracts |
| `tests/sector_truth_audit.test.ts` | Reserve-only diagnostic release-gate regression |
| `tests/ui*` | Rear/support UI parity coverage |
| `data/derived/startup/apr_1992_initial_save.json` | Regenerated startup artifact |
| `data/calibration/structural_fingerprint_40w.json` | Refreshed 40w fingerprint |
| `data/derived/scenario/baselines/manifest.json` | Refreshed baseline manifest |

## Next Steps
- Keep the remaining reserve-only live sector visible in diagnostics for future sector-builder classification review.
- Do not reopen Srebrenica/Zepa operation-delivery calibration from this lane; this work is sector/OOB startup truth only.
