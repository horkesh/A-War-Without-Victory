# 2026-04-03 - Displacement trigger and corps attack-axis authority cleanup

## Summary
- Repointed displacement-trigger eligibility to prefer live `corps_front_sectors` edge ownership instead of the older generic pressure-emergence scan whenever sector frontline truth exists.
- Retired the dead `corps_attack_axis_orders -> brigade_attack_orders` bridge from the live war pipeline and desktop/player shell surfaces.
- Added focused regressions so future cleanup cannot silently reintroduce either false-authority path.

## Why
- Displacement triggers were still discovering front activity through the old pressure/emergence helpers, which meant Phase F could disagree with the live sector model even after frontline, pressure, and exhaustion had moved to sector truth.
- `corps_attack_axis_orders` was a classic half-alive authority seam: no live UI owned it, but the desktop shell still exposed it and the war pipeline still translated it into real brigade attack orders late in the turn.
- Both seams created the same studio-level problem: more than one system could claim to own frontline/offensive truth.

## Files changed
- `src/sim/displacement_pipeline/displacement_triggers.ts`
- `src/sim/combat/corps_front_assign.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/desktop/desktop_sim.ts`
- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/ui/map/desktop/useIPC.ts`
- `src/state/game_state.ts`
- `tests/displacement_pipeline_displacement_triggers.test.ts`
- `tests/brigade_corps_front_assign.test.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`

## Implementation notes
- Added a sector-owned eligible-edge helper in `displacement_triggers.ts` that:
  - builds the live edge scope from `corps_front_sectors[*].edge_ids`
  - filters the supplied edge graph to those edge IDs in deterministic order
  - still validates opposing control through `isPressureEligible(...)`
  - falls back to `getEligiblePressureEdges(...)` only when live sector truth is absent
- Removed `applyCorpsAttackAxisOrders(...)` and its pipeline step.
- Removed the desktop/preload/useIPC bridge for `stage-corps-attack-axis-order`.
- Removed `corps_attack_axis_orders` from the canonical state schema so the repo no longer advertises it as a legitimate live order surface.

## Verification
- `node .\node_modules\tsx\dist\cli.mjs --test tests\displacement_pipeline_displacement_triggers.test.ts`
- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts tests\brigade_corps_front_assign.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- Phase F activity/displacement eligibility now follows the same sector-owned front contract as other frontline mechanics when that contract exists.
- Offensive truth has one fewer ghost writer: the old corps attack-axis bridge no longer injects real brigade attack orders from a parallel desktop path.
