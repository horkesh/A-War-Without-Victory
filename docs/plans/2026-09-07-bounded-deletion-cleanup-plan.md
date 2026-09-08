# Bounded Deletion Cleanup Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one task at a time.

**Goal:** Remove the original four redundancies plus the repository audit's obsolete commands, tooling, UI and smoke engine without changing supported campaign behavior.

**Architecture:** Keep explicit event-definition injection, the canonical simulation pipeline, and existing navigation owners. Delete unused mechanisms before consolidating equivalent code; preserve optional no-event pipeline inputs explicitly at their boundary.

**Tech stack:** TypeScript, React, Vitest, Vite/Electron, Markdown.

**Date:** 2026-09-07
**Status:** Tasks 1–7 COMPLETE, reviewed GO; inherited test failures remain recorded. Task 7 retirement authorized and verified 2026-09-08; Task 8 PLANNED. Dated receipts below retain earlier states.
**Owner lane / command-board row:** R8, subordinate cleanup packet; no new workstream or BC identifier.
**Phase covered:** R8 after R7; finish before final calibration/final packaged acceptance. Task 2 follows BC04/BC05 event settlement; Task 3 follows R7 and BC06 UI settlement. Other tasks may run on disjoint files while behavior work settles. Diagnostic calibration stays open.
**Current next action:** Task 8: inspect active worktree references before retiring RE-specific hook tools.
**Collision rule:** Do not overlap BC event edits, R7 `App.tsx` work, or another agent's roadmap/ledger writes. Re-read current files before each edit; preserve unrelated changes. No implementation is dispatched by this planning turn.

## 1. Purpose and non-goals

The original four outcomes remain in scope, extended explicitly by the owner's repository-wide planning request:

1. Delete `src/sim/run_combat_browser.ts` and its unused import.
2. Delete `src/sim/events/event_registry.ts` and the evaluator's global fallback.
3. Delegate `reviewPreAdvanceItem` to `reviewPreAdvanceTarget` in `src/ui/map/App.tsx`.
4. Replace closed historical prose in `docs/plans/COMMAND_BOARD.md` with links to retained evidence.
5. Retire 22 broken npm commands and the obsolete state-report/orphan-audit generators.
6. Delete five abandoned operations components and the orphan standalone-map bootstrap.
7. Retire the empty `src/turn/*` smoke engine and give `npm start` a product entrypoint.
8. Retire RE-specific hook tools after checking active worktree references.

### Holistic routing and overlap

Audit evidence is `logs/repository-wide-audit/audit.md` (D1–D7, S1–S5); the exact broken-command snapshot is frozen in Task 5 below so execution does not depend on untracked logs. This packet owns all D findings. [Runtime integrity](2026-09-07-r8-runtime-input-ai-integrity-plan.md) owns S4/S5 as BC09/BC10, distinct from BC07's stability-data disposition. [Build preparation](2026-09-07-r9-build-validation-preparation-plan.md) owns S1/S2/S3 under R9; its early preparation completes before final calibration and R8 acceptance.

R7's English-readability amendment already owns live formatting/name consolidation: do not duplicate it here. R5 artifact/CI work and R4 command convergence remain closed; these are newly observed residuals, not reopened workstreams. R9 owns package/config changes after this packet's script-only edits. No two workers edit `package.json`, `App.tsx`, event phases, or roadmap/ledger files concurrently.

KEEP: live standalone viewer/recovery map, `electron-main.cjs` composition root, current IPC contract structure, FOW projections, canon/counterfactual content. No separate refactor, code-generation, map retirement, or event-authoring plan is created for those audit discussion points.

Exclude browser campaign retirement or full-browser convergence, UI redesign, new event content, recurrence removal, event quotas, pacing changes, Graz consolidation, AI-provider work, optimization, automation, and new process systems. The partial `run_early_war_browser.ts` fallback remains untouched. Do not reopen the already removed Dayton termination writer.

No save/schema, catalog, scenario, OOB, historical date, reference-map, baseline, canon, or `FORAWWV.md` edits. Dormant counterfactual events are not dead code merely because a historical run omits them. Historical/sensitive-history review is triggered if these boundaries cannot be preserved; this packet does not authorize such expansion.

## 2. External-agent execution contract

Read root and applicable directory `AGENTS.md`, `.claude/napkin.md`, the current master §4.1–4.2, the R8 controlling plan, `PLAN_EXECUTION_STANDARD.md`, `CODE_CANON.md`, and `PRODUCT_SHELL_HIERARCHY.md`. Read the engine invariants and sensitive-history gate before event work. Use the runtime orchestrator skill for coordination.

Session-start commands:

```powershell
git status --short
git branch --show-current
node --version
rg --files -g AGENTS.md
rg -n 'runPhaseIITurn|run_combat_browser|initEventRegistry|getEventRegistry|event_registry' src tests tools scripts .github package.json
rg -n 'evaluateEvents\(|eventDefinitions' src/sim/turn_phases src/sim/turn_pipeline_types.ts src/desktop/desktop_sim.ts src/scenario
rg -n 'reviewPreAdvanceItem|reviewPreAdvanceTarget|openDecisionRoomTarget' src/ui/map/App.tsx
```

Use a `codex/` branch with an isolated checkout for implementation if the active tree has competing work. One Sol/medium implementer and one independent Sol/medium reviewer cover code, determinism, UI and process; preserve distinct mandatory review seats if actual scope triggers them. Do not spawn agents solely to discuss this plan.

Stop the affected task on a newly live consumer, non-equivalent navigation branch, changed catalog delivery, unexplained state/output drift, or ownership collision. Report the concrete discrepancy rather than broadening the cleanup. A still-needed item may close as KEEP with evidence; deletion is not a quota.

## 3. Task sequence

### Task 1 — Delete the unused browser combat runner

**Owner:** implementation worker; independent reviewer checks callers/build ownership.
**Files:** delete `src/sim/run_combat_browser.ts`; remove only its unused import from `src/ui/warroom/ClickableRegionManager.ts`; correct active references in `docs/20_engineering/REPO_MAP.md` and any current entrypoint documentation found by the named-symbol search. Preserve historical reports.

