# Bot-parity paramilitary attribution diagnostic — 2026-11-05

**decision_policy=bot_parity_paramilitary_diagnostic: ATTRIBUTION EVIDENCE ONLY, NOT A SCORE.** Run with `--diagnostic-bot-parity-paramilitary on`, a tool-only change (`d44969a88`). It gives the player faction the bot's paramilitary behaviour: there is no pending-decision window and a standing allow is in place from t1. The runs used 39 turns at production autonomy, otherwise historical-default policies, with `AWWV_DEBUG_REASON_CODES=axis_reject`. Runs: `runs/claude-live-jan1993-attribution-v2/` (local, not committed).

## Verdict rule (scenario-tester seat, fixed in advance)

- **PROVEN:** the player branch differs from the no-player branch only at Lupnica.
- **FALSIFIED:** Glamoč, Sopotnica or Prača persist.

## Results (cells differing player vs no-player)

| Player | Player score | Differing cells | Verdict |
|---|---|---|---|
| RBiH | 702 | **none** (Lupnica included) | **PROVEN, and stronger than the rule:** the opening paramilitary split is the entire RBiH live gap |
| RS | 700 | Glamoč, Sopotnica, Lupnica, Volari (Šipovo) | **FALSIFIED** for RS: another player-only cause remains |
| HRHB | 703 | Lupnica | Lupnica only (separate cause, under investigation) |

**RBiH chronology under parity** (identical to the no-player branch):
- Bukvik Gornji and Obadi at t1, Biljesevo and Olovci at t2 (all paramilitary);
- Prača at t25 (RS, combat), Sopotnica at t26 and Glamoč at t27 (RBiH, combat).

## Correction to an earlier reading

The first diagnostic run (`runs/claude-live-jan1993-attribution/`) applied parity *before* the turn's event decisions. Resolving the opening state-identity decision re-enables the paramilitary policy event, so the t1 window stayed shut, and parity was one turn late. That run showed RS at 703 with only Lupnica differing; the result was an artefact of the late parity, and **it is withdrawn**. The corrected run is the one in the table.

## What follows

- **RBiH:** the January 1993 live gap is a design decision, not an operations bug. The panel's lane B, a lawful TO/local-consolidation route through ordinary combat, is the route to close it.
- **RS:** look for a player-only mechanism other than paramilitaries. The candidates are the opening decision at t0, player-only negotiation/patron setup, and staff-control paths.
- **Lupnica:** investigation pending.

## Engine change: player staff runs rear-pocket consolidation like bot staff (owner directive)

The owner directed on 2026-11-05 ("this is calibration work now... efficient and quick") that live play must reproduce the calibrated headless result, waiving the panel gate. At autonomy >= 1 the player's staff now consolidates rear pockets exactly as bot staff do. The policy answer governs only a manual player (autonomy 0). Live January 1993, production autonomy, historical-default policies (no diagnostic flag):

| Player | Before | After | No-player | Cells differing player vs no-player |
|---|---|---|---|---|
| RBiH | 698 | **702** | 702 | **none** |
| RS | 701 | 700 | 702 | Glamoč, Sopotnica, Lupnica, Volari |
| HRHB | 703 | 703 | 702 | Lupnica |

- Headless 188w is byte-identical to the manifest.
- Full suite exit 0.
- Lupnica (Lupnica investigator): a knife-edge cell. Headless captures it at t40, one turn after the checkpoint, and player games tip it 1–3 turns earlier. It needs no lever.
- Next: the player staff's army-reserve requests are never auto-assigned (`army_reserve_system.ts:1297-1301`, at every autonomy). The RS-player Goražde gap has a further unidentified cause.

## Engine change: player staff auto-assigns army reserve requests (owner directive)

Live January 1993, same policies:

| Player | Before | After | No-player | Cells differing |
|---|---|---|---|---|
| RBiH | 702 | 702 | 702 | none |
| RS | 700 | 700 | 702 | Glamoč, Sopotnica, Lupnica, Volari |
| HRHB | 703 | 702 | 702 | Lupnica, Donji Koričani (both timing-sensitive at t39) |

Headless 188w is byte-identical; the full suite exits 0. Next, the RS-player divergence investigation.

## MILESTONE: live play = headless for every faction (commit 93d3fd122)

After the three war-phase gates (shared order pass, no live-only re-injection, no staff truce break), live January 1993 at production autonomy with historical-default policies scores:

