# Game Chronicle — Design Spec

**Date:** 2026-03-22
**Status:** APPROVED
**Version:** v0.6.2 (Chronicle) + v0.6.3 (Wrapped)
**Parent:** `docs/plans/2026-03-22-v06x-master-roadmap.md`

---

## Concept

The Game Chronicle is the story of YOUR war. A living vertical timeline that weaves military, political, humanitarian, diplomatic, and narrative threads into one scrollable spine. During play it's an intelligence briefing that crosses domain boundaries. At game end it transforms into "Spotify Wrapped for your war" — a cinematic reveal of the most dramatic moments.

This is the one feature that transcends the Two Rooms metaphor. The President's Office handles politics. The Command Center handles military. The Chronicle holds it all.

---

## Entry Points

1. **CHRONICLE button** on Presidential Toolbar (left side, next to date)
2. **Clickable date label** — tapping "6 JAN 1993 - TURN 40" opens Chronicle at that point in time
3. **Keyboard shortcut:** `C`
4. Opens as a **full-screen overlay** (z-1000, same level as Army HQ)

---

## Visual Structure

### The Spine

A vertical central line that IS the data. The spine is a **multi-layered ribbon** encoding three continuous metrics:

- **Territory bands** — 3 thin horizontal bands (RS red, RBiH green, HRHB blue) showing area-weighted territory % at each turn. As territory shifts, the bands widen/narrow.
- **Casualty accumulation** — a thin red line tracing total casualties over time. Steeper = bloodier periods.
- **Supply reserve** — a thin amber line for player faction supply level.

The ribbon runs vertically, newest at top. Each turn is a tick mark on the spine. Most turns are compressed (just the ribbon). Turns with events expand to show cards.

### Cards

Event cards branch left and right off the spine, alternating sides. Each card is compact (2-3 lines). Six types with distinct visual treatment:

| Card Type | Left Border Color | Icon | Content Examples |
|---|---|---|---|
| **COMBAT** | Red (`#c04040`) | Crossed swords | Battles, territory flips, operations, sieges |
| **POLITICAL** | Amber (`#c4a35a`) | Star/seal | Event decisions, foundational choices, dimension shifts |
| **HUMANITARIAN** | Blue (`#4080b8`) | People | Displacement waves, civilian casualties, enclave crises |
| **MILITARY** | Green (`#4a9a55`) | Shield | Brigade formations/destructions, decorations, officer changes |
| **DIPLOMATIC** | Purple (`#8855aa`) | Handshake | Patron changes, alliance shifts, ceasefires, sanctions |
| **NARRATIVE** | Cream (`#d5c9bc`) | Quill | CoS excerpts, war dispatches, notable moments |

### Headline Cards

Major events get a **wide card spanning both sides** of the spine:
- Foundational decisions (RS Strategic Goals, RBiH State Identity, HRHB Political Goal)
- Major operations completing (with star grade)
- Enclave falls/relief
- Peace plan offers/rejections
- Graz Accords, Washington Agreement
- Game-ending events

### Card Content (compact)

```
┌─ COMBAT ──────────────────────┐
│ W12: Battle of Brčko          │
│ VRS victory — corridor held   │
│ 342 casualties                │
└───────────────────────────────┘
```

```
┌─ POLITICAL ───────────────────┐
│ W3: The Assembly Speaks       │
│ You chose: All Six Goals      │
│ ▼ Intl Standing -15           │
└───────────────────────────────┘
```

```
┌─ HUMANITARIAN ────────────────┐
│ W8: Drina Valley displacement │
│ 12,400 displaced, 340 killed  │
│ Fled to Tuzla, Srebrenica     │
└───────────────────────────────┘
```

---

## Data Sources

All data comes from existing engine state. **Zero new engine tracking needed.**

