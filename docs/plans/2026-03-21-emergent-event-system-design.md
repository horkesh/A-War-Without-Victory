# Emergent Event System — Design Document

**Date:** 2026-03-21
**Status:** SUPERSEDED for implementation details by `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md`
**Scope:** v0.6.0 (infrastructure + 1992 events), v0.6.x (full event set), command autonomy backlog v0.7+
**Authors:** Orchestrator + full Pyrrhic team brainstorm

---

## 1. Vision

The event system is a **metagame layer on top of the military simulation**. The map is where brigades fight; the events are where the war is won or lost.

Every military action feeds the political game. Every political choice constrains military options. The player who only thinks about the map loses at the negotiating table. The player who shows restraint arrives at Dayton with fewer pins on the map but a stronger hand. Neither strategy "wins." That is the game.

This is how AWWV delivers its core promise: **exhaustion, political collapse, constrained agency — not conquest.**

---

## 2. Player Identity

**The player IS the wartime political leader of their faction.** This is game-wide, non-negotiable.

- **RBiH:** The President. Civilian leader of a multi-ethnic state under siege.
- **RS:** The President of Republika Srpska. Political leader who directs the war.
- **HRHB:** The President of Herceg-Bosna. Croatian community leader navigating Zagreb's directives.

### Rules

- **Never named explicitly.** The game says "you" and "your faction." No portraits, no names in UI. The player inhabits the role through the decisions they face.
- **Every event speaks to you as head of state.** "Mr. President, the international community demands access to the camps." Not "the player is presented with..."
- **Your officers are subordinates.** They report to you. They can fail you, defy you, or surprise you.
- **Military decisions are strategic, not tactical.** You tell your army commander to take the Drina valley. You don't tell 28th Division which OSID to attack. Corps commanders and sector AI are your subordinates executing your intent — sometimes well, sometimes badly.
- **The metagame IS the political leader's game.** Territory, alliances, international standing, patron confidence — these are the levers a president pulls.

---

## 3. Event Types

### 3.1 Decision Event (~60%)

The player chooses between 2-4 options. Each option has immediate mechanical effects AND sets flags / shifts dimensions that shape future events.

**Design rules:**
- Every option costs something. No free wins. If a playtester always picks the same option, one of the options is broken.
- 2 options for binary dilemmas (accept/reject). 3 for meaningful middle paths. 4 only for pivotal war-altering decisions.
- Inaction is an option with consequences. If the player dismisses or stalls, that IS a choice — and it gets the worst of both worlds.
- Events can expire after N turns with the worst outcome auto-applied (EU4 pattern).

### 3.2 Consequence Event (~30%)

Something happened — often because of the OTHER faction's decision, or because of your prior choices coming home to roost. Real mechanical state change, no choice.

"Jajce has fallen. Alliance deteriorates. HVO blames your command for inadequate support."

These are NOT wallpaper. Every consequence event mutates game state in a way the player must respond to through subsequent decisions or military action.

### 3.3 Forced Event (~10%)

Truly exogenous — UN resolution, external power decision, natural event. Something no faction chose and no game state triggered.

Almost always followed by a Decision Event within 1-2 turns: "The UN has declared Safe Areas. How do you respond?"

### Design Test

**The delete test:** If removing the event produces no detectable change in a 52-week run, the event is wallpaper. Either give it teeth or cut it. No narrative-only effects. No `effect.kind === 'narrative'` without an accompanying mechanical effect.

---

## 4. Trigger System — Emergent, Not Calendar

### 4.1 Philosophy

Events fire because the game state reached a condition — not because "it's week 14."

Timed triggers are the **exception**, reserved for genuinely exogenous events (JNA withdrawal was a Belgrade political decision; the UN has a real calendar). Even these should have state-based modifiers (the SCALE of JNA equipment transfer depends on how much territory RS controls at the time).

### 4.2 Trigger Families

| Family | Description | Examples |
|--------|-------------|---------|
| **Threshold** | Game state crosses a value boundary | Alliance < 0.20, supply critical for N turns, faction territory % crosses threshold, dimension value above/below |
| **Incident** | A specific game event just occurred THIS turn | Enclave fell, operation completed/failed, officer killed, civilian casualty spike, first battle in a municipality, OSID changed hands |
| **Compound** | Boolean combinations (`and`/`or`/`not`) of the above plus prerequisite flags | Alliance < 0.20 AND flag `gornji_vakuf_resolved` = 'escalated' AND turn >= 40 |
| **Temporal** (rare) | Calendar-gated, for genuinely exogenous events only | JNA withdrawal (Belgrade decision), UN resolutions with real-world dates |

### 4.3 New Condition Types Needed

Beyond the current `territory_control`, `alliance_below/above`, `faction_controls_municipality`:

- `supply_below` / `supply_above` (faction + threshold)
- `enclave_supply_status` (municipality + status: adequate/strained/critical)
- `corridor_severed` (from_osid, to_osid, faction — BFS connectivity)
- `territory_percentage` (faction + above/below + threshold)
- `patron_pressure_above` (faction + threshold)
- `war_crimes_above` (faction + threshold)
- `morale_average_below` (faction + threshold)
- `dimension_above` / `dimension_below` (faction + dimension + threshold)
- `flag_equals` (flag_name + expected value)
- `event_fire_count` (event_id + min/max — for recurrence-aware conditions)
- `week_since_event` (event_id + min_weeks — temporal relationships without hardcoded weeks)
- `formation_dissolved_count` (faction + min_count)
- `operation_active` / `operation_completed` (corps_id or faction)

---

## 5. The Pressure System

Events don't fire the instant conditions are met. They build.

### 5.1 Readiness Counter

Each event has a `readiness` value tracked on game state. Every turn:

```
1. Check preconditions (state-based conditions from Section 4)
2. If ALL met: readiness += pressure_rate (base rate + situational modifiers)
3. If readiness >= threshold: EVENT FIRES
4. If preconditions NO LONGER met: readiness -= decay_rate (doesn't reset to zero —
   political momentum doesn't vanish overnight)
```

### 5.2 Schema

```typescript
// On EventDefinition
pressure: {
  base_rate: number;           // default 1.0 per turn while conditions hold
  threshold: number;           // readiness value at which event fires
  decay_rate: number;          // readiness loss per turn when conditions lapse
  modifiers?: PressureModifier[];  // situational rate adjustments
}

// Modifier example
{ condition: { type: 'supply_below', faction: 'RS', threshold: 20 },
  rate_bonus: 0.5 }  // pressure builds faster when RS supply is critical
```

### 5.3 State Tracking

```typescript
// On GameState.political (or dedicated events state)
event_readiness: Record<string, number>;  // event_id -> current readiness value
```

### 5.4 What This Buys Us

- Events feel organic — they emerge from the war's rhythm
- The player can SEE pressure building (UI: "tensions rising in the Drina valley")
- The player can sometimes PREVENT an event by changing conditions before readiness hits threshold
- Fully deterministic — no randomness, just state-driven counter arithmetic

### 5.5 Example: Washington Agreement

- **Preconditions:** Croat-Bosniak war active for 15+ turns AND patron pressure on both RBiH and HRHB above 40
- **base_rate:** 1.0
- **threshold:** 8 (minimum 8 turns of building pressure)
- **decay_rate:** 0.3/turn if conditions lapse
- **Modifiers:** +0.5 if either side losing badly, +0.5 if US patron pressure above 60
- **When it fires:** Both RBiH and HRHB players get a Decision Event about Federation terms

