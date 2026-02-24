# Mobilization & Force Growth Overhaul

## Problem Statement

A 52-week scenario run reveals that all three factions **shrink** over the first year — the opposite of reality. Historical data shows all three forces grew rapidly through 1992-1993, yet in our simulation:

| Faction | Turn 0 | Turn 52 | Net | Historical Dec 1992 |
|---------|--------|---------|-----|---------------------|
| RBiH | 61,233 | 59,970 | **-2%** | ~130K (**+100%**) |
| RS | 43,835 | 21,498 | **-51%** | ~110K (**+38%**) |
| HRHB | 17,646 | 16,818 | **-5%** | ~50K (**+67%**) |

Two root causes:
1. **Militia pools don't replenish in Phase II.** `runPoolPopulation()` only runs during Phase I steps. Once Phase II begins, pools are a finite, non-renewable resource — they drain to zero and reinforcement stops.
2. **Initial pool totals are too small.** RBiH total manpower is 128K (6.8% mobilization) vs historical 200K+ ceiling. RS total is 62K vs ~80K+ JNA inheritance.

Additionally, casualty rates need calibration against historical totals: ARBiH ~30,000 military KIA over the full war, VRS ~24,000, HVO ~4,000-8,000 — with at least half incurred in 1992.

---

## Historical Force Trajectories (from knowledge docs)

### Total Strength Over Time

| Faction | Apr 1992 | Dec 1992 | 1993 | 1994 | 1995 |
|---------|----------|----------|------|------|------|
| **VRS** | ~80,000 | ~90-100K | ~100-110K | ~110-120K | ~110-120K |
| **ARBiH** | ~60-80K | ~110-130K | ~135-155K | ~165-180K | ~180-200K |
| **HVO** | ~25-35K | ~40-45K | ~50-55K | ~50-55K | ~50-55K |

### Brigade Counts

| Faction | Brigades | Typical Strength |
|---------|----------|-----------------|
| **VRS** | ~80 | 1,500-4,000 |
| **ARBiH** | ~116 (many formed later) | 1,000-3,000 |
| **HVO** | ~40 | 800-3,000 |

### Historical Military KIA (Full War, 1992-1995)

| Faction | Total KIA | Est. 1992 KIA (~50%+) | Weekly rate (52w) |
|---------|-----------|----------------------|-------------------|
| **ARBiH** | ~30,000 | ~15,000-18,000 | ~290-350/week |
| **VRS** | ~24,000 | ~12,000-15,000 | ~230-290/week |
| **HVO** | ~4,000-8,000 | ~2,000-4,000 | ~40-80/week |

### Growth Patterns

- **VRS**: Inherited JNA structure on 12 May 1992. Started near full strength. Modest growth (~38% over first 8 months) via continued conscription. Plateau by mid-1993.
- **ARBiH**: Started weakest and most disorganized. Explosive growth: doubled by Dec 1992, tripled by 1995. Continuous mobilization, refugee enrollment, conscription drives.
- **HVO**: Small but well-organized from Croatian defense structures. Peak ~50-55K by mid-1993. Stabilized.

---

## Current System Analysis

### What Works

The reinforcement **mechanic** is sound:
- `reinforceBrigadesFromPools()` runs every Phase II turn
- Each brigade absorbs up to **260 personnel/turn** (130 in combat) from its home municipality pool
- Growth rate: 800 → 2,000 in ~5 turns, 800 → 3,000 in ~9 turns
- WIA trickleback returns 80 wounded/turn to out-of-combat brigades
- Spawn system creates new brigades when pools reach 800 threshold

### What's Broken

1. **No pool replenishment in Phase II.** Pools are seeded once during initialization and only depleted thereafter. `runPoolPopulation()` is a Phase I-only step.

2. **Pool sizes are insufficient.** After initial brigade creation:
   - RBiH: 67,093 available (covers ~69% of growth to 2,000/brigade)
   - RS: 18,706 available (covers only **24%** — severely limited)
   - HRHB: 19,815 available (covers ~66%)

3. **No ongoing mobilization.** Historically, conscription and volunteer enrollment continued throughout the war. The simulation has no mechanism for this in Phase II.

4. **RS has a small manpower accrual** (`RS_MANDATORY_MOBILIZATION_PER_TURN = 120` in `recruitment_turn.ts`) but it only applies to pending mandatory OOB brigades that haven't spawned yet, not to general pool growth.

5. **Casualty rates may be too high** relative to historical data, or reinforcement too low, resulting in net shrinkage rather than growth.

### Existing Systems to Leverage

