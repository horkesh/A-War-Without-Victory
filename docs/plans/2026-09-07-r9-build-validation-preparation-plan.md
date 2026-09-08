# R9 Build and Validation Preparation Implementation Plan

> **For implementation:** Use `executing-plans`; execute one phase at a time.

**Goal:** Make tests and shipped UI use the intended dependency graph, eliminate duplicate check execution, and exclude development research from release payloads before final acceptance.
**Architecture:** Keep the existing npm/Vite/Electron/CI stack. Consolidate dependency ownership and check execution; narrow existing package filters using verified runtime-resource consumers. Do not create a build system, check orchestrator or generated manifest framework.
**Tech stack:** npm lockfiles/workspaces as needed, Vite, Vitest, electron-builder, existing GitHub Actions and package probes.
**Date/status:** 2026-09-08; dependency graph review GO. Phase 1 implementation/acceptance and Phases 2–3 remain open.
**Owner / board row:** R9 preparatory subset of existing dependency/offline/reproducibility ownership, executed before final R8 acceptance. This explicit subset is not activation of R9 freeze, signing or publication.
**Slot:** Phase 1 follows R7 and cleanup script handoff (Tasks 5/7/8), before final BC09/BC10 campaign evidence where possible. Phase 2 follows Phase 1 and precedes final expensive validation. Phase 3 follows BC09 input-contract definition. All three precede final calibration, final R8 packaged diaries, and R9 Phase 0 freeze.
**Next action:** Record the R7 build handoff, then add the Phase 1.1 mismatch contract before consolidating install authority.
**Collisions:** One owner for `package.json`, both lockfiles, Vite/test config and CI. Wait for cleanup script edits and R7 build/presentation edits. Runtime fixes may proceed on disjoint source, but final proof must use the resulting frozen build inputs.

## 1. Holistic scope and decisions

Audit S1/S2/S3 belong here, not in closed R5 or three new infrastructure lanes. R5's completed artifact ownership and CI guards remain the base; R9 Phase 1.2 still owns final SBOM/license/offline verification. This packet moves known build-input corrections before acceptance rather than modifying the accepted artifact after RC freeze.

[Deletion cleanup](2026-09-07-bounded-deletion-cleanup-plan.md) owns dead sources/commands/hooks. [R8 runtime integrity](2026-09-07-r8-runtime-input-ai-integrity-plan.md) owns required simulation inputs and optional AI. R7 retains English formatting/readability and its current screenshot contracts. No duplicate presentation, artifact-inventory, licensing or replay project is commissioned.

Keep live standalone/recovery viewers and all runtime FOW/security boundaries. No major library upgrade just because a newer version exists, no replacement test runner, no cache server, no automatic baseline update, no deleting research from the repository, and no signing/upload/remote push or branch-protection mutation in this packet. A required external check-name migration is a concrete operator handoff, not permission to break required checks.

## 2. Execution and review contract

Read AGENTS, napkin, master §§4/8/11, controlling R9 and R8 plans, `PLAN_EXECUTION_STANDARD.md`, `CODE_CANON.md`, `PRODUCT_SHELL_HIERARCHY.md`, `.github/workflows/README.md` and existing generated-artifact ownership policy. Use the runtime build/devops/platform skills when implementing their respective phases. One implementer and independent reviewer cover build, QA, determinism and package security; preserve required distinct seats if scope actually triggers them.

```powershell
git status --short --branch
git worktree list --porcelain
node --version
git remote get-url origin
Get-Content package.json
Get-Content src/ui/map/package.json
rg -n 'npm ci|typecheck|test:vitest|baseline|fingerprint' .github/workflows tools/test package.json
```

Use an isolated `codex/` branch. Record dependency resolution and required-check ownership before modifying either. Stop on a necessary major-version behavior change, loss of check coverage/reporting, unclassified runtime resource, source/input drift, or file collision. Keep the existing safe mechanism when evidence is insufficient; do not delete checks to reach a target count.

## 3. Phase 1 — Shared runtime dependency authority (audit S1)

### Dependency-review boundary — 2026-09-08

