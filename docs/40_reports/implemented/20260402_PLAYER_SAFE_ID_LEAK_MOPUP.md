# 2026-04-02 - Player-safe ID leak mop-up

## Summary

Removed a small but important class of remaining player-facing engine-ID leaks from the live shells:

- tactical-map attack confirmation no longer exposes raw `targetOsid` in a tooltip/title
- tactical-map formation detail no longer exposes raw `location_osid` or raw municipality ids in hover titles
- tactical-map order queue no longer exposes raw `targetOsid` in staged-order hover titles
- Warroom settlement info panel no longer prints raw settlement or municipality ids in the admin tab

This keeps the player shell aligned with the repo's player-knowledge integrity rules: engine identifiers may still exist in state and debug paths, but live player surfaces should show human-readable place/command language instead.

## Files changed

- `src/ui/map/components/AttackConfirmation.tsx`
- `src/ui/map/components/FormationDetail.tsx`
- `src/ui/map/components/OrderQueue.tsx`
- `src/ui/warroom/components/SettlementInfoPanel.ts`
- `tests/ui_player_visibility.test.ts`
- `tests/warroom_player_visibility.test.ts`

## Behavior change

### Before

- Attack confirmation showed the human display name, but hovering the target leaked the raw OSID.
- Formation detail showed the human location and municipality labels, but the hover title leaked the raw identifiers.
- Order queue showed the human target label, but hovering a staged order still leaked the raw `targetOsid`.
- Warroom settlement info admin tab printed `Settlement ID` and `Municipality ID`, which are engine/admin concepts rather than player-facing game language.

### After

- Attack confirmation shows only the human-readable target name.
- Formation detail shows only human-readable location and municipality labels.
- Order queue hover text now uses the same human-readable target label shown in the visible shell.
- Warroom settlement info now shows `Administrative Region` instead of raw registry ids.

## Verification

- `vitest run tests/ui_player_visibility.test.ts tests/warroom_player_visibility.test.ts`
- `tsx --test tests/ui_map_game_state_adapter.test.ts`

## Why this matters

These leaks were not catastrophic on their own, but they are exactly the kind of small shell lies that make the product feel like a debug build. This pass removes more of the "engine talking to the player directly" residue without touching gameplay logic.