| System | File | What It Does |
|--------|------|-------------|
| `runPoolPopulation()` | `phase_i/pool_population.ts` | Seeds pools from militia_strength + displacement + cross-ethnic |
| `reinforceBrigadesFromPools()` | `formation_spawn.ts` | Transfers pool → brigade at 260/turn |
| `spawnFormationsFromPools()` | `formation_spawn.ts` | Creates new brigades when pool >= 800 |
| `applyWiaTrickleback()` | `formation_spawn.ts` | Returns 80 WIA/turn to out-of-combat brigades |
| `accrueRecruitmentResources()` | `recruitment_turn.ts` | Accrues recruitment capital/equipment (separate system) |
| `applyRsMandatoryMobilizationAccrual()` | `recruitment_turn.ts` | Small RS pool top-up for mandatory brigades only |
| `phase-ii-recruitment` pipeline step | `turn_pipeline.ts` L843 | Runs recruitment accrual + ongoing OOB recruitment |
| `phase-ii-brigade-reinforcement` step | `turn_pipeline.ts` L907 | Runs pool → brigade reinforcement |
| `phase-ii-wia-trickleback` step | `turn_pipeline.ts` L914 | Runs WIA return |

---

## Implementation Plan

### Part 1: Phase II Ongoing Mobilization (Core Fix)

**Goal:** Add a per-turn pool growth step that runs during Phase II, representing continued conscription, volunteer enrollment, and refugee military-age male absorption.

**New file:** `src/sim/phase_ii/ongoing_mobilization.ts`

**New pipeline step:** `phase-ii-ongoing-mobilization` — insert **before** `phase-ii-brigade-reinforcement` (so freshly mobilized manpower is available for reinforcement the same turn).

#### Design: `runOngoingMobilization(state, settlements, population1991ByMun)`

For each faction-controlled municipality with a militia pool:

```
base_mobilization = eligible_population × MOBILIZATION_RATE × faction_scale × authority_mult
mobilization_this_turn = base_mobilization × surge_curve(turn) × territorial_control_fraction
pool.available += floor(mobilization_this_turn)
```

#### Constants

```typescript
/** Weekly mobilization rate as fraction of eligible military-age population. */
const BASE_MOBILIZATION_RATE = 0.0015;  // 0.15% of eligible pop per week

/**
 * Faction mobilization scale — reflects organizational capacity and mobilization urgency.
 * ARBiH: highest because existential threat drove total mobilization.
 * VRS: moderate — inherited JNA structure, less need for mass conscription.
 * HVO: moderate — efficient within small territory, Croatian state support.
 */
const FACTION_MOBILIZATION_SCALE: Record<string, number> = {
    RBiH: 1.40,  // Desperate mobilization, refugee enrollment
    RS:   0.80,  // Already near strength from JNA; modest conscription
    HRHB: 1.00   // Efficient but small population base
};

/**
 * Mobilization surge curve — higher early in the war, tapering over time.
 * Reflects the historical pattern: rapid mobilization in 1992,
 * then steady-state conscription as manpower pools thin.
 */
function getMobilizationSurgeFactor(turn: number): number {
    if (turn <= 12) return 2.5;   // Weeks 1-12: emergency mobilization surge
    if (turn <= 26) return 1.8;   // Weeks 13-26: continued high mobilization
    if (turn <= 52) return 1.2;   // Weeks 27-52: tapering
    if (turn <= 78) return 0.8;   // Year 2: diminishing returns
    if (turn <= 104) return 0.5;  // Year 2.5: scraping the barrel
    return 0.3;                    // Year 3+: minimal fresh manpower
}

/** Cap per municipality per turn to prevent single-mun explosions. */
const MAX_MOBILIZATION_PER_MUN_PER_TURN = 200;

/**
 * Mobilization exhaustion: track cumulative mobilization per mun.
 * Once cumulative exceeds fraction of eligible pop, rate drops sharply.
 */
const EXHAUSTION_THRESHOLD = 0.15;  // 15% of eligible pop → rate halved
const EXHAUSTION_HARD_CAP = 0.25;   // 25% of eligible pop → mobilization stops
```

#### Logic Flow (Deterministic)

1. Get sorted faction IDs, sorted municipality IDs
2. For each municipality (sorted):
   a. Determine controlling faction (majority settlement control)
   b. Skip if no faction controls
   c. For controlling faction, get or create militia pool
   d. Get eligible population for faction in this mun (from 1991 census)
   e. Calculate cumulative mobilization: `pool.committed + pool.exhausted`
   f. Calculate exhaustion ratio: `cumulative / eligible_pop`
   g. If exhaustion ratio >= `EXHAUSTION_HARD_CAP` → skip (tapped out)
   h. Calculate exhaustion mult: if ratio >= `EXHAUSTION_THRESHOLD` → 0.5, else 1.0
   i. Get authority mult from municipality control state:
      - `consolidated` → 1.0
      - `contested` → 0.7
      - `fragmented` → 0.3
   j. Calculate: `raw = eligible_pop × BASE_MOBILIZATION_RATE × FACTION_MOBILIZATION_SCALE[faction] × getMobilizationSurgeFactor(turn) × exhaustion_mult × authority_mult`
   k. Clamp: `mobilized = min(floor(raw), MAX_MOBILIZATION_PER_MUN_PER_TURN)`
   l. Apply: `pool.available += mobilized; pool.updated_turn = turn`
