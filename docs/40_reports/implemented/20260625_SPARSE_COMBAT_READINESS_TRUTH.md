# Sparse Combat And Readiness Truth

Date: 2026-06-25
Branch: `codex/hq-decision-live-polish`

## Summary

Closed the next Pyrrhic sparse-truth findings from live browser review and Raman's Army HQ/player-surface audit. Combat summaries, effectiveness, Force Readiness, and OOB cohesion now distinguish absent staff records from reported zeroes.

## Implemented

- `GameStateAdapter` records which direct `combat_summary` fields were source-reported.
- `CombatSummaryPanel` renders missing win-rate, casualty, exchange-ratio, ground, brigade-count, and peak-personnel fields as `Unreported`.
- Brigade, corps, and sector effectiveness displays suppress exact combat-effectiveness values when grade-critical fields are incomplete.
- Force Readiness and aggregate effectiveness no longer count missing personnel as an ineffective brigade.
- OOB CorpsCard average cohesion renders unreported when no subordinate reports cohesion.
- Army HQ collapsible section controls expose `aria-expanded` and stateful visible glyphs.
- Event decision historical-default source notes strip terminal punctuation before appending localized source punctuation.

## Verification

- `node node_modules\vitest\vitest.mjs run tests/ui_map_game_state_adapter.test.ts tests/ui/combat_effectiveness_sparse_data.test.ts tests/ui/army_hq_readiness_threat_copy.test.ts tests/ui/gui_audit_label_discipline.test.ts tests/ui/event_decision_modal_phase3.test.ts tests/ui/corps_detail_sector_truth.test.ts --pool=forks --reporter=dot`
  - Passed: 6 files / 111 tests
- `npm.cmd run typecheck -- --pretty false`
  - Passed

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, event evaluator mechanics, startup snapshot, save schema, calibration, baseline/golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaging artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Follow-Up Queue

Vitezoci's decision-routing audit remains queued for the next branch: advisory event-decision blocking, autonomy proposal Decision Room routing, operation-opportunity inbox/dossier convergence, Army HQ attention handoff copy, and operation-opportunity desk imagery.
