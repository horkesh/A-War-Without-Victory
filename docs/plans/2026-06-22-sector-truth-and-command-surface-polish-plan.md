# Sector Truth And Command Surface Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the next layer of first-hour command-surface confusion by making sector, brigade, corps, and decision-room surfaces tell the same player truth.

**Architecture:** Keep this lane UI/read-model first unless an audit proves sector generation itself is wrong. Use shared helpers for repeated player-facing truth rules, pin every visible correction with focused tests, and only escalate into simulation/calibration if the startup sector data is invalid rather than merely mispresented.

**Tech Stack:** React/TypeScript tactical-map UI, Zustand game store, Vitest/jsdom focused UI tests, Puppeteer live browser QA, existing i18n keys.

---

## Current Recommended Queue

### Task 1: Sector Coverage Truth

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_SECTOR_COVERAGE_TRUTH_ALIGNMENT.md`.

**Files:**
- Modify: `src/ui/map/utils/sectorUtils.ts`
- Modify: `src/ui/map/components/OOBSidebar.tsx`
- Modify: `src/ui/map/components/CorpsDetail.tsx`
- Test: `tests/ui/oob_drilldown_routing.test.ts`
- Test: `tests/ui/corps_detail_sector_truth.test.ts`

**Steps:**
1. Write failing tests for OOB and Corps Detail where a sector has `density > 0` but no current frontline, reserve, or command-directed formations.
2. Run the focused tests and confirm they fail by showing `Held coverage` or `Dense coverage`.
3. Add a shared sector coverage helper that takes current assignment, not just density.
4. Update OOB and Corps Detail to use the shared helper.
5. Re-run the focused tests and typecheck.

**Acceptance:** An uncovered command slice reads as uncovered/no friendly line wherever sector coverage is shown, while staffed sectors keep density-derived thin/held/dense wording.

**Evidence:** Red tests reproduced OOB and Corps Detail showing dense coverage for zero-formation sectors. Green proof: `node node_modules\vitest\vitest.mjs run tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts --pool=forks --reporter=dot` passed 4/4, adjacent command-surface pack passed 24/24, `npm.cmd run typecheck` passed, and `npm.cmd run qa:live-surface:browser` passed with temp evidence cleaned. Startup audit counted 70 zero-assignment sectors in `data/derived/startup/apr_1992_initial_save.json` (RBiH 35, HRHB 21, RS 14), so the remaining deeper question is a separate sector-builder/data audit, not a blocker for this UI truth fix.

### Task 2: Ops Modal Player-Surface Hardening

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_OPS_AND_COMMAND_SURFACE_POLISH.md`.

**Files:**
- Audit first: `src/ui/map/components/ops_modal/**`
- Likely tests: `tests/ui/oob_operations_panel.test.ts`, `tests/ui/ops_planning_target_discovery.test.ts`

**Steps:**
1. Sweep op authorization, staging, G2 prediction, and briefing surfaces for raw validation/system copy.
2. Pin any exposed OSID, raw step label, or diagnostic phrase with focused tests.
3. Replace with existing player-safe settlement, phase, and recommendation helpers.

**Acceptance:** Operation planning reads like staff work, not validation output.

**Evidence:** G-2 prediction failures now render localized staff copy instead of raw IPC/engine diagnostics; Plan staging displays the settlement name rather than raw staging OSID; the modal phase rail is i18n-backed; Authorize eligibility findings map to player-safe copy; G-2 proceed is disabled while loading/awaiting assessment. Green proof included in the final combined command-surface pack: `node node_modules\vitest\vitest.mjs run tests\ui\ops_planning_target_discovery.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 74/74.

### Task 3: Army HQ And OOB Command Copy Cleanup

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_OPS_AND_COMMAND_SURFACE_POLISH.md`.

**Files:**
- Audit first: `src/ui/map/components/army_hq/**`, `src/ui/map/components/OOBSidebar.tsx`, `src/ui/map/components/CorpsDetail.tsx`

