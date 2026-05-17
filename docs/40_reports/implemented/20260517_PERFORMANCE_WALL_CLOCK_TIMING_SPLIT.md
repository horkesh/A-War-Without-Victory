# Performance Wall Clock Timing Split

**Date:** 2026-05-17
**Run ID:** apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846
**Baseline:** Existing `sim:scenario:run:40w` path had no machine-readable phase timing.
**Result:** Opt-in `timing.json` emission now separates setup, simulation, diagnostics/reporting, and serialization/artifact buckets.

## Summary
- Added opt-in wall-clock timing for the scenario harness without changing deterministic scenario artifacts by default.
- Added `--timing-json` to the scenario CLI and `sim:scenario:run:40w:timed` for the 40-week benchmark route.
- No runtime optimization was attempted in this slice.

## Measurement
Command run:

```powershell
node node_modules\tsx\dist\cli.mjs tools\scenario_runner\run_scenario_with_preflight.ts --scenario data\scenarios\apr1992_definitive_40w.json --unique --timing-json --out runs
```

This intentionally omitted `--map` to avoid updating `data/derived/latest_run_final_save.json`; the default 40-week npm route still supports `--map` and the new timed npm route includes it.

| bucket | ms | note |
|---|---:|---|
| setup | 2477.740 | Scenario load, run folder preparation, startup state construction. |
| simulation | 76854.151 | Turn pipeline and state mutation boundary; some in-loop aggregation remains here where current code interleaves it with state updates. |
| diagnostics_reporting | 138.142 | Weekly projection and end-of-run report model construction. |
| serialization_artifacts | 9905.711 | Stable JSON serialization, stream/file writes, final save hashing, replay finalization. |
| total | 93798.472 | End-to-end harness timing excluding the timing file write itself. |

Evidence path: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1846/timing.json`

## Files Changed
| File | Change |
|---|---|
| `src/scenario/scenario_runner.ts` | Added opt-in timing buckets and `timing.json` result path. |
| `tools/scenario_runner/run_scenario.ts` | Added `--timing-json` CLI plumbing and output path printing. |
| `package.json` | Added `sim:scenario:run:40w:timed`. |
| `tests/scenario_timing_instrumentation.test.ts` | Added regression covering timing JSON and timed-vs-untimed artifact equivalence. |

## Verification
- `node node_modules\vitest\vitest.mjs run tests\scenario_timing_instrumentation.test.ts`
- `npm.cmd exec -- vitest run tests\determinism_static_scan_r1_5.test.ts`
- `npm.cmd run typecheck`
- Timed 40-week harness run above completed with final state hash `22328b81ef2cb531`.

## Next Steps
- Re-run the timed script with `--map` if measuring the full package-script user path is required.
- Use the largest measured bucket, simulation, as the first profiling target before any optimization work.
