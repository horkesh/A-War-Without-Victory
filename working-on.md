# Brcko Reactive Defense Investigation (WIP)

## Finding
Brcko anchor fails (12/13) because `defender_contributions: NONE` on every Brcko battle. The 215th and 108th are both at Brcko but defend individually — reactive sector defense never activates.

## Root Cause
`findSectorForEnemyOsid()` in `sector_utils.ts:80-95` looks for the target OSID in `sub.friendly_osids` of ARBiH sectors. Brcko OSIDs likely aren't in any ARBiH sector's friendly_osids because:
- The front line runs through Brcko municipality (some OSIDs RS, some RBiH from turn 0)
- The sector system may not recognize the Brcko front as part of an ARBiH sector
- Or the 215th/108th aren't assigned to the same sector

## Evidence
- w2-w5: All Brcko battles show a single defender (213th, 108th, or 215th) with no reactive contributions
- Power ratios 3.4-11.7x even though two ARBiH brigades are present
- `corps_front_sectors` at initial state contains no Brcko entries
- By final state, ARBiH sector:arbih_2nd_corps:14 contains Brcko OSIDs (but those are the ones RS didn't take)

## What Needs Investigation
1. Why aren't Brcko RBiH OSIDs in an ARBiH sector at w1-2 when the attacks happen?
2. Is the sector partitioning running before the first attack resolution?
3. Are the 108th and 215th assigned to the same or different sectors?
4. Does the front-edge computation recognize the Brcko RS/RBiH boundary?

## Current OOB State
- 108th Brko: 700 pers, w0 (was w2, changed this session)
- 215th Vitezka: 800 pers, w0
- rs_3rd_posavina: 750 pers (reduced from 1000 this session)
- rs_1st_posavina: 850 pers (reduced from 1000 this session)

## Not the Fix
- Adding a third brigade (TDF) is not the answer — two brigades should be enough via reactive defense
- The issue is engine-level: sector defense isn't activating at Brcko

## Current Results (n910)
- 90.3% area-weighted, 12/13 anchors
- Brcko down to 2 lost OSIDs (from 8 originally)
- Posavina 94.5%
