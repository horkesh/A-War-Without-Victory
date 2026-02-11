# Campaign branching (B2)

**Status:** Implemented (2026-02-10). Schema, unlock module, and persistence in place; example scenarios with prerequisites added.

## Overview

- **Prerequisites:** A scenario can declare `prerequisites: ["scenario_id_1", "scenario_id_2"]`. The scenario is considered playable only when every listed scenario has been completed.
- **Completed:** A scenario is "completed" when its run has finished (and optionally when victory conditions are met). Completed IDs can be persisted to a JSON file.
- **Unlock module:** `src/scenario/campaign_unlock.ts` provides `getPlayableScenarioIds(allScenarioIds, completedIds, scenarioPrerequisites)` and read/write/mark helpers for the completed set.

## Schema

- **Scenario** ([scenario_types.ts](../src/scenario/scenario_types.ts)): optional `prerequisites?: string[]` (scenario_ids). Loader normalizes: non-empty strings, dedupe, stable sort.
- No engine behavior change for a run itself; prerequisites affect only which scenarios are offered as playable.

## Usage

1. **Build prerequisites map:** When loading scenario list, build `Map<scenario_id, prerequisites[]>` from each scenario’s `prerequisites` (or empty array).
2. **Load completed set:** `readCompletedScenarioIds(filePath)` (e.g. `data/derived/completed_scenario_ids.json`).
3. **Playable list:** `getPlayableScenarioIds(allScenarioIds, completedIds, scenarioPrerequisites)` returns IDs that are either without prerequisites or whose prerequisites are all in `completedIds`. Result is sorted.
4. **On run end:** Call `markScenarioCompleted(filePath, scenario.scenario_id)` to persist (e.g. after successful scenario run).

## Persistence

- **File format:** JSON array of scenario_id strings, sorted (deterministic).
- **Default path:** Caller-defined (e.g. `data/derived/completed_scenario_ids.json`). CLI or launcher can pass path; scenario runner does not auto-write unless integrated.

## Example scenarios

- `data/scenarios/whatif_dec1992_10w.json` — 10 weeks, unlocks after `apr1992_50w_bots`.
- `data/scenarios/whatif_apr1993_26w.json` — 26 weeks, unlocks after `apr1992_50w_bots`.

## Determinism

- Prerequisites and playable list use sorted arrays and deterministic set operations; no randomness.
- Persisted file uses sorted JSON array.

## References

- Implementation plan: [IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md](../40_reports/IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md) §3.2 (B2).
- Tests: `tests/campaign_unlock.test.ts`.
