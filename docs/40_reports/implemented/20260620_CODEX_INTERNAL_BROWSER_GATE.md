# Codex Internal Browser Gate

**Date:** 2026-06-20  
**Type:** UI/browser QA gate hardening  
**Branch:** `codex/codex-internal-browser-gate`

## Summary

`qa:live-surface:browser` now proves a real Codex internal drilldown instead of stopping at top-level reachability. The live sweep opens Codex through the toolbar, selects an unlocked/ghost essay row, verifies the selected essay body, records whether Dilemma Spine and Distance from History are visible, captures `codex_internal_selected_essay`, and keeps shell exclusivity plus raw-token checks active.

`CodexPanel` now exposes stable browser hooks for essay rows and the selected essay body:

- `codex-essay-row` with `data-essay-id`, `data-essay-year`, `data-awwv-codex-state`, and `data-selected`
- `codex-selected-essay` with selected essay metadata
- `codex-selected-essay-body` with selected unlocked/ghost state

## Verification

- Red proof first failed on the missing Codex internal live-sweep lane and missing selector hooks.
- `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/codex_panel_dynamic_mount.test.ts tests/ui/codex_panel_tier_graph.test.ts tests/ui/codex_panel_unlock_state.test.ts tests/ui/dilemma_spine.test.ts tests/ui/distance_from_history.test.ts --pool=forks --reporter=dot` passed: 6 files / 45 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed with `codexInternalDrilldown: true`, `codexDilemmaSpineVisible: true`, `codexDistanceFromHistoryVisible: true`, and port 3239 cleanup verified.
- `git diff --check` passed.

## Scope / Determinism

UI selector hooks, browser QA tooling, focused tests, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
