# Displacement System Master Reference

> Authoritative technical reference for AWWV's displacement mechanic.
> Covers all pipeline steps, trigger types, routing, loss fractions, state machines, and feedback loops.
>
> **Canon:** v0.6.0 two-phase model (Peace / War). There is no separate "Phase I" or "Phase II".
> As of 2026-03-07, codebase fully uses Peace/War terminology (legacy `phase_ii_*` step IDs renamed).
>
> **Architecture (2026-03-01):** Displacement is **OSID-based**, not municipality-based.
> Each OSID triggers its own displacement independently. Municipalities only serve as
> grouping for camps before routing. Minority flight is **disabled** — displacement
> triggers only from hostile OSID takeover (war-start seeding + battle flips).

## 1. Overview

Displacement models the forced movement of civilian populations during the Bosnian War. It is a core mechanic that:

- **Permanently reduces recruitment capacity** at origin municipalities (displaced_out is irreversible)
- **Generates refugee manpower** at destination municipalities (5% of routed displaced → militia pools)
- **Feeds exhaustion and humanitarian pressure** (trapped populations, siege conditions)
- **Tracks civilian casualties** (killed, fled abroad) as aggregate faction-level counters

The system uses **3 distinct trigger types** running at designated points in the War turn pipeline, with per-municipality per-ethnicity routing tables to determine where displaced people go.

### Historical Context

By January 1993 (week 40), approximately 1 million people had been displaced in Bosnia.

**Historical civilian casualties (full war 1992-1995):**
- Bosniaks: ~30,000 killed
- Serbs: ~6,000 killed
- Croats: ~2,000 killed

**Calibration history:**
| Run | Total displaced+lost | RBiH killed | HRHB killed | RS killed | Notes |
|-----|---------------------|-------------|-------------|-----------|-------|
| n284 | 4,360,000 | — | — | — | Municipality-based, minority flight active |
| n290 | 312,000 | 4,100 | 1,800 | 212 | Minority flight disabled, 2% kill |
| n291 | 312,000 | 20,900 | 9,200 | 1,100 | Kill fraction restored to 10% |
| n296 | 333,592 | 21,481 | 9,218 | 2,604 | OSID-based, war-start seeding, uniform 0.80 cap |
| n310 | 481,000 | 30,300 | 12,600 | 3,600 | Sustained displacement added |
| n319 | 668,202 | 45,722 | 15,020 | 5,998 | Per-OSID census data, sustained accounts for initial |

---

## 2. Pipeline Integration

Displacement runs at three points in the **War turn pipeline** (canon: War_Specification_v0_6_0.md §5). The order matters because each step can create state that subsequent steps read.

### 2.1 `war-hostile-takeover-displacement` (step 14) — **PRIMARY DRIVER**

**File:** `src/state/displacement_takeover.ts` → `processDisplacementTakeover()`

Runs every turn after attack resolution. The **only active displacement trigger** as of 2026-03-01.

**Three sub-steps per turn:**

1. **Step 0 — War-start seeding:** On the first executed war turn (`currentTurn === warStartTurn + 1`), creates displacement timers for OSIDs in `political_controllers`. **Note:** `runTurn()` increments `state.meta.turn` BEFORE running phases, so `warStartTurn + 1` is the first actual execution turn (not `warStartTurn` itself). For each OSID, a timer is created for every minority faction at war with the controller — subject to **per-faction gating rules**:

   | Controller | Displaced | Fraction | Gate |
   |---|---|---|---|
   | HRHB | RS (Serbs) | **100%** | No gating — every HRHB OSID seeds |
   | RBiH | RS (Serbs) | **10%** | Sarajevo urban municipalities only |
   | RBiH | RS (Serbs) | **50%** | Front-adjacent OSIDs only |
   | RBiH | RS (Serbs) | **skip** | Deep-rear non-Sarajevo OSIDs |
   | Any | Any (default) | **70%** | No gating |

   Front-adjacency is determined from `state.war_front_edges_osid`. If no front edges are computed yet (first turn), all OSIDs are treated as front-adjacent (fallback). Sarajevo urban: `centar_sarajevo`, `novi_grad_sarajevo`, `novo_sarajevo`, `stari_grad_sarajevo`, `ilidza`, `vogosca`, `hadzici`.

2. **Step 1 — Battle-driven timers:** When attack resolution flips an OSID, a new timer is created for the losing faction's population in that OSID.