1. Repeat the symbol/path search across tracked files (`git grep -n -E 'runPhaseIITurn|run_combat_browser'`). Separate executable consumers from historical mentions. The initial review found a definition and unused import, no invocation.
2. If that remains true, delete the file/import. Do not modify the live `runPhaseITurn` call or its behavior.
3. Run `npm.cmd run typecheck` and `npm.cmd run warroom:build`; repeat the search. Remaining historical references must be labeled as history, not active architecture.
4. Record evidence in this plan and commit only this task's files plus required documentation.

No new test is needed for deleting an uncalled, side-effect-free module. Pass: no executable references or build errors; live browser fallback unchanged.

### Task 2 — Remove the global event-registry fallback

**Status (2026-09-08): COMPLETE, independently reviewed GO.** Evidence:
`logs/bounded-deletion-cleanup/task2-preflight-search.log`,
`task2-baseline-focused.log`, `task2-focused-after-edit.log`, and
`task2-typecheck.log`. Focused results were 151 passed/5 skipped; typecheck
passed. Tasks 3–8 remain not started.

**Owner:** implementation worker; independent reviewer checks event delivery and determinism.
**Files:** delete `src/sim/events/event_registry.ts`; edit `src/sim/events/evaluate_events.ts`, `src/sim/turn_phases/early_war_phases.ts`, `src/sim/turn_phases/war_phases.ts`; targeted tests in `tests/events_evaluate.test.ts`, `tests/turn_pipeline.test.ts`, and affected direct evaluator tests; update `docs/20_engineering/REPO_MAP.md`.

1. Verify no initializer consumer has appeared. Inspect evaluator callers and the optional `eventDefinitions` input in `src/sim/turn_pipeline_types.ts`. Inspect scenario and desktop loaders; do not replace their injected catalogs.
2. Retain or add behavior coverage for explicit nonempty definitions firing the expected event, explicit `[]` producing no catalog events, and omitted pipeline definitions preserving existing behavior. Include a real event as a positive control; an empty-only test is insufficient. Run the focused suite before editing to establish current behavior.
3. Make evaluator parameter `registry: EventDefinition[]` required, remove its registry import, and use `const events = registry`. Delete the registry module.
4. Both pipeline callers pass `context.input.eventDefinitions ?? []`. Keep the pipeline input optional. Direct tests intentionally exercising no catalog pass `[]`. Do not introduce a new runtime fail-fast contract or force every pipeline client to load historical events. Keep candidate sorting, effects, readiness, Graz handling and all turn ordering unchanged.
5. Run the focused event suite and typecheck from §4. Fix only newly exposed call-site typing/wiring. Check scenario and desktop delivery still supplies loaded definitions; a blanket empty-array replacement is forbidden.
6. Record evidence and commit this task separately. Preserve current BC04 changes and chronology exactly.

Pass: no global registry references in executable code; explicit populated and empty inputs behave as before; supported pipeline omission remains valid. No campaign-equivalence claim may be based solely on focused tests.

### Task 3 — Consolidate equivalent pre-advance routing

**Owner:** implementation worker; independent reviewer checks shell transitions and navigation targets.
**Files:** `src/ui/map/App.tsx`; existing tests `tests/ui/pre_advance_command_review.test.ts`, `tests/ui/decision_room_navigation_owner.test.ts`, `tests/ui/warroom_priority_docket.test.ts`, `tests/ui_presidential_decision_room_wiring.test.ts`.

1. Compare current handlers, including Decision Room, counter-offer, enclave-dashboard, inbox and generic targets. If still equivalent, replace the body of `reviewPreAdvanceItem` with `reviewPreAdvanceTarget(item.navigationTarget)`. Order declarations so the dependency is clear.
2. Preserve `openDecisionRoomTarget`: its shell-closing and return-value behavior differs. Do not introduce a generic router or move state ownership.
3. Run the named existing tests and release build. Extend behavioral coverage only if a real branch is uncovered; do not add source-shape tests that merely pin the wrapper.
4. In local packaged Electron, exercise each of the five target branches from pre-advance review and the relevant existing Decision Room/docket entrypoints. Check destination, modal dismissal, return behavior, console errors and unchanged player-safe content. Use existing fixtures/harness; record unavailable branch coverage honestly.
5. Record evidence and commit separately. No new strings, localization work, queues, ledgers, or player information are introduced.

Pass: all previously supported routes retain their destination and shell state; one implementation owns the two equivalent handlers. No changes to player-visible data or simulation inputs.

### Task 4 — Trim the derived command board

**Owner:** documentation worker or main agent; independent reviewer checks retained authority.
**Files:** `docs/plans/COMMAND_BOARD.md`; master roadmap only for packet status, this plan and ledger for closeout.

1. Replace repeated closed RE/probe execution narratives with concise historical links to the existing closed contract, recovery record, and master snapshot.
2. Preserve active queue, current dependencies, unresolved acceptance, publication boundary and any still-live constraint embedded in old prose. Do not rewrite the historical evidence itself or create an archive/report to duplicate it.
3. Verify relative links and `git diff --check`. Confirm every unfinished command-board item still has a master owner and next action.
4. Record completion and commit the documentation slice. No runtime tests for this task.

### Task 5 — Retire broken commands and obsolete report tools (audit D1/D4/D5)

**Owner/reviewer:** implementation worker; independent tooling reviewer. **Files:** script entries only in `package.json`; delete `tools/audit/generate_state_of_game.ts`, `scripts/repo/cleanup_audit.ts`, and `tests/audit_state_of_game_determinism.test.ts`; update only current docs that advertise those commands. Historical outputs remain retained with historical status, not regenerated or deleted.

The 22 absent-target command names measured on 2026-09-07 are:

