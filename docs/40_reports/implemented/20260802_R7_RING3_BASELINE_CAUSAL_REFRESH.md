# R7 Ring-3 Baseline Causal Refresh

**Date:** 2026-08-02  
**Status:** Causally accepted; canonical refresh authorized  
**Owner:** R7 sensitive-history content / orchestrator baseline owner

## Outcome

The golden baseline mismatch first observed after R7 Phase 1.1 is not an R5 performance regression or toolchain drift. A clean exact-commit bisect proves that `3c2e8a47facf334839d4914f2e48aa2e3c91d301` (`fix(content): enforce R7 provenance and Ring-3 gates`) is the first artifact-changing commit after the accepted baseline at `6c02edcaf950d7d52ebb05fb63b10b89f50d7442`.

The change is intentional and required by the locked sensitive-history contract. `drina_cleansing_decision_1992` no longer lets a player or bot authorize a cleansing program. The retained response id `systematic` now means opening command-accountability proceedings. It removes the former `war_crimes_delta: 5`, morale `+3`, and internal-cohesion reward while retaining punitive international-standing and territorial-legitimacy consequences. The historical Drina campaign remains a separate non-player-authored informational consequence.

## Exact causal proof

- Baseline runner at exact commit `6c02edcaf` passes all scenarios under the current Windows/Node environment.
- Baseline runner at `61ecd3d44b56225d254214413bf6a5408c8b8c64`, the direct parent of the Ring-3 gate commit, also passes.
- Baseline runner at `3c2e8a47f` fails with the same `apr1992_52w/activity_summary.json` hash later observed on `5987daea5` and `0fd36157b`.
- The same mismatch reproduces on exact Task 8A control `5987daea5`; therefore Task 8A is exonerated.
- The deterministic bot selects the same response ids before and after the change: `rs_strategic_goals/all_six` on turn 1 and `drina_cleansing_decision_1992/systematic` on turn 11. The first weekly artifact divergence is week 11, where the removed unlawful morale/cohesion reward changes otherwise-identical battle power ratios. This is the expected causal boundary.

The bisect path was:

| Commit | Result |
|---|---|
| `6c02edcaf` | good |
| `2d72d75e3` | good |
| `61ecd3d44` | good |
| `3c2e8a47f` | bad / first changed |
| `cac0cd530` | bad |
| `5987daea5` | bad with the same activity hash |

## Artifact review

For `apr1992_52w`, seven of eight baselined artifacts change; `formation_delta.json` remains exact. The activity summary changes only three means:

| Metric | Old | New |
|---|---:|---:|
| Front-active mean | 1237.596154 | 1236.192308 |
| Pressure-eligible mean | 1334.000000 | 1332.461538 |
| Displacement-trigger-eligible mean | 1237.596154 | 1236.192308 |

The first weekly differences are small battle power-ratio/casualty movements on turn 11. Those propagate deterministically through control, displacement, later operation timing, final state, the end report, and run-summary diagnostics. The final run changes from 112 to 113 controller changes. These are downstream effects of removing the prohibited positive military/humanitarian incentives; they are not unexplained simulation drift.

The canonical refresh is limited to the generated baseline manifest. It does not change source behavior, scenario authoring, save schema, canon, package/version, or release state. A fresh no-refresh rerun and canon check are required immediately after refresh. Any additional OOB/startup work receives its own later causal review and may not be folded into this checkpoint.

## Verification contract

1. Run `UPDATE_BASELINES=1 npm.cmd run test:baselines` from clean integrated source.
2. Inspect the manifest diff and require the changed scenario/artifact set to match this report.
3. Run `npm.cmd run test:baselines` without refresh.
4. Run `npm.cmd run canon:check`.
5. Record exact changed hashes, commands, and results in the ledger and this report before commit.

## Verification result

The authorized refresh changed exactly the seven reviewed `apr1992_52w` hashes and no four-week scenario hash:

| Artifact | New SHA-256 |
|---|---|
| `activity_summary.json` | `18ca462450125664e0b1465b1dc357e6769420c4d8b7a6e1f915da26d1750f07` |
| `control_delta.json` | `5d058c0b5bcfa1088dcdaa0fb70c00c5bd57e5a4e7b89d448a375cc4313d1d97` |
| `end_report.md` | `cb626598ed5d6b431805dc4825369e29e3e89f674f294eefcbde6bc692456b1b` |
| `final_save.json` | `1e6fe9a9c91f68f67b679866ac7cd23a222b98440c66eff9c466519d4d14c7c4` |
| `run_summary.json` | `ad04909634905b271fe0497951a35e097cf6021aa191600498136bf60541c70d` |
| `watched_operations.json` | `b67b41c3171762c34c566acbdac994ef6a83a208240c60a90582611999c98a84` |
| `weekly_report.jsonl` | `c62f331874d622c9b947f6e3b088845fb8d75b72f4d93e80a5ea569d647b48c7` |

`formation_delta.json` remains `65355e908edf92ccd8b784cfa7a2f1bc19f33982c1f16c0cdfa1367c61d98177`. The refresh command completed in `90.7s`; the immediate no-refresh rerun passed all scenarios in `63.6s`; `npm.cmd run canon:check` then passed its determinism static scan and embedded no-refresh baseline in `68.2s`.

No edit is made to `docs/10_canon/FORAWWV.md`. No Electron build, package, version, tag, signing, publication, or public release action is authorized by this checkpoint.
