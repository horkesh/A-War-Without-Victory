# Sector Cold-Start Phase A Consult — Verdict + Phase B Dispatch Plan

**Lane:** LANE-NIGHTSHIFT-V093-SECTOR-COLDSTART-PHASE-A-CONSULT
**Date:** 2026-05-08
**Type:** Audit-only (Ring 1, no §6, no source-code changes)
**Predecessors:**
- `ce72fc40` `feat(perf): sector-partition step instrumentation + spike characterization`
- `e33c2a09` `docs(perf): sector-partition 188w spike characterization data`
- `6f378afd` Phase 0 perf panel (LANE B = `brigade_assignment` + sector-partition NOT-DISPATCHABLE-WITHOUT-CONSULT)
- LANE-D streaming closeout (`6756ed68`, `0c9c44e1`, `834f59f9`) — current baseline lineage on `main`.

**Mandate:** v0.9.3 ship-readiness. Phase 0 panel named LANE B not-dispatchable-without-sector-expert-consult. This file IS that consult.

---

## TL;DR — verdict

**DISPATCHABLE-WITH-PLAN.**

A single, faction-symmetric, structurally simple optimization is available within the cold-start band:

> **Memoize `mapOsidsToCorps(state, faction, corpsIds, adjacency, formations, reverseMap)` per `buildCorpsFrontSectors` invocation.**
> Today `mapOsidsToCorps` is called **5 times** inside one invocation (lines 478, 531, 1510, 1677, 2385 of `corps_front_sectors.ts`), once each in `assignTerritoryVoronoi:1`, `assignTerritoryVoronoi:2-post-absorb`, `recoverDroppedFrontEdges:1` + `:2` (re-derived per-call inside the helper), and the per-faction `buildFactionSectors` body. Inputs (state.political_controllers, formations, corpsIds, adjacency) are invariant across the lifetime of a single `buildCorpsFrontSectors` call. The function does substantial BFS + brigade-iteration work — it is faction-scoped and is the single most repeated heavy helper in the cold-start band.

Estimated speedup: **20–35% reduction in cold-start (turns 0–9) sector-partition cost** at p95 (1568 ms → ~1100–1250 ms); **5–10%** at steady-state median (~616 ms → ~555 ms). Calibration risk: **LOW** — the function is a pure read-side projection of state, the parity wrapper trivially asserts byte-equality of the returned `Map<Osid, FormationId>`, and the optimization adds no new persisted state.

Three additional candidates are listed below, ranked, but the top-1 is the only one I'd ship in v0.9.3. Candidates 2/3 are deferred behind candidate 1's hash-stability proof.

---

## Phase A read-set executed

| File | What I needed | Outcome |
|---|---|---|
| `docs/40_reports/implemented/20260506_SECTOR_PARTITION_INSTRUMENTATION.md` | confirm cold-start narrative; spike pattern hypothesis; per-sub-function cost decomposition | confirmed (see §1) |
| `docs/40_reports/audits/20260506_V093_PERF_PHASE_0_PANEL.md` | binding 15 ACs + 7 stop triggers; LANE B's "no per-callsite measurement" objection | confirmed; LANE B's objection is precisely what `ce72fc40`+`e33c2a09` resolved |
| `src/sim/combat/corps_front_sectors.ts` (2805 lines) | entry point + buildFactionSectors + recoverDroppedFrontEdges body | read |
| `src/sim/combat/sector_territory.ts` (1001 lines) — `mapOsidsToCorps` | the dominator-within-the-dominator | read |
| `src/sim/combat/sector_splitting.ts` (684 lines) | confirm sub-segment sacred rules | scanned |
| `src/sim/combat/sector_building.ts` (520 lines) | `buildMultiSectorsForCorps` shape | scanned |
| `.claude/skills/sector-expert/SKILL.md` | sacred rules / pitfalls / file ownership | read |
| `data/derived/_debug/sector_partition_perf.jsonl` | (gitignored) — spike data is reproduced inside the instrumentation report tables; raw jsonl unnecessary for Phase A audit | confirmed via report |
| `git log --since="2026-05-06" -- src/sim/combat/corps_front_sectors.ts src/sim/combat/sector_*.ts` | substrate stability check | **zero changes** since 2026-05-06 — substrate stable |

---

## 1. Cold-start narrative confirmation

**The cold-start narrative is real, not an instrumentation artifact.** Evidence from the instrumentation report:

