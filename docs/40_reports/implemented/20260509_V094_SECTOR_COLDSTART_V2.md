# LANE-NIGHTSHIFT-V094-SECTOR-COLDSTART-V2-WITH-G1-5-INTEGRATION-TEST — STOP-AND-RECOMMEND

**Lane:** `LANE-NIGHTSHIFT-V094-SECTOR-COLDSTART-V2-WITH-G1-5-INTEGRATION-TEST`
**Date:** 2026-05-09
**Status:** STOP-AND-RECOMMEND. G1.5 integration test SHIPPED as durable artifact. Memoization implementation REVERTED — Phase A audit's "inputs invariant within one invocation" premise PROVEN FALSE.
**Predecessors:**
- `33f78431` (Phase A consult): `docs/40_reports/audits/20260508_V093_SECTOR_COLDSTART_PHASE_A_CONSULT.md`
- `0644a759` (Phase B rollback): `docs/40_reports/implemented/20260508_V093_SECTOR_COLDSTART_PHASE_B_ROLLBACK.md`

---

## TL;DR

1. **G1.5 integration property test SHIPPED** at `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`.
   The test catches the cross-call leakage that pure-G1 missed in Phase B. RED-bug verification confirms it discriminates against broken cache architectures (3+ variant failures on a deliberately-broken module-level cache).
2. **Per-invocation `mapOsidsToCorps` memoization implementation REVERTED.** G1.5 caught a deeper architectural issue: `formations` is not invariant within one `buildCorpsFrontSectors` invocation — `relocateMisassignedBrigadesToTruthfulOwners` and other intermediate steps mutate `location_osid` between the 5 internal `mapOsidsToCorps` call sites. Faction-keyed per-invocation cache returns stale data on call sites N+1, …, N+4.
3. **The Phase A audit's premise is wrong.** Phase A claimed "state.political_controllers, formations, corpsIds, adjacency don't mutate within an invocation". They don't all mutate, but `formations.location_osid` DOES mutate via `relocateMisassignedBrigadesToTruthfulOwners` (line 432) which runs between call sites. The cache key needs more than `faction` to be sound, OR the cache scope must narrow to within a single pass.
4. **v0.9.4 wall-clock perf surface remains OPEN as STOP-AND-RECOMMEND.** Cold-start optimization deferred again, with G1.5 now permanently in CI as the gate any future re-attempt must pass before claiming hash-stability.

---

## Phase 1 — G1.5 integration test design + RED-bug verification

### Test design

`tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` (NEW). Five test cases, ≥100 fixture invocations:

1. **Pristine real-save fixture**: load `data/derived/latest_run_final_save.json`, run `buildCorpsFrontSectors` end-to-end with cache ON (default) and cache OFF (env flag `SECTOR_COLDSTART_CACHE_DISABLED=true`), assert byte-identical canonicalized sector dictionaries.
2. **Final-pass real-save fixture**: same as #1 but with `isFinalPass=true`.
3. **Back-to-back invocations**: two consecutive cache-on runs on identical state must produce byte-identical results (catches simple module-level leakage on identical inputs).
4. **100 deterministic state variants**: each variant deterministically toggles a small subset of brigade `status` fields (`active` → `reserve`) and runs cache-on vs cache-off. The variants vary which brigades feed `mapOsidsToCorps` per faction, exercising different cache key shapes.
5. **War-pass + final-pass split**: simulates real production's two passes per turn (`isFinalPass=false` then `=true`); the cache must NOT survive between passes.

The test asserts byte-equality on a canonicalized JSON projection of every observable sector field (`sector_id`, `corps_id`, `faction`, `length_edges`, `edge_ids`, `territory_osids`, `assigned_brigade_ids`, `reserve_brigade_ids`, `rear_brigade_ids`, every `sub_segment` field, `opposing_factions`).

The env flag `SECTOR_COLDSTART_CACHE_DISABLED=true` toggles cache ON/OFF inside `mapOsidsToCorps` so the same fixture drives both code paths in one process.

### RED-bug verification (the test catches what G1 missed)

To verify G1.5 is the right discriminator, a deliberately-broken module-level cache was wired up in a diagnostic patch (env flag `SECTOR_COLDSTART_CACHE_BROKEN=true`). With this on:

- Test 1 (pristine fixture): PASSES — both runs use the same cache state from a single fixture
- Test 3 (back-to-back identical state): PASSES — same fixture twice; stale cache from run 1 = correct cache for run 2
- **Test 4 (100 variants): FAILS on 3+ variants** — between variant N (cache-on) and variant N+1 (cache-on), the module-level cache from variant N's RBiH faction is returned for variant N+1 even though the state changed. Output shows `seed=2 firstDiff@82792`, `seed=3 firstDiff@499`, `seed=4 firstDiff@2542 (length_edges 5 vs 10)`.

Variant test fails before more than 3 divergences are reported (early-stop for readable output), proving G1.5 catches cross-call cache leakage in a way pure-G1 fundamentally cannot.

**G1.5 RED-discrimination: CONFIRMED.** The test is now permanent infrastructure.

