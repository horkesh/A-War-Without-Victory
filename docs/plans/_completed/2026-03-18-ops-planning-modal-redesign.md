# Ops Planning Modal Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing sector-scoped OpsPlanningModal with a corps-level, full-bleed map modal using a 4-phase flow (Commander → Plan → G2 Assessment → Authorize) and "analog soul, digital skeleton" aesthetic.

**Architecture:** Single new `OpsPlanningModal.tsx` component replaces the existing one. It owns a MapLibre instance for the full-bleed map, manages 4-phase state machine internally, and communicates with the backend via existing `stageCorpsOperationOrder` and `queryOperationPrediction` IPC calls. Sub-components live in `src/ui/map/components/ops_modal/`. The existing `plan_ui/` directory is deprecated — reusable pieces (ReadinessBar, opsConstants) are imported directly; the rest is rewritten.

**Tech Stack:** React 18, Zustand (gameStore), MapLibre GL JS, Tailwind CSS, TypeScript. Backend: existing `computeOperationPrediction` in `src/sim/combat/operation_prediction.ts`, IPC via Electron preload bridge.

**Visual prototype:** `docs/60_visualisations/ops_planning_prototype.html`

---

## Task Dependency Graph

```
Task 1 (Store) ──┐
Task 2 (Types)  ──┼── Task 4 (Phase 1: Commander) ──┐
Task 3 (Shell)  ──┘                                   │
                                                       ├── Task 6 (Phase 2: Plan) ──── Task 8 (G2 IPC Wiring)
Task 5 (Map Engine) ──────────────────────────────────┘           │
                                                                   ├── Task 9 (Phase 3: G2 Assessment)
Task 7 (Brigade Auto-Propose) ────────────────────────────────────┘           │
                                                                               └── Task 10 (Phase 4: Authorize)
Task 11 (Integration + Cleanup)
Task 12 (Smoke Test + Polish)
```

---

## Task 1: Store Updates — Corps-Level Ops Planning State

**Files:**
- Modify: `src/ui/map/store/gameStore.ts`

**Context:** The current store has `opsPlanningModalOpen: boolean` and `selectedCorpsFrontSectorId`. We need to add the corps context and selected commander so the modal knows what it's working with.

**Step 1: Add new store fields**

Add these fields to the store interface (near line 152):

```typescript
// Ops planning modal — corps-level context
opsPlanningCorpsId: string | null;
opsPlanningOriginSectorId: string | null;
opsPlanningSelectedOfficerId: string | null;
setOpsPlanningContext: (corpsId: string, originSectorId: string) => void;
setOpsPlanningSelectedOfficerId: (id: string | null) => void;
clearOpsPlanningContext: () => void;
```

Add implementations in the create block (near line 317):

```typescript
opsPlanningCorpsId: null,
opsPlanningOriginSectorId: null,
opsPlanningSelectedOfficerId: null,
setOpsPlanningContext: (corpsId, originSectorId) => set({
    opsPlanningModalOpen: true,
    opsPlanningCorpsId: corpsId,
    opsPlanningOriginSectorId: originSectorId,
    opsPlanningSelectedOfficerId: null,
}),
setOpsPlanningSelectedOfficerId: (id) => set({ opsPlanningSelectedOfficerId: id }),
clearOpsPlanningContext: () => set({
    opsPlanningModalOpen: false,
    opsPlanningCorpsId: null,
    opsPlanningOriginSectorId: null,
    opsPlanningSelectedOfficerId: null,
}),
```

**Step 2: Update CorpsDetail launch point**

In `src/ui/map/components/CorpsDetail.tsx`, change `handleOpenOpsPlanning` (~line 105):

```typescript
const setOpsPlanningContext = useGameStore((s) => s.setOpsPlanningContext);

const handleOpenOpsPlanning = () => {
    const primarySector = corpsSectors[0];
    if (primarySector) {
        setOpsPlanningContext(selectedCorpsId, primarySector.sector_id);
    } else {
        setLoadError('Ops Planning requires the Corps to be assigned to a front sector.');
    }
};
```

Remove the old `setSelectedCorpsFrontSectorId` + `setOpsPlanningModalOpen` calls.

**Step 3: Run smoke test**

```bash
npx tsc --noEmit
```

Expected: PASS (no type errors).

**Step 4: Commit**

```bash
git add src/ui/map/store/gameStore.ts src/ui/map/components/CorpsDetail.tsx
git commit -m "feat(store): add corps-level ops planning context to gameStore"
```

---

## Task 2: Shared Types — Ops Modal Domain Types

**Files:**
- Create: `src/ui/map/components/ops_modal/types.ts`

**Context:** Define all types used across the ops modal sub-components. Keep them in one file to avoid circular imports.

**Step 1: Write the types file**

