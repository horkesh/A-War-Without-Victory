# Emergent Cascade Architecture

**The single document that maps how all AWWV systems connect — from player choice through mechanical consequence through narrative display through endgame scoring.**

**Date:** 2026-03-24
**Status:** Living document. Update when systems change.

---

## Core Principle

**The game doesn't judge. The game shows consequences.**

Every player choice feeds forward through mechanical systems, generates narrative artifacts, and ultimately shapes the Dayton endgame score. No choice is "correct." The systems create the possibility space; the player explores it. Bot factions follow historical patterns as defaults but diverge when game state forces adaptation (v0.8.0 political bot).

---

## The Cascade: How a Single Decision Echoes Through Every System

### Example: RS Player allows paramilitaries in Zvornik (w2)

```
PLAYER CHOICE
  └─ paramilitary_policy: 'allow' for Zvornik targets

MECHANICAL CONSEQUENCE (v0.6.5 paramilitary_sweep.ts)
  ├─ Territory: op:zvornik:* OSIDs flip RS→captured
  ├─ Displacement: Bosniak population expelled (displacement_event_log)
  ├─ Civilian casualties: killed += OSID_pop × 0.05 (civilian_casualties ledger)
  └─ war_crimes_events += 1 per capture (negotiation_capital) ← CURRENTLY MISSING, FIX NEEDED

DIMENSION SHIFTS (v0.7.0 flag wiring + strategic_dimensions.ts)
  ├─ international_standing: -10 per war_crimes_event (computeDimensionBaseValues)
  ├─ patron_confidence: degraded via WAR_CRIMES_OVERRIDE_PER_EVENT (patron_pressure.ts)
  ├─ territorial_legitimacy: +small (more territory held)
  └─ internal_cohesion: unchanged (RS public supports "separation of peoples")

FLAG CASCADE (v0.7.0)
  ├─ war_crimes_above threshold=5 → drina_cleansing_occurred flag ← EDGE CASE: flag set by EVENT, not by paramilitaries. See §Gaps.
  ├─ drina_cleansing_occurred → camps_revealed fires earlier (condition gate)
  ├─ camps_revealed → patron_pressure +3/turn permanent (engine system read)
  └─ camps_revealed + patron_pressure_above → london_conference chain fires

EVENT CHAIN (v0.7.0 + v0.9.0)
  ├─ concentration_camps_revealed_1992 (w16)
  ├─ → london_conference_response (conditional)
  ├─ → humanitarian_intervention_pressure (dimensional)
  └─ END OF CHAIN: Deliberate Force trigger threshold reached by w170

OPPOSING FACTION RESPONSE (v0.8.0 political bot)
  ├─ RBiH: mobilization accelerates (Drina refugees become recruits)
  ├─ RBiH: international appeal spending increases (patron_pressure events)
  ├─ HRHB: alliance_value drops (associated with atrocities via Graz Accords)
  └─ RBiH bot may launch Srebrenica defense operations earlier

OFFICER REACTION (v0.8.1 order interpretation)
  ├─ If player later orders Drina Corps to halt → aggressive officer may continue
  ├─ If player orders more cleansing → cautious officer may slow-roll
  └─ Officer war_crimes_record accumulates (informational, affects Codex display)

NARRATIVE ARTIFACTS (v0.7.1 Dynamic Codex)
  ├─ "Drina Valley Campaign" essay: dynamic section shows player's war path
  ├─ Ghost entries: if events DON'T fire, show "In the historical war..."
  ├─ Chronicle cards: paramilitary captures appear as humanitarian events
  └─ Wrapped slide: "What It Cost" shows civilian casualty toll

DAYTON ENDGAME (existing negotiation system)
  ├─ negotiating_capital = f(dimensions, territory, patron)
  ├─ RS territory_controlled_pct: HIGH (Drina captured)
  ├─ RS international_standing: COLLAPSED (war crimes)
  ├─ RS patron_confidence: LOW (Belgrade distancing)
  ├─ Net: strong territory, weak everything else
  └─ Dayton verdict: "You won the land. You lost everything else."
```

### The Opposite Path: RS Player denies paramilitaries (w2)

