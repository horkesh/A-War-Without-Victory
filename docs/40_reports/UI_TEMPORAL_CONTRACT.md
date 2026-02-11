# UI Temporal Contract — A War Without Victory
**Version:** v1.0
**Date:** 2026-02-03
**Status:** Enforceable Rules for Turn Timing
**Purpose:** Define which UI elements reflect T, T-1, T-N, and how turn advancement works

---

## 1. Core Temporal Principle

**The UI has multiple temporal layers operating simultaneously:**
- **Present state (T)**: Current turn strategic situation
- **Recent past (T-1)**: News/reports about last turn's events (fog of war)
- **Historical record (T-N)**: Archived data, monthly aggregates

**Key rule**: Different UI elements intentionally show different temporal slices. This is **by design**, not a bug. The player must understand which information is current vs delayed.

---

## 2. Temporal State Definitions

| Symbol | Meaning | Example (if current turn = 24) |
|--------|---------|-------------------------------|
| **T** | Current turn (present) | Turn 24 |
| **T-1** | Last turn (1 turn ago) | Turn 23 |
| **T-2** | Two turns ago | Turn 22 |
| **T-4** | Four turns ago (last month) | Turn 20 |
| **T-N** | N turns ago (generic past) | Turn 24-N |

**Turn duration**: 1 turn = 1 week

**Month duration**: 4 turns = 1 month (simplified for gameplay)

---

## 3. UI Element Temporal Classifications

### 3.1 Present State (T) Elements

**These elements ALWAYS reflect the current turn state:**

| UI Element | Temporal State | Update Trigger | Rationale |
|------------|----------------|----------------|-----------|
| **Wall map** | T (current) | Every turn | Strategic situation display — must show "now" |
| **Wall calendar** | T (current) | Every turn | Turn advancement mechanism — shows current week |
| **National crest** | T (current) | On faction change | Player's current faction identity |
| **Ashtray/Coffee sprites** | T (current) | On desperation change | Current HQ stress level |
| **Wall cracks overlay** | T (current) | On desperation change | Current structural deterioration |
| **Paper scatter** | T (current) | On desperation change | Current HQ disarray |
| **Lighting filter** | T (current) | On desperation change | Current HQ lighting conditions |
| **Headgear condition** | T (current) | On desperation change | Stable vs desperate (binary) |
| **Faction Overview Panel** | T (current) | On click (live query) | Real-time strategic dashboard |

**Invariant**: After turn advancement completes, ALL T elements reflect new turn state.

---

### 3.2 Recent Past (T-1) Elements

**These elements intentionally LAG by 1 turn (fog of war mechanism):**

| UI Element | Temporal State | Update Trigger | Rationale |
|------------|----------------|----------------|-----------|
| **Newspaper** | T-1 (last turn) | Every turn | **FOG OF WAR** — news reports yesterday's events |
| **Situation Reports** | T-1 to T-2 | Every turn | Field reports take 1-2 turns to reach HQ |

**Fog of War Rule**: Newspapers and reports are **intentionally delayed**. They reflect what happened last turn, with potential inaccuracies (85% accuracy baseline, varies by faction bias).

**Example**:
- Turn 24 processes
- Map shows Turn 24 control zones (T)
- Newspaper shows Turn 23 events (T-1)
- Player sees "present map" but "yesterday's news"

---

### 3.3 Historical Aggregate (T-4 to T-1) Elements

**These elements reflect monthly aggregates:**

| UI Element | Temporal State | Update Trigger | Rationale |
|------------|----------------|----------------|-----------|
| **Monthly Magazine** | T-4 to T-1 (last month) | Every 4th turn | Published 1 week after month ends |
| **Radio ticker (some items)** | T-7 to T (current week) | Every turn | Mix of breaking news (T) and week-old news (T-7) |

**Magazine Publication Timing**:
- Month M = Turns 4M-3, 4M-2, 4M-1, 4M
- Magazine for Month M published at Turn 4M+1
- Example: Month 6 (Turns 21, 22, 23, 24) → Magazine published at Turn 25

**Radio Ticker Timing**:
- 70% real-world historical news (T-7 to T range)
- 30% Bosnia news (T for breaking, T-1 for reported events)

---

## 4. Turn Advancement Sequence (Strict Order)

**When player clicks calendar (or presses SPACE/ENTER):**

