# 2026-04-03 - Sector frontline contiguity guard hardening

## Summary
- Fixed a real sector-construction regression where later merge passes could re-glue distinct frontline pockets into a single corps sector.
- Removed the permissive `same friendly OSID = adjacent` shortcut from sector merge gating.
- Normalized sector merges so a merged sector is represented as one synthesized frontline component rather than a bag of appended sub-segments.
- Locked the stricter project rule in tests and canon: a sector is one frontline, not a persisted collection of sub-segments.

## Root cause
- The sector pipeline already split disconnected frontline components correctly.
- Later merge passes in `corps_front_sectors.ts` still treated sectors as mergeable territory buckets:
  - `mergeSmallAdjacentSectors(...)`
  - the brigade-ratio merge loop inside `buildFactionSectors(...)`
- Their merge guard `areSectorsFrontEdgeAdjacent(...)` had a fast path that returned `true` whenever two sectors shared any friendly-side OSID.
- That violated the actual sector rule. Two hostile pockets can face the same friendly-side line and still be separate frontlines.

## Example repro
- Synthetic repro added in [`tests/sector_frontline_contiguity_repro.test.ts`](F:/A-War-Without-Victory/tests/sector_frontline_contiguity_repro.test.ts)
- Topology:
  - friendly `f1/f2`
  - hostile pocket `e1`
  - hostile pocket `e2`
  - both pockets touch the same friendly-side line
- Correct result: two sectors
- Broken result before fix: one merged sector

## Code changes
- [`src/sim/combat/corps_front_sectors.ts`](F:/A-War-Without-Victory/src/sim/combat/corps_front_sectors.ts)
  - removed the shared-friendly fast path from `areSectorsFrontEdgeAdjacent(...)`
  - changed both late merge paths to synthesize a single merged frontline sector via `mergeSectors(...)` instead of appending `sub_segments`
- [`src/sim/combat/sector_rearrangement.ts`](F:/A-War-Without-Victory/src/sim/combat/sector_rearrangement.ts)
  - normalized `mergeSectorInto(...)` to rebuild one merged frontline component instead of preserving multi-sub-segment residue

## Why this matters
- A sector is a frontline, not an arbitrary collection of OSIDs.
- If a merged sector can contain multiple separate frontline arcs, every downstream system is degraded:
  - stance and threat averaging
  - commander review
  - operation-sector selection
  - player-facing sector understanding

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test --test-name-pattern "does not merge separate frontline pockets" tests\\sector_frontline_contiguity_repro.test.ts`
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\sector_drina_frontline_integrity.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\sector_rearrangement.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