The owner requested the next dependency review after cleanup Task 8. This review runs
on `codex/r9-dependency-authority`, based on `d874817eb9dea609f89e80debc047d78fd1b046e`;
Task 8 remains unmerged. Its cleanup script handoff is complete. All 12 accessible
registered worktrees have no tracked changes on package, lockfile, Vite, test-runner
or workflow surfaces. R7's presentation amendment remains active and declares no new
runtime dependency, but a build handoff has not been recorded. Preserve current install
ownership until that scheduling condition is resolved; an idle checkout is not a handoff.

Bounded question: which package versions and physical paths do production component
imports and direct/sliced/balanced Vitest actually consume? Inspect both installed graphs,
lockfiles, aliases and direct consumers. Capture one Vite production module graph with
the existing map config, `build.write=false`, a read-only module observer and only the
output-copy plugin `copy-map-public-fonts` disabled. This capture changes no resolution
or bundle source inputs and writes no distribution files. Sort evidence ordinally and
record source hashes; do not use existing unattributed `dist` as current-build proof.

Expected cost: resolution scans in minutes; one map graph build roughly 30 seconds to a
few minutes. Pass requires a successful graph build with actual package identities,
consumer mapping, and explicit test/production differences. Stop on build failure or
unexplained graph drift. No install, lock regeneration, package, full suite, campaign,
baseline refresh or runtime upgrade is part of this review. One independent Sol review
and focused documentation/diff checks close the evidence slice, not Phase 1 acceptance.
Logs and the observation script stay under `logs/r9-build-preparation/`.

Observer correction: the first capture completed but emitted an empty package list;
the next correctly failed its liveness assertion after parsing 1,378 modules. Rollup's
forward-slash Windows IDs did not match the observer's backslash root-prefix check.
Neither result certifies production resolution. The orchestrator authorized one final
same-question capture after offline path-mapping controls pass, with raw IDs persisted
before assertions. This bounded evidence-script correction changes no product input;
it is not a package, full suite or campaign. Preserve both failed receipts.

### Dependency graph evidence — 2026-09-08

Final `node logs/r9-build-preparation/phase1.1_capture_production_graph.mjs` passed,
exit 0: four offline mapper controls, 1,378 raw module IDs and eight target package rows.
The capture uses the nested production Vite API/config and records package/lock/config
hashes. It is an observed current production build graph, not a shipped-artifact receipt
or byte-identity claim. Existing build-time metadata remains outside this graph evidence.
`node logs/r9-build-preparation/phase1.1_capture_static_resolution.mjs` also passed,
exit 0, recording installed identities and the direct/sliced/balanced test aliases.

| Runtime family | Production graph (`src/ui/map/node_modules`) | Vitest resolution | Initial compatibility target |
|---|---|---|---|
| MapLibre | 4.7.1 | All three configs force root 5.24.0 | Preserve 4.7.1; do not promote a major |
| PMTiles | 3.2.1 | Source import remains nested 3.2.1 | Preserve 3.2.1 |
| Deck core/layers/mapbox | 9.2.11 | All three configs force root 9.3.3 | Preserve 9.2.11 family |
| React / React DOM | 18.3.1 | Root 18.3.1; distinct paths, matching lock integrity | Preserve version and singleton/mock identity |
| Zustand | 4.5.7 | Root 4.5.7; distinct path | Preserve version and mock identity |
| Turf bezier/helpers | Nested 6.5.0 not observed in the graph | No explicit alias | KEEP declarations pending implementation consumer review |

Deck extensions has a source import but is absent from the captured parsed module set;
retain it during dependency review. Root Turf bezier/helpers 7.3.4 and `@turf/turf`
7.3.2 have named map/build-tool consumers; a tooling split is permissible, not a reason
to force every package onto one version. No dependency pruning occurred.

