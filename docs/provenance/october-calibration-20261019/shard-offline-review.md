# 729 targeted verification — offline rebalance extension

**Verdict:** `PASS_SCOPED_OFFLINE_MODEL`.

The closed offline model is arithmetically and structurally sound. It strengthens the finding that retained duration weights are actionable while preserving the 729 causal qualification.

The bound greedy algorithm is an exact copy of `tools/test/test_suite_inventory.mjs:48-65` at SHA-256 `0ccd170b10537892053c13a8f645691e49a2b971265544ccad5346ad7137e824`. The retained baseline loads sum to 1,860,450 ms and reproduce the stated 464,736/465,581/464,605/465,528 ms distribution with a 976 ms spread. The primary retained-completion counterfactual sums to 2,442,692 ms and distributes as 610,673 ms on every worker, with 999 assignments moved. Its duplicate replay is byte-identical.

Coverage also passes: 1,362 unique parallel files appear exactly once, the partitioned property suite appears once in each of four indexed workers, and all 74 serial files are retained. `1362 + 4 + 74 = 1440` modeled executions. The helper completed in 185 ms with child/wrapper exits 0/0 and empty stderr.

The limitations are correctly stated. The 195/720/3,876 ms completed-jsdom values are illustrative sensitivity points, not bounds for the 17 missing files. The four property-suite durations remain unbound to worker indices and do not assert identical case-data ownership. The 341,380–380,090 ms completed-worker wall-minus-tests range is illustrative only. The model cannot identify the historical in-flight file, exclude a hang or resource effect, predict wall time, or guarantee a 35-minute completion.

The two possible next scopes answer different questions:

- For future full-suite reliability, the model supports refreshing duration weights from retained measured completions, keeping the 17 missing files explicitly uncertain, adding per-file start/finish receipts, and validating the planner and receipt harness with focused checks before requesting runtime authorization. This changes membership materially: the primary model moves 999 files.
- For the exact historical cause of 718, the smallest experiment remains an unchanged exact-membership shard-1 replay with per-file start/finish telemetry. A refreshed partition cannot answer whether the old shard ended in ordinary tail work or a blocked file.

Do not run both by default. The bounded diagnosis can close now. Choose a future path only if the owner needs reliability remediation or exact historical cause. Neither diagnostic path changes the unmet full-suite gate or overall **NO-GO** status.

No tests, full suite, campaign, build, engine, source, test, harness, config, documentation, or Git operation was performed.
