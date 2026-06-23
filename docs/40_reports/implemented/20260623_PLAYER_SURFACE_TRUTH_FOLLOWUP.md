# 2026-06-23 - Player Surface Truth Follow-up

## Summary

Closed the next non-packaging player-surface polish packet from the Pyrrhic scout tranche. Settlement stationed-unit lists now mean physical fielded presence, while a separate helper preserves area-of-responsibility coverage semantics for future surfaces. Sector stance/source fields now remain unreported when absent instead of defaulting to favorable `defend` / `bot` values. Sector entrenchment summaries now derive from current fielded assignment truth, including valid command-directed overrides, instead of stale saved sector rosters.

OOB faction headers now expose the Army summary action and the expand/collapse action as sibling controls, removing a nested interactive-control defect. Endgame verdict active-brigade counts now use the shared fielded tactical-formation boundary so active-but-forming or destroyed units do not inflate standings. The local player-journey release gate now includes the fast first-hour, decision-history, chronicle, visibility, map tooltip, readiness, personnel, supply, accessibility, and verdict-count guards that Pyrrhic QA identified as relevant to this polish lane. The branch also absorbs the pushed `main` Baseline Regression failure by updating stale `ORBAT` tab selectors to `Order of battle`.

## Verification

- Focused red/green proof covered stationed-vs-coverage unit semantics, missing sector stance, current assignment entrenchment, OOB nested-control regression, verdict fielded counts, and Corps Front tab selector routing.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 41 files / 474 tests after the gate expansion.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- `git diff --check` passed.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, startup artifact, event mechanics, turn pipeline, save schema, Srebrenica/Zepa event ownership, calibration floor, structural fingerprint, baselines, golden manifests, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