3. **Step 2 — Timer maturation:** After `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` turns, the timer matures. Per-OSID population is looked up from the operational settlements census data (`population_total`); falls back to `floor(mun_pop / osid_count)` if unavailable. Hostile share is computed from per-OSID ethnic composition (cap 0.95); falls back to municipality-level `getDynamicHostileShare()` (cap 0.80). Initial displaced amount = `min(floor(osidPop × hostileShare × initFraction), remainingPop)`, where `initFraction` is determined by `getInitialDisplacementFraction(toFaction, fromFaction, munId, isFrontAdjacent)` (see per-faction table above; default 70%). Kill/flee fractions applied, survivors enter camp. `timer.cumulative_displaced` is set; remaining 30% flows through sustained displacement (Branch B).

**Also handles re-displacement pass-through:** When a municipality with `displaced_in > 0` has a timer mature, displaced people already sheltering there are re-routed to new friendly municipalities with **zero casualties and zero flee-abroad**. This prevents double-counting — a person displaced twice counts as 1 displaced person.

**Minority flight** (`processMinorityFlight()`) is **active** in the pipeline (`minority-flight` step). Confirmed running: ~493k displaced in 52w (378k spike at w4, ~9.4k/4-week cycle after). It runs independently of takeover displacement.

### 2.2 `war-displacement-triggers` (settlement-level)

**File:** `src/sim/phase_f/displacement_triggers.ts` → `evaluateDisplacementTriggers()`

Evaluates displacement deltas for front-active settlements based on conflict intensity and front pressure. Produces per-settlement deltas that are applied and aggregated to municipality level.

- Guard: `state.meta.phase === 'war'`
- Base delta for front-active settlements: `PHASE_F_BASE_FRONT_ACTIVE_DELTA = 0.02`
- Pressure contribution: `pressureSum × PHASE_F_PRESSURE_SCALE (0.001)`, capped at `PHASE_F_MAX_PRESSURE_CONTRIBUTION = 0.03`
- Total cap: `PHASE_F_MAX_DELTA_PER_TURN = 0.05`

### 2.3 `update-displacement` (continuous pressure)

**File:** `src/state/displacement.ts` → `updateDisplacement()`

Runs every turn. Evaluates three continuous pressure conditions per municipality:

| Condition | Threshold | Displacement Rate |
|-----------|-----------|-------------------|
| Unsupplied | 3 consecutive turns (`UNSUPPLIED_PRESSURE_TURNS`) | 5%/turn (`UNSUPPLIED_DISPLACEMENT_FRACTION`) |
| Encircled | Immediate (no path to other friendly mun) | 10%/turn (`ENCIRCLEMENT_DISPLACEMENT_FRACTION`) |
| Front breaches | 2 persistent turns (`BREACH_PERSISTENCE_TURNS`) | 3%/turn (`BREACH_DISPLACEMENT_FRACTION`) |

- **Sustainability collapse multiplier:** When a municipality is collapsed, displacement rates are multiplied by `COLLAPSE_DISPLACEMENT_MULTIPLIER = 1.5`
- Encirclement check: BFS from any settlement in municipality through friendly-controlled settlements; encircled if no path reaches a different friendly municipality
- Supply check: at least one settlement in the municipality must be in `reachableSettlements` (supply graph)
- Breach check: count front breaches affecting settlements in the municipality

---

## 3. Trigger Types

### 3.1 Hostile Takeover (OSID-Based) — **ONLY ACTIVE TRIGGER**

The sole displacement trigger as of 2026-03-01. All displacement flows through this path. As of 2026-03-05, sustained displacement is active: initial wave = 70% of minority, sustained trickle = 3%/turn on remaining 30% until < 10 people remain.

**Two trigger sources:**

1. **War-start seeding (Step 0):** At `currentTurn === warStartTurn + 1` (first executed war turn — `runTurn()` increments turn before phases), iterate all OSIDs in `political_controllers`. For each OSID, create timers for every minority faction at war with the controller. This means ALL minorities begin displacement from day one.

2. **Battle-driven (Step 1):** When attack resolution flips an OSID, a timer is created for the displaced faction.

**Timer key format:** `${osid}|${fromFaction}` — supports multiple displaced ethnicities per OSID (e.g., an RS-controlled OSID gets separate timers for RBiH and HRHB displacement).

**Sequence:**
1. Timer created (war-start or battle flip)
2. `areFactionsAtWar()` check passes (factions are at war)
3. Timer starts: `HostileTakeoverTimerState { mun_id, from_faction, to_faction, started_turn }`
4. After `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` turns, timer matures
5. Per-OSID population from census (fallback: `floor(mun_original_population / osid_count_in_mun)`)
6. Hostile share from per-OSID ethnic data (fallback: `getDynamicHostileShare()`)
7. Displaced amount = `min(floor(osidPop × hostileShare), remainingPop)`
7. Kill fraction applied, flee-abroad fraction applied, survivors enter camp
8. Camp holds for `CAMP_REROUTE_DELAY_TURNS = 4` turns
9. Camp routes to destination municipalities via per-ethnicity routing tables