```
PLAYER CHOICE
  └─ paramilitary_policy: 'deny' for all targets

MECHANICAL CONSEQUENCE
  ├─ Territory: Drina valley CONTESTED, RBiH holds hostile-majority OSIDs
  ├─ No displacement (populations remain)
  ├─ No civilian casualties from paramilitaries
  └─ war_crimes_events: 0 from this source

CONSEQUENCE CHAIN (v0.9.0)
  ├─ csq_drina_garrison_drain: RS brigades pinned in occupation duty
  ├─ csq_drina_to_resistance: Bosniak TO units form in non-cleansed municipalities
  ├─ csq_no_refugee_catalyst: Srebrenica enclave doesn't crystallize (no refugee influx)
  └─ csq_no_deliberate_force: NATO has no cleansing-driven trigger for massive air campaign

DIMENSIONS
  ├─ international_standing: PRESERVED (no war crimes)
  ├─ patron_confidence: HIGH (Belgrade approves restraint)
  ├─ territorial_legitimacy: LOW (contested territory)
  └─ military_credibility: DEGRADED (can't project force into Drina)

DAYTON ENDGAME
  ├─ RS has less territory but better international position
  ├─ Patron override authority is LOW (patron hasn't been burned)
  ├─ Negotiation from a position of diplomatic strength, military weakness
  └─ Dayton verdict: "You kept your honor. You lost the Drina."
```

---

## System Connection Map

### Who Writes → Who Reads

| Producer | State Field | Consumers |
|----------|-------------|-----------|
| paramilitary_sweep.ts | `political_controllers[osid]` | Front lines, sectors, territory %, Codex, Chronicle |
| paramilitary_sweep.ts | `displacement_event_log[]` | Displacement tracking, IVP, Chronicle, Wrapped |
| paramilitary_sweep.ts | `civilian_casualties[faction]` | IVP composite, dimension base values, Dayton scoring |
| paramilitary_sweep.ts | `war_crimes_events` (FIX NEEDED) | `international_standing` dimension, patron pressure, Dayton scoring, event conditions (`war_crimes_above`) |
| Event system | `event_flags{}` | All condition evaluators, consequence chain, Codex dynamic sections, political bot |
| Event system | `strategic_dimensions{}` | `computeNegotiatingCapital()`, Dayton scoring, political bot decisions |
| Event system | `war_crimes_events` | Same as paramilitary producer |
| Bot response | `event_flags{}` (FIX NEEDED) | Same as event system flags |
| Officer system | `CorpsCommandState.stance` | Operation launch gate, bot corps directives, sector stance cascade |
| Political bot | `event_constraints{}` | Operation blocks, doctrine overrides, scope restrictions |
| Political bot | `event_aggression_modifiers[]` | Corps directive aggression scoring |
| Operations | `political_controllers[osid]` | Territory, front lines, sectors — same cascade as paramilitaries |
| Displacement | IVP components | `patron_pressure.ts`, exhaustion modifier, dimension base values |

### The Full Player Choice → Endgame Pipeline

```
Player Choice (event decision / paramilitary policy / corps stance / operation launch)
    │
    ├─→ Mechanical Effect (territory, casualties, displacement, supply)
    │       │
    │       ├─→ war_crimes_events (negotiation_capital)
    │       ├─→ civilian_casualties (IVP composite)
    │       ├─→ displacement_event_log (Chronicle, displacement tracking)
    │       └─→ political_controllers (territory, front lines, sectors)
    │
    ├─→ Flag Setting (event_flags on GameState)
    │       │
    │       ├─→ Downstream event conditions (flag_equals, flag_not_set)
    │       ├─→ Engine system reads (patron_pressure rate, supply throttle, combat suppression)
    │       ├─→ Codex dynamic section conditions (show/hide content)
    │       └─→ Consequence event triggers (v0.9.0)
    │
    ├─→ Dimension Shifts (strategic_dimensions)
    │       │
    │       ├─→ computeNegotiatingCapital() → Dayton scoring
    │       ├─→ Political bot decision weights (v0.8.0)
    │       └─→ Patron pressure override authority
    │
    ├─→ Political Bot Response (v0.8.0, opposing factions)
    │       │
    │       ├─→ event_constraints (operation blocks, doctrine overrides)
    │       ├─→ event_aggression_modifiers (corps directive tuning)
    │       └─→ Alliance/diplomacy adjustments
    │
    ├─→ Officer Interpretation (v0.8.1, player faction)
    │       │
    │       ├─→ Stance modification (player intent → effective stance)
    │       ├─→ Operation parameter adjustment (prep time, objectives, min_attack_outcome)
    │       └─→ Pushback events (notification to player)
    │
    └─→ Narrative Display
            │
            ├─→ Codex dynamic sections (v0.7.1) — "In your war..."
            ├─→ Codex ghost entries — "In the historical war..."
            ├─→ Chronicle cards — event log
            ├─→ CoS briefing — personality-driven narrative
            ├─→ Wrapped slides — end-of-game summary
            └─→ Dayton verdict — "You won the land. You lost everything else."
```

---

## Known Gaps (as of 2026-03-24)

