## 2026-11-16 — t76 Belgrade event: Pale's historical posture in autumn 1993 is staying in step with Belgrade, not defiance

A factual truth fix found by the second Batch B lane's historian and assigned to this lane. It is not tuning, so it proceeds under the calibration HOLD with the scores recorded.

**Defect.** `rs_belgrade_pressure_response_1993` (war_1993.json, weeks 76-79, the Invincible window of September-October 1993) made `defy_belgrade_directive` the historical default. Its text claimed that Pale "repeatedly defied" Belgrade, that Belgrade pressed it to "ease the Drina tempo" and show "flexibility on Sarajevo division", and that a Patriarch Pavle / Russian channel existed. The event's own source note cited Karadžić paras 3286-3287 as showing Belgrade *supporting* Pale in 1993.

**Historian ruling (default = `accept_belgrade_directive`).**
- 28 Aug 1993: the Bosnian Serb Assembly accepted the Geneva accord without conditions (BB Vol. I p. 11).
- 20 Sep: the Invincible package, with Milošević at the table: 49%, Sarajevo undivided under the UN for two years (BB I pp. 12-13; Karadžić paras 377-383, 381).
- Belgrade backed Pale (paras 3286-3287).
- Igman and Bjelašnica were vacated under UN/NATO pressure (BB I pp. 185-186).
- After Sarajevo's conditional vote on 29 Sep, Pale withdrew its concessions on 2 Oct (BB I p. 13).
- Open defiance belongs to May 1993 and July-August 1994.
- The sibling event `rs_owen_stoltenberg_response_1993` already has acceptance as the RS default.

**Change.**
- `historical_default_response_id` → `accept_belgrade_directive`, now option 0 (the event acceptance contract requires this). Markers swapped.
- Option costs (historian): accept +10 patron / +5 standing / −2 cohesion / +5 leverage; partial −5/−5/+3/+3; broker −5 standing / +2 cohesion / +8 leverage; defy −15/−10/+5/−10, morale +2. The 6-turn recruitment ×0.9 is dropped: Pale's cohesion did not break.
- Narrative, staff assessment, trigger evidence, the four option labels and descriptions, the other-faction notifications, effect text and source note were rewritten by the narrative seat on the historian's facts. The text no longer mentions Pavle, Russian envoys or Sarajevo fire (§6 note).
- Essay (file and `essay_index.json`): new EN and native BCS text. Sources are now Karadžić plus BB (Krajišnik cannot carry 1993 claims). The accept variant is the historical "note"; the other three are divergences.

**Measured (main fde8acc98, B3 in).**
- Historical 188w: final_save `8c9fbf1d30e8a976`. Scores 709/709/708/**682** (Oct 1995 +1 against 681).
  - Guard intact: enclaves hold and fall on schedule, Farz/Uragan 4/4 with receipts, late 2nd Corps captures warranted, HRHB cascade 31. Health PASS, 0 consistency failures.
  - Final-cell delta against main: 5 cells. Three in Donji Vakuf go RS→RBiH (babin_potok_2, korenici, oborci_2); jajce:grdovo and travnik:gornje_krcevine go RBiH→RS.
  - RS ends with patron confidence 69.5 (46.5 before), negotiating leverage 52.9 (34.4) and internal cohesion 9 (16).
- Emergent 188w: the scorer already picked accept. Final map unchanged, 710/707/707/670, with the same three package-P2 breaches.
- Option order does not affect either hash (re-run after the reorder gave identical hashes).
- Tests: the event-system suite (16 files, 388 tests) and essay tests (130) pass; tsc 0.
- Baselines manifest re-blessed to the new historical state.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/` (t76_*).
