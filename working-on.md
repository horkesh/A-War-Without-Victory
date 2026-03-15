# Working On — Task Continuity

## Current Task: Recalibration After Mandatory Spawn Fix

### What happened
Found and fixed a fundamental OOB loading bug: 64/182 mandatory brigades silently failed to spawn because militia pools didn't exist at game start. The recruitment engine's mandatory path checked pool.available and skipped brigades when the pool was empty/missing. Fix: force-create pool and seed with enough manpower for mandatory brigades.

### Impact
- ARBiH: 38 → 122 brigades (43 restored)
- RS: 56 → 78 brigades (21 restored, including SRK expansion)
- HRHB: 20 → 26 brigades (4 restored)
- The entire sim was calibrated for ~38 ARBiH brigades. All constants need review.

### Current state (n786)
- 90.5% area, 12/13 anchors (Teočak fails), 4/6 benchmarks
- Gradačac holds (RBiH), Bijela holds (RBiH), Žepče holds (HRHB)
- RS delta -34 (too weak now — RBiH too strong with 122 brigades)

### What needs recalibration
1. **FACTION_POOL_SCALE** — RBiH 0.25 was set when only 38 brigades existed. With 122, manpower may be over-allocated.
2. **Mobilization rates** — RS=0.12, RBiH=0.10, HRHB=0.29. May need adjustment.
3. **Benchmarks** — `preserve_survival_corridors` (RBiH w40) and `consolidate_gains` (RS w40) thresholds set for old OOB.
4. **RS_JNA_INHERITANCE_BONUS** — 10k may need increase to compensate for RS also gaining 21 brigades.
5. **Doctrine phases** — RS blitz intensity may need adjustment since defenders are now stronger.

### Key files
- `src/sim/recruitment_engine.ts` — the spawn fix (force-create pool)
- `src/sim/early_war/pool_population.ts` — FACTION_POOL_SCALE, RS_JNA_INHERITANCE_BONUS
- `src/sim/combat/ongoing_mobilization.ts` — mobilization rates
- `data/source/oob_brigades.json` — OOB entries (Gradačac buffs, SRK, Drina)

### Session achievements (2026-03-15)
- Intelligent Corps Commander Phases A-E
- Drina OOB: +Rogatica, +Višegrad, Čajniče fix
- SRK: 9 brigades on siege ring
- Cross-corps enclave defense + guard
- Elite cohesion recall + tracker + catastrophic stall
- Salient aversion, return-to-corps march
- Brčko in 2nd Corps targets
- **Mandatory spawn fix (biggest single fix)**
- ~30 calibration runs (n748-n786)
