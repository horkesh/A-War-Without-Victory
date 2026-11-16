## 2026-11-15 — F7: supply-reserve event conditions hold only where the reserve model runs (slot 4; measurement pending)

- **Defect.** `evaluateCondition` (`src/sim/events/event_types.ts`) read `general_supply_reserve?.[faction] ?? 0`.
  - The shipping campaign runs with supply reserves off: `meta.supply_reserves_enabled` is unset and there is no reserve. So every `supply_below` condition held at any positive threshold. That is 15 events in `consequences.json`.
  - Measured on main `16fc0a62f`: one of them fires, `csq_supply_corridor_chronic_strain_RS` at t180, in headless 188w and live alike. Its effects are RS cohesion −4, RS recruitment ×0.92 for 20 turns, RS internal cohesion −3, and a Cost Ledger line.
  - It claims a supply shortage the game does not model.
- **Fix.** `supply_below` and `supply_above` are false unless `meta.supply_reserves_enabled` is true and the faction has a reserve.
  - The gate is the meta flag, as in combat (`attack_resource_aftermath.ts`), not the field's presence.
  - **Folded in (orchestrator, 2026-11-15):** a finished feint wrote `general_supply_reserve[faction]` (−0.5, creating the field at 0) even with reserves off (`sector_offensive.ts`). Nothing acted on it, but the turn summary showed a false −0.5 supply change. The write is now gated on `meta.supply_reserves_enabled`. Every behavioural reader is already gated, so this does not affect F7's attribution.
- **Tests.**
  - `tests/condition_evaluator.test.ts`, three new cases: reserves off makes both conditions false; a feint-written 0 reserve with reserves off does not count; a faction with no entry is not "below".
  - The twelve event-wave, condition and pressure fixtures that model a reserve now turn the reserve model on.
  - All 58 reserve-related test files pass (1,055 tests). tsc is clean.
- **Measured (one 188-week run, 2026-11-16; before = main `278e4eb55`).**
  - Final state hash: main `518de17970af5914`, F7 `799e43a7ee2f4764`.
  - **Control-identical.** 0 settlements differ at w39, w104, w156 and w188. All 251 control_events are identical. The scores stay 709/709/708/681. The t186-188 tail did not move.
  - `csq_supply_corridor_chronic_strain_RS` no longer fires (main fires it at t180). Only RS state after t180 changes.
  - Guards: verify_checkpoints "guard intact" (enclave 9/9, Farz P1/P-A/P-B, cascade 31 across 8 municipalities, eastern provenance CLEAN). engine_health_gate --strict PASS (consistency 0).
  - Re-pinned: `data/derived/scenario/baselines/manifest.json` (4 hashes). The 40-week structural fingerprint is unchanged (`3b1ddd64fb4f1600`), since F7 acts only from t180.
  - Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/slot4-20261115/`.
