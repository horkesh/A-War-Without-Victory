# Continuation 4 dispatcher observation — independent review

**Verdict: NO-GO for observation preparation.** The production writer is a bounded, opt-in observation and I found no gameplay/canon/determinism mutation in the changed path, but the strict consumer does not yet meet the handoff's fail-closed actor/boundary consistency requirement and the retained proof does not join a generated weekly row to that consumer. This verdict does not reopen calibration, authorize a run, or alter the existing calibration NO-GO.

## Blocking findings

1. **Critical — a duplicate completed-turn actor/pass receipt can pass when it is repeated in a second weekly row.** `tools/diagnostics/bot_dispatcher_decision_coverage.cjs:150-174` creates `actorPassKeys` inside the per-row loop. Two otherwise valid rows with the same `week_index`, formation, pass, scope, and requested factions each receive a fresh set, so neither reports `duplicate_actor_pass_key`; both receipts then count toward coverage. The retained test at `tests/bot_dispatcher_decision_coverage_diagnostic.test.ts:76-80` exercises duplicates only inside one row. This leaves concatenated/duplicated weekly rows able to satisfy a named boundary and conflicts with the required unique actor/pass/completed-boundary coverage. The smallest correction is a run-wide key that includes completed turn plus pass/scope/requested factions/formation, with a two-row duplicate test.

2. **Critical — active-column facts are checked in only one direction.** `tools/diagnostics/bot_dispatcher_decision_coverage.cjs:76-83` rejects `first_handler: active_column_skip` unless transit is `in_transit`/`column`, but accepts an eligible receipt that says `transit_status: in_transit`, `transit_stance: column`, and names any other handler. Production necessarily takes the skip at `src/sim/combat/bot_brigade_ai_osid.ts:789-814`; therefore the inverse receipt is contradictory and the consumer must fail it. No retained reader case covers the inverse. Add the inverse predicate and a fail-closed fixture.

3. **Required proof gap — producer and strict consumer are separately tested, not joined.** The writer test builds and JSON-roundtrips a real weekly row at `tests/bot_dispatcher_decision_diagnostic.test.ts:139-161`, while the consumer's passing case at `tests/bot_dispatcher_decision_coverage_diagnostic.test.ts:51-55` uses a hand-built receipt. No retained test passes the actual generated/attached weekly row into `analyzeRows` or the CLI. Exact-key compatibility is plausible by inspection, but it is not established by the claimed focused proof.

4. **Required proof gap — the three output boundaries are present but their distinctions are not exercised.** `src/sim/combat/bot_brigade_ai_osid.ts:816-842` captures handler/pre-cap output and `:1007-1011` captures post-cap output; `src/scenario/combat_causality.ts:188-205` projects snapshot truth. The retained writer checks only a sector-march case where pre-cap and final-generated values are equal (`tests/bot_dispatcher_decision_diagnostic.test.ts:104-109`), and the merge case asserts only the `scope` label (`:120-136`). There is no cap/friction case proving pre-cap differs from final-generated/snapshot, nor a merge precedence case proving generated output can differ from the resulting snapshot. The implementation placement looks correct, but the acceptance claim exceeds the retained proof.

## Implementation assessment

- The dispatcher topic is absent by default and the on/off test compares generated diagnostics minus the new field plus the complete mutated state (`tests/bot_dispatcher_decision_diagnostic.test.ts:88-117`).
- Eligibility and the caller filter remain one ordered pass. The filter is invoked once per otherwise eligible formation; evaluator order is unchanged and each evaluator is invoked once through `runEvaluator` (`src/sim/combat/bot_brigade_ai_osid.ts:905-921`, `:816-842`).
- Receipts cover all non-null formation-map entries in stable key order, copy arrays before sorting, and do not add GameState/save-schema fields. The null-only focused fixture emits an empty receipt array; the legacy downstream behavior for a mixed map whose non-null value has an inconsistent internal ID is unchanged and is not claimed as repaired. The weekly snapshot is attached only when the opt-in route or dispatcher detail list is non-empty.
- Later player-assist passes remain separate report fields: the ordinary snapshot is created before assist calls in `src/sim/turn_phases/war_phases.ts:2699-2721`. The dispatcher's `pass_scope`/`causal_proof:false` wording is therefore appropriately bounded.
- No new RNG, wall-clock, locale comparison, or unstable output iteration was found. This conforms to `Engine_Invariants_v0_9_0.md` §§11.1-11.4 and War Specification §§5 and 8. The receipt is a derived report artifact rather than persisted simulation truth, consistent with Engine Invariants §13. It adds no control mechanism and does not conflict with Engine Invariants §9.6.

## Retained evidence checked

