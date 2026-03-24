# Emergent Brigade Formation — Design Spec

**Date:** 2026-03-24
**Status:** DRAFT — brainstorming output, needs review
**Scope:** Replace time-gated brigade spawning with pool-gated emergent formation
**Prerequisite:** v0.6.5 complete, Sarajevo siege fixes landed

---

## Problem Statement

The current brigade spawning model has two modes:
1. **70 RBiH brigades spawn at turn 0** (hard-coded OOB, `available_from: 0`)
2. **56 RBiH brigades spawn at fixed weeks** (`available_from: 2, 4, 6, 8...`)

This produces three pathologies:

**Over-production in small municipalities:** Hadzici (15k Bosniaks) gets 5 brigades, Fojnica (8k) gets 2, Kladanj (12k) gets 5. Pools drain instantly, brigades spawn at deficit, most are permanently combat ineffective. We spent an entire session fighting this.

**Under-production in large municipalities:** Tuzla, Zenica, Doboj, Bihac all have pools at the 5,000 overflow threshold with all brigades at max strength. 25,000 available manpower sits unused because no new brigade is scheduled to form. The excess gets siphoned into the generic strategic reserve instead of producing local formations.

**Timing ignores reality:** `available_from: 4` means "spawn at week 4 regardless of population state." A municipality that received 30,000 displaced Bosniaks between w1-w3 forms the same number of brigades as one that received zero. The displacement system — the primary manpower engine — has no influence on force generation.

## Proposed Design

### Core Principle

**Brigades form when a municipality pool has surplus manpower AND all existing brigades in that municipality are at capacity.** The OOB becomes a menu of *potential* formations that activate based on pool conditions, not a spawn schedule.

### Turn-0 Seed Brigades

The 70 `available_from: 0` brigades spawn as they do today. These are the historical TO/Patriotic League units that existed in April 1992. No change to initial state.

### Pool-Gated Emergent Formation

The 56 currently time-gated brigades (`available_from > 0`) become **pool-gated candidates**. Each has:
- `available_from`: minimum week (earliest possible formation — unchanged)
- `home_mun`: municipality whose pool must fund the formation
- `initial_personnel`: manpower cost drawn from pool at formation
- `corps`: corps assignment (unchanged)

**Formation trigger (checked each turn during `brigade-reinforcement` step):**

```
For each municipality with a pool:
  1. current_turn >= candidate.available_from  (minimum week gate)
  2. All existing brigades in this municipality are at FORMATION_CAPACITY_THRESHOLD
     (e.g., 80% of max_personnel — they're "full enough" that a new unit is warranted)
  3. pool.available >= candidate.initial_personnel  (pool can fund the formation)
  4. No other candidate formed in this municipality THIS turn (one per turn per mun)

If all conditions met → form the brigade, draw from pool.
Candidates processed in available_from order (earliest first), then alphabetical.
```

**FORMATION_CAPACITY_THRESHOLD:** Configurable — probably 70-80% of max_personnel. When all existing brigades are at 2,100+ out of 3,000, the municipality is ready for a new formation. Below that, the pool keeps reinforcing existing brigades.

### Beyond-OOB Emergent Brigades

When ALL historical candidates for a municipality have been formed AND the pool still has surplus above OVERFLOW_THRESHOLD (currently 5,000), the system generates a **new non-historical brigade**:

- Named generically: "TO Battalion [Municipality]" or "[N]th Light Brigade"
- Equipment class: `light_infantry` (local mobilization, no heavy weapons)
- Initial personnel: drawn from pool surplus above OVERFLOW_THRESHOLD
- Corps: same as the most recent formed brigade in that municipality

This handles the Doboj case (1 OOB brigade, 5,000 surplus → forms 1-2 emergent units) and the displacement-swollen Tuzla/Zenica (already maxed OOB → emergent units absorb refugee manpower).

**Cap:** Maximum total brigades per municipality = `ceil(bosniak_population / 5000)`. Prevents absurd proliferation.

### Displacement-Responsive Pool Routing

Currently, displacement routes are static (HERZEGOVINA → jablanica, konjic, mostar...). Under emergent formation, displacement should favor municipalities with **formation potential**:

**Proposed enhancement to `routeDisplacedPopulation`:**

When selecting destination candidates, deprioritize municipalities where:
- All brigade candidates are formed AND pool.available > OVERFLOW_THRESHOLD (pool is already overflowing)

Boost priority for municipalities where:
- Unfilled brigade candidates exist (displaced population would directly enable new formations)
- Existing brigades are below capacity (displaced feed reinforcement)

This creates a feedback loop: displacement → pool growth → brigade formation → more defensive capacity → municipality holds → receives more displaced. The virtuous cycle that happened historically in Tuzla, Zenica, and Bihac.