| Player | Live | No-player | Cells differing |
|---|---|---|---|
| RBiH | 702 | 702 | none |
| RS | 702 | 702 | none |
| HRHB | 702 | 702 | none |

- Headless 188w is byte-identical to the manifest; the full suite exits 0.
- Codex CX-20261105-011: the 709 desktop results were all-AI observers (player_faction null) on pre-W3 source. Headless/no-player January fell 709 → 702 with W3 no-teleport (handover measurement C vs B). Recovering those cells lawfully is the next calibration lane.

## January 1993 calibration: Visoko–Breza reinforcement (commit 379a3f309)

The W3 loss trace (read-only investigator) found:
- Visoko and Hotonj rested on a pre-W3 RS teleport, the step-2 front-donor peel. It moved a weak `rs_ilidza_brigade` into Gornja Vratnica.
- Under lawful movement the Visoko action stalls t8–t19 and holds the 1st Corps slot, so Trnovo starts late.
- The Goražde cells follow from the 851st's startup placement plus T1 relief.

The fix: the neighbouring same-corps Vareš 147th/185th Light join the Visoko action, with a turn-4 prestage march.

**Headless 188w** (`verify_checkpoints`, base 702/704/701/691):

| Checkpoint | Base | Now | Change |
|---|---|---|---|
| jan1993 | 702 | **707** | +5 |
| apr1994 | 704 | 705 | +1 |
| apr1995 | 701 | 703 | +2 |
| oct1995 | 691 | 692 | +1 |
| **Net** | | | **+9** |

- January recovers Gornja Vratnica (t9), Tošići and Donje Žešće (t14), Hotonj (held) and Lupnica (t35), with 0 lost.
- Enclave guard holds and falls on schedule.
- Strict engine health PASS: 0 stranded, 0 ghost, 0 zero-eligible, 0 consistency failures; all checkpoint floors met.
- Protected-anchor tests pass.

**Live January 1993**, production autonomy, historical-default policies: **RBiH 707, RS 707, HRHB 707.** Every faction is identical to the no-player branch on every cell.

**Full suite:** a single failure, `integration_formation_integrity`, which was a test timing artefact; corrected in `27f245c87`. Kamenica crossed the personnel threshold in turn-40 combat and dissolved at t41, as the engine designs.

**Rejected:** the T1 donor ranking with distance before tier. On top of this change it gives January 705 (−2): +Kamen, −Kolovarice, −Jemanlići, −Jablanica.

**Note:** headless output now differs from the pinned regression manifest. The baselines and structural fingerprint need a re-pin as part of the final push, when the owner accepts.

## Last five January cells: 707 → 711

An investigator traced each cell from battle records, then measured about 30 single and combined lawful variants at 39 weeks. All the changes are operation data in `src/sim/combat/pre_planned_operations.ts`. There is no teleport, no direct control write, no `avoided_osids` and no startup edit.

| Cell | Why it was wrong | Change (calibration assumption) | Taken |
|---|---|---|---|
| Miljeno (Čajniče) | The Višegrad Brigade attacks alone: it stalls against the 808th at t4. At t5 the ARBiH homeland last-stand rule blocks the flip (working as designed). | Add `op:cajnice:miljeno_2` to Operation Foča `cajnice_south` (the Čajniče Brigade in its home municipality) | t15 combat |
| Todorovići (Čajniče) | Never attacked | Follows from Miljeno | t16 paramilitary sweep |
| Kamen (Goražde) | The 851st is bled under the 500-man attack floor at Miljeno/Batotići/Kolovarice, so the t23 counterattack never injects | Add the adjacent `arbih_802nd_light` to the Goražde Local Counterattack | t24 combat |
| Krivajevići (Ilijaš) | An empty RBiH cell outside Prsten's ring; probes cannot capture | New `ilijas_krivajevici` axis on Operation Kijevo (Ilijaš Brigade, staging Medojevići) | t28 combat |
| Seher (Kalesija) | The 286th is dug in; no operation targets it | New `kalesija_seher` axis on Operation Podrinje Sweep (1st Zvornik, staging Križevići) | t13 combat |

**Key finding:** Operations Prsten and Drina are already written into `startup_D.json` with their objectives at t0. Editing their code definitions changes nothing in a run. Only operations queued or injected after t0 read their code definitions.

The one new January mismatch is Donji Koričani (Skender Vakuf, painted RS, now HRHB). It is a knock-on effect: the 1st Krajina commander's small t33 action no longer happens. This is a hypothesis, not a fix target.