**Hostile share:** Two-tier computation (as of n319):

1. **Per-OSID census data** (preferred): Uses `population_bosniaks`, `population_serbs`, `population_croats`, `population_others` from operational settlements GeoJSON. Faction alignment: RBiH = bosniak + other, RS = serb, HRHB = croat. Cap: 0.95.
2. **Municipality-level fallback**: `getDynamicHostileShare()` from 1991 census, adjusted for incoming displaced. Cap: 0.80.

Per-OSID data is loaded from `data/derived/operational/operational_settlements.geojson` via the `osidSettlements` parameter.

**Re-displacement pass-through:** When a timer matures on a municipality that has `displaced_in > 0`, those already-displaced people are re-routed to new friendly municipalities with:
- **Zero casualties** (no kill fraction)
- **Zero flee-abroad** (no abroad fraction)
- **No double-counting** (displaced_total does not increment for pass-through)

### 3.2 Minority Flight — **DISABLED**

As of 2026-03-01, `processMinorityFlight()` is **not called** in `turn_pipeline.ts`. The code remains in `src/state/minority_flight.ts` for potential future use, but the pipeline returns an empty report.

**Rationale:** Displacement should only trigger from hostile OSID takeover (war-start seeding handles the "minorities flee from day one" case that minority flight previously covered).

### 3.3 Continuous Pressure

Ongoing displacement from operational conditions — no direct battle required.

Three independent triggers, each checked per municipality per turn:

1. **Unsupply:** Municipality has no supplied settlements for `UNSUPPLIED_PRESSURE_TURNS = 3` consecutive turns → displace `UNSUPPLIED_DISPLACEMENT_FRACTION = 0.05` (5%) of remaining population per turn
2. **Encirclement:** No friendly-controlled path to any other friendly municipality → displace `ENCIRCLEMENT_DISPLACEMENT_FRACTION = 0.10` (10%) per turn
3. **Front breaches:** Municipality has breaches persisting for `BREACH_PERSISTENCE_TURNS = 2` turns → displace `BREACH_DISPLACEMENT_FRACTION = 0.03` (3%) per turn

Pressure state tracking uses a module-level cache (`pressureStateCache`) that tracks consecutive unsupplied turns per municipality. Must be reset at simulation start via `resetDisplacementPressureCache()`.

---

## 4. Routing System

### 4.1 Architecture

**File:** `src/state/displacement_routing_data.ts`

Routing is organized by **8 geographic regions** × **3 ethnicities** (Bosniak/Croat/Serb), with sub-regional routing for finer granularity. Canon: Systems_Manual_v0_7_0.md §12.1.

**Lookup:** `getDisplacementRouteForMun(originMun, ethnicity)` → ordered list of destination municipalities

**Routing order at camp reroute time** (`displacement_takeover.ts:getRoutingOrder()`):
1. **Primary route** from per-municipality routing table
2. **Fallback routes** from `FALLBACK_ROUTES_BY_FACTION`
3. **Large urban municipalities** from `LARGE_URBAN_MUN_IDS`

All three are concatenated and deduplicated (first occurrence wins).

### 4.2 Runtime Validation

Each destination in the routing order must pass **all three checks:**
1. **Faction-controlled:** destination municipality has ≥1 OSID controlled by the displaced person's faction
2. **Brigade present:** `factionHasBrigadeInMunicipality()` confirms a friendly brigade is located there
3. **Below receiving capacity:** current population < `original_population × receivingCapacityFraction`

If a destination fails any check, it is skipped and the next destination in order is tried.

### 4.3 Receiving Capacity

| Municipality Type | Capacity Fraction | Meaning |
|-------------------|-------------------|---------|
| Standard | `1.50` (150% of pre-war pop) | `DISPLACEMENT_RECEIVING_CAPACITY_FRACTION` |
| Sarajevo area (9 muns) | `1.10` (110% of pre-war pop) | `SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION` |

**Sarajevo area municipalities:** centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo, ilidza, hadzici, vogosca, ilijas, trnovo

When a destination is at capacity, overflow routes to the next municipality in the routing order.

### 4.4 Fallback Routes

When per-municipality routing is exhausted or no route is defined:

| Faction | Fallback Destinations |
|---------|----------------------|
| RBiH | tuzla, zenica, travnik, gorazde, srebrenica, centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, bihac |
| RS | banja_luka, bijeljina, doboj, prijedor, zvornik, brcko |
| HRHB | mostar, livno, travnik, brcko |

