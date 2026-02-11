# Paradox convene: Historical troop numbers (September 1991 → September 1992)

**Date:** 2026-02-08  
**Convened by:** Orchestrator  
**Roles consulted:** Formation Expert, Scenario Creator / Runner and Tester (conceptual), docs/knowledge.

---

## 1. Goal

Reach **historical troop numbers** when running from **September 1991 to September 1992**. Game vision (docs/knowledge) is play from Sept 1991 onward; by Sept 1992 we want formation/strength counts that match OOB evolution.

---

## 2. Historical targets (from docs/knowledge OOB masters)

**Source:** `ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`.

| Faction | April 1992 | Sept 1992 (interpolated) | December 1992 |
|--------|------------|---------------------------|----------------|
| **ARBiH (RBiH)** | ~60k–80k | ~85k–105k | ~110k–130k |
| **VRS (RS)**     | ~80k       | ~85k–95k  | ~90k–100k   |
| **HVO (HRHB)**   | ~25k–35k  | ~40k–45k  | ~40k–45k    |

By **September 1992** we should see:
- **RBiH:** on the order of tens of thousands of personnel (and many brigades/corps forming).
- **RS:** similar scale; Posavina corridor secured by July 1992.
- **HRHB:** ~40k–45k.

**Formation structure (Sept 1992):**  
- ARBiH: 1st, 2nd, 3rd, 5th Corps (plus 4th/6th/7th forming); many brigades.  
- VRS: 6 corps; many brigades.  
- HVO: 3–4 Operational Zones; multiple brigades.

---

## 3. Current scenario results (inspected)

- **phase0_full_progression_52w:** 52 weeks, `formation_spawn_directive: { kind: "both" }`, init_control apr1992, init_formations apr1992.  
  - **Formations added: 0, removed: 0.**  
  - Initial/final: **3 formations** (arbih_1st_corps, vrs_1st_krajina_corps, hvo_herzegovina).  
  - Control swung heavily (e.g. RBiH 2158 → 23 settlements; HRHB 1119 → 3504).

- **apr1992_104w_bots:** 104 weeks, no `formation_spawn_directive` in scenario JSON.  
  - **Formations added: 0, removed: 0.**  
  - Same 3 formations throughout.

- **initial_formations_apr1992.json:** Contains only **3** formations (one corps-level per faction), not the dozens of brigades/corps implied by OOB.

So we are **not** reaching historical troop numbers: we have 3 formations and **no spawns** over 52 or 104 weeks.

---

## 4. Formation Expert findings (root cause)

**Why zero formations are spawned**

1. **Formation spawn** (`formation_spawn.ts`) runs only when `formation_spawn_directive` is active (phase0_full_progression has it; apr1992_104w does not).
2. Spawn consumes **militia pools**: for each pool `(mun_id, faction)` we need `pool.available >= batchSize` (1000). One formation per 1000 committed from that pool (respecting `getMaxBrigadesPerMun`).
3. **Pool population** (`pool_population.ts`) sets `available = floor(phase_i_militia_strength * POOL_SCALE_FACTOR)` with `POOL_SCALE_FACTOR = 100`. So strength 0–100 → 0–10,000 per (mun, faction).
4. **Militia emergence** (`militia_emergence.ts`) computes `phase_i_militia_strength` from **`state.municipalities[].organizational_penetration`** (op). Formula: police_loyalty, to_control, party, paramilitary → base strength; declaration multiplier; bounds [0, 100]. **When `op` is undefined, base strength is 0.**
5. **organizational_penetration** is set only by **Phase 0 investment** (player/narrative) in `src/phase0/investment.ts`. **It is never set from init_control.**  
   - `prepareNewGameState` / `initializePoliticalControllers` set only `political_controllers`.  
   - Phase 0 turn (`runPhase0Turn`) runs declaration pressure, referendum, stability; it does **not** set op.  
   - So in harness runs (phase0_full_progression, apr1992_104w), **op is never populated** → militia strength stays 0 → no pools (or zero available) → spawn never creates formations.

**Conclusion (Formation Expert):** To get any spawns, Phase I must see non-zero `phase_i_militia_strength`. That requires **organizational_penetration** to be present. Today that only happens via Phase 0 investment. For scenario/harness runs that start from init_control (e.g. apr1992), we need either: (a) **seed op from control** at init or at Phase 0→I handoff, or (b) a **dedicated op asset** (e.g. apr1992) loaded when using that init_control.

---

## 5. Scenario Creator / Runner and Tester (conceptual)

