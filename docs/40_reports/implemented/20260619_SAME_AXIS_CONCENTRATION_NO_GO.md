# Same-Axis Concentration Eligibility NO-GO

Date: 2026-06-19
Branch: `codex/same-axis-concentration-gate`
Result: behavior change rejected; helper-contract coverage retained.

## Summary

The same-axis concentration issue from the issue #170 residual queue was re-tested as a one-change calibration lane. The focused arithmetic defect was real enough to justify a helper-contract guard, but the blanket execution-gate fix is not mergeable: it passed focused/40w gates and then failed the 188-week engine-health floor.

Retained change:

- `countAxisConcentrationSupport(...)` is now covered by a focused helper contract proving that it excludes the current attacker, ignores inactive supporters, and does not count the tested two-hop distant supporter.

Rejected behavior change:

- The attempted `bot_brigade_eval_attack.ts` arithmetic change used the same-axis supporter count as an eligible-attacker fallback for operation objective attack eligibility.
- That path made a paired unsupported/supported execution test pass and did not break the focused operation pack, but it reduced the 188-week `matched_osids` floor below the required gate.

## Verification Evidence

Red proof before the attempted behavior fix:

- `node .\node_modules\vitest\vitest.mjs run tests/bot_operation_objective_focus.test.ts -t "one same-axis supporter" --reporter=dot`
- Result: failed as intended; supported objective target remained `undefined`.

Focused green proof with the attempted behavior fix:

- `node .\node_modules\vitest\vitest.mjs run tests/corps_operation_helpers.test.ts tests/bot_operation_objective_focus.test.ts tests/sector_offensive_in_transit_predictor.test.ts tests/multi_axis_operations.test.ts tests/multi_corps_operation_visibility.test.ts --reporter=dot`
- Result: passed 87/87.

Additional local proof with the attempted behavior fix:

- `npm.cmd run typecheck -- --pretty false` passed.
- `git diff --check` passed.
- `npm.cmd run test:vitest:scenario:anchors` passed, including the Boljanic RS anchor.
- `npm.cmd run ci:structural-fingerprint:check` passed with frozen 40w structural fingerprint `f282883abbab76cf`.

188-week engine-health gate:

- Run: `npm.cmd run sim:scenario:run:188w -- --out runs/eh_local_same_axis`
- Gate: `node tools/engine_health_gate.cjs runs/eh_local_same_axis/apr1992_definitive_188w__acb538b04d79af3c__w188_n0 --horizon 188w`
- Result: HARD FAIL on `matched_osids`.

Gate metrics:

- `zero_eligible_ops`: 1 <= 4 PASS
- `dead_ops`: 32 <= 37 PASS
- `ghost_destroyed`: 2 <= 5 PASS
- `stranded_brigades`: 4 <= 7 PASS
- `matched_osids`: 637 >= 658 FAIL
- `consistency_failures`: 5 <= 6 PASS
- `kw_ratio`: 3.856 in [3.27, 4.424] PASS

Broad local Vitest note:

- `npm.cmd run test:vitest`, `npm.cmd run test:vitest -- --reporter=dot`, `npm.cmd run test:vitest:fast`, and `npm.cmd run test:vitest:scenario` timed out locally without useful failure output. Leftover Node test processes were cleaned up. The merge decision did not rely on those timed-out local harnesses.

## Decision

Do not merge the blanket same-axis eligibility arithmetic change. It is not a small stale-arithmetic fix anymore; it is a calibration-sensitive attack-eligibility change that lowers the 188-week floor from 658 to 637 matched OSIDs.

Same-axis concentration remains calibration-held. Future work must be a design/calibration lane that identifies where same-axis support should affect attack eligibility without lowering the global 188-week floor. Anchors and 40w structural fingerprint are necessary but not sufficient for this class of change.

## Scope

Determinism impact of retained work: test-only helper-contract coverage. No production simulation behavior, scenario data, save schema, calibration constants, generated artifacts, golden manifests, structural fingerprint, or packaged installer artifact is changed by the retained branch content.
