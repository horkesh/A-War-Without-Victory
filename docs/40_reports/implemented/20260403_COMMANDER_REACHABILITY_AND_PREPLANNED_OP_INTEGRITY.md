# 2026-04-03 - Commander reachability and pre-planned op integrity

## Summary

This slice fixed two different truth leaks in the operations/sector lane:

1. `Operation Foca` still referenced a phantom brigade (`jna_mostar_garrison_tg`) that predictably withdraws before queued runtime injection.
2. The commander `position_viability` override could withdraw an exposed brigade into the "safest" sector in the same corps without respecting connected-component truth.

The result was mixed engine messaging:
- queued-op validation produced one stale warning that was no longer meaningful
- late commander review could remint a sector/component mismatch after earlier truthful assignment passes had already cleaned the state

## Changes

### 1. Removed stale `Operation Foca` brigade reference

File:
- `src/sim/combat/pre_planned_operations.ts`

Change:
- removed `jna_mostar_garrison_tg` from `Operation Foca` axis `foca_valley`

Why:
- `Operation Foca` is queued behind `Operation Visegrad`
- the phantom brigade withdraws before `Foca` becomes runtime-eligible
- leaving it in the authored op definition turned a predictable lifecycle fact into a fake runtime integrity warning

### 2. Tightened commander viability withdrawals to reachable same-component sectors

File:
- `src/sim/combat/commander_override.ts`

Change:
- `applyPositionViability(...)` now selects a withdrawal target only from sectors that:
  - are in the same connected component as the brigade
  - are actually reachable through friendly adjacency

Why:
- the old code picked the globally "safest" corps sector
- that allowed a late commander override to recreate a cross-component sector assignment after the earlier sector pipeline had already been made more honest
- this was the strongest root-cause candidate for the surviving `rs_skelani_battalion -> sector:vrs_drina:1` invariant violation

### 3. Guarded player sector overrides against stale cross-component intent

File:
- `src/sim/combat/brigade_assignment.ts`

Change:
- player-driven `brigade_sector_override` now only pins a brigade when the target sector is in the same connected component as the brigade's current location
- stale overrides are ignored and logged instead of being written into sector truth

Why:
- the live player shell could carry forward old sector intent after combat retreat, relocation, or loan/recall movement
- before this fix, the override path only enforced "same corps", not "same reachable geography"
- that made persisted player intent a late-turn truth leak

### 4. Rescue pass now prefers territory-owning same-corps sectors before giving up

File:
- `src/sim/combat/brigade_assignment.ts`

Change:
- when an assigned brigade's current sector becomes unreachable, the rescue pass now first checks whether another same-corps sector already truthfully owns the brigade's current `location_osid`
- if so, the brigade is moved there before the old short-hop front-reachability fallback runs

Why:
- the old rescue path only asked "can you reach some other sector's front in 4 hops?"
- that was too narrow for deep-rear brigades already standing inside another sector's territory
- it contradicted the broader sector rule that deep-rear brigades can stay assigned truthfully and march forward later

### 5. Distinguished true reachability from the Phase 2c operational-zone cap

File:
- `src/sim/combat/brigade_assignment.ts`

Change:
- the late trap/remediation pass no longer uses `PHASE_2C_MAX_HOPS` as a binary truth check
- it now uses a much larger truthful-reachability horizon when deciding whether a brigade can still belong to its assigned sector or another same-corps sector

Why:
- `PHASE_2C_MAX_HOPS` is an operational distribution cap, not a proof that a brigade is physically unreachable
- the old trap logic treated `>4 hops from the front` as `unreachable`
- that created false unresolved churn for deep-rear brigades in long interior corridors, especially in later `vrs_1st_krajina` turns

## Tests

Added:
- `tests/commander_override_reachability.test.ts`

Updated:
- `tests/pre_planned_operations.test.ts`
- `tests/brigade_territory_reconciliation.test.ts`

What is now covered:
- queued runtime validation still warns when a real brigade is truly missing at injection time
- `Operation Foca` no longer depends on a phantom that predictably disappears before queue time
- commander viability overrides never move an exposed brigade into a different connected component
- stale player sector overrides are ignored when geography has drifted into another component
- unreachable brigades are rescued into territory-owning same-corps sectors before being marked unresolved
- deep-rear brigades are not dropped just because they sit beyond the short Phase 2c hop cap

## Verification

Focused tests:
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\commander_override_reachability.test.ts tests\\pre_planned_operations.test.ts tests\\scenario_activity_truth.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\brigade_territory_reconciliation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`

Scenario run:
- `node .\\node_modules\\tsx\\dist\\cli.mjs tools\\scenario_runner\\run_scenario.ts --scenario data\\scenarios\\apr1992_definitive_40w.json --unique --map --out runs`
- Output: `runs/apr1992_definitive_40w__d452d2a10f3d69af__w40_n1300`
- Final hash: `d5fe7dbb0d98b360`

Follow-up scenario run after the deeper trap fix:
- `runs/apr1992_definitive_40w__d452d2a10f3d69af__w40_n1302`
- Final hash: `b795ae4ac0150e82`

## Outcome

The specific surviving reachability invariant around `rs_skelani_battalion` no longer appears in the fresh `n1300` run, which strongly supports the commander-override diagnosis.

The deeper trap fix also materially reduced late-turn sector churn in the fresh `n1302` run:
- the recurring `vrs_1st_krajina` unresolved spiral disappeared from console output
- `hvo_nikola_subic_zrinski_brigade` no longer repeated the old "assigned sector became unreachable" churn
- the remaining big unresolved cluster is now narrower and more informative:
  - `hrhb_travnik_brigade`
  - loaned reserve brigades with no truthful receiving sector
  - a smaller ARBiH mountain/reconcentration set

The sector lane is still not "finished":
- multiple brigades still become honestly unresolved later in the run
- the next serious targets are sectors that become unreachable over time in:
  - `vrs_1st_krajina`
  - `hvo_central_bosnia`
  - loaned army-reserve brigades that still cannot find a truthful receiving sector

But this slice removed one fake queued-op warning and one real late-stage truth leak instead of papering over either of them.
