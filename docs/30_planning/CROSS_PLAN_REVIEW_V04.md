# Cross-Plan Critical Review: v0.3.2 → v0.4.5

**Date:** 2026-03-15
**Author:** Orchestrator + Architect
**Purpose:** Find gaps, redundancies, and missed connections across all v0.4.x plans before execution begins.

---

## Finding 1: Event System is the Backbone — Everything Should Feed It

**Problem:** The event system (v0.4.1) is scoped as an isolated milestone, but nearly every other system should generate events. Currently each plan defines its own notification patterns independently.

**What should generate events but doesn't in the current plans:**
- **Economy (v0.4.3):** Factory damaged → event. Smuggling route disrupted → event. Embargo tightened → event.
- **Officer experience (v0.4.5):** Heroic stand → event. Warlord friction → event. Brain drain departure → event. These are currently scoped as their OWN event types in v0.4.5, duplicating the event system from v0.4.1.
- **Brigade AoR (v0.3.3):** Gap created in front line → event ("Sub-segment uncovered — 213th Vitežka has fallen back"). Breakthrough → event.
- **Alliance (v0.3.1, shipped):** Alliance degradation milestones → event. Washington triggered → event. (Patron events exist but are separate from the B1 event system.)

**Fix:** The v0.4.1 event system should be designed as the **universal event bus** from the start. Every other system posts events through it rather than creating their own parallel notification mechanisms. The event types in v0.4.1 should include:

```typescript
type EventCategory =
    | 'military'      // battles, breakthroughs, operations
    | 'political'     // declarations, peace plans, alliance shifts
    | 'humanitarian'  // displacement, atrocities, refugee crises
    | 'diplomatic'    // patron pressure, sanctions, international response
    | 'economic'      // production, smuggling, embargo, supply crises
    | 'command'       // officer events, friction, succession, experience
    | 'territorial';  // control flips, enclave status, front line changes
```

v0.4.5 commander events, v0.4.3 economy events, and v0.3.3 breakthrough events all use the same `EventDefinition` type, the same `EventModal.tsx`, the same event log. No parallel systems.

**Action:** Update v0.4.1 plan to include event category extensibility. Update v0.4.3 and v0.4.5 plans to POST events through the v0.4.1 system instead of their own mechanisms.

---

## Finding 2: Negotiation Capital Should Be Affected by Everything

**Problem:** Negotiation capital (v0.3.1, shipped) is computed per-turn from state, but the formulas are isolated in `compute_capital.ts`. The plans for v0.4.1 (events), v0.4.3 (economy), and v0.4.5 (officers) all affect negotiation-relevant dimensions but don't explicitly wire into the capital computation.

**Specific gaps:**
- **Events (v0.4.1)** can apply `negotiation_capital` effects directly — but the event content (Phases 3-4) doesn't specify HOW each event affects which capital dimension. The event JSON needs per-event capital impact.
- **Economy (v0.4.3)** — smuggling investment and production capacity affect military effectiveness capital, but `compute_capital.ts` doesn't read production/smuggling state.
- **Officer experience (v0.4.5)** — warlord friction affects political cohesion capital, and the plan says so, but the actual wiring isn't specified. ARBiH officer maturity should affect military effectiveness too.
- **Brigade AoR (v0.3.3)** — front line gaps and breakthroughs should affect military position capital. Currently territory % is the only driver.

**Fix:** Update `compute_capital.ts` incrementally with each milestone:
- v0.4.1: Events can directly mutate capital via `negotiation_capital` effect type ✓ (already planned)
- v0.4.3: Add production capacity and smuggling efficiency to `military_effectiveness` computation
- v0.4.5: Add officer maturity to `military_effectiveness`, friction count to `political_cohesion`
- v0.3.3: Add front line stability (gap frequency) to `military_position`

**Action:** Add "capital integration" task to each plan's final phase.

---

## Finding 3: The AI Commander Needs All Other Systems First

**Problem:** v0.4.4 (Claude AI Commander) is positioned BEFORE v0.4.5 (Officer Experience) in the roadmap, but the design doc says Claude should reason about officer growth. More importantly, Claude needs the event system, economy, and scenarios to have meaningful decisions.

