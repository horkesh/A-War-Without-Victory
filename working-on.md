# Working On — Session 2026-03-29 (Session 2) — INCOMPLETE

## Completed This Session
1. Visegrad Brigade OOB fix (vrs_herzegovina → vrs_drina)
2. Sarajevo siege SID/OSID mismatch fix
3. JNA ghost brigades for Op Prsten + Op Foca (topology-fixed)
4. Sector reassignment order fix (dead code activated)
5. MIN_SECTOR_BRIGADES=2 (small corps sector merge)
6. Concurrent corps ops implementation plan (15 tasks, expert-reviewed)

## Reverted (failed approaches)
- Brigade drift home recall (FAR_FROM_HOME_LINE_THRESHOLD=5) — caused general retreat
- 2nd Herzegovina home_mun → konjic — home in enemy territory
- Op Prijedor JNA ghosts — cascaded through 1KK op chain

## Current Calibration
n1210: 87.7% area-weighted (was 92.1% at n1205). Gap from siege fix + Visegrad fix removing artificial inflation.

## Next Session Priorities
1. **P0: Concurrent corps operations** — implement plan at docs/plans/2026-03-29-concurrent-corps-operations.md. This is the structural fix for 1KK Jajce failure and the 1-op-per-corps bottleneck.
2. **P1: Ilijas early-war seizure event** — 4 OSIDs are RBiH from census. Need event to model VRS seizure of Ilijas in April 1992.
3. **P1: Derventa anchor recovery** — derventa_2 is HRHB. Tied to 1KK op chain timing. Concurrent ops should help.
4. **P2: Herzegovina structural gap** — 8 brigades, 81 edges. Need investigation of why ops pull brigades to Foca.
5. **P2: rs_kalinovik_brigade home_osid** — currently op:foca:zavait_3 (Foca), should be in Kalinovik municipality.
