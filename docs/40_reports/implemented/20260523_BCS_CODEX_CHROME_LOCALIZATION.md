# BCS Codex Chrome Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** `CodexPanel` static chrome and dynamic-section labels

## Summary

`CodexPanel` now renders its static shell copy through the English/BCS message substrate: title, essay count, empty-selection instructions, locked-essay instruction, ghost badges, context labels, dynamic-section labels, pending-content text, and source heading.

This is presentation-only. It does not change Codex essay catalog data, essay titles, authored essay prose, dynamic section conditions, unlock logic, Cost Ledger data, historical comparison data, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Added `codex.*` message keys to the English/BCS dictionaries.
- Replaced hardcoded Codex shell labels and instructional copy with `t(...)`.
- Kept essay titles, essay bodies, source names, and category IDs source-authored.
- Preserved existing locale recomputation via `useLocale()` in `CodexPanel`.

## Verification

- Red: `npx.cmd vitest run tests\ui\codex_panel_dynamic_mount.test.ts --reporter=dot` failed while BCS mode still rendered `Codex`, `0 essays available`, `Select an essay`, `Historical Context`, and `Player War Divergence`.
- Green: `npx.cmd vitest run tests\ui\codex_panel_dynamic_mount.test.ts --reporter=dot` passed 6/6.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts --reporter=dot` passed 107/107.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs prose-heavy slices for authored Codex essay prose/content review, Cost Ledger finding prose, broad Chronicle chapter/session prose, Army HQ/Decision Room/event prose, and native-speaker terminology review.
