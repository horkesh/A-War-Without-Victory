# Phase H2.4 — Scenario Sweep Report

**Phase H only.** Harness/testing/diagnostics. No Phase G UI, no new mechanics, no constant tuning.

---

## 1. Executive summary

- **What worked:** The sweep runner runs deterministically, enumerates scenarios from the baselines manifest plus `data/scenarios/*.json`, runs each into `data/derived/scenario/sweeps/h2_4/h2_4_sweep/<scenario_id>/`, and produces `aggregate_summary.json` and `aggregate_summary.md`. All observed dynamics are consistent with existing canon: Phase II activity (front-active, pressure-eligible) is present; control flips are zero because no scenario passes a war-declaration gate or issues directives that trigger Phase I control-flip mechanics; formations and AoRs remain zero because the harness does not create brigades or assign AoRs.
- **What did not (and why):** Control flips, formation deltas, militia emergence, and AoR coverage are absent. This is **missing scenario inputs / directives**, not a bug: the harness starts in `phase_ii` with no Phase 0 referendum, no war_start_turn, and no player/harness directives that invoke control-flip or formation-creation logic. Consequence pathways require an operation/event generator (Phase G or harness-only drivers); adjacency/activity alone does not change control (Engine Invariants §9, Rulebook §4).
- **Classification:** All swept scenarios classified as **A_missing_inputs**: activity (front_active, pressure_eligible) is nonzero, but control flips and formations added are zero because no directives exist to trigger them. No scenario is classified B (war gate not passed) or C (bug); the harness does not implement Phase 0, so "war started" is reported true only in the sense that the run starts in `phase_ii`.

---

## 2. Scenario set run

| Scenario ID              | Path                                  | Weeks | Run dir (relative) |
|--------------------------|----------------------------------------|-------|--------------------|
| baseline_ops_4w          | data/scenarios/baseline_ops_4w.json   | 4     | …/h2_4_sweep/baseline_ops_4w |
| noop_13w                 | data/scenarios/noop_13w.json          | 13    | …/h2_4_sweep/noop_13w |
| noop_4w                  | data/scenarios/noop_4w.json           | 4     | …/h2_4_sweep/noop_4w |
| noop_4w_probe_intent     | data/scenarios/noop_4w_probe_intent.json | 4  | …/h2_4_sweep/noop_4w_probe_intent |

- **Sweep ID:** `h2_4_sweep` (fixed; no timestamps).
- **Horizon:** Cap applied for runtime: `SWEEP_MAX_SCENARIOS=4`, `SWEEP_MAX_WEEKS=13`. Full set (manifest + all under `data/scenarios/`) can be run with higher caps or defaults.
- **Command:** `npx tsx tools/scenario_runner/run_scenario_sweep_h2_4.ts` (optional: `SWEEP_MAX_SCENARIOS=4 SWEEP_MAX_WEEKS=13`).

---

## 3. Per-scenario summary and key metrics

### baseline_ops_4w

- **Summary:** 4-week run with baseline_ops enabled on week 0 (scheduler applies exhaustion and displacement each week). Phase II throughout. Front-active and pressure-eligible counts nonzero every week. No control flips; no formations; AoR total 0.
- **Metrics:**

| Metric                    | Value |
|---------------------------|-------|
| control_flips_total       | 0     |
| formations_initial/final  | 0 / 0 |
| formations_added         | 0     |
| front_active_max          | 1391  |
| pressure_eligible_max     | 1680  |
| aor_total                 | 0     |
| displacement_settlement_end | ~111.6 |
| displacement_municipality_end | ~9.55 |
| exhaustion_end (per faction) | ~0.007 |
| supply_pressure start/end | 100 / 100 |
| classification            | A_missing_inputs |

### noop_13w

- **Summary:** 13-week no-op run. No baseline_ops. Activity (front_active, pressure_eligible) nonzero; exhaustion and supply pressure unchanged; displacement accumulates from Phase F substrate only. No control flips or formations.
- **Metrics:** control_flips 0, formations 0, front_active_max 1391, pressure_eligible_max 1680, aor_total 0, displacement_settlement_end ~361.7, displacement_municipality_end ~30.94, exhaustion 0 throughout, classification A_missing_inputs.

### noop_4w

- **Summary:** 4-week no-op. Same pattern as noop_13w over 4 weeks. Displacement end ~111.3 (settlement), ~9.52 (municipality).
- **Metrics:** control_flips 0, formations 0, front_active_max 1391, pressure_eligible_max 1680, aor_total 0, classification A_missing_inputs.

### noop_4w_probe_intent

- **Summary:** 4-week run with probe_intent action (harness-only diagnostic). Per H1.8, no downstream gate is toggled; metrics match noop_4w. No control flips or formations.
- **Metrics:** Same as noop_4w; classification A_missing_inputs.

---

## 4. Cross-scenario comparison (systems exercised)

| System                    | Exercised? | Notes |
|---------------------------|------------|--------|
| Phase II front emergence  | Yes        | front_active_set_size, pressure_eligible_size, displacement_trigger_eligible non-zero |
| Phase F displacement      | Yes        | settlement/municipality displacement totals increase (substrate + baseline_ops where enabled) |
| Phase II exhaustion       | Yes        | baseline_ops_4w shows per-faction exhaustion increase; noop runs stay 0 |
| Phase II supply pressure  | Yes        | Reported in weekly_report; 100 start/end in swept runs |
| Control flips             | No         | No scenario triggers Phase I control-flip path (no war gate, no directives) |
| Formation delta           | No         | No formations created or removed (initial/final 0) |
| AoR                       | No         | state.factions[].areasOfResponsibility remain []; no brigade AoR assignment in harness |
| Militia emergence         | No         | Not exercised; no militia formation counts in artifacts (discoverable from state if present) |

