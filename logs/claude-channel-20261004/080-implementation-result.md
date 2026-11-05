# [080] Default-off Mistral observer — implementation result (Claude f75b0a11)

Implemented in this checkout, **unstaged and uncommitted** (`git diff --cached` empty). No campaign, replay, suite, `runTurn` or scenario execution; no docs, hooks, config, commit, push, other worker or timer. All 077–079 artifacts and retained runs untouched. `logs/prusac-diagnostic-20260929/sana_ivanjska_joint_validation_plan.md` shows as modified in `git status`; that is Codex's root-owned doc, not mine.

## Files and hashes
| File | State | git blob | sha256 |
|---|---|---|---|
| `src/scenario/scenario_runner.ts` | modified, +114 / −0 lines (git diff --stat; blank lines included; hunks: new exported function + contract comment; 3-line call after `emitVlasicTraceLine`) | `400fdca7679e298b560748081fbe6c5e1f752a1a` | `dca86f0ac0855425ed0e664674d1630910e695b105b03e355933eacb229532a6` |
| `tests/scenario_runner_mistral_prep_trace.test.ts` | new, 251 lines, 10 tests | `913b6898f3eb8d99dbce1afb468eba70407322ce` | `fc3174f63ded063d86c9684c1883ab56bb5816f3163f2b70dd8ea30e2870a0f4` |
Base `HEAD fd5d48163d9d84a09858ffcd95398fab75b93efb`; `scenario_runner.ts` was unchanged from the draft's base blob (`30cb63b8…`), so the preserved patch applied cleanly. Source diff receipt `080-implementation-diff.src.patch` (sha256 `d5e15116…1f1`, +114/−0 incl. blank lines).
Draft provenance: `077-revised-mistral-prep-trace.draft.patch` sha256 `fee9c904aa97d386464c33fcc0449610a11862c3b58a62f0fe6fb5f968909e98` (matches yours). Source hunks applied with `git apply --include=src/scenario/scenario_runner.ts` (exit 0); I then shortened the contract comment (removed the n39 numbers and the "fits the anti-paralysis timeout" sentence, so the comment asserts no cause or internal branch). The test file is NOT the draft: it was rewritten test-first (below).

## Pre-implementation checks (cheap)
Symbols/imports exist in `scenario_runner.ts`: `CorpsOperation`, `GameState`, `TurnReport`, `strictCompare`, `stableStringify`; the loop variable `week_index` is in scope at the call site; `sector_id`, `loaned_brigades`, `active_probe`, `commander_officer_id`, `force_launch`, `supply_readiness`, `postponement_count` exist on `CorpsOperation`; `SectorIntelRecord` has `enemy_sector_id`/`confidence`. Other tests already import `scenario_runner.js`, so the focused vitest import path is valid. No manual `tsc` run (the tracked hook will do it once on the final staged source).

## Test-first sequence (command, raw output, exit; all `080-implementation-*`)
1. **RED** `080-implementation-red.*`: `node node_modules/vitest/vitest.mjs run tests/scenario_runner_mistral_prep_trace.test.ts` → exit **1**, 10 failed / 10, each "emitMistralPrepTraceLine is not a function" (failing for the intended reason).
2. Apply source hunks: `080-implementation-apply.*` exit 0.
3. Comment tightened with two edits (no receipt command; visible in the diff receipt).
4. **GREEN** `080-implementation-green.*`: same command → exit **0**, 1 file, **10 passed / 10**.

## Test coverage (10 tests)
Gate off returns before any state/report access (a tripwire `Proxy` throws on any get/has/ownKeys; values unset, `''`, `0`, `true`, `yes`, ` 1` all inert, zero writes); gate off with real fixtures writes nothing and leaves `JSON.stringify([state,report])` identical; gate on reads deep-frozen state and report without throwing or mutating, one prefixed `\n`-terminated line with the labelled fields; unrelated events filtered out; byte-stable output (two identical calls → identical strings); exact window (turns 173–183 → only 175–181, once each, `loop_index = turn − 1`); creation-turn-175 fixture (planning, `preparation_sub_phase` and `preparation_turns_elapsed` null, no events); caller loop index emitted verbatim (`turn ≠ loop_index + 1` is detectable); null-operation boundary (`operation:null`, empty intel/brigades/events, no throw); two corps carrying Mistral 2 → the `strictCompare`-first corps_id.

## Real emitter → collector (constructed fixtures, NOT a campaign)
- `080-implementation-fixture.mts` (imports the real emitter only; sets the env var; feeds 7 constructed turns 175–181) run with `tsx`: `080-implementation-fixture.*` exit **0**, stdout = exactly **7** `[mistral-prep-trace] ` lines (the actual emitted bytes).
- Unchanged `077-revised-collect-trace.cjs` (sha256 prefix `ed5ef6295e843d74`) on those bytes: `080-implementation-collect.*` exit **0**, `pass:true`, 7 lines, turns 175–181 once each, `loop_index = turn − 1`, turn-175 control matched (planning, sub-phase/elapsed null). Output `080-implementation-collect-out.json`.
- The synthetic positive/six-negative collector receipts were reused, not rerun.

## Limitations (explicit)
Fixtures are constructed: the elapsed/sub-phase trajectory, events, and the `ready`/`execution` shape at turn 180 are authored to exercise the emitter and collector, not measured Mistral behavior. Nothing here shows the early hold, any branch of `tickPreparation`, controller-map neutrality, or anything about a real run. `runTurn` and `runScenario` were not executed; whether the gate-off emitter is neutral inside a real run remains the job of the required clean-commit hook, independent review, and the (unauthorized) 181-week measurement. The `tests` file mocks `process.stdout.write`; real stdout interleaving with other runner output is handled by the collector's prefix filter, not tested here. Type correctness rests on the tracked hook (no manual `tsc`).

## State left for Codex's review
`src/scenario/scenario_runner.ts` (modified) and `tests/scenario_runner_mistral_prep_trace.test.ts` (untracked) only; nothing staged; no 181-week campaign launched or implied.
