# v0.6.0-beta Implementation Plan — 1992 Event Migration + Foundational Decisions

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all 18 1992 events with emergent-system equivalents. Add 3 foundational faction decisions. Add 2 new decision events (Drina cleansing, camp revelations). Calibrate.

**Architecture:** Modify `data/scenarios/events/war_1992.json` to use new v0.6.0 event fields (pressure, conditions, flags, dimensions). Add foundational decisions as new events. All infrastructure from v0.6.0-alpha is ready — this is content work.

**Tech Stack:** JSON event authoring, TypeScript, Vitest

**Prerequisites:** v0.6.0-alpha complete (pressure system, dimensions, flags, conditions, constraint bus all functional). ICTY research documents in `docs/research/`.

**Design spec:** `docs/plans/2026-03-21-emergent-event-system-design.md` §8, §14, §15
**Triage table:** Design spec §15.2

---

## Pre-flight

1. Read ICTY research: `docs/research/icty_rs_strategic_goals.md`, `docs/research/icty_rbih_state_identity.md`, `docs/research/icty_hrhb_political_goal.md`
2. Read current events: `data/scenarios/events/war_1992.json`
3. Verify build clean: `npx tsc --noEmit ; npm run test:vitest`
4. Verify baseline: run `npm run sim:scenario:run:40w` and note area-weighted % (should be ~93.1%)

---

## Phase 1: Cut Wallpaper Events (Task 1)

Remove 4 events that fail the delete test:

| ID | Reason |
|----|--------|
| `un_convoys_begin_1992` | Pure narrative, zero mechanical effect |
| `bihac_isolation_deepens_1992` | Pure narrative, engine detects isolation via supply BFS |
| `posavina_corridor_fighting_1992` | Grants RS +10 supply regardless of corridor state |
| `mostar_liberation_1992` | Tells you what your forces just did — will be reimplemented as condition-gated Consequence Event in Phase 3 |

**Step 1:** In `war_1992.json`, delete the 4 event objects.
**Step 2:** Run `npm run sim:scenario:run:40w` — note any calibration shift.
**Step 3:** Commit.

---

## Phase 2: Tweak Existing Events (Task 2)

Enhance 4 events that have good triggers but weak effects:

### 2a: Barracks Events (4 events)

Add to each barracks event:
- `dimension_shifts`: `[{ "faction": "RBiH", "dimension": "military_credibility", "delta": 5 }]`
- `sets_flags`: `{ "barracks_sarajevo_seized": true }` (etc. per city)
- Keep existing effects unchanged (equipment grants are correct)
- DO NOT convert to decision events yet — the timing choice is a v0.6.0 stretch goal

### 2b: Operation Corridor

Add to `operation_corridor_1992`:
- `dimension_shifts`: `[{ "faction": "RS", "dimension": "territorial_legitimacy", "delta": 10 }, { "faction": "RS", "dimension": "military_credibility", "delta": 5 }]`
- `sets_flags`: `{ "corridor_secured": true }`

### 2c: Jajce Falls

Add to `jajce_falls_1992`:
- `dimension_shifts`: `[{ "faction": "RBiH", "dimension": "internal_cohesion", "delta": -10 }, { "faction": "HRHB", "dimension": "internal_cohesion", "delta": -10 }, { "faction": "RS", "dimension": "military_credibility", "delta": 5 }]`
- `sets_flags`: `{ "jajce_fell": true }`

**Step 1:** Edit `war_1992.json` with the above additions.
**Step 2:** Run `npx tsc --noEmit ; npm run test:vitest` — must pass.
**Step 3:** Run `npm run sim:scenario:run:40w` — verify calibration stable.
**Step 4:** Commit.

---

## Phase 3: Rewrite Calendar Events to Emergent (Task 3)

Rewrite 6 events from calendar triggers to condition-gated. Each event gets a pressure config so it builds organically.

### 3a: Arms Embargo

Replace calendar `turn_min: 4` with:
```json
{
  "trigger": { "turn_min": 3, "turn_max": 6, "phase": "war" },
  "pressure": { "base_rate": 3.0, "threshold": 3, "decay_rate": 0.5 },
  "dimension_shifts": [
    { "faction": "RBiH", "dimension": "military_credibility", "delta": -10 },
    { "faction": "RBiH", "dimension": "international_standing", "delta": 5 }
  ],
  "sets_flags": { "arms_embargo_active": true }
}
```
Keep existing supply_delta effect. This is a Forced Event (exogenous — UN decision).

### 3b: JNA Withdrawal

