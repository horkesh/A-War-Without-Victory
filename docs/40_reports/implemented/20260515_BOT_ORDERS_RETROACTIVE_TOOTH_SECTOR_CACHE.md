# Bot Orders Retroactive Tooth Sector Cache

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1806`
**Baseline:** n1805 overstack count cache, final hash `0cb626c032204372`
**Result:** n1806 final hash `0cb626c032204372`

## Summary
- Reused the already-resolved sector in `evaluateSectorMarch(...)` for retroactive-tooth current sub-segment detection.
- Preserved the old guard's assigned-line semantics: reserve brigades still do not trigger retroactive-tooth eviction through this path.
- Reduced `.retroactiveTooth` from 82.802ms in n1805 to 17.620ms in n1806 while preserving the final state hash.

## Changes Made
### Sector Reuse
- Added `isCurrentSectorRetroactiveTooth(...)`, a small helper that checks the current sector's sub-segments for the brigade's location.
- Replaced the previous all-sector scan for the current brigade's assigned sub-segment with the already-resolved `sector` local.
- Kept the safe-destination scan unchanged; it still scans same-corps sectors because it needs the full corps front candidate set.

### Regression Guard
- Extended `tests/retroactive_tooth_eviction.test.ts` with a red-first helper test for tooth, non-tooth, and missing-location cases.
- Red proof: `npx.cmd vitest run tests\retroactive_tooth_eviction.test.ts --reporter=dot` failed on the missing helper export.
- Green proof: the retroactive-tooth suite and focused bot-order guard suite passed after implementation.

## Profile Results
The n1806 proof kept final hash `0cb626c032204372`, matching n1805/n1804/n1803/n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 7,377 | 152,032,400 | 20,608 | 36,400 |
| `.overstackRedistribution` | 5,573 | 22,057,400 | 3,957 | 8,800 |
| `.assignedSectorLookup` | 856 | 19,282,900 | 22,526 | 32,100 |
| `.retroactiveTooth` | 5,692 | 17,620,400 | 3,095 | 1,700 |
| `.overstackRedistribution.countHere` | 5,573 | 3,178,700 | 570 | 900 |

Compared with n1805:
- `.retroactiveTooth`: 82.802ms -> 17.620ms.
- `sectorMarch`: 226.873ms -> 152.032ms.
- The largest remaining sectorMarch buckets are now close enough to require another fresh profile before choosing the next cut.

## Determinism
- The helper reads the same `CorpsFrontSector.sub_segments` data already selected earlier in the deterministic sector assignment path.
- The reserve-brigade carve-out remains explicit with `!isReserve`, matching the old scan that only considered `assigned_brigade_ids`.
- No scenario data, combat math, target ordering, save schema, serialization format, or RNG path changed.
- Profiled n1806 final hash `0cb626c032204372` confirms serialized output parity.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Added `isCurrentSectorRetroactiveTooth(...)` and reused the resolved sector for current-tooth detection. |
| `tests/retroactive_tooth_eviction.test.ts` | Added helper-level guard coverage. |

## Next Steps
- Use a fresh profile before the next CPU lane.
- Based on n1806, likely next bot-order targets are `.overstackRedistribution` and `.assignedSectorLookup`, but their totals are close enough that one more run should decide priority.
