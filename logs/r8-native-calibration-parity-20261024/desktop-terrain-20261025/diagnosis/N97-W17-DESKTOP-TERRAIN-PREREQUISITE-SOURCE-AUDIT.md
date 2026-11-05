# Direct desktop terrain prerequisite: narrow source audit

Date: 2026-10-25  
Bound source: `86b693a9423de6a2be13174c36f96ee6a8430801`  
Scope: static production-path inspection and one not-yet-executed ignored probe.

## Production initialization ownership

The only production calls to `setUrbanOsidSet` and `setForestOsidSet` are in `buildScenarioStartupState` at `src/scenario/scenario_runner.ts:1567-1568`. The sets are module globals in `combat_math.ts`; absent initialization, urban lookup falls back to the hard-coded Sarajevo set and forest lookup returns multiplier 1.0. They are process state, not serialized `GameState`.

Path behavior at this commit:

| Path | Terrain sets primed? | Source reason |
| --- | --- | --- |
| `runScenario`, including resume | Yes | Calls `buildScenarioStartupState` at `scenario_runner.ts:2593-2595` before replacing `state` with the resumed save at lines 2623-2627. The module globals survive replacement. |
| Desktop `Load scenario` | Yes | `loadScenarioFromPath` calls `createStateFromScenario`; its default in-memory path calls `buildScenarioStartupState` at lines 4219-4244. |
| Desktop `New Campaign` for `apr_1992` | No | `startNewCampaign` selects `loadStartupSnapshotState` at `desktop_sim.ts:289-291`; snapshot loading only reads and deserializes the baked JSON at `startup_snapshot.ts:50-56`. The snapshot cannot carry module globals. |
| Desktop `Load state file` / save record | No | `loadStateFromPath` reads, deserializes, and recomputes sector ratings at `desktop_sim.ts:364-368`; neither this function nor the Electron load handlers call the terrain setters. |
| Direct `desktop.advanceTurn` | No | It loads graph and turn inputs but never calls either terrain setter. Its result therefore depends on earlier process history. |

This produces an ambient-state seam: a process that first used `Load scenario` or `runScenario` is primed, while a fresh packaged process that starts the baked campaign or loads a save is not. The same saved state can therefore advance differently depending on which earlier entry point ran in that process.

## Reader and preview risk

The scenario-read receipt is observational and does not own terrain initialization. It cannot make a resume safe by itself; `runScenario` is safe only because it separately builds startup state before installing the resume state.

The desktop `query-combat-estimate` preview also does not prime the globals. It calls `estimateAttackCost`, whose current defender estimate is zero and which does not call `computeDefenderPowerBreakdown`, `getUrbanMult`, or `getForestMult`. Consequently:

- opening a combat preview cannot repair or mask an unprimed advance;
- the preview does not expose the production forest/urban defensive multipliers used by the operation prediction and combat paths;
- any future preview reader that imports the production defender calculation would inherit the same process-global initialization risk unless the terrain prerequisite is owned by the desktop entry point.

No other production setter call site exists under `src`; test setters are confined to tests.

## Frozen probe contract

Script: `n97-w17-desktop-terrain-prerequisite-probe.mts`.

The script does not rerun retained branch A. It binds A's full state/report and failed result/receipt, validates all 33 V4 historical inputs, verifies current terrain bytes equal the files at n94 commit `a913286803a095b6dc3f57a44175081d6ae4b8eb`, and requires both differing OSIDs to be members of the bound forest source. Its sole intervention is:

1. call production `loadUrbanOsidSet` and `loadForestOsidSet`;
2. pass their returned sets directly to production `setUrbanOsidSet` and `setForestOsidSet`;
3. call production `desktop.advanceTurn` exactly once from the bound canonical save 16.

Pass requires exact V4 W17 operation diagnostics, canonical battle rows, and control counts, while preserving the input and all bound files. The run is expected to take under five seconds, is capped at fifteen seconds, and has a one-attempt/no-retry stop. A mismatch stops this hypothesis and requires consolidation of actual production inputs before any replacement hypothesis.

A pass would establish only that terrain initialization is the missing prerequisite in this direct-desktop W16-to-W17 comparison. It would not establish n97 resume causality, active-offensives-cache causality, fresh-player calibration parity, native-runtime qualification, or a production fix.