**Steps:**
1. Sweep officer descriptors, OOB operation objective labels, corps-card count labels, ORBAT footer sector labels, and Army Reserve HQ display names.
2. Add focused label-discipline tests for each confirmed leak.
3. Prefer existing localized/player-safe helpers over new one-off string assembly.

**Acceptance:** Corps/brigade command surfaces are internally consistent and free of shorthand or ambiguous staff abbreviations.

**Evidence:** OOB and Corps Detail objective progress now shows one-based player progress; Corps Front logistics includes command-directed override brigade manpower; Corps Front metadata separates calendar date from numeric turn; Formation Detail sector picker counts use projected current brigade assignments; Army HQ corps cards and ORBAT expanded brigade rows convert equipment condition fractions into operational equipment counts; Army HQ cards label planning-only operations explicitly. Green proof included in the final combined command-surface pack: `node node_modules\vitest\vitest.mjs run tests\ui\ops_planning_target_discovery.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 74/74.

### Task 4: Records And Decision Room Provenance Consistency

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_RECORD_PROVENANCE_AND_LIVE_SWEEP_HARDENING.md`.

**Files:**
- Audit first: `src/ui/map/data/presidentialCategories.ts`, `src/ui/map/components/DecisionRoom*`, Records/Chronicle adapters.

**Steps:**
1. Verify every count/action that references records uses the narratable filed-record guard.
2. Pin any turn-zero setup or non-filed item that appears as a normal record.
3. Preserve source handoffs while keeping primary review routes in the owning surface.

**Acceptance:** The player never sees turn-zero setup facts as if they happened during play.

**Evidence:** Decision Room record-category cards, report/cost/judge loop steps, Chronicle generated entries/generals digest, and President's Desk consequence strip now share the turn-zero filed-record guard. Report loop routing uses the normalized Decision Room card as primary action and preserves Army HQ aftermath as the source handoff. Focused proof passed 112/112, `npm.cmd run typecheck` passed, and `npm.cmd run qa:live-surface:browser` passed with temp evidence cleaned.

### Task 5: Targeted Live Browser Sweep

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_RECORD_PROVENANCE_AND_LIVE_SWEEP_HARDENING.md`.

**Files:**
- Extend if needed: `tools/ui/live_surface_browser_sweep.cjs`

**Steps:**
1. Run RBiH and RS first-hour War Map -> OOB -> Corps Front -> Brigade -> Settlement -> Ops modal path.
2. Record selectors for the fixed sector-coverage truth.
3. Keep failures focused on player truth/usability, not Bosnian localization.

**Acceptance:** The live browser journey confirms the corrected surfaces and no console errors.

**Evidence:** `qa:live-surface:browser` now runs the owner drilldown for RBiH and an RS startup fixture through Desk -> Command Surface -> Decision Room -> OOB sector -> Corps Front tabs -> Ops Planning modal -> Formation Detail -> Settlement Detail -> Records tabs. It also injects a turn-zero setup-provenance fixture and proves the Desk does not show `Last filed record` while the command-strip record card stays at `data-awwv-count="0"`. Live proof passed with `ownerJourneyDrilldownByFaction: { RBiH: true, RS: true }`, `ownerJourneyOpsPlanningModalByFaction: { RBiH: true, RS: true }`, `turnZeroSetupProvenanceLiveProof.recordCardCount: 0`, and server port cleanup verified.

### Task 6: Pyrrhic Scout Surface-Truth Follow-Up

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_SURFACE_TRUTH_AND_PROVENANCE_FOLLOWUP.md`.