| Card Type | Source | Key Fields |
|---|---|---|
| COMBAT | `turn_summaries[].battles` | osid, outcome, casualties, territory_flipped |
| COMBAT | `turn_summaries[].notable_flips` | significance (municipality_seat, enclave_breach, corridor) |
| COMBAT | `operation_history[]` | name, outcome, grade, casualties, weekly_log |
| COMBAT | `turn_summaries[].notable_events` | siege_formed, siege_broken, first_battle |
| POLITICAL | `fired_event_ids[]` + event definitions | event title, description, player choice |
| POLITICAL | `event_flags` | foundational decisions, flag changes |
| POLITICAL | dimension shifts (from event effects) | which dimension, delta, new value |
| HUMANITARIAN | `displacement.displacement_event_log[]` | origin, ethnicity, displaced/killed/fled |
| HUMANITARIAN | `turn_summaries[].displacement_total` | per-turn displacement |
| HUMANITARIAN | civilian casualties | killed, fled_abroad |
| MILITARY | `turn_summaries[].formation_spawns/destructions` | formation name, faction |
| MILITARY | `turn_summaries[].decoration_awards` | brigade, tier, reason |
| MILITARY | `turn_summaries[].arc_transitions` | brigade, old arc → new arc |
| MILITARY | officer events | assignment, dismissal, replacement |
| DIPLOMATIC | patron relationships | support changes, override authority |
| DIPLOMATIC | `turn_summaries[].notable_events` | graz_accords, ceasefire, washington_agreement |
| DIPLOMATIC | peace plan history | plan offered, responses, accepted/rejected |
| DIPLOMATIC | alliance value changes | RBiH-HRHB alliance shifts |
| NARRATIVE | war stories | brigade narrative arcs, notable moments |
| NARRATIVE | corps dialogues | commander acknowledgments |
| NARRATIVE | war dispatches | AI-generated situation summaries |

### Spine Ribbon Data

| Metric | Source | Per-Turn |
|---|---|---|
| Territory % (3 factions) | `controlBySettlement` + `osid_areas.json` | Snapshot each turn |
| Cumulative casualties | `casualty_ledger` per faction | Running total |
| Supply reserve | `general_supply_reserve` per faction | Current value |

**Note:** Spine ribbon data needs to be captured as a per-turn snapshot array. Currently territory % and supply are current-state-only (not historied). Two options:
- **A)** Derive from turn_summaries (territory_net can reconstruct trajectory) — approximate but no engine change
- **B)** Add a small per-turn snapshot to TurnSummary — `territory_pct: Record<FactionId, number>`, `supply: Record<FactionId, number>` — ~20 bytes/turn, precise

Recommend **B** — minimal engine addition, precise ribbon rendering.

---

## Chronicle Generation

### `generateChronicleEntries(state: LoadedGameState): ChronicleEntry[]`

Pure function. Reads all data sources, produces a flat array of entries sorted by turn (descending for display, ascending for Wrapped analysis).

```typescript
interface ChronicleEntry {
    turn: number;
    type: 'combat' | 'political' | 'humanitarian' | 'military' | 'diplomatic' | 'narrative';
    headline: boolean;       // true = wide card spanning both sides
    title: string;
    detail: string;
    metadata?: {
        corpsId?: string;    // for navigation
        osid?: string;
        operationName?: string;
        dimensionShifts?: Array<{ dimension: string; delta: number }>;
        casualties?: number;
        displaced?: number;
    };
}
```

### Filtering & Significance

Not every turn produces cards. The generator applies significance thresholds:
- Battles: only show if territory_flipped OR casualties > 100 OR notable_flip
- Displacement: only if > 500 displaced in a single turn
- Dimension shifts: only if |delta| >= 5
- Officer events: always show
- Event decisions: always show
- Operations: show launch and completion (not every execution turn)
- Arc transitions: only show shattered, risen, destroyed (skip minor changes)

This keeps the timeline scannable (~2-4 cards per turn average, not 15).

---

## Wrapped — Game End Experience

### Trigger

When `GameOverModal` fires (war ends, Dayton resolves, or collapse), the player gets a "VIEW YOUR WAR" button that launches the Wrapped overlay.

### 10 Slides

Each slide is a full-screen card with a single dramatic statistic or moment. Player clicks through sequentially.