3. Return `OngoingMobilizationReport` with per-faction totals

#### Report Type

```typescript
export interface OngoingMobilizationReport {
    total_mobilized: number;
    by_faction: Record<FactionId, number>;
    municipalities_contributing: number;
    exhausted_municipalities: number;
}
```

#### Expected Weekly Mobilization (Calibration)

Target: first-year growth should produce historically accurate force sizes by turn 52.

**RBiH target:** ~130K by Dec 1992. Starting at ~61K, need ~69K growth over 52 weeks = ~1,330/week.
- ~110 RBiH-controlled municipalities, avg eligible pop ~4,000 Bosniaks
- Rate: 4,000 × 0.0015 × 1.40 × 2.5 (surge) = ~21/mun/week early → ~2,300/week faction-wide
- After surge tapers (week 13-26): ~1,500/week
- After reinforcement + spawning: net growth ~1,200-1,400/week → ~130K by turn 52. ✓

**RS target:** ~100K by Dec 1992. Starting at ~44K, need ~56K growth over 52 weeks = ~1,075/week.
- ~110 RS-controlled municipalities, avg eligible pop ~3,000 Serbs
- Rate: 3,000 × 0.0015 × 0.80 × 2.5 (surge) = ~9/mun/week early → ~990/week faction-wide
- Pool also has ~19K initial available → reinforcement from existing pools adds ~280/week
- Combined: ~1,200-1,300/week early, tapering → ~95-105K by turn 52. ✓

**HRHB target:** ~45K by Dec 1992. Starting at ~18K, need ~27K growth over 52 weeks = ~520/week.
- ~99 HRHB-controlled municipalities, but many are small; avg eligible pop ~1,500 Croats
- Rate: 1,500 × 0.0015 × 1.00 × 2.5 = ~5.6/mun/week → ~555/week
- Plus existing pools: ~380/week
- Combined: ~800-900/week early → ~45-50K by turn 52. ✓

#### RBiH Cross-Ethnic Mobilization (Preserve Existing)

The existing `runPoolPopulation()` Phase 3 (RBiH 10% rule) handles cross-ethnic enrollment. The new ongoing mobilization should ALSO apply this:
- In RBiH-controlled municipalities, 12% of non-Bosniak eligible pop contributes to RBiH pools
- Cap 500/mun/turn (from existing constant)
- This is an additional contribution on top of the Bosniak-eligible mobilization

#### Displaced Population Mobilization

Displaced populations (refugees) are a significant manpower source, especially for ARBiH. The existing `runPoolPopulation()` Phase 2 handles this (5% of displaced_in per turn, cap 2,000/mun). The new step should invoke the same logic or call a shared helper. But since displaced contribution already exists in the pool population function, and that function uses `Math.max(existing, derived)` which won't decrease pools — we can simply call `runPoolPopulation()` in Phase II as well (or extract the displacement contribution into a reusable helper).

**Decision:** Extract displacement and cross-ethnic contributions into a reusable helper called from both Phase I pool population AND Phase II ongoing mobilization. This avoids code duplication.

---

### Part 2: RS JNA Inheritance Pool Bonus

**Goal:** RS pools should start larger to reflect the JNA personnel inheritance on 12 May 1992.

**File:** `src/sim/phase_i/pool_population.ts` or `src/scenario/oob_phase_i_entry.ts`

**Approach:** After initial pool population, apply a one-time RS bonus during scenario initialization.

```typescript
/**
 * RS inherited JNA infrastructure, equipment, and trained personnel.
 * This bonus represents the ~20K additional trained reservists and
 * JNA-discharged personnel available for RS mobilization beyond
 * what the militia_strength formula produces.
 */
const RS_JNA_INHERITANCE_BONUS = 20_000;
```

**Distribution:** Spread proportionally across RS-controlled municipalities by eligible population. Each RS pool gets:
```
bonus = floor(RS_JNA_INHERITANCE_BONUS × (mun_eligible_serb_pop / total_rs_eligible_pop))
```

**Where:** In `scenario_runner.ts`, after `runPoolPopulation()` is called for Phase II-start scenarios (line ~948), add a call to `applyRsJnaInheritanceBonus(state, population1991ByMun)`.

**Alternative (simpler):** Increase `FACTION_POOL_SCALE` for RS from 1.20 to 1.60. This would increase initial RS pools proportionally across all municipalities. Current RS total is 62K with scale 1.20; at 1.60 it would be ~83K — close to the ~80K target. However, this conflates two different mechanisms (mobilization efficiency vs JNA inheritance) and makes it harder to tune independently.

