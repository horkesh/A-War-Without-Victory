# P7 Player Polish Batch

**Date:** 2026-06-26

**Branch:** `codex/p7-player-polish-batch`

**Merge:** PR #450 to `main` at `7204cffca`.

## Summary

Continued the Army HQ / sector / brigade information-quality sweep as a substantial owner-playthrough polish batch. The packet focuses on sparse-source truth, stale-count removal, and map projection honesty across player-facing command surfaces.

- Supply Panel and Tactical Card sparse records now render missing reserves, personnel, cohesion, fatigue, and command metrics as `Unreported` instead of invented zeroes or favorable health.
- OOB and Formation Detail now preserve missing operation supply readiness, command span, exhaustion, home-distance personnel, and elite-loan destination fields as unreported player truth.
- Formation counters no longer draw a full health bar when the authorized strength denominator is absent; the icon payload carries `hunreported` and omits the bar.
- Ghost-map ethnicity layers require complete Bosniak/Serb/Croat/Other census rows before rendering majority truth.
- Presidential Attention and Decision Room manifest counts now use live required decision/review rows instead of stale aggregate queue metadata.
- Personnel now distinguishes an absent officer-roster source from an empty reported roster. Missing source rows show `Officer roster source is unreported`; explicit empty rosters remain empty.
- Operations-mode effort paint now uses the live `buildSectorFormationAssignment(...)` fielded line-holder projection and skips stale, forming, destroyed, and reserve-only roster ids.

## Verification

Focused/local proof completed before documentation closeout:

- `npm.cmd exec -- vitest run tests/ui/oob_operations_panel.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/supply_fallbacks.test.ts tests/ui/tactical_card_sparse_truth.test.ts tests/ui_map_render_smoke.test.ts tests/ui/army_hq_timing_copy.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_map_ethnic_truth.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui_map_operations_mode.test.ts tests/ui/decision_consequence_records_panel.test.ts tests/ui/records_button_behavior.test.ts tests/ui/chronicle_focus_routing.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` passed 14 files / 211 tests.
- `npm.cmd run qa:player-journeys` passed 43 files / 639 tests on the existing player-journey gate after the sparse-truth changes.
- `npm.cmd run typecheck -- --pretty false` passed after the Personnel source-truth narrowing fix.
- `npm.cmd exec -- vitest run tests/ui/personnel_player_safe_display.test.ts --pool=forks --reporter=dot` passed 16 tests after the final narrowing fix.
- `npm.cmd run qa:first-hour:browser` passed with tileless browser proof and dev-server cleanup.
- `npm.cmd run qa:live-surface:browser` passed with tileless browser proof and dev-server cleanup.
- `npm.cmd run desktop:map:build` passed; existing Vite browser-externalization and chunk-size warnings remain non-fatal.
- `git diff --check` passed with only expected CRLF normalization warnings for existing Windows-touched files.
- GitHub PR checks passed across Event System validation, Desktop Release Guard, desktop packaged runtime probe, Baseline Regression (`typecheck`, `test`, `scenario-anchors`, `scenarios`, `engine-health-188w` green-fast), structural fingerprint, and Full Suite.

Generated browser/vitest evidence folders were removed after verification; `.tmp_dev_server` remains only for the active local browser session.

The local/remote feature refs were deleted/pruned after merge, all scout agents were closed after report absorption, and the repo returned to one clean `main` worktree.

## Scope

UI/read-model/map projection/rendering/test/docs polish only. No simulation logic, event evaluator mechanics, scenario data, startup artifact, save schema, baseline/golden manifest, structural fingerprint artifact, calibration, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted simulation output changed.