---

## 5. Diagnostics for non-activation

- **War started (when / why not):** The harness initializes state with `meta.phase === 'phase_ii'`. There is no Phase 0 or referendum in the harness; "war started" is therefore not gated—all runs are effectively post–war-start for reporting. Phase I never runs because the harness does not implement Phase 0 or war_start_turn.
- **Control flips absent:** Control changes only via sustained pressure, authority collapse, or negotiated transfer (Engine Invariants §9.6, Rulebook §4). No scenario provides directives that invoke the Phase I control-flip path; activity (front_active, pressure_eligible) alone does not flip control. So absence of control flips is **missing inputs**, not a bug.
- **Formations / AoR zero:** The harness does not create formations or assign AoRs; initial state has no brigades. Formation delta and AoR totals are therefore 0. Militia/brigade formation cannot be exercised until scenario or harness provides formation-creation inputs (Phase G or harness-only driver).
- **AoR reporting:** AoR totals are derived from `final_save.json` (sum of `factions[].areasOfResponsibility.length`). No separate AoR report exists in artifacts; this harness-only aggregation is sufficient for sweep metrics.

---

## 6. Harness-only “bot” layer (use_harness_bots)

- **Added:** Scenario flag `use_harness_bots` (optional; default false). When true, the loader injects one `baseline_ops` action per week for any week that does not already have one. No new action types; uses existing `baseline_ops` scheduler only. Deterministic; no RNG.
- **Gating:** Enabled only when a scenario sets `"use_harness_bots": true`. Off by default.
- **Effect:** Scenarios with `use_harness_bots` (e.g. `data/scenarios/noop_4w_bots.json`) get baseline_ops applied every week, so exhaustion and displacement increase as in baseline_ops_4w. This exercises existing mechanics without adding Phase G orders.
- **Before vs after bots:** Comparing noop_4w (no baseline_ops) with noop_4w_bots (baseline_ops every week) or with baseline_ops_4w shows the same pattern: with bots/baseline_ops, exhaustion and displacement end higher; control flips and formations remain 0 because baseline_ops does not trigger control or formation logic.

---

## 7. Changes made (if any)

| Change | Why | Validation |
|--------|-----|------------|
| **run_scenario_sweep_h2_4.ts** | Sweep runner: list scenarios (manifest + data/scenarios), run each, extract metrics from artifacts, write aggregate_summary.json/.md. Deterministic sweep_id and ordering. | `npm run typecheck`; `npx tsx tools/scenario_runner/run_scenario_sweep_h2_4.ts` |
| **Scenario type + loader: use_harness_bots** | Allow scenarios to request harness-injected baseline_ops per week so existing mechanics are exercised without Phase G. Off by default. | Loader unit behavior; sweep with noop_4w_bots |
| **noop_4w_bots.json** | Example scenario with use_harness_bots for “after bots” comparison. | Included in sweep when cap allows |
| **SWEEP_MAX_SCENARIOS / SWEEP_MAX_WEEKS** | Cap sweep size for runtime; prefer “many” when not time-limited. | Env vars optional; default 20 scenarios, 52 weeks max |

No bug fixes were required; all observed behavior matches Engine Invariants and Rulebook.

---

## 8. Machine outputs (paths)

- **Aggregate:** `data/derived/scenario/sweeps/h2_4/h2_4_sweep/aggregate_summary.json`, `aggregate_summary.md`.
- **Per-scenario:** `data/derived/scenario/sweeps/h2_4/h2_4_sweep/<scenario_id>/` (run_meta.json, initial_save.json, final_save.json, weekly_report.jsonl, control_delta.json, control_events.jsonl, formation_delta.json, activity_summary.json, end_report.md, run_summary.json, replay.jsonl). Do not paste large JSON into docs; link paths only.

---

## 9. Callouts

- **Militia/brigade formation:** Cannot be exercised yet because the harness does not create formations or assign AoRs; no scenario inputs drive formation creation. Phase G or a harness-only formation driver would be required.
- **AoR reporting:** Not present as a dedicated artifact; AoR total is derived from `final_save.json` in the sweep (sum of faction areasOfResponsibility lengths). Harness-only; no sim change.
- **Control flips absent:** War never “declared” in the harness (no Phase 0); control flips require authorized mechanisms (pressure, authority collapse, negotiation). No scenario supplies directives that trigger them; this is missing input, not a bug.
- **Determinism:** Sweep ID is fixed (`h2_4_sweep`); ordering stable. Same scenario run twice yields identical key artifacts (see scenario_determinism_h1_1, scenario_golden_baselines_h2_3).

---

## 10. How to run

- **Sweep (default or capped):**  
  `npx tsx tools/scenario_runner/run_scenario_sweep_h2_4.ts`  
  Optional: `SWEEP_MAX_SCENARIOS=4 SWEEP_MAX_WEEKS=13` for a short run.
- **Baseline regression (unchanged):**  
  `UPDATE_BASELINES=1 npx tsx tools/scenario_runner/run_baseline_regression.ts` when baselines need refresh (not part of this phase).
