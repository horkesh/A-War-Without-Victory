# BCS Presidential Toolbar Chrome Localization

**Date:** 2026-05-23
**Type:** Implemented tactical-map toolbar chrome localization slice
**Scope:** Presidential toolbar primary labels, titles, advance copy, current-turn suffix, and command-authority accessibility text

## Summary

The tactical-map `PresidentialToolbar` now renders its primary shell chrome through the English/BCS message substrate: Warroom/Chronicle/Summary/Records/Ops/Events/Codex labels and tooltips, no-state text, normal advance-turn copy, pre-advance severity tooltip text, Army HQ visit affordance text, and Command Authority label/title/description. The shared `formatTurnLabel(...)` helper now localizes the `Turn {n}` suffix while preserving its date arithmetic and existing English output.

This is presentation-only. It does not change advance gating, IPC behavior, inbox routing, Decision Room routing, Army HQ routing, dev tools, command authority values, save schema, simulation outputs, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` failed while BCS mode still rendered English toolbar labels such as `CHRONICLE`, `SUMMARY`, and `EVENTS`.
- Green: `npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts --reporter=dot` passed 6/6.
- Related: `npx.cmd vitest run tests\ui\advance_turn_button_gated_feedback.test.ts tests\ui\bottom_status_strip_labels.test.ts tests\ui\presidential_toolbar_severity_pip.test.ts tests\ui\warroom_date_i18n.test.ts tests\ui\turn_aftermath.test.ts --reporter=dot` passed 30/30.
- `npm.cmd run typecheck` passed after widening the test fixture's command-authority shape.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Broader War Summary non-overview chrome, broad Chronicle prose, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, operation-planning chrome, launch copy, and terminology/native-speaker review remain follow-up localization targets.
