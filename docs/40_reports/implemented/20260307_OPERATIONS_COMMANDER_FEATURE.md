# Operations Commander Feature

**Date:** 2026-03-07
**Run:** n265 (40w, same ATH as n264 — 84.4% area-weighted)
**Status:** Implemented, verified, calibration-neutral
**Superseded by:** [20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md](20260307_OPERATIONS_SYSTEM_COMPREHENSIVE.md) (includes this feature + faction name pools + simplify pass)

## Summary

Named officers from the reserve pool can now command operations. Brigades participating in an active operation receive their combat modifier from the **operation commander** instead of the corps commander, modeling independent chain-of-command during named operations.

## Motivation

1. **Historical accuracy:** Bosnian War operations were often commanded by officers distinct from the standing corps commander — sometimes pulled from reserve or transferred temporarily.
2. **Chain-of-command isolation:** Brigades in an active operation should answer to the operation's commander, not the corps' standing commander.
3. **Officer attributes affect operations:** A skilled/aggressive commander makes an operation more effective; a defensive specialist provides better holding power during recovery.

## Design

### Commander Selection

`selectOperationCommander()` in `officer_system.ts`:

- Candidates: reserve-status officers with rank `corps_commander`, same faction, not already commanding another operation
- Selection priority:
  1. `home_corps_id` matches the launching corps (regional match)
  2. `compatible_corps_ids` includes the corps
  3. Any reserve officer of the same faction
- Within each tier: sort by competence (desc), aggressiveness (desc), then officer ID (deterministic)

### Combat Integration

In `combat_math.ts:getThreeTierOfficerMod()`:

- If a brigade is in an executing operation with a `commander_officer_id`, the operation commander's modifier replaces the corps commander's modifier
- Formula unchanged: `0.90 + comp×0.03 + agg×0.01` (attack) / `0.90 + comp×0.03 + def×0.01` (defense)
- Only during `execution` phase — planning and recovery brigades still use corps commander

### Lifecycle

1. **Assignment:** When any operation is created (pre-planned, triggered, bot-generated, queued injection), `assignOperationCommander()` selects a reserve officer and sets `op.commander_officer_id`
2. **Active duty:** Officer state: `status: 'active'`, `assigned_operation: <op_name>`
3. **Release:** When operation enters recovery completion (cleared from `active_operation`), `releaseOperationCommander()` returns the officer to `status: 'reserve'` with `assigned_operation` cleared

### State Changes

**`CorpsOperation`** (game_state.ts):
- Added: `commander_officer_id?: string`

**`NamedOfficerState`** (officer_types.ts):
- Added: `assigned_operation?: string`

## Files Modified

| File | Change |
|------|--------|
| `src/state/game_state.ts` | Added `commander_officer_id` to `CorpsOperation` |
| `src/state/officer_types.ts` | Added `assigned_operation` to `NamedOfficerState` |
| `src/sim/combat/officer_system.ts` | Added `selectOperationCommander`, `assignOperationCommander`, `releaseOperationCommander`, `getOperationCommander`, `getOfficerCombatModWithOps` |
| `src/sim/combat/combat_math.ts` | Added operation commander check in `getThreeTierOfficerMod` (before corps commander lookup) |
| `src/sim/combat/bot_corps_ai.ts` | Wired `assignOperationCommander` at 4 creation points + `releaseOperationCommander` at 1 clearing point |
| `src/sim/combat/sector_offensive.ts` | Wired `releaseOperationCommander` at recovery clearing |
| `src/sim/combat/corps_command.ts` | Wired `releaseOperationCommander` at recovery clearing |
| `src/sim/combat/pre_planned_operations.ts` | Wired `assignOperationCommander` at 2 injection points |
| `src/sim/combat/triggered_operations.ts` | Wired `assignOperationCommander` at injection point |

## Verification

- **TypeScript:** Clean (`npx tsc --noEmit`)
- **Tests:** 351 pass, 1 skipped (35 suites)
- **40w scenario (n265):** 5 active operations with named commanders at end of run:
  - Galić → Operacija Vlašić
  - Lisica → Operacija Jahorina
  - Pandurević → Operacija Zvijezda
  - Samardžija → Operacija Majevica
  - Željaja → Operacija Lukavac
- **ATH:** 84.4% area-weighted (unchanged from n264)
- **Troop strengths:** RS 106.6k, RBiH 125.9k, HRHB 37.6k (within calibration bands)
- **Officer pool:** 30 active, 30 reserve, 3 other (killed/captured/retired)

## Calibration Impact

None. The feature changes which officer's modifier applies to operation participants but does not change the modifier formula or combat outcomes on the same deterministic seed. Operations that previously used the corps commander's modifier now use the operation commander's modifier — the effect will emerge organically across runs as different officers with different attributes are assigned.

## Canon Propagation

- Systems Manual §7.5: Added operation commander subsection
- Systems Manual §6.4: Updated CorpsOperation fields
- CONSOLIDATED_IMPLEMENTED.md: Added entry
- docs/40_reports/README.md: Added link
