# v0.7.0 Event Flag Wiring — Implementation Plan

**Historical plan:** Do not execute directly. Current governance lives in `docs/plans/COMMAND_BOARD.md` and `docs/plans/MASTER_ROADMAP.md`. Srebrenica/Zepa fall receipts are event-owned under the current Section 6 policy; do not infer a scripted-op or wholesale event-rebuild lane from this file.

**Date:** 2026-03-23
**Status:** COMPLETE — all phases implemented (2026-03-25). Phases 1-5 shipped. Zero orphan flags remain.
**Scope:** Wire ~25 orphan flags to downstream event conditions and engine systems
**Prerequisite:** v0.6.0 event system (94 events, pressure system, condition evaluator) is live

---

## ADDENDUM — Prerequisite Fixes (2026-03-24 day shift, Pyrrhic team review)

Three issues from the nightshift must be resolved BEFORE continuing Phase 4+. Each requires its own calibration run per one-change-per-run protocol.

### FIX-A: MAX_EVENTS_PER_TURN cap (P1)
**Team recommendation (Game Designer):** Both — raise cap to 4 AND add priority tiers.
- In `evaluate_events.ts`: change `MAX_EVENTS_PER_TURN = 3` to `4`.
- In `war_1992.json`: add `"priority": 1` to `jna_withdrawal_1992` (single-turn window at w5).
- Priority scheme: 1=fire-or-miss anchors, 10=cascade prerequisites, 20=cascade consequents, 50=major political, 100=default.
- **Rationale:** Cap alone defers the problem. Priority alone doesn't help when 3+ events tie at same level. Both together give structural resilience.
- **Execution:** Two separate calibration runs (cap change first, then priority).

### FIX-B: Gorazde enclave OSID list (P2)
**Team recommendation (Operations Expert):** Expand `gorazde.osid_list` — do NOT remove gorazde from para scope.
- Add 3 OSIDs to `enclave_resilience.ts` Gorazde definition: `glamoc_2`, `kamen_2`, `sopotnica_2`.
- **Rationale:** VRS paramilitaries did historically operate in Gorazde municipality periphery. Removing scope suppresses correct behavior. These 3 OSIDs are historically RBiH-held approaches that were never ethnically cleansed.
- **Execution:** One calibration run after OSID list change.

### FIX-C: corridor_severed edges data path (P2)
**Team recommendation (Gameplay Programmer):** Pass `EdgeRecord[]` as parameter — do NOT put edges on GameState.
- Extend `evaluateCondition` signature to accept optional `edges?: EdgeRecord[]`.
- Thread edges through `evaluateEvents -> triggerMatches -> evaluateCondition`.
- In `evaluate-events` pipeline step, load operational data edges and pass them in.
- **Rationale:** `(state as any).derived?.edges` is always undefined — Engine Invariant S13.1 forbids serializing derived state. Evaluator has been silently returning false.
- **Execution:** One calibration run. ~8 lines across 3 files.

### Execution sequence (5 calibration runs total)
1. FIX-A1: Raise MAX_EVENTS_PER_TURN to 4 -> run -> verify jna_withdrawal fires at w5
2. FIX-A2: Add priority=1 to jna_withdrawal_1992 -> run -> verify cascade chain intact
3. FIX-C: Wire corridor_severed edges -> run -> verify corridor detection works
4. FIX-B: Expand Gorazde enclave list -> run -> verify 3 OSIDs stay RBiH
5. Resume Phase 4 (engine flag reads)

---

## 0. Problem Statement

The event system sets ~28 flags across 94 events, but only ONE flag (`rs_strategic_goals`) is consumed by any downstream condition (`drina_cleansing_decision_1992` checks `flag_equals: rs_strategic_goals = all_six`). The remaining ~25 flags are write-only breadcrumbs with zero mechanical consequence. The dependency graph (EVENT_DEPENDENCY_GRAPH.md) identifies this as the single biggest structural gap in the event system.

**Goal:** Every flag either gates a downstream event, modifies an engine system, or is removed. No orphan flags after this work.

---

## 1. Flag-to-Consumer Wiring Map

### 1.1 `arms_embargo_active` (set by `arms_embargo_impact_1992`)

**Downstream event consumers:**
- `sarajevo_tunnel_completed_1993` — add pressure modifier: if `arms_embargo_active`, tunnel pressure builds 1.5x faster (smuggling becomes critical)
- `operation_sharp_guard_1993` — add condition: `flag_equals: arms_embargo_active = true` (naval blockade only matters if embargo is active)

**Engine system consumers:**
- `src/state/supply_reserves.ts` — **PATRON_AID_SCALE** for RBiH: when `arms_embargo_active` is true, apply a 0.6x multiplier to RBiH patron aid inflow. This is the flag's primary mechanical bite — it throttles RBiH heavy equipment acquisition.
- `src/sim/combat/strategic_reserve.ts` — when `arms_embargo_active` is true, RBiH `FACTION_DRAW_RATE` reduced from 0.02 to 0.01 (slower heavy equipment replenishment from strategic reserve)