```text
sim:aorcheck, viewer:settlements:only1990, map:build:raw,
map:audit:settlement-names:h3_4, map:query:settlement-names:h3_4a,
map:build:settlement-names:h3_6, map:validate:settlement-names:h3_6,
map:audit:geometry:s209422:h3_8, map:derive:continuity:g3_6,
data:extractMun1990Registry, data:buildMun1990Registry110,
map:attachSettlementNamesFromPolygons, map:attachSettlementTrueNames,
map:deriveMun1990Geometry, audit:breza:trace, audit:settlementNames:feasibility,
audit:settlements:missingTargets, map:importMissingSettlements,
audit:settlements:locateNamed, map:importNamedSettlementPatch,
audit:settlements:verifyNamedPresent, phaseF3:aor_fallback_usage_audit
```

1. Resolve each current script's literal target and inspect inbound script/workflow references. Delete obsolete absent-target entries; if a target has become live, KEEP with evidence. Remap only to a verified current equivalent. Do not remove the six merely duplicated alias groups by count alone. Explicitly disposition the misleading `test:ui` alias, which currently runs full Vitest discovery: inspect callers and root README/command contracts, then prefer removing the alias and pointing users to the existing canonical full-suite command. If live consumers require compatibility, KEEP it with an accurate full-suite/deprecated-alias description and a named replacement. Do not create a new UI runner merely to justify the old name. Task 5 owns this public-command disposition; R9 Phase 2 owns CI execution deduplication.
2. Retire `audit:state` and `repo:cleanup:audit` with their tools and exclusive tests. The first writes fixed v0.2 green prose; the second fails `.js`-to-`.ts` resolution and omits CJS/MJS. Do not write replacement generators or an orphan detector.
3. Verify remaining workflow command references resolve and `git diff --check` passes; run the existing documentation truth suites. No new deletion-shape tests. Record removed/retained names and commit the slice.

### Task 6 — Delete unused UI sources (audit D2/D3)

**Owner/reviewer:** implementation worker; independent UI reviewer. **Delete candidates:** `src/ui/map/components/plan_ui/AxisAssessmentCard.tsx`, `CommanderAssessmentDoc.tsx`, `TacticalCard.tsx`, `CommandTopBar.tsx`, `OpsMapRenderer.ts`; `src/ui/warroom/map_viewer_standalone.ts`.

1. Search imports, dynamic string references, HTML entries, Vite entries and stories before deleting. Preserve `plan_ui/ReadinessBar.tsx`, `opsConstants.ts`, live `components/TacticalCard.tsx`, `map_viewer_app.ts`, the HTML entry and `components/WarPlanningMap.ts` recovery surface.
2. Remove only exclusive assertions/imports in `tests/strict_null_inventory_progress.test.ts`, `tests/ui_map_deck_counter_visibility.test.ts`, `tests/ui/accessibility_form_labels.test.ts`, `tests/v093_a11y_lane_e_forms_live_regions.test.ts`, `tests/ui/gui_audit_polish_cleanup.test.ts`, and `tests/ui/ui_copy_raw_id_fallbacks.test.ts`. Retain assertions for live components; do not drop entire mixed suites.
3. Run those six test files via `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/ui_map_deck_counter_visibility.test.ts tests/ui/accessibility_form_labels.test.ts tests/v093_a11y_lane_e_forms_live_regions.test.ts tests/ui/gui_audit_polish_cleanup.test.ts tests/ui/ui_copy_raw_id_fallbacks.test.ts`, typecheck and `npm.cmd run desktop:release:check`. Exercise live operations-modal proposal/inspection and Warroom recovery in the existing packaged smoke; include `tests/ui/ops_modal_auto_propose.test.ts`. No screenshots of orphan components as proof. Commit with route/build evidence.

### Task 7 — Remove the empty smoke engine (audit D7)

**Owner/reviewer:** implementation worker; independent systems reviewer. **Files:** `package.json`, `src/index.ts`, `src/turn/pipeline.ts`, `src/turn/steps.ts`, `tests/legacy_turn_pipeline.test.ts`; relevant active entrypoint docs.

1. Confirm the empty pipeline's current consumer set. Set root `start` to `npm run desktop`, the existing product command; remove the obsolete root smoke entry and `src/turn/*` only after that consumer proof.
2. Remove the legacy-only test. Retain canonical `tests/turn_pipeline.test.ts` as the tiny meaningful engine check; do not invent another smoke engine. `src/state/turn_pipeline.ts` and peace-scenario tests stay intact.
3. Run `npm.cmd run typecheck`, `npx.cmd vitest run tests/turn_pipeline.test.ts`, the release build, and one local launch through `npm.cmd start`. Close the test app after proof. Assert the entry reaches the desktop and the canonical sim bundle; commit separately.

### Task 8 — Retire closed RE hook machinery (audit D6)

**Owner/reviewer:** main or implementation worker; independent process/platform reviewer. **Files:** three `governance:re:*` scripts in `package.json`; `scripts/repo/check_re_scope.ps1`, `scripts/repo/install_re_scope_hook.ps1`, `tests/re_scope_guard.test.ps1`, `tests/re_scope_external_hook.test.ps1`; stale instructions in `.husky/pre-commit` and `.githooks/README.md`.

1. Inspect `git worktree list --porcelain` and each accessible worktree's `core.hooksPath` plus referenced hook text. Read only: do not rewrite another worktree's Git config, delete a worktree or run the installer.
2. Retire the three npm entrypoints. Delete checker/installer/exclusive tests only if no active external hook consumes them; otherwise retain those files as compatibility-only with the exact consuming worktree and unblock action recorded. That KEEP closes this bounded task; no forced hook migration.
3. Correct `.githooks/README.md` to distinguish its historical governance hook from currently installed Husky hooks. Do not delete `check_claude_governance.ps1` or `.githooks/pre-commit` without a separate live-consumer disposition. Preserve actual Husky typecheck and Git LFS hooks byte-for-byte apart from stale RE comments. Verify scripts/references, documentation truth and `git diff --check`; commit the slice.

## 4. Fixed validation plan and stopping rule

**Question:** Do these deletions preserve supported event delivery and player navigation while removing duplicate mechanisms?

