# SE7E: an empty front sector promotes an eligible reserve or rear brigade

Date: 2026-11-14. Lane SE7E (register SD15; RF realism-audit fix). Branch `claude/amazing-clarke-z50rpc`.

Status: candidate (run 2, `b51e49f`, `ace4e553a491aecb`, 712/711/708/701). Oct95 −4 is one point beyond the −3 tolerance and is explained in §3-§5; it needs an orchestrator ruling. Pyrrhic gate and merge slot are pending.

Summary: a frontless sector with no eligible own reserve now commits its own eligible rear brigade through commander T1 relief. Consistency 1 → 0. Fixed on its own, the Visoko-Kiseljak gap changes no cell; every checkpoint change comes from the same rule applied at t4 in RS 2nd Krajina.

## 1. Reproduction on main

Main `887310d` (after #617/#622/#611), cloud session, `npm run sim:scenario:run:188w`:

- `final_state_hash` `4ff4a7665c0a35b5` (same as the RF-F1 pin).
- Checkpoints 712 / 709 / 710 / 705 (`node tools/verify_checkpoints.cjs`, exit 0, guard intact; enclave and Farz P1/P-A/P-B pass).
- Strict health (`node tools/engine_health_gate.cjs --horizon 188w --strict`) PASS.
- Battles per week 2.697 (RS 0.952, RBiH 1.441, HRHB 0.303).
- `node tools/validate_run_consistency.cjs` exit 1, one failure: `subseg:sector:arbih_1st_corps:4:0` in `sector:arbih_1st_corps:4` stays `gap=true` across 4 edges with legal donors `arbih_123rd_light` (sector 3 reserve), `arbih_164th_mountain` (sector 3 front), `arbih_146th_light` (own reserve), `arbih_147th_light` and `arbih_185th_light` (own rear), all 3 hops.

## 2. Premise, measured on main

An observer-only replay of main with a save every week (`--save-weeks 1..188`, `final_state_hash` `4ff4a7665c0a35b5`, identical) was classified by a probe. The probe takes every staffed front sector (`length_edges > 0`, not `unstaffed_front`) with no front brigade and tests each of its own reserve/rear brigades against the construction-time zero-assigned rescue bar.

- 293 such sector-turns:
  - 157 have no reserve or rear of their own, so commander T1 relief covers them;
  - 136 still list their own reserve or rear. In only 1 of those does an own brigade pass the rescue bar.
- What blocks the own brigades (counted per brigade-turn):

| Blocker | Brigade-turns |
|---|---:|
| `dig_in` | 275 |
| pending movement order | 103 |
| more than 3 hops away | 94 |
| operation participant | 20 |
| in transit | 16 |
| home more than 4 hops away | 7 |
| disrupted | 5 |

- **One persistent case.** ARBiH 1st Corps front `op:kiseljak:drazevici`, `op:visoko:rajcici_2`, `op:visoko:stuparici_2` (Visoko-Kiseljak, facing Ilidža Rudnik and Ilijaš Podlugovi):
  - no front brigade on t5-8 and **t98-t188 (91 turns in a row)**;
  - the validator reports missed reinforcement on every one of those turns from t98.
- Its own pool:
  - 147th and 185th: on `dig_in` every turn;
  - 146th: `dig_in`, plus a `bot_discretionary` column order that `processOsidColumnMovement` rejects every turn (`posture_dig_in`), and the bot re-issues every turn;
  - 164th: on `dig_in` or under an order;
  - 182nd (rear): free, but 4 hops away, one more than the rescue's limit of 3.
- Every other case lasts 10 turns or less. Most are early war (t1-21) or are blocked for legitimate reasons (operation participants, disrupted, in transit).

**Root cause: a hand-off gap between passes.**

| Pass | What it can move | Why it misses this sector |
|---|---|---|
| Construction (`ensureMinimumSectorCoverage`, zero-assigned rescue) | an own reserve/rear brigade within 3 hops, not dug in, not under an order, home within 4 hops | every own brigade fails that bar |
| Commander T1 relief (`computeEmptySectorReliefReassignments`, decide.ts) | a sector it counts as empty: no assigned, reserve **or** rear brigade | the sector lists its own pool, so it never counts as empty |
| Bot sector march (`evaluateSectorMarch`) | assigned and reserve brigades (`buildSectorAssignmentByBrigade`); a reserve of a sector with no line holder marches forward | rear brigades are invisible to it, and the reserve here is dug in |

So nothing moves an own **rear** brigade forward beyond 3 hops. The irony: T1 *would* send the 182nd if it were another sector's rear (tier 0); as sector 4's own rear it is never sent.

Phase order (`war_phases.ts`) rules out a second T1 blocker:
1. `osid-column-movement` deletes the 146th's rejected order;
2. `generate-bot-corps-orders` runs T1, so `hasPendingReliefForTargets` doesn't fire;
3. `generate-bot-brigade-orders` re-issues the order.

## 3. Candidates and measured runs

Each run is the authoritative `npm run sim:scenario:run:188w` on a clean, committed tree, with observer-only weekly saves for tracing. Baseline: main run `w188_n0` above.

### Run 1: every frontless sector with an own pool counts as empty for T1 (`bafe9b7`), REJECTED

- Rule: T1 treated every sector without a front brigade as empty and preferred the sector's own pool before sibling donors.
- Result: `567eb1f4a383e7f1`, 712 / 711 / 707 / 694 (Apr94 +2, Apr95 −3, Oct95 −11, net −12).
  - Consistency 0, strict health PASS, battles per week 2.723 (+1.0%).
  - `verify_checkpoints` breached: Farz P-A 2/4 receipts; P-B unwarranted 2nd Corps / HVO captures in Brčko at t175-180; Oct95 below the −3 tolerance.
- Trace: new T1 reliefs fired from w3-w4 on in several corps, and control diverged at t14 (`op:bosanska_krupa:arapusa_2`). Most of the new reliefs sent a sector's **own eligible reserve**, which the reserve sector march already moves. Some re-routed existing reliefs: RS 2nd Krajina at w4 sent the 1st Drvar to its own sector and the 3rd Petrovac to sector 0 instead of the 1st Drvar to sector 0. The rule was too broad.

### Run 2: own rear only, when no own reserve is eligible (`b51e49f`), CANDIDATE

- **Rule** (`computeEmptySectorReliefReassignments`):
  - a sector with no assigned brigade that still lists its own pool is empty for T1;
  - if it has an eligible own reserve, T1 leaves it to the reserve sector march;
  - otherwise T1 commits the sector's own eligible rear brigade (nearest friendly distance, then `strictCompare` on id). It never borrows another sector's brigade.
  - A sector whose own reserve/rear already stands on its front is skipped (its buckets lag).
  - Fully empty sectors keep the old logic.
  - Donor eligibility is unchanged. At most one donor per sector per pass. Intent only.
- **Offline prediction** on main's weekly saves (end-of-turn state): one sector qualifies, Visoko-Kiseljak t98-t188, with the 182nd.
- **Result:** `ace4e553a491aecb`, 712 / 711 / 708 / 701 (Apr94 +2, Apr95 −2, Oct95 −4, net −4).
  - Consistency 0, strict health PASS.
  - `verify_checkpoints`: guard intact (enclave 9/9; Farz P1, P-A, P-B pass). It reports a score regression beyond tolerance (Oct95 −4 against −3).
  - Battles per week: 2.702 in total (+0.2%); RBiH 1.537 (+6.6%), RS 0.899 (−5.6%), HRHB 0.266 (−12.3%), counted by attacker.
- **Call chain:**
  - t98: the 182nd is in sector 4's rear and T1 issues relief;
  - t99: column order to `op:visoko:rajcici_2`;
  - t100: in transit;
  - t101: arrives, and is the sector's front brigade to t188.
  - Premise on run 2's saves: frontless sector-turns with an own pool 136 → 49; validator missed-reinforcement turns 122 → 42. Sector 4's gap is t98-100 only.
- **Early divergence:** control still first diverges at t14 (`op:bosanska_krupa:arapusa_2`). The only new reliefs in w1-20 are at w4, RS 2nd Krajina:
  - sector 3 (Bihać Ripac / Gornja Suvaja) has no front brigade, and its own rear, the 1st Drvar, is eligible at T1 time;
  - on main, T1 took the 1st Drvar to fill the fully empty sector 0 (Krupa), and sector 3 stayed frontless until w7;
  - in run 2 the 1st Drvar stays on sector 3 and the 3rd Petrovac fills sector 0.
  - The offline prediction missed this case because main's own relief order made the 1st Drvar look busy by the end of the turn.

### Attribution: the Visoko-Kiseljak fix alone

- **Fidelity check:** v2 resumed (`--continue-save`) from run 2's own w97 save reproduces `ace4e553a491aecb`. Resume is byte-faithful.
- **Attribution run:** v2 resumed from **main's** w97 save. Weeks 1-97 are main; only the t98+ effect differs.
  - `3253da2f9a6d2502`, 712 / 709 / 710 / 705;
  - **0 control cells differ at t188**;
  - consistency 0, guard intact.
- So the Visoko-Kiseljak fix is calibration-neutral on its own. All of run 2's checkpoint movement comes from the w4 RS 2nd Krajina relief and what follows from it.

## 4. Per-cell traces (run 2 against main)

Trails are from `control_events` (turn, from → to, attacker). Checkpoint weeks: Jan93 w39, Apr94 w104, Apr95 w156, Oct95 w188.

| Checkpoint | Cell | Painted | Main | Run 2 | Trail and class |
|---|---|---|---|---|---|
| Apr94+ | `op:prozor:lug_2` | HRHB | RBiH | HRHB | main: ARBiH 444th retakes it at t80; run 2: not retaken. Gain, mid-war chaos; the RF-3 "Ponos" open item |
| Apr94+ | `op:prozor:paros` | HRHB | RBiH | HRHB | main: 443rd retakes it at t81; run 2: not retaken. Gain, same |
| Apr95 | `op:donji_vakuf:komar_2` | RS | RS | RBiH | 303rd takes it at t132 (main: 17th at t181). Lost at Apr95 only; both runs right by Oct95 |
| Apr95 | `op:travnik:gornje_krcevine` | RBiH | RBiH | RS | retaken t161 instead of t155. Knife-edge one week either side of the checkpoint (the RF-2 COHA note) |
| Apr95+Oct95 | `op:mostar:vranjevici_2` | RS | RS | RBiH | ARBiH 445th takes it at t112 (run 2 only). Downstream chaos, ahistorical |
| Apr95+Oct95 | `op:nevesinje:hrusta_2` | RS | RS | RBiH | ARBiH 442nd takes it at t124 (run 2 only). Downstream chaos, ahistorical |
| Oct95 | `op:bosanska_krupa:jasenica_2` | RBiH | RBiH | RS | main: 505th takes it at t182; run 2: the 505th takes Gornja Suvaja at t184 instead. Late window |
| Oct95 | `op:bosanska_krupa:veliki_badic` | RBiH | RBiH | RS | main: 505th at t179. Late window |
| Oct95 | `op:bosanska_krupa:vranjska_2` | RBiH | RBiH | RS | main: 505th at t183. Late window |
| Oct95 | `op:jajce:vinac_2` | HRHB | HRHB | RS | main: HVO 3rd Guards at t187. Last-two-turns knife-edge |
| Oct95 | `op:kljuc:krasulje_2` | RBiH | RBiH | RS | main: 501st at t187. Knife-edge |
| Oct95 | `op:mrkonjic_grad:mrkonjic_grad_2` | HRHB | HRHB | RS | main: HV 1st Guards at t188. Knife-edge |
| Oct95 | `op:sipovo:pribeljci_2` | HRHB | HRHB | RS | main: HVO 3rd Guards at t188. Knife-edge |
| Oct95 | `op:donji_vakuf:jemanlici` | RBiH | RS | RBiH | 707th at t181. Gain; the RF-2 known historical miss |
| Oct95 | `op:donji_vakuf:korenici` | RBiH | RS | RBiH | 303rd at t165. Gain; same |
| Oct95 | `op:travnik:varosluk` | RBiH | RS | RBiH | 7th at t163. Gain; an RF-3 loss restored |

No change is a direct effect of the rule. The first control divergence is t14 at `op:bosanska_krupa:arapusa_2`. The independent scenario-tester seat notes that it falls to RS in both runs, six weeks earlier in run 2, which matches the painted reference.

## 5. Standing question: which matched cells depend on a known-broken mechanic?

- **The Visoko-Kiseljak gap (t98-t188) holds up no matched cell.** The attribution run fixes only that gap and changes no control cell at any turn.
- **All 13 main-matched cells that run 2 loses come after main's t4 Ripac strip,** the same defect in 1992: T1 took a frontless sector's only rear brigade to fill another sector.
  - The closest are the three Krupa villages. Main's 505th took them in 1995 against a Krupa line that the strip created: the 1st Drvar at Gornja Suvaja t11-178 and the 17th Ključ at Ivanjska about t40-170.
  - The others are late-window captures (t179-188) and two Herzegovina cells.
  - This dependence is chaotic (a butterfly from t4); it can't be proven cell by cell.

## 6. Realism (independent scenario-tester seat)

- **Fixed:**
  - On main the 182nd sits at Fojnica Živčići for 91 weeks while the Rajčići-Stuparići-Draževići line has no brigade. In run 2 it holds Rajčići from t101, a plausible post-Washington redeployment.
  - RS mans Ripac at t7 instead of t11.
  - The Bihać enclave holds in both runs.
- **New oddities, not the rule's own branch:**
  - The 3rd Petrovac borrow order for Krupa sector 0 is issued at t4, t6 and t8 and dropped the next turn each time, because it is still a sector-5 line holder. Sector 0 stays unmanned until t9 (SE7E-d).
  - ARBiH holds Nevesinje Hrusta through 1994-95 (chaos, ahistorical).
  - Three Krupa villages remain RS behind the 5th Corps at t188; main has the same kind of bypassed cells at Donji Vakuf/Travnik.

## 7. Out of scope, registered (the lane does not grow)

- **SE7E-b:** a dug-in reserve of a frontless sector gets a sector-march column order every turn. `processOsidColumnMovement` rejects it every turn (`posture_dig_in`), and the posture is never released. The 146th on main: t136-t188.
- **SE7E-c:** `distributeBrigadesToFront` skips reserve commit, empty-subsegment fill and Phase A/B for every `arbih_1st_corps` and `vrs_sarajevo_romanija` sector through the corps-wide `SIEGE_EXEMPT_CORPS` check. The `isSarajevoSiegeSector` helper exists but is not used there. Wide blast radius; it needs its own measured lane.
- **SE7E-d:** T1's borrow path issues and then drops an order to a line holder (the 3rd Petrovac, t4/t6/t8).
- **Residual of this rule:** a frontless sector whose whole own pool is dug in still waits. The dig-in exclusion is unchanged doctrine. On main's saves this happens only in a few early-war turns.

## 8. Verification

- **Unit tests:** `tests/commander/empty_sector_relief_reassignments.test.ts`, 20/20.
  - Positive controls: 4 of the 7 SE7E cases fail on main's `decide.ts`; the two narrowing guards fail on run 1's code.
  - `tests/commander`: 29 files, 540 tests pass.
- **Full suite:** `npm run test:vitest` exit 0. `npx tsc --noEmit` exit 0 (with a larger Node heap; the default 2 GB heap OOMs in this container, and the pre-commit hook needed the same).
- **Structural fingerprint:** `npm run ci:structural-fingerprint:check` exit 0, `bc629e89a585dfde`.
- **Gates on run 2:** `verify_checkpoints.cjs` (guard intact; score regression Oct95 −4), `engine_health_gate.cjs --strict` PASS, `validate_run_consistency.cjs` PASS (0).
- **Runs:** 2 measured candidates (8 allowed), plus the main reproduction, a main replay with weekly saves (observer-only, same hash), and two partial resumes (fidelity and attribution). The final-head bless is recorded in the PR.
