# Native RBiH player vs n94 causal audit

Date: 2026-10-24  
Scope: retained t0/t1/t39 evidence and governing source only; no replay, native launch, gameplay edit, tuning, or baseline change.

## Verdict

The failed native result is an intentional contract conflict between a normal player campaign and the faction-neutral headless calibration lane. No production gameplay bug is established.

The real game correctly starts a player campaign with `player_faction=RBiH`, `headless_scenario_auto_control=false`, Historical decision mode, and autonomy 2 (`src/desktop/desktop_sim.ts:327-355`). The accepted n94 runner deliberately has no player faction and sets `headless_scenario_auto_control=true`, so all player-response events use the bot auto-response path (`src/scenario/scenario_runner.ts:1645-1677`). Historical mode makes the two routes choose the same authored response where one exists; it does not make player ownership, response timing, or sensitive player-action gates identical (`src/sim/events/evaluate_events.ts:699-849`).

The t39 requirement remains failed: native score 700/712 vs required 707, seven n91/n92 formerly-correct losses, and controller hash `0d8c6b32d09dd6f3c586b1133d166da4045544fbc095b25d9c003a628666fe4a` vs n94 `c21a55c5f3a3d49f60220196cfd6c2ff9a00c4a3e24d7481126c13e60e6a3f95`. This finding does not rebaseline or waive it.

## Earliest proven split

1. The t0 controller map is exact. Before the first Advance, however, the normal New War route presents and applies RBiH's opening `rbih_state_identity` choice at turn 0. The player selected the authored Historical default `civic`, which applies RBiH morale +3 and the `rbih_state_identity=civic` flag. n94 reaches and bot-applies the same response at turn 3 because the authored trigger is turn 2-5. The desktop intentionally queues this opening decision (`src/desktop/desktop_sim.ts:227-255,351-355`; event definition `data/scenarios/events/war_1992.json:1174-1250`). This is the earliest gameplay-state difference, although it does not change the t0 controller map.

2. At turn 1, n94 has no player faction, so `detectParamilitaryTargets` takes the bot branch and auto-spawns/captures. The player route sees the RBiH paramilitary policy event as enabled but unresolved, removes premature RBiH requests, and skips RBiH target generation until the policy is decided (`src/sim/combat/paramilitary_sweep.ts:83-101,420-425,448-449,512-545`). This produces the first controller divergence: n94 has two additional RBiH paramilitary captures, `op:brcko:bukvik_gornji_2` and `op:srebrenica:obadi`; native retains RS control. Native has 12 control events through t1 and n94 has 14.

3. At turn 3, the player explicitly selects `always_deny`; n94 bot-selects the same authored default at turn 4. The event is a required player response; `always_deny` is the authored Historical default, while `always_allow` is explicitly counterfactual. Its source states that this is the canon-bound player-authorized paramilitary/war-crime surface (`data/scenarios/events/war_1992.json:2103-2161,2245-2269,2344-2345`). Hiding an allow choice, pre-authorizing it, or making player RBiH behave as a bot before the decision would conflict with this contract.

## Player actions and downstream boundaries through t39

- **Authored Historical events:** six visible player responses were applied: `rbih_state_identity/civic` t0, `rbih_paramilitary_policy_1992/always_deny` t3, `rbih_minority_retention_1992/retain_minorities` t12, `london_conference_1992/accept_principles` t20, `ic_pressure_vopp_engagement/acknowledge_pressure` t38, and `vance_owen_plan_1993/accept` t39. n94 chose the same response IDs, but as bot defaults. Only the first two have different timing (native t0/t3; n94 t3/t4). Later response equality does not restore the already-diverged simulation state.

- **Paramilitary policy:** native has zero RBiH paramilitary decision receipts and no pending requests at t39. The absence is expected: the unresolved-policy gate suppresses RBiH before t3, then `always_deny` suppresses RBiH deployments (`src/sim/combat/paramilitary_sweep.ts:514-516,552-565`). n94's root `paramilitary_policy` remains `ask` because that field is a player-faction policy surface; with no player faction, bot factions use auto-spawn instead (`src/sim/events/evaluate_events.ts:161-178`).

- **Operations and autonomy:** autonomy 2 does not leave RBiH idle. It includes the player faction in bot brigade-order selection and runs RBiH orders through the assisted-execution branch (`src/sim/turn_phases/war_phases.ts:947-957,2701-2720`). Four RBiH historical-operation reviews were born accepted at turns 4, 8, 14, and 16; the source explicitly says this preserves headless operation behavior while retaining a player receipt (`src/sim/combat/historical_operation_authorization.ts:57-103`; reinjection at `src/sim/turn_phases/war_phases.ts:1811-1833`). The harness issued no manual operation, stop, or force-launch order. Therefore no observed player operation action explains the t1 split. Different active probe operations at t39 are downstream state-dependent outputs.

