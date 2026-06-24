# 2026-06-24 - Safe Area Event Receipt Proof

## Summary

This test-only guard pins the current Srebrenica/Zepa fall ownership model:

- `srebrenica_falls_1995` writes the Srebrenica safe-area political-controller changes through event-owned control receipts with `mechanism: "event"`;
- `zepa_falls_1995` writes the Zepa political-controller change through the same event-owned receipt path;
- the proof deliberately leaves corps operations and operation history absent, so future work cannot reframe these falls as Krivaja/Stupcanica scripted-operation delivery without breaking the guard.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\events_evaluate.test.ts --pool=forks --reporter=dot` passed 1 file / 32 tests.

## Scope

Test/docs guard only. No simulation logic, event JSON, scenario source data, startup snapshot, save schema, generated calibration artifact, structural fingerprint artifact, baseline manifest, golden manifest, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.
