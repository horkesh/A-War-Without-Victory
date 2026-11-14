# Council fix 3: respect the peace (B10, H4, H6)

Date: 2026-11-14. Source: Player Experience Council diary `docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md`, fix 3, items B10, H4 and H6. Branch `claude/wizardly-wozniak-938fbf`.

Calibration is on hold (owner, 2026-11-14): checkpoint scores are recorded per change, not a merge bar. Guards, determinism, strict health and the no-lever rule still apply.

## 1. What the council saw

- **B10.** After the player accepted Holbrooke's ceasefire (t183), the staff kept offering offensives, authored operations showed as launched, and on 13 Nov a corps reported engagements won with the 1st Corps on OFFENSIVE. On main, `accept_ceasefire` had `effects: []`. The headless 188-week run fights 50 battles at t183-t188, and RS falls from 348 to 313 OSIDs after acceptance.
- **H4.** "Washington halts the Federation advance" fired on 13 Nov 1995 (t188). The US pressure came in mid-September 1995 (BB Vol. I p.462 endnotes 821/823).
- **H6.** Several decision cards stated outcomes the player could not yet know.

## 2. Changes (one per measured run)

| Change | What | 188w `final_state_hash` | Jan93 / Apr94 / Apr95 / Oct95 |
|---|---|---|---|
| Main (n0) | reproduced; matches the pinned manifest `final_save` SHA-256 `4ff4a766…` | `4ff4a7665c0a35b5` | 712 / 709 / 710 / 705 |
| A (n1) | US halt t182-188 → t179-181; suppressed once the October ceasefire is accepted or `ceasefire_1995` has fired | `d140b5ff61671e7b` | 712 / 709 / 710 / 705 |
| B-hard (n2), **rejected** | ceasefire calls off every offensive at once | `70aa5bb91e23cef9` | 712 / 709 / 710 / 670, **Farz guard breached** |
| B (n3), adopted | ceasefire with stand-down of executing offensives | `2c9c5d5c6c7ad860` | 712 / 709 / 710 / 677 |
| C (n4) | H6 card text in the present of its date | `2c9c5d5c6c7ad860` (= B) | 712 / 709 / 710 / 677 |

### Change A (H4)

`us_halts_federation_advance_1995` opens at t179 (11-17 Sep 1995) and closes at t181. Its condition is now: RS area share at most 0.51 (unchanged), plus `flag_not_set ceasefire_oct1995_in_force`, plus `ceasefire_1995` not yet fired. On the headless run RS holds more than 51% by area through t179-181, so the halt no longer fires and its 6-turn RBiH launch suppression from t187 is gone. Battles 507 → 509 (+2 RBiH at t187-188). Zero cell deltas. The event block moved ahead of `ceasefire_1995` in `war_1995.json` (turn order); the evaluator sorts by priority, turn and id, so file order does not affect the simulation.

### Change B (B10)

`accept_ceasefire` sets `ceasefire_oct1995_in_force`. Owner: `src/sim/combat/oct1995_ceasefire.ts`.

- **When.** From the turn after the demand card fired. The president answers after the turn resolves and a bot answers inside the event step, so both bind from the same turn, mirroring "agreed 5 Oct, in force 12 Oct 1995" (BB Vol. I p.392). On the headless run that is t184.
- **Who.** All three parties. This follows the canon COHA precedent (Engine Invariants "COHA ceasefire ownership"): a general agreement binds everyone. A one-sided freeze would leave a defensive, op-less side exposed.
- **Operation channel closed.** Every admission path is gated:
  - commander loop admission, including the no-plan probe and local-occupation fallback that ignores stance; commander plans not yet executing are abandoned;
  - pre-planned injection and prestaging; the queue is held, not consumed;
  - authored reinforcements;
  - triggered and Army HQ operations;
  - catalog opportunities: none enqueued, bot-approved, put to the president, or admitted at preflight;
  - corridor breach; linked preparation probes;
  - authored-op and REQUEST-OP levers (rejected with `ceasefire_in_force`);
  - the launch gate (no force-launch bypass).
