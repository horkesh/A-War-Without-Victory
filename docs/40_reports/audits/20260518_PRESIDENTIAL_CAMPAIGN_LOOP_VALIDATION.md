# Presidential Campaign Loop Validation Audit

**Date:** 2026-05-18
**Scope:** Validation and route coverage for the existing presidential loop across Warroom, Army HQ Decision Room, pre-advance review, Turn Aftermath, Army HQ Records, Chronicle, and next-turn review.
**Plan:** `docs/plans/2026-05-17-presidential-campaign-loop-validation-plan.md`

## Summary

- The canonical campaign loop is `Brief -> Inspect -> Decide -> Execute -> Report -> Cost -> Judge -> Next`.
- Every loop step has a live owner in the current shell. No missing owner was found, so no new product surface, queue, modal owner, or navigation state was added.
- Route-level tests now pin target preservation from Decision Room source handoffs, pre-advance rows, Warroom handoff delegation, and Turn Aftermath record/Chronicle actions.

## Loop Contract

| Step | Existing owner | Owner files | Entry action | Exit / preserved target | Status |
|------|----------------|-------------|--------------|--------------------------|--------|
| Brief | Warroom priority docket and Army HQ BRIEFING / Decision Room | `src/ui/map/components/warroom/WarroomStatusBar.tsx`, `src/ui/map/components/army_hq/ArmyHQModal.tsx`, `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`, `src/ui/map/data/presidentialDecisionRoom.ts` | Warroom `PRIORITIES` / Army HQ button / Decision Room `Brief` loop step | `army-hq-tab:summary` or `army-hq-tab:briefing` through `openPresidentialDecisionRoomNavigationTarget(...)` | Live |
| Inspect | Decision Room source handoffs and corps/summary records | `src/ui/map/data/presidentialDecisionRoom.ts`, `src/ui/map/utils/presidentialDecisionRoomNavigation.ts`, `src/ui/map/utils/shellNavigation.ts` | Decision Room card, command lane, source handoff, Warroom docket handoff | `army-hq-tab`, `army-hq-corps-briefing`, `army-hq-aftermath-record`, or `chronicle` target preserved | Live |
| Decide | Presidential Inbox / Army HQ briefing decision owners | `src/ui/map/components/PresidentialInbox.tsx`, `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`, `src/ui/map/data/presidentialDecisionRoom.ts` | Decision Room `Decide` lane or pre-advance blocking row | Inbox clears tactical selections; Army HQ decision families route to BRIEFING / personnel / modal owners already present | Live |
| Execute | Existing advance-turn confirmation and desktop advance path | `src/ui/map/components/warroom/AdvanceTurnModal.tsx`, `src/ui/map/components/PresidentialToolbar.tsx`, `src/ui/map/desktop/orderActions.ts` | Warroom `ADVANCE`, toolbar `ADVANCE TURN`, or Decision Room `Execute` loop step | Existing advance-turn modal; review buttons preserve item navigation targets before execution | Live |
| Report | Turn Aftermath modal and Army HQ Records aftermath tab | `src/ui/map/components/TurnAftermathModal.tsx`, `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx`, `src/ui/map/data/turnAftermath.ts` | Successful advance opens Turn Aftermath; Decision Room `Report` routes to records | `army-hq-records:aftermath`; focused turn uses `setFocusedAftermathTurn` | Live |
| Cost | Active campaign cost and Turn Aftermath records | `src/ui/map/data/turnAftermath.ts`, `src/ui/map/data/presidentialDecisionRoom.ts`, `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx` | Decision Room `Cost` loop step or campaign-cost card | `army-hq-records:aftermath` | Live |
| Judge | Chronicle memory and Turn Aftermath judgment packet | `src/ui/map/components/chronicle/ChronicleOverlay.tsx`, `src/ui/map/components/TurnAftermathModal.tsx`, `src/ui/map/data/presidentialDecisionRoom.ts` | Decision Room `Judge` step, Chronicle card, or Turn Aftermath `Chronicle` button | `chronicle` route through `openChronicle(...)`; Chronicle turn links route back to focused Army HQ records | Live |
| Next | Decision Room next-action projection | `src/ui/map/data/presidentialDecisionRoom.ts`, `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | Decision Room `Next` loop step after judging/report review | Back to `army-hq-tab:briefing` or top card target | Live |

## Route Coverage Added

- `tests/ui_presidential_decision_room_wiring.test.ts` now opens Decision Room source handoff targets and asserts the target owner surface calls.
- `tests/ui/pre_advance_command_review.test.ts` now compares pre-advance row targets against the Decision Room advance-readiness source targets.
- `tests/ui/records_button_behavior.test.ts` now mounts Turn Aftermath and verifies `Turn Records` / `Chronicle` actions call the expected shell callbacks.
- `tests/ui_shell_frame_contract.test.ts` now guards Warroom/pre-advance priority handoffs against local route ownership and confirms App delegates preserved targets through the shared Decision Room router.

## Browser Fixture

Browser smoke script: `tools/ui/presidential_loop_smoke.cjs`

Default fixture/save path: `data/derived/latest_run_final_save.json`

The smoke loads that save through the existing browser `window.handleManualSaveLoad(...)` hook, ensures `meta.player_faction` is present for player-shell routing, and then captures the loop checkpoints under `docs/40_reports/implemented/visual_validation/20260518_presidential_loop/`.

## Product-Loop Gaps

- No missing owner was found.
- Browser smoke remains a validation script, not a gameplay decision fixture generator. It proves the route chain and visible shell affordances using the current latest-run save; richer pending-decision playthroughs still depend on having an authored or generated save with live blocking decisions/opportunity proposals.
- The `Execute` step validates the review/confirmation path and does not force a turn advance in browser mode, because the desktop IPC advance path is the owner of canonical turn execution.

## Determinism

UI route validation only. No simulation mechanics, formation-life behavior, performance hot path, cinematic verdict UI, event notification content, save schema, scenario data, random source, or persisted game state changed.
