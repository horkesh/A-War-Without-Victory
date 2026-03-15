# Infrastructure — Shared Utilities (pre-v0.4.0) — Implementation Plan

**Date:** 2026-03-15
**Status:** PLAN — ready for execution
**Overseer:** Orchestrator
**Architect:** Makes decisions, flags for user review
**Prerequisites:** v0.3.1 (Endgame & Negotiation System) complete. v0.3.2 recommended but not blocking.
**Version:** None — this is infrastructure, not a versioned milestone. No version bump.

---

## Context

The cross-plan review (`CROSS_PLAN_REVIEW_V04.md`, Findings 5/6/7) identified three shared utilities that multiple v0.4.x milestones depend on, plus a cross-cutting Command Briefing specification. Building these before v0.4.0 prevents duplication and ensures consistent patterns across all downstream milestones.

**Execution order in the roadmap:**
```
v0.3.2 → v0.3.3 → THIS PLAN → v0.4.0 → v0.4.1 → ...
```

---

## Deliverables

### Phase 1: GlassPanel.tsx (~1 session)
**Assigned to:** UI/UX Developer

A shared glassmorphism panel component used by ALL subsequent floating panels: PeaceStatusPanel, EventLogPanel, EventModal, EconomyPanel, FrictionLog, CommandBriefing.

**Visual spec:** Match the canonical ops-planning aesthetic established in `CommandTopBar.tsx` and `OpsPlanningModal.tsx`:
- Background: `bg-[#16191f]/90` (dark NATO ops center)
- Blur: `backdrop-blur-md`
- Border: `border border-panel-border` (`rgba(180, 160, 130, 0.15)`)
- Title: `text-accent-gold uppercase tracking-[0.3em] text-sm font-black` with gold glow drop shadow
- Close button: `text-text-secondary hover:text-accent-gold` transition
- Shadow: `shadow-xl`
- Font: IBM Plex Mono (labels), IBM Plex Sans Condensed (body) — per tailwind.config.ts

**Props interface:**
```typescript
interface GlassPanelProps {
    position: 'left' | 'right' | 'overlay' | 'bottom-tray';
    title: string;
    width?: string;          // default: '320px'
    onClose?: () => void;    // omit = no close button
    children: React.ReactNode;
    className?: string;      // additional classes on outer container
    zIndex?: number;         // default: 40
}
```

**Position behavior:**
- `left`: fixed to left edge, `top-16 bottom-0` (below toolbar), scrollable content
- `right`: fixed to right edge, `top-16 bottom-0`, scrollable content
- `overlay`: centered modal with backdrop dimming (`bg-black/50`), click-outside-to-close
- `bottom-tray`: fixed to bottom, full width, `max-h-[40vh]`, collapsible

- [ ] **Task 1.1** — Create `src/ui/map/components/GlassPanel.tsx` with the props interface above. Implement position variants using Tailwind utility classes from the existing theme (`panel-border`, `accent-gold`, `text-primary`, `text-secondary`). Include animated open/close transitions (opacity + translate, 200ms). Overlay variant renders a backdrop div and calls `onClose` on backdrop click. Bottom-tray includes a collapse toggle chevron. (~80 lines)

- [ ] **Task 1.2** — Create `src/ui/map/components/__tests__/GlassPanel.test.tsx` using Vitest + React Testing Library. Tests:
  - Renders title text
  - Renders children content
  - Close button calls onClose when clicked
  - Close button absent when onClose omitted
  - Overlay backdrop click calls onClose
  - Each position variant applies correct positioning classes (left/right/overlay/bottom-tray)
  - Custom className is forwarded to outer container
  (~60 lines)

- [ ] **Task 1.3** — Create `src/ui/map/stories/GlassPanel.stories.tsx` — Storybook stories for all 4 position variants with example content (a mock briefing panel with labels and values). Uses existing Storybook setup. (~40 lines)

**Gate:** GlassPanel renders correctly in all 4 positions. Tests pass. Storybook stories render.

> /simplify > commit

---

### Phase 2: deterministic_random.ts (~0.5 session)
**Assigned to:** Systems Programmer