### 4.5 Routing Tables

#### Bosniak Routes (19 sub-regions)

| Sub-Region | Destinations |
|------------|--------------|
| KRAJINA_NORTHWEST | travnik, jajce, zenica, bihac |
| KRAJINA_BANJALUKA | travnik, jajce, tesanj, zenica, tuzla |
| KRAJINA_WEST | bihac, cazin, velika_kladusa |
| KRAJINA_POSAVINA | doboj, tesanj, tuzla, zenica |
| KRAJINA_KOTOR | travnik, tesanj, zenica, tuzla |
| KRAJINA_MOUNTAIN | jajce, travnik, bugojno, zenica |
| POSAVINA_BIJELJINA | kalesija, zivinice, tuzla, srebrenik |
| POSAVINA_BRCKO | gradacac, srebrenik, tuzla |
| POSAVINA_SAMAC | gradacac, gracanica, tuzla |
| POSAVINA_DOBOJ | tesanj, maglaj, zenica, tuzla |
| POSAVINA_DERVENTA | tesanj, doboj, tuzla, zenica |
| POSAVINA_BROD | tesanj, doboj, zenica |
| DRINA_NORTH | srebrenica, kalesija, tuzla, kladanj |
| DRINA_SOUTH | gorazde, centar_sarajevo, zenica |
| DRINA_SEKOVICI | kladanj, olovo, tuzla |
| SARAJEVO_RS_HELD | centar_sarajevo, visoko, zenica |
| CENTRAL_BOSNIA | travnik, zenica, kakanj, visoko |
| HERZEGOVINA | jablanica, konjic, zenica, travnik |
| HERCEG_EAST | gorazde, centar_sarajevo |
| BIHAC_EDGE | bihac, cazin, velika_kladusa |

#### Croat Routes (15 sub-regions)

| Sub-Region | Destinations |
|------------|--------------|
| KRAJINA_ALL | livno, kupres, mostar, capljina |
| KOTOR_VAROS | travnik, vitez, kiseljak, mostar |
| POSAVINA_ORASJE | orasje |
| POSAVINA_REST | orasje, gradacac |
| DOBOJ_AREA | tesanj, zepce, travnik |
| CENTRAL_BOSNIA_LASVA | kiseljak, kresevo, mostar, livno |
| CENTRAL_BOSNIA_JAJCE | livno, mostar |
| CENTRAL_BOSNIA_KUPRES | livno, duvno, mostar |
| CENTRAL_BOSNIA_PROZOR | mostar, jablanica |
| KAKANJ_BREZA | kiseljak, fojnica, travnik, vitez |
| ZENICA_TRAVNIK | novi_travnik, vitez, busovaca, kiseljak |
| TESANJ_MAGLAJ | zepce, travnik |
| VARES | kiseljak, fojnica, busovaca |
| SARAJEVO | kiseljak, fojnica, travnik, mostar |
| BUGOJNO_GORNJI_VAKUF | gornji_vakuf, prozor, livno, mostar |

#### Serb Routes (12 sub-regions)

| Sub-Region | Destinations |
|------------|--------------|
| TUZLA_AREA | bijeljina, lopare, doboj, banja_luka |
| MAGLAJ_TESANJ | doboj, teslic, banja_luka |
| ZENICA_KAKANJ | ilijas, pale, doboj, banja_luka |
| TRAVNIK | skender_vakuf, mrkonjic_grad, banja_luka |
| EAST_CORRIDOR | vlasenica, han_pijesak, bijeljina, zvornik |
| SARAJEVO | pale, sokolac, han_pijesak, rogatica |
| MOSTAR | nevesinje, gacko, trebinje, bileca |
| LIVNO | glamoc, bosansko_grahovo, banja_luka |
| KONJIC | kalinovik, foca, pale |
| BIHAC_POCKET | bosanski_petrovac, kljuc, banja_luka, prijedor |
| CENTRAL_BOSNIA | mrkonjic_grad, sipovo, banja_luka |
| VARES | ilijas, sokolac, pale, banja_luka |

---

## 5. Loss Fractions

### 5.1 Standard Loss Constants

**File:** `src/state/displacement_loss_constants.ts`

| Constant | Value | Meaning |
|----------|-------|---------|
| `DISPLACEMENT_KILLED_FRACTION` | 0.04 | 4% of displaced killed (all ethnicities). Was 0.10, reduced in Phase A calibration (n343). |
| `FLEE_ABROAD_FRACTION_RS` | 0.30 | 30% of surviving displaced Serbs leave BiH |
| `FLEE_ABROAD_FRACTION_HRHB` | 0.25 | 25% of surviving displaced Croats leave BiH |
| `FLEE_ABROAD_FRACTION_RBIH` | 0.00 | Bosniaks have no external state to flee to |

