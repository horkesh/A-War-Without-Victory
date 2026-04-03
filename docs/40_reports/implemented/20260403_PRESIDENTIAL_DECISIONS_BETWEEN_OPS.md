# Presidential Decisions Between Operations — Phase C Design Report

**Date:** 2026-04-03
**Author:** Game Designer (Phase C)
**Status:** Design complete, ready for implementation sequencing

---

## 1. Events System Audit

### 1.1 Event Condition Types (22 total)

The event system supports 22 condition types across four categories:

**Territory & Control (4):** `territory_control`, `faction_controls_municipality`, `territory_percentage`, `corridor_severed`

**Political & Diplomatic (6):** `alliance_below`, `alliance_above`, `patron_pressure_above`, `war_crimes_above`, `flag_equals`, `flag_not_set`

**Military & Supply (4):** `supply_below`, `supply_above`, `morale_average_below`, `enclave_supply_status`

**Strategic Dimensions (2):** `dimension_above`, `dimension_below`

**Temporal & Sequencing (4):** `week_since_event`, `event_fire_count`, `siege_active` (TODO), `operation_completed` (TODO)

**Logical Combinators (3):** `and`, `or`, `not`

### 1.2 Effect Types (11 total)

| Effect Kind | What It Does |
|---|---|
| `narrative` | Display text only |
| `morale_change` | Faction-wide morale delta |
| `supply_delta` | General supply reserve delta |
| `cohesion_change` | Faction-wide cohesion delta |
| `humanitarian_impact` | War crimes tracking delta |
| `patron_pressure` | Patron support level delta |
| `alliance_change` | RBiH-HRHB alliance delta |
| `negotiation_capital` | Strategic dimension delta |
| `equipment_grant` | Tanks/artillery/AA to best brigade |
| `aggression_modifier` | Temporary corps aggression delta |
| `control_change` | Flip OSID control |

### 1.3 Event Infrastructure Capacity

The event system is **more capable than currently used**. Key infrastructure already in place:

- **Pressure system:** Readiness counters with increment/decay/modifiers. Events build toward firing over multiple turns. Already used by 4 events.
- **Recurrence:** `max_fires`, `cooldown_turns`, `escalation` (static/escalating/deteriorating). Available but lightly used.
- **Flags:** `sets_flags` / `flag_equals` / `flag_not_set` — full event-to-event state transfer. 25+ flags already wired.
- **Strategic dimensions:** 6 per faction, hybrid base+modifier. `dimension_shifts` on both events and response options.
- **Event chaining:** `enables_events`, `requires_events`, priority ordering, mutex groups.
- **Decision mechanics:** `response_options` with effects, flags, dimension shifts, bot scoring hints (`aggression_affinity`, `risk_level`), bot response logic (7 strategies).
- **Auto-resolve:** `auto_resolve_turns` for time-pressured decisions.
- **Categories:** 7 (`military`, `political`, `humanitarian`, `diplomatic`, `economic`, `command`, `territorial`).
- **UI:** `EventModal.tsx` with dispatch-paper styling, category stamps, faction badges, effect preview, decision buttons. Queue support.

### 1.4 Current Event Coverage

| Year | Events | Decision Events | Turns Covered |
|---|---|---|---|
| 1992 (turns 1-52) | 20 | 6 | Dense early, thins after turn 30 |
| 1993 (turns 53-104) | 42 | 6 | Very dense turns 41-70, empty after turn 80 |
| 1994 (turns 105-156) | 13 | 4 | **Sparse. Three gaps of 5-15 turns.** |
| 1995 (turns 157-208) | 20 | 4 | Dense after turn 160 (endgame cascade) |
| **Total** | **95** | **20** | |

### 1.5 Decision Event Gaps (8+ consecutive turns with no player choice)

