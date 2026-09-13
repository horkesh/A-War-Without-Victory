# POST-A integrated 188-week independent review

Run: `runs/roadmap_integration_20260912/post_a/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n0`

Source: `51fe494151397c1cc6521b54006b0f8da70705e5`, clean at launch (`git_dirty:false`), Node `v22.23.2`, headless, collapse disabled. The run completed 188 turns with process exit 0 and final-state hash `5d6f8378dbf433fc` (`final_save.json` SHA-256 `5d6f8378dbf433fc4bb81ea46824648a846b4ce1a8d01c7585d72964af81f85c`). The bound console stream contains exactly 188 turn seals plus one turn-188 final-save seal, with `unresolved=0` throughout.

## Verdict

**NO-GO for the second 188-week run and NO-GO for integration acceptance.** The fixed first-run stopping rule fires in four distinct categories. This is a measured candidate rejection; it does not undo the source-integration, canon, focused-test, or full-suite work already reviewed.

1. `post-a-health.log`: exit **1**. January is **692/712**, below the unchanged **694** floor. The other unchanged floors pass: April 1994 **698 >= 674**, April 1995 **694 >= 668**, October 1995 **665 >= 641**. Terminal score is 665.
2. `post-a-checkpoints.log`: exit **1**. The protected western-Bosnia cascade is **33**, versus the accepted base **40 ± 2**; delta **-7** is a hard regression.
3. The inherited Farz exception does not match exactly. Preserved accepted-reference `political.control_events` establishes the actual allowed tuple: `op:lukavac:brijesnica_donja_2`, turn **168**, attacker `arbih_327th_vitezka_mountain` of `arbih_3rd_corps`, battle `168:op:lukavac:brijesnica_donja_2:arbih_327th_vitezka_mountain:rs_2nd_armored`. POST-A has the **same cell, attacker, and corps**, but at turn **169**, against `rs_1st_celinac_light_infantry`, battle `169:op:lukavac:brijesnica_donja_2:arbih_327th_vitezka_mountain:rs_1st_celinac_light_infantry`. The timing, defender, and battle identity changed. The nearby raw events are `op:maglaj:gornja_bocinja` at t165 and `op:maglaj:donja_bocinja_2` at t166; neither substitutes for the P-A tuple. `verify_checkpoints.cjs` defines `SECOND_CORPS_CELL` as Briješnica, and neither reference nor POST-A contains a Stari Majdan capture by the 327th. **Correction note:** an earlier draft of this review repeated an erroneous handoff naming `op:sanski_most:stari_majdan_2`; that statement was false and is superseded here. The exact t168 waiver does not cover the t169 result. Operation-name similarity remains irrelevant because the guard is name-free.
4. `post-a-truth.json`: exit **1**, `pass:false`. `operations_combat` fails because injection validation records the Prozor–Rama Line Counterattack as `op_empty` at t41. Its emitted warning text, “All 2 objectives already controlled by HRHB,” is factually wrong: both `lug_2` and `paros` are RBiH-controlled at t41 and first flip RBiH→HRHB at t54/t55 through attacks by `hvo_rama_brigade`. The validator obtains zero usable objectives because `isOperationObjectiveHostile` also rejects bilateral-combat-blocked targets, then mislabels that result as already owned; the separate `allAchieved` controller check correctly remains false. This is a real injection timing/permission mismatch, not evidence that the operation was already complete. The exact t41 error is present in branch v72 and absent from n392, so it is inherited branch debt rather than a textual-integration artifact. The smallest plausible repair is to defer injection validation until a target becomes legally hostile/permitted, while separately correcting the false diagnostic label; weakening the truth gate or treating the RBiH-held objectives as achieved would be wrong. Root owns any implementation decision. Until corrected and reverified, this remains a hard truth failure.

No second campaign, canon check, baseline overwrite, manifest refresh, or same-horizon comparison is authorized by this result.

## Passing gates and retained evidence