Keep `turn_min: 5` (exogenous). Add:
```json
{
  "dimension_shifts": [
    { "faction": "RS", "dimension": "military_credibility", "delta": 15 }
  ],
  "sets_flags": { "jna_withdrawn": true }
}
```

### 3c: Sarajevo Siege Begins

Replace calendar with BFS-based condition. This needs a new condition — but `corridor_severed` is a placeholder. Conservative choice: use `territory_percentage` as proxy:
```json
{
  "trigger": {
    "turn_min": 4, "turn_max": 10, "phase": "war",
    "condition": { "type": "territory_percentage", "faction": "RS", "comparator": "above", "threshold": 0.45 }
  },
  "pressure": { "base_rate": 2.0, "threshold": 4, "decay_rate": 0.3 },
  "dimension_shifts": [
    { "faction": "RS", "dimension": "international_standing", "delta": -15 },
    { "faction": "RBiH", "dimension": "international_standing", "delta": 10 }
  ],
  "sets_flags": { "sarajevo_siege_active": true }
}
```
Strengthen effects: `patron_pressure` delta 5→15, add `war_crimes_delta` 1→3.

### 3d: Srebrenica Enclave Forms

Replace `turn_min: 10` with territory condition:
```json
{
  "trigger": {
    "turn_min": 6, "turn_max": 20, "phase": "war",
    "condition": { "type": "territory_percentage", "faction": "RS", "comparator": "above", "threshold": 0.48 }
  },
  "pressure": { "base_rate": 1.5, "threshold": 5, "decay_rate": 0.2 },
  "dimension_shifts": [
    { "faction": "RBiH", "dimension": "international_standing", "delta": 5 },
    { "faction": "RBiH", "dimension": "negotiating_leverage", "delta": 5 }
  ],
  "sets_flags": { "srebrenica_enclave_formed": true }
}
```

### 3e: HVO-ARBiH Tensions Rise

Replace `turn_min: 29` with alliance condition:
```json
{
  "trigger": {
    "turn_min": 20, "turn_max": 40, "phase": "war",
    "condition": { "type": "alliance_below", "value": 0.7 }
  },
  "pressure": { "base_rate": 1.0, "threshold": 5, "decay_rate": 0.5 },
  "dimension_shifts": [
    { "faction": "RBiH", "dimension": "internal_cohesion", "delta": -5 },
    { "faction": "HRHB", "dimension": "internal_cohesion", "delta": -5 }
  ],
  "sets_flags": { "hvo_arbih_tensions_rising": true }
}
```

### 3f: London Conference

Replace `turn_min: 21` with pressure-based:
```json
{
  "trigger": {
    "turn_min": 16, "turn_max": 30, "phase": "war",
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "war_crimes_above", "faction": "RS", "threshold": 2 },
        { "type": "patron_pressure_above", "faction": "RS", "threshold": 15 }
      ]
    }
  },
  "pressure": { "base_rate": 1.5, "threshold": 6, "decay_rate": 0.3 },
  "enables_events": ["vance_owen_plan_1993"]
}
```
Keep existing decision options. Add `dimension_shifts` to each option.

**Step 1:** Edit `war_1992.json` with all 6 rewrites.
**Step 2:** Run `npx tsc --noEmit ; npm run test:vitest` — must pass.
**Step 3:** Run `npm run sim:scenario:run:40w` — check calibration. Target: within 2pp of baseline.
**Step 4:** If regression > 2pp, adjust pressure thresholds to get events firing in similar windows.
**Step 5:** Commit.

---

## Phase 4: New Decision Events (Task 4)

### 4a: Drina Valley Ethnic Cleansing (RS Decision Event)

New event — fires when RS controls enough of the Drina valley. RS player chooses cleansing intensity.

