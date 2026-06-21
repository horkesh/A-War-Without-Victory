# Army CO Proposal Decision Room Routing

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Routed autonomous Army CO operation proposals (`army_co_proposes_op`) as presidential command-review items instead of Personnel matters.
- Preserved the Decision Room command lens as the primary player action, with Army HQ Briefing remaining the source handoff/evidence surface.
- Added proposal-specific Decision Room copy so an operation proposal is not described as a refusal or generic pushback.

## Changes Made
- `deriveInboxItems` now titles `army_co_proposes_op` rows as `Autonomous Operation Proposal` and routes them to `decision_room`.
- `handlePresidentialInboxAction` deep-links officer command-review Inbox rows to the Decision Room command card `pushback:player-army-co`; operation opportunities still use the opportunity lens.
- The presidential review queue now counts autonomous Army CO proposals as command interpretations, not personnel directives.
- Command briefing classification now keeps autonomous operation proposals in `cmd-order-interpretations`, not `cmd-officer-events`.
- `buildPlayerArmyCoPushbackVisibility` treats autonomous proposals as warning-level command signals with proposal-specific headline, rationale, and evidence.

## Verification
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\inbox_items.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui_decision_room_pushback_explanations.test.ts --pool=forks --reporter=dot` failed before implementation on Personnel routing, missing briefing/review-queue classification, and absent Decision Room card.
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\warroom_shell_ownership.test.ts --pool=forks --reporter=dot` failed before implementation on the missing officer Decision Room command-card deep link.
- Focused green proof: `node node_modules\vitest\vitest.mjs run tests\ui\inbox_items.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui_decision_room_pushback_explanations.test.ts tests\ui\warroom_shell_ownership.test.ts --pool=forks --reporter=dot` passed 106/106.
- Broader command-review proof: `node node_modules\vitest\vitest.mjs run tests\ui_decision_room_pushback_explanations.test.ts tests\ui\presidential_decision_room.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui\inbox_items.test.ts tests\ui\inbox_dedup.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\decision_family_modals.test.ts tests\a5_army_co_pushback_ui.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\warroom_shell_ownership.test.ts --pool=forks --reporter=dot` passed 177/177.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed; evidence confirmed war-start/foundational flow, surface reachability, existing Inbox-to-Decision Room live proof, and server-port cleanup. Temporary `.tmp_live_surface_browser_sweep` evidence was inspected and removed.

## Determinism / Scope
- UI/read-model/briefing route classification, App shell routing, test, and docs polish only.
- No officer event emission, simulation mechanics, scenario data, save schema, generated artifact, calibration floor, structural fingerprint, golden manifest, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/inboxItems.ts` | Classifies autonomous Army CO operation proposals as command-review Inbox items. |
| `src/ui/map/App.tsx` | Sends officer command-review Inbox rows to the Decision Room command card while preserving operation-opportunity routing. |
| `src/ui/map/data/GameStateAdapter.ts` | Counts autonomous Army CO proposals in presidential command review. |
| `src/sim/briefing/collect_briefing.ts` | Keeps autonomous Army CO proposals in command interpretations, not personnel events. |
| `src/ui/map/data/playerArmyCoPushbackVisibility.ts` | Adds warning-level operation-proposal signal copy/evidence. |
| Tests | Added red/green coverage across Inbox, briefing, adapter, Decision Room card, and App shell routing. |

## Next Steps
- Next active polish candidate from the docs scout is sector override feedback semantics: verify that brigade-to-sector command feedback follows the canonical sector override contract end to end.
