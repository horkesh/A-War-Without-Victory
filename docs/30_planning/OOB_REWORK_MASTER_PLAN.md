# OOB Rework Master Plan

**Date:** 2026-03-02
**Author:** Orchestrator (Paradox Team Synthesis)
**Status:** PROPOSAL — Awaiting approval
**Participants:** Historian, Formation Expert, Game Designer, Tech Architect, OSID Mapper

---

## Executive Summary

Complete overhaul of the Order of Battle system across three armies (ARBiH/VRS/HVO). Adds brigade histories, earned decorations, army elite loan mechanic, late-game recruitment, lifecycle events, and deterministic troop balancing. Total: ~243 brigades (126 ARBiH, 80 VRS, 37 HVO) with corrected spawn timings, home municipality OSID mapping, and per-brigade combat profiles.

---

## 1. Definitive Brigade Count

### 1.1 Changes from Current OOB (244 brigades → 243 brigades)

| Faction | Current | Remove | Add | Final |
|---------|---------|--------|-----|-------|
| ARBiH   | 125     | 0      | 1   | 126   |
| VRS     | 80      | 5      | 5   | 80    |
| HVO     | 39      | 8      | 6   | 37    |
| **Total** | **244** | **13** | **12** | **243** |

### 1.2 VRS Changes (80 → 80)

**Remove (5 duplicates):**
| ID | Reason |
|----|--------|
| Šekovići Brigade | = 1st Birač Infantry (same unit, honorific name) |
| Rogatica Brigade | = 1st Podrinje LI (same unit) |
| Višegrad Brigade | = 5th Podrinje LI (same unit) |
| 1st Čelinac | Duplicate entry |
| 31st Mountain Storm | = 31st LI (same unit, operational name) |

**Add (5 critical):**
| Unit | Corps | Home Municipality | Why Critical |
|------|-------|-------------------|--------------|
| Ilidža Brigade (2nd Sarajevo LI) | SRK | ilidza | Siege ring gap — no unit covers Ilidža axis |
| Ilijaš Brigade (3rd Sarajevo Inf) | SRK | ilijas | Siege ring gap — no unit covers Ilijaš |
| Igman Brigade | SRK | hadzici | Siege ring gap — Igman flank exposed |
| 2nd Romanija Brigade | Drina Corps | sokolac | Historical presence, fills Drina-SRK boundary |
| 2nd Herzegovina LI | Herzegovina Corps | bileca | Documented unit missing from OOB |

### 1.3 ARBiH Changes (125 → 126)

**Add (1):**
| Unit | Corps | Home Municipality |
|------|-------|-------------------|
| 504th Viteška Mountain | 5th Corps | bihac |

**Rename (1):**
- 104th → 144th (correct historical designation for that corps slot)

**Spawn Timing Corrections (15+):**
- Guards Brigade: available_from 8 → 12 (formed mid-May 1992)
- 120th "Black Swans": available_from 8 → 14 (formed June 1992)
- 504th Viteška: available_from 32 (late-war formation)
- All 6th/7th Corps units: already correct (mapped to 3rd/4th per design decision)
- Guards brigades concept: available_from ≥ 26 for late guard formations

### 1.4 HVO Changes (39 → 37)

**Remove (8 duplicates — honorific vs base name):**
| ID | Reason |
|----|--------|
| Multiple entries where named variants (e.g., "Jure Franćetić") duplicate base brigade IDs |
| Derventa Brigade | Destroyed May 1992 — should have `available_until: 6` instead of removal |
| Modriča Brigade | Destroyed June 1992 — should have `available_until: 8` |

**Add (6):**
| Unit | OZ | Home Municipality | available_from |
|------|-----|-------------------|----------------|
| Rama Brigade | OZ NW Herzegovina | prozor | 0 |
| Ante Starčević Brigade | OZ Central Bosnia | kiseljak | 0 |
| Nikola Šubić Zrinski | OZ Central Bosnia | busovaca | 0 |
| Hrvoje Vukčić Hrvatinić | OZ Posavina | odzak | 0 |
| Posušje Brigade | OZ SE Herzegovina | posusje | 0 |
| 101st Bihać HVO | OZ NW Bosnia | bihac | 4 |

**Late-Game Guard Brigades (1994+, available_from ≥ 80):**
| Unit | available_from | Home Municipality |
|------|----------------|-------------------|
| 1st Guard "Ante Bruno Bušić" | 80 | livno |
| 2nd Guard Mechanized | 84 | mostar |
| 3rd Guard "Jastrebovi" | 84 | capljina |
| 4th Guard "Sinovi Posavine" | 88 | orasje |