### GAP 1: Paramilitaries don't increment war_crimes_events
**Status:** NOT WIRED
**Impact:** Paramilitaries commit ethnic cleansing but face zero war crimes accounting. international_standing doesn't drop. Patron doesn't react. Dayton score unaffected.
**Fix:** In `advanceParamilitaries()`, on every successful capture: `cap.war_crimes_events = (cap.war_crimes_events ?? 0) + 1`. Apply to BOTH rear pocket and offensive modes.
**Milestone:** v0.6.5

### GAP 2: Bot auto-response drops sets_flags and dimension_shifts
**Status:** BUG (same class as the P0 we fixed in resolveEventDecision)
**Impact:** When no player faction exists (headless runs, spectator mode), bot picks a response option but only applies `effects`. `sets_flags` and `dimension_shifts` on the chosen option are silently dropped. All headless calibration runs have broken flag propagation from decision events.
**Fix:** In `evaluateEvents()` after line 215, add: `applyDefinitionFlags(state, chosen.sets_flags); applyDefinitionDimensionShifts(state, chosen.dimension_shifts);`
**Milestone:** Immediate — this affects calibration accuracy.

### GAP 3: drina_cleansing_occurred flag disconnected from paramilitaries
**Status:** DESIGN GAP
**Impact:** The flag is set by the `drina_valley_ethnic_cleansing_1992` EVENT (turn_min=6, turn_max=20). But paramilitaries may capture Drina OSIDs at w2-3, before the event fires. And if the player denies paramilitaries, the event may still fire (it's currently time-gated, not paramilitary-gated).
**Fix:** Make the event conditional on `war_crimes_above` threshold. If enough paramilitary captures occur, the event fires (describing what happened). If the player denied paramilitaries, the event doesn't fire and the flag stays unset. This connects the mechanical reality to the narrative.
**Milestone:** v0.7.0 (FIXED→CONDITIONAL conversion)

### GAP 4: No war crimes UI indicator
**Status:** NOT DESIGNED
**Impact:** war_crimes_events accumulates in negotiation_capital but the player only sees the effect at Dayton (which is 150+ turns later). The player doesn't understand WHY their negotiating position is weak.
**Fix:** Add a persistent "War Crimes Tribunal" indicator to the strategic dimensions display or Army HQ briefing. Shows accumulated war crimes events, projected international_standing impact, and patron pressure consequence. Updated each turn.
**Milestone:** v0.7.1 (Codex UI) or v0.8.0 (political bot — which already reads these values)

### GAP 5: Active operations + stance change = undefined behavior
**Status:** DESIGN GAP (found by Operations Expert)
**Impact:** If corps stance changes to defensive while an operation is executing, the operation continues in an incoherent state.
**Fix:** Refuse to downshift stance below balanced while an operation is active. Advisory event: "Cannot adopt defensive posture while Operation X is underway."
**Milestone:** v0.8.1 (order interpretation — which is where stance modification lives)

### GAP 6: Political bot aggression stacking has no floor
**Status:** DESIGN GAP (found by Operations Expert)
**Impact:** Multiple overlapping aggression modifiers from political bot can sum to -0.30+, functionally suppressing all offensives.
**Fix:** `AGGRESSION_MODIFIER_FLOOR = -0.20`. Add per-corps operation blocks (currently faction-wide only).
**Milestone:** v0.8.0 (political bot implementation)

### GAP 7: Officer cycling avoids cowed penalty
**Status:** EDGE CASE
**Impact:** Player can relieve an officer, override the replacement, relieve the replacement — cycling through officers to avoid the cowed competence penalty since each new officer starts fresh.
**Fix:** Track override count at the CORPS level, not the officer level. `CorpsCommandState.override_count_this_war` persists across officer changes. Alternatively: each relief adds +1 to a faction-wide `political_interference_count` that degrades `internal_cohesion` dimension.
**Milestone:** v0.8.1

### GAP 8: Ghost essay appears then event fires
**Status:** EDGE CASE
**Impact:** `ghost_when: "turn_past:70"` shows the ghost at turn 71. If the event fires at turn 72, the player saw "this didn't happen in your war" one turn before it happened.
**Fix:** Ghost activation should check: `turn > event.turn_max AND event NOT in fired_event_ids`. Both conditions required. The `turn_past:N` syntax alone is insufficient.
**Milestone:** v0.7.1 (essay template engine)

### GAP 9: Mid-game dead zones (w20-35, w80-130) and COHA dead air (w139-156)
**Status:** DESIGN GAP (found by Game Designer)
**Impact:** Player has no meaningful decisions for 10-17 turns at a stretch. This is where players quit.
**Fix:** (A) Add 15-20 conditional events for w40-w130: patron demands, enclave crises, internal politics, ceasefire management. (B) During COHA ceasefire, enable diplomatic/rearm decisions — the ceasefire is a strategic opportunity, not dead air. (C) Recurring resource allocation decisions every 10-15 turns.
**Milestone:** v0.7.0 (additional events in flag wiring scope) + v0.9.0 (consequence events help late-game)

### GAP 10: Codex is passive — waits for player to open it
**Status:** DESIGN GAP (found by Game Designer)
**Impact:** 48,000 words of essays that nobody reads voluntarily.
**Fix:** Push Codex updates TO the player via briefing notifications. Cross-link locations to map. "Key Divergences" short-form view. Chronicle Wrapped references Codex divergences.
**Milestone:** v0.7.1 (Codex UI enhancements)

### GAP 11: No unified notification architecture
**Status:** DESIGN GAP (found by UI/UX Developer)
**Impact:** v0.7.1 adds Codex notifications, v0.8.0 adds political alerts, v0.8.1 adds officer events, v0.8.2 adds autonomy proposals — each will invent its own pattern.
**Fix:** Design a notification rail architecture BEFORE v0.8.1. One inbox, severity filtering, batch acknowledge, priority ordering.
**Milestone:** Cross-cutting — design before v0.8.1, implement incrementally.

### GAP 12: Content authoring underestimated 5-7x
**Status:** PLANNING GAP (found by Narrative Designer)
**Impact:** v0.7.1 plan estimates 2-3 sessions for 169 dynamic sections. Reality: 14-21 sessions.
**Fix:** Ship v0.7.1 with 20 MVP sections (10 essays × 2). Create a dynamic section style guide. Backfill remaining 149 sections across v0.9.1 and beyond.
**Milestone:** v0.7.1 (reduced scope) + v0.9.1 (content backfill)

### GAP 13: Pipeline whitelist field construction (3 chokepoints)
**Status:** STRUCTURAL FRAGILITY (found by Data Pipeline Engineer)
**Impact:** Adding any new edge field requires 3 code changes or it's silently stripped.
**Fix:** Convert whitelist construction to spread (`{ ...e, a, b }`) in T1, T2, and `parseEdges()`. Add pipeline integration test. Add `npm run pipeline` orchestrator script.
**Milestone:** Before next pipeline change (no version slot — infrastructure maintenance).

### GAP 14: 68 IPC handlers, 0 tested end-to-end
**Status:** TESTING GAP (found by Integration Tester)
**Impact:** A player order from UI may silently fail to reach game state. Adapter has ~100 fields with only ~10 tested.
**Fix:** Adapter field completeness test + IPC handler logic extraction + save/load round-trip test. All writable by nightshift.
**Milestone:** Immediate — write tonight alongside v0.6.5.

---

## Milestone Dependency Graph (updated)

```
v0.6.5 (paramilitaries + war crimes wiring)
  │
  ├─→ v0.7.0 (flags) ──→ v0.7.1 (Codex UI + essays) ──→ v0.9.1 (content backfill)
  │       │
  │       └──→ v0.8.0 (political bot) → v0.8.1 (officer interpretation) → v0.8.2 (API)
  │                   │
  │                   └──→ v0.9.0 (consequences)
  │
  ├─→ v0.7.3 (canon audit) ── independent
  ├─→ v0.7.2 (warroom migration) ── independent
  └─→ Integration tests ── independent, write anytime

Notification architecture ── must DESIGN before v0.8.1, implement incrementally
Mid-game events ── fold into v0.7.0 scope
Pipeline hardening ── before next pipeline change
```

---

## The v1.0 Test: Does Every Player Choice Cascade?

For v1.0 to ship, EVERY player-facing choice must produce a cascade through at least 3 of these 5 layers:

1. **Mechanical** (territory, casualties, supply, formation state)
2. **Dimensional** (strategic dimensions shift)
3. **Flag/Event** (downstream events enabled/suppressed)
4. **Narrative** (Codex section, Chronicle card, briefing text)
5. **Endgame** (Dayton scoring affected)

If a choice only affects 1-2 layers, it feels hollow. If it affects 4-5, it feels like the game is alive.

**Current coverage:**
- Foundational decisions (strategic goals, state identity): 5/5 layers when v0.9.0 ships
- Paramilitary policy: 4/5 (missing: narrative in v0.7.1) → 5/5 after v0.7.1
- Corps stance orders: 2/5 (mechanical + officer reaction) → needs flag/narrative/endgame wiring
- Operation launches: 2/5 (mechanical + territory) → needs narrative/endgame wiring
- Event decisions: 3/5 (mechanical + dimensional + flag) → 5/5 when v0.7.1 + v0.9.0 ship
- Officer relief: 2/5 (mechanical + officer) → needs dimensional/narrative/endgame wiring

**Gap:** Corps stance and operation management — the player's MOST FREQUENT actions — cascade through the fewest layers. These need to touch dimensions and narrative to feel meaningful.

---

*"Another such victory and we are undone."*
