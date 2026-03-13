# Comprehensive Sector Defense Rework — Implementation Plan

**Date:** 2026-03-13
**Status:** ALL THREE LAYERS IMPLEMENTED (n668 + Layer C). Complete.
**Scope:** Three-layer rework: (A) Distance-weighted reactive defense engine, (B) Independent sector stance system, (C) Player visibility UI
**Affects:** Calibration, sector defense model, casualty distribution, bot AI, map UI, battle reports

### Layer Summary

| Layer | What | Files | Calibration Impact |
|-------|------|-------|--------------------|
| **A** | Distance-weighted reactive defense + casualty distribution | `combat_math.ts`, `attack_resolution_osid.ts`, `combat_predictor.ts` | HIGH |
| **B** | Independent sector stances (not just corps mirror) | `sector_stance_orders.ts`, `bot_corps_directives.ts`, `game_state.ts` | MEDIUM |
| **C** | Defense heat map, enhanced battle reports, sector UI | `buildDensityGeoJSON.ts`, `CorpsFrontPanel.tsx`, `AARPanel.tsx`, `MapModeToolbar.tsx` | NONE (display only) |

Implementation order: A → B → C (each layer builds on the previous)

---

## Problem Statement

The current reactive defense model treats all sector reserves as a **flat pool**:

```typescript
const sectorReserves = totalPower - physicalPower;
const reactiveResponse = Math.min(
    sectorReserves,
    attackerFormations.length * avgBrigadePower * REACTIVE_DEFENSE_RATIO
);
```

This means:
1. **Distance is irrelevant** — a brigade 8 hops away contributes identically to one adjacent to the attack.
2. **Home-municipality motivation ignored** — a brigade defending its hometown responds no differently than one dropped into an alien sector.
3. **Corps positioning wasted** — the corps spends effort on home-municipality affinity assignment (Phase 2a in `classifyBrigadesByTerritory`), but the combat system treats all reserves as interchangeable.
4. **Probes meaningless** — attacking far from the enemy concentration gets the SAME response as attacking their strongest point. Historical probes worked precisely because they exploited slow response times at weak points.
5. **Casualty distribution arbitrary** — 50% to primary (closest), 50% spread by personnel. No connection to who actually fought.

### Evidence from `analyze_defense_model.cjs` (n665)

- **74% of front OSIDs are empty** (293 empty / 103 occupied out of 396 total)
- **30+ of 55 meaningful sectors have only 1 brigade** — for these, defense is 100% uniform (no differentiation between occupied/empty OSIDs)
- For multi-brigade sectors at RATIO=1.5: empty/occupied defense = 60% (only 40% differentiation)
- For multi-brigade sectors at RATIO=1.0: empty/occupied defense = 50%
- The RATIO=1.5 change actually made defense MORE uniform, not less

---

## Design

### Three factors shape a reserve brigade's reactive contribution:

#### 1. Physical Distance (BFS hops through friendly territory)

```
hop 0: 1.00  (right there — fight at full power)
hop 1: 0.60  (adjacent — hear gunfire, rush over)
hop 2: 0.36  (nearby — takes time to organize response)
hop 3: 0.22  (distant — partial response at best)
hop 4: 0.13  (too far — token contribution)
hop 5+: 0.00 (unreachable in tactical timeframe)
```

Decay formula: `REACTIVE_DISTANCE_BASE ^ hops` where `REACTIVE_DISTANCE_BASE = 0.60`
Max hops: `REACTIVE_DISTANCE_MAX_HOPS = 5`

#### 2. Home-Municipality Motivation

If the attacked OSID is in the reserve brigade's home municipality, they respond more aggressively:
- They know the terrain intimately
- Local population provides intelligence and support
- Fighting for their families and homes — visceral motivation
- The corps assigned them there FOR this reason

`HOME_DEFENSE_REACTIVE_BONUS = 1.5` (multiplier on distance-weighted contribution)

A brigade 3 hops away but defending home: `0.22 × 1.5 = 0.33`
An unrelated brigade 2 hops away: `0.36 × 1.0 = 0.36`

Home motivation nearly closes the distance gap. A brigade NEVER abandons its hometown.

#### 3. Per-Brigade Combat Power (already computed)

`computeDefenderPower()` already includes home distance effectiveness, supply state, fatigue, entrenchment, morale, etc. The distance decay and home bonus multiply ON TOP of this individual power.