**Files:**
- Modified: `src/ui/map/components/FormationDetail.tsx`
- Modified: `src/ui/map/components/OOBSidebar.tsx`
- Modified: `src/ui/map/data/territorySummaryGuard.ts`
- Modified: `src/ui/map/data/GameStateAdapter.ts`
- Modified: `src/ui/map/data/dilemmaSpine.ts`
- Tests: `tests/ui/formation_detail_parity.test.ts`, `tests/ui/oob_operations_panel.test.ts`, `tests/ui/turn_aftermath.test.ts`, `tests/chronicle_entries.test.ts`, `tests/ui/presidential_decision_room.test.ts`, `tests/ui/first_hour_fired_event_labels.test.ts`, `tests/ui/dilemma_spine.test.ts`

**Steps:**
1. Verify Pyrrhic scout claims with red focused tests.
2. Fix stale Formation Detail sector counts for valid overrides.
3. Fix OOB corps cards so planning-only operations are visible.
4. Extend setup-provenance suppression beyond turn-zero-only summaries.
5. Keep unanswered foundational decisions out of filed/faced UI history until a response is recorded.

**Acceptance:** Current-sector counts, OOB operation cards, setup-control summaries, fired-event wrappers, and Dilemma Spine state all represent the player's actual authored history rather than setup or pending bookkeeping.

**Evidence:** Focused red/green pack passed 116/116 and `npm.cmd run typecheck` passed. `npm.cmd run qa:first-hour:browser` passed with all faction foundational flows resolved, turn-zero Records/AAR provenance counts at zero, receipt checks true, raw first-hour labels absent, and server cleanup verified. `npm.cmd run qa:live-surface:browser` passed with RBiH/RS owner drilldowns, Ops Planning modal reachability, setup-provenance record-card count at zero, war-start foundational flow proof, and server cleanup verified. `npm.cmd run qa:player-journeys` passed 263/263. Temporary browser evidence folders were removed.

### Task 7: Fielded Brigade Truth And Routing

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_FIELDED_BRIGADE_TRUTH_AND_ROUTING.md`.

**Files:**
- Modified: `src/ui/shared/playerVisibility.ts`
- Modified: `src/ui/map/map/builders/buildFormationsGeoJSON.ts`
- Modified: `src/ui/map/utils/sectorUtils.ts`
- Modified: `src/ui/map/components/BrigadeRow.tsx`
- Modified: `src/ui/map/components/OOBSidebar.tsx`
- Modified: `src/ui/map/components/CorpsDetail.tsx`
- Modified: `src/ui/map/components/OrbatPanel.tsx`
- Modified: `src/ui/map/components/CorpsFrontPanel.tsx`
- Modified: `src/ui/map/components/FormationDetail.tsx`
- Modified: `src/ui/map/App.tsx`
- Tests: `tests/ui_map_render_smoke.test.ts`, `tests/ui/brigade_row_supply_labels.test.ts`, `tests/ui/oob_drilldown_routing.test.ts`, `tests/ui/orbatpanel_drilldown_routing.test.ts`, `tests/ui/formation_detail_parity.test.ts`, `tests/ui/corps_front_panel_routing.test.ts`, `tests/ui/command_drilldown_routing.test.ts`, `tests/ui/warroom_shell_ownership.test.ts`

**Steps:**
1. Add a shared fielded-brigade boundary for command surfaces.
2. Filter tactical counters, OOB reserve groups, Corps Detail, ORBAT, Corps Front unresolved rows, and sector projections through that boundary.
3. Render terminal brigade lifecycle badges explicitly.
4. Hide Formation Detail sector assignment controls for non-fielded brigades.
5. Route generic Decision Room inbox handoffs to the Decision Room and normalize Corps Front/Corps Detail field drilldowns through shared inspection.

**Acceptance:** Destroyed/forming/non-fielded brigades and operational groups do not appear as active field counters, active field-unit counts are consistent across OOB/Corps/ORBAT/Army HQ-adjacent views, terminal lifecycle is visible when a row is rendered, and command drilldowns preserve owner context.

**Evidence:** Focused red/green pack passed 80/80 and `npm.cmd run typecheck` passed, including code-review follow-up coverage for statusless lightweight sector projection records and `sit:*` Situation row Desk ownership. `npm.cmd run qa:first-hour:browser` passed after preserving the Desk-owned `opening-brief:desk` and `empty:desk` exceptions. `npm.cmd run qa:live-surface:browser` passed the owner drilldown and setup/foundational proof paths. `npm.cmd run qa:player-journeys` passed 267/267. Temporary browser evidence folders were removed after verification.

### Task 8: Command Surface Truth Polish

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_COMMAND_SURFACE_TRUTH_POLISH.md`.