**Decision:** Use the explicit bonus approach. It's historically justified (JNA handoff is a discrete event, not a mobilization efficiency factor) and independently tunable.

---

### Part 3: VRS Initial Personnel Adjustment

**Goal:** VRS brigades should start larger than 800 to reflect JNA inheritance. Historical typical VRS brigade: 1,500-4,000.

**Current:** All factions start all brigades at `MIN_BRIGADE_SPAWN = 800`.

**Approach:** Add faction-specific initial personnel to `oob_brigades.json` or compute it during `createOobFormationsAtPhaseIEntry()`.

**Option A: Per-formation `initial_personnel` field in OOB data**
Add an optional `initial_personnel` field to `oob_brigades.json` entries. If present, use it instead of `MIN_BRIGADE_SPAWN`. This allows per-brigade historical accuracy (e.g., 1st Krajina brigades at 2,000, small mountain brigades at 800).

**Option B: Faction-specific starting personnel constant**
```typescript
const FACTION_INITIAL_PERSONNEL: Record<string, number> = {
    RS:   1200,  // JNA inheritance → larger initial brigades
    RBiH: 800,   // Militia/TO origin → standard
    HRHB: 800    // Croatian defense → standard
};
```

**Decision:** Use Option B (simpler, sufficient). The per-formation granularity of Option A is historically more accurate but requires curating 236 individual values — not worth the effort now. With ongoing mobilization (Part 1), VRS brigades starting at 1,200 will grow to 1,500-2,500 range naturally, matching historical bands.

**Implementation:** In `createOobFormationsAtPhaseIEntry()` in `oob_phase_i_entry.ts`, replace:
```typescript
personnel: MIN_BRIGADE_SPAWN
```
with:
```typescript
personnel: FACTION_INITIAL_PERSONNEL[faction] ?? MIN_BRIGADE_SPAWN
```

Add the constant to `formation_constants.ts`.

---

### Part 4: Faction-Differentiated Initial Cohesion

**Goal:** Reflect the qualitative gap between JNA-inherited VRS (professional) and hastily-organized ARBiH (militia origin).

**Current:** All brigades start at cohesion 60 (`computeBaseCohesion` returns 60 for kind='brigade').

**Proposed:**
```typescript
const FACTION_INITIAL_COHESION: Record<string, number> = {
    RS:   72,   // JNA professional cadres, established command structure
    HRHB: 62,   // Croatian HOS/ZNG trained cadres, Croatian state support
    RBiH: 55    // TO/militia origin, improvised command, but high motivation
};
```

**Implementation:** Modify `computeBaseCohesion()` in `formation_lifecycle.ts` to accept faction parameter:
```typescript
export function computeBaseCohesion(kind: string, createdTurn: number, faction?: string): number {
    if (kind === 'militia') return Math.floor(30 + Math.min(createdTurn, 6) * 2);
    if (kind === 'territorial_defense') return Math.floor((30 + 60) / 2);
    // Brigade/OG: faction-differentiated
    if (faction && FACTION_INITIAL_COHESION[faction] != null) {
        return FACTION_INITIAL_COHESION[faction];
    }
    return 60;
}
```

All call sites of `computeBaseCohesion` need the `faction` parameter added. Search and update.

---

### Part 5: ARBiH Brigade Spawn Timing

**Goal:** ARBiH should not have 116 brigades at turn 0. Historically, many ARBiH brigades were formed over the first 6-12 months as territorial defense units consolidated into brigades.

**Current OOB data (from investigation):**
- 213 total mandatory at turn 0 (all factions combined)
- RBiH: ~101 at turn 0 (from the 116 total, minus delayed ones)
- Historical: ARBiH had ~75-80 brigade-equivalent formations in April 1992, growing to 116 by late 1992/early 1993

**Approach:** In `oob_brigades.json`, shift ~25-30 RBiH brigades from `available_from: 0` to later turns:
- ~15 brigades → `available_from: 8` (formed by June 1992)
- ~10 brigades → `available_from: 16` (formed by August 1992)
- ~5 brigades → `available_from: 26` (formed by October 1992)

**Selection criteria for delayed brigades:**
- Brigades from corps formed later (7th Corps → Travnik, formed 1993; 6th Corps → Konjic, formed 1993)
- Brigades described as "formed from local TO" or "organized from civilian volunteers"
- Keep all 1st Corps (Sarajevo) and 5th Corps (Bihac) brigades at turn 0 (they fought from day one)

**Note:** This is a DATA change to `oob_brigades.json`, not a code change. The existing spawn system already respects `available_from` gating via `runOngoingRecruitment()` and the recruitment engine.

---

### Part 8: Casualty Rate Calibration (was Part 6)

