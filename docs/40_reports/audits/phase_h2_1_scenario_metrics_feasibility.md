# Phase H2.1 — Scenario metrics & tester feasibility audit (REPORT-ONLY)

**Date:** 2026-02-04  
**Scope:** Current codebase and scenario harness. No mechanics invented; no refactors; no canon edits.  
**Purpose:** Determine how to build a robust scenario tester that can answer: how many brigades formed, how much displacement accumulated, how many settlements flipped control and by which mechanisms.

---

## Executive summary

### What questions CAN be answered today

- **Settlement control flips:** How many settlements changed political controller over the run, and in which direction (from→to). **Yes.** End-of-run `control_delta.json` provides `total_flips`, `flips` (per settlement), `flips_by_direction`, `flips_by_municipality`; derived by diffing initial vs final control snapshots.
- **Displacement accumulation:** How much settlement- and municipality-level displacement (capacity degradation) accumulated. **Yes.** Per-week `weekly_report.jsonl` has `settlement_displacement_count/total`, `municipality_displacement_count/total`; `end_report.md` and `activity_summary.json` summarize start→end deltas.
- **Exhaustion and supply pressure:** Faction-level exhaustion and supply pressure at start/end and per week. **Yes.** Weekly report rows include `factions[].exhaustion`, `factions[].supply_pressure`; end report and activity summary aggregate.
- **Activity diagnostics:** Whether fronts/pressure/displacement triggers were active (counts per week). **Yes.** `activity_summary.json` and “Activity over run” in `end_report.md` (front_active_set_size, pressure_eligible_size, displacement_trigger_eligible_size).
- **Determinism:** Same scenario run twice yields byte-identical outputs. **Yes.** Asserted by `scenario_determinism_h1_1.test.ts` for `final_save.json` and `weekly_report.jsonl`; all JSON uses stable ordering (`stableStringify`).

### What is NOT answerable (or only partially) without further Phase H work

- **“How many brigades formed?”** Partially measurable: formation count and brigade count are readable from `state.formations` (each formation has `created_turn`, `kind`). The harness does **not** create formations during a run (initial state has `formations: {}`); no turn pipeline step adds formations. So “brigades formed **this run**” can be inferred only by diffing `initial_save.formations` vs `final_save.formations` (new IDs). There is **no** explicit “formation_created” or “brigade_formed” event; no mechanism tag.
- **“By which mechanism did each control flip occur?”** Not answerable today. Control changes are **not** explicitly evented per flip. The turn report has `phase_i_control_flip` (municipality-level flips from Phase I militia/stability); treaty/negotiation transfer is not applied in the current scenario loop. Control delta is computed by **state diff only** (initial vs final snapshot); there is no attribution to “Phase I pressure”, “fragmentation”, or “negotiated transfer” in the output.
- **Population-weighted displacement:** Out of scope per audit. State holds capacity degradation [0,1] per settlement/municipality; no population mass is stored. Aggregate “displacement mass” in population terms would require population data and is explicitly out of scope.

---

## A) Scenario runner & outputs

### Runners and entrypoints

| Entrypoint | Purpose |
|------------|--------|
| `src/scenario/scenario_runner.ts` → `runScenario()` | Main harness: load scenario, run N weeks, write all artifacts. |
| `tools/scenario_runner/run_scenario.ts` | CLI: `npm run sim:scenario:run -- --scenario <path> [--out <dir>]`. |
| `runProbeCompare()` | Baseline (probe_intent stripped) vs probe run; writes `probe_compare.json` / `probe_compare.md`. |
| `runOpsCompare()` | Noop vs baseline_ops scenario; writes `ops_compare.json` / `ops_compare.md`. |
| `src/scenario/baseline_ops_sensitivity.ts` → `runSensitivityHarness()` | Parameterized baseline_ops runs; one report + per-run dirs. |
| `tools/scenario_runner/diagnose_scenario_run.ts` | Prereq check + short run; lists emitted files or failure path. |
| `tools/scenario_runner/run_scenario_with_preflight.ts` | Wrapper: data check then run. |
| `src/cli/sim_scenario.ts` → `runScenarioDeterministic()` | Different harness (state in, options); used by other tests/CLIs, not the scenario JSON loader. |

### Per-run outputs (run directory)

