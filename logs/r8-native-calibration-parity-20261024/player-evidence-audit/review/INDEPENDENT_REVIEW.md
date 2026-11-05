# Independent review — player-validation evidence audit

**Verdict: CORRECTION_REQUIRED before documentation integration.**

The 21-cell status matrix is conservative and preserves the owner decision: n94 remains the no-player benchmark, 700/712 remains diagnostic, Save/load is not same-input replay, RBiH t39 does not qualify later checkpoints or RS/HRHB, and inherited audio/full-tour/product gates remain open. Preservation evidence also remains intact: the fresh receipt reports child/wrapper 0/0, 3,226 prior bindings, 40 n94 files, unchanged telemetry prefixes, and five unchanged legacy functions.

## Findings

1. **[P1] The Farz authority citation is broken.** Both audit artifacts cite `docs/30_planning/CALIBRATION_MASTER.md:2536-2549`, but that path does not exist. The cited ruling is in `docs/40_reports/CALIBRATION_MASTER.md` under “Farz objective ruling — 2026-09-29.” Correct both the prose citation and JSON `sources` entry before integration so the claimed second-or-third-Corps/four-receipt/w188 rule remains traceable.

2. **[P1] The recommended next validation is not currently executable and combines two independent qualification questions.** `tools/diagnostics/player_input_contract_audit.cjs` does not exist. The audit says implementation is unauthorized, yet presents that nonexistent entrypoint as the proposed next command. Its only executable checks are syntax and two focused test files, which the audit correctly admits cannot prove either production input replay or frozen all-faction openings. Reframe the present result as a fail-closed retained-evidence verdict: `MISSING_REPLAYABLE_INPUT_CONTRACT` and `OPENING_CONTRACT_UNQUALIFIED`. Then name separately authorized implementation as future work. Keep the smallest dependency first: establish whether a source-owned ordered player-input serialization and production consumer exist; do not bundle all-faction opening fixtures into the same validation unless their inputs and invocation are concretely specified.

3. **[P2] The proposed command cannot satisfy its stated pass criteria as written.** It accepts only the retained RBiH result and manifest, while pass criteria also require frozen RBiH/RS/HRHB opening fixtures. If this future tool is retained in the recommendation, specify concrete fixture paths/arguments or a separate executable test command, and require the entrypoint to exist before calling the command feasible.

4. **[P2] Reader scope needs one explicit caveat.** The packaged harness's built-in `assertHistoricalEventAnchors` applies only to RS, target turn 52 or later, and non-resume runs (`tools/ui/paradox_local_qa.cjs:199-220`, call at `:5734-5739`). The RBiH t39 five-event PASS came from the separate post-run January reader, not this built-in harness assertion. Add this distinction to prevent the retained five-event result from implying reusable cross-faction or resume-path coverage. The source anchor tables define no player-choice applicability predicate, so no source-conditioned waiver is established.

No determinism risks were introduced by this read-only audit. The governing same-input and canonical-state requirements remain open as stated in `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` and `docs/10_canon/Engine_Invariants_v0_9_0.md`.