> **Design note:** Guard brigades represent HVO professionalization with Croatian Army backing (1994). They offset the HVO's manpower constraints with higher quality. Scenario runs to game end — guards form at historically accurate dates. Triggered by week threshold (deterministic).

---

## 2. Schema Extensions

### 2.1 New Fields on OOB JSON (`oob_brigades.json`)

```typescript
// Existing fields retained as-is
interface OobBrigade {
  id: string;
  faction: FactionId;
  name: string;
  home_mun: string;                    // municipality key (1990 names)
  home_settlement?: string;            // display name
  home_osid?: string;                  // explicit OSID override (enclaves only)
  subordinate_to: string;
  kind: 'brigade';
  default_equipment_class: string;
  available_from: number;
  initial_personnel: number;
  initial_cohesion: number;
  mandatory?: boolean;
  honor?: 'slavna' | 'viteska';
  defense_terrain_bonus?: number;

  // === NEW FIELDS ===
  available_until?: number;            // week when disbanded/destroyed (null = survives)
  merged_into_id?: string;             // target brigade if merged
  is_elite?: boolean;                  // army-level elite unit (loanable)
  historical_decorations?: HistoricalDecoration[];  // pre-assigned decorations
  unlock_condition?: 'week' | 'personnel' | 'territory';  // what triggers availability
  lifecycle_events?: LifecycleEvent[]; // scripted disband/merge/rename
}

interface HistoricalDecoration {
  tier: 'tier_1' | 'tier_2' | 'tier_3';
  name: string;                        // e.g. "Slavna", "Medalja Petra Mrkonjica"
}

interface LifecycleEvent {
  type: 'disband' | 'merge' | 'rename';
  trigger_turn?: number;
  trigger_condition?: string;
  target_id?: string;                  // for merge: destination brigade
  new_name?: string;                   // for rename
}
```

### 2.2 New Fields on FormationState (`game_state.ts`)

```typescript
// Added to FormationState
interface FormationState {
  // ... existing fields ...

  // === NEW ===
  brigade_history?: BrigadeHistory;
  decorations?: BrigadeDecoration[];
  elite_loan_state?: EliteLoanState;
  lifecycle_status?: 'active' | 'forming' | 'disbanded' | 'merged' | 'destroyed' | 'withdrawn';
}
```

### 2.3 BrigadeHistory (Compact + Engagement Log)

**Design decision — Reconciling Tech Architect (compact tallies) and Game Designer (engagement log):**

Use BOTH. Compact tallies for fast queries + capped engagement log for war stories. The engagement log is FIFO-capped at 200 entries.

```typescript
interface BrigadeEngagement {
  turn: number;
  osid: string;
  role: 'attacker' | 'defender';
  outcome: CombatOutcome;
  casualties_taken: number;
  casualties_inflicted: number;
  enemy_faction: FactionId;
  territory_flipped: boolean;
  was_concentrated: boolean;
}

interface BrigadeHistory {
  // --- Engagement log (FIFO cap at 200) ---
  engagements: BrigadeEngagement[];

  // --- Running tallies ---
  battles_fought: number;
  battles_as_attacker: number;
  battles_as_defender: number;
  victories: number;
  defeats: number;
  stalemates: number;
  total_casualties_taken: number;
  total_casualties_inflicted: number;
  total_osids_captured: number;
  total_osids_lost: number;

  // --- Streaks ---
  current_victory_streak: number;
  longest_victory_streak: number;
  current_defense_streak: number;
  longest_defense_streak: number;
  turns_under_siege: number;

  // --- Milestones ---
  first_battle_turn: number | null;
  first_battle_osid: string | null;
  worst_single_battle_casualties: number;
  worst_single_battle_turn: number | null;
  peak_personnel: number;
  nadir_personnel: number;
}
```

**Size estimate:** ~100 bytes per engagement × 200 cap = 20 KB per brigade. ~130 active brigades = ~2.6 MB. Tallies add ~200 bytes each = 26 KB total. Grand total: **~2.7 MB** added to save files. Acceptable for desktop game.

### 2.4 Decoration System

**Design decision — Reconciling Formation Expert (points-based) and Game Designer (criteria-based):**