**Goal:** Ensure total military KIA over 52 weeks matches historical data.

**Historical targets (first year, ~50%+ of total war):**
| Faction | First-Year KIA Target | Weekly KIA Rate |
|---------|-----------------------|-----------------|
| ARBiH | ~15,000-18,000 | ~290-350/week |
| VRS | ~12,000-15,000 | ~230-290/week |
| HVO | ~2,000-4,000 | ~40-80/week |
| **Total** | ~29,000-37,000 | ~560-710/week |

**Current battle constants (from `attack_resolution_osid.ts`):**
- `BASE_ATTACKER_LOSS_RATE = 0.04` (4% of engagement intensity)
- `BASE_DEFENDER_LOSS_RATE = 0.02` (2% of engagement intensity)
- `KIA_FRACTION = 0.25` (25% of total casualties)
- `WIA_FRACTION = 0.60` (60% wounded)
- `MIA_FRACTION = 0.15` (15% missing/captured)

**Calibration approach:** After implementing Parts 1-5, run a 52-week scenario and measure:
1. Total KIA per faction
2. Total WIA per faction
3. Net force size at turn 52

If KIA is too high (net shrinkage despite mobilization), reduce base loss rates:
- Try `BASE_ATTACKER_LOSS_RATE = 0.03`, `BASE_DEFENDER_LOSS_RATE = 0.015`

If KIA is too low (unrealistic growth), increase loss rates or reduce mobilization.

**This is an iterative tuning step — do NOT change casualty constants until Parts 1-7 are implemented and tested.** The current net shrinkage is primarily caused by zero mobilization, not excess casualties.

**Validation criteria (52-week scenario):**
| Metric | Target |
|--------|--------|
| RBiH total personnel turn 52 | 120,000 - 140,000 |
| RS total personnel turn 52 | 90,000 - 110,000 |
| HRHB total personnel turn 52 | 40,000 - 50,000 |
| RBiH total KIA turn 52 | 12,000 - 20,000 |
| RS total KIA turn 52 | 10,000 - 16,000 |
| HVO total KIA turn 52 | 2,000 - 5,000 |
| Brigades above 2,000 personnel | > 30% of all brigades |
| Brigades below 500 personnel | < 15% of all brigades |

---

### Part 7: Cohesion & Experience Trajectory (Qualitative Inversion)

**Goal:** Capture the historical arc where VRS started as a professional JNA-inherited army and degraded into an overstretched, exhausted force, while ARBiH started as disorganized militia and professionalized into a disciplined, capable army. HVO remained stable but stagnant.

**Current state of cohesion:**
- Cohesion is set at formation creation time (`computeBaseCohesion()`) and then only changes via:
  - Battle outcomes: −15 (decisive defeat) to +3 (catastrophic repulse of attacker)
  - Posture costs: attack −3/turn, defend +1/turn (capped at 80)
  - Snap events: pyrrhic victory −10, commander casualty −8
  - AoR reshaping: −2 to −3 per transfer
  - OG drain: per-turn during operational group lifetime
  - Corps stance: recovery when reorganizing
- There is NO ambient cohesion drift based on faction or war phase. A VRS brigade at turn 0 and turn 150 has the same "ceiling" behavior.

**Current state of experience:**
- Experience is a `[0, 1]` float stored on `FormationState.experience`
- It is used as a combat power multiplier: `0.6 + 0.8 × experience` → range 0.6-1.4
- Experience can only go DOWN (commander casualty: −15%) — there is **NO mechanism for experience to increase**
- All formations start at experience 0 and can only lose from there
- This is clearly incomplete and means all troops are perpetually green

#### Part 7a: Experience Gain from Combat

**New file or addition to:** `src/sim/phase_ii/attack_resolution_osid.ts`

After each battle, surviving formations gain experience:

```typescript
/**
 * Experience gain per battle engagement.
 * Formation experience [0, 1] increases per battle survived,
 * with diminishing returns as formations approach veteran status.
 */
const BASE_EXPERIENCE_GAIN = 0.03;       // Per battle participated
const VICTORY_EXPERIENCE_BONUS = 0.02;   // Additional for winners
const DEFEAT_EXPERIENCE_GAIN = 0.01;     // Losers still learn (less)

/** Faction learning rate — reflects organizational capacity to institutionalize lessons. */
const FACTION_LEARNING_RATE: Record<string, number> = {
    RBiH: 1.5,   // Steep learning curve from zero; high adaptability
    RS:   0.7,   // Already trained, less room to grow; institutional rigidity
    HRHB: 1.0    // Standard
};
```