### 5.2 Special Cases

| Constant | Value | Location | Meaning |
|----------|-------|----------|---------|
| `POSAVINA_CROAT_FLEE_ABROAD` | 0.70 | `displacement_takeover.ts` | Posavina Croats: 70% flee to Croatia |
| `ENCLAVE_OVERRUN_KILL_FRACTION` | 0.35 | `displacement_takeover.ts` | Srebrenica/Gorazde/Zepa overrun: 35% killed |
| `LOST_POPULATION_FRACTION` | 0.20 | `displacement.ts` | Fallback when no 1991 census data: 20% lost |

### 5.3 Loss Calculation Order

For each displacement event:
1. Compute `displacementAmount` from trigger
2. `killed = floor(displacementAmount × killFraction)` (standard 10%, or 35% for enclave overrun)
3. `survivors = displacementAmount - killed`
4. `fledAbroad = floor(survivors × fleeAbroadFraction)` (faction-specific, Posavina override)
5. `routedToCamp = survivors - fledAbroad` (enters camp state machine)
6. Record `killed` and `fledAbroad` in `state.civilian_casualties`

### 5.4 Posavina Municipalities (70% Croat Flee-Abroad)

brcko, bosanski_samac, odzak, orasje, gradacac, derventa, modrica, bosanski_brod, bosanska_gradiska, doboj, bijeljina

---

## 6. Camps and Timers — The State Machine

### 6.1 Lifecycle

```
War Start → Seed ALL OSIDs with timers (Step 0)
   OR
Battle → OSID Flips → Timer Starts (Step 1)
                                |
                    Timer key: ${osid}|${fromFaction}
                          4 turns wait
                                |
                    ┌── Timer Matures (Step 2) ──┐
                    │                             │
             Branch A: Initial               Branch B: Sustained
             (matured_turn set,              (each subsequent turn)
              cumulative = amount)
                    │                             │
     Per-OSID displaced =                  remainingMinority =
     min(osidPop×share, pop)               initial - cumulative
                    │                      (starts from initial fire)
        ┌───────┴────────┐                        │
        │                │                3% of remaining per turn
        │                │                        │
  Native pop      Displaced-in             Kill/flee pipeline
        │         (pass-through)                  │
  Kill 10%        Zero casualties          Direct route to
  Flee-abroad     Re-route                 friendly municipalities
  → Camp                                   (no camp intermediate)
        │                                         │
   4 turns wait                            5% → militia pool
        │
   Camp Routes Out
        │
   Route to destinations
        │
   5% → militia pool

Sustained displacement continues until:
  - OSID recaptured by displaced faction
  - Factions no longer at war
  - Remaining minority < 10 persons
```

### 6.2 Timer State

```typescript
interface HostileTakeoverTimerState {
    mun_id: MunicipalityId;
    from_faction: FactionId;    // faction losing population
    to_faction: FactionId;      // faction gaining control
    started_turn: number;       // turn timer began
    matured_turn?: number;      // set when initial displacement fires (undefined = still in countdown)
    cumulative_displaced?: number; // total persons displaced from this OSID (initial + sustained)
}
```

**Key format:** `${osid}|${fromFaction}` (e.g., `op:zenica:zenica_1|RS`)
- Supports multiple timers per OSID (one per displaced ethnicity)
- Timer keys are stored in `state.hostile_takeover_timers: Record<string, HostileTakeoverTimerState>`

**Created by:**
1. War-start seeding (Step 0): one timer per minority faction per OSID, at `warStartTurn + 1` (first executed war turn)
2. Battle-driven flips (Step 1): one timer per flip, keyed by `${battle.osid}|${fromFaction}`

- Only created when factions are at war (`areFactionsAtWar()`)
- Existing timer for same key is not overwritten (first-come wins)
- After initial maturation: timer stays alive with `matured_turn` set (enters sustained mode)
- Deleted when: OSID recaptured, factions not at war, or remaining minority < 10

### 6.3 Camp State

```typescript
interface DisplacementCampState {
    mun_id: MunicipalityId;
    population: number;          // total camp population
    started_turn: number;        // turn camp was created
    by_faction: Partial<Record<FactionId, number>>;  // per-ethnicity breakdown
}
```

- Created when timer matures and survivors > 0
- Routes after `CAMP_REROUTE_DELAY_TURNS = 4` turns
- Each ethnicity routes independently using its own routing table
- Camp deleted when population reaches 0
- Multiple timers can feed into the same camp (populations accumulate)

