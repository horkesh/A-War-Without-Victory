# RBiH 52-Week Remediation And Replay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status (2026-07-12): AGENT-ACTIONABLE WORK COMPLETE LOCALLY.** Workstreams A-E and the fresh exact-52 acceptance proof are supported by `rbih-52w-remediation-final-v47`: turn/max 52, 334 screenshots in 42 manually inspected contact sheets, HRHB/RBiH/RS control `85/255/372`, zero console/page/network diagnostics, no unresolved required blocker, no unlocated active combat formation, successful recruitment, Assisted autonomy, two Command Authority actions, 24 exact counter inspections, final stack-picker exact-member proof, explicit empty-category proof, and complete major-surface routing. The schema-2 comparator binds the Electron log/autosave and attributes its `0/+4/-4` delta from the controlled-player branch to 28 additional player inputs rather than nondeterminism. D2 owner play, packaging, release, commit, and push remain open or out of scope. Closeout report: `docs/40_reports/playtests/20260712_rbih_52w_remediation_replay.md`.

**Goal:** Close every agent-actionable release blocker and high-priority player-experience defect found by the 2026-07-11 RBiH 52-week desktop review, then prove the result with a fresh uninterrupted exact-52 campaign.

**Architecture:** Route every desktop mutation through the built `desktop_sim` boundary and persist it immediately. Introduce shared, typed read-model projections for decision disposition, operation lifecycle/history, casualties, sustainment, recruitment eligibility, and strategic priorities so all UI surfaces render the same truth. Enforce one major shell/one blocking modal and deterministic counter-stack selection. Use scenario and formation invariants as hard calibration gates rather than silently accepting invalid comparator output.

**Tech Stack:** Electron CJS main process, TypeScript simulation and read models, React, Zustand, MapLibre/Deck tactical map, Vitest, Playwright/Electron QA harness, Markdown canon/roadmap/ledger documentation.

**Constraints:** Local dirty workspace; preserve unrelated user changes. No staging, commits, pushes, PRs, packaging, release tagging, baseline re-floor, or FORAWWV edits. Every behavior change follows red-green TDD. Historical and calibration changes require canon and determinism review.

**Source finding report:** `docs/40_reports/playtests/20260711_rbih_52w_player_experience.md`

---

## Workstream A: Desktop Completion And Durable Decisions - P0

### Task A1: Built IPC dependency boundary

**Files:**
- Modify: `src/desktop/desktop_sim.ts`
- Modify: `src/desktop/electron-main.cjs`
- Test: `tests/desktop_persistence_contract.test.ts`
- Test: `tests/desktop_runtime_import_contract.test.ts` (new if no equivalent exists)

**Steps:**
1. Add a failing contract that scans desktop runtime imports and rejects source-relative `.js` targets absent from the deployed desktop-sim bundle.
2. Add failing tests for peace-plan, counter-offer, Dayton, event-notification, order-interpretation, and advisor functions on the built API.
3. Export the required functions from `desktop_sim.ts` and replace direct source-runtime imports in `electron-main.cjs`.
4. Run the desktop simulation build and focused tests.
5. Stop gate: week-40 Vance-Owen accept and reject return `ok:true` without a runtime bridge.

### Task A2: Immediate mutation persistence

