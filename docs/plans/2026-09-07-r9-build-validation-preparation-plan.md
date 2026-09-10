# R9 Build and Validation Preparation Implementation Plan

> **For implementation:** Use `executing-plans`; execute one phase at a time.

**Goal:** Make tests and shipped UI use the intended dependency graph, eliminate duplicate check execution, and exclude development research from release payloads before final acceptance.
**Architecture:** Keep the existing npm/Vite/Electron/CI stack. Consolidate dependency ownership and check execution; narrow existing package filters using verified runtime-resource consumers. Do not create a build system, check orchestrator or generated manifest framework.
**Tech stack:** npm lockfiles/workspaces as needed, Vite, Vitest, electron-builder, existing GitHub Actions and package probes.
**Date/status:** 2026-09-08; Phases 1–3 complete, independent review GO. Package acceptance and final combined suite pass.
**Owner / board row:** R9 preparatory subset of existing dependency/offline/reproducibility ownership, executed before final R8 acceptance. This explicit subset is not activation of R9 freeze, signing or publication.
**Slot:** Phase 1 follows R7 and cleanup script handoff (Tasks 5/7/8), before final BC09/BC10 campaign evidence where possible. Phase 2 follows Phase 1 and precedes final expensive validation. Phase 3 follows BC09 input-contract definition. All three precede final calibration, final R8 packaged diaries, and R9 Phase 0 freeze.
**Next action:** Hand settled build inputs to remaining R7/R8 acceptance owners. RC freeze remains downstream.
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

### Build handoff and Phase 1 activation — 2026-09-08

Following the graph review, the owner instructed proceeding with the R7 build handoff
and Phase 1. HEAD is `f22bcbb63af7c5d017c59cfc3fe29838e3af1508` on
`codex/r9-dependency-authority`; no intervening tracked edits exist. All 12 registered
worktrees have no tracked changes on the shared package/lock/Vite/test/workflow surfaces.
R7's active presentation amendment declares no new runtime dependency and its file
ownership is disjoint. The orchestrator records the handoff: R9 now owns these build
surfaces serially; R7 presentation/audio acceptance remains open. A later overlapping
R7 change must be coordinated and its acceptance must use the resulting build identity.
This resolves the scheduling condition recorded below without claiming R7 completion.

Fixed validation question: can one root install reproduce the observed production
runtime graph and give direct, sliced and balanced Vitest equivalent resolution and
mock identity? Write and observe the failing `runtime_dependency_resolution` contract
with a deliberate mismatch control before implementation. Regenerate locks only with
npm, preserving observed runtime versions; keep named tooling-only splits.

Run `npm.cmd ci --legacy-peer-deps`, `npm.cmd run typecheck`, focused
`runtime_dependency_resolution`, `run_vitest_balanced` and `test_suite_inventory`
suites, and `npm.cmd run desktop:release:check`. Verify a fresh isolated install from
the root lock, generated runner configurations, map/Deck/PMTiles behavior, shell
transitions and existing mock contracts using focused existing gates. Use process-local
Git Bash precedence for Windows shell checks. Root owns final validation and commit;
one Sol implementer and a separate Sol reviewer cover the phase.

Expected cost: installs/builds and UI verification take minutes to tens of minutes;
focused tests take minutes. Logs remain under `logs/r9-build-preparation/phase1-*`.
Stop on required runtime upgrade, unexplained source/input drift, collision or unresolved
compatibility failure. No Phase 2/3 changes, check-name retirement, dependency pruning,
package-payload changes, campaigns, baseline refresh or remote operation is authorized.
The full combined-build gate remains at the plan's final combined-input checkpoint;
focused runner checks are not presented as that full-suite result. Reuse no prior
UI acceptance automatically across changed build inputs. One review and targeted
correction verification close Phase 1 only when its applicable gates pass.

### Phase 1 validation corrections — 2026-09-08

Implementation validation correction: the first fresh root install and release build
passed, as did live operation/map and recovery routes. These receipts remain preliminary:
a subsequent direct-dependency audit found four Storybook packages re-resolved from
10.2.13 to 10.6.0, requiring restoration and a corrected-lock install. The focused
platform gate also exposed a Deck test collection failure at the `wgsl_reflect`
named-export boundary; five other suites passed 45 tests. Neither passing UI evidence
nor those focused passes waive this compatibility failure. Diagnose the module boundary,
verify the targeted correction across runners, and record final input identity before
acceptance. Preserve the original failed receipts under `phase1-*`.

