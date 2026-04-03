# 2026-04-03 — Sector Frontline Exhaustion and Supply Alignment

## Summary

Repointed two live war-phase mechanics away from the legacy front descriptor model and toward sector-owned frontline truth:

- `updateSupplyPressure(...)`
- `updateExhaustion(...)`

Both systems now prefer `corps_front_sectors` when live sector truth exists, and only fall back to the older front-edge/front-descriptor path when sectors are absent.

## Why

After the harness cleanup, the next dangerous seam was still inside the live engine:

- supply pressure was counting frontage from legacy front edges
- exhaustion was counting static fronts from `detectFronts(...)`

That meant even after sectors became the declared frontline authority, these mechanics still consumed the older model.

## Changes

- [src/sim/combat/supply_pressure.ts](F:/A-War-Without-Victory/src/sim/combat/supply_pressure.ts)
  - now prefers sector-owned frontage by aggregating unique `edge_ids` from `corps_front_sectors`
  - falls back to `war_front_edges_osid` / settlement front edges only when live sector truth is absent
- [src/sim/combat/exhaustion.ts](F:/A-War-Without-Victory/src/sim/combat/exhaustion.ts)
  - now prefers sector-owned frontline exposure by counting non-cold sectors per faction
  - continues to fall back to legacy `FrontDescriptor[]` only when sector truth is absent
- [tests/combat_supply_pressure.test.ts](F:/A-War-Without-Victory/tests/combat_supply_pressure.test.ts)
  - added sector-truth precedence test
- [tests/combat_exhaustion.test.ts](F:/A-War-Without-Victory/tests/combat_exhaustion.test.ts)
  - added sector-truth precedence test

## Important scope boundary

This slice does **not** delete the old frontier model yet.

It does something more important first:

- removes its live authority over supply pressure and exhaustion when sectors are present
- keeps a compatibility fallback for tests/tools/older contexts where sectors are not yet built

That is the right order for swamp-draining:
1. repoint live consumers
2. shrink false authority
3. retire the old producer chain later

## Verification

- `node .\node_modules\tsx\dist\cli.mjs --test tests\combat_supply_pressure.test.ts tests\combat_exhaustion.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome

Two more live mechanics now obey the repo’s intended rule:

`corps_front_sectors` is the frontline truth when it exists.

The remaining old-frontline cleanup can now focus on displacement triggers and any residual reporting/diagnostic consumers.
