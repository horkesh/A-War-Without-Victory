# Operation History Decision Sector Polish

**Date:** 2026-06-24
**Branch:** `codex/operation-history-decision-polish`
**Baseline:** `a3d009ab4`
**Result:** Implemented and locally verified through focused UI proof, TypeScript, player journeys, and browser gates

## Summary

- Closed the follow-up scout slice from the previous operation-panel report: missing AAR grades, raw AAR axis labels, empty objective-chain copy, Decision Room opportunity recommendation copy, opportunity authorization routing, sector inspect anchors, and missing brigade/formation/reserve metric truth.
- Kept the batch UI/read-model/routing/test/docs only. No simulation logic, scenario source data, startup artifact, save schema, event evaluator mechanics, calibration floor, baseline manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaging artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Changes Made

- Operation History and Army HQ completed-operation reviews now preserve absent AAR grades as `Grade unreported` instead of inventing a one-star `Unknown` verdict.
- Operation History axis names fall back to neutral `Axis N` copy when raw/internal labels reach the UI, and missing objective chains render as unreported rather than `0/0`.
- Decision Room operation-opportunity cards render structured staff recommendation copy instead of raw enums, suppress inline authorization when a review id is missing, and route approval through `resolveOperationOpportunityDecision({ reviewId, proposalId, decision: 'approve' })`.
- Army HQ sector inspect controls now preserve a deterministic field OSID anchor from sector sub-segments when opening `field-sector-in-corps`.
- BrigadeRow, FormationDetail, and ArmyReservePanel now preserve missing cohesion, fatigue, lifecycle/readiness, and reserve personnel as unreported/neutral presentation rather than zero or bad-readiness indicators.

## Verification

- Focused proof passed 8 files / 195 tests:
  `node node_modules\vitest\vitest.mjs run tests\ui\operation_aar_records_review.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\directive_card_stop_op_action.test.ts tests\ui\brigade_row_supply_labels.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\army_reserve_elite_commander.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 562 tests.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed with an extended local timeout; the first shorter run produced `ok: true` evidence but was killed during/after cleanup.
- `git diff --check` passed.
- Previous `main` head `a3d009ab4` is green on GitHub across Event System CI, Desktop Release Guard, Baseline Regression, and Full Suite + Structural Fingerprint.

## Follow-Up Queue

- Continue the broader polish plan with fresh scout work against non-BCS general surfaces: sector/brigade parity, operation-history edge cases, Army HQ ergonomics, Decision Room ownership, and live browser interaction quality.
- Keep batching substantial, related UI/read-model slices before GitHub verification to avoid burning 20+ minute CI runs on small packets.
