# v0.9.3 Perf Optimization Phase 0 Panel — audit + G1+G2+G3-gated lane plan

**Lane:** LANE-NIGHTSHIFT-PERF-OPTIMIZATION-PHASE-0-PANEL
**Date:** 2026-05-06
**Type:** Audit-only — Ring 1 — read-only investigation. NO source code changes.
**Sensitive-history compliance:** Ring 1 (audit + plan only). No §6 surface, no FORAWWV, no paint anchor / political_controllers / OOB / rupture-wiring / enclave_resilience.ts.
**Mandate:** v1.0 ship-readiness sprint, user-authorized 2026-05-06.
**Scope artefact:** this file only.

## Predecessor context (read first)

- `406b0749` `perf(audit): Tier 2 perf instrumentation — empirical delta measurement (LANE-NIGHTSHIFT-TIER-2-PERF-INSTRUMENTATION-REDO)` — Tier 2 instrumentation lane shipped empirical hot-path data. Report: `docs/40_reports/audits/20260505_TIER_2_PERF_PROFILE.md`.
- `cbd6a0fb` Wave 9 STOP-AND-ASK on bot-orders pipeline diffuse cost (~562 ms/turn). Report: `docs/40_reports/audits/20260505_DIVERGENCE_EVENTS_WAVE_9.md` (sibling-race incident — index drop). The relevant durable lesson is in `docs/PROJECT_LEDGER_KNOWLEDGE.md`.
- `a60d39c9` `perf(supply): replace per-edge BFS-removal with single-pass Tarjan in deriveCorridorsOsid (LANE-NIGHTSHIFT-SUPPLY-OSID-A0-TARJAN-WITH-GATES)` — canonical example of G1 property test (10,000 trials) + G2 production parity wrapper behind opt-in env flag + G3 hash-identity smoke (40w byte-stable to baseline). Tests: `tests/supply_bridge_finding_property.test.ts` + `tests/supply_bridge_finding_tarjan.test.ts`. Parity wrapper: `src/state/supply_state_derivation.ts:findBridgesInSubgraphOsidWithParity`.
- `docs/40_reports/audits/20260503_PERF_BASELINE_ROUND2.md` — full 40w per-step profile (n1626, hash `876597582e7ae8f7`, 510 MB peak RSS).
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` lines 11 + 13 — durable lessons:
  - **Phase 0 STOP-AND-RECOMMEND is a valid outcome when no clear hotspot dominates.**
  - **Hot-phase optimization that previously failed hash-identity ships only with G1+G2+G3 gate discipline.**
- 188w heap-OOM observation from this trip session: 4 GB OOM at ~12 min into 188w; 12 GB needed. Memory accumulation is a real signal at long horizons; replay log + AAR streaming are likely accumulators (n1690 ops file: 15,078 lines / 188w; n1691: 11,399 lines / 188w).

---

## PHASE 1 — empirical data (Tier 2 instrumentation report)

### 40w per-step cost (Round 2 baseline n1626, hash `876597582e7ae8f7`)

| Rank | Phase | Total ms / 40w | Mean ms / turn | % of run |
|---|---|---:|---:|---:|
| 1 | `supply-osid` | 22,499 | 562.5 | 18.2% |
| 2 | `generate-bot-corps-orders` | 12,708 | 317.7 | 10.3% |
| 3 | `generate-bot-brigade-orders` | 9,757 | 243.9 | 7.9% |
| 4 | `reconcile-final-sector-truth` | 9,235 | 230.9 | 7.5% |
| 5 | `partition-corps-front-sectors` | 8,697 | 217.4 | 7.0% |
| 6 | `update-displacement` | 5,023 | 125.6 | 4.1% |
| 7 | `update-sustainability` | 4,836 | 120.9 | 3.9% |
| 8 | `reconcile-final-sector-truth-after-ops` | 4,653 | 116.3 | 3.8% |
| 9 | `phase-f-displacement` | 3,640 | 91.0 | 2.9% |
| 10 | `paramilitary-detect` | 2,921 | 73.0 | 2.4% |

**Top-5 cumulative ≈ 51% of per-turn budget. Per-turn mean: 3,094 ms. Target: <100 ms / turn (31× speedup gap).**

### Tier 2 measurement post-Wave-7 cache + Wave-8 inner-loop optimization (n1660, hash `ef03ab4d6c5ecd28`)

`analyzeFactionGraph` (which dominated the bot-orders pipeline at 63.3% in Wave 5) reduced from per-call mean **66.3 ms → 14.2 ms** (~78% cut), and total cost across all sites **15,908 ms → 2,606 ms** (~84% cut over 40w). The bot-orders pipeline outer wrapper estimate post-Wave-8 is **~229 ms/turn** (vs the original 562 ms/turn baseline — naive subtraction; full outer-wrapper re-instrumentation deferred). `bot_brigade_ai_osid` callsite total: **7,910 ms → 3 ms** (cache hit ceiling).

### Tier 2 successor handoff candidates (named in the Tier 2 report)

1. `executeFactionDirectives` (`src/sim/combat/bot_brigade_ai_osid.ts:348`) — Wave 5 measured **1,705 ms / 40w total** (mean 14.2 ms / call across 120 calls). Now the next-largest single hotspot inside `generateAllBotOrdersOsid` after analyzeFactionGraph dropped.
2. `runCommanderForCorps` (`src/sim/combat/commander/commander_loop.ts:141`) — Wave 5 measured **2,179 ms / 40w total** across 666 calls. Separate ownership boundary (commander loop, not bot-orders core).
3. Paramilitary cache investigation — `paramilitary_sweep` is the deliberately uncached site; per-call ~13.7 ms × 60 calls = 823 ms / 40w. Routing it through the existing cache previously caused G3 drift; structural deferral.
4. Full pipeline outer-wrapper re-instrumentation (mirror Wave 5's coverage of `generateAllCorpsOrders` + `generateAllBotOrdersOsid`).

### 188w memory accumulation

No dedicated heap profile artefact exists on disk. Available indirect signal:
- **Trip-session 188w runs OOMed at 4 GB after ~12 min**; 12 GB needed to complete 188w. Indicates super-linear retention vs turn count (40w = 510 MB → 188w extrapolated linearly = ~2.4 GB; observed need is ~5×).
- `n1690` operation_aars file: **15,078 lines / 188w** = ~80 lines/turn (override-on variant). `n1691`: 11,399 lines = ~60 lines/turn. `weekly_report.jsonl`: 188 lines / 188w = monotonic-but-tiny (stream-friendly).
- `final_save.json` typically grows turn-over-turn (unit positions, sector aggregates) but is replaced on save, not appended.

**Diffuse cost categories (post-Wave-8):** the bot-orders pipeline is now diffuse — no single-function dominator after analyzeFactionGraph was tamed. The 40w pipeline-level top-2 (`supply-osid` at 562 ms/turn and the bot-orders cluster) already had their primary dominators optimized. Remaining cost is distributed across ≥6 named functions (executeFactionDirectives, commander loop, briefing builder, predictor, reconcileFinalSectorTruth, partitionCorpsFrontSectors).

---

## PHASE 2 — candidate optimization lanes (3-5)

For each: previous-failure history, dominator-vs-diffuse classification, estimated speedup, implementation surface, G1+G2+G3 gate plan, risk class.

### LANE A — bot-orders pipeline successor (`executeFactionDirectives` + `runCommanderForCorps`)

| Field | Value |
|---|---|
| Previous hash-identity failure? | NO direct failure on these functions, but the parent pipeline has Wave 9 STOP-AND-ASK precedent for diffuse cost. |
| Dominator vs diffuse? | **DIFFUSE** post-Wave-8. Tier 2 successor handoff explicitly flags both as next-largest, but neither alone dominates. `executeFactionDirectives`: 14.2 ms/call mean × 120 calls = 1.7 s / 40w (~43 ms/turn). `runCommanderForCorps`: 2.2 s / 40w across 666 calls (~55 ms/turn, mean ~3.3 ms/call). |
| Estimated speedup | Conservative: 30–50% on each function = **30–50 ms/turn**. Aggregate pipeline: 229 → ~150 ms/turn. Useful but not a 31× lift. |
| Implementation surface | Cross-cutting: brigade-decision loop + commander step inputs + briefing builder. ≥3 files. |
| G1 plan | Property test against legacy implementations: 10,000 randomized corps / brigade / objective configurations; assert order-equivalent directive output (set equality on planned actions, with strictCompare-stable ordering). |
| G2 plan | Opt-in env flag (`BOT_ORDERS_PARITY_CHECK=true`) re-runs legacy and asserts identity per turn. Default-off zero cost. |
| G3 plan | 40w byte-stable to current baseline n1660 (`ef03ab4d6c5ecd28`). |
| Risk class | **MEDIUM-HIGH**. Diffuse cost is a STOP-AND-RECOMMEND signal per durable lesson. **Phase 0 verdict: requires instrumentation pre-work** (Tier 2's "successor handoff #4" — full outer-wrapper re-instrumentation that names specific sub-dominators inside `executeFactionDirectives` and `runCommanderForCorps`). |
| **Phase 0 status** | **NOT IMMEDIATELY DISPATCHABLE.** Needs instrumentation lane first. |

### LANE B — `brigade_assignment` iteration (Phase B distribution)

| Field | Value |
|---|---|
| Previous hash-identity failure? | UNKNOWN — not in the Tier 2 named-targets set. The "sector-anchored launch contract" (n1281) and Phase B sector-assigned brigade derivation are in the same file family and have a strong anchor coupling. |
| Dominator vs diffuse? | **NOT MEASURED.** Phase B distribution is invoked from `partition-corps-front-sectors` (217 ms/turn, rank 5) and from sector reconciliation. No per-function callsite measurement exists. |
| Estimated speedup | Cannot estimate without instrumentation. The 1,188 ms spike in `partition-corps-front-sectors` (max/min ratio 7.7×) suggests a state-conditional hot path; if it lives in brigade_assignment iteration, optimization could trim 50–200 ms/turn at peak. |
| Implementation surface | `brigade_assignment.ts`, `brigade_front_distribution.ts`, `corps_front_sectors.ts`. Sector ownership boundary (must consult `/sector-expert` before any change). |
| G1 plan | Property test 10,000 randomized OSID/sector/brigade-roster configurations; assert assignment-set equality (brigade → sector mapping) AND density-residual identity. |
| G2 plan | `BRIGADE_ASSIGNMENT_PARITY_CHECK=true` env flag re-runs legacy mapping per turn and asserts identity. |
| G3 plan | 40w byte-stable. **Plus: 25/27 anchors held — brcko/gradacac_2 already failing pre-existing.** Anchor regression beyond pre-existing FAILs is a STOP. |
| Risk class | **HIGH**. Calibration anchors are brigade-assignment-sensitive. The `n1280 → n1289` history shows multiple iterations re-tuning sector-anchored launch contract / commander corrections / sub-segment IDs. Any change here without G1 will likely drift hash. |
| **Phase 0 status** | **NOT IMMEDIATELY DISPATCHABLE.** Requires per-callsite instrumentation inside `partition-corps-front-sectors` before optimization is authorized; sector-expert consult mandatory. |

### LANE C — Predictor / `estimateForceRatio` cost

| Field | Value |
|---|---|
| Previous hash-identity failure? | UNKNOWN at the function level. The IN_TRANSIT_PREDICTOR / IN_TRANSIT_COMBAT_POWER_CONTEXT chain (recent commits `87062cc4`, `8dec8f58`) is upstream of this; predictor inputs were just enriched and are still settling. |
| Dominator vs diffuse? | **DIFFUSE.** Wave 5 cited "briefing builder + predictor" as candidates within bot-orders, but no single-function callsite measurement was taken for `estimateForceRatio`. Per Wave 9 STOP-AND-ASK durable lesson, these are exactly the diffuse-category items. |
| Estimated speedup | Memoization candidate: per-(attacker, defender, OSID) cache keyed by snapshot fingerprint could collapse repeated calls within a turn. Estimate: 20–80 ms/turn aggregate; depends on call multiplicity not yet measured. |
| Implementation surface | `src/sim/combat/combat_math.ts` + predictor caller in `bot_corps_ai.ts` / `commander_loop.ts`. Combat-math touch is sensitive (calibration-dominant). |
| G1 plan | Property test 10,000 randomized force-state pairs; assert legacy vs memoized return values byte-identical (including denormal handling, NaN propagation). |
| G2 plan | `PREDICTOR_PARITY_CHECK=true` env flag. |
| G3 plan | 40w byte-stable + anchor count unchanged. |
| Risk class | **MEDIUM-HIGH**. Combat-math hot path. Recent IN_TRANSIT predictor work not fully settled (current branch shows two recent partial-LANE commits on this exact predictor surface — `87062cc4`, `8dec8f58`). Optimizing on a moving substrate is high-risk. |
| **Phase 0 status** | **NOT IMMEDIATELY DISPATCHABLE.** Defer until IN_TRANSIT predictor lanes close; require per-callsite instrumentation first. |

### LANE D — 188w memory accumulation (replay log streaming + AAR retention)

| Field | Value |
|---|---|
| Previous hash-identity failure? | NO — this is a memory-shape change (heap retention), not a numeric-output change. G3 hash-identity expected to hold trivially if streaming is correctly implemented (write-and-forget instead of write-and-retain-in-array). |
| Dominator vs diffuse? | **DOMINATOR identification deferred to instrumentation.** No heap profile artefact on disk. Indirect signals (40w 510 MB peak; 188w 4 GB OOM) suggest super-linear growth — not consistent with linearly-streamed JSONL. Likely accumulators: in-memory ops/AAR arrays held end-to-end, replay save-sequence retention, or per-turn snapshots in `final_save.json` build path. |
| Estimated speedup | NOT a wall-clock optimization — a memory-pressure / OOM-headroom optimization. Target: 188w runs that complete in <4 GB. Speedup-by-GC-relief possible (less major-GC pause time) but secondary to making 188w runnable on stock hardware. |
| Implementation surface | Scenario runner + reporting writers (`scenario_runner.ts`, `weekly_report.ts`, AAR collector). Likely 2–3 files. |
| G1 plan | Property test: same scenario seed, accumulator-on vs streamed-write produces byte-identical output files (the JSON artefacts must be byte-stable). |
| G2 plan | `SCENARIO_STREAMING_PARITY_CHECK=true` env flag re-runs legacy retention path and diffs output bytes. |
| G3 plan | 40w byte-stable. **Plus: 188w smoke completes in <2 GB (target heap).** Memory-budget regression is a STOP. |
| Risk class | **LOW-MEDIUM** for outputs (JSON byte-equality is straightforward to assert), **MEDIUM** for risk of new replay/save bugs (streaming requires careful flush semantics). |
| **Phase 0 status** | **NOT IMMEDIATELY DISPATCHABLE.** Requires a heap-profile lane first to NAME the accumulator(s). Without that, Phase 0 STOP-AND-RECOMMEND applies. |

### LANE E — `combat_math.ts` hot path (`computeAttackerPower` / `computeDefenderPower`)

| Field | Value |
|---|---|
| Previous hash-identity failure? | **YES (high probability).** Recent Stupčanica SHAPE B (`b3dadcb0`) and Krivaja Phase 1.5 (`d4b398df`) committed combat-math changes; AC-14 §6 re-calibration finding from `58309a19` (2026-05-06, today) is still settling. Any unrelated optimization here on top of unsettled mechanics would be uniquely high-risk. |
| Dominator vs diffuse? | **NOT MEASURED at function level.** `compute*Power` invoked from inside the combat resolver per battle; battle count typically tens-to-low-hundreds per turn. Aggregate cost likely <50 ms/turn (combat resolution itself is fast); not in top-10 phases. |
| Estimated speedup | Small — likely 10–30 ms/turn at most. Not high-leverage. |
| Implementation surface | `src/sim/combat/combat_math.ts` — single file, but every change has triple sign-off implications under §6 if it touches force-formula constants. |
| G1 plan | Property test 10,000 randomized stack configurations; legacy vs new identity. |
| G2 plan | `COMBAT_MATH_PARITY_CHECK=true` env flag. |
| G3 plan | 40w byte-stable + anchors unchanged + AC-14 §6 outcomes unchanged. |
| Risk class | **HIGH (substrate-unsettled).** Per durable lesson 2026-05-06 (Stupčanica AC-14 finding), combat-math is currently being re-calibrated. Optimizing during active calibration changes invites sibling-lane interference and obscures attribution if anchors drift. |
| **Phase 0 status** | **NOT IMMEDIATELY DISPATCHABLE.** Defer behind substrate-then-content principle: wait for AC-14 §6 chain to close, then re-evaluate. Low-leverage anyway. |

---

## PHASE 3 — Acceptance Criteria + Stop Triggers (binding)

### Acceptance Criteria (15 items, applied per-lane)

1. **AC-G1** — Property test: ≥10,000 randomized inputs; legacy vs new implementation; assert output identity (set equality / byte equality / numeric equality as appropriate). Deterministic LCG seed. Multi-component / edge-case coverage.
2. **AC-G2** — Production parity wrapper behind opt-in env flag (`<LANE>_PARITY_CHECK=true`). Default-off zero production cost. Throws with full input dump on first divergence.
3. **AC-G3** — 40w hash-identity smoke: `final_state_hash` byte-identical to current baseline (`ef03ab4d6c5ecd28` for post-Wave-8 lineage). Baseline confirmed via `npm run sim:scenario:run:40w` pre-implementation.
4. **AC-determinism** — No `Math.random`, `Date.now`, `new Date`, locale-sort, environment leak, async ordering. Iteration via `strictCompare`. Maps over Sets where ordering matters.
5. **AC-no-new-state** — No new persisted state field. Caches must be per-turn ephemeral or keyed by deterministic snapshot fingerprint.
6. **AC-diff-size** — ≤200 LOC excluding tests, unless critically justified in commit message. Encourages localized changes.
7. **AC-faction-symmetric** — Mechanism is faction-agnostic. Stratification (e.g. RS vs RBiH cost asymmetry) is informational only; no per-faction code branch in optimized path.
8. **AC-cross-call-shared-state** — Any new shared cache structure documented (lifetime, invalidation, ownership). Cache misses must reproduce legacy bit-equality.
9. **AC-typecheck-clean** — `npx tsc --noEmit` clean.
10. **AC-vitest-clean** — `npm run test:vitest` GREEN at peak (target suite + nearby regression suites).
11. **AC-anchors-unchanged** — 26/27 anchors hold (post-`a2a51d4a9994a7f5` lineage). Pre-existing brcko fail tolerated; no NEW failures.
12. **AC-benchmarks-unchanged** — 6/6 benchmarks GREEN.
13. **AC-Ring-1** — No §6 surface. No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / enclave_resilience.ts touch.
14. **AC-188w-no-OOM-regression** — 188w smoke run does not OOM differently than pre-impl. If pre-impl already OOMs at 4 GB, post-impl must OOM at the same boundary or later (memory profile shape preserved unless lane is LANE D).
15. **AC-revert-clean** — Lane revert (if STOP fires) leaves repo at predecessor commit byte-identical (`git diff` empty after revert).

### Stop Triggers (7 items)

1. **ST-G1-drift** — G1 property test catches divergence on any trial → debug-fix-retest until G1 passes. Do NOT proceed to G2/G3.
2. **ST-G3-drift** — G3 40w hash drifts from baseline → ROLL BACK before commit. Investigate as a separate lane.
3. **ST-Phase0-no-hotspot** — Phase 0 investigation reveals diffuse cost with no single dominating function → STOP and RECOMMEND an instrumentation lane (per durable lesson 2026-05-04). Do NOT implement on speculation.
4. **ST-188w-OOM-regressed** — 188w smoke OOMs at LOWER memory threshold post-impl than pre-impl, or at an earlier turn → STOP (changed memory profile). Investigate before committing.
5. **ST-substrate-change** — Lane requires substrate change (e.g. new scheduling primitive, new cache type that crosses turn boundaries, new persisted field) → defer to a substrate-then-content lane sequence. Do NOT bundle.
6. **ST-anchor-regression** — New anchor failure beyond pre-existing brcko (and any anchors already known to be in flux from concurrent calibration lanes) → ROLL BACK.
7. **ST-active-substrate-conflict** — Lane targets a function actively being re-calibrated by a sibling/recent lane (e.g. combat-math during Stupčanica AC-14 chain, predictor during IN_TRANSIT chain) → DEFER until substrate closes.

---

## PHASE 0 verdicts (per-lane)

| Lane | Function(s) | Dispatchable now? | Reason |
|---|---|---|---|
| A | `executeFactionDirectives` + `runCommanderForCorps` | **NO — STOP-AND-RECOMMEND instrumentation lane** | Diffuse post-Wave-8; needs Tier 2-style per-callsite wrapping inside the named functions before optimization is authorized. Durable lesson 2026-05-04 applies. |
| B | `brigade_assignment` Phase B iteration | **NO — STOP-AND-RECOMMEND instrumentation lane** | No per-callsite measurement; calibration anchors highly sensitive; sector-expert consult mandatory. |
| C | Predictor / `estimateForceRatio` | **NO — DEFER until IN_TRANSIT predictor chain closes** | Substrate unsettled (`87062cc4` + `8dec8f58` PARTIAL within last 72 hours). Plus needs callsite instrumentation. |
| D | 188w memory accumulation | **NO — STOP-AND-RECOMMEND heap-profile lane** | Accumulator not named. Indirect signal only (4 GB OOM at ~12 min). Need a heap profile to identify the retention path before optimization is authorized. |
| E | `combat_math.ts` `compute*Power` | **NO — DEFER until Stupčanica AC-14 §6 chain closes** | Substrate actively re-calibrating; low-leverage anyway. |

### Phase 0 panel verdict

**STOP-AND-RECOMMEND across all 5 candidate lanes.** No lane is immediately dispatchable as a G1+G2+G3-gated optimization implementation. The Wave-7 cache + Wave-8 inner-loop optimization already harvested the single dominator (analyzeFactionGraph). Post-Wave-8 cost is structurally diffuse — exactly the case the 2026-05-04 durable lesson contemplates.

**Recommended sequence (instrumentation-first):**

1. **PRE-LANE 1 (instrumentation, dispatchable now):** Tier 2-style instrumentation lane that wraps `executeFactionDirectives` and `runCommanderForCorps` internals (the loops inside, not just the entry points). Same pattern as `20260505_TIER_2_PERF_PROFILE.md` — synchronous `process.hrtime.bigint()` wrappers at named entry points; per-call-site totals + per-faction stratification; instrumentation reverted before commit; only audit + JSON ship. Output: a NAMED sub-dominator inside the bot-orders pipeline (or confirmation that the cost is genuinely flat, in which case Phase 0 STOP holds and we close the bot-orders surface for v0.9.3).
2. **PRE-LANE 2 (heap profile, dispatchable now):** Run 188w with `--inspect` + `--heap-prof` (or v8 heap-snapshot at fixed turn intervals). Identify retention paths >100 MB at e.g. turn 120 / turn 180. Name the accumulator file:line. Same audit-only ship pattern: heap-snapshot artefacts in `data/derived/`, audit report in `docs/40_reports/audits/`. Ring 1.
3. **PRE-LANE 3 (sector instrumentation, dispatchable now BUT lower priority):** wrap `partition-corps-front-sectors` internals to identify what state condition triggers the 1,188 ms spike (max/min ratio 7.7×). Sector-expert consult before any source-code change.
4. **OPTIMIZATION LANES (NOT dispatchable until pre-lanes close):** Whichever of LANE-A/B/D Pre-lane 1/2/3 names a single dominator, schedule that as a G1+G2+G3-gated lane following the `a60d39c9` Tarjan precedent. LANE-C and LANE-E remain deferred behind their respective substrate chains.

**Net Phase 0 outcome:** 0 of 5 candidate lanes immediately dispatchable as G1+G2+G3-gated implementations. 3 instrumentation pre-lanes immediately dispatchable as Ring-1 audit-only lanes (output: named single dominator, OR confirmation that no single dominator exists and v0.9.3 perf surface for that area is closed). This is the prescribed Phase-0-STOP-AND-RECOMMEND outcome per durable lesson 2026-05-04.

---

## Sensitive-history compliance assertion

- **Ring 1**: this file is the only artefact authored. No source / test / scenario / canon edit.
- **No §6 surface**: zero touch to rupture-event, atrocity-recording, enclave-defense codepath.
- **No FORAWWV touch**: `git status` confirms no `docs/10_canon/FORAWWV.md` modification.
- **No paint anchor / political_controllers / OOB JSON / rupture-wiring / enclave_resilience.ts touch**: audit + plan only.
- **No combat-math number tuned**: no source code.
- **Determinism preserved**: no source code.

## Files committed (this lane)

- `docs/40_reports/audits/20260506_V093_PERF_PHASE_0_PANEL.md` (THIS file, NEW)

## Files NOT touched (per spec)

- All source / test / scenario / canon code. Verified via `git status`.

---

## Successor handoff

Per Phase 0 STOP-AND-RECOMMEND, the dispatcher should now schedule (in any order, file-disjoint):

- **LANE-NIGHTSHIFT-BOT-ORDERS-INTERNALS-INSTRUMENTATION** — Tier 2-style instrumentation inside `executeFactionDirectives` + `runCommanderForCorps`. Output: named sub-dominator file:line OR confirmation of flat cost. Pattern: `20260505_TIER_2_PERF_PROFILE.md`.
- **LANE-NIGHTSHIFT-188W-HEAP-PROFILE** — heap snapshots at turn 60/120/180 of 188w run. Output: named retention path. Pattern: similar audit-only ship.
- **LANE-NIGHTSHIFT-SECTOR-PARTITION-INSTRUMENTATION** — wrap `partition-corps-front-sectors` internals to characterize the 1,188 ms spike. Sector-expert consult.

Each of those instrumentation lanes is Ring 1 and dispatchable in parallel (file-disjoint at the report level). Successor optimization lanes are NOT dispatchable until at least one of these names a single dominator with G1+G2+G3 gate plan.