```typescript
// Ops Planning Modal — shared types
// Phase flow: commander → plan → g2_assessment → authorize

export type OpsPhase = 'commander' | 'plan' | 'g2_assessment' | 'authorize';

export type OpType =
    | 'sector_attack' | 'general_offensive'
    | 'strategic_defense' | 'reorganization'
    | 'feint' | 'probe';

export type Tempo = 'methodical' | 'standard' | 'all_out';

export type Tolerance =
    | 'decisive_victory' | 'victory' | 'costly_victory'
    | 'stalemate' | 'repulsed';

export interface AxisState {
    id: string;
    name: string;
    brigadeIds: string[];
    objectives: string[];
    stagingOsid?: string;
}

export interface BrigadePlanView {
    id: string;
    name: string;
    personnel: number;
    tanks: number;
    artillery: number;
    cohesion: number;
    fatigue: number;
    morale: number;
    locationOsid: string;
    marchTurnsToStaging: number | null;  // null = unknown
    isAutoProposed: boolean;
    isCombatIneffective: boolean;   // personnel < 400
    isDisrupted: boolean;
    status: string;
}

export interface OpsPlanState {
    opName: string;
    opType: OpType;
    tempo: Tempo;
    tolerance: Tolerance;
    artilleryPreparation: boolean;
    schwerpunktOsid: string;
    axes: AxisState[];
    activeAxisId: string;
    defaultStagingOsid: string;
}

export const OP_TYPE_LABELS: Record<OpType, string> = {
    sector_attack: 'Sector Attack',
    general_offensive: 'General Offensive',
    strategic_defense: 'Strategic Defense',
    reorganization: 'Reorganization',
    feint: 'Feint',
    probe: 'Probe',
};

export const TEMPO_LABELS: Record<Tempo, string> = {
    methodical: 'Methodical',
    standard: 'Standard',
    all_out: 'All-Out',
};

export const TOLERANCE_LABELS: Record<Tolerance, string> = {
    decisive_victory: 'Decisive Only',
    victory: 'Victory Required',
    costly_victory: 'Accept Costly',
    stalemate: 'Accept Stalemate',
    repulsed: 'Regardless',
};

export const PHASE_LABELS: Record<OpsPhase, string> = {
    commander: 'Commander',
    plan: 'Plan',
    g2_assessment: 'G-2 Assessment',
    authorize: 'Authorize',
};

export const PHASE_ORDER: OpsPhase[] = ['commander', 'plan', 'g2_assessment', 'authorize'];
```

**Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

**Step 3: Commit**

```bash
git add src/ui/map/components/ops_modal/types.ts
git commit -m "feat(ops-modal): add shared types for ops planning modal"
```

---

## Task 3: Modal Shell — Phase State Machine + Layout

**Files:**
- Create: `src/ui/map/components/ops_modal/OpsPlanningModal.tsx`
- Modify: `src/ui/map/App.tsx` (swap import)

**Context:** The outer shell manages phase state, keyboard navigation, and renders the full-bleed map container with floating panels. Each phase's content is a child component rendered conditionally.

**Step 1: Write the shell component**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { OpsPhase } from './types';
import { PHASE_ORDER, PHASE_LABELS } from './types';

