## 2026-11-15 — F7: supply-reserve event conditions hold only where the reserve model runs (slot 4; measurement pending)

- **Defect.** `evaluateCondition` (`src/sim/events/event_types.ts`) read `general_supply_reserve?.[faction] ?? 0`.
  - The shipping campaign runs with supply reserves off: `meta.supply_reserves_enabled` is unset and there is no reserve. So every `supply_below` condition held at any positive threshold. That is 15 events in `consequences.json`.
  - Measured on main `16fc0a62f`: one of them fires, `csq_supply_corridor_chronic_strain_RS` at t180, in headless 188w and live alike. Its effects are RS cohesion −4, RS recruitment ×0.92 for 20 turns, RS internal cohesion −3, and a Cost Ledger line.
  - It claims a supply shortage the game does not model.
- **Fix.** `supply_below` and `supply_above` are false unless `meta.supply_reserves_enabled` is true and the faction has a reserve.
  - The gate is the meta flag, as in combat (`attack_resource_aftermath.ts`). It is not the field's presence, because a feint writes `general_supply_reserve` even with reserves off (`sector_offensive.ts`).
- **Tests.**
  - `tests/condition_evaluator.test.ts`, three new cases: reserves off makes both conditions false; a feint-written 0 reserve with reserves off does not count; a faction with no entry is not "below".
  - The twelve event-wave, condition and pressure fixtures that model a reserve now turn the reserve model on.
  - All 58 reserve-related test files pass (1,055 tests). tsc is clean.
- **Measurement.** One 188-week run when the orchestrator sends "slot 4 go". It is expected to move only the t180+ tail (RS). Watch the t186-188 knife-edge cell.
