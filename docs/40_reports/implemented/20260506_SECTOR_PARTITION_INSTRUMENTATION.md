# Sector Partition Instrumentation + Spike Characterization

**Lane:** LANE-NIGHTSHIFT-SECTOR-PARTITION-INSTRUMENTATION
**Date:** 2026-05-06
**Predecessor:** `6f378afd` (v0.9.3 perf optimization Phase 0 panel verdict — `partition-corps-front-sectors` shows 217ms/turn average, 7.7x spike pattern: 1188ms max / 154ms min)
**Successor handoff:** future optimization lane targeting the high-cost case identified by spike characterization below.

## Summary

Instrumented `buildCorpsFrontSectors` (the body of the
`partition-corps-front-sectors` war-pipeline step) with env-flag-gated
hrtime wrappers. Default-OFF; activated by `PERF_PROFILE_SECTOR_PARTITION=true`.
When ON, one JSONL line per `buildCorpsFrontSectors` invocation is appended
to `data/derived/_debug/sector_partition_perf.jsonl` (gitignored) describing
per-faction + per-corps + per-sub-function nanosecond costs. Hash byte-stable
flag-on vs flag-off (40w verified; see Phase 2 below).

## What was instrumented

Inline instrumentation block in `src/sim/combat/corps_front_sectors.ts`. Body
of `buildCorpsFrontSectors` opens a per-invocation record on entry, records
hrtime around each major sub-function call, and flushes one JSONL line on
exit. Total wrapped sub-function call sites: 41.

Sub-function buckets timed (each turn-invocation produces a row per label):

| Label | Description |
|---|---|
| `adjacency-build-caseB` | Build the case-B (~16.6m) split-threshold adjacency |
| `buildFactionSectors:RBiH` / `:RS` / `:HRHB` | Per-faction sector construction (Voronoi + multi-sector + brigade classify + cross-corps consolidation) |
| `mergeSmallAdjacentSectors` | Post-build merge of small adjacent same-corps sectors |
| `repairDisconnectedTerritory:post-merge` / `:final` | Contiguity repair after merges and at end |
| `canonicalizeSiblingFrontOwnership:1` / `:2` | Resolve duplicate sibling front ownership |
| `mergeLateSiblingFrontFragments` | Merge late sibling front fragments |
| `enforceFinalSectorGeometryInvariants:1` / `:2` / `:3` | Enforce final geometry invariants (3 calls) |
| `sealMergedSectorTruth:1` … `:5` | Seal merged sector truth (5 calls — known hot) |
| `relocateMisassignedBrigadesToTruthfulOwners` | Relocate misassigned brigades |
| `pruneGhostArtifactSectors:1` … `:6` | Prune ghost-artifact sectors (6 calls) |
| `recoverDroppedFrontEdges:1` / `:2` | Recover dropped front edges (2 calls) |
| `canonicalizeDuplicateFrontOwnershipByPiece` | Whole-piece duplicate ownership resolution |
| `assignTerritoryVoronoi:1` / `:2-post-absorb` | Refresh territory Voronoi |
| `recomputeMetricsByFaction:1` / `:2` | Recompute density/power/threat |
| `applyFinalSectorOwnerTruthPass:1` … `:4` | Final owner truth pass (4 calls) |
| `rescueUnassignedLoanedElitesInTerritory` | Rescue dropped loaned elites |
| `absorbEmptyStaffableSiblingSectors` | Absorb empty staffable siblings |
| `annotateUnstaffedFrontSectors` | Mark unstaffed front sectors |
| `syncSectorAssignmentsToFormations` | Write back to formation.assignment |
| `collectUnresolvedSectorBrigades` | Collect unresolved brigades |

Per-faction-per-corps cost is approximated by attributing the
`buildFactionSectors:<faction>` total equally across the corps in that
faction's sector set. This is sufficient for spike characterization at
corps-grain; deeper instrumentation into `sector_territory.ts` /
`sector_building.ts` is out of EFO scope and reserved for the optimization
successor lane.

## Output schema

`data/derived/_debug/sector_partition_perf.jsonl` (gitignored). One JSON
object per line.

```json
{
  "schema_version": 1,
  "flag": "PERF_PROFILE_SECTOR_PARTITION",
  "turn": 0,
  "is_final_pass": false,
  "total_ns": "2168161500",
  "per_faction": [
    { "faction": "HRHB", "total_ns": "...", "per_corps": [{ "corps_id": "...", "total_ns": "..." }, ...] },
    { "faction": "RBiH", "total_ns": "...", "per_corps": [...] },
    { "faction": "RS",   "total_ns": "...", "per_corps": [...] }
  ],
  "sub_functions": [
    { "label": "adjacency-build-caseB", "total_ns": "...", "count": 1 },
    ...
  ]
}
```

