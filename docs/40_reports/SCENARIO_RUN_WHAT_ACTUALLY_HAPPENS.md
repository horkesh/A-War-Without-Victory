# What Actually Happens When We Run a Scenario?

**Convened by:** Orchestrator  
**Date:** 2026-02-06  
**Purpose:** After running a small scenario (baseline_ops_4w) and a scenario sweep, answer in plain language: do game turns do anything? Do settlements change control? Are brigades fighting? Are the systems functioning?

---

## Runs executed

- **Single scenario:** `baseline_ops_4w` (4 weeks, baseline_ops enabled on week 0). Output: `runs/baseline_ops_4w__e5f478f75692aede__w4/`.
- **Sweep:** 6 scenarios (apr1992_4w, baseline_ops_4w, noop_13w, noop_4w, noop_4w_bots, noop_4w_probe_intent), cap 13 weeks. Output: `data/derived/scenario/sweeps/h2_4/h2_4_sweep/` with `aggregate_summary.md`.

---

## Short answers (human-optimized)

### Do settlements change control?

**No.** In every run we looked at, **zero** settlements changed hands. Control counts at the start (RBiH, RS, HRHB, null) were identical at the end. The “control flip” logic exists in the engine but is **not triggered** in these scenarios because no “war start” gate is passed and no player or harness directives tell the sim to flip control. So the map stays as it was at the start.

### Are brigades fighting?

**No.** There are **no brigades (or other formations) acting in combat** in these runs. We can load initial formations from scenario data (e.g. apr1992_4w starts with 3 formations). But those formations are not assigned to fronts, and the harness does not issue orders. So formations just sit in state; there is no “fighting” step that uses them. The sweep showed formations_initial = 3 for apr1992_4w and 0 for the rest; formations_added = 0 everywhere. So no new brigades are created during the run either (that would require a formation-spawn directive, which these scenarios don’t use).

### Do the game-turn systems do anything?

**Yes, but only part of the pipeline.** Each turn does run a full pipeline. Here’s what **does** change from turn to turn in our runs:

- **Fronts and pressure:** The sim detects which edges are “front-active” (opposing control on the two sides) and which are “pressure-eligible.” Those numbers are **nonzero** (e.g. ~1,375 front-active settlements, ~1,649 pressure-eligible edges). So the sim is correctly seeing “there’s a front here” and “pressure could be applied here.”
- **Exhaustion:** When we use the “baseline_ops” scenario (a harness-only driver), exhaustion **increases** a little each week for each faction (e.g. from ~0.002 to ~0.007 over 4 weeks). So the exhaustion system is being exercised.
- **Displacement:** Settlement and municipality displacement totals **increase** over the run (e.g. settlement total from ~27 to ~110 over 4 weeks with baseline_ops). So displacement is accumulating as the pipeline runs.
- **Supply pressure:** In these runs it stays constant (100) because nothing in the scenario changes supply.

So: **the engine is running**, and subsystems that don’t depend on “war started” or “player orders” (front detection, baseline_ops-driven exhaustion and displacement) **are** functioning. What **doesn’t** happen is: no control flips, no formation combat, no new formations spawned, no areas of responsibility (AoR) assigned—because those require either a referendum/war-start path or explicit directives that these scenarios don’t provide.

### Why does nothing “dramatic” happen?

By design. These scenario runs **don’t** include:

1. A **Phase 0** (referendum) that could set “war started” and unlock Phase I.
2. **Formation-spawn directives** that would create new brigades from militia pools.
3. **Orders or directives** that would assign formations to fronts or trigger control-flip logic.

So we’re effectively running “mid-war geography” (Phase II) with **no orders**. The sim correctly reports “there are fronts and pressure-eligible edges,” and when we turn on the baseline_ops driver it applies small exhaustion and displacement effects. But without a war-start gate and without any orders, control stays fixed and no combat or formation actions occur.

### Summary one-liner

**Turns advance, fronts and pressure are detected, and (with baseline_ops) exhaustion and displacement tick up—but no settlements change hands, no brigades fight, and no new formations are created, because these scenarios don’t trigger the war-start or order-driven parts of the game.**

---

## What would need to change to see “action”?

- **Control flips:** Run a scenario that goes through Phase 0 (referendum) and sets war started, so Phase I control-flip logic can run; and/or provide directives that the engine interprets as “apply pressure / attempt flip” on specific edges.
- **Brigades fighting:** Define what “fighting” means in the engine (e.g. formation vs formation on an edge, or formation vs control), then have scenarios or a UI issue the right directives so that logic runs.
- **New formations:** Add a scenario (or UI) that sets a formation-spawn directive so the pipeline creates brigades from militia pools during the run.

The systems for control flip and formation spawn **exist** in code; they are just **not invoked** by the current scenario set and harness.
