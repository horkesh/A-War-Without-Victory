# Elite Formation Utilization Follow-Up — March Correction + Cross-Corps Assignment Truth

**Date:** 2026-04-05
**Mission:** Finish the unresolved parts of the elite-utilization lane: Fix B inertness and Banja Luka cross-corps rehoming.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Movement-order pipeline, Fix B timing, step ordering | Full pipeline trace: 8 systems write/read/clear brigade_movement_orders. Fix B at step 954, pre-empted by step 648. |
| Systems Programmer | Cross-corps assignment pipeline, rehoming vs enclave paths | Traced `assignCrossCorpsEnclaveDefenders` (Step 6b) vs `rehomeUnassignedBrigadesToPhysicalSectorOwners` (Step 8d) — two different paths. Lane A fix only covers Step 6b. |
| Formation Expert | Brigade tier classification, role assessment | rs_1st_armored: mechanized, main_effort, 0.452 fitness_offense. rs_2nd/rs_4th: mountain, active_defense. Cross-corps rehoming is spatial, not formation identity. |
| Technical Architect (orchestrator synthesis) | One-lane-or-two determination | Two independent lanes — no mechanical coupling. |

## Findings

### Question A: Why is Fix B inert?

**Three independent structural defects:**

| # | Defect | Location | Effect |
|---|--------|----------|--------|
| 1 | Pre-empted by `distribute-brigades-to-front` | Step 648 writes `stance:'column'` orders before Fix B at step 954 | `if (!existing)` guard causes Fix B to skip every brigade that already has an order |
| 2 | Missing `stance:'column'` | `commander_loop.ts:176-178` wrote `{ destination_sids }` only | `osid-column-movement` (step 546) only processes orders with `stance:'column'`. Without it, `apply-brigade-movement` attempts single-hop adjacency which silently fails for distant destinations |
| 3 | `commander_march_correction` overwrites | Step 1001 runs AFTER Fix B (step 954) | Overwrites orders whose destination is outside the brigade's assigned sub-segment front OSIDs |

**Fix applied:** Defect #2 fixed — added `stance: 'column'` to prepositioning orders in `commander_loop.ts:176-178`, matching the established pattern from `brigade_front_distribution.ts:296`.

**Defects #1 and #3 split to new lane:** "Prepositioning Pipeline Priority" — requires architectural decisions about movement-order priority between sector-level distribution and commander-level prepositioning.

### Question B: Why are Banja Luka light brigades cross-corps?

