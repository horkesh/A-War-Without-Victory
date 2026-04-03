# 2026-04-03 - Army HQ threat labels player-safe

## Summary
- Hardened Army HQ threat assessment title generation so corps-front labels use player-safe corps naming even when raw formation names fall back to internal ids.
- Added a regression to the player-visibility suite so Army HQ threat titles cannot quietly drift back to strings like `arbih_3rd_corps front`.

## Why
- Threat assessment is a high-trust shell. If it leaks raw corps ids, the product reads like an engine tool instead of a command surface.
- This repo is especially vulnerable to “safe in most places, leaking in one summary generator” regressions, so the threat title builder needed the same player-safe text discipline as the rest of the shell.

## Files changed
- `src/ui/map/components/army_hq/generateThreatAssessment.ts`
- `tests/ui_player_visibility.test.ts`

## Implementation notes
- `generateThreatAssessment(...)` now resolves sector-to-corps labels through `getPlayerSafeCorpsName(...)` instead of trusting raw formation names.
- The regression test exercises the fallback path directly, proving the generated title says `3rd Corps front` and not `arbih_3rd_corps`.

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\ui_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- Army HQ threat titles stay in player-facing military language even when source data is messy.
- One more shell summary generator now obeys the same player-safe text contract as the rest of the mounted UI.