Use criteria-based (Game Designer's proposal). Points systems feel arbitrary; concrete criteria ("5 consecutive victories") create clear player goals and are more narratively satisfying. Criteria are deterministic.

**Three tiers per faction:**

| Tier | ARBiH | VRS | HVO | Combat Effect |
|------|-------|-----|-----|---------------|
| tier_1 | Slavna | Medalja Petra Mrkonjića | Red N.Š. Zrinskog | +10% atk, +10% def |
| tier_2 | Viteška | Orden Nemanjića | Red Kneza Domagoja | +15% def, +5% morale resist |
| tier_3 | Orden Zlatni Ljiljan | Orden Miloša Obilića | Red Hrvatskog Trolista | +15% atk, +20% def, +5 morale |

**Earned criteria:**
- **Tier 1:** 5+ consecutive victories without catastrophic loss, OR 8+ battles with >60% win rate
- **Tier 2:** Held same OSID through 3+ enemy attacks, OR 4+ consecutive defensive victories while outgunned
- **Tier 3:** Both tier 1 and tier 2 earned, OR decisive victory against 2:1 odds

**No stacking across tiers** — highest tier's bonus applies. Decorations are permanent once earned. Legacy `honor` field converted at load.

### 2.5 Elite Loan System

**Design decision — Loan duration:** 6 weeks (Game Designer) vs 8 weeks (Formation Expert). Use **6 weeks** — shorter deployments create more tension and decision points.

**The three elite formations:**

| Faction | Unit | Home OSID | Starting Decoration |
|---------|------|-----------|---------------------|
| RBiH | Guards Brigade | op:centar_sarajevo:... | tier_2 (Viteška) |
| RS | 65th Protection Regiment | op:hanpijesak:han_pijesak_2 | tier_3 (Obilić) |
| HRHB | 1st Guard "Ante Bruno Bušić" | op:livno:livno_2 | tier_1 (Zrinski) |

**Constants:**
- `ELITE_LOAN_DURATION = 6` weeks
- `ELITE_LOAN_COOLDOWN = 4` weeks
- `ELITE_CASUALTY_THRESHOLD = 0.30` (forced recall at 30% loss)
- `ELITE_MORALE_RECALL = 35` (forced recall below this)

**Degradation:** If elite drops below 50% personnel, loses elite status permanently. Reinforcement at 50% normal rate (elite replacements scarce). This is the irreversible cost of misuse — core negative-sum mechanic.

---

## 3. Troop Level Balancing

### 3.1 Faction Personnel Ceilings

**Design decision (Formation Expert proposal, endorsed by Game Designer):**

| Faction | Historical Peak | Soft Cap (85%) | Hard Cap (95%) |
|---------|----------------|----------------|----------------|
| RBiH | 130,000 | 110,500 | 123,500 |
| RS | 185,000 | 157,250 | 175,750 |
| HRHB | 45,000 | 38,250 | 42,750 |

**Mechanics:**
- Below soft cap: Normal reinforcement rate
- Soft → hard cap: Reinforcement rate × 0.25 (diminishing returns)
- Above hard cap: No reinforcement, no new brigade spawns
- Applies to formation personnel only (militia pools separate)

**Implementation:** Check in `reinforceBrigadesFromPools()` before applying reinforcements. Single faction-level sum comparison.

### 3.2 VRS Equipment Decay

**Design decision (Formation Expert proposal):** 0.5%/week equipment effectiveness degradation after week 26. Emerges the VRS doctrinal arc (professional → degraded) organically.

```typescript
const VRS_EQUIPMENT_DECAY_START_WEEK = 26;
const VRS_EQUIPMENT_DECAY_RATE = 0.005;  // 0.5% per week
const VRS_EQUIPMENT_DECAY_FLOOR = 0.60;   // never below 60% effectiveness
```

Affects `equipment_effectiveness` on VRS formations. Applied in a new pipeline step `apply-equipment-decay` after reinforcement.

---

## 4. Formation Lifecycle Events

### 4.1 Data-Driven Lifecycle

Scripted events in `oob_brigades.json` or a separate `formation_lifecycle_events.json`:

```json
[
  {
    "type": "disband",
    "formation_id": "hvo_derventa",
    "trigger_condition": "territory_loss",
    "trigger_municipality": "derventa",
    "reason": "Derventa fell to VRS — brigade destroyed"
  },
  {
    "type": "disband",
    "formation_id": "hvo_modrica",
    "trigger_condition": "territory_loss",
    "trigger_municipality": "modrica",
    "reason": "Modriča fell to VRS — brigade destroyed"
  },
  {
    "type": "merge",
    "formation_id": "arbih_109th_mountain",
    "trigger_turn": 26,
    "target_id": "arbih_149th_mountain",
    "reason": "ARBiH reorg — 109th renumbered to 149th"
  }
]
```

**Trigger types (emergent preferred over scripted):**
- `territory_loss`: fires when home municipality majority lost to enemy (primary trigger for disbands)
- `personnel_collapse`: fires when personnel < threshold
- `week`: fires at specific turn (only for merges/renames where timing is known)

**Design decision:** Emergent territory-based triggers are preferred. If a player somehow holds Derventa, the HVO brigade should survive — that's valid emergent gameplay.

**Processing:** New pipeline step `process-lifecycle-events` runs once per turn before recruitment. Checks all pending events against triggers.

---

## 5. OSID Mapping Reference

### 5.1 Resolution Chain

```
Brigade OOB → home_osid (if explicit) → OR → home_mun → municipality_hq_settlement.json → canonical SID → canonical_to_operational_map.json → OSID
```

**Only 16 of 244 brigades** have explicit `home_osid` (enclaves: Goražde 7, Srebrenica 5, Žepa 1, Han Pijesak 2, Zvornik 1).

### 5.2 Known Gaps

| Issue | Status | Fix |
|-------|--------|-----|
| Orašje HQ SID (S136000) not in canonical map | 3 HVO brigades resolve to NONE | Add explicit `home_osid: "op:orasje:orasje"` |
| Buzim not a 1990 municipality | No OSIDs | Use parent `cazin` municipality |
| Široki Brijeg → `listica` | Alias | Document in code |
| Tomislavgrad → `duvno` | Alias | Document in code |
| Milići → within `vlasenica` | Sub-area | Use `op:vlasenica:milici_2` |

### 5.3 Key SRK Siege Ring OSID Assignments (New Brigades)

| New Brigade | home_mun | Resolved OSID | Siege Axis |
|-------------|----------|---------------|------------|
| Ilidža Brigade | ilidza | op:ilidza:kasindo | SW Sarajevo |
| Ilijaš Brigade | ilijas | op:ilijas:podlugovi | N Sarajevo |
| Igman Brigade | hadzici | op:hadzici:misevici_2 | Igman flank (RS-held) |

---

## 6. War Stories System

### 6.1 Narrative Arc Classification

Each brigade gets classified at game end:

| Arc | Criteria | Tone |
|-----|----------|------|
| **veteran** | >65% win rate, >60% personnel retained | Backbone of the corps |
| **bloodied** | Heavy combat, heavy losses, still fighting | The cost of holding the line |
| **shattered** | Active but <50% peak personnel, >100% cumulative casualties | A shadow, still in the line |
| **risen** | >150% cumulative casualties but rebuilt (ARBiH arc) | Destroyed and reborn |
| **destroyed** | Formation ceased to exist | History sealed |
| **garrison** | ≤2 battles | Patience, not blood |

### 6.2 Template-Based Generation

Deterministic text templates selected by arc + faction + key stats. No AI, no randomness. Example:

> *"The 303rd Viteška Mountain was nearly destroyed and rebuilt. Over 14 battles, it suffered 1,847 total casualties — far exceeding its original strength of 780. But it rose each time. By war's end, it stood at 1,640 men, a testament to the will to fight on."*

### 6.3 Notable Moments (up to 3 per brigade)

Selected deterministically from history data:
- First battle location and turn
- Longest defense streak (if ≥3)
- Longest victory streak (if ≥4)
- Worst single-battle casualties (if >50)
- Personnel nadir (if <30% peak)
- Decorations earned (turn + reason)

### 6.4 GUI Integration

**FormationDetail panel:** Collapsible "SERVICE RECORD" section with battle count, win/loss, casualties, territory, streaks, decorations.

**CorpsDetail panel:** Compact one-line summary per brigade:
```
501st Slavna Mountain     1,842 pers  [27B 18W-4L] [Slavna]
```

**End-of-game AAR:** Full war stories organized by corps, exportable in final save JSON as `war_stories[]`.

---

## 7. Historical Decorations (Pre-Assigned)

### 7.1 ARBiH (from Wikipedia cross-reference)

15 Slavna + 27 Viteška confirmed. Loaded from `honor` field (existing) or new `historical_decorations` array.

### 7.2 VRS (from sr.wiki research)

| Unit | Decoration | Tier |
|------|-----------|------|
| 65th Protection Regiment | Orden Miloša Obilića | tier_3 |
| 1st Zvornik Infantry | Medalja Petra Mrkonjića | tier_1 |
| 1st Podrinje LI | Orden Nemanjića | tier_2 |
| 1st Romanija Infantry | Medalja Petra Mrkonjića | tier_1 |
| 1st Herzegovina Motorized | Medalja Petra Mrkonjića | tier_1 |
| 8th Herzegovina Motorized | Orden Nemanjića | tier_2 |
| 15th Herzegovina Motorized | Medalja Petra Mrkonjića | tier_1 |
| 11th Herzegovina Infantry | Orden Nemanjića | tier_2 |
| 2nd Herzegovina LI | Medalja Petra Mrkonjića | tier_1 |

### 7.3 HVO (from hr.wiki + en.wiki research)

| Unit | Decoration | Tier |
|------|-----------|------|
| 1st Guard "Ante Bruno Bušić" | Red N.Š. Zrinskog | tier_1 |
| 2nd Guard Mechanized | Red N.Š. Zrinskog | tier_1 |
| 3rd Guard "Jastrebovi" | Red N.Š. Zrinskog | tier_1 |
| 4th Guard "Sinovi Posavine" | Red N.Š. Zrinskog | tier_1 |

---

## 8. Implementation Plan

### Phase 1: Schema + Data (no behavior change)
**Effort:** 1-2 sessions | **Risk:** Low

1. Update `oob_brigades.json` with all additions/removals/corrections
   - Add 5 VRS, 1 ARBiH, 6 HVO brigades
   - Remove 5 VRS duplicates, 8 HVO duplicates
   - Fix spawn timings (15+ corrections)
   - Add `available_until` for Derventa/Modriča HVO
   - Add `is_elite: true` for Guards/65th/ABB
   - Add `historical_decorations` arrays
   - Fix Orašje `home_osid` overrides
   - Add home municipality to all brigade profiles
2. Create `data/source/formation_lifecycle_events.json`
3. Extend `FormationState` in `game_state.ts` (all new fields optional)
4. Update `oob_loader.ts` to read new fields
5. Tests: schema validation, load/save roundtrip

### Phase 2: Brigade History + Recording
**Effort:** 1-2 sessions | **Risk:** Medium (touches attack resolution)

1. Create `src/state/brigade_history.ts` — interfaces + helpers
2. Create `src/sim/combat/brigade_history_recorder.ts`
3. Wire `recordBrigadeEngagement()` into `attack_resolution_osid.ts`
4. Add `init-brigade-history` pipeline step
5. Tests: history recording, engagement cap, tally correctness

### Phase 3: Decoration System
**Effort:** 1 session | **Risk:** Medium (affects combat math)

1. Create `src/state/decoration_constants.ts` + `decoration_names.ts`
2. Create `src/sim/combat/decoration_evaluator.ts`
3. Add `evaluate-brigade-decorations` pipeline step
4. Replace honor-based bonus in `combat_math.ts` with `getDecorationBonus()`
5. Convert legacy `honor` → `decorations[]` in oob_loader
6. Tests: decoration eligibility, combat bonus, backward compat

### Phase 4: Troop Balancing + Lifecycle
**Effort:** 1 session | **Risk:** Medium (affects recruitment/reinforcement)

1. ~~Add faction personnel ceilings to `formation_constants.ts`~~ — **REMOVED in n369–n374.** Ceilings replaced by tuned mobilization scales + exhaustion thresholds in `ongoing_mobilization.ts`. See `docs/40_reports/implemented/20260303_CEILING_REMOVAL_EMERGENT_GROWTH.md`.
2. ~~Implement soft/hard cap check in `reinforceBrigadesFromPools()`~~ — **REMOVED.** `getFactionCeilingMult()` and `getFactionTotalPersonnel()` deleted.
3. Implement VRS equipment decay pipeline step
4. Create `src/sim/formation_lifecycle.ts` — process lifecycle events
5. Add `process-lifecycle-events` pipeline step
6. Tests: ceiling enforcement, decay rates, lifecycle triggers

### Phase 5: Elite Loan System
**Effort:** 1 session | **Risk:** Medium (new mechanic)

1. Create `src/sim/combat/elite_loan.ts`
2. Add `elite-loan-lifecycle` pipeline step
3. Wire bot AI elite deployment logic
4. Tests: loan/recall lifecycle, degradation, cooldown

### Phase 6: War Stories + GUI
**Effort:** 1-2 sessions | **Risk:** Low

1. Create `src/sim/war_stories.ts` — end-of-game generation
2. Update FormationDetail panel with SERVICE RECORD
3. Update CorpsDetail panel with compact battle records
4. Add decoration badges to UI
5. Add war stories to final save JSON
6. Tests: narrative generation, arc classification

### Phase 7: Calibration Run + Tuning
**Effort:** 1-2 sessions | **Risk:** Low

1. Run 40w calibration with new OOB
2. Compare OSID match rate vs n348 baseline (84.9%)
3. Tune decoration thresholds if too easy/hard
4. Tune elite loan parameters
5. Verify faction personnel ceilings don't distort results

---

## 9. New Files Summary

| File | Purpose | Phase |
|------|---------|-------|
| `src/state/brigade_history.ts` | BrigadeHistory + BrigadeEngagement interfaces, helpers | 2 |
| `src/state/decoration_constants.ts` | All decoration thresholds and tier definitions | 3 |
| `src/state/decoration_names.ts` | Faction-specific decoration display names | 3 |
| `src/sim/combat/brigade_history_recorder.ts` | recordBrigadeEngagement() | 2 |
| `src/sim/combat/decoration_evaluator.ts` | evaluateDecorations() pipeline step | 3 |
| `src/sim/combat/elite_loan.ts` | Elite unit loan/recall lifecycle | 5 |
| `src/sim/formation_lifecycle.ts` | Process lifecycle events (disband/merge/rename) | 4 |
| `src/sim/war_stories.ts` | End-of-game narrative generation | 6 |
| `data/source/formation_lifecycle_events.json` | Scripted lifecycle triggers | 1 |

## 10. Modified Files Summary

| File | Change | Phase |
|------|--------|-------|
| `data/source/oob_brigades.json` | All brigade add/remove/corrections + new fields | 1 |
| `src/state/game_state.ts` | FormationState extensions | 1 |
| `src/scenario/oob_loader.ts` | Read new fields, convert honor → decorations | 1, 3 |
| `src/sim/combat/attack_resolution_osid.ts` | Call recordBrigadeEngagement() | 2 |
| `src/sim/combat/combat_math.ts` | getDecorationBonus() replaces honor bonus | 3 |
| `src/state/formation_constants.ts` | Faction ceilings, decay constants, elite constants | 4, 5 |
| `src/sim/formation_spawn.ts` | Personnel ceiling check | 4 |
| `src/sim/recruitment_engine.ts` | Ceiling-aware recruitment | 4 |
| `src/sim/turn_phases/war_phases.ts` | New pipeline steps (5 new) | 2-5 |
| `src/ui/map/components/FormationDetail.tsx` | SERVICE RECORD section | 6 |
| `src/ui/map/components/CorpsDetail.tsx` | Compact battle records | 6 |

---

## 11. Design Principles Applied

1. **Determinism sacred:** All systems use sorted iteration, threshold-based decisions, no randomness
2. **Negative-sum thesis:** Brigade histories make losses personal; decorations make victories precious; elite degradation punishes overconfidence
3. **Organic doctrinal arcs:** VRS decay and ARBiH rise emerge from mechanics (equipment decay, reinforcement ramps, earned decorations), not scripted switches
4. **Backward compatible:** All new fields optional, legacy `honor` still works, old saves load correctly
5. **Home municipality visible:** Every brigade profile displays home municipality — connection to the map
6. **Fun through asymmetric attention:** Player manages 5-6 corps, not 130 brigades; history system creates natural triage priorities
7. **Historical accuracy:** Wikipedia cross-reference (260+ articles, 5 languages) validated brigade lists, spawn timings, and decorations

---

## 12. Design Decisions (Resolved)

All open questions resolved 2026-03-02:

1. **Engagement log cap: 200 entries.** Full engagement log for maximum narrative depth. ~2.7 MB save impact accepted.
2. **Three decoration tiers.** Top tier (Zlatni Ljiljan / Obilić / Trolist) is aspirational — maybe 2-3 brigades per full game. More granularity, more progression.
3. **VRS equipment decay floor: 60%.** Significant late-game degradation. Matches historical collapse. Forces careful resource management.
4. **HVO Guard brigade timing: historically late (1994+, ~week 80+).** Scenario runs to game end, not 52 weeks. Guards form at actual historical dates — 1st Guard ABB ~week 80, others later.
5. **Lifecycle events: emergent (territory-based).** Derventa HVO disbands when Derventa OSID flips to RS. More elegant, reacts to actual gameplay. No fixed-week fallback.
