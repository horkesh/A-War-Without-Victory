# Batch 23 — `ensureMinimumSectorCoverage` Closure-Hoist + 5-Phase Attribution

**Date:** 2026-05-18
**Baseline:** Batch 22 / 40w n1899 `b14179d65639860c`
**Result:** Five sidecar `_perfTime` children added under `sealMergedSectorTruth:ensure-coverage` after hoisting `needed` + `DENSITY_FLOOR_*` constants out of Phase B (where Batch 22 had blocked on closure scope). New evidence isolates two dominant phases — `:territory-claim-rescue` 1505 ms (56%) and `:severe-rescue` 1054 ms (39%) — that together account for 96% of the 2.67 s `ensure-coverage` cost. Byte-identical at 40w `b14179d65639860c`.

## Summary

Batch 22 attempted a 5-phase attribution for `ensureMinimumSectorCoverage` and reverted when phase wrappers broke closure scope. The blocker was that `needed` (a sector → desired-brigades helper) and the `DENSITY_FLOOR_EDGES_PER_BRIGADE` / `DENSITY_FLOOR_THREAT_GATE` constants are declared inside Phase B (density-floor) but referenced from Phase E (severe-rescue) at 10+ sites — once each phase body lived inside its own `_perfTime` callback, the Phase B declarations were hidden from Phase E.

Batch 23 resolves it by hoisting the three Phase B declarations up to function-body scope before any phase wrapper begins:

```typescript
// ── Hoisted shared closures ──
// `needed` and the density-floor constants are declared at function-body scope
// because Phase E (severe-rescue) references `needed` at 10+ sites and the
// _perfTime phase wrappers below would otherwise hide Phase B's local
// declarations from later phases.
const DENSITY_FLOOR_EDGES_PER_BRIGADE = 8;
const DENSITY_FLOOR_THREAT_GATE = 300;
const needed = (s: CorpsFrontSector): number =>
    Math.max(1, Math.ceil(s.length_edges / DENSITY_FLOOR_EDGES_PER_BRIGADE));
```

Phase B's body retains a transitional comment pointing to the hoisted block; no other phase declarations needed hoisting (Phase C/D/E each declare their own local constants that don't escape).

The function signature gains an optional `perfTime: EnsureMinimumSectorCoveragePerfTimer = (_label, fn) => fn()` parameter with no-op default, matching the `buildMultiSectorsForCorps` pattern in `sector_building.ts`. Each of the 5 phases is wrapped in a `perfTime(label, () => { ... })` callback. The two call sites in `sealMergedSectorTruth` (corps_front_sectors.ts) pass the module-local `_perfTime` as the 7th argument; all other callers (if any exist outside this file) get the no-op default.

## Per-Phase Evidence (n1900)

| Label | Aggregate ms / 40w | Calls | % of parent |
|---|---:|---:|---:|
| `ensureMinimumSectorCoverage:territory-claim-rescue` | **1505.50** | 1502 | 56.3% |
| `ensureMinimumSectorCoverage:severe-rescue` | **1054.46** | 1502 | 39.4% |
| `ensureMinimumSectorCoverage:idle-equalization` | 31.14 | 1502 | 1.2% |
| `ensureMinimumSectorCoverage:moderate-reinforcement` | 16.77 | 1502 | 0.6% |
| `ensureMinimumSectorCoverage:density-floor` | 15.43 | 1502 | 0.6% |
| Sum of children | 2623.30 | — | — |
| Parent `sealMergedSectorTruth:ensure-coverage` | 2675.67 | 1502 | 100% |

Attribution overhead (parent minus children sum) = ~52 ms (~2%), comparable to other multi-phase attributions in this codebase.

`territory-claim-rescue` + `severe-rescue` together = **2559.96 ms (95.7% of ensure-coverage)**. The remaining three phases sum to 63.34 ms and are not worth optimizing.

Parent total moved from 2665.5 ms (Batch 21 baseline) to 2675.67 ms (Batch 23) — +10.17 ms (+0.4%). Within run-to-run noise; no behavior change attributable to the closure hoist or phase wrappers.

## Byte-Identity Proof

Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1900`
Final state hash: `b14179d65639860c` — matches Batch 17 baseline literally.

| Check | Result |
|---|---|
| 40w hash matches `b14179d65639860c` | yes |
| `node tools/validate_run_consistency.cjs runs/.../n1900` | PASS (0 violations; 4 pre-existing informational below-floor advisories unchanged) |
| run_summary anchors | 27/27 PASS |
| run_summary bot benchmarks | 6/6 PASS |
| `tests/sector_partition_*.test.ts + final_sector_truth_* + war_phase_step_order` (6 files / 65 tests) | PASS — includes new `static contract: ensureMinimumSectorCoverage` test enforcing the 5-label set |
| `npm.cmd run typecheck` | PASS |

Scenario expert: "GO. Hash literal match confirms zero behavioral drift from closure hoist + no-op perfTime default."

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_assignment.ts` | Added `EnsureMinimumSectorCoveragePerfTimer` type alias. Added optional `perfTime` parameter with no-op default. Hoisted `DENSITY_FLOOR_EDGES_PER_BRIGADE`, `DENSITY_FLOOR_THREAT_GATE`, and `needed` from Phase B (density-floor) to function-body scope. Wrapped each of the 5 phases in `perfTime` callbacks with the canonical labels. |
| `src/sim/combat/corps_front_sectors.ts` | Two `ensureMinimumSectorCoverage(...)` call sites inside `sealMergedSectorTruth` now pass module-local `_perfTime` as the 7th argument. |
| `tests/sector_partition_instrumentation.test.ts` | New `static contract: ensureMinimumSectorCoverage has deterministic child attribution labels` test enforcing the 5 label literals. |
| `docs/40_reports/implemented/20260518_BATCH23_ENSURE_COVERAGE_ATTRIBUTION.md` | This report. |

Plus parent-doc propagation (PROJECT_LEDGER, PROJECT_LEDGER_KNOWLEDGE, napkin, SECTOR_MASTER, MASTER_BACKLOG_EXECUTION_QUEUE).

## Next Targets (Batch 24+)

1. **Drill into `ensureMinimumSectorCoverage:territory-claim-rescue`** (1505 ms / 1502 calls / 1.00 ms-per-call, 56% of ensure-coverage). The phase iterates `sectorsByCorps`, finds zero-front sectors, and rescues brigades via territory membership. Likely candidate for further sub-attribution or a byte-identical optimization (e.g., hoisting a per-corps lookup that's currently rebuilt per zero-sector).
2. **Drill into `ensureMinimumSectorCoverage:severe-rescue`** (1054 ms / 1502 calls / 0.70 ms-per-call, 39% of ensure-coverage). The phase does late same-corps rebalance for critically thin sectors. Larger phase by line count (~290 lines) — sub-attribution would isolate the inner cost.
3. **Strict-null Phase 2 long-tail**: 21 remaining combat escapes. Most are in `corps_front_sectors.ts` (7) / `sector_*` (8) / gated files (4). Limited clean candidates.
4. **Other queue lanes**: CI/test feedback loop plan, 188w endgame verification, BCS localization, diplomacy panel.
