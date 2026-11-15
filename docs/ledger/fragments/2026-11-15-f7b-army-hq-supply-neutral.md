## 2026-11-15 — F7b: Army HQ supply status is neutral when the reserve model is off (slot 4, after F7; measurement pending)

- **Defect** (found while building F7; classed MUST-FIX by the orchestrator).
  - `computeSupplyStatus` (`src/sim/combat/army_hq_gathering.ts`) read `general_supply_reserve?.[faction] ?? 0`. With supply reserves off (the shipping campaign) every faction was `critical` at every Army HQ gathering.
  - In `generateDoctrineOverride` an army that was gaining territory could therefore never take `general_offensive`, and an army that was losing always went `general_defensive` (aggression −0.15). `evaluateArmyHQGathering` runs every turn for every bot faction, so this shaped army doctrine all war.
- **Fix.** With `meta.supply_reserves_enabled` off, the status is the neutral `adequate`. This matches combat's neutral default when no reserve level exists (`combat_math.ts`, `frontline_attrition.ts` read a missing level as 100). With reserves on, nothing changes.
- **Trace (inert, committed first).** A new `army_doctrine` debug topic writes one stdout line per gathering: turn, faction, trigger, supply/manpower/territory inputs, army stance, aggression modifier, previous stance and whether it changed.
  - It is default-off and never writes GameState or reports.
  - The assessment is not saved, so the measured run reads the effect from this trace (stance changes per faction, before and after) instead of inferring it.
- **Tests** (all 49 Army HQ, campaign-plan and debug-topic files pass, 1,297 tests; tsc clean).
  - `tests/army_hq_gathering.test.ts`: the existing supply-status test now turns the reserve model on. Reserves off gives `adequate` whatever the field holds. A gaining RS army at t40 with reserves off now plans `general_offensive`; before the fix it held at `balanced`.
  - `tests/army_doctrine_trace.test.ts`: silent by default; one prefixed key-sorted line when requested; a failing sink cannot throw.
  - `army_doctrine` was added to `tests/reason_code_debug.test.ts`.
- **Measurement.** On "slot 4 go", after F7 merges, run three things:
  - the trace commit alone with `AWWV_DEBUG_REASON_CODES=army_doctrine` (the "before"; it must equal main's hash, proving the trace inert);
  - one measured 188-week run of the fix with the same topic (the "after");
  - then the per-faction stance-change counts, the per-cell delta and the guards.
