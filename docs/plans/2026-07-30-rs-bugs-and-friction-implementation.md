# RS Diary Bugs and Friction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Repair the four confirmed RS owner-run bugs first, then remove the three validated Desk → Decision → Advance friction points without weakening historical fidelity.

**Architecture:** Preserve the canonical Electron IPC and simulation owners. Serialize embedded bridge replies before forwarding the state update caused by that invocation; prevent a Warroom Advance command from opening beneath a live aftermath; synchronize legacy Continue availability whenever canonical state loads; and use authored historical peace-plan dispositions for every non-player delegation outside emergent mode. After the bug gate is green, add a deterministic sequential packet authorization over existing proposal IPC, a persisted standing-hold receipt over the existing reserve decision history with canon-backed critical re-prompt signals, and separate presidential obligations from staff review severity in the Warroom dock.

**Tech Stack:** TypeScript, React, Zustand, Electron IPC/preload bridge, Vitest, Testing Library, Vite.

---

## Design choices

1. **Embedded action durability**
   - Considered excluding the initiating renderer from mutation broadcasts. Rejected because Engine Invariants §11.5 and the desktop persistence tests require every live renderer to receive the durable projected state.
   - Considered returning full projected state in every mutation response. Rejected as a broad IPC-contract change.
   - Chosen: while an embedded invocation is in flight, retain the newest projected state update in the Warroom host, post the action response first, then flush the retained state. This preserves durability and gives the initiating control a deterministic completion boundary.

2. **Completed-aftermath Advance**
   - Considered stacking the advance confirmation above the aftermath. Rejected because it permits two end-of-turn owners at once.
   - Chosen: a Warroom Advance command first acknowledges the completed aftermath, then opens the existing advance review. The command never executes beneath the report.

3. **Historical peace responses**
   - Chosen directly from `docs/10_canon/WAR_TERMINATION_SPEC.md` §4: when a faction is not player-owned and `decision_mode` is not `emergent`, use the plan’s explicit historical disposition. Emergent mode retains the scorer.

4. **Historical-operation packet**
   - Considered a new simulation batch command. Rejected because each existing proposal already has a canonical durable action.
   - Chosen: one UI disposition invokes the existing accept action in stable card order, stops on the first failure, and keeps every individual dossier available as a plan-level exception.

5. **Strategic-reserve hold**
   - Considered a new save-schema policy field. Rejected as unnecessary.
   - Chosen: record an explicit standing-hold receipt in the existing reserve decision history, including the suggested brigade. Routine request generation omits held brigades. Existing `enclave_relief` or `commander_request_priority === 'critical'` signals bypass the hold and re-present the decision. These are already authored canonical request signals, so no numeric threshold is invented.

6. **Obligation versus staff urgency**
   - Chosen: the dock exposes presidential requirements and staff review as separate readings. Required signatures retain direct routing; advisory/record severity remains inside the staff docket and no longer appears as a competing red `URG` total beside `REQUIRED 0`.

## Task 1: Embedded bridge response ordering

**Files:**
- Modify: `src/ui/warroom/warroom.ts`
- Test: `tests/desktop_player_visible_state.test.ts`

1. Add a structural regression test that requires embedded mutation state to be queued while the bridge invocation is active and flushed only after `awwv-bridge:response`.
2. Run the focused test and verify the new assertion fails.
3. Add the minimal queue/flush helper and invocation boundary.
4. Run the focused test and verify it passes.

## Task 2: Aftermath/Advance ownership

**Files:**
- Modify: `src/ui/map/App.tsx`
- Test: `tests/ui/advance_turn_button_gated_feedback.test.ts`

1. Add a regression test that opens a completed aftermath, issues the Warroom Advance command, and asserts the report closes before the advance modal owns the flow.
2. Run the test and verify it fails.
3. Gate the `advance-turn` command in the App-owned Warroom navigation handler.
4. Run the test and verify it passes.

## Task 3: Recovery Continue availability

**Files:**
- Modify: `src/ui/warroom/warroom.ts`
- Test: `tests/desktop_player_visible_state.test.ts`

1. Add a regression assertion requiring loaded canonical state to synchronize the legacy Continue button.
2. Run the focused test and verify it fails.
3. Add one availability helper and call it after state application and from `showMainMenu`.
4. Run the focused test and verify it passes.

## Task 4: Canonical historical peace dispositions

**Files:**
- Modify: `src/sim/negotiation/peace_plans.ts`
- Test: `tests/peace_plans.test.ts`

1. Add an RS-player Cutileiro regression that expects `{ RBiH: rejected, RS: accepted, HRHB: accepted }`.
2. Add an emergent-mode guard test that preserves computed non-player responses.
3. Run both tests and verify the historical test fails.
4. Use `plan.historical_responses` for non-player factions whenever decision mode is not emergent.
5. Run the focused peace-plan suite and verify it passes.

## Task 5: Bug-gate verification

**Files:**
- Verify only.

1. Run the four focused regression files.
2. Run typecheck.
3. Build the desktop map, desktop simulation bundle, and Warroom renderer without invoking any package command.
4. Launch Electron with an isolated profile and verify visible Cutileiro submission, loaded-save Continue, and aftermath-to-Advance ownership.

## Task 6: Historical-operation packet disposition

**Files:**
- Modify: `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Test: `tests/ui/presidential_decision_room_panel_i18n.test.ts`

1. Replace the existing “no authorize all” assertion with a failing expectation for one packet authorization control plus individual dossier controls.
2. Add a failing sequential-order/stop-on-error helper test.
3. Implement the stable sequential action over existing `acceptProposal` calls.
4. Add EN/BCS copy and an accessible busy/error receipt.
5. Run the focused panel tests.

## Task 7: Standing Main Staff reserve hold

**Files:**
- Modify: `src/state/elite_loan_types.ts`
- Modify: `src/sim/combat/army_reserve_system.ts`
- Modify: `src/desktop/desktop_sim.ts`
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/desktop/preload.cjs`
- Modify: `src/ui/map/desktop/useIPC.ts`
- Modify: `src/ui/map/components/army_hq/DirectiveCard.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Test: `tests/army_reserve_system.test.ts`
- Test: `tests/ui/directive_card_stop_op_action.test.ts`
- Test: `tests/desktop_persistence_contract.test.ts`

1. Add failing engine tests for routine suppression and `enclave_relief` / critical commander re-prompt.
2. Add a failing UI test for the secondary “Hold at Main Staff” action.
3. Implement the standing-hold history receipt and generator filter without adding a schema field.
4. Wire the one canonical IPC action through desktop, preload, and renderer adapters.
5. Add localized player-facing copy and focused tests.

## Task 8: Separate obligation from staff review

**Files:**
- Modify: `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Test: `tests/ui/advance_turn_button_gated_feedback.test.ts`

1. Add a failing status-dock test for `REQUIRED 0` plus a separate `STAFF REVIEW n` control with no visible `URG`.
2. Keep direct routing for one required signature and an explicit count for zero/multiple requirements.
3. Keep urgent severity in the expanded staff docket only.
4. Run EN and BCS focused tests.

## Task 9: Documentation and broad verification

**Files:**
- Modify: `docs/40_reports/GUI_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`

1. Record the bug/friction implementation and canon mappings in GUI Master.
2. Append one project-ledger entry; do not rewrite prior entries.
3. Run focused suites, player journeys, typecheck, desktop release checks, canon check, and `git diff --check`.
4. Run a fresh isolated-profile Electron smoke against the newly built local renderer/sim outputs.
5. Preserve the explicit boundary: no commit, push, package, installer, tag, branch, or release-state mutation.
