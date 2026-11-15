## 2026-11-15 — RF-ROSTER: army-chief stubbornness comes from the roster (PR #677, measured)

RF fidelity-pass wiring fix (Fable consult 1, finding 2, appendix B). Calibration is held: scores are recorded and are not a merge bar.

**Defect.** `data/scenarios/army_co_roster.json` sets army-chief stubbornness: Mladić 5, Halilović 4, Delić 2, Petković 2, Praljak 3, Roso 2, Petković-2 2, Blaškić-2 3. None of it ever applied:
- save migration 10 writes 3 on every officer on load;
- `applyRosterToOfficers` filled only empty values.
Measured on main, every chief carried 3 at t0, t52 and t188.

**Change.**
- `applyRosterToOfficers` owns `stubbornness` for the officers the roster lists. The value is the roster value, plus the one-shot overstay escalation whenever `kept_past_schedule_since_turn` is set, capped. It is written at officer init (`applyRosterStubbornness`, so the startup save adds no persisted key) and at the start and the end of the A4 step each war turn. Migration 10 defaults only undefined values, so a saved value reloads unchanged, including on a chief's first overstay turn. An older save keeps 3 until its first war turn after load, then the step corrects it; that is a recorded limitation for pre-1.0 betas. There is no migration or schema bump, and no load-time rewrite, so legacy load bytes are unchanged.
- The startup snapshot is re-baked.
- `officer_types` comment, SAVE_SCHEMA_EVOLUTION record, and an addendum to the A4 DDR. The addendum records provenance (the values are design-authored and none contradicts the record) and corrects the DDR's reasons.

**Measured** (188w, branch vs main 4d876050e):
- final_state_hash `518de17970af5914` vs `19262a0b19df1567`.
- Weekly reports, operation AARs, control, battles and health are byte-identical; per-cell delta zero, 709/709/708/681. Guards intact. Baselines re-blessed; structural fingerprint unchanged.
- Only state values differ: officer stubbornness, decision traces, pushback events (555 → 538) and corps-directive slots.

**Why nothing moves headless** (registered for after the freeze):
- (a) The autonomous-launch gate (stubbornness ≥ 4) never finds an eligible catalog opportunity. The one RS entry opens only after a refused Dayton; the earliest RBiH entry opens at t113, after Halilović leaves at t60.
- (b) The corps-role overlay changes all war: every RS corps 'primary' instead of 'secondary', RBiH economy → primary at t5-61, HRHB at t81-100. It moves no decision. 'primary' and 'secondary' differ by about 0.02 in the operation score; 'economy' never binds, because every bot corps has authored offensive targets (Wave 6 rule); and at t188 the stance gate decides first.
- On both main and the branch, the political-directive producer saturates by t4-t6: its exhaustion threshold is 500, after which it issues HONOR_TRUCE or PREPARE_RESERVE all war. Registered.

**Player path (not visible headless).**
- Clash table for L7. A clash is anything short of full compliance:
  - Mladić and Halilović clash on every act (0.60 request / 0.40 hold);
  - Delić, Petković and Petković-2 on every act (0.70);
  - Praljak on every act;
  - Roso never (0.80).
- An RS player's stance overrule waits 2 turns under Mladić instead of 0.
- Mladić and Halilović get the blunt-refusal objection text.

**Gate.** Historian, scenario-creator-runner-tester, determinism and canon compliance seats, plus a named integrator. Evidence `C:/Pyrrhic/AWWV-worktrees/_logs/cl-rf-roster-20261115/`.