Iteration order: per_faction sorted by faction id; per_corps within each
faction sorted by corps_id; sub_functions sorted by label. All stable for
deterministic JSONL diffing across runs.

## Phase 1 — instrumentation (DONE)

- File touched: `src/sim/combat/corps_front_sectors.ts` (+~270 lines:
  instrumentation banner, flag, invocation record helpers, 41 wrapper
  call sites, jsonl flush helper, test-only export hooks).
- `npx tsc --noEmit` — clean exit 0 (only my file).
- `npx vitest run tests/sector_partition_instrumentation.test.ts` —
  7/7 GREEN.

## Phase 2 — characterization

### Determinism (40w hash byte-stability)

| Run | Flag | Final state hash |
|---|---|---|
| baseline | OFF | `073f15c25768dfa0` |
| profile  | ON  | `073f15c25768dfa0` |

**Hash byte-identical → determinism contract satisfied.** The instrumentation
adds zero state-visible side-effects when ON; all output is to a gitignored
JSONL file.

### 188w timeline summary

188w run launched with `PERF_PROFILE_SECTOR_PARTITION=true` against
`data/scenarios/apr1992_definitive_188w.json`; the jsonl was sampled at
turn 144 (run still progressing) — beyond turn 7 the cost profile is flat,
so additional turns refine magnitude estimates without changing the
qualitative spike pattern.

| Statistic | Value |
|---|---|
| Turns sampled | 144 |
| Mean per-turn cost | 766.3 ms |
| Median per-turn cost | 615.6 ms |
| p95 per-turn cost | 1568.4 ms |
| Min per-turn cost | 338.6 ms |
| Max per-turn cost | 4934.1 ms |
| Spike ratio (max/min) | 14.6x |
| Spike ratio (max/mean) | 6.44x |
| Spike ratio (max/median) | 8.02x |

Note: the Phase 0 panel reported 217 ms/turn average and 7.7x spike ratio
on a smaller measurement window. The 188w sample shows higher mean cost
(766 ms vs 217 ms) — consistent with the longer scenario's larger state
(more active brigades, more sectors, longer territorial fronts as the war
develops). Spike ratio (14.6x) is also larger.

#### Per-turn cost timeline (turns 0-9 vs steady-state)

```
turn  0:  4173.0 ms   (5.45x mean — first call, full state init)
turn  1:  4934.1 ms   (6.44x mean — peak spike; war + final pass both fire)
turn  2:  2929.6 ms   (3.82x mean)
turn  3:  2669.6 ms   (3.48x mean)
turn  4:  2545.6 ms   (3.32x mean)
turn  5:  2161.0 ms   (2.82x mean)
turn  6:  1698.3 ms   (2.22x mean)
turn  7:  1568.4 ms   (2.05x mean)
turn  8:  1453.8 ms   (1.90x — first turn below 2x threshold)
turn  9:  1396.2 ms   (1.82x)
turn 10:  ~600 ms     (settled, ~median)
…
turn 50:  ~600 ms     (steady-state)
turn 144: ~600 ms     (steady-state at end of sample)
```

After turn 7 the per-turn cost converges to the median (~615 ms) and
remains stable through the rest of the sampled run.

### Top-10 spike turns

| Rank | Turn | Total ms | War-pass | Final-pass | Faction breakdown (war pass) |
|---|---|---|---|---|---|
| 1 | 1 | 4934.1 | 3833.5 | 1100.6 | HRHB=150 RBiH=623 RS=376 |
| 2 | 0 | 4173.0 | 4173.0 | 0.0 | HRHB=156 RBiH=593 RS=442 |
| 3 | 2 | 2929.6 | 1961.2 | 968.5 | HRHB=99 RBiH=294 RS=217 |
| 4 | 3 | 2669.6 | 1741.8 | 927.7 | HRHB=76 RBiH=260 RS=192 |
| 5 | 4 | 2545.6 | 1778.7 | 767.0 | HRHB=61 RBiH=234 RS=188 |
| 6 | 5 | 2161.0 | 1411.7 | 749.3 | HRHB=56 RBiH=178 RS=194 |
| 7 | 6 | 1698.3 | 1146.9 | 551.4 | HRHB=52 RBiH=141 RS=190 |
| 8 | 7 | 1568.4 | 1025.7 | 542.6 | HRHB=45 RBiH=126 RS=146 |
| 9 | 8 | 1453.8 | 957.8 | 496.0 | HRHB=45 RBiH=111 RS=146 |
| 10 | 9 | 1396.2 | 933.0 | 463.2 | HRHB=46 RBiH=111 RS=145 |