| Artifact | When | Deterministic / diff-stable |
|----------|------|----------------------------|
| `run_meta.json` | After mkdir (first write) | Yes; no timestamps. |
| `initial_save.json` | Before week 0 turn | Yes; canonical serializeState. |
| `final_save.json` | After last week | Yes; same serialization. |
| `weekly_report.jsonl` | One line per week (during loop) | Yes; stableStringify per row. |
| `replay.jsonl` | One line per week (actions + optional state_hash on last) | Yes; stableStringify. |
| `run_summary.json` | End of run | Yes; stableStringify. |
| `control_delta.json` | End of run (diff initial vs final control) | Yes; stable key/array ordering. |
| `end_report.md` | End of run | Yes; no timestamps; stable ordering in referenced data. |
| `activity_summary.json` | End of run | Yes; stableStringify. |
| `sensitivity_run_metrics.json` | Per sensitivity run (when using sensitivity harness) | Yes. |
| `failure_report.txt` / `failure_report.json` | On throw after run_meta | Yes; no timestamps. |
| `save_wN.json` (optional) | When `emitEvery > 0` | Yes; same as final_save schema. |

### Per-turn vs end-of-run

- **Per-turn:** `weekly_report.jsonl`, `replay.jsonl`. Each line is one week; ordering is stable.
- **End-of-run only:** `initial_save.json`, `final_save.json`, `run_summary.json`, `control_delta.json`, `end_report.md`, `activity_summary.json`.
- **Determinism:** Same scenario + same data run twice produces byte-identical `final_save.json` and `weekly_report.jsonl` (asserted in `tests/scenario_determinism_h1_1.test.ts`). All JSON uses deterministic key ordering; no derived state in saves (Engine Invariants §13.1).

---

## B) Formations / brigades

### First-class entities

- **Yes.** `GameState.formations` is `Record<FormationId, FormationState>`. Each formation has `id`, `faction`, `name`, `created_turn`, `status`, `assignment`, optional `kind` (default `'brigade'`), `readiness`, `cohesion`, `activation_gated`, `activation_turn`, etc. (see `src/state/game_state.ts`, `FormationState`).

### Where formations are created

- **Creation sites:** `src/cli/sim_generate_formations.ts` (writes `state.formations[formationId] = formation`) and `src/cli/sim_formations.ts` (add/remove/update formations). Neither is invoked by the scenario runner.
- **Scenario harness:** `createInitialGameState()` in `scenario_runner.ts` sets `state.formations = {}`. The turn pipeline does **not** create or delete formations. So for noop and baseline_ops scenarios, formation count stays 0 unless a scenario action or future Phase G path injects formations.

### Read-only indicators

- **Brigade count / formations total:** Read from `state.formations`; keys sorted; filter by `kind === 'brigade'` (or use `formation_lifecycle.computeFormationLifecycleReport(state)` which exposes `brigade_count`, `formations_total`, readiness breakdown).
- **“Formed this run”:** No explicit event. Can be computed in a Phase H tester by: load `initial_save.json` and `final_save.json`, compare `Object.keys(initial.formations)` vs `Object.keys(final.formations)`; new IDs = formations added during run. Optional: filter by `kind === 'brigade'` and/or `created_turn >= initial.meta.turn` for “brigades formed this run” (if creation timestamps are trusted).

### Conclusion (brigades formed)

- **Currently measurable from state:** Total formations, brigade count (by kind), and “new formations this run” via diff of initial vs final saves. No per-event “brigade_formed” emission.
- **Partially measurable:** “Brigades formed” is measurable as a **count** from state; **mechanism** (who created them, e.g. player order vs script) would require Phase G or harness-only stubs (e.g. a scenario action that creates formations and tags source).

---

## C) Political control change

### Code paths where political_controller can change

1. **Initialization:** `political_control_init.initializePoliticalControllers()` sets `state.political_controllers` once at game setup (from municipality/settlement data). Not a “flip” during run.
2. **Phase I control flip:** `src/sim/phase_i/control_flip.ts` → `runControlFlip()` → `applyFlip()`. Mutates `state.political_controllers[sid] = newController` for all settlements in the flipped municipality. Triggered from `turn_pipeline.ts` step `phase-i-control-flip` (after war active, with graph and edges). Mechanism: Phase I militia/stability (flip-eligible municipality, adjacent hostile, strongest attacker).
3. **Treaty / negotiated transfer:** `src/state/treaty_acceptance.ts` and related treaty logic reference `transfer_settlements` and `recognize_control_settlements`; **no code path in the scenario runner applies treaty outcomes to state**. So in the current harness, control change from negotiation is not exercised; if it were, it would be a second mechanism (not yet wired in scenario loop).

### Explicitly evented vs state-diff