**Implementation:** Read `state.military.event_flags?.arms_embargo_active` in `updateSupplyReserves()` and `collectStrategicReserve()`. Guard with `?? false`.

---

### 1.2 `barracks_*_seized` (4 flags, set by `battle_of_the_barracks_*`)

Flags: `barracks_sarajevo_seized`, `barracks_tuzla_seized`, `barracks_zenica_seized`, `barracks_visoko_seized`

**Engine system consumers:**
- `src/sim/early_war/` (or `apply_effects.ts`) — The barracks events already grant equipment via `equipment_grant` effects. The flags serve as **prerequisite gates** for downstream events that depend on RBiH having seized JNA materiel.

**Downstream event consumers:**
- `jna_withdrawal_1992` — add pressure modifier: each `barracks_*_seized` flag adds +1.0 to pressure rate (more barracks seized = faster JNA decides to pull out). Condition: `or` of at least 2 barracks flags being true.
- Future event (backlog): `rbih_equipment_crisis_1993` — fires only if fewer than 2 barracks were seized (flag_not_set on 3+ barracks). Represents RBiH being critically underequipped.

**Implementation:** Add `PressureModifier[]` to `jna_withdrawal_1992` definition, each checking one barracks flag. No engine code change needed — pure event JSON wiring.

---

### 1.3 `sarajevo_siege_active` (set by `sarajevo_siege_begins_1992`)

**Downstream event consumers (gate):**
- `sarajevo_tunnel_completed_1993` — add condition: `flag_equals: sarajevo_siege_active = true` (tunnel only makes sense if siege is active)
- `markale_area_shelling_1993` — add condition: `flag_equals: sarajevo_siege_active = true`
- `markale_massacre_1994` — add condition: `flag_equals: sarajevo_siege_active = true`
- `second_markale_massacre_1995` — add condition: `flag_equals: sarajevo_siege_active = true`
- `nato_ultimatum_sarajevo_1994` — add condition: `flag_equals: sarajevo_siege_active = true`
- `sarajevo_exclusion_zone_1994` — add condition: `flag_equals: sarajevo_siege_active = true`
- `anti_sniping_agreement_1994` — add condition: `flag_equals: sarajevo_siege_active = true`

**Engine system consumers:**
- `src/sim/combat/enclave_resilience.ts` — Sarajevo enclave resilience growth rate gated on `sarajevo_siege_active`. Already hardcoded via `ALWAYS_BESIEGED_ENCLAVES`; flag provides the semantic trigger.
- Sarajevo SRK siege logic in `src/sim/local_truces.ts` — siege drain and bombardment gated on flag (currently implicit via corps positioning).

**Implementation:** Primarily event JSON conditions. Engine integration is low-risk since the flag confirms what the engine already assumes.

---

### 1.4 `jna_withdrawn` (set by `jna_withdrawal_1992`)

**Downstream event consumers (gate):**
- `drina_valley_ethnic_cleansing_1992` — add condition: `flag_equals: jna_withdrawn = true` (VRS cleansing campaigns begin after JNA formally withdraws and VRS inherits)
- `operation_corridor_1992` — add condition: `flag_equals: jna_withdrawn = true` (VRS corridor operation requires JNA withdrawal completion)
- `srebrenica_enclave_forms_1992` — add condition: `flag_equals: jna_withdrawn = true` (enclave crystallizes after JNA pullout)

**Engine system consumers:**
- None needed. The JNA withdrawal event already fires equipment_grant effects. The flag's role is purely gating — downstream VRS operations and ethnic cleansing shouldn't fire before JNA formally leaves.

**Implementation:** Add `condition` field (or compound `and` with existing conditions) to the three events' trigger blocks.

---

### 1.5 `mostar_liberated` (set by `mostar_liberation_1992`)

**Downstream event consumers:**
- `east_mostar_siege_1993` — add condition: `flag_equals: mostar_liberated = true` (HVO siege of east Mostar requires the city to have been liberated from VRS first)
- `hvo_arbih_tensions_rise_1992` — add pressure modifier: if `mostar_liberated`, +0.5 rate bonus (control of Mostar accelerates HVO-RBiH friction as both claim the city)
- `mostar_bridge_destroyed_1993` — add condition: `flag_equals: mostar_liberated = true`
- `operation_neretva_93_1993` — add condition: `flag_equals: mostar_liberated = true` (ARBiH Neretva offensive operates in the Mostar hinterland)

**Implementation:** Event JSON conditions only.

---

### 1.6 `srebrenica_enclave_formed` (set by `srebrenica_enclave_forms_1992`)