**Cost:** focused tests/builds should take minutes to tens of minutes; exact duration is not yet measured. One bounded packaged navigation check follows the source changes. No new standalone campaign is commissioned by this packet. Use the already required R8/final-calibration execution for applicable long-run evidence and preserve its authorization boundaries.

Commands for the implementation (not this documentation-only planning turn):

```powershell
npm.cmd run typecheck
npx.cmd vitest run tests/events_evaluate.test.ts tests/event_loader.test.ts tests/event_loader_runtime_substrate.test.ts tests/integration_event_system.test.ts tests/turn_pipeline.test.ts
npx.cmd vitest run tests/ui/pre_advance_command_review.test.ts tests/ui/decision_room_navigation_owner.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui_presidential_decision_room_wiring.test.ts
npm.cmd run desktop:release:check
git diff --check
```

Before workstream closure, retain all applicable master §11 checks (canon, baselines, engine health, canonical full suite) and the existing R8 packaged acceptance. Use the README's supported canonical `npm.cmd run test:vitest` entrypoint with child-scoped Git Bash on Windows; do not silently classify a red suite as green. Batch output into `logs/bounded-deletion-cleanup/` and record command, exit code and evidence path here.

No timestamps, random behavior, reordered event candidates, serialized fields or baseline refreshes. This packet targets equivalence; if any simulation/output difference appears, stop and route it before acceptance. Master §11's two byte-identical long scenarios remain required for actual simulation/output changes; focused tests do not waive that requirement. Do not absorb behavioral repair into cleanup or refresh manifests to make it pass. Additional expensive investigations need a concrete question, expected cost and owner decision; already authorized checks do not need repeated approval.

Stop after one independent review and targeted correction verification when Tasks 1–8 have supported DELETE/SIMPLIFY or KEEP dispositions and required checks pass. Do not initiate optimization, event authoring or another review campaign. R9 build preparation owns any subsequent lockfile, CI job, or payload change; hand off one script surface before it starts.

## 5. Evidence and closeout

Planning verification (2026-09-07): documentation suites passed 9/9, exit 0
(`logs/bounded-deletion-cleanup/planning-docs-tests.log`). The initial roadmap-length failure
was corrected by keeping §4.2 concise and removing one duplicate historical pointer; no test
threshold changed. Local-link/scope checks and `git diff --check` passed, exit 0
(`logs/bounded-deletion-cleanup/planning-links.log`, `planning-diff-check.log`).
The preceding receipt covers the original four-item draft only. Repository-wide extension planning checks (2026-09-07): documentation suites 9/9, exit 0; 163 local file links and 22 section anchors resolve; `git diff --check` exit 0. Evidence: `logs/repository-audit-planning/{docs-tests.log,links.json,anchors.json,diff-check.log}`. Independent Sol/medium review found one missing alias disposition; cleanup Task 5 now explicitly owns `test:ui` retirement/compatibility and its public documentation. No other material coverage, ordering, canon or validation issues were found. Implementation Task 1: COMPLETE, reviewed GO (2026-09-08); Task 2 COMPLETE, reviewed GO (2026-09-08); Task 3 initially reviewed NO-GO pending validation, now COMPLETE with local packaged proof and independent GO (2026-09-08); Task 4 COMPLETE, reviewed GO (2026-09-08); Tasks 5–8 NOT STARTED.

At implementation closeout, update this evidence section with dispositions, files, command exit codes, log paths, UI branch coverage and any residual. Update `COMMAND_BOARD.md`, master §4.2 and the R8 controlling plan's packet status, then append `docs/PROJECT_LEDGER.md`. Put the implementation receipt in the existing R8 report if available; only if none fits, use one consolidated report under `docs/40_reports/implemented/`, not separate task reports. Update knowledge only for a new reusable lesson; no rating/backlog change is implied.

### Task 3 local evidence — 2026-09-08

Fast-forwarded local `main` from `223d97970` to reviewed Task 2 commit `cdc8659b1`. On isolated branch `codex/cleanup-pre-advance-routing`, compared all five target branches and consolidated `reviewPreAdvanceItem` into `reviewPreAdvanceTarget(item.navigationTarget)`. `openDecisionRoomTarget` remains separate. Only `src/ui/map/App.tsx` changed; no tests or strings added.

Named UI tests: 34 passed, 5 failed, exit 1; failures are existing recommended-count expectation mismatches in pre-advance/docket projections, with no navigation assertion failure. Typecheck passed, exit 0. Release build passed map build/chunk-cycle checks but stopped at the existing stale startup-snapshot gate after a source-read timeout; no artifact was regenerated. Evidence: `logs/bounded-deletion-cleanup/task3-ui-tests.log`, `task3-typecheck.log`, `task3-release-build.log`. Packaged Electron interaction was unavailable because the release build did not complete; no acceptance credit claimed.

Validation follow-up: the identical UI command on unchanged Task 2 `cdc8659b1` and
Task 3 `61db7e9df` produced the same five projection mismatches (34 passed/5 failed,
exit 1), proving they are inherited rather than routing regressions. The source-read
probe, simulation/startup snapshot checks, and justified `npm.cmd run desktop:release:check`
retry passed exit 0 without snapshot regeneration. Packaging reached
`dist-packaged\\win-unpacked` but did not return after four minutes and was stopped
under the bounded stopping rule (exit 1). Its freshly written executable then failed
to launch with Windows reporting that it was not a valid application, confirming the
interrupted output is unusable. No reviewable packaged Electron interaction receipt
exists for the five target branches and relevant Decision Room/docket entrypoints.
Evidence: `task3-task2-ui-compare.log`, `task3-candidate-ui-compare.log`,
`task3-source-read-probe.log`, `task3-desktop-sim-retry.log`,
`task3-startup-snapshot-retry.log`, `task3-release-build-retry.log`,
`task3-package-dir.log`, `task3-packaged-launch.log`, and
`task3-validation-closeout.md`. Task 3 remains NO-GO for packaged navigation proof.

## 6. Copy-ready implementation prompt