```
┌─────────────────────────────────────────────────────────────┐
│ TURN ADVANCEMENT PIPELINE (Strict Sequential Order)         │
└─────────────────────────────────────────────────────────────┘

Phase 1: PRE-PROCESSING
├─ Check turnInProgress flag (prevent double-click)
├─ Optional confirmation modal (if enabled)
│  └─ User confirms: "Advance to Week {T+1}?"
└─ Set turnInProgress = true

Phase 2: GAME STATE UPDATE
├─ Engine processes turn pipeline (see Phase A Invariants):
│  ├─ Resolve control flips (settlements change hands)
│  ├─ Calculate exhaustion, supply, authority
│  ├─ Generate displacement flows
│  ├─ Update faction strengths
│  ├─ Log events to turnLog[T]
│  └─ Increment turn counter: T → T+1
└─ Recompute desperation metrics from new state

Phase 3: UI UPDATES (Present State - T)
├─ Calendar:
│  ├─ Increment week counter
│  ├─ If week > 4: advance month, reset week to 1
│  ├─ Re-render calendar with new week highlighted
│  └─ "Page tear" animation (optional polish)
├─ Map:
│  ├─ Re-render control zones from new settlement state
│  ├─ Update frontlines (if Phase II)
│  ├─ Update unit symbols (if Phase II)
│  └─ Fade transition (0.3s)
├─ Desperation Indicators:
│  ├─ If desperation level changed:
│  │  ├─ Swap ashtray/coffee sprites
│  │  ├─ Update crack overlay (SVG opacity/pattern)
│  │  ├─ Adjust lighting CSS filter
│  │  ├─ Reposition scattered paper sprites
│  │  └─ Swap headgear sprite (stable↔desperate)
│  └─ Else: skip (no visual change)
└─ Faction Overview (if open):
   └─ Re-query live data from new state

Phase 4: UI UPDATES (Recent Past - T-1)
├─ Newspaper Generation:
│  ├─ Extract events from turnLog[T] (now becomes T-1 for next turn)
│  ├─ Rank events by importance (control flips, massacres, etc.)
│  ├─ Check for scripted events (referendum, breadline, etc.)
│  ├─ Generate headline + subhead + lead story
│  ├─ Generate news photo (halftone filter on map screenshot)
│  ├─ Apply faction bias (spin events favorably)
│  ├─ Apply fog of war (15% inaccuracy)
│  ├─ Render text onto newspaper template
│  └─ Display on desk (slide forward animation, 0.4s)
├─ Situation Reports:
│  └─ Generate new corps reports from turnLog[T-1 to T-2]
└─ Push previous newspaper to archive (optional)

Phase 5: UI UPDATES (Historical Aggregate)
└─ Monthly Magazine Check:
   ├─ If turn % 4 == 1 (new month started):
   │  ├─ Aggregate data from turns T-4 to T-1
   │  ├─ Generate magazine cover (stats, charts)
   │  ├─ Generate interior pages (corps performance, supply)
   │  └─ Display on desk
   └─ Else: skip

Phase 6: POST-PROCESSING
├─ Clear turnInProgress flag
├─ Save auto-save snapshot (optional)
└─ Trigger "turn complete" event for achievements/tracking

Total Duration: ~1-3 seconds (depending on animation settings)
```

---

## 5. Determinism Guarantees

### 5.1 Visual State Determinism

**Guarantee**: For any given game state at turn T, all UI elements render identically on any machine.

**Implementation**:
```typescript
interface GameState {
  turn: number;              // Current turn counter
  phase: 0 | 1 | 2;          // Pre-war, Early-war, Late-war
  playerFaction: FactionId;  // RBiH, RS, HRHB
  settlements: Settlement[]; // Control state (faction, authority)
  turnLog: TurnEvent[];      // Last 10 turns of events
}

// Derived state (NOT serialized, recomputed on load)
interface DerivedState {
  desperation: DesperationMetrics;    // Computed from settlements/exhaustion
  calendarState: CalendarState;       // Computed from turn → date
  newspaperData: NewspaperData;       // Computed from turnLog[T-1]
  magazineData?: MagazineData;        // Computed from turnLog[T-4 to T-1] if month just ended
}
```

**Key principle**: Only core game state is serialized. All UI state is **recomputed** from core state on load.

### 5.2 Temporal State Recomputation

**On save/load:**
```typescript
function loadGame(saveData: string): GameState {
  const state = JSON.parse(saveData);

  // Recompute all temporal UI state
  return {
    ...state,
    // These are recomputed, not loaded from save:
    desperation: calculateDesperation(state),
    calendarState: turnToCalendarState(state.turn),
    newspaperData: generateNewspaper(state, state.playerFaction, state.turn - 1),
    magazineData: (state.turn % 4 === 1) ? generateMagazine(state) : undefined
  };
}
```

**Result**: Loading a save at turn T produces identical visuals to playing through to turn T.

---

## 6. Edge Cases and Special Rules

### 6.1 Turn 1 (Game Start)

**Special case**: No T-1 exists.

**Solution**:
- Newspaper shows "Pre-War Tensions" scripted article (referendum buildup)
- No situation reports yet (field reporting not established)
- Magazine N/A (need 4 turns for first month)

### 6.2 Phase Transitions

**When phase changes (e.g., Phase 0 → Phase 1):**

**Map updates**:
- Phase 0: No control zones (settlements show ethnic composition only)
- Phase 1: Control zones appear (militia emerge, control flips begin)
- Phase 2: Frontlines + unit symbols appear

