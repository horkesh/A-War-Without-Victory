# Batch-Advance (Two Weeks / N Turns) — UI Implementation Plan

**Date:** 2026-02-18
**Status:** Planned (not yet started)
**Scope:** Add a batch turn advance feature to the warroom UI, allowing the player to advance multiple turns at once (default: 2 turns / two weeks)

---

## Problem Statement

Currently the warroom calendar only supports advancing one turn at a time. Each click:
1. Opens a confirmation dialog
2. Player clicks "Advance Turn"
3. One turn is processed
4. UI updates

This is fine early game but becomes tedious during stretches where the player has no decisions to make (e.g., Phase 0 turns with no investments, Phase I/II quiet periods). A batch advance lets the player skip through multiple weeks in one action.

---

## Design Constraints

- **1 turn = 1 week** is canon-invariant. We don't change the simulation granularity — we just run N sequential single-turn advances.
- **Phase 0 staged investments** apply only to the first turn of a batch. Subsequent turns in the batch have no player investments.
- **Phase transitions** (Phase 0 → I, Phase I → II) must halt the batch. The player should see the transition event before continuing.
- **Critical events** (war begins, declaration, referendum) should halt the batch so the player can react.
- **Desktop bridge is the primary path.** Browser fallback should also support batch, but desktop is the canonical implementation.
- **Deterministic.** Batch advance must produce identical state to N individual advances (same seeds, same ordering).

---

## Architecture

### Approach: Loop-in-UI with per-turn IPC

The simplest, safest approach: the warroom UI loops N times, calling the existing `bridge.advanceTurn()` on each iteration. No changes to the simulation, turn pipeline, IPC contract, or desktop main process.

```
User clicks "Advance 2 Turns" (or enters N)
  ↓
for i in 0..N:
  payload = (i === 0) ? { phase0Directives } : undefined
  result = await bridge.advanceTurn(payload)
  if !result.ok → halt, show error
  if phaseChanged(prevState, result.state) → halt, show transition
  if criticalEvent(result) → halt, show event
  update progress UI
  ↓
Done → close progress modal
```

This means:
- **No changes to `electron-main.cjs`** — existing `advance-turn` handler is reused
- **No changes to `desktop_sim.ts`** — existing `advanceTurn()` is reused
- **No changes to any turn runner** — Phase 0/I/II runners are unchanged
- **No changes to GameState schema** — no new fields
- **Only UI changes** in `ClickableRegionManager.ts` and optionally `ModalManager.ts`

### Alternative: Server-side batch

A `batchAdvanceTurns(n)` IPC handler that loops in the main process. Pros: faster (no IPC round-trips), atomic. Cons: UI can't show per-turn progress or halt on events, and it requires new IPC surface. **Not recommended** for initial implementation — the per-turn IPC loop is fast enough (Phase 0 turns < 50ms each, Phase II < 200ms).

---

## Implementation Tasks

### Task 1: Extend Calendar Advance Dialog

**File:** `src/ui/warroom/ClickableRegionManager.ts`

In `advanceTurn()`, modify the confirmation dialog to include batch options:

```
┌─────────────────────────────────┐
│   Advance Turn                  │
│                                 │
│   Current: Turn 5 — Jun 1992    │
│   Phase 0 (Pre-War)            │
│                                 │
│   Staged Investments: 3         │
│   Cost: 12 political capital    │
│                                 │
│  [Cancel] [Invest] [Advance 1]  │
│           [Advance 2 Weeks ▾]   │
└─────────────────────────────────┘
```

The "Advance 2 Weeks" button is the new addition. The dropdown (▾) could allow selecting 1, 2, 4, 8, or custom N — but the default quick-action is 2 (biweekly).

**Simplified version** (no dropdown, just two buttons):
```
[Cancel] [Advance 1 Turn] [Advance 2 Turns]
```

During Phase 0 with staged investments, "Advance 2 Turns" applies investments on turn 1, then runs turn 2 with bot-only.

### Task 2: Batch Advance Loop

**File:** `src/ui/warroom/ClickableRegionManager.ts`

New method:

```typescript
private async batchAdvanceTurns(
  gameState: GameState,
  turnsToAdvance: number,
  phase0Directives?: Phase0Directive[]
): Promise<void> {
  const progressModal = this.showBatchProgressModal(turnsToAdvance);

  for (let i = 0; i < turnsToAdvance; i++) {
    // Phase 0 directives only on first turn
    const payload = (i === 0 && phase0Directives?.length)
      ? { phase0Directives: [...phase0Directives] }
      : undefined;

    const prevPhase = gameState.meta.phase;

    // Run one turn via existing bridge
    const result = await this.executeSingleAdvance(gameState, payload);
    if (!result.ok) {
      progressModal.close();
      this.showErrorDialog(result.error);
      return;
    }

    gameState = result.state;
    progressModal.update(i + 1, turnsToAdvance, gameState);

    // Halt conditions
    const newPhase = gameState.meta.phase;
    if (newPhase !== prevPhase) {
      // Phase transition — halt and show transition modal
      progressModal.close();
      this.handlePhaseTransition(prevPhase, newPhase, gameState);
      return;
    }

    if (this.hasCriticalEvent(gameState, i)) {
      // Critical event — halt early
      progressModal.close();
      return;
    }

    // Check if user cancelled (escape key or modal close)
    if (progressModal.cancelled) {
      progressModal.close();
      return;
    }
  }

  progressModal.close();
}
```

