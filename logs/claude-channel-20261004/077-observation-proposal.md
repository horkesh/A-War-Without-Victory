# [077] Mistral 2 preparation-hold observation — draft proposal (no run, no applied change)

Author: Claude (f75b0a11). Draft only. Base HEAD `6ca84e29e30fc78cd14793d88a9ca234e8710fba`. Nothing in `src/` or `tests/` was edited, no test or run was executed. The patch was generated against a scratch copy under `logs/claude-channel-20261004/077-scratch/` and checked with `git apply --check` (exit 0, receipts below), not applied.

## 1. Question
Which actual early Mistral 2 preparation or outer hold produces the clean n39 delay (first execution week 180, versus 178 in n25/n29), and does it reproduce under the diagnostic source? The final state already fits the anti-paralysis timeout at tick 5 (076, n39-bound), but ticks 1–4 are unobserved (the weekly serializer drops `preparation_events`, 076 correction).

## 2. Smallest default-off observer
Mirror the existing opt-in Vlasic trace. New exported function `emitMistralPrepTraceLine(state, turnReport, weekIndex)` in `src/scenario/scenario_runner.ts`, called once after `emitVlasicTraceLine(state, turnReport)` (scenario_runner.ts:2747). No change to `scenario_reporting.ts`, `war_phases.ts`, the turn pipeline, state, saves, weekly schema or any decision path. `war_phases.ts:1894-1895` and `sector_offensive.ts:1485` already produce and carry the events.

- Gate: `AWWV_MISTRAL_PREP_TRACE=1`; otherwise returns before reading state.
- Scope: post-run `state.meta.turn` 175–181 inclusive (7 lines), Operation Mistral 2 only. Output: one `stableStringify` line per turn on stdout prefixed `[mistral-prep-trace] `, no file written.
- Draft diff: `077-mistral-prep-trace.draft.patch` (3 hunks, 230 added lines, 0 removed): the function with its contract comment, the 3-line call, and the new test file `tests/scenario_runner_mistral_prep_trace.test.ts`. `git apply --check` exit 0 (`077-apply-check.exit.txt`).

