# BC08 — Current engine-health verification (2026-09-07)

**Disposition: CLOSED — bounded verification/disposition.** The recorded historical simulation-test
residual is not reproduced by the current exercised suites. The full invocation remains **RED (exit
1)** because of one demonstrated Windows shell-resolution failure; the unchanged affected file
passes 8/8 with Git Bash selected in the child environment. This closes BC08's classification, not
the engine, the whole suite, BC01–BC07, or final calibration. No code, test expectation, threshold,
baseline or canon was changed.

## Current suite and environment

HEAD `2c2aa72a8a2d84aab349f754a3207514420c18ae`, Node `v22.23.2`. The canonical balanced suite
started 2026-09-07 05:24:16 UTC and completed 05:55:52 UTC (31m36s), actual exit **1**.
**1,349 file executions: 1,344 passed, 1 failed, 4 skipped; 13,639 tests: 13,607 passed, 1 failed,
31 skipped.** These are executions, not distinct filenames: 1,346 unique files, with one file
partitioned four ways (+3 executions). The serial tail passed 51 files / 806 tests. Typecheck exited0.
All six pre-existing dirty paths have identical hashes before/after the suite; the later report edits are separately authorized documentation work.
Wholly skipped files: `sector_front_role_truth_real_save`, `scenario_golden_baselines_h2_3`,
`sector_drina_frontline_integrity`, and `supply_sensitive_history_smoke`. Those checks and all 31
skipped test executions provide no execution proof; this is not complete engine coverage.

The sole failing file is `tests/desktop_release_ci_guardrails.test.ts`: an unqualified `bash`
resolves to the Windows launcher, while the test supplies an MSYS `/f/...` path. Prepending
`C:\Program Files\Git\bin` to PATH **only in a spawned Vitest child** makes the unchanged file
pass **8/8, exit 0**. No global PATH mutation. This is an environment disposition, not a simulation
repair; the original suite result stays red and no overall-green claim follows.

Shell evidence is honestly labeled: its receipt/stdout/stderr were reconstructed from the original
tool output, not raw redirected streams or a second run; an empty stderr means none was observed.
The suite itself has directly captured logs and real child completion status. Correct shell selection
must remain explicit for future use of this Windows entrypoint; a new full suite was not run merely
to replace the truthful red record with green.

## Historical residual reconciliation

- `integration_deployment_health`: **11 tests pass**, actual scenario execution (83,988ms).
- `integration_run_diagnostics`: **6 tests pass**, actual scenario execution (84,121ms).
- `peace_plans`: **35 tests pass** (60ms). The old accepted-control assertion was removed at
  `86db133ed`; a current pass is not evidence that its previous numeric result was repaired.

The earlier five-file/six-test prose did not preserve an exact five-file inventory; this report does
not invent one. The two located integration assertions pass on their existing permitted/annotated
conditions, not a claim of literally zero empty sectors. Their current exercised behavior and the
complete suite classification supersede the old prose as current status.

## Accepted artifact equivalence and gates

Accepted n392: `apr1992_definitive_188w__6898d6d2e324c7a3__w188_n392`, clean provenance commit
`c2f6592ec1e2f049d93ade595760c19633bb2ce7`, Node `v22.23.2`, matching current runtime.
Source/data/tools differ from that commit only in the accepted baseline manifest; package/runtime
configuration is unchanged. **31/31 consumed inputs match**, including aggregate digest
`eaa6b1778fc26c0a9894e1063ad2df5549a3030ce1c66d80af5ecde5ad4aa0ce`, using the canonical
CRLF→LF normalization in `src/scenario/run_provenance.ts:225-237`. Three initial raw-byte mismatches
were newline-only; both audits are preserved transparently.

| Current gate applied to n392 | Actual result |
|---|---|
| Default `engine_health_gate.cjs` | PASS, exit 0 |
| `engine_health_gate.cjs --engine-integrity-only` | PASS, exit 0 |
| Direct `validate_run_consistency.cjs` | PASS, exit 0 |

Checkpoint values **702/678/672/665** exceed unchanged floors **694/674/668/641**. The separate
generic matched-OSID health floor is **644**, passed at 665. Zero eligible-op, invalid-operation-week,
ghost-destroyed and consistency failures; stranded 13<=16. K:W 3.763 lies inside its advisory band.

Limits remain visible: assignment completeness is **NOT ESTABLISHED** because transient
`military.unresolved_sector_brigades` is absent. Two unavoidable floor shortfalls remain:
2nd Krajina 2/4 and Sarajevo-Romanija 1/2. Advisory dead operations 16/50 (19/72axes), planning deaths
probe 354/355 and sector_attack 21/53 are reported, not repaired, blessed, or newly scheduled.

This is current-gate revalidation of an accepted source/input-equivalent artifact, **not a fresh HEAD
188-week campaign**, player-path parity proof, or a complete transient/per-turn trace. No fresh 188w
is required solely to transfer these unchanged artifact gates; the coverage limits still apply.
[Determinism guidance](../../20_engineering/DETERMINISM_TEST_MATRIX.md) requires identical state and
phase inputs for exact determinism claims. This evidence does not close opportunity, endgame,
event-timing or player-path defects in the other BC rows.

## Evidence and next disposition

- [Summary](../../../runs/bc08_20260907/summary.json), [evidence hashes](../../../runs/bc08_20260907/evidence-sha256.json), [Suite completion](../../../runs/bc08_20260907/result.json), [stdout](../../../runs/bc08_20260907/stdout.log), [stderr](../../../runs/bc08_20260907/stderr.log), [inventory](../../../runs/bc08_20260907/inventory.json), [typecheck](../../../runs/bc08_20260907/typecheck-result.json), [dirty-file preservation](../../../runs/bc08_20260907/post-run-file-hash-comparison.json).
- [Shell receipt and limitations](../../../runs/bc08_20260907_shell/receipt.json), [focused output](../../../runs/bc08_20260907_shell/focused.stdout.log).
- [Artifact gate statuses](../../../runs/bc08_20260907_health/status.json), [canonical input audit](../../../runs/bc08_20260907_health/normalized_input_audit.json), [initial raw/provenance audit](../../../runs/bc08_20260907_health/provenance_audit.json), [direct validator](../../../runs/bc08_20260907_health/direct_consistency.stdout.log).

These evidence directories are machine-local/gitignored; their logs and hashes are retained locally,
not committed evidence artifacts or release artifacts. BC01 is the next recommended behavioral
priority, under its corrected autonomy contract; repair scheduling remains separate and D1 is not
overridden. R7 may continue on disjoint presentation files. Final calibration still follows the
remaining [finite closure register](../../plans/MASTER_ROADMAP.md#41-finite-behavior-closure-register-2026-09-07).
