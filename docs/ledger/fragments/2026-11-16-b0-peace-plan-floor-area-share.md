## 2026-11-16 — B0: bot peace-plan responses measure territory by area, the unit of the plan split

Batch B, item B0 (freeze cut, Fable consult 2 revision 2; must-fix before emergent ships).

**Defect.** In emergent mode, `computeBotResponse` (`src/sim/negotiation/peace_plans.ts`) compared a faction's share of SETTLEMENTS (`getFactionTerritoryPct`, a count over `political_controllers`) with the plan's `proposed_split`, which is an AREA share (`peace_plan_data.ts`: "area-weighted as the game measures"). At week 40 of a hands-off emergent run RS held 52.7% of settlements but 63.4% of the area. The RS Vance-Owen floor read a 9.7pp gap instead of 20.4pp, the scorer accepted, and the war ended in January 1993 (`negotiated_peace:vance_owen`). The Contact Group floor, the Owen-Stoltenberg and Dayton floors, and the territory-gain bias every faction's accept option carries all read the same wrong measure. The floor constants were written for area ("Sim gap ~22pp (RS ~65%, VOPP proposes ~43%)").

**Change.**
- `getFactionTerritoryPct` → exported `getFactionTerritoryAreaPct`: km² held over the country total (`getOsidAreas`), the measure negotiation capital (`compute_capital.ts`) and the settlement map (`settlementTerritoryPct`) already use.
- `political_peace_plan.ts`: the call-site contract now states the area measure.
- Swept every other negotiation and political floor for the same mismatch: none. `computePoliticalPeacePlanResponse` has one caller. Dayton's package negotiation uses `settlement.territory_pct` and `area_pct` (both area). The delegation folder's held/total counts are labelled as settlements.

**Tests.** `tests/peace_plans.test.ts`: RS takes the largest settlements until it holds 40% of them (under VOPP's 43% by count, above 43% + 18pp by area). The test asserts that the helper returns the area share and that RS rejects Vance-Owen without ending the war. The peace-plan and political slices pass (10 files, 199 tests).

**Proof.**
- Historical 188w: final_save `799e43a7ee2f4764`, equal to the baselines manifest (main after #690). 709/709/708/681, guard intact, engine health PASS, 0 consistency failures. Historical mode never calls the scorer, so this is byte-identical by construction and by measurement.
- Hands-off emergent 188w (uncommitted scenario copy, `decision_mode: emergent`): the war runs to week 188 (no game over). VOPP t40 RS rejected; O-S t70 RBiH rejected; CG t118 RS rejected, all as in history. Scores 710/707/707/670 (before the fix: 710/667/657/568, ended at t40). Srebrenica and Žepa fall on schedule and every hold holds. Engine health PASS, 0 consistency failures, HRHB western cascade 29 (historical 31).
- The emergent guard still reads BREACHED: Farz receipts 0/4, unwarranted late 2nd Corps captures Seher t164 and Petrovo t179. These are the same breaches the probe's peace-pinned diagnostic showed; they come from emergent political decisions after t40 and go to the B5 triage. The historical guard is intact.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/` (b0_*).