**Files:**
- Modified: `src/ui/map/components/FormationDetail.tsx`
- Modified: `src/ui/map/components/BrigadeRow.tsx`
- Modified: `src/ui/map/components/OOBSidebar.tsx`
- Modified: `src/ui/map/components/CorpsDetail.tsx`
- Modified: `src/ui/map/components/OrbatPanel.tsx`
- Modified: `src/ui/map/components/army_hq/OrbatSection.tsx`
- Modified: `src/ui/map/components/CorpsFrontPanel.tsx`
- Modified: `src/ui/map/components/CorpsCard.tsx`
- Modified: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`
- Modified: `src/ui/map/data/formationNameLocalizations.ts`
- Modified: `src/ui/map/data/presidentialDecisionRoom.ts`
- Modified: `src/ui/map/i18n/messages.en.ts`
- Modified: `src/ui/map/i18n/messages.bcs.ts`
- Tests: `tests/ui/formation_detail_parity.test.ts`, `tests/ui/brigade_row_supply_labels.test.ts`, `tests/brigade_name_localization.test.ts`, `tests/presidential_decision_room_counter_offer.test.ts`, `tests/ui/command_drilldown_routing.test.ts`, `tests/ui/corps_front_panel_routing.test.ts`

**Steps:**
1. Verify Pyrrhic UI/detail scout claims with focused tests.
2. Remove invented hold/balanced/active/0% defaults from command surfaces where the read-model does not report that truth.
3. Sort formation lists by localized display names with deterministic id fallback.
4. Route Corps Detail operation rows through the canonical field-operation inspection path.
5. Localize Decision Room counter-offer faction labels and split evidence.

**Acceptance:** Formation, corps, ORBAT, Corps Front, and Decision Room surfaces no longer convert missing data into favorable/default command truth, and display ordering/labels match the player-visible locale.

**Evidence:** Focused proof passed 60/60 after the editable CorpsCard missing-stance branch was pinned, `npm.cmd run typecheck` passed, `npm.cmd run qa:player-journeys` passed 271/271, `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified, and `git diff --check` passed.

### Task 9: Army HQ Sector Truth Hardening

**Status:** IMPLEMENTED 2026-06-23 in report `docs/40_reports/implemented/20260623_ARMY_HQ_SECTOR_TRUTH_HARDENING.md`.

**Files:**
- Modified: `src/sim/combat/corps_front_sectors.ts`
- Modified: `data/derived/startup/apr_1992_initial_save.json`
- Modified: `src/ui/map/components/army_hq/SectorsSection.tsx`
- Test: `tests/startup_snapshot_contract.test.ts`
- Test: `tests/ui/army_hq_sector_truth.test.ts`

**Steps:**
1. Verify the scout finding that Army HQ sector rows lacked the same current-assignment proof hooks as OOB/Corps Detail.
2. Add Army HQ row attributes for current, frontline, reserve, command-directed, and coverage-tier assignment truth.
3. Audit the baked startup snapshot for duplicate same-faction sector edge ownership.
4. Add startup contracts for duplicate-free same-faction edge ownership and HVO Bosnian Posavina command ownership.
5. Canonicalize duplicate same-faction edge ownership in the sector builder, regenerate the startup artifact, and verify builder freshness.

**Acceptance:** Army HQ sector rows can be live-proven against current assignment truth, and the April 1992 baked startup sector set contains no same-faction duplicate edge claims; the Bosnian Posavina HVO frontage belongs to `hvo_northwest_bosnia` rather than Central Bosnia.