- **Not explicitly evented per flip.** The turn report includes `phase_i_control_flip` with `flips: Array<{ mun_id, from_faction, to_faction }>` (municipality-level). The scenario runner does **not** persist this report per turn into the run directory; it is only in memory during the turn. End-of-run control analysis uses **state diff only:** `extractSettlementControlSnapshot(initial)` vs `extractSettlementControlSnapshot(final)` → `computeControlDelta()` → `control_delta.json` (settlement-level flips, direction, municipality aggregates). So:
  - **Settlement-level flips:** Yes, robustly counted and listed in `control_delta.json`.
  - **Mechanism attribution:** No. Control delta does not tag “Phase I”, “fragmentation”, or “negotiated”; it only records from/to per settlement.

### Mechanisms (canon)

- Per Rulebook §4.3 and Engine Invariants §9.6: (1) Sustained opposing military pressure, (2) Internal authority collapse or fragmentation, (3) Negotiated transfer. Only (1) is implemented in the turn pipeline (Phase I control flip). There is no “mechanism” field on flips in current output.

### Conclusion (control flips)

- **Settlement control flips:** Can be counted and listed robustly from `control_delta.json` (total_flips, flips[], flips_by_direction, flips_by_municipality).
- **By which mechanism:** Not available. Adding mechanism tags would require either (a) emitting and persisting per-turn control-flip (and treaty) reports and merging with control delta, or (b) augmenting the control-delta pipeline with mechanism attribution (Phase H–only if we derive mechanism from existing report data without new gameplay).

---

## D) Displacement metrics

### State fields

- **Settlement-level:** `state.settlement_displacement?: Record<SettlementId, number>` — capacity degradation [0, 1]. Monotonic; never decreased. Optional `settlement_displacement_started_turn` (reporting only).
- **Municipality-level:** `state.municipality_displacement?: Record<MunicipalityId, number>` — capacity degradation [0, 1]. Monotonic. Also `state.displacement_state` (Phase 21 per-municipality displacement state) and `phase_i_displacement_initiated` (hook only).

### Monotonicity and bounds

- Canon and implementation: settlement and municipality displacement are [0, 1] capacity degradation, monotonic. No upper bound above 1 for these fields. Confirmed in `game_state.ts` and usage in `scenario_reporting.ts` (aggregates).

### Aggregate metrics already available

- **From weekly report row:** `settlement_displacement_count`, `settlement_displacement_total` (sum of values > 0), `municipality_displacement_count`, `municipality_displacement_total`. Stable ordering (sorted keys).
- **From end report / activity summary:** Start vs end displacement totals (from first/last weekly row); run-level activity counts.
- **Safe to compute in Phase H:** Total displacement mass (sum over settlements or municipalities), mean/max per settlement (from state or weekly rows). No population weighting in state; population-weighted displacement is **out of scope** (expected).

---

## E) Exhaustion / supply / fronts (supporting diagnostics)

### Exhaustion fields and scale

- **Faction-level:** `state.factions[].profile.exhaustion` and `state.phase_ii_exhaustion?.[factionId]`. Phase II pipeline and baseline_ops update both; monotonic, unbounded (Engine Invariants §8).
- **Optional local:** `state.phase_ii_exhaustion_local?.[settlementId]` — monotonic when present.
- **Accessibility:** Weekly report rows include `factions[].exhaustion`; activity summary and end report include exhaustion deltas. All from state; no derived state serialized (Engine Invariants §13.1).

### Front / pressure metrics

- **Activity summary / weekly activity:** `front_active_set_size`, `pressure_eligible_size`, `displacement_trigger_eligible_size` (from Phase F displacement trigger report). Useful for “was anything active?” diagnostics.
- **Turn report:** `phase_ii_front_emergence`, `phase_f_displacement.trigger_report`; not written to run directory, only used in-memory for weekly row and baseline_ops scope.

### Derived state

- Confirmed: no derived state is serialized in saves. `serializeGameState` only allows canonical top-level keys; corridors, fronts, municipality status are recomputed each turn (Engine Invariants §13.1–13.2).

---

## F) Determinism & regression suitability

### Byte-identical re-runs

- **Yes.** `tests/scenario_determinism_h1_1.test.ts` runs the same scenario twice and asserts `final_save.json` and `weekly_report.jsonl` are byte-identical. Same scenario + same data implies same outputs.

### Stable-order JSON

- **Yes.** All JSON written by the harness uses `stableStringify` or `serializeGameState` (deterministic key ordering). No timestamps in state or in report artifacts (Engine Invariants §11.1–11.2).

### Golden-baseline regression

