# P12 Player Truth Follow-up

**Date:** 2026-06-26  
**Branch:** `codex/p12-player-truth-followup`  
**Status:** Merged to `main` through PR #455 at `d47736be6`; GitHub checks green; local/remote branch refs pruned; temp evidence cleaned.

## Scope

P12 continues the Army HQ/sector/brigade information-quality sweep as a UI/read-model/test/docs packet. It does not reopen packaging, calibration, startup construction, scenario data, save schema, structural fingerprint artifacts, scenario baselines, or Srebrenica/Zepa fall delivery. Srebrenica/Zepa fall receipts remain event-owned.

## Implemented

- App-local stale selection ids now fail closed: Officer Matter modals no longer fall back to the first pending officer event, and Decision Room selected-card misses no longer open the first unrelated dossier.
- OOB ungrouped command rows are no longer executable corps headers: ungrouped headers do not select the first sorted brigade, and ungrouped rows do not expose an Order of Battle route. No-corps independent brigades remain inspectable through explicit individual field-inspection rows under that aggregate.
- Operation read models preserve sparse assessment truth: non-finite preparation, assessment, force-ratio, postponement, participant cohesion/personnel, and sector-intel confidence values remain unreported instead of becoming zero readiness.
- Operation phase labels now respect `phase_unreported` across OOB, Corps Detail, and Corps Front; sparse active operations render `Status pending` instead of false planning/execution truth.
- AAR, Army HQ sector recent engagements, Turn Aftermath, Chronicle generated entries, and Generals' Digest no longer convert missing casualty/displacement data into zero-cost truth. Sparse combat rows render `Casualties unreported` / `Unreported` and omit exact casualty metadata through UI/read-model compatibility guards without changing persisted turn-summary shape.
- Compact command-equipment summaries now distinguish partial condition reports from fully absent condition reports; CorpsCard equipment labels/tooltips no longer imply exact `0/N operational` when no equipment-condition source exists.

## Verification

- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd exec -- vitest run tests/attack_resolution_osid_intel_friction.test.ts tests/generals_digest_chronicle.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui/decision_family_modals.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/command_drilldown_routing.test.ts tests/chronicle_entries.test.ts tests/ui/turn_aftermath.test.ts tests/ui/aar_panel_drilldown_routing.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed: 14 files / 340 tests after the persisted turn-summary/schema/baseline experiment was removed from this PR.
- CI strict-null repair proof passed `npm.cmd exec -- vitest run tests/strict_null_inventory_progress.test.ts --pool=forks --reporter=dot` (91 tests) and the related focused pack `tests/ui/aar_panel_drilldown_routing.test.ts tests/ui/army_hq_sector_truth.test.ts tests/strict_null_inventory_progress.test.ts` (3 files / 102 tests) after removing two `as unknown` compatibility casts.
- `npm.cmd run qa:player-journeys` passed: 43 files / 667 tests.
- `npm.cmd run qa:first-hour:browser` passed; generated `.tmp_first_hour_browser_gate` evidence was removed after inspection.
- `npm.cmd run qa:live-surface:browser` passed; generated `.tmp_live_surface_browser_sweep` evidence was removed after inspection.
- `npm.cmd run desktop:map:build` passed with existing non-fatal Vite externalization/chunk-size warnings.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified title screen, RBiH war-start splash, Army HQ, and 1st Corps Order of Battle drilldown with no visible error banners, no console errors, no raw Windows paths, and no visible `NaN` / `Infinity`.
- The original PR attempted a persisted turn-summary casualty-provenance change and narrow `apr1992_52w` manifest refresh. That was reverted before closeout to keep P12 UI/read-model scoped and avoid coupling player-surface polish to scenario baseline movement.
- GitHub `engine-health-188w` failure was reproduced locally on the PR head and then on a clean same-machine `main` control after the standard CI startup-snapshot build sequence. Both produced the same stale floor tuple, `matched_osids=609` and `consistency_failures=36`, against the required `>=658` / `<=6` gate. The failure is therefore a pre-existing current-main floor mismatch exposed by the earlier sim/state touch, not caused by the final P12 UI/read-model changes.
- Codex review follow-up for ungrouped OOB drilldown passed `npm.cmd exec -- vitest run tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` (12 tests) and `npm.cmd run typecheck -- --pretty false`.
- `git diff --check` passed.

## Remaining Gates

- Closed. PR #455 merged after green GitHub checks across Event System validation x2, Desktop Release Guard, desktop packaged runtime probe, Baseline Regression (`typecheck`, `test`, `scenario-anchors`, `scenarios`, and `engine-health-188w`), structural fingerprint, Typecheck, and Full Suite. The actionable Codex thread on ungrouped OOB drilldown was addressed and resolved before merge. Local cleanup leaves one clean `main` worktree, no local `codex/*` branches, and no local `runs/eh_local_*` evidence folders.

## Pyrrhic Roles

Noether/Hume audited stale ids and fallback-to-first behavior; Curie/Arendt audited operation readiness and phase truth; Turing/Hooke audited cost provenance. Their read-only reports were absorbed into this implementation and the agents were recalled.
