# Army Ops Drilldown and BCS Copy Polish

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Army HQ Operations planning details now render preparation timing and postponements as player-facing copy instead of `T+...` / `DELAYS` shorthand.
- OperationsPanel allocated brigade clicks now route through corps-preserving field inspection instead of dropping operation/corps context with a bare formation selection.
- BCS player-facing Game Over, Verdict, tooltip, and directive ambiguity copy no longer expose raw `OSID` terminology.

## Changes Made
### Army HQ Operations Copy
- Added localized preparation-timeline and postponement-count labels.
- Replaced visible planning shorthand with `Prepared for {elapsed} of {max} weeks` / `Delayed {count} times`.

### OperationsPanel Drilldown Context
- Allocated brigade buttons now use `inspectOnField(..., { kind: 'field-formation-in-corps' })`.
- The click closes the operations panel while preserving selected corps + selected formation context.

### BCS Player Copy
- Replaced raw BCS `OSID` text with player-safe `polozaj`, `naselje/naselja`, and `navedeni ciljevi` wording in targeted visible surfaces.
- Added regression assertions rejecting `\bOSID\b` in those BCS paths.

## Verification
- Red proof: focused tests first failed on `T+2 / 4`, `(! 2 DELAYS)`, and allocated-brigade bare selection.
- Focused green: `npm.cmd exec -- vitest run tests/ui/army_hq_timing_copy.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/game_over_i18n.test.ts tests/ui/endgame_interaction_proof.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 46/46.
- Typecheck: `npm.cmd run typecheck` passed.
- Diff hygiene: `git diff --check` passed.

## Scope / Determinism
- UI route/read-model behavior, i18n copy, focused tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue the remaining Pyrrhic polish queue with fresh scout tasks only after the pushed `main` head is green.