After battle resolution, for each surviving formation:
```
gain = BASE_EXPERIENCE_GAIN × FACTION_LEARNING_RATE[faction]
if (won): gain += VICTORY_EXPERIENCE_BONUS × FACTION_LEARNING_RATE[faction]
else: gain = max(gain, DEFEAT_EXPERIENCE_GAIN × FACTION_LEARNING_RATE[faction])

// Diminishing returns: harder to improve once already experienced
effective_gain = gain × (1.0 - formation.experience × 0.5)

formation.experience = min(1.0, formation.experience + effective_gain)
```

**Effect on combat power:**
- RBiH brigade after 15 battles: experience ~0.45 → power mult 0.96 (near baseline)
- RBiH brigade after 30 battles: experience ~0.70 → power mult 1.16
- VRS brigade after 15 battles: experience ~0.25 → power mult 0.80
- VRS brigade after 30 battles: experience ~0.40 → power mult 0.92

This models the reality: an ARBiH brigade that fought through 1992 became a hardened, experienced unit. A VRS brigade that inherited JNA training didn't learn as much from combat (diminishing returns + lower learning rate), and as veteran NCOs were lost to casualties, the institutional knowledge bled out.

#### Part 7b: Ambient Cohesion Drift

**New function:** `applyAmbientCohesionDrift(state: GameState)` — runs once per turn in the pipeline, after posture costs and before battle resolution.

**New pipeline step:** `phase-ii-cohesion-drift` — insert after `phase-ii-posture-costs`.

Concept: Each faction has a per-turn cohesion drift that reflects systemic organizational health — not individual battle outcomes, but the overall institutional trajectory.

```typescript
/**
 * Faction cohesion drift per turn.
 * Positive = organization improving, negative = institutional decay.
 * Parameterized by war phase (turn ranges).
 */
function getFactionCohesionDrift(faction: string, turn: number): number {
    if (faction === 'RS') {
        // VRS: Professional start, then institutional decay.
        // 1992: stable (living off JNA inertia)
        // 1993: beginning strain (manpower exhaustion, front overextension)
        // 1994-95: accelerating decay (desertion crisis, collapse of morale)
        if (turn <= 26) return 0;         // Weeks 1-26: JNA momentum carries
        if (turn <= 52) return -0.15;     // Weeks 27-52: early cracks
        if (turn <= 78) return -0.3;      // Year 2: visible deterioration
        if (turn <= 104) return -0.5;     // Year 2.5: desertion crisis
        return -0.7;                       // Year 3+: institutional collapse
    }
    if (faction === 'RBiH') {
        // ARBiH: Chaotic start, rapid professionalization.
        // 1992: learning fast, improving command
        // 1993: Delic reforms, corps structure matures
        // 1994-95: near-professional force, operations capability
        if (turn <= 12) return 0.4;       // Weeks 1-12: rapid organization from chaos
        if (turn <= 26) return 0.3;       // Weeks 13-26: command structure solidifying
        if (turn <= 52) return 0.2;       // Weeks 27-52: continued improvement
        if (turn <= 78) return 0.15;      // Year 2: Delic reforms taking hold
        if (turn <= 104) return 0.1;      // Year 2.5: approaching professional ceiling
        return 0.05;                       // Year 3+: marginal improvement
    }
    if (faction === 'HRHB') {
        // HVO: Stable throughout. Well-organized from start,
        // no dramatic improvement or decline.
        if (turn <= 52) return 0.05;      // Slight improvement from Croatian state support
        return 0;                          // Plateaus
    }
    return 0;
}
```

**Application logic (deterministic):**

For each active brigade (sorted by ID):
```
drift = getFactionCohesionDrift(faction, turn)
// Only apply to brigades NOT in active combat this turn (combat outcomes handle those)
if (!engaged_this_turn) {
    brigade.cohesion = clamp(brigade.cohesion + drift, 0, 100)
}
```

**Interaction with existing defend recovery (+1/turn):**
- The drift stacks with posture recovery. A defending ARBiH brigade recovers +1 (posture) + 0.3 (drift) = +1.3/turn early war.
- A defending VRS brigade in year 3 recovers +1 (posture) − 0.7 (drift) = +0.3/turn — barely maintaining.
- An attacking VRS brigade in year 3: −3 (posture) − 0.7 (drift) = −3.7/turn — rapid exhaustion, matching the historical inability of VRS to sustain offensive operations by late war.

**Defend cohesion cap interaction:**
The existing `DEFEND_COHESION_CAP = 80` still applies. The drift can push cohesion above 80 during non-defend postures, but practically it only matters for the *floor* behavior — how fast cohesion degrades under strain and how hard it is to recover.

#### Part 7c: Manpower Exhaustion Cohesion Penalty

**Concept:** When a faction's manpower pool is depleted relative to its force size, cohesion suffers for ALL brigades in that faction. This models the systemic effect of being unable to replace losses — units know they're on their own.