Implementation handoff: declare the existing map package as a root workspace, preserve
its runtime and Storybook ownership, and use package-manager-generated root lock authority.
Complete direct runtime declarations from real consumers. Replace nested Vite command
paths and redundant nested installs; retire aliases only after direct, sliced and balanced
resolution/mock tests pass. The failing mismatch contract has not yet been added, and
no install, lock edit or Phase 1 acceptance check has occurred. R7 build handoff remains
the scheduling prerequisite. Phases 2/3 and final R8/RC acceptance are unchanged.

Evidence in `logs/r9-build-preparation/`: `phase1.1-production-resolved-modules.json`,
`phase1.1-production-raw-module-ids.json`, `phase1.1-production-capture.log`,
`phase1.1-static-resolution.json`, `phase1.1-static-resolution.log`, and the two runnable
capture scripts. Failed empty/path-normalization captures remain diagnostic history.

Independent review identified eight virtual-module IDs whose NUL prefix survived
path emission even though package lookup stripped it. Package identities were valid;
the path receipt needed correction. Offline remapping from the saved raw IDs passed,
exit 0 (`phase1.1-remap-validation.log`): 208 sorted, unique, repository-relative IDs
across eight packages match the exact raw projection, retaining virtual query identities.
Package identities and the final script hash are verified. Prior malformed/intermediate
receipts are preserved; no additional production build ran for this review correction.
Independent Sol review is GO with no remaining findings (`phase1.1-review.log`).
Final documentation tests and commit-hook receipts are `phase1.1-final-docs.log` and
`phase1.1-commit.log`; they close this documentation/evidence slice only.

**Owner/reviewer:** Build implementer; independent build/UI/QA reviewer.
**Files:** `package.json`, `package-lock.json`, `src/ui/map/package.json`, `src/ui/map/package-lock.json`; `src/ui/map/vite.config.ts`, `src/ui/warroom/vite.config.ts`, `vitest.config.ts`, `tools/test/vitest_shared_config.mjs`, `tools/test/run_vitest_slice.mjs`, `tools/test/run_vitest_balanced.mjs`; install commands in existing workflows; `tests/run_vitest_balanced.test.ts`, `tests/test_suite_inventory.test.ts`; create `tests/runtime_dependency_resolution.test.ts`.

### 1.1 Capture the actual graphs

1. Resolve package identity/version/physical path from map production imports and each Vitest config, not just declared semver ranges. Capture a production build's resolved runtime modules as evidence without changing bundle inputs. The audit observed locked MapLibre 5.24.0/root vs 4.7.1/map; PMTiles 4.4.1 vs 3.2.1; Turf 7.3.4 vs 6.5.0; Deck mapbox 9.3.3 vs 9.2.11. React resolves identically despite differing ranges.
2. Add a failing contract for test and production resolution of the same runtime component import, with a deliberate mismatched fixture as positive detection. Inventory direct consumers before selecting versions.

### 1.2 Consolidate without an opportunistic upgrade

1. Preserve the currently shipped runtime versions as the initial compatibility target. Root-only tooling can retain a different major only with a named non-runtime consumer and explicit boundary. The requirement is one intentional graph and equivalent runtime resolution, not a global same-version quota.
2. Use one root lock/install authority, normally a declared npm workspace for `src/ui/map`; keep its package only for genuine workspace/runtime or Storybook ownership. Remove the nested lockfile after root resolution represents it. Regenerate locks via the package manager only, never hand-edit.
3. Replace redundant nested `npm ci` steps with the root install; adjust scripts that assume a nested Vite binary. Preserve all public build commands. Do not prune dependencies merely because an import search misses dynamic/runtime use.
4. Make direct, sliced and balanced Vitest runs resolve the same runtime packages as the production UI. Remove compensating aliases only once replacement resolution passes all runners; retain necessary React singleton and mock contracts. Do not alter test discovery/isolation or reintroduce chunk cycles.

### 1.3 Acceptance

```powershell
npm.cmd ci --legacy-peer-deps
npm.cmd run typecheck
npx.cmd vitest run tests/runtime_dependency_resolution.test.ts tests/run_vitest_balanced.test.ts tests/test_suite_inventory.test.ts
npm.cmd run desktop:release:check
```