- **Reserves:** the player accepted two visible RBiH reserve requests, Black Swans at t15 and Guards Brigade at t22. n94's army AI accepted the same brigades on the same turns. The first request identity/purpose matches; the second is native `defensive_gap` and n94 `offensive_support`, showing that request generation had already diverged. These actions can propagate differences after t15/t22, but cannot cause t1 and are not evidence for a defect.

- **Recruitment:** both t39 saves contain the exact same set of 240 recruited brigade IDs. Ongoing recruitment runs in the common war pipeline (`src/sim/turn_phases/war_phases.ts:3447-3463`), and autonomy 2 intentionally delegates it (`src/desktop/desktop_sim.ts:334-349`). The five-formation total difference at t39 must not be labeled a recruitment difference without type-level attribution; the recruited-ID evidence is flat.

- **RNG:** both lanes persist seed `harness-seed`, construct smart bots with `${seed}:smart-bots`, and pass the persisted seed to `runTurn` (`src/desktop/desktop_sim.ts:372-455`; `src/scenario/scenario_runner.ts:2852-2857,2939-2968`). There is no seed/configuration mismatch. Once t0 policy/timing and t1 control differ, candidate sets and deterministic draw/ordering inputs differ, so later deterministic results may diverge without nondeterminism.

## Seven t39 endpoint differences

Directly proven from the t1 prefix:

- `op:brcko:bukvik_gornji_2`: n94 RBiH via paramilitary t1; native RS.
- `op:srebrenica:obadi`: n94 RBiH via paramilitary t1; native RS.

Downstream correlated, not individually causal without a counterfactual replay:

- `op:cajnice:batotici`: n94 RS combat t7; native RBiH.
- `op:foca:brusna_2`: n94 RS paramilitary t8; native RBiH.
- `op:gorazde:kolovarice`: n94 RS combat t14; native RBiH.
- `op:foca:donje_zesce`: n94 RBiH combat t18; native RS.
- `op:trnovo:tosici`: n94 RBiH combat t18; native RS.

The full t39 timelines have 49 accepted-only events (35 combat, 14 paramilitary) and 42 native-only events (33 combat, 9 paramilitary). This broad divergence makes a claim that all seven endpoints were caused only by the two opening captures unsupported.

## Recommendation

Do not change production gameplay and do not run t188/all-faction campaigns under the present acceptance claim. The smallest next action is an owner/canon/calibration decision on which contract is authoritative:

1. Keep n94 as the accepted faction-neutral headless calibration. Then a normal Historical player campaign is a separate, choice-bearing outcome lane; its checkpoint target must be reviewed and approved separately. The observed t39 result is evidence, not a new baseline.
2. Require exact n94 outcomes in the packaged game. Then the supported surface must be an explicit non-player Observer/calibration mode. That does not satisfy the current requirement for normal player gameplay.
3. Change player/canon semantics to force n94 parity. That would require revising opening-event timing and the canon-bound paramilitary authorization contract, followed by calibration approval and new baselines. It is not a small bug fix and is outside the authorized no-tuning/no-reference-change scope.

No retained evidence supports a smaller gameplay correction. The existing exact-707 acceptance criterion remains unmet until the owner changes or retires it through the required canon/calibration process.

## Evidence

- Native result: `tmp-paradox-qa-20260710/paradox-local-qa-native-calibration-rbih-t39-20261024-03.json` (SHA-256 `4cd3b3b1c02975cb52003154a314ae395f8e3769c345b6f4f4c5251ec7bb26d5`)
- Native settled saves: `tmp-paradox-qa-20260710/evidence/native-calibration-rbih-t39-20261024-03/rbih/`
- Outcome receipt: `tmp/r8-native-calibration-parity-20261024/native-t39-03-postrun-audit-01/OUTCOME_COMPARE.json` (exit 1; SHA-256 `3c7fbec68839d04a4ba6322a459d7fe152aa145ee34930b375468ba2f87d8935`)
- Mismatch receipt: `tmp/r8-native-calibration-parity-20261024/NATIVE_T39_03_MISMATCH_DIAGNOSIS.json` (SHA-256 `4d7a04af977cea02dd5da7031199299b1bb32804bce01a17266f55f97fbfcce8`)
- Accepted reference: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n94/`
