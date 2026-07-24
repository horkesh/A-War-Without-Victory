# Broader Assisted Execution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the existing Level 1 Assisted autonomy mode execute routine player-faction corps and brigade orders, not only surface recommendations or assist accepted historical operations.

**Architecture:** Reuse the deterministic bot corps-order and brigade-order pipeline for the player faction when `meta.autonomy_level >= 1`, while keeping `meta.autonomy_level === 0` as manual control. Player-staged attack/movement orders must win over staff-generated orders; accepted historical operations remain covered by the same assisted path without duplicating orders.

**Tech Stack:** TypeScript simulation pipeline, Vitest regression tests, desktop IPC/autonomy UI copy, docs/ledger sync.

---

### Task 1: Pin Autonomy Faction Selection

**Files:**
- Modify: `tests/desktop_start_campaign_authorization.test.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`

**Steps:**
1. Add failing tests for `selectBotBrigadeOrderFactions` proving:
   - Level 0 desktop player campaigns still exclude `player_faction`.
   - Level 1 includes `player_faction` for assisted execution.
   - Headless auto-control still includes all factions.
2. Run the focused test and confirm failure.
3. Update faction selection to include the player faction when `autonomy_level >= 1`, excluding it only at Level 0.
4. Re-run the focused test.

### Task 2: Preserve Player-Staged Orders

**Files:**
- Modify: `tests/desktop_start_campaign_authorization.test.ts`
- Modify: `src/sim/combat/bot_brigade_ai_osid.ts`

**Steps:**
1. Add a failing regression proving merge mode does not overwrite an existing player `brigade_attack_orders` or `brigade_movement_orders` entry for the same brigade.
2. Run the focused test and confirm failure.
3. Change `mergeWithExistingOrders` semantics so existing orders take precedence over generated orders.
4. Re-run the focused test.

### Task 3: Remove Duplicate Historical-Only Assist Path

**Files:**
- Modify: `src/sim/turn_phases/war_phases.ts`

**Steps:**
1. Keep historical-operation assist active at Level 0.
2. Do not run the historical-only assist pass when Level 1+ already includes the player faction in the normal assisted execution pass.
3. Keep diagnostics separated: normal bot diagnostics remain `bot_order_diagnostics`; Level 0 historical-only assist remains `player_historical_operation_assist`.

### Task 4: Update Player-Facing Copy and Docs

**Files:**
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Modify: `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- Modify: `docs/40_reports/playtests/20260710_rs20_calibration_comparison.md`
- Modify: `docs/plans/COMMAND_BOARD.md`
- Modify: `docs/plans/MASTER_ROADMAP.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `.claude/napkin.md`

**Steps:**
1. Make Level 1 copy state that staff executes routine orders and the player can override.
2. Update engineering docs and roadmap/board truth.
3. Add ledger entry.

### Task 5: Verify

**Commands:**
- `npx.cmd vitest run tests/desktop_start_campaign_authorization.test.ts tests/bot_operation_objective_focus.test.ts tests/pre_planned_operations.test.ts tests/ui/presidential_decision_room.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck`
- `npm.cmd run ci:structural-fingerprint:check`
- `npm.cmd run qa:player-journeys`
- `npm.cmd run desktop:release:check`
- `git diff --check`

---

## Execution Closeout - 2026-07-11

Implemented locally. Level 1 Assisted now includes the selected player faction in deterministic corps and brigade staff execution. Level 0 remains manual except for accepted historical-operation participants. Player-staged attack, movement, and posture orders remain authoritative during the player-faction staff pass.

Red/green proof:

- Before implementation, the autonomy faction-selection test failed because `selectBotBrigadeOrderFactions` excluded the player faction at autonomy level 1.
- Before implementation, the merge-mode order test failed because generated staff orders overwrote existing manual player orders.
- Before implementation, the replacement-mode test failed because an ordinary non-player bot pass erased existing player-faction orders.
- After implementation, `npx.cmd vitest run tests\bot_operation_objective_focus.test.ts tests\desktop_start_campaign_authorization.test.ts --pool=forks --reporter=dot` passed 2 files / 19 tests.

Final verification:

- `npx.cmd vitest run tests\desktop_start_campaign_authorization.test.ts tests\bot_operation_objective_focus.test.ts tests\pre_planned_operations.test.ts tests\ui\presidential_decision_room.test.ts --pool=forks --reporter=dot` passed 4 files / 101 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run ci:structural-fingerprint:check` passed; fingerprint `6806ddd157044afa` matched expected.
- `npm.cmd run qa:player-journeys` passed 44 files / 718 tests.
- `npm.cmd run desktop:release:check` passed.
- `git diff --check` exited 0 with existing CRLF normalization warnings only.

Local 20-turn RS probe:

- Artifact: `tmp-paradox-qa-20260710/desktop-rs-20turn-level1-assisted-execution-v1.json`
- Final turn: 20
- Autonomy level: 1
- Final control: HRHB 88 / RBiH 260 / RS 364
- Historical `RS -3` comparison: superseded on 2026-07-11 because it crossed `40w` and `52w` scenario inputs and omitted a decision transcript. See `2026-07-11-opening-turn-calibration-equivalence-plan.md` and the correction in `docs/40_reports/playtests/20260710_rs20_calibration_comparison.md`.
- Delta vs historical-operation-only assist probe: RS +75
- Pending historical reviews at turn 20: none
- `opInjectionWarningCount`: 0

This is local-only player-mode work. No staging, commit, push, PR, packaging, release artifact, event JSON, scenario source data, baseline manifest, structural fingerprint artifact, randomness, timestamps, or locale sorting was intentionally changed.