Verify map rendering, Deck counters, PMTiles range/resource loading, Warroom/map transitions and mock identity using existing browser/packaged gates. Fresh checkout must install/build from the single root lock. Record runtime versions and any justified tooling-only split. A necessary runtime-major change is a new behavior question; stop and retain the current supported version rather than silently perform it. Hand the resulting lock/build identity to runtime and calibration owners; do not claim older evidence applies automatically.

## 4. Phase 2 — One execution per identical validation contract (audit S2)

**Owner/reviewer:** DevOps implementer; independent QA/DevOps reviewer.
**Files:** `.github/workflows/typecheck.yml`, `baseline-regression.yml`, `event-system-ci.yml`, `full-suite-and-fingerprint.yml`, `.github/workflows/README.md`; preserve trusted `.github/scripts/detect-*.sh` handling; active local command lists including master §11 and root README; existing CI guards `tests/baseline_regression_ci_guardrails.test.ts`, `tests/desktop_release_ci_guardrails.test.ts`, `tests/ci_workflow_test_paths_exist.test.ts`. `tools/engineering/canon_check.ts` is inspected, not rewritten merely to rename its contract.

### 2.1 Freeze coverage and required reporting

1. Read live branch protection and repository rulesets if access is available:

```powershell
gh api repos/horkesh/A-War-Without-Victory/branches/main/protection
gh api repos/horkesh/A-War-Without-Victory/rulesets
```

2. Build a compact table in this plan: predicate, input/tree identity, existing runners, required check names, proposed owner, retained fast-feedback value. All 27 current Event System CI test files are in full discovery, but its baseline comparison is not equivalent to a unit-test run. Structural fingerprints, byte baselines, engine health, strict canon and packaged checks remain distinct.
3. If external configuration is unreadable, preserve potentially required names. No silent assumption that an unused-looking check is unprotected.

### 2.2 Delete redundant invocations, not acceptance

1. Keep one root typecheck execution owner where workflow/check reporting permits. Remove the standalone duplicate only after its status-name obligations are proven absent or an authorized operator migration has completed. Do not create a cross-workflow status synthesizer; a documented KEEP is preferable.
2. Remove repeated event subset execution only if strict canon remains explicitly visible and the same commit receives full discovery coverage. Preserve feature-branch feedback where full-suite triggers do not run; PR+push overlap alone is not permission to leave branch pushes untested.
3. In active global command lists, remove the second explicit `test:baselines` invocation when the same clean tree already receives it through `canon:check`. Retain the baseline requirement, manifest-required precondition and its actual exit status. Do not silently let a missing manifest turn the required baseline gate into a successful skip.
4. Preserve existing always-report and trusted-detector guards, complete discovery, isolation rules, and failure propagation. Do not combine independently meaningful scenario/health predicates merely because they use the same scenario duration.

### 2.3 Acceptance

```powershell
npx.cmd vitest run tests/baseline_regression_ci_guardrails.test.ts tests/desktop_release_ci_guardrails.test.ts tests/ci_workflow_test_paths_exist.test.ts tests/run_vitest_balanced.test.ts tests/test_suite_inventory.test.ts
git diff --check
```

Add targeted guard cases for any changed trigger/dependency edge: docs-only reports, relevant-code execution, strict canon retained, deliberate failing child fails the required parent, and trusted detector restoration. Record every removed invocation against its surviving same-input owner. Actual CI behavior is verified on the next authorized CI run; source tests are not a fabricated remote success. If a protected-name mutation needs external authorization, leave that removal unlanded with the concrete required mapping. Other independent phase work can close.

## 5. Phase 3 — Narrow release resources (audit S3)

**Owner/reviewer:** Platform implementer; independent platform/QA reviewer.
**Files:** `package.json` existing `extraResources` filters; `tools/desktop_packaged_runtime_probe.mjs` and `tests/desktop_packaged_runtime_probe.test.ts`; create `tests/release_research_exclusion.test.ts`; update existing artifact ownership documentation only if policy wording changes. Do not modify or delete `data/` research outputs.