---

## 6. Recurring Decisions

Events aren't one-shot offers. The war keeps presenting the same dilemma, but the context — and the price — changes.

### 6.1 Recurrence Model

```typescript
recurrence: {
  max_fires: number;           // how many times (1 = one-shot)
  cooldown_turns: number;      // minimum turns between offers
  escalation: 'static' | 'escalating' | 'deteriorating';
}
```

### 6.2 Three Patterns

**One-shot** (`max_fires: 1`) — Peace plans, treaties, foundational decisions. ~30%.

**Recurring with escalation** (`escalating`) — Military opportunities like Srebrenica. Each recurrence, rewards increase (morale boost grows) but costs increase too (more international attention). Pressure_rate increases with each decline. ~40%.

**Recurring with deterioration** (`deteriorating`) — Situations that worsen if ignored. Abdic's secession: first offer is "negotiate" (cheap). Third time, he's allied with VRS. Each recurrence, the "good" options disappear. ~30%.

### 6.3 Options Change on Recurrence

The player's prior choice is remembered. When the event recurs, available options change based on what they picked last time. Options have:

```typescript
available_from_fire?: number;    // only appears on Nth+ firing
unavailable_after_fire?: number; // disappears after Nth firing
```

Declined Srebrenica assault once? Next time, "contain" is gone — it's "assault" or "withdraw from the valley." The decision space narrows as you defer.

---

## 7. Consequence Cascade — Flags and Dimensions

Two parallel systems track how choices propagate forward.

### 7.1 State Flags (Specific Causal Chains)

Flags record **what the player did** at key decision points. Named, typed, per-faction.

```typescript
// On GameState.political (or dedicated events state)
event_flags: Record<string, string | number | boolean>;
```

Examples:
```
srebrenica_assault: 'declined' | 'launched' | 'negotiated_exchange'
corridor_92_force_level: 'full_commitment' | 'economy_of_force'
drina_cleansing_intensity: 'restrained' | 'systematic'
rs_strategic_goals: 'all_six' | 'selective' | 'aggressive'
rbih_state_identity: 'civic' | 'bosniak_national' | 'pragmatic'
hrhb_political_goal: 'united_front' | 'croat_republic' | 'strategic_ambiguity'
```

Downstream events read flags in their conditions:
```json
{ "type": "flag_equals", "flag": "srebrenica_assault", "value": "declined" }
```

**Flags are explicit.** When authoring a decision event, you declare what flags it sets. When authoring a downstream event, you declare what flags it reads. The dependency graph is visible and testable.

### 7.2 Strategic Dimensions (Cumulative Reputation)

Six dimensions per faction, accumulated through every choice across the entire game:

| Dimension | What It Measures | Driven By |
|-----------|-----------------|-----------|
| `military_credibility` | Can your army deliver? | Operation outcomes, decisive victories, failed assaults |
| `territorial_legitimacy` | Is your claim defensible? | Holding what you claim, historical presence, not overreaching |
| `international_standing` | How does the world see you? | War crimes, UN cooperation, media incidents, atrocity accumulation |
| `patron_confidence` | Does your patron back you? | Following patron directives, not embarrassing them |
| `internal_cohesion` | Is your faction unified? | Officer loyalty, civil-military relations, internal dissent, ethnic tensions |
| `negotiating_leverage` | Strength at the table | Composite — derived from the other five at key moments |

```typescript
// On GameState.political (or dedicated events state)
strategic_dimensions: Record<FactionId, Record<DimensionId, number>>;
```

Every decision shifts 1-3 dimensions. Small nudges (+/-5) for minor events, large shifts (+/-20) for pivotal ones.

Dimensions are read by future events as thresholds:
```json
{ "type": "dimension_below", "faction": "RS", "dimension": "international_standing", "threshold": 30 }
```

### 7.3 How They Work Together

**Flags** handle specific causal chains: Srebrenica decision -> Dayton territorial terms.
**Dimensions** handle cumulative reputation: dozens of small choices -> NATO intervention threshold.

A single decision event sets both:
```
"Concentration camp revelations" (RS consequence event):
  -> Flag: camps_response = 'deny' | 'obstruct' | 'cooperate'
  -> Dimension shifts:
    deny:     international_standing -20, internal_cohesion +5
    obstruct: international_standing -10, patron_confidence -10
    cooperate: international_standing -5, military_credibility -5
```

---

## 8. Ahistorical Branching — Foundational Decisions

Each faction gets early-game decisions that define faction identity and reshape the entire event tree. These are the most consequential choices in the game.

### 8.1 Design Rules

1. **Every branch must be historically PLAUSIBLE.** Real people considered these alternatives. Deep research required — ICTY verdicts, BB, academic sources.
2. **No branch is "correct."** The historical choice must not be obviously optimal.
3. **Branches reshape the EVENT TREE, not just numbers.** Choosing "United Front" as HRHB removes 15+ events (Croat-Bosniak war chain) and adds 10+ new ones.
4. **Deep research required per branch.** ICTY citations for plausibility, BB for military implications, consequence mapping.
5. **Bot always picks the historical option.** Ahistorical paths are player-only.

### 8.2 RS: The Six Strategic Goals (w1-2)

The RS National Assembly adopted six strategic goals on May 12, 1992. General Mladic warned the Assembly: "People, this means genocide." Then he executed the plan.

The six goals:
1. State separation from the other two communities
2. Posavina Corridor (Semberija to Krajina)
3. Drina valley corridor (border on the Drina — eliminating enclaves)
4. Una and Neretva border (western/southern boundaries)
5. Division of Sarajevo
6. Access to the sea (Herzegovina)

Each goal maps directly to military campaigns. The player chooses which to adopt.

**Option A — "Adopt All Six Goals" (historical):**
Full offensive doctrine, all axes active. Drina cleansing enabled (Goal 3). Sarajevo siege escalation (Goal 5). Maximum territory, maximum war crimes, maximum international pressure. NATO intervention threshold: standard.

**Option B — "Adopt Goals Selectively":**
Goals 1, 2, 4 active. Goals 3, 5, 6 modified or dropped. Reduced operational scope. `international_standing` +15. `internal_cohesion` -15 (hardliners revolt). Mladic friction events fire. Enclaves persist, smaller territory, better Dayton terms.

**Option C — "Pursue Aggressively":**
All six at maximum intensity. `military_credibility` +10, `international_standing` -10 from turn 1. War crimes accelerated. NATO threshold lowered. Fastest territorial gains.

**Research required:** Karadzic ICTY judgment (2016) for Assembly session details. Mladic ICTY judgment (2017) for operationalization. BB Vol. I Ch. 6 for military implications per goal.

### 8.3 RBiH: "What Is Bosnia?" (w2-4)

The Presidency platform of May 1992 declared a multi-ethnic, civic state. But tension existed between civic vision and Bosniak nationalism.

**Option A — "Civic Republic" (historical):**
Multi-ethnic recruitment (all pools). `international_standing` +15. `internal_cohesion` -5. Strongest Dayton position for unified state.

**Option B — "Bosniak National State" (ahistorical):**
Lose Croat/Serb recruitment pools (~20-25k soldiers). `internal_cohesion` +15. `international_standing` -20. Alliance starts lower. Stronger Bosniak entity at Dayton but no moral authority for unified state.

