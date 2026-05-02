# Sana Follow-On Reachability Evidence - n1

**Date:** 2026-05-02  
**Branch:** `codex/fifth-corps-reachability` rebased on `main` after combat-math, Storm theater gate split, and campaign proof integration  
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1`  
**Hash:** `b2426eb412f4422e`

## Verdict

The catalog split behaves as intended. Initial `sana_95` no longer launches with a structurally unreachable Sanski Most / Kljuc interior axis. The interior push is represented as `sana_95_follow_on`, and in this run it remains blocked by live predicates because the corridor never opens.

## Scenario Health

| Surface | Result |
|---|---|
| Oct1995 painted compare | 70.8% count / 63.2% area |
| `diagnose_run` | 0 ERR / 35 WARN |
| `validate_run_consistency` | 18 known sector-layer failures |
| `opportunity_health_audit` | 7 decisions / 7 completed / 2 successes / 3 T3 sentinels / 0 broken AAR links |
| `opportunity_campaign_proof` | 8 observed / 4 surfaced-executed / 3 T3-authorized / 1 blocked in-window / 0 reachability warnings |

## Opportunity Matrix Extract

| Opportunity | State | Turn/Window | Decision | Exit | Captured | Axis Proof | Blockers |
|---|---|---:|---|---|---:|---|---|
| `sana_95` | surfaced_executed | 175 | approve | failed | 0/18 | UNDERDELIV:2 | n/a |
| `sana_95_follow_on` | blocked_in_window | 175-188 | - | - | 0/0 | - | `staging_access x14`; `logistics x14` |

## Delivery Audit Extract

| Op | Axis | Attacks | Captured | First Objective | Staging | Unreachable At Launch | Predicate |
|---|---|---:|---:|---|---|---|---|
| Operation Sana | `sana_bihac_petrovac` | 1 | 0/12 | `op:bihac:ripac` | `op:bihac:bihac_2` | false | UNDERDELIV |
| Operation Sana | `sana_krupa` | 3 | 0/6 | `op:bosanska_krupa:ivanjska_2` | `op:bosanska_krupa:otoka_2` | false | UNDERDELIV |

## Interpretation

This closes the catalog reachability bug. The remaining Sana failure is now a normal combat/execution problem: both initial axes are reachable, both make contact, and both fail to capture. The follow-on does not surface because its live corridor requirement is not met. That is the desired non-railroad behavior.

