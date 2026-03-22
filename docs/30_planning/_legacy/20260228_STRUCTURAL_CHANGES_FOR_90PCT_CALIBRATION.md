# Structural Changes to Break the 82% Calibration Ceiling

**Date**: 2026-02-28
**Context**: January 1993 painted target calibration reached 82.1% OSID match (n241) after 7 parameter-tuning iterations. The remaining 135 mismatches are structural — they cannot be resolved by adjusting weights, pool scales, doctrine phases, or standing orders. This document proposes engine-level changes to reach ~90% match.
**Reference**: `docs/40_reports/implemented/20260228_JAN1993_CALIBRATION_SESSION.md`

**Scenario:** The 40-week calibration scenario uses `recruitment_mode: "player_choice"` (not bottom_up) so that brigades spread to front OSIDs and generate attack orders; see docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.

---

## 1. Enclave-Scoped Defense

**Region affected**: Drina Valley (37 wrong OSIDs — worst region at 62% match)
**Estimated impact**: +15-20 OSIDs fixed

### Problem

Srebrenica enclave brigades (5 dedicated, cost=60) defend the entire Srebrenica municipality (7+ OSIDs), but historically RS held the rural outskirts while RBiH held only the town and immediate surroundings. The same pattern applies at Gorazde edges (7 brigades defending the full municipality when only the town core was RBiH-held).

The Drina Corps has weight 130 and is the highest-priority RS operation, yet it cannot take outlying municipality OSIDs because every attack runs into massed enclave defenders. This is historically wrong — VRS controlled the hills and roads around these enclaves while ARBiH held only the urban perimeter.

### Proposed fix

Add an `enclave_osids: string[]` field to enclave brigade definitions. Enclave brigades should:
- Only hold/defend OSIDs listed in their enclave perimeter
- Not respond to corps directives for OSIDs outside the enclave
- Not count toward municipality-level defense of outlying OSIDs

RS Drina Corps can then take outlying OSIDs (e.g. `op:srebrenica:zeleni_jadar_2`, `op:srebrenica:potocari_2`) without fighting through 5 concentrated enclave brigades, while the town OSID (`op:srebrenica:srebrenica_2`) remains defended.

### Key files
- `src/sim/combat/bot_brigade_ai_osid.ts` — enclave brigade behavior
- Enclave definitions (currently in formation data)

### Risks
- Enclave OSIDs need careful selection per painted map — too few and enclave falls, too many and no improvement
- May need a fallback rule: if all enclave OSIDs are lost, brigades can defend any friendly OSID in municipality

---

## 2. Corps-Level Brigade Allocation

**Region affected**: Sarajevo (16 wrong OSIDs — 67% match)
**Estimated impact**: +10-12 OSIDs fixed

### Problem

VRS Sarajevo-Romanija Corps (SRK) has only 3-5 subordinate brigades to besiege 48 suburb OSIDs (Ilidza, Ilijas, Vogosca, Hadzici, Trnovo). Priority weight is already at 90 (highest non-Drina RS priority) but weight is irrelevant when the corps lacks manpower. Meanwhile VRS 1st Krajina Corps has 30+ brigades and overruns areas beyond its historical reach.

The current system assigns brigades to corps based on AoR geography — wherever the brigade spawns determines its corps. This favors 1KK (large AoR, many municipalities) and starves SRK (small AoR around Sarajevo).

### Proposed fix

Implement corps-level brigade allocation floors or redistribution:

**Option A — Minimum brigade floors**:
- SRK guaranteed minimum 8 subordinates
- Drina Corps guaranteed minimum 8 subordinates
- Brigades transferred from overstaffed corps (1KK, EBK) at scenario start or during recruitment

**Option B — AoR-proportional allocation**:
- Brigade count proportional to front-line length in the corps' AoR
- SRK has a long front around Sarajevo; should receive proportionally more brigades

**Option C — Priority-weighted redistribution**:
- During recruitment, new brigades assigned to corps with highest unmet priority weight
- SRK (weight 90) gets priority over Herzegovina Corps (weight 50)

Option A is simplest and most historically grounded — SRK historically had 5 brigades plus significant independent units. Options B/C are more emergent but harder to tune.

### Key files
- `src/sim/combat/bot_corps_ai.ts` — corps subordinate assignment
- `src/sim/early_war/pool_population.ts` — brigade spawn/assignment
- Formation init data

### Risks
- Redistributing brigades from 1KK may cause RS to lose Posavina corridor
- Need careful minimum caps — too high and some corps become paper tigers

