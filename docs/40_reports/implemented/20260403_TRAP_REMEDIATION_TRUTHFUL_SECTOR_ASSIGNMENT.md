# 2026-04-03 - Trap remediation now preserves truthful sector assignment

## Summary
- Removed the last major cross-component reassignment path from `brigade_assignment.ts`.
- Trap remediation and rear-guard rebalance now only move brigades into sectors that share the brigade's connected component.
- Added regression coverage proving that an unreachable brigade now stays unresolved instead of being laundered into a merely reachable but spatially false sector.

## Why
- The earlier sector assignment phases had already become mostly honest: same-component assignment or unresolved.
- A later repair pass was still reopening the lie by "fixing" unreachable brigades through any same-corps reachable sector, even when that sector belonged to another connected component.
- That meant the engine could write false sector truth after the honest phases had already failed, then blame the invariant checker for noticing it.

## Files changed
- `src/sim/combat/brigade_assignment.ts`
- `tests/brigade_territory_reconciliation.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## What changed

### 1. Trap remediation obeys component truth
- The late unreachable-brigade repair pass used to:
  - try same-corps territory ownership first
  - then fall back to any same-corps sector that was path-reachable
- That second fallback is now constrained to sectors whose component matches the brigade's current location component.
- If no truthful same-component sector exists, the brigade is left unresolved.

### 2. Rear-guard rebalance no longer crosses components
- The VRS rear-guard rebalance pass also used "nearest reachable same-corps sector" logic.
- It now applies the same component filter before moving a brigade.

### 3. Regression coverage locks the behavior
- Added a test where:
  - the brigade is initially assigned to a sector that becomes unreachable
  - another same-corps sector is reachable
  - but only through a different connected component
- Expected result is now unresolved, not reassigned.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\brigade_territory_reconciliation.test.ts tests\\commander_driven_brigade_assignment.test.ts`

## Outcome
- Sector repair passes now align with the repo's actual truth model:
  - same-component assignment is truth
  - unresolved is acceptable
  - cross-component reassignment is not a valid repair policy
