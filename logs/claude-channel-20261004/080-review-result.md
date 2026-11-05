# [080] Independent review — default-off Mistral preparation observer

**Verdict: GO_PREPARATION_ONLY.** No blocking or nonblocking code-review finding in the reviewed source, test, or retained fixture/collector evidence. This verdict authorizes preparation/integration only. It does not authorize or report a turn-181 run, and it does not alter the standing n42 observational GO, calibration NO-GO, or any town/match/517/Farz acceptance criterion.

## Reviewed boundary

- Base: `HEAD fd5d48163d9d84a09858ffcd95398fab75b93efb`.
- Unstaged source: `src/scenario/scenario_runner.ts`, +114/−0, SHA256 `dca86f0ac0855425ed0e664674d1630910e695b105b03e355933eacb229532a6`.
- Untracked focused test: `tests/scenario_runner_mistral_prep_trace.test.ts`, 251 lines / 10 tests, SHA256 `fc3174f63ded063d86c9684c1883ab56bb5816f3163f2b70dd8ea30e2870a0f4`.
- Implementation report and retained receipts: `080-implementation-result.md`, red/green logs, constructed real-emitter fixture, unchanged `077-revised-collect-trace.cjs`, and collector output.
- Root-owned `logs/prusac-diagnostic-20260929/sana_ivanjska_joint_validation_plan.md` remained outside review and untouched.

## Correctness, canon, and determinism review

- **Exact opt-in and default isolation:** `scenario_runner.ts:2192-2195` checks `process.env.AWWV_MISTRAL_PREP_TRACE !== '1'` before reading either state or report. The focused gate-off tripwire at `tests/scenario_runner_mistral_prep_trace.test.ts:108-121` covers unset, empty, `0`, `true`, `yes`, and whitespace-prefixed `1`; the real-fixture case at lines 123-131 also pins zero writes and unchanged inputs.
- **Observation only:** the enabled path reads existing operation, sector-intel, formation, and turn-report values into new payload objects (`scenario_runner.ts:2197-2264`) and performs only the intended stdout write (`:2266`). It does not assign into state/report, recompute readiness, write run files, alter control, save, readiness, or artifact construction. The deep-frozen enabled test (`tests/...:133-160`) is a meaningful mutation tripwire.
- **Correct call phase and time labels:** the production call is after `runTurn` returns, `state = runResult.nextState`, and the existing headless post-turn decisions (`scenario_runner.ts:2797-2837`, call at `:2856-2861`). The war pipeline increments `meta.turn` before phases (`src/sim/turn_pipeline.ts:136-149`), so the passed scenario-loop `week_index` is correctly labelled `loop_index`, while `turn` is the completed engine turn. `buildWeeklyReport` independently uses `state.meta.turn` as its weekly row index (`src/scenario/scenario_reporting.ts:261-274`). The contract correctly distinguishes preparation events produced by that tick from operation/intel/brigade state observed after the turn.
- **Exact window and missing boundary:** only completed turns 175 through 181 emit (`scenario_runner.ts:2189-2195`). The focused tests pin exact coverage and `loop_index = turn - 1` (`tests/...:183-192`), the turn-175 planning/null control (`:194-214`), a deliberately mismatched caller index that remains observable to the collector (`:216-224`), and an absent-operation row with null/empty observation fields (`:226-236`).
- **Relevant event filtering:** only `Operation Mistral 2` preparation events are retained (`scenario_runner.ts:2228-2230`); the test at `tests/...:162-171` rejects the unrelated operation event. Operation selection is deterministic across corps because corps IDs are `strictCompare` sorted (`scenario_runner.ts:2197-2207`), with a direct two-corps pin at `tests/...:238-250`.
- **Deterministic bytes and lawful order:** `stableStringify` recursively sorts object keys without mutating inputs. The observer explicitly sorts corps lookup; it preserves semantic engine order for the remaining arrays. Sector-intel records are produced sorted by enemy sector ID (`src/sim/combat/sector_intel.ts:81-126`), participating brigade lists are canonicalized by operation creation/maintenance paths, and preparation events follow `advanceSectorOffensives`' sorted corps traversal (`src/sim/combat/sector_offensive.ts:1302-1345`, event append at `:1484-1494`). Preserving preparation-event order is the lawful tick order. The byte-equality test (`tests/...:173-181`) provides a direct same-input check.
- **Claim boundary:** the added comment says the trace exposes values and asserts neither cause nor internal branch (`scenario_runner.ts:2158-2165`). The implementation and tests add no historical-cause claim or calibration conclusion.

## Retained evidence checked

- Test-first RED: `080-implementation-red.exit.txt` = 1; 10/10 tests failed for the intended missing export (`emitMistralPrepTraceLine is not a function`).
- Focused GREEN: `080-implementation-green.exit.txt` = 0; 1 file, 10/10 tests passed.
- Real emitter constructed fixture: `080-implementation-fixture.exit.txt` = 0 and stdout contains exactly seven prefixed lines for turns 175-181. The first line is the required turn-175 planning row with null preparation sub-phase/elapsed and no preparation events.
- Unchanged collector: `077-revised-collect-trace.cjs` SHA256 `ed5ef6295e843d743cdfd3c2112ef05cdc88950a43b9e9ede9ea42ee55dae134`; `080-implementation-collect.exit.txt` = 0; `080-implementation-collect-out.json` reports `pass:true`, seven ordered rows, correct loop/turn relation, and the turn-175 control.
- Review-only hygiene check: source `git diff --check` plus a whitespace scan of the untracked test passed. No implementation test or collector was rerun.

## Findings

- **Blocking / critical:** none.
- **Nonblocking / suggestion:** none.
- **Nice-to-have:** none required for this bounded observer.

## Limits and remaining gate

The seven-line fixture is constructed input passed through the real emitter. It proves emitter/collector compatibility, filtering, indexing, and byte shape; it does not establish the real Mistral trajectory, an internal preparation branch, a historical cause, controller neutrality in a live run, or any calibration acceptance result. Neither `runTurn` nor `runScenario` was executed for this review, and no simulation, campaign, replay, full suite, or turn-181 measurement was authorized or run.

Type correctness is not yet claimed. Per the owner brief, the root will run the type hook once against the final staged diff. This checkout has tracked `.husky` hook scripts but no `.husky/_` dispatcher (`.husky/_/husky.sh` and `.husky/_/h` are absent), so automatic hook execution cannot be claimed from this review.