A canonical pseudo-random utility for controlled randomness across the simulation. Same input = same output. Replay-safe. Replaces ad-hoc hashing patterns.

**Pre-made decision (from handoff):** Use djb2 hash. Return `(hash >>> 0) % 10000) / 10000` for [0, 1) range.

**Existing hashString in codebase:** `src/ui/map/map/builders/arrowGeometry.ts` uses `Math.imul(31, h) + charCode` for UI arrow offsets. The new utility is for simulation-layer deterministic randomness and lives in `src/state/`. It uses djb2 (hash * 33 + charCode) per the handoff decision. The UI hashString remains separate — it serves a different purpose (visual variation, not game state).

- [ ] **Task 2.1** — Create `src/state/deterministic_random.ts` with:
  ```typescript
  /**
   * djb2 hash: string -> unsigned 32-bit integer.
   * Deterministic, fast, adequate distribution for game simulation use.
   */
  export function djb2Hash(str: string): number {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
      }
      return hash >>> 0; // unsigned
  }

  /**
   * Deterministic pseudo-random number in [0, 1) from a seed and context string.
   * Same (seed, context) always produces the same output. Replay-safe.
   *
   * Usage:
   *   deterministicRandom(officerId, `friction:${turn}`) < 0.15
   *   deterministicRandom(scenarioId, `event:${eventId}:${turn}`) < threshold
   *   deterministicRandom(routeId, `disruption:${turn}`) < disruptionRate
   */
  export function deterministicRandom(seed: string, context: string): number {
      const hash = djb2Hash(`${seed}:${context}`);
      return (hash % 10000) / 10000;
  }

  /**
   * Deterministic integer in [min, max] (inclusive) from seed + context.
   */
  export function deterministicInt(seed: string, context: string, min: number, max: number): number {
      const hash = djb2Hash(`${seed}:${context}`);
      return min + (hash % (max - min + 1));
  }

  /**
   * Deterministic pick from an array.
   */
  export function deterministicPick<T>(seed: string, context: string, items: readonly T[]): T {
      if (items.length === 0) throw new Error('deterministicPick: empty array');
      const idx = djb2Hash(`${seed}:${context}`) % items.length;
      return items[idx];
  }
  ```
  (~45 lines)

- [ ] **Task 2.2** — Create `src/state/__tests__/deterministic_random.test.ts` using Vitest. Tests:
  - `djb2Hash` returns same value for same input (stability)
  - `djb2Hash` returns different values for different inputs (distribution)
  - `djb2Hash` returns unsigned (non-negative) values
  - `deterministicRandom` returns value in [0, 1)
  - `deterministicRandom` is deterministic (same seed+context = same result)
  - `deterministicRandom` varies with different seeds
  - `deterministicRandom` varies with different contexts
  - `deterministicInt` returns value within [min, max] inclusive
  - `deterministicInt` distribution: 1000 calls with sequential contexts hit all values in a small range
  - `deterministicPick` returns element from array
  - `deterministicPick` throws on empty array
  - No use of `Math.random()` — grep the file to verify
  (~80 lines)

**Gate:** All tests pass. `tsc --noEmit` clean. No `Math.random()` anywhere in the file.

> /simplify > commit

---

### Phase 3: scenario_preseeding.ts (~1 session)
**Assigned to:** Gameplay Programmer

Derives initial negotiation capital, patron override authority, and patron support from the scenario start date. Uses linear interpolation from the historical baseline tables in `ENDGAME_AND_NEGOTIATION_DESIGN.md` sections 3b and 7.

**Historical baseline data (from the design doc):**

Territorial control arc (RS), design doc section 7:
| Week (from Apr 1992) | RS Territory % | Notes |
|---|---|---|
| 0 | 35 | Initial seizures |
| 26 | 67 | Peak after Jajce, Bosanski Brod |
| 52 | 70 | Absolute peak |
| 104 | 70 | Stable, Croat-Bosniak war |
| 170 | 70 | Pre-Srebrenica peak |
| 182 | 49 | Post-Storm + NATO |
| 188 | 49 | Dayton |

