# Formation Spawn Directive Narrowing

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Strict-null hygiene / formation-spawn directive boundary
**Scope:** Type-safety cleanup for active formation-spawn directive reads. No scenario data, combat math, operation behavior, save schema, UI behavior, calibration tuning, painted targets, or output contract changed.

## Summary

`FormationSpawnDirective` remains intentionally optional: absent directive means no spawn owner, absent `kind` uses the legacy/default brigade behavior, absent `turn` means active whenever present, and absent `allow_displaced_origin` means displaced-origin formation is disabled.

This slice does not promote any optional fields. It adds `getActiveFormationSpawnDirective(...)`, which returns the narrowed directive or `null`, and updates the early-war runtime and browser-safe runner to consume that local value instead of re-reading `formation_spawn_directive!` after a boolean active check.

## Determinism

- The active-directive predicate is unchanged.
- The formation-kind defaulting expression is unchanged.
- No save/default/migration/schema shape changed.
- No timestamps, randomness, or output fields were introduced.
- The change aligns with `docs/20_engineering/CODE_CANON.md` by keeping optional save shape explicit while avoiding non-null assertion reads at the caller boundary.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\formation_spawn_directive_narrowing.test.ts --reporter=dot` failed before implementation because both callers still contained `formation_spawn_directive!`. |
| Focused formation-spawn pack | PASS, 14/14: `npx.cmd vitest run tests\formation_spawn_directive_narrowing.test.ts tests\militia_rework.test.ts tests\early_war_turn_structure.test.ts tests\wia_trickleback.test.ts --reporter=dot`. |
| Strict-null inventory progress | PASS, 91/91 as part of `npx.cmd vitest run tests\formation_spawn_directive_narrowing.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot`. |
| Typecheck | PASS: `npm.cmd run typecheck` after adding the explicit `FormationSpawnDirective` type import. |
| Baseline regression | PASS: `npm.cmd run test:baselines`, all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/formation_spawn.ts` | Adds `getActiveFormationSpawnDirective(...)`; `isFormationSpawnDirectiveActive(...)` delegates to it. |
| `src/sim/turn_phases/early_war_phases.ts` | Formation-spawn phase consumes the narrowed active directive local. |
| `src/sim/run_early_war_browser.ts` | Browser-safe early-war runner consumes the narrowed active directive local. |
| `tests/formation_spawn_directive_narrowing.test.ts` | Guards against reintroducing `formation_spawn_directive!` in the two callers. |

## Next Steps

- Keep the optional directive fields optional unless a future save-schema/defaulting lane introduces an explicit migration.
