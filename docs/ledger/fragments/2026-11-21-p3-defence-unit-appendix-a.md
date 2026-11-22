## 2026-11-21 — P3 defence unit with Fable consult 8 appendix A: a plan's own group mans its operation; the Sarajevo-corps stance rule retired

**Why.** The P3 defence unit (D1-D3, P3 step 4, row (b)) was held because it cut ARBiH late-war battles. Fable consult 8 found two defects already on main instead of the defence. The first is the "paper plan": the operation builder manned a plan's operation only from the objective sector's roster and ignored the plan's own assault group. The second is the RBiH Sarajevo-corps stance rule, which switched on by accident once the 1st Corps' derived home municipality tipped to Novi Grad.

**Ruling.** Fable consult 8 verdict (E), accepted by the orchestrator. The bar is appendix B: battles a week not below main in either mode, every guard, both validators, health --strict, the jan93 floor, no corps that fights on main falls silent. Seats: operations-expert, corps-army-commander and historian, all ACCEPT with conditions. The orchestrator GO'd on 2026-11-21. Also recorded as ACCEPT AS FINAL: the single-brigade probe lock and the alphabetical tie-break.

**Change.**
- `src/sim/combat/commander/emit.ts`: for a non-bilateral plan, the plan's `assigned_brigades` join the primary pool under the surplus, may-join, reach and readiness tests. A new opt-in receipt, `plan_group_receipt`, is written on the commander_creation row. Commit `d46e07453`.
- `src/sim/combat/bot_corps_stance.ts`: the RBiH Sarajevo-corps defensive block is removed. Commit `14927b4db`.
- Tests:
  - `tests/commander/operation_emit_overlap_guards.test.ts`: 5 new, 4 red before.
  - `tests/mobilization_bot_stance.test.ts`: a Sarajevo-based corps is not forced defensive; red before.
  - `tests/srk_siege_morale_audit.test.ts`: T6 now compares a Sarajevo corps with an identical corps elsewhere.
- Docs: Systems Manual, "Defence of a held line".

**Measured** (188w, both modes, against main 3511d660d = 6519fba3 / b4e4c79d).
- **Proof:** main with the stance block removed gives main's hashes, byte-identical.
- **Change 1 alone:** 0ec76dc3 / 24b8385b, every gate passes, 2.52 / 2.55 battles a week.
- **Both changes:** 7cb87ce9 / 55644ff8. Scores 695/693/692/664 and 695/693/692/665. Every guard, both validators and --strict pass. jan93 695. Battles a week 2.62 / 2.63 (main 2.45 / 2.44). idle_execution 33 / 35, at most 38.
- **Recorded:** ARBiH battles after week 100 are 157 / 158 (main 167 / 166). Operations built by the 1st-4th Corps in weeks 99-178 go from 4 (2 failed) / 5 (2) on main to 8 (3) / 13 (6). No corps falls silent; the lowest is SRK emergent, 6 → 2.
- **Not fidelity evidence:** about 1,300-1,600 ARBiH killed per failed Ilidža assault.
