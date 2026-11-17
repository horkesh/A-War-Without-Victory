## 2026-11-17 — Package "1994-95 attack and defence", P2: the defence repair (steps 1, 2, 2b, 3; measured, re-pinned)

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

**Measured** (188w on main 9bdefb158 after #729; scored with the corrected Farz guard, #769):

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
- step 2c (the standing commander "critical" request versus a live breach; seats to rule).

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/pkg-1994-95-step0/` (STEP0B, STEP1, STEP2B, STEP3 results) and `_logs/pkg-p2-proof/`.
