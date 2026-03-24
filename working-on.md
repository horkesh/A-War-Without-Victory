# Working On: v0.7.0 — Event Flag Wiring (Phase 4 next)

## Context
v0.6.5 COMPLETE (offensive paramilitary sweep). v0.7.0 Phase 1+2 COMPLETE.

## What's Done
- Phase 1: `enclave_supply_status` + `corridor_severed` evaluators implemented
- Phase 2: 21 flag gates wired to downstream events
- Phase 3 (partial): 3 pressure modifiers wired

## What's Next
- **P1 FIX NEEDED**: MAX_EVENTS_PER_TURN=3 crowds out jna_withdrawal. Increase to 4 or add priority. This unblocks jna_withdrawn flag gates.
- Phase 4: Engine flag reads — one change per calibration run:
  1. `supply_reserves.ts` — arms_embargo_active throttles RBiH patron aid (0.6x)
  2. `supply_reserves.ts` — corridor_secured boosts RS patron aid (1.3x)
  3. `patron_pressure.ts` — drina_cleansing_occurred +2/turn RS pressure
  4. `patron_pressure.ts` — camps_revealed +3/turn RS pressure
  5. `attack_resolution_osid.ts` — coha_active suppresses combat
  6. `bot_corps_ai.ts` — coha_active forces defensive
  7. `turn_pipeline.ts` — dayton_signed stops war phases
- Phase 5: FIXED→CONDITIONAL conversions (Srebrenica, Markale, Zepa, endgame chain)
- Phase 6: Cleanup

## Key Issues
- corridor_severed evaluator needs edges data path (`(state as any).derived?.edges` may not exist at runtime)
- Gorazde periphery over-capture (3 OSIDs) — consider removing gorazde from offensive para scope

## Plan
`docs/plans/2026-03-23-event-flag-wiring-plan.md`
