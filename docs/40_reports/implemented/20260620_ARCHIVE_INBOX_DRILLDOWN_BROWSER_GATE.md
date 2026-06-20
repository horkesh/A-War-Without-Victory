# Archive / Inbox Drilldown Browser Gate

**Date:** 2026-06-20

**Type:** UI route/selectors, live browser QA gate, shell-navigation hygiene.

## Summary

`qa:live-surface:browser` now proves the live archive and desk routing lane instead of only top-level reachability:

- Chronicle dossier record -> Army HQ Records, with the correct Aftermath or Operations subtab selected.
- Records Decision Consequences -> Chronicle for Chronicle-filed decision receipts.
- Presidential Inbox visible on the field home state, then President's Desk -> Records with the Aftermath archive selected.

The branch adds stable `data-testid` and route metadata hooks to Chronicle, Records, Decision Consequence Records, Presidential Inbox, and President's Desk surfaces so future browser gates can click route owners without relying on text copy.

## Implementation Notes

- `tools/ui/live_surface_browser_sweep.cjs` adds `runArchiveInboxDrilldown(...)` and evidence flags:
  - `archiveChronicleToRecordsDrilldown`
  - `archiveRecordsDecisionToChronicleDrilldown`
  - `presidentialInboxVisible`
  - `deskRecordsRoute`
- `ChronicleOverlay` exposes the overlay, close control, filters, dossier entries, and record-open buttons with record-target metadata.
- `RecordsContent` and `DecisionConsequenceRecordsPanel` expose Records root/archive-summary, decision-record rows, record ids, family ids, and route targets.
- `PresidentialInbox`, `PresidentDeskShell`, `ConsequenceStrip`, and `DecisionCard` expose stable item/action/route selectors.
- `PresidentialDecisionRoomNavigationTarget` now has typed focused archive targets for operation AARs and decision consequence records.
- Inbox-return routes now clear focused aftermath, operation-history, and decision-consequence archive ids so stale record focus cannot leak into later desk/inbox navigation.

## Verification

- Red proof first failed on the missing live-sweep archive/inbox lane and missing selector hooks:
  `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/president_desk_shell.test.ts tests/ui_shell_navigation.test.ts --pool=forks --reporter=dot`
- Green focused proof:
  `npm.cmd exec -- vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/president_desk_shell.test.ts tests/ui_shell_navigation.test.ts tests/ui/warroom_shell_ownership.test.ts --pool=forks --reporter=dot`
  - 4 files / 51 tests passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed with:
  - `archiveChronicleToRecordsDrilldown: true`
  - `archiveRecordsDecisionToChronicleDrilldown: true`
  - `presidentialInboxVisible: true`
  - `deskRecordsRoute: true`
  - `serverPortCleanupVerified: true`
- `npm.cmd run qa:player-journeys` passed:
  - 21 files / 209 tests.
- `git diff --check` passed.

## Scope / Determinism

UI selector hooks, route metadata, browser QA tooling, focused tests, and docs only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
