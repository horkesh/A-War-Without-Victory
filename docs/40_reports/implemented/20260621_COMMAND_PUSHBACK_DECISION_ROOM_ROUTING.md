# Command Pushback Decision Room Routing

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Routed officer command-interpretation and Army CO pushback signals through the Presidential Decision Room command lens.
- Preserved Army HQ Briefing as the source handoff/evidence surface.
- Split Presidential Inbox officer rows so true personnel matters remain Personnel, while command pushback opens Decision Room.

## Changes Made
- `pushback:player-army-co` is now a `command` card with primary `decision-room` command-lens navigation and `sourceHandoffTarget` back to Army HQ Briefing.
- Advance-readiness selection now includes non-info command cards, so blocking pushback appears in pre-advance review instead of hiding behind Army HQ.
- UI officer-event typing now includes `order_exceeded`, `army_directive_pushback`, and `army_co_proposes_op`.
- `army_directive_pushback` and `order_exceeded` now count as command interpretations in the adapter review queue and command briefing.
- Inbox officer rows now route command-interpretation events to `decision_room`; replacement/availability/relief rows still route to `army_hq_personnel`.

## Verification
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui_decision_room_pushback_explanations.test.ts tests\ui\presidential_decision_room.test.ts --pool=forks --reporter=dot` failed before implementation on the old `decision` category and direct Army HQ route.
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\inbox_items.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui\presidential_decision_room.test.ts --pool=forks --reporter=dot` failed before implementation on the old Personnel Inbox action, missing `army_directive_pushback` review-queue count, and absent advance-readiness pushback item.
- Green focused proof: `node node_modules\vitest\vitest.mjs run tests\ui_decision_room_pushback_explanations.test.ts tests\ui\presidential_decision_room.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui\inbox_items.test.ts --pool=forks --reporter=dot` passed 93/93.
- Broader command/officer proof: `node node_modules\vitest\vitest.mjs run tests\ui_decision_room_pushback_explanations.test.ts tests\ui\presidential_decision_room.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\decision_family_modals.test.ts tests\a5_army_co_pushback_ui.test.ts --pool=forks --reporter=dot` passed 125/125.
- `npm.cmd run typecheck` passed.

## Determinism / Scope
- UI read-model/briefing classification/test/docs polish only.
- No simulation mechanics, officer event emission, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, randomness, timestamps, packaged installer artifact, or persisted output ordering changed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Pushback card now opens Decision Room command lens and participates in advance readiness. |
| `src/ui/map/data/inboxItems.ts` | Command-interpretation officer rows route to Decision Room; personnel rows remain Personnel. |
| `src/ui/map/data/GameStateAdapter.ts` | Newer command-pushback event types count in the presidential review queue. |
| `src/ui/map/data/playerArmyCoPushbackVisibility.ts` | Newer command-pushback event types feed the pushback projection. |
| `src/ui/map/data/types.ts` | UI officer-event union includes newer persisted officer event types. |
| `src/sim/briefing/collect_briefing.ts` | Army directive pushback/order-exceeded events classify as command interpretations. |