Independent review traced the failure to actual production-transitive drift:
the prior nested lock resolved `@luma.gl/shadertools@9.2.6` to
`wgsl_reflect@1.2.3`, while the first unified lock selected 1.6.0. The initial
family-filtered comparison omitted this dependency and cannot certify complete
closure preservation. Restore the observed version through npm lock generation,
compare the full reachable dependency closure, and rerun the fresh install,
release build and UI checks on the corrected lock. These are targeted correction
checks within the existing acceptance question, not an additional campaign.

Intermediate corrected-input verification passed (all exit 0): fresh root `npm.cmd ci
--legacy-peer-deps`, `npm.cmd run desktop:release:check`, `npm.cmd run typecheck`,
and the runtime-resolution/Deck-counter/MapLibre-mock suites (53 tests). The fresh
checkout is `F:/AWWV-worktrees/r9-phase1-install-proof`; 19 changed input files match
the primary checkout by SHA-256. Live Electron operation/map proof rendered seven
counters, fetched a 16-byte PMTiles range with status 206 and the expected header,
selected all four objectives, and restored the exact dossier. Recovery proof passed
legacy-menu/side-picker/back and React ownership reclamation. These bounded synthetic
route fixtures do not certify campaign outcomes or final packaged acceptance.
Evidence: `phase1-final-fresh-{npm-ci,release-build,typecheck,runtime-contracts}.log`,
`phase1-final-fresh-input-identity.log`, `phase1-final-ui-{operations,recovery}.log`
and corresponding `phase1-ui-*-final-fresh/` receipts. Despite their `final` filename,
these receipts are superseded: the completed reachable-closure audit subsequently
found 14 further transitive version changes. The premature freeze was invalid.
Restore the prior runtime closure while retaining root-tooling splits; the independent
reviewer must verify the complete closure comparison before another fresh proof starts.
Phase 1 acceptance remains open.

Review clarified the comparison boundary: traverse normal and installed optional
dependencies, and inventory supplied/missing peers separately. The old map lock
auto-installed `@arcgis/core@4.34.8` through the unused `deck.gl`/`@deck.gl/arcgis`
peer chain; neither package has a repository import or appeared in the observed
production module graph. Its absence under the retained `--legacy-peer-deps`
installation contract is an explicit legacy-peer difference, not proof that the
entire old lock is byte-equivalent. Direct declarations remain retained. Reject
unlocked generation that floats root tooling; use the existing lock as npm's seed.

### Reviewed Phase 1 inputs — 2026-09-08

Independent review approved the corrected input freeze before the next fresh proof.
The root workspace and npm-generated root lock replace the nested lock/install;
all public build commands and workflow check names remain. Runtime targets remain
MapLibre 4.7.1, PMTiles 3.2.1, Deck 9.2.11, React/React DOM 18.3.1 and Zustand 4.5.7.
Storybook remains 10.2.13. Root Turf 7.3.x and map declarations 6.5.0 remain an
intentional tooling/workspace split. Redundant MapLibre/Deck test aliases are removed;
necessary React/Zustand singleton and mock aliases remain.

The final audit follows normal and installed optional runtime dependencies, classifies
`@types` branches as tooling, and inventories peers separately. It passes with 168
prior and 170 final physical package nodes, zero version-set differences, zero missing
runtime edges, and a live deliberate-mismatch control. Same-version non-singleton
placement accounts for the node-count difference. Root direct tooling versions match.
Preservation overrides retain the prior map transitive versions, including
`wgsl_reflect@1.2.3`. The `core-util-is` split explicitly preserves map 1.0.3 and
`verror`'s exact 1.0.2; compatible shared tooling consumers can now use 1.0.3.
This is not a claim of identical root-transitive placement. The reviewer checked
the override consumers and semver constraints. ArcGIS's dormant peer difference is
recorded above; its direct parent declarations remain.

