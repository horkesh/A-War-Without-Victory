## 2026-04-03 - Physical sector ownership and frontline reserve split

### Summary
- Added a final physical-ownership truth pass to the sector pipeline so late writers can no longer leave brigades rostered into sectors that do not physically own their current positions.
- Narrowed frontline truth so `reserve_brigade_ids` no longer count as frontline-assigned formations for fatigue, reporting, and downstream combat-side consumers.
- Verified the change with focused tests and a fresh 40-week run (`n1309`).

### Files changed
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/front_assignment.ts`
- `tests/brigade_territory_reconciliation.test.ts`
- `tests/front_assignment.test.ts`
- `tests/formation_fatigue_frontline_assignment.test.ts`

### Why
- The sector builder already had stronger contiguity and cross-corps rescue rules, but late passes could still leave paper assignments behind.
- That meant the engine could truthfully build a frontline and then quietly corrupt the roster afterward through coverage equalization, commander review, or similar late reassignment paths.
- A second split truth also remained in the frontline helper: once sectors existed, `reserve_brigade_ids` were still being treated as frontline-assigned formations. That made fatigue, officer-quality updates, and reporting believe reserves were physically on the line.

### What changed
- Added `enforcePhysicalSectorOwnership(...)` to the brigade-assignment layer.
  - A sector may keep a brigade only when the brigade's current `location_osid` is:
    - on the sector frontline,
    - inside the sector territory,
    - or one hop behind the frontline as a reserve position.
  - Anything else is future intent, not present frontline truth, and is stripped before the sector set is returned.
- Moved `warnUnresolvedSectorAssignments(...)` to run after the new final ownership pass.
  - Unresolved warnings are now emitted only after the engine has exhausted same-corps assignment, enclave rescue, coverage, rear reclassification, commander review, dedupe, and the final physical-ownership check.
- Narrowed `buildFrontlineAssignedFormationSet(...)` so only `assigned_brigade_ids` count as frontline truth.
  - Sector reserves remain sector-owned, but they no longer masquerade as line brigades in downstream systems.

### Evidence
- Fresh run `n1309` kept `cross_corps_sector_assignment = 0`.
- The final-state foreign-sector laundering cases collapsed sharply; the only quick-script residual was a reserve-band case (`arbih_851st_vitezka_liberation`) that likely reflects valid one-hop reserve truth rather than a false assignment.
- The new unresolved set is larger, but that is honest: the engine is now surfacing brigades that previously would have been paper-washed into sectors they did not physically hold.

### Verification
- `node .\node_modules\vitest\vitest.mjs run tests\brigade_territory_reconciliation.test.ts tests\commander_driven_brigade_assignment.test.ts`
- `node .\node_modules\tsx\dist\cli.mjs --test tests\front_assignment.test.ts tests\formation_fatigue_frontline_assignment.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
