# Military Credibility No-Data Consumer

**Date:** 2026-06-04
**Run ID:** N/A
**Baseline:** Current `origin/main` after PR #173 / #175
**Result:** No-data `military_credibility` no longer tightens commander operation launch floors.

## Summary
- Fixed the PR #173 follow-up where `military_credibility = 25` derived from no operation/casualty evidence could be consumed as actual low credibility.
- Preserved the default-off flag behavior and kept evidenced low credibility active when the faction has operation or casualty records.
- Synced the stale command-board row that still described `patron_confidence + military_credibility` consumers as unbuilt.

## Changes Made
### Combat Consumer
- `buildBriefing(...)` now surfaces `political_dimensions.military_credibility` only when the faction's negotiation capital has operation or military casualty evidence.
- The strategic dimension value itself is unchanged; the guard is only at the op-launch briefing consumer boundary.

### Tests
- `tests/phase_e_military_credibility_caution_bias.test.ts` now distinguishes evidenced low credibility from no-data low credibility.
- The regression proves that gate-on `military_credibility = 25` with zero operations and zero casualties is omitted from the launch briefing.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/commander/briefing.ts` | Adds evidence gating before briefing-level military credibility propagation. |
| `tests/phase_e_military_credibility_caution_bias.test.ts` | Adds no-data regression and makes low-credibility fixtures evidenced. |
| `docs/plans/COMMAND_BOARD.md` | Closes the stale unbuilt consumer row and records the no-data follow-up. |

## Verification

- Red first: focused credibility regression failed with `expected 25 to be undefined` before the consumer guard.
- Focused branch pack: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\phase_e_military_credibility_caution_bias.test.ts tests\phase_e_patron_confidence_ops_hesitation.test.ts tests\sector_offensive.test.ts tests\scenario_run_output_artifact_ownership.test.ts tests\generated_artifact_ownership_matrix_contract.test.ts --reporter=dot` passed 40/40.
- Typecheck: `npm.cmd run typecheck -- --pretty false` passed.
- Baseline regression: `npm.cmd run test:baselines` passed with all scenarios matching.
- Whitespace check: `git diff --check` passed.

## Next Steps
- Parent integration should run the broader Phase E / commander test pack and baseline checks before any flag activation.
- No canon text was changed here; the only semantic clarification is consumer evidence gating for a default-off extension.
