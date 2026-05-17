# CI And Test Feedback Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce GitHub failure diagnosis time by centralizing duplicated scenario truth, splitting slow gates for earlier signal, hardening local scenario test execution, and documenting the CI triage workflow.

**Architecture:** Keep Baseline Regression and Desktop Release Guard as final release gates, but add narrower early signals and remove duplicated expectations that can drift. Scenario truth should live in one exported source and be consumed by both scenario summaries and deployment-health tests. CI changes must improve feedback order without weakening full gates.

**Tech Stack:** GitHub Actions, npm scripts, Vitest slice runner, TypeScript scenario runner, desktop packaging scripts, project ledger/roadmap docs.

---

## Background

The 2026-05-17 GitHub repair took longer than expected because the first fast-suite failure masked a later scenario failure. Once the fast job passed, Baseline Regression reached `scenarios` and exposed duplicated `op:brcko:brka_2` anchor truth: `src/scenario/scenario_runner.ts` expected `RBiH`, while `tests/integration_deployment_health.test.ts` expected `RS`.

This plan does not remove scenario coverage. It makes failures surface earlier and makes duplicated test truth harder to reintroduce.

## Non-Goals

- Do not weaken or skip `npm run test:vitest:scenario`.
- Do not change simulation rules, scenario data, random seeds, calibration targets, save schema, or generated artifacts as part of this cleanup.
- Do not restore byte-hash baseline comparisons as cross-platform truth.
- Do not edit `docs/10_canon/FORAWWV.md`.

## Success Criteria

- Historical OSID anchors have one canonical exported source.
- Deployment-health tests import canonical anchor truth instead of copying it.
- CI has a focused scenario-anchor job that can fail before the full scenario suite.
- Local Windows reproduction has a documented command path and known caveats.
- GitHub Actions triage docs cover `gh` plus connector/API fallback when local auth is broken.

---

## Task 1: Audit Current CI Cost And Failure Order

**Files:**
- Read: `.github/workflows/baseline-regression.yml`
- Read: `.github/workflows/desktop-release-guard.yml`
- Read: `package.json`
- Read: `tools/test/run_vitest_slice.mjs`
- Create: `docs/40_reports/audits/YYYYMMDD_CI_TEST_FEEDBACK_LOOP_AUDIT.md`

**Steps:**
1. Record the current job order: Baseline `typecheck -> test -> scenarios`; Desktop `desktop-release-check -> desktop-packaged-runtime-probe`.
2. Record the commands each job runs: `npx tsc --noEmit`, `npm run desktop:startup-snapshot:build`, `npm run test:vitest:fast`, `npm run test:vitest:scenario`, `npm run desktop:release:check`, `npm run desktop:package:probe`.
3. Measure local runtime for:

```bash
npm run desktop:startup-snapshot:build
npm run test:vitest:fast
npm run test:vitest:scenario -- -- -t "critical OSID anchors are controlled by expected faction"
npm run desktop:release:check
```

4. Commit the audit:

```bash
git add docs/40_reports/audits/YYYYMMDD_CI_TEST_FEEDBACK_LOOP_AUDIT.md
git commit -m "docs(ci): audit test feedback loop"
```

**Stop gate:** If `git status --short` shows unrelated dirty files, do not stage them. If local runtime cannot be measured because dependencies or generated artifacts are missing, record that as an audit finding before editing CI.

---

## Task 2: Centralize Scenario Anchor Truth

**Files:**
- Create: `src/scenario/historical_anchors.ts`
- Modify: `src/scenario/scenario_runner.ts`
- Modify: `tests/integration_deployment_health.test.ts`
- Test: `tests/scenario_anchor_contract.test.ts`

**Step 1: Write the failing contract test**

