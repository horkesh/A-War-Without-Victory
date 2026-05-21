# H1 Watched Operation Visibility Packet

Date: 2026-05-21

Scope: diagnostic/reporting only. No operation behavior, launch feasibility, objectives, OOB, save schema, scenario data, canon text, or sensitive-history outcome tuning changed.

## Run Evidence

- Run path: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1922`
- Scenario: `data/scenarios/apr1992_definitive_188w.json`
- Turn: 188
- Final state hash: `7b57a8592f668137`
- Diagnostic JSON artifact: `data/derived/_debug/h1_sensitive_history_status_188w.json` (gitignored, regenerable)
- Diagnostic command: `node tools/diagnostics/sensitive_history_status.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1922`

## Enclave And Event Status

| Evidence | Status |
|---|---|
| Overall verdict | `OPEN_P0` |
| Srebrenica enclave control | RS 1/11, RBiH 10/11, capital `op:srebrenica:srebrenica_2` still RBiH |
| Zepa enclave control | RS 0/1, RBiH 1/1, capital `op:rogatica:zepa_2` still RBiH |
| `srebrenica_falls_1995` | fired once, last turn 162 |
| `zepa_falls_1995` | fired once, last turn 164 |
| `srebrenica_genocide_1995` | not fired; no rupture path found |

## Watched Operation Rows

| Operation | Label | Operation ID | Canonical window | Catalog | Eligibility | Launch | Blocker | AAR | Delivery |
|---|---|---|---|---|---|---|---|---|---|
| Operation Cerska-Kamenica | Cerska-Kamenica | - | - | missing | unknown | unknown | - | not_visible | missing |
| Operation Krivaja-95 | Krivaja | Operation Krivaja-95 | 170-178 | present | not_eligible | blocked | brigade_ineligible | not_visible | blocked |
| Operation Stupcanica-95 | Stupcanica | - | - | missing | unknown | unknown | - | not_visible | missing |

Interpretation: the current saved run artifacts now distinguish Krivaja-95 from fully missing operations. `operation_aars.json` contains 56 operations, but no Krivaja, Stupcanica, Cerska, or Kamenica AAR rows. `final_save.json` has no `state.military.watched_operations` array, but it does persist `state.military.op_injection_warnings`; Krivaja-95 is present there with `brigade_ineligible` on `rs_skelani_battalion`. Cerska-Kamenica and Stupcanica-95 still have no structured watched-operation row, injection warning, or AAR evidence in the 188w final save.

## Owner Finding

The next owner is the triggered-operation trace boundary, not outcome tuning:

- `src/sim/combat/triggered_operations.ts` already defines the three watched operations.
- `checkTriggeredOperations(...)` calls `validateOpAtInjection(...)` and `collectOpInjectionWarnings(...)`; those warnings are persisted in `state.military.op_injection_warnings`, and the sensitive-history diagnostic now reads them.
- `src/scenario/scenario_runner.ts` writes `operation_aars.json` from `state.operation_history`, but skipped/blocked triggered operations never reach `state.operation_history`.
- No current runner artifact writes a complete neutral watched-operation lifecycle row for all watched operations. Krivaja is recoverable from `op_injection_warnings`; Cerska-Kamenica and Stupcanica remain absent from structured lifecycle evidence.

Required next implementation: persist a compact watched-operation trace row when a watched triggered operation reaches its trigger window and is skipped, blocked, or injected. The row should carry the columns now exposed by `tools/diagnostics/sensitive_history_status.cjs`: `operation_id`, `watched_label`, `canonical_window`, `catalog_status`, `eligibility_status`, `launch_status`, `blocker_code`, `aar_status`, and `delivery_status`. The implementation should preserve the existing `op_injection_warnings` fallback and add rows for non-warning skip reasons such as already-owned objectives, active primary corps, cooldown/decline state, empty live axes, or missing trigger-window evidence.

## Sign-Off Status

No sensitive-history outcome sign-off is required for this packet because no operation behavior changed and no watched operation newly delivered. Future behavior work remains gated: if Krivaja-95 or Stupcanica-95 becomes deliverable, the user plus historian/canon review must approve the territorial outcome before merge.

## Verification

- `npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts --reporter=dot` PASS (4/4)
- `npm.cmd run typecheck` PASS
- 188w scenario run PASS, final hash `7b57a8592f668137`

`npm.cmd run test:baselines` not required for this packet: changes are limited to a read-only diagnostic script, fixture coverage, tests, and docs. The 188w run was evidence collection, not a baseline contract update.
