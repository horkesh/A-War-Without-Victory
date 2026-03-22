# Game Chronicle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a living vertical spine timeline that weaves military, political, humanitarian, diplomatic, and narrative threads into the story of the player's war. Top-level feature accessible from toolbar + clickable date.

**Architecture:** Pure UI feature reading existing engine data. One minimal engine addition (per-turn snapshots on TurnSummary). `generateChronicleEntries()` pure function produces card array from LoadedGameState. `ChronicleOverlay` renders the spine + cards. 6 card types with distinct colors.

**Tech Stack:** React + Tailwind (map UI). Vitest for tests. No new dependencies.

**Design spec:** `docs/plans/2026-03-22-game-chronicle-design.md`

---

### Task 1: Add per-turn snapshots to TurnSummary
**Role:** Systems Programmer

**Files:**
- Modify: `src/state/turn_summary.ts`
- Modify: `src/sim/compile_turn_summary.ts`
- Test: `tests/compile_turn_summary.test.ts` (if exists, otherwise inline verification)

**Step 1: Add snapshot fields to TurnSummary**

In `src/state/turn_summary.ts`, add to the `TurnSummary` interface:

```typescript
    // --- Snapshot (for Chronicle spine ribbon) ---
    /** Area-weighted territory % per faction at end of this turn. */
    territory_snapshot?: Partial<Record<FactionId, number>>;
    /** General supply reserve per faction at end of this turn. */
    supply_snapshot?: Partial<Record<FactionId, number>>;
```

**Step 2: Populate in compileTurnSummary**

In `src/sim/compile_turn_summary.ts`, find where the TurnSummary object is constructed (the `return` or final assignment). Add:

```typescript
// Territory snapshot (area-weighted)
const osidAreas = getOsidAreas(); // reuse existing lazy loader from compute_capital
const terrSnapshot: Partial<Record<FactionId, number>> = {};
const controllers = state.political?.political_controllers ?? {};
const areaByFaction: Record<string, number> = {};
for (const osid of Object.keys(controllers).sort(strictCompare)) {
    const ctrl = controllers[osid];
    if (ctrl) areaByFaction[ctrl] = (areaByFaction[ctrl] ?? 0) + (osidAreas.areas[osid] ?? 0);
}
for (const f of ['RS', 'RBiH', 'HRHB'] as const) {
    terrSnapshot[f] = osidAreas.total > 0 ? ((areaByFaction[f] ?? 0) / osidAreas.total) * 100 : 0;
}
summary.territory_snapshot = terrSnapshot;

// Supply snapshot
const supSnapshot: Partial<Record<FactionId, number>> = {};
for (const f of ['RS', 'RBiH', 'HRHB'] as const) {
    supSnapshot[f] = state.military?.general_supply_reserve?.[f] ?? 0;
}
summary.supply_snapshot = supSnapshot;
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run`

**Step 4: Commit**

```bash
git add src/state/turn_summary.ts src/sim/compile_turn_summary.ts
git commit -m "feat(engine): territory + supply snapshots on TurnSummary for Chronicle"
```

---

### Task 2: Chronicle entry generator
**Role:** Gameplay Programmer

**Files:**
- Create: `src/ui/map/components/chronicle/generateChronicleEntries.ts`
- Test: `tests/chronicle_entries.test.ts`

**Step 1: Define types and write failing test**

```typescript
// src/ui/map/components/chronicle/generateChronicleEntries.ts
export type ChronicleCardType = 'combat' | 'political' | 'humanitarian' | 'military' | 'diplomatic' | 'narrative';

export interface ChronicleEntry {
    turn: number;
    type: ChronicleCardType;
    headline: boolean;
    title: string;
    detail: string;
    metadata?: {
        corpsId?: string;
        osid?: string;
        operationName?: string;
        dimensionShifts?: Array<{ dimension: string; delta: number }>;
        casualties?: number;
        displaced?: number;
    };
}
```

