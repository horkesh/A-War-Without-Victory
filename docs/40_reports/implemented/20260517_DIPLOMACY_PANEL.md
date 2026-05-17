# Diplomacy Panel

**Date:** 2026-05-17
**Result:** Implemented read-only diplomacy packet and compact map panel within the scoped files.

## Summary
- Added `buildDiplomacyView(...)`, a deterministic read-only UI projection over existing negotiation, patron relationship, faction patron state, pending peace-plan/Dayton, and international visibility pressure state.
- Added `DiplomacyPanel`, a compact player-facing panel that uses qualitative copy for pressure/confidence instead of raw formulas or hidden thresholds.
- Wired the panel through `App.tsx` route/query opening: `?panel=diplomacy` or `?diplomacy=1`.

## Changes Made
### Read Model
- `src/ui/map/data/diplomacyView.ts` builds patron stance, active proposals, external actors, pressure reasons, and active IVP consequences from existing state only.
- `src/ui/map/data/types.ts` adds `DiplomacyView` and related view types, plus optional `LoadedGameState.diplomacyView`.
- `src/ui/map/data/GameStateAdapter.ts` attaches the diplomacy packet during parse without changing save schema or simulation behavior.

### Panel
- `src/ui/map/components/DiplomacyPanel.tsx` renders patron stance, proposals, pressure reasons, consequences, and empty state as a read-only dialog.
- `src/ui/map/App.tsx` opens the panel from URL query state. The existing Warroom `diplomatic_telephone` hotspot still points to Army HQ summary because `WarroomShellLayer.tsx` is outside this task's write scope.

### Tests
- `tests/ui/diplomacy_view.test.ts` covers projection content and empty-state stability.
- `tests/ui/diplomacy_panel.test.ts` covers non-empty and empty panel rendering.
- `tests/ui/diplomacy_player_truth.test.ts` verifies qualitative copy and guards against printing raw threshold/formula values.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/diplomacyView.ts` | New read-only diplomacy view builder |
| `src/ui/map/data/types.ts` | Diplomacy view types and adapter field |
| `src/ui/map/data/GameStateAdapter.ts` | Attaches diplomacy view to loaded map state |
| `src/ui/map/components/DiplomacyPanel.tsx` | New compact diplomacy panel |
| `src/ui/map/App.tsx` | Query route opens diplomacy panel |
| `tests/ui/diplomacy_view.test.ts` | Read model tests |
| `tests/ui/diplomacy_panel.test.ts` | Panel render tests |
| `tests/ui/diplomacy_player_truth.test.ts` | Player-truth copy tests |

## Verification
- `npx.cmd vitest run tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts tests\ui\diplomacy_player_truth.test.ts`
- `npm.cmd run typecheck`

## Follow-Up Notes
- Wire the Warroom `diplomatic_telephone` hotspot to this panel once `src/ui/map/components/warroom/WarroomShellLayer.tsx` and shared shell command types are in scope.
- Plan-requested `GUI_MASTER`, `GAME_STATE_RATING_MASTER`, `PROJECT_LEDGER.md`, and roadmap propagation were intentionally not edited because the user limited ownership/write scope and explicitly forbade ledger/roadmap edits.