```typescript
/**
 * Per-turn cohesion penalty when faction-wide manpower exhaustion ratio exceeds threshold.
 * exhaustion_ratio = total_committed / (total_committed + total_available)
 * When > 0.8 (pools nearly drained), all brigades in faction suffer cohesion drain.
 */
const EXHAUSTION_COHESION_THRESHOLD = 0.80;
const EXHAUSTION_COHESION_PENALTY_PER_TURN = -0.5;
const CRITICAL_EXHAUSTION_THRESHOLD = 0.95;
const CRITICAL_EXHAUSTION_PENALTY_PER_TURN = -1.5;
```

This naturally hits VRS first (smaller pools, drained faster) and ARBiH last (larger pools, still growing via mobilization). By year 2-3, VRS brigades face a double whammy: ambient faction drift AND manpower exhaustion penalty.

#### Combined Effect (52-week example)

| Turn | VRS Cohesion Trajectory (defending brigade) | ARBiH Cohesion Trajectory (defending brigade) |
|------|----------------------------------------------|------------------------------------------------|
| 0 | 72 (initial) | 55 (initial) |
| 12 | 72 (+1 posture, +0 drift, stable) | 60 (+1 posture, +0.4 drift) |
| 26 | 72 (capped by defend cap ~80) | 67 (+1 posture, +0.3 drift) |
| 52 | 69 (+1 posture, −0.15 drift, pools thinning) | 76 (+1 posture, +0.2 drift) |
| 78 | 59 (+1 posture, −0.3 drift, exhaustion starting) | 80 (hitting defend cap) |
| 104 | 43 (+1 posture, −0.5 drift, −0.5 exhaustion) | 80 (professional plateau) |
| 130 | 28 (+1 posture, −0.7 drift, −1.5 critical exhaustion) | 80 (stable) |

**VRS at turn 130:** Cohesion 28 means most brigades can only defend, can barely probe, and certainly can't attack (min cohesion 40 for attack). This matches the 1995 reality — VRS was a brittle defensive shell that crumbled when ARBiH and HV launched offensives.

**ARBiH at turn 130:** Cohesion 80 with experience ~0.7 means a combat power multiplier of ~1.16 × 0.80 = 0.93 — a disciplined, undergunned army. The equipment shortage (lower equipment_points) keeps their raw power below VRS, but their institutional quality has surpassed it. Exactly the historical picture.

---

## Files Modified

| File | Changes | Part |
|------|---------|------|
| `src/sim/phase_ii/ongoing_mobilization.ts` | **NEW**: `runOngoingMobilization()` — per-turn pool growth from conscription | 1 |
| `src/sim/turn_pipeline.ts` | Add `phase-ii-ongoing-mobilization` step before `phase-ii-brigade-reinforcement` | 1 |
| `src/scenario/scenario_runner.ts` | Call `applyRsJnaInheritanceBonus()` after pool initialization | 2 |
| `src/sim/phase_i/pool_population.ts` | Add `applyRsJnaInheritanceBonus()` function | 2 |
| `src/state/formation_constants.ts` | Add `FACTION_INITIAL_PERSONNEL`, `FACTION_INITIAL_COHESION` | 3, 4 |
| `src/scenario/oob_phase_i_entry.ts` | Use `FACTION_INITIAL_PERSONNEL[faction]` for starting personnel | 3 |
| `src/sim/formation_lifecycle.ts` | Modify `computeBaseCohesion()` to accept faction parameter | 4 |
| `src/sim/formation_spawn.ts` | Pass faction to `computeBaseCohesion()` | 4 |
| `data/source/oob_brigades.json` | Shift ~25-30 RBiH brigades to later `available_from` turns | 5 |
| `src/sim/phase_ii/attack_resolution_osid.ts` | Add experience gain after battle; (Part 8 — casualty rate tuning after validation) | 7a, 8 |
| `src/sim/phase_ii/cohesion_drift.ts` | **NEW**: `applyAmbientCohesionDrift()` + manpower exhaustion penalty | 7b, 7c |
| `src/sim/turn_pipeline.ts` | Add `phase-ii-cohesion-drift` step after posture costs | 7b |

## Existing Code Reused

| Function | File | Reuse |
|----------|------|-------|
| `militiaPoolKey()` | `militia_pool_key.ts` | Pool composite key for ongoing mobilization |
| `getEligiblePopulation()` | `pool_population.ts` | Faction-eligible population lookup |
| `strictCompare()` | `validateGameState.ts` | Deterministic sorted iteration |
| `reinforceBrigadesFromPools()` | `formation_spawn.ts` | Unchanged — consumes larger pools |
| `spawnFormationsFromPools()` | `formation_spawn.ts` | Unchanged — more spawns from replenished pools |
| `accrueRecruitmentResources()` | `recruitment_turn.ts` | Unchanged — separate system |

## Implementation Order