```typescript
// tests/chronicle_entries.test.ts
import { generateChronicleEntries } from '../src/ui/map/components/chronicle/generateChronicleEntries.js';

describe('generateChronicleEntries', () => {
    it('returns empty array for null state', () => {
        expect(generateChronicleEntries(null as any)).toEqual([]);
    });

    it('creates combat card for battle with territory flip', () => {
        const state = {
            turn: 10,
            turnSummaries: [{
                turn: 10,
                battles: [{ osid: 'op:brcko:brcko_2', attacker_faction: 'RS', defender_faction: 'RBiH',
                    outcome: 'decisive_victory', attacker_casualties: 50, defender_casualties: 200, territory_flipped: true }],
                notable_flips: [], events_fired: [], notable_events: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: { RS: 1, RBiH: -1 }, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
            firedEvents: [],
        };
        const entries = generateChronicleEntries(state as any);
        const combat = entries.filter(e => e.type === 'combat');
        expect(combat.length).toBeGreaterThan(0);
        expect(combat[0].turn).toBe(10);
    });

    it('creates political card for fired event', () => {
        const state = {
            turn: 5,
            turnSummaries: [{
                turn: 5,
                battles: [], notable_flips: [], notable_events: [],
                events_fired: [{ id: 'rs_strategic_goals', text: 'The Assembly Speaks' }],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const political = entries.filter(e => e.type === 'political');
        expect(political.length).toBeGreaterThan(0);
    });

    it('filters minor battles (no territory flip, low casualties)', () => {
        const state = {
            turn: 10,
            turnSummaries: [{
                turn: 10,
                battles: [{ osid: 'op:test:test_1', attacker_faction: 'RS', defender_faction: 'RBiH',
                    outcome: 'stalemate', attacker_casualties: 10, defender_casualties: 10, territory_flipped: false }],
                notable_flips: [], events_fired: [], notable_events: [],
                decoration_awards: [], arc_transitions: [], formation_spawns: [], formation_destructions: [],
                displacement_total: 0, displacement_by_ethnicity: {},
                territory_net: {}, supply_deltas: {}, heavy_munitions_deltas: {},
                movements: [], supply_transitions: [],
            }],
        };
        const entries = generateChronicleEntries(state as any);
        const combat = entries.filter(e => e.type === 'combat');
        expect(combat.length).toBe(0); // Filtered out — minor
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chronicle_entries.test.ts`
Expected: FAIL — module not found

**Step 3: Implement generateChronicleEntries**

Create `src/ui/map/components/chronicle/generateChronicleEntries.ts` with the full generator function. Reads `state.turnSummaries[]` and produces `ChronicleEntry[]`. Apply significance thresholds:
- Battles: only if `territory_flipped` OR total casualties > 100
- Displacement: only if > 500 per turn
- Events: always show
- Formations: only spawns/destructions + shattered/risen arcs
- Notable events: always show

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chronicle_entries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/map/components/chronicle/generateChronicleEntries.ts tests/chronicle_entries.test.ts
git commit -m "feat(chronicle): generateChronicleEntries — pure function producing card array"
```

---

### Task 3: Chronicle store state + toolbar wiring
**Role:** UI/UX Developer

**Files:**
- Modify: `src/ui/map/store/gameStore.ts`
- Modify: `src/ui/map/components/PresidentialToolbar.tsx`
- Modify: `src/ui/map/App.tsx`

**Step 1: Add chronicleOpen state to gameStore**

```typescript
chronicleOpen: boolean;
setChronicleOpen: (open: boolean) => void;
```

Initialize: `chronicleOpen: false`
Setter: `setChronicleOpen: (open) => set({ chronicleOpen: open })`

**Step 2: Add CHRONICLE button to PresidentialToolbar**

In the LEFT section (next to date), add a button:

```tsx
<button
    onClick={() => useGameStore.getState().setChronicleOpen(true)}
    className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-secondary hover:text-amber-400 transition-colors"
>
    CHRONICLE
</button>
```

Make the date label also clickable (wraps existing date display in a button).

**Step 3: Add C keyboard shortcut in App.tsx**

In the existing keyboard handler, add:

```typescript
else if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    useGameStore.getState().setChronicleOpen(true);
}
```

**Step 4: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`

**Step 5: Commit**

```bash
git commit -m "feat(chronicle): store state + toolbar button + date click + C shortcut"
```

---

→ /simplify → commit

---

### Task 4: ChronicleCard component
**Role:** UI/UX Developer

**Files:**
- Create: `src/ui/map/components/chronicle/ChronicleCard.tsx`

**Step 1: Build the 6 card type variants**

Each card type has a distinct left border color, compact layout (2-3 lines):

```tsx
const CARD_COLORS: Record<ChronicleCardType, string> = {
    combat: 'border-l-[#c04040]',
    political: 'border-l-[#c4a35a]',
    humanitarian: 'border-l-[#4080b8]',
    military: 'border-l-[#4a9a55]',
    diplomatic: 'border-l-[#8855aa]',
    narrative: 'border-l-[#d5c9bc]',
};
```

Headline cards get `col-span-2` and a larger font. Regular cards are single-column.