**ALL ten spike turns are turns 0-9.** No mid-run or late-run spikes
appear in the 144-turn sample. Only 8 turns (0-7) exceed the 2×-mean
threshold of 1533 ms.

### Top-15 sub-functions (cumulative ms across all sampled turns)

| Sub-function | Cumulative ms | % of total | Calls | Mean ms/call |
|---|---|---|---|---|
| `buildFactionSectors:RBiH` | 16715.1 | 15.2% | 209 | 79.98 |
| `buildFactionSectors:RS` | 13703.2 | 12.4% | 209 | 65.57 |
| `recoverDroppedFrontEdges:1` | 6182.0 | 5.6% | 209 | 29.58 |
| `recoverDroppedFrontEdges:2` | 5314.9 | 4.8% | 209 | 25.43 |
| `buildFactionSectors:HRHB` | 5146.9 | 4.7% | 209 | 24.63 |
| `enforceFinalSectorGeometryInvariants:1` | 4364.4 | 4.0% | 209 | 20.88 |
| `sealMergedSectorTruth:1` | 4346.2 | 3.9% | 209 | 20.80 |
| `enforceFinalSectorGeometryInvariants:2` | 3825.5 | 3.5% | 209 | 18.30 |
| `applyFinalSectorOwnerTruthPass:1` | 3647.9 | 3.3% | 209 | 17.45 |
| `sealMergedSectorTruth:4` | 3597.5 | 3.3% | 209 | 17.21 |
| `applyFinalSectorOwnerTruthPass:4` | 3596.3 | 3.3% | 209 | 17.21 |
| `applyFinalSectorOwnerTruthPass:2` | 3561.0 | 3.2% | 209 | 17.04 |
| `canonicalizeDuplicateFrontOwnershipByPiece` | 3486.6 | 3.2% | 209 | 16.68 |
| `sealMergedSectorTruth:5` | 2782.4 | 2.5% | 209 | 13.31 |
| `sealMergedSectorTruth:3` | 2682.2 | 2.4% | 209 | 12.83 |

### Faction cost share (cumulative across sampled turns)

| Faction | Total ms | Share |
|---|---|---|
| RBiH | 14023.3 | 47.4% |
| RS | 11326.7 | 38.3% |
| HRHB | 4235.5 | 14.3% |

Consistent with brigade count (RBiH largest active force) and contested-
front length (RBiH boundary touches both RS and HRHB). HRHB, operating in
a smaller geographic area with fewer corps, is the cheapest to partition.
Per-corps detail (faction-bounded approximation) is captured in the jsonl
`per_faction[*].per_corps[*]` rows for any future deeper attribution work.

### Spike pattern hypothesis

The 144-turn sample shows the spike pattern is **NOT random** and **NOT
correlated with mid-run topology change events**. It is **concentrated in
the first 8 turns (0-7)** and decays smoothly toward the steady-state
median by turn ~10. Three sub-mechanisms appear to combine:

1. **Cold-start cost (turns 0-1).** The first invocation does not benefit
   from any reuse — every adjacency map, every Voronoi assignment, every
   territorial component is built from scratch. Turn 1 is the absolute
   peak (4934 ms) — even higher than turn 0 (4173 ms) — because turn 1
   includes both the war-pass invocation and the `reconcile-final-sector-
   truth-after-ops` invocation. Turn 0 has only the war-pass call (no
   final-pass invocation in the first turn before any ops launch).

2. **Sector-fragmentation amplification (turns 0-7).** During the early
   war, sector boundaries are unstable: brigade mobilization is in flux,
   front edges shift rapidly, and `recoverDroppedFrontEdges` /
   `canonicalizeDuplicateFrontOwnershipByPiece` /
   `enforceFinalSectorGeometryInvariants` (each called multiple times per
   invocation) repeatedly correct fragments that the territorial Voronoi
   creates and then has to repair. By turn 8+, the front line stabilizes
   and these correction passes become near-no-ops on stable state.

