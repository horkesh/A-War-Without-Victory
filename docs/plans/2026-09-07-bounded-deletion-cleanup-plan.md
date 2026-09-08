# Bounded Deletion Cleanup Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one task at a time.

**Goal:** Remove the original four redundancies plus the repository audit's obsolete commands, tooling, UI and smoke engine without changing supported campaign behavior.

**Architecture:** Keep explicit event-definition injection, the canonical simulation pipeline, and existing navigation owners. Delete unused mechanisms before consolidating equivalent code; preserve optional no-event pipeline inputs explicitly at their boundary.

**Tech stack:** TypeScript, React, Vitest, Vite/Electron, Markdown.

**Date:** 2026-09-07
**Status:** Task 1 COMPLETE, reviewed GO (owner authorized 2026-09-08). Tasks 2–8 remain PLANNED.
**Owner lane / command-board row:** R8, subordinate cleanup packet; no new workstream or BC identifier.
**Phase covered:** R8 after R7; finish before final calibration/final packaged acceptance. Task 2 follows BC04/BC05 event settlement; Task 3 follows R7 and BC06 UI settlement. Other tasks may run on disjoint files while behavior work settles. Diagnostic calibration stays open.
**Current next action:** Task 1 is complete; Task 2 is next when separately scheduled.
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
The preceding receipt covers the original four-item draft only. Repository-wide extension planning checks (2026-09-07): documentation suites 9/9, exit 0; 163 local file links and 22 section anchors resolve; `git diff --check` exit 0. Evidence: `logs/repository-audit-planning/{docs-tests.log,links.json,anchors.json,diff-check.log}`. Independent Sol/medium review found one missing alias disposition; cleanup Task 5 now explicitly owns `test:ui` retirement/compatibility and its public documentation. No other material coverage, ordering, canon or validation issues were found. Implementation Task 1: COMPLETE, reviewed GO (2026-09-08); Task 2 COMPLETE, reviewed GO (2026-09-08); Task 3 implementation reviewed NO-GO for closeout pending required validation; Tasks 4–8 NOT STARTED.

At implementation closeout, update this evidence section with dispositions, files, command exit codes, log paths, UI branch coverage and any residual. Update `COMMAND_BOARD.md`, master §4.2 and the R8 controlling plan's packet status, then append `docs/PROJECT_LEDGER.md`. Put the implementation receipt in the existing R8 report if available; only if none fits, use one consolidated report under `docs/40_reports/implemented/`, not separate task reports. Update knowledge only for a new reusable lesson; no rating/backlog change is implied.

### Task 3 local evidence — 2026-09-08

Fast-forwarded local `main` from `223d97970` to reviewed Task 2 commit `cdc8659b1`. On isolated branch `codex/cleanup-pre-advance-routing`, compared all five target branches and consolidated `reviewPreAdvanceItem` into `reviewPreAdvanceTarget(item.navigationTarget)`. `openDecisionRoomTarget` remains separate. Only `src/ui/map/App.tsx` changed; no tests or strings added.

Named UI tests: 34 passed, 5 failed, exit 1; failures are existing recommended-count expectation mismatches in pre-advance/docket projections, with no navigation assertion failure. Typecheck passed, exit 0. Release build passed map build/chunk-cycle checks but stopped at the existing stale startup-snapshot gate after a source-read timeout; no artifact was regenerated. Evidence: `logs/bounded-deletion-cleanup/task3-ui-tests.log`, `task3-typecheck.log`, `task3-release-build.log`. Packaged Electron interaction was unavailable because the release build did not complete; no acceptance credit claimed.

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
