# N97 W17 active-offensives probe: offline diagnosis

Date: 2026-10-25  
Source HEAD: `86b693a9423de6a2be13174c36f96ee6a8430801`  
Scope: retained-artifact and source inspection only; no retry, native run, scenario run, browser action, or production-source change.

## Verdict

The single authorized A/B attempt rejected its hypothesis and permits no causal interpretation. Branch B's genuine production intervention produced `{}`, so A and B were semantically identical and neither restored `probe_vrs_herzegovina_t17`. The failed receipt and `interpretation_allowed: false` result remain authoritative.

The A baseline also failed its required V4 fidelity before the cache question could be isolated. This is a real execution-prerequisite mismatch, not an observer projection mismatch: direct `desktop.advanceTurn` did not initialize the production terrain sets that `buildScenarioStartupState` initializes. The mismatched battle and operation touch OSIDs present in the current forest set. That alignment makes terrain initialization the leading baseline candidate, but it is not a causal result because this inspection did not execute an adjusted branch.

The source ordering remains a separate save/resume risk: `generate-bot-corps-orders` is phase 74, `build-active-offensives-cache` is phase 95, and canonical serialization removes the cache. The retained attempt did not prove that risk caused the n97/V4 split because the exact saved input reconstructs an empty cache and no uninterrupted pre-consumer cache value was retained.

## Bound attempt and retained evidence

- Frozen script: `n97-w17-active-offensives-causal-probe.mts`, SHA-256 `8e23b0f3b4b9223cb4e05ca46746fbdde90cb43b4bcac1124e888f4994608b68`.
- Independent review: `/root/offensive_cache_causal_probe/probe_review`; artifact `N97-W17-ACTIVE-OFFENSIVES-PROBE-INDEPENDENT-REVIEW.json`, SHA-256 `c1f90e13d9ea723b48f78c262bf8ddd5739fbe21917077587eed35dd05b1a411`.
- Attempt directory: `n97-w17-active-offensives-causal-probe-01`.
- Preserved wrapper: 4.189 seconds wall time, child exit 1, wrapper exit 1, no timeout, signal, cleanup, or spawn error; artifact contract passed.
- `receipt.json`: SHA-256 `639eff53c15f073e304ebeedda6c58e6051db44d9eee027374d75aa7ab918d24`.
- `result.json`: SHA-256 `a4a3bb72f679b737b87e4c5d332f593e858d2179785e380cbe79cb75e87143bf`; `hypothesis_supported: false`, `interpretation_allowed: false`, `input_mutation: false`.
- A/B reports are byte-identical: 627,255 bytes, SHA-256 `d2a7fab8cda2f166eec5fef2e637c6f057c2f7bccc2594d42d69073ecf3e7244`.
- A/B states have different raw hashes because the inserted cache key has a different object-key position, but recursive key-sorted hashes are both `25013a68c469c8d3886ef18790aea29dac2d7aa71121f4454a9c8283546b4928`; retained `state-diff.json` is `[]`.
- `operation-diff.json` is `[]`; both branches end with `active_offensives_against_corps: {}`.
- All retained raw states, raw reports, diffs, wrapper metadata, logs, launch contract, and the entry-script snapshot were inspected. No retained artifact was rewritten.

## Why the production producer returned `{}`

The exact save-16 input has war phase, turn 16, 18 corps-command records, all corps IDs resolve to formations/factions, and no serialized `active_offensives_against_corps` field. Its 14 active operations contain:

- seven probes, all in planning or recovery; probes are explicitly excluded;
- four non-probe operations in planning (`Operation Circle`, `Maglaj Local Counterattack`, `Operacija Vijak`, `Operation Herzegovina Consolidation`);
- three non-probe operations in recovery (`Operation Jackal`, `Operation Corridor`, `Operation Podrinje Sweep`);
- zero operations in execution.

