# Runtime Recovery: Sector Rearrangement Rollback

**Date:** 2026-03-06
**Regression run:** `apr1992_definitive_40w__7c821fa7d934716d__w40_n135`
**Recovered runs:** `apr1992_definitive_40w__7c821fa7d934716d__w40_n136`, `apr1992_definitive_40w__7c821fa7d934716d__w40_n137`
**Architect decision for later review:** keep `sector_rearrangement.ts` as a tested helper, but remove it from the live corps-AI runtime path until scenario-level acceptance exists.

## Summary
- A fresh 40-week recovery verification exposed a real runtime regression after the reporting/UI hardening slice.
- `n135` stayed deterministic but failed the combat-causality gate: battles dropped to zero from weeks 26-40 even though no invalid operations were reported.
- Root cause was the live wiring of sector rearrangement into `generateAllCorpsOrders()` in `src/sim/combat/bot_corps_ai.ts`.
- Recovery fix: stop mutating live corps sectors through `rearrangeSectorsForCorps()` during corps directive generation. Keep the helper module and its unit tests, but do not let it rewrite runtime front geometry until it is covered by full scenario acceptance.
- Result: `n136` and `n137` are byte-stable full 40-week reruns with a restored combat-causality gate.

## Root Cause
- `main` had three newer sector commits beyond the previously green causality baseline:
  - `5bbf1e4` `feat(sim): split non-contiguous sectors by friendly OSID BFS`
  - `6eb706d` `feat(sim): corps AI sector rearrangement — thin consolidation + pocket containment`
  - `fef9649` `feat(sim): wire sector rearrangement into corps directive generation`
- The first two helper layers were not the problem by themselves.
- The regression appeared only once rearranged sectors were written back into live `state.corps_front_sectors` inside `generateAllCorpsOrders()`.
- In `n135`, that left the scenario battleless from weeks 26-40:
  - `total_attack_orders = 69`
  - `total_battles = 57`
  - `valid_for_combat_calibration = false`
  - weekly `zero_battles` invalidation from week 26 through week 40

## Fix
- Updated `src/sim/combat/bot_corps_ai.ts`:
  - removed live `rearrangeSectorsForCorps(...)` application from corps directive generation
  - restored directive generation to use the canonical sectors already built by the sector pipeline
- Left `src/sim/combat/sector_rearrangement.ts` intact for isolated development and test coverage.
- Left `tests/sector_rearrangement.test.ts` intact so the helper behavior remains specified while it is off the live path.

## Recovered Evidence

### `n136`
- `final_state_hash = 334a4d3260894b0c`
- `behavioral_health.valid_for_combat_calibration = true`
- `total_attack_orders = 86`
- `total_battles = 74`
- `invalid_operation_count = 0`
- `zero_eligible_attacker_operation_count = 0`
- `control_change_attribution.combat = 30`

### `n137`
- `final_state_hash = 334a4d3260894b0c`
- identical to `n136`
- proves the recovered 40-week state is deterministic, not a one-off lucky rerun

## Architectural Rule
- Sector rearrangement is not rejected as a concept.
- It is rejected as a live runtime mutation until it satisfies the same gate as other combat-path changes:
  - scenario-level acceptance
  - no combat-causality regression
  - no mid-run cadence collapse
- The stable runtime authority remains the canonical corps-sector pipeline, not post-hoc AI-side sector rewriting.

## Verification
- `cmd /c npm run typecheck`
- `cmd /c node_modules\.bin\vitest.cmd run tests\sector_rearrangement.test.ts tests\sector_contiguity_split.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_operation_diagnostics.test.ts tests\scenario_vrs_operation_proof.test.ts tests\scenario_reporting_contracts.test.ts tests\ui_map_fog_and_operation_contracts.test.ts`
- `cmd /c npm run sim:scenario:run:40w -- --scenario data/scenarios/apr1992_definitive_40w.json --unique --out runs`
- `cmd /c npm run sim:scenario:run:40w -- --scenario data/scenarios/apr1992_definitive_40w.json --unique --out runs`

## Follow-up
- If sector rearrangement is reintroduced later, it needs:
  - explicit scenario-level acceptance coverage
  - evidence that `priority_sector_id` / `reinforce_sector_ids` do not drain live fronts into prolonged maneuver-only dead time
  - review against the combat-causality gate before merge