**Implementation:** Add a `displacement_absorption_score` to each candidate municipality in `routeDisplacedPopulation`. Score = (unfilled_candidates * 1000) + (brigade_deficit * 100) - (pool_overflow * 50). Route fills highest-score first, capacity permitting.

### Strategic Reserve Overflow Threshold

The current `OVERFLOW_THRESHOLD = 5000` in `strategic_reserve.ts` siphons excess pool into a generic reserve. Under emergent formation, this threshold becomes the **formation gate** — excess above 5,000 forms new brigades instead of going to the strategic reserve.

**Change:** The strategic reserve collects overflow only AFTER all formation candidates have been exhausted for that municipality. If there are still OOB candidates waiting, the overflow funds them. Only genuinely surplus manpower (all candidates formed, all at capacity) goes to the strategic reserve.

### Applies to All Factions

The same logic applies to RS and HRHB. RS has JNA inheritance making seed brigades larger, but the emergent growth from displacement/mobilization follows the same pattern. HRHB has the smallest pool but significant displacement into Herzegovina.

---

## Projected Impact

### Based on n1061 pool analysis:

| Municipality | Current Brigades | Projected Emergent | Change |
|---|---|---|---|
| Tuzla | 5 (all maxed) | 7-8 | +2-3 from 5k surplus |
| Zenica | 4 (all maxed) | 6-7 | +2-3 from 5k surplus |
| Doboj | 1 (maxed) | 3-4 | +2-3 from 5k surplus |
| Bihac | 3 (2 maxed) | 5 | +2 from 5k surplus |
| Gradacac | 3 (2 maxed) | 4 | +1 from 3k surplus |
| Hadzici | 5 (all depleted) | 2-3 | -2-3 (pool can't sustain 5) |
| Kladanj | 5 (some depleted) | 3-4 | -1-2 (delayed formation) |
| Tesanj | 6 (some depleted) | 4-5 | -1-2 (delayed formation) |

**Net effect:** Similar total brigade count (~120) but distributed where population supports them. Fewer ghost brigades, more healthy ones. The 25,000 stranded manpower becomes 8-10 new combat-effective formations in Tuzla/Zenica/Doboj corridor.

### What changes about gameplay:

1. **Brigade formation becomes a visible event** — "The 372nd Mountain Brigade has formed in Tesanj" at w8, not silently at game start
2. **Displacement directly drives force generation** — refugee waves into Tuzla produce new brigades, visible to the player
3. **Small municipalities self-regulate** — Fojnica gets 1 brigade, not 3; Hadzici gets 2-3, not 5
4. **The "dead brigade" problem vanishes** — no brigade forms unless the pool can sustain it
5. **Late-war force proliferation is emergent** — the historical 1993-94 ARBiH expansion happens naturally from displacement + mobilization, not from OOB scheduling

---

## Risks

1. **Calibration reset.** The entire territorial balance changes. Must recalibrate from scratch.
2. **Early-war RBiH weakness.** Fewer brigades in w1-12 means more gaps for RS blitz. Could be historically accurate (the RS swept through gaps) or could cause excessive territorial loss.
3. **Historical brigade names.** If Doboj forms 2 emergent brigades, they get generic names. The OOB's named brigades are part of the game's narrative richness. Mitigation: keep the named OOB candidates as priority; emergent generics only form after all named candidates are exhausted.
4. **RS/HRHB balance.** If the same logic applies to all factions, RS emergent growth in Banja Luka/Bijeljina could be huge (large Serb populations + JNA inheritance). Need to verify RS doesn't over-produce.

---

## Implementation Scope

**Files affected:**
- `src/sim/formation_spawn.ts` — add pool-gated formation check
- `src/sim/combat/strategic_reserve.ts` — defer overflow collection until after formation
- `src/state/displacement_routing_data.ts` — displacement absorption scoring (optional, phase 2)
- `data/source/oob_brigades.json` — no structural change; `available_from` becomes "minimum week"
- `src/sim/turn_phases/war_phases.ts` — may need new pipeline step or modify existing

**Files NOT affected:**
- OOB structure, corps assignments, historical names — all preserved
- Turn-0 seed brigades — unchanged
- Combat, sectors, operations — unchanged (they just see more/fewer brigades)

**Estimated effort:** Medium. Core formation logic is ~50-80 lines. Displacement routing enhancement is optional phase 2. Calibration is the main time cost.

---

## Additional Findings (brainstorm round 2)

### The Manpower Black Hole: Strategic Reserve

The full manpower lifecycle has a dead end:

```
Census → Pool (scale 0.15) → Brigade reinforcement → Combat → Casualties
                                                              ↓
Pool overflow (>5k) → Strategic Reserve → Brigade reinforcement (rate 0.02)
                                                              ↑
Brigade dissolution (50% personnel) → Strategic Reserve ──────┘
```

The strategic reserve collects from two sources: pool overflow and dissolved brigades. But `FACTION_RESERVE_DRAW_RATE.RBiH = 0.02` means each brigade gets ~2 personnel/turn from the reserve. With 8,006 RBiH in reserve at w40, it would take 222 turns to empty. **The strategic reserve is a manpower graveyard.**

Under emergent formation, the overflow forms brigades directly instead of going to the reserve. Dissolved brigade personnel should return to the municipality pool (not the reserve) so they can be locally remobilized.

### RS Has No Overflow Problem

RS pools: 8,281 available, zero at 5k cap. RS doesn't have the surplus problem because RS has 80+ brigades drawing heavily from their pools. **The emergent system will mostly affect RBiH and HRHB** (which have 25k and 17k stranded respectively).

### HRHB Has 9,715 Stranded in 18 Pools

HRHB has Croat minority pools in non-HVO municipalities (Banja Luka 1,011, Zenica 891, Travnik 1,442, Vares 772). These represent Croat populations that can never be recruited because no HVO brigade operates there. Under emergent formation, these could form small HVO garrison units — but only in municipalities where HVO has control. Most are RBiH/RS-controlled, so these pools are genuinely unreachable. Accept as-is.

### max_personnel = 3,000 For ALL 238 Brigades

Every single brigade has max_personnel 3,000, regardless of type. A 400-man light battalion and a 2,500-man motorized brigade have the same cap. This means:
- The FORMATION_CAPACITY_THRESHOLD (80% = 2,400) is very high — most brigades never reach it
- Emergent spawning would rarely trigger because few brigades hit 2,400

**Fix needed:** Either lower FORMATION_CAPACITY_THRESHOLD to 60-70% (1,800-2,100) or introduce tiered max_personnel (light=1,500, mountain=2,000, motorized=3,000). The latter is more historically accurate — not every brigade was meant to reach 3,000.

### Zero Militia Formations at w40

The militia emergence system produces zero formations despite `formation_spawn_directive: { kind: 'both' }` and `recruitment_mode: player_choice`. This means the entire bottom-up TO→battalion→brigade growth path is inactive. All 238 brigades came from the OOB, not from organic emergence.

This is a missed opportunity. Under emergent formation, the militia system could be the MECHANISM for new brigade formation: pool surplus → TO detachment forms → grows to battalion → promoted to brigade (with historical name from OOB menu).

### Enclave Brigades Are Starving

11 enclave brigades get `ENCLAVE_REINFORCEMENT_RATE = 80` vs normal 400. Gorazde's 843rd Light (297 pers) and 851st Vitezka (178 pers) are being attrited faster than the 80/turn can replace. The enclave pool (gorazde:RBiH committed 5,088) is adequate but the draw rate is too low. This is separate from emergent formation but compounding — enclave brigades should either have a higher rate or the enclave itself should form fewer, stronger units.

### Displacement-Responsive Routing — Refined

The displacement routing should be **pool-aware**, not just destination-ordered. Current: fixed priority list (Jablanica first, then Konjic, then Mostar). Proposed: route to the municipality with the highest "formation potential" — where displaced population would directly enable a new brigade or reinforce a depleted one.

This creates emergent strategic geography: displaced populations flow toward municipalities where they can be mobilized, producing new brigades in locations dictated by the war's displacement patterns — not by pre-war demographics alone.

---

## Open Questions

1. Should `FORMATION_CAPACITY_THRESHOLD` be faction-specific? Given all brigades are max 3,000, should the threshold be 60% (1,800) to allow faster emergent growth?
2. Should the OVERFLOW_THRESHOLD (5,000) be removed entirely? Under emergent formation, excess goes to new brigades. The strategic reserve would only collect from dissolved brigades.
3. Should emergent (non-OOB) brigades have lower max_personnel (e.g., 1,500 for a TO battalion vs 3,000 for a named brigade)?
4. Should dissolved brigade personnel return to the municipality pool instead of the strategic reserve?
5. Should the militia emergence system (TO→battalion→brigade) be the growth mechanism instead of direct brigade spawning?
6. Should `RBiH FACTION_RESERVE_DRAW_RATE` be raised from 0.02 regardless of emergent formation? The current value makes the reserve a black hole.
7. How does this interact with the HRHB-RBiH war transition? The 1993 Croat-Bosniak conflict triggers massive displacement — the emergent system would naturally model the ARBiH expansion.
