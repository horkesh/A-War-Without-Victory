# Post-run turn-39 reader audit review

Date: 2026-10-24  
Verdict: **CONDITIONAL GO; reader plan is sound after the transient-rating guard is corrected and reviewed**

The proposed readers answer the bounded question without synthesizing a run summary or invoking full-188 gates. The outcome comparator consumes canonical settled archives, reconstructs n94 from its initial map and ordered control events, checks the t39 score contract, builds n91/n92 protected-control rows, validates input/reference identity, and deliberately returns overall failure when earlier daily controller maps differ. `validate_run_consistency.cjs` accepts the canonical t39 save directly. The January OSID, control-band, event-anchor, and complete main-process-stream readers are appropriate at turn 39. Farz and later checkpoint gates remain unreached.

Before the reader packet is considered complete, enforce these explicit checks in the post-run receipt:

1. Child/wrapper exit 0, no timeout, and the final result log has exactly one successful RBiH entry. Use the final result log for post-teardown `expectedMainProcessStderr` / `unexpectedMainProcessStderr`; the progress file is written before those fields are attached.
2. Settled archive records are exactly turns 1 through 39, each record is `kind=settled`, each file's hash equals its record, and each save's `meta.turn` equals its record. Provisional records must also be retained as exactly turns 1 through 39, but they are diagnostics and never substituted for settled archives.
3. `OUTCOME_COMPARE.json` must retain the expected overall/controller-timeline failure and all raw daily rows. Independently require the turn-39 controller result to pass exact n94 map/hash equality and `checkpointScores` to contain turn 39 at exactly 707/707. Do not describe this as overall parity.
4. Require exactly the two protected rows `n91:turn-39` and `n92:turn-39`, each with `losses: []`. Do not treat an absent protected row as a pass.
5. Require the reached input-policy, reference-integrity, initial-control, input-binding, canonical-archive, cardinality, exact-turn, save/load, and evidence-manifest checks to pass. Require the final result arrays for console, page, and unmatched network failures to be empty while retaining expected attribution arrays and raw network evidence.
6. Require the January anchor readers, canonical consistency reader, and complete JSONL health reader to exit 0. The JSONL must have contiguous sequence numbers and exactly one `FINAL_SEAL unresolved=0` for every turn 1 through 39.

The current hydration validator would falsely reject a legitimate later save with empty or partial pre-save transient ratings because the authoritative loader rebuilds a complete rating map from persisted sectors. That guard must be corrected and independently verified before launch. Once that correction passes, and the frozen package/input/profile preflight remains exact, this reader plan supports one bounded RBiH turn-39 observational run. A failure stops; it does not authorize retry or turn 188.