RBiH territory derived as `100 - RS_pct - HRHB_pct`. HRHB holds roughly 15-20% stable through mid-war, shrinking to ~2% (absorbed into Federation post-Washington). Simplified HRHB arc:
| Week | HRHB Territory % |
|---|---|
| 0 | 15 |
| 26 | 18 |
| 52 | 18 |
| 96 | 15 |
| 130 | 2 |
| 188 | 2 |

Patron override authority (design doc section 3b):
| Week | RS Override | RBiH Override | HRHB Override |
|---|---|---|---|
| 0 | 12 | 7 | 25 |
| 40 | 18 | 18 | 35 |
| 52 | 22 | 22 | 40 |
| 78 | 25 | 25 | 45 |
| 104 | 45 | 28 | 65 |
| 130 | 55 | 35 | 75 |
| 156 | 65 | 45 | 80 |
| 170 | 82 | 55 | 85 |
| 188 | 92 | 65 | 87 |

Patron support level (derived from design doc patron arcs):
| Week | RS Support | RBiH Support | HRHB Support |
|---|---|---|---|
| 0 | 80 | 40 | 70 |
| 52 | 75 | 50 | 65 |
| 104 | 50 | 55 | 45 |
| 130 | 35 | 55 | 70 |
| 156 | 25 | 60 | 75 |
| 188 | 15 | 65 | 80 |

Capital dimension baselines per faction (interpolation anchors):

**RS capital anchors:**
| Week | mil_pos | hum_stand | intl_cred | mil_eff | pol_coh |
|---|---|---|---|---|---|
| 0 | 35 | 40 | 40 | 70 | 70 |
| 26 | 67 | 25 | 30 | 75 | 65 |
| 52 | 70 | 15 | 25 | 65 | 60 |
| 104 | 70 | 10 | 20 | 55 | 50 |
| 170 | 70 | 5 | 10 | 45 | 35 |
| 188 | 49 | 5 | 10 | 30 | 25 |

**RBiH capital anchors:**
| Week | mil_pos | hum_stand | intl_cred | mil_eff | pol_coh |
|---|---|---|---|---|---|
| 0 | 50 | 50 | 50 | 30 | 50 |
| 26 | 18 | 60 | 60 | 35 | 45 |
| 52 | 12 | 65 | 65 | 45 | 50 |
| 104 | 12 | 60 | 55 | 55 | 45 |
| 156 | 15 | 70 | 65 | 65 | 55 |
| 188 | 30 | 75 | 70 | 70 | 55 |

**HRHB capital anchors:**
| Week | mil_pos | hum_stand | intl_cred | mil_eff | pol_coh |
|---|---|---|---|---|---|
| 0 | 15 | 50 | 55 | 50 | 60 |
| 52 | 18 | 40 | 45 | 50 | 50 |
| 78 | 18 | 30 | 35 | 45 | 40 |
| 104 | 15 | 25 | 30 | 40 | 35 |
| 130 | 2 | 35 | 50 | 45 | 55 |
| 188 | 2 | 40 | 55 | 45 | 60 |

- [ ] **Task 3.1** — Create `src/scenario/scenario_preseeding.ts` with:
  - `HISTORICAL_BASELINES` constant: the anchor tables above encoded as typed arrays of `{ week: number, values: Record<string, number> }` per faction, per dimension.
  - `interpolateBaseline(baselines: { week: number; value: number }[], targetWeek: number): number` — linear interpolation. Clamps to first/last value outside range.
  - `preseedNegotiationCapital(factionId: FactionId, scenarioStartWeek: number): Partial<NegotiationCapital>` — returns the 5 capital dimensions interpolated for the given week. Also sets `territory_controlled_pct` from the territorial arc.
  - `preseedPatronRelationship(factionId: FactionId, scenarioStartWeek: number): Partial<PatronRelationship>` — returns `override_authority` and `support_level` interpolated for the given week.
  - `preseedScenarioState(state: GameState, scenarioStartWeek: number): void` — orchestrator that calls the above for all 3 factions and writes into `state.negotiation.capital[faction]` and `state.negotiation.patron_relationships[faction]`. Only modifies fields that have baseline data — does not zero out detailed breakdown fields (those start empty and accumulate during play).
  (~120 lines)

