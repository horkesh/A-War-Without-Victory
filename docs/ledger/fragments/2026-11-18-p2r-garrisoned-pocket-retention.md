## 2026-11-18 — Package P2-R: a cut-off pocket held by two or more brigades is defended, not evacuated through the neck (measured; seats unanimous)

Pre-freeze fix, first step of the 1994-95 attack-and-defence package after P2 (#774). Calibration is held: scores are recorded, the guards gate the merge.

**Defect.** The played forced-attack probe (Request-ops against Ozren, CA cadence, from t91) showed the Ozren line falling at about 49 dead a cell. All four captures were inside 2nd Corps CorpsOperations, so the hard boundary held; the cells were empty. At t96 the Boljanić capture split the RS Ozren component (Petrovo, Brijesnica Donja, Donja and Gornja Bočinja, Jablanica, Vozuća; all supplied) from the main body. `evacuateFormationsSeveredByCapture` then moved every brigade in it (1st, 2nd and 4th Ozren, later the 2nd Armored) through the captured cell to Doboj and Derventa in one turn. Nothing refilled the line: every refill path is same-corps, and the RS reserve was dry.

**Change.** `src/sim/combat/salient_withdrawal.ts`: a cut-off component holding at least `SALIENT_GARRISON_RETENTION_MIN_BRIGADES = 2` of the displaced faction's active brigades is retained; its brigades stay (terminal `garrisoned_pocket_retained`).
- A lone brigade still withdraws.
- Withdrawal destinations stay the main component and own-origin pockets only. A retained pocket is never a target.
- A brigade with an owner-authored evacuation rule (the HVO 102nd Odžak→Orašje) neither counts toward a garrison nor is held by one.
- Faction-blind. No supply is granted, so the critical-supply stranded rule still drains a held pocket.
- Canon: Systems Manual, beside own-origin salient retention.

**Measured** (188w, against main runs at the same commit d3938c3b5; base historical reproduces the pin 03833ed22dee182f):

| Run | Base | P2-R | Scores, base → P2-R |
|---|---|---|---|
| historical | 03833ed22dee182f | f277a94aebd1513d | 694/686/685/656 → 694/685/683/655 |
| hands-off emergent | 14515fd1837f05dd | 521c04be072198be | 694/686/683/656 → 694/685/683/655 |

- **Hands-off.** The first divergence is the Goražde pocket at t70, after RS takes Trnovo (Lukavac 93), and both modes are identical through t87. On main, ARBiH 102nd, 181st, 182nd and 831st were moved through the captured cell to Tušila, and the 802nd to Glamoč. Now they stay. The 102nd is destroyed defending Tošići. The others wither under the critical-supply path and later re-form in Sarajevo.
- Checkpoint cells: Tošići −1 from w104, and Konjic Ljuta −1 from w156. Emergent at w156/w188 also loses Konjic Sitnik and hrusta_2. The oct95 swaps are knock-on operation timing (Kutanja and Lupnica gained, Golubići lost in historical).
- **Unchanged:** Ozren and the Farz falls (t179-183); Bosanski Brod, Jajce and Lašva; Kupres ±1 turn.
- **Played probe** (measured on the pre-#794 main): a four-brigade VRS garrison holds Ozren. The six cells cost ARBiH 3,321 dead against 2,567 VRS (before: about 146/80 each), and the garrison ends at cohesion 15-30.
- **Guards** pass in both modes: enclaves H1.8, eastern provenance CLEAN (the one operation-owned variance, lopare jablanica_2 t77, is on main too), Farz P-A and P-B, HRHB western cascade (30 matched), run consistency.

**Panel.** Ops, corps and historian seats. Round 1 accepted with changes, all applied: two sets (withdrawal target vs held), the authored-rule exclusion, the receipt. Round 2 accepted unanimously with no change. Register-only findings went to the steward: a cohesion-0 brigade held for about 80 turns, enclave-tag vs pocket supply asymmetry, no corps "merge or pull back" path for retained brigades, and pre-t70 1st Corps deployment east of the Trnovo cut.

**Tests.** `tests/salient_withdrawal.test.ts`, "garrisoned pockets hold (package P2-R)":
- two brigades are held;
- a lone brigade withdraws;
- no brigade is withdrawn into a retained pocket;
- the authored 102nd still relocates;
- the 102nd is not counted toward a garrison.

Observer fixtures were adjusted, and the reader accepts the new terminal.
