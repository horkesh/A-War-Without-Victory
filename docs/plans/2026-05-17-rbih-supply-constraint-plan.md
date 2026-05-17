# RBiH Supply Constraint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Represent RBiH arms-embargo supply constraints in live reserves and combat supply pressure without making RBiH permanently nonfunctional.

**Architecture:** Use existing supply reserve owner and live `war_supply_condition`; embargo caps constrain heavy/general supply while aid/airdrops have bounded effects.

**Tech Stack:** TypeScript supply state, combat supply condition, embargo flags, Vitest, scenario proof.

---

## Files

- `src/state/supply_reserves.ts`
- `src/state/supply_reserve_constants.ts`
- `src/sim/combat/supply_condition.ts`
- `src/sim/combat/supply_pressure.ts`
- `src/sim/combat/exhaustion.ts`
- `src/state/embargo.ts`
- `tests/supply_reserves.test.ts`
- `tests/supply_reserves_phase_b.test.ts`
- `tests/combat_supply_pressure.test.ts`
- `tests/supply_airdrop.test.ts`

## Implementation Tasks

1. Add failing tests proving RBiH patron aid under `arms_embargo_active` is lower than aid without embargo.
2. Pin adopted embargo caps such as `EMBARGO_SUPPLY_CAP.RBiH` and `EMBARGO_HEAVY_CAP.RBiH` in constants/tests.
3. Add tests proving UN airdrops improve general supply but not heavy munitions.
4. Ensure combat consumers prefer live `war_supply_condition` over legacy cumulative pressure where applicable.
5. Patch `updateSupplyReserves(...)` and downstream consumers through named constants only.
6. Run 40w proof and document RBiH readiness, casualties, and operation tempo drift.

## Verification

- `npx.cmd vitest run tests/supply_reserves.test.ts tests/supply_reserves_phase_b.test.ts tests/combat_supply_pressure.test.ts tests/supply_airdrop.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run sim:scenario:run:40w`

## Documentation And Ledger

- Update supply design/spec docs.
- Update `docs/40_reports/REAL_WAR_MASTER.md`.
- Add `docs/PROJECT_LEDGER.md` behavior entry.

## Stop Gates

- Stop if RBiH becomes permanently unable to attack or defend.
- Stop if airdrops/convoys eliminate heavy-munitions embargo effects.
- Stop if RS/HRHB supply behavior changes without attribution.