**Downstream event consumers (gate for entire Srebrenica arc):**
- `kravica_attack_1993` — add condition: `flag_equals: srebrenica_enclave_formed = true`
- `morillon_enters_srebrenica_1993` — add condition: `flag_equals: srebrenica_enclave_formed = true`
- `srebrenica_shelling_1993` — add condition: `flag_equals: srebrenica_enclave_formed = true`
- `un_resolution_819_srebrenica_1993` — add condition: `flag_equals: srebrenica_enclave_formed = true`
- `srebrenica_demilitarization_1993` — add condition: `flag_equals: srebrenica_enclave_formed = true`
- `srebrenica_falls_1995` — add condition: `flag_equals: srebrenica_enclave_formed = true` (plus additional conditions, see Section 2)
- `zepa_falls_1995` — add condition: `flag_equals: srebrenica_enclave_formed = true`

**Implementation:** Event JSON conditions. Critical chain — if `srebrenica_enclave_forms_1992` doesn't fire (RS doesn't reach 48% territory), the entire Srebrenica arc is suppressed. This is correct emergent behavior.

---

### 1.7 `drina_cleansing_occurred` (set by `drina_valley_ethnic_cleansing_1992`)

**Downstream event consumers:**
- `concentration_camps_revealed_1992` — add pressure modifier: if `drina_cleansing_occurred`, +2.0 rate bonus (cleansing drives faster media discovery of camps)
- `london_conference_1992` — add pressure modifier: if `drina_cleansing_occurred`, +1.0 rate bonus (international outrage accelerates conference)
- `srebrenica_enclave_forms_1992` — add pressure modifier: if `drina_cleansing_occurred`, +1.5 rate bonus (cleansing drives Bosniak refugees into Srebrenica, accelerating enclave formation)

**Engine system consumers:**
- `src/sim/negotiation/patron_pressure.ts` — when `drina_cleansing_occurred` is true, RS patron pressure accumulation rate increases by +2 per turn (reflects sustained international condemnation). Read from `state.military.event_flags`.
- War crimes accumulation: the `drina_valley_ethnic_cleansing_1992` event already applies `humanitarian_impact` effects. The flag enables *continued* consequences beyond the one-time effect.

**Implementation:** Event JSON pressure modifiers (3 events) + one engine system read in `patron_pressure.ts`.

---

### 1.8 `corridor_secured` (set by `operation_corridor_1992`)