| Gap | Turns | Duration | Period |
|---|---|---|---|
| Mid-1993 | 73-101 | **29 turns** | After Croat-Bosniak war begins |
| Late 1993 | 103-116 | 14 turns | After ICTY established |
| Early-mid 1994 | 123-137 | 15 turns | Between Belgrade embargo and Bihac |
| Mid-late 1994 | 140-159 | **20 turns** | Between Carter ceasefire and 1995 events |
| Mid 1995 | 164-173 | 10 turns | Between COHA expires and Srebrenica |

**The player has nothing meaningful to decide for up to 29 consecutive turns (7 months of game time).** This is the dead time between operations that Phase C must fill.

### 1.6 What Existing Infrastructure Can Already Do

The event system **can already carry presidential decisions**. No new subsystem is needed. What is missing:

1. **Event content** — not enough decision events, especially in 1994 and late 1993
2. **Recurring presidential decision patterns** — existing events are one-shot historical anchors; no repeating "presidential rhythm" events
3. **Corps/sector targeting** — no way for an event choice to target a specific corps or sector (effects are faction-wide)
4. **Temporary timed effects** — `aggression_modifier` has `duration_turns`, but morale/cohesion/supply do not
5. **Two unimplemented conditions** — `siege_active` and `operation_completed` return false/stub

---

## 2. Presidential Decision Event Types (5 types)

These are event-layer patterns that ride existing rails. Each uses existing condition types, effect types, and the EventModal UI. The key design principle: **the player is the president making consequential political-military choices, not a staff officer shuffling units.**

### Type 1: Strategic Posture Review (recurring)

**Presidential level:** Level 1 — Strategic Guidance

**What it is:** Every 8-12 turns, the president reviews the war's trajectory and sets faction posture. This is the backbone "presidential rhythm" event that ensures the player always has something consequential to decide.

**Trigger:** Recurring event with pressure system. `base_rate: 1.0`, `threshold: 10`, `decay_rate: 0`. Modifiers accelerate when territory is lost (`territory_percentage below` +2.0), when morale is low (`morale_average_below` +1.5), or when patron pressure is high (`patron_pressure_above` +1.0). Recurrence: `max_fires: 8`, `cooldown_turns: 8`, `escalation: escalating`.

**Choices (3):**

| Choice | Effects | Dimension Shifts |
|---|---|---|
| **Press the offensive** | morale +3, aggression +0.1 (8 turns), supply -3 | military_credibility +5, patron_confidence -5 |
| **Consolidate and defend** | cohesion +5, supply +3 | territorial_legitimacy +5, military_credibility -5 |
| **Seek negotiation** | patron_pressure -5 | international_standing +10, internal_cohesion -10, negotiating_leverage +5 |

**Stakes escalate:** On 3rd+ firing, choices become harsher (available_from_fire). "Press the offensive" costs more supply. "Seek negotiation" triggers internal dissent (cohesion penalty). The war grinds.

**Example event (RBiH, turn ~85):**
```
"The war enters its second year. Your army holds — barely. The 
international community offers sympathy but not intervention. Your 
commanders request more men, more guns, more time. The corridors are 
strained. The enclaves are fragile. What is your posture for the 
months ahead?"
```

### Type 2: Patron Pressure Response (conditional)

**Presidential level:** Level 1 — Strategic Guidance

**What it is:** When patron pressure exceeds a threshold, the president faces a demand from their patron state. For RS: Belgrade demands restraint or threatens supply cuts. For RBiH: the US/EU demands negotiation or threatens to withdraw diplomatic support. For HRHB: Zagreb demands alignment or threatens to withdraw HV support.

**Trigger:** `patron_pressure_above` threshold (varies by faction: RS=60, RBiH=50, HRHB=40). Recurrence: `max_fires: 4`, `cooldown_turns: 12`. Requires flag `patron_call_eligible` (set at game start, cleared temporarily after each firing to prevent stacking).

**Choices (2-3):**

