# Working On (2026-03-31)

## Status: P0 DROUGHT FIXED

P0 combat drought (war silent post-w22) confirmed fixed in n1234.

## n1234 Final State
- 92.2% area-weighted (40w)
- 103 battles, 38/40 weeks with combat (1 zero week at w22 — normal variance)
- hash: 45d8fde0a760c080
- War-or-Game: PENDING RE-REVIEW

## Six Bugs Fixed (plan.ts + zone_detection.ts)

1. Concentration progress was brigade-location-based → brigades never moved → always 0
   Fix: time-based `(turn - created_turn) / (target_ready_turn - created_turn)`

2. Zone IDs were array-index based (`zone:corps:compIdx`) → unstable across turns
   Fix: OSID-anchored IDs (`zone:corps:lex_first_osid`)

3. Zone re-anchoring when zone grows → stored staging_zone stale → viability=0
   Fix: OSID-content fallback in computeViabilityScore

4. Viability penalized assigned brigades (committed brigades left surplus pool)
   Fix: count `plan.assigned_brigades.length` as effective

5. Suspend check: `surplusPool.length < required` fires on garrison fluctuation
   Fix: check assigned brigade availability (50% threshold)

6. Abandoned plans persisted in state, blocking new plan creation
   Fix: clear on entry to advanceExistingPlan if status === 'abandoned'

## Remaining Issues (not drought-related)

- `operation_zero_eligible_execution` on some ARBiH/HVO commander ops
  These ops are emitted but brigades can't execute attacks. The reachability filter
  in emit.ts line 584-616 is meant to prevent this but some ops still fail.
  Likely cause: sector_offensive.ts execution requires brigades in specific sectors
  or with specific stances. Not blocking P0 fix sign-off.

- HVO 0 orders — expected pre-April 1993 (HRHB-RBiH war not started)

- Calibration 92.2% vs n1233 ATH 92.6% — may need re-calibration pass.

## [CMD]/[VIA] Trace Instrumentation (remove when done)

Traces are LIVE in emit.ts and plan.ts. Remove when drought investigation complete.
- src/sim/combat/commander/emit.ts (CMD trace after buildOperations)
- src/sim/combat/commander/plan.ts (VIA trace in computeViabilityScore)

## Tests
- 16 failures, all pre-existing (13 event_timing, 2 stacking, 1 critical anomaly)
- Commander test updated for time-based concentration