The reviewed-input checks use `phase1-reviewed-*` logs and a SHA-256 input inventory;
earlier `phase1-final-*` files remain superseded evidence. Install lifecycle preparation
uses process-local `HUSKY=0` to preserve Git hook configuration. The final commit hook
must run enabled. The fresh checkout and isolated lock-generation directory remain
available for inspection. Reviewed-input fresh install, release build, typecheck,
eight runtime/platform suites (98 tests), and both live UI routes passed, all exit 0.
The input inventory confirms 19 matching files across checkouts. Final independent
review is GO (`phase1-review.log`), with no remaining findings. Storybook-only
`react-docgen` 8.0.2 to 8.0.3 is a disclosed tooling-transitive difference with no
production consumer; npm vulnerability debt remains for the existing release-security
owner. Local commit runs the enabled mandatory hook (`phase1-commit.log`). Phases 2–3,
R7 acceptance, final R8 diaries and R9 freeze remain open.

| Accepted check | Command / evidence (`logs/r9-build-preparation/`) | Result |
|---|---|---|
| Fresh root install | `HUSKY=0 npm.cmd ci --legacy-peer-deps`; `phase1-reviewed-fresh-npm-ci.log` | Exit 0 |
| Release build and chunk guard | `npm.cmd run desktop:release:check`; `phase1-reviewed-fresh-release-build.log` | Exit 0 |
| Fresh typecheck | `npm.cmd run typecheck`; `phase1-reviewed-fresh-typecheck.log` | Exit 0 |
| Runtime/platform gates | `npx.cmd vitest run` on the eight named suites in `phase1-reviewed-fresh-runtime-platform.log` | 98 tests; exit 0 |
| Live operations/map | `node logs/r9-build-preparation/phase1-ui-routes.cjs operations reviewed`; `phase1-reviewed-ui-operations.log` | PASS; exit 0 |
| Live recovery | Same helper, `recovery reviewed`; `phase1-reviewed-ui-recovery.log` | PASS; exit 0 |
| Input equivalence | `phase1-reviewed-input-identity.log` | 19 files; zero mismatches; exit 0 |
| Primary focused contracts | `phase1-final-focused-direct-accepted.log` | 6 files; 78 tests; exit 0 |
| Sliced runtime and Deck | `phase1-final-runtime-deck-sliced-accepted.log` | 46 tests; exit 0 |
| Balanced runtime / Deck | `phase1-final-runtime-balanced-accepted.log`, `phase1-final-deck-balanced-accepted.log` | 12 / 34 tests; exit 0 |
| Documentation truth | `phase1-reviewed-docs.log` | 13 tests; exit 0 |
| Diff whitespace | `git diff --check`; `phase1-reviewed-diff-check.log` | Exit 0 |

The live helper uses `AWWV_PHASE1_CHECKOUT=F:/AWWV-worktrees/r9-phase1-install-proof`
and isolated fixture/save/profile paths. It verifies map/Deck ownership and counters,
PMTiles 206 range/header bytes, four objectives, exact dossier return, legacy recovery
and React ownership reclamation. No gameplay, canon, simulation, saves, baselines or
campaign result is changed. Full combined-build acceptance remains at the final
combined-input checkpoint; the prior 13,717-test suite is not a post-Phase-1 result.

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

### Activation and bounded validation — 2026-09-08

Owner authorized Phase 2 after Phase 1 commit `38066eec205d6493c8ffe150f0f2220184f1ca79`.
The primary tracked tree is clean on `codex/r9-phase2-check-ownership`; preserve all
untracked receipts and existing worktrees. One Sol/medium implementer owns workflow
and focused test edits; a separate Sol/medium reviewer covers process/platform and
coverage. The orchestrator owns documentation, external read-only evidence and commit.

Question: which repeated invocations have a surviving owner on the same input and
event, with unchanged coverage, failure propagation and required reporting? Inspect
workflow triggers, trusted detectors, test discovery and the canon wrapper before
editing. Live read-only API receipts are `phase2-branch-protection.log` (explicit
"Branch not protected", HTTP 404, CLI exit 1) and `phase2-rulesets.log` (empty list,
exit 0). No external protection setting is changed. Record each DELETE/KEEP below;
retain any invocation whose coverage or reporting equivalence cannot be proved.

Validation commands: the five focused suites in §2.3, targeted guards for changed
trigger/ownership edges, the three existing documentation-truth suites, and
`git diff --check`, followed by the enabled mandatory commit hook. Expected cost:
minutes for focused checks and hook typecheck; no install, release build, full suite,
canon wrapper, baseline campaign, structural-fingerprint campaign or package run.
Pass requires docs-only reporting, relevant-code coverage, feature-push feedback,
strict canon, trusted detector restoration and real failure propagation to remain
intact. Stop on uncertain reporting/coverage and record KEEP; one independent review
and targeted correction verification. Actual remote CI waits for a separately
authorized run. Phases 3, runtime/dependency changes, baseline refresh and remote
mutation remain outside this slice. Logs stay under `logs/r9-build-preparation/phase2-*`.

