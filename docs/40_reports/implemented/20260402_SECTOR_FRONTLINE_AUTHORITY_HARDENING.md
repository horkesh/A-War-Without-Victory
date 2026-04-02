# 2026-04-02 - Sector frontline authority hardening

## Summary

Hardened frontline truth in the combat engine by preventing stale legacy front assignments from expanding the frontline set when corps front sectors already exist. Before this change, `buildFrontlineAssignedFormationSet(...)` would union sector assignments with `brigade_front_assignment`, which meant old legacy entries could keep extra brigades “frontline” even after sectors had become the intended authority.

## Implemented

- `src/sim/combat/front_assignment.ts`
  - `buildFrontlineAssignedFormationSet(...)` now treats sector assignments as authoritative when sectors exist
  - legacy `brigade_front_assignment` is now a fallback only when no sectors are present
- `tests/front_assignment.test.ts`
  - added regression coverage for stale legacy front assignments being ignored once sectors exist

## Why this matters

- combat eligibility, posture gating, fatigue, and end-of-run reporting all inherit frontline truth from this helper
- if sectors are supposed to be the modern command/frontline currency, stale legacy assignments must not silently keep extra brigades on the line
- this is exactly the kind of split-truth bug that makes a repo look “mostly migrated” while old behavior still wins in practice

## Verification

- `node_modules\.bin\tsx.cmd --test tests\front_assignment.test.ts tests\local_front_density_modifier_precedence.test.ts tests\formation_fatigue_frontline_assignment.test.ts`
  - PASS (`7` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Architectural lesson

Precedence inside a shared helper is itself game design. If a helper unions old and new authority paths “just to be safe,” the migration is not actually complete.
