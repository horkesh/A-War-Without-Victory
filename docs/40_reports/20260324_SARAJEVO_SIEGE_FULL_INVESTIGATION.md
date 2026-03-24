# Sarajevo Siege Collapse — Full Investigation Report

**Date:** 2026-03-24
**Severity:** P0 (multiple compounding system failures, historically defining event non-functional)
**Baseline:** n1044 (92.6% area-weighted — meaningless for this bug)
**Regression point:** n1035→n1036 (offensive paramilitaries triggered the visible drop, but problems predate it)

---

## Executive Summary

The Sarajevo siege — the defining event of the Bosnian War — is completely non-functional in the simulation. Six compounding bugs interact to produce a situation where:

- **VRS SRK** has zero brigades in the siege-ring sector and zero combat activity for 35 of 40 weeks
- **ARBiH 1st Corps** has 25 of 35 brigades combat ineffective (< 400 personnel)
- **Zero RBiH mobilization occurs** for all 40 weeks due to a personnel cap
- **No intelligence mechanism exists** to detect or exploit the undefended sector
- **Calibration % is completely blind** to all of this

---

## Bug Inventory

### BUG-1: SRK Brigade Drift (VRS side)

Three SRK brigades (3rd Sarajevo Infantry, 4th Sarajevo Light Infantry, Igman Brigade) physically located at Gorazde OSIDs (~80km south of Sarajevo). They fought at Vogosca w3-w5, then drifted south — likely via attack-through or column march. No recall mechanism exists.

**Result:** Siege-ring sector (sector:vrs_sarajevo_romanija:0) has 14 front edges, zero brigades, zero density. The siege ring is unmanned.

### BUG-2: ARBIH_PERSONNEL_CAP = 95,000 Blocks ALL Mobilization

`ongoing_mobilization.ts:133` — When total active RBiH personnel >= 95k, ALL RBiH mobilization is skipped. ARBiH starts at 40,204 but grows past 95k through initial spawning/pool draws in early weeks. Once crossed, pools **never refill** for the rest of the game.

**Evidence:** Zero RBiH mobilization in weekly reports for all 40 weeks. Sarajevo pools drain to zero and never recover.

**Decision:** Cap needs to be removed or raised significantly. ARBiH historically peaked at 200-250k. The EXHAUSTION_HARD_CAP (50% of military-age males) already provides a natural ceiling per-municipality. The global cap is redundant and destructive.

### BUG-3: Novo Sarajevo (33,479 Bosniaks) Has Zero RBiH Brigades

The OOB assigns no brigade with `home_mun: novo_sarajevo`. The RBiH pool for Novo Sarajevo has 482 available manpower with zero committed — manpower stranded with nobody to draw it.

This is the 4th largest Bosniak population center in the Sarajevo pocket.

### BUG-4: Municipality Pool Distribution Skew

| Municipality | Bosniaks | RBiH Brigades | Pool Committed |
|---|---|---|---|
| Novi Grad Sarajevo | 68,405 | 3 | 1,884 |
| Centar Sarajevo | 39,761 | 6 | 8,083 |
| Stari Grad Sarajevo | 39,325 | 5 | 2,348 |
| **Novo Sarajevo** | **33,479** | **0** | **0** |
| Ilidza | 28,421 | 1 | 147 |
| Hadzici | 15,392 | 5 | 3,214 |
| Vogosca | 12,499 | 0 | 0 |

Centar (6 brigades) drains 4x the pool of Stari Grad (5 brigades) despite equal Bosniak populations. Novi Grad — the largest Bosniak population — has only 3 brigades.

### BUG-5: RBiH Pool Scale = 0.08 (RS = 0.25, HRHB = 1.05)

`pool_population.ts:61` — RBiH pools start at 8% of eligible population. For Stari Grad (39k Bosniaks): ~881 initial pool for 5 brigades at 500 personnel each (= 2,500 needed). The pool is exhausted before brigades even reach half strength.

### BUG-6: No Intelligence / Opportunity Detection for Undefended Sectors

The bot AI does not detect undefended enemy sectors. There is no OPSEC mechanism where a corps reports "enemy sector is empty" to Army HQ, and no Army HQ override that orders an opportunistic operation against an undefended sector.

- RBiH 1st Corps doctrine is `defensive` for w0-15, blocking all operations
- After w15 (balanced), 25/35 brigades are combat ineffective — the corps likely fails `MIN_BRIGADES_FOR_SECTOR_ATTACK`
- Even with 4 capable brigades (105th at 2,389, 124th at 1,304, 101st at 573, Kralj Tvrtko at 541) facing the empty sector, no operation is launched
- Army HQ produces zero overrides for RBiH in the entire 40-week run
- **The AI literally cannot see that the siege ring is empty**

---

## Cascade Diagram

```
BUG-5 (pool scale 0.08) → tiny pools
BUG-2 (95k cap) → pools never refill
BUG-3 (Novo Sarajevo empty) → 33k Bosniaks contribute nothing
BUG-4 (mun skew) → some pools drain 4x faster than others
     ↓
25/35 brigades hit dissolution floor → combat ineffective
     ↓
BUG-6 (no OPSEC) → nobody detects the undefended sector
     ↓
BUG-1 (SRK drift) → siege ring empty, but RBiH can't exploit it
     ↓
Sarajevo siege is non-functional for 35 of 40 weeks
     ↓
Calibration says 92.6% ← both painted and sim agree Sarajevo is RBiH
```

---

## Regression Analysis