export function OpsPlanningModal() {
    const isOpen = useGameStore((s) => s.opsPlanningModalOpen);
    const corpsId = useGameStore((s) => s.opsPlanningCorpsId);
    const clearContext = useGameStore((s) => s.clearOpsPlanningContext);

    const [phase, setPhase] = useState<OpsPhase>('commander');
    const [highestPhase, setHighestPhase] = useState(0);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Track highest reached phase for backtracking
    useEffect(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        setHighestPhase((prev) => Math.max(prev, idx));
    }, [phase]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPhase('commander');
            setHighestPhase(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { clearContext(); return; }
            const currentIdx = PHASE_ORDER.indexOf(phase);
            if (e.key === 'ArrowRight' && currentIdx < highestPhase) {
                setPhase(PHASE_ORDER[currentIdx + 1]);
            }
            if (e.key === 'ArrowLeft' && currentIdx > 0) {
                setPhase(PHASE_ORDER[currentIdx - 1]);
            }
            // Number keys for direct phase jump (backtracking only)
            const num = parseInt(e.key);
            if (num >= 1 && num <= 4 && num - 1 <= highestPhase) {
                setPhase(PHASE_ORDER[num - 1]);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, phase, highestPhase, clearContext]);

    const advancePhase = useCallback(() => {
        const idx = PHASE_ORDER.indexOf(phase);
        if (idx < PHASE_ORDER.length - 1) setPhase(PHASE_ORDER[idx + 1]);
    }, [phase]);

    const goToPhase = useCallback((target: OpsPhase) => {
        const targetIdx = PHASE_ORDER.indexOf(target);
        if (targetIdx <= highestPhase) setPhase(target);
    }, [highestPhase]);

    if (!isOpen || !corpsId) return null;

    const currentIdx = PHASE_ORDER.indexOf(phase);

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60">
            {/* Full-bleed map background */}
            <div ref={mapContainerRef} className="absolute inset-0" />

            {/* Phase indicator — top center */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2
                            bg-[rgba(20,18,15,0.88)] backdrop-blur-xl rounded-full px-4 py-2
                            border border-[rgba(180,160,130,0.15)]">
                {PHASE_ORDER.map((p, i) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => goToPhase(p)}
                        disabled={i > highestPhase}
                        className="flex items-center gap-2 group"
                    >
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === currentIdx
                                ? 'bg-accent-gold shadow-[0_0_8px_rgba(196,163,90,0.5)]'
                                : i <= highestPhase
                                    ? 'bg-accent-gold/40 group-hover:bg-accent-gold/70'
                                    : 'bg-[rgba(180,160,130,0.15)]'
                        }`} />
                        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-colors ${
                            i === currentIdx ? 'text-accent-gold' : i <= highestPhase ? 'text-text-secondary' : 'text-text-secondary/30'
                        }`}>
                            {PHASE_LABELS[p]}
                        </span>
                        {i < PHASE_ORDER.length - 1 && (
                            <div className={`w-6 h-px ${i < currentIdx ? 'bg-accent-gold/40' : 'bg-[rgba(180,160,130,0.1)]'}`} />
                        )}
                    </button>
                ))}
            </div>

            {/* Phase content rendered here — each phase component receives advancePhase + goToPhase */}
            {/* Phase components added in Tasks 4, 6, 9, 10 */}

            {/* Close button — top right */}
            <button
                type="button"
                onClick={clearContext}
                className="absolute top-4 right-4 z-30 w-8 h-8 flex items-center justify-center
                           text-text-secondary hover:text-white rounded-full
                           bg-[rgba(20,18,15,0.6)] hover:bg-[rgba(20,18,15,0.9)]
                           backdrop-blur-sm transition-colors border border-[rgba(180,160,130,0.1)]"
            >
                &#10005;
            </button>
        </div>
    );
}
```

**Step 2: Swap import in App.tsx**

In `src/ui/map/App.tsx`, change:
```typescript
// Old:
import { OpsPlanningModal } from './components/OpsPlanningModal';
// New:
import { OpsPlanningModal } from './components/ops_modal/OpsPlanningModal';
```

The `<OpsPlanningModal />` render line stays the same.

**Step 3: Run smoke test**

```bash
npx tsc --noEmit
```

Expected: PASS.

**Step 4: Commit**

```bash
git add src/ui/map/components/ops_modal/OpsPlanningModal.tsx src/ui/map/App.tsx
git commit -m "feat(ops-modal): add modal shell with phase state machine and phase indicator"
```

---

## Task 4: Phase 1 — Commander Selection

**Files:**
- Create: `src/ui/map/components/ops_modal/CommanderPhase.tsx`
- Modify: `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` (render it)

**Context:** Phase 1 shows the corps identity card (bottom-left) and an officer selection panel (bottom-center). Player picks an operations commander, then advances to Phase 2. Reuse availability logic from existing `CommanderSelectionModal.tsx` but with new card-based UI — no checkboxes, clickable cards with visual state.

**Key data:** Read `loadedGameState.namedOfficerData` for officers, filter by faction match to corps. Use `getPreparationMaxTurns(aggressiveness)` formula (inline: `Math.max(2, 8 - aggressiveness)`) for prep time display.

**Step 1: Write CommanderPhase component**

The component should:
- Read `opsPlanningCorpsId` and `opsPlanningOriginSectorId` from store
- Read `loadedGameState` from store for officer data, formations, corpsFrontSectors
- Show corps identity card (bottom-left): faction crest, corps name, commander, strength, sector count
- Show officer grid (bottom-center, ~700px wide): available officers as clickable cards, unavailable greyed below
- Each officer card: name, rank, competence/aggressiveness bars (visual, not text), regional fit badge, prep time, personality line
- Click → sets `opsPlanningSelectedOfficerId` in store → calls `advancePhase()`
- NO checkboxes — card click IS the selection

**Officer availability rules** (from existing CommanderSelectionModal):
- Available if: status === 'active' or 'reserve', no enclave_lock, no assigned_operation, not acting_commander of different corps, not rank 'army_commander'
- Regional fit: home_corps_id === corpsId → 'HOME CORPS' (green), compatible_corps_ids includes corpsId → 'COMPATIBLE' (amber), else → 'OUT OF REGION' (red)

**Step 2: Wire into shell**

In `OpsPlanningModal.tsx`, import and render `<CommanderPhase />` when `phase === 'commander'`, passing `advancePhase`.

**Step 3: Run smoke test**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/ui/map/components/ops_modal/CommanderPhase.tsx src/ui/map/components/ops_modal/OpsPlanningModal.tsx
git commit -m "feat(ops-modal): add Phase 1 commander selection with officer cards"
```

---

## Task 5: Map Engine — Full-Bleed Corps AO Map

**Files:**
- Create: `src/ui/map/components/ops_modal/OpsMap.tsx`
- Modify: `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` (mount map)

**Context:** The map is the background of the entire modal. It shows the corps AO with paper-like styling. It must support: clicking OSIDs for objectives, clicking friendly OSIDs for staging, rendering pencil-style arrows, and highlighting territory. It's initialized once when the modal opens and persists across all phases.