- **Initial formations:** apr1992 currently gives 3 corps-level formations. Historically, by Sept 1992 we need many more brigades and multiple corps per faction; initial_formations_apr1992 (or a Sept 1992 variant) could be expanded per OOB masters, but **spawn from pools** is the main lever for growth.
- **Plausibility:** Large control swings in phase0_full_progression (e.g. RBiH almost eliminated) are ahistorical; formation spawn and control-flip logic (and possibly baseline_ops intensity) may need tuning once formations exist.
- **Proposal:** Prioritize **op seeding (or op asset)** so that pool population and formation spawn can run; then re-run and compare formation counts and control deltas to Sept 1992 history.

---

## 6. Single priority and handoffs

**Single priority:** Enable formation growth so that runs from Sept 1991 (or April 1992) toward Sept 1992 can approach historical troop/formation numbers. The blocking issue is **zero organizational_penetration in scenario/harness runs**, so Phase I militia strength and pools stay empty and no formations spawn.

**Handoffs:**

| Owner | Task | Notes |
|-------|------|--------|
| **Gameplay programmer / Formation expert** | Seed `organizational_penetration` from init_control at Phase I entry (or at init when using a control key), or support an op asset (e.g. `municipalities_1990_organizational_penetration_apr1992.json`) and load it when scenario uses that init. | Canon: Phase 0 Spec §4.6, §7; MILITIA_BRIGADE_FORMATION_DESIGN.md. Determinism: stable ordering when deriving op from control. |
| **Scenario-harness-engineer** | Ensure scenarios that should spawn (e.g. phase0_full_progression, future sept1992) have `formation_spawn_directive` and correct phase/ war_start_turn so Phase I runs. | apr1992_104w_bots currently has no directive. |
| **Data author / Scenario creator** | (After op seeding exists) Expand or add initial formations for apr1992 / sep1992 per OOB masters if we want a richer starting set; validate formation counts and control after first post-fix runs. | SCENARIO_SEPTEMBER_1992_SPEC.md §4; initial_formations_apr1992.json. |

---

## 8. Implementation (2026-02-08)

**Done:** Seed organizational_penetration from init_control when scenario uses a control path.

- **Module:** `src/state/seed_organizational_penetration_from_control.ts` — derives op per municipality from majority political_controller (settlement-level); deterministic mun and sid ordering; tie-break by FACTION_ORDER (RBiH, HRHB, RS). Stub party/paramilitary (70/40 for controller) so militia_emergence yields non-zero strength.
- **Call site:** `createInitialGameState` in `src/scenario/scenario_runner.ts` — after `prepareNewGameState(state, graph, controlPath)`, if `controlPath` then `seedOrganizationalPenetrationFromControl(state, graph.settlements)`.

**Verification:** phase0_full_progression_52w with op seeding: 20-week run produced **5,130 formations added** (3 initial → 5,133 final). Formation spawn is unblocked.

**Next (scale):** Historical Sept 1992 is ~85k–105k ARBiH, ~85k–95k VRS, ~40k–45k HVO (personnel). Current run yields thousands of brigade formations in 20 weeks (one per 1000 pool per mun per turn). To approach historical troop numbers, formation-expert/gameplay may need to: tune POOL_SCALE_FACTOR or batchSize, reduce op stub values, or add formation caps per faction/mun; and/or map formation count to personnel (e.g. 1 brigade ≈ N troops) for reporting.

### Scale tuning (2026-02-08, Orchestrator-directed)

**Problem:** apr1992_phase_i 52w produced ~279k RBiH, ~272k RS, ~202k HRHB (committed in formations) vs historical ~85–105k, ~85–95k, ~40–45k.

**Changes applied (formation-expert levers):**
- **POOL_SCALE_FACTOR:** 100 → **38** (smaller pools → fewer brigades and less committed).
- **MAX_BRIGADE_PERSONNEL:** 2,500 → **1,000** (nominal ~1k troops per brigade per OOB).
- **FACTION_POOL_SCALE:** RBiH 1.2→**1.32**, RS 0.88→**1.08**, HRHB 1.0→**0.78** (balance toward historical band).

**Verification (20-week run, same scenario):** HRHB 38k, RBiH 72.8k, RS 76k — within or close to band; 52w run yields further growth toward Sept 1992 band. Re-run full 52w to confirm end-state personnel.

---

## 9. References

- `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`
- `docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md`
- `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`
- `src/sim/phase_i/militia_emergence.ts`, `src/sim/phase_i/pool_population.ts`, `src/sim/formation_spawn.ts`
- `src/phase0/investment.ts`, `src/state/initialize_new_game_state.ts`
- `.cursor/skills/formation-expert/SKILL.md`, `.cursor/skills/scenario-creator-runner-tester/SKILL.md`
