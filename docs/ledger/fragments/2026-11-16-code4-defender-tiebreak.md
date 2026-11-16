## 2026-11-16 — CODE4: equal-power defenders rank by formation id (freeze Batch C5; byte-identical)

- **Defect.** `rankDefendersByPower` (`src/sim/combat/combat_math.ts`) and its predictor mirror (`rankDefendersByPowerWithEntries`, `combat_predictor.ts`) sorted defenders by power only.
  - `Array.prototype.sort` is stable, so tied defenders kept the caller's list order, and that order is not part of any contract.
  - The primary defender (who takes the casualties) and the stacking order could therefore depend on how the caller built its list.
- **Fix.** Equal power breaks by `strictCompare` on formation id, in both copies. The two must stay identical.
- **Proof.** One 188-week run on main `278e4eb55` gives final state hash `518de17970af5914`, the same as main. The canonical run has no tie that the old order resolved differently, so there is no re-pin.
- **Tests.** New `tests/rank_defenders_tiebreak.test.ts`: tied twins rank by id in either input order, with the same total; a stronger defender still ranks first whatever its id. The first case fails on the old code. `operation_preparation_force_ratio` and `bot_orders_perf_profile` pass. tsc is clean.
