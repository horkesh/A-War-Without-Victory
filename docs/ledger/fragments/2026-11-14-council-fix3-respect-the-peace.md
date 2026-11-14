## 2026-11-14 — Council fix 3: respect the October 1995 ceasefire, retime the US halt, present-tense cards (B10, H4, H6)

Source: Player Experience Council diary, fix 3 (`docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md`). Report: `docs/40_reports/implemented/20261114_COUNCIL_FIX3_RESPECT_THE_PEACE.md`. Calibration is held: scores are recorded per change, not a merge bar.

- **Change A (H4, data).** `us_halts_federation_advance_1995` moves from t182-188 to t179-181 (mid/late September 1995). It is suppressed once the October ceasefire is accepted or `ceasefire_1995` has fired. 188w `d140b5ff61671e7b`: 712/709/710/705, 0 cell deltas. Battles 507 → 509: the halt no longer fires on the headless run, since RS holds more than 51% by area in the window.
- **Change B (B10, engine).** `accept_ceasefire` records `ceasefire_oct1995_in_force`. From the turn after the demand card fired, the general ceasefire binds every party (COHA precedent). Owner: `src/sim/combat/oct1995_ceasefire.ts`; new war step `enforce-oct1995-ceasefire` after `evaluate-events`.
  - **Operation channel closed.** All admission paths, the launch gate (no force-launch bypass), opportunity proposals and Level-1 offers.
  - **Running offensives.** Planning offensives are called off. Executing ones conclude only the objective each axis was fighting for, then stand down (`ceasefire_stand_down`, recovery `ceasefire`, no failure accounting).
  - **Stances and combat.** Corps and army stances hold Defensive. Attack orders, counter-attacks included, are suppressed with receipts, as under the COHA.
  - **Ending.** A declined Dayton lifts the ceasefire.
  - **Measured.** 188w `2c9c5d5c6c7ad860`: 712/709/710/677. t1-t183 byte-identical. Battles t183-t188 52 → 14, none after t186. Enclave and Farz guards intact. Strict health PASS. Consistency 1 (pre-existing SD15 gap).
  - **Why 677.** All 28 lost cells fell in the simulation after 16 Oct; history has them 12 Sep-11 Oct (BB Vol. I pp.418-428). The simulated late-1995 offensives run 2-6 weeks late (calibration, held).
  - **Rejected alternative.** A hard cancel of executing offensives (`70aa5bb91e23cef9`, 670) breached the Farz guard.
- **Change C (H6, data text).** Seven cards rewritten in the present of their date: VOPP pressure, Vance-Owen, Owen-Stoltenberg Assembly, Contact Group, late-war offensive, US halt, Holbrooke demand. Persisted notification bodies are corrected via `localizations.en`. 188w hash unchanged (`2c9c5d5c6c7ad860`).
- **Canon (same change).** Engine Invariants "October 1995 ceasefire ownership"; Systems Manual §6.4 implementation-note; Rulebook §15.7; PLAYER_TURN_GUIDE step row. Tool: `validate_run_consistency.cjs` treats zero offensive signs as expected while the ceasefire holds.
- **Not done (registered).**
  - The stand-down has no turn limit (HVO takes Drvar at t186).
  - `ceasefire_1995` fires at t181, before the demand.
  - `source_note` dossier text still narrates outcomes (council fix 4).
  - RS fights no battles from t176 to t188, as on main.
