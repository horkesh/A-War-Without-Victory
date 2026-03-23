# v0.9.0 -- Consequence System -- Implementation Plan

**Date:** 2026-03-24
**Status:** DRAFT -- ready for review
**Scope:** When the player makes ahistorical choices, realistic consequences follow
**Prerequisites:** v0.7.0 (flag wiring), v0.8.x (command chain / political leader bot)
**Estimated effort:** 8-12 sessions

---

## 0. Design Philosophy

The Consequence System is the payoff for every prior version. v0.6 built 94 events. v0.7 wired flags to engine systems. v0.8 gave non-player factions a political brain. v0.9 makes all of it matter: **ahistorical choices produce realistic, cascading consequences that reshape the rest of the war.**

The design test is simple: if the player makes a different choice at a branch point, does the next 20 weeks of gameplay feel different? If yes, the consequence works. If the game plays the same regardless of the choice, the consequence is wallpaper.

### What Consequences Are NOT

- Not punishment for deviating from history. Every path should feel viable.
- Not scripted alt-history narratives. Consequences emerge from flag-gated events and engine parameter shifts.
- Not cosmetic. Every consequence changes game state -- brigade behavior, supply, bot doctrine, event chains.

### Historian Perspective

The Bosnian War's trajectory was shaped by a handful of irreversible decisions. Mladic's cleansing of the Drina valley created the refugee crisis that formed the enclaves. The enclaves became the pressure point that triggered international intervention. The intervention ended the war. Remove one link, and the entire chain breaks differently. The Consequence System models this: not as a branching narrative tree, but as emergent state changes that propagate through the existing simulation.

### Game Designer Perspective

The player should feel the weight of their choices 20-40 turns later. Early-game decisions (w1-10) should have mid-game consequences (w30-60) and late-game reverberations (w100+). The delay is the point -- you don't know what your choice costs until the bill comes due. This is what makes the political wargame distinct from a military sim.

---

## 1. Architecture Decision: Events, Not Code

Consequences are implemented as **new conditional events**, not as hardcoded engine logic. This is a deliberate constraint:

- Every consequence is visible in the event registry (testable, auditable)
- The dependency graph stays explicit (no hidden flag-reading in deep engine code)
- Dynamic Codex integration is automatic (new events get essays and divergence notes)
- Bot AI responds to consequence events using the same personality-weighted system (v0.8)

**Exception:** A small number of consequences require engine-level parameter shifts (e.g., guerrilla threat modifier on rear-area brigades). These are implemented as **new effect types** applied by consequence events, not as flag-reading sprinkled through engine code.

### New Effect Types Required

| Effect Kind | Parameters | Engine Impact |
|-------------|-----------|---------------|
| `guerrilla_threat` | `faction`, `municipalities[]`, `intensity` (0-1), `duration_turns` | Rear-area brigades in listed municipalities lose cohesion/morale per turn. Supply routes through area have throughput penalty. |
| `recruitment_modifier` | `faction`, `pool_multiplier`, `duration_turns` | Multiplier on faction's ongoing_mobilization rate. Stacks with existing scales. |
| `doctrine_constraint` | `faction`, `constraint` (EventConstraints shape), `duration_turns` | Pushes a scope_restriction or doctrine_override onto `state.military.event_constraints`. |
| `alliance_lock` | `floor` or `ceiling`, `value`, `duration_turns` | Prevents alliance from dropping below floor or rising above ceiling. |
| `bot_priority_shift` | `faction`, `add_objectives[]`, `remove_objectives[]`, `duration_turns` | Modifies bot strategy offensive_objectives and defensive_priorities at runtime. |

These effect types are added to the existing `EventEffect` union in `event_types.ts` and handled in `apply_effects.ts`. The consequence events fire them; engine systems consume the state they write.

---

## 2. Prerequisite Fix: Response Option Flag Application

**BLOCKING BUG discovered during research:** `resolveEventDecision()` in `src/sim/events/resolve_decision.ts` applies the chosen response option's `effects` but does NOT apply its `sets_flags` or `dimension_shifts`. This means player-chosen response flags (e.g., `rs_strategic_goals = 'selective'`) are silently dropped.

Bot factions are unaffected because `evaluateEvents()` handles bot responses inline and calls `applyDefinitionFlags()` for the event-level flags. But the per-response-option `sets_flags` are never applied for bots either -- they fire through the effects array only.

**Fix (must ship before v0.9.0):**