```ts
import { describe, expect, it } from 'vitest';
import { HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992 } from '../src/scenario/historical_anchors.js';

describe('historical scenario anchor contract', () => {
  it('keeps Brka south of Brcko as the canonical RBiH anchor', () => {
    const brka = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.find(
      anchor => anchor.osid === 'op:brcko:brka_2',
    );

    expect(brka).toEqual({
      osid: 'op:brcko:brka_2',
      expected_controller: 'RBiH',
    });
  });

  it('does not contain duplicate OSID anchors', () => {
    const ids = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.map(anchor => anchor.osid);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

Run:

```bash
npx vitest run tests/scenario_anchor_contract.test.ts
```

Expected: FAIL because `src/scenario/historical_anchors.ts` does not exist yet.

**Step 2: Move anchor constants**

Create `src/scenario/historical_anchors.ts`:

```ts
export interface HistoricalSettlementAnchor {
  settlement_id: string;
  expected_controller: string;
}

export interface HistoricalOsidAnchor {
  osid: string;
  expected_controller: string;
}

export const HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992: HistoricalSettlementAnchor[] = [
  // Move current settlement anchors from scenario_runner.ts unchanged.
];

export const HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992: HistoricalOsidAnchor[] = [
  // Move current OSID anchors from scenario_runner.ts unchanged.
];
```

In `src/scenario/scenario_runner.ts`, import the moved arrays:

```ts
import {
  HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992,
  HISTORICAL_SETTLEMENT_ANCHORS_APR1992_TO_DEC1992,
} from './historical_anchors.js';
```

**Step 3: Remove duplicated deployment-health anchors**

In `tests/integration_deployment_health.test.ts`, replace the local anchor array with canonical imports:

```ts
import { HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992 } from '../src/scenario/historical_anchors.js';

const DEPLOYMENT_HEALTH_OSID_ANCHORS = HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992.map(anchor => ({
  osid: anchor.osid,
  expected: anchor.expected_controller,
}));
```

Loop over `DEPLOYMENT_HEALTH_OSID_ANCHORS` in the existing assertion.

**Step 4: Verify**

```bash
npx vitest run tests/scenario_anchor_contract.test.ts
npm run test:vitest:scenario -- -- -t "critical OSID anchors are controlled by expected faction"
```

Expected: both pass.

**Step 5: Commit**

```bash
git add src/scenario/historical_anchors.ts src/scenario/scenario_runner.ts tests/integration_deployment_health.test.ts tests/scenario_anchor_contract.test.ts
git commit -m "test(scenario): centralize historical anchor truth"
```

---

## Task 3: Add A Focused Scenario Anchor Script

**Files:**
- Modify: `package.json`
- Optional modify: `tools/test/run_vitest_slice.mjs`

**Steps:**
1. Add a focused script:

```json
"test:vitest:scenario:anchors": "node tools/test/run_vitest_slice.mjs scenario -- -t \"critical OSID anchors are controlled by expected faction|historical scenario anchor contract\""
```

2. If regex passthrough proves brittle, use a direct Vitest script instead:

```json
"test:vitest:scenario:anchors": "vitest run tests/scenario_anchor_contract.test.ts tests/integration_deployment_health.test.ts -t \"critical OSID anchors are controlled by expected faction|historical scenario anchor contract\""
```

3. Verify:

```bash
npm run test:vitest:scenario:anchors
```

Expected: pass in roughly the time of one deployment-health run, not the entire scenario suite.

4. Commit:

```bash
git add package.json
git commit -m "test(ci): add focused scenario anchor script"
```

---

## Task 4: Split Baseline Regression For Earlier Scenario Signal

**Files:**
- Modify: `.github/workflows/baseline-regression.yml`

**Step 1: Add a focused job after typecheck**

```yaml
  scenario-anchors:
    needs: typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm

      - run: npm install --legacy-peer-deps
      - run: npm install --legacy-peer-deps --prefix src/ui/map

      - name: Rebuild startup snapshot for this platform
        run: npm run desktop:startup-snapshot:build

      - name: Focused scenario anchor tests
        run: npm run test:vitest:scenario:anchors
```

**Step 2: Preserve full gates**

Keep the full fast and scenario jobs:

```yaml
  test:
    needs: typecheck

  scenarios:
    needs: test