**Newspaper content shifts**:
- Phase 0: Political news (declarations, referendum, negotiations)
- Phase 1: Control flip news (militia seize villages, ethnic cleansing)
- Phase 2: Military operation news (offensives, sieges, frontline movements)

### 6.3 Scripted Events Override

**Priority**:
1. Scripted events (referendum, breadline massacre, etc.) **always** take headline
2. Emergent events (control flips, etc.) become secondary stories

**Implementation**:
```typescript
function generateNewspaper(state: GameState, faction: FactionId, turn: number): NewspaperData {
  const scriptedEvent = checkScriptedEvents(state, turn);

  if (scriptedEvent) {
    return {
      headline: scriptedEvent.headline,       // Scripted content
      subhead: scriptedEvent.subhead,
      leadStory: scriptedEvent.content,
      sidebarStories: generateEmergentSidebars(state, turn) // Emergent content as sidebars
    };
  } else {
    // No scripted event, use emergent top story
    return generateEmergentNewspaper(state, faction, turn);
  }
}
```

### 6.4 Save Compatibility Across Temporal States

**Problem**: Player saves at turn 24, but newspaper shows turn 23 events. If turn 23 events are missing from turnLog, newspaper breaks.

**Solution**: Always save last 10 turns of events:
```typescript
interface GameState {
  turnLog: TurnEvent[]; // Circular buffer, size 10
}

function saveTurnEvents(state: GameState, newEvents: TurnEvent[]) {
  state.turnLog.push(...newEvents);
  if (state.turnLog.length > 10) {
    state.turnLog = state.turnLog.slice(-10); // Keep last 10 only
  }
}
```

**Guarantee**: Newspaper can always access T-1 events (as long as T ≤ 10).

---

## 7. Player-Facing Temporal Indicators

**How does the player know which UI element shows which time?**

### 7.1 Visual Cues

| UI Element | Temporal Cue | Player Understanding |
|------------|--------------|---------------------|
| Map | Always T | "This is the current situation" |
| Calendar | Week highlighted | "This is the current week" |
| Newspaper | Masthead date shows T-1 | "This is yesterday's news" |
| Magazine | Cover shows "MAY 1992" (T-4 to T-1) | "This is last month's report" |
| Faction Overview | Live query, no lag | "This is real-time data" |

### 7.2 Tutorial Messaging

**First time player sees newspaper:**
```
┌─────────────────────────────────────────────────────────────┐
│ INTELLIGENCE BRIEFING                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Newspapers report YESTERDAY'S events (fog of war).           │
│                                                              │
│ • The map shows the CURRENT situation                        │
│ • Newspapers show LAST TURN's events                         │
│ • Reports may contain inaccuracies or bias                   │
│                                                              │
│ Use newspapers to understand what happened, but verify       │
│ against the map to see the current state.                    │
│                                                              │
│ [OK, Got It]                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Testing Checklist

**To verify temporal contract compliance:**

- [ ] **Present state (T)**: After turn advancement, map shows T control zones
- [ ] **Present state (T)**: After turn advancement, calendar shows T week
- [ ] **Recent past (T-1)**: After turn advancement, newspaper shows T-1 events
- [ ] **Determinism**: Save at T, load, verify map+newspaper+calendar identical
- [ ] **Edge case (Turn 1)**: Newspaper shows pre-war scripted content, not crash
- [ ] **Edge case (Month boundary)**: Turn 24→25 generates new magazine
- [ ] **Scripted events**: Referendum turn generates referendum newspaper (overrides emergent)
- [ ] **Fog of war**: Newspaper inaccuracy rate ~15% (test with known events)
- [ ] **Faction bias**: RS newspaper spins RBiH losses favorably (bias implementation)
- [ ] **Turn log preservation**: Save/load preserves last 10 turns for newspaper generation

---

## 9. API Contract (Engine → UI)

**UI components must implement these interfaces:**

```typescript
// Calendar rendering
interface CalendarRenderer {
  render(turn: number): HTMLCanvasElement;
  // turn → calendar state (month/year/week) is deterministic function
}

// Newspaper generation
interface NewspaperGenerator {
  generate(gameState: GameState, faction: FactionId, turn: number): NewspaperData;
  // turn parameter specifies WHICH turn's events to report (T-1 for current newspaper)
}

// Magazine generation
interface MagazineGenerator {
  generate(gameState: GameState, monthStart: number, monthEnd: number): MagazineData;
  // monthStart/monthEnd define range (e.g., turns 21-24 for Month 6)
}

// Map rendering
interface MapRenderer {
  render(gameState: GameState): HTMLCanvasElement;
  // Renders T (current turn) control zones, never T-1
}
```

---

**END OF UI TEMPORAL CONTRACT**

**Status:** Enforceable rules for all UI temporal behavior

**Key Takeaway**: Different UI elements intentionally show different temporal slices. This is a **core game mechanic** (fog of war via delayed news), not a bug. Always respect the temporal contract when implementing UI features.
