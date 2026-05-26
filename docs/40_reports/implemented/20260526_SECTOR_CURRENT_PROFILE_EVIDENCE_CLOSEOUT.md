# Sector Current Profile Evidence Closeout

**Date:** 2026-05-26
**Type:** Docs-only profiling evidence closeout
**Final hash:** `f219401f4a17f311`
**Recommendation:** `truth_report_only`

## Summary

Fresh sector/frontline profiling evidence confirms the remaining high-cost buckets are in final sector truth reconciliation and frontline sector partitioning. No source code changed in this closeout. The generated profile artifacts remain ignored under `data/derived/_debug` and `runs_perf`.

The next implementation step should be a bounded byte-identical plan around final sector truth reconciliation and partitioning only. Do not proceed from stale pre-profile assumptions or broad sector-cache proposals.

## Profiling Commands

The profiling batch used the scenario profiler and sector partition sidecar instrumentation:

```powershell
$env:PERF_PROFILE_SECTOR_PARTITION='true'
npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/<sector-profile-run> --report data/derived/_debug/<sector-profile-report>.json
```

The closeout verification for this docs-only packet used:

```powershell
git diff --check
git status --short --ignored
```

## Evidence Outputs

Generated artifacts were produced under ignored paths:

| Path family | Status | Purpose |
| --- | --- | --- |
| `data/derived/_debug/*` | Ignored | JSON/JSONL timing reports and sector partition sidecar data |
| `runs_perf/*` | Ignored | Scenario profiler run outputs |

These artifacts are evidence inputs only. They should not be staged unless a future task explicitly promotes a deterministic diagnostic fixture.

## Top Hotspots

| Bucket | Total | Share | Per call | Note |
| --- | ---: | ---: | ---: | --- |
| `reconcile-final-sector-truth` | 7413.161ms | 7.429% | 185.329ms | Largest measured profile bucket; next planning target |
| `partition-corps-front-sectors` | 7115.483ms | 7.131% | 177.887ms | Main frontline partition bucket after the latest metadata reuse work |
| `sealMergedSectorTruth:ensure-coverage` | 2135.188ms | 12.383% of sector partition timing | n/a | Sector sub-hotspot inside final merged-sector truth sealing |

## Determinism And Scope

- Final state hash remained `f219401f4a17f311`.
- This closeout is docs/evidence only.
- No source code, scenario data, save schema, canon, or generated profile artifact ownership changed.
- The recommended next code work is `truth_report_only`: inspect and plan around final sector truth reconciliation and partitioning before touching implementation.

## Next Implementation Gate

Before any sector/frontline code work:

1. Write a bounded plan that targets only `reconcile-final-sector-truth`, `partition-corps-front-sectors`, and the measured `sealMergedSectorTruth:ensure-coverage` sub-hotspot.
2. Require byte-identity gates: focused sector tests, baseline regression, and a comparable profiled 40-week run with final hash comparison.
3. Keep generated profile artifacts ignored unless a deterministic fixture is intentionally promoted.
4. Reject broad cache proposals unless they prove invocation-local ownership, no mutable `Map`/`Set` leakage, and byte-identical scenario outputs.

## Files Changed

| File | Change |
| --- | --- |
| `docs/40_reports/implemented/20260526_SECTOR_CURRENT_PROFILE_EVIDENCE_CLOSEOUT.md` | Captures fresh profile evidence, ignored artifact policy, hotspots, and next gate |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Adds the evidence closeout to the implemented index |
| `docs/40_reports/README.md` | Adds the evidence closeout to the 40_reports entrypoint |
| `docs/plans/COMMAND_BOARD.md` | Updates sector/frontline next action to use the fresh profile |
| `docs/PROJECT_LEDGER.md` | Appends docs-only evidence ledger entry |

