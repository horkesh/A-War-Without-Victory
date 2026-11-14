# RF-5B: policy-driven bilateral displacement — §6 broader bright-line panel record

**Date:** 2026-11-14
**Lane:** RF-5B (owner Option B of `docs/40_reports/proposals/20261114_HVO_ARBIH_WAR_DIAGNOSIS.md`; Option C, the HVO military war, stays post-1.0 and is not touched).
**PR:** horkesh/A-War-Without-Victory#623.
**Canon record:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6, "Record (RF-5B policy-driven bilateral displacement, 2026-11-14)".
**Engine reference:** `docs/20_engineering/DISPLACEMENT_MASTER.md` §3.4.

## 1. Premise (measured on main e07847268, hash `53ffe8e9545686ad`)

- Bosniaks displaced by HRHB forces over the 188w run: **1,078 people**. All of them come from two Prozor captures.
- Croats displaced by RBiH forces: 34,582 people.
- 74,521 Bosniaks (1991 census) lived in HRHB-held settlements at the bilateral war start (t49), of which 46,026 were in settlements touching RBiH ground.
  - Stolac (8,084) and Čapljina (7,672) sit in HRHB rear cells with no RBiH contact. The diagnosis prototype, a front-gated seed, could never reach them.
- **Cause.** Takeover displacement needs a control change. The 1992 war-start seed skips the then-allied pair. The 1993 HVO expulsions happened inside ground the HVO already held.

## 2. Historian sourcing (side-session note `rf5b_historian_sourcing.md`)

- **Target, Bosniaks displaced by the HVO in 1993.**
  - Judicial floor about 15,000. Working band **20,000-35,000**, centre 25,000-30,000.
  - The Tabeau refugee/IDP estimate (40,266 Muslims) was given "no probative value" (Prlić TJ v1 ¶355), so the earlier 45k ceiling is retired.
  - Prozor October 1992 (about 5,000, BB) falls outside the JCE window.
- **Bot default.** "HRHB = expel, RBiH = none" is a fair, neutral reading.
  - Prlić: a joint criminal enterprise from mid-January 1993, with a common purpose of domination by the Herceg-Bosna Croats through the ethnic cleansing of the Muslim population; affirmed on appeal 2017.
  - No ARBiH JCE or expulsion policy was charged or found (Hadžihasanović and Kubura; Halilović).
- **A census share rule is wrong on the record.** It excludes Ljubuški, a Prlić municipality, and includes Kakanj, Travnik and Bugojno, where the HVO was the side being expelled. The Historian supplied the sourced per-municipality table and the two-wave timing now in `POLICY_EXPULSION_SCOPE`.

## 3. Runs (188w headless, sequential, one change per run; 8 lane runs)