### Task 3: Progress Modal

**File:** `src/ui/warroom/ClickableRegionManager.ts` (inline) or `src/ui/warroom/components/ModalManager.ts`

A lightweight progress indicator shown during batch advance:

```
┌─────────────────────────────────┐
│   Advancing...                  │
│                                 │
│   Turn 6 of 7                   │
│   ████████████████░░░░  80%     │
│                                 │
│           [Cancel]              │
└─────────────────────────────────┘
```

This can be as simple as updating the existing modal's innerHTML between turns. No need for a new modal type — just reuse the existing modal backdrop/container.

### Task 4: Halt Conditions

Define which events halt the batch:

| Condition | Halt? | Reason |
|-----------|-------|--------|
| Phase transition (phase_0 → phase_i) | **Yes** | Player must see war transition |
| Phase transition (phase_i → phase_ii) | **Yes** | Player must see front formation |
| `war_begins` event | **Yes** | Critical narrative moment |
| `declaration_of_sovereignty` event | **Yes** | Player may want to react |
| `referendum_held` event | **Yes** | Player may want to react |
| Alliance phase change (e.g., fragile → strained) | **No** | Visible in event log |
| Battle results | **No** | Routine, visible in replay |
| Municipality flip | **No** | Routine |
| Formation spawn | **No** | Routine |
| Turn advance error | **Yes** | Unrecoverable |

**Implementation:** After each turn, check `result.state.meta.phase !== prevPhase` and scan the events log for critical event types.

### Task 5: Browser Fallback Path

**File:** `src/ui/warroom/ClickableRegionManager.ts`

The browser fallback (no desktop bridge) does the same loop but calls the browser-safe turn runners directly:

```typescript
// Browser fallback batch
for (let i = 0; i < turnsToAdvance; i++) {
  const working = cloneGameState(gameState);
  if (i === 0 && phase0Directives) applyDirectives(working, phase0Directives);

  if (working.meta.phase === 'phase_0') {
    gameState = runPhase0TurnAndAdvance(working, seed, playerFaction);
  } else if (working.meta.phase === 'phase_i') {
    const { nextState } = await runPhaseITurn(working, { seed, settlementGraph });
    gameState = nextState;
  } else if (working.meta.phase === 'phase_ii') {
    gameState = runPhaseIITurn(working, seed);
  }

  // Same halt checks as desktop path
  ...
}
```

### Task 6: Keyboard Shortcut

**File:** `src/ui/warroom/warroom.ts` (keyboard handler)

Add keyboard shortcut for batch advance:
- **Spacebar** or **Enter**: Advance 1 turn (existing, if implemented)
- **Shift+Enter** or **Shift+Space**: Advance 2 turns (batch)
- **Ctrl+Enter**: Open batch dialog with custom N input

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/ui/warroom/ClickableRegionManager.ts` | Add batch button to dialog, `batchAdvanceTurns()` method, progress UI, halt logic |
| `src/ui/warroom/components/ModalManager.ts` | Optional: add progress modal helpers |
| `src/ui/warroom/warroom.ts` | Optional: keyboard shortcut binding |

**No changes to:**
- `electron-main.cjs` (existing IPC reused)
- `desktop_sim.ts` (existing `advanceTurn` reused)
- `run_phase0_turn.ts`, `run_phase_i_browser.ts`, `run_phase_ii_browser.ts`
- `turn_pipeline.ts`
- `game_state.ts`

---

## Seed Determinism

Each turn in the batch needs a unique seed. The current pattern is:

```typescript
const seed = `turn-${state.meta.turn}-${Date.now()}`;
```

For batch advance, each iteration uses the state's current turn number (which increments each time), so seeds are naturally unique. **No special handling needed** — the loop calls `advanceTurn` which generates the seed internally.

However, for strict determinism in replay, the seed should be derived from turn number + a session-level nonce rather than `Date.now()`. This is an existing issue, not specific to batch advance.

---

## Testing Strategy

1. **Manual:** Batch advance 2 turns in Phase 0. Verify investments apply on turn 1 only. Verify turn counter shows +2.
2. **Phase transition halt:** Set up game near Phase 0→I transition. Batch advance 4 turns. Verify it halts on transition.
3. **Critical event halt:** Set up game near referendum turn. Batch advance past it. Verify halt on referendum event.
4. **Cancel during batch:** Start batch of 10 turns. Press Escape after 3. Verify state is at turn+3, not reverted.
5. **Error recovery:** Corrupt state to trigger advanceTurn error. Batch advance 2 turns. Verify halt on error, state preserved at last good turn.
6. **Browser fallback:** Disable desktop bridge. Batch advance 2 Phase 0 turns. Verify identical result to desktop path.

---

## Future Extensions

- **Auto-advance until condition:** "Advance until Phase I" / "Advance until turn 52"
- **Speed control:** Adjustable delay between turns for visual progression effect
- **Batch replay:** Show compressed summary of all events during batch
- **Custom N input:** Let player type any number of turns (with reasonable cap, e.g., 52)
- **Right-click context menu** on calendar for batch options