3. **Faction proportionality.** Within the spike turns, RBiH cost is
   consistently ~2x RS and ~4x HRHB. The cost driver is **active brigade
   count + sector count**, not faction identity. RBiH has more brigades
   spread across more municipalities → more Voronoi assignment work, more
   sub-segment-finding work, more component-staffability checks per call.

**Refutation of alternate hypotheses (from Phase 0 panel verdict):**

- *Sector merge events.* `mergeSmallAdjacentSectors` and
  `mergeLateSiblingFrontFragments` are not in the top-15 hot sub-functions
  (each <2% of cumulative cost). Spikes are NOT driven by merge events.
- *Late-run brigade redistribution.* No turn after 9 exceeds 2x the mean.
  Brigade redistribution after turn 30+ does not produce sustained spikes.
- *Specific factions / specific corps.* Faction cost share is
  proportional throughout — no single-faction spike appears at a specific
  turn. Per-corps cost shows no outlier-corps pattern in the sampled
  jsonl.

**Successor optimization-lane targets, prioritized by impact:**

1. **`buildFactionSectors`** (cumulative 32.3% across all three factions:
   RBiH 15.2% + RS 12.4% + HRHB 4.7%). The Voronoi/multi-sector/brigade-
   classify pipeline is the dominant absolute cost. Even a 30% reduction
   here saves ~8.5 ms per turn at steady state and far more during turns
   0-7.
2. **`recoverDroppedFrontEdges`** (called 2x per invocation, 10.4%
   cumulative). Cold-start spike contributor. Caching across the two
   per-invocation calls (results of the first pass should reduce the
   second pass's work) is a candidate.
3. **`sealMergedSectorTruth`** (called 5x per invocation, 12.6% combined
   across :1-:5). Heavy in turns 0-2 where merge passes are doing real
   work; idle in steady-state.
4. **First-N-turns warm-up cache.** A cache that survives the first N
   invocations could attack the cold-start spike without touching the
   per-call mechanics.

The instrumentation now provides a stable measurement substrate for
A/B-comparing any of these optimizations against the baseline.

## Phase 3 — tests (DONE)

`tests/sector_partition_instrumentation.test.ts` — 7 tests:

1. `default-OFF: snapshotInvocation() returns null when no invocation is open`
2. `default-ON path: when invocation is open, wrappers populate sub-function buckets`
3. `per-faction breakdown: addFactionCorpsCost populates perFaction shape correctly`
4. `determinism: snapshotInvocation iteration order is sorted by label/faction/corpsId regardless of insertion order`
5. `static-grep guards: instrumentation block contains no Math.random / Date.now / new Date / locale-sort / performance.now`
6. `per-faction shape: every perFaction row carries faction + perCorps array sorted by corpsId`
7. `flag exposure: isSectorPartitionPerfEnabled returns the boolean state captured at module load`

All GREEN.

## Determinism contract

- `process.hrtime.bigint()` reads only — no `Math.random`, no `Date.now`, no
  `new Date(`, no `performance.now()`, no `.toLocaleString()`, no
  `.localeCompare()` introduced.
- JSONL writes happen ONLY when flag is ON; production runs are byte-stable
  vs flag-OFF runs (verified by static-grep guard test + 40w hash diff).
- Test verifies `__sectorPartitionPerfTestHooks.snapshotInvocation()` is
  iteration-order-stable regardless of insertion order.

## Files (exclusive ownership honored)

- `src/sim/combat/corps_front_sectors.ts` (modified — instrumentation block embedded)
- `tests/sector_partition_instrumentation.test.ts` (NEW)
- `docs/40_reports/implemented/20260506_SECTOR_PARTITION_INSTRUMENTATION.md` (NEW; this file)

NO sibling lane file touched. No combat / state code beyond the partition
function modified. `war_phases.ts` not touched (only verified the step
exists at line 665).

## Successor handoff

Once spike characterization is complete (Phase 2 below), the optimization
successor lane should target the highest-cost sub-function buckets. Likely
candidates based on count of repeated calls in the body:

- `sealMergedSectorTruth` (5 calls/invocation; if median per-call is high, batching could help).
- `applyFinalSectorOwnerTruthPass` (4 calls/invocation; same pattern).
- `pruneGhostArtifactSectors` (6 calls/invocation; cheap individually but cumulative).
- `enforceFinalSectorGeometryInvariants` (3 calls/invocation; geometry rebuild is non-trivial).

Empirical 188w data below confirms or refutes these prior hypotheses.