### Pre-impl baseline run

With no cache impl on disk, the env flag is a no-op (the cache parameter is undefined inside `mapOsidsToCorps`). Test runs cleanly: 5/5 PASS, 107.98 s. This locks in G1.5 as the gate without any production impact.

---

## Phase 2 — Implementation iteration log

### Attempted impl

Per Phase A spec:

- `src/sim/combat/sector_territory.ts`: added `MapOsidsToCorpsCache` type, optional 7th `cache` parameter to `mapOsidsToCorps`. Cache hit short-circuits return. Cache write-back on compute path. Bypass on `SECTOR_COLDSTART_CACHE_DISABLED=true`.
- `src/sim/combat/corps_front_sectors.ts`: cache allocated per-invocation at top of `buildCorpsFrontSectors` body (`const osidToCorpsCache: MapOsidsToCorpsCache = new Map();`). Threaded through the 5 internal call sites at lines 488 (`assignTerritoryVoronoi:1`), 541 (`assignTerritoryVoronoi:2-post-absorb`), 1520 (`recoverDroppedFrontEdges:1`), 1687 (`recoverDroppedFrontEdges:2`), 2398 (`buildFactionSectors`). Signatures of `recoverDroppedFrontEdges` and `buildFactionSectors` extended to accept the cache.

Typecheck CLEAN. Diff size ≈ 50 LOC excluding tests, well under the 200-LOC budget.

### G1.5 result on the implementation

```
 × G1.5: cached path matches uncached path across ≥100 deterministic state variants
   → G1.5 INTEGRATION DRIFT: cache ON vs OFF differs on 3 variants:
     seed=4  firstDiff@2542  cached length_edges=5,  uncached length_edges=10
     seed=20 firstDiff@12156 (sub-segment friendly_osids divergence)
     ...
```

Variants 0–3 PASS, variant 4 FAILS. The implementation is correct as a per-invocation cache (no module-level state), but the cache key (`faction` only) is INSUFFICIENT — different intra-invocation call sites produce different `mapOsidsToCorps` results because their `formations` argument has been mutated between calls.

### Root cause — Phase A premise refuted

Inspection of the entry function (`buildCorpsFrontSectors`, line 300) reveals the call site sequence:

| # | Line | Site | When in pipeline |
|---|---:|---|---|
| 1 | 2398 | `buildFactionSectors:Step 2` | per-faction loop, BEFORE any merge / relocate / seal pass |
| 2 | 488  | `assignTerritoryVoronoi:1` | AFTER `relocateMisassignedBrigadesToTruthfulOwners`, `sealMergedSectorTruth`, multiple seals/prunes |
| 3 | 541  | `assignTerritoryVoronoi:2-post-absorb` | AFTER `absorbEmptyStaffableSiblingSectors` |
| 4 | 1520 | `recoverDroppedFrontEdges:1` | called at line 445 (mid-pipeline) |
| 5 | 1687 | `recoverDroppedFrontEdges:2` | called twice at lines 445 + 448 |

`relocateMisassignedBrigadesToTruthfulOwners` at line 432 RELOCATES brigades — it changes `formations[fid].location_osid`. So the `formations` argument that `mapOsidsToCorps` reads at site #1 is NOT the same `formations` it sees at sites #2–5. Phase 1b of `mapOsidsToCorps` (lines 146–162 of `sector_territory.ts`) reads `f.location_osid` to seed locked OSIDs:

```ts
if (!f.location_osid || !friendlyOsids.has(f.location_osid)) continue;
if (result.has(f.location_osid)) continue; // Home-based claim takes precedence
```

When a brigade has been relocated between call sites, its `location_osid` differs, locked-seed set differs, BFS expansion differs, and the returned `Map<Osid, FormationId>` differs.

**Conclusion: faction-keyed per-invocation cache is structurally unsound.** Phase A's risk assessment ("Sub-function scope: pure read-side projection of state") was correct in spirit but wrong in detail — the projection IS pure, but the input `formations` is non-stable across the pipeline.

### What WAS verified

- **Cache lifetime is per-invocation** (no module-level state, no cross-invocation leakage). Tests 1, 2, 3, 5 PASS (back-to-back invocations on identical state are byte-stable).
- **Determinism preserved**: no `Math.random` / `Date.now` / locale-sort introduced.
- **Faction-symmetric**: cache keying is identical for RBiH / RS / HRHB.
- **Typecheck clean**: TypeScript signatures correct.
- **Cache hit semantics correct**: when called with identical `formations` shape, the cached result is byte-equal to the legacy compute path.

The implementation is *correctly engineered as a per-invocation faction-keyed memoization*. The defect is in the cache *premise*, not in the cache *mechanics*.

---

## Phase 3 — Final verdict: STOP-AND-RECOMMEND

Per the lane's binding stop trigger:

> STOP-AND-RECOMMEND if: G1.5 catches the bug but you can't fix it within 25 min (means the cache architecture isn't viable — close as STOP-AND-RECOMMEND with the integration test as durable artifact)