**Current order:** v0.4.3 → v0.4.4 → v0.4.5
**Better order:** v0.4.3 → v0.4.5 → v0.4.4

**Why:** An AI Commander with officer experience, warlord friction, and commander relationships has dramatically richer decisions to make than one without. "My Drina Corps commander has improved to competence 4 — he's ready for a major operation" vs "my Drina Corps commander has stats 3/3/3."

**Action:** Swap v0.4.4 and v0.4.5 in the roadmap. Implement officer experience FIRST, then give Claude the full picture.

---

## Finding 4: Scenario Pre-Seeding is Under-Specified

**Problem:** v0.4.2 says "pre-seed negotiation capital with historically appropriate values" for mid-war starts, but doesn't define what those values ARE. January 1993 needs RS military_position ~65 (holds 65% territory), RBiH humanitarian_standing ~60 (camps exposed, international sympathy building), etc. March 1994 needs post-Washington capital. January 1995 needs near-peak everything.

Similarly, officer state for mid-war starts is unspecified. If a January 1993 scenario starts, should officers already have some experience? Should RS brain drain already have removed early-departure officers?

**Fix:** Create a `scenario_preseeding.ts` module that derives initial state from the scenario's start date:
- Negotiation capital: interpolated from historical baseline table (already in the design doc)
- Patron override: from the historical timeline table
- Officer experience: derived from `scenario_start_week` × average operations rate
- Economy: production facility conditions, smuggling capacity, supply reserves — all date-appropriate

This module is referenced by ALL scenario plans and avoids duplicating pre-seeding logic in each scenario manifest.

**Action:** Add `scenario_preseeding.ts` as a shared deliverable, referenced from v0.4.2.

---

## Finding 5: The UI Components Overlap

**Problem:** Multiple plans create floating panels with similar patterns:
- v0.4.0: PeaceStatusPanel (left sidebar), PeaceWarTransition (overlay)
- v0.4.1: EventModal (overlay), EventDecisionModal (overlay), EventLogPanel (panel)
- v0.4.3: EconomyPanel (panel from toolbar)
- v0.4.5: Friction log (toolbar panel), experience display (OfficerProfile enhancement)

All follow the same glassmorphism visual language but are independently designed. No shared panel framework.

**Fix:** Before implementing v0.4.0, create a shared `GlassPanel` component:

```tsx
<GlassPanel
    position="left" | "right" | "overlay" | "bottom-tray"
    title="Economy Overview"
    width="320px"
    onClose={...}
>
    {children}
</GlassPanel>
```

This ensures visual consistency, reduces code duplication, and makes future panels trivial to create. The ops planning modal redesign (external expert) is establishing the visual language — our shared component should match it.

**Action:** Add `GlassPanel.tsx` as a Phase 0 deliverable in v0.4.0. All subsequent plans reference it.

---

## Finding 6: Missing — How Does the Player Learn What Changed?

**Problem:** Multiple systems change state each turn (events fire, production runs, officers gain experience, supply shifts, smuggling operates) but there's no unified **turn report** that tells the player what happened.

The warroom has a newspaper concept. The tactical map has turn summaries. But neither is designed to aggregate all the v0.4.x systems into a readable brief.

**Fix:** Define a **Command Briefing** that fires after each turn advance:
- Military: battles fought, territory gained/lost, operations status
- Economy: production output, supply consumed, smuggling income
- Diplomatic: events fired, patron pressure changes, peace plan responses
- Command: officer experience gains, friction events, succession
- Humanitarian: displacement, casualties, enclave status

This is essentially the turn AAR extended with economy + diplomacy + officer data. It should be the FIRST thing the player sees after "End Turn" — before they can issue new orders.

**Action:** Add "Command Briefing enhancement" as a cross-cutting deliverable, ideally in v0.4.1 (since the event system is the natural aggregator).

---

## Finding 7: Determinism Rules Are Inconsistent

**Problem:** Each plan handles determinism differently:
- v0.3.3: No randomness mentioned (pure formula)
- v0.4.1: Events use turn-range triggers (deterministic)
- v0.4.3: Smuggling disruption based on territory control (deterministic)
- v0.4.5: Warlord friction uses `hashString(officerId:turn)` for pseudo-random