| Signal | Value |
|---|---|
| Mean per-turn cost (188w, 144 turns sampled) | 766 ms |
| Median per-turn cost | 616 ms |
| p95 per-turn cost | 1568 ms |
| Max per-turn cost (turn 1) | 4934 ms |
| Spike ratio max/mean | 6.44× |
| Spike ratio max/min | 14.6× |
| **Top-10 spike turns** | **ALL turns 0–9** |
| Mid-run spikes (turn ≥10) | none above 2× mean |

The smooth decay curve (turn 0: 4173 ms → turn 9: 1396 ms → turn 10: ~600 ms) is the signature of a **pure cold-start** profile, not a topology-event-triggered spike pattern. The hash-byte-stability check (instrumentation flag-on vs flag-off) confirms the measurement is non-perturbing.

**Refutations already documented and confirmed:**
- Sector merges? `mergeSmallAdjacentSectors` and `mergeLateSiblingFrontFragments` are <2% cumulative each, not driving the spikes.
- Late-run brigade redistribution? No turn after 9 exceeds 2× mean.
- Faction-specific spike? Faction cost share is proportional throughout (RBiH 47.4% > RS 38.3% > HRHB 14.3%, matching brigade count + contested-front length).

**My addition:** the 5.45× spike at turn 0 PLUS the 6.44× spike at turn 1 (where both war-pass and final-pass run) is consistent with the absence of any reuse cache between calls within a turn. Every helper recomputes `friendlyOsids`, `componentOf`, `osidToCorps`, etc., from scratch on each call. **The cold-start cost is NOT inherent to the algorithm — it is inherent to the call-multiplicity × no-cross-call cache combination.**

---

## 2. Per-sub-function cost decomposition

Top-15 hot sub-functions (cumulative across 144 turns, from instrumentation report Phase 2):

| Rank | Sub-function | Cum ms | % | Calls | ms/call |
|---|---|---:|---:|---:|---:|
| 1 | `buildFactionSectors:RBiH` | 16715 | 15.2% | 209 | 79.98 |
| 2 | `buildFactionSectors:RS` | 13703 | 12.4% | 209 | 65.57 |
| 3 | `recoverDroppedFrontEdges:1` | 6182 | 5.6% | 209 | 29.58 |
| 4 | `recoverDroppedFrontEdges:2` | 5314 | 4.8% | 209 | 25.43 |
| 5 | `buildFactionSectors:HRHB` | 5147 | 4.7% | 209 | 24.63 |
| 6 | `enforceFinalSectorGeometryInvariants:1` | 4364 | 4.0% | 209 | 20.88 |
| 7 | `sealMergedSectorTruth:1` | 4346 | 3.9% | 209 | 20.80 |
| 8 | `enforceFinalSectorGeometryInvariants:2` | 3825 | 3.5% | 209 | 18.30 |
| 9 | `applyFinalSectorOwnerTruthPass:1` | 3648 | 3.3% | 209 | 17.45 |
| 10 | `sealMergedSectorTruth:4` | 3597 | 3.3% | 209 | 17.21 |

`buildFactionSectors:*` (32.3% combined) and `recoverDroppedFrontEdges:*` (10.4% combined) account for **42.7%** of all cumulative cost. The next 13 named buckets each cost ≤4%.

### Hot-loop dissection inside the top two

#### `buildFactionSectors` (line 2366)

Runs once per faction. Per-faction cost order of operations (~80 ms/call mean, RBiH; up to ~600 ms/call during spike turns 0–7):

1. Step 2: **`mapOsidsToCorps`** — iterates all formations, BFS-floods OSIDs from brigade home / location seeds. (heavy)
2. Step 3 + 3b + 3c: `partitionFrontEdges` + `consolidateCrossCorpsFronts` + `consolidateIsolatedCorpsPockets` (medium)
3. friendlyOsids / preComponentOf / brigade-component-set construction (cheap when SpatialContext provides them, otherwise medium)
4. Step 4 loop: `buildMultiSectorsForCorps` per corps + `canCorpsStaffSectorFront` per sector candidate (medium)
5. Step 4d: undersized corps merge loop with `areSectorsTerritoryAdjacent` + `areSectorsFrontEdgeAdjacent` checks (cheap, but iterative)
6. Step 5: `assignTerritoryVoronoi` (medium)
7. Step 5b: `repairDisconnectedTerritory` (medium)
8. Step 6/6b/7/8: brigade classification + cross-corps enclave + min-coverage + reclassify-rear + commander overrides (cheap to medium)