```text
Execute docs/plans/2026-09-07-bounded-deletion-cleanup-plan.md Tasks 1–8 as the subordinate R8 packet at master §4.2. Respect task-specific BC04/05/06 and R7 collisions; hand script ownership to the R9 build packet afterward. Read AGENTS, napkin, CODE_CANON, invariants, sensitive-history gate and shell hierarchy. Use one implementer and independent reviewer with mandatory specialist exceptions. Delete proven obsolete paths only, preserve optional no-event semantics, live UI/recovery, history and active external hooks. No canon, FORAWWV, content, timing, save schema, dependency-version or baseline changes. Stop on live consumers, non-equivalent routes, collisions or drift. Run focused and applicable master/R8 checks, keep logs, and return per-task disposition, files, exit codes, evidence, remaining acceptance and ledger updates. KEEP with evidence is valid.
```

### Task 1 local evidence — 2026-09-08

Owner authorized only the first small cleanup and its separate commit. Base:
`650fad4ec`, isolated branch `codex/cleanup-browser-combat`.
The tracked executable search found only one definition and one unused import,
with no invocation or top-level side effect. Deleted the 44-line increment-only
runner and that single import. The live `runPhaseITurn` call and desktop IPC
advance branch remain unchanged. After deletion, executable search has zero matches
(exit 1 is the expected no-match result). Receipt: `logs/bounded-deletion-cleanup/task1-search.log`.

Corrected current entrypoint descriptions in REPO_MAP, CODE_CANON, PIPELINE_ENTRYPOINTS,
PRODUCT_ARCHITECTURE_AUTHORITY and DESKTOP_GUI_IPC_CONTRACT. Historical reports and
old plans are retained as history; no canonical game rules changed.

Validation is limited to the Task 1 commands: `npm.cmd run typecheck`,
`npm.cmd run warroom:build`, executable-reference search and focused documentation
checks. Expected cost: minutes. Pass requires no live consumer, unchanged live
fallback and passing checks; stop on any contradiction or build failure needing
broader work. No new test is warranted for this uncalled side-effect-free deletion.
Independent Sol review returned GO; typecheck/build and 13 documentation checks pass. Tasks 2–8 and later acceptance
remain open; no campaign, dependency or historical-data change is authorized here.

Final receipts in `logs/bounded-deletion-cleanup/`: `task1-typecheck.log` and
`task1-warroom-build.log` exit 0; `task1-docs-tests.log` 13/13, exit 0;
`task1-independent-review.md` GO; `task1-diff-check.log` exit 0. One stale
BC09/BC07 roadmap status was corrected during review. No broader review or campaign.

### 2026-09-08 — Fresh packaged-validation continuation blocked before build

Task 3 remains NO-GO. Checkout verified clean at `7fbe2b8b7`; local main remains
`cdc8659b1`. Node is supported `v22.23.2`. No Electron or packaging process was
running. The resolved cleanup target was exactly
`F:\A-War-Without-Victory\dist-packaged\win-unpacked`, a normal directory with no
link/reparse target; sibling validation evidence was excluded.

Automatic approval review rejected both the guarded cleanup command and the
literal-path-only PowerShell deletion with “blocked by policy”; neither executed.
No fresh package build, launch, runtime probe or navigation check ran in this
continuation. The fresh build sequence cannot proceed until that cleanup is allowed
or the owner completes it. The pre-build question, commands, expected cost, pass
criteria and stopping rule are appended to `task3-validation-plan.log`; rejection
receipt: `logs/bounded-deletion-cleanup/task3-fresh-package-diagnosis.log`.

Historical evidence clarification: `task3-package-dir-retry.log` and
`task3-packaged-runtime-probe-retry.log` report exit 0; the validation repair summary
records the later 222836736-byte executable. These do not close navigation: the
last navigation retry failed before any required route assertion. Earlier failed
receipts and NO-GO verdicts remain retained. All five required routes and relevant
Decision Room/docket entrypoints remain without accepted packaged proof.
This is local Task 3 status, not final R8 packaged-game acceptance. No merge, push,
Task 4, production/data/config/dependency/snapshot/baseline change was performed.

### Task 3 fresh packaged proof — 2026-09-08

The owner resolved the historical cleanup-policy blocker by removing only
`win-unpacked`. Fresh `desktop:package:dir` and PE checks pass exit 0. The existing
runtime probe passed on one new-profile retry after a preserved Chromium cache-read
failure. The packaged five-route modal pass and distinct Decision Room callback
continuation pass exit 0 with zero captured diagnostics. Real modal dismissal,
destinations, shells, player-safe text and visible returns are proven for all five
routes; natural pre-advance and priority-docket clicks are also retained.