**Evidence:** Startup sanity reported `{ sectors: 160, duplicates: 0, central: null, northwest: 17 }`. Focused engine/startup/UI proof passed 20/20, `npm.cmd run desktop:startup-snapshot:check` passed, `npm.cmd run typecheck` passed, `npm.cmd run qa:player-journeys` passed 271/271, `npm.cmd run qa:first-hour:browser` passed with cleanup verified, `npm.cmd run qa:live-surface:browser` passed with `armyHqSectorAssignmentTruthLiveProof: { rows: 19, zeroCurrentRows: 6, badZeroRows: [] }`, `npm.cmd run ci:structural-fingerprint:check` passed with expected fingerprint `f282883abbab76cf`, `npm.cmd run test:baselines` reported all scenarios match, and `git diff --check` passed.

### Task 10: Command Surface Deep Polish Continuation

**Status:** IMPLEMENTED 2026-06-23 in report `docs/40_reports/implemented/20260623_COMMAND_SURFACE_DEEP_POLISH.md`.

**Files:**
- Modified: `src/ui/shared/playerVisibility.ts`
- Modified: `src/ui/map/data/GameStateAdapter.ts`
- Modified: `src/ui/map/components/OOBSidebar.tsx`
- Modified: `src/ui/map/components/CorpsFrontPanel.tsx`
- Modified: `src/ui/map/components/army_hq/SectorsSection.tsx`
- Modified: `src/ui/map/components/Tooltip.tsx`
- Modified: `src/ui/map/components/tooltipPlayerSafe.ts`
- Modified: `src/ui/map/utils/formationAtOsid.ts`
- Modified: `src/ui/map/components/SituationTab.tsx`
- Modified: `src/ui/map/components/army_hq/ForceReadiness.tsx`
- Modified: `src/ui/map/utils/combatEffectiveness.ts`
- Modified: `src/ui/map/i18n/messages.en.ts`
- Modified: `src/ui/map/i18n/messages.bcs.ts`
- Tests: `tests/ui_player_visibility.test.ts`
- Tests: `tests/ui_map_tooltip_player_visibility.test.ts`
- Tests: `tests/ui_map_render_smoke.test.ts`
- Tests: `tests/ui/oob_drilldown_routing.test.ts`
- Tests: `tests/ui/corps_front_panel_routing.test.ts`
- Tests: `tests/ui/army_hq_sector_truth.test.ts`
- Tests: `tests/ui/war_summary_opsec_reconciliation.test.ts`
- Tests: `tests/ui/army_hq_readiness_threat_copy.test.ts`

**Steps:**
1. Verify Pyrrhic UI/formation scout findings against the current diff and affected surfaces.
2. Tighten the fielded tactical formation boundary so active-but-forming units do not render as fielded counters, stationed units, sector assignments, Force Readiness contributors, or effectiveness contributors.
3. Keep missing lifecycle from the adapter and synthesized compatibility HQs as unreported, not active/perfect.
4. Remove residual invented sector stance defaults in Corps Front, Army HQ Sectors, and defense tooltips.
5. Route OOB sector strength through player-safe labels and route defense preview brigade counts through current sector assignment truth.
6. Render unassessed Situation OPSEC supply as unassessed instead of `0%`.

**Acceptance:** Forming/destroyed/unreported tactical formations no longer appear as normal fielded units; sector stance remains unreported when absent; OOB, Corps Front, Army HQ, settlement detail/tooltips, defense preview, Force Readiness, and Situation OPSEC all obey the same player-truth policy.