- Focused final: `continuation4_dispatcher_focused_final2.stdout.log`, 5 files / 54 tests passed; `continuation4_dispatcher_focused_final2.exit.txt` = 0. Files were dispatcher writer, route writer, reason-code parser, route consumer, and dispatcher consumer.
- Corrected strict reader: `continuation4_dispatcher_reader_correction.stdout.log`, 1 file / 15 tests passed; `continuation4_dispatcher_reader_correction.exit.txt` = 0.
- Consumer syntax: `continuation4_dispatcher_reader_syntax.exit.txt` = 0.
- TypeScript: `npm run typecheck`; `continuation4_dispatcher_typecheck2.exit.txt` = 0. The earlier typecheck exit 2 is retained and superseded by this corrected run.
- Whitespace: `git diff --check`; `continuation4_dispatcher_diffcheck.exit.txt` = 0.
- Legacy n39 negative, exact authorized command from `continuation4_dispatcher_negative_handoff.md`: `node tools/diagnostics/bot_dispatcher_decision_coverage.cjs runs/apr1992_definitive_188w__6deb5845c150c196__w188_n39 --formation arbih_737th_muslim_light --expect-boundary arbih_737th_muslim_light:137 --expect-boundary arbih_737th_muslim_light:138 --expect-boundary arbih_737th_muslim_light:139 --turn-min 137 --turn-max 139 --json`. `continuation4_dispatcher_n39_negative.exit.txt` = 1 with 0 receipts, the named formation and all three boundaries missing, zero inconsistencies, and `causal_proof:false`. The OpenCode wrapper attempt exited 126 after provider quota 429 before tools (`continuation4_dispatcher_negative_opencode.*`); the direct consumer was then run once as the retained fallback.

## Limits and correction boundary

No scenario, campaign, replay, prefix, full suite, runner/help command, process command, or duplicate focused test was run during this review. The n39 artifact predates dispatcher receipts and establishes only the expected negative; it supplies no 737th branch cause. Full-suite and default campaign-level neutrality remain later acceptance gaps.

The smallest next action is one targeted consumer correction covering run-wide duplicate completed boundaries and inverse active-column consistency, followed by a focused test that sends an actual generated weekly row through the strict consumer and fixtures that make pre-cap/final and merge/snapshot distinctions observable. Re-run only the affected dispatcher reader/writer files, syntax, typecheck if source types change, and diff check. No campaign or full suite is needed for this correction.

## Targeted correction verification (2026-10-03)

**Scoped verdict: GO for observation preparation.** This supersedes the initial NO-GO only for the four findings above. It is not calibration acceptance, does not authorize a campaign/run, and assigns no simulation-anomaly severity from the consumer review labels.

The four blockers are closed:

1. `actorPassKeys` is now run-wide, outside the weekly-row loop, and the key includes completed `turn`, pass, scope, requested factions, and formation. A two-row same-turn duplicate fixture fails closed with `duplicate_actor_pass_key`.
2. Eligible active-column consistency is bidirectional: `(first_handler === 'active_column_skip')` must exactly equal `(transit_status === 'in_transit' && transit_stance === 'column')`. The inverse contradiction fixture fails closed.
3. The public writer test now executes generation → snapshot → weekly attachment → `stableStringify`/parse → `analyzeRows`; it returns one receipt, covers the named formation and turn-138 boundary, and reports zero inconsistencies.
4. Public counterattack fixtures make the output boundaries observable. The real cap path emits two non-null pre-cap attacks but one final-generated and one snapshot attack. The merge path emits generated target `T1` while the retained state snapshot reports the pre-existing `MANUAL` target. Both cases compare topic-off/topic-on diagnostics with only the receipt removed and compare complete states for equality.

Retained targeted evidence:

- Exact focused command: `node node_modules/vitest/vitest.mjs run tests/bot_dispatcher_decision_coverage_diagnostic.test.ts tests/bot_dispatcher_decision_diagnostic.test.ts`.
- RED: `continuation4_dispatcher_review_red.exit.txt` = 1; 22 total, 19 passed / 3 failed. The two intended consumer failures reproduced the cross-row duplicate and inverse active-column gaps. The third failure disproved the initial merge fixture premise: a pre-existing movement order suppressed new terminal movement. It was corrected to use real counterattack competition; no evaluator or production behavior changed.
- GREEN: `continuation4_dispatcher_review_green.exit.txt` = 0; 2 files / 22 tests passed.
- Consumer syntax: `continuation4_dispatcher_review_green_syntax.exit.txt` = 0.
- Working-tree whitespace: `continuation4_dispatcher_review_green_diffcheck.exit.txt` = 0.
- Production TypeScript is unchanged by this correction, so the prior `continuation4_dispatcher_typecheck2.exit.txt` = 0 is reused. The prior 54/54 route/reason/dispatcher proof and expected n39 negative exit 1 are also unaffected and reused.

No new test, consumer invocation, scenario, campaign, replay, prefix, full suite, runner/help command, or process command was run by the reviewer. Remaining limits are unchanged: the legacy n39 artifact cannot establish the 737th branch, full-suite/default campaign neutrality is not established here, later assist passes remain separately reported, and `causal_proof` remains false.