**Rejected:**
- X1, relief honouring the pre-planned reservation: −5.
- X2, a front cell held by a friendly brigade is not "empty": +1/−1.
- Adding Krivajevići to Prsten, or Seher to Drina, in the startup: each wins its cell but costs Trnovo or the Čajniče result.
- Combinations M6+S1+G1 = 707; S1+G1+K1 = 708; M6+G1+K1 = 707.

**Headless 188w** (`verify_checkpoints`, base 707/705/703/692):

| Checkpoint | Base | Now | Change |
|---|---|---|---|
| jan1993 | 707 | **711** | +4 |
| apr1994 | 705 | 707 | +2 |
| apr1995 | 703 | 706 | +3 |
| oct1995 | 692 | 693 | +1 |
| **Net** | | | **+10** |

- Enclave guard: Goražde holds; Srebrenica and Žepa fall on schedule.
- Strict engine health PASS. The Farz guard stays parked until October 1995, unchanged.

**Live January 1993**, production autonomy, historical-default policies: **RBiH 711, RS 711, HRHB 711.** For every faction, 0 cells differ from the no-player branch.

Tests: the Kijevo, `cajnice_south` and Goražde roster pins in `tests/pre_planned_operations.test.ts` are updated. The Goražde floor test now drains both rostered brigades.

## Donji Koričani: 711 → 712

Donji Koričani is Croat-majority and HRHB at startup. At week 39 no brigade stands in it; the HVO Vitezovi brigade, which defended it at t23, is back in Vitez. All but one of its 11 neighbours are RS; Čukle (Travnik, RBiH) is the exception.

**Why it was lost:** in both runs the 3rd Banja Luka wins a decisive victory there at t23 without a flip, because the defender is present. In the 707 run, the 1st Krajina commander AI's one-brigade Operacija Munja then takes the empty cell at t34. After the 711 changes, the commander's small single-objective operations each draw 3 brigades and run longer, one at a time. So the Koričani operation (Operacija Zaslon) only starts at t37 and is still planning at t39.

**Variants** (39w, base 711; each 712 at week 39 with 0 lost):

