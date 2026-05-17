# Two-Level Event Surfacing Phase C

**Date:** 2026-05-18
**Run ID:** Not applicable
**Baseline:** Phase A/B/B+ already closed; schema version remains v14
**Result:** Phase C notification substrate implemented behind `AWWV_TWO_LEVEL_NOTIFICATIONS=true`; Batch 4 dismissal path and first safe Phase D backfill added.

## Summary
- Added optional event notification state, authored sparse notification text, deterministic notification emission, and Inbox projection for informational cross-faction intelligence rows.
- Kept notifications out of `player_decision_manifest.ts`; they are nonblocking and project as `severity: info`.
- Added a real dismissal command path: Inbox `INTEL` rows expose a `Dismiss` control, `App` routes it through desktop IPC, and the main process marks the matching state-owned notification `consumed = true`.
- Added the first safe Phase D content backfill for `hrhb_political_goal`, plus a tracker for remaining notification text.

## Changes Made
### State and Event Schema
- `src/sim/events/event_types.ts` defines `EventNotification`, authored per-response/per-recipient text, and carries notification text through pending player event decisions.
- `src/state/game_state.ts` adds optional `military.pending_event_notifications`.
- `src/state/validateGameState.ts` validates notification shape when present.

### Emission
- `src/sim/events/emit_notifications.ts` emits one notification per authored non-source faction, sorts by `notification_id` with `strictCompare`, and sets `surfaced_on_turn = currentTurn + 1`.
- `src/sim/events/ai_default_response.ts` adds a deterministic AI default response helper. Under `AWWV_TWO_LEVEL_NOTIFICATIONS=true`, AI event decisions use the default response path and emit notifications in the same evaluation step.
- `src/sim/events/evaluate_events.ts` carries authored notification text into pending player decisions only when the feature flag is enabled, and emits AI notifications when the flag is enabled.
- `src/sim/events/resolve_decision.ts` emits notifications after player response resolution when the flag is enabled.

### Content and Projection
- `data/scenarios/events/war_1992.json` adds sparse authored notification text for `rs_strategic_goals` / `all_six` and `rbih_state_identity` / `civic`.
- Batch 4 adds complete authored notification text for `hrhb_political_goal` using existing event fields only.
- `src/ui/map/data/types.ts` and `src/ui/map/data/GameStateAdapter.ts` expose pending notifications.
- `src/ui/map/data/inboxItems.ts` projects `intelligence_notification` rows only for the selected player faction, only after `surfaced_on_turn`, and only while `consumed === false`.
- `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md` tracks implemented and remaining Phase D coverage by event.

## Files Changed
| File | Change |
|---|---|
| `data/scenarios/events/war_1992.json` | Sparse authored notification text |
| `src/state/game_state.ts` | Optional notification state field |
| `src/state/validateGameState.ts` | Shape validation |
| `src/sim/events/event_types.ts` | Notification and authored-text types |
| `src/sim/events/emit_notifications.ts` | Deterministic emission helper |
| `src/sim/events/dismiss_notifications.ts` | State-owned notification consume helper |
| `src/sim/events/ai_default_response.ts` | Deterministic AI default response helper |
| `src/sim/events/evaluate_events.ts` | AI/player notification emission hooks |
| `src/sim/events/resolve_decision.ts` | Player response notification emission |
| `src/ui/map/data/GameStateAdapter.ts` | Adapter pass-through |
| `src/ui/map/data/inboxItems.ts` | Inbox projection and dismiss action family |
| `src/ui/map/components/PresidentialInbox.tsx` | INTEL badge and Dismiss control |
| `src/ui/map/App.tsx` | Inbox dismiss routing to IPC |
| `src/ui/map/desktop/useIPC.ts` | Renderer bridge method |
| `src/desktop/preload.cjs` | Exposed dismissal IPC method |
| `src/desktop/electron-main.cjs` | Desktop dismissal handler and state broadcast |
| `src/ui/map/data/types.ts` | Loaded-state notification field |
| `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md` | Phase D coverage tracker |
| `tests/sim/events/dismiss_notifications.test.ts` | Dismiss helper coverage |
| `tests/sim/events/two_level_surfacing.test.ts` | Emission/order/determinism coverage |
| `tests/state/serialize.notifications.test.ts` | Serialization/validation coverage |
| `tests/ui/inboxItems.notifications.test.ts` | Inbox projection coverage |
| `tests/ui/inbox_items.test.ts` | Loaded-state fixture updated for strict player-faction contract |

## Verification
- `npm.cmd exec -- vitest run tests/sim/events/two_level_surfacing.test.ts tests/state/serialize.notifications.test.ts tests/ui/inboxItems.notifications.test.ts` passed: 3 files, 6 tests.
- `npm.cmd exec -- vitest run tests/event_decisions.test.ts tests/events_evaluate.test.ts tests/ui/inbox_items.test.ts tests/ui/inboxItems.faction_scope.test.ts tests/ui_adapter_boundary.test.ts` passed: 5 files, 70 tests.
- `npm.cmd run typecheck` passed.
- Batch 4 focused verification is listed in the final response for this session.

## Calibration Impact
- Default scenario behavior remains gated because emission call sites require `AWWV_TWO_LEVEL_NOTIFICATIONS=true`.
- Parent integration initially found a default 40w hash drift because authored notification text was copied into ordinary pending player decisions even when the flag was off. That was corrected in `evaluate_events.ts`.
- Fresh default 40w n1875 is hash-stable at `42607f83870e01d5`, with 27/27 anchors and 6/6 benchmarks. The optional state field and AI default notification behavior are inactive without the feature flag.

## Remaining Phase D Scope
- `rs_strategic_goals` still has sparse coverage: `selective` and `aggressive` need recipient text.
- `rbih_state_identity` still has sparse coverage: `bosniak_national` and `pragmatic` need recipient text.
- All later `requires_player_response` event notification content remains unfilled and is tracked in `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`.
- Sensitive-history and late-war diplomacy rows need historian/narrative review before authoring.