### Formula

```
For each reserve brigade (not physically at targetOsid):
  hops = bfsDistanceFriendly(brigade.location_osid → targetOsid, friendly territory)
  distWeight = REACTIVE_DISTANCE_BASE ^ hops  (0 if hops > MAX_HOPS or unreachable)
  homeMun = munFromOsid(brigade.home_osid)
  targetMun = munFromOsid(targetOsid)
  homeBonus = (homeMun === targetMun) ? HOME_DEFENSE_REACTIVE_BONUS : 1.0
  contribution = brigadePower × distWeight × homeBonus

effectiveReserves = Σ(contributions)
reactiveResponse = min(effectiveReserves, attackerCount × avgBrigadePower × REACTIVE_DEFENSE_RATIO)
defenderPower = physicalPower + reactiveResponse
defenderPower = max(defenderPower, avgBrigadePower × MIN_DEFENSE_FLOOR_FRACTION)
```

Physical defenders at the OSID still contribute at full power (hop 0, weight 1.0).
The `REACTIVE_DEFENSE_RATIO` cap still limits total reactive response proportional to attack size.
The `MIN_DEFENSE_FLOOR_FRACTION` floor still prevents truly zero defense.

### Casualty Distribution — Same Weights

**Current model:** 50% to primary (closest brigade), 50% spread by personnel to rest.

**New model:** Casualties distributed proportionally to each brigade's reactive weight.

```
For each sector brigade:
  if at targetOsid: weight = 1.0 × homeBonus (× their share of physical power if multiple)
  else: weight = distWeight × homeBonus (same as reactive contribution)

Normalize weights → distribute finalDefenderCas proportionally
```

