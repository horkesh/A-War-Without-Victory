## 2026-11-17 — Commander attribution PR 2a: an officer commands only his own corps (operations and vacancies); the 7th Corps gets its officers (measured, control moves)

Pre-freeze fix (owner rule: no engine changes after 1.0). PR 2a of the commander-attribution work (PR 1 hardened release and relief; PR 2c adds the dated corps-CO schedule; PR 2b retypes ranks). Calibration is held: scores are recorded, guards stop merges.

**Defect.**
- `selectOperationCommander` took any free `corps_commander` officer of the faction once no home or compatible officer was free. A 2nd Corps or Srebrenica officer could command a 7th Corps operation, and the 4th Corps borrowed Hodžić, Malkić, Mešić, Merdan and Lendo all war.
- `findBestReplacement`, the corps-vacancy fallback, did the same. Any reserve officer of the faction could take over another corps.
- The 7th Corps had no officers of its own.

**Change.**
- Both selectors keep only an officer whose home or compatible corps is this corps.
- With none free, an operation has no named commander. Combat then uses the corps commander's modifier, the existing fallback.
- A vacancy with none free gets the existing generic acting commander. It is replaced as soon as an officer of the corps is free.
- The acting commander is **neutral** (orchestrator ruling). He stands in for a holder the sources don't name, so his competence, aggressiveness, defensive skill and political reliability are his faction's average named corps commander (`averageCorpsCommanderTraits`), and he doesn't learn.
  - Before, he had competence 2 from the timeline config and defensive skill 2: a below-average personality driving the commander loop for every gap.
  - The acting combat modifier and the HVO replacement delays are unchanged.
- Data (historian seat, `_logs/officers-20261117/historian_officer_table.md` §2):
  - Alagić: home 7th Corps, compatible 3rd. He was 7th Corps commander 1994-95 (BB1 p.491; BB2 pp.465-510).
  - Čuskić: home 7th Corps, compatible 3rd. He commanded OG Bosanska Krajina, which passed to the 7th Corps (BB2 p.510).
  - Cikotić: compatible 7th Corps. His OG West passed to the 7th Corps (BB2 pp.429, 510).
- The startup snapshot is re-baked.

**Measured at merge** (188w, on post-P2 main 1f814da3c, after #774 and #794; the main runs are #794's at the same simulation code, 694/686/685/655 historical and 694/686/685/654 emergent):
- **Historical:** 694/686/685/656, final_save 03833ed22dee182f.
  - oct95, lost: Jajce lupnica, Konjic sitnik.
  - oct95, gained: Donji Vakuf babin_potok_2, donji_vakuf_2, oborci_2.
- **Hands-off emergent:** 694/686/683/656, final_save 14515fd1837f05dd.
  - apr95, lost: Konjic sitnik and Nevesinje hrusta_2, both taken early by RBiH.
  - oct95, net +2.
- The first control divergence is at t119: Konjic bijela_2 falls to RBiH 9 turns earlier.
- Guards intact in both modes: enclaves H1.8, Farz P-A, P-B, HRHB western cascade (30 matched).
- Acting corps-turns: 328 of 3098 (10.6%).
  - JNA Herzegovina Command 188 (all war; ruled to end with the JNA withdrawal, in PR 2c).
  - 4th Corps 126 (t63-188), 7th Corps 13 (t176-188), 3rd Corps 1.

**Measured earlier** (188w, main runs at the same commit 08f486ae9; main 709/709/708/682, historical 2c63bd10fecd6bc7, emergent bfcbfa55dd206585):
- Restricting operation command alone (first version) gave 709/709/705/671 in both modes.
  - Cause, traced turn by turn with a runner observer: the 4th Corps had no eligible officer, so its operations ran commanderless (10 of 12).
  - Because the vacancy fallback was still faction-wide, Hadžihasanović (t66-80) and then Alagić (t80-99) were seated in the 4th Corps. The corps commander's personality drives the commander loop, so the 4th Corps made 12 attacks against 5 on main and over-captured RS cells in Mostar, Nevesinje and Kalinovik.
- With both selectors restricted and the neutral acting commander (this change): **709/708/707/676** in historical and hands-off emergent. Guards intact. Hashes: historical f5fc27c7700d4dcf, emergent a812b619fb0a05c0.
  - Making the acting commander neutral changed no cell.
  - Acting-commander corps-turns, all factions: 321 of 3098 commanded corps-turns. 188 of them are `jna_herzegovina_command`, which is acting all war. The others: 4th Corps 124 (t65-t188), 3rd Corps 8, 7th Corps 1.
  - Main has 1 acting corps-turn: on main, Gavrić, the East Bosnian Corps' chief of staff, commands the JNA Herzegovina Command all war, another cross-corps attribution this change removes.
  - The historian is sourcing the 4th Corps successors and that command's end.
  - The 4th Corps runs on an acting commander from t65 (Hujdur's death). Pašalić, the corps' only other officer, is commanding a probe when the seat opens and stays on its operations. PR 2c's schedule names him for t24-80, and the historian is sourcing the successors.
  - The 7th Corps keeps Alagić to t167.
  - Cells, apr1994 to oct1995:
    - konjic:bijela_2 falls at t101 instead of t130 (the reference is RS in April 1994).
    - mostar:vranjevici_2 is taken (the reference is RS).
    - The 1995 western chain runs 1-2 turns later, so Donji Vakuf ×3, Jajce barevo_2, Drvar ×2 and Ključ hadžići fall after t188, and Jajce grdovo and Travnik gornje_krcevine are gained. This is the known tail knife-edge.

**Tests.**
- `tests/operation_commander_corps_pool.test.ts`.
- `tests/officer_system.test.ts`: the vacancy fallback seats an acting commander, never another corps' officer. The incompatible-assignment penalty is covered through a scheduled holder.
- `tests/probe_officer_preparation_sequence.test.ts`: fixture adjusted.
