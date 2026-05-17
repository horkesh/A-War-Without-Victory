# Catastrophic Attack Stall Guard

**Date:** 2026-05-18
**Result:** Implemented

## Summary
- Added an execution-phase guard for active operation axes with recent same-corps, same-faction catastrophic attacker memory at the current objective.
- The guard stalls the axis before brigade-order generation only when current direct predictions remain catastrophic below the low-ratio floor.
- Preserved the existing desperate-attack allowance: the first catastrophic attack records memory; only later low-ratio repeats against that objective are blocked.

## Changes Made
### Sector-Offensive Execution Gate
- `src/sim/combat/sector_offensive.ts` now checks active multi-axis objectives during execution before order emission.
- If all axes become terminal after the guard, the operation enters normal recovery.

### Deterministic Objective Memory
- `src/sim/combat/sector_offensive_launch_helpers.ts` adds same-corps, same-faction objective memory from sorted formation histories.
- Memory uses prior-turn catastrophic attacker engagements within a four-turn window and does not depend on wall-clock time, randomness, or unsorted object traversal.
- The power-ratio floor is faction-neutral and objective-neutral.

### Diagnostics And Tests
- `OperationAxis.launch_blocker` and `AxisAAR.launch_blocker` now carry `recent_catastrophic_losses_at_objective`.
- `tests/catastrophic_stall.test.ts` adds a regression where a fresh brigade would repeat a catastrophic low-ratio objective attack after another brigade already learned the position.

## Verification
RED before implementation:
```text
npx.cmd vitest run tests/catastrophic_stall.test.ts
1 failed, 4 passed
expected 'executing' to be 'stalled'
```

GREEN after implementation:
```text
npx.cmd vitest run tests/catastrophic_stall.test.ts tests/operation_launch_feasibility_defender_aware.test.ts
Test Files  2 passed (2)
Tests       7 passed (7)
```

Typecheck:
```text
npm.cmd run typecheck
tsc --noEmit -p tsconfig.json
exit 0
```

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/sector_offensive.ts` | Applies the execution guard before brigade-order generation. |
| `src/sim/combat/sector_offensive_launch_helpers.ts` | Adds deterministic catastrophic objective memory and low-ratio prediction guard. |
| `src/state/game_state.ts` | Extends axis diagnostic blocker typing. |
| `src/sim/combat/operation_aar.ts` | Carries the new axis diagnostic into AARs. |
| `tests/catastrophic_stall.test.ts` | Adds the fresh-brigade repeated-catastrophe regression. |

## Notes
- No UI, save migration, backlog, ledger, or master docs were edited in this lane.
- The guard is faction-symmetric by construction: it keys only on the operation corps, operation faction, objective OSID, prior attacker outcome, and current predicted combat ratio.
