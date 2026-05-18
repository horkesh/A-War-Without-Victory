# Pre-Merge Gate Sequence

**Date:** 2026-05-19
**Plan:** `docs/plans/2026-05-18-autonomous-ci-regression-hardening-plan.md` Task 4.

This doc names the canonical local pre-merge gate sequence so reviewers and
autonomous workers run the same commands in the same order. It does not add a
new npm script. It documents what `npm run qa:all` already covers, names the
extra commands that should run alongside it, and lists what only CI can prove.

## Canonical local sequence (in order)

Run these on the merge candidate branch from a clean working tree (`git status
--short --branch` shows no dirt).

1. **Typecheck**
   - Command: `npm.cmd run typecheck`
   - Equivalent: `npx.cmd tsc --noEmit -p tsconfig.json`
   - Failure class: schema drift, strict-null escape, unresolved import.

2. **Fast Vitest suite (full, not focused)**
   - Command: `npm.cmd test`
   - Equivalent: `npm.cmd run test:vitest:fast`
   - Failure class: fixture drift, docs-truth drift, behavior expectation
     drift. See `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md`.
   - Forbidden shortcut: passing only a focused slice. Post-Batch-36 a focused
     slice was green while the full fast suite was red on the same tree.

3. **Baseline regression**
   - Command: `npm.cmd run test:baselines`
   - Skip-permitted only when: no scenario, save, replay, derived artifact,
     scenario fixture, schema, or migration path was touched.
   - Failure class: generated-artifact drift, scenario behavior change. See
     `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`.

4. **Desktop / map / UI build**
   - Command: `npm.cmd run desktop:map:build`
   - Skip-permitted only when: no UI, map, visual, or packaging surface was
     touched.
   - Failure class: bundler config drift, missing dep, broken main-process
     helper packaging contract.

5. **Diff hygiene**
   - Command: `git diff --check`
   - Failure class: whitespace errors, conflict markers.

## qa:all relation

`package.json` already exposes:

```
"qa:all": "npm run typecheck && npm run test:coverage && npm run desktop:map:build && npm run test:baselines"
```

`qa:all` substitutes `test:coverage` for the plain fast suite. Coverage runs
the same vitest set and exits non-zero on the same failures, so it satisfies
step 2 for branches that want coverage signal in the same pass. The canonical
sequence above keeps step 2 and step 3 separate so reviewers can see which
gate failed first.

Do not edit `qa:all` to "make it stricter." It is the existing contract.
Adding a stricter gate goes here as a new step, not inside `qa:all`.

## Sequence rationale

- Typecheck first because it is the fastest fail and a typecheck failure
  invalidates downstream results.
- Fast suite second because schema and fixture drift fail there with concrete
  error messages.
- Baselines third because they are expensive but catch real scenario behavior
  changes that the fast suite cannot reach.
- Map build fourth because it is large but only relevant when UI surfaces
  changed.
- `git diff --check` last as a cheap final hygiene pass.

## CI-only proof

Local pre-merge gate is not equivalent to CI. The following only CI runs:

- `.github/workflows/baseline-regression.yml` — `typecheck`,
  `scenario-anchors`, `test`, `scenarios` on Linux ubuntu-latest with the
  built startup snapshot freshly produced from the workflow's
  `desktop:startup-snapshot:build`.
- `.github/workflows/desktop-release-guard.yml` — Linux AppImage smoke +
  Windows NSIS smoke on `windows-latest`.

Do not claim a branch is merge-ready from local-only signal. Wait for the
remote CI run on the pushed branch. Local gate catches most drift; CI catches
the rest, especially cross-platform path and case-sensitivity drift.

## Stop conditions

- Any local gate failed and the cause does not match the
  Fast-Suite Drift Taxonomy or the Generated Artifact Ownership Matrix.
- A fix would require weakening `validateGameStateShape`, the migration
  registry, the player-faction contract, or a docs-truth assertion.
- A generated artifact lacks an owner row in the matrix.

In any case stop and ask Codex or the user before pushing.

## Cross-references

- `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md`
- `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`
- `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`
- `docs/40_reports/audits/20260518_CI_TEST_FEEDBACK_LOOP_AUDIT.md`
- `tests/docs_truth_no_skip_guard.test.ts`
- `tests/baseline_regression_ci_guardrails.test.ts`
