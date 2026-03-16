# Command Briefing — Design Specification

**Status:** SPEC — design only, not yet implemented
**Date:** 2026-03-16
**Purpose:** After each "End Turn", before the player can issue new orders, a Command Briefing panel appears summarizing what happened. Uses `GlassPanel` with `position: 'overlay'`. Player dismisses to proceed.

---

## Briefing Sections (added incrementally)

| Section | Added By | Content |
|---------|----------|---------|
| **I. Military Situation** | v0.4.0 | Battles fought (count, outcomes), territory gained/lost (OSID names), operations status (active/completed/failed), casualties this turn (KIA/WIA by faction) |
| **II. Events & Decisions** | v0.4.1 | Historical events fired, decision events awaiting response, random events that triggered. Each event shows title + 1-line summary. |
| **III. Diplomatic Status** | v0.4.1 | Peace plan status (if pending), patron pressure changes, international credibility shift, alliance state changes. |
| **IV. Economic Report** | v0.4.3 | Production output, supply consumed vs received, smuggling income, equipment condition summary (% operational). |
| **V. Command & Personnel** | v0.4.4 | Officer experience gains, promotions, friction events, departures (brain drain), morale/cohesion notable shifts. |
| **VI. Humanitarian Impact** | v0.3.2+ | Displacement this turn, civilians affected, enclave status changes, war crimes events (if any). |

---

## Briefing Data Structure

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

---

## Implementation Strategy

Each milestone adds a `collectXBriefingItems(state, prevState): BriefingItem[]` function. A central `assembleCommandBriefing(state, prevState)` orchestrator calls all registered collectors. New milestones register via a simple array push — no plugin system, just a list of functions.

**Data flow:** Sim-side collection (`src/sim/briefing/collect_briefing.ts`) runs after each turn. The UI component reads `state.last_briefing: CommandBriefing` from GameState. This keeps data collection deterministic (sim-side) and rendering reactive (UI-side).

---

## Visual Design

- Uses `GlassPanel` overlay position
- Sections separated by horizontal gold dividers (`border-[rgba(180,160,130,0.15)]`)
- Critical items pulse with gold border (`border-[#c4a04a] animate-pulse`)
- Briefing auto-scrolls to first critical item
- "Dismiss" button at bottom (accent-gold)
- Keyboard: Enter or Escape dismisses

---

## Architectural Decision (FLAGGED FOR USER REVIEW)

The briefing assembler lives in `src/sim/briefing/collect_briefing.ts` (sim-side) with rendering in `src/ui/map/components/CommandBriefingLayer.tsx` (UI-side). The `last_briefing` field on GameState means briefings are included in save files and are deterministic.

**Alternative considered:** Compute briefings on-the-fly in the UI from state diffs. Rejected because it would require the UI to understand all sim systems.

---

*Not implemented in this plan — first concrete implementation comes in v0.4.0 (military section) or v0.4.1 (events + diplomatic).*
