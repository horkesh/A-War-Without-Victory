# Paklarevo / Vlašić trace diagnostic — implementation result

Date: 2026-09-28
Worktree: `codex/april1995-hv-integration-20260927` (isolated; pre-existing uncommitted changes untouched)
Status: **diagnostic implemented and cheap-checked; 156-week prefix NOT run (awaits Codex review + owner authorization)**

## Changed files

| File | Change |
|---|---|
| `src/scenario/scenario_runner.ts` | +105/−1. Added env-gated, read-only `emitVlasicTraceLine(state, turnReport)` helper (exported, ~90 lines incl. doc comment) and one call site in the per-turn loop immediately after the turn completes (`state`/`turnReport` both in scope). Added `CorpsOperation` to the existing `game_state.js` type import. |

No other files modified. No combat, control, map/reference data, criteria, or production operation behavior altered. No second telemetry framework — one helper, one call site, one env gate, matching the existing `reason_code_debug.ts` env-gated instrumentation pattern already in this codebase.

## What the trace emits

One stable JSON line per turn **149–156** (inclusive), printed to stdout after the turn completes, prefixed `[vlasic-trace] `. Keys sorted via the existing `stableStringify` (deterministic, no timestamps). Payload:

- `turn` — `state.meta.turn` after the turn.
- `operation` — the `Operation Vlasic Ridge` entry from `state.military.corps_command[*].active_operations` (searched across all corps, IDs sorted), or `null` if not yet spawned. Fields: `corps_id`, `name`, `phase`, `phase_started_turn`, `planning_duration`, `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `supply_readiness`, `intel_confidence_at_assessment`, `force_ratio_estimate`, `commander_assessment`, `postponement_count`, `staging_osid`, `reinforcement_source`, `attached_brigades`, `primary_sector_brigades`, `minimum_viable_participants`, `minimum_assembled_participants`, `require_all_axes_ready`, `is_pre_planned`.
- `brigades` — per `participating_brigades` entry (engine-fixed order): `id`, `location_osid` (from `state.military.formations`), `status`, `movement` (the `brigade_movement_state` record: status/destination/path/turns_remaining, or `null`).
- `preparation_events` — `turnReport.preparation_events` filtered to this operation (per-turn `sub_phase`, `intel_confidence`, `supply_readiness`, `force_ratio_estimate`, `commander_assessment`, `probe_ordered`).

Opening-readiness thresholds are reported as authored; no readiness evaluation is reproduced and nothing is mutated. When the gate is off the helper returns before touching state — zero effect on simulation state, default artifacts, or deterministic ordering.

## Exact opt-in invocation

Gate: env var `AWWV_VLASIC_TRACE=1` (any other value / unset = fully inert).

Planned prefix command (NOT yet run — Codex reviews this diagnostic first, then authorizes one execution):

```powershell
$env:AWWV_VLASIC_TRACE = '1'
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 156 --unique --out runs *>&1 | Tee-Object -FilePath logs/vlasic-march-timing-20260928/prefix_156w_trace.out
```

(Pass criteria for that run: complete 156-week run, per-turn trace lines for t149–t156, and Paklarevo/control history matching the retained n6 prefix. Stop after one prefix on any failure; no automatic retry or retune.)

## Cheap-check results

| Check | Command | Exit code | Result |
|---|---|---|---|
| Whitespace | `git diff --check` | 0 | clean (only a pre-existing CRLF warning on `docs/PROJECT_LEDGER.md`, untouched by this change) |
| Typecheck | `npm.cmd run typecheck` | 2 | **one pre-existing error, unrelated to this change**: `tests/operation_opportunities_central_bosnia_catalog.test.ts(684,13): error TS2739` — a `FrontEdgeState` fixture in the worktree's pre-existing "2026-09-28 timing candidate" uncommitted test work. Verified pre-existing by stashing only `src/scenario/scenario_runner.ts` and re-running: identical error, exit 2. `scenario_runner.ts` itself typechecks clean. |
| Focused scenario-runner test | — | — | **skipped per task scope**: the three existing scenario-runner tests (`scenario_runner_report_truth`, `scenario_runner_final_seal_contract`, `scenario_runner_artifact_repair`) are source-inspection/artifact-repair tests; none directly covers the per-turn diagnostic seam. |
| Trace smoke test (no scenario run) | `node logs/vlasic-march-timing-20260928/smoke_trace.mjs` | 0 | Verified: gate off → no output; turns 148/157 → no output; turn 150 with op → full JSON line (all fields above); turn 149 without op → `operation: null` line. Raw output: `logs/vlasic-march-timing-20260928/smoke_trace.out` |

## How Codex can inspect the trace

1. **Review the code**: `emitVlasicTraceLine` at `src/scenario/scenario_runner.ts:2088`; call site at `src/scenario/scenario_runner.ts:2725` (inside the week loop, right after the turn-execution if/else, before any reporting aggregation).
2. **Smoke output**: `logs/vlasic-march-timing-20260928/smoke_trace.out` shows the exact line shape for op-present and op-absent turns.
3. **After the authorized prefix run**: `grep '^\[vlasic-trace\] ' logs/vlasic-march-timing-20260928/prefix_156w_trace.out` yields the 8 turn lines (t149–t156). Read `operation.preparation_sub_phase` / `preparation_turns_elapsed` vs `preparation_max_turns`, the per-turn `preparation_events` (`intel_confidence`, `supply_readiness`, `force_ratio_estimate`, `commander_assessment`), and `brigades[].movement` to identify which gate holds execution at planning through t155 and what changes at t156.
4. **Re-run cheaply without the sim**: `node logs/vlasic-march-timing-20260928/smoke_trace.mjs` re-exercises the function with synthetic state.

## Notes for the review

- The diagnostic answers the planned prefix question ("which gate delays execution to t156?") from existing state/report fields only — no retiming, no behavior change.
- `planning_duration` for this opportunity is already 2 (`operation_opportunity_catalog_central_bosnia.ts:645`, "2026-09-28 timing candidate"); the trace will show whether the delay is the preparation state machine (intel/supply/force-ratio), the assembly floor (`minimum_assembled_participants`), or brigade movement (2 of 5 assigned brigades away from Travnik at t156 per the current evidence).