1. **Part 1 first** (ongoing mobilization) — the core fix. Without this, pools drain and everything else is cosmetic.
2. **Part 3 next** (VRS initial personnel) — small constant change, immediately testable.
3. **Part 4 next** (faction cohesion) — small constant change, testable.
4. **Part 2 next** (RS JNA bonus) — one-time pool boost, testable.
5. **Part 5 next** (ARBiH spawn timing) — data change to OOB JSON.
6. **Part 7a next** (experience gain from combat) — add to battle resolution.
7. **Part 7b next** (ambient cohesion drift) — new pipeline step, new file.
8. **Part 7c next** (manpower exhaustion cohesion penalty) — add to cohesion drift function.
9. **Part 8 last** (casualty calibration) — only after running a scenario with Parts 1-7 to measure actual KIA/cohesion/experience trajectories.

After each part, run `npx tsc --noEmit` and `npm run test:vitest`.
After Parts 1-7, run a full 52-week scenario and compare against validation criteria.

## Verification

1. **TypeCheck:** `npx tsc --noEmit` — must pass after each part
2. **Unit tests:** `npm run test:vitest` — all existing tests pass, new tests pass
3. **Mobilization smoke test (after Part 1):** Run 10-week scenario, confirm pool.available increases each turn
4. **Force trajectory test (after Parts 1-7):** Run 52-week scenario, check:
   - RBiH total personnel at turn 52: 120K-140K
   - RS total personnel at turn 52: 90K-110K
   - HRHB total personnel at turn 52: 40K-50K
5. **Qualitative inversion test (after Part 7):** Run 104-week scenario, verify:
   - ARBiH avg brigade cohesion at turn 104 > VRS avg brigade cohesion at turn 104
   - ARBiH avg brigade experience at turn 104 > VRS avg brigade experience at turn 104
   - VRS can barely mount offensive operations (few brigades with cohesion ≥ 40)
   - ARBiH has significant offensive capability (many brigades with cohesion ≥ 40)
6. **Casualty validation (after Part 8 tuning):**
   - Total KIA per faction within historical bands
   - Brigade strength distribution: majority 1,000-3,000, not piling at 100 or 3,000
7. **Determinism:** Run twice with same seed, compare final_save.json hashes
8. **Golden baselines:** Regenerate with `UPDATE_BASELINES=1` after all changes

## New Tests

### `tests/ongoing_mobilization.test.ts`

1. **Pool growth per turn:** Create state with known pools, run `runOngoingMobilization()`, verify pools grew by expected amounts
2. **Surge curve:** Verify early turns (0-12) produce higher mobilization than later turns (52+)
3. **Faction asymmetry:** RBiH mobilizes faster than RS per eligible pop
4. **Exhaustion cap:** After cumulative mobilization reaches 25% of eligible pop, mobilization stops
5. **Authority effect:** Contested municipalities produce 70% of consolidated rate; fragmented produce 30%
6. **Determinism:** Two runs produce identical pool states
7. **Integration with reinforcement:** After mobilization, `reinforceBrigadesFromPools()` can draw from larger pools

### `tests/cohesion_drift.test.ts`

1. **VRS ambient decay:** VRS brigade at turn 80 with drift applied loses cohesion each turn
2. **ARBiH ambient growth:** ARBiH brigade at turn 12 gains cohesion from drift
3. **HVO stability:** HVO brigade cohesion drift is negligible
4. **Defend cap still applies:** ARBiH brigade in defend posture doesn't exceed 80 from drift alone
5. **Manpower exhaustion penalty:** When faction pools are 95%+ depleted, all brigades get −1.5/turn penalty
6. **Exhaustion hits VRS first:** With identical battle history, VRS reaches exhaustion threshold before ARBiH
7. **Determinism:** Two identical states produce identical drift results

### `tests/experience_gain.test.ts`

1. **Combat experience gain:** Brigade gains experience after surviving a battle
2. **Winner bonus:** Victorious brigade gains more experience than losing brigade
3. **Faction learning rate:** ARBiH brigade gains 1.5× experience vs VRS brigade in same battle
4. **Diminishing returns:** Brigade at experience 0.8 gains less per battle than brigade at 0.2
5. **Experience caps at 1.0:** Cannot exceed maximum
6. **Commander casualty still reduces experience:** Existing mechanic preserved

### `tests/force_trajectory.test.ts`

1. **52-week growth trajectory:** Run 52 turns with bot AI, verify each faction's total personnel is within historical bands
2. **Brigade strength distribution:** After 52 turns, > 30% of brigades above 2,000 personnel
3. **Net growth not shrinkage:** All factions have more total personnel at turn 26 than turn 0
4. **KIA within bounds:** Total KIA per faction within 50% of historical targets
5. **Qualitative inversion at turn 104:** ARBiH avg cohesion > VRS avg cohesion; ARBiH avg experience > VRS avg experience
