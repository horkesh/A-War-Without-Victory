# 2026-04-02 Legacy Front Assignment Phase Narrowing

## Summary

Narrowed the explicit `ensure-brigade-front-assignment` war phase so it only runs when sector-based frontline truth is absent. Once sector state already exists, the engine no longer spends every war turn repairing the old front-assignment lane out of habit.

## Problem

After sectors became the real frontline authority, the war pipeline still ran `ensureBrigadeFrontAssignments(...)` unconditionally every turn. That kept the compatibility lane warm even when:

- `corps_front_sectors` already existed
- frontline helpers were already sector-first
- `local_fronts` had been demoted out of runtime truth

This did not just cost work; it made the old front-assignment system look more alive than it really is.

## What Changed

### 1. Added an explicit sector-truth gate

In `src/sim/combat/front_assignment.ts`:

- added `hasLiveSectorFrontlineTruth(state)`
- `buildFrontlineAssignedFormationSet(...)` now uses that same gate before trusting sector truth

### 2. Narrowed the compatibility repair phase

In `src/sim/turn_phases/war_phases.ts`:

- `ensure-brigade-front-assignment` now returns early when sector truth already exists
- legacy assignment repair remains available for first-turn compatibility and older saves where sectors are absent

## Verification

- `node_modules\.bin\tsx.cmd --test tests\front_assignment.test.ts tests\local_front_density_modifier_precedence.test.ts tests\formation_fatigue_frontline_assignment.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

- inspect whether the remaining compatibility phase can eventually be confined to load/repair paths instead of war-turn runtime
- keep correcting docs/comments that still present legacy front assignment as a live co-equal authority