```typescript
// In resolve_decision.ts, after applyEventEffects:
if (chosen.sets_flags) {
    applyDefinitionFlags(state, chosen.sets_flags);
}
if (chosen.dimension_shifts) {
    applyDefinitionDimensionShifts(state, chosen.dimension_shifts);
}
```

And the same for bot responses in `evaluateEvents()` line ~215:

```typescript
const chosen = pickBotResponseV1(...);
applyEventEffects(state, chosen.effects);
applyDefinitionFlags(state, chosen.sets_flags);      // ADD
applyDefinitionDimensionShifts(state, chosen.dimension_shifts);  // ADD
```

**This is a v0.7.0 fix, not v0.9.0.** Without it, all decision-event flags are broken for player and partially broken for bots. The entire consequence system depends on flags being set correctly.

---

## 3. The Seven Consequence Chains (MVP)

Seven major consequence chains, each anchored to an existing branch point. Ordered by implementation priority.

### Chain 1: No Drina Cleansing -> Partisan Rear

**Branch point:** `rs_strategic_goals` = `selective` (player restrains Drina operations)

**What happens historically:** VRS clears the Drina valley of Bosniak population. This creates refugee-filled enclaves but secures VRS rear areas from Bijeljina to Foca.

**Ahistorical consequence:** If RS adopts selective goals, the `drina_valley_ethnic_cleansing_1992` event does NOT fire (already gated on `flag_equals: rs_strategic_goals = all_six` by v0.7.0). Bosniak populations remain in Drina valley municipalities. This creates:

**New events (4):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `drina_partisan_resistance_1992` | w8-w20 | `flag_equals: rs_strategic_goals = selective` AND `territory_percentage: RS above 0.40` | Guerrilla threat effect on Zvornik, Bratunac, Vlasenica, Visegrad, Foca. Narrative: Bosniak TDF remnants organize behind RS lines. |
| `drina_supply_disruption_1993` | w30-w60 | `requires_events: [drina_partisan_resistance_1992]` | RS supply penalty: `corridor_severed`-like multiplier on Drina route throughput. RS patron aid 0.85x. |
| `drina_corps_pinned_1993` | w40-w70 | `requires_events: [drina_partisan_resistance_1992]` AND `flag_not_set: drina_cleansing_occurred` | Doctrine constraint: Drina Corps forced defensive. RS loses offensive capability on eastern axis. |
| `drina_population_resilience_1993` | w35-w55 | `requires_events: [drina_partisan_resistance_1992]` | RBiH recruitment modifier +0.08 (dispersed Bosniak populations contribute to ARBiH manpower). Srebrenica enclave formation SUPPRESSED (no refugee wave). |

**Net effect:** RS trades international standing (+15 from selective goals) for a permanently hostile rear. Drina Corps becomes a garrison force, not an offensive one. Srebrenica arc events (10+ events) are suppressed -- no enclave, no fall, no Deliberate Force trigger from that axis. The player must find another way to end the war or accept a different Dayton.

**Calibration impact:** HIGH. Removes ~10 events from historical chain. RS eastern axis becomes defensive. Must verify RS still achieves viable territory % at w40.

---

### Chain 2: Alliance Holds -> No Croat-Bosniak War

**Branch point:** `hrhb_political_goal` = `united_front`

**What happens historically:** HRHB pursues a separate Croat republic. Alliance decays. 21 events fire (the largest chain). Washington Agreement eventually forces reconciliation.

**Ahistorical consequence:** If HRHB chooses united_front, alliance is locked above 0.5. The entire Croat-Bosniak war chain (21 events) is suppressed. But the alliance creates new tensions:

**New events (5):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `joint_operations_agreement_1992` | w6-w12 | `flag_equals: hrhb_political_goal = united_front` | Alliance lock floor 0.50. Joint operations unlocked (HVO brigades can participate in ARBiH corps operations). Bot priority shift: HRHB adds RBiH defensive_priorities. |
| `zagreb_displeasure_1993` | w30-w50 | `flag_equals: hrhb_political_goal = united_front` | HRHB patron_confidence -15. Zagreb reduces support. HRHB supply 0.7x multiplier. Narrative: Tudjman expected a Croat entity, not a junior partnership. |
| `territorial_friction_1993` | w40-w65 | `flag_equals: hrhb_political_goal = united_front` AND `territory_percentage: RBiH above 0.30` | Alliance -0.10 (friction despite cooperation). Decision event: Accept RBiH dominance in central Bosnia or demand equal share. |
| `federation_early_1994` | w70-w90 | `flag_equals: hrhb_political_goal = united_front` AND `alliance_above: 0.40` | Early Federation formation (no war needed to force it). international_standing +10 for both. negotiating_leverage +10 for both. |
| `joint_offensive_1994` | w80-w110 | `requires_events: [federation_early_1994]` | Combined HVO-ARBiH operations against VRS. Bot priority shift: aligned offensive objectives. Aggression modifier +0.10 for both factions for 20 turns. |

