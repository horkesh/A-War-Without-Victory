# Map Selection Click Guard — Deck.gl/MapLibre Race Condition Fix

**Date:** 2026-04-13
**Type:** UI/map interaction hardening
**Sim behavior change:** None (UI-only)

## Exact Seam Chosen

**Deck.gl/MapLibre click handler race condition.** When `deckFormationCounters` is true (default), MapLibre's `formation-markers` layer is hidden (`visibility: 'none'`). This means:

1. Deck.gl `onClick` fires first → picks formation → calls `setSelectedFormationId('brigade_x')`
2. MapLibre `handleMapClick` fires second → `queryRenderedFeatures` finds no formation hits (hidden layer) → falls through to front-edge detection → calls `setSelectedCorpsFrontSectorId('sector_y')` → **clears `selectedFormationId`** via store line 336

Net result: clicking a brigade near a front line silently selects the sector instead.

## Root Cause

Two independent click handlers (Deck.gl overlay + MapLibre `map.on('click')`) fire on the same DOM event. The Deck.gl handler correctly resolves formation priority via `resolveDeckFormationClickTarget`, but cannot prevent MapLibre's handler from also processing the click. Because `formation-markers` is hidden for Deck.gl rendering, MapLibre's handler has no formation layer to check and falls through to front-edge/sector selection, which clears the formation via `setSelectedCorpsFrontSectorId`'s store setter.

## Fix

Added a `deckHandledFormationClickRef` guard that coordinates the two handlers:

1. **MapContainer.tsx**: Created `deckHandledFormationClickRef = useRef(false)`. In the Deck.gl `onClick` handler, when a formation click is resolved, set `deckHandledFormationClickRef.current = true` before calling `setSelectedFormationId`.

2. **useMapInteractions.ts**: Added `deckHandledFormationClick?: { current: boolean }` to `MapInteractionCallbacks`. At the top of `handleMapClick`, if the guard is set, consume it (reset to false) and return early — skipping all front-edge/sector fallthrough.

3. **MapContainer.tsx**: Passed `deckHandledFormationClickRef` to `useMapInteractions` as the `deckHandledFormationClick` callback property.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/map/useMapInteractions.ts` | Added `deckHandledFormationClick` to `MapInteractionCallbacks`; guard check at top of `handleMapClick` |
| `src/ui/map/map/MapContainer.tsx` | Created `deckHandledFormationClickRef`; set in Deck.gl onClick; passed to `useMapInteractions` |
| `tests/ui_map_interactions.test.ts` | New test: `deckHandledFormationClick guard prevents MapLibre front-edge fallthrough` |

## Codex Lane Files (pre-existing, not modified in this session)

| File | What it does |
|------|-------------|
| `src/ui/map/map/clickSelectionPriority.ts` | `resolveDeckFormationClickTarget`: formation > sector priority within Deck.gl |
| `src/ui/map/map/highlightSelection.ts` | `collectHighlightedFormationIds`/`collectEmphasizedFormationIds`: corps-wide brigade emphasis |
| `tests/deck_click_selection_priority.test.ts` | Priority resolution unit tests |
| `tests/ui_map_corps_selection_highlight.test.ts` | Corps roster emphasis tests (node:test) |

## Exact Verification Results

| Check | Result |
|-------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | PASS |
| `npm.cmd run build` | PASS |
| `vitest run ui_map_interactions.test.ts + deck_click_selection_priority.test.ts` | 24/24 PASS |
| `tsx --test ui_map_corps_selection_highlight.test.ts` | 3/3 PASS |
| `npm.cmd run test:vitest` | **290 files / 3313 tests / 0 failures** |

## Live Verification Status

**NOT YET VERIFIED IN LIVE BROWSER.** The fix is proven by:
- Code analysis of the exact race condition (hidden layer → fallthrough → store clear)
- Unit test proving the guard mechanism (guard set → handleMapClick skips → no front-edge click)
- Full test suite green

But actual browser click behavior has not been verified because:
- Playwright is not installed as a project dependency
- CLI tools cannot interact with browser UI directly

**To verify live:** Open `http://localhost:3005/?live=1`, click a brigade icon near a front line. If the brigade panel opens (not the sector panel), the fix works.

## Whether Behavior Is Reliable or Only Improved

**Improved, not yet proven reliable.** The guard mechanism is sound in principle — same pattern used by `sectorSelectedFromMapRef` in the same component. But two risks remain:

1. **Event ordering assumption**: The fix assumes Deck.gl's onClick fires before MapLibre's handleMapClick. This is true because the Deck.gl overlay is registered before useMapInteractions, and DOM event listeners fire in registration order. But if overlay initialization timing changes, the assumption could break.

2. **Deck.gl picking reliability**: If Deck.gl fails to pick a formation (z-fighting, icon too small at low zoom), the guard won't be set and MapLibre's front-edge fallthrough still fires. This is correct behavior (no formation was picked → sector selection is fine) but may feel inconsistent at small zoom levels.

## Remaining Risks

1. **Live verification needed** — described above
2. **`setSelectedFormationId` does not clear sector/corps** — this asymmetry (sector clears formation, but not vice versa) could cause stale sector highlights when clicking formations. May need a follow-up to make formation selection clear sector/corps.
3. **Context menu "View Corps" → corps highlight** — not affected by this fix, should work as designed via `setSelectedCorpsId` which clears both formation and sector.

## Recommended Next Lane

1. **Live browser verification** of all 4 interaction paths (brigade click, corps highlight, sector click, no-regression on front/sector hover)
2. If verified, close this lane
3. Then: ZEA rate investigation or Ozren pocket hold_osids