### Phase 2 ownership dispositions

All comparisons use the checked-out commit, its root lock and Node 22; PR proofs
refer to that event's merge input, not a separate branch-push SHA. The 13-worktree
collision inventory found no overlapping work except the preserved Phase 1 proof
overlay owned by this task (`phase2-worktree-collisions.log`).

| Predicate / invocation | Existing report | Disposition and surviving owner | Retained coverage |
|---|---|---|---|
| PR to main: standalone root typecheck | Typecheck / `typecheck` | DELETE standalone workflow; Baseline Regression / `typecheck` runs on identical input | Always-run root type signal and dependency parent retained; live protection has no standalone obligation |
| PR to main or main push: Event typecheck | Event system validation | DELETE repeated step execution on those events; Baseline Regression / `typecheck` owns it | Type failure remains in the surviving check; no success synthesizer |
| `codex/**`, `feature/**`, `claude/**` push: Event typecheck | Event system validation | KEEP | Baseline and Full Suite do not run on these pushes |
| Every Event trigger: 26-file subset | Event system validation | KEEP | Together with the strict gate, all 27 named files are in full discovery, but full execution is not guaranteed on the same event; workflow-only inputs may be skipped |
| Every Event trigger: strict canon | Event system validation | KEEP explicit step | Named hard rail remains visible |
| Every Event trigger: byte baselines | Event system validation | KEEP | Not equivalent to unit discovery, structural fingerprints or health |
| Baseline fast/scenario/anchors; complete suite; fingerprint; health/package gates | Existing job names | KEEP | Trusted detector restoration, always-report logic, discovery, isolation and failure dependencies unchanged |
| Master §11: second `test:baselines` after `canon:check` | Local command list | DELETE duplicate command; canon wrapper owns the same clean-input run | Required manifest preflight throws before the wrapper can skip; nonzero canon exit stops validation |

Root README contains no duplicate canon/baseline command pair. Standalone baseline
commands in parent acceptance lists and `qa:all` remain valid: no earlier canon owner
runs in those lists. `tools/engineering/canon_check.ts` is inspected and unchanged.
It conditionally includes baselines when the manifest exists, so removing the second
command without the fail-closed preflight would be a coverage loss. No campaign runs
are needed to verify this source/command ownership change.

Focused verification passed seven files / 42 tests, exit 0
(`phase2-focused-tests-rerun.log`): the five planned CI/runner/inventory suites plus
`ci_dependency_install_contract` and `test_runner_contract`. The original focused
run exposed a stale pre-Phase-1 nested-install assertion; its failure receipt remains
in `phase2-focused-tests.log`. The corrected assertion verifies the existing root-only
workspace install and retired workflow inventory; no install behavior changed here.

The master preflight and canon-exit guard were extracted verbatim and exercised
without running canon/baseline campaigns: present manifest exits 0; absent manifest
and simulated canon exit 7 both terminate with exit 1 and no continuation. Overall
control verification exits 0 (`phase2-doc-command-guards-verified.log`); scripts and
raw results have `-verified` suffixes. The first evidence helper extracted one character
instead of a line due to PowerShell scalar indexing; those failed diagnostic receipts
remain, and one corrected extraction passed. This is a harness correction, not a
product behavior change. Source checks do not claim a remote Actions run succeeded.

Phase 2 closes with independent Sol review **GO**, no remaining findings
(`phase2-review.log`): all 27 Event paths exist, detector scripts are unchanged,
canonical typecheck ownership matches the trigger matrix, and strict canon/subset/
byte-baseline gates remain. Documentation truth passed 13 tests, exit 0
(`phase2-docs-tests.log`, final status verification `phase2-docs-closeout.log`);
`git diff --check` passed, exit 0 (`phase2-final-diff-check.log`). The local commit
runs the enabled mandatory hook with its receipt in `phase2-commit.log`. No workflow
was dispatched and no push/merge occurred. The next authorized CI run must verify
actual reporting and execution; these source/behavioral controls do not impersonate
that result. Phase 3 remains a separate runtime-resource packet with its BC09 handoff.

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

### BC09 handoff and consumer-review boundary — 2026-09-08

