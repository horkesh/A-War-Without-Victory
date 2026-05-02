# Active Campaign Cost Spine

**Date:** 2026-05-02
**Type:** UI/product-spine read-model implementation. No simulation mechanics, scenario data, OOB, painted targets, operation catalog content, combat code, or run artifacts changed.

## Summary

- Added an active in-campaign cost read model over the existing Turn Aftermath archive.
- Surfaced cost-so-far in Army HQ Records and War Summary so the player can see cumulative price before endgame reckoning.
- Kept the one-way UI contract: this reads `turnSummaries` / `latestTurnSummary`; it does not create a second Cost Ledger writer or affect sim outcomes.

## Why

The Turn Aftermath product spine answered what happened this turn, but the player still had to mentally add up casualties, displacement, destroyed formations, hard turns, and net territory across the campaign. The final Cost Ledger remains the right endgame judgment owner, but active play needed a lightweight cost-so-far view that helps the president evaluate whether the campaign trajectory is worth the price.

This implements that bridge without touching the simulation. The active campaign cost view is an explanatory read model over already-persisted turn summaries.

## Changes Made

### Read Model

- Added `TurnAftermathCampaignCostView` in `src/ui/map/data/turnAftermath.ts`.
- Added `buildTurnAftermathCampaignCost(...)`, deriving:
  - archive record count and date window
  - severity band: `low | moderate | severe | critical`
  - cumulative friendly, opposing, and theater military casualties
  - cumulative displacement
  - own formations destroyed
  - hard-turn count
  - net friendly OSIDs
  - average friendly casualties per recorded turn
  - casualty-exchange ratio
  - deterministic top cost drivers
  - most costly archived turn

The helper uses deterministic sorting for driver ties and defaults to the full turn archive, while still accepting `limit` for tests or future narrower surfaces.

### Army HQ Records

- Extended `TurnAftermathRecordsPanel` with a `Campaign cost so far` section.
- The section shows:
  - severity
  - archive window
  - friendly casualties and per-turn average
  - casualty exchange
  - displacement
  - own formations destroyed
  - hard turns
  - net OSIDs
  - theater casualties
  - cost drivers
  - costliest turn

The existing record filters still apply to the campaign pulse and visible ledger summary; active campaign cost intentionally reads the full archive so it remains a campaign-level view, not a filtered-window view.

### War Summary

- Added a compact `Campaign Cost` block to the War Summary overview when archived turn records exist.
- The block gives the scan-line view:
  - severity
  - friendly casualties
  - displaced
  - net OSIDs

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/turnAftermath.ts` | Added active campaign cost view and builder. |
| `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx` | Added detailed campaign cost-so-far panel. |
| `src/ui/map/components/army_hq/WarSummaryContent.tsx` | Added compact War Summary campaign-cost block. |
| `tests/ui/turn_aftermath.test.ts` | Added active campaign cost aggregation and quiet-shell tests. |
| `tests/ui_turn_aftermath_wiring.test.ts` | Added source-level wiring proof for Records and War Summary surfaces. |

## Verification

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts`
  - 11/11 pass
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts`
  - 19/19 pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean
- `npm.cmd run desktop:map:build`
  - succeeded; Vite emitted existing browser-external / dynamic-import / chunk-size warnings only.

## Determinism And Scope

No simulation state, scenario state, operation execution, combat, control, event firing, or calibration artifact changes. The only output change is UI/read-model presentation over already persisted turn summaries.

The cost-driver ordering uses deterministic string comparison for tie breaks. The read model does not use `Math.random`, wall-clock time, locale sorting, or browser-only mutable state.

## Lessons

- Active cost belongs between Turn Aftermath and final Cost Ledger: Turn Aftermath owns turn truth and archive truth; final Cost Ledger owns game-over judgment.
- A live campaign cost surface should read archived turns directly instead of duplicating the endgame reckoning model.
- Filtered review windows and campaign-level cost are different surfaces. The pulse can recompute over visible records; campaign cost should stay anchored to the full archive unless the UI explicitly labels it as a filtered window.

## Next Steps

- Add an optional browser proof pass for the Army HQ Records panel once the next large UI lane touches Records again.
- When the Chronicle timeline matures, cross-link the costliest turn to its timeline entry.
- If the final Cost Ledger gains an active-campaign API, keep this surface as the scan-line UI and use the Cost Ledger only for richer reckoning details.
