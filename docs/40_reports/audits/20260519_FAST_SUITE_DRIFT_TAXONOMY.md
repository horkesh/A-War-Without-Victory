# Fast-Suite Drift Taxonomy

**Date:** 2026-05-19
**Plan:** `docs/plans/2026-05-18-autonomous-ci-regression-hardening-plan.md` Task 1.
**Source of lessons:** `docs/40_reports/implemented/20260518_MERGE_GATE_FAST_SUITE_BATCH36.md`,
`docs/40_reports/audits/20260518_CI_TEST_FEEDBACK_LOOP_AUDIT.md`,
`docs/40_reports/audits/20260518_SESSION_CHECKPOINT_BATCHES_19_TO_32.md`.

## Why this exists

Post-Batch-36 the team confirmed a recurring failure mode: a long autonomous
batch can ship a green focused Vitest slice while the full fast suite (`npm
test`) is red on the same tree. The remediation lesson is concrete: docs-truth,
schema fixture, and generated artifact drift hide between focused-green and
full-red gates. This taxonomy classifies those drift classes, names the right
fix, and names the forbidden shortcut.

## How to use this doc

When a fast-suite failure surfaces:

1. Find the failing assertion class in the taxonomy below.
2. Apply the "Right fix" column.
3. Refuse the "Forbidden shortcut" column even when it would close the gate
   faster.

If a new failure does not match a row, add a row and link the incident report.

## Taxonomy

| Class | Symptom | Right fix | Forbidden shortcut | Reference |
|---|---|---|---|---|
| **Fixture drift** | Test builder produces an object the current schema rejects (e.g. missing `meta.player_faction`). | Update the builder to satisfy the current loaded-state contract; if the test models legacy data, set the legacy `schema_version` and let the migration registry default the new fields. | Bumping the test's allowed shape by deleting the strict-schema assertion. | Batch 36 report rows 1-3 |
| **Schema drift** | `validateGameStateShape` / migration rejection refuses a previously-passing fixture after a schema bump. | Add a versioned round-trip fixture (`tests/fixtures/save_migration/v{N}_*.json`) that locks the legacy shape; never edit `validateGameStateShape` to be permissive. | Loosening `validateGameStateShape` or migration rejection. | Batch 36 rows 4-5 |
| **Generated-artifact drift** | A committed JSON under `data/derived/` or `tools/diagnostics/output/` no longer matches its builder. | Regenerate from the canonical builder command (see "Generated Artifact Ownership Matrix"). | Hand-editing the JSON, or committing the diff without re-running the owner command. | Batch 36 rows 6-7 |
| **Docs-truth drift** | `tests/docs_*truth*.test.ts` asserts a string that the documentation no longer contains, or contains a string the test marks forbidden. | Update the docs to the current truth and re-affirm the assertion. The test is the pin. | `it.skip(...)` on the assertion block. This is now guarded by `tests/docs_truth_no_skip_guard.test.ts`. | Batch 36 "Codex integration correction" |
| **Behavior expectation drift** | A read-model test asserts a behavior code the engine no longer emits (e.g. coarse `idle` where it now emits `participants_below_attack_floor`). | Update the test to the current typed code; if the change is unintentional, fix the engine instead. | Catching the test failure with `expect.toBeTruthy()` or removing the assertion. | Batch 36 row 8 (sector offensive idle-recovery) |
| **Pre-merge gate count drift** | Baseline-regression CI guardrail counts an unexpected number of nested install/build jobs. | Update the count to match the canonical workflow yaml after a deliberate CI change. | Removing the count assertion. | Batch 36 row 9 |

## Reviewer checklist for future Claude handoffs

Before claiming a fast-suite remediation:

- [ ] `npm.cmd test` exit 0 on a clean tree — not a focused vitest slice.
- [ ] `npm.cmd run test:baselines` exit 0 if any scenario, save, replay, or
      derived artifact path was touched.
- [ ] `npm.cmd run typecheck` exit 0.
- [ ] `npm.cmd run desktop:map:build` exit 0 if UI / map / visual / packaging
      surfaces were touched.
- [ ] `git diff --check` clean.
- [ ] Every committed file under `data/derived/` or `tools/diagnostics/output/`
      has a named builder command (see "Generated Artifact Ownership Matrix").
- [ ] No new `describe.skip(` / `it.skip(` / `test.skip(` in
      `tests/docs_*truth*.test.ts` (enforced by static guard).
- [ ] No new `describe.skip(` / `it.skip(` / `test.skip(` in
      `tests/*_truth*.test.ts` and `tests/*_contract*.test.ts` without an
      inline justification comment.
- [ ] Ledger entry in `docs/PROJECT_LEDGER.md` for the remediation.

## Stop conditions

- A failure does not match any taxonomy row and is not a clear new class.
- A fix would require weakening `validateGameStateShape`, the migration
  registry, the player-faction contract, or a docs-truth assertion.
- A generated artifact has no clear owner command.

In any of these cases stop and ask the user or Codex; do not silence the test.

## Related guardrails

- `tests/docs_truth_no_skip_guard.test.ts` — static guard for docs-truth skip
  attempts.
- `tests/baseline_regression_ci_guardrails.test.ts` — CI yaml shape guardrail.
- `tests/determinism_static_scan_r1_5.test.ts` — `Date.now` / `Math.random` ban
  in core pipeline.
- `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md` — local repro sequence.
