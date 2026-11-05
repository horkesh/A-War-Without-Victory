# [076] CORRECTION result — provenance / event-receipt / force-ratio path (Claude f75b0a11, read-only)

Original 076 report and result are unchanged. Measured history is separated from conditional source findings. No run, test, worker, edit or instrumentation.

Commands saved first, raw outputs and exits: `076-correction-git-*` (exit 0, plus `076-correction-git-type.log`), `076-correction-extract-*` (exit 0), `076-correction-compact.txt`. The compact formatter has no exit file.

## 1. Source binding (measured, full metadata)
`run_meta.json` → `provenance.git_commit` / `provenance.git_dirty` (full key list in `076-correction-extract-out.json`; keys: collapse_enabled, consumed_inputs, git_commit, git_dirty, harness, node_version, schema_version):

| run | git_commit | git_dirty |
|---|---|---|
| n39 | 7b9c242a3d3942a8a64673457c4e75b545dab6e4 | **false** |
| n25, n29, n30, n37, n38 | df3cc3167f387b052ea74e2d008dc5aa84f7b2ff | **true** |

`run_summary.json` has no commit/dirty field (top keys listed in the output). n39's clean commit matches the convergence report's "clean source 7b9c242a…" statement.

Git blob comparison, commit 7b9c242a3 vs HEAD 6ca84e29e (and the working-tree hash; `076-correction-git-stdout.log`): **identical** for `operation_preparation.ts` (fc35ee6a…), `sector_offensive.ts` (5253065b…, the sole tickPreparation caller), `corps_operation_helpers.ts`, `operation_opportunities.ts`. **Different** for `scenario_reporting.ts`, `scenario_runner.ts`, `war_phases.ts` (later diagnostic work).

So for **n39**, the tickPreparation source and its caller are byte-bound to the clean run commit. Not compared: `estimateForceRatio`'s other dependencies (combat_math etc., `getOperationIntelConfidence` helpers outside this file), so "all inputs identical" is NOT claimed. **n30/n37 (dirty df3cc316) are not source-bound** by n39 or by matching consumed inputs; their prep fields match n39's, which is evidence of matching outcome only.

## 2. Existing prepEvents path (measured + source)
- Producer: `sector_offensive.ts:1485` pushes one event per sector_attack tick (sub_phase, intel_confidence, supply_readiness, force_ratio_estimate, commander_assessment, probe_ordered).
- Carrier: `war_phases.ts:1894-1895` sets `context.report.preparation_events`; type `turn_pipeline_types.ts:335`.
- Serialization boundary: the weekly row builder (`scenario_reporting.ts`, `operation_diagnostics` at ~391) has **no reference to preparation**; the only consumer of `turnReport.preparation_events` is the env-gated `emitVlasicTraceLine` (`scenario_runner.ts:2090-2156`, turns 149–156, Operation Vlasic Ridge only, stdout, `AWWV_VLASIC_TRACE=1`). Its own comment (2062-2066) states the weekly report omits `preparation_events` and `preparation_sub_phase`.
- Measured in retained rows (all six runs): `preparation_events` key present in **0** weekly rows (0/186 n38, 0/188 others). Mistral 2 `operation_diagnostics` rows for w175–180: 6/6 present per run, with **no** key matching /prep|assess|intel|sub_phase|elapsed|anti_paralysis|force_ratio/ (positive control: operation_diagnostics non-empty in 6/6 window rows). The 074 spelling-only gap is thus closed for aliases of those names in the diagnostics rows and weekly top level; the events are discarded at the weekly serializer boundary, not retained under another spelling in these files. Whether stdout of the original runs captured any trace is unreported (no Mistral trace exists; the Vlasic one covers another op and window).

## 3. estimateForceRatio return path and caller holds (source; n39-bound blobs)
Force ratio can equal exactly `1.0` only via the sentinels at operation_preparation.ts:450 and :472 (`confidence >= 0.5 ? 3.0 : 1.0` when no known defenders, or defender power 0), otherwise `trueRatio*(accuracyFactor+bias)` (continuous; `0` when no attackers/zero own power). Measured: n30/n37/n39/n38 retained FR is exactly `1` with at-assessment intel `0`; n25/n29 are non-sentinel (10.96, 17.47). Conditional finding: the n30+ tick-5 force ratio is **consistent with** the sentinel path with confidence < 0.5; it is not proved (a continuous result exactly 1 cannot be excluded by source, only by improbability).
Late-state support (final_save, NOT tick 1–5): Mistral 2 `sector_id` and `sector_intel[sector_id]` — n30/n37/n39/n38: `sector:hvo_tomislavgrad:0`, one record (`vrs_2nd_krajina:0`) confidence **0**; n25: `sector:hvo_tomislavgrad:2`, two records conf 0.07/0.11; n29: `sector:hvo_tomislavgrad:0`, three records 0.07–0.11. Note n25/n29 final record confidences (~0.1) differ from their retained at-assessment intel 1, so late sector intel does not reproduce earlier at-assessment values; use it only as "late records exist/zero". Objectives differ too: n30/n37/n39/n38 axis 1 holds only drvar_2/sipovljani_2, n25/n29 axes also include prekaja_2 and bosansko_grahovo targets.
Caller holds after ready (sector_offensive.ts 1518–1686): loaned-brigade wait (only while sub_phase is force_staging), force-ratio floor, `areParticipantsReadyForExecution`, opening-attack readiness, politically-blocked objectives, offensive-ops suppression. Each can `continue` a ready op to the next turn, where `tickPreparation` runs again.

## Corrections to my 076 statements
- "Pre-planned bypass ends at tick 1" was wrong as stated: while the caller holds a planning op, ticks continue, elapsed increments, and the bypass keeps re-returning ready. What stands: the bypass at line 910 returns **before** anti-paralysis (941) and before assessment, so a pre-planned op never has `intel/supply_at_assessment` written by `tickPreparation` (only lines 958–960 and 1054–1056 write them; line 1500 writes only force_ratio). Retained populated at-assessment fields therefore exclude "pre-planned throughout" conditionally on that source and no other writer; the absent `is_pre_planned` flag agrees. Elapsed alone cannot discriminate, as you note.
- Unreported vs measured: the intel value `0` is measured only as the **last** at-assessment write (tick 5 under the source for n30+); earlier-tick intel (including whether it was ≥0.54 and decayed) remains unreported.

## Conditional branch findings (n39-bound source; dirty runs not bound)
1. n39: last at-assessment writer = anti-paralysis at tick 5 (elapsed 5 = max 5, aggressiveness default 3, supply 1). Source-unique for n39 under the byte-bound blobs and assumption that no commander id means defaults (id absent in saved op).
2. n25/n29 (dirty): normal path conditional only (source unbound).
3. Not settled: ticks 1–4 gate for n39 (intel gathering vs assembly vs other), whether ready preceded tick 5, tick-time intel/defender sets. The weekly serializer discards per-tick events; no retained Mistral per-tick receipt exists.

## Missing inputs / smallest next check
Per-tick `preparation_events` for Mistral 2 w176–180 (discarded at serialization), tick-time `sector_intel`/defender set for `sector:hvo_tomislavgrad:0`. Smallest next check needs no new simulation design: the existing event producer is already correct and byte-identical; only the weekly serializer boundary omits it (the Vlasic trace is the existing opt-in pattern, but it is hard-wired to another operation and turns). Any measurement would be a clean-HEAD diagnostic run to w181 recording those events, proposal only, not authorized, and not implied to reproduce the dirty-run behaviour (n39 clean already shows the same final prep fields as dirty n30/n37, which suggests it may).