The production phase at `src/sim/turn_phases/war_phases.ts:2897` only collects operations with `phase === 'execution'`, excludes `reorganization`, `strategic_defense`, and `probe` at lines 2921-2925, and then counts objectives controlled by an opposing defender. Because no input operation passes the execution filter, owners and objective presence cannot make the cache nonempty. `{}` is the exact production result for this saved boundary.

## Why the baseline mismatch is substantive

Control counts match n97 in both branches: HRHB 93, RBiH 261, RS 358. The operation and battle acceptance rows do not:

- Against V4, the sole operation-envelope difference is `vrs_herzegovina | Operation Herzegovina Consolidation`: direct desktop remains `planning` with no recovery reason; V4 is `recovery / defender_power_too_high`.
- Against n97, that same difference remains and the desktop result also lacks `probe_vrs_herzegovina_t17`.
- The first two canonical battle rows match. The third, at `op:travnik:gluha_bukovica`, differs before weekly projection: retained desktop raw power ratio `1.213778631307557`, casualties 243/179; V4 and n97 project from a 1.14 ratio with casualties 248/175.

`buildScenarioStartupState` initializes urban and forest sets at `src/scenario/scenario_runner.ts:1567-1568`. Direct `advanceTurn` at `src/desktop/desktop_sim.ts:375` does not. The module globals default to null; `getForestMult` returns 1.0 while unset and 1.15 for a listed forest OSID once initialized (`src/sim/combat/combat_math.ts:1382-1399`). The production loader resolves `data/derived/operational/*_osids.json` from `process.cwd()`.

The current forest file, SHA-256 `f458666662a072c65b7d5c5e4b89c261399fca0f10476736b83fd914e651fa49`, contains both mismatched targets:

- `op:travnik:gluha_bukovica` (the only differing battle);
- `op:konjic:glavaticevo_2` (the current Herzegovina objective whose lifecycle differs).

The V4 33-file historical shadow manifest did not include the urban or forest files, and the loader uses cwd rather than the shadow `baseDir`; therefore V4 scenario startup read the current repository terrain files. The probe bound their downstream source behavior indirectly but did not initialize the sets. Scenario runner also applies post-turn opportunity-review decisions before weekly diagnostics (`src/scenario/scenario_runner.ts:2971-2979`), which is another path difference; retained evidence does not attribute either observed mismatch to that postprocessing.

## Projection assessment

Existing production weekly projection cannot repair the retained comparison offline:

- the operation envelope was already generated through production `buildOperationCombatDiagnostics` from each retained final state and report;
- the battle mismatch exists in raw ratio/casualty operands before rounding or field selection;
- `buildWeeklyReport` can reproduce the matching control row, but it cannot change `1.213778631307557 / 243 / 179` into `1.14 / 248 / 175`, move an operation from planning to recovery, or create the missing probe.

Changing only the observer projection would hide substantive engine-state/report differences and would not satisfy the frozen acceptance contract.

## Smallest next meaningful proof

Do not repeat this probe unchanged. The smallest new execution should answer a prerequisite question first:

1. Run one bounded, one-turn direct-desktop branch from the same bound save with the same existing production terrain-set loaders/setters invoked by scenario startup. Pass only if its full W17 V4 operation envelope and canonical battle rows match exactly. Expected cost is under 5 seconds with the existing 15-second stop; any mismatch stops the line of inquiry without a retry.
2. If that baseline passes, a cache causality test still requires the authentic cache retained from uninterrupted production immediately before W17 `generate-bot-corps-orders`. Capture that cache and the active-operation inputs at the phase boundary in one bounded uninterrupted run; compare absent versus that authentic captured value through the same prerequisite-complete path. Do not synthesize counts or use the empty post-save producer result as a substitute.

The first run establishes whether the direct path is a lawful V4 comparator. The second is the minimum evidence capable of testing the consumer-before-producer save/resume risk. Neither result would establish the separate fresh-player/native cause, because regular native advance preserves runtime state with `serializeRuntimeState`.
