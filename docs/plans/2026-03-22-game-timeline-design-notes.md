# Game-Level Event Timeline — Design Notes

**Date:** 2026-03-22
**Status:** CONCEPT — brainstormed, not yet planned for implementation
**Depends on:** v0.6.0 merge (event decision UI, dimension visualization)
**Pattern source:** Settlement Timeline (`src/ui/map/components/SettlementTimeline.tsx`)

---

## Concept

The settlement timeline tells "the story of THIS place." The game timeline tells "the story of THIS war" — every decision the player made, every consequence that landed, every dimension shift, every event chain firing.

Two complementary views of the metagame:
- **Strategic dashboard:** your CURRENT dimension values (the snapshot)
- **Game timeline:** HOW they got there (the history)

---

## Event Types

| Type | Icon | Color | Example |
|------|------|-------|---------|
| `foundational_decision` | Crown/star | gold | "The Assembly Speaks — All Six Goals adopted" |
| `decision_event` | Scale/gavel | amber | "The World Is Watching — Deny chosen" |
| `consequence_event` | Lightning | red | "Jajce has fallen — alliance deteriorated" |
| `forced_event` | Shield | blue | "UN Arms Embargo imposed" |
| `dimension_shift` | Arrow up/down | green/red | "International standing -25 (Drina cleansing)" |
| `flag_set` | Flag/pin | teal | "Corridor secured" |
| `operation_milestone` | Sword | amber | "Op Corridor 92 — Brod captured w27" |
| `peace_plan` | Dove | blue | "London Conference — terms rejected" |
| `pressure_warning` | Warning triangle | amber | "NATO intervention risk ELEVATED" |
| `alliance_change` | Handshake/broken | varies | "HVO-ARBiH alliance deteriorating" |

---

## Data Sources (all already in engine)

| Source | Field | What it provides |
|--------|-------|-----------------|
| `events_fired` in weekly_report.jsonl | `{ id, text }` per turn | Which events fired when |
| `event_flags` on MilitaryState | `Record<string, value>` | What the player chose |
| `strategic_dimensions` on NegotiationState | `{ base, modifier, effective }` | Dimension values over time |
| `event_fire_counts` / `event_last_fired_turn` | `Record<string, number>` | Recurrence tracking |
| `pending_event_decisions` | `PendingEventDecision[]` | Unresolved decisions |
| `operation_history` | Completed ops with outcomes | Military milestones |
| `political.war_alliance_rbih_hrhb` | Alliance value | Alliance changes |

**Gap:** Dimension shift DELTAS are not currently persisted per-turn. The `dimension_shifts` on EventDefinition tell you WHAT would shift, but the actual per-turn delta history isn't stored. Options:
- Derive from events_fired (look up the EventDefinition, read its dimension_shifts)
- Persist a `dimension_shift_log` on state: `Array<{ turn, event_id, faction, dimension, delta }>`

The second is cleaner and follows the settlement timeline pattern (persist, don't recompute).

---

## Data Structure

```typescript
interface GameTimelineEntry {
    turn: number;
    type: GameTimelineEventType;
    faction?: string;
    title: string;
    detail?: string;
    dimension_shifts?: Array<{ faction: string; dimension: string; delta: number }>;
    flag_set?: { flag: string; value: string | number | boolean };
    player_choice?: string;  // which option was selected
    historical_source?: string;  // ICTY citation for educational value
}

type GameTimelineEventType =
    | 'foundational_decision'
    | 'decision_event'
    | 'consequence_event'
    | 'forced_event'
    | 'dimension_shift'
    | 'flag_set'
    | 'operation_milestone'
    | 'peace_plan'
    | 'pressure_warning'
    | 'alliance_change';
```

---

## Visual Pattern

Same as settlement timeline — vertical spine, grouped by turn, color-coded icons. Differences:

- **Faction filter:** show all factions or filter to player faction
- **Type filter:** toggle event categories on/off
- **Dimension shift badges:** inline colored badges showing +/- on each dimension
- **Decision replay:** click a past decision to see what options were available and what you chose
- **Consequence linking:** click a consequence event to see which prior decision caused it (via flag chain)

---

## Where It Lives

**In the Army HQ** — a new tab or collapsible section alongside the Situation Briefing. The briefing shows what's happening NOW; the timeline shows what HAPPENED. Together they give the player full situational awareness of the political war.

Alternatively: a standalone "War Chronicle" panel accessible from the bottom strip or a keyboard shortcut.

---

## Implementation Sequence

1. **First:** Build strategic dashboard with dimension bars (HQ Phase 3.5) — gives the "now" view
2. **Second:** Build event decision UI in HQ — gives the "choose" interaction
3. **Third:** Build game timeline — gives the "history" view, recording decisions and consequences
4. **Fourth:** Wire dimension shift logging into the timeline

This matches the v0.6.0 merge work sequence.

---

## Relationship to Settlement Timeline

The game timeline is the MACRO version of the settlement timeline:

| | Settlement Timeline | Game Timeline |
|---|---|---|
| **Scope** | One OSID | Entire war / faction |
| **Focus** | Tactical (battles, brigades, displacement) | Strategic (decisions, dimensions, diplomacy) |
| **Driven by** | Military events at a location | Player choices and their consequences |
| **Teaches** | What happened to this community | What your leadership wrought |

Both use the same rendering pattern (vertical spine, turn groups, colored icons) but tell different stories at different scales.