The owner approved starting Phase 3 with the BC09 handoff and packaged-consumer
review. Base is `c65de2b98d002b650a48cbfc81f2992c11d574b7`, tracked-clean, on
`codex/r9-phase3-resource-review`. This slice settles the exclusion evidence and
implementation handoff; it does not claim filter changes or package acceptance.
The existing BC09 finite matrix and current loader/prerequisite registry define
the required production resources. BC09 campaign/final packaged acceptance remains
deferred; defining these inputs does not require declaring BC09 CLOSED.

Bounded question: do the four named research families have any supported shipped
consumer, and can their exclusion preserve BC09 inputs plus startup, map/PMTiles,
geometry, fonts, audio and recovery resources? Inventory tracked paths/bytes in
ordinal order; inspect package filters, packaged entrypoints, dynamic resource
resolvers and existing probe coverage. Record source/input identity and explicit
EXCLUDE-candidate/KEEP dispositions in this plan, with logs under `phase3-review-*`.
One Sol/medium worker owns the consumer inventory, one independent Sol/medium
reviewer checks platform/process boundaries, and the orchestrator owns BC09 handoff
and documentation. Preserve all existing worktrees and untracked artifacts.

Expected cost is minutes for read-only inventories and focused documentation checks.
Run the three documentation-truth suites, `git diff --check` and the enabled local
commit hook. Pass requires named consumers/uncertainties, protected resource mapping,
and a concrete package-content validation handoff. KEEP any uncertain family; stop
on a new required-input decision or scope conflict. No install, package, full suite,
campaign, baseline refresh or remote operation runs in this review. The later
implementation still owes the Phase 3 package/probe and final combined-suite gates.

BC09 handoff evidence: all six required files match the accepted `live-ipc-06`
provenance byte hashes (`phase3-review-bc09-input-comparison.json`, zero differences).
The finite matrix in the [BC09 plan](2026-09-07-r8-runtime-input-ai-integrity-plan.md#11-characterize-the-valid-and-intentionally-incomplete-inputs)
remains the requirement authority: municipality population, settlement census,
settlement ethnicity, brigade OOB, municipality registry and municipality HQ mapping.
Current loader/prerequisite paths agree. Compared with BC09 commit `fa900ba89`,
the loader has only the later type-safe annotation/narrowing correction; prerequisite
registry/check are unchanged. This confirms an input-definition handoff, not renewed
campaign or packaged acceptance. Current bytes and six relevant source hashes are in
`phase3-review-bc09-identity.json`. The 13-worktree check found no competing edits,
apart from this task's preserved Phase 1 proof overlay (`phase3-review-worktrees.log`).

The implementation proof must close gaps in the current packaged probe. Campaign
creation does not call `advanceTurn`, where desktop production loads the six BC09
inputs. Require both positive presence/byte assertions for those six packaged files
and a valid +1-turn control through the packaged production simulation in an isolated fixture/save/profile.
The existing route probe also lacks explicit audio-binary coverage: select a real
Vite-imported audio asset and verify its emitted package asset, not just a directory.
Retain startup, geometry, PMTiles range/header, font and recovery assets. Exercise
operation/map and forced-recovery/React reclamation on the same Phase 3 package,
or reuse only evidence whose exact package identity matches. Earlier Phase 1 loose
Electron proof is not automatically Phase 3 package acceptance.

### Consumer dispositions and implementation handoff

All four families are **EXCLUDE candidates from release packaging; KEEP in Git**.
There are no untracked or ignored files within these four roots. Counts are current
source bytes, not a measured package-size reduction.

| Root under `data/derived/scenario/` | Tracked files / bytes | Named retained consumers | Disposition |
|---|---:|---|---|
| `baseline_ops_sensitivity/` | 51 / 8,082,428 | `sim:scenario:baseline-ops:sensitivity` invokes the tool and `src/scenario/baseline_ops_sensitivity.ts`; its own run artifacts and ownership test are research consumers | EXCLUDE candidate |
| `baseline_ops_sensitivity_run2/` | 51 / 8,082,453 | Explicit sensitivity `--outDir` mirror and `baseline_ops_sensitivity_artifact_ownership` repeatability test | EXCLUDE candidate |
| `recruitment_test_matrix_2026_02_11/` | 25 / 6,054,862 | Static retained evidence, read by `recruitment_test_matrix_artifact_ownership`; no refresh command | EXCLUDE candidate |
| `sweeps/` | 112 / 30,812,056 | `sim:scenario:sweep` / `run_scenario_sweep_h2_4.ts` and `scenario_sweep_artifact_ownership`; harness tests use temporary outputs | EXCLUDE candidate |
| **Total** | **239 / 53,031,799** | Existing generated-artifact inventory/policy also classifies these research families | No source deletion |

Packaged entrypoints, UI fixed/constrained fetch families, campaign loaders and resource
catalogs neither name nor enumerate these trees. The generic HTTP and `awwv://` derived
resource resolvers can currently serve a guessed candidate URL; after exclusion it
would return 404. That transport capability is disclosed, not mistaken for a product
consumer. The state-file picker can load user-selected external saves but does not
catalog or require these bundled research trees. No supported shipped reader was found.

Apply only these negative patterns to the existing `extraResources` entry whose
`from` is `data/derived`; do not alter other filters or remove research from Git:

```text
!scenario/baseline_ops_sensitivity/**
!scenario/baseline_ops_sensitivity_run2/**
!scenario/recruitment_test_matrix_2026_02_11/**
!scenario/sweeps/**
```

Before implementing, add the planned failing exclusion contract with positive controls.
The actual unpacked `resources/data/derived/scenario` tree must omit all four roots.
Check positive resources in that same package: six BC09 inputs with matching bytes,
`startup/apr_1992_initial_save.json`, operational/WGS84 geometry, terrain, PMTiles
range/header, both MapLibre glyph ranges, HQ clickable regions, source settlements,
event catalogs, warroom/tactical-map and their fonts/assets. Extend the existing
package probe's validation branch as needed (including its `electron-main.cjs`
required-file/probe owner), external checker and source-contract test; avoid a second
resource-manifest framework. Require a successful production `advanceTurn` after
campaign creation, using isolated validation state.

