# Donji Vakuf Launch Feasibility

**Date:** 2026-05-22
**Run IDs:** `n1940`, `n1941`
**Baseline:** `n1938` headless decision bridge
**Result:** Donji Vakuf 95 now reaches contact and attempts one attack; outcome tuning remains deferred.

## Summary

- Repaired the headless scenario control boundary so bot brigade orders include the scenario-runner player faction only in non-interactive proof mode.
- Moved Donji Vakuf 95 from catalog-present/no-launch evidence to a contacted operation by aligning its corps owner, opening objective, staging edge, and brigade roster with the live operational graph.
- Preserved evidence-first scope: no combat math, scenario data, OOB source rows, painted targets, save schema, or outcome tuning changed.

## Changes Made

### Headless Scenario Control

- Added `StateMeta.headless_scenario_auto_control` and set it from the scenario runner.
- Added `selectBotBrigadeOrderFactions(...)` so scenario proof runs include every faction in bot brigade orders while desktop/player-faction runs still exclude the human-controlled faction.

### Donji Vakuf Launch Geometry

- Hosted `donji_vakuf_95` on the live `arbih_3rd_corps` owner because the current source OOB keeps the authored Bugojno/Komar brigade pool there.
- Changed the opening axis to the live `op:travnik:turbe_2 -> op:donji_vakuf:komar_2` contact edge.
- Replaced the two no-contact Bugojno axes with one Komar line covering all ten Donji Vakuf objectives.
- Updated the roster to the documented Vlasic/Komar set: `arbih_17th_vitezka_mountain`, `arbih_705th_slavna_mountain`, `arbih_706th_muslim_mountain`, `arbih_707th_slavna_mountain`, and `arbih_727th_slavna`.

## Scenario Results

### n1940 Half-Fix

- Final hash: `6fe12863dac169da`.
- Donji Vakuf no longer had reachability warnings, but still exited `did_not_launch` with `zero_eligible_axis`.
- Diagnosis: geometry was valid, but the authored participants were not physically staged on a Komar approach OSID.

### n1941 Accepted Proof

- Final hash: `8d882f12f3c27d3e`.
- Opportunity proof: `donji_vakuf_95` surfaced/executed at turn 177, response `approve`, exit class `failed`, AAR outcome `failure`, attacks `1`, captures `0/10`, axis predicate `UNDERDELIV:1`, blocker `aar:max_failures`.
- Delivery audit: `Operation Donji Vakuf 95` now classifies as `STALEMATE`, not `NO-CONTACT-OP`.
- Reachability warnings: `0`.
- Painted `oct1995` area-weighted match remains 71.6%; all ten Donji Vakuf target OSIDs remain RS in the final controller map.
- Baseline manifest refreshed for the intentional headless proof-mode output drift; the follow-up baseline regression passes.

## Lessons Learned

- The catalog definition order and roster must be checked against the live OSID contact graph and live formation locations, not only historical prose.
- Opening launch feasibility is now separated from under-delivery. Further Donji Vakuf work should inspect combat prediction and max-failure dynamics, not revisit catalog presence or launch reachability.

## Files Changed

| File | Change |
|---|---|
| `src/scenario/scenario_runner.ts` | Marks non-interactive scenario runs as auto-controlled. |
| `src/state/game_state.ts` | Adds optional headless scenario auto-control metadata. |
| `src/sim/turn_phases/war_phases.ts` | Adds deterministic bot-order faction selector. |
| `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` | Rehosts Donji Vakuf on live 3rd Corps owner and corrects Komar opening axis/roster. |
| `tests/operation_opportunities_phase2_decisions.test.ts` | Covers headless player-faction inclusion boundary. |
| `tests/operation_opportunities_central_bosnia_catalog.test.ts` | Covers 3rd Corps owner, live Komar contact edge, and source-OOB roster. |
| `data/derived/scenario/baselines/manifest.json` | Refreshes the accepted baseline hashes after headless proof-mode behavior changed. |

## Next Steps

- Keep W3 casualty-trajectory schema deferred until accepted-operation under-delivery is understood.
- Diagnose why Donji Vakuf's first attack stalls at `max_failures` despite contact and high AAR force-ratio estimate.
- Revisit Sana separately: broad headless auto-control changes the late-war trajectory so Sana is now blocked upstream by `enemy_weakness` and `commander_confidence` in n1941.
