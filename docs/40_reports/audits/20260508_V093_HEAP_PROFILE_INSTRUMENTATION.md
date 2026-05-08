# v0.9.3 Heap-Profile Instrumentation — re-dispatch (LANE-NIGHTSHIFT-V093-HEAP-PROFILE-REDISPATCH)

**Lane:** LANE-NIGHTSHIFT-V093-HEAP-PROFILE-REDISPATCH
**Date:** 2026-05-08
**Type:** Ring 0 tooling-only — instrumentation + tests + hook integration. NO behavioral source-code changes; default-OFF byte-stable.
**Sensitive-history compliance:** Ring 0 (sim-only tooling). No §6 surface, no FORAWWV, no political_controllers / OOB / paint anchor / rupture-wiring / enclave_resilience.ts.
**Predecessor baseline:** `decf18f5` (current HEAD before this lane).
**Predecessor reverted commit:** `34fb8edb` — orphan `src/sim/heap_profile.ts` + `tests/heap_profile_188w.test.ts` deleted as dead because the prior agent's 188w validation subprocess died with the agent process and turn_pipeline integration never reached HEAD.

## What this lane ships

Two-commit shape (parent owns subprocess execution per FORAWWV §XVI):

1. **Module + tests + audit (commit 1, this commit):**
   - `src/sim/perf/heap_profile.ts` — env-flag-gated synchronous heap-snapshot writer (~210 LOC including doc).
   - `tests/sim/perf/heap_profile.test.ts` — 15 tests covering env-flag default-OFF discipline, schedule parser, snapshot-path computation, and ON-path write behaviour (idempotency, schedule matching, different runIds).
   - This audit document.

2. **Pipeline hook integration (commit 2):**
   - `src/sim/turn_pipeline.ts` — single end-of-turn call to `maybeWriteHeapSnapshot`. Default-OFF zero cost (one boolean read per turn).

## Env-flag contract

| Variable | Default | Effect |
|---|---|---|
| `HEAP_PROFILE_188W` | unset | Hook short-circuits; no snapshot written; production cost = one Boolean comparison per turn. Hash byte-identical to predecessor baseline. |
| `HEAP_PROFILE_188W=true` | — | Hook is live. At end-of-turn, if turn matches schedule, writes one heap snapshot to `data/derived/_debug/heap_<turn>_<scenarioSlug>_<runId>.heapsnapshot`. |
| `HEAP_PROFILE_TURNS` | unset → `[60, 120, 180]` | Comma-separated positive integers; sorted, deduped, malformed tokens rejected. Empty/all-malformed → default. |

The flag is read **once at module load** and stored in a `const`. There is no
runtime mutation path. This guarantees the production fast-path is a single
boolean comparison; it also means tests cannot flip the flag mid-process — they
use the test-only `__heapProfileTestHooks.forceWriteForTest` escape hatch.

## Determinism contract

- `Math.random` / `Date.now` / `new Date` / locale-sort / `performance.now` are
  not present anywhere in `src/sim/perf/heap_profile.ts`.
- The only side effects when the flag is ON are:
  1. `fs.mkdirSync` (idempotent, recursive: true) on the debug dir.
  2. `v8.writeHeapSnapshot()` — synchronous in Node, writes one file.
  3. One entry into a per-process `Set` for idempotency.
- Game state is never read or mutated. The hook signature takes
  `(turn, scenarioSlug, runId)` only — no `GameState` reference.
- Faction-symmetric: there is no per-faction branching anywhere in this module.

## Output

```
data/derived/_debug/heap_<turn>_<scenarioSlug>_<runId>.heapsnapshot
```

`data/derived/_debug/` is gitignored (root `.gitignore` line 41). Snapshots are
local-only artefacts.

## Idempotency

Per-process `Set<"turn::runId">` ensures a second call for the same key in the
same process is a no-op. Two different `runId`s on the same turn produce two
files. This is verified by the unit test
`heap_profile — ON-path write behaviour > different runIds produce different files even on the same turn`.

## Pipeline integration (commit 2)

The hook fires **once per turn, immediately before `runTurn` returns** in
`src/sim/turn_pipeline.ts`, after `refreshFrontEdgeSnapshot`. Inputs derived
from `working.meta`:

- `turn` ← `working.meta.turn` (post-increment value, the just-completed turn).
- `scenarioSlug` ← `working.meta.scenario_id` (or empty string → "unknown").
- `runId` ← `String(input.seed)` (per-process unique run identifier; the
  scenario runner already derives a unique seed per run).

The hook is invoked unconditionally — env-flag gating lives inside the module,
not at the call site. This keeps the integration to ~3 LOC plus one import.

## Pre-flight verification (this commit, commit 1)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean (0 errors) |
| `npx vitest run tests/sim/perf/heap_profile.test.ts` | 15/15 GREEN, 2.93 s |
| `data/derived/_debug/` gitignored | confirmed (`.gitignore:41`) |
| Module imports only Node std lib (`node:fs`, `node:path`, `node:v8`) | confirmed |
| No `Math.random` / `Date.now` / `new Date` in module | confirmed by inspection |

40w hash verification will be performed after commit 2 and reported in the
parent's lane summary.

## How parent will run the 188w heap-profile validation

Parent owns the long-subprocess (FORAWWV §XVI long-subprocess discipline). The
agent does NOT execute 188w runs — the agent runtime cutoff is shorter than
the run, which is what killed the prior attempt at `34fb8edb`.

**Exact command (parent-owned background bash):**