The [existing closeout](../../logs/bounded-deletion-cleanup/task3-validation-closeout.md#latest-local-task-3-packaged-evidence--2026-09-08)
contains commands, exits, route matrix, screenshots, fixture limitations and earlier
failed receipts. Synthetic fixture targets invoke actual compiled callbacks; no
production debug control or router replacement was added. Local packaged criteria
are satisfied; targeted independent Sol/medium review returned GO for integration.
Tasks 4–8 are not started by this continuation. Final R8 acceptance remains separate.

### Task 4 command-board trim — 2026-09-08

Base `71add22ef`; branch `codex/cleanup-command-board`. Replaced repeated closed
RE/probe execution narratives with links to the existing closed contract, recovery
record and master execution snapshot. Historical records themselves are unchanged.
Retained current dispatch rows, dependencies, unresolved acceptance, engine-health
priority, non-authorizing closed proof records, held canon and publication limits.
Aligned the repeated BC09 sentence with its already-reviewed status in master §4.1.
No new workflow authority, game behavior, canon, data or runtime change is introduced.

Validation question: does the shorter derived board preserve every unfinished item's
master owner and next action? Check all board links/anchors; compare live items with
master §§4.1–4.2/5; run the three existing documentation suites and `git diff --check`.
Expected cost: minutes. Pass requires retained authority/constraints and clean focused
checks; stop on any unowned item, lost live constraint or unresolved authority conflict.
No runtime tests. Evidence: `logs/bounded-deletion-cleanup/task4-validation.log` and
`task4-docs-tests.log`. Task 4 COMPLETE: independent Sol/medium review GO, no findings
(`task4-review.log`); 36 links/10 anchors resolve, live owners/actions retained,
13/13 documentation tests and diff check pass. Master/derived packet status synchronized.
Tasks 5–8 remain not started by this continuation.

### Task 5 validation plan — 2026-09-08

Reviewed Task 4 `85bafdd78` fast-forwarded into local main; Task 5 is isolated on
`codex/cleanup-obsolete-commands`. Question: can the named obsolete commands/tools
be retired without breaking a supported caller? One Sol/medium implementer handles
consumer evidence and the bounded deletion; a separate Sol/medium reviewer checks it.

Recheck all 22 historical missing targets and inbound consumers; explicitly resolve
`test:ui`; preserve active equivalents, dependencies, workflows and historical outputs.
Run workflow-command resolution, the existing documentation suites plus
`tests/ci_workflow_test_paths_exist.test.ts`, `tests/test_discovery_contract.test.ts`,
`git diff --check`, and the unchanged
required pre-commit hook. Expected cost: minutes. No builds/packages/campaigns or
new deletion-shape tests. Stop rather than expand into dependency, CI, runtime,
canon/data or unrelated consumer repair. KEEP a now-live target with evidence.
Root owns these status/ledger updates; worker owns script/tool/current-command docs.
Evidence: `logs/bounded-deletion-cleanup/task5-disposition.log` and focused check logs.

### Task 5 command retirement — 2026-09-08

Removed all 22 verified absent-target commands, misleading `test:ui`, and the two
obsolete audit commands/tools with their exclusive generator test. Removed only
that deleted test's discovery representative; other assertions remain. All surviving
scripts and non-script package fields are unchanged. Updated current README/backlog
advertisements and three maintenance-only details in `docs/10_canon/context.md`:
two retired command lines and the historical audit-output description. Protected-path
policy and game canon are unchanged. Historical reports and generated outputs remain.

Static disposition: 17 workflow npm references, 37 package-chain references and
258 direct literal targets resolve. Focused documentation/workflow/discovery checks
passed 20/20 across five files (exit 0). Evidence: `task5-disposition.log` and
`task5-focused-tests.log` under `logs/bounded-deletion-cleanup/`. Independent Sol/medium review returned GO with no actionable findings (`task5-review.log`).
The mandatory pre-commit typecheck result is recorded in `task5-commit.log`. Tasks 6–8 remain unstarted;
final R8 acceptance and the R7/dependency handoffs remain unchanged.

### Task 6 validation plan — 2026-09-08

Reviewed Task 5 `f4305c898` fast-forwarded into local main; Task 6 is isolated on
`codex/cleanup-unused-ui` in the owner-requested workspace. One Sol/medium implementer
owns the six source candidates, exclusive test assertions and caller disposition;
a separate Sol/medium reviewer owns independent review. Root owns validation routing,
packaged smoke and status/ledger. No other worktree or dependency setup is changed.

Question: can the six sources retire while supported operations proposal/inspection
and Warroom recovery remain functional? Check imports, dynamic strings, HTML/Vite
entries and stories; KEEP any live candidate. Run the six specified mixed suites plus
`tests/ui/ops_modal_auto_propose.test.ts`, typecheck, and
`npm.cmd run desktop:release:check`. Produce a fresh directory package using the
same electron-builder configuration after that build, avoiding a duplicate release
build, then run the existing isolated runtime smoke plus bounded operations-modal
and deliberately induced opening-recovery routes. Use disposable profiles/fixture
copies; retain receipts and resource hashes under `logs/bounded-deletion-cleanup/`.
The package and route checks are local Task 6 proof, not final R8 acceptance.

Expected cost: minutes to tens of minutes. Pass requires supported caller disposition,
retained mixed-suite assertions, passing affected checks/build, and live route proof.
Stop on behavior regression, unavailable prerequisite or unrelated repair; preserve
inherited failures explicitly. No new features, campaigns, config/dependency changes,
canon/data changes, Tasks 7–8 or remote push. Mandatory commit hook remains unchanged.

Task 6 runtime interpretation: `tests/ui/presidential_command_model_surface.test.ts`
explicitly verifies that `OpsPlanningModal` is unmounted and that presidential
operation requests remain the live command route. Packaged proof therefore uses the
current proposal dossier -> field inspection -> exact dossier return, with actual
UI clicks and authoritative historical objective references; it does not mount the
retired detailed planner. The required auto-propose unit suite remains included.
Recovery proof cancels only the embedded opening document in an isolated profile,
checks the real fallback menu/side-picker and lazy WarPlanningMap, then restores
loading and requires React to reclaim ownership. This clarifies the live route in
Task 6 rather than adding a new feature or weakening a failing route assertion.

Task 6 bounded runtime correction: first probe timed out at its existing five-second
session-readiness deadline; normal packaged operations and recovery routes then passed.
The new-profile retry reached full probe observations but failed with Chromium
ERR_CACHE_READ_FAILURE for bih_adm3_1990.geojson and its resulting MapLibre error.
Source/package boundary-file SHA256 matches exactly, files are readable and disk
space is ample; successful routes use the same executable/application hashes.
Independent reviewer recommends one final never-used-profile retry of the unchanged
probe to answer this specific cache-startup question. Cost: seconds to a minute.
Stop after this attempt on any failure; do not disable caching, relax assertions,
patch production or begin a broader campaign. Both earlier failures remain retained.

### Task 6 deletion and packaged route evidence — 2026-09-08

Base `f4305c898`; branch `codex/cleanup-unused-ui`. Removed the six named UI sources
(754 lines) after import/dynamic-string/HTML/Vite/story disposition. Removed only their
exclusive references/assertions in the six mixed suites; kept the distinct TacticalCard,
ReadinessBar, opsConstants, retained OpsMap, map_viewer_app/HTML entry, and WarPlanningMap.
No simulation, data, save/schema, dependency, build configuration or canon change.

Validation receipts under `logs/bounded-deletion-cleanup/`:
- `task6-disposition.log`: all six DELETE; no executable consumers remain. One old
  GlassPanel visual-description comment is non-executable and unchanged.
- `task6-focused-tests.log`: seven specified suites, **157/158, exit 1**. The unchanged
  optional GameState domain floor expects five `as unknown` casts but base `f4305c898`
  already contains six (including `src/scenario/turn_inputs.ts:171`). All six deleted
  files contained zero; no other source changed. This inherited failure remains open;
  the suite is not green and its floor is not weakened or retired by this cleanup.
- `task6-typecheck.log`: `npm.cmd run typecheck`, exit 0.
- `task6-release-check.log`: `npm.cmd run desktop:release:check`, exit 0, including
  18 chunks without import cycles and map/sim/Warroom builds.
- `task6-package.log`: `npx.cmd electron-builder --dir --publish never`, exit 0 after
  the canonical release check; `task6-pe.log` verifies AMD64 PE32+ and all 14 sections.
- `task6-runtime.log`: initial unchanged probe exit 1 (session-readiness timeout).
  `task6-runtime-retry.log`: exit 1, Chromium boundary-file cache-read failure;
  failed manifest retained. Boundary source/package SHA256 matches
  `1bd0c9c0ae3b4f6bbd5ac54f460ac791ac9046e64f3a6cab1690eb60d9d4f2a7`.
  `task6-runtime-cache-retry.log`: final bounded fresh-profile attempt exit 0;
  passed manifest records zero failures, three windows, eight map-server checks,
  eleven resource-route checks and two tactical interaction modes. Probe, cache
  settings and assertions stayed unchanged; earlier failures are retained.
- `task6-packaged-routes.cjs operations 1`: exit 1 from a missing Desk navigation
  step in the harness, with zero renderer diagnostics. Corrected only that step;
  `operations 2` exits 0, showing the exact historical proposal dossier, four
  objective identities, ready field map, selection and exact dossier return.
- `task6-packaged-routes.cjs recovery 1`: exit 0. Deliberately blocked only the
  embedded opening document; real fallback menu, side-picker/back and lazy recovery
  map initialization work. Restored loading returns ownership to React and disables
  fallback. Only the induced blocked-request diagnostic is excluded, by exact URL.

Both successful route receipts identify executable SHA256
`1d92189fa8d9cf8c0fc7f24e2a5e5f1a96f910c1881f4a539e8ec224e01d7edc`
and application archive SHA256
`b0146bd47124439c3659420a7163dbd5bc2ffb8f304872268d43b7b22c782cfd`.
The copied RS fixture adds only one pending historical proposal for route verification;
this does not prove natural timing, authorization outcomes or campaign acceptance.
Root visually inspected the field-plan and recovery-menu screenshots. All six real
repository saves retain their pre-run SHA256; no Electron process remains. The prior
Task 3 package remains intact at `dist-packaged/task3-preserved-package`.
Independent Sol/medium review GO, no actionable findings (`task6-review.log`).
Mandatory commit-hook result is retained in `task6-commit.log`. Tasks 7–8 remain unstarted;
final R8 acceptance is open, and the inherited inventory-floor failure is not waived.

### Task 7 validation plan — 2026-09-08

Owner requested Task 7. Branch `codex/cleanup-empty-smoke-engine` starts from reviewed
Task 6 `1638c7a28`; local main remains `f4305c898`. Task 6 generated evidence remains
untouched. One Sol/medium implementer owns consumer proof, start-script/deletions,
current entrypoint docs and canonical turn tests. Separate Sol/medium systems review;
root owns launch/build/typecheck and status/ledger.

Question: can the empty smoke engine retire while npm start reaches the existing
desktop and canonical simulation bundle? Confirm all current callers before deleting
src/index.ts, src/turn/pipeline.ts, src/turn/steps.ts and the legacy-only test. Preserve
src/sim/turn_pipeline.ts, src/state/turn_pipeline.ts, canonical/peace tests and all
simulation semantics. Set start only to `npm run desktop`; no replacement engine.

Run `npx.cmd vitest run tests/turn_pipeline.test.ts`, `npm.cmd run typecheck`, focused
current-document/entrypoint contract checks when affected, and `npm.cmd start` through
its real `desktop:release:check` -> Electron command chain. The nested canonical
release build supplies the release-check receipt without a duplicate build. Add
launch-only isolated-profile and loopback debugger arguments using npm argument
forwarding; inspect the real desktop and main-process loaded-module cache after a
copied save loads, then close the app. Preserve all real save hashes. No turn advance
or new campaign is needed. Record outputs/exits in `logs/bounded-deletion-cleanup/`.

Expected cost: several minutes. Pass requires supported caller disposition, unchanged
canonical engine/peace surfaces, passing affected tests/typecheck/build and actual
npm-start desktop/bundle proof. Stop on a live dependency or behavior regression;
do not repair unrelated inherited floors or expand into Task 8/dependencies/config,
packaging, campaign validation, main integration or remote push. Mandatory hook stays.

Task 7 launch correction: first npm-start process exited 0 and reached the real
desktop, but the observer failed because development getSavesDir() uses repository
saves rather than packaged userData/saves. Preserved first observer receipt and log.
The load-save-record handler only loads/project snapshots; it does not write a save.
A uniquely named disposable copy is temporarily placed in repository saves for one
corrected actual npm-start launch. No original save is changed; remove only that copy
after proof and recheck all original hashes. Electron profile remains isolated.
This corrects the harness fixture location, not production lookup or assertions.

Task 7 independent review found a live consumer omitted from the initial scan:
`package.json` exposes `dev:runner` -> `tools/dev_runner/server.ts`, which imports
`src/turn/pipeline.js` at line 19 and calls executeTurn at line 396. The reviewer
reproduced ERR_MODULE_NOT_FOUND from `npm.cmd run dev:runner` after deletion.
Typecheck did not catch it because that tool is outside its checked project.
The initial sole-caller claim is incorrect and superseded by this finding. Restore
the pipeline, empty-step registry and legacy test as compatibility-only while owner
disposition is pending; do not replace dev-runner behavior with canonical simulation.
Root requested the concrete scope decision to retire the dev runner's command,
server, two exclusive viewer files and current documentation, or retain its pipeline.
The npm-start desktop/bundle proof remains valid; full Task 7 deletion is not accepted.

### Task 7 current evidence and owner handoff — 2026-09-08

The supported `start` change is the only package change. Canonical turn tests pass
4/4 (`task7-turn-tests.log`); typecheck passes (`task7-typecheck.log`). The broader
caller-contract run is 113/114 with the unchanged inherited as-unknown floor failure;
the touched sim-run inventory assertion passes independently. This is not green-suite
credit and does not waive that inherited residual.

Actual launch command:
`npm.cmd start -- -- --user-data-dir=F:/A-War-Without-Victory/dist-packaged/task7-validation-profile --remote-debugging-port=9337 --inspect=9338`.
Both real npm processes executed the canonical release build and exited 0. Initial
observer failed only on the development-mode fixture location; preserved in
`task7-start-proof.log` and `task7-start-evidence/result.json`. Corrected observer
`node logs/bounded-deletion-cleanup/task7-start-proof.cjs retry` passes exit 0:
`task7-start-proof-retry.log`, `task7-start-retry/result.json`. It observed the actual
Warroom host, copied-save desktop shell and one loaded main-process canonical
`dist/desktop/desktop_sim.cjs` module exporting advanceTurn. Bundle SHA256:
`37dec2274b535684b2fda0ca951a82f067f55df8e8347df4c036b0878313ea72`.
This proves desktop/bundle entry, not a completed map-render or campaign acceptance.
The screenshot was captured while the operational map was preparing. No turn advanced.
All six original save hashes remain unchanged; the temporary copied save was hash-
checked and removed, and Electron closed normally.

Independent review `task7-review.log` is **NO-GO for full engine deletion** because
of the dev-runner caller. Restored pipeline/steps/legacy test/invariant list exactly
from the parent; restoration checks pass 27/27 (`task7-restoration-tests.log`).
Current docs retain that compatibility dependency and remove only the retired root
smoke entry. Owner choice remains pending: retire dev:runner plus its three exclusive
files/current docs, or KEEP its pipeline. No Task 7 commit, integration, Task 8,
package build, remote push or unrelated fix has occurred.

### Task 7 owner-authorized dev-runner retirement — 2026-09-08

Owner response: **“Retire it.”** This authorizes removing `dev:runner`,
`tools/dev_runner/server.ts`, its `public/political_control.html` and
`public/political_control.js`, and their current maintenance/entrypoint documentation.
The only remaining runtime consumer is therefore retired with the empty pipeline;
Task 7 may again delete `src/turn/pipeline.ts`, `src/turn/steps.ts` and the exclusive
legacy test after a full executable-surface scan including tools and workflows.
Earlier NO-GO/restoration receipts above remain historical, not unresolved authority.

Fixed correction verification: one Sol implementation continuation and the same
independent Sol reviewer perform targeted correction review. Recheck all retired
command/path consumers across src/tools/scripts/tests/workflows/current docs; retain
historical records. Rerun canonical turn tests, the affected invariant suite and
only the touched strict-null assertion; run current documentation checks and diff
hygiene. Mandatory commit hook supplies final typecheck. Expected cost: minutes.
The existing successful real npm-start/build/module-cache receipt remains applicable:
start/desktop commands and canonical product build inputs are unchanged by retirement
of the dev-runner-only files. No repeat package or launch campaign is needed absent
new evidence of a product dependency; the final review must verify that boundary.
Stop on any further live consumer or behavior regression. Task 8 remains unstarted.

Current-document correction verification also includes the existing
`tests/replay_surface_truth.test.ts` and `tests/map_derived_artifact_ownership.test.ts`
suites, which directly read the changed entrypoint/map-build documents. These are
small read-only checks, not builds or scenario runs. The initializer's dev-runner
mention is corrected as a source comment only; executable initialization and
canonical simulation code remain unchanged.

The protocol-consumer check identified two additional files belonging to the retired
dev-runner tool: `tools/dev_viewer/index.html` and `viewer.js`. The latter hardcodes
`http://localhost:3000` and the dev runner's state/step/reset/settlement and order
endpoints. The orchestrator includes these exclusive clients in the owner's tool-
retirement instruction so they are not left advertised with a deleted backend;
this is not a migration or deletion of the product's Warroom/map viewers. Verify
exclusivity and remove their current documentation references. The complete legacy
dev-tool unit is therefore five files, not the initially inventoried three. Preserve
this correction and scan endpoint/port consumers as well as module/path references.

## Task 7 owner-authorized retirement closeout — 2026-09-08

The owner answered **Retire it**, superseding the earlier dependency-decision NO-GO.
Removed the dev:runner command, its server/public files and the two exclusive HTTP
clients in tools/dev_viewer, then the empty src/turn pipeline/steps and exclusive test.
The obsolete root entry is gone; npm start now invokes npm run desktop. Supported
product map viewers, canonical simulation, peace tests, dependencies and data remain.
The source initializer change is a comment only. Both missed-consumer findings and
original failed attempts remain in the dated evidence; current references are corrected.

Final focused canonical/invariant checks pass 28/28; the touched strict-null assertion
passes 1/1 (89 unrelated tests skipped), and routing/artifact documentation checks pass
5/5. The inherited global cast floor remains red (expected 5, actual 6), unchanged and
not waived. Earlier actual npm-start release build, desktop saved-game load and loaded
canonical desktop_sim.cjs proof remain valid: the extension removes exclusive dev tools
and changes no desktop entry/build behavior. This is not full map-readiness or campaign
acceptance. Six original saves remain byte-identical; temporary fixture was removed.

One independent correction review covers final consumers, protocol clients and scope.
Final documentation checks and mandatory commit-hook typecheck receipts are
logs/bounded-deletion-cleanup/task7-final-docs-tests.log and task7-commit.log;
review and disposition are task7-review.log and task7-disposition.log. Task 8 is unstarted;
final R8 acceptance remains open. No campaign, dependency change, push or merge.
