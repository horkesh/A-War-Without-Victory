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

(Filled in below from the 188w `data/derived/_debug/sector_partition_perf.jsonl`.)

### Top-10 spike turns

(Filled in below.)

### Spike pattern hypothesis

(Filled in below.)

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
