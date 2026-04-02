# 2026-04-02 Player-Safe Event and Attack Labels

## Summary

Removed raw faction-id jargon from live attack confirmation and event decision shells.

## What changed

- `src/ui/map/components/AttackConfirmation.tsx`
  - attacker and defender faction labels now use `getPlayerSafeMilitaryFactionName(...)`
- `src/ui/map/components/EventModal.tsx`
  - event effect summaries now use `getPlayerSafePoliticalFactionName(...)`
  - faction impact badges now render player-safe political faction names
  - alliance-change wording now uses player-safe political-side names instead of raw `RBiH-HRHB`
- `src/ui/map/components/EventDecisionModal.tsx`
  - decision effect summaries now use player-safe political faction names
  - decision header now renders player-safe political faction naming instead of raw faction ids
- `tests/ui_opord_player_safe_labels.test.ts`
  - extended existing player-safe label guards to cover attack and event shells

## Why this matters

Attack confirmation and event modals are high-visibility player shells. If they still speak in raw faction ids, the product slips back into debugger language exactly when the player is making consequential decisions.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_opord_player_safe_labels.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