```

The new job is early signal, not a replacement.

**Step 3: Verify syntax**

Run:

```bash
git diff --check -- .github/workflows/baseline-regression.yml
```

If a YAML validator is available, also run it. If not, rely on GitHub Actions syntax validation after push.

Do not push workflow changes until `npm run test:vitest:scenario:anchors` passes locally and the full `scenarios` job remains present in the diff.

**Step 4: Commit**

```bash
git add .github/workflows/baseline-regression.yml
git commit -m "ci: add focused scenario anchor gate"
```

---

## Task 5: Harden Local Scenario Reproduction

**Files:**
- Read: `tests/scenario_harness_contracts.test.ts`
- Read: `tests/h1_11_baseline_ops_sensitivity.test.ts`
- Read: `tools/test/run_vitest_slice.mjs`
- Modify only if reproduced: scenario tests with fixed temp directories or insufficient per-test timeout
- Create: `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`

**Steps:**
1. Start from a clean worktree:

```bash
git status --short
npm run desktop:startup-snapshot:build
npm run test:vitest:scenario
```

2. If `replay_save_manifest.json` ENOENT recurs, inspect fixed `.tmp_scenario_*` output directories and isolate tests with unique per-test output directories.
3. If `h1_11_baseline_ops_sensitivity` timeout recurs on a clean worktree, raise only that long test to `90_000` ms.
4. Create `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md` with the local reproduction sequence for Baseline and Desktop Release Guard.
5. Commit only actual changes:

```bash
git add docs/20_engineering/CI_TRIAGE_PLAYBOOK.md tests/scenario_harness_contracts.test.ts tests/h1_11_baseline_ops_sensitivity.test.ts tools/test/run_vitest_slice.mjs
git commit -m "test(scenario): harden local scenario reproduction"
```

---

## Task 6: Document GitHub Actions Triage And Auth Fallback

**Files:**
- Modify: `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`
- Modify: `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`

**Steps:**
1. Add preferred `gh` commands:

```bash
gh auth status
gh run list --branch main --limit 10
gh run view <run-id> --jobs
gh run view <run-id> --log-failed
```

2. Add fallback when `gh auth status` reports an invalid token:

```text
Use the GitHub connector to fetch workflow jobs, job steps, and job logs.
Use public REST status endpoints for run/job metadata when log download needs Actions permission.
```

3. Link the playbook from `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`.
4. Commit:

```bash
git add docs/20_engineering/CI_TRIAGE_PLAYBOOK.md docs/20_engineering/PIPELINE_ENTRYPOINTS.md
git commit -m "docs(ci): add GitHub Actions triage playbook"
```

---

## Task 7: Final Verification And Closeout

**Files:**
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Optional modify: `.claude/napkin.md`

**Steps:**
1. Run:

```bash
git diff --check
npm run desktop:startup-snapshot:build
npm run test:vitest:scenario:anchors
npm run test:vitest:fast
npm run desktop:release:check
```

2. Push and watch GitHub:

```bash
git push
gh run list --branch main --limit 5
gh run view <baseline-run-id> --jobs
gh run view <desktop-run-id> --jobs
```

Expected:

```text
Baseline Regression: success
Desktop Release Guard: success
```

3. Update roadmap and ledger with final run IDs and results.
4. Commit closeout docs only if the implementation owner has push/commit authorization for this session:

```bash
git add docs/plans/MASTER_ROADMAP.md docs/PROJECT_LEDGER.md .claude/napkin.md
git commit -m "docs(ci): close test feedback loop plan"
```

Only include `.claude/napkin.md` if a reusable runbook note was actually added.

## Required Failure-Loop Evidence

Every closeout must include:
- first failing GitHub run ID and failing job name;
- local reproducer command and result;
- exact file that owned the fix;
- final Baseline Regression and Desktop Release Guard run IDs;
- statement that no scenario gates were skipped or weakened.

---

## Execution Notes

- Use small commits in task order; do not bundle workflow edits with anchor refactors.
- Treat full scenario tests as release gates, not quick inner-loop checks.
- If a CI job fails after an earlier failure is fixed, diagnose it as a newly surfaced failure unless the logs prove the same root cause.
- Preserve unrelated dirty worktree changes and stage only files owned by the current task.