- [ ] **Task 3.2** — Create `src/scenario/__tests__/scenario_preseeding.test.ts` using Vitest. Tests:
  - `interpolateBaseline` returns exact value at anchor points
  - `interpolateBaseline` returns midpoint between two anchors
  - `interpolateBaseline` clamps below first anchor
  - `interpolateBaseline` clamps above last anchor
  - `preseedNegotiationCapital` for RS at week 0: military_position ~35, humanitarian ~40
  - `preseedNegotiationCapital` for RS at week 26: military_position ~67
  - `preseedNegotiationCapital` for RBiH at week 52: military_effectiveness ~45
  - `preseedPatronRelationship` for RS at week 0: override ~12, support ~80
  - `preseedPatronRelationship` for RS at week 104: override ~45, support ~50
  - `preseedPatronRelationship` for HRHB at week 130: override ~75
  - `preseedScenarioState` writes to all 3 factions in state (mock GameState with negotiation field)
  - `preseedScenarioState` does NOT overwrite detailed breakdown fields (refugees_created stays 0)
  - All values within 0-100 range
  (~90 lines)

**Gate:** All tests pass. `tsc --noEmit` clean. Interpolation produces historically plausible values at all scenario start dates (week 0, 40, 52, 96, 130, 156).

> /simplify > commit

---

### Phase 4: Command Briefing Enhancement Spec (design only)
**Assigned to:** Game Designer + Architect

This is a **specification**, not an implementation. It defines what the post-turn Command Briefing should contain so that downstream milestones (v0.4.1 through v0.4.4) can each add their section incrementally.

- [ ] **Task 4.1** — Create `docs/30_planning/design/COMMAND_BRIEFING_SPEC.md` with the following sections:

**Purpose:** After each "End Turn", before the player can issue new orders, a Command Briefing panel appears summarizing what happened. It uses `GlassPanel` with `position: 'overlay'`. The player dismisses it to proceed.

**Briefing sections (added incrementally):**

| Section | Added By | Content |
|---------|----------|---------|
| **I. Military Situation** | Existing (v0.3.1) | Battles fought (count, outcomes), territory gained/lost (OSID names), operations status (active/completed/failed), casualties this turn (KIA/WIA by faction) |
| **II. Events & Decisions** | v0.4.1 | Historical events fired, decision events awaiting response, random events that triggered. Each event shows title + 1-line summary. |
| **III. Diplomatic Status** | v0.4.1 | Peace plan status (if pending), patron pressure changes, international credibility shift, alliance state changes. |
| **IV. Economic Report** | v0.4.3 | Production output, supply consumed vs received, smuggling income, equipment condition summary (% operational). |
| **V. Command & Personnel** | v0.4.4 | Officer experience gains, promotions, friction events, departures (brain drain), morale/cohesion notable shifts. |
| **VI. Humanitarian Impact** | v0.3.2+ | Displacement this turn, civilians affected, enclave status changes, war crimes events (if any). |

**Briefing data structure:**
```typescript
interface CommandBriefing {
    turn: number;
    date: string;
    sections: BriefingSection[];
}

interface BriefingSection {
    id: string;           // 'military' | 'events' | 'diplomatic' | 'economic' | 'command' | 'humanitarian'
    title: string;
    priority: number;     // display order (lower = higher)
    items: BriefingItem[];
    empty_message: string; // shown if items is empty ("No significant activity.")
}

interface BriefingItem {
    icon?: string;        // emoji or icon key
    label: string;        // "Battle at Višegrad — Decisive Victory"
    detail?: string;      // optional second line
    severity: 'info' | 'warning' | 'critical';
}
```

**Implementation strategy:** Each milestone adds a `collectXBriefingItems(state, prevState): BriefingItem[]` function. A central `assembleCommandBriefing(state, prevState)` orchestrator calls all registered collectors. New milestones register via a simple array push — no plugin system, just a list of functions.

