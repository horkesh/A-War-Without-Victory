# RS 52-Week Canon And Player-Experience Audit Implementation Plan

> **For Codex:** REQUIRED SUB-SKILLS: use `scenario-report`, `orchestrator`, `canon-compliance-review`, `modern-wargame-expert`, `qa-engineer`, `systematic-debugging`, `test-driven-development`, and `verification-before-completion`.

**Goal:** Prove that a fresh RS desktop campaign remains playable, truthful, legible, deterministic, and canon-compliant through exact week 52; correct every agent-actionable defect found; then repeat the campaign and publish truthful local evidence.

**Architecture:** Treat canon as an observable contract rather than a prose checklist. Bind every hard rule to state evidence, a visible player surface, or an automated invariant; use the existing Electron/Playwright campaign harness for the real player path and bind it to a controlled-player/headless comparator. Preserve RBiH v47 as a cross-faction comparison set, and repair only root causes established by evidence.

**Tech Stack:** Electron CJS, TypeScript simulation/state, React, MapLibre/Deck tactical map, Playwright Electron automation, Vitest, scenario/calibration tooling, Markdown reports.

**Constraints:** Work only in the existing dirty local workspace. Preserve all prior user and agent changes. Do not stage, commit, push, open a PR, package, tag, publish, or edit `docs/10_canon/FORAWWV.md`. Every product behavior change requires a failing regression test first. Do not re-floor calibration merely to hide a mismatch.

**Comparison evidence:** `rbih-52w-remediation-final-v47`, its bound autosave/comparator, 334 screenshots, and 42 manually reviewed contact sheets.

---

## Task 1: Canon-To-Observable Acceptance Matrix

**Read:**
- `docs/10_canon/CANON.md`
- `docs/10_canon/Engine_Invariants_v0_9_0.md`
- `docs/10_canon/Phase_Specifications_v0_9_0.md`
- `docs/10_canon/War_Specification_v0_9_0.md`
- `docs/10_canon/Systems_Manual_v0_9_0.md`
- `docs/10_canon/Rulebook_v0_9_0.md`
- `docs/10_canon/Game_Bible_v0_9_0.md`
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md`
- `docs/10_canon/context.md`
- `docs/10_canon/HISTORICAL_TIMELINE_MASTER.md`
- `docs/10_canon/PLAYER_TURN_GUIDE.md`
- `docs/10_canon/WAR_TERMINATION_SPEC.md`
- `docs/10_canon/FORAWWV.md` as read-only canon extension context

**Steps:**
1. Record each campaign-relevant hard rule with source line, observable state/surface, expected week range, and proof owner.
2. Separate hard canon, historical corridor, player-facing promise, and design inference.
3. Include determinism, OSID control, formation location, operations/AAR causality, paramilitary boundaries, recruitment/autonomy, command friction, persistence, sensitive-history wording, negotiation, and judgment/non-goals.
4. Flag contradictions or missing ownership rather than silently choosing a lower-precedence document.
5. Stop gate: every campaign-relevant canon section has a state, UI, test, or explicit not-in-52-week-scope disposition.

## Task 2: Harness Integrity Before Product Judgment

**Files:**
- Inspect/modify: `tmp-paradox-qa-20260710/paradox-local-qa.cjs`
- Test: `tests/paradox_local_qa_harness.test.ts`

**Steps:**
1. Run the current harness contract test and compare the current harness SHA-256 with accepted RBiH v47 provenance.
2. Add a failing test for any missing RS route, exact selector, screenshot freshness, state/hash immutability, readiness, target-turn, or swallowed-error gate.
3. Implement only the minimal harness correction needed to make the test pass.
4. Re-run the harness contract and syntax check.
5. Stop gate: a label cannot pass unless the claimed visible destination is mounted, screenshots are fresh, map state matches the loaded turn/save fingerprint, diagnostics are clean, and final inspection leaves state/autosave hashes unchanged.

## Task 3: Fresh RS Exact-52 Discovery Campaign

**Artifacts:**
- Create a unique RS JSON log, live progress, readability output, net log, autosave, and screenshots under `tmp-paradox-qa-20260710/`.

**Steps:**
1. Build `desktop_sim` and the tactical/Warroom desktop surfaces from the current tree.
2. Start a dedicated tileless Vite tactical host on an unused localhost port and verify readiness.
3. Launch a fresh RS campaign with `--strategic --auto-recruit --require-recruitment --live-events --light-checkpoint-tour --final-checkpoint-tour` and target turn 52.
4. Exercise Assisted autonomy, recruitment, at least two Command Authority actions, historical operation decisions, staff proposals, paramilitary policy, negotiations, Army HQ, Decision Room, Records, Chronicle, Codex, diplomacy/intelligence/faction routes, exact formation selection, real stacks, map areas, and every blocking modal.
5. Capture opening proof, every decision/blocker, turns 1/2/5/10/15/20/30/40/52, and the complete final tour.
6. Stop gate: exact target/final/max turn `52/52/52`, zero console/page/network/runtime failures, zero unresolved required decisions/proposals/paramilitary requests, zero unlocated active physical combat formations, and immutable pre/post final-tour state.

## Task 4: Exhaustive Manual And Comparative Review

**Steps:**
1. Generate contact sheets with a deterministic manifest for every RS screenshot.
2. Manually inspect every sheet and open every ambiguous frame at original resolution.
3. Re-open the relevant RBiH v47 sheets for every cross-faction finding; do not rely only on the prior PASS summary.
4. Check readability, clipping, contrast, scroll/action visibility, route ownership, duplicate cards/reports, misleading labels/counts, exact counter identity, stack discoverability, feedback, consequence clarity, strategic priorities, agency, sensitive-history framing, and pacing/fun.
5. Bind the RS log/autosave to controlled-player and headless branches. Attribute input differences; do not label divergence nondeterminism without identical inputs and starting state.
6. Compare opening/final control, formation totals/location, operation lifecycle/AAR, recruitment, losses/displacement, supply/exhaustion, enclave/Posavina/Drina/Sarajevo anchors, and Vance-Owen history against canon and calibration.
7. Stop gate: every image has a review disposition and every quantitative or historical claim cites an artifact or canon source.

## Task 5: Findings And Test-First Remediation

**Steps for each finding:**
1. Classify severity, affected factions, canon source, player impact, reproduction, and root-cause owner.
2. Reproduce the defect on the smallest real state/surface.
3. Write one failing regression test and run it to confirm the expected failure.
4. Implement the minimal root-cause fix without unrelated refactoring.
5. Run the focused test to green, then the full relevant shared-surface suite.
6. Re-run the affected desktop interaction and inspect a fresh screenshot.
7. Record calibration impact; accept baseline movement only when canon requires the changed output and causality is proven.
8. Stop gate: no verified agent-actionable defect remains merely documented.

## Task 6: Fresh Post-Fix RS Acceptance Replay

**Steps:**
1. Rebuild all changed runtime surfaces.
2. Start a new RS campaign from the canonical startup snapshot; do not resume the discovery save.
3. Repeat Task 3 with a new unique run label and no runtime intervention.
4. Generate and manually inspect all new contact sheets.
5. Generate a newly bound comparator from the exact acceptance log/autosave.
6. Repeat until all hard gates pass; failed/diagnostic runs remain lineage evidence, never acceptance evidence.

## Task 7: Verification And Documentation Truth

**Commands:**
- Focused Vitest suites with `NODE_OPTIONS=--throw-deprecation`
- `npm.cmd run typecheck`
- `npm.cmd run qa:player-experience`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run ci:structural-fingerprint:check`
- full current-tree Vitest suite with deprecations treated as errors
- `git diff --check`

