# Bot Orders sectorMarch Profile Split

**Date:** 2026-05-15
**Run ID:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1803`
**Baseline:** n1802 current-main profile, final hash `0cb626c032204372`
**Result:** n1803 final hash `0cb626c032204372`

## Summary
- Split the default-off `bot_orders.executeFactionDirectives.eval.sectorMarch` profile bucket into named sub-buckets inside `evaluateSectorMarch(...)`.
- Preserved simulation output: the profiled 40-week proof kept the same final hash as the n1802 current-main baseline.
- Identified the leading sectorMarch internals as overstack redistribution and retroactive-tooth eviction; this lane is attribution only, not a runtime optimization.

## Changes Made
### Profiling
- Added `SECTOR_MARCH_PROFILE_PREFIX` and `sectorMarchProfileTime(...)` in `src/sim/combat/bot_brigade_eval_front.ts`.
- Split sectorMarch work into labels for assigned-front checks, sector reassignment, assignment lookup, front-set construction, reserve near-front checks, enclave guard checks, destination selection, trap rerouting, retroactive-tooth eviction, and overstack redistribution.
- Kept profiling gated by `PERF_PROFILE_BOT_ORDERS=true`; normal execution still returns through the existing no-op profiler path.

### Regression Guard
- Extended `tests/bot_orders_perf_profile.test.ts` so the static instrumentation contract covers the sectorMarch split labels.
- Red proof: the guard failed before `SECTOR_MARCH_PROFILE_PREFIX` and the sectorMarch labels existed.
- Green proof: `npx.cmd vitest run tests\bot_orders_perf_profile.test.ts --reporter=dot` passed 5/5, and `npm.cmd run typecheck` passed.

## Profile Results
The n1803 proof kept final hash `0cb626c032204372`, matching n1802.

| Label | Count | Total ns | Mean ns | p95 ns |
|---|---:|---:|---:|---:|
| `bot_orders.executeFactionDirectives.eval.sectorMarch` | 7,377 | 434,865,200 | 58,948 | 116,600 |
| `.overstackRedistribution` | 5,573 | 233,129,600 | 41,831 | 101,000 |
| `.retroactiveTooth` | 5,692 | 89,896,500 | 15,793 | 29,200 |
| `.assignedSectorLookup` | 856 | 20,066,800 | 23,442 | 38,500 |
| `.sectorReassignment` | 7,377 | 3,593,600 | 487 | 400 |
| `.offAssignedFront` | 7,377 | 1,758,700 | 238 | 400 |
| `.frontSet` | 5,925 | 1,040,800 | 175 | 300 |
| `.reserveNearFront` | 233 | 791,700 | 3,397 | 5,700 |
| `.destination` | 4 | 174,800 | 43,700 | 77,900 |

The top-level `sectorMarch` bucket increased from the n1802 profile because the nested timers add opt-in measurement overhead. Treat the sub-buckets as attribution for choosing the next lane, not a before/after speedup.

## Determinism
- No simulation rule, combat formula, target ordering, scenario data, serialization format, or save schema changed.
- The instrumentation uses the existing bot-orders profiler exception documented in `docs/20_engineering/CODE_CANON.md`: monotonic process timers are allowed only behind an explicit profiling flag and only write `data/derived/_debug/bot_orders_perf_profile.json`.
- The n1803 final hash matched n1802, proving the instrumentation did not change serialized simulation output.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Added default-off sectorMarch nested profile labels. |
| `tests/bot_orders_perf_profile.test.ts` | Added static coverage for sectorMarch instrumentation labels. |
| `docs/40_reports/implemented/20260515_BOT_ORDERS_SECTOR_MARCH_PROFILE_SPLIT.md` | This report. |

## Next Steps
- Optimize or further split `overstackRedistribution` first; it dominates the measured sectorMarch sub-work.
- Inspect whether repeated `countCorpsBrigadesAtOsid(...)` calls can reuse a deterministic per-evaluation or per-faction occupancy view without changing movement authority.
- Treat `retroactiveTooth` as the second sectorMarch candidate if overstack redistribution does not produce a safe same-hash cut.