### 6.4 Event Log

```typescript
interface DisplacementEvent {
    turn: number;
    origin_mun: MunicipalityId;
    origin_osid?: string;        // optional OSID-level tracking
    dest_mun: MunicipalityId;
    dest_osid?: string;          // optional OSID-level tracking
    ethnicity: FactionId;
    displaced: number;           // people displaced from origin
    killed: number;
    fled_abroad: number;
    settled: number;             // people settled at destination
}
```

Two events are logged per displacement cycle:
1. **Origin event** (timer maturation): `displaced > 0, settled = 0`
2. **Arrival event** (camp reroute): `displaced = 0, settled > 0`

Events are sorted by `(turn, origin_mun)` for deterministic ordering.

---

## 7. GameState Fields

All displacement-related fields on `GameState` (`src/state/game_state.ts`):

| Field | Type | Purpose |
|-------|------|---------|
| `displacement_state` | `Record<MunicipalityId, DisplacementState>` | Per-municipality population tracking |
| `hostile_takeover_timers` | `Record<string, HostileTakeoverTimerState>` | Active takeover timers (keyed by `${osid}\|${fromFaction}`) |
| `displacement_camp_state` | `Record<MunicipalityId, DisplacementCampState>` | Active camps awaiting reroute |
| `displacement_event_log` | `DisplacementEvent[]` | Cumulative event log |
| `minority_flight_state` | `Record<SettlementId, MinorityFlightStateEntry>` | Per-settlement gradual flight tracking |
| `civilian_casualties` | `Record<FactionId, { killed, fled_abroad }>` | Aggregate civilian loss counters |

### 7.1 DisplacementState (per municipality)

```typescript
interface DisplacementState {
    mun_id: MunicipalityId;
    original_population: number;     // immutable baseline
    displaced_out: number;           // cumulative, irreversible
    displaced_in: number;            // cumulative arrivals
    displaced_in_by_faction?: Partial<Record<FactionId, number>>;  // arrivals by ethnicity
    lost_population: number;         // killed + fled abroad
    last_updated_turn: number;
    displaced_out_by_osid?: Record<string, number>;   // OSID-level origin tracking
    displaced_in_by_osid?: Record<string, number>;    // OSID-level destination tracking
}
```

**Key invariant:** `displaced_out` only increases. Once people are displaced, they never return to origin.

**Effective remaining population:** `original_population - displaced_out - lost_population + displaced_in`

---

## 8. Recruitment Integration

### 8.1 Militia Pool Contribution

When displaced people are routed to a destination municipality, a fraction enters the local militia pool:

| Constant | Value | Meaning |
|----------|-------|---------|
| `REINFORCEMENT_RATE_ACUTE` | 0.04 | 4% of routed displaced become militia manpower (first 8 weeks) |
| `REINFORCEMENT_RATE_SUSTAINED` | 0.01 | 1% (after 8 weeks) |
| `DISPLACED_CONTRIBUTION_CAP` | 800 | Maximum contribution per mun per turn from displaced |

**Calculation:** `contribution = min(floor(routedAmount × rate), 800)` where rate depends on war week (acute vs sustained phase)

Added to `state.militia_pools[poolKey].available` where `poolKey = militiaPoolKey(targetMun, faction)`.

### 8.2 Source Depletion

When displacement occurs at origin, the source municipality's militia pool is reduced proportionally:

```
ratio = displacementAmount / currentPopulation
reduction = floor(pool.available × ratio)
pool.available = max(0, pool.available - reduction)
```

This ensures that displaced municipalities lose both civilian population and military recruitment capacity.

---

## 9. Alliance and War-State Guards

### 9.1 At-War Check

`areFactionsAtWar(a, b)` in `displacement_takeover.ts`:

- Different factions are always at war **except** RBiH-HRHB pair
- RBiH-HRHB are at war only when:
  - `state.meta.turn >= state.meta.rbih_hrhb_war_earliest_turn` AND
  - `state.war_alliance_rbih_hrhb <= RBIH_HRHB_ALLIED_THRESHOLD (0.20)`

### 9.2 Impact

When RBiH-HRHB are **allied** (alliance > 0.20):
- No hostile takeover timers created between RBiH and HRHB
- No minority flight between RBiH and HRHB territories
- Their populations coexist without displacement triggers

---

## 10. Special Cases

### 10.1 Enclave Overrun

**Municipalities:** srebrenica, gorazde, zepa