**Option C — "Revolutionary Pragmatism":**
Multi-ethnic in name, Bosniak in practice. Reduced minority recruitment (50%). No immediate penalties. But if investigated, hypocrisy penalty larger than Option B.

### 8.4 HRHB: "What Is Herceg-Bosna?" (w4-6)

**Option A — "United Front" (ahistorical):**
Alliance locked above 0.5. Joint operations enabled. No separate territorial claims. Zagreb patron pressure increases. Croat-Bosniak war CANNOT fire.

**Option B — "Croat Republic" (historical):**
Alliance decay enabled. Croat-Bosniak war can fire. Zagreb fully supportive. Independent operations and Dayton claims. Risk of two-front war.

**Option C — "Strategic Ambiguity":**
Cooperate publicly, prepare institutions quietly. Alliance decays slower. War can still fire at lower threshold. When it does, betrayal penalty is DOUBLE on `international_standing`.

---

## 9. Command Autonomy (BACKLOG — v0.7+)

The player chooses how autonomous the military is. This is a spectrum:

1. **Full delegation:** Bot AI runs all military decisions. Player focuses on political/diplomatic game. More events about officer initiative and friction.
2. **Strategic direction:** Player sets army-level strategy. Army commander translates to corps directives. Corps commanders execute.
3. **Corps-level oversight:** Player directs individual corps (stance, priority, operations). Army commander advises.
4. **Maximum control (current default):** Player sets corps stances, sector stances, approves operations, overrides officers.

**Design implications:**
- Higher delegation = more events about officer friction. "Your army commander launched an operation you didn't approve."
- Lower delegation = fewer surprises but more micromanagement.
- Political metagame plays identically regardless of delegation level.
- Historically authentic: Karadzic/Mladic friction (RS), Izetbegovic as civilian relying on generals (RBiH), Boban following Zagreb (HRHB).

**Status:** Concept approved. Needs canon review, mechanics design, UI design. Requires significant changes to the current player command model (army > corps > sector assumes maximum control).

---

## 10. Bot Decision Logic

### 10.1 Foundational Decisions

Bot factions ALWAYS pick the historical option. Ahistorical paths are player-only.

### 10.2 Tactical Decisions

Personality-weighted scoring from faction disposition profiles:

| Faction | Territory | Standing | Military | Patron | Survival |
|---------|-----------|----------|----------|--------|----------|
| RS | 0.8 | 0.1 | 0.6 | 0.4 | 0.3 |
| RBiH | 0.3 | 0.5 | 0.3 | 0.4 | 0.9 |
| HRHB | 0.5 | 0.2 | 0.3 | 0.9 | 0.4 |

Each response option carries scoring hints (`aggression_affinity`, `risk_level`). Bot evaluates: does this option align with faction priorities given current state? Deterministic — same state produces same choice.

### 10.3 State-Sensitive

An RS bot at 40% territory and high exhaustion accepts a peace plan it would reject at 65% territory. Faction disposition provides base weights; current state modifies them.

---

## 11. Event Budget and Frequency

- **~80 events authored** for 52-week scenario
- **~60 fire** per playthrough (some are conditional/branching)
- **~15-20 decision events** requiring player input
- **Current implementation cap: 4 events per turn** with same-turn `mutex_group` filtering before the cap and diagnostic overflow reporting. Persisted overflow queueing remains deferred to a later save-schema slice.
- **Average: 1.5 events/turn** (higher early war, lower mid/late)

### Frequency by Phase

| Turns | Phase | Events/Turn | Character |
|-------|-------|-------------|-----------|
| 1-8 | Early war chaos | 2-3 | Barracks, JNA withdrawal, embargo, siege, foundational decisions |
| 9-20 | Blitz consequences | 1-2 | Operations complete, cleansing consequences, first peace plans |
| 20-35 | Stalemate and second front | 1-2 | Alliance fracture, Croat-Bosniak war chain, enclave crises |
| 35-52 | Endgame | 1-2 | NATO intervention, ceasefire, Dayton |

---

## 12. Historical Research Pipeline

### 12.1 Source Hierarchy (NON-NEGOTIABLE)

1. **ICTY verdicts and trial records** — PRIMARY. Legal findings of fact, tested through adversarial cross-examination. Specific verdicts: Karadzic (2016), Mladic (2017), Krstic (Srebrenica), Prlic et al. (HRHB/Herceg-Bosna), Blaskic (central Bosnia HVO).
2. **Balkan Battlegrounds (CIA, BB1/BB2)** — SECONDARY. Military operational detail, OOB, campaign sequences.
3. **Everything else** — academic papers, journalist accounts, UNPROFOR reports, news archives.

### 12.2 Per-Event Research Requirement

Each event needs:
- **ICTY citation** (where applicable) — what the tribunal found as fact
- **BB cross-reference** — military operational context
- **Historical plausibility check** — did real people consider this alternative?
- **Cascade mapping** — what does this event unlock or block downstream?
- **Mechanical balancing** — do the consequences make gameplay sense?

### 12.3 Research Process

For each event: WebSearch ICTY judgment archives -> extract factual findings -> cross-reference BB for military detail -> synthesize into event definition with conditions, options, effects, flags, and dimension shifts.

---

## 13. Technical Architecture Overview

### 13.1 Expanded EventDefinition Schema

```typescript
interface EventDefinition {
  id: string;
  title: string;
  narrative: string;                    // briefing-style text, 2nd person
  category: EventCategory;
  image?: string;

  // Trigger
  trigger: EventTrigger;               // conditions + turn window (soft, not hard)

  // Pressure
  pressure: {
    base_rate: number;
    threshold: number;
    decay_rate: number;
    modifiers?: PressureModifier[];
  };

  // Recurrence
  recurrence: {
    max_fires: number;
    cooldown_turns: number;
    escalation: 'static' | 'escalating' | 'deteriorating';
  };

  // Effects (applied on fire, before choice)
  effects?: EventEffect[];

  // Flags set on fire (before choice)
  sets_flags?: Record<string, string | number | boolean>;

  // Dimension shifts on fire (before choice)
  dimension_shifts?: DimensionShift[];

  // Decision
  response_options?: EventResponseOption[];
  requires_player_response?: boolean;
  auto_resolve_turns?: number;         // expires after N turns, worst option applied
  bot_response_logic: 'historical' | 'personality_weighted' | 'strategic_weighted';

  // Metadata
  priority?: number;                   // lower = fires first (default 100)
  mutex_group?: string;                // only one per group per turn
  tags?: string[];
  enables_events?: string[];           // chain: firing this unlocks these IDs
  historical_source?: string;          // ICTY/BB citation
}

interface EventResponseOption {
  id: string;
  label: string;
  description: string;                 // visible consequence explanation
  effects: EventEffect[];
  sets_flags?: Record<string, string | number | boolean>;
  dimension_shifts?: DimensionShift[];
  available_from_fire?: number;        // appears only on Nth+ firing
  unavailable_after_fire?: number;     // disappears after Nth firing
  // Bot scoring hints
  aggression_affinity?: number;        // [-1, 1]
  risk_level?: number;                 // [0, 1]
}

interface DimensionShift {
  faction: FactionId;
  dimension: DimensionId;
  delta: number;
}

type DimensionId =
  | 'military_credibility'
  | 'territorial_legitimacy'
  | 'international_standing'
  | 'patron_confidence'
  | 'internal_cohesion'
  | 'negotiating_leverage';
```

### 13.2 New State Fields