The cache architecture as proposed in Phase A is not viable. Fixing it requires either:

(a) A finer-grained cache key that includes a fingerprint of `formations.location_osid + status + faction` per-formation (re-computation cost similar to the function this would speed up — likely net-negative), OR
(b) Narrower cache scope: cache only within a single phase between mutating pipeline steps (would require splitting the cache into "pre-relocation" and "post-relocation" caches with explicit invalidation around `relocateMisassignedBrigadesToTruthfulOwners`, `sealMergedSectorTruth`, etc. — much larger diff than 200 LOC, much higher G3 risk), OR
(c) A different optimization target entirely — e.g. structural simplification of `buildFactionSectors` or `recoverDroppedFrontEdges` directly, or memoizing a different sub-function whose inputs ARE genuinely stable across the pipeline.

None of (a), (b), (c) fit within the lane's scope or its 25-min budget. STOP-AND-RECOMMEND.

### Final state

| Artefact | Status | Commit |
|---|---|---|
| G1.5 integration property test | SHIPPED | `2277ab7e` (mis-attributed; see "Multi-agent race" below) |
| Cache impl in `sector_territory.ts` | REVERTED | n/a |
| Cache plumbing in `corps_front_sectors.ts` | REVERTED | n/a |
| 40w smoke baseline | UNCHANGED | live `e97fa6e2afbc7b19` (n1754) — substrate hash differs from Phase A's spec value `86ebf26ae0271465`, used live as G3 target per Phase A note "use the live one and document the substitution" |
| Typecheck | CLEAN | confirmed before and after revert |

Recommendation for v0.9.5+ retry (if scheduled): read this report first; abandon the `mapOsidsToCorps` memoization candidate; pursue Phase A candidate 4 (rejected for v0.9.3 but worth re-evaluating) or a structural simplification of `buildFactionSectors` body. ANY future memoization attempt MUST first pass G1.5 across the same fixture corpus before claiming G3 byte-stability.

---

## Multi-agent race note (durable lesson)

During this lane's execution, parallel agent sessions made conflicting commits on `main`. The G1.5 test file `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` was authored by this lane but ended up being committed under a parallel session's commit `2277ab7e feat(events): Cost Ledger prosecutorial authoring batch 3+4`. The file content is correct and matches this lane's authored version verbatim, but the commit attribution does not reflect the actual authoring lane.

This reproduces the recurring multi-agent race lesson recorded in `feedback_*` memory under "multi-agent race lessons" (commit `34fb8edb`). Future lanes operating concurrently on the same `main` should:

1. Use a unique worktree per lane (`using-git-worktrees` skill) — prevents working-tree contention entirely.
2. Or stage commits via `git commit -o <pathspec>` immediately after writing each artefact, before any other tool call that might trigger a parallel session's index lock.

For this lane: G1.5 was successfully landed despite mis-attribution; no rework needed.

---

## Sensitive-history compliance assertion

- **Ring 1**: only test code + this report were authored. Cache impl was authored and reverted (no commit).
- No §6 surface (no rupture, atrocity, enclave-defense codepath).
- No FORAWWV touch.
- No paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.
- Faction-symmetric: G1.5 covers all factions equally; impl was identical for all factions.
- Determinism preserved: no source code remains from the impl attempt.

## Files committed (this lane)

| File | Status | Commit |
|---|---|---|
| `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` | committed (mis-attributed) | `2277ab7e` |
| `docs/40_reports/implemented/20260509_V094_SECTOR_COLDSTART_V2.md` | TO BE COMMITTED | this lane |

## Files NOT touched (per spec)

- `src/sim/combat/sector_territory.ts` — cache impl REVERTED, file is byte-identical to `33f78431`-lineage baseline.
- `src/sim/combat/corps_front_sectors.ts` — cache plumbing REVERTED, file is byte-identical to baseline.

## Gate verdicts

| Gate | Result |
|---|---|
| AC-G1 (existing 10,000-trial property test) | n/a — not run; the function-level test was deleted as part of Phase B rollback and not recreated this lane |
| **AC-G1.5** (new integration property test, ≥100 fixtures) | **SHIPPED** as durable artefact; PASSES at baseline (no impl on disk). RED-discrimination CONFIRMED |
| AC-G2 (env-flag parity wrapper `SECTOR_COLDSTART_PARITY_CHECK=true`) | n/a — no impl shipped |
| **AC-G3** (40w hash byte-stable to baseline) | **N/A — no impl shipped.** Baseline `e97fa6e2afbc7b19` (n1754) preserved untouched |
| AC-determinism | preserved (no source code remains) |
| AC-no-new-state | preserved (no source code remains) |
| AC-faction-symmetric | n/a |
| AC-typecheck-clean | CLEAN (verified at every step) |
| AC-vitest-clean | partial (G1.5 PASSES baseline; full vitest not re-run since no impl shipped) |
| AC-Ring-1 | preserved |
| AC-anchors-unchanged | n/a (no impl) |

**Final verdict: STOP-AND-RECOMMEND with G1.5 as durable artifact.**