```json
{
  "id": "drina_cleansing_1992",
  "title": "The Drina Valley Question",
  "narrative": "Your forces control much of the Drina valley. Reports from the field indicate paramilitary units are conducting operations against the civilian population. Your commanders request guidance on how to proceed.",
  "category": "humanitarian",
  "trigger": {
    "turn_min": 8, "turn_max": 30, "phase": "war",
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "territory_percentage", "faction": "RS", "comparator": "above", "threshold": 0.45 },
        { "type": "flag_equals", "flag": "rs_strategic_goals", "value": "all_six" }
      ]
    }
  },
  "pressure": { "base_rate": 1.0, "threshold": 4, "decay_rate": 0.2 },
  "once": true,
  "effect": { "kind": "narrative", "text": "" },
  "requires_player_response": true,
  "bot_response_logic": "historical",
  "response_options": [
    {
      "id": "systematic",
      "label": "Systematic cleansing",
      "description": "Full territorial consolidation. Maximum displacement. Your officers know what this means.",
      "effects": [
        { "kind": "humanitarian_impact", "faction": "RS", "war_crimes_delta": 5 },
        { "kind": "morale_change", "faction": "RS", "delta": 3 }
      ],
      "sets_flags": { "drina_cleansing_intensity": "systematic" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -25 },
        { "faction": "RS", "dimension": "internal_cohesion", "delta": 5 },
        { "faction": "RS", "dimension": "territorial_legitimacy", "delta": -10 }
      ],
      "aggression_affinity": 0.8,
      "risk_level": 0.7
    },
    {
      "id": "restrained",
      "label": "Military objectives only",
      "description": "Secure strategic positions. Protect Serb communities. Do not target civilians.",
      "effects": [
        { "kind": "humanitarian_impact", "faction": "RS", "war_crimes_delta": 1 }
      ],
      "sets_flags": { "drina_cleansing_intensity": "restrained" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -5 },
        { "faction": "RS", "dimension": "internal_cohesion", "delta": -10 },
        { "faction": "RS", "dimension": "military_credibility", "delta": -5 }
      ],
      "aggression_affinity": -0.5,
      "risk_level": 0.3
    }
  ],
  "historical_source": "ICTY Karadzic judgment, Strategic Goal 3 (Drina valley corridor)"
}
```

### 4b: Concentration Camps Revealed (RS Decision Event)

Rewrite existing `concentration_camps_revealed_1992` — convert from notification to RS decision:

```json
{
  "id": "concentration_camps_revealed_1992",
  "title": "The World Is Watching",
  "narrative": "International journalists have reached Prijedor. Television cameras are broadcasting images from Omarska and Trnopolje. The international community demands an explanation. Your response will shape how the world sees your cause.",
  "category": "humanitarian",
  "trigger": {
    "turn_min": 14, "turn_max": 30, "phase": "war",
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "faction_controls_municipality", "faction": "RS", "municipality": "prijedor", "threshold": 0.5 },
        { "type": "war_crimes_above", "faction": "RS", "threshold": 3 }
      ]
    }
  },
  "pressure": { "base_rate": 1.5, "threshold": 5, "decay_rate": 0.3 },
  "once": true,
  "effect": { "kind": "humanitarian_impact", "faction": "RS", "war_crimes_delta": 3 },
  "requires_player_response": true,
  "bot_response_logic": "historical",
  "enables_events": ["london_conference_1992"],
  "response_options": [
    {
      "id": "deny",
      "label": "Deny everything",
      "description": "These are transit centers. The footage is propaganda. Refuse access to investigators.",
      "effects": [
        { "kind": "patron_pressure", "faction": "RS", "delta": 20 }
      ],
      "sets_flags": { "camps_response": "deny" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -25 },
        { "faction": "RS", "dimension": "internal_cohesion", "delta": 5 }
      ],
      "aggression_affinity": 0.3,
      "risk_level": 0.8
    },
    {
      "id": "obstruct",
      "label": "Controlled access",
      "description": "Allow limited Red Cross visits. Move the worst cases. Buy time.",
      "effects": [
        { "kind": "patron_pressure", "faction": "RS", "delta": 10 }
      ],
      "sets_flags": { "camps_response": "obstruct" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -15 },
        { "faction": "RS", "dimension": "patron_confidence", "delta": -10 }
      ],
      "aggression_affinity": 0.0,
      "risk_level": 0.5
    },
    {
      "id": "cooperate",
      "label": "Full cooperation",
      "description": "Open all facilities. Release detainees. Cooperate with investigators. Your officers will see this as weakness.",
      "effects": [
        { "kind": "patron_pressure", "faction": "RS", "delta": 3 }
      ],
      "sets_flags": { "camps_response": "cooperate" },
      "dimension_shifts": [
        { "faction": "RS", "dimension": "international_standing", "delta": -5 },
        { "faction": "RS", "dimension": "military_credibility", "delta": -10 },
        { "faction": "RS", "dimension": "internal_cohesion", "delta": -5 }
      ],
      "aggression_affinity": -0.8,
      "risk_level": 0.2
    }
  ],
  "historical_source": "ICTY Karadzic judgment; ITN footage August 1992; BB Vol. I Ch. 9"
}
```

**Step 1:** Add both new events to `war_1992.json`.
**Step 2:** Run smoke test + 40w scenario.
**Step 3:** Commit.

---

## Phase 5: Foundational Decisions (Task 5)

