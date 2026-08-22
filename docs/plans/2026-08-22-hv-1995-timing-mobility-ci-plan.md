# HV 1995 Timing, Mobility, and CI Evidence Plan

**Date:** 2026-08-22
**Status:** IMPLEMENTED — owner disposition pending
**Owner lane:** R6 historical gameplay depth / engine defect follow-up
**Related command-board row:** R6 (closed calibration lane; this is a narrowly authorized defect follow-up)
**Collision rules:** Work only on `codex/hv-1995-timing-mobility`; preserve the merged historical corrections; do not merge or rewrite `lane/hv-1995-spawn-timing`; implementer and reviewer must differ.
**Phase/workstream covered:** CI baseline evidence, coupled HV expeditionary timing and T3 movement, then separate opportunity-filter diagnostics.
**Current next action:** Owner reviews the measured 609/712 calibration cost and requires a characterized broad-suite comparison before merge.

## Purpose and Non-Goals

Correct the live OSID movement defect that discards orders for the 1995 `hv_phantom` expeditionary wave, while carrying the required `spawn_turn: 150 -> 174` calibration in the same tree. Establish the actual CI baseline behavior before interpreting any new scenario drift. Instrument the silent friendly-objective rejection only as a separate, later slice.

Non-goals:

- Do not refresh `data/derived/scenario/baselines/manifest.json`.
- Do not make 1992 `jna_phantom` formations eligible for new column transit.
- Do not modify the non-operational fallback mover, map geometry, schema version/migrations, UI, or historical roster/equipment corrections.
- Do not merge timing alone or movement alone. If both cannot land, land neither.
- Do not treat improved map matches as proof of a historically correct mechanism.

## External-Agent Execution Contract

Session start is governed by `CLAUDE.md`. Read `.claude/napkin.md`, the latest ledger entries, `docs/life_lessons.md`, `docs/40_reports/20260822_HV_1995_WAVE_HANDOFF.md`, movement authority/canon, determinism guidance, and the targeted source/tests before editing.

Inspect before editing:

- `.github/workflows/event-system-ci.yml`
- `tools/scenario_runner/run_baseline_regression.ts`
- `src/sim/war_phases.ts`
- `src/sim/combat/jna_phantom_brigades.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/bot_brigade_eval_attack.ts`
- `src/sim/combat/osid_column_movement.ts`
- `src/sim/combat/brigade_movement_orders.ts`
- `src/sim/combat/operation_opportunities.ts`
- the corresponding focused tests

Global stop rule: stop without landing either half if the turn-174 change and both live T3 movement paths cannot be kept together, if unexplained nondeterminism appears, or if the 188-week output cannot be restored cleanly after measurement.

Expected boundaries: evidence/plan; coupled timing+mobility implementation; controlled calibration evidence; separate diagnostic instrumentation; documentation/ledger closeout.

## Task Boundary Rules

### Phase 1 — CI and manifest evidence

- Read-only except for this plan/reporting.
- Compare the two named CI logs with a parser that has an injected-failure positive control.
- Establish whether actual hashes changed and whether the workflow caches scenario output.
- Never regenerate or pin the manifest.

### Phase 2 — Coupled timing and live T3 mobility

- May edit `jna_phantom_brigades.ts`, `osid_column_movement.ts`, `brigade_movement_orders.ts`, and focused tests only.
- Write tests first. The contract must fail if either turn 174 or HV movement eligibility is absent.
- Preserve JNA behavior and all existing movement safety gates.
- Run exactly one 188-week calibration on the combined tree; no intermediate timing-only or movement-only calibration.

### Phase 3 — Friendly-objective diagnostics

- May edit `operation_opportunities.ts`, the shared reason-code topic registry,
  the existing opportunity-trace validator, and focused diagnostics/validation tests.
- Must be observability-only, deterministic, stable-ordered, and separately tested/measured.
- Must not alter operation eligibility or objective selection.

No phase may change the schema version or migrations, map data, scenario baselines, or the baseline manifest.

## Phase Sequence

### 1. Settle CI anomaly

Owner: build engineer. Reviewer: independent build/determinism reviewer.

Evidence commands: inspect GitHub runs `32532844577` and `32050627175`; compare every expected/actual artifact pair; inject one fake mismatch as a positive control; inspect workflow and runner source. Handoff: exact changed and unchanged hashes, scenario scope, and cache conclusion.

