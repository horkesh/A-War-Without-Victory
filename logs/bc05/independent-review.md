# BC05 independent review

**Verdict: GO.** No critical, suggestion, or nice-to-have findings in the bounded BC05 implementation.

Reviewed the working diff against `fd8d5e66c615fa4731cde01122d6050fbc86619f`. The production change is limited to `war_1994.json`'s RS NATO ultimatum `turn_max: 96 -> 97` and the loader's direct impossible-prerequisite-window validator. The scope verifier proves every other 1994 event field, including response choices and effects, is byte-semantically unchanged; `war_1993.json`, `war_1995.json`, `evaluate_events.ts`, `turn_pipeline.ts`, and the definitive scenario are unchanged.

## Correctness and player behavior

- `event_loader.ts:745-774` rejects only a provably impossible direct relation: a bounded dependent closes before its prerequisite can first fire, or closes on that earliest turn without `same_turn_requires_events`. It deliberately leaves wider/conditional windows alone and sorts diagnostics with `strictCompare`.
- `event_loader.test.ts:839-894` covers equal-window rejection, earlier-closing rejection, the bounded same-turn exception, and ordinary next-turn slack. Existing validation still forbids decision-bearing same-turn opt-ins.
- `events_evaluate.test.ts:916-1014` executes Markale at t96, the RS ultimatum at t97, resolves both comply and defy as player decisions, verifies their distinct flags and dimension effects, then verifies the unchanged exclusion event at t98 with its supply, morale, and aggression effects. It also proves the wider deadline does not bypass `sarajevo_siege_active`.
- `event_timeline_integrity.test.ts:223-252` pins the exact windows, prerequisite, option IDs, and downstream event effects, while retaining the BC04 opt-in boundaries at lines 197-201.

## Canon, history, and determinism

- One turn equals one week (`Engine_Invariants_v0_9_0.md:5`; `Rulebook_v0_9_0.md:5`). The approved BC05 record maps t96/t97/t98 to completed weeks 31 Jan-6 Feb, 7-13 Feb, and 14-20 Feb 1994 and cites the 9 February North Atlantic Council decision (`2026-07-31-full-campaign-electron-validation-plan.md:594-613`). Its 21 February date is the post-advance header boundary, not an occurrence deadline. This supports the Markale -> ultimatum -> exclusion sequence without new event authoring.
- The change is ordinary NATO/event mechanics, outside Sensitive History Gate section 7 (`SENSITIVE_HISTORY_DESIGN_GATE.md:237-244`), and changes no sensitive-history content.
- No ordering, RNG, serialization, or state-writer path changed. The new validator is load-time-only and deterministic; its error list is explicitly sorted. This accords with Engine Invariants section 11 (`Engine_Invariants_v0_9_0.md:285-289`) and the event determinism contract (`DETERMINISM_TEST_MATRIX.md:119`).
- The t98 exclusion still depends only on the ultimatum receipt, so it applies its withdrawal narrative/effects after either comply or defy. This is a material newly reachable limitation, but it is the disclosed pre-existing branch-independent contract (`2026-07-31-full-campaign-electron-validation-plan.md:604-608`), not a regression or silent redesign in BC05.
- `n392-evidence.json` establishes the old Lukavac dead-gate premise is obsolete: receipt t70, RS comply t70, and stable 3/6 RS Trnovo control across t68-71. The current row matches accepted source `c2f6592ec1e2f049d93ade595760c19633bb2ce7`. No Lukavac change is justified; the abstract-proxy versus territorial-evidence choice remains an owner disposition.

## Verification

- Focused Vitest: exit 0, 3 files / 115 tests (`final-focused-tests.log`).
- TypeScript `tsc --noEmit -p tsconfig.json`: exit 0, zero diagnostics (`typecheck.log`, summarized in `validation.json`).
- Scope/document verifier: exit 0, 15 checks and 7 added links (`scope-docs.log`).
- `git diff --check`: exit 0; only CRLF conversion warnings in root-owned documentation (`diff-check.log`).
- Source hashes still match `validation.json` after review.

Limit: focused fixtures establish loader/evaluator behavior and preserved effects. They do not establish current-HEAD campaign, territorial neutrality, or calibration acceptance; no campaign was run or authorized.