**DEPENDS ON ICTY RESEARCH COMPLETION.** See `docs/research/icty_rs_strategic_goals.md`, `docs/research/icty_rbih_state_identity.md`, `docs/research/icty_hrhb_political_goal.md`.

### 5a: RS — The Six Strategic Goals

New event firing at w1-2. Three options: All Six Goals (historical), Selective Adoption, Aggressive Pursuit. Sets `rs_strategic_goals` flag. May set scope restrictions via event constraints.

Content to be authored from ICTY research. Placeholder structure:

```json
{
  "id": "rs_strategic_goals",
  "title": "The Assembly Speaks",
  "narrative": "[ICTY-sourced narrative about the May 12 Assembly session]",
  "category": "political",
  "trigger": { "turn_min": 1, "turn_max": 3, "phase": "war" },
  "pressure": { "base_rate": 5.0, "threshold": 5, "decay_rate": 0 },
  "once": true,
  "requires_player_response": true,
  "bot_response_logic": "historical",
  "response_options": "[3 options from ICTY research]",
  "historical_source": "ICTY Karadzic Trial Judgment (2016), paras [TBD]"
}
```

### 5b: RBiH — State Identity

New event firing at w2-4. Three options per design spec §8.3. Sets `rbih_state_identity` flag.

### 5c: HRHB — Political Goal

New event firing at w4-6. Three options per design spec §8.4. Sets `hrhb_political_goal` flag.

**Step 1:** Author all 3 events from ICTY research documents.
**Step 2:** Add to `war_1992.json`.
**Step 3:** Run smoke test + 40w scenario.
**Step 4:** Run each ahistorical path once — check plausibility bounds.
**Step 5:** Commit.

---

## Phase 6: Mostar Liberation Reimplementation (Task 6)

Re-add `mostar_liberation_1992` as a condition-gated Consequence Event (was cut in Phase 1):

```json
{
  "id": "mostar_liberation_1992",
  "title": "Mostar Liberated",
  "narrative": "Joint HVO-ARBiH forces have pushed JNA/VRS out of Mostar. The city is free — but the question of who controls it is already causing friction between your allies.",
  "category": "territorial",
  "trigger": {
    "turn_min": 6, "turn_max": 20, "phase": "war",
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "not", "condition": { "type": "faction_controls_municipality", "faction": "RS", "municipality": "mostar", "threshold": 0.3 } }
      ]
    }
  },
  "pressure": { "base_rate": 2.0, "threshold": 4, "decay_rate": 0.5 },
  "once": true,
  "effect": { "kind": "morale_change", "faction": "RBiH", "delta": 3 },
  "effects": [
    { "kind": "morale_change", "faction": "HRHB", "delta": 5 }
  ],
  "dimension_shifts": [
    { "faction": "HRHB", "dimension": "territorial_legitimacy", "delta": 10 },
    { "faction": "RBiH", "dimension": "military_credibility", "delta": 3 }
  ],
  "sets_flags": { "mostar_liberated": true }
}
```

**Step 1:** Add to `war_1992.json`.
**Step 2:** Run smoke test + 40w scenario.
**Step 3:** Commit.

---

## Phase 7: Final Calibration + War-or-Game (Task 7)

**Step 1:** Run `npm run sim:scenario:run:40w`. Target: within 2pp of 93.1% baseline.
**Step 2:** Run comparison tool: `node tools/compare_painted_vs_sim.cjs <run_dir>`.
**Step 3:** If within tolerance, invoke /war-or-game for sign-off.
**Step 4:** If regression > 2pp, identify which migrated event fires at wrong time. Adjust pressure thresholds.
**Step 5:** Record in CALIBRATION_MASTER.md.
**Step 6:** Update ledger, napkin.
**Step 7:** Final commit.

---

## Task Summary

| # | Phase | Task | Depends On |
|---|-------|------|------------|
| 1 | Cut wallpaper | Remove 4 events | — |
| 2 | Tweak existing | Enhance 5 events with dimensions/flags | Task 1 |
| 3 | Rewrite calendar | 6 events → emergent triggers + pressure | Task 2 |
| 4 | New decisions | Drina cleansing + camps revealed | Task 3 |
| 5 | Foundational | RS goals + RBiH identity + HRHB goal | ICTY research |
| 6 | Mostar reimpl | Condition-gated liberation event | Task 1 |
| 7 | Calibration | 40w run + War-or-Game sign-off | All above |

**Total: 7 phases. ~20 events in final 1992 set (14 migrated + 3 foundational + 2 new + 1 reimplemented).**
