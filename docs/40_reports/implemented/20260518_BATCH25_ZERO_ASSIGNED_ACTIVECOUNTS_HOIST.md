# Batch 25 — `:zero-assigned` `activeCounts` Hoist

**Date:** 2026-05-18
**Baseline:** Batch 24 / 40w n1901 `b14179d65639860c`
**Result:** Hoisted `countActiveBrigadesByOsid(formations)` out of the `.flatMap` callbacks in `ensureMinimumSectorCoverage` Steps 1b (rear-brigade rescue) and 1c (reserve-brigade rescue). `:zero-assigned` dropped from 1466.9 ms to 805.0 ms (**-661.9 ms / -45.1%**) at 40w byte-identical `b14179d65639860c`.

## Change

`src/sim/combat/brigade_assignment.ts` Steps 1b and 1c previously called `countActiveBrigadesByOsid(formations)` inside the `.flatMap` callback per donor sector. `formations` is not mutated between donor iterations within a step — only `pickVacantLocalFrontTarget(...)` runs, which is read-only on `activeCounts`. The per-donor rebuild produced identical Maps and was pure waste.

Hoisted to one call per step:

```typescript
// Step 1b: pull the nearest reachable same-corps rear brigade.
{
    // Hoisted from inside the flatMap callback: formations is read-only
    // across donor iterations within this step, so the per-donor rebuild
    // produced identical activeCounts maps. Byte-identical because
    // pickVacantLocalFrontTarget(...) consumes activeCounts read-only;
    // the post-pick moveBrigadeToFrontTarget below uses its own fresh
    // activeCounts at line ~1519.
    const stepActiveCounts = countActiveBrigadesByOsid(formations);
    const rearCandidates = corpsSectors
        .filter(...)
        .flatMap((donor) => {
            return [...(donor.rear_brigade_ids ?? [])]
                .sort(strictCompare)
                .map((bid) => {
                    const target = pickVacantLocalFrontTarget(bid, sector, stepActiveCounts);
                    return target ? { donor, bid, dist: target.dist, target: target.target } : null;
                });
        })
        ...
}
```

Same hoist applied to Step 1c. The post-pick `moveBrigadeToFrontTarget(...)` site at lines 1519 / 1550 still builds its own fresh `activeCounts` for the actual mutation — independent local, no interference.

## Byte-identity argument

1. `pickVacantLocalFrontTarget(brigadeId, sector, activeCounts)` reads `activeCounts.get(target)` only. No mutation.
2. `formations` is not modified during the `.flatMap` iteration (no `moveBrigadeToFrontTarget`, no other writes).
3. Therefore each per-donor rebuild produced an identical `Map<string, number>` to the others — the hoist preserves the exact same key/value lookups across all donor iterations.
4. The post-pick mutation site builds its own activeCounts at lines 1519 / 1550; the hoisted `stepActiveCounts` doesn't reach it.

## Evidence (n1902)

| Label | Batch 24 (n1901) | Batch 25 (n1902) | Delta |
|---|---:|---:|---:|
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` | 1466.9 ms | **805.0 ms** | **-661.9 (-45.1%)** |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-front` | 36.8 ms | (unchanged) | — |
| `ensureMinimumSectorCoverage:territory-claim-rescue` (parent) | 1505.7 ms | ~842 ms | -664 ms |

Same call count (1502) confirms identical control flow — just one rebuild per step instead of one per donor.

## Byte-Identity Proof

Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1902`
Final state hash: `b14179d65639860c` — matches Batch 17 baseline literally.

| Check | Result |
|---|---|
| 40w hash matches `b14179d65639860c` | yes |
| `validate_run_consistency` | PASS (0 violations) |
| anchors / benchmarks | 27/27 / 6/6 |
| `tests/sector_partition_*.test.ts + final_sector_truth_* + war_phase_step_order` | 65/65 PASS |
| `npm.cmd run typecheck` | PASS |

Scenario expert: "GO. Hoist is byte-identical (hash match), retains 27/27 anchors and 6/6 benchmarks, and cuts the targeted sub-function nearly in half without changing call counts."

## Cumulative Sector-Perf Wins This Session

| Batch | Optimization | Saving |
|---|---|---:|
| Batch 19 (prior) | Staffability-filter osidSectorCount precompute | byte-identical, perf delta unmeasured at the time |
| Batch 22 | normalizeFinalSectorBuckets friendlyUniverse hoist | -1808 ms / -85% on `:normalize-buckets` |
| Batch 25 | territory-claim-rescue Step 1b/1c activeCounts hoist | -662 ms / -45% on `:zero-assigned` |
| **Total quantified saving** | | **~2.5 s** on the 40w simulation bucket |

All wins are byte-identical against the Batch 17 baseline `b14179d65639860c`.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_assignment.ts` | Hoisted `countActiveBrigadesByOsid(formations)` to `stepActiveCounts` BEFORE the `.flatMap` call in both Step 1b and Step 1c; updated both `pickVacantLocalFrontTarget(...)` calls inside the flatMap callbacks to pass the hoisted local. |
| `docs/40_reports/implemented/20260518_BATCH25_ZERO_ASSIGNED_ACTIVECOUNTS_HOIST.md` | This report. |

Plus parent-doc propagation.

## Next Targets (Batch 26+)

1. **Sub-attribute `:zero-assigned` 805 ms** into its 4 internal steps (Step 1 promote / 1b rear / 1c reserve / 2 surplus) to identify which step still dominates.
2. **Drill `:severe-rescue` 1054 ms** — still un-attributed and now the largest single un-split phase in `ensureMinimumSectorCoverage`.
3. **Strict-null Phase 2 long-tail** (21 remaining, mostly in Lane B/C territory).
4. **Non-sector queue lanes**: CI/test feedback loop plan, 188w endgame verification, BCS localization scaffold.
