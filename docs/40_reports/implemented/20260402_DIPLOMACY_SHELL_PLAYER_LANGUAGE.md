# 2026-04-02 - Diplomacy shell player language

## Summary

This pass cleaned up the last obvious raw faction shorthand in the live Warroom diplomacy shell.

Updated:

- `src/ui/warroom/components/DiplomacyModal.ts`
- `src/ui/warroom/components/FactionOverviewPanel.ts`

The modal still presents faction-specific diplomatic realities, but it now does so in player-facing political language instead of raw shorthand like `RS` or `HRHB` inside visible checklist and outlook text.

## What changed

### Political names in live copy

`DiplomacyModal.ts` now imports and uses `getPlayerSafePoliticalFactionName(...)` for visible diplomatic copy.

This affects:

- the RS patron-backing note
- the HRHB capability outlook line about joint pressure
- ceasefire tracker checklist rows
- Washington tracker checklist rows

Examples of the old language:

- `RS fights with patron backing`
- `Joint Pressure Bonus vs RS`
- `HRHB exhaustion > 35`
- `RS territory > 40%`

Those are now phrased using player-facing political names instead.

### Warroom live header badge alignment

`FactionOverviewPanel.ts` also had one smaller but important inconsistency:

- the peace/pre-war shell used the military-facing badge label
- the live war shell still showed the raw faction id in the header badge

This pass aligns the live war header with the same military-facing label rule, so the shell now uses:

- `ARBiH`
- `VRS`
- `HVO`

instead of raw faction ids in the header badge.

## Why this matters

The diplomacy shell is not a debug dashboard. It is a player-facing political surface.

In that context, raw shorthand reads like design notation rather than product language. This pass keeps the political layer aligned with the rest of the player-truth cleanup:

- military shorthand can remain where a military-facing shell intentionally uses it
- diplomatic/civic surfaces should default to political names

## Regression coverage

Added a source-level regression in:

- `tests/warroom_player_visibility.test.ts`

The new assertion proves:

- `DiplomacyModal.ts` uses `getPlayerSafePoliticalFactionName(...)`
- the older raw checklist labels are gone from the source
- `FactionOverviewPanel.ts` uses the military-facing header badge label instead of `${pf}`

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts tests\ui_map_render_smoke.test.ts`
- `npm.cmd run warroom:build`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
