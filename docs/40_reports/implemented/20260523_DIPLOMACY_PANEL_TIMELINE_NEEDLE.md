# Diplomacy Panel Timeline And Needle Signals

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Expanded the read-only Diplomacy panel with a negotiation timeline and "What Moves The Needle" section.
- The new sections are deterministic projections from existing diplomacy read models: active peace/Dayton proposals, patron relationship events, active IVP consequences, patron constraint, and visible IVP pressure reasons.
- No new diplomacy mechanics, sim authority, scenario data, save schema, or calibration behavior was added.

## Changes Made

### Read model
- Added `DiplomacyTimelineEntryView` and `DiplomacyNeedleHintView` to the UI diplomacy type contract.
- `buildDiplomacyView(...)` now derives:
  - `negotiationTimeline` from active proposals, patron relationship events, and active international-pressure consequences.
  - `needleHints` from elevated patron constraint, high/medium IVP pressure reasons, and unresolved active proposals.

### Panel UI
- `DiplomacyPanel` now renders:
  - **Negotiation Timeline** with turn labels when known and qualitative confidence otherwise.
  - **What Moves The Needle** with player-safe qualitative hints rather than raw thresholds or formulas.

### Test coverage
- Updated diplomacy panel/view/player-truth tests to cover the new sections and preserve the no-raw-threshold player-truth contract.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/data/types.ts` | Added timeline and needle-hint view contracts. |
| `src/ui/map/data/diplomacyView.ts` | Derived timeline and hint rows from existing canonical diplomacy/IVP state. |
| `src/ui/map/components/DiplomacyPanel.tsx` | Rendered the new timeline and what-moves-the-needle sections. |
| `tests/ui/diplomacy_panel.test.ts` | Covers visible panel sections. |
| `tests/ui/diplomacy_view.test.ts` | Covers deterministic read-model projection. |
| `tests/ui/diplomacy_player_truth.test.ts` | Keeps raw thresholds/formulas out of player-facing diplomacy copy. |

## Verification
- `npx.cmd vitest run tests\ui\diplomacy_panel.test.ts tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_player_truth.test.ts tests\ui\warroom_shell_ownership.test.ts --reporter=dot` PASS 10/10.

## Next Steps
- The remaining Track E work is richer per-power stance detail and deeper negotiation history when the canonical state carries more structured actor/treaty history.
