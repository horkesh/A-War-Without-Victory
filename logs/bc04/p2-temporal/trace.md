# BC04 P2 temporal receipt trace

Scope: source trace plus one isolated real-function fixture at HEAD
`f117fe47536398add3a966d177b3dce54fc820ac`. No production or test file was
changed and no campaign was run. `historical-targets.md` is the independent
historical input; this report measures engine and UI semantics.

## Established semantics

1. `runTurn` clones the incoming state and increments `meta.turn` before any war
   phase (`src/sim/turn_pipeline.ts:72-79,134-145`). Therefore an advance from
   stored turn `N-1` executes and records turn `N`.
2. The war phase updates readiness, then evaluates events using that incremented
   turn (`src/sim/turn_phases/war_phases.ts:1049-1061`). A fired event is appended
   to the evaluator report at `evaluate_events.ts:579-605`; once-only receipt
   identity and `event_last_fired_turn` are written at `:774-801`.
3. The end-of-turn summary writes `turn = state.meta.turn` and copies
   `report.events_fired` (`src/sim/compile_turn_summary.ts:69-91`). The scenario
   loop calls `runTurn`, adopts `nextState`, and records `week_index` beside the
   resulting state turn (`src/scenario/scenario_runner.ts:2535-2538,2606-2637,
   2722-2725`). Its own checkpoint comment defines `week_index` as zero-based and
   elapsed weeks as `week_index + 1` (`:3121-3126`). For the base campaign,
   receipt `tN` is runner `week_index N-1`.
4. The tactical-map adapter takes the summary turn unchanged for historical
   events (`src/ui/map/data/GameStateAdapter.ts:3208-3229`) and for fired-event
   records (`:3685-3727`). Chronicle entries likewise take `summary.turn`
   unchanged (`src/ui/map/components/chronicle/generateChronicleEntries.ts:
   555-608`). Chronicle renders that number with `turnToDateString`
   (`ChronicleOverlay.tsx:592-617`), whose epoch formula is 6 Apr 1992 plus
   `turn * 7` (`src/ui/map/utils/formatters.ts:8-16`). The settlement timeline
   does the same (`SettlementTimeline.tsx:24-25,63-70`). These are actual event
   chronology consumers, not only the current-date toolbar.

Consequently, a receipt at raw `tN` is produced while closing the simulated
interval from `date(tN-1)` through the day before `date(tN)`. The post-advance UI
state and present chronology labels show the boundary date `date(tN)`. For
example, `t171` is runner `week_index 170`, closes **10-16 Jul 1995**, and is
currently labeled **17 Jul 1995**.

This interpretation is established by the call/write/read chain above. Calling
that interval the historical occurrence week is an inference from the engine's
pre-increment and after-action-summary design; no persisted field explicitly
stores interval start/end.

## `requires_events` ordering

Both readiness and eligibility read `fired_event_ids` before event firing:

- `updateEventReadiness` checks `requires_events`, then accrues/decays once
  (`src/sim/events/pressure_system.ts:22-58`).
- `triggerMatches` checks the same receipt set (`src/sim/events/event_types.ts:
  711-725`).
- `evaluateEvents` collects every candidate before Phase 3 applies flags/effects
  and appends once-only receipts (`src/sim/events/evaluate_events.ts:503-527,
  573-605,774-801`).

Thus a dependent cannot observe an upstream receipt written later in the same
evaluation. Catalog ordering or `priority` cannot change eligibility already
collected. A non-pressure dependent can fire on the next turn. A pressure
dependent begins readiness on the next turn.

The fixture loads the live catalog and runs the real `updateEventReadiness` and
`evaluateEvents` functions while stripping unrelated mechanical effects. It
measured:

| Candidate | Readiness / receipts |
|---|---|
| Srebrenica `turn_min:169`, live 3.5 rate | t169 3.5; t170 7.0; t171 10.5 and fires |
| Column `turn_min:171`, requires Srebrenica | blocked at t171; fires t172 |
| Zepa unchanged, live 3/6 pressure | t172 3; t173 6 and fires |
| Markale II `turn_min:177`, live 3.3 rate | t177 3.3; t178 6.6 and fires |
| Deliberate Force `turn_min:178`, requires Markale | blocked at t178; fires t179 |

Evidence: `temporal_fixture.ts`, `fixture-output.json`, empty
`fixture-stderr.log`; command exit 0 in `commands.txt`. The existing n392
artifact independently measures the same one-turn prerequisite lag in a real
campaign: Srebrenica/column `162/163`, Markale/Deliberate Force `170/171`, and
Srebrenica/Zepa `162/164` (`../n392-summary.json`).