**Documents:**
- Create the RS discovery/final report under `docs/40_reports/playtests/`.
- Update `docs/40_reports/README.md`, `CALIBRATION_MASTER.md`, and `GUI_MASTER.md` with local evidence only.
- Update `docs/plans/COMMAND_BOARD.md`, `MASTER_ROADMAP.md`, and `README.md`.
- Update `docs/00_start_here/docs_index.md` and relevant engineering contracts only if behavior/contracts changed.
- Append a truthful entry to `docs/PROJECT_LEDGER.md`; update `PROJECT_LEDGER_KNOWLEDGE.md` and napkin only for durable lessons.

**Final stop gate:** independent canon, QA, player-experience, historian/formation, determinism, and process reviews report no unresolved agent-actionable issue. D2 owner play and all release/remote actions remain separately open unless the owner explicitly authorizes them.

---

## Execution Closeout - 2026-07-15

**Status: COMPLETE for all agent-actionable local work.** The acceptance report is [20260714_rs_52w_canon_player_experience.md](../40_reports/playtests/20260714_rs_52w_canon_player_experience.md).

| Task | Disposition |
|---|---|
| 1. Canon-to-observable matrix | Completed through exact event anchors, formation/location, blocker, operation/AAR, paramilitary-defense, command-model, persistence, and sensitive-history checks in the report |
| 2. Harness integrity | Completed; fingerprinted harness, canonical autosave receipts, exact route/stack assertions, current-map readiness, hash immutability, strict stderr, and 38 harness tests |
| 3. Fresh RS discovery | Completed through diagnostic v11 and targeted follow-up replays; defects were not promoted as acceptance evidence |
| 4. Manual/comparative review | Completed; all 468 v17 screenshots reviewed in 59 sheets, ambiguous frames opened at original resolution, RBiH v47 used as a bounded UX comparison |
| 5. Test-first remediation | Completed for proposal lifecycle, reserve deployment/matching, map/Army HQ/Decision Room truth, and long-event sticky action; obsolete retired-API test removed rather than restored |
| 6. Fresh post-fix acceptance | Completed on uninterrupted `rs-52w-canon-player-experience-final-v17`; targeted v18 separately proves the sticky event action without replacing v17 calibration evidence |
| 7. Verification/docs truth | Completed when the final verification table and ledger entry below are populated; local-only boundary remains binding |

Acceptance evidence: exact turn/max `52/52`, 468 screenshots, 59/59 sheets inspected, HRHB/RBiH/RS `87/266/359`, zero console/page/network/unexpected-stderr diagnostics, zero final blockers, zero unlocated active combat formations, and stable final state/autosave hashes. The bound comparator ends Electron `87/266/359`, controlled player `87/265/360`, and headless `87/264/361`, attributing seven Electron-only inputs as expected path divergence with `nondeterminism_claimed: false`.

The remaining gates are deliberately external or future scope: D2 owner play, authored/canon-reviewed mid/late campaign-content expansion, D3/D4 release operation, packaging, publication, commits, pushes, PRs, and remote CI. None is claimed complete by this local plan.
