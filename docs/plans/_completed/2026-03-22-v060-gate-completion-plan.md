# v0.6.0 Gate Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all remaining v0.6.0 merge gate items so the version can be tagged.

**Gate definition (from master roadmap):** "Event decisions in HQ, full 1992 metagame loop. War-or-Game sign-off."

**Architecture:** All changes are UI-only or IPC wiring. Zero engine/calibration changes.

**Current state:** 1317 tests, 111 suites, tsc clean, 93.1% area-weighted. Pre-commit hooks active.

---

## Task 1: Wire Event Decision Response IPC

**Problem:** `EventDecisionModal` renders but `onRespond(eventId, responseId)` has no IPC handler. Player sees decisions but can't respond.

**Files:**
- Modify: `src/ui/map/desktop/useIPC.ts`
- Modify: `src/desktop/electron-main.cjs`
- Modify: `src/ui/map/App.tsx` (wire callback)
- Reference: `src/sim/events/resolve_decision.ts`
- Reference: `src/ui/map/components/EventDecisionModal.tsx`

**Step 1: Check existing resolve_decision engine function**

Read `src/sim/events/resolve_decision.ts` to understand the function signature and what it expects.

**Step 2: Add IPC type to useIPC.ts**

Add `respondToEventDecision` to the IPC interface:
```typescript
respondToEventDecision: (eventId: string, responseId: string) => Promise<{ ok: boolean; error?: string }>;
```

Wire it in the implementation block alongside other IPC methods.

**Step 3: Add Electron handler in electron-main.cjs**

Add `ipcMain.handle('respond-to-event-decision', ...)` that:
1. Deserializes current state
2. Calls `resolveEventDecision(state, eventId, responseId)`
3. Re-serializes state
4. Returns `{ ok: true }`

Pattern: follow `stageCorpsStanceOrder` handler.

**Step 4: Wire in App.tsx**

Find where `EventDecisionModal` is rendered. Wire `onRespond` to call `ipc.respondToEventDecision(eventId, responseId)` and then reload the save.

**Step 5: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`
Manual test: load a save with pending decisions, respond, verify state updates.

**Step 6: Commit**

```bash
git add src/ui/map/desktop/useIPC.ts src/desktop/electron-main.cjs src/ui/map/App.tsx
git commit -m "feat(ipc): wire event decision response — player can respond to events"
```

---

## Task 2: Compute and Display Pressure Indicators

**Problem:** `pressureWarning` prop on PresidentialToolbar is hardcoded `false`. Player can't see when events are approaching threshold.

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts` (derive pressure warnings)
- Modify: `src/ui/map/data/types.ts` (add field to LoadedGameState)
- Modify: `src/ui/map/App.tsx` (pass computed value to PresidentialToolbar)
- Modify: `src/ui/map/components/army_hq/SituationBriefing.tsx` (add pressure items)
- Reference: `src/sim/events/pressure_system.ts` (readiness data)

**Step 1: Add pressure data to GameStateAdapter**

Read `pressure_system.ts` to understand the readiness data shape. Derive from `state.military.event_readiness`:
```typescript
function derivePressureWarnings(state: any): boolean {
    const readiness = state.military?.event_readiness;
    if (!readiness) return false;
    // Any event with readiness > 50% of its threshold = pressure warning
    for (const [eventId, value] of Object.entries(readiness)) {
        if (typeof value === 'number' && value > 50) return true;
    }
    return false;
}
```

**Step 2: Add to LoadedGameState type**

Add `pressureWarning: boolean` to types.ts.

**Step 3: Wire in App.tsx**

Replace hardcoded `false` with `loadedGameState?.pressureWarning ?? false`.

**Step 4: Add pressure items to SituationBriefing**

In `generateBriefing()`, add warning items when event readiness is high.

