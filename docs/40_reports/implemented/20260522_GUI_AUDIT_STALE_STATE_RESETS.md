# GUI Audit Stale State Resets

**Date:** 2026-05-22  
**Type:** Tactical-map UI state hygiene fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit Batch E identified several UI-only states that could outlive the surface they described:

- Sector stance/logistics confirmation text could remain visible after selecting another corps-front sector.
- Local-support confirmation text could remain visible after selecting another settlement.
- Closing Army HQ preserved the last tab, so a later open could land on PERSONNEL/RECORDS instead of the intended BRIEFING surface.
- Hiding Decision Room Advanced controls could leave an invisible lens filter active.
- The Inbox home badge cleared map selection but left store-owned overlays open.

## Change

- `CorpsFrontPanel` clears `sectorActionMessage` when `selectedSectorId` changes.
- `SelectionPanel` clears `supportMessage` when `selectedOsid` changes.
- `setArmyHQOpen(false)` now resets `armyHQTab` to `briefing` alongside existing expanded-section resets.
- `PresidentialDecisionRoomPanel` resets `activeLens` to `all` when Advanced is hidden.
- `PresidentialToolbar` Inbox badge closes Army HQ, Codex, Chronicle, Operations panel, and Ops Planning modal before clearing selection ids.
- Added `tests/ui/stale_state_resets.test.ts` covering all four Batch E reset families.

## Verification

- Red run `npx.cmd vitest run tests\ui\stale_state_resets.test.ts --reporter=dot` failed before the patch across all four expected stale-state cases.
- `npx.cmd vitest run tests\ui\stale_state_resets.test.ts --reporter=dot` passed 4/4 after the patch.
- `npx.cmd vitest run tests\ui\stale_state_resets.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui_shell_navigation.test.ts tests\ui\records_button_behavior.test.ts tests\ui\emergency_posture_confirm.test.ts --reporter=dot` passed 33/33.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `git diff --check` passed.

## Remaining GUI Audit Queue

This closes GUI visual audit Batch E. Remaining 2026-05-22 GUI audit batches: F Warroom chrome/shell ownership, G no-op controls/onboarding spotlight/bridge-unavailable feedback, and H polish cleanup.
