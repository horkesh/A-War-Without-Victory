# Combat Fatigue Single Owner

**Date:** 2026-10-26

**Run ID:** Focused attempts 001–009; packet copied to `logs/r8-native-calibration-parity-20261024/combat-fatigue-owner-20261026/`

**Baseline:** Source head `894693a7286a1522fcd954abf5eded39e5e340e1`; prior diagnosis packet records review base `33f99fc5aac9a620a7bb0000cf233d86f270ce24`.

**Result:** Bounded source correction with focused GREEN and independent GO; global qualification remains open.

## Summary

- The OSID combat resolver had two fatigue writers for a resolved battle. The correction leaves `applyCombatFatigue` as the sole owner, preserving the established defended attacker `+2`, undefended attacker `+0.5`, primary defender `+1`, cap `30`, and initialization.
- Retained focused evidence is 21/21, affected regression 51/51, and nonincremental TypeScript 0; independent implementation review is GO for this bounded delta.
- No assertion was added to these unit fixtures that directly verifies a controller change. Control capture, calibration, full suite, package, native runtime, baseline and release gates are not qualified by this report.

## Changes Made

The resolver's inline attacker/primary-defender fatigue writes and unused `recordFormationFatigue` import were removed. The existing aftermath helper remains the single writer and runs once per resolved battle. Combat outcome, casualty and control algorithms were not edited. Correcting accumulated fatigue can affect future combat power, outcomes and control, so trajectory qualification remains pending. Retreat/advance, equipment, supply, enclave, command authority, recovery formulas, state fields, schema and operation logic were not edited.

The maintained resolver fixtures exercise defended combat, two attackers sharing one battle, and an undefended target through `resolveAttackOrdersOsid`. Helper tests cover defended/undefended deltas, primary-defender ownership, missing-`ops` initialization and cap 30.

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

The T25 REQUEST-OP fork remains parked and unexecuted; its source hash is stale. Separately, [the new prefix39 preparation packet](../../../tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/PLAN.md) is unbound and unexecuted, awaiting clean-commit provenance, finalization, cheap self-tests and independent review. It is not stale. Neither preparation has run a trajectory.

## Files Changed

The source and tests are listed above. Documentation records this result in the project ledger, engineering references, roadmap/control board and calibration master. Portable evidence is under `logs/r8-native-calibration-parity-20261024/combat-fatigue-owner-20261026/`.

## Next Steps

- Preserve the clean-commit provenance and complete the already-prepared bounded prefix39 self-check and independent review when its source-hash precondition is met.
- Keep required current188, full-suite, package and native qualification gates open until each has fresh evidence for the final source.
- Do not claim baseline adoption or all-green status from this focused correction.