```bash
cd F:/A-War-Without-Victory
NODE_OPTIONS=--max-old-space-size=12288 \
  HEAP_PROFILE_188W=true \
  HEAP_PROFILE_TURNS=60,120,180 \
  npx tsx tools/scenario_runner/run_scenario_with_preflight.ts \
    --scenario data/scenarios/apr1992_definitive_188w.json \
    --unique --map --out runs
```

If `apr1992_definitive_188w.json` is not on disk, the existing `52w` scenario
can be cloned and re-tagged for 188 turns; that scenario-engineering work is
out of scope for this lane and belongs to the scenario-harness-engineer.

**Expected artefacts:**

```
data/derived/_debug/heap_60_<scenarioSlug>_<runId>.heapsnapshot
data/derived/_debug/heap_120_<scenarioSlug>_<runId>.heapsnapshot
data/derived/_debug/heap_180_<scenarioSlug>_<runId>.heapsnapshot
```

Three snapshots, each on the order of 100 MB – 1 GB on disk depending on heap
size at the captured turn.

**Memory budget rationale:** the trip-session 188w runs OOMed at 4 GB after
~12 min and required 12 GB to complete (see `docs/40_reports/audits/20260506_V093_PERF_PHASE_0_PANEL.md`
"PHASE 1 — 188w memory accumulation"). Setting
`--max-old-space-size=12288` (12 GB) matches that empirical envelope.

## How to analyze the resulting snapshots

Two viable workflows; the analyzer agent should pick one and stick with it.

**A — Chrome DevTools heap analyzer (most ergonomic):**

1. Open Chrome / Chromium → `chrome://inspect` → Memory tab.
2. Click "Load" → select `data/derived/_debug/heap_60_*.heapsnapshot`.
3. Repeat for `heap_120_*` and `heap_180_*` in separate tabs.
4. Use the "Comparison" view (top-of-panel dropdown) to diff turn 120 vs turn 60
   and turn 180 vs turn 120. Sort by "Delta" (size delta) and "# Delta" (object
   count delta).
5. Top-N delta accumulator candidates (per Phase 0 panel hypothesis):
   - Operation/AAR retention arrays (`operation_aars`, replay save sequences).
   - Per-turn snapshots that are kept rather than streamed.
   - Closures captured by long-lived event handlers.

**B — Direct JSON inspection (programmatic):**

`.heapsnapshot` files are JSON. The retainer graph is in `nodes`/`edges`
arrays. For automation, a small Node script can load each snapshot, count
nodes-by-type-and-name, and emit a per-turn delta CSV. The expected pattern
is: linear-vs-quadratic growth on the dominant accumulator.

## Expected accumulator categories (per Phase 0 panel)

The Phase 0 panel
(`docs/40_reports/audits/20260506_V093_PERF_PHASE_0_PANEL.md` "PHASE 1 — 188w
memory accumulation") names three suspect categories:

1. **Replay / AAR retention arrays** — `operation_aars` is 15,078 lines / 188w
   in n1690 (~80 lines/turn). If the AAR array is held in memory across
   turns instead of streamed, growth is ~80 lines × 188 turns × per-line
   object retention.
2. **Per-turn snapshots / save sequence** — `final_save.json` is replaced on
   save, so it is not the accumulator on disk; but if the in-memory pre-save
   structure is duplicated/aliased per turn, it could be.
3. **Closures + event handlers** — political event flags accumulate;
   listeners may retain closure scope.

The observed empirical envelope (4 GB OOM at 188w, 12 GB needed; 510 MB at 40w
extrapolated linearly = 2.4 GB; observed need ≈ 5×) suggests **super-linear**
retention on at least one accumulator. The three snapshots at 60 / 120 / 180
should let the analyzer fit linear vs quadratic on the top suspects.

## Successor handoff

After parent runs the 188w with `HEAP_PROFILE_188W=true`:

1. Three `.heapsnapshot` files land in `data/derived/_debug/`.
2. Parent dispatches a heap-analyzer agent (single agent, single 188w-RECEIPTS
   audit) to load the snapshots, perform the diff, and produce
   `docs/40_reports/audits/20260509_V093_HEAP_PROFILE_188W_RECEIPTS.md` with:
   - Top-10 retention delta categories by size and by count.
   - Per-category linear-vs-quadratic fit.
   - Named candidate accumulator function/file pointers.
   - Phase 0 / Phase 1 lane recommendation (instrumentation vs immediate
     dispatch, per the v0.9.3 perf G1+G2+G3 gate discipline).

The receipts audit is the input to v0.9.3 perf Phase 1 (the actual memory
optimization lane).

## Stop-and-ask record (none triggered)

The lane spec named three potential STOP-AND-ASK conditions; none triggered:

- v8.writeHeapSnapshot is **synchronous** (verified by Node docs and confirmed
  empirically by the unit test asserting `existsSync` immediately after
  call returns). No determinism risk.
- Pipeline hook integration fits in **3 LOC + one import** (commit 2 surface).
- Pre-existing `turn_pipeline.ts` structure has no incompatible hook
  discipline — the end-of-turn point after `refreshFrontEdgeSnapshot` is a
  natural fit.

## Files (paths only)

- `src/sim/perf/heap_profile.ts` (NEW)
- `tests/sim/perf/heap_profile.test.ts` (NEW)
- `docs/40_reports/audits/20260508_V093_HEAP_PROFILE_INSTRUMENTATION.md` (this file, NEW)
- `src/sim/turn_pipeline.ts` (MODIFIED, commit 2 only — single hook call + import)
