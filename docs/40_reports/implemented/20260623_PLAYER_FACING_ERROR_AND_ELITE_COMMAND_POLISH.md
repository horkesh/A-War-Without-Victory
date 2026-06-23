# Player-Facing Error and Elite Command Polish

**Date:** 2026-06-23
**Run ID:** N/A
**Baseline:** `codex/officer-rating-truth` merged/pushed on `main`
**Result:** Focused UI/read-model polish implemented on `codex/player-surface-next-batch`

## Summary
- Player-facing desktop/load errors now route filesystem failures through safe operator copy instead of exposing raw Windows paths or `ENOENT` payloads.
- Opening command surfaces now display sourced elite commander identity and ratings from a UI-only OOB sidecar without serializing sensitive source-only fields into save/read-model truth.
- Commander selection now renders operation display names in modal titles and unavailable-officer reasons, preventing raw operation ids from reaching player copy.

## Changes Made
### Error-Copy Boundary
- `src/ui/map/utils/errorCopy.ts` detects raw filesystem/load-error payloads and replaces them with neutral reinstall/verify-game-files copy.
- `tests/ui/error_copy_contract.test.ts` and `tests/load_error_toast.test.ts` pin Windows-path and POSIX-path redaction so packaged load failures stay player-safe.

### Elite Commander Sidecar
- `src/ui/map/data/eliteCommanderSidecar.ts` projects elite commander display metadata from `data/source/oob_brigades.json` by formation id.
- `src/ui/map/data/GameStateAdapter.ts` attaches optional `eliteCommander` metadata to `FormationView` without changing simulation state, save payloads, scenario data, or officer ratings.
- `src/ui/map/components/EliteCommanderSummary.tsx`, Formation Detail, Army HQ ORBAT, and Army Reserve render commander identity plus command/tempo/defense ratings where source data exists.
- The sidecar intentionally omits `origin` and `war_crimes_record` from UI projections.

### Commander-Selection Copy
- `src/ui/map/components/CommanderSelectionModal.tsx` now prefers `OperationView.display_name` and falls back through the player-safe operation-name helper for titles and assigned-operation availability reasons.
- `tests/ui/commander_selection_modal_copy.test.ts` pins the modal title and `ASSIGNED` reason against raw operation slug leakage.

## Lessons Learned
- Missing or source-only command data should not be repaired by mutating startup state when a display sidecar can close the player-facing gap without calibration cost.
- Error classification can retain raw diagnostics internally, but the renderer display boundary must sanitize before showing any failure toast or banner.
- Operation display names need to be carried into secondary staff modals, not only primary operation cards.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/utils/errorCopy.ts` | Added player-safe filesystem/load-error redaction |
| `src/ui/map/data/types.ts` | Added optional `EliteCommanderView` on `FormationView` |
| `src/ui/map/data/eliteCommanderSidecar.ts` | Added UI-only elite commander projection |
| `src/ui/map/data/GameStateAdapter.ts` | Attaches sidecar data by formation id |
| `src/ui/map/components/EliteCommanderSummary.tsx` | Shared elite commander display component |
| `src/ui/map/components/FormationDetail.tsx` | Shows elite commander block in brigade officer area |
| `src/ui/map/components/army_hq/OrbatSection.tsx` | Shows elite commander block in expanded ORBAT rows |
| `src/ui/map/components/ArmyReservePanel.tsx` | Shows elite commander block for reserve pool and active loans |
| `src/ui/map/components/CommanderSelectionModal.tsx` | Uses player-facing operation names in title/reasons |
| `tests/load_error_toast.test.ts` | Pins sanitized load-error banner behavior |
| `tests/ui/error_copy_contract.test.ts` | Pins filesystem-path redaction |
| `tests/ui_map_officers_phase_e.test.ts` | Pins adapter sidecar projection and sensitive-field omission |
| `tests/ui/formation_detail_parity.test.ts` | Pins Formation Detail display |
| `tests/ui/gui_audit_label_discipline.test.ts` | Pins Army HQ ORBAT display |
| `tests/ui/army_reserve_elite_commander.test.ts` | Pins Army Reserve display |
| `tests/ui/commander_selection_modal_copy.test.ts` | Pins operation display-name copy |

## Verification
- Focused red/green proof was performed for the load-error, elite-commander, and commander-selection changes.
- Combined focused pack passed 78/78:
  `.\vitest.cmd run tests\ui\error_copy_contract.test.ts tests\load_error_toast.test.ts tests\ui_map_officers_phase_e.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui\army_reserve_elite_commander.test.ts tests\ui\commander_selection_modal_copy.test.ts tests\ui\desktop_load_error_classification.test.ts`
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 523 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified; `.tmp_first_hour_browser_gate` was removed after inspection.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified; `.tmp_live_surface_browser_sweep` was removed after inspection.

## Next Steps
- Close the remaining scout lane where reserve-only sectors can still appear as friendly-line truth in Corps Front and tooltip paths.
- Normalize sector-label sanitization across Corps Front, Corps Detail, and OOB in the next player-surface packet.