1. After BC09 defines valid production inputs, enumerate actual packaged consumers using the existing route inventory, source loaders and dynamic resource families. The candidate exclusion set is `data/derived/scenario/baseline_ops_sensitivity/**`, `baseline_ops_sensitivity_run2/**`, `recruitment_test_matrix_2026_02_11/**`, and `sweeps/**`: 239 tracked files / 53,031,799 raw bytes at audit time. Do not exclude all `data/derived/scenario` or all files without literal references.
2. Add a failing package-content assertion that those confirmed research families are absent, plus positive assertions for startup, census/ethnicity/OOB inputs, geometry, fonts, PMTiles, audio and recovery assets. Confirm each family has no supported shipped reader; KEEP any family whose role cannot be resolved.
3. Add targeted exclusions to existing filters. Prefer that small deletion over a new generated resource-manifest framework. Leave source provenance and retained research in Git.
4. Build one transient directory package and run existing runtime resource/route/offline proof. Confirm actual package inventory, not merely glob text; measure before/after bytes without making size a pass quota.

```powershell
npx.cmd vitest run tests/release_research_exclusion.test.ts tests/desktop_packaged_runtime_probe.test.ts tests/generated_artifact_ownership_matrix_contract.test.ts
npm.cmd run desktop:package:dir
node tools/desktop_packaged_runtime_probe.mjs
```

Reuse that exact package in the scheduled acceptance only if source/build/data identity still matches. Preserve recovery routes and valid-data turn advancement. R9 Phase 1.2 later verifies the resulting artifact's SBOM/licenses/offline completeness; it does not repeat this refactor after freeze.

## 6. Cost, evidence and closeout

Dependency install/build and focused CI checks are expected to take minutes to tens of minutes; one directory package/probe may take tens of minutes. No timing or size savings are promised. Keep logs/exit codes under `logs/r9-build-preparation/`. Before each expensive command record question, exact tree/input identity, pass criteria and current host estimate. Stop at the first failed contract; one targeted correction pass, no repeated unchanged campaign.

Run the canonical full suite once after the final combined build changes, using `npm.cmd run test:vitest` with no arguments and child-scoped Git Bash. Reuse that receipt for R8 only on identical inputs. Preserve all applicable master §11 and R8 campaign gates; lockfile/runtime changes require explicit impact review and affected checks. This packet launches no standalone calibration tuning programme and refreshes no baseline. One same-contract check can satisfy multiple named requirements only with explicit identical-input evidence, never because its name sounds similar.

Update this plan, controlling R9 and R8 plans, master §4.2/§8 and command board, then append the ledger. R9 Phase 0 requires these phases' dispositions and final R8 evidence before freeze. A later source/dependency/payload change creates a new candidate and repeats affected acceptance; do not alter a frozen accepted artifact in place. Reuse existing release/R8 reports rather than per-phase duplicate reports. Record a new knowledge lesson only if one is learned.

**Planning evidence (2026-09-07):** documentation suites 9/9, exit 0; 163 local file links and 22 section anchors resolve; `git diff --check` exit 0. Logs: `logs/repository-audit-planning/{docs-tests.log,links.json,anchors.json,diff-check.log}`. Independent Sol/medium review found one missing alias disposition; cleanup Task 5 now explicitly owns `test:ui` retirement/compatibility and its public documentation. No other material coverage, ordering, canon or validation issues were found. **Implementation:** all phases NOT STARTED.

```text
Execute the next scheduled phase of docs/plans/2026-09-07-r9-build-validation-preparation-plan.md as the limited R9 preparation subset before final R8 acceptance. Read its ownership/collision and canon/security references. Reuse existing tooling: align runtime/test dependency resolution without opportunistic upgrades, remove identical check executions only with retained coverage/status evidence, then exclude verified research payloads while keeping source evidence and runtime assets. Preserve unknown required checks, live maps/recovery, FOW, stable inputs and baseline authority. No external protection mutation, push, signing or publication. Stop on missing consumer evidence, version-behavior changes, reporting/coverage loss or drift. Return changed files, version/check/resource mapping, exit codes, exact evidence identities, residuals and ledger updates.
```