**Key approach:**
- Use MapLibre GL JS directly (not the OpsMapRenderer from plan_ui — that's too coupled to the old design)
- Load operational settlements via `loadOperationalSettlements()`
- Build control GeoJSON via `buildControlGeoJSON()`
- Build centroid lookup via `buildOsidCentroidLookup()`
- Paper-style background: set map background to `#d6ccb7`, style territory polygons with low-saturation faction fills
- Arrow rendering: use existing `buildBezierCurve` + `buildArrowheadTriangle` from `arrowGeometry.ts`
- Click handler: query `osid-control-fill` layer on click, fire `onOsidClick(osid, isFriendly)` callback
- Fit bounds to corps sectors on init (using friendly OSIDs from all corps sectors)

**Layers to add:**
1. `ops-territory-fill` — faction-colored polygons (friendly green-tinted, enemy red-tinted, neutral gray)
2. `ops-territory-border` — thin dark borders on all polygons
3. `ops-front-lines` — heavier line on front edges
4. `ops-arrows-glow` — blurred arrow halos
5. `ops-arrows-line` — main arrow lines (pencil-style: slight opacity variation)
6. `ops-objective-markers` — red circles at objective centroids
7. `ops-staging-marker` — green diamond at staging centroid
8. `ops-schwerpunkt-marker` — gold star at main effort centroid

**Component API:**
```typescript
interface OpsMapProps {
    corpsId: string;
    onOsidClick: (osid: string, isFriendly: boolean) => void;
    objectives: string[];              // OSID list
    stagingOsid: string | undefined;
    schwerpunktOsid: string;
    axes: Array<{ objectives: string[]; stagingOsid?: string; color: string }>;
    enabled: boolean;                  // disable clicks during authorize phase
}
```

Use `useEffect` to update arrow/marker sources when props change — remove + re-add source pattern (same as current modal's approach, line 70-73 comment: "setData on dynamically-created GeoJSON sources does not trigger re-render").

**Step 1: Write OpsMap component**

**Step 2: Mount in shell**

Render `<OpsMap />` inside the map container div, visible in all phases. Pass props from plan state (managed by Phase 2).

**Step 3: Run smoke test**

```bash
npx tsc --noEmit && npm run desktop:map:build
```

**Step 4: Commit**

```bash
git add src/ui/map/components/ops_modal/OpsMap.tsx src/ui/map/components/ops_modal/OpsPlanningModal.tsx
git commit -m "feat(ops-modal): add full-bleed corps AO map with paper styling"
```

---

## Task 6: Phase 2 — Plan (Objectives + Forces + Parameters)

**Files:**
- Create: `src/ui/map/components/ops_modal/PlanPhase.tsx`
- Create: `src/ui/map/components/ops_modal/ObjectiveList.tsx`
- Create: `src/ui/map/components/ops_modal/BrigadeTray.tsx`
- Create: `src/ui/map/components/ops_modal/BrigadeCard.tsx`
- Create: `src/ui/map/components/ops_modal/PlanParameters.tsx`
- Modify: `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` (render + lift plan state)

**Context:** Phase 2 is the main interactive sandbox. The plan state (`OpsPlanState`) is lifted to the shell so it persists across phase backtracking and is available to Phase 3 (G2) and Phase 4 (Authorize).

### PlanPhase.tsx
Orchestrates the three floating panels:
- **ObjectiveList** (top-right corner): objective list with reorder, remove, schwerpunkt toggle
- **BrigadeTray** (bottom, full width): parameters strip + scrollable brigade cards
- **Map click handler**: passed to OpsMap via callback

When user clicks an enemy OSID → add to objectives. When user clicks a friendly OSID → set as staging for active axis. When first objective is added → trigger brigade auto-propose (Task 7).

### ObjectiveList.tsx
Floating panel, top-right, ~300px wide. Shows:
- Title: "OBJECTIVES" in accent-gold small caps
- Each objective: numbered, display name (via `getOsidDisplayName`), terrain/intel badge, schwerpunkt star toggle, × remove, ↑↓ reorder
- "Click map to add" hint when empty
- Enemy strength estimate per objective (from `loadedGameState.formations`)

### BrigadeTray.tsx
Bottom-anchored panel, slides up on Phase 2 enter. Contains:
- `PlanParameters` strip at top
- Horizontal scrolling row of `BrigadeCard` components
- Assembly time badge: "Full assembly: X turns" (max march time of assigned brigades)

### BrigadeCard.tsx
~160px × 140px card. NO CHECKBOXES. Click the card to toggle assignment. Visual states:
- **Assigned**: faction-colored left border, full saturation, slight elevation (shadow)
- **Auto-proposed**: assigned + small "SUGGESTED" badge
- **Available**: desaturated, recessed, lighter border
- **Unavailable** (combat ineffective/disrupted): very dim, crossed out, no click

Content: brigade name (typewriter), personnel, equipment icons (T/A), cohesion bar, fatigue, **march time** prominently displayed with color (green/amber/red).

### PlanParameters.tsx
Thin strip above brigade cards. Contains:
- Operation name: text input (pre-filled from `OPERATION_NAMES` pool)
- Type: styled select (no native dropdown — custom)
- Tempo: 3 pill buttons (radio behavior, no checkboxes)
- Tolerance: styled select
- Artillery prep: toggle pill (ON/OFF, not checkbox)

**Step 1: Write all 5 components**

**Step 2: Wire into shell — lift OpsPlanState to shell level**

The shell manages `OpsPlanState` via `useState` and passes it down. Phase 2 updates it; Phase 3 reads it; Phase 4 reads it.

**Step 3: Run smoke test**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/ui/map/components/ops_modal/PlanPhase.tsx \
        src/ui/map/components/ops_modal/ObjectiveList.tsx \
        src/ui/map/components/ops_modal/BrigadeTray.tsx \
        src/ui/map/components/ops_modal/BrigadeCard.tsx \
        src/ui/map/components/ops_modal/PlanParameters.tsx \
        src/ui/map/components/ops_modal/OpsPlanningModal.tsx
git commit -m "feat(ops-modal): add Phase 2 plan — objectives, brigade tray, parameters"
```

---

## Task 7: Brigade Auto-Propose Logic

**Files:**
- Create: `src/ui/map/components/ops_modal/autoPropose.ts`
- Create: `tests/ui/ops_modal_auto_propose.test.ts`

**Context:** When the player clicks their first objective, the system auto-selects the best brigades. This is pure logic — no React, easily testable.

**Algorithm:**
1. Input: corps brigade list (FormationView[]), objective OSIDs, centroid lookup, max brigades (12)
2. Filter out: combat ineffective (personnel < 400), disrupted, non-active status
3. For each remaining brigade, score:
   - `proximityScore`: 1.0 / (1 + BFS hops from locationOsid to nearest objective). Use centroid straight-line distance as proxy (Euclidean on [lng,lat] — close enough for scoring).
   - `combatPowerScore`: normalize `(personnel + tanks * 50 + artillery * 30) / 5000`
   - `readinessScore`: `(cohesion / 100) * (1 - fatigue / 30)`
   - `totalScore = proximityScore * 0.5 + combatPowerScore * 0.3 + readinessScore * 0.2`
4. Sort by totalScore descending, take top N (up to MAX_PARTICIPATING_BRIGADES = 12)
5. Return: array of `{ brigadeId: string, score: number, marchTurns: number, isAutoProposed: true }`

**March time estimate:**
- Euclidean distance from brigade centroid to staging OSID centroid
- Convert to turns: `Math.ceil(distance / 0.15)` (rough: ~15km per turn movement, ~0.15 degrees)
- Floor at 0 if already at staging OSID

**Step 1: Write failing tests**

Test cases:
- Empty corps → empty result
- All combat ineffective → empty result
- 5 eligible brigades, max 12 → all 5 returned
- 15 eligible, max 12 → top 12 by score
- Brigade at staging OSID → marchTurns = 0
- Disrupted brigade excluded

```typescript
import { describe, it, expect } from 'vitest';
import { autoProposebrigades, estimateMarchTurns } from '../../src/ui/map/components/ops_modal/autoPropose';

describe('autoProposebrigades', () => {
    it('returns empty for no brigades', () => {
        expect(autoProposebrigades([], [], new Map(), 12)).toEqual([]);
    });

    it('excludes combat ineffective brigades', () => {
        const brigades = [
            makeBrigade('b1', 300, 'osid_a'),  // personnel < 400
            makeBrigade('b2', 1500, 'osid_a'),
        ];
        const result = autoProposebrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result).toHaveLength(1);
        expect(result[0].brigadeId).toBe('b2');
    });

    it('caps at maxBrigades', () => {
        const brigades = Array.from({ length: 15 }, (_, i) =>
            makeBrigade(`b${i}`, 2000, `osid_${i % 3}`)
        );
        const result = autoProposebrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result).toHaveLength(12);
    });
});

