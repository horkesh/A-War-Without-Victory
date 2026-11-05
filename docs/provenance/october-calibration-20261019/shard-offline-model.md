# 728 offline rebalance sensitivity

**Verdict:** retained 718 timings make the planner skew actionable in an offline model, but the model cannot predict wall completion or prove the timeout cause.

## Model contract

The helper copies the repository greedy balance function exactly and binds it to `0ccd170b10537892053c13a8f645691e49a2b971265544ccad5346ad7137e824`. It assigns all 1362 unique parallel files exactly once, adds the existing partitioned test once to each of four indexed workers, and leaves all 74 serial files unchanged. Total modeled executions remain 1440. Two identical replays produced identical assignments in every scenario. This deterministic ordering applies only to the offline assignment; it makes no claim about Vitest execution order.

## Result

The retained baseline predicts unique shard loads of 464736, 465581, 464605, 465528 ms, a 976 ms spread. Replacing weights for completed files with their 718 completion durations and leaving the 17 unknown files at 1,000 ms yields 610673, 610673, 610673, 610673 ms, a 0 ms spread. 999 unique files move between worker assignments in this counterfactual.

The four property executions remain separate indexed work at 836608, 845596, 850341, 853246 ms. Because stdout does not bind those values to worker indices, each counterfactual adds the observed 836608–853246 ms range once per worker rather than assuming identical cases.

For the 17 missing jsdom files, illustrative substitutions use 1,000 ms and the retained completed-jsdom p50/p90/max values (195/720/3876 ms). Their modeled spreads are unknown=baseline-default: 0 ms; unknown=observed-jsdom-p50: 1 ms; unknown=observed-jsdom-p90: 0 ms; unknown=observed-jsdom-max: 0 ms. These are sensitivity points, not bounds; a blocked or unusually slow missing file has no finite retained bound.

Completed workers show 341380–380090 ms between reported test time and wall duration. That range is retained as an illustrative overhead sensitivity only. It cannot be transferred as a strict shard-1 or future-run bound.

## Decision

Stale/incomplete weights and skew remain the strongest measured contributor and plausibly explain 718, consistent with the 729 qualification. The offline redistribution shows the known timing information is practically actionable, but it does not establish ordinary completion, exclude a hang, or promise a 35-minute run. No timing baseline, config, shard count, membership, timeout, threshold, floor, source, or test was changed.

Use this model only to decide whether a future, separately authorized diagnostic is worthwhile. The smallest causal diagnostic remains an exact-membership shard-1 replay with per-file start/finish telemetry and unchanged worker semantics. Do not change timeout, shard count, suite membership, threshold, or floors from this model, and do not treat it as a full-suite gate.