| # | Slide | Data Source | Visual |
|---|---|---|---|
| 1 | **"Your War"** | Faction, total weeks, verdict | Faction crest, large text, one-line pyrrhic verdict |
| 2 | **"The Opening"** | Foundational decision, territory at w8 | Decision text + early territory snapshot |
| 3 | **"Your Bloodiest Week"** | Turn with max casualties | Battle names, casualty count, territory flipped |
| 4 | **"The Brigade That Wouldn't Die"** | Highest-decorated or longest-surviving brigade | Name, arc, battles fought, narrative excerpt |
| 5 | **"What You Built"** | Peak territory %, peak personnel, total ops | Three big numbers |
| 6 | **"What It Cost"** | Total KIA/WIA (all factions), displacement, civilian toll | Somber numbers, faction-colored |
| 7 | **"The World Was Watching"** | International standing trajectory, war crimes, patron arc | Sparkline of international_standing over time |
| 8 | **"Your Decisions"** | 3-5 event choices with largest dimension impact | Decision title + dimension delta, linked |
| 9 | **"At The Table"** | Dayton capital score, packages won/lost, final split | Territory map snapshot + negotiation outcome |
| 10 | **"Another Such Victory"** | Final 6-dimension spider chart, pyrrhic score, historical comparison | Spider chart + "In real history..." text |

### `generateWrappedSlides(state: LoadedGameState): WrappedSlide[]`

Analysis pass over chronicle data. Picks the most dramatic datapoints algorithmically:
- Bloodiest week: `max(turn_summaries, by total_casualties)`
- Best brigade: `max(formations, by decorations.length + brigade_history.victories)`
- Most impactful decisions: `sort(fired_events, by sum of |dimension_shifts|)`
- Peak territory: `max(territory_snapshots, by player_faction_pct)`

No AI needed — pure data analysis.

### Post-Wrapped

After the 10 slides, the full Chronicle remains scrollable with **"turning point" markers** — the moments that Wrapped identified as most significant are visually highlighted on the spine with a gold star or pin.

---

## UI Components

| Component | Purpose |
|---|---|
| `ChronicleOverlay.tsx` | Full-screen overlay, entry/exit, scroll container |
| `ChronicleSpine.tsx` | Vertical ribbon renderer (territory bands, casualty line, supply line) |
| `ChronicleCard.tsx` | 6 card type variants + headline variant |
| `ChronicleFilters.tsx` | Optional filter bar (show/hide card types) |
| `WrappedOverlay.tsx` | 10-slide cinematic, click-through navigation |
| `WrappedSlide.tsx` | Individual slide renderer (10 variants) |
| `SpiderChart.tsx` | 6-axis radar chart for final dimension display |

### gameStore additions
```typescript
chronicleOpen: boolean;
setChronicleOpen: (open: boolean) => void;
wrappedOpen: boolean;
setWrappedOpen: (open: boolean) => void;
```

---

## Version Scope

| Version | Deliverable |
|---|---|
| **v0.6.2** | Chronicle overlay, spine, 6 card types, generation from existing data, toolbar button, date click, keyboard shortcut. Living timeline during play. |
| **v0.6.3** | Wrapped overlay (10 slides), turning point markers, spider chart. Requires Dayton/endgame to exist. |

---

## Engine Change (Minimal)

One small addition to `TurnSummary`:

```typescript
// Added to TurnSummary interface
territory_snapshot?: Partial<Record<FactionId, number>>;  // area-weighted %
supply_snapshot?: Partial<Record<FactionId, number>>;     // general supply reserve
```

Populated in the existing `compileTurnSummary()` function. ~10 lines of engine code. No calibration impact (additive field, never read by simulation).

---

## Testing

- `generateChronicleEntries()` — unit tests with mock LoadedGameState, verify card count, types, ordering
- `generateWrappedSlides()` — unit tests verifying "bloodiest week" picks correct turn, "best brigade" picks correct formation
- Significance thresholds — verify minor events are filtered, major events are kept
- Spine data — verify territory bands render from snapshot data
- No calibration regression (UI-only except 10-line TurnSummary addition)

---

## Not In Scope

- AI-generated narrative prose for cards (use template text)
- Shareable/exportable chronicle (screenshot/PDF)
- Multiplayer chronicle comparison
- Chronicle data in save files (derived from existing state, not persisted separately)