**Visual design:** Uses GlassPanel overlay. Sections separated by horizontal gold dividers. Critical items pulse with gold border. Briefing auto-scrolls to first critical item. "Dismiss" button at bottom (accent-gold). Keyboard: Enter/Escape dismisses.

**Architectural decision (flagged for user review):** The briefing assembler lives in `src/ui/map/components/CommandBriefing.tsx` (UI-side) with data collection in `src/sim/briefing/collect_briefing.ts` (sim-side). The sim-side collector is called after each turn step in the pipeline. The UI component reads the collected data from GameState (a new `last_briefing: CommandBriefing` field on state). This keeps data collection deterministic (sim-side) and rendering reactive (UI-side).

**NOT implemented in this plan:** This task produces the spec document only. The first concrete implementation comes in v0.4.0 (military section) or v0.4.1 (events + diplomatic sections).

(~80 lines for the spec document)

**Gate:** Spec document reviewed and approved. No code changes.

> /simplify > commit (spec document only)

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions flagged for user review (one flagged: briefing assembler location in Phase 4)
- [ ] Napkin read at start, updated during work
- [ ] Ledger entry appended on completion
- [ ] Life lessons scanned, relevant ones flagged
- [ ] `tsc --noEmit` + `vitest run` after every phase (Phases 1-3)
- [ ] No version bump — this is infrastructure, not a milestone

### Relevant life lessons to watch for:
- **Verify before claiming fixed** — run tests after every task, not just at the end
- **Verify code comments match logic** — especially in the interpolation code, ensure comments match actual anchor values
- **Determinism is sacred** — no `Math.random()` in deterministic_random.ts under any circumstances

---

## Completion Checklist

- [ ] Implementation report in `docs/40_reports/implemented/20260315_INFRASTRUCTURE_SHARED_UTILITIES_REPORT.md`
- [ ] PROJECT_LEDGER.md entry appended (infrastructure utilities created)
- [ ] Napkin updated (infrastructure items checked off, downstream plans can reference these utilities)
- [ ] ROADMAP_TO_1_0.md infrastructure checklist items marked done
- [ ] No version bump (not a milestone)
- [ ] No git tag (not a milestone)
- [ ] Canon docs: no changes needed (utilities, not game systems)
- [ ] Master files: no changes needed

---

## Success Criteria

- [ ] `GlassPanel.tsx` renders in all 4 positions with correct visual styling matching ops-planning aesthetic
- [ ] `deterministicRandom('test', 'ctx')` returns same value every time; no `Math.random()` in file
- [ ] `preseedScenarioState()` produces historically plausible capital values for weeks 0, 40, 52, 96, 130
- [ ] Command Briefing spec defines all 6 sections with clear data contracts for downstream milestones
- [ ] All tests pass: `npm run test:vitest`
- [ ] Type-clean: `npx tsc --noEmit`
- [ ] Total new code: ~375 lines implementation + ~230 lines tests + ~80 lines spec

---

## Orchestrator Statement

This infrastructure plan addresses cross-plan review Findings 5, 6, and 7. The three utilities are small, focused, and well-defined. Each has a clear consumer list in downstream milestones. The Command Briefing spec is design-only — it establishes the contract without premature implementation. Total scope is conservative: ~600 lines across 6 files plus one spec document. One session for an experienced implementer.

## Architect Statement

Three architectural decisions are embedded in this plan:

1. **djb2 hash for deterministic_random** (pre-made in handoff, confirmed). Simple, fast, adequate distribution. Not cryptographic — that's fine, we need determinism not security.

2. **GlassPanel position system** (4 variants). This is deliberately limited. If a future panel needs a position not in the set, add it to GlassPanel rather than bypassing it. The component is the single source of truth for floating panel layout.

3. **Command Briefing data flow** (flagged for user review). Sim-side collection + UI-side rendering. The `last_briefing` field on GameState means briefings are included in save files and are deterministic. Alternative: compute briefings on-the-fly in the UI from state diffs. Rejected because it would require the UI to understand all sim systems. The sim-side collector is the right place.

---

*"Before you can fight, you must be able to see." — Shared utilities are the eyes.*