Audio proof must compare emitted OGG hashes with the 20 static imports in
`src/ui/map/audio/audioAssets.ts`. Independent review confirmed all 20 have unique
hashes and exceed the default Vite inline limit (minimum 4,514 bytes), so matching
the emitted-file hash multiset is a viable positive control on this input. Recheck
that assumption if audio/build inputs change. Run the existing Task 6 `operations`
and `recovery` routes against the same untouched package and match executable/app.asar
identity across receipts. Build once for these proofs; rebuild only for a concrete
correction, then invalidate affected old evidence. The final combined-suite gate
remains outstanding after implementation inputs are settled.

Evidence: `phase3-review-consumer-disposition.json` contains exact writer/reader and
probe mappings; `phase3-review-consumer-inventory.json` records source hashes and
ordinal inventories; `phase3-review-consumer-{paths,trace}.log` retains raw paths and
search traces. The helper is `phase3-review-consumer-inventory.mjs`. Aggregate ordinal
path/content SHA-256 is `20834dab5d3eecfc6db136dcceb74928f1805cb8d7b2833cf2eef648f331e625`.
These records justify the bounded implementation handoff, not a package-acceptance claim.

Consumer-review closeout: independent Sol content review is GO; final receipt is
`phase3-review-independent.log`. Inventory/JSON/summary controls pass
(`phase3-review-validation.log`); the no-nondeterminism search's exit 1 means no
matches, not a failed contract. Documentation truth passes 13 tests, exit 0
(`phase3-review-docs.log`, final closeout `phase3-review-docs-closeout.log`). Diff and
enabled local commit-hook receipts are `phase3-review-diff-check.log` and
`phase3-review-commit.log`. Only documentation is committed in this review. The four
filters, probe extensions, actual package absence/positive-resource proof and full
combined-suite gate remain unimplemented/unrun.

### Phase 3 implementation validation contract

Owner authorization proceeds from reviewed commit `f28fef7750d6182d2c236a08a820ba6d2ddc161b` on `codex/r9-phase3-release-resources`. Bounded question: do the four exact exclusions remove only the reviewed research payload while the resulting package retains production inputs, successful turn advancement, audio, map/operations and recovery behavior? The current 13-worktree collision inventory is `logs/r9-build-preparation/phase3-worktree-collisions.log`; the preserved Phase 1 proof overlay is the only expected differing build-input checkout.

