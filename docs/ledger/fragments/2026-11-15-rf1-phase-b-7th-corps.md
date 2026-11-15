## 2026-11-15 — RF-1 Phase B: the ARBiH 7th Corps forms at week 99 (PR #591, measured)

RF fidelity-pass change, owner-decided before 1.0 (roadmap BC14). Calibration is held, so the scores are recorded and are not a merge bar. Phase A (#590) shipped the reorganisation events, the 3xx names and cleanup, all inert.

**History.** Mehmed Alagić commanded the 3rd Corps from 1 November 1993 and the 7th Corps from 26 February 1994, per the ICTY indictment in IT-01-47 (Case Information Sheet p.4). The 7th Corps took the 3rd Corps' western operational groups at Travnik with 12 brigades (BB1 pp.380, 418; BB2 pp.468, 493). The dates are indictment allegations, not findings: Alagić died before trial.

**Change.**
- `arbih_7th_corps` is created on week 99 by the war step `activate-corps`, never at campaign birth (`strict_available_from`, one OOB row). FORAWWV §XIII.1 is amended in the same change for this row-level opt-in. The gate seats signed it unanimously.
- A `corps_transfer` event moves 12 brigades from the 3rd Corps that week: 17, 705, 706, 707, 708, 712, 717, 725, 727, 733, 737, 770.
  - Transition cost: cohesion -4, `disrupted_turns` 2.
  - A brigade on a live operation finishes it first, then follows within `max_defer_turns` (4).
  - In the measured run the 706th was destroyed at t31, so 11 move.
- The 7th Corps hosts:
  - Vlašić Ridge, with an 8-brigade ridge axis. The 7th Muslim, 303rd and 314th stay in the 3rd Corps on a Zenica support axis.
  - The Paklarevo model, Donji Vakuf 95, Jajce 95 / Jajce Recovery and the COHA Vlašić exception.
  - The army priority is split at week 99. There is a General Staff card (EN + BCS).
- A `commander_handover` seats Alagić in the 7th Corps once. It never displaces a commander the President appointed, accepted or kept, and never pulls Alagić from a command the President gave him, also after he delegates. In Full Control it is put to the President as a replacement matter. Shared helpers: `isPresidentialAppointee`, `queueReplacementMatter`.
- Alagić's officer row: home 3rd Corps, compatible 7th, no expiry. He takes the 3rd Corps at w80 as on main and moves to the 7th at week 99.
- Provenance row `corps:arbih_7th_corps`. Systems Manual §6.4 and §7.5, Rulebook §5.9, SAVE_SCHEMA_EVOLUTION and the OOB knowledge docs are updated.

**Measured** (188w, branch `67f422fd6` vs main `c62d39975`):
- final_state_hash `19262a0b19df1567` vs `e44c77f5b41052f8`. Weekly reports are identical to main through t98.
- Checkpoints 709/709/708/681 vs 709/709/708/682.
- One cell lost, Oborci (Oct95). The Donji Vakuf captures land one week later (t183-184 vs t182-184), and the October ceasefire binds before Oborci. It is a tail-timing loss, not a lost axis, and is owned by the Donji Vakuf timing item. Never recover it by restoring the 3rd Corps paralysis (7C5).
- Guards: enclave 9/9, Farz P-A and P-B pass, cascade 31 on both. Strict health PASS. Stranded 2 vs 4.
- Consistency 1 vs 0: the one-cell Prusac sector at run end. The engine had already ordered the 770th there (in transit), but the validator ignores an in-flight relief march (SE7E-h, registered).
- Baselines re-blessed at the head. The structural fingerprint is unchanged (40w).

**Standing question.** Phase B buys no new cell.
- At the post-split checkpoints (the Jan93 match is pre-split), the Ozren/Teslić RS cells, Bočinja, Vozuća and Brijesnica Donja (through Apr95) and the Farz P-B pass depend on the remaining 3rd Corps stalling after the split (RF-3C-EXH, registered, paired with VRS2). On main the same cells rest on 7C5, so the footing is equal, not a regression.
- Jemanlići's Oct95 match rests on the t29 "Čelik" capture, as on main.
- Paklarevo fell at t162 to Vlašić Ridge. The 7th Corps' model operation took shared credit; it did not win it.

**Known limits (recorded, not fixed).**
- Alagić still dies on the tenure clock (about t168), although he commanded the 7th Corps to the end of the war (BB1 n.686). The empty corps schedule (L4) protects survivors only once L8 dates it. The pool then seats Mesić from the 4th Corps.
- An old save loaded past the week-99 window applies the reorganisation on its first loaded turn, with no transition cost and immediate operation withdrawal. A save made before #591 also keeps Alagić's old officer data (home 3rd Corps, `available_until_turn` 120), because officer data is carried in the save, so he retires at week 120 there.
- The roster's w80 3rd Corps handover is two weeks before the historical 1 November 1993 (week 82). Kept, so the run stays comparable with main.

**Gate.** Historian, determinism, canon compliance and scenario-creator-runner-tester seats, plus a named integrator: GO WITH CONDITIONS (process items only). FORAWWV §XIII.1 amendment: unanimous 4/4. Evidence `C:/Pyrrhic/AWWV-worktrees/_logs/cl-rf1-phase-b-20261115/`.
