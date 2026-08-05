# R4 Phase 2 Runtime Cadence Proof

**Date:** 2026-08-01
**Roadmap:** R4, Phase 2, Task 2.2
**Baseline:** `2e8fcb0937e2f2a8f939bbe7a3ffa3f80b957a0b`
**Branch:** `codex/r4-phase2-runtime`
**Result:** Task 2.2 complete; Phase 2 closed; R4 continues at Phase 3

## Outcome

Three fresh `apr1992_definitive_104w` headless campaigns completed serially under one exclusive scenario/performance lease. Each designated RBiH, RS, or HRHB run reached turn 104 with exit code `0`, emitted the same final state, and tore down to zero attached runner processes before the next run started. Fourteen substantive artifacts are byte-identical across all three accepted runs. The final save is `6,630,269` bytes, final state hash `afbe45d807e19e8b`, and SHA-256 `afbe45d807e19e8bd098af0b7dcd9be92b3f51caedffd85ca6b30af3149ede0b`.

The scenario runner has no player-faction switch: a headless campaign evaluates all three factions in one deterministic save. The lane therefore ran three independent campaigns, designated one per faction, then consumed the designated faction row from that run while retaining each complete all-faction cadence report. This does not manufacture player choices or mislabel one shared save as three different player campaigns.

The accepted source registry still contains zero optional presidential initiatives. Every unsupported long interval is an exact evidence-bound positive hold. No generic Authority-spend content appears. Task 2.2 is complete without a gameplay, scenario, baseline, package, Electron, release, or `FORAWWV.md` change.

## Exact campaign commands

```powershell
npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_104w.json --weeks 104 --out tmp-r4-phase2-runtime/rbih-accepted
npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_104w.json --weeks 104 --out tmp-r4-phase2-runtime/rs-accepted
npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_104w.json --weeks 104 --out tmp-r4-phase2-runtime/hrhb-accepted
```

The large raw products were moved without rewriting their bytes to the ignored local archive `runs/r4_phase2_runtime_20260801/`. The tracked [replay manifest](../audits/20260801_R4_PHASE2_RUNTIME_REPLAY_MANIFEST.json) records every accepted raw path, byte count, digest, exact diagnostic command, teardown receipt, and the one rejected wrapper-timeout attempt.

## Deterministic campaign evidence

| Artifact | Bytes | SHA-256 | Three-run result |
|---|---:|---|---|
| `final_save.json` | 6,630,269 | `afbe45d807e19e8bd098af0b7dcd9be92b3f51caedffd85ca6b30af3149ede0b` | identical |
| `run_summary.json` | 366,553 | `c60a1a3954f7cfea3a5c0534025188651a6cf2438b1118c4728541c34cb9b545` | identical |
| `weekly_report.jsonl` | 951,139 | `d2c5b176c0001f1d3a22775a8d8e90b7c246231bcc408f64950331398e66e1d6` | identical |
| `end_report.md` | 41,199 | `e407431fa5bb074275c0b0416c5bb6907c33f9f92d8ccb0ffcfb960aec4aa3a3` | identical |
| `control_delta.json` | 21,648 | `2b4cd2bb78db3570b6b9afe39bcd2a39d88ea29f6d5cdf0b9755478e50768f96` | identical |
| `formation_delta.json` | 3,317 | `9559ec29d499b60638a779e09085e79c5f361a9752c49ab95b303026878dd155` | identical |
| cadence report | 39,803 | `1e4a61efcdae342f5e7e9f6400af8a57e838dd5e909ba833a1fb0e577cb9e1c2` | identical |

Eight additional substantive raw artifacts also match and are enumerated in the replay manifest. `run_meta.json` is excluded from byte identity because it embeds the deliberately different output path.

## Decisions, briefings, and holds remain separate

The [canonical cadence report](../audits/20260801_R4_PHASE2_RUNTIME_CADENCE.json) counts only `required_authored` and `optional_source_backed` receipts as actual sourced decisions. Reserve activity, generic command-presence actions, and informational notifications remain `ordinary_emergent` or `notice`; they do not close a decision gap. A positive hold explains an unsupported long interval but does not become a decision receipt.

| Designated faction | Actual decisions: required / optional | Briefing/activity: ordinary / notice | Maximum actual-decision gap | Exact positive holds | Unresolved / invalid holds |
|---|---:|---:|---:|---|---:|
| RBiH | 17 / 0 | 6 / 0 | 18 turns | 20-38, 40-54, 54-70, 82-97 | 0 / 0 |
| RS | 12 / 0 | 8 / 3 | 23 turns | 17-40, 40-56, 56-70, 76-89 | 0 / 0 |
| HRHB | 18 / 0 | 24 / 2 | 15 turns | 40-51, 52-65, 87-102 | 0 / 0 |