**Net effect:** No Croat-Bosniak war means no central Bosnia devastation, no east Mostar siege, no Ahmici. But HRHB is weaker (Zagreb withdraws support) and RBiH-HRHB compete for territory through political friction rather than combat. The Federation forms earlier but on weaker institutional foundations. At Dayton, the combined entity has more territory but less clear internal boundaries.

**Calibration impact:** VERY HIGH. Removes 21 events. Changes HRHB bot behavior fundamentally. Must verify game still produces a meaningful Dayton outcome.

---

### Chain 3: Srebrenica Survives -> No Deliberate Force Trigger

**Branch point:** `srebrenica_falls_1995` does not fire (v0.7.0 makes it conditional)

**What happens historically:** Srebrenica falls in July 1995. Genocide. International outrage triggers Deliberate Force. Ground offensive follows. War ends.

**Ahistorical consequence:** If RS doesn't take Srebrenica (either because Drina Corps is pinned from Chain 1, or because the player restrains), the NATO intervention trigger doesn't fire from this axis. The war continues differently:

**New events (4):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `srebrenica_stalemate_1995` | w170-w190 | `flag_equals: srebrenica_enclave_formed = true` AND `flag_not_set: srebrenica_fell` AND `turn_min: 170` | Narrative: The enclave persists. UNPROFOR remains. RS resources tied down. RS military_credibility -5. RBiH international_standing +5. |
| `enclave_drain_continues_1995` | w170-w200 | `requires_events: [srebrenica_stalemate_1995]` | RS doctrine constraint: Drina Corps cannot redeploy. Permanent force commitment. RS morale -3 (frustration). |
| `alternative_nato_trigger_1995` | w175-w200 | `flag_not_set: srebrenica_fell` AND `war_crimes_above: RS, 8` AND `flag_equals: rrf_deployed = true` | Pressure-based (rate 0.8, threshold 10). Deliberate Force triggers from cumulative war crimes + Markale + RRF presence, not Srebrenica specifically. Slower build, later timing. |
| `prolonged_war_exhaustion_1995` | w180-w210 | `flag_not_set: srebrenica_fell` AND `flag_not_set: nato_deliberate_force_occurred` | All factions morale -5, cohesion -5. Recruitment modifier 0.8x all factions. Patron pressure +5 all factions. The war grinds on without a catalyst for ending. |

**Net effect:** Without Srebrenica, the war lacks its decisive turning point. NATO may still intervene (through Markale + cumulative pressure) but later and with less force. The ground offensive starts later, the war drags into 1996, and Dayton happens with more exhausted factions but potentially different territorial lines.

**Calibration impact:** HIGH. The endgame chain (Deliberate Force -> ground offensive -> halt -> Dayton) shifts by 5-15 turns. Must verify the game can still reach a Dayton outcome.

---

### Chain 4: Abandoned Bihac -> Pocket Collapses

**Branch point:** RBiH does not reinforce Bihac (5th Corps isolated, Abdic defection)

**What happens historically:** 5th Corps holds the pocket against enormous pressure. Abdic's rebellion creates a civil war within the pocket. But 5th Corps survives and eventually breaks out.

**Ahistorical consequence:** If the pocket falls, RS controls the entire northwest:

**New events (3):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `bihac_pocket_collapses_1994` | w120-w160 | `flag_equals: abdic_pact_occurred = true` AND `morale_average_below: RBiH, 30` AND `enclave_supply_status: bihac, critical` | Bihac pocket falls. RS territorial_legitimacy +10. RBiH military_credibility -15. Massive displacement. RBiH morale -8 faction-wide. |
| `northwest_rs_consolidation_1995` | w5 after bihac_pocket_collapses | `requires_events: [bihac_pocket_collapses_1994]` | RS frees ~15-20 brigades from Bihac front. Bot priority shift: 2nd Krajina Corps redirected to central Bosnia offensive objectives. RS aggression +0.10 for 20 turns. |
| `bihac_refugee_crisis_1994` | w3 after bihac_pocket_collapses | `requires_events: [bihac_pocket_collapses_1994]` | 200k+ refugees into RBiH-held central Bosnia. RBiH supply -30. international_standing +5 (sympathy). Patron pressure on RS +5 (but damage is done). |