The friction approach (v0.4.5) is the first system that introduces **pseudo-random** behavior into the simulation. This needs to be a project-wide pattern, not a one-off hack.

**Fix:** Define a canonical `deterministicRandom(seed: string, context: string): number` utility that ALL systems use when they need controlled randomness:

```typescript
// src/state/deterministic_random.ts
export function deterministicRandom(seed: string, context: string): number {
    const hash = hashString(`${seed}:${context}`);
    return (hash % 10000) / 10000; // 0.0000 - 0.9999
}
```

- v0.4.5 friction: `deterministicRandom(officerId, \`friction:${turn}\`)`
- v0.4.1 random events: `deterministicRandom(scenarioId, \`event:${eventId}:${turn}\`)`
- v0.4.3 smuggling disruption: `deterministicRandom(routeId, \`disruption:${turn}\`)`

Same input = same output. Replay-safe. Used everywhere instead of ad-hoc hashing.

**Action:** Create `deterministic_random.ts` as infrastructure before v0.4.1. Reference from all plans that need controlled randomness.

---

## Finding 8: v0.3.2 (Humanitarian Fix) Affects Everything

**Problem:** v0.3.2 is listed as a "small bug fix" but it actually affects the entire negotiation capital system. Currently humanitarian_standing = 0 for all factions because refugees are attributed globally. Fixing this changes every faction's capital trajectory, which affects:
- Peace plan bot responses (v0.4.1) — bot compares capital before accepting/rejecting
- Verdict scoring (v0.3.1) — Pyrrhic Score uses humanitarian_standing
- Patron pressure (v0.3.1) — override formula reads war_crimes from capital

**Fix:** v0.3.2 should be implemented FIRST and followed by a calibration run to establish the new baseline before any v0.4.x work begins. The current capital values (humanitarian = 0) are wrong — all downstream plans assume correct capital.

**Action:** Elevate v0.3.2 priority. Implement and calibrate before starting v0.4.0.

---

## Revised Execution Order

Based on these findings, the optimal execution order is:

```
v0.3.2  Humanitarian fix + calibration    ← FIRST (fixes capital baseline)
v0.3.3  Brigade AoR sub-segment           ← independent, can parallel
  ↓
INFRASTRUCTURE: GlassPanel.tsx + deterministic_random.ts + scenario_preseeding.ts
  ↓
v0.4.0  Peace Phase Interactivity         ← uses GlassPanel
v0.4.1  Complete Event System             ← universal event bus, uses deterministic_random
v0.4.2  Additional Scenarios              ← uses scenario_preseeding, event coupling
v0.4.3  Economy & War Production          ← posts events, feeds capital
v0.4.5  Officer Experience                ← posts events, feeds capital, uses deterministic_random
v0.4.4  AI Commander Prototype            ← LAST: sees everything, richest decisions
```

Note: v0.4.4 and v0.4.5 swapped. Infrastructure added as a pre-phase.

---

## Summary of Actions

| # | Action | Affects |
|---|--------|---------|
| 1 | Design v0.4.1 event system as universal event bus with extensible categories | v0.4.1, v0.4.3, v0.4.5 |
| 2 | Add capital integration tasks to v0.4.3 and v0.4.5 plans | v0.4.3, v0.4.5 |
| 3 | Swap v0.4.4 and v0.4.5 in roadmap (officer experience before AI) | Roadmap |
| 4 | Create `scenario_preseeding.ts` specification for v0.4.2 | v0.4.2 |
| 5 | Create shared `GlassPanel.tsx` before v0.4.0 | v0.4.0, v0.4.1, v0.4.3, v0.4.5 |
| 6 | Add Command Briefing enhancement to v0.4.1 | v0.4.1 |
| 7 | Create `deterministic_random.ts` utility before v0.4.1 | v0.4.1, v0.4.3, v0.4.5 |
| 8 | Elevate v0.3.2 to implement-first priority | All plans |

---

*"Plans are worthless, but planning is everything." — Eisenhower*
*"Plans reviewed critically are worth something." — Pyrrhic Games*
