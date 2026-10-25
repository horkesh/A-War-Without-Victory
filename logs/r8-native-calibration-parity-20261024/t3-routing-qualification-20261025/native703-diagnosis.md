# Native 703 retained-evidence capability diagnosis

Date: 2026-10-25  
Source HEAD: `fd061e898ad3de942d62c016547a5e453ddd9422`  
Scope: retained evidence only; no gameplay, source, package, native harness, or campaign change; no engine advance.

## Verdict

The fresh 39-turn attempt is **not qualified**. Its strict network gate failed on one ambient audio `net::ERR_ABORTED` at event 126, and the child wrapper exited 126 without retry. The settled/provisional states remain valid diagnostic evidence; they are not a reconstructed pass.

The 703/707 result does not establish a remaining player-operation capability defect:

- `op:brcko:bukvik_gornji_2` and `op:srebrenica:obadi` are proven consequences of the normal visible turn-0 choice `rbih_paramilitary_policy_1992=always_deny`. The actual receipt is player-authored and the two controls never flip. In n94 both flip RS -> RBiH on turn 1 with `mechanism=paramilitary`.
- `op:gorazde:kolovarice` is a combat-path divergence inside the RS-authored `Operation Foca`, not a failed RBiH player admission or delivery. The retained data does not prove whether its root is the opening policy's downstream topology, the fd061 movement correction's downstream operation timing, or another pre-battle state difference.
- `op:trnovo:tosici` positively passes the player capability path: the 109th is delivered, selected, admitted, assigned to the authored axis, and ordered to attack. It loses because a live RS sector supplies `rs_ajnie_brigade` as a distance-weighted reactive defender. This is downstream of the eastern combat state, especially Kolovarice remaining RBiH and Ajnie remaining at Batotici. The retained evidence does not prove the earlier root cause of that eastern divergence.

## Exact controller provenance

At turn 39, actual 703 and old 700 have the same four controllers: Bukvik RS, Kolovarice RBiH, Obadi RS, Tosici RS. n94 has Bukvik RBiH, Kolovarice RS, Obadi RBiH, Tosici RBiH.

n94 records:

| OSID | Turn | Mechanism | Transition |
|---|---:|---|---|
| Bukvik Gornji | 1 | paramilitary | RS -> RBiH |
| Obadi | 1 | paramilitary | RS -> RBiH |
| Kolovarice | 14 | combat, `rs_ajnie_brigade` | RBiH -> RS |
| Tosici | 18 | combat, `arbih_109th_mountain` | RS -> RBiH |

The actual progress record contains visible player receipts for `rbih_state_identity=civic` followed by `rbih_paramilitary_policy_1992=always_deny`, with label `Refuse paramilitary deployment`; after the receipt, policy is `always_deny` and deployment count is empty.

The preserved normal-player counterfactual uses production `resolveDesktopEventDecision` with `civic` + `always_allow`, `player_faction=RBiH`, non-headless, autonomy 2. It reproduces the four paramilitary capture turns and all 712 bot controllers exactly through turn 5. It predates fd061 and is input-effect evidence only, not native qualification.

## Kolovarice chronology

`Operation Foca` is RS bot-owned in all three paths and starts on turn 4. The current actual and n94 operation histories match through the turn-8 objective sequence. Their first material retained combat divergence is at the shared Kolovarice attacks:

| Turn | Actual 703 | n94 |
|---:|---|---|
| 8 | Ajnie 928 at Batotici; Foca 881 at Ustikolina; 801st 1004 at Kolovarice | same retained brigade values/locations |
| 9 | Ajnie attacks 801st; stalemate; 189/93 casualties | same attacker/defender/outcome; 190/93 |
| 10 | Ajnie attacks 801st; catastrophic; 354/29 | same attacker/defender/outcome; 313/32 |
| 12 | Foca brigade attacks 801st; catastrophic; 323/29 | no Kolovarice battle |
| 13 | 801st leaves toward Ustipraca; Kolovarice has no physical RBiH brigade | same movement chronology |
| 14 | no attack; controller remains RBiH | Ajnie attacks militia/no physical defender; costly victory, 49/0; controller flips RS |

The current actual `Operation Foca` ends turn 18 after 13 attacks, ten captures, and no Kolovarice capture. n94 ends turn 16 after 13 attacks and includes Kolovarice among ten captures. Old 700 ends turn 16 after nine attacks and also misses Kolovarice; its route-blocked branch is not evidence for the current cause.

The operation definition authors Kolovarice on both the Foca Valley and Cajnice Southern axes (`pre_planned_operations.ts:755-797`). Admission selects only resolved, eligible, non-disrupted formations with available transit authority, no conflicting commitment, reachable staging, and sufficient personnel (`pre_planned_operations.ts:2039-2132`); hostile objectives are retained from live controller state (`pre_planned_operations.ts:2144-2166`). All of those paths ran for actual `Operation Foca`; the mismatch is after admission and attack issuance.

The evidence establishes the first observed divergence, not its root predicate. The actual and n94 turn-8 rows cover the named local brigades but are not complete byte-identical pre-battle states, and n94 has no full turn-8 save. A policy-causality claim for Kolovarice would therefore be inference.

## Tosici capability predicates

The current actual fixes the former physical routing defect:

