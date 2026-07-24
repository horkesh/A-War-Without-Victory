# Player Historical Operation Assist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make accepted player-faction historical operations produce clear battlefield pressure without turning the whole player faction back over to bot control.

**Architecture:** Keep `meta.player_faction` excluded from ordinary bot order generation. Add a narrow operation-assist path that runs the existing operation participant evaluator only for brigades already committed to accepted player historical operations. This preserves the CorpsOperation-only attack invariant and keeps headless calibration gated off.

**Tech Stack:** TypeScript, Vitest, Electron desktop IPC/read models, existing war-phase pipeline, existing `generateAllBotOrdersOsid` / sector-offensive logic.

---

### Task 1: Red Test For Operation-Scoped Assist

**Files:**
- Modify: `tests/desktop_start_campaign_authorization.test.ts`
- Read: `src/sim/turn_phases/war_phases.ts`
- Read: `src/sim/combat/bot_brigade_ai_osid.ts`

**Steps:**
1. Add a test that starts a desktop RS campaign, accepts the `Operation Drina` historical authorization, advances until Drina is in execution, and asserts the player side receives either brigade attack orders or operation-driven column movement orders for Drina participants.
2. In the same test, assert the assist is operation-scoped: non-participating RS brigades do not receive opportunistic attack orders merely because RS is the player faction.
3. Run the test and verify it fails before implementation.

### Task 2: Implement Operation-Scoped Assist

**Files:**
- Modify: `src/sim/combat/bot_brigade_ai_osid.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`
- Possibly modify: `src/state/game_state.ts` only if a tiny optional marker is needed.

**Steps:**
1. Extend `generateAllBotOrdersOsid` with an optional `assistedOperationOnly` mode for a faction.
2. In assist mode, filter eligible brigades to operation participants whose active operation is player-authorized historical assistance.
3. Preserve the existing operation participant evaluator and existing attack/posture/movement order writes.
4. Add a war-phase step after normal bot order generation and before posture application that calls assist mode only when `meta.player_faction` is set, headless auto-control is false, and the player has active assisted historical operations.
5. Do not include general non-operation player brigades in this assist path.

### Task 3: UI/Read-Model Clarity

**Files:**
- Modify: `src/ui/map/data/historicalOperationAuthorization.ts`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Modify tests near `tests/ui/presidential_decision_room.test.ts` or `tests/ui/inbox_items.test.ts`

**Steps:**
1. Update accepted historical-operation dossier/read-model copy to state that authorization delegates the opening push to the field staff for that named operation.
2. Keep the copy advisory and operation-specific; do not imply full AI control of the player faction.
3. Add a focused UI read-model assertion for the assist copy.

### Task 4: Comparison Probe And Documentation

**Files:**
- Modify: `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- Modify: `docs/40_reports/playtests/20260710_rs20_calibration_comparison.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Optionally modify: `.claude/napkin.md`

**Steps:**
1. Run the focused regression test suite.
2. Run a local 20-turn RS accepted-historical-ops probe and record whether RS control moves closer to the headless calibration corridor.
3. Update docs with the actual evidence.
4. Run typecheck, relevant UI tests, structural fingerprint, player journeys, desktop release check, and diff hygiene.

**Local-only constraint:** Do not stage, commit, push, open PRs, or create release artifacts.

## Execution Closeout - 2026-07-11

Status: implemented locally; not staged, committed, pushed, packaged, or released.

- Task 1 complete: added the desktop RS regression proving accepted `Operation Drina` receives participant-only movement/attack assist and non-participating RS brigades do not receive opportunistic orders. The test failed before implementation and passes after.
- Task 2 complete: `generateAllBotOrdersOsid` now supports a caller formation filter plus merge mode. The war phase runs a player-only historical operation assist after normal bot order generation and before posture/movement/combat resolution. The assist recognizes pre-planned, triggered, and Army-HQ historical operation definitions, excludes player-authored/requested operations, and remains inert for headless auto-control.
- Task 2 follow-up complete: pre-planned follow-on chains no longer recycle completed operations or bypass `queued_operations` when a later accepted review wakes the player injector.
- Task 3 complete: Decision Room historical operation dossiers now state that authorization delegates movement/attack assist only to assigned formations for that named operation; EN and BCS copy are synced.
- Task 4 complete: refreshed local 20-turn RS probe at `tmp-paradox-qa-20260710/desktop-rs-20turn-accepted-all-historical-ops-assisted-v1.json`. Final control is HRHB 114 / RBiH 309 / RS 289, improving RS by +20 over the accepted-starting-only desktop probe while remaining -78 versus the 20-week headless comparator.

Focused proof so far:

```powershell
npx.cmd vitest run tests/desktop_start_campaign_authorization.test.ts tests/pre_planned_operations.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/pre_advance_command_review.test.ts --pool=forks --reporter=dot
```

Result: 4 files / 101 tests passed.
