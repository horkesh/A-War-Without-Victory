# UI Truth and Decision Hierarchy Hardening

**Date:** 2026-06-17

**Scope:** Tactical-map UI/player-time truth and decision-modal readability.

## Summary

Live/player-sweep review found two D2-entry polish defects:

- Live 1992 command surfaces could expose postwar legal outcomes from stored `war_crimes_record` data.
- `EventDecisionModal` rendered long future-consequence previews inside each response card, pushing alternate responses below the first option's consequence wall.

This patch keeps the historical/legal data intact, but gates it to explicit archival dossier surfaces. Live Army HQ, corps, formation, operation, and officer-event cards now present in-war command information only. Decision modals now show the full response list before detailed future-consequence previews.

## Changed Files

- `src/ui/map/components/OfficerProfile.tsx`
- `src/ui/map/components/OfficerDossierPanel.tsx`
- `src/ui/map/components/OfficerEventBadge.tsx`
- `src/ui/map/components/EventDecisionModal.tsx`
- `tests/ui/officer_dossier.test.ts`
- `tests/ui/officer_event_time_truth.test.ts`
- `tests/ui/event_decision_modal_phase3.test.ts`

## Verification

Red proof failed on default `OfficerProfile` legal-record leakage and response options appearing after future-consequence copy.

Green proof:

```powershell
node_modules\.bin\vitest.cmd run tests\ui\officer_dossier.test.ts tests\ui\officer_event_time_truth.test.ts tests\ui\event_decision_modal_phase3.test.ts tests\ui\event_decision_modal_catalog.test.ts tests\ui\event_decision_modal_decision_context.test.ts --pool=forks --reporter=dot
```

Result: 5 files / 23 tests passed.

Additional green proof:

- `npm.cmd run typecheck`
- `npm.cmd run qa:player-journeys` -> 11 files / 102 tests passed.
- `git diff --check`
- Live browser on `http://127.0.0.1:4197/tactical_map.html?dev=1`: RS start -> opening brief -> command map -> Army HQ, with no future/postwar legal-record text visible and no page/runtime errors. Browser warnings were the known dev fallback, WebGL ReadPixels, and invalid-coordinate overlay warnings.

## Calibration

No simulation logic, scenario data, save schema, golden baseline, calibration floor, generated scenario artifact, or packaged installer artifact changed.

## Follow-Up Lane

The separate turn-0 OOB/data lane remains open: corps commander gaps and turn-0 combat/control-history artifacts are data/initial-state issues, not UI display gating.
