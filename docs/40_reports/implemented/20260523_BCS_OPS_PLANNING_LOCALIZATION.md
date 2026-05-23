# BCS Ops Planning Localization

**Date:** 2026-05-23
**Type:** UI localization extraction only
**Scope:** Operations Planning modal phase chrome, gate feedback, parameter controls, G-2 clipboard labels, and authorization buttons

## Summary

This slice expands the existing Settings-only localization substrate into the Operations Planning modal. It keeps simulation identifiers, operation payloads, scenario data, diagnostics, and save contracts unchanged. English remains the fallback locale.

## Implemented

- Added English/BCS message keys for Plan, Objective List, Plan Parameters, G-2, authorization, and phase-gate copy.
- Routed operations-planning chrome through `t(...)` while preserving stable internal operation types, tempos, tolerances, axis ids, and payload names.
- Replaced mixed/mojibake authorization button text with dictionary-backed English and BCS labels.
- Added focused BCS render coverage for PlanPhase, ObjectiveList, PlanParameters, G2Phase, AuthorizePhase, and phase-gate functions.

## Boundaries

- OPORD body prose is still partly mixed formal BCS/English and remains a later prose-heavy extraction target.
- CommanderPhase officer-card labels and MapLegend/Narrative body prose remain follow-up localization targets.
- BCS strings are engineering draft copy and still require native-language review before release/store claims.

## Verification

- `npx.cmd vitest run tests/ui/ops_planning_target_discovery.test.ts --reporter=dot` passed: 14/14.
- `npx.cmd vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui/settings_screen_i18n.test.ts tests/ui_i18n.test.ts --reporter=dot` passed: 22/22.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with known Vite externalization/dynamic-import/chunk-size warnings.
- `git diff --check` passed with line-ending normalization warnings only.