**Step 2: Verify**

Run: `npm run desktop:map:build`

**Step 3: Commit**

```bash
git commit -m "feat(chronicle): ChronicleCard — 6 card types + headline variant"
```

---

### Task 5: ChronicleSpine component (ribbon renderer)
**Role:** UI/UX Developer

**Files:**
- Create: `src/ui/map/components/chronicle/ChronicleSpine.tsx`

**Step 1: Build the spine ribbon**

The spine is a vertical central element that renders:
- A thin vertical line (the spine itself)
- Territory % bands as colored horizontal bars at each turn tick
- Turn labels at regular intervals (every 4 turns)

Reads `turnSummaries[].territory_snapshot` for the ribbon data.

Uses CSS (no canvas) — a flex column with rows for each turn that has data.

**Step 2: Verify**

Run: `npm run desktop:map:build`

**Step 3: Commit**

```bash
git commit -m "feat(chronicle): ChronicleSpine — territory ribbon + turn ticks"
```

---

→ /simplify → commit

---

### Task 6: ChronicleOverlay — full-screen assembly
**Role:** UI/UX Developer

**Files:**
- Create: `src/ui/map/components/chronicle/ChronicleOverlay.tsx`
- Modify: `src/ui/map/App.tsx` — render overlay

**Step 1: Build the overlay**

Full-screen overlay (z-1000) with:
- Header: "WAR CHRONICLE" + close button + ESC handler
- Scrollable body with spine on left, cards on right
- Cards alternate left/right of spine for visual variety
- Headline cards span full width

```tsx
export function ChronicleOverlay() {
    const open = useGameStore(s => s.chronicleOpen);
    const setOpen = useGameStore(s => s.setChronicleOpen);
    const state = useGameStore(s => s.loadedGameState);

    const entries = useMemo(() =>
        state ? generateChronicleEntries(state) : [],
        [state]
    );

    if (!open || !state) return null;

    // Group entries by turn for spine layout
    // Render spine + cards
}
```

**Step 2: Wire in App.tsx**

Add `<ChronicleOverlay />` alongside other overlays.

**Step 3: Verify**

Run: `npx tsc --noEmit`
Run: `npm run desktop:map:build`
Manual: open game, press C, verify Chronicle renders with cards from turn summaries.

**Step 4: Commit**

```bash
git commit -m "feat(chronicle): ChronicleOverlay — full-screen timeline assembly"
```

---

## Execution Order

```
Task 1 (engine snapshots) — independent, do first
Task 2 (entry generator) — independent of Task 1 (reads existing data)
Task 3 (store + toolbar) — independent
Task 4 (card component) — needs Task 2 types
Task 5 (spine) — needs Task 1 snapshots
Task 6 (overlay assembly) — needs Tasks 2-5

Task 1 ──────────────────────→ Task 5 ─┐
Task 2 → Task 4 ──────────────────────→ Task 6
Task 3 ────────────────────────────────→ Task 6
```

Tasks 1, 2, 3 can be parallelized.

## Done Gate

- [ ] TurnSummary has `territory_snapshot` and `supply_snapshot` per turn
- [ ] `generateChronicleEntries()` produces typed cards from LoadedGameState
- [ ] CHRONICLE button on toolbar opens overlay
- [ ] Date label clickable → opens overlay
- [ ] C keyboard shortcut opens overlay
- [ ] 6 card types render with distinct colors
- [ ] Headline cards span full width
- [ ] Spine shows territory bands from snapshot data
- [ ] Significance filtering: minor events hidden, major events shown
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` passes (new tests for entry generator)
- [ ] `desktop:map:build` passes
- [ ] 40w scenario: zero regression (snapshot fields are additive)

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions flagged for user review
- [ ] Napkin read at start, updated during work
- [ ] Ledger entry appended on completion
- [ ] Life lessons scanned, relevant ones flagged
- [ ] tsc + vitest after every phase
- [ ] /simplify between each phase
- [ ] Version bump + tag on milestone completion

## Completion Checklist

- [ ] Implementation report in `docs/40_reports/implemented/`
- [ ] Canon docs updated (if applicable)
- [ ] Master files updated (if applicable)
- [ ] VERSIONING.md milestone marked complete
- [ ] PROJECT_LEDGER.md entry appended
- [ ] Napkin updated

---

## Not In Scope (v0.6.3 — Wrapped)

- WrappedOverlay (10-slide cinematic)
- SpiderChart component
- Turning point markers
- generateWrappedSlides() analysis