- `post-a-consistency.log`: exit **0**, zero consistency failures. Assignment sync, sector role buckets, reserve cap, physical ownership, war-front coverage, sector geometry, donor-aware empty sectors/floors/gaps, and adjacent-uncontested checks pass. The serialized `unresolved_sector_brigades` field is absent, so the standalone tool correctly says that field alone is not established; the bound live seal stream establishes zero unresolved warnings.
- Truth checkpoint passes artifact identity, all **564/564** faction-week force cells, casualty ledger and militia/formation accounting, **91,564** displacement-event reconciliation, console/run/hash binding, complete seal protocol, zero unresolved warnings, and calibration reconciliation.
- Historical anchors pass **31/31**, with the run-meta contract, top-level copy, and historical-fit copy identical.
- Enclave guard passes **9/9**: seven holds and both Srebrenica/Žepa scheduled falls. Teočak is directly contested twice; the other six hold cells are reported honestly as uncontested.
- Eastern capture provenance is clean across all nine guarded municipalities. One never-captured Kalesija cell remains calibration variance rather than an attributed capture defect.
- Combat causality is otherwise live and internally consistent: **779** attack orders, **529** battles, **1,646** objective attempts, **935** captures, zero invalid-operation weeks, zero zero-eligible operations, zero recovery-without-attempt rows, and `valid_for_combat_calibration:true`.
- Other health hard checks pass: zero-eligible operations 0, invalid-operation weeks 0, ghost destroyed 0, stranded brigades 11 <= 16, consistency failures 0, and K:W 3.728 inside `[3.221, 4.358]`. The corrected dead-operation diagnostic remains advisory and reports 9/60 operations with zero attacks. Hollow ratios remain advisory: HRHB 0.676, RBiH 0.992, RS 0.517.

## Provenance

The run records 31 named consumed inputs and digest `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`. Independent recomputation using the production CRLF-to-LF normalization gives **0/31 mismatches** and the same aggregate digest. Raw-byte hashing alone differs for the three already-classified CRLF checkout files; that is representation noise, not input drift. The console binds exactly one scenario command, output directory, and final-state hash to the run.

## Branch anomaly categories

The source v72 week-104 artifact reported 7/12 HVO Central Bosnia brigades below 400 personnel, triggering one critical anomaly. POST-A has **6/12 below 400 at week 104**, and the same **6/12 at week 188**. This no longer exceeds the reporter's `>50%` critical threshold, but half the corps remains combat-ineffective and the underlying engine-health debt is not resolved.

`hrhb_travnik_brigade` is unchanged at both week 104 and week 188: active, 1,500 personnel, at `op:gornji_vakuf:vaganjac`, with no sector, operation, or movement owner, and unreachable from home. The final anomaly report retains it as `brigade_far_from_home_unassigned`. Final anomaly totals are **25**: 0 critical, 6 warning, 19 info; absence of the former critical label must not be reported as closure of these two retained categories.

## Validator coverage audit

The prepared commands cover the active 188-week gates when their child exits and reports are read individually:

- engine health enforces all four floors and hard integrity bands;
- standalone consistency preserves the stronger zero-failure result instead of relying on health's allowed ceiling of three;
- checkpoint verification covers nine enclave cells, eastern provenance, Farz P-A/P-B, and the protected cascade;
- engine truth fail-closes artifact identity, force/casualty/displacement truth, live log binding and seal coverage, operation causality/injection integrity, and anchor-copy agreement.

`post-a-validator-driver.log` ends `EXIT_CODE=0` despite child exits health=1, consistency=0, checkpoints=1, truth=1. It is an evidence collector, not an aggregate gate; treating its own exit as the verdict would be a false pass. `post-a-truth.log` is empty by design because `--out post-a-truth.json` receives the report.

The separate CI structural-fingerprint gate is also open. Applying the read-only checker to the clean retained `933132e90` 40-week artifact exits **1**: expected fingerprint `cd5582f4a945842e`, actual `6af86b2c1012c243`; expected HRHB/RBiH/RS counts 85/249/378, actual 91/250/371, with control-flip changes. That retained run is clean Node 22.23.2 evidence for the integrated simulation lineage but is not exact `51fe49415` provenance. The intervening simulation source correction was independently reviewed as behavior-preserving; tests/docs plus desktop startup/hover changes do not establish a fresh current 40-week run. Per the determinism matrix, this remains an anticipated pin-authority matter requiring deliberate disposition; no automatic fingerprint update or extra 40-week run follows from this audit.

The previous balanced suite recorded 13,935 passing tests, 9 failures and 43 skips, exit 1. Its passing evidence remains reusable alongside the subsequent focused corrections and approved coverage retest; no fresh all-green full-suite run is claimed. The hard POST-A campaign failures, rather than unaffected suite behavior, now control the decision.
