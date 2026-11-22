## 2026-11-22 — End-rule receipt rider: operation receipts name the exit rule (report-only, hash-neutral)

Report-side rider on the never-ending-op exit. Calibration is held; no sim file changed.

**Gap.** Every CorpsOperation end writes one coarse `recovery_reason`, and the first reason wins. About nine exit rules all record `max_failures` (or `no_logged_attempt` with zero attempts), so no receipt said which rule ended an operation. That included the new silent-execution exit, which records the same `max_failures` as the failure caps.

**Change.**
- `src/scenario/operation_end_rule.ts`: one pure `deriveOperationEndRule`. Its header maps every exit rule to a label and to the source line it mirrors. Examples: `silent_execution`, `lifetime_no_attack`, `total_failure_cap`, `axis_failure_cap`, `zero_progress`, `consecutive_catastrophic`, `objective_failures_exhausted`, `partial_capture_axes_terminal`, `axis_idle_stall`, `movement_only_stall`, `opening_readiness:<blocker>`, `launch_demotion`, `brigade_attrition:<sub-reason>`, `preempted`, `preparation_abort`, `feint_expiry`.
  - The label is derived from the counters that survive on the operation, plus the previous week's view.
  - Where those counters cannot separate two rules, it says so: `<reason>:ambiguous(a|b)`. Where no rule fits it says `unattributed:<reason>`.
  - The six module-private thresholds it mirrors are pinned against `sector_offensive.ts` by a source test.
- `src/scenario/combat_causality.ts`: `operation_diagnostics` rows carry `silent_execution_turn_streak` on execution weeks, and `end_rule` / `end_rule_axes` on the week an operation enters recovery.
- `src/scenario/scenario_runner.ts`:
  - keeps last week's operation views (`beginRecovery` deletes the streak), keyed `corps:name:t<start>`;
  - joins the receipts onto copies of the AARs for `operation_aars.json`. `operation_history` is untouched.
- Silent-execution threshold: the streak is written after order emission and read by the next turn's exit. So the previous week's row holds the value the exit compared, and the label needs a streak of at least 5, not 4.

**Measured** (188w, at 1f149b7ab plus this change):
- final_state_hash `7cb87ce9da304d62`. final_save.json sha256 `7cb87ce9…ad99` and run_summary.json `00e57944…bcc` are unchanged.
- Only the `weekly_report.jsonl` pin moved (`fe39c908…` → `cbb7657e…`); it is re-pinned.
- All 95 AARs are labelled; none is ambiguous, unattributed or unobserved.
- The 13 `max_failures` AARs split into:
  - 5 axis_failure_cap
  - 4 consecutive_catastrophic
  - 2 objective_failures_exhausted
  - 2 partial_capture_axes_terminal
- No operation reaches a silence streak of 5. The longest is 4, as #840 measured.

**Tests.** `tests/operation_end_rule.test.ts` (36 tests; red before the module existed):
- one case per label;
- silent_execution from the prior-week streak, and one short of it;
- the lifetime-0 exit and the silent exit get different labels;
- the ambiguous cases;
- the AAR join leaves its input unmutated;
- the mirrored-threshold source pin.
