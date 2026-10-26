# Combat Fatigue Single Owner

**Date:** 2026-10-26

**Run ID:** Focused attempts 001–009; one prefix39 candidate `runs/player-parity-fatigue-owner-39-20261026-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0` at commit `0278c956d3fce3cdb62161a282f3936eaa0c66c1`

**Baseline:** Source head `0278c956d3fce3cdb62161a282f3936eaa0c66c1`; prior diagnosis packet records review base `33f99fc5aac9a620a7bb0000cf233d86f270ce24`.

**Result:** Bounded source correction has focused GREEN and independent source GO. The sole authorized prefix39 candidate is **NO-GO / STOP_NO_RETRY** at 703/712; calibration and global qualification remain open.

## Summary

- The OSID combat resolver had two fatigue writers for a resolved battle. The correction leaves `applyCombatFatigue` as the sole owner, preserving the established defended attacker `+2`, undefended attacker `+0.5`, primary defender `+1`, cap `30`, and initialization.
- Retained focused evidence is 21/21, affected regression 51/51, and nonincremental TypeScript 0; independent implementation review is GO for this bounded delta.
- No assertion was added to these unit fixtures that directly verifies a controller change. Control capture, calibration, full suite, package, native runtime, baseline and release gates are not qualified by this report.
- The one bounded 39-week trajectory completed cleanly but failed the unchanged 707/712 floor and the 40-week health cap (13 stranded brigades versus maximum 3). It is not an accepted calibration candidate.

## Changes Made

The resolver's inline attacker/primary-defender fatigue writes and unused `recordFormationFatigue` import were removed. The existing aftermath helper remains the single writer and runs once per resolved battle. Combat outcome, casualty and control algorithms were not edited. Correcting accumulated fatigue can affect future combat power, outcomes and control, so trajectory qualification remains pending. Retreat/advance, equipment, supply, enclave, command authority, recovery formulas, state fields, schema and operation logic were not edited.

The maintained resolver fixtures exercise defended combat, two attackers sharing one battle, and an undefended target through `resolveAttackOrdersOsid`. Helper tests cover defended/undefended deltas, primary-defender ownership, missing-`ops` initialization and cap 30.

## Week 39 Prefix Result — STOP_NO_RETRY

The finalizer bound clean commit `0278c956d3fce3cdb62161a282f3936eaa0c66c1`; the actual preflight, receipt, run metadata and independent review agree on clean input provenance. The production campaign child exited 0 and completed one simulation in 58,142 ms under the 300,000 ms cap. Wrapper, qualification child and outer process exited `2/2/2` because the result was a valid rejecting qualification. There was no timeout and no retry.

The candidate scored **703/712** against the unchanged 707 floor and lost four formerly-correct OSIDs against both n91 and n92:

| OSID | Reference | Candidate |
|---|---|---|
| `op:donji_vakuf:korenici` | RS | RBiH |
| `op:foca:donje_zesce` | RBiH | RS |
| `op:gorazde:kolovarice` | RS | RBiH |
| `op:trnovo:tosici` | RBiH | RS |

The preceding prefix candidate scored 704 with three losses. The only parent-to-candidate controller difference across the 712 painted IDs is Kolovarice, which began RBiH in both runs. The parent records a turn-14 RS capture by Ajnie and Foča at ratio 1.56; the candidate records a Foča-only turn-14 stalemate at ratio 0.90 and no control event, leaving its initial RBiH controller. The retained Ajnie comparison records a candidate-only catastrophic Ajnie attack at turn 10 and its later recent-catastrophic-loss blocker; by turn 14 the parent operation completes with two orders while the candidate is eligible for one. No exact turn-14 Ajnie rejection predicate is recorded because `axis_reject` was not enabled. This evidence describes a divergent combat/eligibility path; it does not isolate a causal lower-level term or establish a new movement or ownership defect. No exact Korenici power breakdown is claimed: the campaign stdout has no `[battle_power]` records and the candidate JSON contains no payload breakdown.

Scoring and health failed. The health reader found 13 stranded brigades against maximum 3; the exact 13 IDs match the parent and retained n101/n102. Consistency, movement (7,410 receipts; all 39 expected inactive boundaries), graph/roster (291 edges, 69 sectors, 232 formations), save provenance (turns 15, 16, 33, 34 and 39), and control attribution (39 rows; 143 reconciled changes) passed. Opening and closing preservation inventories match byte-for-byte for all 14 configured roots at SHA-256 `ef660fe60a6ab37b537044116c039d5db93a6ffe58571df593c9f405dbd2c614`. That equality does not waive older retention gaps or imply perfect telemetry. All eight later-horizon checks remain `UNREACHED_HORIZON` with `pass: null`.

