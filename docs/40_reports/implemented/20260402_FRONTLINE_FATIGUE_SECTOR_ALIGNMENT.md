# 2026-04-02 - Align frontline fatigue with sector assignment truth

## Summary

This checkpoint fixes a deeper split-truth problem inside the engine core. `applyFatigueRecovery(...)` was still deciding who counted as "frontline" purely from `brigade_front_assignment`, even though current frontline organization has largely moved to corps front sectors.

That meant combat density and frontline fatigue could follow different assignment truths:
- density already had a sector-aware path
- fatigue still only looked at the older front-assignment lane

## Root cause

- `src/state/formation_fatigue.ts`
  - `applyFatigueRecovery(...)` used `state.military.brigade_front_assignment`
  - brigades assigned to sectors but not explicitly present in `brigade_front_assignment` would miss frontline-duty fatigue

## Implemented

- `src/state/formation_fatigue.ts`
  - added a small `buildFrontlineAssignedSet(...)` helper
  - frontline assignment now resolves in this order:
    - corps-front sectors (`assigned_brigade_ids` and `reserve_brigade_ids`)
    - legacy `brigade_front_assignment` as compatibility fallback
  - `applyFatigueRecovery(...)` now uses that unified frontline set
- `tests/formation_fatigue_frontline_assignment.test.ts`
  - added a regression proving sector-assigned brigades accrue frontline-duty fatigue
  - added a compatibility regression proving legacy front assignment still works as fallback

## Verification

- `node_modules\.bin\tsx.cmd --test tests\formation_fatigue_frontline_assignment.test.ts`
  - PASS (`2` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Why this matters

- frontline fatigue is core engine truth, not just a cosmetic stat
- if combat density and fatigue read different assignment currencies, the simulation can quietly punish or spare brigades based on the wrong layer
- this keeps sectors as the primary frontline authority while preserving legacy front assignment as a compatibility fallback until the deeper local-front lane is fully classified
