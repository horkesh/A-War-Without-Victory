# Emergent Event System — Design Document

**Date:** 2026-03-21
**Status:** APPROVED — ready for implementation planning
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
- **Hard cap: 3 events per turn** (overflow queued to next turn)
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

## 14. Implementation Phasing

### Phase 1: Infrastructure (v0.6.0-alpha)

- Pressure system (readiness counters, decay, modifiers)
- Strategic dimensions (6 per faction, state fields, shift application)
- Event flags (state fields, condition type `flag_equals`)
- `TurnIncidents` collection infrastructure
- Expanded condition evaluator (all new condition types from Section 4.3)
- Event queue with 3/turn cap
- Bot decision logic v1 (personality-weighted)
- Recurrence model (max_fires, cooldown, escalation)
- Rewrite 1992 events (16 events) to use new system
- Calibration run + War-or-Game sign-off

### Phase 2: Content + Effects (v0.6.0-beta)

- New effect types (doctrine_override, spawn_formation, truce_action, etc.)
- Incident-based triggers (battles, OSID flips, operation outcomes)
- Foundational decisions for all 3 factions
- Rewrite 1993 events (11 events)
- Author new events for missing dynamics (embargo system, Sarajevo tunnel, Milosevic-Pale split, Serbia embargo on RS, UNPROFOR hostages)
- Event chain system (enables_events)
- Calibration run + War-or-Game sign-off

### Phase 3: Polish (v0.6.0-release)

- Event log sidebar UI
- Pressure visibility ("tensions rising")
- Notification vs decision visual distinction
- Event validation tool (`npm run validate:events`)
- Full calibration pass
- Historical essay cross-linking

### Phase 4: Full Event Set (v0.6.x)

- Rewrite 1994-1995 events (12 events) — ALL emergent, zero calendar rails
- Endgame event chain (Srebrenica -> Deliberate Force -> Dayton) fully condition-gated
- Player-initiated decisions (AGEOD-style "play this card when ready")
- Dayton negotiation as multi-event sequence reading full flag + dimension state
- ICTY-sourced deep research per event

### Backlog (v0.7+)

- Command autonomy slider (full delegation -> maximum control)
- Canon/mechanics changes for delegation levels
- Officer defiance events (Mladic acts against your directive)

---

## 15. The Metagame Loop

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

## 16. Missing Dynamics to Author (from War-or-Game audit)

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
