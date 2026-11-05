# Historian seat — W3 verdict

**Vote: 2 PARK. Confidence: medium.**

**Load-bearing reason:** B's lead over C is mostly real history, not luck. C loses ground that actually held and never mounts offensives that actually happened. Its only gains come at the very last scored week, which looks coincidental. Landing W3 now swaps a hidden mechanical defect for visible historical ones. Park it until the T1/T2/T3 relief path staffs those fronts.

## Measured (my own replay of control_events over initial controllers, the same way verify_checkpoints.cjs does it, n1 vs n2)
OSIDs where B and C disagree: 9 at jan1993, 6 at apr1994, 9 at apr1995, 15 at oct1995. Which run matches the reference in those cells: B 8/1/9/10, C 1/1/0/5. Turn numbers below are approximate dates (week 1 ≈ early April 1992).

1. **The ground C loses is early, and most of it is ground that held.** In C, `konjic:glavaticevo_2` falls to RS at t1 and `konjic:ljuta` at t2. Neither is retaken. `vogosca:hotonj` falls at t20 and is also never retaken. B holds Hotonj. B retakes Glavatičevo at t129 and Bijela at t128 (about September 1994), which fits BB2's 1994 Konjic annex (repo file p0514): it records ARBiH-held Glavatičevo and ARBiH advances onto the high ground over Bijela. Only B also gets these right:
   - Trnovo `tosici`: RBiH at t14, lost at t72. That matches the 1993 VRS retaking of Trnovo.
   - Vlašić `gornje_krcevine`: retaken at t155 (C: t161, missing the apr1995 checkpoint).
   - Jajce `lupnica`: fell at t34 (C: t40). Both are late for the October 1992 fall of Jajce, C more so.
   That C loses its fronts in weeks 1–20 is consistent with sectors left unstaffed under W3. This is inference; not traced battle by battle.
2. **C's oct1995 gains are cutoff coincidences, and one of its flips is wrong history.** `sanski_most_2`, `drvar_2`, `bjelajce_2`, `jajce:prisoje` and `matavazi_2` all flip at **t188, the scored week itself**. The direction is historically right: in autumn 1995 Mistral 2, Južni Potez and the Sana offensive took this ground. But Drvar and Jajce really fell in mid-September, so a final-turn capture is not reproducing that timing. C also hands `gradacac:pelagicevo` to HRHB at t186. That is ahistorical: the Posavina corridor held, and the reference has it RS.
3. **Farz/Uragan 95 matters to the story far more than to the score.** BB1 (repo file p0423, about printed p.386 given the file-minus-37 offset) says 2nd and 3rd Corps linked up when they took Vozuća. That secured the Tuzla–Zenica road, cut about 150 km off the journey, and took nearly the southern third of the Ozren. It counts for only 3 of the 712 OSIDs at oct1995. But it is the simulation's main evidence that ARBiH could attack in 1995 at all. C still takes Vozuća (t180, both runs), but loses the two Maglaj Bočinja cells and the Spreča/Brijesnica cell. The historical limit holds: Petrovo stays RS (BB1 file p0422/p0499).

## Reference confidence
- 4 of B's advantage cells are in the Goražde/Čajnice rim: `gorazde:kamen`, `foca:donje_zesce`, `cajnice:miljeno_2`, `cajnice:todorovici`. The project already records this area's reference as SUSPECT, so I give them little weight. Take them out and B still leads clearly.
- The Ozren cells are well sourced (BB). The Maglaj–Jablanica doubt concerns `maglaj:jablanica`, which is not among the cells that differ here.
- Konjic: BB supports the reference. Hotonj and Gornja Vratnica: no BB entry found, so low-to-moderate confidence.

## Caveat
B's fidelity comes from a teleport that §14.9 forbids, so some is right for the wrong reason (canon seat's call). In my lane, the history W3 loses is real.
