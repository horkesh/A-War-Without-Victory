# Targeted verification — movement observer actor correction

## Verdict

**GO for bounded observer preparation.** The numeric actor coercion defect is corrected, primitive boundary validation now occurs before membership/filter/template operations, and the isolated RED plus 28-test GREEN are bound to the current reader and test hashes.

This GO covers preparation of the default-off observer and strict reader only. It does not establish a historical movement writer, authorize a gameplay correction, or close any campaign acceptance gate.

## Verified correction

- Current hashes match the actor correction packet exactly:
  - reader `88cffc40abc12dcca52667f0d3293bcc3aba43f030bf8e5f65eaca614fbc474d`
  - reader test `4f56149c01cefaa0f76548f086b37f1ec69285586206d58520c6d874315097e4`
- CLI expectations require a nonempty string actor and canonical positive safe-integer turn before constructing an expectation key (`tools/diagnostics/movement_phase_coverage.cjs:22-29`).
- `requested_formations` entries must be nonempty strings and remain sorted/deduplicated (`tools/diagnostics/movement_phase_coverage.cjs:86-89`).
- Phase and terminal receipts require nonempty string `formation_id`; phase names are nonempty strings; phase groups and dispositions retain their declared enums; turns and indexes are safe integers; skip reason remains null or string (`tools/diagnostics/movement_phase_coverage.cjs:90-113`).
- Any invalid primitive schema or weekly index stops processing before unrequested-actor membership checks, actor filtering, equality comparisons, or template-key construction (`tools/diagnostics/movement_phase_coverage.cjs:114-118`). Numeric actor `737` can no longer coerce into CLI actor text `737`.
- The tests use a cloned manifest per diagnostic, preventing one malformed case from contaminating later cases (`tests/movement_phase_coverage_diagnostic.test.ts:10-12`).
- The exact numeric actor negative expects `invalid_actor_manifest`, `invalid_receipt_schema`, and `invalid_terminal_receipt`; the adjacent positive control proves numeric-looking string actor ID `"737"` remains valid (`tests/movement_phase_coverage_diagnostic.test.ts:69-86`). Blank/nonstring actor fields and primitive phase fields also have explicit negatives (`tests/movement_phase_coverage_diagnostic.test.ts:87-102`).

## Evidence integrity

- The first full actor RED exited `1` with 10 failures and 18 passes. It exposed shared-manifest fixture contamination and is retained as a fixture failure, not claimed as isolated actor proof.
- After cloning manifest entries, with reader source still unchanged, the isolated numeric-actor RED exited `1`: the selected test failed because the old reader returned exit `0`; 27 tests were skipped. This is the meaningful pre-fix proof for the actor coercion defect.
- Current reader GREEN exited `0`: 1 file and all 28 tests passed.
- Current reader syntax exited `0`.
- `git diff --check` exited `0` during this verification.

The accepted structural and numeric evidence is reused unchanged: every actual central named phase is indexed and grouped; terminal consistency uses fresh post-invariant snapshots; four presence states and formation removal remain distinct; the canonical A→B movement fixture asserts OFF/ON success and neutrality; integer turn/index and canonical CLI-turn checks remain active. Observer and pipeline hashes remain the accepted `2bd875e6ca9df60838ad2e9ae2f29aba3129761ac515b5dd072387a5c6d49cb1` and `df4f7a8815995bc05d7bfa0bd3d9b2b6d65d1ff53e181e09c62a4478d15d9076`.

## Claim and process limits

- A configured 139-turn run must request the selected actor at every emitted turn `1..139`; requesting only turns 137–139 will reject the other observed turns as unexpected. No range semantics is present or implied.
- The initial untracked execution summary was overwritten and has no byte-for-byte backup. Root's labeled readback is not original-byte recovery. Raw initial logs/exits, the first independent review, parent campaign evidence, and protected artifacts remain intact; perfect artifact preservation must not be claimed.
- The earlier correction RED reader syntax gap and the first actor RED fixture contamination remain disclosed. Neither is repaired retrospectively.
- This preparation does not reconstruct turns 137–139, bind the original turn-517 evaluator inputs, prove ownership or shared cause, change the literal provenance guard failure, or close Farz/protected-control/paint/denominator/save/canon/188-week/default-campaign gaps.

No typecheck, campaign, prefix, replay, package build, full suite, or additional test was run in this verification. Root retains the required hook typecheck and final integration ownership.