---

## 3. Supply-Based Overextension Penalty

**Region affected**: Central Corridor (15 wrong OSIDs — 78% match), Central Bosnia (23 wrong)
**Estimated impact**: +10-15 OSIDs fixed

### Problem

RS 1st Krajina Corps overruns Maglaj, Zavidovici, Doboj, and parts of Tesanj despite reduced priority weights (Central Corridor at weight 30, Ozren Operations removed entirely). A 30-brigade corps will opportunistically take undefended OSIDs along its front regardless of directive priorities — the score-based attack system scores ANY adjacent enemy OSID as a potential target.

Parameter tuning has hit diminishing returns here. The fundamental issue is that the AI has no concept of supply lines or logistical overextension. A brigade 100km from its corps HQ attacks with the same effectiveness as one 10km away.

### Proposed fix

Implement a supply distance penalty for attack scoring:

```
supply_penalty = -max(0, (distance_from_corps_hq - threshold) * scale)
```

- `distance_from_corps_hq`: Graph distance (OSID hops) from the brigade's current position to corps HQ OSID
- `threshold`: Free movement zone (e.g. 8 hops — no penalty within AoR core)
- `scale`: Penalty per hop beyond threshold (e.g. -15 score per hop)

At 12+ hops from HQ, the penalty (-60 or more) would make most attacks score negative, naturally limiting overextension without artificial weight caps. Directive targets (overextension penalty scale 0.25x) would still be viable for deep operations but opportunistic grabs would stop.

### Key files
- `src/sim/combat/bot_brigade_ai_osid.ts` — `scoreTargetFromDirective()` function
- Graph distance calculation — may need `src/map/` graph utilities

### Risks
- Need to calibrate threshold and scale carefully — too aggressive and RS can't take anything
- Graph distance may not correlate with actual supply line length (terrain, roads)
- May need per-corps HQ OSID definitions

---

## 4. HVO Orasje Pocket Enclave

**Region affected**: Orasje edge case + HRHB deficit (74 vs 89 target, -15 OSIDs)
**Estimated impact**: +2-3 HRHB OSIDs, fixes Orasje edge case

### Problem

The HVO Orasje pocket was held throughout the entire 1992-1995 war despite being surrounded by VRS territory. In the simulation, VRS Corridor 92 (1KK + EBK) steamrolls HVO Northwest Bosnia OZ with overwhelming force — Corridor 92 has weight 100 and two corps converging. The Orasje Pocket priority (weight 90) doesn't help because HVO NW Bosnia OZ has too few brigades.

### Proposed fix

Model Orasje as a dedicated pocket/enclave, similar to Srebrenica/Gorazde:
- Dedicate 2-3 brigades to Orasje OSIDs (`op:orasje:orasje`, `op:orasje:donja_mahala`, `op:orasje:ostra_luka`)
- High defense cost (cost=80) to prevent reallocation
- Lock these brigades to Orasje — not reassignable by corps AI
- Historically, HVO 106th Brigade "Bosanska Posavina" held this pocket with ~2,000 troops, supplied via Croatia across the Sava

### Key files
- Formation init data — add Orasje pocket brigade entries
- `src/sim/combat/bot_brigade_ai_osid.ts` — enclave locking behavior

### Risks
- Minimal. Orasje pocket is well-documented historically.
- 2-3 brigades is a small allocation from HRHB's ~26 total

---

## 5. Teocak/Sapna Finger Pocket

**Region affected**: Teocak and Sapna edge cases (2 OSIDs)
**Estimated impact**: +2 OSIDs, fixes 2 edge cases

### Problem

Teocak (`op:ugljevik:teocak_krstac_2`) and Sapna/Vitinica (`op:zvornik:vitinica_2`) were ARBiH strongholds connected to the Tuzla salient via a narrow corridor. VRS East Bosnian Corps takes both every run. ARBiH 2nd Corps has Tuzla Defense (weight 80) and Brcko South Hold (weight 90) but these don't specifically protect these two pocket OSIDs.

### Proposed fix

Two options:

**Option A — Hardcoded hold_osids**:
Add `op:ugljevik:teocak_krstac_2` and `op:zvornik:vitinica_2` to the ARBiH 2nd Corps CorpsDirective `hold_osids` list when RBiH controls them. This forces at least one brigade to defend each.

**Option B — Micro-enclave**:
Dedicate 1 brigade per pocket with high defense cost. Similar to enclave treatment but smaller scale.