**Net effect:** Losing Bihac is catastrophic for RBiH. RS frees an entire corps for redeployment. The war's territorial equation shifts dramatically. But international pressure may accelerate intervention.

**Calibration impact:** MEDIUM. The Bihac pocket already has enclave mechanics. Collapse event needs enclave_supply_status evaluator (v0.7.0 prerequisite).

---

### Chain 5: RS Maximum Aggression -> Accelerated International Response

**Branch point:** `rs_strategic_goals` = `aggressive`

**What happens historically:** RS adopts all six goals. Cleansing occurs. International response builds over 2+ years.

**Ahistorical consequence:** If RS pursues maximum force, everything happens faster -- and harder:

**New events (4):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `accelerated_camps_discovery_1992` | w6-w12 | `flag_equals: rs_strategic_goals = aggressive` | Camps discovered 4-8 weeks earlier. Pressure modifier: camps_revealed rate +3.0. |
| `early_war_crimes_tribunal_1993` | w30-w50 | `flag_equals: rs_strategic_goals = aggressive` AND `war_crimes_above: RS, 5` | ICTY mandate expanded. RS international_standing -10. RS patron_confidence -10 (Belgrade distances itself early). |
| `accelerated_safe_areas_1993` | w35-w55 | `requires_events: [early_war_crimes_tribunal_1993]` | UN Safe Areas declared earlier and with stronger mandate. Enclave resilience +5 for all enclaves. UNPROFOR reinforced. |
| `early_nato_threshold_1994` | w80-w120 | `flag_equals: rs_strategic_goals = aggressive` AND `war_crimes_above: RS, 10` | NATO intervention threshold lowered. Deliberate Force pressure rate +2.0. RRF deployment accelerated. The aggressive path brings the endgame forward, but RS has less territory locked in. |

**Net effect:** Maximum aggression produces faster territorial gains but triggers earlier and stronger international response. The player races against a closing window. Historically plausible: the more extreme the VRS campaign, the faster the political will for intervention built.

**Calibration impact:** MEDIUM. Shifts event timing windows. Existing endgame chain fires earlier.

---

### Chain 6: RBiH Identity Choice -> Recruitment and Alliance Effects

**Branch point:** `rbih_state_identity` = `bosniak_national` or `pragmatic`

**What happens historically:** RBiH maintains civic multi-ethnic identity. Croat and Serb soldiers serve in ARBiH.

**Ahistorical consequence:**

**New events (3):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `minority_defections_1992` | w8-w20 | `flag_equals: rbih_state_identity = bosniak_national` | RBiH loses ~15% of initial brigade personnel (Croat/Serb soldiers leave). Recruitment modifier 0.80x for 20 turns. 6 HVO-pool brigades lose `recruit_pool_faction` cross-recruitment. |
| `bosniak_unity_1993` | w30-w55 | `flag_equals: rbih_state_identity = bosniak_national` | Internal cohesion +15. Bosniak recruitment modifier 1.15x (ethnic solidarity). Partially compensates for minority losses. |
| `international_disillusionment_1993` | w40-w70 | `flag_equals: rbih_state_identity = bosniak_national` AND `dimension_below: RBiH, international_standing, 40` | Patron confidence -10. International mediators treat RBiH as ethnic party, not civic state. Negotiating leverage -10. Dayton terms less favorable for unified state. |

**Net effect:** Choosing Bosniak nationalism trades international standing for internal cohesion. Stronger faction identity but weaker negotiating position. The 6 cross-faction HVO-pool brigades (107th, 108th, 101st Bihac, 110th, 115th, Kralj Tvrtko) lose their cross-recruitment, which is mechanically significant.

**Calibration impact:** LOW-MEDIUM. Recruitment changes affect manpower curves. Must verify RBiH doesn't collapse under reduced pools.

---

### Chain 7: Early Peace Push -> Shortened War

**Branch point:** Multiple peace plan events (Vance-Owen, Owen-Stoltenberg, Contact Group) where the player can accept

**What happens historically:** All peace plans are rejected by at least one party. War continues to 1995.

**Ahistorical consequence:** If a peace plan is accepted by all parties (requires the player's faction AND the bot factions' political leader to agree -- v0.8.0 prerequisite):

**New events (3):**

