# 2026-04-03 - Frontline Sector-Mandatory Invariant Refinement

## Summary

Refined the sector unresolved invariant so the engine only flags brigades as unresolved when they should truthfully belong to a live hostile-frontline sector. This fixes the long-running false assumption that every active non-exempt field brigade must always be sector-owned, even in allied or interior terrain where no hostile frontline exists.

## Problem

The sector pipeline had become much more honest after:

- contiguity hardening,
- physical sector ownership stripping, and
- truthful same-corps rehome.

But the final unresolved collector still used an over-broad rule:

- active
- brigade/OG
- non-exempt or loaned
- not in a sector roster
- therefore unresolved

That still accused the engine of being wrong in one remaining case:

- `hrhb_travnik_brigade`
- `location_osid = op:novi_travnik:rat_2`
- `corps = hvo_central_bosnia`

Investigation showed the brigade was not missing a truthful sector owner. Instead:

- `rat_2` has real operational neighbors in the contact graph
- but its `HRHB`-`RBiH` contacts are filtered from `war_front_edges_osid` by the active alliance gate in `src/map/front_edges.ts`
- therefore no hostile frontline exists there yet
- therefore no sector is supposed to be built there

The bug was not assignment anymore. The bug was the invariant.

## Change

Added a shared `brigadeRequiresSectorAssignment(...)` rule in:

- `src/sim/combat/brigade_assignment.ts`

The rule now treats a brigade as sector-mandatory only when at least one of these is true:

- it is physically inside same-corps sector territory
- it is on or one hop behind a same-corps sector frontline
- it is on or one hop behind a real hostile faction frontline from `war_front_edges_osid`

Then updated:

- `src/sim/combat/corps_front_sectors.ts`

So `collectUnresolvedSectorBrigades(...)` only reports brigades that genuinely ought to have a truthful sector owner.

Also aligned the test-side warning helper in:

- `src/sim/combat/brigade_assignment.ts`

So unresolved diagnostics can use the same doctrine when supplied adjacency/front-edge context.

## Why This Is Correct

Your product rule is:

- sectors are frontlines
- they are not bags of OSIDs

That means the inverse is also true:

- a brigade in interior or allied space without a hostile frontline does not automatically need a sector

This refinement preserves signal for the real bug class:

- a brigade on/near a live hostile front that still has no truthful sector owner

while removing the false-positive class:

- an active brigade in terrain where no frontline sector should exist yet

## Tests

Added/updated tests in:

- `tests/brigade_territory_reconciliation.test.ts`

New guards:

- allied interior brigade without hostile front is not sector-mandatory
- one-hop-behind hostile frontier brigade remains sector-mandatory even before assignment exists

## Verification

Passed:

- `node .\node_modules\vitest\vitest.mjs run tests\brigade_territory_reconciliation.test.ts tests\commander_driven_brigade_assignment.test.ts`
- `node .\node_modules\tsx\dist\cli.mjs --test tests\front_assignment.test.ts tests\formation_fatigue_frontline_assignment.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`

Run result:

- `runs/apr1992_definitive_40w__d452d2a10f3d69af__w40_n1311`
- final hash: `8d6e15e371bf8b7d`
- final `unresolved_sector_brigades`: `0`
- `run_summary.anomalies`: empty

## Outcome

The sector pipeline now matches the design more closely:

- sectors mean hostile frontlines
- unresolved means a missing truthful frontline owner
- allied/interior non-frontline brigades are no longer misclassified as sector failures
