# Chronicle Cost Memory

**Date:** 2026-05-02
**Type:** UI/product-spine read-model implementation. No simulation mechanics, scenario data, OOB, painted targets, operation catalog content, combat code, or run artifacts changed.

## Summary

- Added a Chronicle `cost` card type so costly campaign turns become part of the player-facing war memory.
- Generated cost entries from existing `turnSummaries` using player-scoped casualties, displacement, destroyed own formations, and net friendly territory.
- Kept Chronicle cost memory separate from final Cost Ledger judgment: it records notable cost events; it does not score the war.

## Why

The active campaign cost spine made cumulative cost visible in Army HQ Records and War Summary. The Chronicle still treated cost as indirect: battles, displacement waves, and destroyed formations could appear, but the campaign did not explicitly file "this was a costly turn" as an event in the timeline.

This change makes hard turns memorable. A player reviewing the Chronicle can see not only which towns changed hands, but which weeks extracted a severe price.

## Changes Made

### Chronicle Entry Generation

- Extended `ChronicleCardType` with `cost`.
- Added `buildTurnCostEntry(...)` inside `generateChronicleEntries.ts`.
- Cost entries are generated when a turn crosses one of these player-scoped thresholds:
  - friendly casualties at or above the severe threshold
  - own formation destroyed
  - displacement at or above the cost threshold
- When no player faction exists, the fallback uses theater casualties and displacement.

Cost entry metadata records:

- `casualties`
- `displaced`
- `costSeverity`
- `netFriendlyTerritory`
- `ownFormationsDestroyed`

### Chronicle Presentation

- Added `COST` label styling in `ChronicleCard`.
- Added cost dot color in `ChronicleOverlay`.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/chronicle/generateChronicleEntries.ts` | Added cost entry type, thresholds, builder, metadata. |
| `src/ui/map/components/chronicle/ChronicleCard.tsx` | Added COST card label/accent styling. |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Added cost timeline dot color. |
| `tests/chronicle_entries.test.ts` | Added severe-cost and quiet-turn regression tests. |

## Verification

- `npx.cmd vitest run tests/chronicle_entries.test.ts tests/ui/chronicle_endgame_mount.test.ts`
  - 17/17 pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean

## Determinism And Scope

No state mutation, no scenario output, no engine output, and no saved simulation shape changes. The Chronicle still derives from `turnSummaries` already present on the UI state. Entries sort by turn as before.

## Next Steps

- If the Chronicle grows deep links, route cost cards to the matching Army HQ Turn Aftermath record.
- Consider adding a small cost filter in the Chronicle overlay once the timeline filter model is revisited.