### 2. Red-first coupled contract

Owner: gameplay programmer. Reviewer: independent gameplay/determinism reviewer.

Tests first:

- An active `hv_phantom` with a valid friendly column route starts transit.
- An active `hv_phantom` with a valid adjacent friendly order moves.
- All six 1995 HV definitions spawn at turn 174, not 150.
- JNA column-start behavior remains excluded.

Run the focused test before implementation and record the expected failures plus a pre-existing passing brigade positive control.

### 3. Minimal implementation

Add only `hv_phantom` to the live OSID column-start and adjacent-order eligibility checks. Apply the six turn-174 definition changes and keep the withdrawal guard/comment consistent. Do not edit fallback movement.

Verification: rerun focused tests, `npm run typecheck`, relevant deterministic repeats, and the full fast test slice. Stop if either coupled half is absent.

### 4. One controlled 188-week calibration

Back up the tracked `data/derived/latest_run_final_save.json`, run the definitive 188-week scenario once on the combined tree, capture run path/hash/metrics and HV movement/battle evidence, then restore the tracked file and prove byte equality to the backup. Do not refresh pins. Scope conclusions only to that run.

### 5. Separate friendly-objective instrumentation

Write a red diagnostics test, implement stable reason-code output for the silent filter, run focused tests, then repeat only the smallest scenario measurement needed to exercise it. Do not combine its calibration evidence with Phase 4.

### 6. Independent review and closeout

Reviewer must not be the implementer. Review the diff, hard coupling, determinism, JNA non-regression, evidence claims, and forbidden-file status. Append `docs/PROJECT_LEDGER.md` and create an implemented report if behavior lands. Update the master roadmap only if the workstream status itself changes.

## Determinism and Save-Schema Gates

No randomness, timestamps, behavior controlled by debug configuration, or unordered emitted collections. Diagnostics must sort identifiers with the repository comparator. Phase 3 may add one optional, validator-covered payload to the existing persisted opportunity trace only when its reason-code topic is enabled; the key must be absent when disabled, and no schema-version or migration change is authorized. Scenario drift is evidence, not permission to update expected hashes. `manifest.json` must remain byte-unchanged.

For every claimed negative check, run a positive control that demonstrates the checker detects the prohibited condition. For each 188-week run, restore `data/derived/latest_run_final_save.json` and verify the worktree explicitly.

## UI and Player-Truth Gates

Not applicable: no UI or read-model edits are authorized. Any player-visible diagnostic surface would require a new plan and UI review.

## Historical and Sensitive-History Gates

The date correction is anchored to the existing fixed Storm event and the already-reviewed historical correction commit. No new historical claim, atrocity mechanic, map paint, or sensitive-history interaction is authorized. Any new historical assertion requires historian review and citations.

## Roadmap and Ledger Closeout

On successful behavior change, append `docs/PROJECT_LEDGER.md` and add an implementation report under `docs/40_reports/implemented/`. Leave `COMMAND_BOARD.md`, `MASTER_ROADMAP.md`, the baseline manifest, and knowledge ledger unchanged unless the evidence changes their declared status or yields a reusable process rule.

## Copy-Ready Prompt

```text
Role and objective: Implement and independently review the coupled 1995 HV expeditionary timing/mobility repair in docs/plans/2026-08-22-hv-1995-timing-mobility-ci-plan.md.

Canon references: Complete CLAUDE.md startup, read the HV handoff in full, then read movement authority, engine invariants, determinism guidance, the canonical war pipeline, and all files listed in the plan.

Determinism and ledger constraints: Red tests first; stable ordering; no random/time-dependent behavior; the optional objective-filter trace payload must be absent unless explicitly debug-enabled; do not refresh the baseline manifest; restore latest_run_final_save.json after every 188-week run; one change per calibration run.

STOP AND ASK triggers: The turn-174 timing and both live T3 movement paths cannot land in the same tree; unexplained hash drift; save output cannot be restored; scope requires map, schema-version/migration, UI, or new historical judgment.

Output format and validation: Report exact files, commands, pass/fail counts, positive controls, scenario run/hash/metrics, restored-file proof, contradictions to prior evidence, independent review findings, and forbidden-file status. Never claim an unmeasured result.
```