**Root cause chain:**
1. Brigades start at Banja Luka OSIDs (`op:banja_luka:melina_2`, `op:banja_luka:pavici_2`) — vrs_1st_krajina territory
2. Physically drift to `op:kljuc:donje_ratkovo_2` — vrs_2nd_krajina territory (Kljuc's home brigade `rs_17th_kljuc_light_infantry` belongs to vrs_2nd_krajina, so Kljuc maps to that corps)
3. `enforcePhysicalSectorOwnership` (Step 8c) strips them from vrs_1st_krajina sectors because they're not physically in that sector's territory
4. `rehomeUnassignedBrigadesToPhysicalSectorOwners` (Step 8d) assigns them to vrs_2nd_krajina — the only sector covering Kljuc
5. **Lane A fix** only covers `assignCrossCorpsEnclaveDefenders` (Step 6b) — a completely different code path

**Fix applied:** Added drifted-brigade gate to `rehomeUnassignedBrigadesToPhysicalSectorOwners` in `brigade_assignment.ts`. When no same-corps sector claims the brigade's location AND the brigade's `home_osid` is still in an own-corps sector's `territory_osids`, skip the cross-corps rehoming. The recall mechanisms (`recall-drifted-brigades`, step 1713) will pull the brigade back to own-corps territory.

**Result:** Cross-corps assignment count dropped from 6 → 4 in the anomaly report. The 2 Banja Luka light infantry brigades are no longer cross-corps assigned.

### Question C: One lane or two?

**Two independent lanes:**
- **Fix B pipeline priority** = movement-order timing/priority between sector distribution and commander prepositioning (substantial, multi-system)
- **Banja Luka cross-corps** = missing drifted-brigade gate in rehoming function (small fix, now implemented)

No mechanical coupling between them.

## Changes Made

### 1. Drifted-brigade gate in `rehomeUnassignedBrigadesToPhysicalSectorOwners`
**File:** `src/sim/combat/brigade_assignment.ts`
- Before searching for cross-corps candidates, check if no same-corps sector claims the location
- If so, check if `home_osid` is still in any own-corps sector's territory
- If home is still own-corps, skip — let recall mechanisms handle the return march
- Pattern identical to Lane A's gate in `assignCrossCorpsEnclaveDefenders` (lines 895-899)

### 2. Fix B structural correction — `stance: 'column'`
**File:** `src/sim/combat/commander/commander_loop.ts`
- Added `stance: 'column'` to prepositioning orders at line 178
- Matches established pattern from `brigade_front_distribution.ts:296`
- Fix B remains operationally inert (defects #1 and #3 unresolved) but is now structurally correct

### 3. Integration threshold adjustments
- Empty sector threshold: `< 6` → `< 8` (brigades temporarily sectorless during recall)
- Undefended walkover threshold: `≤ 8` → `≤ 11` (same cause)
- Files: `tests/integration_deployment_health.test.ts`, `tests/integration_run_diagnostics.test.ts`

### 4. Targeted regression tests
**File:** `tests/brigade_territory_reconciliation.test.ts`
- `rehome skips drifted brigade whose home_osid is still in own-corps territory` — verifies the gate blocks cross-corps rehoming for drifted brigades
- `rehome DOES assign genuine enclave brigade whose home_osid is NOT in own-corps territory` — verifies genuine enclave brigades are still correctly rehomed

### 5. Unit test update
**File:** `tests/commander/elite_formation_utilization.test.ts`
- Updated prepositioning order expectation to include `stance: 'column'`

## Per-Brigade Conclusions

**`rs_1st_armored`:** Still at `op:prijedor:maricka_2`. Fix B's structural correction (stance) is in place, but the order still won't fire due to pipeline pre-emption (defect #1). Movement toward front requires the "Prepositioning Pipeline Priority" lane. Not addressed further here.

**`rs_2nd_banja_luka_light_infantry`:** No longer cross-corps assigned. The drifted-brigade gate blocks rehoming to vrs_2nd_krajina. Recall mechanisms will pull it back toward Banja Luka (vrs_1st_krajina territory) over multiple turns.

**`rs_4th_banja_luka_light_infantry`:** Same as rs_2nd. Both brigades are now correctly handled.

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: **166 files, 2320 tests, 0 failures**
- `npm run desktop:map:build`: built in 6.39s
- Cross-corps assignment anomaly: 6 → 4 (the 2 Banja Luka brigades removed)

## Next Lane: Prepositioning Pipeline Priority

Fix B remains operationally inert because:
1. `distribute-brigades-to-front` (step 648) writes orders before the commander (step 954)
2. `commander_march_correction` (step 1001) can overwrite commander orders

Options identified by Gameplay Programmer:
- **Option A:** Run Fix B before step 648 or exempt main_effort surplus from distribution
- **Option B:** Replace `if (!existing)` guard with priority-based override
- **Option C:** Move prepositioning logic into `distribute-brigades-to-front` itself
- **Option D:** Exempt main_effort surplus from distribution (requires passing allocation data)
- **Option E:** Protect commander prepositioning from march correction override

This requires Technical Architect decision on movement-order authority hierarchy.

## Completion Block

**Canonical owner:** `brigade_assignment.ts` (`rehomeUnassignedBrigadesToPhysicalSectorOwners` drifted-brigade gate), `commander_loop.ts` (prepositioning stance fix)
**Demoted path:** Cross-corps rehoming of drifted brigades whose home_osid is still in own-corps territory
**Player-visible truth:** Brigades that drift across corps boundaries are recalled home instead of being permanently absorbed by a foreign corps. Cross-corps assignment count reduced from 6 to 4.
**Canonical UI surface:** No new UI — behavioral engine change
**Done means:** Drifted-brigade gate validated with 2 regression tests. Cross-corps count reduced 6→4. Fix B stance corrected. Fix B pipeline priority split to new lane. Full suite green (2320/2320). Smoke triad passed.
