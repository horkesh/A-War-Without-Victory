# Native39 705/707 first-divergence diagnosis

**Verdict:** the first causally linked divergence is turn 17 VRS commander probe construction, before Operation Circle attacks the two disputed objectives. Accepted n98 creates `probe_vrs_herzegovina_t17` against `op:gorazde:faocici_2` with `rs_foa_brigade`; the uninterrupted native run does not. Foča Brigade therefore remains available in native at turn 18 and defends Donje Žešće and Tošići. Accepted n98 faces Ajnie Brigade and militia/null and captures both. Those are the exact two cells behind 705 versus 707.

This is not an Operation Circle access failure. The native authorization was accepted at turn 16, became a live operation, received Zajko, retained the same five participants/objectives/axes and the 843rd movement order, and reached operation history. The native result instead ends partial/`max_failures`, missing only Donje Žešće and Tošići. The accepted result captures both.

The earliest retained pre-branch input difference is already present in the turn-16 VRS Herzegovina assessment:

| Field | Native actual | Accepted n98 |
|---|---|---|
| `zone_assessments[0].surplus_brigades` | `Gacko, Nevesinje, Ajnie` | `Foča, Nevesinje, Ajnie` |
| corps stance | `defensive` | `defensive` |
| decision hard constraint | `corps_stance_forbids_offensive` | same |
| all 712 controllers | exact | exact |

The different first surplus brigade is a concrete input to commander operation creation. The exact rejecting predicate remains unobserved: ordinary saves do not retain the opt-in `commander_creation` receipt that distinguishes brigade eligibility, reachability, target cooldown, predicted viability, and the other `buildOperations` exits. The shared defensive-stance trace cannot explain the split because accepted n98 still creates the generic probe.

The Electron call chain rules out canonical save stripping as the live boundary for this uninterrupted run. `setCurrentStateSnapshots` stores `serializeRuntimeState(state)` in `currentGameStateJson` and keeps `serializeState(state)` separately for disk; the next `advance-turn` deserializes the runtime string and advances it. Turns 14–19 were direct advances, and Save/Load occurred only after turn 39. The production boundary is therefore turn-17 `generate-bot-corps-orders` into commander `buildOperations`, not IPC canonicalization, Circle admission/delivery, or the turn-18 combat resolver.

The evidence also does not prove a missing native capability. Accepted n98 and native actual are different-input executions, but the paramilitary policy field alone is not causal: both turn-16 states have exactly 4 RBiH and 28 RS deployed paramilitary formations, and the Black Swans reserve request has the same accepted assignment. Concrete military operands differ instead. Native Foča is 760 personnel/morale 64 versus n98 751/62; native Ajnie is 489/55 versus 480/53; native 109th is 682 personnel versus 685. Circle has the same roster and axes with initial strength 4310 versus 4313. The immediate branch is proven; whether it is an intended response to accumulated state or a platform-path mismatch is not identifiable from the retained ordinary schema.

No retained ordinary player action is shown to strengthen or retry Circle before its critical turn-18 attacks. At turn 16, 1st Corps already uses both operation slots. The operation decision surface can launch, postpone, abort, or probe; it cannot add a participant or retry an objective. The turn-15 Black Swans reserve goes to 2nd Corps. A later 1st Corps reserve request names a Sarajevo OG and occurs after Circle's first failures. Author/request-operation machinery exists, but machinery alone cannot waive 707/no-loss: a viable route would still need a visible command before combat, persistence through Save/Load, and an actual passing result.

The prior `active_offensives_against_corps` theory stays rejected. Its bounded production A/B produced `{}` in both branches and did not restore the probe.

## Smallest next production check

Run four bounded one-turn advances, each exact turn-16 input twice, with `desktop_sim.advanceTurn`, `AWWV_DEBUG_REASON_CODES=commander_creation`, and the existing reader. `advanceTurn` primes the production urban/forest sets. The proposed evidence entry is `native39-validation-v1/native39-w17-commander-creation-probe.mts`, modeled on the retained terrain prerequisite probe.

```powershell
$env:AWWV_DEBUG_REASON_CODES='commander_creation'
$attempt='tmp\player-bot-capability-parity-20261024\terrain-parity-repair\cold-load-validation-v2\native39-validation-v1\first-divergence-commander-probe-01'
New-Item -ItemType Directory -Path $attempt | Out-Null
.\node_modules\.bin\tsx.cmd tmp\player-bot-capability-parity-20261024\terrain-parity-repair\cold-load-validation-v2\native39-validation-v1\native39-w17-commander-creation-probe.mts --native tmp-paradox-qa-20260710\evidence\player-parity-rbih-t39-20261025-04\rbih\turn-autosaves\turn-016.json --accepted runs\apr1992_definitive_188w__6deb5845c150c196__w188_n98\save_w16.json --repeat 2 --evidence-dir $attempt 1> "$attempt\stdout.log" 2> "$attempt\stderr.log"
node tools\diagnostics\commander_target_selection_reader.cjs "$attempt\stdout.log" "$attempt\commander-target-selection.json"
```

The native input hash is `87cb05d1f4abbecffe73b7938b3357e5c267551d12c5f0fc80548e7c34ff3bf9`; n98 is `22ef518bb1f894d0afb450643a21d4a628f8f5c1462a80ebda498f81ece943ca`. Relevant production and terrain files are unchanged from package code `12a4680f` to observer HEAD `77a2cc8e`.

The receipt must retain allocation pool, all brigade eligibility stages, offense fitness/rank/selection/location, active-slot commitments, all target filters, and the first rejection. RNG position is `not_applicable`: this commander path explicitly has no `Math.random` or `Date.now`. The expected native terminal is `all_filtered`, likely first at `direct` after selecting Gacko; `predicted_viable` is the bounded alternate to test.

1. Both native repetitions must match and reproduce no Foča/Faocici probe with the same rejection.
2. Both n98 repetitions must match and produce `probe_vrs_herzegovina_t17` with Foča Brigade and Faocici.
3. Stop after turn 17. If a repeated pair differs or either operation envelope fails fidelity, do not interpret and do not retry.

Expected cost is under 20 seconds with a 30-second hard cap; no build or campaign. Because canonical archives omit runtime transients, a passing comparison identifies the persistent-state rejecting predicate; a fidelity failure means the exact uninterrupted branch needs a future runtime receipt capture.

No replay was launched and no source was changed. Full structured findings, paths, hashes, exits, criteria, and stopping rule are in `DIAGNOSIS.json`.
