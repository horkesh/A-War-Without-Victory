# BCS Ops Planning Localization

**Date:** 2026-05-23
**Type:** UI localization extraction only
**Scope:** Operations Planning modal phase chrome, gate feedback, parameter controls, G-2 clipboard labels, CommanderPhase cards, OPORD prose, map legend, narrative prose, and authorization buttons

## Summary

This slice expands the existing Settings-only localization substrate into the Operations Planning modal, then completes the prose-heavy operations-planning panels that were left open by the first pass. It keeps simulation identifiers, operation payloads, scenario data, diagnostics, and save contracts unchanged. English remains the fallback locale.

## Implemented

- Added English/BCS message keys for Plan, Objective List, Plan Parameters, G-2, authorization, and phase-gate copy.
- Routed operations-planning chrome through `t(...)` while preserving stable internal operation types, tempos, tolerances, axis ids, and payload names.
- Replaced mixed/mojibake authorization button text with dictionary-backed English and BCS labels.
- Added English/BCS message keys for CommanderPhase officer cards, OPORD body sections, G-2 narrative labels/fallback prose, and map legend body text.
- Routed CommanderPhase, OpordDocument, NarrativeTab, and MapLegendTab through `t(...)` without changing operation behavior or payload shape.
- Added focused BCS render coverage for PlanPhase, ObjectiveList, PlanParameters, G2Phase, AuthorizePhase, CommanderPhase, OpordDocument, map legend/narrative panels, and phase-gate functions.

## Boundaries

- Some dynamic staff-balance labels, externally supplied commander/narrative text, rank names, officer archetype/personality labels, operation/axis names, and settlement/corps names still come from data or existing domain helpers rather than the dictionary.
- Broad non-operations surfaces remain open: War Summary, Chronicle, Army HQ, verdict, report panels, inbox/decision-room prose, and native-language review.
- BCS strings are engineering draft copy and still require native-language review before release/store claims.

## Verification

- `npx.cmd vitest run tests/ui/ops_planning_target_discovery.test.ts --reporter=dot` passed: 17/17.
- `npx.cmd vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui/settings_screen_i18n.test.ts tests/ui_i18n.test.ts --reporter=dot` passed: 25/25.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with known Vite externalization/dynamic-import/chunk-size warnings.
- `git diff --check` passed with line-ending normalization warnings only.
