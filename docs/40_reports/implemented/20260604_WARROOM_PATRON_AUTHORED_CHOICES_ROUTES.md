# Warroom Patron Relations And Authored Choices Routes

**Date:** 2026-06-04
**Type:** UI/product route hardening
**Scope:** Warroom shell only

## Summary

The Warroom toolbar and matching hotspots now route two mature player-facing surfaces directly instead of stopping on thin placeholder Warroom overlays:

- `Diplomacy` / telephone opens the existing `DiplomacyPanel` Patron Relations panel while staying in the Warroom shell.
- `Chronicle` / newspaper opens the existing `DecisionHistoryOverlay` Authored Choices ledger while staying in the Warroom shell.

This is a player-facing navigation correction only. It does not change simulation behavior, save schema, calibration, scenario data, presidential authority, Tactical Groups, event content, or diplomacy mechanics.

## Rationale

The accepted Warroom IA requires room objects to open understandable presidential surfaces first. The Diplomacy and Authored Choices surfaces already have richer read models and tests than the generic Warroom-native copy card, so routing to them directly gives the player a concrete destination instead of another launcher.

The thin Warroom overlay remains for `Intelligence`, `Staff`, and `Faction` until those receive richer native overlays.

## Verification

- Focused route/UI pack: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\ui\warroom_shell_accessibility.test.ts tests\warroom_shell_layer.test.ts tests\ui\diplomacy_panel.test.ts tests\ui\decision_history_overlay.test.ts --reporter=dot` passed 67/67.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run desktop:map:build` passed.
- `git diff --check` passed.
- Browser smoke on `http://127.0.0.1:3003/?view=warroom` confirmed the standalone dev URL serves the Warroom fallback when no campaign state is hydrated. Loaded-campaign route behavior is covered by the focused React route tests; standalone dev still lacks a deterministic loaded-state browser fixture for this shell.

## Follow-Up

Next Warroom product work should add richer native overlays and focus/return proof for `Intelligence`, `Staff`, and `Faction`, then run a loaded-campaign browser proof once a deterministic Warroom fixture or dev harness exists.