**Downstream event consumers:**
- `london_conference_1992` — add pressure modifier: if `corridor_secured`, -0.5 rate bonus (RS achieving corridor reduces urgency of international intervention from RS perspective, but doesn't stop it)

**Engine system consumers:**
- `src/state/supply_reserves.ts` — RS supply flow: when `corridor_secured` is true, RS patron aid multiplier increases by 1.3x (overland supply route from Serbia through Posavina). When false, RS supply is limited to Drina crossings.
- `src/sim/combat/bot_strategy.ts` — RS doctrine: when `corridor_secured` is false, RS doctrine should prioritize Posavina corps. Implementation: add corridor flag check to RS `generateCorpsDirectives` priority weighting.

**Implementation:** Supply reserves read (mechanical), bot strategy priority hint (behavioral). Both read `state.military.event_flags?.corridor_secured`.

---

### 1.9 `camps_revealed` (set by `concentration_camps_revealed_1992`)

**Downstream event consumers:**
- `london_conference_1992` — add condition: `flag_equals: camps_revealed = true` (London Conference is largely a response to camp revelations; tighten the gate)
- `un_resolution_808_tribunal_1993` — add pressure modifier: if `camps_revealed`, +2.0 rate bonus (camp evidence accelerates tribunal creation)
- `icty_established_1993` — add pressure modifier: if `camps_revealed`, +1.0 rate bonus

**Engine system consumers:**
- `src/sim/negotiation/patron_pressure.ts` — when `camps_revealed` is true, RS patron pressure base rate permanently increases by +3 per turn (the camps are the single most damaging revelation for RS international standing)

**Implementation:** One hard gate (london_conference), two pressure modifiers, one engine read.

---

### 1.10 `hvo_arbih_tensions_rising` (set by `hvo_arbih_tensions_rise_1992`)

**Downstream event consumers:**
- `gornji_vakuf_clashes_1993` — add pressure modifier: if `hvo_arbih_tensions_rising`, +1.0 rate bonus (tensions accelerate first clash)
- `croat_bosniak_war_begins_1993` — add pressure modifier: if `hvo_arbih_tensions_rising`, +0.5 rate bonus (general acceleration toward war)
- `ahmici_massacre_1993` — add condition: `flag_equals: hvo_arbih_tensions_rising = true` (Ahmici doesn't happen in a vacuum)

**Engine system consumers:**
- `src/sim/early_war/washington_agreement.ts` (or alliance decay logic) — when `hvo_arbih_tensions_rising` is true, alliance decay rate increases by 1.5x. This is the flag's primary mechanical bite: it accelerates the slide toward the Croat-Bosniak war.

**Implementation:** Event JSON pressure modifiers + one engine alliance-decay multiplier.

---

### 1.11 `jajce_fell` (set by `jajce_falls_1992`)

**Downstream event consumers:**
- `croat_bosniak_war_begins_1993` — add pressure modifier: if `jajce_fell`, +1.0 rate bonus (mutual blame for Jajce loss poisons alliance)
- `hvo_arbih_tensions_rise_1992` — add pressure modifier: if `jajce_fell`, +1.5 rate bonus (Jajce is a major acceleration event for tensions)
- `vance_owen_plan_1993` — add pressure modifier: if `jajce_fell`, +0.5 rate bonus (Jajce fall increases international urgency for peace plan)

**Engine system consumers:**
- Alliance: `jajce_fell` should apply an immediate -0.10 alliance shift (already done by the event effect). The flag's ongoing role is as a pressure accelerant for downstream events.

**Implementation:** Event JSON pressure modifiers only. No engine changes needed.

---

### 1.12 `bihac_breakout_occurred` (set by `bihac_5th_corps_offensive_1994`)

**Downstream event consumers:**
- `bihac_crisis_1994` — change from fixed-turn to conditional: add condition `flag_equals: bihac_breakout_occurred = true` (crisis is a direct consequence of the breakout provoking RS/Abdic counter-offensive)

**Implementation:** Event JSON condition change.

---

### 1.13 `coha_active` / `coha_expired` (set by `coha_ceasefire_begins_1995` / `coha_expires_1995`)

**Downstream event consumers:**
- `operation_flash_1995` — add condition: `or` of `flag_equals: coha_expired = true` OR `flag_not_set: coha_active` (Flash happens after COHA collapses)
- All 1995 military events between w139-w156 — add condition: `flag_not_set: coha_active` OR keep turn-gated past COHA window

**Engine system consumers (PRIMARY):**
- `src/sim/combat/attack_resolution_osid.ts` or war pipeline — when `coha_active` is true, **suppress all combat resolution**. No attacks resolve. This is the flag's entire purpose: a ceasefire that mechanically stops fighting.
- `src/sim/combat/bot_corps_ai.ts` — when `coha_active` is true, all corps directives forced to `defensive` stance. No offensive operations launched.
- `src/sim/combat/frontline_attrition.ts` — when `coha_active` is true, frontline attrition suspended.

**Implementation:** Engine reads in 3 locations. High calibration impact — see Section 5.

---

### 1.14 `rrf_deployed` (set by `rapid_reaction_force_1995`)

**Downstream event consumers:**
- `second_markale_massacre_1995` — add pressure modifier: if `rrf_deployed`, +2.0 rate bonus (RRF presence means international community has escalation capacity)
- `nato_deliberate_force_1995` — add condition: `flag_equals: rrf_deployed = true` (Deliberate Force requires RRF infrastructure on Mount Igman)

**Engine system consumers:**
- `src/sim/combat/enclave_resilience.ts` — when `rrf_deployed` is true, Sarajevo enclave resilience growth rate increases by 1.5x (psychological + material support from RRF presence)

**Implementation:** Event conditions + one engine read.

---

### 1.15 `dayton_signed` (set by `dayton_signed_1995`)

**Engine system consumers (PRIMARY):**
- `src/sim/turn_pipeline.ts` — when `dayton_signed` is true, the sim enters **endgame state**. Combat suppressed. Final scoring computed. This is the game-ending flag.
- The ceasefire_1995 event (w183) already precedes Dayton. `dayton_signed` is the definitive "game over" marker for the verdict screen.

**Implementation:** Pipeline check at top of `runTurn()`. If `dayton_signed`, skip all war phases, emit final state.

---

### 1.16 Remaining Flags (lower priority, wire as pressure modifiers)

| Flag | Set by | Wired to |
|------|--------|----------|
| `kupres_recaptured` | `operation_cincar_1994` | Pressure modifier on `bihac_5th_corps_offensive_1994` (+0.5 — HVO-RBiH cooperation success emboldens 5th Corps) |
| `carter_ceasefire_active` | `carter_ceasefire_1994` | Gate on `coha_ceasefire_begins_1995` (Carter ceasefire is precursor to COHA) |
| `operation_flash_occurred` | `operation_flash_1995` | Pressure modifier on `un_hostage_crisis_1995` (+1.0 — Flash provokes RS retaliation) |
| `un_hostage_crisis_occurred` | `un_hostage_crisis_1995` | Gate on `rapid_reaction_force_1995` (hostage crisis is the political catalyst for RRF) |
| `grahovo_glamoc_captured` | `operation_summer_95` | Pressure modifier on `operation_storm_1995` (+3.0 — Grahovo/Glamoc capture opens Knin axis) |
| `karadzic_mladic_crisis_occurred` | `karadzic_mladic_split_1995` | Pressure modifier on RS `internal_cohesion` dimension decay; gate on RS acceptance at Dayton |
| `jajce_recaptured` | `operation_mistral_2_1995` | Pressure modifier on `us_halts_federation_advance_1995` (+1.0 — Jajce recapture alarms US about 51/49 split) |
| `operation_sana_occurred` | `operation_sana_1995` | Pressure modifier on `us_halts_federation_advance_1995` (+1.5 — deep Krajina penetration triggers halt) |
| `advance_halted` | `us_halts_federation_advance_1995` | Gate on `ceasefire_1995` (halt is precursor to ceasefire) |

---

## 2. FIXED to CONDITIONAL Conversions

### 2.1 `srebrenica_falls_1995` (currently fixed at w170)

**Current:** `turn_min: 170, turn_max: 170`, no conditions.

**Proposed:** Convert to conditional with pressure system.

```json
{
  "trigger": {
    "turn_min": 160,
    "turn_max": 185,
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "flag_equals", "flag": "srebrenica_enclave_formed", "value": true },
        { "type": "flag_equals", "flag": "srebrenica_demilitarized", "value": true },
        { "type": "enclave_supply_status", "municipality": "srebrenica", "status": "critical" }
      ]
    }
  },
  "pressure": {
    "base_rate": 1.0,
    "threshold": 8,
    "decay_rate": 0.5,
    "modifiers": [
      { "condition": { "type": "flag_equals", "flag": "coha_expired", "value": true }, "rate_bonus": 2.0 },
      { "condition": { "type": "flag_equals", "flag": "rrf_deployed", "value": true }, "rate_bonus": -0.5 },
      { "condition": { "type": "flag_equals", "flag": "un_hostage_crisis_occurred", "value": true }, "rate_bonus": 1.0 }
    ]
  }
}
```

**Threshold rationale:** base_rate 1.0, threshold 8 = fires after ~8 turns of sustained conditions. With COHA expired (+2.0), fires in ~3 turns. Without critical supply, doesn't fire at all. Window w160-w185 allows historical timing (w170) but permits delay if conditions aren't met.

**New flag needed:** `srebrenica_demilitarized` — set by `srebrenica_demilitarization_1993`.

**Calibration note:** HIGH IMPACT. Srebrenica fall triggers the entire late-war cascade (Zepa, Deliberate Force, ground offensive). Moving it conditional could delay or prevent events that currently drive the endgame. Must regression-test the full 200w scenario.

---

### 2.2 `second_markale_massacre_1995` (currently fixed at w177)

**Current:** `turn_min: 177, turn_max: 177`, no conditions.

**Proposed:** Convert to conditional.

```json
{
  "trigger": {
    "turn_min": 165,
    "turn_max": 190,
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "flag_equals", "flag": "sarajevo_siege_active", "value": true },
        { "type": "flag_equals", "flag": "rrf_deployed", "value": true }
      ]
    }
  },
  "pressure": {
    "base_rate": 0.8,
    "threshold": 6,
    "decay_rate": 0.3,
    "modifiers": [
      { "condition": { "type": "flag_equals", "flag": "coha_expired", "value": true }, "rate_bonus": 1.5 },
      { "condition": { "type": "war_crimes_above", "faction": "RS", "threshold": 8 }, "rate_bonus": 1.0 }
    ]
  }
}
```

**Threshold rationale:** Requires siege active + RRF deployed (political preconditions). Base rate 0.8, threshold 6 = ~8 turns. With COHA expired, ~4 turns. The massacre is somewhat stochastic — it's an artillery bombardment that could happen any time the siege is active, but the political conditions for it to trigger NATO response require RRF.

**Calibration note:** MEDIUM IMPACT. Markale gates Deliberate Force, which gates the ground offensive. Widening the window could shift the endgame by a few weeks.

---

### 2.3 `zepa_falls_1995` (currently fixed at w172)

**Current:** `turn_min: 172, turn_max: 172`, no conditions.

**Proposed:** Convert to conditional, dependent on Srebrenica.

```json
{
  "trigger": {
    "turn_min": 170,
    "turn_max": 190,
    "requires_events": ["srebrenica_falls_1995"],
    "condition": {
      "type": "flag_equals",
      "flag": "srebrenica_enclave_formed",
      "value": true
    }
  },
  "pressure": {
    "base_rate": 3.0,
    "threshold": 6,
    "decay_rate": 0.0
  }
}
```

**Threshold rationale:** After Srebrenica falls, Zepa follows rapidly (historically 2 weeks). High base_rate (3.0) with threshold 6 = fires ~2 turns after Srebrenica. No decay — once Srebrenica is gone, Zepa is inevitable.

**Calibration note:** LOW IMPACT if Srebrenica fires on schedule. Zepa has few downstream dependents.

---

### 2.4 Other Conversion Candidates (lower priority)

| Event | Current | Proposed Condition | Priority |
|-------|---------|-------------------|----------|
| `bihac_crisis_1994` | Fixed w135 | `flag_equals: bihac_breakout_occurred` | Medium |
| `nato_deliberate_force_1995` | Fixed w177 | `flag_equals: rrf_deployed` AND `requires_events: [second_markale_massacre_1995]` | High |
| `federation_ground_offensive_1995` | Fixed w179 | `requires_events: [nato_deliberate_force_1995, washington_agreement_1994]` | High |
| `ceasefire_1995` | Fixed w183 | `flag_equals: advance_halted` | Medium |
| `dayton_talks_begin_1995` | Fixed w186 | `requires_events: [ceasefire_1995]` | Medium |
| `dayton_signed_1995` | Fixed w189 | `requires_events: [dayton_talks_begin_1995]` | Medium |

These form the **endgame chain**: Markale -> Deliberate Force -> Ground Offensive -> Halt -> Ceasefire -> Dayton. Making each link conditional means the endgame can shift if earlier events are delayed.

---

## 3. New Condition Types Needed

### 3.1 Already Implemented (in `event_types.ts`)

These condition types exist in the type system AND have working evaluators:

| Type | Status |
|------|--------|
| `territory_control` | Working |
| `alliance_below` / `alliance_above` | Working |
| `faction_controls_municipality` | Working |
| `and` / `or` / `not` | Working |
| `supply_below` / `supply_above` | Working |
| `territory_percentage` | Working |
| `dimension_above` / `dimension_below` | Working |
| `flag_equals` | Working |
| `flag_not_set` | Working |
| `patron_pressure_above` | Working |
| `war_crimes_above` | Working |
| `morale_average_below` | Working |
| `week_since_event` | Working |
| `event_fire_count` | Working |

### 3.2 Declared But Not Implemented (placeholder `return false`)

| Type | Needed For | Implementation |
|------|-----------|---------------|
| `enclave_supply_status` | `srebrenica_falls_1995` conditional | Read from enclave supply system in `supply_reserves.ts`. Map municipality to enclave, check supply level against adequate/strained/critical thresholds. |
| `corridor_severed` | RS supply conditional (future) | BFS from `from_osid` to `to_osid` through faction-controlled territory. Use existing `political_controllers` + OSID adjacency graph. |
| `siege_active` | Sarajevo events (optional) | Check if municipality/OSID is in an enclave with `supply_status !== 'adequate'`. Alternatively, check if the SRK siege corps has the municipality surrounded. |
| `operation_completed` | Future operation-driven events | Check `state.military.completed_operations` or corps operation history for pattern match. |

### 3.3 New Types Required

| Type | Schema | Purpose | Implementation |
|------|--------|---------|---------------|
| `brigade_count_below` | `{ faction, threshold }` | Gate events on faction military collapse | Count active brigades for faction, compare to threshold |
| `artillery_in_zone` | `{ municipality, faction, min_count }` | Markale conditions (SRK artillery) | Count artillery pieces on brigades within municipality OSIDs |
| `ceasefire_active` | `{ }` (no params) | Combat suppression check | Check `coha_active` or `carter_ceasefire_active` in event_flags. Alternatively, a dedicated `state.military.ceasefire_active` boolean. |

**Recommendation:** Implement `enclave_supply_status` and `corridor_severed` first (needed for Srebrenica conditional). `brigade_count_below` and `artillery_in_zone` are lower priority and can be deferred to a follow-up.

### 3.4 Implementation Guide for Placeholder Evaluators

**`enclave_supply_status` — concrete implementation:**
- Location: `src/sim/events/event_types.ts`, case `'enclave_supply_status'` (currently returns false)
- Data source: `state.political.last_supply_state_by_osid` — a `Record<string, string>` mapping OSID → supply level ('adequate'/'strained'/'critical')
- Algorithm: (1) Find all OSIDs in the target municipality: filter keys of `last_supply_state_by_osid` where `osid.split(':')[1] === condition.municipality`. (2) Compute dominant supply state: if ANY OSID is at the target status or worse, return true. Ordering: adequate < strained < critical.
- Type already defined in `event_types.ts` line 33: `{ type: 'enclave_supply_status'; municipality: string; status: 'adequate' | 'strained' | 'critical' }`
- Supply level type: `SupplyStateLevel` from `src/state/supply_state_derivation.ts`
- Test: create a minState with `political.last_supply_state_by_osid` containing 3 OSIDs for 'srebrenica', set two to 'strained' and one to 'critical', assert `enclave_supply_status` with `status: 'critical'` returns true.

**`corridor_severed` — concrete implementation:**
- Location: `src/sim/events/event_types.ts`, case `'corridor_severed'` (currently returns false)
- Data source: `state.political.political_controllers` — `Record<string, FactionId>` mapping OSID → controlling faction
- Adjacency: import `buildOsidAdjacency` from `src/sim/combat/osid_adjacency.ts` (returns `Map<string, string[]>`)
- Algorithm: BFS from `condition.from_osid` to `condition.to_osid`, only traversing OSIDs where `political_controllers[osid] === condition.faction`. If no path found, corridor is severed → return true.
- Note: `buildOsidAdjacency` needs the operational contact graph. Pass `state.derived?.osid_adjacency` if cached, or build from `state.map.edges`. Check what `evaluateCondition` receives — it gets the full GameState.
- Test: create a minState with a linear chain of 5 OSIDs (A→B→C→D→E). Set A,B,D,E to RBiH and C to RS. Assert `corridor_severed` from A to E for RBiH returns true. Then set C back to RBiH, assert returns false.

---

## 4. Test Plan

### 4.1 Unit Tests — Condition Evaluators

For each new/fixed condition evaluator, add tests in `src/sim/events/__tests__/`:

```
test: enclave_supply_status returns true when enclave supply is critical
test: enclave_supply_status returns false when enclave supply is adequate
test: corridor_severed returns true when BFS finds no path
test: corridor_severed returns false when path exists
test: brigade_count_below returns true when faction has fewer brigades
```

Scaffold: create minimal GameState with targeted fields, call `evaluateCondition()`, assert boolean.

**Target:** 15-20 new tests for condition evaluators.

### 4.2 Unit Tests — Flag Consumption in Engine Systems

For each engine system that reads `event_flags`:

```
test: supply_reserves applies 0.6x RBiH patron aid when arms_embargo_active
test: supply_reserves applies 1.3x RS patron aid when corridor_secured
test: patron_pressure adds +2/turn for RS when drina_cleansing_occurred
test: patron_pressure adds +3/turn for RS when camps_revealed
test: attack_resolution skips combat when coha_active
test: bot_corps_ai forces defensive when coha_active
test: turn_pipeline stops war phases when dayton_signed
```

Scaffold: create minimal GameState with `event_flags` set, run the system function, assert output changes.

**Target:** 10-15 new tests for engine flag reads.

### 4.3 Integration Tests — Event Chain Firing

For each major chain, create a focused scenario test:

```
test: Srebrenica arc — setting enclave_formed flag enables all downstream Srebrenica events
test: Endgame chain — Markale -> Deliberate Force -> Ground Offensive fires in sequence
test: COHA ceasefire — coha_active suppresses combat, coha_expired re-enables it
test: Camp revelation -> London Conference chain fires when camps_revealed + patron_pressure
test: Bihac arc — breakout flag gates crisis event
```

Scaffold: use `evaluateEvents()` with a mock registry of 3-5 events, advance state through the chain, assert each event fires in correct order.

**Target:** 8-10 chain integration tests.

### 4.4 Regression — Scenario Runs

After all wiring:

1. `npm run sim:scenario:run:40w` — verify 91.5% area-weighted baseline holds (tolerance: +/- 1.0pp)
2. `npm run sim:scenario:run:default` (52w) — verify event firing order matches historical sequence
3. Full 200w scenario (if available) — verify endgame chain fires and Dayton event triggers

**Key anchors to verify:** zepa_2=RBiH, vitinica_2=RBiH, derventa_2=RS, all 4 enclaves intact at w40.

---

## 5. Calibration Impact Assessment

### 5.1 HIGH IMPACT (regression test required)

| Wiring | Risk | Mitigation |
|--------|------|------------|
| `coha_active` combat suppression | Stops ALL combat for ~17 turns (w139-w156). Massive territory freeze. | Run 200w scenario before/after. Verify endgame territory split. |
| `arms_embargo_active` supply throttle | 0.6x RBiH patron aid changes entire RBiH equipment trajectory | Run 40w calibration. Compare RBiH equipment totals at w40. Adjust multiplier if needed. |
| `corridor_secured` RS supply boost | 1.3x RS supply changes RS sustainability | Run 40w calibration. Compare RS supply levels at w40. |
| `srebrenica_falls_1995` conditional | If conditions aren't met, entire endgame chain doesn't fire | Test with 200w scenario. Verify Srebrenica still falls within w165-w180 window. |
| `dayton_signed` game-end | Pipeline halt must work correctly | Verify verdict screen still triggers. |

### 5.2 MEDIUM IMPACT (spot-check required)

| Wiring | Risk |
|--------|------|
| `drina_cleansing_occurred` patron pressure boost | RS patron pressure accumulates faster, may shift negotiation capital |
| `camps_revealed` patron pressure boost | Compounds with drina_cleansing; verify RS patron pressure doesn't hit cap too early |
| `hvo_arbih_tensions_rising` alliance decay | Alliance may reach war threshold earlier than calibrated |
| `second_markale_massacre_1995` conditional | If delayed, Deliberate Force delays, ground offensive delays |

### 5.3 LOW IMPACT (no regression needed)

| Wiring | Reason |
|--------|--------|
| Flag gates on Srebrenica arc events (1993) | Events already fire in correct window; gates add safety, not change timing |
| `sarajevo_siege_active` gates | Siege always active in historical scenario; gates are confirmatory |
| `mostar_liberated` gates | Mostar always liberated in historical scenario |
| Pressure modifiers with small bonuses (+0.5) | Marginal acceleration within existing windows |

---

## 6. Implementation Order

### Phase 1: Infrastructure (1 session)
1. Implement `enclave_supply_status` evaluator (needed for Srebrenica conditional)
2. Implement `corridor_severed` evaluator (needed for RS supply conditional)
3. Add unit tests for both
4. Run smoke-test triad

### Phase 2: Event JSON Wiring — Gates (1 session)
1. Add `flag_equals` conditions to all gate-only wirings (Sections 1.3, 1.4, 1.5, 1.6)
2. Add `requires_events` chains to endgame sequence (Section 2.4)
3. Add `srebrenica_demilitarized` flag to `srebrenica_demilitarization_1993`
4. Run full event chain integration tests
5. Run 40w calibration — expect no change (gates are confirmatory)

### Phase 3: Event JSON Wiring — Pressure Modifiers (1 session)
1. Add pressure modifiers for acceleration wirings (Sections 1.7, 1.9, 1.10, 1.11, 1.16)
2. Convert pressure-eligible events that still use pure turn triggers
3. Run integration tests for pressure-driven chains
4. Run 40w calibration — expect no change (modifiers are within existing windows)

### Phase 4: Engine System Reads (1-2 sessions, one change at a time)
1. `coha_active` combat suppression — implement + test + calibrate
2. `arms_embargo_active` supply throttle — implement + test + calibrate
3. `corridor_secured` RS supply boost — implement + test + calibrate
4. `drina_cleansing_occurred` + `camps_revealed` patron pressure — implement + test
5. `dayton_signed` pipeline halt — implement + test
6. Each change: one calibration run, compare, sign off (sacred rule)

### Phase 5: FIXED-to-CONDITIONAL Conversions (1-2 sessions)
1. `srebrenica_falls_1995` — convert + full regression
2. `second_markale_massacre_1995` — convert + spot check
3. `zepa_falls_1995` — convert (low risk)
4. Endgame chain conditionals — convert + full regression
5. Run 200w scenario end-to-end

### Phase 6: Cleanup (0.5 session)
1. Verify zero orphan flags remain (run flag audit script)
2. Update EVENT_DEPENDENCY_GRAPH.md
3. Update PROJECT_LEDGER.md
4. Run full test suite

**Estimated total:** 5-7 sessions.

---

## 7. Flag Audit Script

Run after implementation to verify zero orphan flags:

```bash
node -e "
const fs=require('fs');
const dir='data/scenarios/events';
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
const setFlags=new Set(), consumedFlags=new Set();
for(const f of files){
  const events=JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'));
  for(const e of (Array.isArray(events)?events:events.events||[])){
    // Flags set by event or response options
    if(e.sets_flags) Object.keys(e.sets_flags).forEach(k=>setFlags.add(k));
    if(e.response_options) for(const r of e.response_options)
      if(r.sets_flags) Object.keys(r.sets_flags).forEach(k=>setFlags.add(k));
    // Flags consumed in conditions (recursive)
    const scan=c=>{if(!c)return;
      if(c.type==='flag_equals'||c.type==='flag_not_set')consumedFlags.add(c.flag);
      if(c.conditions)c.conditions.forEach(scan);
      if(c.condition)scan(c.condition);
      if(c.type==='and'||c.type==='or')c.conditions?.forEach(scan);
    };
    scan(e.trigger?.condition);
    // Pressure modifiers
    if(e.pressure?.modifiers) for(const m of e.pressure.modifiers) scan(m.condition);
  }
}
const orphans=[...setFlags].filter(f=>!consumedFlags.has(f));
console.log('Set:',setFlags.size,'Consumed:',consumedFlags.size,'Orphan:',orphans.length);
if(orphans.length) console.log('ORPHANS:',orphans.join(', '));
else console.log('ALL FLAGS WIRED');
"
```

**Acceptance criterion:** `Orphan: 0` — plus grep of `src/` for `event_flags` shows engine reads for all engine-consumed flags.
