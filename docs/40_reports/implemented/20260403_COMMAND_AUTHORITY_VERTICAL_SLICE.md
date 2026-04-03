# Command Authority Vertical Slice — Implementation Report

**Date:** 2026-04-03
**Status:** IMPLEMENTED
**Roadmap slot:** v0.8.0 (first delegation/override infrastructure, plan Phases 1-2 + 5-6 combined)
**Governing doc:** `docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md`
**Execution plan:** `docs/plans/2026-04-03-delegation-override-command-friction-plan.md`

---

## What Was Implemented

A thin vertical slice of the delegation/override/command friction system — the first player-visible command authority mechanic.

### 1. CommandAuthority type and GameState field

**File:** `src/state/game_state.ts`

Added `CommandAuthority` interface (`current`, `max`, `spent_this_turn`, `lifetime_spent`) and `command_authority` optional field on `MilitaryState`. Distinct from `political_capital` on `PoliticalLeaderState` (bot resource).

### 2. Initialization

**File:** `src/scenario/scenario_runner.ts`

New games initialize `command_authority` to `{ current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0 }` after `prepareNewGameState`. Existing saves without the field work unchanged (optional field, UI handles undefined).

### 3. Recovery step in war pipeline

**File:** `src/sim/turn_phases/war_phases.ts`

New `recover-command-authority` step after `apply-sector-stance-orders`. Each turn: resets `spent_this_turn` to 0, recovers +2 current (capped at max). This is the base recovery rate — future work may modify it by officer trust or war situation.

### 4. Force-launch costs authority (Level 3 override)

**File:** `src/desktop/electron-main.cjs`

The `stage-operation-force-launch` IPC handler now deducts 15 command authority before setting `force_launch = true`. If authority is insufficient, the handler returns `{ ok: false, error: '...' }` and the force-launch is blocked.

### 5. Command Authority gauge on PresidentialToolbar

**File:** `src/ui/map/components/PresidentialToolbar.tsx`

New `CommandAuthorityGauge` component displays AUTH bar + numeric value. Color-coded: green (≥60%), amber (≥30%), red (<30%). Tooltip explains the mechanic. Placed right of center, before ADVANCE TURN.

### 6. Force-launch cost preview in Army HQ

**File:** `src/ui/map/components/army_hq/OperationsSection.tsx`

Force-launch button now shows `[ FORCE LAUNCH — 15 AUTH ]`. Disabled when authority is insufficient. Tooltip shows current/needed authority and command level label.

### 7. Adapter wiring

**Files:** `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/data/types.ts`

`commandAuthority` field added to `LoadedGameState` and populated from `state.military.command_authority` via the adapter pattern (finiteNumber guards).

### 8. EventModal wording fix

**File:** `src/ui/map/components/EventModal.tsx`

Changed "Commander's Decision Required" to "Presidential Decision Required" per presidential command doctrine.

---

## What Was NOT Implemented (deferred)

- Command level tags on all IPC actions (Plan Phase 1 — pure metadata, no player value alone)
- Command friction log / warlord friction visibility (Plan Phase 3)
- Delegation summary in commander output (Plan Phase 4)
- Override costs for other Level 3 actions (manual move, posture, sector assignment)
- Morale/competence side effects on force-launch (future: -5 morale, -1 competence)

---

## Tests

**File:** `tests/command_authority.test.ts` — 10 tests covering:
- Initialization (full capacity)
- Force-launch deduction (normal, insufficient, exact-cost, accumulation)
- Recovery (per-turn, reset, max cap, from zero)
- Full cycle (deduct then recover to max)

---

## Verification

- `npx tsc --noEmit` — clean
- `vitest run tests/command_authority.test.ts` — 10/10 pass
- `vite build` — success
- `check_claude_governance.ps1` — OK

---

## Completion Block

```
Canonical owner: CommandAuthority on MilitaryState (game_state.ts)
Demoted path: Unconstrained force-launch with no resource cost
Player-visible truth: Force-launching costs 15 Command Authority; authority recovers +2/turn; gauge visible on toolbar
Canonical UI surface: PresidentialToolbar (gauge), Army HQ OperationsSection (cost preview)
Done means: Force-launch deducts authority, gauge reflects it, insufficient authority blocks the action, 10 tests pass
```
