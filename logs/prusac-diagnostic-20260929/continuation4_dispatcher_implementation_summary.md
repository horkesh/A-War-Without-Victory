# Continuation 4 dispatcher observation — implementation proof summary

Date: 2026-10-03
Branch: `codex/october-calibration-continuation-20261003`
Starting HEAD: `da7df7c36c2b6eb09a68daff37177eca4d5d8d7e`

## Implemented bounded scope

- Added the opt-in `dispatcher_decision` reason-code topic.
- Added deterministic formation-boundary receipts to the actual
  `generateAllBotOrdersOsid` dispatcher pass. Receipts distinguish eligibility,
  exact caller-filter result, replace/merge scope, pre-order context, first
  handled evaluator or active-column skip, pre-cap handler output, final
  generated output, and projected snapshot output.
- Kept the existing `route_decision` receipt and consumer format unchanged.
- Projected dispatcher receipts through the existing bot-order snapshot and real
  weekly attachment only when the new topic emits receipts; topic-off rows remain
  absent.
- Added a strict read-only dispatcher coverage consumer. It fails closed on exact
  schema and enum errors, completed-turn mismatch, duplicate actor/pass keys,
  missing named boundaries, unsorted actors/sets, predicate-precedence
  contradictions, and eligible receipts without a measured first handler.
- No `GameState`, save schema, loader, serializer, scenario runner, evaluator,
  authored data, or control/reference boundary changed.

The serialized weekly snapshot represents the ordinary bot dispatcher pass.
Later player-assist passes remain separate report fields and are not claimed as
covered by this receipt.

## Exact commands and retained results

All stdout, stderr, and exact exit markers are retained under
`logs/prusac-diagnostic-20260929/` with the prefixes named below.

### Writer/projection TDD

RED command:

```text
node node_modules/vitest/vitest.mjs run tests/bot_dispatcher_decision_diagnostic.test.ts
```

Result: 1 test file failed; 2/2 tests failed; exit 1. The failures were the
expected missing `dispatcher_decision_details` and missing weekly attachment.
Evidence prefix: `continuation4_dispatcher_red`.

First GREEN attempt, same command: 1 passed, 1 failed; exit 1. The intended
`sector_march` positive control used a one-cell risky tooth, so the real evaluator
correctly declined it and execution reached `interior_movement`. The fixture was
corrected to a supported two-cell front; production behavior was not changed for
this failure. Evidence prefix: `continuation4_dispatcher_green1`.

Corrected GREEN, same command: 2/2 passed; exit 0. Evidence prefix:
`continuation4_dispatcher_green2`.

### Strict-reader TDD

RED command:

```text
node node_modules/vitest/vitest.mjs run tests/bot_dispatcher_decision_coverage_diagnostic.test.ts
```

Result: 1 test file failed; 7/7 tests failed; exit 1 because the reader did not
yet exist. Evidence prefix: `continuation4_dispatcher_reader_red`.

Initial GREEN, same command: 7/7 passed; exit 0. Evidence prefix:
`continuation4_dispatcher_reader_green`.

After tightening exclusion-fact precedence, posture enums, and mandatory
first-handler coverage, the targeted correction command was again:

```text
node node_modules/vitest/vitest.mjs run tests/bot_dispatcher_decision_coverage_diagnostic.test.ts
```

Result: 15/15 passed; exit 0. Evidence prefix:
`continuation4_dispatcher_reader_correction`.

### Focused preservation batch

Exact command, including file order:

```text
node node_modules/vitest/vitest.mjs run tests/bot_dispatcher_decision_diagnostic.test.ts tests/bot_dispatcher_decision_coverage_diagnostic.test.ts tests/bot_route_decision_diagnostic.test.ts tests/bot_route_decision_coverage_diagnostic.test.ts tests/reason_code_debug.test.ts
```

First result: 4 files passed, 1 failed; 52 passed, 1 failed; exit 1. A newly
mixed null formation entry reached the pre-existing downstream
`buildFormationsIndex` helper, which dereferences entries after the dispatcher has
selected other eligible formations. The preservation control was corrected to
isolate the actual legacy dispatcher behavior: a null-only map short-circuits
before graph analysis and emits an empty diagnostic receipt list. Both failure
and correction evidence were retained. Failure prefix:
`continuation4_dispatcher_focused_final`; corrected prefix:
`continuation4_dispatcher_focused_final2`.

Corrected result: 5/5 files passed; 54/54 tests passed; exit 0.

### Reader syntax

```text
node --check tools/diagnostics/bot_dispatcher_decision_coverage.cjs
```

Result: exit 0. Evidence prefix: `continuation4_dispatcher_reader_syntax`.

### TypeScript

```text
npm run typecheck
```

First result: exit 2 with two errors in `bot_brigade_ai_osid.ts`: optional
`FormationState.kind` (`string | undefined`) was passed directly to
`Set<string>.has`. The two eligibility guards were corrected with explicit null
checks before set membership. Evidence prefix: `continuation4_dispatcher_typecheck`.

The same command was then run once on the corrected state. Result: exit 0.
Evidence prefix: `continuation4_dispatcher_typecheck2`.

### Whitespace/diff integrity

```text
git diff --check
```

Result: exit 0. Evidence prefix: `continuation4_dispatcher_diffcheck`.

## Preserved limitations and authority boundary

No campaign, prefix, replay, full suite, package build, or live `n39` reader
check was run by this implementation seat. The focused off/on state and order
proof does not waive the historical default-188 neutrality requirement or any
calibration acceptance criterion. A future run through turn 139 remains a
separate, unauthorized proposal; it would measure the 737th's actual eligibility
and first handled branch near turns 137–139 and would not prove original `n37`
attribution.
