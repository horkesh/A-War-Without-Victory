# Batch 3 targeted correction verification

## Verdicts

- **A — Officer succession evidence correction: PASS / unconditional code-review GO restored.** The earlier packet-integrity condition is closed. The reviewed code verdict remains GO for one separately preflighted old-package-02 native turn-43-to-44 probe with exactly one explicit `--officer-succession-policy=historical` flag.
- **B — HQ validation helper corrections: PASS / GO TO ONE-SHOT FINAL FREEZE ONLY.** HV-1, HV-2, and HV-3 are closed. The helpers correctly remain on HOLD because the final inventory and runtime manifest have not been frozen. This does not dispatch the campaign or full suite.
- **C — Sarajevo regression fixture preservation: PASS.** The test now creates a unique retained fixture root under ignored `tmp/sarajevo-override-fixtures/`; its scenario, assertions, seed, and production behavior are unchanged. It is safe to include in the final one-shot freeze.

## A. Officer succession evidence correction

`EVIDENCE_CORRECTION.json` has SHA-256 `bde9934fdc58a4f370e50f6ec7fa64bf23acfc2bc51bf682eedb6075378f8b87` and accurately supersedes the three nonexistent filenames without modifying the original packet or fabricating a replacement hash file.

The manifest binds the unchanged reviewed harness `9a1befed6caa79cd617ef8598546f5bd00752b64b73403e683a2caf90b52fd10` and test `580178a4a493e16ae2bfec821c28fad92b47d997d5b0a34c0cd734bcb52b9760`. All referenced final typecheck and diff-check paths exist and match their listed byte counts and hashes. Both preserved receipts report child exit 0, wrapper exit 0, no timeout, and passing artifact contracts. The final typecheck has empty stderr. The diff check's stderr hash matches the retained 869-byte line-ending warning output and its command still exits 0. The old 97-byte TS2554 log remains present, is correctly labeled failed, and is explicitly barred from qualifying as the final pass.

The prior `CONDITIONAL_GO_ONE_OLD_PACKAGE02_NATIVE_43_TO_44_WITH_EXPLICIT_HISTORICAL_POLICY` therefore becomes an unconditional **code/evidence GO**, still subject to the already required fresh run-specific preflight. No native result or calibration result is implied.

## B. HQ helper corrections

The correction result and manifest hashes match the handoff: `037e4bfda0a4cec0ddfa2bfa2c2dfaf7fa434b65dbcdb16351f456f34403c213` and `563e6a548261084e0c1683867401b2ca55c9832f9ab60b744bc1ca3e68cae98d`. The 15-file pre-correction archive remains byte exact.

- **HV-1 closed.** `runtimeAuthorityPaths()` explicitly covers the packet executables and configs, preserved wrapper, ignored campaign readers/reporting authority, n94 summary input, all 32 consumed scenario/reference inputs, and root Node/TypeScript/Vitest/package configuration. Freeze requires exact HEAD `81a65d76fce4936ea39c6d4b4d5df144139c8ba5`, writes the reviewed workspace inventory and runtime manifest with `wx`, and rejects existing outputs. Campaign and full-suite helpers assert the manifest before dispatch and report/assert it after finalization. Focused controls prove authority mutation and wrong-HEAD rejection.
- **HV-2 closed.** `compareScratchSnapshots` compares the union of opening and closing roots, then the union of files in every root, rejecting root/file addition, removal, and byte/hash changes. `scratch_preserved` is a hard full-suite result check. Opening and closing archives remain retained for diagnosis.
- **HV-3 closed.** `compare_n94.cjs` now compares `initial_save.json` byte for byte before the established saved-turn loop; any difference enters `n94_exact_saved_state` and fails the candidate.
- **Preserved-wrapper control closed.** The only documented invocations go through `invoke_preserved_gate.cjs`, which accepts only the two packet configs, refuses an existing attempt directory, caps the outer wrapper at 35 minutes, and delegates attempt creation and exact success-artifact accounting to the preserved wrapper. The child caps remain 34 minutes 30 seconds. Campaign declares 52 child artifacts; suite declares 7. Partial failure evidence remains retained even if the success artifact contract also fails.

The retained verification evidence reports 10 syntax checks, 18 packet checks in intentional HOLD mode, and 19 correction controls, all passing. No `reviewed-candidate-inventory.json`, `HASHES.json`, `campaign-01`, or `full-suite-01` exists. Final freeze must still occur once, after all relevant writers stop; packet self-test must pass before either expensive gate. The campaign remains one attempt with no automatic retry, and the full suite remains conditional on a qualifying campaign result and outer receipt.

## C. Sarajevo fixture preservation

Against the preserved pre-edit test, the only behavioral delta imports `mkdirSync` and `mkdtempSync`, creates `tmp/sarajevo-override-fixtures`, and allocates `case-*` as the scenario output base. The three existing base/override branches and all assertions remain unchanged. Against the preserved `.gitignore`, the only addition is `/tmp/sarajevo-override-fixtures/`.

The final test hash is `06186c414b42f491147c2ccca5e56f0828c79e3f11be78a3c4861788a5501c9f`. The focused preserved receipt reports one test passed with child/wrapper exit 0, no timeout, and a passing artifact contract. Its result records one fresh case containing `base`, `override_a`, and `override_b`. Independent byte/hash verification found all 45 legacy files under `data/derived/scenario/_sarajevo_override_test` unchanged.

The subsequently completed whole-workspace nonincremental typecheck receipt at `typecheck-final-02/receipt.json` has SHA-256 `e568b7b4d04d5d90b666a11a509e9643fe1c92d228b23db50b07c6b192be20eb`; it reports child/wrapper exit 0, no timeout, empty stderr, and a passing artifact contract.

The full-suite helper intentionally keeps the fixed legacy `data/derived/scenario/_sarajevo_override_test` directory in its hard opening/closing scratch comparison. The new ignored per-run fixture directory is retained diagnostic output and is excluded from protected workspace fingerprints; this is consistent with the stated preservation contract and does not affect GameState, RNG, or production paths.

## Remaining gates

1. Stop all source, test, tool, documentation, packet, reader, scenario, reference, and root-configuration writers.
2. Run the HQ one-shot freeze exactly once and require its packet self-test to pass.
3. Before the old-package-02 officer probe, perform its separate frozen preflight with the exact reviewed harness/test hashes, single explicit succession flag, immutable source save, qualified package, fresh profile, and fresh outputs.
4. Do not combine the retained old package with the HQ gameplay change. Do not dispatch the HQ 188-turn campaign until its frozen manifest and all separately required prerequisites qualify.

No canon panel is required for these corrections: they repair evidence bookkeeping, validation enforcement, and test-only output allocation without changing simulation rules, protected state, historical claims, player consent, or production policy.
