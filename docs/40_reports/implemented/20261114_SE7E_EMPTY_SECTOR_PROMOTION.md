# SE7E: an empty front sector commits its own rear brigade

Date: 2026-11-14. Lane SE7E (register SD15; RF realism-audit fix). Branch `claude/amazing-clarke-z50rpc`, PR horkesh/A-War-Without-Victory#625.

**Result.** Run 4, v3 `ec4cf59`, `3253da2f9a6d2502`:
- Checkpoints 712 / 709 / 710 / 705, identical to main; 0 control cells differ at any checkpoint.
- Consistency 1 → 0; strict health PASS; every guard intact, including the cascade gated at `--cascade-base 49`.
- Battles per week 0.00% in every faction.
- Across the whole campaign it differs from main by **one** commander order: t99, 182nd Light → Visoko-Kiseljak.

## 1. Reproduction on main

Main `887310d` (after #617/#622/#611), cloud session, `npm run sim:scenario:run:188w`:

- `final_state_hash` `4ff4a7665c0a35b5` (same as the RF-F1 pin).
- Checkpoints 712 / 709 / 710 / 705. `verify_checkpoints.cjs` exits 0 with the guard intact, including with `--cascade-base 49` (cascade 49/49).
- Strict health (`engine_health_gate.cjs --horizon 188w --strict`) PASS.
- Battles per week 2.697 (RS 0.952, RBiH 1.441, HRHB 0.303).
- `validate_run_consistency.cjs` exits 1 with one failure: `subseg:sector:arbih_1st_corps:4:0` stays `gap=true` across 4 edges with legal donors (`arbih_123rd_light`, `arbih_164th_mountain`, `arbih_146th_light`, `arbih_147th_light`, `arbih_185th_light`, all 3 hops away).

## 2. Premise, measured on main

An observer-only replay of main with a save every week (`--save-weeks 1..188`, same hash) was classified by a probe. The probe takes every staffed front sector (`length_edges > 0`, not `unstaffed_front`) with no front brigade and tests each of its own reserve/rear brigades against the construction-time zero-assigned rescue bar.

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
  - the validator reports missed reinforcement every turn from t98.
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
| Bot sector march (`evaluateSectorMarch`) | assigned and reserve brigades only (`buildSectorAssignmentByBrigade`); a reserve of a sector with no line holder marches forward | rear brigades are invisible to it, and the reserve here is dug in |

So nothing moves an own rear brigade forward beyond 3 hops. The irony: T1 would send the 182nd if it were *another* sector's rear (tier 0); as sector 4's own rear it is never sent.

Phase order (`war_phases.ts`):
1. `osid-column-movement` deletes the 146th's rejected order;
2. `generate-bot-corps-orders` runs T1, so `hasPendingReliefForTargets` doesn't fire;
3. `generate-bot-brigade-orders` re-issues the order.

## 3. The rule (v3)

`computeEmptySectorReliefReassignments` (decide.ts):

- **Unchanged.** A sector with no reserve or rear of its own is relieved from any legal same-corps donor: rear, then reserve, then surplus line; then distance; then id.
- **SE7E, strictly additive.** Sectors with no own pool are served first, in the existing sorted order, so every relief main issues is issued unchanged. Then each frontless sector (no assigned brigade) that still lists its own pool is served:
  - if it has an eligible own reserve, it is left to the reserve sector march;
  - otherwise it commits its own eligible rear brigade **that is still free** (nearest, then `strictCompare` on id);
  - it never borrows another sector's brigade while it has its own pool;
  - it is skipped when one of its own reserve/rear brigades already stands on its front (the front is held; only the buckets lag).
- **Constraints kept.** Donor eligibility is unchanged (dug in, under an order, moving, operation-bound, disrupted and loaned brigades are excluded). One donor per sector per pass; a donor serves at most one sector. It emits intent only: T2 reassignment march, T3 column movement (Engine Invariant 14.9).

## 4. Measured runs

Each run is the authoritative `npm run sim:scenario:run:188w` on a clean, committed tree, with observer-only weekly saves.

| Run | Head | Rule | Hash | Jan93 | Apr94 | Apr95 | Oct95 | Cascade | Consistency | Battles per week | Verdict |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| main | 887310d | none | `4ff4a7665c0a35b5` | 712 | 709 | 710 | 705 | 49 | 1 | 2.697 | baseline |
| 1 | bafe9b7 | v1: every frontless sector, sibling donors | `567eb1f4a383e7f1` | 712 | 711 | 707 | 694 | 44 | 0 | 2.723 | rejected (guard breached) |
| 2 | b51e49f | v2: own rear only, frontless sectors in threat order | `ace4e553a491aecb` | 712 | 711 | 708 | 701 | 46 | 0 | 2.702 | superseded (two tolerance breaches) |
| 4 | ec4cf59 | v3: v2 with additive serving order | `3253da2f9a6d2502` | 712 | 709 | 710 | 705 | 49 | 0 | 2.697 | **final** |

(Run 3 was a baseline bless at the v2 head, superseded by the final-head bless in §8.)

**Run 1 (v1).**
- `verify_checkpoints` breached: Farz P-A 2/4; P-B unwarranted Brčko captures at t175-180; Oct95 −11.
- New reliefs fired from w3 in several corps, mostly sending a sector's own eligible reserve, which the reserve sector march already moves. Control diverged at t14.

**Run 2 (v2).**
- `verify_checkpoints` exit 1. Two score tolerances breached:
  - Oct95 −4 against a −3 tolerance;
  - the western cascade, gated at `--cascade-base 49`, 46 (−3) against a −2 tolerance.
- The enclave, Farz and eastern-provenance guards held. *The PR comment and the first draft of this report said "guard intact" and named only the Oct95 regression; the canon-compliance seat caught the omitted cascade breach.*
- The only early change was at w4, RS 2nd Krajina: frontless sector 3 (Ripac / Gornja Suvaja, threat 9999) sorted before fully empty sector 0 (Krupa) and kept its own rear, the 1st Drvar. Main sends the 1st Drvar to Krupa.
  - Krupa then waited until w11, because the 3rd Petrovac borrow order was issued at t4/t6/t8 and dropped each time (SE7E-d).
  - Control diverged at t14.
- Seat findings:
  - Historian: the resulting checkpoint changes are **net less historical**. Krupa was the active front in April 1992 (BB1 p.185, p.202 n.164). The lost late-1995 captures (Bosanska Krupa, Ključ, Jajce, Šipovo, Mrkonjić) fall inside the historical September-October 1995 window (BB1 pp.417-427). ARBiH holding Mostar Vranjevići and Nevesinje Hrusta in 1994-95 is wrong (BB2 p.515).
  - War-or-game: more catastrophic ARBiH probes downstream (attacker casualties +28%) and a new `bot_discretionary` shuttle (Glavatičevo ↔ Vranjevići). These come from existing mechanisms set off by the t4 divergence, not from the rule's own branch.
- Kept for the record; not the candidate.

**Attribution (between runs 2 and 4).** v2 resumed (`--continue-save`) from main's w97 save gave `3253da2f9a6d2502` with 0 control cells different. The resume was verified byte-faithful: v2 from run 2's own w97 save reproduced `ace4e553a491aecb`. This isolated the Visoko-Kiseljak effect as neutral and motivated v3.

**Run 4 (v3), final.** Its full 188-week hash equals the attribution run's hash. So v3 is exactly "main through t97, plus the Visoko-Kiseljak relief".
- In the whole campaign the only commander order that differs from main is w99 `arbih_182nd_vitezka_light → sector:arbih_1st_corps:4`.
- Movement:
  - t98: the 182nd is in sector 4's rear and T1 issues relief;
  - t99: column order to `op:visoko:rajcici_2`;
  - t100: in transit;
  - t101: arrives, and holds the front to t188.
- Gates:
  - `verify_checkpoints --base 712,709,710,705 --cascade-base 49` exit 0, guard intact (enclave 9/9; Farz P1/P-A/P-B; eastern provenance; cascade 49/49);
  - strict health PASS;
  - consistency PASS (0).
- Battles per week 2.697: 507 battles, RBiH 271, RS 179, HRHB 57, identical to main.
- Not byte-identical to main after t98. Two seats counted battle-level differences, with different matching methods:
  - scenario-tester seat, on the attribution run (same hash): 10 battles with a different defender and 24 with different casualties or power ratio;
  - war-or-game seat, its own diff of run 4: 4 with a different defender, 28 with different casualties or power ratio (the first at t112, Lukavac), 6 shifted by a turn or swapped between t171 and t184.
  - Both: **0 battle-outcome changes and 0 control changes**.
  - Brigade state does differ (historian seat; verified):
    - 30 formations differ in personnel or location at t188;
    - RS has 18 brigades destroyed against main's 16. The 3rd Petrovac falls from about 450 men to 0 at t187 at Ključ Donje Ratkovo. The 4th Ozren goes inactive at t174 in both runs, but in run 4 it does not recover to about 200 men.
    - From about t150 the 146th Light, a dug-in reserve on main, takes front sub-segments in sectors 0 and 3.
    - Historian: a shattered 2nd Krajina brigade in October 1995 fits the September 1995 rout (BB1 pp.419, 426). `formation_delta.json` reproduces main's pin, so it does not capture these differences.
- Premise on run 4's saves:
  - frontless sector-turns that still have an own pool: 136 → 48;
  - validator missed-reinforcement turns: 122 → 45;
  - the Visoko-Kiseljak gap is t98-100 only (the march).

## 5. Per-cell traces and the standing question

- **Run 4 against main:** no checkpoint cell differs (0 lost, 0 gained at Jan93, Apr94, Apr95 and Oct95), and no control cell differs at any turn.
- **Run 2's 16 cell changes** (traces kept in PR comments and in the seat logs) all follow the w4 divergence. v3 removes that divergence.

**Which matched cells depend on a known-broken mechanic?** None depend on the Visoko-Kiseljak gap: fixing it changes no cell (run 4).

Main's w4 behaviour is kept unchanged. That is the existing T1 path letting a fully empty sector take a frontless neighbour's rear (see residuals in §7). On main the 1st Drvar goes to Krupa, the historically active front in April 1992. The cells that run 2 lost depended on that choice, so they depend on existing T1 priority, not on a defect this lane fixes.

## 6. Realism (independent seats on run 2, and what v3 changes)

- **Visoko-Kiseljak (kept in v3).**
  - On main the 182nd sits at Fojnica Živčići for 91 weeks while the Rajčići-Stuparići-Draževići line has no brigade.
  - With the rule, it holds Rajčići from t101 on a quiet line (no battle there in either run). Historian: plausible after the 23 February 1994 HVO-ARBiH ceasefire (BB2 pp.469-470). The 16th Division held Visoko-Breza-Vareš against the VRS Ilijaš/Ilidža brigades (BB1 pp.441-442).
  - The 182nd's real division (14th, Pazarić) is an order-of-battle identity point, not this rule.
- **Idle mass (registered SE7E-b).** The dug-in 164th, 147th and 185th stay behind the line in both runs. The 146th's stuck order churn ends, and it takes front sub-segments from about t150 (§4).
- **Removed in v3.** The run-2 butterfly effects: the Krupa gap to w11, the Herzegovina captures, the shuttle and the extra catastrophic probes.

## 7. Out of scope, registered (the lane does not grow)

- **SE7E-b:** a dug-in reserve of a frontless sector gets a sector-march column order every turn. `processOsidColumnMovement` rejects it every turn (`posture_dig_in`), and the posture is never released. The 146th on main: t136-t188.
- **SE7E-c:** `distributeBrigadesToFront` skips reserve commit, empty-subsegment fill and Phase A/B for every `arbih_1st_corps` and `vrs_sarajevo_romanija` sector through the corps-wide `SIEGE_EXEMPT_CORPS` check. The `isSarajevoSiegeSector` helper exists but is not used there.
- **SE7E-d:** T1's borrow path issues and then drops an order to a line holder (the 3rd Petrovac, t4/t6/t8 in run 2).
- **SE7E-e (residual of this rule, existing T1 priority):**
  - A fully empty sector can take a frontless neighbour's own rear as a tier-0 donor; the frontless sector then waits for a later pass. Main does this at w4 (1st Drvar to Krupa), and v3 keeps it.
  - A frontless sector whose whole own pool is dug in also waits. Systems Manual §6.5 says empty reachable sectors "receive explicit reassignment intent"; that is still not fully met for these cases. It is narrowed here, not regressed.
- **SE7E-f:** the validator reports missed reinforcement on some fully empty sectors that T1 doesn't relieve (`vrs_drina:3`, t58-62/77/93/96/99-100). Existing path, unchanged.
- **War-or-game realism items seen in run 2 that also exist on main:**
  - no re-launch gate for operations or probes below a 0.5 power ratio;
  - `bot_discretionary` A↔B shuttles;
  - stuck-order idling.

## 8. Verification

- **Unit tests:** `tests/commander/empty_sector_relief_reassignments.test.ts`, 22/22.
  - On main's `decide.ts`, the SE7E cases fail.
  - On v1's code, the v2 narrowing guards fail.
  - On v2's code, the v3 serving-order cases fail.
- **Commander suite:** `tests/commander` passes.
- **Full suite:** `npm run test:vitest` exit 0 on v2 and on v3 (v3: 3,611 passed and 11 skipped, plus the 1,595-test balanced shard).
- **Typecheck:** `npx tsc --noEmit` exit 0. The default 2 GB Node heap OOMs in this container; use `NODE_OPTIONS=--max-old-space-size=10240`. The pre-commit hook needs the same.
- **Structural fingerprint:** `npm run ci:structural-fingerprint:check` exit 0, `bc629e89a585dfde` (on v2; on v3 the t40 state is main's).
- **Determinism seat (on v2's code, unchanged in v3 except for the serving order):** ordering is total (tier, distance, `strictCompare` id; sector order has a `sector_id` tie-break); no time or randomness; T1 is intent only; no GameState or save change.
- **Runs:** 3 measured candidates plus 1 bless at v2, and the final bless at v3: 5 of 8 allowed. Also the main reproduction, a main replay with weekly saves, and two partial resumes (fidelity and attribution).
- **Baselines:** re-pinned at the final head (`UPDATE_BASELINES=1 npm run test:baselines` at `d531809`, docs-only since `ec4cf59`). All 8 artifacts reproduce run 4 byte for byte.
  - Changed: `final_save.json` `3253da2f…`, `run_summary.json` `010c01d8…`, `end_report.md` `d9cfdfdd…`, `weekly_report.jsonl` `547e6c83…`.
  - Back to main's pins, since control and formations are identical: `control_delta.json` `385b019d…`, `activity_summary.json` `485d13fc…`, `watched_operations.json` `ab972c4f…`, `formation_delta.json` `8504e676…`.
  - This supersedes the run-2 pin in `eb66243`.
