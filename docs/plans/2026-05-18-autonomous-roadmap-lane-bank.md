# Post-Batch 36 Autonomous Roadmap Lane Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:verification-before-completion before every handoff. Use superpowers:systematic-debugging for any failing test, runtime assertion, or scenario drift. Use superpowers:test-driven-development for every code lane.

**Goal:** Give Claude a substantial autonomous work bank after Batch 36: first make the branch merge-ready, then execute high-value roadmap/backlog lanes that are deterministic, testable, and not blocked by user-only design gates.

**Architecture:** Treat each batch below as an independent commit-sized lane. Prefer existing read models, adapters, and tests over new systems. Preserve simulation authority in engine code; UI lanes consume existing state. Every behavior/output lane must produce focused tests, docs propagation, ledger entry, and determinism proof when applicable.

**Tech Stack:** TypeScript, React, Vite, Vitest, scenario runner, existing diagnostics under `tools/diagnostics/`, existing 40w/188w proof flow. No new runtime dependencies unless an existing plan explicitly requires one and Codex approves during review.

**Date:** 2026-05-18.

---

## Hard prerequisites

Do not start any roadmap lane until the current branch is clean and Batch 36 has resolved the full fast-suite merge gate:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `git diff --check`

If `npm.cmd test` still fails, continue Batch 36 only. Do not bury merge-gate failures under later roadmap commits.

## Global rules for every batch

- Start with `git status --short --branch`. Stop if the tree contains unrelated dirty work.
- Inspect current disk state before trusting any report, memory, or previous claim.
- Add or update tests before implementation when changing behavior.
- Run the focused tests for the lane, then the shared validation ladder listed in the batch.
- For any simulation-output, scenario-output, serialization, ordering, or perf-labeled change, run 40w proof and consistency validation unless the lane is demonstrably docs/test-only.
- Update the relevant master docs and backlog ledgers only after validation.
- Create one implemented report per accepted batch under `docs/40_reports/implemented/`.
- Do not commit operator-only evidence, user-only decisions, or historian-sensitive prose as if it were implemented.

## Stop and ask triggers

Stop and hand control back to Codex/user if any of these occur:

- A sensitive-history operation newly delivers a capture/outcome not previously accepted.
- A task requires Open Design Questions ratification, FORAWWV Pyrrhic-panel sign-off, clean-VM proof, store/marketing publication, or playtest testimony.
- A lane would author sensitive real-person biographies or sensitive event prose without historian sign-off.
- A 40w or consistency hash changes outside a lane whose purpose is explicitly to change scenario output.
- The implementation requires relaxing canon, hidden-truth constraints, deterministic ordering, or player-knowledge boundaries.
- The only remaining work is micro-cleanup with no roadmap value.

---

## Batch 36 - Merge Gate Completion

**Objective:** Make the branch merge-ready by fixing the full fast-suite failures, not just focused suites.

**Context:** The current branch has repeatedly passed focused suites, baselines, typecheck, map build, and 40w consistency, but a full `npm.cmd test` run exposed stale fixture/schema failures. Do not merge until this lane is green.

**Likely files:**

- `tests/_helpers/`
- save migration and schema tests
- startup snapshot tests
- warroom/player visibility tests
- minimal game-state fixtures
- any code path genuinely revealed by the failing tests

**Implementation steps:**

1. Read the latest full test log or rerun `npm.cmd test` if no current log exists.
2. Classify failures into fixture drift, schema contract drift, behavior regression, and stale documentation expectation.
3. Fix fixture helpers centrally where possible. Avoid per-test hacks that hide the underlying schema contract.
4. Preserve state version and player-knowledge semantics; do not weaken validators to pass stale tests.
5. Rerun failed files first, then the full validation ladder.

**Validation:**

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:map:build`
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_MERGE_GATE_FAST_SUITE_BATCH36.md`
- Update `docs/PROJECT_LEDGER.md`, `.claude/napkin.md`, and any master doc whose contract changed.

---

## Batch 37 - Sector Split-Pieces Perf Probe and Safe Optimization

**Objective:** Attack the next measured sector hotspot: `enforceFinalSectorGeometryInvariants:split-pieces`, especially `splitNonContiguousSectors` BFS reuse and repeated normalization.

**Sources:**

- `docs/40_reports/SECTOR_MASTER.md`
- `docs/40_reports/audits/20260518_SESSION_CHECKPOINT_BATCHES_19_TO_32.md`
- `docs/40_reports/implemented/20260518_BATCH32_ENFORCE_FINAL_GEOMETRY_ATTRIBUTION.md`

**Likely files:**