| Event ID | Turn Window | Trigger | Effects |
|----------|-------------|---------|---------|
| `vance_owen_implemented_1993` | w50-w70 | `flag_equals: vance_owen_accepted = true` AND `flag_equals: vance_owen_all_parties = true` | War enters ceasefire state. Territory frozen at current lines. Dayton scoring applied immediately. Game enters endgame. |
| `contact_group_implemented_1994` | w100-w130 | `flag_equals: contact_group_accepted = true` AND `flag_equals: contact_group_all_parties = true` | Same as above but with Contact Group 51/49 territorial formula applied. |
| `early_dayton_scoring` | Fires on peace implementation | `requires_events: [vance_owen_implemented OR contact_group_implemented]` | Compute Dayton score from current strategic dimensions. Territory split based on current lines vs plan formula. Endgame verdict. |

**Net effect:** The player can end the war early -- but at the current territorial lines, which may be unfavorable. Accepting Vance-Owen in 1993 means RS gives up Drina gains but avoids 2 more years of war. The scoring reflects this tradeoff.

**Calibration impact:** LOW. These are endgame shortcuts. No impact on the main simulation.

---

## 4. Implementation Architecture

### 4.1 New Event Effect Types

Added to `src/sim/events/event_types.ts`:

```typescript
| { kind: 'guerrilla_threat'; faction: FactionId; municipalities: string[];
    intensity: number; duration_turns: number }
| { kind: 'recruitment_modifier'; faction: FactionId;
    pool_multiplier: number; duration_turns: number }
| { kind: 'doctrine_constraint'; faction: FactionId;
    constraint: EventConstraints; duration_turns: number }
| { kind: 'alliance_lock'; mode: 'floor' | 'ceiling';
    value: number; duration_turns: number }
| { kind: 'bot_priority_shift'; faction: FactionId;
    add_objectives?: string[]; remove_objectives?: string[];
    duration_turns: number }
```

Each gets an `apply*` function in `apply_effects.ts` that writes to state fields.

### 4.2 New State Fields

On `MilitaryState` (in `game_state.ts`):

```typescript
/** Active guerrilla threat zones from consequence events. */
guerrilla_threats?: Array<{
    faction: FactionId;
    municipalities: string[];
    intensity: number;
    expires_turn: number;
}>;

/** Active recruitment modifiers from consequence events. */
recruitment_modifiers?: Array<{
    faction: FactionId;
    pool_multiplier: number;
    expires_turn: number;
}>;

/** Alliance floor/ceiling locks from consequence events. */
alliance_locks?: Array<{
    mode: 'floor' | 'ceiling';
    value: number;
    expires_turn: number;
}>;

/** Bot priority shifts from consequence events. */
bot_priority_shifts?: Array<{
    faction: FactionId;
    add_objectives?: string[];
    remove_objectives?: string[];
    expires_turn: number;
}>;
```

### 4.3 Engine Integration Points

Each new state field is consumed at exactly one point in the pipeline:

| State Field | Consumer | Pipeline Step | Integration |
|-------------|----------|---------------|-------------|
| `guerrilla_threats` | `frontline_attrition.ts` or new `guerrilla_attrition.ts` | After combat, before reinforcement | Brigades in threat zone lose cohesion/morale per turn proportional to intensity |
| `recruitment_modifiers` | `ongoing_mobilization.ts` | Mobilization step | Multiply mobilization rate by active modifier |
| `alliance_locks` | `apply_effects.ts` (alliance_change handler) | Event effect application | Clamp alliance value to floor/ceiling before applying delta |
| `bot_priority_shifts` | `bot_strategy.ts` (`FACTION_STRATEGIES` accessor) | Bot directive generation | Merge runtime add/remove with static objectives |
| `event_constraints` (existing) | `bot_corps_directives.ts` (existing) | Bot directive generation | Already integrated -- doctrine_constraint effect just pushes to existing array |

### 4.4 Consequence Event JSON Location

New file: `data/scenarios/events/consequences.json`

Separate from the historical event files (`war_1992.json` through `war_1995.json`). Consequence events are loaded alongside historical events but have distinct IDs prefixed with `csq_` for easy identification.

### 4.5 Event Registry Loading

`event_loader.ts` updated to also load `consequences.json`. No loader changes needed beyond adding the file path.

---

## 5. Dynamic Codex Integration

Each consequence chain produces divergence notes for the Codex:

### 5.1 Tier 3 Dynamic Sections