### Field origins (what each value is, and is not)
| Field | Origin | Timing |
|---|---|---|
| `preparation_events[]` (only `operation_name == Operation Mistral 2`): `sub_phase`, `intel_confidence`, `supply_readiness`, `force_ratio_estimate`, `commander_assessment`, `probe_ordered` | `sector_offensive.ts:1485-1494` from `tickPreparation`'s result, carried by `context.report.preparation_events` (`war_phases.ts:1895`) | the tick of this turn, built when the tick returns: `sub_phase` is POST-tick; `intel_confidence` is the tick's own confidence (confidence at line 924, before any probe change); `force_ratio_estimate` is post-Una scaling (line 1481, not applicable to this op). An event exists only for ticks that reached `tickPreparation`. |
| `operation.*`: `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `postponement_count`, `commander_assessment`, `commander_officer_id`, `is_pre_planned`, `force_launch`, `supply_readiness`, `*_at_assessment`, `force_ratio_estimate`, `active_probe`, `phase`, `phase_started_turn`, `started_turn`, `planning_duration`, `sector_id`, `loaned_brigade_count`, `participating_brigades` | `state.military.corps_command[hvo_tomislavgrad].active_operations[name]` | read AFTER the whole turn pipeline: post-tick state, NOT pre-tick state and NOT a captured internal branch |
| `sector_intel_for_sector[]`, `brigades[]` | `state.military.sector_intel[op.sector_id]` (copies enemy_sector_id/confidence), `state.military.formations[id]` (location/status) | post-turn |
Not captured: the pre-tick sub-phase, which exit of `tickPreparation` fired (anti-paralysis vs assessment vs hold), `estimateForceRatio`'s defender set. Branch inference rule for review: anti-paralysis fired at tick k iff the event shows `sub_phase=ready`, `commander_assessment=launch`, post-run `preparation_turns_elapsed >= preparation_max_turns`, and the PREVIOUS line's post-tick `preparation_sub_phase` was not `ready`. This rests on nothing else writing `preparation_sub_phase` between turns: the only other writer found is `commander/emit.ts:2056` (isolated-position reduction ops, not Mistral); to be re-verified by the reviewer.

### Turn indexing (derived, then self-checked by the run)
`runTurn` raises `meta.turn` to `week_index + 1` before the war phases (`turn_pipeline.ts:137-141`), so for loop iteration `week_index = W`, the tick and the hook both see `state.meta.turn = W + 1`; the trace line carries both `week_index` and `turn`. Retained facts: Mistral 2 `started_turn=175` ⇒ created in iteration W=174; n25/n29 `phase_started_turn=178`, elapsed 3 ⇒ ticks at W=175,176,177; n30/n37/n39 `phase_started_turn=180`, elapsed 5 ⇒ ticks at W=175–179, execution state visible at W=179/post-run turn 180. Window turn 175–181 covers creation (W=174), all five ticks (W=175–179) and the first execution turns (W=180). Weekly `operation_diagnostics` row index lags the op's `meta.turn` by one in the retained data (n25: `phase_started_turn=178`, first weekly row `phase=execution` at week_index 178; 073 "first execution rows 178 vs 180" use weekly week_index). Self-check (indexing positive control): the turn-175 line must show Mistral 2 present, `phase=planning`, `started_turn=175`, `preparation_sub_phase=null`, elapsed null (created, not yet ticked); a different shape means the indexing assumption is wrong and the trace is not interpreted.

## 3. Bounded proof and review before any run
Existing entrypoints inspected: tests import `src/scenario/scenario_runner.js` directly (`tests/scenario_runner_selected_save.test.ts`); `package.json` `test:vitest` runs `tools/test/run_vitest_default.mjs` with a file filter. There is no existing test of the Vlasic trace. Draft test (4 cases, not run): gate-off emits nothing and leaves state/report byte-identical (`JSON.stringify` before/after); gate-on in-window emits exactly one prefixed JSON line with only Mistral events, correct fields and no mutation; out-of-window (174, 182) emits nothing; Mistral 2 absent in-window gives `operation:null` without throwing.
Required before a run (all NOT executed in this task): (1) `npm run test:vitest -- tests/scenario_runner_mistral_prep_trace.test.ts`; (2) `npx tsc --noEmit`; (3) independent review of the patch (determinism-auditor: no wall-clock/RNG/unordered iteration, stdout only; code review: types, gate-off inertness); (4) re-check the "no other `preparation_sub_phase` writer between turns" claim; (5) commit under the repo hook by Codex (clean tree, recorded diagnostic commit and blob hashes).

## 4. Proposed run (not executed; needs Codex/owner authorization)
Horizon: `--weeks 181` ⇒ `week_index` 0..180, post-run `meta.turn` up to 181 (explicitly not 188; late-188 gates stay unreached). Exact PowerShell (output paths to be finalized by Codex; refuse occupied):
```powershell
$out = 'logs/mistral-prep-trace-20261004/run1'
New-Item -ItemType Directory -Force logs/mistral-prep-trace-20261004 | Out-Null
foreach ($e in 'command.txt','stdout.log','stderr.log','exit.txt') { if (Test-Path "$out.$e") { throw "occupied: $out.$e" } }
Set-Content "$out.command.txt" "`$env:AWWV_MISTRAL_PREP_TRACE='1'; node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 181 --out runs --unique"
$env:AWWV_MISTRAL_PREP_TRACE = '1'
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 181 --out runs --unique > "$out.stdout.log" 2> "$out.stderr.log"
$rc = $LASTEXITCODE
Remove-Item Env:AWWV_MISTRAL_PREP_TRACE
Set-Content "$out.exit.txt" $rc
```
No other `AWWV_*` variable (the n42 run's `AWWV_DEBUG_*` flags are not set; the n39 control's own environment must be confirmed from its retained command receipt before comparing). Extract trace lines afterward with a saved, exit-recorded `Select-String '^\[mistral-prep-trace\] '`. Expected cost: n42 measured 139 weeks in 235.644 s (runner); a linear ESTIMATE for 181 weeks is about 307 s (~5 min), later weeks cost more, so plan 5–8 min plus preflight; the trace itself adds negligible work (7 turns, one corps scan).

## 5. Prerequisites and controls
- Clean diagnostic commit containing exactly the patch, `provenance.git_dirty=false`, `provenance.git_commit` recorded; blob hashes of `operation_preparation.ts`, `sector_offensive.ts`, `corps_operation_helpers.ts`, `operation_opportunities.ts` re-compared to n39's `7b9c242a3` (already identical at HEAD); `scenario_runner.ts` is the only intended source difference vs HEAD.
- Input binding: same `consumed_inputs.digest` (`8f13061b19ed9fd2d899f77f0115fdd4c5379e52cb058b3edadbd00e0e41af20`) and identical `initial_save.json` bytes as n39 (all six retained runs share the digest; initial_save size 1373722).
- Cheap gates first: focused test, `tsc`, independent review, trace-collector script readable on a synthetic sample line (coverage rule below). No cheap integration gate exists (no retained save at ≤ turn 174).
- Collector coverage: exactly 7 `[mistral-prep-trace]` lines, turns 175–181 each once, each line `week_index == turn-1`, JSON parses, indexing control line (turn 175) as above.
- Measured control: retained clean n39 (same scenario, `7b9c242a3`). Compare the new run's weekly rows 0..180, control-event rows, temporal rows (week 0..180) and Mistral 2 `operation_diagnostics` phase timeline with n39's, after normalizing only the documented difference (none expected, trace is stdout-only). The n42 comparator may be reused only if it takes a baseline/weeks parameter; otherwise a read-only comparator needs its own review. Source differences between `7b9c242a3` and the diagnostic commit (the n40–n42 front-writer/dispatcher diagnostics, all default-off) are NOT silently waived: the comparison itself is the neutrality evidence, and no whole-state equality is claimed (n39 has no retained save at turn 181; its final save is turn 188).

## 6. Pass, no-reproduction, first-failure stop
- Pass (reproduction): runner exit 0; preflight/provenance clean; coverage 7/7; indexing control matches; weekly/control/temporal rows 0..180 equal n39; Mistral 2 first execution row at week_index 180. Then the trace lines give the per-tick `sub_phase`/intel/force-ratio/assessment trajectory and the branch inference rule yields the gate that held ticks 1–4, as measured post-tick evidence (not an internal branch capture).
- No reproduction: first execution row ≠ 180, or any normalized row diverges from n39. Disposition: stop, record the first divergent week and field, do NOT interpret the trace as explaining n39 (the diagnostic source or run is not equivalent), no automatic retry, no extension to 188. Clean n30/n37 stay unbound.
- First-failure stop: non-zero runner/preflight exit, dirty provenance, occupied output path, missing/duplicate trace lines, failed indexing control, or first comparison divergence. Stop and diagnose from retained logs; no retry without a new recorded question.
- Reused evidence: 072–076 extractions and acceptances, n39 clean binding, n42 observational GO (front-writer diagnostics). Not closed by this run: original 517, later 737/Varošluk, Majdan, Sanski/Jajce 5/5, the four lost matches, literal-31 provenance, late-188/Farz/HV receipts, and calibration acceptance (calibration stays NO-GO; horizon 181 never reaches 188).

## 7. Receipts
Commands/exits (all 0): `077-make-patch.command.txt` / `077-make-patch.exit.txt`; `077-apply-check.exit.txt` (`git apply --check`, no application). Patch sha256 prefix `3b1b8a932469f083`. Patch-generation scripts: `077-make-patch.cjs`; scratch tree `077-scratch/{orig,new}`.
