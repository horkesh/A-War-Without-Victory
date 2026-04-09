# Harness Assignment-Completeness Validator Truth Hardening

**Date:** 2026-04-09
**Status:** COMPLETE
**Lane:** Harness assignment-completeness validator truth

## Seam

`tools/validate_run_consistency.cjs` still enforced a retired doctrine for brigade assignment completeness: if a corps had sectors, every brigade in that corps had to be assigned to some sector. That was broader than the live engine contract. The simulation already owned a narrower final truth surface in `state.military.unresolved_sector_brigades`, but the post-run validator reconstructed its own rule and emitted false failures.

The drift was visible on fresh 40-week proof run `n1397`: the validator failed three brigades even though the final save's canonical unresolved list was empty.

## Root Cause

- Canonical owner: final sector truth serialized in `military.unresolved_sector_brigades`
- Broken downstream owner: `tools/validate_run_consistency.cjs` check 3
- Retired doctrine: "every brigade in a corps with sectors must be assigned"
- Live doctrine: only brigades that the final sector builder classifies as unresolved should fail assignment completeness

This was a harness-truth bug, not a simulation bug. The final save was already honest; the validator was the stale authority.

## Implementation

Changed `tools/validate_run_consistency.cjs` so assignment completeness now reads canonical final unresolved truth instead of reconstructing a broader rule:

1. Added `collectAssignmentCompletenessIssues(state)` to consume `state.military.unresolved_sector_brigades`.
2. Refactored the script into `resolveRunInput(...)`, `validateState(...)`, and `main()` so the validator can be tested as a module while keeping the CLI contract intact.
3. Updated check 3 wording from "unassigned" to "unresolved" to match the real owner.
4. Added a regression test in `tests/validate_run_consistency.test.ts` proving that an interior brigade like `hrhb_travnik_brigade` no longer fails when the canonical unresolved set is empty, while a brigade explicitly listed in `unresolved_sector_brigades` still fails.

## Tests

Added a new regression suite:

- `tests/validate_run_consistency.test.ts`

It locks both sides of the contract:

- no false positive when a brigade is not canonically unresolved
- positive detection when the brigade is present in `unresolved_sector_brigades`

## Verification

### Targeted verification

- `npx.cmd vitest run tests/validate_run_consistency.test.ts`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`

### Full verification bar

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed after the fix.

## Proof

### Baseline on the same saved run

- Input run: `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`
- Command: `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`
- Result before fix: `FAIL`
- False failures:
  - `hrhb_travnik_brigade`
  - `rs_1st_podrinje`
  - `rs_5th_podrinje`

### Post-fix rerun on the same saved run

- Input run: `apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`
- Command: `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1397`
- Result after fix: `PASS`
- Check 3 output: `OK: 0 unresolved`

### Before/after difference

- Assignment completeness failures dropped from `3` false positives to `0`
- The validator now agrees with the final save's canonical unresolved truth instead of enforcing a broader retired doctrine
- No scenario rerun was required because this lane did not change simulation output; it corrected a downstream harness truth surface against an existing saved run

## Files

- `tools/validate_run_consistency.cjs`
- `tests/validate_run_consistency.test.ts`

## Residual Risks

- The remaining `cmd_arbih_1st_corps_t18` execution-quality seam in `n1397` is still open; this lane only removed a false harness failure around brigade assignment completeness.
- The military review shell coherence seam is still open in `App.tsx` / `WarroomStatusBar.tsx`.

## Follow-on

Best next bounded lane: operation execution-quality follow-up around `cmd_arbih_1st_corps_t18`, unless fresh parallel review proves the remaining work is now more redesign/tuning than substrate hardening.
