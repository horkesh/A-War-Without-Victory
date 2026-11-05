# N94 resume attempt 01 failure diagnosis

Date: 2026-10-25

No turn-18 payload may be interpreted. This was the sole reviewed attempt and it must not be retried unchanged.

## Retained outcome

- Wrapper: exit 1; child exit 1; 6.526 seconds; no timeout, signal, spawn error, or cleanup error.
- Artifact contract: pass; `launch.json` and `result.json` both retained.
- Entry snapshot: 17,967 bytes, SHA-256 `4ce5cd903c00f9fc1a89f0cc4b03b48f511e4e574572c8f7f872b2ce93bcffd6`, unchanged at exit.
- Receipt SHA-256: `80442f7b30e0fb2f6c754290d68d1c33efaa026698fc749f0ac326ae9ec5086f`.
- Result SHA-256: `3520d3f37e033db41a88b2507ea49ea05e767dbd25cdee20dede23f9a4649a21`.
- Child result correctly records `faithful:false` and `interpretation_allowed:false`.
- Inner output retained `run_meta.json`, `failure_report.json`, and `failure_report.txt`. No resumed state or weekly row was produced.

## Immediate cause

`runScenario` always calls `buildScenarioStartupState` at `src/scenario/scenario_runner.ts:2593` before it reads the resume save at lines 2623-2627. The startup builder calls `loadOperationalData(baseDir)` at lines 1558-1560. That loader requires:

`data/derived/operational/canonical_to_operational_map.json`

The file is absent from `HEADLESS_FIXED_CONSUMED_INPUTS` and from the n94 `consumed_inputs.files` stamp. The diagnostic built its private root from that stamp, so the file was absent. The broad catch at `scenario_runner.ts:1561` silently left `operationalData` null. This skipped OSID control application at lines 1693-1729 and the operational backfill/front setup at lines 2012-2037. OOB JNA/HV formations still had OSID locations. `canonicalizeStartupState` at line 2043 called `serializeState`, which rejected 20 formations whose OSID controller was null.

The missing map is 221,196 bytes, SHA-256 `d8ca46cf1a5f425cd1ffd45eef3d99b19247128e6fe5ff28e0cad4d3f76fe1ef`. Current bytes are exact to Git object `a913286803a095b6dc3f57a44175081d6ae4b8eb`.

The stdout operation-injection report contained 14 `op_empty` errors and 62 warnings, but it was nonfatal. Because startup lacked its operational mapping, those diagnostics cannot establish a separate defect and cannot be used for causality.

## Input-completeness audit

The stamped inventory is not a complete runtime-read inventory. These additional relevant files are omitted from it and are exact between current HEAD and n94 commit:

| File | Resolution | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `data/derived/operational/canonical_to_operational_map.json` | private `baseDir`; missing and causal | 221,196 | `d8ca46cf1a5f425cd1ffd45eef3d99b19247128e6fe5ff28e0cad4d3f76fe1ef` |
| `data/derived/operational/urban_osids.json` | `process.cwd()` | 641 | `6c5fbdf22a7b837917422b11eb53a975bb855c027cd4c92cb7158fafd9c42e4c` |
| `data/derived/operational/forest_osids.json` | `process.cwd()` | 2,796 | `f458666662a072c65b7d5c5e4b89c261399fca0f10476736b83fd914e651fa49` |
| `data/source/strategic_priorities.json` | `process.cwd()` through the default lookup | 1,287 | `2aa4129919a7a1c93de44f35633c35975c5f7460c8ba2c49e0a87d1d0f8791d0` |
| `data/derived/operational/osid_areas.json` | bundled/current-runtime consumers | 27,012 | `147c09e0ea70fe0f95693e209d4cde014e21d705109a424d42ec375fff0db119` |
| `data/scenarios/army_co_roster.json` | static JSON import | 3,098 | `58f04607c0638e8329d3f9aaafce2183c9f4acff5dfa88bd07b55cef03b17e05` |

The operational map must be materialized into the private root. The other rows do not explain this failure, but a corrected probe must bind their current bytes to the n94 Git objects so fidelity does not rely on an unstated input.

## Gates not reached

The attempt did not reach resume-save reading, deserialization, resume-index validation, resumed initial-state serialization, any turn from 17 through 39, turn-18 Tosici extraction, save-w39 comparison, or weekly-row comparison. It therefore says nothing about the scenario repair/desktop sector-context hypothesis.

The current worktree also has tracked modifications in `tests/cdp_network_collector.test.ts` and `tests/paradox_local_qa_harness.test.ts`. The existing clean-HEAD guard will reject any future invocation before startup. That guard must remain unchanged; a future probe requires a clean, committed source binding.

## Smallest correction and proof sequence

1. Amend only the ignored diagnostic child so its private input root includes the exact operational map and it records full current/n94 bindings for the supplemental inputs above. Preserve the clean-HEAD guard and preserved-preflight wrapper.
2. Before another 23-turn replay, run a fresh, preserved zero-turn resume gate: `weeksOverride=16`, `resumeFromSavePath=save_w16.json`, `resumeFromWeekIndex=16`, hard cap 30 seconds, expected under 10 seconds, one attempt/no retry.
3. Pass only if startup, resume hydration, and resumed initial serialization all exit zero; the emitted initial state must be byte-exact to retained `save_w16.json`; no weekly turn row may exist. Stop on any failure.
4. Only after that gate passes should the owner consider one fresh corrected 17-39 attempt under the prior 120-second fidelity contract.

This sequence tests the observed prerequisite cheaply and does not introduce a new process wrapper or alternate turn pipeline.
