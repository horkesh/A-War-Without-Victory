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
