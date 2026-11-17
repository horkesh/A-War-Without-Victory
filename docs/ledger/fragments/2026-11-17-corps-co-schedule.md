## 2026-11-17 — Commander attribution PR 2c: the dated corps-commander schedule is populated from ICTY and BB; the 2nd Krajina Corps order is corrected (measured)

Pre-freeze fix (owner rule: no engine changes after 1.0). PR 2c of the commander-attribution work. It is data only: the §5E schedule mechanism already existed and shipped empty. Calibration is held: scores are recorded, guards stop merges.

**Change.**
- `data/scenarios/corps_co_roster.json` now names, for each sourced corps, who held it and when. There are 14 corps, from the historian seat's table (`_logs/officers-20261117/historian_corps_co_schedule.md`).
- Every ICTY date was read in the trial judgment (`_logs/officers-20261117/icty_date_verification.md`):
  - Galić TJ paras 604 and 607: SRK 10 Sep 1992 – 10 Aug 1994, turns 23-123. It was a change of command to his chief of staff, so his fate is `survived`, not `relieved`.
  - D. Milošević TJ para 2: from 10 Aug 1994, turn 123.
  - Krstić TJ paras 98-99 and 331: the Drina Corps was formed in November 1992 (the day isn't given, so the first November turn, 30); Krstić took command 13 Jul 1995, turn 171.
  - Hadžihasanović & Kubura TJ paras 2, 330, 340: Hadžihasanović held the 3rd Corps to 1 Nov 1993 and Alagić took it that day, turn 82.
  - Blaškić TJ para 745: Central Bosnia OZ from 27 Jun 1992, turn 12.
  - Halilović TJ para 118: the 1st Corps handover was around mid-July 1993; the shipped turn 68 sits inside that window.
  - Prlić TJ Vol.2 para 13: Šiljeg held the North-West OZ from October 1992 to 20 Dec 1993, turns 26-89.
- A boundary with no day-level source keeps the shipped availability turn: Knez, Šadić, S. Delić, Pašalić and Dreković's ends, and Mahmuljin's and Blaškić's.
- Left out (no sourced holder; the pool fallback fills them):
  - the 4th Corps after Pašalić;
  - the 3rd Corps from t91 to t110;
  - HVO South-East Herzegovina (Lašić's end is unknown);
  - Posavina (Matuzović);
  - Kadir Jusić (Wikipedia only).
- **Gaps searched again** (historian, `side-session-notes/.../rf_roster_2c_historian_gaps.md`). Neither BB nor the ICTY record dates any of these, so they stay acting or fallback and are listed here:
  - 4th Corps after Pašalić: Sulejman Budaković from 6 Nov 1993, Ramiz Dreković from early 1994, Mustafa Polutak from Aug 1995. Sources are a local-history portal and Wikipedia only, and Budaković and Polutak are not in the officer pool.
  - The 3rd Corps in 1994: Jusić (Wikipedia only).
  - Lašić's end at South-East Herzegovina (in command 9 May 1993 per a Prlić transcript; no successor sourced).
- **2nd Krajina Corps order corrected.** Borić held it from 1992 until his corps' retreat after Grmeč-94 cost him the command (BB1 p.149; BB2 pp.511, 536). Tomanić followed, from t135 (BB1 p.487). The 2026-03-15 roster had them reversed. Borić becomes the opening commander and takes the opening mini-bio.
- Officer availability, so the schedule validates: Hadžihasanović, Šipčić, Galić, D. Milošević, Živanović, Krstić, Borić, Tomanić, Tole, Šiljeg, Škender.
- **Lifecycle corrections** (historian ruling, `side-session-notes/.../rf_roster_2c_historian_imamovic_nanic.md`):
  - Nanić was killed on 5 Aug 1995 at Ćorkovača, turn 174 (BB1 p.372; p.416 n.591; p.417 n.607). The 2026-03-15 report said October.
  - Imamović died in the October 1995 Treskavica fighting (BB1 p.315, p.406 n.244). The day, 9 Oct (turn 183), comes from non-BB sources.
  - The removal of his Goražde lock waits for PR 2b, where he becomes a tactical commander.
- The startup snapshot is re-baked.

**Measured** (188w historical, against main 08f486ae9 + #796 + #776 at 709/708/707/676 with guards intact). **Not mergeable yet:**
- 2c scores 710/708/704/676, and the **Farz guard is breached**.
- From t150 the ARBiH 3rd, 1st and 2nd Corps open the Ozren-Doboj front with generic offensives and take Farz 95's objectives first: Vozuća t172, north Ozren t173, Gornja Bočinja t175, and petrovo_2.
- Without the schedule, the VRS corps commanders churn ahistorically (Talić→Lisica→Kelečević, Simić→Gavrić, Grubač→Gušić→Lalović). The schedule keeps the real holders all war.
- This is the early-Ozren-fall fragility already routed to P3. Analysis: `side-session-notes/.../rf_roster_2c_farz_breach.md`.
- Measured alone on main it also breached, through a cross-corps operation commander (Malkić) that PR 2a removes.
- 4th Corps acting-commander turns: 73 (t80 onward).

**Tests.**
- `tests/corps_co_succession.test.ts` pins the shipped schedule: the ICTY spans and the 2nd Krajina order.
- `tests/officer_mini_bio_schema.test.ts`: Borić is the 2nd Krajina opening commander.
