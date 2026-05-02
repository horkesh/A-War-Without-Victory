# Chronicle Review Tools

**Date:** 2026-05-02
**Type:** UI/product-spine read-model implementation. No simulation mechanics, scenario data, OOB, painted targets, operation catalog content, combat code, or run artifacts changed.

## Summary

- Added Chronicle review filters for All, Headlines, Cost, Combat, Political, Humanitarian, Military, Diplomatic, and Narrative.
- Kept one canonical Chronicle entry list, then projected deterministic filtered views from it.
- Updated the Chronicle dossier so its event count, headline flag, and lens label reflect the active filter.

## Why

Chronicle cost memory made severe campaign costs visible, but the overlay still behaved like a long ribbon. As the archive grows, the player needs quick review lenses: show only costly weeks, only headline events, or only a category such as combat or diplomacy. This is a product-readability improvement, not a new history writer.

## Changes Made

### Filter Model

- Added `ChronicleFilterId`, `CHRONICLE_FILTERS`, `countChronicleEntriesByFilter(...)`, and `filterChronicleEntries(...)` in `ChronicleReviewFilters.ts`.
- Added per-filter counts derived from the already-generated Chronicle entries.
- Added `filteredEntries`, which is the only source for turn groups, timeline event dots, dossier event cards, and filtered event totals.

### Header Review Bar

- Added compact filter buttons with accessible `aria-pressed` state and count tooltips.
- Header now shows filtered count over total count, so a cost-only or headline-only lens stays legible.

### Dossier Panel

- Dossier counts now follow the active lens.
- Added a Lens cell to make the selected filter explicit while inspecting a turn.
- Added an empty filtered state: `No Chronicle entries match this filter.`

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Added filter state, counts, filtered projection, filter buttons, dossier lens, and empty filtered state. |
| `src/ui/map/components/chronicle/ChronicleReviewFilters.ts` | Added pure filter/count helpers shared by the overlay and tests. |
| `tests/ui_chronicle_review_tools.test.ts` | Added unit coverage for canonical filters, counts, and type/headline filtering. |

## Verification

- `npx.cmd vitest run tests/chronicle_entries.test.ts tests/ui/chronicle_endgame_mount.test.ts tests/ui_chronicle_review_tools.test.ts`
  - 20/20 pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean
- `npm.cmd run desktop:map:build`
  - success; existing Vite/browser-external/chunk-size warnings only

## Determinism And Scope

This is a pure UI read-model projection over existing `turnSummaries` and Chronicle entries. It does not mutate game state, write save data, or change simulation output. Counts and filtered turn groups are derived synchronously from the sorted Chronicle entry list.

## Next Steps

- When Chronicle deep links exist, filter cards can route to the matching Turn Aftermath record or War Summary slice.
- If the overlay gets crowded on very narrow viewports, move the filter row into a second header band rather than removing category counts.