- `src/sim/combat/sector_splitting.ts`
- `src/sim/combat/sector_rearrangement.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`
- `tests/sector_frontline_truth.test.ts`

**Implementation steps:**

1. Add or preserve perf labels so the lane can distinguish BFS reuse, normalization, and invariant enforcement.
2. Prove whether the same adjacency/BFS work is repeated across same-corps sectors.
3. If safe, cache or precompute only within a single deterministic call frame. Do not persist cross-run mutable caches.
4. If safe, avoid double-calling `normalizeSectorSubSegmentsFromEdges` on single-piece sectors.
5. If no safe optimization exists, commit the measurement/report only if it materially narrows the next target.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot`
- 40w profiled run with perf sidecar
- `node tools\validate_run_consistency.cjs <new-40w-run-dir>`
- Compare active 40w hash to baseline `b14179d65639860c`
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_SECTOR_SPLIT_PIECES_PERF.md`
- Update `docs/40_reports/SECTOR_MASTER.md`, `docs/PROJECT_LEDGER.md`, and backlog queue status.

---

## Batch 38 - Serialization Redundant Week-39 Write Cleanup

**Objective:** Remove or narrow redundant serialization work only where proof shows final artifacts are unchanged.

**Source:** Batch 33 attribution found a likely overwritten in-loop week-39 write in `src/scenario/scenario_runner.ts` near the replay sequence write, later superseded by post-reconciliation serialization.

**Likely files:**

- `src/scenario/scenario_runner.ts`
- `tests/serialization_attribution_contract.test.ts`
- scenario artifact tests if an existing suite covers replay/save output

**Implementation steps:**

1. Trace the week-39 in-loop replay/save writes and the post-reconciliation write.
2. Write a test or diagnostic proving which artifact is overwritten and which one is externally observed.
3. Remove only redundant serialization, or move it behind an already-existing guard, preserving artifact paths and final bytes.
4. Keep serialization attribution labels accurate.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/serialization_attribution_contract.test.ts --reporter=dot`
- `npm.cmd run test:baselines`
- 40w run and consistency validation if scenario artifacts are touched
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_SERIALIZATION_WEEK39_CLEANUP.md`
- Update `docs/40_reports/GAME_STATE_RATING_MASTER.md`, `docs/PROJECT_LEDGER.md`, and backlog queue status.

---

## Batch 39 - Strict Null Phase 3 Safe Early-War Slice

**Objective:** Continue strict-null migration into Phase 3 without reopening Phase 2 long-tail churn.

**Source:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`

**Allowed first slice:**

- `src/sim/bot/simple_general_bot.ts`
- Low-conflict files under `src/sim/early_war/`

**Avoid initially:**

- `src/sim/early_war/alliance_update.ts`
- `src/sim/turn_phases/war_phases.ts`

These are higher-conflict and should wait until the first safe Phase 3 slice is clean.

**Implementation steps:**

1. Run the strict-null inventory/progress test and record current Phase 3 counts.
2. Remove only local, type-safe escapes where the runtime invariant is already established.
3. Prefer typed helpers and existing schema types over casts.
4. Update inventory expectations only after code actually removes escapes.
5. Stop if a cast is preserving unmodeled save-shape uncertainty.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot`
- Focused early-war/bot suites discovered by `rg`
- 40w hash proof if any sim behavior can change
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_STRICT_NULL_PHASE3_SAFE_SLICE.md`
- Update strict-null plan, ledger, and backlog queue.

---

## Batch 40 - Commander Supply Visibility Read-Model Lane

**Objective:** Raise the Supply rating by surfacing existing supply truth in commander briefing and Decision Room warnings without inventing new simulation authority.

**Source:** `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 8.

**Likely files:**

- commander briefing/read-model files under `src/sim/combat/commander/`
- `src/ui/shared/operational_sitrep_views.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- existing Supply panel or map-mode components
- tests covering supply briefing, sitrep views, and Decision Room packets

**Implementation steps:**

1. Identify existing supply truth fields, including `supply_by_osid` and supply-condition summaries.
2. Add a compact commander-facing projection: corridor at risk, isolated/low-supply formations, and stale/unknown markers if data is absent.
3. Surface the projection in the Decision Room "Inspect Next" or commander briefing flow.
4. Do not create hidden-truth leaks: player-facing text must be based on player-known or already exposed read models.
5. Add tests for populated, empty, and unknown supply cases.

**Validation:**

- `npm.cmd run typecheck`
- Focused supply/briefing/Decision Room tests
- `npx.cmd vitest run tests/ui_shell_navigation.test.ts --reporter=dot`
- 40w hash proof if sim/read-model output affects scenario artifacts
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_SUPPLY_VISIBILITY_READ_MODEL.md`
- Update `docs/40_reports/GAME_STATE_RATING_MASTER.md`, `docs/40_reports/GUI_MASTER.md`, and ledger.

