# 2026-04-02 - Local fronts runtime demotion

## Summary

Demoted `local_fronts` from live runtime truth to legacy compatibility baggage. The combat engine no longer needs the `local_fronts` object to calculate legacy density fallback; it can derive that directly from `brigade_front_assignment + assignable_front_segments`. That let the turn pipeline stop rebuilding `local_fronts` every war turn.

## Implemented

- `src/sim/combat/local_front_defense.ts`
  - legacy density fallback now derives from `brigade_front_assignment + assignable_front_segments`
  - no longer depends on `state.military.local_fronts`
- `src/sim/turn_pipeline.ts`
  - stopped rebuilding `local_fronts` during war refresh; runtime state now clears it
- `src/sim/turn_phases/war_phases.ts`
  - stopped rebuilding `local_fronts` in the war pipeline
  - updated commentary to reflect sectors as live frontline authority and legacy fronts as fallback only
- `tests/local_front_density_modifier_precedence.test.ts`
  - now proves the legacy fallback works without any `local_fronts` runtime object

## Why this matters

- `local_fronts` had become a half-dead authority path: rebuilt every turn, but only needed as a fallback for one helper
- keeping it alive as runtime state made the repo look more migrated than it really was
- this removes one more place where old front logic could silently preserve itself out of habit

## Verification

- `node_modules\.bin\tsx.cmd --test tests\front_assignment.test.ts tests\local_front_density_modifier_precedence.test.ts tests\formation_fatigue_frontline_assignment.test.ts`
  - PASS (`8` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Architectural lesson

If a legacy object exists only so one helper can read it, the better refactor is usually to move that helper onto the surviving primitive data and stop rebuilding the compatibility object every turn.
