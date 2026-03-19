# HRHB-RBiH War Transition System — Emergent Alliance Breakdown

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded "war starts at week X" with an emergent, condition-driven transition system where the Croat-Bosniak war arises from accumulated tensions, events, and player/bot choices — with a 4-week mobilization buildup before open combat.

**Architecture:** The alliance value (already continuous -1 to +1) drives everything. New alliance phase `'mobilizing'` (0.00–0.20) creates a 4-week window where front edges appear and sectors form, but combat is suppressed. Events use `condition` triggers (alliance thresholds, territorial control) instead of hardcoded turn numbers. Player decisions during events accelerate or delay the breakdown. Bot factions react to the mobilization phase with force redeployment.

**Tech Stack:** TypeScript sim engine, JSON event definitions, existing alliance/event/sector systems.

---

## Design Principles

1. **No hardcoded dates.** Events have turn windows but fire based on state conditions (alliance below X, territory control, prior events). The Gornji Vakuf clashes don't fire at "week 40" — they fire when alliance drops below 0.45 AND HRHB controls Gornji Vakuf territory.
2. **Player agency matters.** Decision events let the player accelerate or resist the breakdown. Accepting the Vance-Owen Plan as RBiH accelerates HVO aggression. Rejecting it buys time but costs international credibility.
3. **One-month buildup.** When alliance enters `'mobilizing'` phase (0.00–0.20): front edges appear between HRHB and RBiH, sectors form, brigades redeploy to the new front — but attacks are suppressed for 4 turns. Both sides can see the war coming.
4. **Consequences cascade.** The Ahmici massacre doesn't fire because "it's week 54." It fires when HRHB aggression crosses a threshold AND the war has started AND HRHB controls Vitez. If the player (as HRHB) doesn't attack Vitez, Ahmici doesn't happen.

---

## Phase 0: Prerequisites (fix existing issues)

### Task 0.1: Fix HVO stale commander IDs (#38)

**Files:**
- Modify: `data/scenarios/apr1992_officers.json`

Blaskic must command `hvo_central_bosnia` (not `hvo_oz_central_bosnia`). Map all `hvo_oz_*` to current `hvo_*` corps IDs:
- `hvo_oz_central_bosnia` → `hvo_central_bosnia`
- `hvo_oz_se_herzegovina` → `hvo_southeast_herzegovina`
- `hvo_oz_posavina` → `hvo_northwest_bosnia`
- `hvo_oz_nw_herzegovina` → `hvo_tomislavgrad`

**Step 1:** Find and replace stale IDs in officer data.
**Step 2:** Run `npm run test:vitest` — verify no breakage.
**Step 3:** Commit: `fix(data): map stale hvo_oz_* officer corps IDs to current hvo_* IDs`

### Task 0.2: Verify hvo_central_bosnia sector creation when fronts appear

**Files:**
- Read: `src/sim/combat/corps_front_sectors.ts`
- Read: `src/sim/combat/corps_sector_partition.ts`

Investigate: when HRHB-RBiH front edges appear, does `hvo_central_bosnia` get sectors? Currently it has 0 sectors because its brigades face no enemy front edges (HRHB and RBiH are allies). Once fronts appear, the sector system should automatically create sectors for those brigades. Verify this with a test.

**Step 1:** Write a test that sets alliance below hostile threshold, creates HRHB-RBiH front edges, and verifies `hvo_central_bosnia` gets sectors.
**Step 2:** If it fails, trace through `partitionCorpsFrontSectors` to find where hvo_central_bosnia is excluded.
**Step 3:** Commit fix or verification.

---

## Phase 1: New Alliance Phase — `'mobilizing'`

### Task 1.1: Add `'mobilizing'` phase to alliance system

**Files:**
- Modify: `src/sim/early_war/alliance_update.ts`
- Test: `tests/alliance_update.test.ts`

Add a new phase between `'fragile_alliance'` and `'strained'`:

```
strong_alliance (>0.50) → fragile_alliance (>0.20) → mobilizing (>0.00) → strained (>-0.20) → open_war (>-0.50) → full_war
```