**Files:**
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/state/game_state.ts` only if a disposition receipt type is required
- Test: `tests/desktop_persistence_contract.test.ts`
- Test: `tests/desktop_autonomy_boundary_truth.test.ts`

**Steps:**
1. Add failing tests proving proposal accept/reject, Command Authority levers, peace decisions, event decisions, recruitment, autonomy, reserve/officer decisions, and paramilitary policy call autosave after canonical state serialization.
2. Centralize `writeCanonicalCurrentState(..., { autosave: true })` semantics and use it for every mutating IPC handler.
3. Ensure every proposal ends with approve, decline, defer, or expiry provenance; prevent silent replacement of unresolved rows.
4. Add save/reload equality tests for proposal disposition, CA, decision logs, and operation state.
5. Stop gate: an interrupted and resumed decision transcript produces the same canonical state as uninterrupted execution.

### Task A3: Exact campaign harness and runtime telemetry

**Files:**
- Modify: `tmp-paradox-qa-20260710/paradox-local-qa.cjs`
- Test: syntax/self-checks in the harness

**Steps:**
1. Hard-fail unless `finalTurn === targetTurn` and no turn above target is observed.
2. Capture `pageerror`, failed IPC responses, visible error notices, HTTP `>=400`, and unexpected request aborts.
3. Require route parent-open success before tab/action assertions.
4. Add screenshot pixel/hash-change checks after route/tab selection.
5. Stop gate: incomplete week-40 runs cannot write a passing result.

### Task A4: One Vance-Owen decision and one durable receipt

**Files:**
- Modify: `src/sim/negotiation/peace_plans.ts`
- Modify: event/decision ownership only where required to consume the duplicate pending event
- Test: `tests/peace_plans.test.ts`
- Test: relevant event and presidential-blocker contracts

**Steps:**
1. Reproduce the simultaneous peace-plan dossier and `vance_owen_plan_1993` event blocker.
2. Make the peace-plan dossier the canonical owner of the accept/reject decision while retaining `ic_pressure_vopp_engagement` as a distinct posture decision.
3. On resolution, consume or synchronize the duplicate pending event and write exactly one chronological decision receipt without applying effects twice.
4. Verify accept and reject across save/reload and headless resolution.
5. Stop gate: Vance-Owen can never require two responses or remain blocking after its canonical decision succeeds.

## Workstream B: Reachable Player Agency - P0

### Task B1: Canonical recruitment eligibility and application

**Files:**
- Modify: `src/desktop/desktop_sim.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`
- Modify: `src/ui/map/desktop/types.ts`
- Modify: `src/ui/map/components/RecruitmentModal.tsx`
- Test: `tests/desktop_campaign_start_contract.test.ts`
- Test: `tests/desktop_recruitment_contract.test.ts` (new if needed)
- Test: `tests/ui/recruitment_modal_label_copy.test.ts`

**Steps:**
1. Extract/reuse one deterministic OSID-to-municipality/control projection for turn-phase and desktop recruitment.
2. Add failing tests showing a controlled, affordable fresh-campaign RBiH formation is eligible and recruits successfully.
3. Return eligibility and a stable reason code per catalog row; default the UI to eligible rows and expose ineligible explanations.
4. Persist recruitment immediately and verify formation, manpower, equipment, map location, and reload state.
5. Stop gate: at least one legal RBiH recruitment succeeds through real Electron.

### Task B2: Discoverable recruitment and autonomy controls

**Files:**
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/components/PresidentialToolbar.tsx`
- Modify: `src/ui/map/components/AutonomyPanel.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Test: `tests/ui/presidential_toolbar.test.ts` or nearest toolbar contract
- Test: `tests/ui/decision_surface_registry.test.ts`
- Test: `tests/autonomy_panel_player_faction_truth.test.ts`

**Steps:**
1. Add failing route tests for visible Army HQ/command controls that open Recruitment and Command Autonomy.
2. Mount `AutonomyPanel` in `App` under shared shell ownership.
3. Wire recruitment and autonomy controls with icons, tooltips, state summaries, and no hidden-scroll actions.
4. Ensure changing autonomy explains the one-turn delay and next-turn execution consequence.
5. Stop gate: a first-time route sweep reaches both systems in at most three interactions.

### Task B3: Reachable early RBiH strategic agency and Command Authority use

**Files:**
- Modify: `src/sim/combat/operation_opportunities.ts`
- Modify: RBiH operation/scenario data only where current architecture requires it
- Modify: `src/ui/map/data/operationOpportunityDossiers.ts`
- Test: `tests/operation_opportunities_phase2_decisions.test.ts`
- Test: `tests/ui/presidential_decision_room.test.ts`

**Steps:**
1. Make the existing turn-0 Request Operation command discoverable from the Army HQ/Decision Room flow; do not fabricate an early historical operation.
2. Present objective, command, commander, force, staging, cost, risk, expected benefit, expiry, and alternative whenever a staff plan is available.
3. Require a meaningful CA decision for author/request/force-launch paths and show the receipt and consequence.
4. Preserve Level 1 staff execution and player overrides.
5. Stop gate: the first 20 turns contain a visible, consequential RBiH military decision and CA cannot remain inert through actionable critical work.

### Task B4: Strategy-to-outcome and reserve-decision dossiers

**Files:**
- Modify: strategic objective and reserve-request read models/components identified during implementation
- Modify: relevant i18n copy
- Test: objective-status and reserve-decision component/read-model tests

**Steps:**
1. Show 2-4 RBiH strategic objectives with status, trend, responsible command, current commitment, next available lever, and the consequence of the last relevant decision.
2. Expand reserve requests with requesting command, recipient sector, candidate force, readiness, travel time, expected effect, and the position made weaker by release.
3. Link both surfaces to their canonical map/Army-HQ action owner rather than creating another independent decision.
4. Stop gate: at turns 1, 5, 10, and 20 a first-time player can identify the top strategic problem, the available intervention, and the observed consequence.

## Workstream C: One Campaign Truth - P0

### Task C1: Canonical operation lifecycle and archive projection

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Modify/create: shared operation lifecycle projection under `src/ui/map/data/`
- Modify: Army HQ Briefing/Summary/Records components and data adapters
- Modify: Chronicle operation generation
- Test: relevant Army HQ Records, Summary, Briefing, Chronicle, and adapter tests

**Steps:**
1. Add a fixture with 3 executing operations, 13 history rows, generated RBiH operations, and personnel activity.
2. Pin labelled counts for proposed, planning, executing, recovery, completed, and archived.
3. Make Briefing, Summary, Records, Chronicle, Inbox, and Decision Room consume the shared projection.
4. File every completed player operation exactly once or expose an explicit exclusion reason.
5. Stop gate: no false quiet state and no contradictory operation totals.

### Task C2: AAR causal invariants and release calibration validity

**Files:**
- Modify: operation AAR builder and operation-history writer identified during implementation
- Modify: scenario acceptance/calibration gate
- Test: operation AAR and scenario runner tests

**Steps:**
1. Add failing `Operation Prijedor`-shape tests: zero attacks cannot create combat captures; failure cannot receive a victory verdict; rating derives from the same receipts as outcome.
2. Build outcome, captures, verdict, grade, and prose from one causal receipt set.
3. Include generated player operations in archive/history ownership.
4. Fail release-calibration status when combat causality is invalid or invalid-operation count is nonzero, even if aggregate benchmarks pass.
5. Stop gate: the 52-week comparator has no contradictory AAR and is valid for combat calibration before it can be treated as authoritative.

### Task C3: Canonical casualty, sustainment, and manpower definitions

**Files:**
- Modify: shared campaign-summary projection under `src/ui/map/data/`
- Modify: Army HQ Summary and Personnel components/read models
- Modify: i18n copy
- Test: Summary/Personnel adapter and component tests

**Steps:**
1. Give every displayed metric a stable ID, period, denominator, and definition.
2. Reconcile cumulative K/W/M totals and clearly distinguish current-turn from campaign totals.
3. Include collapsed sustainment as a first-class severity alongside critical and strained.
4. Separate mobilized total, combat-effective fielded personnel, local defense, reserve, unarmed/unassigned, and exhausted manpower.
5. Stop gate: Summary, Personnel, raw state, and aftermath reconcile exactly for seeded and live fixtures.

## Workstream D: Surface Ownership, Readability, And Map Inspection - P1

### Task D1: One major shell, one blocking modal, one scroll owner

**Files:**
- Modify: `src/ui/map/App.tsx`
- Modify: shared shell/surface registry and modal stack utilities
- Modify: `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- Modify: event/paramilitary/peace-plan modals as required
- Test: shell ownership, modal stack priority, Decision Room flat contract, accessibility tests