| Variant | Change | Taken | 188w |
|---|---|---|---|
| A | Koričani appended to Donji Vakuf `vlasic_pocket` | t35 | 712/708/707/**683**: oct −10 |
| B | New Donji Vakuf axis, 1st Laktaši from Kruševo Brdo | t29 | 712/708/707/694 |
| **D** | New Donji Vakuf axis, 3rd Banja Luka from Kruševo Brdo | t29 | **712/708/707/697** |

**A was rejected.** Its October loss is a timing knife-edge. Jajce Recovery ends one week later (t183), so Southern Move executes from t188 instead of t186. Eleven western-Bosnia cells that fell at t186–188 in the 711 run then fall after the run ends. The late-1995 western cells are fragile this way in every run: they fall in the last two or three weeks.

**D adopted.** A one-brigade `skender_vakuf_koricani` axis on Operation Donji Vakuf (a calibration assumption):

- **Headless 188w:** 712/708/707/697 (base 711/707/706/693, net +7).
- **October 1995 versus 711:** gains Domaljevac, Krepšić, Slatina, Bjelajce and Ostra Luka; loses Sanski Most Ilidža, a t188 capture before.
- **Guards:** enclaves on schedule; strict health PASS.

January 1993 signed off by the owner at 712/712 (2026-11-05).

# April 1994: 708 → 711, and live = headless past week 39

## Calibration change: the 444th prestages home (commit 2c821f17c)

April 1994 mismatches at 708 were Brka, Doljani, Turija and Kreševo. The investigator traced them with the eligibility trace (`AWWV_DEBUG_REASON_CODES=preplanned_eligibility`) and state snapshots.

- **Doljani and Turija.** The 4th Corps queue head, "Jablanica–Doljani Local Attack", failed to build every turn from t66 to t94 with `staging_unreachable`. The 444th sat at `op:trnovo:tusila`, 4 hops from Jablanica, and `planning_duration: 3` allows only 2. From t95, Washington makes every objective "already controlled", so the head never clears and Operation Neretva '93 behind it never runs. With `prestage_from: 58`, the 444th returns home to Jablanica. The local attack launches at t66 and fails twice, the queue advances, and Neretva '93 takes Doljani (444th, ratio 3.4) and Turija (Upper Neretva axis, ratio 35) at t74 by ordinary combat.
- **Kreševo.** In the baseline, the commander AI's "Operacija Gazija" (441st and 444th) took it at t75. With the change, both brigades are committed to Doljani and Neretva from t66 to t74, so Gazija never forms. Kreševo stays HRHB at w104, w156 and w188. This is a side effect, and fragile: the HVO garrison is at cohesion 1.
- **Brka is not fixable lawfully.** No pre-planned operation targets it. Four variants (an extra objective, Semberija brigades, `min_attack_outcome`, earlier timing) produced no battle: the VRS East Bosnian Corps brigades sit at morale and cohesion 20 against the 108th Brčko (1,800 men, cohesion 62), a predicted ratio of about 0.16. Brka is also painted RBiH → RS → RBiH → RS across the four checkpoints, so it is treated as a reference-map question.

**Headless 188w** (base 712/708/707/697): **712/711/710/693**, net +2. Strict health PASS; enclaves on schedule. October 1995 −4 is the late-1995 timing knife-edge: Donji Vakuf 95's roster drifts and executes at t182 instead of about t179. `verify_checkpoints` exits 1 on the October regression beyond tolerance; this is accepted and will be reworked at the October 1995 checkpoint.

## Live = headless past week 39

Live 104-week runs first showed the player branch diverging (RBiH 5 cells, RS 1, HRHB 0). Three causes:

1. **Officer succession and army-commander tenure were player-only (commit 42771b594).** A staff-controlled player kept outgoing commanders behind an unanswered `replacement_suggested` card: Sipčić kept the Sarajevo-Romanija Corps after t18 instead of Galić. `selectManualPlayerFaction()` now means only a manual (autonomy 0) player gets the card.
2. **The harness never answered peace plans.** A pending Vance-Owen blocked every later plan. The harness now gives the documented historical response.
3. **Player decisions landed one turn late.** Bots answer events in-turn before combat; the player answered between turns. The owner chose to **pause before combat**. When a player decision fires, the turn pauses right after `evaluate-events`, the player answers or presses Continue turn, and the rest of the turn runs.
   - The pause is in-memory only: the saved state stays pre-turn, so a quit mid-pause replays the turn deterministically.
   - Commits: e6ea0d7f7, e80980792, 688582232, 07ad774bf, dd99832a5 and 5a408376a.
   - Two real-app fixes followed. The embedded-map bridge gave `advanceTurn` a 15-second deadline and did not forward the pause status (commit 346843346). The warroom shell also held the paused state back while the advance call was in flight (commit dc03f1166).

**Measured, 104 weeks, player versus no-player, 0 cells differing for all three factions** (RBiH, RS and HRHB each 711/712), using the `bot_equivalent` policy. This policy answers with the engine's own bot response selector. With `historical_default`, RBiH and RS still differ by 1 cell (Goražde Slatina). That comes from a different chosen answer on events with no authored default, not from timing. Headless is unchanged: the 188w control map is identical before and after the pause work.

**Real app:** `tools/ui/pause_before_combat_probe.cjs` drives the Electron app. In click/desk/map × answer/continue modes, the paused card is visible over the active surface, answering finishes the turn, and Continue turn finishes it with the decision left pending.

# April 1995: Gornje Krčevine (710 → 711)

The owner asked to sort out Gornje Krčevine (Brka is ignored). It is painted RS at Jan93 and Apr94 and RBiH at Apr95 and Oct95. It contains Vitovlje, the VRS "Vlašić" OG headquarters that Domet-1 (20–24 March 1995, about week 155) took. The sim retook it only at t161.

**Root cause** (proven with the `axis_order_trace` debug topic plus scratch instrumentation):
- The COHA ceasefire filter deletes attack orders while `coha_active` is set. The Vlašić exception (`isVlasicCohaWindow`) opens t155 only.
- Operation Vlasic Ridge is serial: Paklarevo, then Gornje Krčevine, whose only Federation-reachable neighbour is Paklarevo.
- From an RS-held Paklarevo, the op takes Paklarevo at t155. Its lone forward brigade's t156 attack (ratio 1.05) is absorbed; the other six arrive at t158. COHA ends t161, and Gornje Krčevine falls then.
- In the 707-era run, the 712th happened to take Paklarevo at t125, so Vlašić Ridge went straight for Gornje Krčevine at t155.

**Rejected:** widening the COHA exception to 155–156 or 155–157 changes nothing (712/711/710/693, same cells).

**Adopted (commit 511085c2e, calibration assumption):** the never-fired `paklarevo_local_94_model` window moves from the single turn 123 to t133–139.
- It was always blocked at t123: Operacija Ihlas and Sjena held the 712th.
- Inside the new window, the ordinary exhaustion gate admits it at t139, and Paklarevo falls at t142. Vlašić Ridge then takes Gornje Krčevine at t155.
- Historical cost: Paklarevo (Sečevo/Kostolac) now falls in December 1994, about three months before Domet-1 took it.

**Headless 188w:** **712/711/711/697** (base 712/711/710/693, net +5, no cell lost). The October gains are late Donji Vakuf captures (t184–188). Strict health PASS; enclaves on schedule; full suite PASS.

## Live = headless through April 1995 (HRHB opening decision)

**Live 156 turns** (`bot_equivalent`): RBiH 0 and RS 0 cells differ, but HRHB 1 (Gornje Krčevine). In the HRHB-player branch, Paklarevo fell after COHA began, not before it.

**Root cause:** the HRHB divergence started at t1.
- `startNewCampaign` and the browser fallback pre-fired the player's opening decision at turn 0, whatever its window. `hrhb_political_goal` is authored t3–7, and the bot answers it at t4.
- So the player's identical answer landed four turns early. Its +5 morale missed four HVO brigades raised before t4, and Graz fired a week early.
- The drift grew until the t142 Paklarevo capture slipped past COHA.

**Fixed (commit 9f07ff02a):**
- `preFiresOpeningDecisionAtBirth()` pre-fires only when the window opens by turn 1. RS `rs_strategic_goals` is unchanged, and the reviewed RBiH identity flow always pre-fires.
- The HRHB card now arrives in the week-4 pause before combat.
- **Measured at 156 turns:** 0 cells differ for all three factions; the no-player branch is byte-identical.

**Remaining state differences that cost no cells:**
- RBiH identity at t0 vs t3: two RBiH brigades carry −4 morale.
- Negotiation state is created at t0 only for player campaigns. RS +10 cohesion/credibility from `rs_strategic_goals` shifts that the no-player branch drops; +2 war-crimes counts.
- A bot RBiH counter-offer is left pending when HRHB is the player.
- The harness answers peace plans a turn later.

## Owner sign-off: April 1994 and April 1995 (2026-11-06)

The owner signed off April 1994 (711/712; Brka excluded by owner direction) and April 1995 (711/712; Konjic Ljuta left open) and moved the lane to October 1995.

**October 1995 starting point:** 697/712, baseline run `apr1992_definitive_188w__6deb5845c150c196__w188_n15`. Of the 15 mismatches, Brka is excluded:
- **Posavina, wrongly taken by HRHB late (3):** Domaljevac t182, Ostra Luka t183, Krepšić t187. Painted RS at all four checkpoints.
- **Late-1995 gains not made (11):** Mrkonjić Grad, Podrašnica, Baljvine, Šipovljani and Donji Vrbljani (HRHB); Sanski Most Ilidža, Travnik Varosluk, Konjic Sitnik, Konjic Ljuta, Kalinovik Golubići and Ilijaš Krivajevići (RBiH).

## October 1995: 697 → 709 (2026-11-06)

**Headless 188w:** **712/711/712/709** (base 712/711/711/697). No cell lost at any checkpoint. Strict health PASS; enclave guard intact; every late 2nd Corps capture is reference-warranted. Run `apr1992_definitive_188w__6deb5845c150c196__w188_n32`.

**Changes, each measured on its own 188w run:**

| Change | Cells gained | Notes |
|---|---|---|
| Southern Move window opens t180 (was t182) and stages on Šipovo town only (Pribeljci dropped) | Mrkonjić Grad, Podrašnica, Baljvine | Neither change alone moves the launch: the window and the Pribeljci staging cell (t181) each hold it to t182. Mrkonjić now falls t188 (history ≈ t184). |
| Mistral 2 Šipovo axis walks Volari → Bravnice → Jajce town before the Jajce ring and Pribeljci | Šipovljani | Jajce town falls t182 (history ≈ t180), which opens the sourced Drvar gate two turns earlier. A first order that sent the brigades south to Pribeljci before the ring lost Jezero and Prisoje to the march; the geographic order loses nothing. |
| Donji Vrbljani hand-off: Kralj Petar Krešimir IV brigade after Majdan (was Rama, after Podrašnica) | Donji Vrbljani | Rama is still in Mistral 2 at t188, so the axis never activated. |
| Donji Vakuf 95 gains a Paklarevo–Varošluk axis (737th) | Varošluk (t179) | Calibration assumption; exact date and actor unsourced. |
| Zagreb "Posavina Hold" patron directive for `hvo_northwest_bosnia`, stance ceiling defensive from t100 | Domaljevac, Ostra Luka, Krepšić | The commander-generated Orašje attacks (Sjekira t177, Baklja t186) beat RS defenders whose morale fell 89 → 33 in late 1995. Starting at t170 still let one variant attack at t169–170. The startup snapshot is rebuilt for the timeline change. |
| Konjic September 1994 offensive adds Ljuta after Glavatičevo | Ljuta (t130); **apr1995 → 712/712** | Calibration assumption; the date is not sourced. |
| Treskavica 95 (Model) catalog opportunity, t167–175: 4th Muslim → Sitnik, 443rd → Golubići | Sitnik, Golubići (t168) | First built as a pre-planned op: that reserved both brigades from turn 0 (`getReservedPrePlannedBrigadeIds`), the run diverged at t74, and two Brčko cells moved at t105–108. As a catalog opportunity the run first differs at t168. |

**Rejected (no effect):** Southern Move `planning_duration` 2→1 (preparation probe sets the length); closing the bot "Posavina Anti-RS" priority at t170 (the commander does not use it); West Sana hand-off after Hadžići instead of Ključ (the 510th still takes Sanica at t187).

**Remaining at oct1995 (3):**
- **Brka:** excluded by owner direction.
- **Sanski Most Ilidža:** one week short. The 5th Corps runs about five weeks behind history (Ključ t186 vs ≈ t180). Reordering the West Sana axis would trade Kljevci for Ilidža.
- **Ilijaš Krivajevići:** held by a 3,000-strong SRK formation (F_RS_0001) against one 1,800-man ARBiH brigade at Toljenak; no lever without forcing the result.

**Live = headless through October 1995:** at 188 turns (`bot_equivalent`, production autonomy, pause before combat), 0 cells differ from the n32 headless run for RBiH, RS and HRHB as player; every branch scores 709/712.

**Tests updated for the new definitions:** `hv_1995_lifecycle_diagnostic` (Southern Move window t180), `hvo_southern_move_tail_delivery` and the western Bosnia catalog test (Donji Vrbljani hand-off brigade and gate; the Jajce walk is now a frontier walk from Volari, where each cell touches Volari or an earlier objective), the central Bosnia catalog test (Ljuta; Treskavica in the family export). New: `tests/oct1995_calibration_levers.test.ts`.

## October 1995: Ilidža (709 → 710) and the Krivajevići question (2026-11-06)

**Ilidža:** the 506th and 517th moved as one pair on the Sanski Most axis, so the town fell at t188 and Ilidža a week later.
- **Change:** after Lušci Palanka (t184) the 517th is handed to a new axis, `sana_jelasinovci_517th` (Jelašinovci → Kljevci → Ilidža). The 506th then takes Škućani Vakuf t185, Stari Majdan t186, Sanski Most t187 (history ≈ t184) and Ilidža t188.
- **Ostra Luka:** removed from the Sanski Most walk. It is painted RS at every checkpoint; once the 506th was faster it took Ostra Luka at t188 (−1) instead of Ilidža.
- **Rejected:** Ilidža after Krasulje on the Bihać–Petrovac axis (the tired 501st only stalemates at t188); swapping Kljevci and Ilidža between the 510th and 501st (a straight trade).
- **Headless 188w:** **712/711/712/710**; only Ilidža moves. Strict health PASS; enclave guard intact.

**Krivajevići (owner question: "it was part of the Nišići operation"):**
- **Measured:** adding `op:ilijas:krivajevici` after Toljenak on Behar-I (Nov 1994) captures it at t135 with the 162nd and changes nothing else. October 1995 gains it (710 → 711) but April 1995 loses it (712 → 711), because the April 1995 paint says RS. Parked pending the owner's decision.
- **The cell:** ten Ilijaš settlements: Buljetovina, Duboki Potok, Duševine, Hadžići, Kamenica, Krčevine, Krivajevići, Nišići, Šabanci, Zlotege.
- **Sources:** two 1st Corps accounts of the 5–7 November 1994 Nišići plateau offensive list **Hadžići** among the places taken (Delić vol. 2 pp.68–69, citing the 11 Nov 1994 "Behar-I" report; Karavelić/Rujanac, as republished on veterani.ba). Karavelić also lists Korita, Višnjica and Nasići, which sit in `op:ilijas:podlugovi` (painted RS at all four checkpoints). Neither account names Krivajevići or Nišići village. Karavelić says the 1st Corps *cut the Olovo–Srednje road with artillery* in November 1994, not that it took the road villages. No source found describes fighting there in 1995.
- **Reading:** the November 1994 offensive reached into this cell (Hadžići) but no source shows it taken whole. No source supports a change between April and October 1995. So the paint is inconsistent in one place or the other: April 1995 RS and October 1995 RBiH cannot both be right unless something happened in 1995 that no source records. Caveat: the sources give no municipality for "Hadžići"; the Ilijaš Hadžići on the plateau is the plausible one. The 1st Corps monograph PDF exceeds the fetch limit and was not read.

## Owner sign-off: October 1995 at 710; calibration closed (2026-11-06)

The owner signed off October 1995 at **710/712** and closed the calibration lane. The two open cells stay as they are:
- **Brka:** excluded by owner direction.
- **Krivajevići:** the paint is not changed and Behar-I keeps Toljenak as its only objective. The source conflict above stays on record for a later repaint decision.

**Adopted state (merged with origin/main at 55035d55f; sim-identical to n39):**
- Headless 188w `__w188_n40`: **712 / 711 / 712 / 710**, 0 cells differ from n39 at any checkpoint. Strict health PASS (stranded 0, ghost 0, zero-eligible 0, invalid op-weeks 0, consistency 0); enclave guard intact.
- Live = headless: 0 cells differ at 188 turns for RBiH, RS and HRHB as player (every branch 710/712).
- Re-pinned: `data/derived/scenario/baselines/manifest.json` (8 hashes, verified equal to n40's artifacts) and `data/calibration/structural_fingerprint_188w.json` (`bc629e89a585dfde`, 40w final_state_hash `9f59499d11cf5fa1`).
- **Still open (carried forward from the 2026-11-04 handover):** Farz P-A finds 0/4 authored Farz AARs on n40, although P1 is 4/4 (all Ozren cells RBiH) and P-B passes. The verifier still parks this guard "until the October 1995 checkpoint". It is an attribution defect, not a map miss, and needs its own lane before `--farz-guard` is enforced.

## HRHB opening decision: answered at the start, applied in week 4 (owner decision, 2026-11-06)

PR #540's CI full suite failed the first-hour browser gate for HRHB. The fix `9f07ff02a` (HRHB opening decision fires in its authored window) had also removed the "What Is Herceg-Bosna?" card from campaign start, so an HRHB player began with no decision. The owner chose to keep the card at the start and hold its effects until the event's window.

**Engine (`src/sim/events/answer_ahead_of_firing.ts`):**
- At campaign birth, an opening decision whose window opens after turn 1 (only `hrhb_political_goal`, t3–7) is queued as a card but not fired.
- Answering it files the choice in `event_decision_log` at turn 0, so the Chronicle and Army HQ records show it, and applies nothing.
- When evaluate-events fires the event in its window (t4), the filed answer is applied where and as a bot's answer is applied, and the player is not asked again.
- An unanswered birth card stays pending: it is not duplicated, and an Observer resolves it at fire time.
- No new state field: "answered ahead" is a player entry in the log for an opening event that has not fired.
- RBiH and RS are unchanged (they still fire at birth). Headless is unaffected (no player).

**Measured:**
- Headless 188w `__w188_n42`: 712/711/712/710, and 8/8 artifacts are byte-identical to the pinned manifest (no re-pin).
- Live 188 turns: 0 cells differ for RBiH, RS and HRHB. The HRHB player save files `croat_republic` at turn 0, and the event fires at turn 4.
- First-hour browser gate: passes locally for all three factions (it was the CI failure).
- Tests: `hrhb_opening_decision_bot_timing` now answers at birth and matches the no-player game through t5 (fire turns, every HRHB morale, the alliance value). The three start-surface tests expect the HRHB card at birth, unfired, with the answer only filed.

## Re-tune after merging the camps rebalance (owner: "Retune it", 2026-11-06/07)

Merging main into PR #540 brought in the camps rebalance (#538). Its only simulation change is event data (`war_1992.json`, `war_1993.json`) that removes RS internal-cohesion gains from the camps responses. On the merged branch headless 188w `__w188_n43` scored **712 / 711 / 709 / 703** against the signed-off 712/711/712/710, and live no longer matched headless (7 cells at Oct95, the same 7 for every player faction).

**Engine defect found: headless dropped the turn-1 event dimension shifts.**
- A desktop campaign creates the negotiation/strategic-dimension store at birth (`initializeNegotiationState`, `desktop_sim.ts`). The headless startup snapshot has none.
- At t1, `rs_strategic_goals` (bot answer `all_six`: RS military credibility +10, internal cohesion +10, international standing −5) fired before compute-capital created the store, so headless lost all three shifts. Live kept them.
- Measured: at t5 RS internal-cohesion event modifier was 10 live and 0 headless; at t89 live 39 against headless 29.
- Before the camps change both games stayed above the internal-cohesion < 30 threshold of the RS "Address the Nation" / "Visit the Front" pressure, so territory matched. With the camps change, headless fell just under it: the RS address fired at t90 headless against t96 live, and the paths split.
- Fix: a new `ensure-negotiation-state` war-phase step creates the store before `update-event-readiness`. Headless now applies the shifts exactly as live does. The pipeline step count goes 191 → 192.
- Ruled out on the way: the RBiH counter-offer default (`player_faction ?? 'RBiH'` in `counter_offer_generator.ts`). Changing it left the headless hash identical, because headless never holds a pending plan for that branch; reverted.

**Re-tune levers (one measured run each; the first four were found on the merged path):**
- **Paklarevo model window 133–139 → 139 only.** At t137 the op opened before the 770th reached Turbe, and the higher-morale 712th attacked alone and was repulsed. A failed Paklarevo kept three brigades off the Vlašić ridge.
- **Vlašić COHA exception receipts 155 → 155–156.** The serial ridge axis takes Paklarevo at t155 and Gornje Krčevine at t156, inside the April 1995 checkpoint. Calibration assumption: the fighting on Vlašić did not stop after the opening week; no sourced end date.
- **Donji Vakuf 95:** Oborci moves from tenth to third objective; Koreniči and Jemanlići go to a 707th handoff axis (`donji_vakuf_east_707th`, gated on Donji Vakuf town). The tail had fallen at t186–188.
- **Sana Krupa (on the fixed engine):** the 505th took Veliki Badić at t180 and then stood idle. Its axis now continues Gornja Suvaja → Krnjeuša → Jasenica → Vranjska (each step adjacent). The Krupa axis (503rd + 511th) keeps Ivanjska → Arapuša → Donji Dubovik → Krslje → Matavazi. Measured n59: Vranjska t184, Krslje t186, Matavazi t187, Trubar t187.
- **Sana west (510th):** Ilidža moves before Kljevci (Sanica → Ilidža → Kljevci → Sanski Most → Ostra Luka, all adjacent). At t188 the 510th joins the 506th on Ilidža, which falls; the 517th takes Kljevci from Jelašinovci.

**Measured and rejected:**
- Paklarevo `planning_duration` 2 → 4: no effect (it is a maximum preparation budget, not a delay).
- Paklarevo without the 712th: worse (Oct95 705).
- A Bosanski Novi 511th handoff axis: worked on the defective path, but on the fixed engine it left the 503rd alone, and it stalled at Vranjska (Oct95 705).
- An RS triggered "Corridor Restore" counterattack for Brčko: never launched (six ARBiH defenders, power ≈1844 against 236). It became unnecessary: with the engine fix RS keeps its 1992 cohesion, the 1994 2nd Corps attack fails as in the signed-off run, and Skakava Donja and Pelagićevo hold.

**Result, final source (`__w188_n60`):** **712 / 711 / 712 / 710**, 0 cells different from the signed-off `__w188_n42` at every checkpoint. Strict health PASS; enclave guard intact. Live = headless: 0 cells differ at 188 turns for RBiH, RS and HRHB as player (`bot_equivalent`, production autonomy), all 710/712. Open cells unchanged: Brka (owner: ignore) and Ilijaš Krivajevići (paint question above). The Farz P-A receipt defect is still open.

## Follow-up 2026-11-07: Vlašić second week removed, Farz fixed

- **Vlašić:** the 156 week in the COHA exception is gone (receipt 155 only). It was an assumption, not sourced, and on the fixed engine it was unused: both ridge objectives fall by t155. `__w188_n62` scores 712/711/712/710 with 0 matched-cell changes; live = headless for all three player factions.
- **Farz:** an Army HQ op's own TG no longer counts against its own cap reduction. Farz now forms its TG and its AAR carries `army_hq_telemetry`. Vozuća is taken at t180 by the 2nd Corps Uragan 95 op; by owner ruling that counts as a Farz receipt. `__w188_n63` scores 712/711/712/710 (0 matched-cell changes), strict health PASS, live = headless, and the now-enforced Farz guard passes 4/4.