| Choice | Effects | Dimension Shifts |
|---|---|---|
| **Comply with patron demands** | patron_pressure -15, aggression -0.1 (12 turns) | patron_confidence +15, internal_cohesion -10 |
| **Stall and deflect** | patron_pressure -5 | patron_confidence -5, negotiating_leverage +5 |
| **Defy the patron** | patron_pressure +10, morale +3 | patron_confidence -20, internal_cohesion +10 |

**Example event (RS, turn ~90):**
```
"Belgrade is on the line. Milosevic is direct: the international 
pressure is becoming intolerable. He demands you accept the latest 
territorial proposal or face consequences. Your generals warn that 
compliance means abandoning gains your soldiers died for. Your 
assembly is watching."
```

### Type 3: Commander Confidence Crisis (conditional)

**Presidential level:** Level 1/2 — Strategic Guidance with command implications

**What it is:** When a corps sector is under heavy pressure (low morale, territory loss), the corps commander's confidence becomes a presidential problem. The president must decide how to respond — support, replace, or intervene.

**Trigger:** `morale_average_below` (faction threshold 35) AND `territory_percentage` below a faction-specific floor. Recurrence: `max_fires: 3`, `cooldown_turns: 16`. Uses `and` combinator.

**Choices (3):**

| Choice | Effects | Dimension Shifts |
|---|---|---|
| **Express full confidence** | morale +5, cohesion +3 | internal_cohesion +5 |
| **Demand results** | aggression +0.15 (8 turns), cohesion -3 | military_credibility +5, internal_cohesion -5 |
| **Signal willingness to replace** | morale -3, patron_pressure -3 | military_credibility -5, internal_cohesion -10 |

**Design note:** This is a political event about presidential authority over the military, not a personnel management screen. The effects are faction-wide morale/cohesion shifts representing the political signal the president sends. Actual commander replacement mechanics belong to v0.8.3 Order Interpretation.

**Example event (RBiH, turn ~110):**
```
"Reports from the eastern front are grim. Your commander there has 
lost ground for three consecutive weeks. Casualties mount. Morale 
is fragile. Your staff presents options: reinforce his authority with 
a public statement of support, demand immediate results with the 
implicit threat of replacement, or begin quietly preparing a successor. 
Each choice sends a signal — to the front, to your rivals, to the 
international community."
```

### Type 4: Humanitarian Crisis Response (conditional)

**Presidential level:** Level 1 — Strategic Guidance

**What it is:** When war crimes accumulate or corridors are severed, the president faces a humanitarian crisis that demands a political response. The choice is between international credibility (cooperate, allow aid) and military advantage (deny access, maintain siege pressure).

**Trigger:** `war_crimes_above` (threshold 3) OR `corridor_severed` OR `enclave_supply_status: critical`. Recurrence: `max_fires: 5`, `cooldown_turns: 10`.

**Choices (2-3):**

| Choice | Effects | Dimension Shifts |
|---|---|---|
| **Open humanitarian corridors** | supply -2 (losing tactical advantage), patron_pressure -10 | international_standing +15, military_credibility -5 |
| **Allow limited UNPROFOR access** | patron_pressure -5 | international_standing +5 |
| **Deny access, maintain pressure** | morale +2 (troops see resolve) | international_standing -15, military_credibility +5 |

**Example event (RS, turn ~75):**
```
"The UN Special Rapporteur has issued a damning report. Detention 
camps, forced expulsions, civilian bombardment — the evidence is 
mounting. UNPROFOR requests access to affected areas. Your 
international standing is deteriorating. The question before you 
is not whether the world knows — it is how you respond now that 
they do."
```

### Type 5: Visit to the Front (periodic, detailed design in Section 3)

**Presidential level:** Level 1/2 — Strategic Guidance with visible command presence

**What it is:** The president visits a corps area, temporarily boosting morale and compliance but creating political risk. See full design below.

---

## 3. "Visit to the Front" — Detailed Design

### 3.1 Concept

A periodic presidential presence event. The president chooses to visit a corps area, temporarily affecting morale, commander compliance, and visibility. This is NOT a travel simulator, NOT a new map mode, NOT a unit-control mechanic. It is a single event definition with branching choices, presented in EventModal.