describe('estimateMarchTurns', () => {
    it('returns 0 for brigade at staging OSID', () => {
        const lookup = new Map([['osid_a', [17.5, 44.0] as [number, number]]]);
        expect(estimateMarchTurns('osid_a', 'osid_a', lookup)).toBe(0);
    });

    it('returns positive turns for distant brigade', () => {
        const lookup = new Map([
            ['osid_a', [17.5, 44.0] as [number, number]],
            ['osid_b', [18.0, 44.5] as [number, number]],
        ]);
        expect(estimateMarchTurns('osid_a', 'osid_b', lookup)).toBeGreaterThan(0);
    });
});
```

**Step 2: Run tests — verify they fail**

```bash
npm run test:vitest -- --run tests/ui/ops_modal_auto_propose.test.ts
```

Expected: FAIL (module not found).

**Step 3: Write implementation**

```typescript
import type { FormationView } from '../../data/types';

const COMBAT_INEFFECTIVE_THRESHOLD = 400;
const MAX_PARTICIPATING_BRIGADES = 12;
const MARCH_DISTANCE_PER_TURN = 0.15; // ~15km in degrees

export interface ProposedBrigade {
    brigadeId: string;
    score: number;
    marchTurns: number;
    isAutoProposed: boolean;
}

export function estimateMarchTurns(
    brigadeOsid: string,
    stagingOsid: string,
    centroidLookup: Map<string, [number, number]>,
): number {
    if (brigadeOsid === stagingOsid) return 0;
    const from = centroidLookup.get(brigadeOsid);
    const to = centroidLookup.get(stagingOsid);
    if (!from || !to) return 99;
    const dist = Math.sqrt((from[0] - to[0]) ** 2 + (from[1] - to[1]) ** 2);
    return Math.max(1, Math.ceil(dist / MARCH_DISTANCE_PER_TURN));
}