When an enclave municipality is overrun (from_faction = RBiH, to_faction != RBiH):
- Kill fraction increases from 10% to **35%** (`ENCLAVE_OVERRUN_KILL_FRACTION`)
- Models the historical high-lethality events (Srebrenica massacre)

### 10.2 Posavina Croats

**Municipalities:** brcko, bosanski_samac, odzak, orasje, gradacac, derventa, modrica, bosanski_brod, bosanska_gradiska, doboj, bijeljina

- Flee-abroad fraction: **70%** (vs standard 25% for Croats)
- Models the historical pattern where Posavina Croats overwhelmingly fled to Croatia

### 10.3 Sarajevo Siege

**Municipalities:** centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo, ilidza, hadzici, vogosca, ilijas, trnovo

- Receiving capacity capped at **110%** of pre-war population (vs 150% standard)
- Models siege conditions limiting absorption of refugees

### 10.4 Dynamic Hostile Share

`getDynamicHostileShare()` computes the ethnic share of the displaced faction from 1991 census data. A uniform cap is applied:

```typescript
hostileShare = Math.min(getDynamicHostileShare(...), 0.80);
```

No per-faction overrides. All faction pairs use the same 0.80 cap. This replaced earlier per-pair modifiers (RS→RBiH was 0.30×, others were min 0.80) which suppressed Serb displacement unrealistically.

### 10.5 OSID-Based Ethnic Displacement

When a faction captures an OSID and holds it for 4 weeks (timer maturation), it expels the **enemy-aligned ethnic population** of that OSID — not a flat percentage of total OSID population.

The computation:

```typescript
// 1. Per-OSID population = municipality total / OSID count (equal split)
const osidCount = osidCountByMun.get(munId) ?? 1;
const osidPop = Math.floor(dispState.original_population / osidCount);

// 2. Ethnic share of the expelled faction (from 1991 census)
//    e.g., if RS captures OSID → fromFaction = 'RBiH' → hostileShare = Bosniak %
let hostileShare = getDynamicHostileShare(munId, fromFaction, dispState, population1991ByMun);
hostileShare = Math.min(hostileShare, 0.80);  // cap at 80%

// 3. Displacement amount = ethnic population of that OSID
const displacementAmount = Math.min(Math.floor(osidPop * hostileShare), remainingPop);
```

**Example:** RS captures 1 of 11 OSIDs in Prijedor (pop 112,543, 44% Bosniak). Per-OSID pop = 10,231. Bosniak share = 0.44. Displacement = floor(10,231 × 0.44) = 4,501 Bosniaks expelled from that OSID. Of those: 10% killed (450), remainder routed to camps then to friendly municipalities. RS must hold the OSID for 4 continuous weeks before displacement fires.

### 10.6 Re-Displacement Pass-Through

When a municipality that has received displaced people (`displaced_in > 0`) is itself taken over:
1. **Native population** is displaced normally (with kill/flee fractions)
2. **Already-displaced people** (`displaced_in_by_faction`) are re-routed to new friendly municipalities
3. Re-routing applies **zero casualties** and **zero flee-abroad** — these people were already counted once
4. This prevents double-counting: a person displaced twice counts as 1 displaced person total

**Accounting invariant:** `Sum(displaced_out) = Sum(displaced_in) + Sum(camp_population)` — verified as exactly 0 in every run.

### 10.7 Sustained Displacement

After the initial 4-turn timer fires (Branch A), the OSID enters **sustained displacement mode** (Branch B). This models ongoing ethnic cleansing — historical patterns like Prijedor camps, Bijeljina forced expulsions, and Foča systematic terror were multi-month processes, not one-shot events.

**Constants:**
- `SUSTAINED_DISPLACEMENT_RATE = 0.03` — 3% of remaining minority per OSID per turn
- `SUSTAINED_MIN_REMAINING = 10` — stop when remaining minority falls below threshold

**Mechanic:**
1. Each turn after `matured_turn`, compute `remainingMinority = initialMinority - cumulative_displaced`
2. `sustainedAmount = floor(remainingMinority × 0.03)`, capped at municipality remaining population
3. Standard casualty pipeline: 10% killed (or 35% for enclave overrun), flee-abroad fraction applied
4. Survivors route **directly** to friendly municipalities (no camp intermediate — sustained = civilian flight, not organized military evacuation)
5. 5% of routed population contributes to destination militia pools

**Lifecycle:**
- Timer stays alive with `matured_turn` set after initial fire
- Each subsequent turn: sustained displacement fires automatically
- Timer deleted when: OSID recaptured by `from_faction`, factions no longer at war, or `remainingMinority < 10`
- Recapture check uses `from_faction`: timer deleted when displaced faction regains control. Third-faction takeover continues sustained displacement.