| Run | 1st Corps Total | Ineffective | Change |
|-----|----------------|-------------|--------|
| n1019 | 21,280 | 19 | Baseline |
| n1030 | 24,134 | 18 | Pre-paramilitary |
| n1035 | 26,786 | 17 | Last good run |
| **n1036** | **15,698** | **25** | **Offensive paramilitaries land** |
| n1044 | 15,692 | 25 | Current |

The offensive paramilitaries (v0.6.5) caused:
- +2,522 additional casualties on 1st Corps defenders (+8 extra battles)
- -2,489 fewer troops drawn from pools (brigades hit floor faster, stop drawing)
- Net -11,088 personnel in one run

**But the underlying problems predate v0.6.5.** Even at n1019 (pre-paramilitaries), 19/35 brigades were combat ineffective. The paramilitaries pushed a fragile system over the edge.

---

## Historical Reality Check

- ARBiH 1st Corps Sarajevo: **~20,000-30,000 combat troops** throughout the siege
- SRK: **~13,000 troops** maintaining the siege ring continuously 1992-1995
- The siege lasted **1,425 days** — the longest siege of a capital city in modern warfare
- Sporadic RBiH breakout attempts (Operation Tekbir, tunnel construction) occurred throughout
- The SRK maintained positions **at all times** — there was never a period where the siege ring was unmanned

The simulation has: 1st Corps at ~7,600 effective personnel (4 brigades), SRK siege ring unmanned after w5, zero combat in either direction for 35 weeks.

---

## Fixes Applied (2026-03-24 day shift)

All fixes applied sequentially, one calibration run each:

| # | Fix | Result |
|---|-----|--------|
| 1 | Remove ARBIH_PERSONNEL_CAP (95k) | Uncapped — marginal effect alone |
| 2 | OOB rebalance (4 brigades per BB sources) | Novo Sarajevo + Vogosca covered |
| 3 | SRK drift recall (home-distance guard + return march protection + pipeline step) | 0 at Gorazde, siege ring manned |
| 4 | Siege-corps target restriction | SRK ops restricted to siege zone |
| 5 | Pool scale 0.08→0.15 | Initial pools adequate |
| 6 | Mobilization scale 0.02→0.10 | ~15/turn/mun (was ~3) |
| 7 | Initial personnel 500→800 (15 Sarajevo core brigades) | 10 brigades at 800+ |
| 8 | Shared Sarajevo pocket pool | Brigades draw from any pocket mun pool |

**Final: n1057, 92.1%. 1st Corps 22,140 pers / avg 633 / 20/35 ineffective (was 15,692 / 448 / 25/35).**

### Remaining after siege fixes
- 20/35 ineffective — structural: total pocket mobilization (~90/turn) < attrition (~210/turn).

### Emergent brigade formation (later same session)
Replaced time-gated spawning with pool-gated emergent formation. 56 gated brigades now require pool surplus + existing brigades at 60% capacity. Results (n1065): RBiH 98 brigades avg 1,382 (was 120 avg 1,050). 25 ineffective (was 36). 1st Corps 29,476 / 30 brigades / avg 983. This further addressed the "too many brigades for too small a pool" root cause by preventing deficit spawning entirely. Design: `docs/plans/2026-03-24-emergent-brigade-formation-design.md`.

### Remaining backlog
- Hrasnica/Butmir pocket needs OSID representation (v1.x).
- Bot AI opportunity detection — undefended sectors. Needs design session.
- Strategic reserve draw rate RBiH 0.02 is effectively zero — manpower graveyard.
- Beyond-OOB emergent brigades (Tuzla/Zenica/Doboj have 5k surplus, no more OOB candidates).

---

## Proposed Fix Priority (original)

| Priority | Fix | Effect |
|----------|-----|--------|
| **P0** | Remove or raise ARBIH_PERSONNEL_CAP (95k→250k or remove) | Unblocks ongoing mobilization for all RBiH municipalities |
| **P0** | Add RBiH brigades to Novo Sarajevo + rebalance Sarajevo OOB by population | 33k Bosniaks contribute to defense |
| **P1** | Investigate and fix SRK brigade drift mechanism | Siege ring stays manned |
| **P1** | Add "undefended sector" opportunity detection to bot AI | Corps/Army HQ can order ops against empty sectors regardless of doctrine stance |
| **P2** | Add siege health diagnostic to calibration tool | Catch this class of bug automatically |
| **P2** | Add brigade drift alert to weekly report | Detect when brigades are >N hops from home |
| **P3** | Review RBiH pool scale (0.08 vs RS 0.25) | Sarajevo pools too small for 35 brigades |
| **P3** | Review FACTION_INITIAL_PERSONNEL (RBiH 500 vs RS 1,200) | Brigades can't survive one battle |

---

## Files Involved

- `src/sim/combat/ongoing_mobilization.ts` — ARBIH_PERSONNEL_CAP
- `src/sim/early_war/pool_population.ts` — FACTION_POOL_SCALE
- `src/state/formation_constants.ts` — FACTION_INITIAL_PERSONNEL
- `data/source/oob_brigades.json` — brigade-to-municipality assignments
- `src/sim/combat/bot_corps_directives.ts` — operation launch gates, stance check
- `src/sim/combat/bot_strategy.ts` — doctrine phases
- `src/sim/combat/sector_offensive.ts` — evaluateCorpsOffensiveLaunch
- `src/sim/combat/corps_front_sectors.ts` — sector assignment, brigade drift
- `src/sim/turn_phases/war_phases.ts` — distribute-brigades-to-front
- `tools/compare_painted_vs_sim.cjs` — needs siege health diagnostic