Option A is simpler and lower risk. The Sapna Finger was historically defended by the 206th Mountain Brigade (ARBiH) which operated specifically in this corridor.

### Key files
- `src/sim/combat/bot_corps_ai.ts` — CorpsDirective generation, hold_osids
- Or formation data for Option B

### Risks
- Locking brigades to 2 specific OSIDs may starve other 2nd Corps operations
- Option A is lighter-touch and preferred

---

## 6. RS Recruitment Rate Cap

**Region affected**: Army size metric (113k vs 100k target, +13k over)
**Estimated impact**: Fixes VRS army size without affecting territory

### Problem

RS FACTION_POOL_SCALE at 0.28 still produces 113k troops at week 40. Reducing below 0.25 causes RS territory to collapse (75.7% match in n238). The diminishing returns curve means parameter tuning cannot reach the 100k target without breaking territorial performance.

The root cause: RS recruits ~2-3 brigades per turn via elective recruitment capital (which trickles at 5/turn). Even with low pool scale, recruitment capital accumulation drives troop growth beyond the target.

### Proposed fix

~~Add a per-faction **personnel ceiling** in the recruitment engine~~ — **SUPERSEDED.** Personnel ceilings were implemented in n364 but **removed in n369–n374**. The ceiling values were factually wrong (ARBiH cap 130k vs actual peak 180–200k; VRS cap 185k vs actual peak 100–110k). Replaced by tuned mobilization scales in `ongoing_mobilization.ts` (RBiH 0.14, RS 0.22, HRHB 0.18) + tightened exhaustion thresholds (0.15/0.25). Personnel now emerges organically from demographics, mobilization, and attrition. See `docs/40_reports/implemented/20260303_CEILING_REMOVAL_EMERGENT_GROWTH.md`.

### Key files
- `src/sim/early_war/pool_population.ts` — recruitment engine
- `data/scenarios/apr1992_definitive_40w.json` — scenario config

### Risks
- Hard caps feel artificial — may want a soft cap (recruitment rate decreasing as ceiling approaches)
- Need to ensure mandatory spawns still work for frontline coverage

---

## 7. Displacement System Activation

**Region affected**: Holistic (displacement is 0/0 throughout all runs)
**Estimated impact**: Historical accuracy, game design ("negative-sum" philosophy)

### Problem

The scenario file defines coercion pressure by municipality (Prijedor 0.90, Zvornik 0.85, Foca 0.85, etc.) and the activity summary shows `displacement-trigger eligible: max 316, mean 71`. Yet displacement is 0/0 — zero settlements displaced, zero municipality-level displacement.

The coercion system appears to identify eligible settlements but never actually generates displacement events. This is a critical gap for historical accuracy — ethnic cleansing and population displacement were defining features of the 1992-1995 war.

### Proposed fix

Investigate the displacement pipeline:
1. Trace from `coercion_pressure_by_municipality` in scenario config → turn pipeline step → displacement event generation
2. Identify why eligible settlements don't trigger: missing turn pipeline step? Threshold too high? Phase gate blocking?
3. Enable the system and calibrate thresholds against historical displacement data

### Key files
- `src/sim/turn_pipeline.ts` — displacement step
- Coercion/displacement system files (need investigation)

### Risks
- Displacement affects population pools, which affects recruitment, which affects territory
- Enabling displacement will require recalibration of all other parameters
- Sequence: fix displacement first, then recalibrate territory

---

## Implementation Priority

| Priority | Change | Impact (OSIDs) | Complexity | Risk |
|---|---|---|---|---|
| 1 | Enclave-scoped defense | +15-20 | Medium | Low |
| 2 | Corps brigade allocation | +10-12 | Medium | Medium |
| 3 | Supply overextension penalty | +10-15 | High | Medium |
| 4 | Orasje pocket enclave | +2-3 | Low | Low |
| 5 | Teocak/Sapna pocket | +2 | Low | Low |
| 6 | RS recruitment cap | Army size | Low | Low |
| 7 | Displacement activation | Holistic | High | High |

**Recommended sequence**: 1 → 4 → 5 → 2 → 6 → 3 → 7

Start with enclave scoping (biggest impact, moderate complexity), then the two pocket fixes (quick wins), then corps allocation. Supply penalty and displacement are higher-risk changes that should come after the simpler fixes are validated.

Changes 1-5 together could push match rate from 82% to ~88-90%. Change 6 fixes army size. Change 7 is a prerequisite for Phase III calibration (1993-1995 period).