**Per-OSID granularity:** Partial municipal control (e.g., Bratunac RS holds 4/8 OSIDs) naturally yields proportional sustained rate. Consistent with initial displacement model.

---

## 11. Diagnostic Checklist

### 11.1 Current State (n296, 40w)

| Metric | Value | Full-War Target |
|--------|-------|-----------------|
| Total displaced+lost | 333,592 | ~1M by Jan 1993 |
| RBiH killed | 21,481 | ~30K |
| HRHB killed | 9,218 | ~2K |
| RS killed | 2,604 | ~6K |
| RBiH displaced settled | 189,411 | — |
| HRHB displaced settled | 22,335 | — |
| RS displaced settled | 15,003 | — |
| Accounting (out-in-camp) | 0 | 0 |

### 11.2 Open Issues

1. **HRHB killed too high (9.2K vs 2K full-war target):** Driven by large Croat displacement from areas like Livno (17K out, 8K lost from pop 40K). The 10% kill fraction applies uniformly. May need a lower kill fraction for Croat displacement specifically, or the combat system may be over-capturing HRHB-held OSIDs.

2. **RS killed slightly low (2.6K vs 6K full-war target at 40w):** War-start seeding improved this from 2.1K to 2.6K. May reach target at 52w, or the 0.80 hostile share cap may still be too aggressive.

3. **Top municipalities by displaced_out** (n296): Prijedor 19.6K, Doboj 17.4K, Livno 17K, Bosanska Krupa 14.7K, Bugojno 9.8K — these align with historically displaced areas.

### 11.3 Resolved Issues

1. ~~Minority flight contributing 69% of displacement~~ → Disabled; only hostile takeover triggers displacement
2. ~~Municipality-based displacement inflating numbers~~ → Now OSID-based; capturing 1/7 OSIDs displaces 1/7 of population
3. ~~Double-counting from re-displacement~~ → Pass-through with zero casualties
4. ~~Serb displacement suppressed by 0.30× multiplier~~ → Uniform 0.80 cap for all factions
5. ~~Negative population municipalities~~ → Per-OSID remaining pop cap prevents overdraw (22 negative muns → 0)

### 11.4 Key Diagnostic Metrics

- `displaced_out` vs `displaced_in` per municipality (net flow)
- Kill/abroad totals by faction from `civilian_casualties`
- Camp occupancy over time (how many camps, how long they persist)
- Accounting invariant: `Sum(out) - Sum(in) - Sum(camp) = 0`
- Per-OSID timer count (war-start seeding creates O(OSIDs × factions) timers)

---

## 12. Source File Index

| File | Lines | Purpose |
|------|-------|---------|
| `src/state/displacement.ts` | ~1003 | Continuous pressure displacement; routing (BFS-based) |
| `src/state/displacement_takeover.ts` | ~550 | Hostile takeover: OSID-based timers, war-start seeding, timer→camp→route state machine, re-displacement pass-through |
| `src/state/minority_flight.ts` | ~360 | Settlement-level minority flight (**DISABLED** in pipeline; code retained) |
| `src/state/displacement_routing_data.ts` | ~273 | Per-municipality per-ethnicity routing tables (19+15+12 sub-regions) |
| `src/state/displacement_state_utils.ts` | ~94 | Shared helpers: getOrInitDisplacementState, factionHasBrigadeInMunicipality, recordCivilianDisplacementCasualties |
| `src/state/displacement_loss_constants.ts` | ~30 | Kill/flee-abroad fractions (single source of truth) |
| `src/sim/phase_f/displacement_triggers.ts` | ~139 | Settlement-level displacement deltas (front pressure) |
| `src/state/game_state.ts` | (types) | DisplacementState, HostileTakeoverTimerState, DisplacementCampState, DisplacementEvent, MinorityFlightStateEntry |

### Pipeline Integration

**`TakeoverBattleRecord`** (passed from `turn_pipeline.ts`):
```typescript
{ location: string; attacker: FactionId; defender: FactionId;
  settlement_flipped: boolean; osid?: string; }
```
The `osid` field carries the OSID identity from attack resolution into the displacement system. If absent, falls back to `sid:${location}`.

### Canon References

- `docs/10_canon/Phase_Specifications_v0_6_0.md` — two-phase model (Peace / War)
- `docs/10_canon/War_Specification_v0_6_0.md` §5 — War pipeline step order (step 14: `war-hostile-takeover-displacement`)
- `docs/10_canon/Systems_Manual_v0_7_0.md` §12.1 (per-municipality routing), §12.2 (OSID-level tracking)
- `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8 (routing table design)
