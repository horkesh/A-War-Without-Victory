# All-Faction First-Hour Browser Gate

Date: 2026-06-20

## Summary

Closed the first-hour faction parity gap found during the AAA polish sweep. `qa:first-hour:browser` now runs the opening path for RBiH, RS, and HRHB, selecting each faction from the main menu and proving:

- `WAR HAS STARTED` appears before the identity brief.
- The faction identity brief appears before the first Desk handoff.
- The faction foundational decision is present and required:
  - RBiH: `What Is Bosnia?`
  - RS: `The Assembly Speaks`
  - HRHB: `What Is Herceg-Bosna?`
- Toolbar routes and shell hotkeys cannot open Desk/Army HQ/Records/Chronicle/Codex/Decision History behind the required decision modal.
- The RBiH Records/Chronicle receipt path still files the opening decision as before.

Also repaired the post-merge CI failure from `5a7b421`: the English keys `situation.alliancePosture` and `inbox.type.reviewItem` now have BCS mirrors, restoring `tests/ui_i18n.test.ts` parity. Fresh same-faction New Game starts now clear the opening-brief dismissal bit before loading the new campaign, so a second RS/HRHB/RBiH New Game in one app session still shows the opening brief.

## Files

- `tools/ui/first_hour_browser_gate.cjs`
- `src/ui/map/App.tsx`
- `src/ui/map/components/EventDecisionModal.tsx`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/first_hour_browser_gate_contract.test.ts`
- `tests/ui/shell_navigation_ownership.test.ts`
- `tests/ui/app_boot_main_menu.test.ts`

## Verification

- `npm.cmd exec -- vitest run tests/ui_i18n.test.ts tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/shell_navigation_ownership.test.ts --pool=forks --reporter=dot` passed 29/29.
- `npm.cmd exec -- vitest run tests/ui/app_boot_main_menu.test.ts tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 45/45.
- `npm.cmd run typecheck` passed.
- `npm.cmd exec -- vitest run tests/ui/event_decision_modal_phase3.test.ts tests/ui/event_decision_modal_catalog.test.ts tests/ui/event_decision_modal_decision_context.test.ts tests/ui/game_start_intro.test.ts tests/browser_campaign_start_fallback.test.ts tests/desktop_campaign_start_contract.test.ts --pool=forks --reporter=dot` passed 35/35.
- `npm.cmd run qa:first-hour:browser` passed with port 3237 cleanup.
- `npm.cmd run qa:live-surface:browser` passed with port 3239 cleanup.

## Determinism And Scope

UI/read-model, browser-gate, i18n parity, and tests only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Follow-Up

The next polish lane is downstream AAR provenance wording: Army HQ completed-operation summaries, forced-operation receipts, settlement timelines, officer dossiers, Chronicle, and opportunity-ledger copy still need to consistently distinguish logged captures from final-held objectives. Srebrenica/Zepa fall receipts remain event-owned; Krivaja/Stupcanica remain chronology/AAR context only.