- **Current:** Determinism test compares two runs; no stored “golden” file yet. To support golden-baseline regression: (1) store a committed `final_save.json` (or a digest) and/or `weekly_report.jsonl` for a chosen scenario (e.g. noop_4w); (2) run scenario and diff (or compare digest) to golden. Required: fixed scenario file, fixed data prerequisites, and no env-dependent paths in serialized output (already the case). Phase H can add a test that runs one scenario and compares output to a committed baseline (hash or full JSON).

---

## What exists now (by metric category)

| Category | What exists | Where |
|----------|-------------|--------|
| Control flips (count, direction, municipality) | control_delta.json, end_report.md | scenario_end_report.ts, scenario_runner.ts |
| Displacement (settlement/mun counts and totals) | weekly_report.jsonl, end_report, activity_summary | scenario_reporting.ts, scenario_end_report.ts |
| Exhaustion / supply pressure | weekly_report.jsonl (per faction), end_report | scenario_reporting.ts, scenario_end_report.ts |
| Activity (front-active, pressure-eligible, displacement-trigger) | activity_summary.json, end_report “Activity over run” | scenario_runner (from turn report), scenario_end_report.ts |
| Formations/brigades (count from state) | initial_save, final_save (state.formations) | serializeGameState; no dedicated report field |
| Determinism | final_save + weekly_report byte-identical | scenario_determinism_h1_1.test.ts |

---

## What is missing (clearly separated)

- **Per-flip mechanism attribution:** Control delta does not tag “Phase I”, “fragmentation”, or “negotiated transfer”. Would require persisting turn-level control-flip (and treaty) reports or augmenting delta with mechanism.
- **“Brigades formed this run” as a first-class metric:** Only derivable by diffing initial vs final formations; no event stream or single report field.
- **Per-turn control-flip history in run directory:** `phase_i_control_flip` exists in turn report but is not written to JSONL or similar; only end-of-run diff is stored.
- **Population-weighted displacement:** Out of scope; not in state.

---

## What can be added safely in Phase H (harness/diagnostics only)

- **Formation delta report:** End-of-run artifact (e.g. `formation_delta.json`) comparing `initial_save.formations` vs `final_save.formations`: new IDs, removed IDs, count by kind (e.g. brigade). Read-only from state; no new mechanics.
- **Mechanism tagging for control flips (best-effort):** If turn reports (e.g. `phase_i_control_flip`) are persisted per week (e.g. in a new JSONL or in extended weekly row), a post-pass could attribute settlement flips to “Phase I” where mun_id matches and timing fits; fragmentation/negotiation would remain unattributed until those paths write control. Alternatively, add an optional “control_events” stream that the turn pipeline appends to when it applies flips (harness-only event log, no gameplay).
- **Golden-baseline regression test:** Commit a baseline artifact (hash or file) for a fixed scenario and compare after run.
- **Stable control-delta ordering and schema:** Already stable; document for regression.

---

## What must wait for Phase G or later

- **Player intent / orders / UI (Phase G):** Any metric that depends on “what the player ordered” (e.g. formations created by order, control changes triggered by orders). Scenario tester can remain agnostic of UI; it only needs state and, if desired, harness-only event logs.
- **Negotiation / end-state (Phase O):** Treaty-driven control transfer and recognition; mechanism tag “negotiated transfer” once treaty application is wired into the scenario loop.
- **New mechanics or balance:** No new gameplay rules, constants, or canon changes in this audit.

---

## Recommended next implementation phase (name + scope)

- **Phase H2.2 — Scenario metrics: formation delta and optional control-event log (harness-only).**
  - **Scope:** (1) Add end-of-run `formation_delta.json` (or equivalent): diff `initial_save.formations` vs `final_save.formations` (new/removed IDs, counts by kind). (2) Optionally persist per-turn control-flip report (e.g. extend replay or add `control_flip_report.jsonl`) so mechanism attribution can be inferred in a later step; or add a minimal “control_events” log written when control flip or treaty applies. No new game mechanics; read-only from state plus optional event stream from existing pipeline.
  - **Out of scope for H2.2:** Population-weighted displacement, Phase G UI, Phase O negotiation wiring.

---

## FORAWWV note

**If the team finds that lack of per-flip eventing makes “mechanism” fundamentally ambiguous** (e.g. multiple mechanisms could produce the same state diff), then **docs/FORAWWV.md may require an addendum** clarifying that scenario-level “why did this settlement flip?” may remain underdetermined without an explicit control-event or mechanism log. Do NOT edit FORAWWV automatically.

---

*End of Phase H2.1 audit. Report-only; no code or canon changes.*
