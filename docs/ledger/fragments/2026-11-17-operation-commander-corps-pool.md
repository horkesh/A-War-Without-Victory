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
- Data (historian seat, `_logs/officers-20261117/historian_officer_table.md` §2):
  - Alagić: home 7th Corps, compatible 3rd. He was 7th Corps commander 1994-95 (BB1 p.491; BB2 pp.465-510).
  - Čuskić: home 7th Corps, compatible 3rd. He commanded OG Bosanska Krajina, which passed to the 7th Corps (BB2 p.510).
  - Cikotić: compatible 7th Corps. His OG West passed to the 7th Corps (BB2 pp.429, 510).
- The startup snapshot is re-baked.

**Measured** (188w, main runs at the same commit 08f486ae9; main 709/709/708/682, historical 2c63bd10fecd6bc7, emergent bfcbfa55dd206585):
- Restricting operation command alone (first version) gave 709/709/705/671 in both modes.
  - Cause, traced turn by turn with a runner observer: the 4th Corps had no eligible officer, so its operations ran commanderless (10 of 12).
  - Because the vacancy fallback was still faction-wide, Hadžihasanović (t66-80) and then Alagić (t80-99) were seated in the 4th Corps. The corps commander's personality drives the commander loop, so the 4th Corps made 12 attacks against 5 on main and over-captured RS cells in Mostar, Nevesinje and Kalinovik.
- With both selectors restricted (this change): **709/708/707/676** in historical and hands-off emergent. Guards intact. Hashes: historical b8926901b6359d76, emergent c71c1a8cdb2e7317.
  - The 4th Corps runs on an acting commander from t65 (Hujdur's death). Pašalić, the corps' only other officer, is commanding a probe when the seat opens and stays on its operations. PR 2c's schedule names him for t24-80.
  - The 7th Corps keeps Alagić to t167.
  - Cells, apr1994 to oct1995:
    - konjic:bijela_2 falls at t101 instead of t130 (the reference is RS in April 1994).
    - mostar:vranjevici_2 is taken (the reference is RS).
    - The 1995 western chain runs 1-2 turns later, so Donji Vakuf ×3, Jajce barevo_2, Drvar ×2 and Ključ hadžići fall after t188, and Jajce grdovo and Travnik gornje_krcevine are gained. This is the known tail knife-edge.

**Tests.**
- `tests/operation_commander_corps_pool.test.ts`.
- `tests/officer_system.test.ts`: the vacancy fallback seats an acting commander, never another corps' officer. The incompatible-assignment penalty is covered through a scheduled holder.
- `tests/probe_officer_preparation_sequence.test.ts`: fixture adjusted.