The 8-10-week review target applies only where the source catalog supports a legitimate presidential lever. The accepted BB1/BB2 audit supports none for these intervals, so the correct result is eleven positive holds, not eleven fictional choices. Required authored decisions still appear at their supported turns; optional-source-backed count remains zero for every faction.

## Decision-policy truth

The final save records `decision_mode: historical`. All `55` event responses use `bot_ai_default`. The `40` events with an authored `historical_default_response_id` match that default exactly, with zero divergence. The remaining `15` events have no authored historical default and therefore use the documented deterministic first-option fallback. This is the accepted headless policy; the report does not upgrade those fallback rows into sourced historical proof.

The save ends with zero pending event decisions and zero pending notifications. No decision was injected by this lane.

## Source, Authority, and unsupported-content checks

The [positive-hold bundle](../audits/20260801_R4_PHASE2_RUNTIME_POSITIVE_HOLDS.json) is `6,920` bytes, SHA-256 `2a75eb6dcfd0f5c7d9f6ff3069f96025394812b4ea7ecd97c26b6f7f317097e8`, and binds:

- scenario and deterministic run id;
- turn range `0-104` and exact source-save bytes;
- the accepted source-audit file hash and `positive-hold-source-inventory` anchor; and
- all eleven exact faction/gap endpoint turns and receipt-ID sets.

The APR1992 initiative registry contains `0` rows. Case-insensitive scans of the accepted raw save/report products, all three raw cadence reports, and the hold bundle found `0` matches for generic `spend Authority`/`Authority spend` content. No unsupported initiative exists.

Command Authority cadence remains explicitly `unreported` for all three factions because a headless final state is not a weekly owner-observation bundle. No Authority week or cap state was inferred.

## Diagnostics and rejected evidence

Each accepted campaign repeated the existing unresolved-assignment warning for `rs_65th_protection_motorized_regiment` and already-owned-objective warnings for Operation Jajce and Operation Bosanski Novi. The replay manifest summarizes those stdout warnings and records `processCountAfterExit: 0`, but these are historical manifest attestations: raw stdout/stderr logs and raw process-list snapshots were not retained. They are nonblocking execution bookkeeping and cannot be independently reconstructed byte-for-byte from the tracked packet.

The retained accepted `end_report.md` files are byte-identical and each reports `0` critical, `3` warning, and `11` info anomalies. The warning classes are `frontline_density_imbalance`, `undefended_painted_mismatch`, and `adjacent_uncontested_territory`. They are explicit simulation-anomaly findings, not presidential-cadence bugs, and this correction does not close or reclassify them.

The first RBiH attempt used a 120-second command wrapper. It reached artifact emission, then the wrapper closed stdout and Node reported `EPIPE`; the command exited `124`. Its final-save hash independently matches the three accepted runs, but the attempt is retained only as rejected infrastructure evidence. RBiH was rerun from scratch with a 20-minute foreground timeout and exited `0`.

The original cadence run exposed no simulation-source bug. Review later found an evidence-classification bug: a turn-97 RBiH hold rationale named the turn-102 Washington response because the hold contract bound turns but not receipt IDs. The corrected schema binds both endpoint turns and exact receipt-ID sets; regression tests reject a same-turn hold whose declared endpoint ID differs from the computed gap.

## Verification

Passed:

```powershell
npm.cmd run test:vitest -- tests/presidential_initiatives.test.ts tests/rs_104week_decision_cadence.test.ts tests/event_timing.test.ts tests/event_timeline_integrity.test.ts --pool=forks --reporter=dot
# 4 files / 51 tests

npm.cmd run test:baselines
# Baseline regression: all scenarios match. No baseline refreshed.

npm.cmd run typecheck
```

The three scenario commands and three provenance-bound cadence commands each exited `0`. Final teardown found no Node process attached to the worktree's scenario runner.

The later endpoint correction passed the expanded cadence/provenance/source/timing matrix at `7` files / `82` tests, a fresh TypeScript check, JSON parsing, and tracked replay-manifest hash/size verification. It regenerated diagnostics from retained accepted saves only; it did not rerun a campaign or refresh a baseline.

## Scope

The correction changes only the read-only cadence diagnostic contract, its tests/fixtures, regenerated cadence evidence, and governance documentation. It does not alter simulation runtime behavior, event/initiative content, historical choices, accepted campaign saves, scenario data, save schema, deterministic baselines, package/version/tag, Electron output, publication/release state, or `docs/10_canon/FORAWWV.md`. R4 remains closed through Phase 2 and advances to Phase 3 event reachability and two-level surfacing.
