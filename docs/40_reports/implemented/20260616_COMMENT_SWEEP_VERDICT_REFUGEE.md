# Comment Sweep: Verdict Badge Scope and Refugee Surge Prior Week

**Date:** 2026-06-16  
**Type:** GitHub comment backlog hardening  
**Scope:** VerdictScreen snapshot fidelity test hook, refugee-flow Chronicle surge detection

## Summary

This slice closes two actionable Codex/GitHub comment findings identified during the CI wait:

- The endgame snapshot fidelity test counted every global `Failure` string, so selected-faction detail copy could satisfy the faction-tab badge assertion.
- Refugee-flow Chronicle surge detection compared each recorded turn to the previous recorded key, so missing zero-flow weeks made a later surge compare against stale nonzero flow instead of the actual prior week.

`VerdictScreen` now exposes a narrow `data-awwv-faction-tab-outcome` hook on faction-tab outcome badges, and the snapshot fidelity test counts only those badges. `refugeeFlowChronicle.ts` now compares surge flow against `turn - 1`, treating absent weeks as zero-flow weeks.

## Files

- `src/ui/map/components/VerdictScreen.tsx`
- `src/ui/map/components/chronicle/refugeeFlowChronicle.ts`
- `tests/ui/endgame_snapshot_verdict_fidelity.test.ts`
- `tests/refugee_flow_chronicle.test.ts`

## Verification

- Focused proof: `npx.cmd vitest run tests\ui\endgame_snapshot_verdict_fidelity.test.ts tests\refugee_flow_chronicle.test.ts --pool=forks --reporter=dot` -> 2 files / 28 tests passed.

## Calibration

No simulation logic, scenario data, save schema, baseline manifest, golden artifacts, or packaging outputs changed. The refugee change is a UI Chronicle read-model correction only; the source displacement state is unchanged.