One Sol/medium implementer owns filters, existing probe extensions and focused tests; a separate Sol/medium reviewer covers platform, process and acceptance. First demonstrate the exclusion contract fails on the old filters, then run the three focused suites listed below. Build once with `npm.cmd run desktop:package:dir`, run `node tools/desktop_packaged_runtime_probe.mjs`, and run `node logs/bounded-deletion-cleanup/task6-packaged-routes.cjs operations phase3-1` and the corresponding `recovery phase3-1` against that identical package. Match executable/app.asar identity across receipts; protect existing saves and use fresh isolated validation profiles. Pass requires actual four-root absence, retained-source identity, six BC09 byte matches, successful production +1 turn, all 20 emitted OGG hashes, and existing resource/route positive controls.

After reviewed implementation and package corrections settle, run `npm.cmd run test:vitest` with no arguments and process-local Git Bash precedence. This one combined suite is required by §6 because Phases 1–3 changed dependency, validation and package inputs without a combined receipt. The earlier 13,717-pass/31-skip run is prior evidence only. Focused checks should take minutes; packaging and route proof may take tens of minutes; the prior full suite took approximately 31 minutes, with no promised runtime or count for this candidate. Keep command output and exit codes under `logs/r9-build-preparation/phase3-*`.

Stop at the first failed contract, classify it and make only a bounded correction with targeted verification; rebuild/repeat affected acceptance only if inputs changed. Stop for a new required-resource decision, unrelated scope expansion or unresolved determinism issue. No fresh install, standalone campaign, baseline refresh or remote operation is authorized by this validation contract. Finish with documentation truth checks, `git diff --check`, independent review disposition and the enabled mandatory commit hook before a local commit.

The old `win-unpacked` package, including its probe manifest, is preserved intact at `dist-packaged/phase3-preserved-package`; `phase3-prior-package-preservation.json` records its identity. Actual old-package inventory confirms all 239 candidate files and 53,031,799 bytes, while source research and six BC09 hashes still match review (`phase3-input-before.json`, command log exit 0). This is a per-family payload comparison, not a claim about total installer-size savings or identical old/new build inputs. `phase3-user-saves-before.json` records the six existing save hashes and both packaged application save roots before isolated validation.

Implementation review: only the four named negative filters were added. Existing packaged-probe validation now checks actual root absence, six input hashes, successful production +1 turn and all 20 emitted OGG hashes; the external checker uses a fresh isolated profile and records package identity. Expected RED receipts are `phase3-red-release-exclusion.log` and `phase3-red-probe-contract.log` (exit 1). A test-regex escaping error in the first focused run was corrected; `phase3-focused-tests-correction.log` passes all 11 tests across three files (exit 0). Independent Sol review found no source/test issues and independently passed the same 11 tests, both syntax checks and owned diff-check (all exit 0): `phase3-independent-review.log`. Its GO is conditional on actual package, route, save-preservation and combined-suite acceptance. Frozen package/test/lock input hashes are in `phase3-candidate-inputs.json`; the reviewed tracked code diff is preserved alongside it.

Package acceptance: `npm.cmd run desktop:package:dir` passed once (exit 0, `phase3-package.log`). The direct runtime probe, operations route and forced-recovery/React-reclamation route all passed (exit 0, `phase3-runtime-probe-exit.log`, `phase3-operations.log`, `phase3-recovery.log`). `phase3-runtime-probe.json` proves RBiH turn 0→1 with unchanged input state, six BC09 byte matches, all 20 emitted OGG hashes, existing geometry/PMTiles/glyph/font/startup/event/window controls and no unexpected runtime failures. Actual new-package inventory has zero files/bytes in all four roots; all 239 source research files remain byte-identical (`phase3-input-after.json`, command exit 0).

`phase3-acceptance-summary.json` binds all three receipts to executable SHA-256 `c7f3c4b4de8e8abaa37c90f1d0466a70a9d3491288ea060a5d7ee37e9d3267e7` and app.asar SHA-256 `3720791397c94c12195e2204a8b6efe2addc696cd2cd638eb46546a193ab85f0`, with the seven candidate file hashes and six existing save hashes unchanged (acceptance-check exit 0). Task 6 screenshots/route receipts are in `logs/bounded-deletion-cleanup/task6-{operations,recovery}-phase3-1/`. These are focused package/resource/UI proofs, not final R8 campaigns or diary acceptance.

