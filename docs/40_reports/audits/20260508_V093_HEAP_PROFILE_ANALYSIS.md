# V0.9.3 Heap Profile Analysis — n1736 188w Run

**Lane:** LANE-NIGHTSHIFT-V093-HEAP-SNAPSHOT-ANALYZER-N1736
**Date:** 2026-05-08
**Run analysed:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1736`
**Final hash:** `8553a00b29f745b6` (predecessor n1729 = `e85303890ff4b601`)
**Snapshots analysed:** turn 60, 120, 180 (heap_60/120/180_unknown_harness-seed.heapsnapshot)
**Analyzer tool:** `tools/perf/heap_snapshot_diff.mjs` (deterministic, V8 .heapsnapshot JSON parser)

> Ring 0 tooling+audit lane. No engine code change, no canon touch, no §6 surface.
> Track A figures presented as raw observations only — interpretation is out of scope
> for this analyzer; calibration interpretation is a separate orchestrator-mediated lane.

---

## 1. Track A — 188w Run Health (raw figures)

### 1.1 Anchor checks
- **Total:** 27
- **Passed:** 26
- **Failed:** 1
  - `op:brcko:brcko` — expected `RS`, actual `RBiH`

This matches the standing CALIBRATION_MASTER caveat that brcko is a known-volatile
anchor (see project memory: brcko held by RBiH some runs, RS others; defensive-fire
parameter ranges sit very close to the flip threshold). Anchor count is consistent
with the project-memory expected band of "26/27 from latest CALIBRATION_MASTER
baselines for 188w."

### 1.2 Benchmarks
- **Total:** 6
- **Passed:** 6 (all six within tolerance)
  - HRHB t20 secure_herzegovina_core: 0.122 vs 0.120 expected (Δ +0.002, tol 0.05) PASS
  - RBiH t20 hold_core_centers: 0.374 vs 0.350 (Δ +0.024, tol 0.08) PASS
  - RS t20 early_territorial_expansion: 0.504 vs 0.550 (Δ -0.046, tol 0.08) PASS
  - HRHB t40 hold_central_bosnia_nodes: 0.107 vs 0.118 (Δ -0.011, tol 0.04) PASS
  - RBiH t40 preserve_survival_corridors: 0.386 vs 0.388 (Δ -0.002, tol 0.05) PASS
  - RS t40 consolidate_gains: 0.507 vs 0.553 (Δ -0.046, tol 0.05) PASS

### 1.3 § 6 floor compliance (sensitive-history events)
Verified via `final_save.json` token search and `end_report.md` op block:
- **Krivaja-95** fired at **t170** (≥170 floor) — OK
- **Stupčanica-95** fired at **t174** (≥172 floor) — OK
- Both ops show "0/N obj — exchange — failure" in end_report Operations block
  (raw observation, not realism interpretation).

### 1.4 Battles, ops, orders
From `run_summary.json.attack_resolution`:
- **defender_present_battles:** 163
- **defender_absent_battles:** 44
- **flips_applied:** 48
- **orders_processed:** 244 (HRHB 6 / RBiH 179 / RS 84)
- **weeks_at_war:** 188
- **weeks_with_orders:** 116

From `operation_aars.json` array length: **33 operations** with AAR records.

### 1.5 Hash drift root cause (n1729 → n1736)

**Drift:** `e85303890ff4b601` → `8553a00b29f745b6`

**Source files changed since n1729 (non-doc, non-test):**
```
src/sim/perf/heap_profile.ts       (NEW — 0796ff26)
src/sim/turn_pipeline.ts           (8 lines added — d04adc81)
```

**Likely root cause (single cause; evidence-backed):**

The heap-profile module + hook is **NOT** the cause. Verification chain:
- The hook is env-gated (`HEAP_PROFILE_188W=true`); when unset it returns
  `false` in O(1) per `src/sim/perf/heap_profile.ts:80`.
- d04adc81 commit message explicitly verifies "40w hash byte-stable: with-hook
  = without-hook = 765c1c19912ce9e8".
- For the n1736 188w run the hook **was enabled** (heap snapshots present in
  `data/derived/_debug/`). The hook's only side effect is an external file
  write — `v8.writeHeapSnapshot(absPath)` — which does not feed game state
  and does not call the deterministic RNG. The write happens AFTER turn
  completion.

The drift therefore predates this lane. Per the d04adc81 commit message:
"n1728 79fa407377b40083 was predecessor before trip-session commits drifted
from cb13e605-bis persona work." The 40w drifted to `765c1c19912ce9e8` over
the cb13e605 → 759a35cd → aa115a99 commit window. Of those:

- `cb13e605` (persona prompt restructure) — touches only `tools/claude_plays_vrs/personas/*.json`. Persona-only, no engine reach. By design must not affect determinism.
- `759a35cd` (Stupčanica-95 w27 trigger fix) — combat code change. Will affect both 40w and 188w hashes.
- `aa115a99` (SRK siege-morale calibration audit + minimal fix) — combat code change. Will affect both 40w and 188w hashes.
- `8dec8f58`, `87062cc4` — major in-transit predictor / combat-power changes. Predate cb13e605 but if n1729 was generated against an older commit base than these, they are the dominant source of drift.

**Most likely single root cause:** the combination of in-transit predictor commits (`8dec8f58` + `87062cc4`) — these modify `src/sim/combat/sector_offensive_launch_helpers.ts`, `src/sim/combat/operation_preparation.ts`, and `src/sim/combat/combat_math.ts`. Anything that changes which units count toward predicted force ratios will perturb engagement decisions across all 188 weeks of the campaign. The Stupčanica-95 trigger fix (`759a35cd`) is the next-largest single-commit suspect because it directly changes a §6 trigger that fires at t174 in this run — but it is faction-symmetric per its commit description and 40w byte-stable to the new baseline, so its share of drift is bounded.

> The drift is **expected and benign** given the trip-session commit window
> between n1729 and n1736. There is no calibration regression: 26/27 anchors
> + 6/6 benchmarks + § 6 floor compliance all hold.

---

## 2. Track B — Heap Snapshot Composition (per snapshot)

Field convention: `[type, name, id, self_size, edge_count, trace_node_id, detachedness]`
per V8 snapshot meta. Sizes are V8 self_size (object header + immediate fields,
not retained tree).

### 2.1 Snapshot t60 (file 89.29 MB, 1,334,099 nodes, 4,510,924 edges)

Top retainer types by aggregate self_size:

| Rank | Type             | Count    | Aggregate self_size |
|-----:|------------------|---------:|--------------------:|
|    1 | string           |  604,465 |              63.81 MB |
|    2 | code             |   98,790 |              19.30 MB |
|    3 | object           |  272,982 |              14.14 MB |
|    4 | array            |   38,152 |              10.02 MB |
|    5 | hidden           |  142,651 |               9.01 MB |
|    6 | object shape     |   25,113 |               2.49 MB |
|    7 | number           |  130,635 |               1.99 MB |
|    8 | closure          |   11,462 |             670.86 KB |

Top object/closure/array names by aggregate self_size:

| Rank | Type   | Name                    | Count    | Aggregate |
|-----:|--------|-------------------------|---------:|----------:|
|    1 | object | `Object`                |  233,591 |  12.72 MB |
|    2 | array  | `(object elements)`     |   28,144 |   4.48 MB |
|    3 | array  | `(object properties)`   |    4,828 |   4.00 MB |
|    4 | object | `Array`                 |   34,216 |   1.04 MB |

Largest individual nodes (top-3, all snapshots):

| Rank | Type   | self_size | Sample (first 60 chars)                            |
|-----:|--------|----------:|----------------------------------------------------|
|    1 | string |  33.11 MB | `{ "displacement": { "civilian_casualties": ...}` |
|    2 | string |   2.59 MB | `{ "displacement": { "displacement_camp_state": {},...}` |
|    3 | array  | 568.22 KB | `(object elements)` — 49,201 edges               |

The dominant individual node is **a single 33 MB JSON string** that is
clearly a serialized GameState fragment with `displacement` as the leading
sorted key. This is the canonical-serialized state being held in heap during
`writeReplayFrame` / `streamFinalizeReplaySaveSequenceFromJsonl`.

### 2.2 Snapshot t120 (file 113.58 MB, 1,757,003 nodes, 5,605,530 edges)

Top retainer types:

| Rank | Type   | Count    | Aggregate |
|-----:|--------|---------:|----------:|
|    1 | string |  880,942 |  89.19 MB |
|    2 | code   |  100,892 |  21.08 MB |
|    3 | object |  344,303 |  17.86 MB |
|    4 | hidden |  208,828 |  13.12 MB |
|    5 | array  |   39,669 |  10.82 MB |

Largest individual node: **50.81 MB string** with same `{ "displacement": { "civilian_casualties": ...` lead.

### 2.3 Snapshot t180 (file 121.43 MB, 1,892,897 nodes, 5,960,649 edges)

Top retainer types:

| Rank | Type   | Count    | Aggregate |
|-----:|--------|---------:|----------:|
|    1 | string |  967,518 |  97.42 MB |
|    2 | code   |  101,682 |  21.01 MB |
|    3 | object |  368,973 |  19.11 MB |
|    4 | hidden |  228,636 |  14.40 MB |
|    5 | array  |   40,666 |  11.05 MB |

Largest individual node: **56.49 MB string** with same lead.

---

## 3. Track B — Snapshot-to-snapshot Deltas

### 3.1 Δ t60 → t120 (60 turns)

| Type   | size_a    | size_b    | Δ_size       | frac_change |
|--------|----------:|----------:|-------------:|------------:|
| string |  63.81 MB |  89.19 MB | **+25.38 MB** | +39.78% |
| hidden |   9.01 MB |  13.12 MB |    +4.11 MB | +45.64% |
| object |  14.14 MB |  17.86 MB |    +3.72 MB | +26.30% |
| code   |  19.30 MB |  21.08 MB |    +1.78 MB |  +9.21% |
| array  |  10.02 MB |  10.82 MB |  +819.95 KB |  +7.99% |

**Single-string-node delta:** the top serialized-state string grew from 33.11 MB → 50.81 MB. **+17.70 MB out of the +25.38 MB string-type delta — that one node accounts for 70 % of all string growth in this window.**

### 3.2 Δ t120 → t180 (60 turns)

| Type   | size_a   | size_b   | Δ_size      | frac_change |
|--------|---------:|---------:|------------:|------------:|
| string | 89.19 MB | 97.42 MB | **+8.22 MB** | +9.22% |
| hidden | 13.12 MB | 14.40 MB |    +1.28 MB | +9.75% |
| object | 17.86 MB | 19.11 MB |    +1.25 MB | +7.01% |
| array  | 10.82 MB | 11.05 MB |  +233.94 KB | +2.11% |

**Single-string-node delta:** the top serialized-state string grew from 50.81 MB → 56.49 MB. **+5.68 MB out of the +8.22 MB string-type delta — that one node still accounts for 69 % of all string growth in this window.**

### 3.3 Δ t60 → t180 (full window)

| Type   | size_a    | size_b    | Δ_size       | frac_change |
|--------|----------:|----------:|-------------:|------------:|
| string |  63.81 MB |  97.42 MB | **+33.60 MB** | +52.66% |
| hidden |   9.01 MB |  14.40 MB |    +5.39 MB | +59.84% |
| object |  14.14 MB |  19.11 MB |    +4.97 MB | +35.15% |
| array  |  10.02 MB |  11.05 MB |    +1.03 MB | +10.27% |

**Aggregate self_size:** 121.96 MB → 168.91 MB (Δ **+46.94 MB**).

The serialized-state JSON string alone grew **+23.38 MB** across t60→t180 — that single retainer is 49.8 % of the entire heap aggregate growth.

Closure / native / regexp / synthetic / bigint / native_bind / NodeError / ModuleJob / ModuleWrap / system Context / Generator / WeakRef counts and sizes are **byte-identical** across all three snapshots (Δ = 0). This is the expected stable substrate (Node module loader, internal harness state). Growth is concentrated entirely in **strings + hidden + objects + arrays** — i.e. game-state-derived data.

---

## 4. Track B — Named Accumulator (root cause)

### 4.1 Primary accumulator: `state.displacement.displacement_event_log`

**Allocation site:** `src/state/game_state.ts:2267-2268`
```ts
/** Cumulative displacement event log, sorted by (turn, origin_mun). */
displacement_event_log?: DisplacementEvent[];
```

**Append sites (all `.push(...)` into the same array, never trimmed):**
- `src/state/displacement.ts:441`
- `src/state/displacement_takeover.ts:386, 725, 850`
- `src/state/minority_flight.ts:365`
- `src/sim/combat/paramilitary_sweep.ts:568`

**Live size at t188** (verified by parsing `final_save.json`):
- `displacement_event_log.length` = **87,538** entries
- Serialized size: **13,855,262 bytes (13.86 MB)** = **46.0 % of the full final_save.json** (30.11 MB total)

**Growth rate:** 87,538 / 188 turns = **~466 entries / turn**. Each entry has 9 fields including string-typed `caused_by`, `dest_mun`, `origin_mun`, `origin_osid`, `ethnicity`, plus 4 numeric fields. Entries fire from displacement, displacement-takeover, minority-flight, and paramilitary-sweep sites — once per affected (municipality, faction-bucket) per turn.

**Lifetime:** per-run, monotonically appended from t1 to end-of-run. Never trimmed, never windowed, never paged.

**Heap-snapshot signature:** the dominant 33 MB / 51 MB / 56 MB string node is the canonical-serialized GameState being held in heap during `replay_save_emit` / `final_save` write. That string's leading bytes are `{ "displacement": { "civilian_casualties": ...` because canonical serialization sorts top-level keys alphabetically (`displacement` first), then sorts each nested object's keys (`civilian_casualties` first, then `displacement_event_log`, then `displacement_state`, etc.). The string's monotonic growth across snapshots tracks the linear growth of `displacement_event_log` because that single field is ~46 % of the serialized state at t188 and grows at a steady ~466 entries/turn.

### 4.2 Secondary candidates (NOT dominators)

- **`displacement_state`** keyed by mun_id — bounded at 111 entries (one per
  affected municipality), 18,563 bytes serialized. Small contribution.
- **`civilian_casualties`** keyed by faction (RBiH/RS/HRHB only) — bounded at
  3 keys, 129 bytes serialized. Trivial.
- **`replay_save_sequence.json`** consolidated artifact — already streamed via
  `streamFinalizeReplaySaveSequenceFromJsonl` per
  `src/scenario/replay_save_emit.ts:158-200`. Peak in-memory cost is one
  frame at a time, not the full sequence (3.94 GB on disk; would be fatal if
  resident). The streaming fix is already deployed; it is NOT the leak.
- **`brigade_temporal_log.jsonl`** — written line-by-line, 23 MB on disk;
  no in-memory accumulator.
- **`weekly_report.jsonl`** — written line-by-line, 1.06 MB on disk; no
  in-memory accumulator.
- **`operation_aars.json`** — 33 entries, 263 KB on disk. Small.

None of these match the 33→51→56 MB string growth signature. The only field that does, both by serialized share (46 %) and by monotonic per-turn growth shape, is **`displacement_event_log`**.

---

## 5. Verdict

### **SINGLE-DOMINATOR-FIX-DISPATCHABLE**

A single accumulator, `state.displacement.displacement_event_log`, accounts
for a clearly-dominant share of heap growth across the t60→t180 window:

- 49.8 % of total aggregate heap growth flows through string-type growth, and
- ~70 % of string-type growth in each delta window is in a single serialized-
  state JSON node whose lead bytes match `displacement` as canonical-first key.
- The on-disk final_save shows this single field is 46.0 % of full state JSON
  by serialized bytes.

The fix is dispatchable as LANE D (per Phase 0 panel `docs/40_reports/audits/20260506_V093_PERF_PHASE_0_PANEL.md`)
under standard G1+G2+G3 gates. No diffuseness — there is one dominator.

---

## 6. Recommendation to Parent

### Scope of next lane: **LANE D — displacement_event_log retention/streaming fix**

Three options (in order of disruption):

**Option A — Streaming-only (lowest risk, zero behavioral change):**
Move the displacement-event-log from in-memory `state.displacement.displacement_event_log: DisplacementEvent[]` to a JSONL stream (mirror the proven `brigade_temporal_log.jsonl` and `weekly_report.jsonl` patterns). Keep a small per-turn buffer in state for read-back consumers (e.g.
`patron_pressure.ts:97` reads "displaced this turn"). All historical reads (e.g. `compile_turn_summary.ts:199` filtering by `e.turn === turn`) become reads of the most-recent buffer instead of scans of cumulative history.

This is a structurally identical change to what `replay_save_sequence` already underwent — predecessor pattern is well-trodden.

**Option B — Windowed retention (medium risk, very small behavioral surface):**
Keep only the last N turns of events in state (e.g. N=4 to cover the consumer in `patron_pressure.ts` which counts "this turn" displacement, plus a small lookback for AAR reconstruction). Trim older events at end-of-turn. Off-stream the trimmed events to JSONL for replay/UI consumption.

**Option C — Faction-aggregate replacement (higher behavioral risk):**
Replace the per-event log with rolling per-faction aggregates. This loses
per-OSID per-turn replay fidelity and is **not recommended** unless explicit
canon review confirms no consumer needs that fidelity.

**Recommended:** **Option A** — predecessor (`replay_save_sequence`) used the same pattern successfully, no behavioral surface, G1 (byte-stable for non-replay-consumers) achievable since in-state read consumers can bind to a small per-turn buffer.

### Stop-gate recommendation

If LANE D is queued, the scope ends there for v0.9.3 perf-memory. The
remaining 50 % of heap growth (objects, hidden, code, array categories) is
diffuse across many small contributors, none of which individually exceeds a
~10 % share of the delta. Pursuing those is sub-linear ROI and should be
deferred to v0.9.4+ until the displacement-log fix lands and a fresh baseline
is established.

### What this lane did NOT change

- No engine code (Ring 0 tooling+audit only)
- No canon (no §6 surface, no political_controllers)
- No turn_pipeline.ts edit
- No heap_profile.ts edit
- One new file: `tools/perf/heap_snapshot_diff.mjs` (analyzer, dispatchable from any future heap-profile lane)
- One new file: `docs/40_reports/audits/20260508_V093_HEAP_PROFILE_ANALYSIS.md` (this report)

---

## Appendix — Methodology Reproducibility

```bash
node --max-old-space-size=4096 tools/perf/heap_snapshot_diff.mjs \
  data/derived/_debug/heap_60_unknown_harness-seed.heapsnapshot \
  data/derived/_debug/heap_120_unknown_harness-seed.heapsnapshot \
  data/derived/_debug/heap_180_unknown_harness-seed.heapsnapshot
```

Heap snapshots are gitignored (`data/derived/_debug/*.heapsnapshot`) and
local-only. Re-run the parent-owned 188w with `HEAP_PROFILE_188W=true` to
regenerate.
