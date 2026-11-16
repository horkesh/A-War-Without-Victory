## 2026-11-16 — B1: an overstaying army commander's competence decays linearly, as documented

Batch B, item B1 (freeze cut, Fable consult 2 revision 2): fix the code to the documented rate.

**Defect.** `applyEmergentVariationRules` (`src/sim/combat/army_co_lifecycle.ts`) is documented as "competence decays by `competence_decay_per_12w / 12` per turn". It runs once per turn, but each turn it added `decayPerTurn × overstayTurns` to the already-decayed competence. After n overstay turns the officer had lost `decayPerTurn × n(n+1)/2`. With the roster's −0.05 per 12 weeks, 12 turns cost −0.325 instead of −0.05, and 52 turns cost −5.5, which clamps at the floor of 1.

**Change.** Each overstay turn applies `decayPerTurn` once to the stored competence (clamped to [1, 5]). No new state field.

**Tests.** `a4_army_co_roster_personalities.test.ts`:
- T5 now runs the rule once per turn, as the pipeline does, and expects −0.05 after 12 turns. The old single-call test could not see the quadratic.
- New T5b: 24 turns cost exactly twice 12.
- 20 tests pass.

**Proof: inert in headless.** The rule only touches army commanders kept past their tenure (`kept_past_schedule_since_turn`). No officer reaches that state in the historical or the hands-off emergent 188w.
- Historical 188w against main `d10892602`: final_save `70f4dc05bf375bc7`, equal to the baselines manifest (after #696). No re-bless.
- A played game can reach the rule only where an army commander outlasts his tenure.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/` (b1_*).
