# Army HQ Internal Browser Gate

**Date:** 2026-06-20
**Run ID:** n/a
**Baseline:** `main` at `6a804cdcd` after counteroffer/personnel/autonomy copy polish
**Result:** Live browser QA now clicks through Army HQ internal tabs and a corps card back face

## Summary
- Extended `qa:live-surface:browser` beyond top-level Army HQ reachability.
- The sweep now opens Army HQ Summary, Personnel, and the first corps card back face before continuing the owner journey.
- Added stable Army HQ corps-card test hooks so browser QA can prove the card front/detail path without brittle text matching.

## Changes Made

### Live Browser Gate
- Added `runArmyHqInternalDrilldown(...)` to `tools/ui/live_surface_browser_sweep.cjs`.
- The new step proves Summary tab selection, Personnel dossier reachability, corps-card detail reachability, shell exclusivity, and raw-token absence.
- Evidence now records `armyHqInternalDrilldown: true` plus screenshots for `army_hq_internal_summary`, `army_hq_internal_personnel`, and `army_hq_internal_corps_card`.

### UI Hooks
- Added `data-testid="army-hq-corps-card"` to the Army HQ corps-card front button.
- Added `data-testid="army-hq-corps-card-detail"` to the card back face.

### Contract Test
- Extended `tests/ui/first_hour_browser_gate_contract.test.ts` so the live-sweep function, evidence keys, screenshot ids, and Army HQ card hooks remain pinned.

## Verification
- Red contract proof first failed on missing `runArmyHqInternalDrilldown` and `army-hq-corps-card` hooks.
- First live run exposed an over-specific optional campaign-cost assertion; second exposed that healthy command relationships intentionally render silent. The gate now checks stable first-hour Summary and card-back content.
- `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` passed: 1 file / 6 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed with `armyHqInternalDrilldown: true`, `ownerJourneyDrilldown: true`, and port 3239 cleanup verified.
- `git diff --check` passed.

## Scope And Determinism
- Browser QA tooling, stable UI selectors, focused tests, and docs only.
- No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Use Copernicus' next raw-copy finding for a separate AAR Records branch: decoration tier ids and formation arc-state ids in `AARPanel`.
