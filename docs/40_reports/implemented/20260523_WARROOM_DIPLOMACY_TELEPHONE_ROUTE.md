# Warroom Diplomacy Telephone Route

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- The Warroom diplomatic telephone now opens the existing read-only Diplomacy panel instead of routing to Army HQ Summary.
- The change uses the existing `DiplomacyPanel` / `buildDiplomacyView` surface and does not add diplomacy mechanics, state, IPC authority, scenario data, or calibration changes.
- A Warroom shell regression now pins the hotspot mapping.

## Changes Made

### Warroom navigation
- Added `diplomacy` to the Warroom-local command union in `src/ui/map/utils/warroomNavigation.ts`.
- Updated `regionToShellHandoff('diplomatic_telephone')` in `src/ui/map/components/warroom/WarroomShellLayer.tsx` to return `{ kind: 'diplomacy' }`.
- Updated `src/ui/map/App.tsx` so the local diplomacy command opens the existing `DiplomacyPanel` while staying in the Warroom shell.

### Test coverage
- Extended `tests/ui/warroom_shell_ownership.test.ts` to assert the diplomatic telephone routes to the dedicated diplomacy panel.
- Re-ran the existing diplomacy view/panel/player-truth tests to confirm the already-built diplomacy surface still renders correctly.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/utils/warroomNavigation.ts` | Added `diplomacy` as a Warroom-local command and validator case. |
| `src/ui/map/components/warroom/WarroomShellLayer.tsx` | Routed `diplomatic_telephone` to the diplomacy local command. |
| `src/ui/map/App.tsx` | Opens `DiplomacyPanel` for the Warroom-local diplomacy command. |
| `tests/ui/warroom_shell_ownership.test.ts` | Pins the telephone-to-diplomacy routing contract. |

## Verification
- `npx.cmd vitest run tests\ui\warroom_shell_ownership.test.ts tests\ui\diplomacy_panel.test.ts tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_player_truth.test.ts --reporter=dot` PASS 10/10.

## Next Steps
- Track E's larger diplomacy-panel upgrade remains open: richer per-power stance, negotiation timeline, and what-moves-the-needle sections should be expanded from existing canonical diplomacy, IVP, patron, and negotiation read models.
