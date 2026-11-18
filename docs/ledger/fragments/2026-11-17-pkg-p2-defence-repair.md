## 2026-11-17 — Package "1994-95 attack and defence", P2: the defence repair (steps 1, 2, 2b, 3 and ruling D; measured, re-pinned)

The Fable freeze-revision package, Part 2, as ratified by five seats plus the integrator (consult 3 addendum, appendix A). Calibration is held: scores are recorded and are not a merge bar. Step 4 (stance coherence) moves to P3 by orchestrator ruling (option C): it will key on consult 4's single launch estimate, because the ratified launch-feasibility signal (`sector_offensive_launch_helpers.ts:77`) runs for almost no corps. The dead `evaluateCorpsOffensiveLaunch` caller is registered as RETIRE.

**Step 1: the complete posture rule, plus the relief-donor rule.**
- **Posture.** At the one point where the brigade pass's orders are final (`bot_brigade_ai_osid.ts`), every `defend` for a static front brigade becomes `dig_in`, at any cohesion. `defend` drains −1/turn; `dig_in` recovers +0.5 and defends at least as well. Step 0b found RS front brigades below cohesion 40 were 94.5% in `defend`.
- **Stays `defend`:**
  - a brigade with an attack, movement or column order, or an existing move;
  - sector reserves and off-front brigades;
  - execution-phase brigades;
  - disrupted brigades;
  - brigades that may not adopt `dig_in`;
  - the post-repulse `defend` (a combat write).
- **Relief donors.** Dug-in brigades are legal relief donors. They rank after donors that are not dug in, then by `dig_in_progress`, then distance. `isSectorUnstaffableByFaction` changes with it, and a dug-in own reserve no longer defers SE7E.

**Step 2: the army reserve answers a threatened sector.**
- The gap check reads every sector of the corps, not just the first. A gap is a breached sector (it fronts a cell lost in combat in the last 2 turns), an unstaffed front, or high threat.
- Breach ranks first, then unstaffed, then threat. A defensive gap outranks offensive support.
- An unassigned army-reserve elite rests in `hold` (+1/turn off the front) instead of draining in `defend`.

