# Result: March Vlašić objective scope correction (C1)

**Task:** `opencode_varosluk_scope_candidate_handoff.md` (conditional gate satisfied).
**Authorization:** `docs/PROJECT_LEDGER.md` "Owner approval for March Vlašić objective scope"
(owner: "You may remove Varosluk."). Historian source: the recorded ruling at
`docs/PROJECT_LEDGER_ARCHIVE_2026Q3.md:8714-8781` (2026-09-02) — Domet-1 is
20-24 Mar 1995; Komar/Varošluk belongs to the September 1995 Donji Vakuf advance.

## Change (exact)

`src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`

```
 const VLASIC_TRAVNIK_RIDGE_OBJECTIVES: readonly string[] = [
     'op:travnik:paklarevo',
-    'op:travnik:varosluk',
     'op:travnik:gornje_krcevine',
 ];
```

Adjacent comments updated to the narrower March set: the Wave-24C reachability
rationale (no longer routes through Varošluk) and the former "DELIBERATELY NOT
DONE HERE" note (Komar scope correction now done; re-homing/retiming still queued
and untouched). `VLASIC_ENEMY_TARGETS` and the `ridge_probe` variant read the
same constant and follow it. No other catalog content changed; the separate
uncommitted February planning candidate (dateWindow t152→t150, planning_duration
4→2 and its tests) is preserved untouched.

`tests/operation_opportunities_central_bosnia_catalog.test.ts`

- New red-first test: "authors the March Vlašić ridge axis without Varošluk,
  retaining the two Domet-1 targets" — asserts `axes[0].objectives` equals
  `[op:travnik:paklarevo, op:travnik:gornje_krcevine]`, omits `op:travnik:varosluk`,
  and that the `ridge_probe` variant matches.
- `VLASIC_OBJECTIVES` fixture reconciled to the two authored March targets (it had
  also carried the 2026-09-02-removed `op:skender_vakuf:*` cells and Varošluk).

## Checks (exact commands, exits, counts)

| Step | Command | Result |
|---|---|---|
| Red | `node node_modules/vitest/vitest.mjs run tests/operation_opportunities_central_bosnia_catalog.test.ts -t "without Varo" --reporter=dot` | 1 failed / 17 skipped (expected; catalog still had Varošluk) → exit 1 |
| Focused green | `node node_modules/vitest/vitest.mjs run tests/operation_opportunities_central_bosnia_catalog.test.ts --reporter=dot` | 18/18 passed → exit 0 |
| Affected | `node node_modules/vitest/vitest.mjs run tests/operation_name_collision.test.ts tests/coha_operation_pause.test.ts tests/pre_planned_operations.test.ts tests/brigade_stacking_sector_truth.test.ts --reporter=dot` | 108/108 passed (4 files) → exit 0 |
| Typecheck | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | exit 0 |
| Whitespace | `git diff --check` | exit 0 (only the pre-existing PROJECT_LEDGER CRLF notice) |

Raw logs: `opencode_varosluk_scope_red.out`, `opencode_varosluk_scope_focused.out`,
`opencode_varosluk_scope_affected.out`, `opencode_varosluk_scope_typecheck.out`.

## Scope held

No prefix, campaign, full suite, map refresh, commit, merge, baseline adoption, or
October work. Varošluk is not re-homed to September; no engine, map/paint,
denominator, or acceptance change. `coha_operation_exception.ts` was not touched
(its objective set is a static superset and is unaffected by subsetting).
Independent review and the open April/protected-checkpoint measurement remain
pending.
