## 2026-11-14 — Council fix 3: respect the October 1995 ceasefire, retime the US halt, present-tense cards (B10, H4, H6)

Source: Player Experience Council diary, fix 3 (`docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md`). Report: `docs/40_reports/implemented/20261114_COUNCIL_FIX3_RESPECT_THE_PEACE.md`. Calibration is held: scores are recorded per change, not a merge bar.

- **Change A (H4, data).** `us_halts_federation_advance_1995` moves from t182-188 to t179-181 (mid/late September 1995). It is suppressed once the October ceasefire is accepted or `ceasefire_1995` has fired. 188w `d140b5ff61671e7b`: 712/709/710/705, 0 cell deltas. Battles 507 → 509: the halt no longer fires on the headless run, since RS holds more than 51% by area in the window.
- **Change B (B10, engine).** `accept_ceasefire` records `ceasefire_oct1995_in_force`. From the turn after the demand card fired, the general ceasefire binds every party (COHA precedent). Owner: `src/sim/combat/oct1995_ceasefire.ts`; new war step `enforce-oct1995-ceasefire` after `evaluate-events`.
  - **Operation channel closed.** All admission paths, the launch gate (no force-launch bypass), opportunity proposals and Level-1 offers.
  - **Running offensives.** Planning offensives are called off. Executing ones take only the current objective of each engaged axis (even one not yet attacked), then stand down (`ceasefire_stand_down`, recovery `ceasefire`, no failure accounting).
  - **Stances and combat.** Corps stances hold Defensive; the army standing order cannot be General Offensive (falls back to Balanced). Attack orders, counter-attacks included, are suppressed with receipts, as under the COHA.
  - **Ending.** A declined Dayton lifts the ceasefire.
  - **Measured (final, rebased on main `f06d5aa`, main `7d4cf2cf698e3c41` 712/705/706/698).**
    - A alone `9d5bb78ff4d58a26`: 712/705/706/698, 0 cell deltas.
    - Head `ba67ebb347949f75`, two identical runs: 712/705/706/677. t1-t183 identical to main. Battles 518 → 491; t183-t188 39 → 12, none after t185.
    - Enclave and Farz guards intact. Strict health PASS. Consistency 1 (pre-existing SD15 gap).
    - Pre-rebase on main `4ff4a766`: `2c9c5d5c6c7ad860`, 712/709/710/677.
  - **Why 677.** All 21 lost cells (Sanski Most, Jajce, Ključ, Mrkonjić Grad, Donji Vakuf, Drvar, Petrovac, Bihać) changed hands on main after 16 Oct. Those towns fell historically between 13 Sep and 10 Oct 1995 (BB Vol. I pp.418-428). The simulated late-1995 offensives run late (calibration, held).
  - **Rejected alternative.** A hard cancel of executing offensives (`70aa5bb91e23cef9` pre-rebase, 670) breached the Farz guard.
- **Change C (H6, data text).** Seven cards rewritten in the present of their date: VOPP pressure, Vance-Owen, Owen-Stoltenberg Assembly, Contact Group, late-war offensive, US halt, Holbrooke demand. Persisted notification bodies are corrected via `localizations.en`. The 188w hash equals Change B's; text only for the simulation.
- **Canon (same change).** Engine Invariants "October 1995 ceasefire ownership"; Systems Manual §6.4 implementation-note; Rulebook §15.7; PLAYER_TURN_GUIDE step row. Tool: `validate_run_consistency.cjs` treats zero offensive signs as expected while the ceasefire holds.
- **Not done (registered).**
  - The stand-down has no turn limit (Farz opens a fresh assault at t185).
  - `ceasefire_1995` fires at t181, before the demand.
  - `source_note` dossier text still narrates outcomes (council fix 4).
  - RS fights no battles from t176 to t188, as on main.