**Key observation:** `mapOsidsToCorps` is invoked once per `buildFactionSectors` call (line 2385), AND again twice in `recoverDroppedFrontEdges` (lines 1510 + 1677), AND twice more in the `assignTerritoryVoronoi:1` and `:2-post-absorb` blocks (lines 478, 531). **That's 5 calls per faction per `buildCorpsFrontSectors` invocation.** With 3 factions and 2 invocations per turn (war-pass + final-pass), that's up to **30 `mapOsidsToCorps` calls per turn**, each redoing identical work on identical inputs (state.political_controllers + formations + corpsIds + adjacency don't mutate within an invocation).

#### `recoverDroppedFrontEdges` (line 1491)

Called twice per invocation (lines 435 + 438) by design — first call recovers, then `sealMergedSectorTruth:3` + `pruneGhostArtifactSectors:2` run, then second call recovers again. The body iterates factions and inside the body builds:
- `mapOsidsToCorps` (heavy, line 1510)
- `partitionFrontEdges` + `consolidateCrossCorpsFronts` + `consolidateIsolatedCorpsPockets` (medium)
- `friendlyOsids` (clones spatial cache when present) (cheap)
- `componentOf` (clones spatial cache when present) (cheap)
- `factionBrigadeLocations` + `factionBrigadeComponents` (formation iteration, cheap)
- per-corps brigade iteration + `findSubSegments` (medium)
- if `recoveredAny`: `mapOsidsToCorps` AGAIN (line 1677) + `assignTerritoryVoronoi` + `repairDisconnectedTerritory` + `classifyBrigadesByTerritory` + ...

The two `mapOsidsToCorps` calls inside `recoverDroppedFrontEdges` are doing exactly the same work as the call already done by `buildFactionSectors` minutes earlier (literally microseconds earlier in process time, but the result was thrown away).

---

## 3. Sector-expert risk assessment

The sector-expert SKILL document and `docs/life_lessons/sectors.md` (loaded inline via SKILL) define the invariants this lane MUST preserve:

| Sacred rule | Applies to candidate? | Mitigation |
|---|---|---|
| Territory contiguity (shared-boundary only) | NO — `mapOsidsToCorps` returns OSID→corps mapping, not territory; territory contiguity is enforced downstream by `repairDisconnectedTerritory` | n/a |
| Adjacency threshold hierarchy | NO — `mapOsidsToCorps` consumes the full `adjacency` (passed in) and never recomputes a threshold | n/a |
| Pipeline ordering (partition → assign-subseg → distribute → recompute-ratings) | NO — memoization is internal to one pipeline step, doesn't reorder | n/a |
| Sub-segment IDs use `sector_id` not `corps_id` | NO — orthogonal | n/a |
| `else if (meta.side_b === faction)` blind spot | NO — function doesn't touch sub-segment splitting | n/a |
| `brcko_2` structural orphan | NO — the orphan is a coverage gap upstream of `mapOsidsToCorps` | n/a |
| Determinism: no `Math.random`/`Date.now` | YES — ban on memoization key construction | use deterministic key (see §4) |
| Sorted iteration via `strictCompare` | YES — `mapOsidsToCorps` returns a Map; iteration order over the Map is preserved by V8, but the *contents* (key-set, value-per-key) must be byte-stable | Property test asserts the Map is structurally identical |
| No new persisted state | YES — cache must be per-invocation ephemeral | use a closure-scoped Map keyed by `faction`; cleared at end of `buildCorpsFrontSectors` |

**Conclusion:** memoizing `mapOsidsToCorps` does NOT touch any of the sacred sector rules. It is a pure read-side memoization. Risk class: **LOW**.

---

## 4. Specific optimization candidates (ranked safety × impact)

### Candidate 1 (TOP, DISPATCHABLE) — per-invocation memoization of `mapOsidsToCorps`

| Field | Value |
|---|---|
| Hot-path location | `src/sim/combat/sector_territory.ts:44` (function body); call sites at `corps_front_sectors.ts:478, 531, 1510, 1677, 2385` |
| Nature of fix | Wrap the function with a per-`buildCorpsFrontSectors`-invocation memoization cache keyed by `faction` (corpsIds, adjacency, formations, reverseMap, state are all invariant within one invocation, so `faction` alone is a sufficient cache key). Cache lives in a module-scoped `WeakMap` or in a context object passed down through the pipeline. |
| Estimated speedup | Cold-start (turns 0–7): saves 3 × 5 redundant calls = up to ~150–500 ms per spike turn. Steady-state: ~30–60 ms per turn. **Cold-start band: 20–35% reduction. Steady-state: 5–10% reduction.** |
| Calibration risk class | **LOW** |
| Diff size estimate | ~80–120 LOC (function refactor + parity wrapper + cache plumbing) — well under AC-diff-size 200 LOC budget |
| Substrate-conflict risk | none — `corps_front_sectors.ts` has had zero changes since 2026-05-06 (verified via `git log`). LANE-D streaming work shipped on `final_save.json` write-side, doesn't touch sector partition. |

### Candidate 2 (DEFER) — `friendlyOsids` per-invocation memoization

| Field | Value |
|---|---|
| Hot-path | `corps_front_sectors.ts:475–477, 528–530, 542–544, 1514–1516, 1671–1673, 1799–1801, 2400–2413` (7 separate sites that each rebuild a `Set<string>` from political_controllers) |
| Nature | Same memoization pattern as candidate 1, keyed by faction. SpatialContext already provides this in the parent pipeline; the issue is *re-cloning* into a fresh Set on each helper site. |
| Estimated speedup | 5–10 ms/turn aggregate. Smaller than candidate 1 because individual call cost is lower. |
| Calibration risk | LOW |
| **Status** | **DEFER until candidate 1's hash-stability proof.** Bundling multiplies risk. |

### Candidate 3 (DEFER) — `recoverDroppedFrontEdges` first-pass-result reuse for second pass

| Field | Value |
|---|---|
| Hot-path | `corps_front_sectors.ts:435 + 438` (`recoverDroppedFrontEdges:1` and `:2`) — second call duplicates first call's `osidToCorps` + `corpsEdges` + `consolidateCrossCorpsFronts` + `consolidateIsolatedCorpsPockets` work, only re-running because `sealMergedSectorTruth:3` and `pruneGhostArtifactSectors:2` may have invalidated some sectors in between. |
| Nature | Pass a "first-pass scratchpad" between the two calls so `:2` doesn't re-derive what `:1` already computed (only re-derives what the seal+prune changed). |
| Estimated speedup | 10–20 ms/turn aggregate (saves the redundant ~25 ms/call × maybe-half-of-it). |
| Calibration risk | **MEDIUM** — second call's full re-derivation is partly intentional defensive recompute; aliasing scratchpads risks staleness if sealMergedSectorTruth:3 invalidated state the scratchpad still holds. |
| **Status** | **DEFER until candidate 1's hash-stability proof.** |

### Candidate 4 (REJECT for v0.9.3) — `buildFriendlyComponents` cross-faction reuse

| Field | Value |
|---|---|
| Why rejected | SpatialContext already exposes `componentsByFaction.get(faction)` and the helper sites already prefer that. Re-deriving `buildFriendlyComponents(adjacency, friendlyOsids)` happens only in the backward-compat branch when `spatial` is undefined — which is the test/standalone path, not the production runner path. |
| **Status** | **NO ACTION — already optimal in production.** |

---

## 5. Optimization plan for Candidate 1

### G1 — Property test design

`tests/sector_partition_map_osids_to_corps_property.test.ts` (NEW).

10,000 randomized configurations (deterministic LCG seed):

- 50–500 OSIDs per fixture
- 2–6 corps per faction
- 5–60 brigades per fixture, randomized home_osid + location_osid
- random political_controllers map (each OSID 0/1/2/3 = unowned/RBiH/RS/HRHB)
- random reverseMap (some OSIDs have municipality alias keys)
- adjacency map randomized but connected per faction-component

**Per fixture:**
1. Call legacy `mapOsidsToCorps(state, faction, corpsIds, adjacency, formations, reverseMap)` → `legacyMap`
2. Call memoized version through the same call site twice; first call populates cache, second call hits cache → `firstMap`, `cachedMap`
3. Assert: `legacyMap.size === firstMap.size === cachedMap.size`
4. Assert: for every key, `legacyMap.get(k) === firstMap.get(k) === cachedMap.get(k)` (string equality on FormationId)
5. Assert: deterministic iteration order — `[...firstMap.keys()].join(",")` byte-equal to `[...legacyMap.keys()].join(",")` after both are stably sorted via `strictCompare`

10,000 trials must ALL pass. Single divergence → `ST-G1-drift` — debug-fix-retest until G1 passes.

### G2 — Production parity wrapper

Env flag: `SECTOR_COLDSTART_PARITY_CHECK=true`.

When ON, the memoized site re-runs the legacy `mapOsidsToCorps` (uncached path) per call and asserts byte-equality against the cached return. Throws with full input dump (`faction`, `corpsIds`, `formations.size`, first-divergent-key) on first divergence.

When OFF (production default), zero overhead — wrapper is a single boolean check at the cache hit site.

### G3 — Byte-stability target

40w `final_state_hash` byte-identical to **post-LANE-D current `main` baseline** (`6756ed68` lineage).

> **Note on baseline hash spec:** the user-supplied spec names the target hash as `86ebf26ae0271465`. I could not locate that exact hash in my read-set on disk; the most recently confirmed post-LANE-D 40w hash in the audit reports is implicit in the `0c9c44e1` and `6756ed68` lane closeouts. **Phase B agent must confirm the live `npm run sim:scenario:run:40w` baseline hash from a fresh local run BEFORE making any code changes.** If it differs from `86ebf26ae0271465`, use the live one as the G3 target and document the substitution in the lane closeout. Hash-identity to *the actual current main baseline* is what matters; the literal value `86ebf26ae0271465` is informational.

Plus:
- 26/27 anchors hold (only brcko volatile, per project-memory baseline)
- 6/6 benchmarks GREEN
- 188w smoke does NOT regress against current LANE-D heap profile

### Diff-size budget

Estimated 80–120 LOC excluding tests:
- ~30 LOC: `mapOsidsToCorps` signature change to accept an optional cache argument (or a context object)
- ~20 LOC: cache plumbing inside `buildCorpsFrontSectors` (declare cache, pass to all 5 callers)
- ~30 LOC: parity wrapper + env-flag check
- ~10–20 LOC: minor types / exports

Well under AC-diff-size 200 LOC budget. No justification narrative needed.

---

## 6. Stop triggers (lane-specific)

| ID | Trigger | Action |
|---|---|---|
| ST-G1-drift | Property test catches divergence on ANY of 10,000 trials | Debug-fix-retest until G1 passes; do NOT proceed to G2/G3 |
| ST-G3-drift | 40w `final_state_hash` drifts from current main baseline | **ROLL BACK before commit** (Tarjan precedent at `a60d39c9` is the discipline reference) |
| ST-anchor-regression | Any non-brcko anchor flips (vs the 26/27 hold from `a2a51d4a9994a7f5`) | ROLL BACK |
| ST-benchmark-regression | <5/6 benchmarks GREEN | ROLL BACK |
| ST-substrate-conflict | Lane requires changes outside the named sector-partition surface (`corps_front_sectors.ts` + `sector_territory.ts`) | **STOP-AND-RECOMMEND scope re-narrowing** |
| ST-188w-OOM-regressed | 188w smoke OOMs at lower memory than pre-impl, or at earlier turn | STOP — investigate before commit (memory profile likely unchanged because cache is per-invocation ephemeral, but verify) |
| ST-active-substrate-conflict | While the lane is in flight, another lane lands a change to `corps_front_sectors.ts` or `sector_territory.ts` | rebase against new substrate; re-run G3 from new baseline |

---

## 7. Verdict — DISPATCHABLE-WITH-PLAN

Phase B is dispatchable as a single G1+G2+G3-gated optimization implementation lane, owned by `/sector-expert` (with `/performance-engineer` as secondary reviewer for the parity wrapper hot-path discipline).

### Phase B agent dispatch prompt (verbatim)

```
LANE-NIGHTSHIFT-V093-SECTOR-COLDSTART-PHASE-B-IMPL

You are dispatched to implement candidate 1 from
docs/40_reports/audits/20260508_V093_SECTOR_COLDSTART_PHASE_A_CONSULT.md:
per-invocation memoization of mapOsidsToCorps inside buildCorpsFrontSectors.

Owner: sector-expert (file ownership in .claude/skills/sector-expert/SKILL.md
covers both src/sim/combat/corps_front_sectors.ts and
src/sim/combat/sector_territory.ts).

MANDATORY READING (in order):
1. docs/40_reports/audits/20260508_V093_SECTOR_COLDSTART_PHASE_A_CONSULT.md
   (THIS lane's Phase A audit — verdict + plan)
2. docs/40_reports/implemented/20260506_SECTOR_PARTITION_INSTRUMENTATION.md
   (predecessor instrumentation — flag PERF_PROFILE_SECTOR_PARTITION will
   reproduce per-call timing if you need before/after sub-function deltas)
3. .claude/skills/sector-expert/SKILL.md
4. docs/life_lessons/sectors.md

IMPLEMENTATION SURFACE (exclusive ownership):
- src/sim/combat/sector_territory.ts (mapOsidsToCorps signature change)
- src/sim/combat/corps_front_sectors.ts (cache plumbing at 5 call sites:
  lines 478, 531, 1510, 1677, 2385)
- tests/sector_partition_map_osids_to_corps_property.test.ts (NEW)

NO CHANGES TO ANY OTHER FILE. If the lane requires a change outside this
surface, STOP and report ST-substrate-conflict; do not bundle.

GATE PLAN (mandatory, sequential):

G1 — Property test: ≥10,000 randomized trials, deterministic LCG seed.
     Legacy vs memoized return must be byte-identical (Map size + every
     key/value pair). Cache hit must equal cache miss must equal legacy.
     ALL trials must pass. Any divergence = ST-G1-drift; debug-fix-retest.

G2 — Production parity wrapper: env flag SECTOR_COLDSTART_PARITY_CHECK=true
     re-runs uncached path on every cache hit and asserts byte-equality.
     Throws with full input dump on first divergence. Default-OFF zero cost.

G3 — Byte-stability: 40w final_state_hash byte-identical to current main
     baseline. CONFIRM CURRENT BASELINE HASH FROM FRESH LOCAL RUN before
     making any code change. If it differs from 86ebf26ae0271465 (the spec
     value), use the live one and document the substitution.
     Plus: 26/27 anchors hold (brcko volatile only). 6/6 benchmarks GREEN.

PRE-FLIGHT ACS (binding):
- AC-determinism: no Math.random / Date.now / new Date / locale-sort
- AC-no-new-state: cache is per-invocation ephemeral, cleared at function exit
- AC-faction-symmetric: cache key is faction-scoped; mechanism is identical
  for RBiH / RS / HRHB
- AC-diff-size: ≤200 LOC excluding tests
- AC-typecheck-clean: npx tsc --noEmit
- AC-vitest-clean: npm run test:vitest GREEN
- AC-Ring-1: no §6 surface, no FORAWWV, no paint anchor / political_controllers
  data / OOB / rupture-wiring / enclave_resilience.ts

STOP TRIGGERS (mandatory):
- ST-G1-drift: any property test divergence → debug-fix-retest, do not proceed
- ST-G3-drift: 40w hash drift → ROLL BACK before commit (Tarjan precedent
  at a60d39c9 is the discipline reference)
- ST-anchor-regression: any non-brcko anchor flip → ROLL BACK
- ST-benchmark-regression: <5/6 benchmarks → ROLL BACK
- ST-substrate-conflict: file outside the named surface → STOP, report
- ST-188w-OOM-regressed: 188w heap regresses → STOP, investigate
- ST-active-substrate-conflict: sibling lane lands on the named surface
  while this lane is in flight → rebase + re-run G3

EVIDENCE TO PRODUCE:
- 40w final_state_hash before AND after (must be byte-identical)
- Anchor count (26/27 expected, brcko volatile)
- Benchmark count (6/6 expected)
- Property test output (10,000 trials, all pass)
- Optional but recommended: re-run instrumentation
  (PERF_PROFILE_SECTOR_PARTITION=true) before AND after to confirm
  expected ~20–35% cold-start band reduction; document in closeout

COMMIT MESSAGE FORMAT:
perf(sectors): per-invocation memoization of mapOsidsToCorps
              (LANE-NIGHTSHIFT-V093-SECTOR-COLDSTART-PHASE-B-IMPL)

DELIVERABLE: a single commit shipping source + property test + lane report
in docs/40_reports/implemented/. DO NOT push. Parent will review evidence
and decide push.
```

---

## Sensitive-history compliance assertion

- **Ring 1**: only artefact authored by this lane is THIS audit file.
- No §6 surface (no rupture-event, atrocity-recording, enclave-defense codepath).
- No FORAWWV touch.
- No paint anchor / political_controllers / OOB JSON / rupture-wiring / `enclave_resilience.ts` touch.
- No source code or test code edited.
- Determinism preserved (no source code).

## Files committed (this lane)

- `docs/40_reports/audits/20260508_V093_SECTOR_COLDSTART_PHASE_A_CONSULT.md` (THIS file, NEW)

## Files NOT touched (per spec)

- All source / test / scenario / canon code. Verified by holding the audit to read-only.