## Candidate tuple and contradiction

With current engine semantics, the catalog-only packet cannot retain the two
ratified same-week pairs while preserving their receipt prerequisites:

| Receipt | Desired raw turn | Runner week_index | Completed interval | Current UI label |
|---|---:|---:|---|---|
| Tuzla Gate | 164 | 163 | 22-28 May 1995 | 29 May 1995 |
| UN hostage crisis | 164 | 163 | 22-28 May 1995 | 29 May 1995 |
| Srebrenica fall | 171 | 170 | 10-16 Jul 1995 | 17 Jul 1995 |
| Column departure | 171 | 170 | 10-16 Jul 1995 | 17 Jul 1995 |
| Zepa | 173 | 172 | 24-30 Jul 1995 | 31 Jul 1995 |
| Markale II | 178 | 177 | 28 Aug-3 Sep 1995 | 4 Sep 1995 |
| Deliberate Force | 178 | 177 | 28 Aug-3 Sep 1995 | 4 Sep 1995 |

The earlier catalog-only candidate yields column `t172` and Deliberate Force
`t179`, each one completed week late. Moving each upstream one turn earlier
makes its own dated occurrence one week early. Removing prerequisites (and the
column's `srebrenica_fell` condition) permits co-dating but makes the sensitive
dependent receipts independently fireable; duplicating upstream conditions is
still parallel correlation rather than the authored receipt causality. Folding
each pair into one row destroys the distinct receipt IDs used by Codex and
downstream gates. None is a coherent catalog-only correction.

## Smallest coherent proposal (requires owner authorization)

Add one explicit event-definition opt-in, e.g.
`same_turn_requires_events: true`, only to
`srebrenica_column_breakout_1995` and `nato_deliberate_force_1995` in
`data/scenarios/events/war_1995.json`. Keep their existing `requires_events`
and conditions. In `evaluateEvents`, after the ordinary `toFire` loop completes,
perform exactly one canonical collection-and-fire wave over unprocessed opted-in
rows against the now-updated receipt/flag state.

Bound the contract in `event_types.ts` and `event_loader.ts`: the field must be a
boolean; `true` requires a non-empty `trigger.requires_events`, `once:true`, no
`pressure`, and no response options. This confines it to deterministic automatic
follow-up receipts. The second wave is collected as a snapshot before it fires,
so opted-in chains do not recursively cascade. Do not call
`updateEventReadiness` again; pressure remains exactly once per turn. Existing
rows and default evaluator behavior remain unchanged.

The P2 data tuple becomes: Tuzla `160->164`; hostage window `160-163->164-167`;
Srebrenica `160->169`; column `160->171` plus the opt-in; Zepa unchanged;
Markale II `165->177`; Deliberate Force `165->178` plus the opt-in. Preserve all
maxima, effects, initial control, the Zepa backstop 160, operations, and 188-week
floors.

For occurrence display, leave the epoch and stored turn untouched. Add a shared
`turnToCompletedWeekRange(turn)` formatter and use it at the receipt chronology
readers traced above: Chronicle date groups, Settlement historical-event date
groups, and the fired-receipt date in
`DecisionConsequenceRecordsPanel.tsx:264-269`. It should render `t171` as
`10-16 Jul 1995` and `t178` as `28 Aug-3 Sep 1995`; current-state headers may
continue to show the post-advance boundary date. This is a read-model correction
with no save/schema/epoch mutation.

Proposed focused checks:

- `tests/events_evaluate.test.ts`: opted-in dependent fires after its upstream in
  the same report; non-opted dependent retains next-turn behavior; missing
  upstream blocks; one snapshot wave prevents a third-level cascade; no pressure
  counter is updated twice.
- `tests/event_loader.test.ts`: validate the bounded opt-in shape and reject
  pressure/decision/empty-prerequisite misuse.
- `tests/event_timeline_integrity.test.ts`: pin the complete P2 tuple, both
  opt-ins, unchanged maxima/prerequisites/effects, Zepa `turn_min:160`, and the
  exact receipt order.
- `tests/ui/settlement_timeline_i18n.test.ts` plus Chronicle focus/spine tests:
  pin completed-week range localization at t171/t178 and keep turn 0 safe.
- Re-run existing `tests/events_evaluate.test.ts`, `tests/pressure_system.test.ts`,
  `tests/integration_event_system.test.ts`, `tests/event_timeline_integrity.test.ts`,
  `tests/ui/settlement_timeline_i18n.test.ts`, and the focused Chronicle tests.

This proposal is technical only. It does not authorize implementation or a
campaign, and the final raw tuple remains subject to the already-required owner
and panel disposition.