For events that fire differently based on player choice, the essay template engine (v0.7.1) swaps paragraphs:

```
Essay: "The Drina Valley Campaign"
- If drina_cleansing_occurred: canonical text (what actually happened)
- If NOT drina_cleansing_occurred: dynamic section describing partisan resistance
- Divergence note: "In the actual war, VRS systematically cleansed the Drina valley..."
```

**Count:** ~12 dynamic sections across the 7 chains (some chains affect multiple essays).

### 5.2 Tier 4 Ahistorical Templates

For consequence events with no historical parallel, new essay templates are needed:

| Template | Chain | Content |
|----------|-------|---------|
| `drina_partisan_resistance` | 1 | Bosniak TDF resistance behind RS lines -- based on real partisan history in the region |
| `early_federation` | 2 | Federation formed through cooperation, not forced by war -- counterfactual analysis |
| `prolonged_war` | 3 | What happens when the decisive moment never comes -- war of exhaustion |
| `bihac_falls` | 4 | The collapse of the northwest pocket -- modeled on real siege collapses |
| `accelerated_intervention` | 5 | NATO intervenes earlier -- based on real debates about early intervention |
| `bosniak_national_army` | 6 | ARBiH as ethnic army -- based on real internal debates |
| `early_peace` | 7 | Vance-Owen or Contact Group implemented -- based on plan terms |

**Count:** ~7 ahistorical essay templates. Each ~500 words. Generated by /historian with ICTY/BB sourcing for plausibility.

### 5.3 Ghost Entries

When a consequence chain suppresses historical events (e.g., Chain 1 suppresses Srebrenica arc), those events appear as ghost entries in the Codex: greyed out, with the canonical essay and a note: "In the actual war, this happened. In yours, it didn't -- because [flag explanation]."

---

## 6. Bot AI Response to Consequences

The v0.8.0 political leader bot must respond to consequence events intelligently. Design requirements:

- **Consequence events that are non-decision** (no response_options): Bot processes automatically. Engine effects applied.
- **Consequence events that ARE decisions** (e.g., `territorial_friction_1993` in Chain 2): Bot uses `strategic_weighted` response logic, evaluating options against current strategic dimensions.
- **Bot should NOT make ahistorical foundational choices.** The `bot_response_logic: 'historical'` on rs_strategic_goals, rbih_state_identity, and hrhb_political_goal ensures bots always pick Option A (historical). Consequence chains only fire when the PLAYER makes ahistorical choices.

---

## 7. Balancing Historical Accuracy with Player Agency

### Design Principles

1. **Every ahistorical choice must be historically PLAUSIBLE.** Real people considered these alternatives. The selective goals option reflects real debates within the RS Assembly. The united front option reflects the actual RBiH-HVO cooperation in 1992 before it broke down. Sources required for every branch.

2. **No choice is "correct."** The historical path is not optimal. Selective goals give RS better international standing but a hostile rear. Maximum aggression gives territory but brings NATO faster. Every option trades one advantage for another.

3. **Consequences should feel INEVITABLE in hindsight.** The player who restrains Drina cleansing should think "of course there are partisans now -- I left a hostile population in my rear." Not "the game punished me for being humane." The logic must be transparent.

4. **Time delay amplifies weight.** Consequences that fire 20-40 turns after the choice feel more impactful than immediate effects. The player has time to forget their choice, then gets reminded when the bill arrives.

5. **Proportional response.** Minor choices produce minor consequences. Only the foundational decisions (3 faction identity events) produce war-altering chains. Mid-game decisions produce localized, time-limited consequences.

### Asymmetry by Faction

- **RS consequences** are the most dramatic because RS has the most agency in the early war. The six goals decision reshapes everything.
- **RBiH consequences** are primarily about identity and recruitment. The military simulation constrains RBiH heavily regardless of political choices.
- **HRHB consequences** hinge entirely on the alliance question. United front vs. croat republic is the single most consequential binary in the game (it gates 21 events).

---

## 8. Test Plan

### 8.1 Unit Tests -- New Effect Types (15 tests)

For each new effect type in `apply_effects.ts`:
- Verify state mutation (guerrilla_threats array populated, recruitment_modifiers array populated, etc.)
- Verify expiration (effects removed after duration_turns)
- Verify stacking (multiple effects of same type coexist)

### 8.2 Unit Tests -- Engine Consumers (12 tests)