---

## Batch 41 - Decision Room Pushback Explanation Lane

**Objective:** Promote existing Army CO pushback evidence into the Decision Room flow so blocked or resisted actions explain themselves before the player clicks through.

**Source:** `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 3.

**Likely files:**

- existing `ArmyCoPushbackPanel` component and tests
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `tests/a5_army_co_pushback_ui.test.ts`
- Decision Room UI tests

**Implementation steps:**

1. Audit existing pushback/readiness packet ownership.
2. Reuse that packet in Decision Room; do not create a second owner.
3. Add compact "why this is blocked/resisted" rows for the next actionable decision.
4. Add aria labels and keyboard focus coverage for the new controls.
5. Test blocked, warning, and no-pushback cases.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/a5_army_co_pushback_ui.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_DECISION_ROOM_PUSHBACK_EXPLANATIONS.md`
- Update GUI and Game State rating masters.

---

## Batch 42 - GUI Playtest P0 Remainder: D1 and D2

**Objective:** Close the highest severity GUI playtest defects: advance-turn blocked feedback, panel error boundary isolation, and Deck.gl polygon assertion fixes.

**Source:** `docs/plans/2026-05-16-gui-playtest-defects-plan.md`

**Scope:**

- Track D1: primary-action feedback and error boundary.
- Track D2: Deck.gl polygon overlay assertion fixes.

**Implementation steps:**

1. Re-read D1 and D2 in the GUI playtest plan.
2. For D1, implement visible blocked-action feedback and panel-level error isolation using existing pre-advance review truth.
3. For D2, find the invalid polygon source and fix it at source if possible; add deterministic builder guards as defense.
4. Add tests before implementation for both the blocked action and invalid-coordinate cases.
5. Use browser/Playwright evidence if a local map target is available.

**Validation:**

- `npm.cmd run typecheck`
- New/updated D1/D2 UI tests
- `npx.cmd vitest run tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- Browser or Playwright screenshot/console evidence for overlay assertion closure if practical
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_GUI_PLAYTEST_P0_D1_D2.md`
- Update GUI playtest report, GUI master, roadmap, and ledger.

---

## Batch 43 - Endgame Mobile Verdict Subdivision

**Objective:** Improve endgame report readability on small screens without changing scoring, verdict selection, or scenario output.

**Source:** `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 15.

**Likely files:**

- verdict/endgame components under `src/ui/map/components/`
- existing verdict tests
- visual capture docs if present

**Implementation steps:**

1. Locate the current long faction report rendering.
2. Split long mobile sections into smaller scannable blocks or collapsible groups using existing verdict data.
3. Preserve desktop information density.
4. Add tests for score/value preservation and mobile section presence.
5. Capture build/browser proof if practical.

**Validation:**

- `npm.cmd run typecheck`
- Focused verdict/UI tests
- `npm.cmd run desktop:map:build`
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_ENDGAME_MOBILE_VERDICT_SUBDIVISION.md`
- Update Game State and GUI masters.

---

## Batch 44 - Onboarding First-Session Evidence and Legacy Orientation Retirement

**Objective:** Convert onboarding row 24 from stale uncertainty into proved current behavior, and retire dormant legacy orientation only if compatibility imports/tests are migrated.

**Source:** `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 24.

**Likely files:**

- onboarding/orientation components under `src/ui/map/components/`
- `tests/z_index_canonical.test.ts`
- first-run/onboarding UI tests
- browser evidence report

**Implementation steps:**

1. Browser-run the first-session path if possible and record what actually appears.
2. Search all references to the legacy orientation component.
3. If it is truly dead, migrate compatibility tests to current onboarding surfaces and delete the dead component.
4. If still used, update docs with the real owner and add missing tests instead.
5. Do not remove onboarding affordances without replacement coverage.

**Validation:**

- `npm.cmd run typecheck`
- Focused onboarding/z-index/UI tests
- `npm.cmd run desktop:map:build`
- Browser evidence if practical
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_ONBOARDING_FIRST_SESSION_EVIDENCE.md`
- Update GUI and Game State masters.

---

## Batch 45 - Accessibility RC Browser Evidence

**Objective:** Add the optional browser/axe-style spot-check evidence that remained after Accessibility P0 static closeout.