Wait — simpler: **rename the transition**. Currently:
- `>0.20` = allied (no fronts)
- `≤0.20 to >0.00` = "strained" (but front edges DON'T appear until ≤0.00)
- `≤0.00` = hostile (fronts appear, combat enabled)

New model:
- `>0.20` = allied (no fronts, same as now)
- `≤0.20 to >0.00` = **`'mobilizing'`** — front edges appear, sectors form, **combat suppressed for 4 turns** after entering this phase
- `≤0.00` = open war (full combat)

The key change: **front edges appear at ≤0.20 (mobilizing), not ≤0.00 (war).**

**Constants to add:**
```typescript
export const MOBILIZATION_THRESHOLD = 0.20; // same as ALLIED_THRESHOLD
export const MOBILIZATION_DURATION_TURNS = 4; // 1 month buildup
```

**State to add to `RbihHrhbState`:**
```typescript
mobilization_started_turn: number | null; // turn when alliance first dropped to mobilizing
```

**New queries:**
```typescript
export function isRbihHrhbMobilizing(state: GameState): boolean;
export function isRbihHrhbCombatEnabled(state: GameState): boolean;
```

`isRbihHrhbCombatEnabled` returns true when: alliance ≤ 0.00 (organic war start) OR mobilization_started_turn + MOBILIZATION_DURATION_TURNS ≤ current_turn.

**Step 1:** Write failing test — `isRbihHrhbMobilizing` returns true when alliance at 0.15.
**Step 2:** Implement new phase, state field, queries.
**Step 3:** Write test — `isRbihHrhbCombatEnabled` returns false during first 4 turns of mobilization.
**Step 4:** Run full test suite.
**Step 5:** Commit: `feat(sim): mobilizing alliance phase — 4-turn buildup before HRHB-RBiH combat`

### Task 1.2: Update front edge generation to use mobilizing threshold

**Files:**
- Modify: `src/map/front_edges.ts`
- Modify: `src/sim/combat/compute_front_edges_osid.ts` (if separate)
- Test: `tests/front_edges.test.ts`

Change the gate from:
```typescript
if (beforeWar || areRbihHrhbAllied(state)) continue;
```
To:
```typescript
if (beforeWar || !isRbihHrhbMobilizing(state) && areRbihHrhbAllied(state)) continue;
```

Actually simpler — front edges appear when NOT allied (≤0.20). The `areRbihHrhbAllied` check already uses ALLIED_THRESHOLD=0.20. So front edges appear at the mobilizing threshold automatically. But we need to also update the `earliestWar` guard:

```typescript
// Old: front edges only after rbih_hrhb_war_earliest_turn AND not allied
// New: front edges after earliest_turn AND (mobilizing OR at war)
if (turn < earliestWar) continue;
if (areRbihHrhbAllied(state)) continue; // ≤0.20 passes through (not allied)
```

Wait — this is **already correct**. `areRbihHrhbAllied` returns false when value ≤ 0.20. So front edges already appear at ≤0.20. The current behavior is that combat also starts immediately. The only change needed is **suppressing combat during mobilization** (Task 1.3), not changing front edge generation.

Verify this with a test:
**Step 1:** Test that front edges appear between HRHB-RBiH when alliance = 0.15 and turn ≥ earliest.
**Step 2:** Confirm existing behavior matches the new design.
**Step 3:** Commit verification test.

### Task 1.3: Suppress HRHB-RBiH combat during mobilization

**Files:**
- Modify: `src/sim/combat/attack_resolution_osid.ts`
- Modify: `src/sim/combat/bot_brigade_eval_attack.ts`
- Modify: `src/sim/combat/bot_corps_directives.ts`
- Test: `tests/mobilization_combat_suppression.test.ts`

During the mobilization period (4 turns), HRHB and RBiH brigades:
- CAN see each other's front edges (sectors form)
- CAN be assigned to sectors facing the other faction
- CANNOT attack each other (combat suppressed)
- CAN defend if attacked (unlikely during mobilization — both sides suppressed)

Implementation: use `isRbihHrhbCombatEnabled(state)` as a gate in:
1. `bot_brigade_eval_attack.ts` — filter out HRHB targets when attacker is RBiH (and vice versa) unless combat enabled
2. `bot_corps_directives.ts` — suppress offensive target generation against the other faction unless combat enabled
3. `attack_resolution_osid.ts` — if an attack somehow gets through, check combat enabled before resolving

**Step 1:** Write test — during mobilization, HRHB brigade eval_attack returns no RBiH targets.
**Step 2:** Implement gates.
**Step 3:** Write test — after mobilization expires, targets appear.
**Step 4:** Run full suite.
**Step 5:** Commit: `feat(sim): suppress HRHB-RBiH combat during 4-turn mobilization buildup`

---

## Phase 2: Condition-Driven Events

### Task 2.1: Convert hardcoded events to condition-triggered

**Files:**
- Modify: `data/scenarios/events/war_1993.json`

Replace `turn_min`/`turn_max` with `condition` triggers. The events already support conditions (see `EventCondition` types: `alliance_below`, `territory_control`, `faction_controls_municipality`, etc.).

**Gornji Vakuf Clashes** — currently fires at turn 40 (hardcoded):
```json
{
  "id": "gornji_vakuf_clashes_1993",
  "trigger": {
    "turn_min": 35,
    "turn_max": 55,
    "phase": "war",
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "alliance_below", "value": 0.45 },
        { "type": "faction_controls_municipality", "faction": "HRHB", "municipality": "gornji_vakuf", "threshold": 0.3 }
      ]
    }
  },
  "once": true,
  "requires_player_response": true,
  "response_options": [
    {
      "id": "escalate",
      "label": "Respond with force",
      "description": "Send reinforcements to Gornji Vakuf. Escalates the confrontation.",
      "effects": [
        { "kind": "alliance_change", "delta": -0.20 },
        { "kind": "morale_change", "faction": "HRHB", "delta": 3 }
      ]
    },
    {
      "id": "negotiate",
      "label": "Seek a local ceasefire",
      "description": "Attempt to contain the fighting. De-escalates but shows weakness.",
      "effects": [
        { "kind": "alliance_change", "delta": -0.05 },
        { "kind": "morale_change", "faction": "HRHB", "delta": -2 }
      ]
    }
  ]
}
```

**Croat-Bosniak War Begins** — currently fires at turn 54 (hardcoded). Make it emergent:
```json
{
  "id": "croat_bosniak_war_begins_1993",
  "trigger": {
    "turn_min": 40,
    "turn_max": 80,
    "phase": "war",
    "condition": {
      "type": "and",
      "conditions": [
        { "type": "alliance_below", "value": 0.10 },
        { "type": "or", "conditions": [
          { "type": "alliance_below", "value": 0.00 },
          { "type": "faction_controls_municipality", "faction": "HRHB", "municipality": "vitez", "threshold": 0.5 },
          { "type": "faction_controls_municipality", "faction": "HRHB", "municipality": "busovaca", "threshold": 0.5 }
        ]}
      ]
    }
  },
  "once": true,
  "effect": { "kind": "alliance_change", "delta": -0.5 }
}
```

This means: war begins when alliance is already near-hostile (<0.10) AND either it crosses 0.00 organically, or HRHB moves to control Vitez/Busovaca (Vance-Owen provincial grab). The turn window (40-80) provides historical bounds — it can't fire before October 1992 or after summer 1994.

**Ahmici Massacre** — fires only if war has begun AND HRHB controls Vitez:
```json
{
  "id": "ahmici_massacre_1993",
  "trigger": {
    "turn_min": 40,
    "turn_max": 70,
    "phase": "war",
    "requires_events": ["croat_bosniak_war_begins_1993"],
    "condition": {
      "type": "faction_controls_municipality", "faction": "HRHB", "municipality": "vitez", "threshold": 0.5
    }
  },
  "once": true,
  "effect": { "kind": "humanitarian_impact", "faction": "HRHB", "war_crimes_delta": 3 }
}
```

**Step 1:** Rewrite events in `war_1993.json` with condition triggers and player decision options.
**Step 2:** Add response options to key events (Gornji Vakuf, Vance-Owen, Croat-Bosniak War declaration) — player choices accelerate or delay the breakdown.
**Step 3:** Run event timeline integrity test — update expected count.
**Step 4:** Commit: `feat(events): condition-driven HRHB-RBiH war events — emergent triggers, player decisions`

### Task 2.2: Verify `evaluateCondition` handles all needed condition types

**Files:**
- Read: `src/sim/events/event_types.ts` (triggerMatches, evaluateCondition)

Verify that `alliance_below`, `faction_controls_municipality`, `and`, `or`, `not` all work correctly. If `faction_controls_municipality` doesn't exist or doesn't work with OSID-keyed controllers, implement it.

**Step 1:** Write tests for each condition type used in the new events.
**Step 2:** Fix any missing implementations.
**Step 3:** Commit.

---

## Phase 3: Bot Mobilization Behavior

### Task 3.1: HRHB bot reacts to mobilization phase

**Files:**
- Modify: `src/sim/combat/bot_strategy.ts`
- Modify: `src/sim/combat/bot_corps_directives.ts`

When `isRbihHrhbMobilizing(state)` is true, HRHB corps facing RBiH front edges should:
1. Switch stance from `balanced` → `defensive` (protect positions, don't provoke)
2. Begin brigade redeployment toward the new RBiH front edges (sector assignment handles this automatically once sectors form)
3. HVO Central Bosnia should activate its sector creation (this happens automatically when front edges appear)

For the bot, the key behavior is: **during mobilization, adopt defensive posture on the new RBiH-facing sectors while maintaining existing RS-facing posture.**

**Step 1:** In `bot_corps_stance.ts`, add mobilization-aware stance for HRHB corps with RBiH-facing sectors.
**Step 2:** Test: HRHB corps stance changes to defensive during mobilization.
**Step 3:** Commit: `feat(bot): HRHB defensive posture during mobilization buildup`

### Task 3.2: RBiH bot reacts to mobilization phase

**Files:**
- Modify: `src/sim/combat/bot_strategy.ts`
- Modify: `src/sim/combat/bot_corps_directives.ts`

When mobilizing, RBiH corps with HRHB-facing sectors should:
1. Set stance to `defensive` on HRHB-facing sectors
2. Maintain `balanced`/`offensive` on RS-facing sectors (the primary war continues)
3. Begin redistributing forces — central Bosnia corps (3rd, 4th) need brigades redeployed toward HRHB borders

**Step 1:** Add mobilization-aware stance split for RBiH corps.
**Step 2:** Test: 3rd Corps gets defensive stance on HRHB-facing sectors during mobilization.
**Step 3:** Commit: `feat(bot): RBiH defensive posture on HRHB fronts during mobilization`

---

## Phase 4: Integration & Calibration

### Task 4.1: 56-week scenario for transition testing

**Files:**
- Create: `data/scenarios/apr1992_definitive_56w.json` (copy from 52w, extend to 56 weeks)

Extend the scenario to cover the full mobilization + first 2 weeks of combat. 56 weeks = April 1992 → June 1993.

**Step 1:** Copy 52w scenario, change duration to 56.
**Step 2:** Run and verify events fire at expected conditions.
**Step 3:** Commit.

### Task 4.2: Run 56w scenario and verify transition

**Verification checklist:**
- [ ] Alliance decays organically from 0.75 toward hostile range
- [ ] Gornji Vakuf event fires when alliance < 0.45 (not at hardcoded turn)
- [ ] Player decision in Gornji Vakuf event affects alliance trajectory
- [ ] Front edges appear between HRHB and RBiH when alliance ≤ 0.20
- [ ] `hvo_central_bosnia` gets sectors once front edges exist
- [ ] 4-turn mobilization period — no HRHB-RBiH combat during buildup
- [ ] Brigades redeploy toward new front during mobilization
- [ ] Combat begins after mobilization expires
- [ ] Ahmici fires only if HRHB controls Vitez AND war has begun

### Task 4.3: Calibration run and War-or-Game sign-off

Run `/war-or-game` on the 56w output. Verify:
- Does the war start at a historically plausible time? (April-June 1993 = w52-58)
- Are the forces deployed where they should be when fighting starts?
- Does the three-way war look like the real thing?

---

## Summary of New State Fields

```typescript
// On RbihHrhbState (existing interface):
mobilization_started_turn: number | null;  // NEW: when mobilization phase began
```

## Summary of New/Modified Queries

```typescript
// alliance_update.ts:
isRbihHrhbMobilizing(state): boolean;      // NEW: alliance in [0.00, 0.20]
isRbihHrhbCombatEnabled(state): boolean;   // NEW: mobilization expired OR alliance ≤ 0.00
```

## Files Modified

| File | Change |
|------|--------|
| `src/sim/early_war/alliance_update.ts` | New phase, queries, mobilization state |
| `src/map/front_edges.ts` | Verify — likely no change needed (already uses ALLIED_THRESHOLD) |
| `src/sim/combat/bot_brigade_eval_attack.ts` | Combat suppression gate |
| `src/sim/combat/bot_corps_directives.ts` | Combat suppression + mobilization stance |
| `src/sim/combat/bot_corps_stance.ts` | Mobilization-aware stance for HRHB+RBiH |
| `src/sim/combat/attack_resolution_osid.ts` | Safety gate for combat suppression |
| `data/scenarios/events/war_1993.json` | Condition-driven triggers, player decisions |
| `data/scenarios/apr1992_officers.json` | Fix hvo_oz_* stale IDs |
| `data/scenarios/apr1992_definitive_56w.json` | New test scenario |
| `tests/alliance_update.test.ts` | New mobilization tests |
| `tests/mobilization_combat_suppression.test.ts` | New combat suppression tests |
| `tests/event_timeline_integrity.test.ts` | Updated event counts |

## Estimated Scope

- **Phase 0** (prerequisites): 2 tasks, small
- **Phase 1** (mobilization phase): 3 tasks, medium — core mechanic
- **Phase 2** (events): 2 tasks, medium — event redesign
- **Phase 3** (bot behavior): 2 tasks, small-medium
- **Phase 4** (integration): 3 tasks, medium — verification

Total: ~12 tasks across 4 phases. Each phase is independently testable and committable.
