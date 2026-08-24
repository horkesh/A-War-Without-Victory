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

2. **Complete balanced Vitest suite**
   - Command: `npm.cmd run test:vitest:balanced`
   - Inventory check: `npm.cmd run test:inventory:check`
   - Failure class: fixture drift, docs-truth drift, behavior expectation drift,
     discovery omission, shared-state collision, or worker-failure propagation.
   - The runner deterministically balances ordinary tests across four isolated
     processes and runs tracked-save writers, ambient-evidence readers,
     environment mutators, and fixed-port owners in a serial tail.
   - Forbidden shortcut: `npm test`, `test:vitest:fast`, `test:vitest:scenario`,
     or a focused slice. Those remain useful diagnostic subsets but are not
     complete pre-merge proof.

3. **Baseline regression**
   - Command: `npm.cmd run test:baselines`
   - Skip-permitted only when: no scenario, save, replay, derived artifact,
     scenario fixture, schema, or migration path was touched.
   - Failure class: generated-artifact drift, scenario behavior change. See
     `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`.

4. **Player-experience gate for UI/desktop/runtime changes**
   - Command: `npm.cmd run qa:player-experience`
   - Skip-permitted only when: no UI, map, visual, or packaging surface was
     touched.
   - Failure class: type/build drift, Electron runtime-contract failure,
     player-journey regression, browser opening/live-surface failure, server
     cleanup failure, or blocked warning/error signature.

5. **Diff hygiene**
   - Command: `git diff --check`
   - Failure class: whitespace errors, conflict markers.

## qa:all relation

`package.json` already exposes:

```
"qa:all": "npm run typecheck && npm run test:coverage && npm run desktop:map:build && npm run test:baselines"
```

`qa:all` remains a legacy aggregate for typecheck, coverage, map build, and
baselines. It does not use the balanced hazard-aware runner and does not run
the browser/player-experience gate, so it no longer substitutes for steps 2
and 4 above.

Do not edit `qa:all` to "make it stricter." It is the existing contract.
Adding a stricter gate goes here as a new step, not inside `qa:all`.

## Sequence rationale

- Typecheck first because it is the fastest fail and a typecheck failure
  invalidates downstream results.
- Complete balanced suite second because it preserves full discovery while
  isolating known shared-state hazards and propagating worker failures.
- Baselines third because they are expensive but catch real scenario behavior
  changes that the fast suite cannot reach.
- Player-experience fourth because UI/runtime changes require the built
  product, player journeys, and real browser routes rather than build-only
  success.
- `git diff --check` last as a cheap final hygiene pass.

## CI-only proof

Local pre-merge gate is not equivalent to CI. The following only CI runs:

- `.github/workflows/baseline-regression.yml` — `typecheck`,
  `scenario-anchors`, `test`, `scenarios` on Linux ubuntu-latest with the
  built startup snapshot freshly produced from the workflow's
  `desktop:startup-snapshot:build`.
- `.github/workflows/full-suite-and-fingerprint.yml` — complete balanced suite,
  player-experience gate, and fresh structural fingerprint on relevant PRs or
  pushes to `main`.
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
