# Bot Orders Interior Movement Profile Split

**Date:** 2026-05-15
**Run ID:** n1823 (`runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1823`)
**Baseline:** n1821 post return-to-corps territory cache (`0cb626c032204372`)
**Result:** Instrumentation-only profile split; final hash remained `0cb626c032204372`

## Summary
- Added default-off branch timing inside `evaluateInteriorMovement(...)` so the broad `interiorMovement` bucket now reports priority-sector, offensive-target, own-corps-front, and fallback work separately.
- n1823 kept the same 40w final hash, 26/27 anchors, 6/6 bot benchmarks, 9 anomalies, 2 warnings, and 0 critical anomalies.
- The split shows `interiorMovement` is not the next largest optimization lane: parent time was 23.830ms, led by fallback at 12.864ms and priority-sector handling at 8.017ms.

## Changes Made

### Movement evaluator profiling
- `src/sim/combat/bot_brigade_eval_movement.ts` now imports `botOrdersPerfTime(...)`.
- Added `INTERIOR_MOVEMENT_PROFILE_PREFIX` and a local wrapper that emits:
  - `.prioritySector`
  - `.offensiveTarget`
  - `.ownCorpsFront`
  - `.fallback`
- The wrappers preserve the previous branch order and return behavior. Profiling remains default-off behind `PERF_PROFILE_BOT_ORDERS=true`.

### Profile guard
- `tests/bot_orders_perf_profile.test.ts` now reads `bot_brigade_eval_movement.ts` and asserts the interior movement profile prefix and branch suffixes exist.

## Scenario Results

### Bot Order Profile

| Label | Count | Total |
|---|---:|---:|
| `bot_orders.executeFactionDirectives.eval.interiorMovement` | 103 | 23.830ms |
| `.interiorMovement.fallback` | 62 | 12.864ms |
| `.interiorMovement.prioritySector` | 103 | 8.017ms |
| `.interiorMovement.offensiveTarget` | 76 | 1.357ms |
| `.interiorMovement.ownCorpsFront` | 62 | 0.455ms |

### Run Health

| Check | Result |
|---|---:|
| Final hash | `0cb626c032204372` |
| Anchors | 26/27 |
| Bot benchmarks | 6/6 |
| Anomalies | 9 |
| Critical anomalies | 0 |

## Lessons Learned
- `interiorMovement` attribution is now visible, but the branch totals are below larger current candidates such as `sectorMarch`, `homeDefense`, `sectorAttack`, and `defensive`.
- The fallback branch is the leading interior movement branch. It should not be optimized before larger buckets unless a fresh profile shows it has grown.
- Profile label suffixes must be checked before reporting; the first local proof used doubled labels, and n1823 is the corrected-label proof.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_movement.ts` | Added default-off branch profile timing around existing interior movement branches. |
| `tests/bot_orders_perf_profile.test.ts` | Guarded the movement evaluator profile prefix and suffixes. |

## Next Steps
- Use a fresh profile before the next optimization. Current measured candidates are `sectorMarch` residual attribution, `homeDefense`, `sectorAttack`, and remaining defensive/uncontested shared work.
- Do not treat this instrumentation lane as a wall-clock performance cut; it is an attribution closure.
