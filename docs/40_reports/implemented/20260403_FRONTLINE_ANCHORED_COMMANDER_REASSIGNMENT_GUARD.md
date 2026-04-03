## 2026-04-03 - Frontline-anchored commander reassignment guard

### Summary
- Stopped commander review from "paper transferring" brigades away from the frontline sector they are physically anchoring.
- Preserved sector truth during post-assignment commander review: if a brigade's current `location_osid` is on a corps sector's frontline, commander override may no longer silently move that brigade into a different sector roster without movement.
- Verified the fix both with a focused regression and with a fresh 40-week scenario run.

### Files changed
- `src/sim/combat/commander_override.ts`
- `tests/commander_driven_brigade_assignment.test.ts`

### Why
- The strict product rule is that sectors are frontlines, not bookkeeping buckets.
- After the contiguity fix, one remaining false-authority path was still able to corrupt sector truth: commander review could decide an exposed brigade "belonged" to a safer sector and rewrite the roster immediately, even while the brigade was still physically standing on another sector's frontline.
- Concrete repro from run `n1306`: `rs_skelani_battalion` stood at `op:sekovici:sekovici_2` but ended up rostered into `sector:vrs_drina:0`; the brigade's location was actually on Drina sector 2's frontline and territory.

### What changed
- `transferBrigadesBetweenSectors(...)` now refuses to move brigades whose current `location_osid` is anchored on any frontline `friendly_osid` of their corps.
- `applyPositionViability(...)` now applies the same guard before trying to withdraw an "exposed" brigade to a safer paper sector.
- Added a regression proving that commander review may not reassign a brigade that is physically anchoring one sector's frontline into another sector just because the second looks safer on paper.

### Evidence
- Deterministic rebuild from `n1306/final_save.json` after the patch now resolves `rs_skelani_battalion` into `sector:vrs_drina:2`, where its location exists in both `territory_osids` and frontline `friendly_osids`.
- Fresh run `n1307` preserves the same truth pattern and still shows zero sectors with multiple saved sub-segments.

### Verification
- `node .\node_modules\vitest\vitest.mjs run tests\commander_driven_brigade_assignment.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
