# T25 REQUEST-OP planner inspection stopping criteria

Prepared only. The planner has not been executed.

Launch exactly one preserved attempt after independent review confirms that the script contains exactly two `planDirectiveOperation` calls, targets only `arbih_1st_corps` and `arbih_4th_corps` against only `op:trnovo:tosici`, and contains no engine advance, public query, directive staging, roster mutation, or duplicated eligibility implementation.

Success requires child and wrapper exit 0 within 60 seconds; all frozen hashes and the 712-endpoint operational domain precheck passing; exactly two planner results; and byte-identical before/after JSON for both fresh input clones. The result must report the full planner return and only the returned roster's current state and friendly-route hop proxy.

Stop after the first attempt. Do not retry automatically after a nonzero exit, timeout, hash/domain mismatch, missing graph/context, purity failure, or artifact-contract failure. Preserve the complete failed attempt and report the established failure. The inspection cannot establish capture, admission, combat, movement delivery, ETA, or command-authority behavior.