**Step 2b: the gap check reads a real local force ratio.** `threat_ratio` is a sector pressure index, not a force ratio, so 82% of RS sector-turns exceeded the cap point and every RS corps requested at priority 85.
- The reserve now reads hostile men on the sector's enemy-side cells ÷ own effective men assigned.
- `threat_ratio` and its readers are untouched (documented in #745).

**Step 3: a retake-only counter-attack in any corps stance.**
- The brigade counter-attack (self-retreat 1000, sector 950) runs for every stance, with its existing gates.
- Every target must be a cell the faction lost in combat within 2 turns and has not taken back, militia-held losses included.
- The sector variant no longer reaches enemy cells within 2 hops of a retreat.
- Acceptance: no non-operation battle captures a cell that was not just lost.

**Ruling D (orchestrator, 2026-11-17): the cause of the weak Ozren line.** On main with E1 (#766), a 3rd Corps generic op ("Operacija Odbrana") took Donja Bočinja at t161 (May 1995), an EARLY FALL under the Farz guard. Seats: corps-army-commander, operations-expert, historian; two rounds. Evidence: `C:/Users/User/AppData/Roaming/Claude/side-session-notes/local_ea8cb1d9-d0ee-452a-9381-ac503bb06273/f1g2_*.md`; runs under `C:/Pyrrhic/AWWV-worktrees/_logs/pkg-p2-ruling-d/`.
- **Cause.** Nobody stood on Donja Bočinja: defence 176, all of it reactive (0.6 per hop), against 529.
  - The 3rd Ozren, historically the Maglaj-face brigade (BB2 p.489 n.3; BB1 p.254 n.41, pp.387-388), had its home on the Doboj-town cell, so it never stood there.
  - The 1st Ozren held the face until a VRS operation took it to Doboj town at t111, and nothing re-posted it.
  - A single-brigade 3:1 attack in May 1995 should not take the cell (historian, high confidence).
- **F1 (data).** `rs_3rd_ozren_light_infantry.home_osid` → `op:maglaj:donja_bocinja_2`; home_mun stays doboj (the HQ, Gornja Paklenica, is in the Doboj-town cell). This also moves its home reactive bonus to Maglaj targets.
- **Q3, a P2 regression fixed.** Step 1 digs in every static front brigade. A dug-in brigade later reclassified off the front could never change posture again, so every multi-hop order to it died at the dig_in lockout: 2161 blocked marches over 188w with P2, against 796 on main. About 20 brigades were frozen, mostly ARBiH on the dormant HVO line.
  - Now the posture pass returns any off-front dug-in brigade to `defend` (`applyPostureCosts`), no order needed; a live-operation participant keeps `dig_in`. The lockout is unchanged. (An order-based stand-down was tried first and still left 7-13 brigades frozen, since no defend order reaches a rear brigade with a march order.)
  - Measured with F1, the freed 1994 ARBiH strength took Donja in Aug 1994 ("Korak", t103-105) with no VRS answer. So P2-alone's Ozren hold had been partly bought by the freeze.
- **P3, the surplus-stack spread (T6).** Front distribution spread only brigades on their arrival turn, so a stack that survived one turn stayed stacked beside empty front cells (the 1st Krnjin and 3rd Ozren sat on Grapska t21-t174 beside empty Zelinja, Petrovo and Gornja). A brigade that is surplus on its cell (another staying brigade outranks it by entrenchment, personnel, id) may now spread to an adjacent empty front cell. `MOVEMENT_AUTHORITY.md` §3b.
- **4a, no generic loan for a worn elite.** Generic Army HQ loans skip an elite already below its morale or cohesion recall line (`isEliteFitForGenericLoan`), ending the Drina cycle (two Main Staff elites loaned and recalled for morale collapse in the same turn, every 4 turns, t150-187). Authored-operation loans are untouched.
- **4c, the same-corps seam roster.** The sector lookup returns one sector per cell, so a cell on the fronts of two sectors of one corps was defended by one roster, chosen by lookup order. At Donja the 2nd Armored (sector 0) stood two hops away and never reacted. `collectSectorDefenseBrigades` now adds the other same-corps sector's brigades; other corps are not added. Used by the resolver and the planner.
  - **Bound (Fable consult 7).** Seam brigades only add: the reaction's cap and floor average the owning sector's roster (`collectAverageDefenseRoster`). Unbounded, weak distant seam brigades diluted the average and made a seam cell weaker in 15 of 49 seam battles (Fable's survey). With the bound, 60 seam battles in the final trajectory: stronger 35, same 25, weaker 0.
  - The 1992 eastern losses (Foča, Čajniče, Gacko, Trnovo, DV Korenići, Hadžići) are an honest effect: without the seam roster one brigade (the 851st) took the wear for three cells. They go to the data pass, not a dated limit (Fable: that would be a railroad).
  - Korak replay (same attack, S2 t100 checkpoint): Korak fails (0.43, 0.38) and Donja holds to t125, defended by the 2nd Armored.
- **Tried and dropped.** A corps "breach answer" (a T6 move of a spare brigade next to a fresh combat loss): inert at Donja in same-attack replays, so it was removed (orchestrator ruling, 2026-11-17; 1.0 gets no new reserve mechanic). A post-operation return to the home cell ("E", both seats): measured inert. Step 2c for the army reserve: left out (both seats). It would send the Main Staff elites to the Ozren in Sept 1995 too.

**Measured, ruling D, one change per run** (188w historical; breach answer off in all; logs `_logs/pkg-p2-ruling-d/steps/`):

| step | change | hash | checkpoints | guard | Donja falls |
|---|---|---|---|---|---|
| S0 | P2 base | `f9b95c40` | 707/696/695/665 | P-A FAIL | t161 (Odbrana) |
| S1b | + automatic stand-down | `db04c83e` | 708/705/701/666 | intact | t182 (Farz) |
| S2 | + F1 | `a76d1a72` | 710/708/702/675 | breached (P-B) | t105 (Korak) |
| S3 | + P3 | `f28cffd3` | 703/701/698/665 | intact | t181 (Farz) |
| S4 | + 4a | `cc9132d8` | 703/701/698/665 | intact | t181 (Farz) |
| S5 | + 4c | `5de1866e` | 694/688/685/658 | intact | t181 (Farz) |
| S6 | + 4c bound | `b4fd13c9` | 694/686/684/655 | intact | t181 (Farz) |

**Final proof** (branch head after merging main a37d0ce39):

| | historical | hands-off emergent | roster 2c on top (scratch merge) |
|---|---|---|---|
| Hash | `6b533ad4ee66670d` (twin identical; without E1 identical) | `a39eb715e88af21b` | `23335ba2` / emergent `babab9a5` |
| Checkpoints | 694/686/685/655 | 694/686/685/655 | 694/682/679/645 / 694/682/677/651 |
| Enclaves; scheduled falls | 7/7 hold; 2/2 | 7/7; 2/2 | 7/7; 2/2 (both) |
| Eastern provenance | CLEAN | CLEAN | CLEAN (both) |
| Farz P1; P-A | 4/4; t179/180/181/183 PASS | 4/4; t179-183 operation-owned PASS | 4/4; PASS (both) |
| P-B | 0 late 2nd-Corps captures | 0 | 0 / 1, warranted PASS |
| HRHB western cascade (reported) | 30 matched | 30 | 31 / 32 |

- `validate_run_consistency` PASS (historical and emergent). Baseline pins re-pinned to `6b533ad4`; structural fingerprint re-recorded (`d97b4cf4`); startup snapshot rebuilt (unchanged).
- Cells, S5 → S6 at oct1995: −10/+7 (`steps/s5_vs_s6_cells.txt`); S4 → S6: `steps/s4_vs_s6_cells.txt`.
- ARBiH non-probe operations t99-178 / success: S5 4 / 2, S6 13 / 5 (more 1994 launches, mostly failing at high ARBiH cost; trajectory diverges from week 11).
- **Not proven:** that the Ozren holds structurally against a concentrated 1994-95 ARBiH push by a player. The forced-attack played probe is the structural test, the first task after merge.

**Measured, steps 1-3** (188w on main 9bdefb158 after #729; scored with the corrected Farz guard, #769):

| | main (`3b4685bc`) | P2 (`6fff19a064a7206e`, twin 8/8) |
|---|---|---|
| Checkpoints | 709/709/708/682 | 705/696/690/666 |
| Guards (enclaves, Farz P1/P-A, P-B, eastern provenance) | PASS | **PASS** |
| Ozren cells (Vozuća, Bočinja ×2, Spreča) | t180/181/182/185, operation-owned | **same turns, operation-owned** |
| VRS brigades below cohesion 30, w100/120/140/160 | 43/50/55/61 | **2/8/11/14** |
| VRS mean cohesion, same weeks | 38.5/33.5/32.1/29.7 | **62.3/59.2/56.2/54.4** |
| ARBiH ops t99-178 / success | 4 / 4 | 3 / 1 |
| VRS ops t99-178 / reaching battle | 7 / 0 | 9 / 1 |
| Non-operation battles (counter-attacks) / wins on a not-just-lost cell | 0 / 0 | 2 / **0** |

- `validate_run_consistency` PASS.
- Hands-off emergent run (on top of #727): `382c3b55c4fe87ea`. Checkpoints 705/696/690/671, every guard PASS, Farz 4/4, and the Ozren cells held until September 1995.
- Baseline pins re-pinned to the P2 hash.

**Held, not in this change:**
- the step-0b retag (`9e7b64d6f`);
- RF-STRENGTH and the gate40 probe gate (P3/P4);
- the P-B Ćuprija trace on that experimental base;
- step 2c (the standing commander "critical" request versus a live breach). Ruling-D seats: not in this change. The served-request shuttle (two Main Staff elites cycling to Drina) is a separate measured defect, to be tested as a single variable.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/pkg-1994-95-step0/` (STEP0B, STEP1, STEP2B, STEP3 results) and `_logs/pkg-p2-proof/`.