**Steps:**
1. Add failing tests for incompatible shell closure/suspension and blocking-modal focus ownership.
2. Centralize major-shell opening and clear incompatible tactical/warroom overlays.
3. Give Decision Room and authorization modals one scroll container with sticky visible actions.
4. Preserve camera/selection context on close.
5. Stop gate: no click can target a covered surface and no required action is below an undiscoverable inner fold.

### Task D2: Readability and responsive overflow gate

**Files:**
- Modify: affected component styles and shared CSS/tokens
- Modify: `src/ui/map/components/CommandBriefingLayer.tsx`
- Test: UI contract tests and browser screenshot diagnostics

**Steps:**
1. Raise essential copy to 12px minimum and metadata to 10px minimum.
2. Replace translucent reading layers over bright imagery with contrast-safe surfaces.
3. Remove horizontal page overflow and clipped primary copy at 1366x768, 1920x1080, 2560x1440, and 125% scaling.
4. Make Command Briefing dock/collapse and avoid covering the tactical center.
5. Stop gate: zero essential clipping/contrast failures in screenshot diagnostics.

### Task D3: Counter stack picker, exact identity, and legend

**Files:**
- Modify: `src/ui/map/layers/formationCounterDomOverlay.ts`
- Modify: tactical map interaction/store components
- Create/modify: counter legend/stack popover component
- Test: `tests/ui_map_deck_counter_visibility.test.ts`
- Test: map stack/selection accessibility contracts