```typescript
// On GameState.political or new top-level events state
event_readiness: Record<string, number>;        // pressure counters
event_fire_counts: Record<string, number>;      // how many times each event fired
event_last_fired_turn: Record<string, number>;  // for cooldown tracking
event_flags: Record<string, string | number | boolean>;  // decision flags
enabled_event_ids: string[];                    // chain-unlocked events
strategic_dimensions: Record<FactionId, Record<DimensionId, number>>;
```

### 13.3 New Effect Types Needed

Beyond current 10 (morale, cohesion, supply, alliance, equipment, humanitarian, patron, negotiation, aggression, narrative):

- `doctrine_override` — force faction doctrine phase
- `formation_modifier` — buff/debuff specific corps/brigades
- `truce_action` — create/break/modify local truces
- `spawn_formation` — create new unit (APWB militia, foreign volunteers)
- `disable_operations` — block offensive ops for N turns (ceasefire)
- `patron_commitment_shift` — change patron aid curves
- `supply_route_modifier` — open/close/degrade supply corridors
- `flag_set` — set event flag (also available as top-level `sets_flags`)
- `dimension_shift` — shift strategic dimension (also top-level)

**Kill `narrative` as a standalone effect kind.** Narrative text goes in `EventDefinition.narrative`. Every effect must mutate state.

### 13.4 Evaluation Pipeline

Per turn, in the `evaluate-events` pipeline step:

1. **Collect TurnIncidents** — battles fought, OSIDs flipped, formations dissolved, operations completed (new infrastructure)
2. **Update readiness counters** — for each registered event, check conditions, increment or decay readiness
3. **Collect candidates** — events where readiness >= threshold
4. **Resolve conflicts** — mutex groups (keep highest priority per group)
5. **Cap at 3** — queue overflow to next turn (sorted by priority)
6. **Fire events** — apply effects, set flags, shift dimensions, record in state
7. **Queue decisions** — player decisions go to pending queue; bot decisions auto-resolve

### 13.5 Determinism Guarantees

- Event registry sorted by priority then ID (stable order)
- Effects sorted by kind before application (existing pattern)
- Readiness counters are pure arithmetic on state (no randomness)
- Bot decisions are deterministic (same state = same choice)
- Condition evaluation order: same as registry order (cascading mutations are intentional and documented)
- `event_flags` comparisons use strict equality (no floating point issues)

---

## 14. Integration Reconciliation

Four existing systems overlap or conflict with the new event system. These must be resolved during v0.6.0 infrastructure work — not discovered during implementation.

### 14.1 RESOLVE: Strategic Dimensions Replace Negotiation Capital

**Problem:** The existing `NegotiationCapital` has 5 per-faction dimensions computed bottom-up from raw game data:

| Existing (computed from game state) | New (shifted by events) | Overlap |
|-------------------------------------|------------------------|---------|
| `military_position` | `military_credibility` + `territorial_legitimacy` | ~90% |
| `humanitarian_standing` | `international_standing` (inverse) | ~80% |
| `international_credibility` | `international_standing` | ~90% |
| `military_effectiveness` | `military_credibility` | ~70% |
| `political_cohesion` | `internal_cohesion` | ~95% |
| (none) | `patron_confidence` | New |
| (none) | `negotiating_leverage` | New (composite) |

Shipping both means two parallel diplomatic score systems measuring the same things differently. The player sees two dashboards that roughly agree but diverge on specifics.

**Resolution: Unified hybrid system.** One set of dimensions that combines both approaches:

```typescript
interface StrategicDimension {
  base_value: number;      // Computed each turn from game state (old approach)
  event_modifier: number;  // Accumulated from player decisions (new approach)
  effective_value: number;  // base_value + event_modifier, clamped 0-100
}

// Per faction, per dimension
strategic_dimensions: Record<FactionId, Record<DimensionId, StrategicDimension>>;
```

**Base value computation** (migrated from existing `compute_capital.ts`):
- `military_credibility`: territory_controlled_pct, operations_successful, front_line_strength
- `territorial_legitimacy`: territory_held vs territory_claimed, historical presence alignment
- `international_standing`: inverse of (civilian_casualties_caused + war_crimes_events + refugees_created)
- `patron_confidence`: migrated from existing `patron_relationships.support_level`
- `internal_cohesion`: derived from alliance health, officer loyalty, morale averages
- `negotiating_leverage`: weighted composite of the other five (faction-specific weights, migrated from existing faction weight tables)

