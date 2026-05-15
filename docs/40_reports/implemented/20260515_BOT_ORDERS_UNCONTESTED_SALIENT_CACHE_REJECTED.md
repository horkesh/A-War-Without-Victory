# Bot Orders Uncontested Salient Cache - Rejected Candidate

**Date:** 2026-05-15
**Run ID:** n1824 (`runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1824`)
**Baseline:** n1823 final hash `0cb626c032204372`
**Result:** VERDICT-REPORT-ONLY; implementation reverted

## Summary
- Tested a pass-local cache for `evaluateUncontestedOccupation(...)` salient verdicts keyed by faction, current location, and target OSID.
- The candidate preserved deterministic output: n1824 kept final hash `0cb626c032204372`, 26/27 anchors, 6/6 bot benchmarks, 9 anomalies, 2 warnings, and 0 critical anomalies.
- The target label worsened: `.uncontestedOccupation.salient` moved from 20.629ms in n1823 to 23.320ms in n1824, so the cache was rejected and reverted.

## Implementation Surface Tested, Then Reverted

### Candidate shape
- Added an optional `uncontestedSalientCache?: Map<string, boolean>` to `BrigadeEvaluationContext`.
- Built one cache per `executeFactionDirectivesImpl(...)` pass.
- Added `uncontestedSalientCacheKey(...)` and routed the salient check through the cache fill path.
- Added a red/green test proving a cached salient verdict could suppress a walkover that the uncached calculation would allow.

### Reason for rejection
- The key includes `faction`, `loc`, and `target` to preserve the exact old rule where the current brigade location counts as friendly.
- That exact key shape appears too fine-grained for the 40w run and adds map/key overhead before it saves enough neighbor scans.
- The candidate did not improve the targeted profile label and did not produce a total bot-order wall-clock win.

## Profile Results

| Label | n1823 | n1824 | Verdict |
|---|---:|---:|---|
| `.uncontestedOccupation.salient` | 20.629ms | 23.320ms | Rejected |
| `homeDefense.uncontestedOccupation` | 50.136ms | 52.045ms | No win |
| `eval.uncontestedOccupation` | 35.135ms | 36.324ms | No win |
| `executeFactionDirectives.total` | 771.414ms | 772.211ms | No wall-clock win |

## Verification
- Red first: `npm.cmd run test:vitest:fast -- -- tests/uncontested_salient_cache.test.ts` failed because `uncontestedSalientCacheKey` did not exist.
- Green candidate suite: `npm.cmd run test:vitest:fast -- -- tests/uncontested_salient_cache.test.ts tests/uncontested_sector_defense_cache.test.ts tests/uncontested_occupation_priority.test.ts tests/bot_orders_perf_profile.test.ts` passed 14/14.
- `npm.cmd run typecheck` passed after matching the political-controller nullable type.
- Profile proof: n1824 kept final hash `0cb626c032204372`.
- Final action: implementation and test were reverted; only this verdict report and durable docs remain.

## Files Changed

| File | Change |
|---|---|
| `docs/40_reports/implemented/20260515_BOT_ORDERS_UNCONTESTED_SALIENT_CACHE_REJECTED.md` | Records the rejected candidate and measured reason not to retry the same shape. |
| `docs/PROJECT_LEDGER.md` | Adds the docs-only verdict entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Records the reusable cache-granularity lesson. |
| `docs/plans/MASTER_ROADMAP.md` | Adds the CPU addendum and next-lane guidance. |

## Next Steps
- Do not retry a faction+loc+target salient verdict cache without new evidence or a coarser semantics-preserving key.
- Next CPU work should use the fresh profile and prefer concrete remaining labels such as `sectorAttack.executionDirectObjective`, remaining `homeDefense.uncontestedOccupation` attribution, or defensive shared work.
