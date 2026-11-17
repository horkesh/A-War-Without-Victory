## 2026-11-17 — §6 E3a1: one accumulator rule and one standing-base writer; authorizing paramilitary sweeps no longer raises international standing

**Why.** While the §6 E3 panel was ruling, it found a live reward for atrocity in the shipping default. `updateParamilitaryInternationalStanding` (compute_capital.ts) REPLACED the war-crimes term of the international_standing base (`war_crimes_events × 10`) with the much smaller paramilitary-finding penalty (2/4/5 per deployment, +10 cliff) as soon as a finding existed.
- Baseline 188w: RBiH has a mid finding (5 deployments, t20). Its standing base read 34.37 = 50 − 20 − 0.63 + 20 − 15, instead of 0. **Authorizing sweeps raised the base.**
- The effect was hidden at w188 only because RBiH sat at the ceiling.
- Two more defects in the same writers:
  - D1: the patron-event and peace-plan rejection writers clamped `event_modifier` to ±100, so RS at −110 hit by a −30 cost was pulled UP to −100, and RBiH at +176 lost 76 at once on a rejection;
  - D2: two functions wrote the standing base every turn (the later one won, while mid-turn readers saw the other's value);
  - D3: `peace_plans_accepted/rejected` were pushed and also rebuilt from history.

**Ruling.** §6 E3, unanimous 6/6 (historian, canon-compliance, game designer, engine/systems, scenario-tester, red-team), three rounds; E3a1 is the first of its measured PRs. Record: SHDG §6 "Record (§6 E3 …)" (with E3c).

**Change.**
- D1: every `event_modifier` writer goes through `applyDimensionShift`. The accumulator is unclamped; only `effective_value` is clamped to 0-100. Reader audit: no simulation reader takes the raw accumulator (some UI readers display it).
- D2: `computeDimensionBaseValues` is the single writer of every `base_value`. The finding penalty ADDS: `base = clamp(50 − war_crimes×10 − findingPenalty − civCas/5000 + accepted×10 − rejected×15, 0, 100)`. Plan counts are read from `peace_plan_history`.
- D3: the redundant pushes are deleted; `peace_plan_history` is the single source.
- Systems Manual §7.10.3 is updated.
- Tests: `tests/s6_e3a1_standing_writers.test.ts`:
  - a finding never raises the base;
  - RS −110 −30 = −140;
  - an RBiH rejection at +176 lands at 166;
  - one base writer (static scan);
  - the lists are history-derived.
  - Three existing tests are updated to the new truth.

**Measured (188w, on main `b42c6c5a9` with #754; main pin d983d7bc665fdeb6 / 9454c52e328dd647, reproduced).**
- Historical `2c63bd10fecd6bc7` and emergent `bfcbfa55dd206585`: both 709/709/708/682, guard intact (#780 guard version), fired events identical to fresh main (181).
- RBiH standing base 34.4 → 0; the accumulator is unclamped (RBiH +166, RS −295).
- Effective standing unchanged for every side.
- Baselines manifest re-pinned in this PR.
- (Earlier, on main `7acbb1ad6`: `474b0e5640ee1365` / `5f49121bf438cd32`, the same results.)

**Known timing shift.** The single base writer runs at `compute-dimension-bases`, earlier in the turn than main's winning writer. A same-turn headless plan resolution and that turn's civCas term therefore reach the base one turn later.