export function autoProposebrigades(
    corpsBrigades: FormationView[],
    objectiveOsids: string[],
    centroidLookup: Map<string, [number, number]>,
    maxBrigades: number = MAX_PARTICIPATING_BRIGADES,
    stagingOsid?: string,
): ProposedBrigade[] {
    if (corpsBrigades.length === 0 || objectiveOsids.length === 0) return [];

    const eligible = corpsBrigades.filter((b) =>
        b.status === 'active' &&
        (b.personnel ?? 0) >= COMBAT_INEFFECTIVE_THRESHOLD &&
        !b.is_disrupted &&
        b.kind === 'brigade'
    );

    const scored = eligible.map((b) => {
        // Proximity: min distance to any objective
        let minDist = Infinity;
        const bPos = centroidLookup.get(b.location_osid ?? '');
        if (bPos) {
            for (const obj of objectiveOsids) {
                const oPos = centroidLookup.get(obj);
                if (oPos) {
                    const d = Math.sqrt((bPos[0] - oPos[0]) ** 2 + (bPos[1] - oPos[1]) ** 2);
                    if (d < minDist) minDist = d;
                }
            }
        }
        const proximityScore = minDist === Infinity ? 0 : 1.0 / (1 + minDist * 10);

        const pers = b.personnel ?? 0;
        const tanks = b.composition?.tanks ?? 0;
        const arty = b.composition?.artillery ?? 0;
        const combatPowerScore = Math.min(1, (pers + tanks * 50 + arty * 30) / 5000);

        const coh = (b.cohesion ?? 50) / 100;
        const fat = (b.fatigue ?? 0) / 30;
        const readinessScore = coh * (1 - Math.min(1, fat));

        const totalScore = proximityScore * 0.5 + combatPowerScore * 0.3 + readinessScore * 0.2;

        const marchTurns = stagingOsid && b.location_osid
            ? estimateMarchTurns(b.location_osid, stagingOsid, centroidLookup)
            : null;

        return { brigadeId: b.id, score: totalScore, marchTurns: marchTurns ?? 99, isAutoProposed: true };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxBrigades);
}
```

**Step 4: Run tests — verify they pass**

```bash
npm run test:vitest -- --run tests/ui/ops_modal_auto_propose.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/map/components/ops_modal/autoPropose.ts tests/ui/ops_modal_auto_propose.test.ts
git commit -m "feat(ops-modal): add brigade auto-propose logic with march time estimates"
```

---

## Task 8: G2 Prediction IPC Wiring

**Files:**
- Create: `src/ui/map/components/ops_modal/usePrediction.ts`
- Modify: nothing else (IPC already exists end-to-end)

**Context:** The `queryOperationPrediction` IPC channel exists from preload → electron-main → desktop_sim → `computeOperationPrediction`. It has never been called from the UI. Wire it with a debounced React hook.

**Step 1: Write the hook**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIPC } from '../../desktop/useIPC';
import type { OpsPlanState } from './types';
import type { OperationPredictionResponse } from '../../../../sim/combat/operation_prediction';

export function usePrediction(
    corpsId: string | null,
    plan: OpsPlanState | null,
    commanderOfficerId: string | null,
    enabled: boolean,
) {
    const ipc = useIPC();
    const [prediction, setPrediction] = useState<OperationPredictionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchPrediction = useCallback(async () => {
        if (!corpsId || !plan || !ipc.isAvailable) return;

        // Need at least one axis with brigades and objectives
        const validAxes = plan.axes.filter(
            (a) => a.brigadeIds.length > 0 && a.objectives.length > 0
        );
        if (validAxes.length === 0) {
            setPrediction(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await ipc.queryOperationPrediction({
                corpsId,
                axes: validAxes.map((a) => ({
                    axisId: a.id,
                    brigadeIds: a.brigadeIds,
                    objectiveOsids: a.objectives,
                    stagingOsid: a.stagingOsid ?? plan.defaultStagingOsid,
                })),
                tempo: plan.tempo,
                artilleryPreparation: plan.artilleryPreparation,
                commanderOfficerId: commanderOfficerId ?? undefined,
            });

            if (result.ok && result.data) {
                setPrediction(result.data as unknown as OperationPredictionResponse);
            } else {
                setError(result.error ?? 'Prediction failed');
            }
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, [corpsId, plan, commanderOfficerId, ipc]);

    // Debounced fetch — 500ms after last plan change
    useEffect(() => {
        if (!enabled) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void fetchPrediction();
        }, 500);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [fetchPrediction, enabled]);

    return { prediction, loading, error, refetch: fetchPrediction };
}
```

**Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

**Step 3: Commit**

```bash
git add src/ui/map/components/ops_modal/usePrediction.ts
git commit -m "feat(ops-modal): add debounced prediction IPC hook"
```

---

## Task 9: Phase 3 — G2 Assessment (Clipboard)

**Files:**
- Create: `src/ui/map/components/ops_modal/G2Phase.tsx`
- Create: `src/ui/map/components/ops_modal/NarrativeTab.tsx`
- Create: `src/ui/map/components/ops_modal/RawIntelTab.tsx`
- Modify: `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` (render it)

**Context:** The G2 clipboard slides in from the right when Phase 3 is entered. It has two tabs: narrative assessment and raw intel. Data comes from the `usePrediction` hook (Task 8).

### G2Phase.tsx
The clipboard container:
- Dark brown top edge (~40px) with CSS binder clip
- Cream paper body `#f0e8d8` with paper-grain texture
- Two tab buttons: [Assessment] [Raw Intel]
- Tab content below
- If prediction is loading: shimmer placeholder
- If prediction is null (not enough plan data): "Complete your plan to generate assessment"
- **Intel gate**: if `prediction.overall.intelConfidence < 0.4`, show prominent warning in narrative: "INTEL INSUFFICIENT — Recommend reconnaissance in force before commitment." The authorize phase should show "ORDER PROBE" as primary action instead of "AUTHORIZE".

### NarrativeTab.tsx
Renders `prediction.commanderAssessment.sections` in military document format:
- Classified stamp "OGRANIČENO" (red, rotated, low opacity)
- Header block: republic name, army name, corps + G-2 section, reference number, date
- Three numbered sections: NEPRIJATELJ, VLASTITE SNAGE, PROCJENA
- Signature line with commander name
- All in typewriter font (`'Courier New'`)

### RawIntelTab.tsx
Renders quantitative data:
- Readiness bars (reuse `ReadinessBar` from `plan_ui/ReadinessBar.tsx`)
- Force ratio display
- Casualty estimate with severity color
- Commander thresholds (required force ratio, required intel) with pass/fail indicators (green dot / red dot — NOT checkboxes)
- Per-axis breakdown cards (reuse pattern from `AxisAssessmentCard`)
- Commander recommendation badge

**Step 1: Write all 3 components**

**Step 2: Wire into shell — render when `phase === 'g2_assessment'`**

Also render the clipboard in Phase 2 in a collapsed/preview state if prediction data exists (progressive disclosure — player sees the G2 dot turn green when data arrives).

**Step 3: Run smoke test**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/ui/map/components/ops_modal/G2Phase.tsx \
        src/ui/map/components/ops_modal/NarrativeTab.tsx \
        src/ui/map/components/ops_modal/RawIntelTab.tsx \
        src/ui/map/components/ops_modal/OpsPlanningModal.tsx
git commit -m "feat(ops-modal): add Phase 3 G2 assessment clipboard with narrative + raw intel tabs"
```

---

## Task 10: Phase 4 — Authorize (OPORD + Stamp)

**Files:**
- Create: `src/ui/map/components/ops_modal/AuthorizePhase.tsx`
- Create: `src/ui/map/components/ops_modal/OpordDocument.tsx`
- Modify: `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` (render + submit logic)

**Context:** Phase 4 shows the formal Operations Order document. If intel is insufficient, the primary action is "ORDER PROBE" instead of "AUTHORIZE." On authorize: stamp animation, then IPC call to `stageCorpsOperationOrder` + `stageAssignOperationCommander`, then modal closes.

### AuthorizePhase.tsx
- Dims the screen (black overlay at 40%)
- Centers the OPORD document
- Shows action buttons below document:
  - If intel sufficient: **"ODOBRITI OPERACIJU"** (AUTHORIZE OPERATION) — prominent, military green
  - If intel insufficient: **"NAREDITI IZVIĐANJE"** (ORDER PROBE) — prominent, amber + "Authorize Anyway" subdued
- On authorize click:
  1. Stamp "ODOBRENO" diagonally across document (CSS animation: scale + rotate)
  2. Date stamp
  3. 1.5s pause
  4. "ZAPOVIJED PROSLIJEĐENA" (DIRECTIVE TRANSMITTED) fades in
  5. Call `ipc.stageCorpsOperationOrder(payload)` with full plan state
  6. Call `ipc.stageAssignOperationCommander({ corpsId, operationName, officerId })`
  7. After success: `clearOpsPlanningContext()`

### OpordDocument.tsx
The formal written order, cream paper style:
- Faction army crest at top (SVG: fleur-de-lis for RBiH, eagle for RS, checkered shield for HRHB)
- Republic/army name headers (faction-specific Bosnian/Serbian/Croatian)
- "OPERATIVNA ZAPOVIJED br. [ref]"
- 6 sections: ZADAĆA (Mission), SNAGE (Forces), ZAPOVJEDNIK (Commander), PROVEDBA (Execution), CILJEVI (Objectives), LOGISTIKA (Logistics)
- All populated from plan state + prediction data
- Commander signature block at bottom

**Step 1: Write both components**

**Step 2: Wire into shell — add submit logic**

The shell's submit handler builds `CorpsOperationOrderPayload` from `OpsPlanState`:

```typescript
const payload: CorpsOperationOrderPayload = {
    corpsId: opsPlanningCorpsId!,
    name: plan.opName,
    type: plan.opType,
    targetSettlements: plan.axes.flatMap((a) => a.objectives),
    participatingBrigades: plan.axes.flatMap((a) => a.brigadeIds),
    sectorId: opsPlanningOriginSectorId ?? undefined,
    objectives: plan.axes[0]?.objectives ?? [],
    stagingOsid: plan.axes[0]?.stagingOsid ?? plan.defaultStagingOsid,
    minAttackOutcome: plan.tolerance,
    tempo: plan.tempo,
    schwerpunktOsid: plan.schwerpunktOsid || undefined,
    artilleryPreparation: plan.artilleryPreparation,
    axes: plan.axes.map((a) => ({
        axis_id: a.id,
        name: a.name,
        assigned_brigades: a.brigadeIds,
        objectives: a.objectives,
        current_objective_index: 0,
        status: 'executing' as const,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        staging_osid: a.stagingOsid ?? plan.defaultStagingOsid,
    })),
};
```

**Step 3: Run smoke test**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/ui/map/components/ops_modal/AuthorizePhase.tsx \
        src/ui/map/components/ops_modal/OpordDocument.tsx \
        src/ui/map/components/ops_modal/OpsPlanningModal.tsx
git commit -m "feat(ops-modal): add Phase 4 authorize with OPORD document and stamp animation"
```

---

## Task 11: Integration + Cleanup

**Files:**
- Modify: `src/ui/map/App.tsx` — remove old `CommanderSelectionModalWrapper` (ops flow now handled internally)
- Modify: `src/ui/map/components/CorpsFrontPanel.tsx` — remove `setOpsPlanningModalOpen` usage (launch only from CorpsDetail now)
- Delete or archive: `src/ui/map/components/OpsPlanningModal.tsx` (old 1415-line file)
- Keep: `src/ui/map/components/plan_ui/ReadinessBar.tsx` (reused by G2Phase)
- Keep: `src/ui/map/components/plan_ui/opsConstants.ts` (reused)
- Keep: `src/ui/map/components/CommanderSelectionModal.tsx` (still used for non-planning commander assignment)
- Keep: `src/ui/map/components/OperationBriefingModal.tsx` (used during operation execution, not planning)

**Step 1: Clean up imports and dead code**

Remove `CommanderSelectionModalWrapper` from App.tsx only if ops planning was its sole consumer. Check: the briefing modal flow uses `commanderSelectionContext` separately for mid-operation commander replacement — keep that path alive.

**Step 2: Remove old OpsPlanningModal.tsx**

Rename to `OpsPlanningModal.tsx.bak` first, verify the app builds, then delete.

**Step 3: Run full smoke test triad**

```bash
npx tsc --noEmit ; npm run test:vitest ; npm run desktop:map:build
```

All three must PASS.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(ops-modal): remove old modal, clean up dead imports and wrappers"
```

---

## Task 12: Smoke Test + Visual Polish

**Files:**
- Modify: various ops_modal/ files for visual tweaks

**Step 1: Launch the app and test the full flow**

```bash
npm run desktop
```

1. Start a campaign or load a save
2. Click a corps on the map
3. Click "Plan Operation" in corps detail panel
4. **Phase 1**: Verify officer cards render with data, click one
5. **Phase 2**: Verify map shows corps AO, click enemy OSIDs for objectives, verify brigades auto-proposed, toggle brigade assignment, set staging, change parameters
6. **Phase 3**: Verify G2 clipboard renders with prediction data, switch tabs, check narrative reads correctly
7. **Phase 4**: Verify OPORD document, click authorize, verify stamp animation and IPC submission
8. Verify operation appears in corps ops tab after turn advance

**Step 2: Test backtracking**

- From Phase 3, click Phase 1 dot → should go back
- Change commander → Phase 3 should update assessment voice
- From Phase 4, go back to Phase 2, change objectives → G2 should re-predict

**Step 3: Test edge cases**

- Corps with 0 sectors → error message, modal doesn't open
- Corps with no eligible brigades → empty tray with message
- Low intel confidence → probe prompt in Phase 4
- All objectives removed → G2 shows "Complete your plan"

**Step 4: Visual polish pass**

- Paper grain texture renders on map and clipboard
- Animations smooth (no jank on phase transitions)
- Typography consistent (typewriter on documents, small-caps on labels)
- No visual overflow or cropping at 1920×1080
- Dark glass panels have proper blur

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(ops-modal): complete ops planning modal redesign — 4-phase corps-level planning"
```

---

## File Inventory

### New files (create):
```
src/ui/map/components/ops_modal/
├── types.ts                 # Shared types
├── OpsPlanningModal.tsx      # Shell + phase state machine
├── CommanderPhase.tsx        # Phase 1: officer selection
├── OpsMap.tsx               # Full-bleed MapLibre map
├── PlanPhase.tsx            # Phase 2: orchestrator
├── ObjectiveList.tsx        # Phase 2: objective panel
├── BrigadeTray.tsx          # Phase 2: brigade shelf
├── BrigadeCard.tsx          # Phase 2: single brigade card
├── PlanParameters.tsx       # Phase 2: op params strip
├── autoPropose.ts           # Brigade auto-propose logic
├── usePrediction.ts         # G2 prediction IPC hook
├── G2Phase.tsx              # Phase 3: clipboard container
├── NarrativeTab.tsx         # Phase 3: assessment document
├── RawIntelTab.tsx          # Phase 3: raw intel data
├── AuthorizePhase.tsx       # Phase 4: authorize + probe
└── OpordDocument.tsx        # Phase 4: OPORD document
tests/ui/
└── ops_modal_auto_propose.test.ts
```

### Modified files:
```
src/ui/map/store/gameStore.ts          # New store fields
src/ui/map/components/CorpsDetail.tsx   # Updated launch handler
src/ui/map/App.tsx                      # Swap modal import
```

### Deleted files:
```
src/ui/map/components/OpsPlanningModal.tsx  # Old 1415-line modal
```

### Kept (reused):
```
src/ui/map/components/plan_ui/ReadinessBar.tsx
src/ui/map/components/plan_ui/opsConstants.ts
src/ui/map/components/CommanderSelectionModal.tsx  # Still used elsewhere
src/ui/map/components/OperationBriefingModal.tsx   # Still used elsewhere
```