**Source:** Accessibility P0 closeout reports and `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 40.

**Scope:** Verification-first. Code changes only if the browser evidence finds a concrete P0 regression.

**Implementation steps:**

1. Run current static accessibility tests.
2. Build or launch the map UI.
3. Perform browser spot checks for keyboard focus, reduced motion, labels, contrast-critical surfaces, and clickable controls.
4. If a concrete regression appears, fix it with focused tests.
5. Otherwise write a verification-only implemented report.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/ui/accessibility_clickable_controls.test.ts tests/ui/accessibility_contrast_tokens.test.ts tests/ui/accessibility_reduced_motion.test.ts tests/ui/accessibility_form_labels.test.ts tests/v093_a11y_lane_e_forms_live_regions.test.ts tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- Browser evidence artifacts if practical
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_ACCESSIBILITY_RC_BROWSER_EVIDENCE.md`
- Update GUI master, Game State master, and ledger.

---

## Batch 46 - Chronicle Synthetic War-Termination Chapter

**Objective:** Close the remaining chronicle chapter-boundary gap only if it is a deterministic presentation projection from existing termination state.

**Source:** Batch 35 remaining-open list.

**Likely files:**

- chronicle chapter builder files
- chronicle chapter tests
- endgame/verdict report projection if needed

**Implementation steps:**

1. Inspect current chapter boundary implementation and tests.
2. Confirm the only missing case is synthetic war termination, not a canon decision.
3. Add a test for end-of-war chapter emission using existing termination state.
4. Implement the smallest deterministic projection.
5. Stop if the task requires new narrative interpretation or sensitive-history outcome wording.

**Validation:**

- `npm.cmd run typecheck`
- focused chronicle chapter tests
- endgame/verdict tests if touched
- 40w proof if scenario artifacts change
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_CHRONICLE_WAR_TERMINATION_CHAPTER.md`
- Update chronicle/GUI/Game State docs as relevant.

---

## Batch 47 - H1 Watched-Operation Visibility Tasks 1-3

**Objective:** Execute only the diagnostic/reporting visibility parts of H1 watched-operation outcome work.

**Source:** `docs/plans/2026-05-17-h1-watched-operation-outcome-plan.md`

**Allowed scope:**

- Task 1 watched-operation trace fixture
- Task 2 catalog injection trace
- Task 3 AAR/report visibility

**Forbidden autonomous scope:**

- Task 4 outcome acceptance if a sensitive operation newly delivers a capture.
- Any balance retune, precondition relaxation, OOB edit, or canon change.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts tests/triggered_operations_late_1995.test.ts tests/operation_launch_feasibility_defender_aware.test.ts --reporter=dot`
- report-contract tests added by the lane
- 188w scenario proof only for diagnostic/reporting validation; stop if outcome changes need sign-off
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_H1_WATCHED_OPERATION_VISIBILITY.md`
- Update engine health audit, backlog queue, and ledger.

---

## Batch 48 - Notification Sensitive-Content Review Prep

**Objective:** Prepare the remaining event-notification content for review without authoring unsafe fallback prose.

**Source:** `docs/plans/2026-05-18-event-notification-sensitive-content-review-plan.md`

**Allowed autonomous scope:**

- Inventory remaining rows/blocks.
- Classify safe, sensitive, historian-required, and blocked content.
- Add tests that prevent generic fallback prose or hidden-truth leakage.
- Implement only non-sensitive rows if the plan clearly authorizes them and sources are already present.

**Stop gates:**

- Stop before writing sensitive atrocity, detention, named-person, or casualty prose without historian sign-off.
- Stop if a notification would reveal hidden truth not available to the player.

**Validation:**

- `npm.cmd run typecheck`
- focused notification/content tests
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_NOTIFICATION_SENSITIVE_REVIEW_PREP.md`
- Update notification backlog and ledger.

---

## Batch 49 - Non-Code Historical Content Roster Locks

**Objective:** Convert open historical-content uncertainty into reviewable rosters, not final prose.

**Scope:**

- Officer mini-bios sensitive-personnel roster lock.
- 13 missing 1992 essays roster lock.

**Allowed autonomous scope:**

- Produce audit tables with names/topics, source gaps, sensitivity flags, and required reviewer role.
- Add docs-only reports.
- Update backlog to show exactly what remains gated.

**Forbidden autonomous scope:**

- Do not write final bios for sensitive personnel.
- Do not write final essays for sensitive events without historian sign-off and citations.

**Validation:**

- `git diff --check`
- docs-only ledger handling

**Docs:**

- Implemented report: `docs/40_reports/audits/YYYYMMDD_HISTORICAL_CONTENT_ROSTER_LOCKS.md`
- Update backlog queue, ledger, and napkin if the gating rule is recurring.