**Steps:**
1. Add failing tests proving a stack exposes every located member and a member click opens that exact formation.
2. Render deterministic stack count badges and a keyboard-accessible member picker.
3. Add a compact legend for faction, contact/known state, type, posture/readiness, and stack semantics.
4. Keep every located formation discoverable within two actions.
5. Stop gate: clicked identity always equals opened identity at turn 0 and turn 52.

### Task D4: Strategic priority aggregation

**Files:**
- Modify: command briefing/priority docket and Decision Room read models
- Test: priority docket and Decision Room tests

**Steps:**
1. Aggregate takeover timers by threatened municipality/front and keep raw pair counts in drilldown only.
2. Deduplicate persistent alerts and label new, worsening, stable, and acknowledged states.
3. Present no more than three `act now` priorities, each linked to its map context and applicable lever.
4. Stop gate: a deterministic first-time route test identifies the top two risks and reaches their action surface in three interactions or fewer.

### Task D5: Product and route truth

**Files:**
- Modify: launch/version copy and diplomacy route/read models
- Modify: Records and Chronicle labels/cross-links
- Test: version-copy, faction-route, and archival-ownership contracts

**Steps:**
1. Replace stale `Pre-Alpha` launch copy with the canonical application version.
2. Give patronless RBiH a truthful international/diplomatic route instead of implying a controllable patron system.
3. Define Records as the authoritative operational ledger and Chronicle as narrative campaign history, with explicit cross-links.
4. Reconcile opening/active/located formation labels so intentionally different counts expose their category definitions.
5. Stop gate: no visible version, route, archive, or force-count label contradicts the current state or product metadata.

## Workstream E: Formation, Enclave, And First-Year Invariants - P1

### Task E1: Active formation location invariant

**Files:**
- Modify: generated formation spawn/placement owner identified during implementation
- Test: formation lifecycle/scenario acceptance tests

**Steps:**
1. Add a failing turn-52 assertion that every active physical combat formation has a valid OSID; exclude intentionally non-spatial corps, army-HQ, and corps-asset records.
2. Place legal generated formations deterministically or reject/quarantine the spawn before it changes force totals.
3. Verify map counter discovery for all placed formations.
4. Stop gate: zero active unlocated combat formations in player and headless runs.

### Task E2: Year-one enclave and peace-history invariants

**Files:**
- Modify: scenario anchor/acceptance gates; behavior only if the failing gate exposes a real engine defect
- Test: scenario anchor and desktop/headless peace-history tests

**Steps:**
1. Add year-one survival assertions for Srebrenica, Zepa, Gorazde, and Bihac in player and valid headless corridors.
2. Keep enclave/fixed-home defenders inside their own enclave while preserving ordinary combat resolution; do not add scripted control immunity.
3. Reconcile Electron and headless Vance-Owen peace-history persistence and chronology. Responses need only match when the same player decision is injected.
4. Keep event-owned later enclave falls outside ordinary combat shortcuts.
5. Track Derventa as a separate capture/recruitment-timing calibration defect rather than weakening its historical anchor or coupling it to the enclave gate.
6. Stop gate: 52-week valid comparator passes every mandatory enclave and peace-history contract; any remaining Derventa miss is explicitly diagnosed and retained as an open calibration failure.

