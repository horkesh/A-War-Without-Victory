# gradacac_2 P0 Investigation — Resolved (No Code Changes)

**Date:** 2026-04-05
**Run:** n1323 (current HEAD)
**Status:** RESOLVED — already fixed by prior work

## Summary

Investigated the gradacac_2 P0 calibration problem. Finding: **already resolved.** gradacac_2 has been stable at RBiH control for all 40 weeks since n1289 (combat factor overhaul). Zero control flips, zero RS operations targeting the area. The P0 can be closed.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Scenario Runner | n1323 local truth verification | gradacac_2 = RBiH at w40, anchor PASS, zero flips in control_delta, zero RS operations targeting Gradačac. Stable. |
| Orchestrator | History trace, resolution decision | Traced failure window (n1280-n1288) and recovery (n1289 combat factor overhaul). |

## History

| Run | gradacac_2 | Cause |
|---|---|---|
| n1256 (ATH baseline) | PASS (23/23) | Pre-sector-overhaul |
| n1280-n1288 | **FAIL** | Sector overhaul exposed new RS fronts → RS overcapturing around Gradačac |
| n1289 | **RECOVERED** (25/25) | Combat factor overhaul: defensive fire (P1), urban terrain, graduated morale, forest highland, war exhaustion tempo, SRK entrenchment, Lanchester concentration |
| n1302 | PASS (25/25) | Stable |
| n1315-n1323 | PASS (27/27) | Stable through all subsequent fixes |

## Root Cause (already resolved)

The n1280-n1288 failure was caused by the sector system overhaul correctly assigning RS brigades to previously-uncovered fronts around Gradačac. With RS brigades now covering these fronts, they overcaptured because the combat model didn't yet account for defender advantages (artillery, terrain, entrenchment).

The n1289 combat factor overhaul resolved this by introducing:
- **Defensive fire (P1)**: RS artillery now punishes attackers on defense (MAX 1.8×)
- **Urban terrain**: Gradačac town center gets urban defense bonus
- **Graduated morale**: Defending units with high morale resist costly_victory downgrades
- These factors together meant RS could no longer cheaply overrun well-defended positions

Since n1289, gradacac_2 has been stable at RBiH control with zero flips across 30+ runs.

## Completion Block

- **Canonical owner:** N/A — no code change needed
- **Demoted path:** None — P0 closed
- **Player-visible truth:** gradacac_2 is RBiH-held through w40. Historically accurate.
- **Canonical UI surface:** No UI change
- **Done means:** P0 tracking item closed. gradacac_2 stable since n1289. No action needed.

## Recommended Next Lane

1. **v0.8.1 Commander Maturity gate check**: Full two-tier post-run panel go/no-go on commander system. n1323 (94.0%, 27/27, 6/6, 74 battles, ZEA 6.7%) is a strong gate candidate.
2. **DRINA ~1.5pp regression investigation**: RS overcapturing in eastern Bosnia. Pre-existing P1.
3. **Commander personality tuning**: Sarajevo breakout attempt + East Bosnian staging. Design lane.
