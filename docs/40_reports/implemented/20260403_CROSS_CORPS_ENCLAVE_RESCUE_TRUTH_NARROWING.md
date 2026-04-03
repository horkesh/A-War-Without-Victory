## 2026-04-03 - Cross-corps enclave rescue truth narrowing

### Summary
- Narrowed `assignCrossCorpsEnclaveDefenders(...)` so it only rescues brigades into a foreign corps sector when that sector truthfully owns the brigade's current position by frontline or territory.
- Removed the broader same-component fallback that could assign a brigade to any same-faction sector in the component even when the brigade was not physically on that sector at all.
- Verified the fix with focused tests and a fresh 40-week run.

### Files changed
- `src/sim/combat/brigade_assignment.ts`
- `tests/brigade_territory_reconciliation.test.ts`

### Why
- The original enclave-rescue principle was sound: bullets do not check org charts, so a brigade physically sitting on another same-faction frontline may defend it.
- The actual implementation had drifted wider than that principle. If no direct front/territory match existed, it would still assign the brigade to any same-faction sector in the same component.
- That created false sector truth. Concrete `n1307` repro: `hrhb_travnik_brigade` at `op:novi_travnik:rat_2` ended up assigned to `sector:hvo_tomislavgrad:0` even though that sector owned neither the location's territory nor its frontline.

### What changed
- `assignCrossCorpsEnclaveDefenders(...)` now only considers sectors that truthfully match the brigade's current `location_osid` through:
  - frontline `friendly_osids`, or
  - `territory_osids`
- If no such same-faction sector exists, the brigade stays unresolved and the warning stream remains honest.
- Updated the regression suite to enforce the narrowed rule.

### Evidence
- Fresh run `n1308` no longer launders `hrhb_travnik_brigade` into `sector:hvo_tomislavgrad:0`; the brigade remains unresolved instead of receiving a false sector assignment.
- Truthful foreign-corps frontline defenders still work: in `n1308`, `arbih_161st_slavna_olovo_mountain` and `arbih_445th_mountain` remain assigned to foreign sectors that actually own their current physical locations.

### Verification
- `node .\node_modules\vitest\vitest.mjs run tests\brigade_territory_reconciliation.test.ts tests\commander_driven_brigade_assignment.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
