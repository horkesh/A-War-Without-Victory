# BCS Codex and Chronicle Comparison Localization

**Date:** 2026-05-23
**Type:** Implemented UI localization slice
**Scope:** Codex dynamic comparison notes, Chronicle endgame comparison cards, Chronicle Wrapped comparison bullets

## Summary

Generated historical comparison notes now render through the shared English/BCS divergence-note formatter in Codex dynamic essays, Chronicle endgame cards, and Chronicle Wrapped bullets.

This is presentation-only. It does not change `compareToHistorical(...)`, divergence-note generation, Cost Ledger data, Codex essay unlock logic, Chronicle entry selection, scenario data, save schema, calibration/army-arc behavior, operation outcomes, or simulation outputs.

## Implementation

- Expanded `formatHistoricalDivergenceNote(...)` to cover all current generated `compareToHistorical(...)` note shapes: duration, territory-control deltas, military-casualty ratio, and known Srebrenica notes.
- Added English/BCS `warCost.divergence.territoryControlled*` and `warCost.divergence.casualtyTotal` message keys.
- Routed Codex `{comparison_notes}` expansion through the shared formatter.
- Routed Chronicle card details and Chronicle Wrapped bullets through the shared formatter; unknown authored prose remains unchanged.
- Fixed the non-browser locale boundary so `setLocale(...)` remains effective when no `window.localStorage` exists, preserving SSR/test rendering behavior.

## Verification

- Red: `npx.cmd vitest run tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts --reporter=dot` failed while BCS mode still rendered raw generated English comparison notes and non-browser locale lookup reset to English.
- Green: `npx.cmd vitest run tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts --reporter=dot` passed 22/22.
- Expanded localization/endgame pack: `npx.cmd vitest run tests\ui\endgame_interaction_proof.test.ts tests\ui\game_over_i18n.test.ts tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\verdict_share_summary.test.ts tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\war_cost_summary.test.ts tests\ui\codex_panel_dynamic_mount.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\wrapped_slides.test.ts tests\chronicle_entries.test.ts --reporter=dot` passed 106/106.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Localization still needs prose-heavy slices for Cost Ledger finding prose, authored verdict prose, broad Chronicle chapter/session prose, Army HQ/Decision Room/event prose, and native-speaker terminology review.
