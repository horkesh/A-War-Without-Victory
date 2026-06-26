# P12 Player Truth Follow-up

**Date:** 2026-06-26  
**Branch:** `codex/p12-player-truth-followup`  
**Status:** Local implementation, broad local proof, manual in-app browser proof, branch push, and PR #455 creation complete; GitHub checks/merge closeout pending.

## Scope

P12 continues the Army HQ/sector/brigade information-quality sweep as a UI/read-model/test/docs packet. It does not reopen packaging, calibration, startup construction, scenario data, save schema, structural fingerprint artifacts, or Srebrenica/Zepa fall delivery. It does update the scenario baseline manifest narrowly for `apr1992_52w` `final_save.json` and the dependent `run_summary.json` hash because saved `turn_summaries[*].battles[*]` now preserve casualty provenance. Srebrenica/Zepa fall receipts remain event-owned.

## Implemented

- App-local stale selection ids now fail closed: Officer Matter modals no longer fall back to the first pending officer event, and Decision Room selected-card misses no longer open the first unrelated dossier.
- OOB ungrouped command rows are no longer executable corps headers: ungrouped headers do not select the first sorted brigade, and ungrouped rows do not expose an Order of Battle route. No-corps independent brigades remain inspectable through explicit individual field-inspection rows under that aggregate.
- Operation read models preserve sparse assessment truth: non-finite preparation, assessment, force-ratio, postponement, participant cohesion/personnel, and sector-intel confidence values remain unreported instead of becoming zero readiness.
- Operation phase labels now respect `phase_unreported` across OOB, Corps Detail, and Corps Front; sparse active operations render `Status pending` instead of false planning/execution truth.
- Turn summary compilation now carries battle casualty provenance. Raw attack-resolution casualties are used when present; otherwise brigade-history casualties are used; otherwise attacker/defender casualties remain `null` with `casualties_reported: false`.
- AAR, Army HQ sector recent engagements, Turn Aftermath, Chronicle generated entries, and Generals' Digest no longer convert missing casualty/displacement data into zero-cost truth. Sparse combat rows render `Casualties unreported` / `Unreported` and omit exact casualty metadata.
- Compact command-equipment summaries now distinguish partial condition reports from fully absent condition reports; CorpsCard equipment labels/tooltips no longer imply exact `0/N operational` when no equipment-condition source exists.

## Verification

- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd exec -- vitest run tests/attack_resolution_osid_intel_friction.test.ts tests/generals_digest_chronicle.test.ts tests/ui_map_game_state_adapter.test.ts tests/ui/decision_family_modals.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/command_drilldown_routing.test.ts tests/chronicle_entries.test.ts tests/ui/turn_aftermath.test.ts tests/ui/aar_panel_drilldown_routing.test.ts tests/ui/army_hq_sector_truth.test.ts tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed: 14 files / 342 tests.
- `npm.cmd run qa:player-journeys` passed: 43 files / 667 tests.
- `npm.cmd run qa:first-hour:browser` passed; generated `.tmp_first_hour_browser_gate` evidence was removed after inspection.
- `npm.cmd run qa:live-surface:browser` passed; generated `.tmp_live_surface_browser_sweep` evidence was removed after inspection.
- `npm.cmd run desktop:map:build` passed with existing non-fatal Vite externalization/chunk-size warnings.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified title screen, RBiH war-start splash, Army HQ, and 1st Corps Order of Battle drilldown with no visible error banners, no console errors, no raw Windows paths, and no visible `NaN` / `Infinity`.
- GitHub Event System CI baseline failure was reproduced locally. Parent/current artifact comparison showed only `apr1992_52w/final_save.json` and dependent `run_summary.json` changed; `activity_summary.json`, `control_delta.json`, `end_report.md`, `formation_delta.json`, `watched_operations.json`, and `weekly_report.jsonl` stayed byte-identical. The final-save structural diff is limited to `turn_summaries[*].battles[*]` casualty provenance (`casualties_reported` plus sourced raw defender casualties replacing prior zero fallbacks).
- `UPDATE_BASELINES=1 node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` refreshed only those two `apr1992_52w` manifest hashes.
- `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` passed after the narrow manifest refresh.
- Codex review follow-up for ungrouped OOB drilldown passed `npm.cmd exec -- vitest run tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` (12 tests) and `npm.cmd run typecheck -- --pretty false`.
- `git diff --check` passed with the existing CRLF normalization warning on `src/ui/map/utils/operations.ts`.

## Remaining Gates

- PR #455 is open. The actionable Codex thread on ungrouped OOB drilldown is addressed locally and still needs push/recheck/resolution. Inspect GitHub checks and any new Codex comments, merge only once green, then prune local/remote branch refs and confirm one clean worktree.

## Pyrrhic Roles

Noether/Hume audited stale ids and fallback-to-first behavior; Curie/Arendt audited operation readiness and phase truth; Turing/Hooke audited cost provenance. Their read-only reports were absorbed into this implementation and the agents were recalled.