The independent actual-result review validates 25 retained artifacts, plus stdout, stderr and the entry snapshot against their receipt bindings; it confirms `STOP_NO_RETRY`. The original 3,474,700-byte `actual-attempt-01/campaign.stdout.log` remains at its source packet path and is bound externally in the new [prefix39 portable manifest](../../../logs/r8-native-calibration-parity-20261024/combat-fatigue-prefix39-20261026/PORTABLE_MANIFEST.json). No candidate run state was copied. The portable packet contains 86 byte-exact copies (515,889 bytes) of the qualifier and historical-audit files plus its generated `.gitattributes` file.

This measured candidate remains unqualified and unadopted. The result does not invalidate either bounded source correction, support tuning/reverting to improve the score, or close full-suite, 188-week, package or native gates. The retained read-only Circle historical-admission audit finds the t16 launch date (27 July 1992) consistent with the cited late-July regional offensive, but cannot verify named brigades or the Donje Žešće/Tošići aggregates; it finds no evidenced calendar, content or OOB author error. The next authorized action is a read-only primary-source search specifically for the July 1992 Goražde–Trnovo operation, participating units and localities. No timetable, brigade allocation, content or target change follows without direct evidence; no further campaign is authorized here. See [the retained historical finding](../../../logs/r8-native-calibration-parity-20261024/combat-fatigue-prefix39-20261026/historical-audit-v1/finding.md).

## Verification and Evidence

Attempts 001–003 failed before combat at path normalization, Vitest discovery, and Windows ESM loading. Attempt 004 was the meaningful real-resolver RED (attacker/defender fatigue `4/2`, expected `2/1`). Attempt 005 was an extended RED (17/21, four expected failures). Attempt 006 passed 21/21; 007 passed 51/51; 009 passed nonincremental TypeScript in 49.2 seconds. Attempt 008 did not create an attempt directory or launch a child: wrapper usage validation rejected missing `{evidenceDir}`. Its JSON contains conversation-recovered output, not original stdout/stderr/child artifacts. The recovery is not represented as original retained output.

The independent review approves the bounded source correction and records no control-flip assertion in these unit fixtures. Its report and preimplementation canon/determinism decision accompany the exact packet copies. Current source hashes:

| File | SHA-256 |
|---|---|
| `src/sim/combat/attack_resolution_osid.ts` | `ff8992ab13f54f7f5b2aea79adc1c2a2a6a4d1f9cb58acd21ed27726ea6069ab` |
| `src/sim/combat/attack_resource_aftermath.ts` | `0cad82788378de0c6d1a82d5228eb5c8deac9d5b79263c7cfd860e63f3eab4b4` |
| `tests/attack_resource_aftermath.test.ts` | `61f76235330d2c6dcda189d0f7761e7ca78101a885abc1bd11b60eea8e3a534b` |
| `tests/combat_fatigue_owner.test.ts` | `3125267ee44e1695ef41ca3b948e523c37cf950b8f07f85068b5fa2ea2f15901` |

The portable packet retains byte-exact copies of all 63 files in the diagnosis directory, including every existing attempt and its telemetry, and includes the original `GAP_ATTEMPT_008.v1.json`; it does not invent an attempt-008 directory or original child streams. It also includes byte-exact copies of `WORKSPACE_BOUNDARY_INCIDENT.v1.json` and the prior `review-003/TARGETED_PORTABLE_OBSERVATIONS_VERIFICATION.md`. The incident record documents four preparation files initially created under F, moved to C before execution; no existing F path was targeted, and no broad F diff was performed. Its statement that no scripts, tests, preflight, trajectory, finalizer, package, native run, full suite or campaign executed before correction is retained as part of that record. [Portable manifest v2](../../../logs/r8-native-calibration-parity-20261024/combat-fatigue-owner-20261026/PORTABLE_MANIFEST.v2.json) binds all 67 packet entries: 65 exact-copy source paths/hashes and two explicitly generated files. It also binds the prior manifest's byte count and hash and the final four production/test file hashes.

The T25 REQUEST-OP fork remains parked and unexecuted; its source hash is stale. Separately, [the new prefix39 packet](../../../tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/PLAN.md) was finalized and independently reviewed before the single trajectory reported above. The trajectory used one simulation and no retries. The retained historical finding and citations are byte-exact copies bound by the portable manifest.

## Files Changed

The source and tests are listed above. Documentation records this result in the project ledger, engineering references, roadmap/control board and calibration master. Portable evidence is under `logs/r8-native-calibration-parity-20261024/combat-fatigue-owner-20261026/`.

## Next Steps

- Conduct the authorized read-only primary-source search for the July 1992 Goražde–Trnovo operation, participating units and localities; keep settlement/OOB claims unresolved absent direct support.
- Keep current188, full-suite, package and native qualification gates open. No additional campaign, retry, tuning or baseline adoption follows from this failed prefix39 result.
