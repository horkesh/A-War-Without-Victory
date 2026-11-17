## 2026-11-17 — Commander attribution PR 2b: OG, division and brigade officers become tactical commanders; TG leaders are released and stay in their corps; a pulled-up tactical commander holds a corps only as acting (panel, two rounds; measured, control moves)

Pre-freeze fix (owner rule: no engine changes after 1.0). PR 2b of the commander-attribution work, after PR 2a (#796). Calibration is held: scores are recorded, guards stop merges.

Panel: corps-army-commander, operations-expert, historian (3 seats, 2 rounds). The rulings and seat files are in side-session-notes `rf_roster_2b_tally.md`.

**2b-i (byte-identical before the retype; measured identical to PR 2a in both modes, f5fc27c7 / a812b619).**
- `releaseOperationCommanders` releases the TG anchor's tactical commander together with the operation commander at every operation end: sector_offensive ×2 and corps_command.
  - Before, the normal ends released only the operation commander. A TG leader stayed `active` with a stale `assigned_operation` for the rest of the war, so the pool drained.
- `selectTacticalCommander` takes only the TG's own corps (home or compatible), else nobody. This is the defect PR 2a removed from the other selectors.
- `findBestReplacement` ranks a corps-rank officer of the corps before one of its tactical commanders (Galić TJ para 604; Krstić TJ para 331; BB2 p.510).

**2b-ii (the retype).**
- 42 officers become `tactical_commander`, per the historian table: 14 RS, 17 RBiH, 11 HRHB brigade, OG and division commanders. Their op command now comes from leading TG anchors (combat_math ~786-818), not corps operations.
- Chiefs of staff and deputy corps commanders keep corps rank: Kelečević, Sladoje, Gavrić, Selmanović, Merdan, F. Nakić. In the engine, `deputy` means army-level succession.
- No source supports these compatibility links, so they are removed: Andrić, Samardžija, Arsić, Lozančić. Ajnadžić becomes compatible with the 3rd Corps.
- Kordić, a political figure and not a line commander, is excluded by data (`available_until_turn: 0`) until an exclusion flag exists.
- Imamović's Goražde lock is removed. His sourced command was the 14th Division, Pazarić-Igman-Treskavica (BB1 pp.312, 404 n.200).
- **Round 2, 2-1:** a tactical commander pulled into a corps vacancy holds it as ACTING (0.92) and gives way to a corps-rank officer of the corps or to the schedule, never to another tactical commander. He returns to reserve, not retirement. The rule touches only cases with a tactical commander, so the existing generic and relief acting paths are unchanged.
  - Without it the retype breached two guards. Pulled-up OG commanders kept corps seats for good (Cikotić held the 3rd Corps t105-188, so Mahmuljin never took it), and Brčko fell to the 2nd Corps at t174-178.
  - The TG probe showed the TG modifier was not involved, so the branch stays (round 1 Q4).
- **Round 2, 2-1:** unit officers killed in 1992 (Bešić, Šehović, S. Hadžić) are excluded by data until a death date is sourced. Bešić had been seated as 5th Corps commander at t181.
- The startup snapshot is re-baked.

**Measured** (188w, against PR 2a v3 on main 08f486ae9, 709/708/707/676):
- **708/704/703/678** in historical and hands-off emergent (identical outcomes). Guards intact. Hashes: historical 32bb0552c6b58fbf, emergent da5f6acb994edd48.
- The first divergence is at t13, at Goražde. Imamović leads Operation Circle ("Krug", t19) as its TG commander; he planned Krug in 1992 according to non-BB sources the historian cites (Goražde canton history, Sarajevo Times); BB and ICTY are silent on this. Two Čajnice villages stay RBiH.
- Lost: Prozor lug_2 and paros, Kupres novo_selo_2, Jajce jajce_3 and lupnica.
- Gained: the 1995 western chain lands before t188 (Donji Vakuf ×4, Ključ hadžići, Mrkonjić gerzovo_2, Drvar prekaja_2), plus Mostar vranjevici_2 and Konjic bijela_2.
- TG probe: 21 TG operations, 19 led by a tactical commander. Nanić ×4, Cikotić ×5, Imamović ×3, and Lisica, Despotović, Obradović, Hujdur, I. Nakić, Čuskić, Sopta.
- The tactical-commander reserve stays stocked to t188.
- Mahmuljin takes the 3rd Corps at t110; Cikotić is acting t103-109.

**Tests.**
- `tests/officer_system.test.ts`:
  - release at an operation end, including commanderless ops;
  - the own-corps TG selector;
  - the vacancy rank key;
  - a pulled-up tactical commander is acting, keeps the seat against another tactical commander, hands over to a corps-rank officer and returns to reserve.
- `tests/operation_commander_corps_pool.test.ts`: a tactical commander never commands a corps operation.
- `tests/commander/probe_officer_preparation_sequence.test.ts`: the fixture stays corps-rank (the test is about preparation length).