| Run | Change | Hash | Checkpoints | HRHB→Bosniak people |
|---|---|---|---|---|
| main (e07847268) | — | 53ffe8e9545686ad | 712/709/710/705 | 1,078 |
| 1 | census share rule (≥20%), flat 0.40, one wave, HRHB decision card | 1dc0310139548911 | 712/711/710/702 | 34,017 |
| 2 | Historian scope table, two waves | a2840a9d8fe5772e | 712/711/712/708 | 35,052 |
| 3 | + declared Bosniaks only (no 1991 "others") | e99f0bde46a960a4 | 712/711/712/708 | 28,009 |
| 4 | + policy timer tied to its holder | e99f0bde46a960a4 | = run 3 | 28,009 |
| 5 | restrain counterfactual (card answered no expulsion) | 4a5f534884081238 | 712/709/710/705 | 1,078 (= main) |
| 6 | bot-only policy (card removed) | f8e6a8c3001f4624 | 712/711/712/708 | 28,009 |
| main (887310d5e, after #617) | — | 4ff4a7665c0a35b5 | 712/709/710/705 | 1,078 |
| 7 | + policy waves skip the pass-through re-route; merged on main | **5c378ee919295488** | **712/709/710/705** | **27,839** |
| 8 | reproduction of run 7 at the final code head | 5c378ee919295488 | = run 7 | 27,839 |

**Notes on the runs.**
- Runs 2-6 scored +2/+2/+3 because of two things. One was a coin-flip in a single planner choice: the 4th Corps launched a probe at t76 instead of forming Operacija Ponos, so the Prozor pair stayed HVO. The other was a reward for atrocity: the pass-through re-route moved about 23.5k of HRHB's own refugees out of the Lašva pocket into Livno, which added about 12k HRHB strategic reserve. Neither was a merge candidate.
- After the re-route fix, the final run equals main.
  - The Oct95 noise nets to 0: Kljevci lost at t186 in the Sana tail, Varošluk gained at t177-179.
  - Battles per week −0.8%.
  - Strict health PASS, guards intact, consistency 1 (the same pre-existing gap as main).
  - Croats displaced by RBiH forces: 34,475 people.

## 4. No-reward evidence (the bright line)

Tools: `tools/diagnostics/hvo_arbih_war/hrhb_manpower_check.cjs`, `late_war_check.cjs`. Final run against main 887310d5e.

- **HRHB brigade personnel vs main.**
  - t66 0.00%, t80 −0.67%, t90 −0.59%, t100 −0.97%.
  - t170 +0.02%, t180 +0.80%, t188 −0.15%. The t180 excess is entirely in the corps-less 1995 operational brigades and reverses by t184.
- **End state (t188).** Strategic reserve 21,035 vs 24,104. Pool committed 136,109 vs 138,970. Total sheltered HRHB refugees 128,038 vs 128,143.
- **HRHB recruitment displacement multiplier.** −4.9% at t170, −4.1% at t188.
- **Livno supply population factor.** Equal at t170 (0.904). At t188 it is 1.00 vs 0.91: east Mostar's shared capacity holds Bosniak expellees, so Livno's 1992 Krajina Croats are not moved on. The same 22,830 arrive in both runs, and nothing downstream gains.
- **Targeting and defence.** The ethnic inputs to brigade targeting and defence are the static 1991 census, so expulsions cannot change them.
- **Restrain counterfactual.** It equals main.

## 5. Panel

**Seats.** Eight independent seats: Historian, scenario-tester/calibration, Engine/systems, Red-team, Game Designer, Narrative Designer, Canon Compliance, War-or-Game. The implementer was excluded; the lane lead integrated without a vote. Verdict files: side-session notes `rf5b_panel_r1_<seat>.md` (all rounds), packet `rf5b_panel_packet.md`, round-2 addendum `rf5b_panel_r2_addendum.md`.

**Round 1.** Six GO-with-conditions, two BLOCKs.
- **Red-team F1 (BLOCK).** A policy timer still fired, booked to HRHB, after RS took its cell, and blocked RS's own timer. Engine C1 is the same finding.
- **Calibration (BLOCK).** The pass-through re-route moved HRHB's own refugees, a manpower reward.
- **Narrative Designer and Historian.** Card copy fixes (EN and BCS).
- **Canon.** The card failed the strict canon gate (`sensitive_player_choice` CRITICAL), and §3 says `paramilitary_policy` is the only player-facing war-crime surface. Canon voted bot-only and gave exact canon edits.
- **Q1 split.** Card: Historian, Narrative Designer, Game Designer, Red-team. Bot-only: Canon.

**Integrator ruling: bot-only for 1.0.** The card path needed:
- a `/ui-ux-developer` seat (K8);
- owner visibility of a player expel option (K9);
- a live people count;
- a panel-signed audit allowlist.

Bot-only needs none of them and also removes Red-team F2 (the historical-mode exposure for a human HRHB). The card's signed copy is preserved in branch history (commit 0e0a90051) for a post-1.0 lane.

**Round 2.** All eight GO-with-conditions after these fixes and records:
- the holder fix in both seeding paths;
- the re-route skip;
- the validator check on `cause`;
- the war-crime flag set only when written;
- the single-writer test;
- the warroom feed and displacement snapshot skipping policy timers;
- the no-reward checker reading total refugees in place of the Livno proxy;
- the canon record and known limits.

**Round 3 (Red-team).** GO on the late-war figures, with binding B5.

**Result.** **Unanimous GO** once the record conditions landed in this change.

## 6. Answers to the standing question

**"Which matched cells depend on a known-broken mechanic?"** None depend on this change.
- The Prozor pair (an open item in `REAL_WAR_MASTER.md`) turns on one 4th Corps planner choice, because probes cannot capture. It matches main at the final head.
- Kljevci and Varošluk are late-war tail knife-edges.

## 7. Known limits and bindings

See the §6 record and DISPLACEMENT_MASTER §3.4. In short:
- men were detained, not displaced with their families;
- no incoming Croats fill vacated homes;
- routing follows the standing tables;
- Žepče fires early and Mostar late;
- the 3% Herzegovina kill share stands in for camp deaths;
- the ledger double count is pre-existing;
- a campaign with a human HRHB (including Observer) has no waves;
- a mid-campaign `player_faction` change leaves seeded timers in place;
- historical-mode §2a is off.

Bindings B1-B5 cover any player-facing version, new factions or municipalities, table changes, §2a(0), the single writer, and re-running the no-reward checks.

## 8. Out of scope (register)

- **Double count.** The takeover writer's `displaced` already contains killed and abroad, but `refugees_created` and the Humanitarian Ledger add them again. Pre-existing on main, every faction, about 30%.
- **Unlogged pass-through.** The re-route at a maturing battle timer moves the captor's own sheltered refugees across the country without logging an event.
- **Player card.** The HRHB minority-policy card is a post-1.0 proposal (B1).
- **Historical-mode gap.** `paramilitary_policy` has the same historical-mode condemnation gap; it needs its own panel.