Final combined-suite launch: package acceptance required no correction or rebuild; reviewed executable/test/dependency inputs remain those in `phase3-candidate-inputs.json`. The remaining question is whether the complete canonical suite passes on the settled Phase 1–3 inputs. Run exactly `npm.cmd run test:vitest`, with `C:\Program Files\Git\bin` first in this child PowerShell process's PATH, no arguments and no concurrent source edits. Log to `phase3-full-suite.log`; require exit 0 and report actual aggregate counts. Prior approximately 31-minute evidence is only a cost estimate. On failure, preserve output and classify the specific failed contract before any targeted correction or rerun; do not launch an additional campaign or baseline refresh.

### Phase 3 acceptance closeout

Independent Sol review is **GO** after inspecting the actual package/route receipts, final suite and reconciled dynamic test counts (`phase3-independent-review.log`). No source correction was requested. Documentation truth passed 13 tests, exit 0 (`phase3-docs.log`). Final diff/roadmap-size checks are recorded in `phase3-final-doc-check.log`; the enabled mandatory typecheck hook and local commit receipt belong to `phase3-commit.log`.

The canonical no-argument full suite passed once, exit 0: **13,520 passed / 31 skipped** across four parallel processes and the 51-file serial tail (`phase3-full-suite.log`, `phase3-full-suite-command.log`, `phase3-full-suite-summary.json`). The deliberate failing child fixture is the runner's positive failure-propagation control; its parent passes, and its nested one-test failure is excluded from the five main-process totals. This is fresh combined Phase 1–3 evidence, not reuse of the prior 13,717-pass receipt.

The count difference is fully reconciled in `phase3-full-suite-summary.json`: 18 tests were added, while the unchanged font-network contract generated 215 fewer cases (222→7). It recursively enumerates CSS inside the UI workspace, including installed dependencies. Current cases cover both HTML entrypoints, all four tracked CSS files and one installed Storybook CSS file. No tracked font test or CSS source was removed; the declaration count follows the consolidated installation's directory contents. This observation does not change the test or waive a gate. Final integrity checks also pass, exit 0 (`phase3-input-final.log`, `phase3-final-integrity.log`): research, BC09 source bytes, seven candidate files, package identity and six existing saves remain unchanged after the suite.

Final dispositions: **EXCLUDE from release / KEEP in Git** for all four named families. Measured payload change is 239 files / 53,031,799 raw bytes present in the preserved old package and absent in the new package; this is not a total installer-size claim. All protected production resources, +1-turn behavior and same-package operations/recovery proofs pass. Prior profiles, package and validation artifacts remain preserved. Future direct probe runs must use a fresh validated `AWWV_DESKTOP_RUNTIME_PROBE_PROFILE_SUFFIX`; the probe fails if that profile already exists.

Downstream obligations remain unchanged: Phase 2's next authorized remote CI/status proof, BC09/BC10 campaign settlement, R7 presentation/audio gates, final calibration and final R8 packaged diaries precede R9 freeze. R9 still owns final security/SBOM/license/clean-machine/platform acceptance; this transient Windows package is not an immutable RC. Reuse a receipt only for its same contract and matching inputs. No source research, gameplay, save schema, dependency version, baseline, Git configuration or external service was changed by Phase 3; no push, merge, signing or publication occurred.

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

**Planning evidence (2026-09-07):** documentation suites 9/9, exit 0; 163 local file links and 22 section anchors resolve; `git diff --check` exit 0. Logs: `logs/repository-audit-planning/{docs-tests.log,links.json,anchors.json,diff-check.log}`. Independent Sol/medium review found one missing alias disposition; cleanup Task 5 now explicitly owns `test:ui` retirement/compatibility and its public documentation. No other material coverage, ordering, canon or validation issues were found. **At initial planning:** all phases were NOT STARTED; current phase status is recorded above.

```text
Execute the next scheduled phase of docs/plans/2026-09-07-r9-build-validation-preparation-plan.md as the limited R9 preparation subset before final R8 acceptance. Read its ownership/collision and canon/security references. Reuse existing tooling: align runtime/test dependency resolution without opportunistic upgrades, remove identical check executions only with retained coverage/status evidence, then exclude verified research payloads while keeping source evidence and runtime assets. Preserve unknown required checks, live maps/recovery, FOW, stable inputs and baseline authority. No external protection mutation, push, signing or publication. Stop on missing consumer evidence, version-behavior changes, reporting/coverage loss or drift. Return changed files, version/check/resource mapping, exit codes, exact evidence identities, residuals and ledger updates.
```
