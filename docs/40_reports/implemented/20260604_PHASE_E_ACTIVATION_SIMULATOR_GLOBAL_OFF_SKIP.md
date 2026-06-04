# Phase E Activation Simulator Global-Off Skip

Date: 2026-06-04
Branch: `codex/issue-170-phase-e-off-skip`
Base: `1bdb8e83`
Type: Diagnostic-tool fix for GitHub issue #170 P2

## Summary

`tools/diagnostics/phase_e_activation_simulator.ts` now skips Tier 2 scenario execution when `--combo global_off --run-scenarios` leaves no ON combos to compare. It resets Phase E gate overrides and returns `tier2.runs: []` instead of running the OFF scenario pass.

No simulation mechanics, scenario data, sector files, event JSON, cache/fingerprint behavior, command model, save schema, calibration tuning, replay writer, or baseline manifest changed.

## Verification

- Red regression: the new focused test failed before the fix with observed runner calls `['global_off']`.
- Green focused file: `node node_modules\vitest\vitest.mjs run tests\phase_e_activation_simulator.test.ts --reporter=dot` passed 24/24.
- CLI smoke: `node node_modules\tsx\dist\cli.mjs tools\diagnostics\phase_e_activation_simulator.ts --combo global_off --run-scenarios --json` returned `tier2.runs: []`.
- `npm.cmd run typecheck -- --pretty false` passed.
- `git diff --check` passed.

## Issue #170 Status

This closes the P2 diagnostic-tool item from issue #170. The broader issue remains open for non-diagnostic engine/content/domain-decision items.