- **Running offensives.**
  - Planning: enter recovery at once (reason `ceasefire`).
  - Executing on the first ceasefire turn: each axis that had already engaged (attacked or captured) may take only its current objective, even one it had not yet attacked (`ceasefire_stand_down` caps; −1 for an axis that never engaged). The operation then stands down through the ordinary lifecycle.
  - A stand-down books no failed objective, no experience grade and no completion exhaustion. If the ordinary lifecycle ends the operation first (all objectives taken, or failure/stall caps), its ordinary recovery reason and bookings apply.
  - In the head run, Farz's t185 assault on Brijesnica Donja and the HVO's t186 capture of Drvar are fresh assaults under this rule; neither cell was attacked at t183-t184. The narrower rule ("the cell already under assault") breaches the Farz guard while the simulated Farz runs late, so the guard is shaping this rule. Recorded in REAL_WAR_MASTER (War-or-Game seat).
- **Stances.** Corps stance and the combat-effective stance are held at Defensive. The army standing order cannot be General Offensive; it falls back to Balanced. The cap is also applied to the AI recommendation, so level-1 stance proposals never offer OFFENSIVE. A new stance-matter reason "ceasefire" (EN/BCS) replaces the Zagreb patron copy.
- **Combat.** As under the COHA, every attack order of a bound faction, counter-attacks included, is cleared at generation and suppressed with `oct1995_ceasefire` receipts at resolution. The only exception is a stand-down order on its capped objective. Without this, the Defensive clamp would switch on the broadened sector counter-attack for every corps. Movement, redeployment and emergency strategic defence continue; frontline attrition is not suspended.
- **Ending.** Refusing (`continue_offensive`) never sets the flag. A declined Dayton clears it (`reopenWarAfterDaytonDecline`), and queued operations resume.
- **Tool.** `tools/validate_run_consistency.cjs` no longer flags "0 offensive signs" as intel blindness while the ceasefire holds. Consistency is 1 (the pre-existing ARBiH 1st Corps sector-4 gap, same as main).

### Change C (H6)

Present-tense rewrites, drafted by a historian seat (ICTY first, then BB; citations kept in the session record):

| Card | Window | Was future-telling |
|---|---|---|
| `ic_pressure_vopp_engagement` | t38-46 | cited UN S/25479 and UNSCR 820 (Apr 1993); now UNSCR 787 (Nov 1992) |
| `vance_owen_plan_1993` | t39 | Sarajevo's March signature, Pale's May rejection ("dooming") |
| `os_rbih_tactical_acceptance_1993` | t72-76 | HMS Invincible (20 Sep), the 29 Sep Assembly, post-window UN documents |
| `contact_group_plan_1994` | t117 | both acceptances, the RS rejection (18-20 Jul), the Belgrade split |
| `rbih_late_war_offensive_1995` | t175-178 | Deliberate Force (30 Aug), Mistral 2/Jajce (8-13 Sep), Geneva/New York, "~20% by the October ceasefire", Dayton, "Inter-Entity Boundary". It also said "the eastern enclaves are lost" (Goražde held) and made a people the object ("shattered the Krajina Serbs") |
| `us_halts_federation_advance_1995` | t179-181 | Sarajevo bowing, Zagreb's October operation, the 12 Oct freeze, "a third of its territory" |
| `holbrooke_ceasefire_demand_oct95` | t183-185 | "Dayton" before the venue was announced (18 Oct); labels now say "the peace talks" |

Persisted notification bodies that narrated the future are corrected through `localizations.en`, the established display override that leaves the save hash unmoved. Persisted titles were not changed.

