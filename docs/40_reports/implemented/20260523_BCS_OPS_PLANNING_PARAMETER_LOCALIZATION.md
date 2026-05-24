# BCS Operations Planning Parameter Localization

**Date:** 2026-05-23
**Type:** Operations-planning chrome localization slice
**Scope:** Ops phase-gate messages and PlanParameters operation-name/type/tempo/tolerance/support chrome

## Summary

Operations planning now routes its phase-gate prerequisite messages through the English/BCS message substrate. The parameter strip also localizes operation name label, type/tempo/tolerance/support group labels and descriptions, pill labels, pill subtitles, tooltip titles, artillery-preparation toggle text, and support detail copy.

This is presentation-only. It does not change operation plan state, phase-gate logic, commander selection, objective discovery, brigade assignment, artillery-preparation behavior, operation submission, scenario data, save schema, simulation output, calibration/army-arc behavior, or generated artifacts.

## Verification

- Red: `npx.cmd vitest run tests\ui\ops_planning_target_discovery.test.ts --reporter=dot` failed while BCS mode still returned English phase-gate messages and rendered English PlanParameters chrome.
- Green: `npx.cmd vitest run tests\ui\ops_planning_target_discovery.test.ts --reporter=dot` passed 10/10.
- Related: `npx.cmd vitest run tests\ui\ops_planning_target_discovery.test.ts tests\ui\accessibility_form_labels.test.ts tests\ui\gui_polish_typography_floor.test.ts tests\ui\ops_planning_draft_guard.test.ts --reporter=dot` passed 16/16.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- `git diff --check` passed.

## Remaining Work

Broader operations-planning surfaces remain, including Commander/G-2/Authorize/OPORD tabs, operation briefing modal prose, corps-front operation entry labels, broad Chronicle prose/chrome, rich Verdict authored prose/source-provided labels, source-provided Decision Room prose, map overlays, event prose, launch copy, and terminology/native-speaker review.