**Event modifier** (accumulated from decisions):
- Shifted by `dimension_shifts` on event fire and response options
- Persists across turns (does not recompute — it's the cumulative reputation from choices)
- Can be positive or negative
- Example: base `international_standing` is 60 (computed from low casualties), event_modifier is -20 (from choosing "systematic" cleansing at Drina). Effective: 40.

**Migration path:**
1. Rename `NegotiationCapital` fields to match new `DimensionId` names
2. Add `event_modifier` field (starts at 0)
3. Existing `compute_capital.ts` becomes `computeBaseValues()` — fills `base_value` each turn
4. Event system fills `event_modifier` — cumulative, not recomputed
5. All consumers (Dayton modal, patron pressure, UI) read `effective_value`
6. Delete old dimension names after migration

**Faction weights** (migrated from existing, used for `negotiating_leverage` composite):

| Dimension | RBiH | RS | HRHB |
|-----------|------|-----|------|
| military_credibility | 0.15 | 0.30 | 0.20 |
| territorial_legitimacy | 0.20 | 0.25 | 0.15 |
| international_standing | 0.30 | 0.10 | 0.15 |
| patron_confidence | 0.15 | 0.15 | 0.30 |
| internal_cohesion | 0.20 | 0.20 | 0.20 |

### 14.2 RESOLVE: Event-to-Military Connector ("Event Constraint Bus")

**Problem:** The design promises events that block operations, override doctrine, restrict scope, and spawn formations. But the bot AI pipeline has no mechanism for an external system to inject constraints. The existing `event_aggression_modifiers` array is stored on state but **never read by bot_corps_directives.ts** — it's a broken stub.

**Resolution: Three-layer integration.**

**Layer A — Wire the existing stub (v0.6.0, prerequisite):**

`bot_corps_directives.ts` must read `state.military.event_aggression_modifiers[]` and sum active (non-expired) modifiers into the aggression calculation. This is ~5 lines of code but it's the foundation — events can already set aggression modifiers, they just have no effect.

**Layer B — Event constraint fields on state (v0.6.0):**

New state fields that the bot AI checks before acting:

```typescript
// On GameState.military or dedicated events state
event_constraints: {
  // Operation blocks: faction cannot launch NEW operations for N turns
  operation_blocks: Array<{
    faction: FactionId;
    expires_turn: number;
    reason: string;  // for UI display: "NATO exclusion zone"
  }>;

  // Doctrine overrides: force a faction into a stance
  doctrine_overrides: Array<{
    faction: FactionId;
    forced_stance: 'offensive' | 'balanced' | 'defensive' | 'reorganize';
    expires_turn: number;
    reason: string;
  }>;

  // Operational scope restrictions: faction can only attack OSIDs matching criteria
  scope_restrictions: Array<{
    faction: FactionId;
    allowed_municipalities?: string[];  // only these (from Strategic Goals selection)
    blocked_municipalities?: string[];  // not these
    expires_turn?: number;              // permanent if omitted
    reason: string;
  }>;
}
```

**Integration points in bot AI:**
- `generateCorpsDirectives()` — check `operation_blocks` before `evaluateCorpsOffensiveLaunch()`
- `evaluateSectorStances()` — check `doctrine_overrides` before stance selection
- `evaluateCorpsOffensiveLaunch()` — check `scope_restrictions` when filtering target OSIDs

**Layer C — New effect types that write constraints (v0.6.2):**

```typescript
// Effect: disable_operations
{ kind: 'disable_operations', faction: 'RS', duration_turns: 6 }
// → pushes to event_constraints.operation_blocks

// Effect: doctrine_override
{ kind: 'doctrine_override', faction: 'RS', forced_stance: 'defensive', duration_turns: 8 }
// → pushes to event_constraints.doctrine_overrides

// Effect: scope_restriction
{ kind: 'scope_restriction', faction: 'RS',
  allowed_municipalities: ['brcko', 'doboj', 'derventa', 'samac'],
  reason: 'Selective Conquest: corridor objectives only' }
// → pushes to event_constraints.scope_restrictions
```

**Layer D — Foundational decision → permanent scope restriction (v0.6.0):**

When the RS player chooses "Adopt Goals Selectively," the foundational decision event sets a permanent `scope_restriction` limiting offensive operations to corridor and defensive municipalities. This doesn't need the full Layer C effect type — it can be hardcoded as a consequence of the foundational flag:

```typescript
// In bot_corps_directives.ts:
if (getFlag(state, 'rs_strategic_goals') === 'selective') {
  // Filter targets to corridor + majority-Serb municipalities only
}
```

This is simpler and more maintainable than the generic effect system for this specific case. Use the generic system (Layer C) for time-limited constraints (NATO ultimatum); use flag-reading for permanent constraints (foundational decisions).

### 14.3 RESOLVE: Dayton Synthesis from Flags + Dimensions (v0.6.3)

**Problem:** The existing Dayton modal has real mechanics (capital budgets, territorial packages, patron override) but doesn't know about flags or dimensions. The new design says "Dayton reads everything" but doesn't specify how.

**Resolution: Three integration points.**

**A — Capital budget from dimensions:**

Replace the existing capital computation with `negotiating_leverage` (the composite dimension):

```typescript
const capitalAvailable = getDimensionEffective(state, faction, 'negotiating_leverage');
```

This single number already synthesizes all military, political, and diplomatic factors. The player's cumulative event choices are baked in through `event_modifier`.

**B — Territorial packages from flags:**

Event flags modify which territorial packages appear and their costs:

```typescript
// Example: if RS declined Srebrenica assault, Srebrenica corridor is mandatory
if (getFlag(state, 'srebrenica_assault') === 'declined') {
  packages.push({
    id: 'srebrenica_corridor',
    description: 'Srebrenica connected to Tuzla',
    locked_to: 'RBiH',  // non-negotiable
    reason: 'Your restraint in the Drina valley established this as a precondition'
  });
}

// Example: if HRHB chose "United Front", no separate Croat entity
if (getFlag(state, 'hrhb_political_goal') === 'united_front') {
  // Remove HRHB territorial packages entirely
  // Add constitutional guarantee packages instead
}
```

**C — Bot Dayton responses from dimensions + flags:**

Bot factions evaluate Dayton proposals using their disposition profiles weighted by current dimension values. An RS bot with low `military_credibility` (lost territory) accepts worse terms than one with high credibility. Flags modify specific red lines ("RS will never accept Srebrenica corridor if they captured it").

**This is the v0.6.3 capstone** — the moment the entire metagame pays off. It deserves its own detailed design document at that stage, but the architecture is clear: dimensions → budget, flags → packages, both → bot evaluation.

### 14.4 RESOLVE: Calibration Strategy for Event Migration

**Problem:** The 92.8% ATH was achieved with specific events firing at specific turns. Migrating events to emergent triggers changes when they fire, cascading through combat, territory, and supply. Ahistorical paths produce outcomes we can't compare against painted control.

**Resolution: Three-tier calibration approach.**

**Tier 1 — Historical path regression (every phase):**

After each migration phase, run the 40w scenario with bot factions (all pick historical options for foundational decisions). Compare against painted control. Target: stay within 2pp of current ATH (92.8%). If regression exceeds 2pp, investigate which migrated event fired at a different turn and adjust pressure thresholds.

**Key principle:** Pressure system thresholds should be tuned so that emergent events fire at approximately the same turns as their old calendar triggers under historical game conditions. The events become emergent in mechanism (they CAN fire at different times) but historically calibrated in practice (under normal conditions, they fire when history says).

**Tier 2 — Event timing snapshot test:**

New test suite: run 40w historical scenario, collect `events_fired` with turn numbers. Assert that key events fire within acceptable windows:

```typescript
// Barracks events: w4-6 (same as before, condition-gated)
// Sarajevo siege: w5-8 (was w6, now BFS-gated — may shift 1-2 turns)
// Corridor: w12-22 (same, condition-gated)
// Camps revealed: w16-24 (was w18-28, now also needs war_crimes threshold)
// London Conference: w18-28 (was w21, now pressure-gated — should fire within this window)
```

If an event fires outside its expected window, the pressure threshold needs adjustment.

**Tier 3 — Ahistorical path plausibility bounds:**

For each ahistorical branch, define plausibility bounds based on historical reasoning:

| Branch | Expected Territory at w40 | Reasoning |
|--------|--------------------------|-----------|
| RS "All Six Goals" (historical) | 50-55% RS | Calibrated to 92.8% match |
| RS "Selective Conquest" | 35-45% RS | No Drina campaign, no Sarajevo escalation. Corridor + defensive = smaller but more defensible |
| RS "Pursue Aggressively" | 52-58% RS | Faster early gains but faster international pressure → earlier NATO intervention possibility |
| HRHB "United Front" | 45-50% RBiH+HRHB combined | No Croat-Bosniak war means combined front against RS. RS should lose more territory |
| HRHB "Croat Republic" (historical) | Calibrated baseline | Historical path |
| RBiH "Bosniak National State" | RBiH -3-5% vs baseline | Lost minority recruitment (~20k soldiers) hurts |

These are soft targets — sanity checks, not calibration goals. If RS "Selective Conquest" produces 60% RS territory, something is wrong (restraint shouldn't produce MORE territory than aggression). If it produces 25%, the scope restrictions are too tight.

**Process:** Run each ahistorical path once after foundational decisions are implemented. Check against plausibility bounds. Adjust scope restrictions or dimension shifts if outside bounds. This is a one-time validation per branch, not ongoing calibration.

### 14.5 RESOLVE: Patron System Reconciliation

**Problem:** The existing patron system has TWO independent metrics per faction: `support_level` (0-100, decays with sanctions) and `override_authority` (0-100, computed each turn from war crimes, territory loss, defeats). The new design adds `patron_confidence` as a strategic dimension. Three numbers tracking patron relationships is two too many.

**Resolution:** Fold into the unified dimension system.

- **`patron_confidence` dimension** replaces `support_level`. Base value = existing support level computation. Event modifier = accumulated from player choices (following/defying patron directives).
- **`override_authority`** stays as a DERIVED metric (not a dimension). Computed from `patron_confidence.effective_value` + situational factors (sanctions, war duration, recent defeats). It's a function, not stored state.
- **Sanctions** become an event-driven state flag (`patron_sanctions_active: boolean` per faction), set by consequence events that fire when `patron_confidence` drops below a threshold.

```typescript
// override_authority becomes a pure function:
function computeOverrideAuthority(state, faction): number {
  const confidence = getDimensionEffective(state, faction, 'patron_confidence');
  const sanctioned = getFlag(state, `${faction}_patron_sanctions`) === true;
  const warDuration = state.meta.turn;
  // ... existing formula but reading from unified dimension
  return clamp(0, 100, baseAuthority + sanctionBonus + durationDecay);
}
```

This eliminates the third parallel system while preserving the existing patron pressure mechanics.

---

## 15. Legacy Event Migration Plan (renumbered from 14)

The 41 existing events must be triaged into the new system. They cannot stay as-is — calendar triggers, narrative-only effects, and the 1995 railroad all violate the new design principles.

### 14.1 Migration Strategy

The new system must support **both old-style and new-style events during transition**. Old events that haven't been migrated yet still fire on their `turn_min`/`turn_max` triggers — they just don't use pressure, dimensions, or flags. Migration happens incrementally per milestone:

- **v0.6.0**: Migrate 1992 events (18 events → cut 4, rewrite 10, tweak 4)
- **v0.6.2**: Migrate 1993 events (13 events → cut 2, rewrite 9, tweak 2)
- **v0.6.3**: Migrate 1994-1995 events (22 events → cut 2, rewrite 20) — ALL emergent

### 14.2 Full Triage: 1992 Events (18 events — Phase 1)

| ID | Current Trigger | Verdict | Migration Notes |
|----|-----------------|---------|-----------------|
| `battle_of_the_barracks_sarajevo` | w4-6 + municipality control | **TWEAK** | Good condition. Add dimension shifts (`military_credibility` +5 RBiH). Convert to Decision: "Seize now (more equipment, JNA casualties) or wait (hope for diplomacy, risk JNA evacuation)?" Sets flag `barracks_timing`. |
| `battle_of_the_barracks_tuzla` | w4-6 + municipality control | **TWEAK** | Same treatment as Sarajevo. |
| `battle_of_the_barracks_zenica` | w4-6 + municipality control | **TWEAK** | Same treatment. |
| `battle_of_the_barracks_visoko` | w4-6 + municipality control | **TWEAK** | Same treatment. |
| `arms_embargo_impact_1992` | w4 calendar only | **REWRITE** | Convert from one-shot -10 supply to a **Consequence Event** that activates continuous embargo mechanic. Should fire when international community declares embargo (forced event). Dimension shift: `international_standing` context for all factions. |
| `jna_withdrawal_1992` | w5 calendar only | **REWRITE** | Calendar is acceptable (exogenous Belgrade decision). But equipment handoff should SCALE with RS territory %. Add dimension: `military_credibility` +10 RS. Convert to Consequence Event with real mechanical weight. |
| `sarajevo_siege_begins_1992` | w6 calendar only | **REWRITE** | Must be condition-gated on BFS encirclement of Sarajevo OSIDs. Effects pathetically weak (1 war_crimes + 5 patron). Needs to activate continuous siege system. Consequence Event with major dimension shifts. |
| `un_convoys_begin_1992` | w8 calendar only | **CUT** | Pure narrative, zero mechanical effect. If UN convoys matter, they should be a supply mechanic, not a wallpaper notification. |
| `srebrenica_enclave_forms_1992` | w10 calendar only | **REWRITE** | Must fire when Srebrenica OSIDs are actually encircled (BFS). Consequence Event: "Your forces in eastern Bosnia are surrounded." Dimension: `international_standing` +5 RBiH (sympathy), `negotiating_leverage` +5 RBiH (enclave as bargaining chip). |
| `mostar_liberation_1992` | w10 calendar only | **REWRITE** | Must fire when JNA/RS forces are pushed out of Mostar municipality (condition). Convert to Consequence Event. Seeds the HVO-ARBiH "who controls Mostar" friction. Sets flag `mostar_liberated_by` = faction. |
| `operation_corridor_1992` | w12-22 + municipality control | **TWEAK** | Good condition already. Strengthen effects: corridor width mechanic, RS supply route, dimension shifts. |
| `drina_valley_ethnic_cleansing_1992` | w13 calendar only | **REWRITE** | Must fire when RS controls threshold % of Drina municipalities AND displaced population exceeds threshold. For RS player: **Decision Event** — intensity of cleansing (restrained/systematic/maximum). Sets flag `drina_cleansing_intensity`. Major dimension shifts on `international_standing`, `internal_cohesion`. For non-RS: Consequence Event. |
| `posavina_corridor_fighting_1992` | w16 calendar only | **CUT** | Grants RS +10 supply regardless of corridor state. Absurd if player severed the corridor. Replace with condition-gated corridor supply mechanic. |
| `concentration_camps_revealed_1992` | w18-28 + municipality control | **REWRITE** | Good Prijedor condition but should also require cumulative `war_crimes_above` threshold. For RS player: **Decision Event** — deny/obstruct/cooperate. Sets flag `camps_response`. Massive dimension shifts. Chain: enables London Conference with modified conditions. |
| `bihac_isolation_deepens_1992` | w20 calendar only | **CUT** | Pure narrative. Bihac isolation should be DETECTED by the engine (supply BFS) and produce consequences through the supply system, not a wallpaper event. |
| `london_conference_1992` | w21 calendar only | **REWRITE** | Must fire from international pressure threshold (patron_pressure + war_crimes accumulation), not calendar. Already a Decision Event — strengthen option consequences, add dimension shifts, add flags. Chain: should be ENABLED by camps_revealed or cumulative pressure. |
| `hvo_arbih_tensions_rise_1992` | w29 calendar only | **REWRITE** | Must fire from alliance decay threshold + territorial friction conditions (e.g., both factions claim same municipalities). Consequence Event with alliance shift. Should be part of the escalation chain toward Croat-Bosniak war. Pressure modifier for future events. |
| `jajce_falls_1992` | w40-52 + municipality control | **TWEAK** | Good condition. Strengthen: alliance hit should depend on whether BOTH factions had forces committed (mutual blame mechanic). Sets flag `jajce_blame`. Major dimension shift on `internal_cohesion` for both RBiH and HRHB. |

**Summary 1992**: 4 CUT, 10 REWRITE, 4 TWEAK. Net: 14 migrated events + 3 foundational decisions + ~3-5 new events = ~20 events for 1992.

### 14.3 Full Triage: 1993 Events (13 events — Phase 2)

| ID | Current Trigger | Verdict | Migration Notes |
|----|-----------------|---------|-----------------|
| `gornji_vakuf_clashes_1993` | w35-60 + alliance_below | **TWEAK** | Good alliance condition. Already a Decision. Add flags, dimension shifts, chain to Croat-Bosniak war. Recurring with escalation (fires again if alliance keeps dropping). |
| `vance_owen_plan_1993` | w39 calendar only | **REWRITE** | Must fire from international pressure threshold + stalemate duration. Major Decision Event per faction. Each faction's options shaped by their foundational decision flags. ICTY research: Vance-Owen map's role in triggering HVO territorial grabs. |
| `croat_bosniak_war_begins_1993` | w40-80 + alliance_below | **TWEAK** | Good condition. Must NOT fire if HRHB chose "United Front" foundational path. Add flags, dimension shifts. Enables entire 1993 war chain. |
| `ahmici_massacre_1993` | w40-70 + municipality + requires croat_bosniak_war | **REWRITE** | Condition structure good but must be HRHB Consequence Event (not just notification). For HRHB player specifically: this fires BECAUSE of your prior choices. Massive `international_standing` hit. ICTY: Blaskic judgment essential. |
| `east_mostar_siege_1993` | requires croat_bosniak_war | **REWRITE** | Should fire when HVO controls West Mostar AND combat in Mostar OSIDs active. Consequence Event. Reads `mostar_liberated_by` flag. |
| `central_bosnia_fighting_1993` | requires croat_bosniak_war | **CUT** | Negligible -3 morale. If three-way fighting is happening, the engine already knows. |
| `srebrenica_shelling_1993` | w49 calendar only | **REWRITE** | Must fire when SRK/Drina Corps active bombardment of Srebrenica enclave (incident trigger: battles in Srebrenica OSIDs). Pressure builder toward Safe Areas declaration. |
| `un_safe_areas_declared_1993` | w54 calendar only | **REWRITE** | Must fire when enclave under active siege + international pressure threshold crossed. For RBiH: **Decision Event** — accept demilitarization (UN protection, lose garrison capability) or maintain garrison (reduced UN presence). Sets flag `safe_area_response`. |
| `operation_neretva_93_1993` | requires croat_bosniak_war | **CUT** | Tells you about an op that should be emergent from the bot AI. If ARBiH is fighting HVO in Neretva, the engine produces that. |
| `markale_area_shelling_1993` | w68 calendar only | **REWRITE** | Must fire from cumulative Sarajevo civilian casualties threshold + ongoing siege. Pressure builder toward NATO intervention chain. Consequence Event. |
| `owen_stoltenberg_plan_1993` | w70 calendar only | **REWRITE** | Must fire from pressure threshold, not calendar. Decision Event — strengthen options per faction, add dimension shifts. Options shaped by prior peace plan responses. |
| `abdic_apwb_declared_1993` | w77 calendar only | **REWRITE** | Must fire when Bihac pocket isolated + supply below threshold + isolation duration exceeds threshold. For RBiH: **Decision Event** — negotiate/confront/ignore. Recurring with deterioration. |
| `mostar_bridge_destroyed_1993` | requires east_mostar_siege | **REWRITE** | Good prerequisite chain. Must also require active HVO bombardment of East Mostar. Massive `international_standing` hit for HRHB. Consequence Event. |

**Summary 1993**: 2 CUT, 9 REWRITE, 2 TWEAK. Net: 11 migrated events + new dynamics (embargo, tunnel, etc.)

### 14.4 Full Triage: 1994 Events (9 events — Phase 3)

| ID | Current Trigger | Verdict | Migration Notes |
|----|-----------------|---------|-----------------|
| `markale_massacre_1994` | w96 calendar only | **REWRITE** | Must fire from cumulative Sarajevo casualties + siege duration + international pressure. Consequence Event. Enables NATO ultimatum chain. ICTY: detailed forensic findings. |
| `nato_ultimatum_sarajevo_1994` | w96 + requires markale | **REWRITE** | Chain from Markale good. For RS player: **Decision Event** — comply with exclusion zone (surrender heavy weapons advantage) or defy (risk strikes). Russian diplomatic cover flag modifies options. |
| `nato_shoots_down_planes_1994` | w99 calendar only | **REWRITE** | Must fire when RS violates no-fly zone (incident: RS air operations while NATO enforcement active). Consequence Event. |
| `washington_agreement_1994` | w102 + requires events | **REWRITE** | Must fire from Croat-Bosniak war duration + mutual exhaustion + patron pressure threshold. Major Decision Event. Options shaped by all prior alliance flags. Sets flag `federation_terms`. |
| `gorazde_crisis_1994` | w105 calendar only | **REWRITE** | Must fire when VRS attacks Gorazde enclave (incident) + safe areas declared (flag). For RS: Decision — press attack or halt at outskirts. Tests safe area credibility. |
| `contact_group_plan_1994` | w117 calendar only | **REWRITE** | Must fire from pressure threshold. Decision Event. Options shaped by territorial %, dimension scores. |
| `anti_sniping_agreement_1994` | w123 calendar only | **CUT** | Zero effect. Delete. |
| `bihac_crisis_1994` | w135 calendar only | **REWRITE** | Must fire when Bihac pocket territory below threshold + combined VRS/APWB force ratio exceeds threshold. For RBiH: Decision — request NATO strikes (risk hostage-taking) or rely on 5th Corps. Reads `abdic_response` flag. |

**Summary 1994**: 1 CUT, 8 REWRITE.

### 14.5 Full Triage: 1995 Events (ALL RAILROAD — complete rebuild)

Every single 1995 event fires on a fixed turn regardless of game state. **The entire file must be rebuilt as emergent condition-gated events.**

| ID | Current Trigger | New Trigger |
|----|-----------------|-------------|
| `srebrenica_falls_1995` | w170 calendar | RS controls >80% Srebrenica municipality + enclave resilience below threshold + enclave besieged >N turns. **NEVER fires if player defends it.** |
| `zepa_falls_1995` | w172 + requires srebrenica | RS captures Zepa OSIDs (incident). Chain from Srebrenica only if Srebrenica fell. |
| `operation_storm_1995` | w174 calendar | Federation capability threshold + Washington Agreement flag + RS western flank weakness + Croatian rearmament dimension. |
| `second_markale_massacre_1995` | w177 calendar | Cumulative Sarajevo casualties + siege still active + pressure accumulation. |
| `nato_deliberate_force_1995` | w177 calendar | Cumulative RS `international_standing` below critical threshold + triggering atrocity (Markale or Srebrenica) + patron pressure above threshold. For RS: Decision — accept ceasefire terms or defy. |
| `federation_ground_offensive_1995` | w179 + requires washington + deliberate_force | Washington flag + Deliberate Force flag + Federation military readiness. Condition-gated, not calendar. |
| `ceasefire_1995` | w183 calendar | ALL three conditions: (a) Federation gains reduce RS toward 49%, (b) RS military exhaustion above threshold, (c) all patron pressures above threshold. |
| `dayton_talks_begin_1995` | w186 calendar | Ceasefire active + all factions exhaustion above threshold. Multi-event sequence reading FULL flag + dimension state. |

**Plus additional 1995 events not currently modeled**: Serbia embargo consequences, ICTY indictments (Karadzic/Mladic), Bihac relief, Croatian Krajina collapse cascading into BiH.

**Summary 1995**: 0 kept as-is. Complete rebuild. Every event emergent.

### 14.6 Dead Code Removal (Phase 1)

- Remove `narrative` as a standalone effect kind (narrative text goes in `EventDefinition.narrative`)
- Remove `siege_active` condition handler (reads nonexistent `active_enclaves` — dead code with `as any` cast)
- Remove `operation_completed` condition handler (reads nonexistent `completed_operation_names` — dead code with `as any` cast)
- Replace `capital_based` and `capital_weighted` bot response logic (both fall through to `options[0]`) with `personality_weighted` and `strategic_weighted`

---

## 15. Implementation Phasing (Revised — Aligned to Roadmap)

### v0.6.0 — Emergent Event Engine (infrastructure + 1992 migration)

**Infrastructure:**
- Pressure system (readiness counters, decay, modifiers)
- Strategic dimensions (6 per faction, state fields, shift application)
- Event flags (state fields, condition type `flag_equals`)
- `TurnIncidents` collection infrastructure
- Expanded condition evaluator (all new condition types from Section 4.3)
- Event queue with 3/turn cap
- Bot decision logic v1 (personality-weighted)
- Recurrence model (max_fires, cooldown, escalation)
- Dead code removal (`narrative`-only effects, dead condition handlers)

**1992 Event Migration:**
- Cut 4 wallpaper events
- Rewrite 10 events (calendar -> emergent, weak -> strong)
- Tweak 4 events (add dimensions, flags, stronger effects)
- Author 3 foundational decisions (RS Strategic Goals, RBiH State Identity, HRHB Political Goal)
- Author ~3-5 new 1992 events for missing dynamics
- ICTY research for RS Strategic Goals (Karadzic judgment), barracks (factual findings)

**Integration work (from Section 14):**
- Unify strategic dimensions with existing NegotiationCapital (Section 14.1)
- Wire the broken event_aggression_modifiers stub (Section 14.2, Layer A)
- Add event_constraints state fields + bot AI integration points (Section 14.2, Layer B)
- Foundational decision → scope restriction via flag-reading (Section 14.2, Layer D)
- Reconcile patron system: patron_confidence dimension replaces support_level (Section 14.5)

**Validation:**
- Tier 1: calibration run, target within 2pp of 92.8% ATH
- Tier 2: event timing snapshot test (key events fire within expected windows)
- Tier 3: ahistorical path plausibility bounds for foundational decisions
- War-or-Game sign-off
- 1993-1995 events remain in old format (still fire on calendar triggers — backward compatible)

### v0.6.1 — Balance & Calibration Framework

Unchanged — automated benchmarks, regression detection, calibration freeze baseline. Essential before adding more events. Now also includes:
- Event timing snapshot test suite (Tier 2 from Section 14.4)
- Ahistorical plausibility bound definitions (Tier 3 from Section 14.4)

### v0.6.2 — 1993-1994 Event Content + Missing Dynamics

- Migrate 1993 events (cut 2, rewrite 9, tweak 2)
- Migrate 1994 events (cut 1, rewrite 8)
- New effect types that write to event_constraints (Section 14.2, Layer C): `doctrine_override`, `disable_operations`, `scope_restriction`, `spawn_formation`, `truce_action`, `supply_route_modifier`
- Incident-based triggers (battles, OSID flips, operation outcomes)
- Event chain system (enables_events)
- Author new dynamics: embargo system, Sarajevo tunnel, Milosevic-Pale split, Serbia embargo on RS, UNPROFOR hostages, Abdic secession chain
- ICTY research: Prlic et al. (HRHB), Blaskic (Ahmici), Karadzic (camps, Drina)
- Calibration run (Tier 1 + Tier 2) + War-or-Game sign-off

### v0.6.3 — 1995 Endgame + Dayton Synthesis

- Complete rebuild of ALL 1995 events (zero calendar, pure emergent)
- Srebrenica/Storm/Deliberate Force chain fully condition-gated
- New 1995 events: Serbia embargo consequences, ICTY indictments, Bihac relief, Krajina collapse
- **Dayton synthesis integration (Section 14.3):** dimensions → capital budget, flags → territorial packages, disposition profiles → bot responses. Separate detailed design doc for Dayton at this stage.
- Player-initiated decisions (AGEOD-style "play this card when ready")
- ICTY research: Krstic (Srebrenica), Mladic (command responsibility), Tolimir (Zepa)
- Event log sidebar UI, pressure visibility, notification vs decision visual distinction
- Event validation tool (`npm run validate:events`)
- Full calibration pass (all three tiers) + final War-or-Game sign-off

### v0.6.4 — Historical Essays

Unchanged — 100 essays, Sonnet-generated, baked into binary.

### Backlog (v0.7+)

- Command autonomy slider (full delegation -> maximum control)
- Canon/mechanics changes for delegation levels
- Officer defiance events (Mladic acts against your directive)

---

## 17. The Metagame Loop

```
TURNS 1-8: EARLY WAR — WHO ARE YOU?
  Foundational decisions define your faction's identity
  Choices about HOW you fight (cleansing intensity, force commitment, civilian protection)
  Sets flags + shifts dimensions
  Player may not realize these matter yet

TURNS 8-25: CONSEQUENCES ARRIVE
  Events fire BECAUSE of your early choices
  Your dimension scores determine WHICH options you get
  High international_standing = softer peace terms
  Low standing = ultimatums
  The bill for early decisions starts coming due

TURNS 25-40: THE BILL COMES DUE
  Endgame events check dimensions
  NATO intervention, Federation offensive, ceasefire — all condition-gated
  The MAP shows who won the military war
  The DIMENSIONS show who won the political war

TURNS 40-52: RESOLUTION
  Dayton reads the full flag + dimension state
  Every choice you made contributes to the final settlement
  The player who won the map but lost the metagame gets a pyrrhic victory
  The player who showed restraint has fewer pins but a stronger hand
  NEITHER WINS. THAT IS THE GAME.
```

---

## 18. Missing Dynamics to Author (from War-or-Game audit)

Events currently absent that must be authored for the full system:

1. **Arms embargo as continuous constraint** — standing mechanic, not one-shot
2. **Refugee crisis as strategic pressure** — displacement -> international attention -> patron pressure
3. **Sarajevo tunnel (mid-1993)** — supply lifeline, fires after N turns of siege
4. **Milosevic-Pale split (1994)** — RS war crimes accumulation triggers Belgrade distancing
5. **Serbia embargo on RS (Aug 1994)** — massive supply impact, fires from Milosevic split
6. **UNPROFOR hostage-taking** — RS response option to NATO strikes
7. **Abdic secession (APWB)** — Bihac isolation + supply crisis, recurring escalation
8. **Media / CNN effect** — atrocity-to-pressure pipeline, "international attention" accumulator
9. **Russian diplomatic cover for RS** — constrains NATO intervention threshold
10. **Mujahedin volunteers** — small military, significant political impact
11. **War economy / smuggling** — cross-front-line commerce, Sarajevo black market
12. **Croatian rearmament** — enables Operation Storm conditions
13. **Officer defiance events** — commanders exceeding or ignoring political directives

---

## Appendix A: Events That Must Be Cut or Rewritten

From War-or-Game audit of current 41 events:

**CUT (wallpaper, fails delete test):**
- `un_convoys_begin_1992` — pure narrative
- `bihac_isolation_deepens_1992` — tells you what you see on the map
- `anti_sniping_agreement_1994` — zero mechanical effect
- `central_bosnia_fighting_1993` — negligible morale hit (-3)

**REWRITE (calendar -> emergent, weak -> strong):**
- `srebrenica_falls_1995` — MUST be condition-gated on VRS capturing enclave. NEVER calendar.
- `zepa_falls_1995` — same.
- `operation_storm_1995` — condition-gated on Federation capability + RS weakness
- `nato_deliberate_force_1995` — condition-gated on cumulative pressure + triggering atrocity
- `ceasefire_1995` / `dayton_talks_begin_1995` — condition-gated on exhaustion + territory ratio
- `sarajevo_siege_begins_1992` — condition-gated on encirclement (BFS), not calendar
- `srebrenica_enclave_forms_1992` — condition-gated on actual encirclement
- `posavina_corridor_fighting_1992` — condition-gated on corridor state, not calendar supply grant

**The entire 1995 event file is a railroad and must be completely rebuilt as emergent condition-gated events.**