The independent §4 copy review (SENSITIVE_HISTORY_DESIGN_GATE §4/§5) returned GO with conditions, all applied:
- The late-war card no longer states the fall of the eastern enclaves. It does not gate on `srebrenica_falls_1995` or `zepa_falls_1995`, so it could contradict a campaign in which they held; the essays keep the record.
- "Whether Sarajevo and Pale will accept" replaces "whether Pale will accept", so the card does not telegraph the historical refusal.
- "Republika Srpska 49 percent, far less than Bosnian Serb forces now hold" replaces a collective attribution.
- "Sarajevo abandoning" replaces "Bosniak abandonment".
- The refugee projection reads "hundreds of thousands", attributed to Washington and sourced in `historical_source`.
- UNSCR 787 is quoted precisely and added to `historical_source`.
- The stance-reason copy, EN and BCS, passed unchanged.

## 3. Measurements (Change B, n3 vs n1)

- **Battles.** All weeks: 509 → 471. t1-t183: byte-identical weekly reports (464 battles). t183-t188: 52 → 14 (t183 7 = 7; t184 11 → 5; t185 9 → 1; t186 11 → 1; t187 9 → 0; t188 5 → 0). The drop is the ceasefire itself after t183, not a battle-frequency lever.
- **Oct95 cells.** 28 cells lost: Mrkonjić Grad 6, Ključ 5, Sanski Most 4, Jajce 4, Donji Vakuf 3, Bosanski Petrovac 2, and one each in Bihać, Bosanski Novi, Šipovo and Drvar. All 28 changed hands in n1 between t184 (16 Oct) and t188 (13 Nov), after the historical ceasefire. The 25 with a documented date fell historically between 12 Sep and 11 Oct 1995 (BB Vol. I pp.418-428: Petrovac 15 Sep, Ključ 17 Sep, Jajce and Donji Vakuf 13 Sep, Drvar 14 Sep, Mrkonjić Grad 10 Oct, Sanski Most 10 Oct). The simulated Sana, Mistral 2 and Donji Vakuf axes run 2-6 weeks behind history, and Southern Move one week. That lateness is calibration, which is held. Scenario-tester verdict: an honest consequence of simulation timing, not broken mechanics.
- **Guards.** Enclave guard holds (9/9). Farz guard intact: P1 4/4, P-A 4/4 with Spreča/north Ozren captured at t185 by the stand-down. Strict health PASS (K:W 3.739).
- **Hard cancel (n2).** 670 at Oct95 and a Farz guard breach (Spreča not taken). A guard breach is a stop under the calibration hold, so it was not adopted. This alternative stays available to the owner if the Farz timing is recalibrated.

## 4. Tests

- `tests/sim/combat/council_fix3_oct1995_ceasefire.test.ts`:
  - flag on accept but not on refuse; scope;
  - call-off of planning offensives; stand-down caps and the attack-order carve-out; stand-down completion;
  - immediate stand-down of an axis that never attacked;
  - effective-date lag; step placement;
  - queue held; no opportunity proposals; no army general offensive;
  - stance clamp and effective-stance cap; Dayton decline lifts it.
- `tests/sim/events/council_fix3_us_halt_timing.test.ts`: window 179-181 before the demand; no firing after; emergent RS-share gate; suppression by the flag and by `ceasefire_1995`; flag written only by `accept_ceasefire`.

## 5. Open points

- The stand-down has no turn limit; the ordinary failure caps bound it. In n3 the last stand-down battle is an HVO capture of Drvar at t186 (30 Oct), against BB's "another week" after 12 Oct. A turn cap would have to be chosen around the Farz guard (one turn breaches it, two turns drops Drvar), so it is left to game-designer and operations-expert.
- `ceasefire_1995` ("the guns fall silent") fires at t181, before the demand. It gates the Dayton chain for both answers, so retiming it needs a design decision for the refusal branch.
- `source_note` is rendered in the decision dossier and still narrates outcomes on several H6 cards. This belongs with council fix 4 (developer text and dossier copy).
- RS fights no battles from t176 to t188 in every run, including main. The VRS counter-attacks of 20-22 Sep 1995 (BB Vol. I p.420) are absent. Pre-existing, not caused by this change.