**Evidence:** Focused proof `node node_modules\vitest\vitest.mjs run tests\ui_player_visibility.test.ts tests\ui_map_sector_lookup.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui_map_render_smoke.test.ts tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui\war_summary_opsec_reconciliation.test.ts tests\ui\army_hq_readiness_threat_copy.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 82/82 after reviewer follow-up, `npm.cmd run typecheck` passed, `npm.cmd run qa:player-journeys` passed 273/273, `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified, `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified, `git diff --check` passed, and temporary browser evidence folders were removed.

### Task 11: Command Surface Follow-Up Polish

**Status:** IMPLEMENTED 2026-06-23 in report `docs/40_reports/implemented/20260623_COMMAND_SURFACE_FOLLOWUP_POLISH.md`.

**Files:**
- Modified: `src/ui/map/data/GameStateAdapter.ts`
- Modified: `src/ui/map/data/types.ts`
- Modified: `src/ui/map/components/BrigadeRow.tsx`
- Modified: `src/ui/map/components/OperationsPanel.tsx`
- Modified: `src/ui/map/components/ArmyReservePanel.tsx`
- Modified: `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx`
- Modified: `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- Modified: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Modified: `src/ui/map/i18n/messages.en.ts`
- Modified: `src/ui/map/i18n/messages.bcs.ts`
- Tests: `tests/ui_map_game_state_adapter.test.ts`, `tests/ui/brigade_row_supply_labels.test.ts`, `tests/ui/oob_operations_panel.test.ts`, `tests/ui/gui_audit_dead_controls.test.ts`, `tests/ui/advance_turn_button_gated_feedback.test.ts`, `tests/ui/president_desk_shell.test.ts`, `tests/ui/warroom_shell_accessibility.test.ts`

**Steps:**
1. Carry player-visible supply state onto formation rows instead of inferring supply from fatigue, cohesion, or status.
2. Label unknown brigade supply as unreported and explicit critical supply as critical.
3. Localize Warroom/advance-review `command` and `counter_offer` categories.
4. Make blocked President Desk advance action open as `Review Advance Blockers`.
5. Render OperationsPanel accessible operation phases with player-safe phase labels.
6. Split Army Reserve inspection and recall actions into sibling controls with no nested buttons.

**Acceptance:** Command surfaces no longer invent supply truth, Warroom review rows do not fall back to `Memory`, blocked advance copy names the blocker-review action, operations cards expose player-safe accessible names, and Army Reserve rows keep inspect/terminate actions separately reachable.

**Evidence:** Focused proof passed 94/94, `npm.cmd run typecheck` passed, `npm.cmd run qa:player-journeys` passed 277/277, `npm.cmd run qa:first-hour:browser` passed, `npm.cmd run qa:live-surface:browser` passed, and a manual in-app browser pass on `http://127.0.0.1:3003/?dev=1` verified RS start -> war-start identity brief -> Begin -> Desk blocked-action copy and Army HQ/command surface with zero console errors and zero nested buttons.

### Task 12: Sector Audit Isolation And Tooltip Picker Proof

**Status:** IMPLEMENTED 2026-06-23 in report `docs/40_reports/implemented/20260623_SECTOR_AUDIT_TOOLTIP_PICKER_PROOF.md`.

**Files:**
- Modified: `tools/scenario_runner/audit_sector_truth.ts`
- Modified: `src/ui/map/components/tooltipPlayerSafe.ts`
- Modified: `src/ui/map/components/Tooltip.tsx`
- Modified: `src/ui/map/components/FormationDetail.tsx`
- Modified: `src/ui/map/i18n/messages.en.ts`
- Modified: `src/ui/map/i18n/messages.bcs.ts`
- Tests: `tests/startup_snapshot_contract.test.ts`
- Tests: `tests/ui_map_tooltip_player_visibility.test.ts`
- Tests: `tests/ui/formation_detail_parity.test.ts`

**Steps:**
1. Verify the sector-audit false-positive path where rebuilding sectors mutates formation locations before the saved-sector audit runs.
2. Isolate saved and rebuilt audit state so persisted startup truth is the release gate while rebuilt-sector findings remain visible diagnostics.
3. Keep rebuilt reserve-only sector repair out of production code because the direct engine-side promotion candidate drifted startup, baseline, and structural fingerprints.
4. Hide favorable front-density/threat copy on own front tooltips when no current fielded friendly formation exists on that sector.
5. Add live-proof hooks and plural-safe labels to Formation Detail sector options.

