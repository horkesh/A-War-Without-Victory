# Equipment Rework — Remaining Tuning (WIP)

## Completed (n899)
- Removed per-brigade auto-tickers from `faction_progression.ts` (P1 done)
- Added battlefield scavenging to `attack_resolution_osid.ts` (P1 done)
- Fixed dissolution equipment duplication bug in `brigade_dissolution.ts` (P0 done)
- Fixed civilian kill fraction ratios in `displacement_loss_constants.ts` (P0 done)

## Remaining Tuning

### ARBiH equipment slightly low (20 tanks, target 30-50)
- Scavenge rates (10-20% of destroyed) may need a small bump
- Or: ARBiH wins too few decisive victories to trigger higher scavenge rates
- Consider: adding a small JNA garrison capture bonus for early-war ARBiH (Tuzla barracks, Visoko)

### HRHB equipment too low (7 tanks from 12, target 20-40)
- HRHB historically received HV (Croatian Army) transfers — not battlefield captures
- Need a small faction-level budget: ~1-2 tanks per 12 turns, distributed to specific HVO brigades
- NOT per-brigade — a fixed pool per tick, given to the most capable formation
- Keep it in `faction_progression.ts` but as a faction-level cap, not per-brigade

### ARBiH artillery low (95, target 150-250)
- Zenica steelworks did produce improvised mortars/howitzers
- Consider: small faction-level production (2-3 pieces per 8 turns), not per-brigade
- Alternatively: tune scavenge rate for artillery higher than for tanks

### RS tanks still high (627 from 520)
- JNA handoff accounts for most of the gain (~180 tanks+APCs)
- Dissolution duplication bug fix may reduce this in longer runs
- RS should be slowly declining — check if degradation is working properly
- APC-to-tanks conflation in `jna_phantom_brigades.ts` inflates count

## Flags Status
- FLAG 1 (ARBiH tanks): FIXED — 243→20
- FLAG 2 (ARBiH arty): MOSTLY FIXED — 668→95 (needs tuning up)
- FLAG 3 (RS tanks up): PARTIALLY FIXED — dissolution bug fixed, JNA handoff is by design
- FLAG 4 (Serb fled abroad): VALID — correct behavior
- FLAG 5 (exchange ratio): NOT A BUG — historically calibrated 0.69:1
- FLAG 6 & 7 (two tracking systems): NOT YET FIXED — P1 unification needed
- FLAG 8 (kill ratios): FIXED — Bosniak 83%, Croat 8% (was 60%/28%)