- Turn 8: 109th at Lokve, personnel 748, matching n94.
- Turn 9: 109th reaches Kijevo; it stays attack-capable there through Circle admission.
- Turn 17: `Operation Circle` is admitted with the 109th among five participants. The `trnovo_corridor` axis has staging Delijas, target Tosici, and `assigned_brigades=[arbih_109th_mountain]`.
- Turn 19: the 109th attacks Tosici; stalemate, 75/25; primary defender Ajnie.
- Turn 20: it attacks again; catastrophic, 208/12; primary defender Ajnie; the 109th is destroyed and removed from the axis.
- Turn 23: Circle ends with the Trnovo axis at two attacks, zero captures, two failures, `last_result=failed`.

The authored Circle axis names the 102nd and 109th, target Tosici, staging Delijas (`pre_planned_operations.ts:1309-1341`). Actual selection is positive evidence that formation resolution, eligibility, transit authority, conflicting commitment, staging reachability, hostile-objective, and viable-participant gates passed. Queued admission then consumed the queue and created the active operation (`pre_planned_operations.ts:2636-2749`).

The exact losing defense predicate is also retained. On turns 17-20 Tosici remains RS and appears in live RS sector `sector:vrs_herzegovina:0`, whose assigned brigades are Ajnie and Foca and whose front edge includes `delijas__tosici`. Sector lookup selects a defender-faction sector whose friendly side owns the target and prefers a live assigned roster (`sector_utils.ts:107-147`, especially `:126-145`). Combat then admits active standing sector brigades, computes friendly-territory BFS distance weights, adds reactive response, and chooses a primary contributor (`attack_resolution_osid.ts:794-928`). The battle records identify Ajnie as that primary defender.

n94 differs at the resulting combat predicate: Circle starts turn 16; on turn 18 the 109th attacks Tosici with `primary_defender_id=null`, wins for 21/0 casualties, and flips the controller. Ajnie had captured and moved to Kolovarice on turn 14. The actual Tosici miss is therefore a combat-state consequence, not missing admission, delivery, or attack ownership.

Circle begins one turn later in actual because the preceding 1st Corps `Visoko-Breza Line Clearing` completes on turn 17 after three attacks; n94 and old 700 complete it on turn 16 after one. The delay is observed, but its causal root is not isolated. It does not prevent Circle or the Trnovo attack.

## Smallest next production-path probe

Add one observable QA-harness selector for the existing visible event response `rbih_paramilitary_policy_1992=always_allow`; do not change gameplay or default policy. Run the existing fd061 packaged native RBiH path only through settled turn 23, preserving the ordinary UI choice receipt, per-turn states, operation histories, and runtime diagnostics.

Pass predicates:

1. The visible receipt is player-authored `civic` + `always_allow`, with non-headless RBiH/autonomy-2 metadata unchanged.
2. Turn 1 has the exact Bukvik and Obadi paramilitary flips; the known turn-2 pair also flips; controller cardinality remains 712.
3. The fd061 delivery chain remains: 109th Lokve at turn 8 and Kijevo at turn 9.
4. Operation Foca/Kolovarice and Circle/Tosici are observed through Circle terminal state at turn 23.

Stop conditions:

- Stop immediately on any choice/receipt/cardinality or 109th-delivery mismatch.
- If the four direct policy flips pass but Kolovarice or Tosici still differ from n94, treat opening-policy causality for those combat outcomes as falsified. Do not tune gameplay or repeat the campaign. Instrument the earliest turn-9 Kolovarice power/sector contribution divergence under the existing reason-code path.
- If both match by turn 23, the causal question is answered; only then is a fresh strict turn-39 native qualification run justified. The 707 acceptance criterion remains unchanged.

Expected cost: one small harness-only selector change and one 24-state native prefix (turns 0-23), with no package rebuild because the selector lives in `tools/ui/paradox_local_qa.cjs`. Stop before a turn-39 campaign unless the prefix passes.

## Hash binding and retained limits

- Actual turn 39: `a983480115319876428342cbd040ebc91c40766d544930ba075c4185bffd9d73`
- Old player turn 39: `244aa78243af8ba17620a28246a629b1b9ccbd08d4b5cf1577475ef6600635d3`
- n94 turn 39: `e51224ac22a839d4c1af35a0ea828afb79b62f0ed56559c3b47dcda45578eec5`
- n94 turn 15: `dfe2ec1dc13ef286eaea2d51c3bbe9505b3d11afb2c6e5e3bb5922586838cb97`
- n94 brigade temporal log: `f8e7a7446ddef8da8d392cf949cd6f00b8b4e37ac4aa9c03c2a66e4d6a88cd96`
- Actual progress JSON: `29e92380e926eaa38801b39450712dbf2138dcb81fc7a08831c27016a7f0884f`
- Always-allow six-turn result: `e0d2521fc42959209248f8dc1e7523eb5d964258e99caec482cf153985237ba6`
- Always-allow postrun result: `2313ee1e3a0be8ca4309c8148f287d24ebc104ef55e7cbe1d29ff1420c2f15c8`

The failed native attempt has no final-result JSON. Its progress JSON and all 39 state pairs support diagnosis only. The separate runtime audit remains NO-GO and is not altered by this analysis.

The first diagnostic extraction was retained exactly at `tmp/native703-capability-diagnosis/`: `extract-retained-evidence.cjs` (5,701 bytes, SHA-256 `8e9ea158cbcbdc5d2b2528f5987e4e3ac673a20ebdc4d8e155c2d1b745aa8733`) and `retained-extraction.json` (5,284,160 bytes, SHA-256 `f33de72593ccee62c32d1bfae8a42ab766358de98a084a296d893b0c09d8a911`). No retained run file was moved or changed.