**Acceptance:** Persisted April 1992 startup sector truth audits clean without mutation from rebuilt diagnostics; the audit CLI exits green when saved truth is clean while still printing `rebuilt_ok: false` diagnostics; uncovered friendly tooltip sectors show `No friendly line` instead of density/threat; Formation Detail sector picker buttons expose stable sector/current/frontline proof attributes and singular/plural brigade labels.

**Evidence:** Focused proof `node node_modules\vitest\vitest.mjs run tests\startup_snapshot_contract.test.ts -t "sector truth audits clean" --pool=forks --reporter=dot` passed 1/1, `node node_modules\vitest\vitest.mjs run tests\ui_map_tooltip_player_visibility.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 25/25, and `npm.cmd run sim:scenario:audit-sectors -- --save data/derived/startup/apr_1992_initial_save.json` reported saved counts all zero with `ok: true` and retained rebuilt diagnostic `reserve_only_live_sectors: 1` / `rebuilt_ok: false`. Broader proof passed: `npm.cmd run desktop:startup-snapshot:check`, `npm.cmd run typecheck`, `npm.cmd run test:baselines`, `npm.cmd run ci:structural-fingerprint:check`, `npm.cmd run qa:player-journeys` 278/278, `npm.cmd run qa:first-hour:browser`, and `npm.cmd run qa:live-surface:browser`. Manual in-app browser proof on `http://127.0.0.1:3003/` verified RBiH new-game war-start splash, opening identity brief, Decision Room -> President's Desk decision routing, the foundational decision modal, and Army HQ opening commander/summary surfaces.

### Task 13: Sector Density And Stale Drina Doc Hygiene

**Status:** IMPLEMENTED 2026-06-23 in report `docs/40_reports/implemented/20260623_SECTOR_DENSITY_AND_STALE_DRINA_DOC_HYGIENE.md`.

**Files:**
- Modified: `src/ui/map/components/army_hq/SectorsSection.tsx`
- Modified: `src/ui/map/i18n/messages.en.ts`
- Modified: `src/ui/map/i18n/messages.bcs.ts`
- Modified: historical Drina/Krivaja/Stupcanica reports, collapse proposal packets, and old event-system plans
- Tests: `tests/ui/army_hq_sector_truth.test.ts`, `tests/ui/formation_detail_parity.test.ts`

**Steps:**
1. Verify Pyrrhic UI scout findings with red tests.
2. Make Army HQ displayed density derive from current frontline assignment truth.
3. Make Formation Detail sector-picker visible copy say current brigade counts.
4. Add supersession notes to stale historical reports/plans that still route Srebrenica/Zepa into operation-delivery calibration.

**Acceptance:** Army HQ rows do not mix current assignment counts with saved density, Formation Detail sector options are visibly current, and historical reports cannot send future agents back into Drina/Krivaja fall-delivery calibration.

