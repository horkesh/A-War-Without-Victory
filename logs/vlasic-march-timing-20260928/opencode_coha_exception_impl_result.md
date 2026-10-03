# COHA exception implementation result

## Verdict

**READY FOR CODEX REVIEW — stopped before campaigns.** No 156-week or 188-week campaign, full suite, retune, baseline adoption, commit, merge, or map refresh was run.

## Mechanism

- Added `src/sim/combat/coha_operation_exception.ts` as the single deterministic identity gate.
- The exception is active only for turns 153–155, active COHA, exact `Operation Vlasic Ridge`, RBiH `arbih_3rd_corps`, authored `op:travnik:turbe_2` staging, authored Vlašić objectives, and the authored six-brigade roster. Attack orders additionally require execution phase, a validated participant, and an authored operation-axis target. Ambiguous order ownership is rejected.
- `sector_offensive.ts`: pauses and clock-shifts every non-exception operation; lets only the exception use the normal lifecycle and result-reconciliation path.
- `bot_brigade_ai_osid.ts`: retains only validated Vlašić operation attack orders/postures during COHA; generic and unrelated attacks remain suppressed.
- `attack_resolution_osid.ts`: audits and consumes suppressed orders, while passing only validated Vlašić orders into unchanged ordinary combat math and attribution.
- `tactical_group_lifecycle.ts`: allows the same operation-owned exhaustion path; unrelated COHA lifecycle remains paused.
- Updated the Systems Manual COHA implementation note to record the scoped exception.
- Added focused regression coverage in `tests/coha_operation_pause.test.ts` for identity, timing, ordinary resolution/attribution, and outside-window/unrelated suppression.

## Checks and evidence

| Check | Result | Raw log |
|---|---:|---|
| `git diff --check` | exit 0 | `logs/vlasic-march-timing-20260928/coha_exception_git_diff_check_final.out` |
| Focused Vitest: 5 affected files, 79 tests | 5 files / 79 passed, exit 0 | `logs/vlasic-march-timing-20260928/coha_exception_focused_suite.out` |
| `npm.cmd run typecheck` | exit 0 | `logs/vlasic-march-timing-20260928/coha_exception_typecheck_final.out` |
| `npm.cmd run sim:data:check` | exit 0 | `logs/vlasic-march-timing-20260928/coha_exception_data_check_final.out` |
| `npm.cmd run desktop:startup-snapshot:check` | exit 0 | `logs/vlasic-march-timing-20260928/coha_exception_startup_snapshot.out` |

The first new resolution fixture run was 1 failed / 3 passed because its minimal fixture omitted adjacency; the single targeted fixture correction added the authored two-node adjacency. The correction rerun was 7/7 passed (`coha_exception_focused_correction.out`). No production failure required correction.

## Changed files for this handoff

- `src/sim/combat/coha_operation_exception.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `src/sim/combat/tactical_group_lifecycle.ts`
- `tests/coha_operation_pause.test.ts`
- `docs/10_canon/Systems_Manual_v0_9_0.md`

The worktree contained pre-existing uncommitted changes and retained them without reset, checkout, or cleanup. Ledger/final report updates are intentionally deferred until campaign evidence settles.

## Remaining risks for review

- The operation has no persisted `opportunity_id`; the exception therefore relies on the authored composite identity above. Review whether that seam is sufficiently unambiguous for production saves.
- Campaign behavior, protected anchors, acceptance, and determinism over 156/188 weeks remain unverified by this handoff.
- The historical premise supports ABiH offensives during COHA but does not independently establish a Paklarevo-specific capture date.

## Independent-review correction

Applied the one targeted live-path correction and stopped before campaigns.

- Changed the operation identity gate to use the catalog-authored operation staging
  `op:travnik:travnik_2` from `VLASIC_RIDGE_95_OPPORTUNITY`. The executing axis
  retains its distinct `op:travnik:turbe_2` staging field.
- Updated the focused fixture to mirror the retained n7 shape: operation-level
  staging `travnik_2`, an executing `vlasic_travnik_ridge` axis, the authored
  five-brigade live roster, and Paklarevo as the axis current objective. Added
  wrong-operation-staging and later-authored-objective rejection coverage.
- Tightened order admission to the brigade's executing axis current objective;
  generic and future authored objectives are not admitted.
- Made COHA pause diagnostics operation-local: a suppressed order for an
  unrelated operation no longer makes every operation appear lifecycle-paused.
  Existing Vlašić ordinary-resolution attribution coverage remains green.
- Read-only retained-save check (the save was not written) showed:
  `staging_osid=op:travnik:travnik_2`, `axis_staging_osid=op:travnik:turbe_2`,
  `turn=154`, `coha_active=true`, `identity=true`.

### Correction verification

| Exact command | Exit/result |
|---|---:|
| `npx.cmd vitest run tests/coha_operation_pause.test.ts` | 0 — 8/8 passed |
| `npx.cmd vitest run tests/coha_operation_pause.test.ts tests/scenario_operation_diagnostics.test.ts tests/sector_offensive.test.ts` | 0 — 3 files, 53/53 passed |
| `npm.cmd run typecheck` | 0 |
| `git diff --check` | 0 (existing CRLF warning on `docs/PROJECT_LEDGER.md`) |
| retained-save `npx.cmd tsx -e ...` read-only predicate check | 0 — identity true |

No campaign, full suite, save modification, or commit was run. This handoff is
stopped for Codex review.

### Final targeted receipt correction

- Restored the global COHA suppression and lifecycle-pause receipt even when
  `brigade_attack_orders` is empty.
- Made diagnostic pause interpretation operation-local by exempting only the
  validated Vlašić operation during its exception window; every other operation
  remains paused whenever the global receipt is present.
- Added focused real-entrypoint coverage for zero-order receipt preservation and
  mixed permitted Vlašić/unrelated suppression attribution. No generic or
  unrelated order was made executable.

| Exact command | Exit/result | Raw log |
|---|---:|---|
| `npx.cmd vitest run tests/coha_operation_pause.test.ts` | 0 — 1 file, 9/9 passed | `logs/vlasic-march-timing-20260928/coha_receipt_correction_coha.txt` |
| `npx.cmd vitest run tests/scenario_operation_diagnostics.test.ts` | 0 — 1 file, 28/28 passed | `logs/vlasic-march-timing-20260928/coha_receipt_correction_diagnostics.txt` |
| `npm.cmd run typecheck` | 0 | `logs/vlasic-march-timing-20260928/coha_receipt_correction_typecheck.txt` |
| `git diff --check` | 0 | `logs/vlasic-march-timing-20260928/coha_receipt_correction_diff_check.txt` |

No campaign, full suite, retune, save modification, or commit was run. Stopped
for Codex review.
