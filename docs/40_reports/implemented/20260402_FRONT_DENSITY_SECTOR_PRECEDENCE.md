# 2026-04-02 - Front Density Sector Precedence

## Summary

Corrected `getLocalFrontDensityModifier(...)` so frontline density uses corps-front sectors first and only falls back to `brigade_front_assignment/local_fronts` when no sector assignment exists.

## Root cause

After the earlier frontline-contract cleanup, several systems were already sector-first:

- frontline fatigue
- shared frontline assignment helper
- battle/posture gating via `isBrigadeAssignedToFront(...)`
- army-strength reporting

But one defense-side helper still had the old precedence:

- `getLocalFrontDensityModifier(...)` looked up `brigade_front_assignment/local_fronts` first
- only if that failed did it consult `corps_front_sectors`

That meant a brigade with both:

- a current sector assignment
- and a stale or compatibility front assignment

could still receive the legacy density modifier instead of the sector density the rest of the engine now treats as primary frontline truth.

## Implementation

Updated `src/sim/combat/local_front_defense.ts`:

- `getLocalFrontDensityModifier(...)` now checks `corps_front_sectors` first
- legacy `brigade_front_assignment/local_fronts` remains as fallback only

This keeps defensive density on the same assignment currency as the rest of the frontline cleanup work.

## Tests

Added:

- `tests/local_front_density_modifier_precedence.test.ts`
  - proves sector density wins over legacy front-assignment density when both exist

## Verification

- `node_modules\\.bin\\tsx.cmd --test tests\\local_front_density_modifier_precedence.test.ts tests\\front_assignment.test.ts tests\\formation_fatigue_frontline_assignment.test.ts tests\\scenario_end_report_army_strengths.test.ts`
  - PASS
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
  - PASS

## Why this matters

This was another small helper with oversized authority.

If density modifiers still preferred the legacy front lane, combat math could keep defending brigades according to a stale frontage model even after the rest of the engine had moved to sectors. Fixing precedence here prevents one more "looks minor, bends everything" legacy seam.