**Evidence:** Red proof failed on saved `density 0.42`/`Troop density: 0.42` leakage and visible `1 brigade` / `0 brigades` sector-picker copy. Green proof `node node_modules\vitest\vitest.mjs run tests\ui\army_hq_sector_truth.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 19/19; expanded focused proof with `tests\ui\gui_audit_label_discipline.test.ts` passed 40/40; `npm.cmd run typecheck`, `npm.cmd run qa:player-journeys` 278/278, `npm.cmd run qa:live-surface:browser`, targeted stale-language sweep, and `git diff --check` passed. Live browser evidence included `armyHqSectorAssignmentTruthLiveProof: { rows: 19, zeroCurrentRows: 6, badZeroRows: [] }` and server cleanup verified.

### Task 14: Command Drilldown And Decision Ownership Polish

**Status:** IMPLEMENTED 2026-06-23 in report `docs/40_reports/implemented/20260623_COMMAND_DRILLDOWN_DECISION_OWNERSHIP_POLISH.md`.

**Files:**
- Modified: `src/ui/map/data/inboxItems.ts`
- Modified: `src/ui/map/data/GameStateAdapter.ts`
- Modified: `src/state/player_decision_manifest.ts`
- Added: `src/ui/map/data/filedRecordTruth.ts`
- Modified: `src/ui/map/components/PresidentialInbox.tsx`
- Modified: `src/ui/map/data/presidentialDecisionRoom.ts`
- Modified: `src/ui/map/components/OperationsPanel.tsx`
- Modified: `src/ui/map/components/army_hq/OrbatSection.tsx`
- Modified: `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`
- Modified: `src/ui/map/components/CorpsFrontPanel.tsx`
- Modified: `src/ui/map/components/CorpsDetail.tsx`
- Modified: `src/ui/map/components/OrbatPanel.tsx`
- Modified: `src/ui/map/components/FormationDetail.tsx`
- Modified: `src/ui/shared/playerFacingLabels.ts`
- Added: `src/ui/map/utils/recentEngagements.ts`
- Modified: ADR-0007, H1, packaging-pause, `.agent` napkin, board, roadmap, and runbook docs
- Tests: `tests/ui/inbox_items.test.ts`, `tests/player_decision_manifest.test.ts`, `tests/ui/presidential_decision_room.test.ts`, `tests/ui/inbox_dedup.test.ts`, `tests/ui/corps_front_panel_routing.test.ts`, `tests/ui/formation_detail_parity.test.ts`

**Steps:**
1. Scope unresolved Pyrrhic scout findings to player-owned decision routing, filed-record truth, ORBAT drilldown context, Corps Front friendly-force truth, and stale active-doc routing.
2. Filter pending convoy decisions by player route faction across Inbox, Decision Room manifest, and desktop startup projection.
3. Share filed-record truth across President's Desk quiet capsule and Decision Room Chronicle memory.
4. Preserve sector context for Operations and Army HQ ORBAT brigade inspect actions, and sort recent engagements newest-first.
5. Keep friendly force facts visible in Corps Front regardless of enemy intel confidence; leave operation supply uncertainty separately redacted.
6. Render missing stance and raw corps/sector labels through player-safe command copy.
7. Clarify ADR-0007 Phase C deletion, Srebrenica/Zepa event-owned receipt policy, packaging pause, and `.agent/napkin.md` historical status in active process docs.

**Acceptance:** Foreign convoy choices cannot block or surface for the wrong player faction; filed decision receipts count as records even without a narrated turn summary; command drilldowns preserve current sector context; Corps Front does not hide the player's own force truth behind enemy intel confidence; recent battle records are newest-first; and active docs no longer route future work into retired Phase C, fall-delivery tuning, or packaging execution.

**Evidence:** Focused red proof failed before implementation on foreign convoy routing, decision-receipt filed-record memory, Corps Front friendly-force redaction, and engagement ordering. Focused green proof `node node_modules\vitest\vitest.mjs run tests\ui\inbox_items.test.ts tests\player_decision_manifest.test.ts tests\ui\presidential_decision_room.test.ts tests\ui\inbox_dedup.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts --pool=forks --reporter=dot` passed 129/129. `npm.cmd run typecheck` passed. Targeted active-doc stale-language sweep passed for ADR-0007 Phase C active-gate wording, H1 DELIV active wording, and packaging-active wording. `npm.cmd run qa:player-journeys` passed 282/282. `npm.cmd run qa:live-surface:browser` passed with `ok: true`, `serverPortCleanupVerified: true`, war-start/foundational flow proof, RBiH/RS owner journey proof, map context-menu proof, battle-marker proof, and `armyHqSectorAssignmentTruthLiveProof: { rows: 19, zeroCurrentRows: 6, badZeroRows: [] }`; temp evidence was removed. `git diff --check` passed with the existing CRLF normalization warning for `src/ui/shared/playerFacingLabels.ts`.
