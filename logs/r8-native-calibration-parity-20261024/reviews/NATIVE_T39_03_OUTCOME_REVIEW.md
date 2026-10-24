# Native turn-39 attempt 03: independent outcome review

Date: 2026-10-24

Verdict: **turn-39 calibration acceptance FAILED; stop before turn 188.** The packaged run and its evidence capture are qualified, but the normal Historical RBiH campaign reached 700/712 rather than the accepted 707/712 and ended with seven wrong controllers. Both n91 and n92 protected-control checks lost the same seven cells.

## Reached gates

The run itself completed in 739.4 seconds with child/wrapper `0/0`, no timeout, and a passing artifact contract. The post-run auditor passed all 12 infrastructure and reader gates:

- one successful RBiH result corresponding to the progress artifact;
- exact provisional archives 1..39 and exact settled archives 1..39, with recorded hashes, byte sizes, and turn identities intact;
- zero console, page, unmatched network, main-process, or unexpected-stderr failures;
- 1,188 ordered main-process records and exactly one `unresolved=0` final seal for every turn 1..39;
- canonical consistency reader passed; Save -> Records -> Resume preserved exact canonical bytes and produced the exact expected loaded projection;
- all 30 January OSID anchors passed, the Brcko control band passed, and all five January event anchors fired by their deadlines;
- initial control, input policy, input binding, reference identity/integrity, and calibration engine-health gates passed.

Preservation and package checks also passed: 3,226 retained bindings, all 40 n94 files, unchanged telemetry bytes and five legacy classifiers, plus an exact 1,213-file packaged inventory. These successes qualify the negative gameplay result; they do not satisfy the failed checkpoint.

## Failed outcome gates

The outcome comparator correctly remains `pass=false`.

- Controller map and ordered control-event timeline mismatch at every turn 1..39.
- Turn-39 score is 700/712; required score is 707/712.
- Turn-39 native controller hash is `0d8c6b32d09dd6f3c586b1133d166da4045544fbc095b25d9c003a628666fe4a`; accepted hash is `c21a55c5f3a3d49f60220196cfd6c2ff9a00c4a3e24d7481126c13e60e6a3f95`.
- n91 and n92 each report seven protected losses: `op:brcko:bukvik_gornji_2`, `op:cajnice:batotici`, `op:foca:brusna_2`, `op:foca:donje_zesce`, `op:gorazde:kolovarice`, `op:srebrenica:obadi`, and `op:trnovo:tosici`.

The retained diagnosis is appropriately bounded. Two endpoint differences are the already-proven turn-1 authored Historical player paramilitary refusal. Five more endpoint differences arise later. The histories contain 49 accepted-only and 42 native-only exact control events, so the result is a diverged trajectory rather than seven isolated missing writes. The evidence does not justify attributing every later difference to the opening policy, and it does not justify a counterfactual authorization, forced control change, tuning change, or reference change.

The January anchor and event checks are useful historical-health signals, but the frozen contract also requires the exact accepted map, score 707, and zero n91/n92 losses. Those requirements failed and are not waived by the passing anchors or clean runtime.

## Scope and disposition

- Exact daily parity: **FAILED**.
- Turn-39 checkpoint outcome: **FAILED (700, required 707)**.
- n91/n92 protection: **FAILED (seven losses each)**.
- Packaged UI/IPC route, capture, canonical save/load, engine stream, and current-run diagnostics: **PASSED**.
- Earlier ambient-audio strict native/R8 failure: still open; this clean run does not retroactively close it.
- Turns 104/156/188, all-faction coverage, and final Farz mechanism checks: **UNREACHED**.
- Turn 188 expansion: **BLOCKED by the failed turn-39 stopping rule**. No rerun is warranted without a newly authorized question and a source-backed explanation that does not change the agreed acceptance criteria.

## Evidence

- `tmp/r8-native-calibration-parity-20261024/T39_03_RUN_CONTRACT.json`
- `tmp/r8-native-calibration-parity-20261024/native-t39-03/receipt.json`
- `tmp/r8-native-calibration-parity-20261024/native-t39-03-postrun-audit-01/POSTRUN_T39_AUDIT.json` (`3732aedc85ad929751031a9886420d91bd33114e3e5738edb76296b3d83783b5`)
- `tmp/r8-native-calibration-parity-20261024/native-t39-03-postrun-audit-01/OUTCOME_COMPARE.json` (`3c7fbec68839d04a4ba6322a459d7fe152aa145ee34930b375468ba2f87d8935`)
- `tmp/r8-native-calibration-parity-20261024/NATIVE_T39_03_MISMATCH_DIAGNOSIS.json` (`4d7a04af977cea02dd5da7031199299b1bb32804bce01a17266f55f97fbfcce8`)
- `tmp/r8-native-calibration-parity-20261024/preservation-01/PRESERVATION.json`
- `tmp/r8-native-calibration-parity-20261024/package-exact-post-01/PACKAGE_EXACT.json`