### Task E3: Derventa capture/recruitment timing calibration

**Files:**
- Modify only the causal combat, reinforcement, or recruitment owner identified by trace evidence
- Test: focused Derventa battle/control chronology and scenario-anchor tests

**Steps:**
1. Trace every Derventa battle, defender survival, control check, and 103rd Brigade activation through turn 52.
2. Identify whether the miss is combat occupancy, defender retreat/destruction, activation timing, or control precedence.
3. Correct the causal defect without scripted capture, anchor weakening, or global balance changes.
4. Stop gate: Derventa reaches its historical year-one controller through ordinary simulation receipts and the broader territorial corridor remains valid.

## Workstream F: Verification, Replay, And Truthful Closeout

### Task F1: Focused and broad verification

**Commands:**
- Focused red/green Vitest suites for each workstream.
- `npm.cmd run typecheck`
- `npm.cmd run qa:player-journeys`
- `npm.cmd run qa:first-hour:browser`
- `npm.cmd run qa:live-surface:browser`
- `npm.cmd run ci:structural-fingerprint:check`
- `npm.cmd run test:baselines`
- `npm.cmd run desktop:release:check`
- `git diff --check`

### Task F2: Fresh uninterrupted RBiH 52-week replay

**Steps:**
1. Build the final desktop simulation once.
2. Start a fresh RBiH campaign, not the prior save.
3. Exercise recruitment, autonomy, at least two CA levers, historical choices, proposals, Vance-Owen, Army HQ, Records, Chronicle, stack selection, and every distinct major surface.
4. Capture checkpoints at turns 0, 1, 2, 5, 10, 15, 20, 30, 40, and 52 plus every blocking/decision surface.
5. Compare exact turn-52 state to the valid headless corridor and report every attributed divergence.
6. Manually inspect all new contact sheets.
7. Stop gate: exact turn 52, no runtime intervention, no failed IPC, no unresolved required blocker, no unlocated active combat formation, reconciled records, readable screenshots, and valid comparator.

### Task F3: Documentation synchronization

**Files:**
- Modify: `docs/40_reports/playtests/20260711_rbih_52w_player_experience.md`
- Create: post-remediation replay report under `docs/40_reports/playtests/`
- Modify: `docs/40_reports/README.md`
- Modify: `docs/plans/COMMAND_BOARD.md`
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/plans/README.md`
- Modify: relevant canon/engineering docs
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `.claude/napkin.md` and topic archive only for durable runbook guidance

**Closeout rule:** Mark this plan complete only when all agent-actionable tasks and replay stop gates pass. Owner-only subjective fun validation remains separately identified, never used to hide an agent-detectable failure.

### 2026-07-12 Final Local Closeout Matrix

| Gate | Status | Evidence |
|---|---|---|
| Workstreams A-E local remediation | PASS | Focused/broad implementation proof summarized in the replay report |
| Fresh `final-v47` exact-52 replay | PASS | Exact turn/max 52; 334 screenshots; 42 manually inspected sheets; zero runtime diagnostics/blockers |
| Recruitment, autonomy, Command Authority | PASS | One successful recruitment, Assisted selected, two CA actions resolved |
| Exact map/route/readability tour | PASS | Two 12-counter tours, exact-member final stack proof, explicit empty-category proof, all major routes and deep dives, zero essential readability failures |
| Bound comparator | PASS as provenance/corridor evidence | Electron `85/255/372`; player `85/251/376`; headless `84/252/376`; 28 Electron-only actions explain expected input divergence, not nondeterminism |
| Resume robustness | PASS as supporting evidence | v34 resumed exact turn 52 with 98 screenshots and two exact counter/surface tours |
| D2 owner play / packaging / release / publication | OPEN or out of scope | Separate owner/operator authorization and evidence required |