### 3.2 Trigger

**Pressure-based** with conditional acceleration:

```json
{
  "pressure": {
    "base_rate": 1.0,
    "threshold": 12,
    "decay_rate": 0,
    "modifiers": [
      { 
        "condition": { "type": "morale_average_below", "faction": "$PLAYER", "threshold": 40 },
        "rate_bonus": 1.5
      },
      {
        "condition": { "type": "dimension_below", "faction": "$PLAYER", "dimension": "internal_cohesion", "threshold": 30 },
        "rate_bonus": 1.0
      }
    ]
  },
  "recurrence": { "max_fires": 6, "cooldown_turns": 10, "escalation": "static" }
}
```

This means: fires roughly every 12 turns (~3 months) under normal conditions, faster when morale is low or internal cohesion is poor. Maximum 6 visits across the war.

### 3.3 Presentation

The event appears in EventModal with category `command`. Narrative text sets the scene:

```
"Your chief of staff suggests a visit to the front. The troops have 
been fighting for months without seeing their president. A visit would 
lift spirits — but it also means time away from the capital, exposure 
to danger, and a political signal about which theater you prioritize. 
Where will you go?"
```

### 3.4 Choices

The player chooses a destination. Since the event system does not currently support dynamic corps-list choices, the design uses 3-4 fixed strategic options representing the major theaters. Each choice implies visiting the corps responsible for that theater.

**For RBiH (example):**

| Choice | Narrative | Effects |
|---|---|---|
| **Visit the Sarajevo front** | "You travel through the tunnel to besieged Sarajevo. The troops see their president sharing their hardship." | morale +5, cohesion +3, patron_pressure -3 (shows resolve to international community) |
| **Visit the eastern enclaves** | "You visit the eastern front — Tuzla, the corridor towns. The commanders brief you on the Drina situation." | morale +4, aggression +0.05 (6 turns), supply -1 (logistics diverted for visit) |
| **Visit the Bihac pocket** | "You visit the isolated 5th Corps. General Dudakovic's men have held without relief for months." | morale +6, supply -2 (airlift resources diverted), cohesion +2 |
| **Stay in the capital** | "You remain at the Presidency. There is too much to manage from here to risk a journey." | patron_pressure -2 (diplomatic meetings instead), morale -2 (troops disappointed) |

**For RS:**

| Choice | Narrative | Effects |
|---|---|---|
| **Visit the Posavina corridor** | "You travel to the corridor — the lifeline connecting eastern and western Republika Srpska." | morale +5, cohesion +3 |
| **Visit the Sarajevo siege lines** | "You visit the SRK positions overlooking Sarajevo." | morale +4, aggression +0.05 (6 turns), patron_pressure +3 (provokes international attention) |
| **Visit the Drina front** | "You travel east to the Drina Corps area." | morale +5, humanitarian_impact war_crimes_delta +1 (your presence near cleansing areas is noted internationally) |
| **Stay in Pale** | "You remain at the seat of government." | patron_pressure -2, morale -2 |

### 3.5 Dimension Shifts

Each visit choice carries dimension shifts:

- Visiting a front: `military_credibility +5`, `internal_cohesion +5`
- Visiting the capital front (Sarajevo): `international_standing +5` (for RBiH, shows resolve) or `-5` (for RS, shows defiance)
- Staying home: `military_credibility -5`, `negotiating_leverage +3`

### 3.6 Escalation

On repeat visits (3rd+ firing), a new option appears via `available_from_fire: 3`:

| Choice | Narrative | Effects |
|---|---|---|
| **Visit with international press** | "You invite foreign journalists to accompany you. The visit becomes a media event." | morale +3, patron_pressure -8, international_standing +10, military_credibility -3 (propaganda, not command) |

### 3.7 Bot Response Logic

`bot_response_logic: "strategic_weighted"`. Bot presidents visit the theater under most pressure (lowest morale sector). If no sector is under pressure, they stay in the capital.