For each integration point:
- guerrilla_attrition: brigades in threat zone lose cohesion at expected rate
- ongoing_mobilization: recruitment modifier applies to mobilization rate
- alliance_change: alliance_lock floor/ceiling prevents drift beyond limit
- bot_strategy: bot_priority_shift adds/removes objectives correctly

### 8.3 Integration Tests -- Consequence Chains (7 tests, one per chain)

Each test:
1. Set up GameState with the relevant flag value
2. Advance simulation 10-30 turns
3. Verify consequence events fire in correct order
4. Verify downstream effects are present on state

### 8.4 Full Scenario Regression (3 runs)

1. **Historical baseline:** All bots, no player choices. Verify 91.5% area-weighted holds (+/- 1.0pp). All 94 historical events fire. Zero consequence events fire.
2. **RS selective goals:** Player chooses selective. Run 200w. Verify Chain 1 fires, Srebrenica arc suppressed, game reaches Dayton.
3. **HRHB united front:** Player chooses united_front. Run 200w. Verify Chain 2 fires, 21 Croat-Bosniak events suppressed, game reaches Dayton.

### 8.5 Smoke Test Triad

After every change: `tsc --noEmit` + `vitest run` + `desktop:map:build`

---

## 9. Implementation Order

### Phase 1: Foundation (2 sessions)

**Session 1:**
1. Fix response option flag/dimension application bug (Section 2)
2. Add 5 new effect types to `event_types.ts` and `apply_effects.ts`
3. Add new state fields to `game_state.ts`
4. Unit tests for effect types
5. Smoke test triad

**Session 2:**
1. Engine integration: `guerrilla_attrition.ts` (new file), `ongoing_mobilization.ts` (read modifier), `alliance_change` (lock), `bot_strategy.ts` (priority shift)
2. Expiration cleanup step in pipeline (remove expired modifiers each turn)
3. Unit tests for engine consumers
4. Smoke test triad

### Phase 2: Chain 1 + Chain 5 (RS consequences) (2 sessions)

**Session 3:**
1. Author 4 consequence events for Chain 1 (No Drina Cleansing) in `consequences.json`
2. Author 4 consequence events for Chain 5 (Maximum Aggression)
3. Integration tests for both chains
4. Run 40w calibration with `rs_strategic_goals = selective` -- verify game state diverges meaningfully

**Session 4:**
1. Run 200w scenario with selective goals -- verify Dayton reached
2. Run 200w scenario with aggressive goals -- verify accelerated endgame
3. Tune event timing windows and effect magnitudes
4. One calibration comparison per change (sacred rule)

### Phase 3: Chain 2 (Alliance Holds) (2 sessions)

**Session 5:**
1. Author 5 consequence events for Chain 2
2. Integration test
3. Run 200w with `hrhb_political_goal = united_front` -- verify 21 events suppressed, new chain fires

**Session 6:**
1. Tune alliance lock, Zagreb displeasure timing, joint offensive parameters
2. Verify game reaches Dayton with meaningful outcome
3. Calibration comparison

### Phase 4: Chains 3, 4, 6 (2 sessions)

**Session 7:**
1. Author events for Chain 3 (Srebrenica Survives -- 4 events)
2. Author events for Chain 4 (Bihac Collapses -- 3 events)
3. Integration tests for both
4. Run 200w for each variant

**Session 8:**
1. Author events for Chain 6 (RBiH Identity -- 3 events)
2. Integration test
3. Tune recruitment modifiers to avoid RBiH collapse
4. Calibration comparison

### Phase 5: Chain 7 + Polish (2 sessions)

**Session 9:**
1. Author events for Chain 7 (Early Peace -- 3 events)
2. This requires peace plan acceptance flags from existing events (verify they exist)
3. Implement early Dayton scoring pathway
4. Integration test

**Session 10:**
1. Full regression: historical baseline holds
2. Run all 7 variants end-to-end
3. Update EVENT_DEPENDENCY_GRAPH.md with consequence chains
4. Update PROJECT_LEDGER.md
5. Author 7 Tier 4 essay templates (or flag for /historian)

---

## 10. Acceptance Criteria

1. **Historical baseline unchanged:** 91.5% area-weighted (+/- 1.0pp) with all bots making historical choices
2. **All 7 chains fire correctly:** Each ahistorical choice produces its consequence chain within the specified turn windows
3. **Zero orphan consequence events:** Every consequence event has a valid trigger path from a foundational decision
4. **Dayton reachable on all paths:** Every combination of foundational choices reaches a Dayton-equivalent endgame state
5. **Response option flags work:** Verified for both player and bot factions
6. **New effect types deterministic:** No randomness in guerrilla_threat, recruitment_modifier, alliance_lock, bot_priority_shift, doctrine_constraint
7. **26 new events total** (4+5+4+3+4+3+3) authored and registered
8. **~50 new tests** (15 effect + 12 consumer + 7 chain + ~16 misc)
9. **Dynamic Codex hooks present:** Each consequence event has metadata for Codex tier classification and essay template binding

