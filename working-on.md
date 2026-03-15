# Working On — Task Continuity

## Current Task: Gradačac/Brčko ARBiH OOB + Spawn Investigation

### What we're doing
Buffing ARBiH Gradačac/Brčko brigades to survive VRS early blitz. Found that 43/81 mandatory ARBiH brigades don't spawn — likely batchSize/pool capacity issue in formation_spawn.ts.

### Key finding
The 217th Vitežka (homed at gradacac_2) doesn't spawn despite mandatory=true, available_from=0. The spawn mechanism requires pool.available >= batchSize. Buffing the 213th from 550→1200 may consume the Gradačac pool, preventing the 217th from spawning.

### Files being modified
- `data/source/oob_brigades.json` — Gradačac/Brčko brigade buffs (213th 1200, 217th 1000, 215th 1000, 212th 800, 107th 800)
- `src/sim/combat/bot_strategy.ts` — added brcko to 2nd Corps targets
- `docs/life_lessons.md` — new lesson on home brigade initial strength

### Current run state
- n785: 90.6% area, 13/13 anchors, 4/6 benchmarks (two marginal fails)
- Bijela_2 RBiH (good!), Gradačac_2 RS (bad — 217th doesn't spawn)
- 43 mandatory ARBiH brigades don't spawn — fundamental OOB loading issue

### Next 3 steps
1. Investigate formation_spawn.ts spawn mechanism — understand batchSize vs initial_personnel for mandatory brigades
2. Fix: mandatory brigades should spawn regardless of pool capacity (they represent existing forces, not new recruitment)
3. Re-run with fixed spawn + moderate buffs, verify Gradačac holds and benchmarks pass

### Related issues
- REAL_WAR_MASTER #42 (bot strategic targeting), #44 (ARBiH probing), #46 (SRK OOB)
- Life lesson: "Home brigades must be strong enough to survive the initial blitz"
- 712th at Travnik orphaned — sector territory gap at krusevo_brdo_i