---

## Batch 50 - BCS Localization Extraction Audit

**Objective:** Advance localization from first-pass coverage toward a controlled extraction plan and terminology review.

**Allowed autonomous scope:**

- Inventory hard-coded player-facing strings in high-traffic UI surfaces.
- Identify existing localization tables and gaps.
- Add tests or diagnostics that measure extraction coverage.
- Create a terminology review checklist for later human review.

**Forbidden autonomous scope:**

- Do not claim translation quality without native/historian review.
- Do not mass-rewrite strings across the UI in one unreviewable pass.

**Validation:**

- `npm.cmd run typecheck` if code/tests changed
- focused localization tests/diagnostics
- `git diff --check`

**Docs:**

- Implemented report: `docs/40_reports/implemented/YYYYMMDD_BCS_LOCALIZATION_EXTRACTION_AUDIT.md`
- Update Game State/GUI masters and ledger.

---

## Batch 51 - Strict Null Phase 2 Long-Tail Mini-Lanes

**Objective:** Only after sector perf work, pick off high-confidence strict-null long-tail escapes that have a real owner.

**Source:** `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md`

**Candidate order:**

1. `corps_front_sectors:perf-instrumentation-tightening`
2. `predictAllAdjacentTargets` reverse-map optional refactor plan
3. `sector_offensive.ts` dedicated conflict-aware lane

**Rules:**

- Do not reopen the Phase 2 "safe-scope closed" conclusion.
- Do not touch movement-state/save-shape casts unless a schema default lane exists.
- Treat each candidate as its own small commit if it proceeds.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot`
- focused sector/offensive tests for touched files
- 40w proof for behavior-risky files
- `git diff --check`

**Docs:**

- Implemented report per mini-lane.
- Update strict-null plan and ledger.

---

## Batch 52 - Operator Evidence Support Only

**Objective:** Support, but do not claim, operator-only launch evidence.

**Operator-only items:**

- Clean-VM packaging proof
- External playtest testimony
- Store/marketing publication
- Trailer/press outreach
- FORAWWV Pyrrhic-panel sign-off
- Open Design Questions ratification

**Allowed autonomous scope:**

- Refresh stale templates.
- Add checklist scripts that do not fabricate evidence.
- Improve docs explaining exactly what the operator must run.

**Forbidden autonomous scope:**

- Do not mark operator evidence complete.
- Do not generate fake playtest, store, press, or clean-VM proof.

**Validation:**

- Docs-only `git diff --check`, or relevant script tests if scripts are changed.

**Docs:**

- Implemented or audit report that clearly states "support-only, evidence not complete."

---

## Ready-to-paste autonomous Claude prompt

### 1. Role and objective

You are continuing the AWWV branch `codex/execute-2026-05-17-plans` as an autonomous implementation worker. Use superpowers:executing-plans and follow `docs/plans/2026-05-18-autonomous-roadmap-lane-bank.md`.

Your first job is Batch 36. Do not start later roadmap work until the full fast suite is green:

- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run test:baselines`
- `git diff --check`

If Batch 36 is already green on disk, proceed through the lane bank in order. Each batch should be a coherent commit-sized unit with tests, docs, implemented report, and handoff. Do not do tiny micro-tasks.

### 2. Canon references

Read the relevant plan/report before each batch:

- `docs/plans/2026-05-18-autonomous-roadmap-lane-bank.md`
- `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md`
- `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- `docs/40_reports/GUI_MASTER.md`
- Batch-specific source docs listed in the lane.

### 3. Determinism and ledger constraints

Preserve active 40w hash `b14179d65639860c` unless the batch explicitly intends scenario-output change and Codex/user accepts it. For behavior/output lanes, run 40w and `node tools\validate_run_consistency.cjs <run-dir>` when applicable. Update `docs/PROJECT_LEDGER.md`, the relevant master docs, and `.claude/napkin.md` only after tests pass.

### 4. STOP AND ASK triggers

Stop if a sensitive-history outcome newly delivers, a user-only design gate is needed, a historian-sensitive content task lacks sign-off, a 40w hash changes unexpectedly, or a lane would require hidden-truth leakage/canon relaxation. Do not dispatch HRHB patron directive scope as code unless the user explicitly overrides the design-selection gate.

### 5. Output format and validation

For each completed batch, report:

- dirty-file list before commit
- exact files changed
- exact commands run and pass/fail results
- 40w/consistency proof where applicable
- docs/ledger updates
- commit hash if committed, or explicit "not committed"
- remaining blockers and next recommended batch
