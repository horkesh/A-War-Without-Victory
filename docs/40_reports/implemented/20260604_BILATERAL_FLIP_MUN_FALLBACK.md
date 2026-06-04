# Bilateral Flip Municipality Fallback

Date: 2026-06-04
Branch: `codex/issue-170-bilateral-flip-mun-fallback`
Base: `c7d35df6`
Type: Engine correctness fix for GitHub issue #170 P1

## Summary

War-phase `bilateral-flip-count-war` now derives a municipality id from canonical OSID-formatted `control_events[*].settlement_id` when `control_events[*].mun_id` is absent. This preserves valid RBiH-HRHB bilateral flip accounting for current producers such as paramilitary sweep events that emit a normal `op:<municipality>:<slug>` settlement id without duplicating `mun_id`.

The fallback is deliberately narrow: if a control event has neither `mun_id` nor a parseable OSID municipality component, it remains skipped. No external lookup, fuzzy matching, scenario data, save schema, event content, calibration tuning, or replay writer changed.

## Baseline Impact

`apr1992_52w` now records the OSID-only RBiH-HRHB flips that were previously dropped by the war-phase counter. Parent comparison at `c7d35df6` ended with `total_bilateral_flips: 6`; this branch ends with `total_bilateral_flips: 13`. The baseline manifest is refreshed for the resulting `apr1992_52w` `final_save.json` hash and the dependent `run_summary.json` final-state hash. All other `apr1992_52w` artifacts and both short scenarios remain unchanged.

## Verification

- Focused regression: `node node_modules\vitest\vitest.mjs run tests\alliance_lifecycle.test.ts --reporter=dot` passed 40/40.
- `npm.cmd run typecheck -- --pretty false` passed.
- Parent comparison: targeted `apr1992_52w` run at `c7d35df6` ended with `total_bilateral_flips: 6`; current run ends with `13`.
- Baseline refresh: `UPDATE_BASELINES=1 npm.cmd run test:baselines` updated only `apr1992_52w` `final_save.json` and `run_summary.json` hashes.
- Baseline verification: `npm.cmd run test:baselines` passed after the refresh.
- `git diff --check` passed.

## Issue #170 Status

This closes the P1 bilateral flip `mun_id` counting item. Issue #170 remains open for Ahmici same-turn hostile threshold, Chain 3 missing flags, enclave-resilience denominator decision, same-axis concentration support, Trnovo controlled waypoint preservation, TG anchor-only readiness decision, and HRHB Graz branch coverage.
