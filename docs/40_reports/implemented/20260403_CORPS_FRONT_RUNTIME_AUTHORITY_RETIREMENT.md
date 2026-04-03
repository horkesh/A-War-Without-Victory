# 2026-04-03 - Corps-front runtime authority retirement

## Summary
- Removed the dead `corps_front_assign.ts` runtime lane from the live war pipeline.
- Stopped `scenario_runner.ts` from reporting `front_corps_tracking`, which had become a diagnostic lie once the underlying runtime path no longer produced meaningful truth.
- Removed dead `corps_front_edges`, `corps_fallback_front_edges`, and `og_subfront_edges` state fields from the core schema.
- Updated the active engineering contracts so they no longer advertise corps-front edge staging as a live player/runtime authority.

## Why
- `corps_front_assign.ts` had become a classic false-authority seam:
  - `deriveCorpsFrontEdgesFromBrigadeAoR(...)` always returned `{}`
  - `applyCorpsFrontAutoDistributionForCorps(...)` never wrote anything
  - yet the live war pipeline still scheduled `ensure-derived-corps-front-edges` and `apply-corps-front-orders`
  - and the scenario harness still reported `front_corps_tracking` as if that residue meant something
- This is exactly how half-dead systems keep confusing future work: a no-op path still runs every turn and still leaves behind a diagnostic/reporting footprint.

## Files changed
- `src/sim/turn_phases/war_phases.ts`
- `src/scenario/scenario_runner.ts`
- `src/state/game_state.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- Deleted:
  - `src/sim/combat/corps_front_assign.ts`
  - `tests/brigade_corps_front_assign.test.ts`

## Implementation notes
- Removed the two war-phase steps that kept corps-front edge residue looking alive:
  - `ensure-derived-corps-front-edges`
  - `apply-corps-front-orders`
- Removed `front_corps_tracking` from `run_summary.json` generation in `scenario_runner.ts`.
- Removed the dead state fields from `GameState` so the schema no longer suggests corps-front edge staging is part of the current canonical runtime.
- Hardened `engine_honesty_legacy_contracts.test.ts` so future work cannot silently reintroduce:
  - the dead pipeline steps
  - the dead run-summary field
  - the dead schema fields
- Updated active technical docs to reflect the current product/runtime truth:
  - no live `stage-corps-front-order`
  - no live `stage-og-subfront-order`
  - corps panels no longer own front-geometry staging

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts tests\front_assignment.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Notes
- `npx tsc --noEmit -p tsconfig.json` still fails in unrelated pre-existing files outside this slice (AAR panel typing, older test fixtures, and other existing type drift). This checkpoint did not introduce new compile failures in the focused area, but the repo is not globally type-clean yet.

## Outcome
- The war pipeline no longer runs a dead corps-front lane just to keep old terminology alive.
- The scenario harness no longer reports a fake corps-front runtime signal.
- The schema and technical docs now align with the truth already established in the player shell: sectors and operations own frontline command reality, not headless corps-front edge staging.
