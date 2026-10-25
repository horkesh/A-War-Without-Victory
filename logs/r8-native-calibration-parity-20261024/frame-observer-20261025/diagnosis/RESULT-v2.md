# Native 703 capability diagnosis — paired explicit-allow addendum

Date: 2026-10-25

This addendum preserves `RESULT.md` byte-for-byte (10,544 bytes; SHA-256 `88c5ebe834e89880d42097cf400d053af3beed862d9f0921dc316af15e09aab5`) and incorporates the retained normal-UI explicit-allow run. It is a diagnosis only. It does not qualify either failed native attempt, waive the 707 criterion, change policy, change production files, or advance the engine.

## Verdict

The paired evidence separates the two former losses:

- **Kolovarice is a proven ordinary-choice-dependent strategic branch.** The visible turn-0 civic choice plus `always_allow` changes the battle path and is sufficient to produce the n94 controller at turn 14. The deny run remains RBiH. The explicit-allow and n94 paths are already close at the decisive turn: both use Čajniče Brigade and flip Kolovarice; their casualties differ slightly.
- **Tosici is not rejected by Operation Circle admission, participant assignment, delivery, attack ownership, the 109th Brigade, its officer, or its corps command directive.** The explicit-allow run admits Circle at turn 16 with the same five participants and the same 109th-to-Trnovo/Tosici assignment as n94, then the 109th attacks Tosici at turns 18 and 19.
- **The first exact Tosici divergence is defender resolution.** In explicit-allow turn 18, the production resolver finds a live RS sector path and receives positive reactive contributions from Čajniče and Foča Brigades; the 109th is repulsed. In n94 turn 18, the authoritative battle row records `defender_kind=militia`, `defender_formation_id=null`, battle ID ending `:null`, and an RBiH victory. The retained n94 row also carries `defender_opsec`, which proves a defending sector ID existed during resolution even though no standing brigade supplied positive defense.

The current evidence therefore supports two distinct classifications. The input-policy gap is causal and sufficient for Kolovarice. Tosici is an unresolved **runtime strategic-state / standing-defense-availability difference**, not a demonstrated missing player operation capability and not evidence for a gameplay fix.

## Kolovarice chronology

At the turn-8 settled checkpoint, the selected local formations in explicit-allow and deny are identical: RBiH 109th at Lokve (`personnel=748`, `cohesion=43.2`, `morale=95`), Čajniče at Batotići (`928`, `48.45`), Foča at Ustikolina (`881`, `37.9`), and RBiH 801st at Kolovarice (`1004`, `75.2`).

At turn 9, explicit-allow and deny produce the same stalemate: Čajniče attacks the 801st at Kolovarice, with 189 attacker casualties and 93 defender casualties. Their selected post-turn formation state is exact. Retained n94 reports the same battle site and `power_ratio=0.78`, but the native summaries do not retain exact power operands.

At turn 10, the branches separate in combat modifiers and losses:

| Run | Outcome | Attacker / defender casualties | Labels |
|---|---|---:|---|
| explicit allow | catastrophic | 308 / 32 | `stale_intel` |
| deny / historical | catastrophic | 354 / 29 | `stale_intel`, `defender_opsec`, `ambush_risk` |
| n94 | catastrophic | 313 / 32 | `stale_intel` |

At turn 14, explicit-allow flips Kolovarice to RS with Čajniče against no physical defender (`victory`, 37/0 in the turn summary; its two contributing RS brigade histories split the aggregate losses). N94 also flips it with Čajniče (`costly_victory`, 49/0). The deny run has no turn-14 Kolovarice battle and leaves the settlement RBiH. This is direct paired evidence that the normal visible choice supplies the needed player input for Kolovarice; the later casualty delta is a strategic consequence of that branch.

## Tosici chronology and exact predicate seam