### 3.8 What This Is Not

- NOT a travel system with movement costs or routes
- NOT a map interaction (no clicking on the map to choose destination)
- NOT a new UI mode or panel
- NOT a permanent relocation of the president
- NOT a risk-of-death mechanic (though the narrative implies risk)

It is **one recurring event definition** with **3-4 response options** per faction, processed through the existing event pipeline and displayed in the existing EventModal.

### 3.9 Implementation Size

- 1 event definition per faction (3 JSON files, ~80 lines each)
- 0 new TypeScript files
- 0 new UI components
- Uses existing: pressure system, recurrence, response_options, effects, dimension_shifts, flags, bot_response_logic

---

## 4. Roadmap Placement

### 4.1 Can Ride Existing Infrastructure Now (v0.8.0.x parallel content track)

**Type 1: Strategic Posture Review** — Pure JSON event definition. Uses existing conditions (`territory_percentage`, `morale_average_below`, `patron_pressure_above`), existing effects (`morale_change`, `cohesion_change`, `supply_delta`, `aggression_modifier`), existing recurrence, existing pressure system. Zero code changes.

**Type 5: Visit to the Front** — Pure JSON event definition. Same infrastructure as Type 1. Zero code changes.

**Type 4: Humanitarian Crisis Response** — Mostly rides existing rails. `war_crimes_above` and `enclave_supply_status` conditions exist. `corridor_severed` exists but requires edges to evaluate. May need a small fix to ensure edges are passed to `evaluateCondition` in all call paths.

### 4.2 Needs Small Engine Work (v0.8.2 — Political Leader Bot + Patron Phone Call)

**Type 2: Patron Pressure Response** — The roadmap already places "Patron Phone Call" events in v0.8.2. This type IS the patron phone call, designed as a recurring pressure-driven event rather than a one-shot historical anchor. Needs: enhanced bot political personality from v0.8.2 for faction-appropriate responses.

**Type 3: Commander Confidence Crisis** — Needs the relationship model from v0.8.1 (commanders track trust with the player) to produce meaningful consequences. Without it, the effects are faction-wide morale shifts — still valuable, but less targeted.

### 4.3 Depends on Delegation/Override Mechanics (v0.8.3+)

None of the five types require delegation/override mechanics. They all operate at Level 1 (Strategic Guidance) through the event system. This is intentional — presidential decisions between operations should be the default loop, not the exception.

### 4.4 Recommended Sequencing

| Priority | Type | Milestone | Effort | Dependencies |
|---|---|---|---|---|
| 1 | Strategic Posture Review | v0.8.0.x (now) | 3 JSON events (~240 lines) | None |
| 2 | Visit to the Front | v0.8.0.x (now) | 3 JSON events (~240 lines) | None |
| 3 | Humanitarian Crisis Response | v0.8.0.x (now) | 3 JSON events (~240 lines) | Verify corridor_severed edge passing |
| 4 | Patron Pressure Response | v0.8.2 | 3 JSON events + bot personality | v0.8.2 Political Leader Bot |
| 5 | Commander Confidence Crisis | v0.8.2 | 3 JSON events + relationship model | v0.8.1 Commander Maturity |

**Types 1, 2, and 5 can ship immediately as JSON content.** They fill the 29-turn and 20-turn decision gaps with zero engine risk. Type 3 (Humanitarian) needs a quick verification pass. Types 4 and 5 gain depth from later milestones but have standalone value now.

---

## 5. What Was Cut

### 5.1 "Resource Allocation Board" — Cut

Early brainstorm: a detailed supply allocation panel where the president divides supplies between corps. **Cut because:** this is a staff officer mechanic, not a presidential decision. The president sets priorities; the staff allocates. Also requires a new UI panel, not an event. If supply priority becomes a presidential decision, it should be a simple event choice ("Prioritize eastern front supply" / "Prioritize Sarajevo" / "Balance across all fronts") with `supply_delta` effects, not a spreadsheet.