This naturally produces:
- **Physical defenders take the most** (weight 1.0 — they're in the fight)
- **Home-municipality brigades absorb more** (they're fighting harder, won't pull back)
- **Distant brigades take almost nothing** (token contribution → token casualties)
- **No arbitrary 50/50 split** — the weights do the work

### BFS Helper

New `bfsDistanceFriendly(from, to, adjacency, state, factionId, reverseMap)` in `combat_math.ts`:
- BFS through friendly territory only (same-faction controlled OSIDs)
- Bounded to `REACTIVE_DISTANCE_MAX_HOPS` for performance (early exit)
- Returns hop count or Infinity if unreachable
- Pattern already exists: `bfsDistanceToCapital` in `attack_resolution_osid.ts` line 178

---

## Corps Perspective

This design makes the corps's organizational decisions **combat-relevant**:

1. **Phase 2a home-affinity assignment** — corps places brigades in their home-municipality sectors. Now those brigades respond MORE aggressively to attacks in their sector (higher reactive weight + home bonus).

2. **Concentration decisions matter** — if corps clusters 3 brigades near a key point, that point gets strong reactive defense from nearby reserves. But the far end of the sector line becomes genuinely thin.

3. **Thin sectors are thin** — a single-brigade sector with 15 front edges currently defends every edge at 100% power. After this change, the brigade at hop 0 gets 100% defense, but edges 4+ hops away get only ~13% reactive response. Probing the far end of a thin sector works.

4. **Corps must reform sectors** — when front lines shift and a sector's brigade is now far from its front, the corps will naturally need to reform sectors or march brigades forward. Currently there's no urgency because distance doesn't matter.

---

## Step-by-Step Implementation

### Step 1: `combat_math.ts` — Constants and helpers

```typescript
// New constants
export const REACTIVE_DISTANCE_BASE = 0.60;
export const REACTIVE_DISTANCE_MAX_HOPS = 5;
export const HOME_DEFENSE_REACTIVE_BONUS = 1.5;

// New functions
export function getReactiveDistanceWeight(hops: number): number;
export function bfsDistanceFriendly(from, to, adjacency, state, factionId, reverseMap, maxHops): number;
```

Also: extract `munFromOsid()` to a shared location (currently private in `corps_front_sectors.ts`).

### Step 2: `attack_resolution_osid.ts` — Resolver

**Replace lines 631-641** (flat reactive response):
- Compute per-brigade distance and home bonus
- Sum weighted contributions → `effectiveReserves`
- Apply REACTIVE_DEFENSE_RATIO cap
- Store per-brigade weights for casualty distribution

**Replace lines 825-853** (50/50 casualty split):
- Use stored weights to distribute casualties proportionally
- Physical defenders get weight 1.0 × homeBonus
- Reserve brigades get distWeight × homeBonus
- Normalize and distribute

### Step 3: `combat_predictor.ts` — Mirror

**Replace lines 231-240** (predictor reactive response):
- Same distance-weighted computation as resolver
- Same constants, same BFS, same decay
- Predictor doesn't distribute casualties (no change needed there)

### Step 4: Tests

- Unit tests for `getReactiveDistanceWeight()` — verify decay curve
- Unit tests for `bfsDistanceFriendly()` — verify BFS through friendly territory
- Integration test: occupied OSID defense > adjacent empty OSID > distant empty OSID
- Integration test: home-municipality brigade at 3 hops > stranger at 2 hops
- Integration test: casualty distribution proportional to weights

### Step 5: Scenario run + calibration

- Fresh 40w run
- Compare with `tools/compare_painted_vs_sim.cjs`
- Run updated `tools/analyze_defense_model.cjs` showing new per-OSID defense variation
- /war-or-game insanity check

---

## Determinism Checklist

- [ ] No `Math.random()` — BFS is deterministic, decay is pure math
- [ ] Sorted iteration — brigade lists already sorted via `strictCompare`
- [ ] No timestamps — pure functions only
- [ ] Predictor mirrors resolver — same constants, same BFS, same decay
- [ ] `munFromOsid()` is a pure string parse — deterministic

---

## Risk Assessment

- **Calibration impact (HIGH)**: Weaker defense at distant empty OSIDs → more successful probes → potentially more territory change. The defense floor (`MIN_DEFENSE_FLOOR_FRACTION = 0.75`) still provides a minimum. May need to tune `REACTIVE_DISTANCE_BASE` after first run.
- **Performance (LOW)**: BFS per reserve brigade per battle, bounded by `MAX_HOPS=5`. Typical sector has <10 brigades. BFS visits <50 OSIDs per call. Negligible.
- **Predictor divergence (MEDIUM)**: Must mirror exactly. Single shared function in `combat_math.ts` eliminates duplication risk.

---

## Lessons Learned (from analysis leading to this plan)

### Flat pooling hides organizational structure

The flat `sectorReserves = totalPower - physicalPower` model erased all the work the corps does in positioning brigades. Corps Phase 2a assigns brigades to home-municipality sectors. Corps reforms sectors based on front changes. But in combat, ALL reserves are treated as identical — a brigade the corps carefully placed near a key position contributes the same as one dumped in the back of the sector. The organizational layer was invisible to combat.

**Lesson:** When a higher-level system (corps) makes positioning decisions, the lower-level system (combat) must respect those decisions. If combat treats all reserves as a flat pool, the corps's work is wasted, and the simulation loses a dimension of strategic depth.

### Defense non-uniformity requires per-entity contribution tracking

The old model computed defense as `totalPower / edges × density` (n500) → then `physicalPower + reactiveResponse` (n524). Both are AGGREGATE models — they compute a single number for the whole sector and divide it. Per-entity tracking (what does THIS brigade contribute to defense at THIS OSID?) was never done because it seemed unnecessary.

But non-uniform defense — the historical reality — requires knowing WHERE each brigade is, HOW FAR it is from the fight, and WHY it's there (home defense or not). Aggregate models can't express this.

**Lesson:** When a model needs to express spatial variation within a single unit (sector), aggregate division doesn't work. You need per-entity contribution with spatial weighting. The extra computation cost is trivial; the expressiveness gain is fundamental.

---

# Layer B: Independent Sector Stance System

## Problem Statement

Sectors currently have **NO independent stance**. The existing `sector_stance_orders.ts` (52 lines) is just a batch posture command — it iterates `assigned_brigade_ids` and pushes each brigade's posture to match the order's stance. The "effective sector stance" shown in `CorpsFrontPanel.tsx` (line 143) is derived by majority-counting brigade postures — purely a display hack.

This means:
1. **Every sector in a corps mirrors the corps stance** — a Sarajevo siege ring sector and a quiet Romanija Mountain sector both get "balanced" because the SRK is balanced. No differentiation.
2. **Bot can't adapt sector-by-sector** — corps decides offensive/balanced/defensive for ALL sectors. A corps with one threatened sector must make its entire front defensive, weakening its offensive sectors.
3. **Player has no granular control** — player issues corps-level stance changes. Can't tell one sector to dig in while another prepares an attack.
4. **Sector stance doesn't affect combat** — even if the player issues a `SectorStanceOrder`, it only changes brigade postures. No entrenchment bonus, no reserve fraction, no readiness modifier.

## Design

### Five Sector Stances

| Stance | Reserve Fraction | Entrenchment Rate | Readiness | Reactive Bonus | Description |
|--------|-----------------|-------------------|-----------|---------------|-------------|
| **Fortify** | 0% | 2.0× | 0.6× | 1.3× | All hands digging. Maximum entrenchment growth. No offensive capability. Reactive defense boosted (prepared positions). |
| **Defend** | 20% | 1.2× | 0.8× | 1.15× | Standard defense. Some reserves maintained. Moderate entrenchment growth. Default for most sectors. |
| **Elastic** | 35% | 0.8× | 1.0× | 1.0× | Defense in depth. Large reserve for counterattack. Willing to trade space for time. Less entrenchment (not committing to fixed positions). |
| **Active Defense** | 15% | 0.6× | 1.2× | 0.85× | Aggressive patrolling, raids, counter-probes. Best readiness for sudden ops. Less entrenchment (mobile posture). Reactive defense slightly reduced (forces spread thin by patrols). |
| **Screening** | 0% | 0.0× | 0.4× | 0.5× | Tripwire. Minimum force to detect incursion. Used for quiet fronts, cold fronts (Graz), or secondary sectors. Half reactive defense (not expecting real attack). |

**Default:** `defend` — sectors inherit this unless explicitly changed by corps AI or player.

### Interaction with Corps Stance

Corps stance sets the **ceiling**, sector stance operates within it:

| Corps Stance | Allowed Sector Stances |
|-------------|----------------------|
| `offensive` | active_defense, elastic, defend |
| `balanced` | all five |
| `defensive` | fortify, defend, elastic |
| `reorganize` | fortify, defend, screening |

A defensive corps can't have sectors in active_defense. An offensive corps can't have sectors in fortify (they're attacking, not digging in).

### State Changes

**`CorpsFrontSector` interface** (game_state.ts line 1430):
```typescript
export interface CorpsFrontSector {
    // ... existing fields ...
    /** Sector stance: independent of corps stance, within corps constraints. */
    sector_stance: SectorStance;
    /** Who set this stance: 'bot' | 'player'. Player overrides persist until changed. */
    stance_source: 'bot' | 'player';
}

export type SectorStance = 'fortify' | 'defend' | 'elastic' | 'active_defense' | 'screening';
```

**`SectorStanceOrder` rework** — currently pushes brigade postures. New behavior:
- Sets `sector.sector_stance` and `sector.stance_source = 'player'`
- Brigade posture mapping derived from sector stance (not the other way around):
  - `fortify` → all brigades `defend`
  - `defend` → front brigades `defend`, reserve `defend`
  - `elastic` → front brigades `defend`, reserve `attack` (ready to counter)
  - `active_defense` → front brigades `attack`, reserve `attack`
  - `screening` → all brigades `defend` (but fewer of them)

### Bot AI: Sector Stance Evaluation

New function in `bot_corps_directives.ts`: `evaluateSectorStances(state, corpsId)`

Runs after sector construction, before operation decisions. Per-sector logic:

1. **Threat assessment**: `sector.threat_ratio` from `sector_combat_rating.ts`
2. **Strategic value**: Does sector contain offensive_targets? Adjacent to friendly operations?
3. **Cold front check**: `isColdFront()` → `screening` (why waste effort on a truce line?)
4. **Stance selection rules**:
   - `threat_ratio > 2.0` AND `brigade_count <= 2` → `fortify` (outgunned, dig in)
   - `threat_ratio > 1.5` → `defend` (threatened but can hold)
   - `threat_ratio < 0.5` AND sector has offensive targets → `active_defense` (probe opportunity)
   - `threat_ratio < 0.3` AND no offensive targets → `screening` (quiet sector, save effort)
   - Active operation staging in this sector → `elastic` (need reserves for the op)
   - Default → `defend`
5. **Player override**: if `stance_source === 'player'`, skip bot evaluation. Player's word stands until they change it.

### Combat Integration

Sector stance modifiers feed into the Layer A distance-weighted defense:

```
reactiveBonus = SECTOR_STANCE_REACTIVE_BONUS[sector.sector_stance]
// Applied as multiplier on the entire reactive response for this sector
reactiveResponse *= reactiveBonus
```

Entrenchment rate modifier:
```
// In entrenchment growth (cohesion_drift.ts or similar):
entrenchmentGain *= SECTOR_STANCE_ENTRENCHMENT_RATE[sector.sector_stance]
```

### Implementation Steps (Layer B)

1. **State**: Add `sector_stance` and `stance_source` to `CorpsFrontSector` interface. Add `SectorStance` type. Add stance constants to `combat_math.ts`.
2. **Sector construction**: Default all new sectors to `defend` / `bot`. Preserve player-set stances across sector reforms (match by corps_id + overlapping territory_osids).
3. **Bot AI**: `evaluateSectorStances()` in `bot_corps_directives.ts`. Called in pipeline after `computeSectorCombatRatings`.
4. **Sector stance orders**: Rework `sector_stance_orders.ts` to set sector stance instead of directly setting brigade postures. Derive brigade postures from sector stance.
5. **Combat integration**: Feed `reactiveBonus` into Layer A formula. Feed entrenchment modifier into growth.
6. **Tests**: Unit tests for stance selection rules. Integration test: fortified sector gets higher reactive defense. Integration test: screening sector gets lower reactive defense. Test: player override persists.

---

# Layer C: Player Visibility & UI

## Problem Statement (4 identified gaps)

### Gap 1: Density Map is Crude
`buildDensityGeoJSON.ts` shows a flat 3-tier classification per sector:
- Red (thin < 0.5 brigades/edge), Amber (normal 0.5-1.0), Green (dense > 1.0)
- ALL OSIDs in a sector get the same color — no per-OSID variation
- After Layer A, the real defense strength varies dramatically within a single sector. The density layer hides this.

### Gap 2: Battle Reports Missing Defenders
`AARPanel.tsx` shows primary attacker and primary defender only. No `all_defender_ids` field exists in battle records. Casualty distribution (Layer A's weighted system) is invisible — the player can't see which brigades fought and absorbed casualties at each OSID.

### Gap 3: Sector Panel Lacks Stance Control
`CorpsFrontPanel.tsx` shows "STANCE" but displays the corps stance. `issueSectorStance()` exists (line 146) but sets brigade postures, not a real sector stance. After Layer B, the player needs genuine sector stance selection.

### Gap 4: No Reactive Defense Preview
Player has no way to see "if I attack THIS OSID, how strong is the defense?" without committing forces. The predictor runs behind the scenes for bot AI but the player is blind.

## Design

### C1: Defense Strength Heat Map (replaces density layer)

**Replace** map mode `5: Density` with `5: Defense`.

**What changes:**
- `buildDensityGeoJSON.ts` → `buildDefenseStrengthGeoJSON.ts`
- Per-OSID defense strength (not per-sector density)
- Computed using Layer A's distance-weighted formula for each friendly front OSID
- Color gradient: continuous, not 3-tier

**Computation per OSID:**
```
For each friendly front OSID:
  physicalPower = Σ(power of brigades AT this OSID)
  reactiveResponse = Σ(power × distWeight × homeBonus for each other sector brigade)
  reactiveResponse *= sectorStanceReactiveBonus  (Layer B)
  reactiveResponse = min(reactiveResponse, refAttackerPower × REACTIVE_DEFENSE_RATIO)
  totalDefense = physicalPower + reactiveResponse
  normalizedStrength = totalDefense / REFERENCE_ATTACKER_POWER
```

**Color scale** (continuous gradient, ~0.35 opacity):
| Strength | Color | Meaning |
|----------|-------|---------|
| 0.0 - 0.3 | Deep red (#cc2222) | Critical — virtually undefended |
| 0.3 - 0.7 | Orange-red (#cc6622) | Thin — probes will succeed |
| 0.7 - 1.0 | Amber (#ccaa22) | Contested — roughly matched |
| 1.0 - 1.5 | Yellow-green (#88aa22) | Adequate — defense favored |
| 1.5 - 2.0 | Green (#44aa44) | Strong — attacks costly |
| 2.0+ | Deep green (#228844) | Fortress — near-impregnable |

**Why continuous, not 3-tier:** The whole point of Layer A is that defense is NON-UNIFORM. A 3-tier map would erase the very differentiation we're creating. The heat map must show the gradient — bright red at the far end of a thin sector fading to green where the brigade sits.

**GeoJSON builder input changes:**
- Needs: sector data, brigade locations + power, BFS adjacency, political controllers (for friendly-territory BFS)
- Currently gets: `controlGeoJson`, `sectors[]`, `frontEdgesOsid[]`
- New signature adds: `formations`, `politicalControllers`, `sectorStances`
- Computation runs in the adapter/builder (display-only, not in engine pipeline)

**MapModeToolbar change:** Rename mode 5 label from "Density" to "Defense".

### C2: Enhanced Battle Reports

**`AttackResolutionOsidReport` changes** (or new sub-record):
```typescript
interface DefenderContribution {
    brigade_id: FormationId;
    power_contributed: number;
    distance_hops: number;
    is_home_municipality: boolean;
    reactive_weight: number;
    casualties_taken: number;
}

// Add to battle record:
all_defender_contributions: DefenderContribution[];
```

**AARPanel display:**
- Current: "Defender: 4th Motorized [RS]" + casualty count
- New: "Defenders:" with a breakdown list:
  - "4th Motorized [at OSID, home] — 450 power, 62 cas"
  - "7th Infantry [1 hop] — 270 power, 38 cas"
  - "12th Mountain [3 hops] — 98 power, 12 cas"
- Shows distance (hop count as shield icon), home badge, power contributed, casualties
- Compact format — collapses by default, expandable

**Brigade history enhancement:**
- Currently records ONE defender engagement per battle
- After: records all defender participations with weights
- Enables formation-level after-action: "This brigade defended at 3 locations this turn, taking 142 total casualties"

### C3: Sector Stance Controls

**CorpsFrontPanel** rework:
- **Stance selector**: 5 radio buttons/pills matching sector stances (Fortify / Defend / Elastic / Active Defense / Screening)
- **Visual indicator**: When player has overridden bot stance, show a small "MANUAL" badge
- **Stance effects summary**: Below selector, show what the stance means:
  - "Reserve: 20% | Entrenchment: 1.2× | Reactive: 1.15×"
- **Corps constraint**: Grey out stances not allowed by current corps stance
- **Reset button**: "Return to AI Control" — sets `stance_source` back to `bot`

**Sector color coding** (on map, sector outlines):
- Currently: sector outlines are a single color per faction
- Enhancement: outline color/style indicates stance:
  - Fortify: thick double line
  - Defend: solid line (default, current)
  - Elastic: dashed line
  - Active Defense: dot-dash line
  - Screening: thin dotted line
- Subtle — only visible when "Sectors" layer is on

### C4: Home Defense Indicators

**Formation markers on map:**
- When a brigade is in its home municipality: small house/shield icon overlay on the unit marker
- When a brigade is defending a sector containing its home municipality: unit marker has a subtle glow or border
- This gives the player visual feedback about which units are "at home" and will fight harder (Layer A home bonus)

### C5: Reactive Defense Preview (hover)

**On OSID hover (when Defense map mode active):**
- Tooltip shows:
  - "Defense Strength: 1,240 (1.24× reference)"
  - "Physical: 800 (1st Motorized)"
  - "Reactive: 440 (3 brigades within range)"
  - Breakdown of reactive contributors with distance
  - Sector stance bonus
- This is the same computation as the heat map, just detailed for the hovered OSID
- Only in Defense map mode (not cluttering other modes)

## Implementation Steps (Layer C)

### C-Step 1: Defense Strength GeoJSON Builder
- New `buildDefenseStrengthGeoJSON.ts` (replaces `buildDensityGeoJSON.ts`)
- Reuse Layer A's `getReactiveDistanceWeight()` and `bfsDistanceFriendly()`
- Per-OSID defense strength → continuous color gradient
- Update `MapModeToolbar.tsx` label: "Density" → "Defense"
- Update `gameStore.ts` MapMode type if needed
- Update the layer style in MapContainer to use continuous color interpolation instead of 3-class match

### C-Step 2: Battle Record Enhancement
- Add `DefenderContribution[]` to battle record type
- Populate in `attack_resolution_osid.ts` during casualty distribution (Layer A already computes weights)
- Update `AARPanel.tsx` to display defender breakdown
- Update brigade history to record all defender participations

### C-Step 3: Sector Stance UI
- Add stance selector to `CorpsFrontPanel.tsx`
- Wire to `SectorStanceOrder` dispatch (Layer B's reworked orders)
- Show stance effects summary
- Grey out invalid stances per corps constraint
- "Return to AI Control" reset button

### C-Step 4: Home Defense Indicators
- Add home-municipality check to unit marker rendering
- Small icon/badge overlay for "at home" brigades
- Derive from `munFromOsid(brigade.home_osid) === munFromOsid(brigade.location_osid)`

### C-Step 5: Defense Preview Tooltip
- On hover of front OSID in Defense mode: compute and display defense breakdown
- Reuse the same builder computation
- Format as tooltip with compact breakdown

---

# Cross-Layer Determinism Checklist

- [ ] **Layer A**: No `Math.random()`. BFS deterministic. Decay pure math. Sorted iteration. Predictor mirrors resolver.
- [ ] **Layer B**: Sector stance selection rules are deterministic (threat_ratio thresholds). Player overrides persist across turns. Stance-to-posture mapping is a fixed table.
- [ ] **Layer C**: Display only — no engine state mutation. Heat map computed from engine state. Preview uses same functions as engine.
- [ ] **Cross-layer**: Layer B's reactive bonus feeds into Layer A's formula (single multiplication). Layer C reads Layer A+B outputs. No circular dependencies.

---

# Full Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Calibration shift from Layer A | HIGH | `MIN_DEFENSE_FLOOR_FRACTION` still provides minimum. Tune `REACTIVE_DISTANCE_BASE` after first run. |
| Sector stance interaction with doctrine | MEDIUM | Stances constrained by corps stance ceiling. Bot evaluation is conservative (defaults to `defend`). |
| Performance of per-OSID defense computation in heat map | LOW | Heat map is UI-only, computed on adapter side. BFS bounded by MAX_HOPS=5. <50 OSIDs per BFS. |
| Predictor divergence | MEDIUM | Single shared function in `combat_math.ts`. Layer B reactive bonus from sector state (available to both). |
| Player information overload | LOW | Heat map replaces (not adds to) density layer. Battle report expansion is collapsible. Hover preview only in Defense mode. |
| State schema migration | LOW | `sector_stance` defaults to `defend`. Old saves work — missing field = default. |

---

# Phased Implementation Schedule

Each phase ends with a verification gate: /simplify pass on changed code, fresh 40w scenario run, and /war-or-game realism audit. No phase begins until the previous gate passes.

### Phase 1: Layer A — Engine

**Implementation:**
1. Constants + `bfsDistanceFriendly()` + `getReactiveDistanceWeight()` + extract `munFromOsid()`
2. Resolver rework (distance-weighted reactive + weighted casualty distribution)
3. Predictor mirror
4. Tests (unit + integration)

**Gate 1A — Simplify:**
- /simplify on `combat_math.ts`, `attack_resolution_osid.ts`, `combat_predictor.ts`
- Check for dead code from old flat-pool model, redundant BFS implementations, duplication between resolver and predictor

**Gate 1B — Scenario Verification:**
- Fresh `npm run sim:scenario:run:40w`
- Run `tools/compare_painted_vs_sim.cjs` — record area-weighted % and RS w40
- Run updated `tools/analyze_defense_model.cjs` — verify per-OSID defense variation (occupied vs empty ratio should show clear gradient, not near-uniform)
- Smoke triad: `tsc --noEmit`, `vitest run`, `desktop:map:build`

**Gate 1C — /war-or-game Realism Audit:**
- Are probes now exploiting weak points? (Far-from-brigade OSIDs should show lower defense)
- Are casualty distributions realistic? (Physical defenders take most, distant reserves take little)
- Has defense become too weak at empty OSIDs? (Successful attacks should increase but not become universal)
- Are single-brigade sectors still viable? (Defense floor should prevent instant collapse)
- Does the RS blitz behave differently? (Probing weak points should yield faster advances in low-density sectors)
- Record findings in CALIBRATION_MASTER.md

### Phase 2: Layer B — Sector Stances

**Implementation:**
1. State changes (CorpsFrontSector + SectorStance type)
2. Bot AI evaluation (`evaluateSectorStances`)
3. Sector stance orders rework
4. Combat integration (reactive bonus + entrenchment modifier)
5. Tests

**Gate 2A — Simplify:**
- /simplify on `sector_stance_orders.ts`, `bot_corps_directives.ts`, `game_state.ts`
- Check: old batch-posture-push code fully replaced (not lingering alongside new stance system), stance constants consolidated in one location, bot evaluation logic not duplicated

**Gate 2B — Scenario Verification:**
- Fresh `npm run sim:scenario:run:40w`
- Compare with Gate 1B baseline — Layer B should show MEDIUM calibration delta (not catastrophic shift)
- Write diagnostic script: `tools/check_sector_stances.cjs` — dump per-sector stance distribution at w10/w20/w40. Verify:
  - Cold fronts (RS↔HRHB) get `screening`
  - High-threat sectors get `fortify` or `defend`
  - Sectors adjacent to active operations get `elastic`
  - No stance is overwhelmingly dominant (if 90% are `defend`, the bot evaluation thresholds need tuning)
- Smoke triad

**Gate 2C — /war-or-game Realism Audit:**
- Do stance distributions look like a real commander's choices? (Not all the same)
- Is the fortify/screening split sensible? (Quiet RS↔HRHB fronts should be screening; Sarajevo siege ring should be fortify or defend)
- Are entrenchment rates differentiating? (Fortified sectors should visibly out-entrench active-defense sectors by w20)
- Has the Layer A distance-weighted defense been disrupted? (Layer B reactive bonuses should modulate, not override)
- Are there pathological stance oscillations? (Bot shouldn't flip stances every turn — check for stability)
- Record findings in CALIBRATION_MASTER.md

### Phase 3: Layer C — UI

**Implementation:**
1. Defense strength heat map (C-Step 1)
2. Battle record + AARPanel enhancement (C-Step 2)
3. Sector stance controls (C-Step 3)
4. Home defense indicators + hover preview (C-Steps 4-5)

**Gate 3A — Simplify:**
- /simplify on `buildDefenseStrengthGeoJSON.ts`, `AARPanel.tsx`, `CorpsFrontPanel.tsx`, `MapModeToolbar.tsx`
- Check: old `buildDensityGeoJSON.ts` fully replaced (no dead import), no engine state mutation in UI code, GeoJSON builder doesn't duplicate BFS logic (should import from `combat_math.ts`)

**Gate 3B — Visual Verification:**
- Load a w20 save in desktop app (`npm run desktop`)
- Defense heat map: verify gradient visible (red at thin sector edges, green at brigade positions). Screenshot for report.
- Battle report: click a recent battle — verify defender breakdown shows multiple brigades with distances
- Sector stance controls: select a sector → change stance → advance turn → verify stance persists and affects display
- Home defense indicators: find a brigade at its home municipality → verify icon/badge visible
- Hover preview: hover front OSIDs in Defense mode → verify tooltip shows physical + reactive breakdown
- Smoke triad

**Gate 3C — /war-or-game Realism Audit (visual focus):**
- Does the defense heat map match a staff officer's intuition? (Strong points should be where brigades cluster; thin flanks should be visible)
- Do battle reports tell a coherent story? (Physical defenders take most casualties, distant reserves contribute less)
- Are sector stance controls intuitive? (A player shouldn't need to read the plan document to understand what "Elastic" means)
- Is the information density appropriate? (Not overwhelming, not hiding critical data)

### Phase 4: Final Calibration & Tuning

1. Fresh 40w run with all three layers active
2. Full /war-or-game insanity check — brigade states, casualty ratios, tempo, troop strength, equipment, sector stances, defense distribution
3. Tune constants if needed:
   - `REACTIVE_DISTANCE_BASE` (0.60 initial — increase if defense too weak, decrease if still too uniform)
   - Sector stance thresholds (threat_ratio breakpoints for bot evaluation)
   - Sector stance reactive bonuses (fortify 1.3× / screening 0.5× — adjust if effect too strong or too weak)
4. Record final calibration state in CALIBRATION_MASTER.md
5. Update SECTOR_MASTER.md with final parameter values
6. /simplify final pass across all changed files