Explicit-allow Operation Circle is admitted at turn 16, one turn earlier than deny and on the same turn as n94. Its five participants, axes, 109th Brigade assignment to the Trnovo axis, target Tosici, and staging point Delijaš match n94. The operation's initial strength differs only by the already accumulated combat history (`4310` explicit-allow versus `4313` n94). The 109th Brigade differs only by three personnel at this checkpoint (`682` versus `685`) among the selected fields. Officer Zajko's Circle assignment and recorded operational fields match. The 1st Corps directive that owns the operation also matches in the compared fields.

At explicit-allow turn 18, the 109th attacks Tosici from Kijevo. The battle is repulsed, with 153 attacker and 38 defender casualties. The retained report identifies two positive sector contributors:

- Čajniče Brigade: 9 casualties, 5 hops, reactive weight 6.56.
- Foča Brigade: 29 casualties, 4 hops, reactive weight 19.71; selected as the primary defender.

At turn 19, the 109th attacks again and suffers a catastrophic result (217/23); the same two defenders contribute. The 109th then has zero active personnel, and Circle enters recovery before stalling.

At n94 turn 18, the 109th attacks Tosici and wins against militia (`attacker=21`, `defender=31`, `power_ratio=1.7`), flipping the settlement. The battle row has no defender formation and its ID ends `:null`.

The production predicate is explicit in source:

1. `findSectorForEnemyOsid` selects a defender-faction sector containing the target (`src/sim/combat/sector_utils.ts:118`).
2. The resolver obtains `getStandingOgDefenseBrigadeIds(sector)` and filters each formation through `isStandingOgDefenseBrigadeAvailable` (`src/sim/combat/attack_resolution_osid.ts:801-819`; `src/sim/combat/standing_og_defense.ts:13-26`).
3. Availability rejects inactive, disrupted, in-transit, movement-ordered, queued-preplanned, and active-operation formations.
4. If positive contributors remain, combat uses the sector path. Otherwise it falls back to militia. The existing `battle_stack,battle_power` diagnostics expose the exact path and operands (`src/sim/combat/attack_resolution_osid.ts:1449-1469`). The source comment at 1454-1469 also explains why a militia-only battle can retain sector-derived labels such as `defender_opsec`.

The explicit-allow turn-17 state has a live `sector:vrs_herzegovina:0` containing Tosici, with Čajniče and Foča assigned as front brigades and Bileća in reserve. Both contributing brigades are active, ready, not disrupted, assigned to that sector, and have no movement order recorded in the examined formation state. N94 `save_w16.json` does not retain the transient sector topology needed to identify which individual availability predicate failed at combat time: its persisted `corps_front_sectors` and `war_front_edges_osid` are empty. The n94 combat row proves the resolver selected a sector and then used militia; it does not prove which roster member was absent or rejected. Reconstructing a sector from n94 final state would fabricate the missing transient state and is excluded.

## Political and corps controls

At turn 16, the defender-side strategic directives are byte-order-equivalent JSON values between explicit-allow and n94 for both RS and HRHB:

- `military.political_directives_by_faction.RS` and `.HRHB`
- `military.army_corps_directives_by_faction.RS` and `.HRHB`

The player-side difference is real: explicit-allow has no RBiH political or army-corps directive, while n94 has `b1:RBiH:HONOR_TRUCE:16` and limited `avoid_escalation` economy roles. This reproduces the established player/bot input gap, but it does not explain the Tosici defender branch: the RS inputs match, while Circle admission, its 109th assignment, and its attack delivery all succeed. It remains an input-surface difference, not causal evidence for this rejection seam.

## Smallest next production-path diagnostic

Prepare and independently review one ignored diagnostic script, then run it only after root GO. It should execute exactly two independent one-turn calls to the shipped `desktop_sim.advanceTurn` path, which itself runs `BotManager.runBots` and `runTurn` on a structured clone (`src/desktop/desktop_sim.ts:375-441`). No browser, package, native process, build, multi-turn campaign, source edit, or n94 reconstruction is required.

Proposed reviewed command:

```powershell
$env:AWWV_DEBUG_REASON_CODES='battle_stack,battle_power'
pnpm exec tsx tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/replay-actual-power-seams.mts `
  --kolovarice-input tmp-paradox-qa-20260710/evidence/player-explicit-allow-t23-20261025-01/rbih/turn-autosaves/turn-008.json `
  --kolovarice-expected tmp-paradox-qa-20260710/evidence/player-explicit-allow-t23-20261025-01/rbih/turn-autosaves/turn-009.json `
  --tosici-input tmp-paradox-qa-20260710/evidence/player-explicit-allow-t23-20261025-01/rbih/turn-autosaves/turn-017.json `
  --tosici-expected tmp-paradox-qa-20260710/evidence/player-explicit-allow-t23-20261025-01/rbih/turn-autosaves/turn-018.json `
  --out tmp/player-bot-capability-parity-20261024/native703-capability-diagnosis/power-seam-replay-01
```

The script contract should be narrow:

- verify all four input/expected SHA-256 values below before loading;
- run exactly turn 8→9 and turn 17→18, independently;
- retain only the two target battle rows plus `battle_stack` / `power_breakdown` diagnostics and command metadata;
- remove only the opt-in debug payload before canonical serialization, then require exact equality with the corresponding retained expected state;
- record exact Kolovarice attacker/defender power operands and exact Tosici sector roster, each availability result/reason, reactive distance/weight, selected path, and militia floor;
- stop at the first input hash, battle-ID, turn, or canonical-output mismatch; do not retry and do not start a native campaign.

Cost is bounded by two state loads and exactly two production `advanceTurn` calls. The pass criterion is an inert replay (both canonical outputs exact) plus complete target diagnostics. A mismatch is a diagnostic failure and stops the work. This probe resolves the missing actual T9 operands and demonstrates the current Tosici selection numerically. It cannot identify the missing n94 transient roster subpredicate; the authoritative limit remains militia fallback versus actual positive sector contributors.

## Immutable evidence binding

| Evidence | Bytes | SHA-256 |
|---|---:|---|
| `explicit-allow-native23-20261025/RAW_FAILED_NATIVE23_DIAGNOSTIC.json` | 3,613 | `ace12ba237ce643a8a04c6338af173a955d2dd01bb368ed46797d16897a94b9c` |
| explicit-allow final result JSON | 12,689,363 | `cdb645cae36e43278797df3cce9d6417cbfa308e29b98d6473e35463412ec003` |
| explicit-allow progress JSON | 12,688,935 | `572fd43537e4aad4fe8bbef04e8fbd899a9ddb4fafad4599cd50209735d03b7a` |
| explicit-allow settled turn 8 | 4,121,071 | `91fb242e41529523006bba41f879e0e57a33cf630edfd8b1932a435270333761` |
| explicit-allow settled turn 9 | 4,176,744 | `328c0896bb12894e37a28b42d12e285d281ab463516f71623661bf733d784ca4` |
| explicit-allow settled turn 16 | 4,743,382 | `a7466b5a795b0d679632f375d08ca080cbbae3eba4405e64801e74ea0277acde` |
| explicit-allow settled turn 17 | 4,776,926 | `51af11b524c405591875bcba8a1a0c8ccbb158820030ca0baa24e7b373aa4d1e` |
| explicit-allow settled turn 18 | 4,864,712 | `fb862593102e632646a943dba4b131f1180709ae8d12a27160826335dc268fc0` |
| explicit-allow turn 23 / final / manual quicksave (each) | 5,083,632 | `f9ce535068c8ba374068995c8f43a620cda313567f3052d22ec621034331b237` |
| n94 `save_w16.json` | 4,493,938 | `22ef518bb1f894d0afb450643a21d4a628f8f5c1462a80ebda498f81ece943ca` |
| n94 `weekly_report.jsonl` | 33,185,387 | `08b8e8cc74f7945ac4066edbce6cddfce74c40180c6fa013a6cb6c9997637669` |

Both native attempts remain raw diagnostics only. The explicit-allow attempt failed its optional CDP collector finalization and the 39-turn deny attempt failed its strict network gate. Neither is qualified, and no retry is warranted by this diagnosis.