### 5.2 "Personnel Management Screen" — Cut

Commander promotion/demotion/replacement as a between-ops activity. **Cut because:** this belongs to v0.8.3 Order Interpretation where it has real mechanical teeth (corps commander personality affects execution). As an event, it would be flavor text with morale effects — not wrong, but not the right home. Type 3 (Commander Confidence Crisis) captures the presidential framing without pretending to be a personnel system.

### 5.3 "Strategic Pivot Decision" — Merged into Type 1

Originally a separate type: "the front has shifted, do you change campaign priorities?" **Merged because:** this is exactly what the Strategic Posture Review does on repeat firings, especially with escalation. A separate type would fire at the same times and compete for attention.

### 5.4 "Intelligence Briefing Event" — Cut

Periodic intel summary as an event. **Cut because:** intelligence is an Army HQ function, not an event. The Chief of Staff briefing already exists in Army HQ. Making it an event would duplicate that surface. If intelligence needs presidential attention, it should be a flag condition that triggers one of the other event types (e.g., "intelligence reveals enemy buildup" triggers Strategic Posture Review with accelerated pressure).

### 5.5 "Ceasefire Negotiation Mini-Game" — Cut

Extended negotiation sequences with multiple rounds. **Cut because:** this is a subsystem in disguise. The existing one-shot ceasefire events (Carter ceasefire, COHA) already handle this. Recurring negotiation pressure is captured by Type 2 (Patron Pressure Response) and the strategic dimensions system.

---

## 6. Gap Coverage Analysis

With Types 1 (Strategic Posture Review) and 5 (Visit to the Front) as recurring events, plus the existing historical events:

| Former Gap | Turns | Now Covered By |
|---|---|---|
| Mid-1993 (73-101) | 29 turns | Strategic Posture Review (~turn 80, 90), Visit to the Front (~turn 85) |
| Late 1993 (103-116) | 14 turns | Strategic Posture Review (~turn 110), Humanitarian Crisis Response |
| Early-mid 1994 (123-137) | 15 turns | Strategic Posture Review (~turn 130), Visit to the Front (~turn 125) |
| Mid-late 1994 (140-159) | 20 turns | Strategic Posture Review (~turn 145, 155), Visit to the Front (~turn 150) |
| Mid 1995 (164-173) | 10 turns | Strategic Posture Review (~turn 168), Visit to the Front (~turn 170) |

**Estimated maximum gap between decision events after implementation: 8-10 turns (2 months of game time).** This is a reasonable presidential rhythm — consequential decisions every 2-3 months of war, with operations filling the remaining turns.

---

## 7. Completion Block

```
Canonical owner: event system + presidential command doctrine
Demoted path: dead time between operations; brigade-level event framing
Player-visible truth: the player has meaningful presidential decisions every few turns
Canonical UI surface: EventModal for decisions; Warroom for strategic context
Done means: design doc exists, roadmap updated, event types defined with triggers/effects/examples
```

---

## 8. Implementation Notes

### 8.1 No New Effect Types Needed

All five decision types use existing effect kinds. The only potential engine touch is verifying that `corridor_severed` receives edges in all evaluation paths (for Type 4).

### 8.2 Faction-Specific Event Definitions

Each type needs 3 event definitions (one per faction) because the narrative text, choices, and effects differ by faction. The RS president visiting the Drina front carries different implications than the RBiH president visiting Tuzla.

### 8.3 EventModal Label Fix

The EventModal currently shows "Commander's Decision Required" for decision events. Under presidential doctrine, this should read "Presidential Decision Required" or "Your Decision, Mr. President". This is a one-line text change in `EventModal.tsx` line 214.

### 8.4 Interaction with Operations

These events fire independently of operations. An operation in progress does not suppress presidential events — the president still makes political decisions while the army fights. This is historically accurate: Izetbegovic negotiated at Geneva while the ARBiH fought at Igman.
