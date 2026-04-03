# 2026-04-03 - Enclave rescue warning ownership fix

## Summary
- Moved the final `UNRESOLVED ... fell through sector pipeline` warning out of `classifyBrigadesByTerritory(...)` and into the true end of the sector assignment chain in `corps_front_sectors.ts`.
- Added a `PENDING_ENCLAVE_REVIEW` warning for brigades that cannot reach any same-corps sector but do sit in a same-faction component that the cross-corps enclave rescue pass may legitimately absorb.
- Preserved unresolved reporting for loaned reserve brigades: army-HQ exemptions still apply while idle, but not once the brigade is on loan and expected to resolve like a field unit.

## Files changed
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `tests/brigade_territory_reconciliation.test.ts`

## Why
- The engine was still making a "final" unresolved judgment before `assignCrossCorpsEnclaveDefenders(...)` ran.
- That meant a brigade could be truthfully rescued into a same-faction enclave sector and still leave behind a false `UNRESOLVED ... fell through sector pipeline` breadcrumb in logs.
- This is exactly the kind of false-authority seam that misleads later debugging: the final state is correct, but the warning stream claims the engine failed.

## What changed
- `classifyBrigadesByTerritory(...)` no longer emits the end-of-pipeline unresolved catch-all.
- `warnUnresolvedSectorAssignments(...)` now owns that judgment and is called after:
  - same-corps assignment
  - cross-corps enclave rescue
  - minimum sector coverage
- Same-faction same-component enclave candidates now emit `PENDING_ENCLAVE_REVIEW ...` instead of an immediate hard unresolved warning.
- The final reporter treats loaned reserve brigades as non-exempt so unresolved on-loan elites still surface as real problems.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\brigade_territory_reconciliation.test.ts tests\\commander_driven_brigade_assignment.test.ts`

## Follow-up
- The next likely sector-truth slice is to review whether the remaining early `UNASSIGNED ...` warnings should distinguish between:
  - genuinely dead-end corps assignment
  - truthful pending rescue/movement states
- The goal is not fewer warnings; it is warnings that describe the actual owner and lifecycle stage of the problem.