**Step 5: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`

**Step 6: Commit**

```bash
git commit -m "feat(ui): pressure indicators — tensions rising warning when events approach threshold"
```

---

## Task 3: Event Notification UI for Consequence Events

**Problem:** All events display as the same modal. Consequence events (no player choice) should auto-dismiss.

**Files:**
- Modify: `src/ui/map/components/EventModal.tsx`
- Modify: `src/ui/map/App.tsx` (routing logic)

**Step 1: Read EventModal.tsx**

Understand current event display logic. Check how events are queued in App.tsx (`eventQueue`, `eventQueueIndex`).

**Step 2: Add auto-dismiss for non-decision events**

In EventModal or App.tsx, detect events with zero response options (consequence-only). For these:
- Show the event briefly (3-5 seconds)
- Auto-advance to next event or close
- Visual distinction: no action buttons, just "ACKNOWLEDGED" footer

**Step 3: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`
Manual: advance turn with non-decision events, verify auto-dismiss.

**Step 4: Commit**

```bash
git commit -m "feat(ui): auto-dismiss consequence events — no-choice events show briefly then close"
```

---

## Task 4: VERSIONING.md Update

**Problem:** Claims v0.3.1, reality is v0.5.4. Status table contradicts ledger.

**Files:**
- Modify: `docs/20_engineering/VERSIONING.md`

**Step 1: Update current version line**

Change line 170 from `0.3.1` to `0.5.4`.

**Step 2: Update status table**

Mark completed milestones:
- v0.4.x: ✓ COMPLETED
- v0.5.x: ✓ COMPLETED (mostly)
- v0.6.x: IN PROGRESS

Update specific items:
- "Events/decisions: ✗ Not started" → "Events/decisions: ✓ 19 events, pressure system, 56 tests"
- "Scenarios beyond April 1992: ✗ Not started" → "Scenarios: ✓ 40w/52w/56w calibration scenarios"
- "Diplomacy layer: ✗ Not started" → "Diplomacy: ✓ Negotiation capital, patron pressure, strategic dimensions"

**Step 3: Update test count**

627 → 1317 tests.

**Step 4: Commit**

```bash
git commit -m "docs: update VERSIONING.md — v0.3.1 → v0.5.4, milestone status reconciled"
```

---

## Task 5: Pending Decisions Display in Situation Briefing

**Problem:** SituationBriefing already shows pending officer events. It should also show pending EVENT decisions with a link to open the decision modal.

**Files:**
- Modify: `src/ui/map/components/army_hq/SituationBriefing.tsx`
- Reference: `src/ui/map/data/types.ts` (pending event decisions on LoadedGameState)

**Step 1: Check if pending event decisions are on LoadedGameState**

Search for `pending_event_decisions` or `pendingEventDecisions` in types.ts and GameStateAdapter.

**Step 2: Add decision items to generateBriefing()**

```typescript
// Pending event decisions
const pendingDecisions = state.pendingEventDecisions ?? [];
for (const decision of pendingDecisions) {
    items.push({
        id: id(), severity: 'critical', category: 'event_decision',
        title: `Decision required: ${decision.title ?? decision.event_id}`,
        detail: decision.description ?? 'Awaiting your response',
        target: { type: 'none' },
    });
}
```

**Step 3: Verify and commit**

---

## Execution Order

1. **Task 4** (VERSIONING.md) — housekeeping, no dependencies
2. **Task 1** (Event Decision IPC) — critical path, enables metagame loop
3. **Task 2** (Pressure indicators) — independent of Task 1
4. **Task 5** (Pending decisions in briefing) — depends on Task 1
5. **Task 3** (Notification UI) — independent

Tasks 1, 2, 3 can be parallelized.

## Done Gate

- [ ] Player can respond to event decisions from EventDecisionModal
- [ ] Pressure indicators show in toolbar when events approach threshold
- [ ] Consequence events auto-dismiss (no infinite modal blocking)
- [ ] VERSIONING.md matches reality
- [ ] Pending event decisions appear in Situation Briefing
- [ ] `tsc --noEmit` clean
- [ ] `npm run test:vitest` passes
- [ ] `npm run desktop:map:build` passes
- [ ] `npm run sim:scenario:run:40w` passes (no regression from UI changes)

## Not in Scope (v0.6.2+)

- Strategic deltas (▲/▼ per stat)
- Dispatches & Field Reports
- Enclave Dashboard link
- Operation Commander SITREP
- Game Timeline
- AI Commander + Event integration
- Dayton synthesis