---

## 11. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Consequence chains interact unpredictably (Chain 1 + Chain 5 both fire) | HIGH | Each chain is gated on mutually exclusive flag values (selective vs aggressive). Foundational decisions are one-shot. |
| Game becomes unwinnable on certain paths | HIGH | Dayton scoring is relative, not absolute. Every path produces a verdict; some are worse than others. Test all 7 + key combinations. |
| Calibration regression on historical path | MEDIUM | Historical baseline is first test after every change. Consequence events have `flag_not_set` or ahistorical flag conditions -- they literally cannot fire on the historical path. |
| Bot political leader (v0.8.0) not ready | LOW | Consequence events that are non-decision work without v0.8.0. Decision consequence events fall back to `accept_first` / `historical` bot logic. |
| Too many new events overwhelm event evaluation | LOW | 26 events added to 94 = 120 total. `evaluateEvents` already handles this scale. Most consequence events have narrow turn windows. |

---

## 12. Dependencies

| Dependency | Version | Status | Blocking? |
|------------|---------|--------|-----------|
| Flag wiring (orphan flags -> consumers) | v0.7.0 | PLANNED | YES -- consequence chains read flags that v0.7.0 wires |
| FIXED->CONDITIONAL conversion (Srebrenica) | v0.7.0 | PLANNED | YES for Chain 3 |
| `enclave_supply_status` evaluator | v0.7.0 | PLANNED | YES for Chain 4 |
| Essay template engine | v0.7.1 | PLANNED | NO -- Codex integration can follow |
| Political leader bot | v0.8.0 | PLANNED | NO -- fallback to historical bot logic |
| Response option flag fix (Section 2) | v0.7.0 or earlier | BUG | YES -- entire system depends on flags being set correctly |

---

## Appendix A: Full Event ID Registry (26 new events)

```
Chain 1: csq_drina_partisan_resistance_1992
         csq_drina_supply_disruption_1993
         csq_drina_corps_pinned_1993
         csq_drina_population_resilience_1993

Chain 2: csq_joint_operations_agreement_1992
         csq_zagreb_displeasure_1993
         csq_territorial_friction_1993
         csq_federation_early_1994
         csq_joint_offensive_1994

Chain 3: csq_srebrenica_stalemate_1995
         csq_enclave_drain_continues_1995
         csq_alternative_nato_trigger_1995
         csq_prolonged_war_exhaustion_1995

Chain 4: csq_bihac_pocket_collapses_1994
         csq_northwest_rs_consolidation_1995
         csq_bihac_refugee_crisis_1994

Chain 5: csq_accelerated_camps_discovery_1992
         csq_early_war_crimes_tribunal_1993
         csq_accelerated_safe_areas_1993
         csq_early_nato_threshold_1994

Chain 6: csq_minority_defections_1992
         csq_bosniak_unity_1993
         csq_international_disillusionment_1993

Chain 7: csq_vance_owen_implemented_1993
         csq_contact_group_implemented_1994
         csq_early_dayton_scoring
```

## Appendix B: Flag Dependency Map

```
rs_strategic_goals ─── all_six ───> (historical path, no consequences)
                  ├── selective ──> Chain 1 (partisan rear)
                  └── aggressive ─> Chain 5 (accelerated response)

hrhb_political_goal ── croat_republic ──> (historical path)
                   ├── united_front ────> Chain 2 (alliance holds)
                   └── strategic_ambiguity > (weaker Chain 2 variant, future work)

rbih_state_identity ── civic ──────────> (historical path)
                   ├── bosniak_national > Chain 6 (identity consequences)
                   └── pragmatic ───────> (weaker Chain 6 variant, future work)

srebrenica_falls_1995 ── fires ────────> (historical path)
                     └── does not fire ─> Chain 3 (no Deliberate Force trigger)

bihac_pocket ── holds ─────────────────> (historical path)
            └── collapses ─────────────> Chain 4 (RS consolidation)

peace_plan_accepted ── rejected ───────> (historical path)
                   └── accepted ───────> Chain 7 (early peace)
```
