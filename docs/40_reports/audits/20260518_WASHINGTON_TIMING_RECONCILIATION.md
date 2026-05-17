# Washington Timing Reconciliation

Date: 2026-05-18
Lane: Batch 4 design/data follow-up
Scope: live RBiH-HRHB Washington predicate, calendar event `washington_agreement_1994`, turn-summary/AAR projection

## Decision

Keep two clocks and make the player-facing read model explicit:

- `political.rbih_hrhb_state.washington_signed` / `washington_turn` remains the emergent live-state predicate. In the current n1868 188w evidence it activates at turn 85 after `war_started_turn = 36`, `ceasefire_since_turn = 81`, and `WASH_CEASEFIRE_DURATION = 4`.
- `washington_agreement_1994` remains the formal historical/narrative milestone at week 102 in `data/scenarios/events/war_1994.json`.
- Do not retune `CEASEFIRE_RBIH_EXHAUSTION`, `CEASEFIRE_HRHB_EXHAUSTION`, or `WASH_COMBINED_EXHAUSTION` for this issue. Batch 3 proved exhaustion is saturated and not the binding cause of the turn-85/week-102 difference.
- Do not collapse the two clocks unless a future design explicitly decides that pre-March military effects are forbidden. Current canon and code already allow the live predicate and calendar event to have distinct semantics.

## Reconciliation Implemented

The ambiguity was in the turn-summary projection, not the Washington thresholds or scenario event data.

Before this pass, `compileTurnSummary(...)` emitted a `notable_events` row with `kind: "washington_agreement"` and description `Washington Agreement signed ...` when the live predicate cleared at turn 85. That made the AAR imply the formal historical event fired 17 weeks before the authored calendar event.

This pass changes only that live predicate row:

- New notable-event kind: `rbih_hrhb_framework_activated`
- AAR label: `RBiH-HRHB Framework`
- Description: `RBiH-HRHB federation framework activated - bilateral ceasefire and joint anti-RS coordination are live.`

The formal calendar event continues to appear only through `events_fired` when `washington_agreement_1994` fires at week 102.

## Files Changed

| File | Change |
|---|---|
| `src/state/turn_summary.ts` | Added `rbih_hrhb_framework_activated` as a distinct live-state notable-event kind. |
| `src/sim/compile_turn_summary.ts` | Replaced the turn-85 live predicate AAR row with the framework-activation wording. |
| `src/ui/map/components/AARPanel.tsx` | Added the AAR label for the new notable-event kind. |
| `tests/compile_turn_summary_washington_timing.test.ts` | Regression test proving live predicate activation does not claim the calendar Washington event fired. |
| `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md` | Marked the Batch 4 Washington lane implemented/reconciled. |
| `docs/plans/MASTER_ROADMAP.md` | Updated the Batch 4 status line. |
| `docs/PROJECT_LEDGER.md` and `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Recorded the output-contract decision and durable lesson. |

## Verification

- RED: `npx.cmd vitest run tests\compile_turn_summary_washington_timing.test.ts` failed because the old output was `kind: "washington_agreement"` with formal signing prose.
- GREEN: `npx.cmd vitest run tests\compile_turn_summary_washington_timing.test.ts` passed after the projection change.
- Focused Washington/alliance suite: `npx.cmd vitest run tests\compile_turn_summary_washington_timing.test.ts tests\alliance_lifecycle.test.ts tests\washington_joint_pressure.test.ts` passed, 43/43 tests.
- 40w scenario: `npm.cmd run sim:scenario:run:40w` produced `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1877` with final hash `42607f83870e01d5`, 27/27 anchors, and 6/6 bot benchmarks.
- Consistency: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1877` passed.
- `git diff --check` passed with existing CRLF normalization warnings only.
- Broader checks blocked by unrelated/sibling-lane failures:
  - `npx.cmd vitest run tests\compile_turn_summary_washington_timing.test.ts tests\alliance_lifecycle.test.ts tests\washington_joint_pressure.test.ts tests\event_timeline_integrity.test.ts` failed only in `tests/event_timeline_integrity.test.ts`: `war_1992.json` ordering around `embargo_croatia_transit_1992` and event count 115 vs expected 113.
  - `npm.cmd run typecheck` failed in `tests/sim/events/dismiss_notifications.test.ts`, a notification-dismiss fixture outside this Washington lane.

## Next Steps

- If future design wants the live mechanical effects to wait until the formal March 1994 event, create a separate plan to gate `applyWashingtonEffects(...)` on calendar milestone truth and rerun 188w. That is a behavior retune, not a cleanup.
- If future UI needs both live and historical items in the same AAR week, preserve the channel split: live predicates belong in `notable_events`; authored historical milestones belong in `events_fired`.
